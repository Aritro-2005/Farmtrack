<?php
// Database configuration
$host = "localhost";
$user = "root";
$password = "";
$database = "farmtrack";

// Create connection
$conn = new mysqli($host, $user, $password, $database);

// Check connection
if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error);
}

// Check if form is submitted
if ($_SERVER["REQUEST_METHOD"] === "POST") {

    // Get and sanitize inputs
    $name = trim($_POST["Name"]);
    $email = trim($_POST["Email"]);
    $subject = trim($_POST["Subject"]);
    $message = trim($_POST["Message"]);

    // Basic validation
    if (empty($name) || empty($email) || empty($subject) || empty($message)) {
        echo "All fields are required.";
        exit;
    }

    // Prepare SQL statement (prevents SQL injection)
    $stmt = $conn->prepare(
        "INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)"
    );
    $stmt->bind_param("ssss", $name, $email, $subject, $message);

    if ($stmt->execute()) {
        echo "<span style='color:green;'>Message sent successfully! We'll get back to you soon.</span>";
    } else {
        echo "<span style='color:red;'>Sorry, there was an error sending your message. Please try again later.</span>";
    }

    $stmt->close();

    $conn->close();
    }

 else {
    echo "<span style='color:red;'>Invalid request method.</span>";
}
?>