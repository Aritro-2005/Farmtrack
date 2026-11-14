// Add this at the beginning of your file with other event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('FARMFRESH READY');
    
    // Initialize main page
    initializeMainPage();
    
    // Initialize form page elements
    if (document.getElementById('deliveryDate')) {
        setDeliveryDate();
        document.getElementById('successMessage').style.display = 'none';
    }
    
    // Add input event listener for quantity to update price in real-time
    const quantityInput = document.getElementById('quantity');
    if (quantityInput) {
        quantityInput.addEventListener('input', updatePrice);
    }
    
    // Add change event for product to update price
    const productInput = document.getElementById('product');
    if (productInput) {
        productInput.addEventListener('change', updatePrice);
    }
});

const productsDB = {
    organic: [
        "Organic Tomatoes - Nashik",
        "Organic Apples - Himachal Pradesh",
        "Organic Bananas - Kerala",
        "Organic Spinach - Punjab",
        "Organic Potatoes - Uttar Pradesh",
        "Organic Onions - Maharashtra",
        "Organic Rice - West Bengal",
        "Organic Wheat - Madhya Pradesh",
        "Organic Mangoes - Ratnagiri",
        "Organic Oranges - Nagpur",
        "Organic Carrots - Karnataka",
        "Organic Cauliflower - Bihar",
        "Organic Cabbage - Haryana",
        "Organic Ginger - Kerala",
        "Organic Turmeric - Tamil Nadu"
    ],
    inorganic: [
        "Fresh Tomatoes - Nashik",
        "Fresh Apples - Himachal Pradesh",
        "Fresh Bananas - Kerala",
        "Fresh Spinach - Punjab",
        "Fresh Potatoes - Uttar Pradesh",
        "Fresh Onions - Maharashtra",
        "Basmati Rice - Dehradun",
        "Whole Wheat - Punjab",
        "Alphonso Mangoes - Ratnagiri",
        "Nagpur Oranges",
        "Fresh Carrots - Karnataka",
        "Fresh Cauliflower - Bihar",
        "Fresh Cabbage - Haryana",
        "Fresh Ginger - Kerala",
        "Fresh Garlic - Madhya Pradesh"
    ]
};

const priceDB = {
    "Organic Tomatoes - Nashik": 80,
    "Organic Apples - Himachal Pradesh": 200,
    "Organic Bananas - Kerala": 60,
    "Organic Spinach - Punjab": 40,
    "Organic Potatoes - Uttar Pradesh": 50,
    "Organic Onions - Maharashtra": 70,
    "Organic Rice - West Bengal": 120,
    "Organic Wheat - Madhya Pradesh": 100,
    "Organic Mangoes - Ratnagiri": 400,
    "Organic Oranges - Nagpur": 150,
    "Organic Carrots - Karnataka": 60,
    "Organic Cauliflower - Bihar": 50,
    "Organic Cabbage - Haryana": 45,
    "Organic Ginger - Kerala": 80,
    "Organic Turmeric - Tamil Nadu": 120,
    "Fresh Tomatoes - Nashik": 60,
    "Fresh Apples - Himachal Pradesh": 180,
    "Fresh Bananas - Kerala": 50,
    "Fresh Spinach - Punjab": 30,
    "Fresh Potatoes - Uttar Pradesh": 40,
    "Fresh Onions - Maharashtra": 60,
    "Basmati Rice - Dehradun": 100,
    "Whole Wheat - Punjab": 80,
    "Alphonso Mangoes - Ratnagiri": 350,
    "Nagpur Oranges": 120,
    "Fresh Carrots - Karnataka": 50,
    "Fresh Cauliflower - Bihar": 40,
    "Fresh Cabbage - Haryana": 35,
    "Fresh Ginger - Kerala": 70,
    "Fresh Garlic - Madhya Pradesh": 90
};

// ============================================
// GLOBAL VARIABLES
// ============================================

let currentQuantity = 1;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('FARMFRESH READY');
    
    // Initialize main page
    initializeMainPage();
    
    // Initialize form page elements (if they exist)
    if (document.getElementById('deliveryDate')) {
        setDeliveryDate();
        document.getElementById('successMessage').style.display = 'none';
    }
});

function initializeMainPage() {
    // Add hover effect to order button
    setInterval(() => {
        const orderBtn = document.querySelector('.btn-order');
        if (orderBtn) {
            orderBtn.style.transform = 'scale(1.02)';
            setTimeout(() => {
                orderBtn.style.transform = 'scale(1)';
            }, 200);
        }
    }, 2000);
    
    // Initialize category clicks
    initializeCategoryClicks();
}

// ============================================
// MAIN PAGE FUNCTIONS
// ============================================

function openOrderForm() {
    document.getElementById('orderModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    setDeliveryDate(); // Reset delivery date when opening form
}

function closeOrderForm() {
    document.getElementById('orderModal').style.display = 'none';
    document.body.style.overflow = 'auto'; // Enable scrolling
    
    // Reset form
    resetFormFields();
    
    // Hide success message if visible
    const successMsg = document.getElementById('successMessage');
    if (successMsg) {
        successMsg.style.display = 'none';
    }
    
    // Show form if hidden
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.style.display = 'block';
    }
}

function initializeCategoryClicks() {
    const categories = document.querySelectorAll('.cat-item');
    categories.forEach(cat => {
        cat.addEventListener('click', function(e) {
            const element = e.currentTarget;
            
            // Highlight effect
            element.style.background = 'var(--green)';
            element.querySelector('h3').style.color = 'var(--white)';
            element.querySelector('i').style.color = 'var(--white)';
            
            setTimeout(() => {
                element.style.background = 'var(--white)';
                element.querySelector('h3').style.color = 'var(--text-primary)';
                element.querySelector('i').style.color = 'var(--green)';
            }, 300);
            
            // Get category text
            const category = element.querySelector('h3').textContent;
            showMessage(`📦 Showing: ${category}`);
        });
    });
}

function selectCategory(category) {
    // This is called from onclick, but we'll let the event listener handle it
    showMessage(`📦 Category selected: ${category}`);
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        
        // Update active nav link
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
            }
        });
    }
}

function showMessage(text) {
    // Create message element
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--green);
        color: var(--white);
        padding: 1rem 2rem;
        font-weight: bold;
        z-index: 1000;
        animation: slideIn 0.3s;
        border: 2px solid white;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(msg);
    
    // Remove after 2 seconds
    setTimeout(() => {
        msg.remove();
    }, 2000);
}

// ============================================
// FORM FUNCTIONS
// ============================================

function setDeliveryDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    const deliveryDateField = document.getElementById('deliveryDate');
    if (deliveryDateField) {
        deliveryDateField.value = tomorrow.toLocaleDateString('en-US', options);
    }
}

function updateProductList() {
    const category = document.getElementById('category').value;
    const productInput = document.getElementById('product');
    
    if (category) {
        productInput.disabled = false;
        productInput.placeholder = `Search ${category} products...`;
        productInput.focus();
    } else {
        productInput.disabled = true;
        productInput.placeholder = 'First select a category above';
        productInput.value = '';
        document.getElementById('price').textContent = '0.00';
    }
    
    // Clear suggestions
    document.getElementById('suggestions').innerHTML = '';
    document.getElementById('suggestions').style.display = 'none';
}

function searchProducts() {
    const category = document.getElementById('category').value;
    const input = document.getElementById('product').value.toLowerCase();
    const suggestionsBox = document.getElementById('suggestions');
    
    if (!category) {
        alert('Please select a category first');
        document.getElementById('product').value = '';
        return;
    }
    
    if (input.length < 1) {
        suggestionsBox.style.display = 'none';
        return;
    }
    
    const products = productsDB[category] || [];
    const matches = products.filter(product => 
        product.toLowerCase().includes(input)
    );
    
    if (matches.length > 0) {
        suggestionsBox.innerHTML = matches
            .map(product => `<div class="suggestion-item" onclick="selectProduct('${product.replace(/'/g, "\\'")}')">${product}</div>`)
            .join('');
        suggestionsBox.style.display = 'block';
    } else {
        suggestionsBox.innerHTML = '<div class="suggestion-item">No products found</div>';
        suggestionsBox.style.display = 'block';
    }
}

function selectProduct(product) {
    document.getElementById('product').value = product;
    document.getElementById('suggestions').style.display = 'none';
    updatePrice();
}

function updatePrice() {
    const product = document.getElementById('product').value;
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    
    if (product && priceDB[product]) {
        const unitPrice = priceDB[product];
        const totalPrice = unitPrice * quantity;
        document.getElementById('price').textContent = totalPrice.toFixed(2);
    } else {
        document.getElementById('price').textContent = '0.00';
    }
}

function changeQuantity(change) {
    const input = document.getElementById('quantity');
    let value = parseInt(input.value) || 1;
    value += change;
    
    if (value < 1) value = 1;
    if (value > 100) value = 100;
    
    input.value = value;
    updatePrice();
}

function resetFormFields() {
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.reset();
    }
    
    const priceField = document.getElementById('price');
    if (priceField) {
        priceField.textContent = '0.00';
    }
    
    const suggestionsBox = document.getElementById('suggestions');
    if (suggestionsBox) {
        suggestionsBox.innerHTML = '';
        suggestionsBox.style.display = 'none';
    }
    
    const productInput = document.getElementById('product');
    if (productInput) {
        productInput.disabled = true;
        productInput.placeholder = 'First select a category above';
    }
    
    setDeliveryDate();
}
function submitOrder(event) {
    event.preventDefault();
    
    const form = document.getElementById('orderForm');
    const formData = new FormData(form);
    
    // Get the price from the span element and add it to formData
    const priceValue = document.getElementById('price').textContent;
    formData.append('price', priceValue);

    // Show loading state
    const submitBtn = document.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'PROCESSING...';
    submitBtn.disabled = true;

    // Send data to PHP without reloading the page
    fetch('order.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // Hide form and show the success message
            form.style.display = 'none';
            document.getElementById('successMessage').style.display = 'block';
            
            // Format the order summary with all details
            document.getElementById('orderSummary').innerHTML = `
                <div style="text-align: left; padding: 15px; background: #f9f9f9; border-radius: 10px;">
                    <p><strong>Order ID:</strong> ${data.order_id}</p>
                    <p><strong>Product:</strong> ${formData.get('product')}</p>
                    <p><strong>Category:</strong> ${formData.get('category')}</p>
                    <p><strong>Quantity:</strong> ${formData.get('quantity')} kg</p>
                    <p><strong>Total:</strong> ₹${priceValue}</p>
                    <p><strong>Delivery:</strong> ${formData.get('deliveryDate')}</p>
                    <p><strong>Payment:</strong> ${formData.get('payment') === 'now' ? 'Pay Now' : 'Pay on Delivery'}</p>
                    <p><strong>Location:</strong> ${formData.get('location').substring(0, 50)}...</p>
                    <p style="color: green; margin-top: 10px;"><i class="fas fa-check-circle"></i> ✓ Successfully saved to database!</p>
                </div>
            `;
        } else {
            alert("Error: " + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Could not connect to server. Please check if XAMPP/WAMP is running.");
    })
    .finally(() => {
        // Restore button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
}
function placeAnotherOrder() {
    // Hide success message
    document.getElementById('successMessage').style.display = 'none';
    
    // Show form
    document.getElementById('orderForm').style.display = 'block';
    
    // Reset form
    resetFormFields();
}

// ============================================
// WINDOW EVENT LISTENERS
// ============================================

// Active navigation on scroll
window.addEventListener('scroll', function() {
    const sections = ['home', 'products', 'orders', 'contact'];
    const scrollPos = window.scrollY + 100;
    
    sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) {
            const top = element.offsetTop;
            const bottom = top + element.offsetHeight;
            
            if (scrollPos >= top && scrollPos < bottom) {
                document.querySelectorAll('.nav-links a').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${section}`) {
                        link.classList.add('active');
                    }
                });
            }
        }
    });
});

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('orderModal');
    if (event.target === modal) {
        closeOrderForm();
    }
});

// Close suggestions when clicking outside
document.addEventListener('click', function(event) {
    const suggestions = document.getElementById('suggestions');
    const productInput = document.getElementById('product');
    
    if (suggestions && productInput) {
        if (event.target !== productInput && !suggestions.contains(event.target)) {
            suggestions.style.display = 'none';
        }
    }
});

// Keyboard support
document.addEventListener('keydown', function(event) {
    // Press ESC to close modal or clear suggestions
    if (event.key === 'Escape') {
        const modal = document.getElementById('orderModal');
        if (modal.style.display === 'block') {
            closeOrderForm();
        }
        
        const suggestions = document.getElementById('suggestions');
        if (suggestions) {
            suggestions.style.display = 'none';
        }
    }
    
    // Press 'O' for Order Now (only when modal is closed)
    if ((event.key === 'o' || event.key === 'O') && document.getElementById('orderModal').style.display !== 'block') {
        openOrderForm();
    }
});