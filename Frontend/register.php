<?php

// Database connection
$conn = new mysqli("localhost", "root", "", "farmtrack");

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Check if form submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    // Get form data
    $name      = $_POST['name'];
    $address   = $_POST['address'];
    $phone     = $_POST['phone'];
    $email     = $_POST['email'];
    $id_type   = $_POST['id_type'];
    $id_proof  = $_POST['id_proof'];
    $category  = $_POST['category'];
    $password  = $_POST['password'];

    // Encrypt password
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // Insert query
    $sql = "INSERT INTO user_form 
    (name, address, phone, email, id_type, id_proof, category, password_hash)
    VALUES 
    ('$name', '$address', '$phone', '$email', '$id_type', '$id_proof', '$category', '$hashed_password')";

    if ($conn->query($sql) === TRUE) {
        echo "Registration successful!";
    } else {
        echo "Error: " . $conn->error;
    }
}

$conn->close();
?>
