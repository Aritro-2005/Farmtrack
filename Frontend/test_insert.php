<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$conn = new mysqli("localhost", "root", "", "farmtrack");
if ($conn->connect_error) {
    die("DB FAIL: " . $conn->connect_error);
}

$sql = "INSERT INTO direct_orders (
    order_id, consumer_id, farmer_id, product_id,
    quantity, unit_price
) VALUES (
    'TEST123', 'CONS-TEST', 'FARM-TEST', 'PROD-TEST',
    1, 100
)";

if ($conn->query($sql)) {
    echo "INSERT OK";
} else {
    echo "SQL ERROR: " . $conn->error;
}
