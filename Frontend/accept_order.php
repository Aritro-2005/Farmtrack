<?php
header('Content-Type: application/json');

$order_id = isset($_POST['order_id']) ? $_POST['order_id'] : '';

if (empty($order_id)) {
    echo json_encode(['success' => false, 'message' => 'Invalid order ID']);
    exit();
}

// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "farmtrack";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

// Start transaction
$conn->begin_transaction();

try {
    // First, get order details from direct_orders table
    $order_sql = "SELECT consumer_id, product_name, quantity, price 
                  FROM direct_orders 
                  WHERE order_id = ? AND pushed_to_blockchain = 0";
    $order_stmt = $conn->prepare($order_sql);
    $order_stmt->bind_param("s", $order_id);
    $order_stmt->execute();
    $order_result = $order_stmt->get_result();
    $order_data = $order_result->fetch_assoc();

    if (!$order_data) {
        throw new Exception('Order not found or already processed');
    }

    // Update order status in direct_orders table (set pushed_to_blockchain = 1)
    $update_sql = "UPDATE direct_orders SET 
                   pushed_to_blockchain = 1,
                   farmer_id = ? 
                   WHERE order_id = ? AND pushed_to_blockchain = 0";
    $update_stmt = $conn->prepare($update_sql);
    // Using a default farmer_id since we don't have session
    $default_farmer_id = "FARM-AUTO-01";
    $update_stmt->bind_param("ss", $default_farmer_id, $order_id);
    
    if (!$update_stmt->execute()) {
        throw new Exception('Failed to update order status');
    }

    if ($update_stmt->affected_rows == 0) {
        throw new Exception('Order not found or already accepted');
    }

    // Generate unique shipment ID
    $shipment_id = 'SHIP-' . strtoupper(uniqid());

    // Insert into shipment table
    $shipment_sql = "INSERT INTO shipment (
                        shipment_id, 
                        order_id, 
                        source_location, 
                        destination_location, 
                        current_status, 
                        current_location, 
                        last_update
                    ) VALUES (?, ?, ?, ?, ?, ?, NOW())";
    
    $shipment_stmt = $conn->prepare($shipment_sql);
    
    // Set initial values
    $source_location = "Farm Location";
    $destination_location = "Customer Address"; // You might want to add this to your direct_orders table
    $current_status = "Processing";
    $current_location = $source_location;
    
    $shipment_stmt->bind_param(
        "ssssss",
        $shipment_id,
        $order_id,
        $source_location,
        $destination_location,
        $current_status,
        $current_location
    );
    
    if (!$shipment_stmt->execute()) {
        throw new Exception('Failed to create shipment record');
    }

    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        'success' => true, 
        'message' => 'Order accepted and shipment created successfully',
        'shipment_id' => $shipment_id
    ]);

} catch (Exception $e) {
    // Rollback transaction on error
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($order_stmt)) $order_stmt->close();
    if (isset($update_stmt)) $update_stmt->close();
    if (isset($shipment_stmt)) $shipment_stmt->close();
    $conn->close();
}
?>