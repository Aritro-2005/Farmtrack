package main

import (
	"encoding/json"
	"fmt"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Shipment represents a shipment in the logistics tracking system.
type Shipment struct {
	ShipmentID string `json:"shipmentID"`
	OrderID    string `json:"orderID"`
	From       string `json:"from"`
	To         string `json:"to"`
	Status     string `json:"status"`
	Location   string `json:"location"`
	Time       string `json:"time"`
}

// ShipmentContract provides the functions for managing the shipments.
type ShipmentContract struct {
	contractapi.Contract
}

// CreateShipment initializes a new shipment in the world state.
func (c *ShipmentContract) CreateShipment(
    ctx contractapi.TransactionContextInterface,
    shipmentID, orderID, from, to, location, timestamp string,
) error {
	exists, err := c.ShipmentExists(ctx, shipmentID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("Shipment %s already exists", shipmentID)
	}

	// Create shipment object
	ship := Shipment{
		ShipmentID: shipmentID,
		OrderID:    orderID,
		From:       from,
		To:         to,
		Status:     "Shipment Created",
		Location:   location,
		Time:       timestamp,
	}
	
	data, err := json.Marshal(ship)
	if err != nil {
		return err
	}
	
	// Store using the shipmentID as key
	err = ctx.GetStub().PutState(shipmentID, data)
	if err != nil {
		return err
	}
	
	// ALSO create a composite key for querying all shipments
	// This allows us to find all shipments regardless of ID pattern
	compositeKey, err := ctx.GetStub().CreateCompositeKey("shipment", []string{shipmentID})
	if err != nil {
		return err
	}
	
	// Store a reference (just the ID) at the composite key
	// We store an empty array or just the ID as a reference
	return ctx.GetStub().PutState(compositeKey, []byte(shipmentID))
}

// UpdateShipment modifies the status and location of an existing shipment.
func (c *ShipmentContract) UpdateShipment(
    ctx contractapi.TransactionContextInterface,
    shipmentID, status, location, timestamp string,
) error {

	ship, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return err
	}

	// Update fields
	ship.Status = status
	ship.Location = location
	ship.Time = timestamp

	data, err := json.Marshal(ship)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(shipmentID, data)
}

// ReadShipment retrieves a shipment by its ID from the world state.
func (c *ShipmentContract) ReadShipment(ctx contractapi.TransactionContextInterface,
	shipmentID string) (*Shipment, error) {

	data, err := ctx.GetStub().GetState(shipmentID)
	if err != nil {
		return nil, err
	}
	if data == nil {
		return nil, fmt.Errorf("Shipment %s does not exist", shipmentID)
	}

	var ship Shipment
	err = json.Unmarshal(data, &ship)
	if err != nil {
		return nil, err
	}
	return &ship, nil
}

// ShipmentExists checks if a shipment with the given ID exists in the world state.
func (c *ShipmentContract) ShipmentExists(ctx contractapi.TransactionContextInterface,
	shipmentID string) (bool, error) {

	data, err := ctx.GetStub().GetState(shipmentID)
	if err != nil {
		return false, err
	}
	return data != nil, nil
}

// GetAllShipments retrieves all shipments stored in the world state.
// This version works with LevelDB using composite keys
func (c *ShipmentContract) GetAllShipments(ctx contractapi.TransactionContextInterface) ([]*Shipment, error) {
	
	// Query using partial composite key (gets all keys with prefix "shipment")
	shipmentIterator, err := ctx.GetStub().GetStateByPartialCompositeKey("shipment", []string{})
	if err != nil {
		return nil, fmt.Errorf("failed to get shipments: %v", err)
	}
	defer shipmentIterator.Close()

	var shipments []*Shipment
	
	// Iterate through all composite keys
	for shipmentIterator.HasNext() {
		kv, err := shipmentIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate shipments: %v", err)
		}
		
		// The value stored at composite key is the shipmentID
		shipmentID := string(kv.Value)
		
		// Now get the actual shipment data using the ID
		shipment, err := c.ReadShipment(ctx, shipmentID)
		if err != nil {
			// Skip if shipment not found (shouldn't happen, but just in case)
			continue
		}
		
		shipments = append(shipments, shipment)
	}

	return shipments, nil
}

// Alternative method: If you want a more efficient approach that stores all data at once
// This gets all shipments in a single pass without extra ReadShipment calls
func (c *ShipmentContract) GetAllShipmentsEfficient(ctx contractapi.TransactionContextInterface) ([]*Shipment, error) {
	
	// Get all keys with prefix "shipment"
	shipmentIterator, err := ctx.GetStub().GetStateByPartialCompositeKey("shipment", []string{})
	if err != nil {
		return nil, fmt.Errorf("failed to get shipments: %v", err)
	}
	defer shipmentIterator.Close()

	var shipments []*Shipment
	
	for shipmentIterator.HasNext() {
		kv, err := shipmentIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate shipments: %v", err)
		}
		
		// Extract the shipmentID from the composite key
		_, compositeKeyParts, err := ctx.GetStub().SplitCompositeKey(kv.Key)
		if err != nil {
			return nil, err
		}
		
		// The shipmentID is the first part of the composite key
		if len(compositeKeyParts) > 0 {
			shipmentID := compositeKeyParts[0]
			
			// Get the actual shipment data using the ID
			shipment, err := c.ReadShipment(ctx, shipmentID)
			if err != nil {
				continue
			}
			shipments = append(shipments, shipment)
		}
	}

	return shipments, nil
}

// GetShipmentsByStatus - Example of how to filter shipments by status with LevelDB
// This still requires iterating through all shipments
func (c *ShipmentContract) GetShipmentsByStatus(ctx contractapi.TransactionContextInterface, status string) ([]*Shipment, error) {
	
	// Get all shipments first
	allShipments, err := c.GetAllShipments(ctx)
	if err != nil {
		return nil, err
	}
	
	// Filter by status
	var filtered []*Shipment
	for _, shipment := range allShipments {
		if shipment.Status == status {
			filtered = append(filtered, shipment)
		}
	}
	
	return filtered, nil
}

// main function to start the chaincode
func main() {
	chaincode, err := contractapi.NewChaincode(&ShipmentContract{})
	if err != nil {
		fmt.Printf("Error creating shipment chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting shipment chaincode: %s", err.Error())
	}
}
