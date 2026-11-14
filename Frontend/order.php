<?php
header('Content-Type: application/json');

// Database configuration
$host = "localhost";
$username = "root"; 
$password = "";     
$dbname = "farmtrack";

// Create connection
$conn = new mysqli($host, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    echo json_encode(["status" => "error", "message" => "Connection failed: " . $conn->connect_error]);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Get form data and sanitize
    $category = $conn->real_escape_string($_POST['category']);
    $product_name = $conn->real_escape_string($_POST['product']);
    $quantity = (int)$_POST['quantity'];
    $price = (float)$_POST['price'];
    $location = $conn->real_escape_string($_POST['location']);
    $delivery_date = $conn->real_escape_string($_POST['deliveryDate']);
    $payment_method = $conn->real_escape_string($_POST['payment']);
    
    // Generate IDs to match the SQL schema
    $order_id = "ORD-" . time() . "-" . rand(1000, 9999);
    $consumer_id = "CONS-LIVE-01"; 
    $farmer_id = "FARM-AUTO-01";
    $product_id = "PROD-" . strtoupper(substr(md5($product_name), 0, 8));

    // First, check if we need to add columns to the table
    $check_columns = $conn->query("SHOW COLUMNS FROM direct_orders LIKE 'delivery_location'");
    if ($check_columns->num_rows == 0) {
        // Add missing columns if they don't exist
        $alter1 = "ALTER TABLE direct_orders ADD COLUMN delivery_location TEXT AFTER price";
        $alter2 = "ALTER TABLE direct_orders ADD COLUMN delivery_date VARCHAR(100) AFTER delivery_location";
        $alter3 = "ALTER TABLE direct_orders ADD COLUMN payment_method VARCHAR(50) AFTER delivery_date";
        
        $conn->query($alter1);
        $conn->query($alter2);
        $conn->query($alter3);
    }

    // Prepare SQL query with all fields
    $sql = "INSERT INTO direct_orders (
                order_id, consumer_id, farmer_id, product_id, 
                product_name, product_category, quantity, price,
                delivery_location, delivery_date, payment_method
            ) VALUES (
                '$order_id', '$consumer_id', '$farmer_id', '$product_id', 
                '$product_name', '$category', $quantity, $price,
                '$location', '$delivery_date', '$payment_method'
            )";

    if ($conn->query($sql) === TRUE) {
        // Get the inserted data for confirmation
        $result = $conn->query("SELECT * FROM direct_orders WHERE order_id = '$order_id'");
        $inserted_data = $result->fetch_assoc();
        
        echo json_encode([
            "status" => "success", 
            "order_id" => $order_id,
            "message" => "Order saved successfully",
            "data" => $inserted_data
        ]);
    } else {
        echo json_encode([
            "status" => "error", 
            "message" => "Database error: " . $conn->error
        ]);
    }
} else {
    echo json_encode([
        "status" => "error", 
        "message" => "Invalid request method"
    ]);
}

$conn->close();
?>