<?php
header('Content-Type: application/json');

// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "farmtrack";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

$response = [];

// Get pending orders (pushed_to_blockchain = 0 means not yet processed)
$pending_sql = "SELECT order_id, 
                       consumer_id, 
                       product_name, 
                       quantity, 
                       price, 
                       created_at
                FROM direct_orders 
                WHERE pushed_to_blockchain = 0 
                ORDER BY created_at DESC";
$pending_result = $conn->query($pending_sql);

$pending_orders = [];
if ($pending_result && $pending_result->num_rows > 0) {
    while($row = $pending_result->fetch_assoc()) {
        // Since there's no delivery_location in your table structure,
        // we'll use a placeholder or you can add it to your table if needed
        $order = [
            'order_id' => $row['order_id'],
            'consumer_id' => $row['consumer_id'],
            'product_name' => $row['product_name'],
            'quantity' => $row['quantity'],
            'price' => $row['price'],
            'delivery_address' => 'Address not available', // Placeholder since no delivery_location column
            'order_date' => $row['created_at']
        ];
        $pending_orders[] = $order;
    }
}
$response['pending_orders'] = $pending_orders;

// Get accepted orders (pushed_to_blockchain = 1 means processed)
$accepted_sql = "SELECT order_id, 
                        consumer_id, 
                        product_name, 
                        quantity, 
                        price,
                        created_at 
                 FROM direct_orders 
                 WHERE pushed_to_blockchain = 1
                 ORDER BY created_at DESC
                 LIMIT 10";
$accepted_result = $conn->query($accepted_sql);

$accepted_orders = [];
if ($accepted_result && $accepted_result->num_rows > 0) {
    while($row = $accepted_result->fetch_assoc()) {
        $row['total_value'] = $row['quantity'] * $row['price'];
        $accepted_orders[] = $row;
    }
}
$response['accepted_orders'] = $accepted_orders;

// Get statistics
// Pending count (pushed_to_blockchain = 0)
$pending_count_sql = "SELECT COUNT(*) as count FROM direct_orders WHERE pushed_to_blockchain = 0";
$pending_count_result = $conn->query($pending_count_sql);
$response['pending_count'] = $pending_count_result ? $pending_count_result->fetch_assoc()['count'] : 0;

// Monthly stats (accepted orders this month - pushed_to_blockchain = 1)
$monthly_sql = "SELECT IFNULL(SUM(quantity), 0) as total_quantity, 
                       IFNULL(SUM(quantity * price), 0) as total_value 
                FROM direct_orders 
                WHERE pushed_to_blockchain = 1
                AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
                AND YEAR(created_at) = YEAR(CURRENT_DATE())";
$monthly_result = $conn->query($monthly_sql);
$monthly_data = $monthly_result ? $monthly_result->fetch_assoc() : ['total_quantity' => 0, 'total_value' => 0];
$response['monthly_quantity'] = $monthly_data['total_quantity'];
$response['monthly_revenue'] = $monthly_data['total_value'];

// Active consumers count (unique consumers with accepted orders)
$consumers_sql = "SELECT COUNT(DISTINCT consumer_id) as count FROM direct_orders WHERE pushed_to_blockchain = 1";
$consumers_result = $conn->query($consumers_sql);
$response['active_consumers'] = $consumers_result ? $consumers_result->fetch_assoc()['count'] : 0;

// Add debug info
$response['debug'] = [
    'pending_query' => $pending_sql,
    'pending_rows_found' => count($pending_orders),
    'total_orders_in_db' => $conn->query("SELECT COUNT(*) as count FROM direct_orders")->fetch_assoc()['count']
];

$conn->close();

echo json_encode($response, JSON_PRETTY_PRINT);
?>