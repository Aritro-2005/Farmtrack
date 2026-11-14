package main

import (
	"crypto/tls"
	"crypto/x509"
	"database/sql"
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
	MSPID         = "Org1MSP"
	PeerEndpoint  = "localhost:7051"
	ChannelName   = "mychannel"
	ChaincodeName = "payment"

	SignCertPath = "/home/aritro/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem"
	KeystoreDir  = "/home/aritro/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/"
	PeerTLSCert  = "/home/aritro/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
)

type Payment struct {
	TxRef         string
	OrderID       string
	UserID        int
	FarmerID      string
	Amount        float64
	Fee           float64
	PaymentMethod string
	Status        string
	Timestamp     string
}

func main() {

	db, err := sql.Open("mysql", "root:@tcp(localhost:3306)/farmtrack")
	if err != nil {
		log.Fatalf("DB connection failed: %v", err)
	}
	defer db.Close()

	db.Ping()
	fmt.Println("✅ Connected to Database!")

	var totalRows int
	db.QueryRow(`SELECT COUNT(*) FROM transactions`).Scan(&totalRows)
	fmt.Printf("💰 Found %d total payments\n\n", totalRows)

	privateKeyPath, _ := findPrivateKey()

	id := newIdentity(MSPID, SignCertPath)
	sign := newSigner(privateKeyPath)
	conn := newGrpcConnection(PeerEndpoint, PeerTLSCert)
	defer conn.Close()

	gateway, err := client.Connect(
		id,
		client.WithSign(sign),
		client.WithClientConnection(conn),
	)
	if err != nil {
		log.Fatalf("Gateway connection failed: %v", err)
	}
	defer gateway.Close()

	network := gateway.GetNetwork(ChannelName)
	contract := network.GetContract(ChaincodeName)

	rows, _ := db.Query(`
		SELECT tx_ref, order_id, user_id, farmer_id, amount, fee, payment_method, status, timestamp
		FROM transactions
	`)
	defer rows.Close()

	successCount := 0
	skippedCount := 0
	failedCount := 0
	processedCount := 0

	// 🚀 PERFORMANCE TRACKING
	startTotal := time.Now()
	var totalLatency time.Duration
	txCount := 0

	for rows.Next() {
		var payment Payment
		var timestampStr string

		rows.Scan(
			&payment.TxRef,
			&payment.OrderID,
			&payment.UserID,
			&payment.FarmerID,
			&payment.Amount,
			&payment.Fee,
			&payment.PaymentMethod,
			&payment.Status,
			&timestampStr,
		)

		processedCount++

		consumerID := fmt.Sprintf("%d", payment.UserID)
		netAmount := payment.Amount - payment.Fee

		parsedTime, _ := time.Parse("2006-01-02 15:04:05", timestampStr)
		paymentDate := parsedTime.UTC().Format(time.RFC3339)

		fmt.Printf("⏳ Processing: %s\n", payment.TxRef)

		exists, _ := paymentExists(contract, payment.TxRef)
		if exists {
			fmt.Printf("  ℹ️ Already synced: %s\n\n", payment.TxRef)
			skippedCount++
			continue
		}

		// ⏱️ START LATENCY
		txStart := time.Now()

		result, commit, err := contract.SubmitAsync(
			"CreatePayment",
			client.WithArguments(
				payment.TxRef,
				payment.OrderID,
				consumerID,
				payment.FarmerID,
				fmt.Sprintf("%.2f", payment.Amount),
				payment.PaymentMethod,
				payment.Status,
				fmt.Sprintf("%.2f", payment.Fee),
				fmt.Sprintf("%.2f", netAmount),
				paymentDate,
			),
		)

		if err != nil {
			if strings.Contains(err.Error(), "already exists") {
				skippedCount++
			} else {
				failedCount++
			}
			continue
		}

		_ = result

		// ✅ WAIT FOR COMMIT
		_, err = commit.Status()
		if err != nil {
			failedCount++
			continue
		}

		txEnd := time.Now()
		latency := txEnd.Sub(txStart)

		fmt.Printf("  ⏱️ Latency: %v\n", latency)

		totalLatency += latency
		txCount++
		successCount++

		// DB update
		db.Exec(
			`UPDATE transactions SET is_synced=1 WHERE tx_ref=?`,
			payment.TxRef,
		)

		fmt.Printf("  ✅ Synced: %s\n\n", payment.TxRef)
	}

	// 📊 PERFORMANCE SUMMARY
	endTotal := time.Now()
	totalTime := endTotal.Sub(startTotal).Seconds()

	fmt.Println("\n📊 Summary:")
	fmt.Printf("Total: %d\n", totalRows)
	fmt.Printf("✅ Synced: %d\n", successCount)
	fmt.Printf("⏭️ Skipped: %d\n", skippedCount)
	fmt.Printf("❌ Failed: %d\n", failedCount)

	fmt.Println("\n📈 Performance:")
	fmt.Printf("Total Time: %.2f sec\n", totalTime)

	if txCount > 0 {
		tps := float64(txCount) / totalTime
		avgLatency := totalLatency / time.Duration(txCount)

		fmt.Printf("🚀 TPS: %.2f tx/sec\n", tps)
		fmt.Printf("⏱️ Avg Latency: %v\n", avgLatency)
	}
}

// =====================
// HELPERS
// =====================

func paymentExists(contract *client.Contract, paymentID string) (bool, error) {
	result, err := contract.EvaluateTransaction("PaymentExists", paymentID)
	if err != nil {
		return false, err
	}
	return string(result) == "true", nil
}

func findPrivateKey() (string, error) {
	files, _ := os.ReadDir(KeystoreDir)
	return filepath.Join(KeystoreDir, files[0].Name()), nil
}

func newGrpcConnection(peerEndpoint, tlsCertPath string) *grpc.ClientConn {
	cert, _ := os.ReadFile(tlsCertPath)
	certPool := x509.NewCertPool()
	certPool.AppendCertsFromPEM(cert)

	creds := credentials.NewTLS(&tls.Config{
		RootCAs: certPool,
	})

	conn, _ := grpc.Dial(peerEndpoint, grpc.WithTransportCredentials(creds))
	return conn
}

func newIdentity(mspID, certPath string) *identity.X509Identity {
	certPEM, _ := os.ReadFile(certPath)
	cert, _ := identity.CertificateFromPEM(certPEM)
	id, _ := identity.NewX509Identity(mspID, cert)
	return id
}

func newSigner(keyPath string) identity.Sign {
	keyPEM, _ := os.ReadFile(keyPath)
	privateKey, _ := identity.PrivateKeyFromPEM(keyPEM)
	sign, _ := identity.NewPrivateKeySign(privateKey)
	return sign
}
