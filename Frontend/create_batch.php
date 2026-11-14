<?php
// Enable error reporting for troubleshooting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Database connection
$conn = new mysqli("localhost", "root", "", "farmtrack");

if ($conn->connect_error) {
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. Map HTML form names to your specific SQL column names
    $product_name = $_POST['product'] ?? '';
    $product_variety = $_POST['product_variety'] ?? '';
    $harvest_weight = $_POST['weight'] ?? 0;
    $harvest_date = $_POST['harvest_date'] ?? '';
    $farm_plot_id = $_POST['farm_id'] ?? '';
    $quality_grade = $_POST['quality_grade'] ?? '';
    $price_per_kg = $_POST['price_per_kg'] ?? 0;

    // 2. Handle File Upload (Stores the filename in 'certificate_hash')
    $cert_name = $_FILES['certificate_file']['name'] ?? '';
    $target_dir = "uploads/";
    
    // Create directory if missing
    if (!is_dir($target_dir)) {
        mkdir($target_dir, 0777, true);
    }
    
    $target_file = $target_dir . basename($cert_name);
    move_uploaded_file($_FILES['certificate_file']['tmp_name'], $target_file);

    // 3. SQL Insert matching your farm_batches.sql schema exactly
    $sql = "INSERT INTO farm_batches (
                product_name, 
                product_variety, 
                harvest_weight, 
                harvest_date, 
                farm_plot_id, 
                quality_grade, 
                price_per_kg, 
                certificate_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    
    // Bind parameters: s=string, d=double/decimal
    $stmt->bind_param(
        "ssdsssds", 
        $product_name, 
        $product_variety, 
        $harvest_weight, 
        $harvest_date, 
        $farm_plot_id, 
        $quality_grade, 
        $price_per_kg, 
        $cert_name
    );

    if ($stmt->execute()) {
        echo "Batch recorded successfully in farm_batches table";
    } else {
        http_response_code(500);
        echo "Database Error: " . $stmt->error;
    }

    $stmt->close();
}
$conn->close();
?>