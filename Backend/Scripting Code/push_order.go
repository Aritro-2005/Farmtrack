package main

import (
    "encoding/csv"
	"crypto/tls"
	"crypto/x509"
	"database/sql"
	"encoding/pem"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/hyperledger/fabric-gateway/pkg/client"
	"github.com/hyperledger/fabric-gateway/pkg/identity"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

const (
	MSPID       = "Org1MSP"
	ChannelName = "mychannel"
	Chaincode   = "order"

	PeerEndpoint = "localhost:7051"
	PeerHost     = "peer0.org1.example.com"
)

type Order struct {
	OrderID         string
	ConsumerID      string
	FarmerID        string
	ProductID       string
	ProductName     string
	ProductCategory string
	Quantity        int
	Price           float64
}

func main() {

	// =====================
	// 1. CONNECT TO DB
	// =====================
	db, err := sql.Open("mysql", "root:@tcp(localhost:3306)/farmtrack")
	if err != nil {
		log.Fatalf("❌ DB connection failed: %v", err)
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		log.Fatalf("❌ DB ping failed: %v", err)
	}
	fmt.Println("✅ Connected to Database")

	// =====================
	// 2. GET TOTAL COUNT
	// =====================
	var totalRows int
	err = db.QueryRow(`SELECT COUNT(*) FROM direct_orders`).Scan(&totalRows)
	if err != nil {
		log.Fatalf("❌ Count query failed: %v", err)
	}
	fmt.Printf("📦 Found %d orders to process\n\n", totalRows)

	// =====================
	// 3. FETCH ALL ORDERS
	// =====================
	rows, err := db.Query(`
		SELECT order_id, consumer_id, farmer_id, product_id,
		       product_name, product_category, quantity, price
		FROM direct_orders
	`)
	if err != nil {
		log.Fatalf("❌ Query failed: %v", err)
	}
	defer rows.Close()

	// =====================
	// 4. CONNECT TO FABRIC
	// =====================
	grpcConn := newGrpcConnection()
	defer grpcConn.Close()

	id := newIdentity()
	sign := newSigner()

	gateway, err := client.Connect(
		id,
		client.WithSign(sign),
		client.WithClientConnection(grpcConn),
	)
	if err != nil {
		log.Fatalf("❌ Gateway connection failed: %v", err)
	}
	defer gateway.Close()

	network := gateway.GetNetwork(ChannelName)
	contract := network.GetContract(Chaincode)

	// =====================
	// 5. PROCESS ORDERS
	// =====================
	successCount := 0
	skippedCount := 0
	failedCount := 0

	startTotal := time.Now()
	var totalLatency time.Duration
	txCount := 0
// =====================
// 📁 CREATE CSV LOGGER
// =====================
logFile, err := os.Create("tx_log.csv")
if err != nil {
	log.Fatalf("❌ Failed to create log file: %v", err)
}
defer logFile.Close()

csvWriter := csv.NewWriter(logFile)
defer csvWriter.Flush()

// Header
csvWriter.Write([]string{"txID", "startTime", "endTime", "latency(ms)"})
	for rows.Next() {
		var order Order
		err := rows.Scan(
			&order.OrderID,
			&order.ConsumerID,
			&order.FarmerID,
			&order.ProductID,
			&order.ProductName,
			&order.ProductCategory,
			&order.Quantity,
			&order.Price,
		)
		if err != nil {
			log.Printf("❌ Row scan error: %v", err)
			failedCount++
			continue
		}

		fmt.Printf("Processing order: %s\n", order.OrderID)

		// Check existence
		exists, err := orderExists(contract, order.OrderID)
		if err != nil {
			fmt.Printf("  ❌ Error checking existence: %v\n", err)
			failedCount++
			continue
		}

		if exists {
			fmt.Printf("  ℹ️ Already synced: %s (skipping)\n\n", order.OrderID)
			skippedCount++
			continue
		}

		// =====================
		// ⏱️ LATENCY START
		// =====================
		txStart := time.Now()

		result, commit, err := contract.SubmitAsync(
			"CreateOrder",
			client.WithArguments(
				order.OrderID,
				order.ConsumerID,
				order.FarmerID,
				order.ProductID,
				order.ProductName,
				order.ProductCategory,
				fmt.Sprintf("%d", order.Quantity),
				fmt.Sprintf("%.2f", order.Price),
			),
		)

		if err != nil {
			if strings.Contains(err.Error(), "already exists") {
				fmt.Printf("  ℹ️ Already synced: %s (detected during creation)\n\n", order.OrderID)
				skippedCount++
			} else {
				fmt.Printf("  ❌ Failed: %v\n\n", err)
				failedCount++
			}
			continue
		}

		_ = result // optional

		// ✅ WAIT FOR COMMIT
		_, err = commit.Status()
		if err != nil {
			fmt.Printf("  ❌ Commit failed: %v\n\n", err)
			failedCount++
			continue
		}

		txEnd := time.Now()
		latency := txEnd.Sub(txStart)
// =====================
// 📊 WRITE TO CSV
// =====================
startMillis := txStart.UnixNano() / int64(time.Millisecond)
endMillis := txEnd.UnixNano() / int64(time.Millisecond)
latencyMillis := latency.Milliseconds()

csvWriter.Write([]string{
	order.OrderID,
	fmt.Sprintf("%d", startMillis),
	fmt.Sprintf("%d", endMillis),
	fmt.Sprintf("%d", latencyMillis),
})
csvWriter.Flush()

		fmt.Printf("  ⏱️ Latency: %v\n", latency)

		totalLatency += latency
		txCount++

		fmt.Printf("  ✅ Synced: %s\n\n", order.OrderID)
		successCount++
	}

	// =====================
	// 6. SUMMARY
	// =====================
	endTotal := time.Now()
	totalTime := endTotal.Sub(startTotal).Seconds()

	fmt.Println("📊 Summary:")
	fmt.Printf("   Total orders: %d\n", totalRows)
	fmt.Printf("   ✅ Synced: %d\n", successCount)
	fmt.Printf("   ℹ️ Skipped: %d\n", skippedCount)
	fmt.Printf("   ❌ Failed: %d\n", failedCount)

	fmt.Println("\n📈 Performance:")
	fmt.Printf("   Total Time: %.2f sec\n", totalTime)

	if txCount > 0 {
		tps := float64(txCount) / totalTime
		avgLatency := totalLatency / time.Duration(txCount)

		fmt.Printf("   🚀 TPS: %.2f tx/sec\n", tps)
		fmt.Printf("   ⏱️ Avg Latency: %v\n", avgLatency)
	}
}

// =====================
// HELPER FUNCTIONS
// =====================

func orderExists(contract *client.Contract, orderID string) (bool, error) {
	result, err := contract.EvaluateTransaction("OrderExists", orderID)
	if err != nil {
		return false, err
	}
	return string(result) == "true", nil
}

// =====================
// FABRIC CONNECTION
// =====================

func newGrpcConnection() *grpc.ClientConn {
	tlsCertPath := "/home/aritro/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"

	cert, err := os.ReadFile(tlsCertPath)
	if err != nil {
		log.Fatalf("❌ TLS cert read failed: %v", err)
	}

	certPool := x509.NewCertPool()
	certPool.AppendCertsFromPEM(cert)

	creds := credentials.NewTLS(&tls.Config{
		RootCAs:    certPool,
		ServerName: PeerHost,
	})

	conn, err := grpc.Dial(PeerEndpoint, grpc.WithTransportCredentials(creds))
	if err != nil {
		log.Fatalf("❌ gRPC dial failed: %v", err)
	}

	return conn
}

func newIdentity() *identity.X509Identity {
	certPath := "/home/aritro/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem"

	certPEM, err := os.ReadFile(certPath)
	if err != nil {
		log.Fatalf("❌ Signcert read failed: %v", err)
	}

	block, _ := pem.Decode(certPEM)
	if block == nil {
		log.Fatal("❌ PEM decode failed")
	}

	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		log.Fatalf("❌ X509 parse failed: %v", err)
	}

	id, err := identity.NewX509Identity(MSPID, cert)
	if err != nil {
		log.Fatalf("❌ Identity creation failed: %v", err)
	}

	return id
}

func newSigner() identity.Sign {
	keyDir := "/home/aritro/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore"

	files, err := os.ReadDir(keyDir)
	if err != nil {
		log.Fatalf("❌ Keystore read failed: %v", err)
	}

	keyPath := filepath.Join(keyDir, files[0].Name())
	keyPEM, err := os.ReadFile(keyPath)
	if err != nil {
		log.Fatalf("❌ Private key read failed: %v", err)
	}

	privateKey, err := identity.PrivateKeyFromPEM(keyPEM)
	if err != nil {
		log.Fatalf("❌ Private key parse failed: %v", err)
	}

	sign, err := identity.NewPrivateKeySign(privateKey)
	if err != nil {
		log.Fatalf("❌ Signer creation failed: %v", err)
	}

	return sign
}
