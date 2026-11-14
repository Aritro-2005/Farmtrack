package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

/*
====================
 ORDER STRUCT
====================
*/
type OrderContract struct {
	contractapi.Contract
}

type DirectOrder struct {
	Type            string  `json:"type"`
	OrderID         string  `json:"orderId"`
	ConsumerID      string  `json:"consumerId"`
	FarmerID        string  `json:"farmerId"`
	ProductID       string  `json:"productId"`
	ProductName     string  `json:"productName"`
	ProductCategory string  `json:"productCategory"`
	Quantity        int     `json:"quantity"`
	Price           float64 `json:"price"`
	OrderStatus     string  `json:"orderStatus"`
	CreatedAt       string  `json:"createdAt"`
}

func (c *OrderContract) CreateOrder(
	ctx contractapi.TransactionContextInterface,
	orderId string,
	consumerId string,
	farmerId string,
	productId string,
	productName string,
	productCategory string,
	quantity int,
	price float64,
) error {

	exists, err := c.OrderExists(ctx, orderId)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("order %s already exists", orderId)
	}

	order := DirectOrder{
		Type:            "ORDER",
		OrderID:         orderId,
		ConsumerID:      consumerId,
		FarmerID:        farmerId,
		ProductID:       productId,
		ProductName:     productName,
		ProductCategory: productCategory,
		Quantity:        quantity,
		Price:           price,
		OrderStatus:     "CREATED",
		CreatedAt:       time.Now().Format(time.RFC3339),
	}

	orderBytes, _ := json.Marshal(order)
	
	// Store with orderId as key (primary)
	err = ctx.GetStub().PutState(orderId, orderBytes)
	if err != nil {
		return err
	}
	
	// ALSO create a composite key for querying all orders
	compositeKey, err := ctx.GetStub().CreateCompositeKey("order", []string{orderId})
	if err != nil {
		return err
	}
	
	// Store a reference at the composite key
	return ctx.GetStub().PutState(compositeKey, []byte(orderId))
}

/*
====================
 READ ORDER
====================
*/
func (c *OrderContract) ReadOrder(
	ctx contractapi.TransactionContextInterface,
	orderId string,
) (*DirectOrder, error) {

	orderBytes, err := ctx.GetStub().GetState(orderId)
	if err != nil {
		return nil, err
	}
	if orderBytes == nil {
		return nil, fmt.Errorf("order %s not found", orderId)
	}

	var order DirectOrder
	_ = json.Unmarshal(orderBytes, &order)
	return &order, nil
}

/*
====================
 CHECK EXISTS
====================
*/
func (c *OrderContract) OrderExists(
	ctx contractapi.TransactionContextInterface,
	orderId string,
) (bool, error) {

	bytes, err := ctx.GetStub().GetState(orderId)
	if err != nil {
		return false, err
	}
	return bytes != nil, nil
}
func (c *OrderContract) GetAllOrders(ctx contractapi.TransactionContextInterface) ([]*DirectOrder, error) {
    
    // Query using partial composite key
    orderIterator, err := ctx.GetStub().GetStateByPartialCompositeKey("order", []string{})
    if err != nil {
        return nil, fmt.Errorf("failed to get orders: %v", err)
    }
    defer orderIterator.Close()

    var orders []*DirectOrder
    
    for orderIterator.HasNext() {
        kv, err := orderIterator.Next()
        if err != nil {
            return nil, fmt.Errorf("failed to iterate orders: %v", err)
        }
        
        // Extract the orderId from the composite key
        _, compositeKeyParts, err := ctx.GetStub().SplitCompositeKey(kv.Key)
        if err != nil {
            return nil, err
        }
        
        if len(compositeKeyParts) > 0 {
            orderId := compositeKeyParts[0]
            
            // Get the actual order data
            order, err := c.ReadOrder(ctx, orderId)
            if err != nil {
                continue
            }
            orders = append(orders, order)
        }
    }

    return orders, nil
}
/*
====================
 MAIN
====================
*/
func main() {
	cc, err := contractapi.NewChaincode(&OrderContract{})
	if err != nil {
		panic(err.Error())
	}

	if err := cc.Start(); err != nil {
		panic(err.Error())
	}
}
