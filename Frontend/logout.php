<?php
session_start();        // Start the session if it exists
session_unset();        // Clear all session variables
session_destroy();      // Destroy the session completely

// Redirect back to login page
header("Location: login.html");
exit;
?>
