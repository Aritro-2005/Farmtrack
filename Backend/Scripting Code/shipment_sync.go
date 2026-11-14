package main

import (
	"crypto/x509"
	"database/sql"
	"encoding/pem"
	"fmt"
	"os"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"github.com/hyperledger/fabric-gateway/pkg/client"
	"github.com/hyperledger/fabric-gateway/pkg/identity"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

type Shipment struct {
	ShipmentID string
	OrderID    string
	From       string
	To         string
	Location   string
	Status     string
}

// =====================
// HELPERS
// =====================

func loadFile(path string) ([]byte, error) {
	return os.ReadFile(path)
}

func newGrpcConnection(peerEndpoint, tlsCertPath string) (*grpc.ClientConn, error) {
	certData, err := os.ReadFile(tlsCertPath)
	if err != nil {
		return nil, fmt.Errorf("TLS cert read error: %v", err)
	}

	block, _ := pem.Decode(certData)
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM")
	}

	certificate, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("X509 parse error: %v", err)
	}

	certPool := x509.NewCertPool()
	certPool.AddCert(certificate)

	creds := credentials.NewClientTLSFromCert(certPool, "")
	return grpc.Dial(peerEndpoint, grpc.WithTransportCredentials(creds))
}

func newIdentity() (*identity.X509Identity, identity.Sign, error) {
	mspID := "Org1MSP"

	certPEM, _ := loadFile("/home/aritro/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem")
	keyPEM, _ := loadFile("/home/aritro/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/priv_sk")

	cert, _ := identity.CertificateFromPEM(certPEM)
	privateKey, _ := identity.PrivateKeyFromPEM(keyPEM)

	sign, _ := identity.NewPrivateKeySign(privateKey)
	id, _ := identity.NewX509Identity(mspID, cert)

	return id, sign, nil
}

func connectFabric() (*client.Gateway, *client.Network, error) {
	peer := "localhost:7051"
	tlsCert := "/home/aritro/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"

	grpcConn, err := newGrpcConnection(peer, tlsCert)
	if err != nil {
		return nil, nil, err
	}

	id, sign, _ := newIdentity()

	gw, err := client.Connect(
		id,
		client.WithSign(sign),
		client.WithClientConnection(grpcConn),
	)
	if err != nil {
		return nil, nil, err
	}

	network := gw.GetNetwork("mychannel")
	return gw, network, nil
}

func shipmentExists(contract *client.Contract, shipmentID string) (bool, error) {
	result, err := contract.EvaluateTransaction("ShipmentExists", shipmentID)
	if err != nil {
		return false, err
	}
	return string(result) == "true", nil
}

// =====================
// 🔥 UPDATED SYNC FUNCTION (WITH LATENCY)
// =====================

func syncShipment(contract *client.Contract, s Shipment) (string, time.Duration, error) {

	fmt.Printf("Processing: %s\n", s.ShipmentID)

	exists, err := shipmentExists(contract, s.ShipmentID)
	if err != nil {
		return "error", 0, err
	}

	if exists {
		fmt.Printf("Already synced: %s (skipping)\n\n", s.ShipmentID)
		return "skipped", 0, nil
	}

	timestamp := time.Now().UTC().Format(time.RFC3339)

	// ⏱️ START TIMER
	txStart := time.Now()

	result, commit, err := contract.SubmitAsync(
		"CreateShipment",
		client.WithArguments(
			s.ShipmentID,
			s.OrderID,
			s.From,
			s.To,
			s.Location,
			s.Status,
			timestamp,
		),
	)

	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			return "skipped", 0, nil
		}
		return "error", 0, err
	}

	_ = result

	// ✅ WAIT FOR COMMIT
	_, err = commit.Status()
	if err != nil {
		return "error", 0, err
	}

	txEnd := time.Now()
	latency := txEnd.Sub(txStart)

	fmt.Printf("⏱️ Latency: %v\n", latency)
	fmt.Printf("Synced: %s\n\n", s.ShipmentID)

	return "synced", latency, nil
}

// =====================
// MAIN
// =====================

func main() {

	db, _ := sql.Open("mysql", "root:@tcp(localhost:3306)/farmtrack")
	defer db.Close()

	db.Ping()
	fmt.Println("Connected to MySQL")

	gw, net, _ := connectFabric()
	defer gw.Close()
	fmt.Println("Connected to Fabric")

	contract := net.GetContract("shipment")

	rows, _ := db.Query(`
		SELECT shipment_id, order_id, source_location, destination_location, current_location, current_status
		FROM shipments
	`)
	defer rows.Close()

	var totalRows int
	db.QueryRow(`SELECT COUNT(*) FROM shipments`).Scan(&totalRows)

	fmt.Printf("\nFound %d shipments\n\n", totalRows)

	successCount := 0
	skippedCount := 0
	failedCount := 0

	// 🚀 PERFORMANCE TRACKING
	startTotal := time.Now()
	var totalLatency time.Duration
	txCount := 0

	for rows.Next() {
		var s Shipment
		rows.Scan(&s.ShipmentID, &s.OrderID, &s.From, &s.To, &s.Location, &s.Status)

		status, latency, err := syncShipment(contract, s)

		switch status {
		case "synced":
			successCount++
			totalLatency += latency
			txCount++
		case "skipped":
			skippedCount++
		case "error":
			failedCount++
			fmt.Println("Error:", err)
		}
	}

	// =====================
	// 📊 SUMMARY + PERFORMANCE
	// =====================

	endTotal := time.Now()
	totalTime := endTotal.Sub(startTotal).Seconds()

	fmt.Printf("\nSummary:\n")
	fmt.Printf("Total: %d\n", totalRows)
	fmt.Printf("✔ Synced: %d\n", successCount)
	fmt.Printf("⏭️ Skipped: %d\n", skippedCount)
	fmt.Printf("✖ Failed: %d\n", failedCount)

	fmt.Println("\n📈 Performance:")
	fmt.Printf("Total Time: %.2f sec\n", totalTime)

	if txCount > 0 {
		tps := float64(txCount) / totalTime
		avgLatency := totalLatency / time.Duration(txCount)

		fmt.Printf("🚀 TPS: %.2f tx/sec\n", tps)
		fmt.Printf("⏱️ Avg Latency: %v\n", avgLatency)
	}
}
