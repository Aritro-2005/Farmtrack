<?php
session_start();

// Database Connection
$conn = new mysqli("localhost", "root", "", "farmtrack");

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Get form data
$email = trim($_POST['email']);
$password = trim($_POST['password']);

// Check email
$sql = "SELECT * FROM user_form WHERE email = '$email'";
$result = $conn->query($sql);

if ($result->num_rows == 1) {

    $row = $result->fetch_assoc();

    // 🔐 Verify hashed password
    if (password_verify($password, $row['password_hash'])) {

        $_SESSION['user_id'] = $row['id'];
        $_SESSION['role'] = $row['category'];

        // Redirect based on category column
        if ($row['category'] == "farmer") {
            header("Location: farmer.html");
        } 
        elseif ($row['category'] == "consumer") {
            header("Location: consumer.html");
        } 
        elseif ($row['category'] == "government") {
            header("Location: govt.html");
        }
        else {
            echo "Role not defined!";
        }

        exit();

    } else {
        echo "Invalid Password!";
    }

} else {
    echo "Invalid Email!";
}

$conn->close();
?>
