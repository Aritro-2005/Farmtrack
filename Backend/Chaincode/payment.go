package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type DirectPayment struct {
	Type            string    `json:"type"`
	PaymentID       string    `json:"paymentId"`
	OrderID         string    `json:"orderId"`
	ConsumerID      string    `json:"consumerId"`
	FarmerID        string    `json:"farmerId"`
	Amount          float64   `json:"amount"`
	PaymentMethod   string    `json:"paymentMethod"`
	PaymentDate     time.Time `json:"paymentDate"`
	Status          string    `json:"status"`
	TransactionHash string    `json:"transactionHash"`
	Fee             float64   `json:"fee"`
	NetAmount       float64   `json:"netAmount"`
	RefundReason    string    `json:"refundReason"`
	RefundDate      time.Time `json:"refundDate"`
}

type DirectPaymentContract struct {
	contractapi.Contract
}

func (s *DirectPaymentContract) PaymentExists(ctx contractapi.TransactionContextInterface, paymentId string) (bool, error) {
	data, err := ctx.GetStub().GetState(paymentId)
	return data != nil, err
}

func (s *DirectPaymentContract) ReadPayment(ctx contractapi.TransactionContextInterface, paymentId string) (*DirectPayment, error) {
	data, err := ctx.GetStub().GetState(paymentId)
	if err != nil || data == nil {
		return nil, fmt.Errorf("payment %s not found", paymentId)
	}
	var payment DirectPayment
	json.Unmarshal(data, &payment)
	return &payment, nil
}

// ============================================================================
//  CreatePayment (Backend Sync) - WITH COMPOSITE KEY
// ============================================================================
func (s *DirectPaymentContract) CreatePayment(
	ctx contractapi.TransactionContextInterface,
	paymentId string,
	orderId string,
	consumerId string,
	farmerId string,
	amountStr string,
	paymentMethod string,
	status string,
	feeStr string,
	netAmountStr string,
	paymentDate string,
) error {

	exists, err := s.PaymentExists(ctx, paymentId)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("payment %s already exists", paymentId)
	}

	// Convert strings back to floats for storage
	amount, _ := strconv.ParseFloat(amountStr, 64)
	fee, _ := strconv.ParseFloat(feeStr, 64)
	netAmount, _ := strconv.ParseFloat(netAmountStr, 64)
	parsedDate, _ := time.Parse(time.RFC3339, paymentDate)

	payment := DirectPayment{
		Type:            "DIRECT_PAYMENT",
		PaymentID:       paymentId,
		OrderID:         orderId,
		ConsumerID:      consumerId,
		FarmerID:        farmerId,
		Amount:          amount,
		PaymentMethod:   paymentMethod,
		PaymentDate:     parsedDate,
		Status:          status,
		Fee:             fee,
		NetAmount:       netAmount,
		TransactionHash: ctx.GetStub().GetTxID(),
	}

	paymentJSON, _ := json.Marshal(payment)
	
	// Store with paymentId as primary key
	err = ctx.GetStub().PutState(paymentId, paymentJSON)
	if err != nil {
		return err
	}
	
	// Create composite key for querying all payments
	compositeKey, err := ctx.GetStub().CreateCompositeKey("payment", []string{paymentId})
	if err != nil {
		return err
	}
	
	// Store reference at composite key
	return ctx.GetStub().PutState(compositeKey, []byte(paymentId))
}

// ============================================================================
//  GET ALL PAYMENTS - NEW FUNCTION
// ============================================================================
func (s *DirectPaymentContract) GetAllPayments(ctx contractapi.TransactionContextInterface) ([]*DirectPayment, error) {
	
	// Query using partial composite key
	paymentIterator, err := ctx.GetStub().GetStateByPartialCompositeKey("payment", []string{})
	if err != nil {
		return nil, fmt.Errorf("failed to get payments: %v", err)
	}
	defer paymentIterator.Close()

	var payments []*DirectPayment
	
	for paymentIterator.HasNext() {
		kv, err := paymentIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate payments: %v", err)
		}
		
		// Extract the paymentId from the composite key
		_, compositeKeyParts, err := ctx.GetStub().SplitCompositeKey(kv.Key)
		if err != nil {
			return nil, err
		}
		
		if len(compositeKeyParts) > 0 {
			paymentId := compositeKeyParts[0]
			
			// Get the actual payment data
			payment, err := s.ReadPayment(ctx, paymentId)
			if err != nil {
				continue
			}
			payments = append(payments, payment)
		}
	}

	return payments, nil
}

// ============================================================================
//  GET PAYMENTS BY ORDER - ADDITIONAL HELPER
// ============================================================================
func (s *DirectPaymentContract) GetPaymentsByOrder(ctx contractapi.TransactionContextInterface, orderId string) ([]*DirectPayment, error) {
	allPayments, err := s.GetAllPayments(ctx)
	if err != nil {
		return nil, err
	}
	
	var filtered []*DirectPayment
	for _, payment := range allPayments {
		if payment.OrderID == orderId {
			filtered = append(filtered, payment)
		}
	}
	
	return filtered, nil
}

func main() {
	cc, err := contractapi.NewChaincode(&DirectPaymentContract{})
	if err != nil {
		panic(err)
	}
	if err := cc.Start(); err != nil {
		panic(err)
	}
}
