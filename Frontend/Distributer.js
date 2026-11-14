// --- Global State Simulation (Offline Data) ---
let localVerifications = JSON.parse(localStorage.getItem('verifications')) || [];
let farmerOrders = JSON.parse(localStorage.getItem('farmerOrders')) || [];
let inventoryStock = JSON.parse(localStorage.getItem('inventoryStock')) || [
    { id: 'spinach_001', name: 'Organic Spinach', stock: 80, rating: '⭐️ 4.9', lastFeedback: 'No recent verification.' }
]; 
let farmerCart = {}; 
let farmerReports = JSON.parse(localStorage.getItem('farmerReports')) || []; 
let consumerReports = JSON.parse(localStorage.getItem('consumerReports')) || []; // NEW: Consumer Reports storage

const networkStatusEl = document.getElementById('network-status');
const verificationModal = document.getElementById('verification-modal');
const farmerCartModal = document.getElementById('farmer-cart-modal');
const addStockModal = document.getElementById('add-stock-modal');
const reportSelectionModal = document.getElementById('report-selection-modal'); // NEW
const reportFarmerModal = document.getElementById('report-farmer-modal'); 
const reportConsumerModal = document.getElementById('report-consumer-modal'); // NEW
const pendingVerificationEl = document.getElementById('pending-verification');
const cartCountEl = document.getElementById('cart-count');

let isOnline = navigator.onLine;

// --- Core UI Navigation and Data Rendering (No Change) ---
function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');
}

function renderInventoryList() {
    const listContainer = document.getElementById('inventory-list');
    listContainer.innerHTML = '';
    
    inventoryStock.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inventory-item card';
        itemDiv.setAttribute('data-product-id', item.id);
        itemDiv.innerHTML = `
            <h4>${item.name}</h4>
            <p>Stock: ${item.stock} kg | Avg. Consumer Rating: ${item.rating || 'N/A'}</p>
            <small id="feedback-${item.id}">Distributor Note: ${item.lastFeedback || 'No recent verification.'}</small>
        `;
        listContainer.appendChild(itemDiv);
    });
}

function updateUI() {
    networkStatusEl.textContent = isOnline ? '🟢 ONLINE' : '🔴 OFFLINE';
    networkStatusEl.className = isOnline ? 'online' : 'offline';
    
    const unsyncedCount = localVerifications.filter(v => v.synced === false).length;
    pendingVerificationEl.textContent = unsyncedCount;
    
    cartCountEl.textContent = Object.keys(farmerCart).length;
    
    renderInventoryList();
}

// --- Navigation Callbacks from HTML (No Change) ---
function showFarmerOrderPage() {
    showPage('farmer-order-page');
    updateUI();
}

function showConsumerOrdersPage() {
    showPage('consumer-orders-page');
}


// --- Farmer Order Logic (No Change) ---

function getProductData(productId) {
    const card = document.querySelector(`.product-card[data-product-id="${productId}"]`);
    if (!card) return null;
    return {
        name: card.dataset.productName,
        farmer: card.dataset.farmerName,
        qtyInput: document.getElementById(`qty-${productId}`)
    };
}

function addToCart(productId) {
    const productData = getProductData(productId);
    const quantity = parseFloat(productData.qtyInput.value);

    if (quantity <= 0 || isNaN(quantity)) {
        alert('Please enter a valid quantity.');
        return;
    }

    farmerCart[productId] = { 
        name: productData.name, 
        farmer: productData.farmer,
        qty: quantity 
    };
    
    alert(`${quantity} kg of ${productData.name} added to cart! Click the Cart button to place the order.`);
    updateUI();
}

function orderNow(productId) {
    const productData = getProductData(productId);
    const quantity = parseFloat(productData.qtyInput.value);

    if (quantity <= 0 || isNaN(quantity)) {
        alert('Please enter a valid quantity.');
        return;
    }
    
    const orderRecord = {
        id: 'F' + Date.now() + Math.floor(Math.random() * 100),
        product: productData.name,
        farmer: productData.farmer,
        quantity: quantity,
        date: new Date().toLocaleDateString(),
        synced: false,
        status: 'Pending Farmer Confirmation'
    };
    
    farmerOrders.push(orderRecord);
    localStorage.setItem('farmerOrders', JSON.stringify(farmerOrders));

    alert(`Order for ${quantity} kg of ${orderRecord.product} placed instantly and saved LOCALLY!`);
    showPage('dashboard-page');
    updateUI();
}

// --- Cart Modal Functions (No Change) ---
function renderCart() {
    const container = document.getElementById('cart-items-container');
    const placeOrderBtn = document.getElementById('place-order-btn');
    container.innerHTML = '';
    const items = Object.values(farmerCart);

    if (items.length === 0) {
        container.innerHTML = '<p id="empty-cart-message">Your cart is empty.</p>';
        placeOrderBtn.disabled = true;
        return;
    }

    placeOrderBtn.disabled = false;
    
    items.forEach(item => {
        const productId = Object.keys(farmerCart).find(key => farmerCart[key] === item);
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <div class="cart-item-details">
                <strong>${item.name}</strong> (${item.qty} kg)<br>
                <small>From: ${item.farmer}</small>
            </div>
            <div class="cart-item-actions">
                <button onclick="removeFromCart('${productId}')">
                    &times;
                </button>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}

function removeFromCart(productId) {
    delete farmerCart[productId];
    renderCart(); 
    updateUI();
}

function showFarmerCart() {
    renderCart();
    farmerCartModal.style.display = 'block';
}

function closeFarmerCart() {
    farmerCartModal.style.display = 'none';
}

function placeOrderFromCart() {
    const itemsToOrder = Object.values(farmerCart);
    if (itemsToOrder.length === 0) return;

    itemsToOrder.forEach(item => {
        const orderRecord = {
            id: 'F' + Date.now() + Math.floor(Math.random() * 100),
            product: item.name,
            farmer: item.farmer,
            quantity: item.qty,
            date: new Date().toLocaleDateString(),
            synced: false,
            status: 'Pending Farmer Confirmation'
        };
        farmerOrders.push(orderRecord);
    });

    localStorage.setItem('farmerOrders', JSON.stringify(farmerOrders));
    
    alert(`Bulk order for ${itemsToOrder.length} items saved LOCALLY!`);

    farmerCart = {}; 
    closeFarmerCart();
    updateUI();
    showPage('dashboard-page');
}


// --- Search/Filter Logic (No Change) ---
function filterProducts() {
    const searchTerm = document.getElementById('product-search').value.toLowerCase();
    const productCards = document.querySelectorAll('.product-catalog-grid .product-card');

    productCards.forEach(card => {
        const productName = card.dataset.productName.toLowerCase();
        const farmerName = card.dataset.farmerName.toLowerCase();
        
        if (productName.includes(searchTerm) || farmerName.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// --- Verification and Inventory Update Logic (No Change) ---
function showVerificationScreen() {
    // Mock data for a product that just arrived (or is ready for feedback)
    const mockOrder = { product: "Organic Tomatoes", orderedQty: 50, tempId: 'tomato_101' };
    
    document.getElementById('product-name-verify').value = mockOrder.product;
    document.getElementById('ordered-qty-display').textContent = `${mockOrder.orderedQty} kg`;
    document.getElementById('received-qty').value = mockOrder.orderedQty; 
    document.getElementById('verification-form').setAttribute('data-product-id', mockOrder.tempId); 

    verificationModal.style.display = 'block';
}

function closeVerificationModal() {
    verificationModal.style.display = 'none';
}

document.getElementById('verification-form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const productId = this.getAttribute('data-product-id');
    const productName = document.getElementById('product-name-verify').value;
    const receivedQty = parseFloat(document.getElementById('received-qty').value);
    const qualityScore = parseInt(document.getElementById('quality-score').value);
    const feedbackText = document.getElementById('distributor-feedback').value;
    
    const verificationData = {
        id: Date.now(),
        productId: productId,
        product: productName,
        receivedQty: receivedQty,
        qualityScore: qualityScore,
        feedback: feedbackText,
        timestamp: new Date().toISOString(),
        synced: false,
    };

    localVerifications.push(verificationData);
    localStorage.setItem('verifications', JSON.stringify(localVerifications));
    
    // --- DISTRIBUTOR CHECK & STORE LOGIC (Update Inventory and Feedback) ---
    const existingItem = inventoryStock.find(item => item.id === productId);

    if (existingItem) {
        existingItem.stock += receivedQty; 
        existingItem.lastFeedback = `${feedbackText} (Rating: ${qualityScore}/5). Quantity check: ${receivedQty} kg received.`;
        existingItem.rating = `⭐️ ${qualityScore}/5 (New Batch)`; 
    } else {
         inventoryStock.push({
            id: productId,
            name: productName,
            stock: receivedQty,
            rating: `⭐️ ${qualityScore}/5`,
            lastFeedback: `${feedbackText} (Rating: ${qualityScore}/5).`
        });
    }
    localStorage.setItem('inventoryStock', JSON.stringify(inventoryStock));
    // --------------------------------------------------------

    alert(`Verification complete for ${productName}. Stock updated locally. Feedback saved for consumer review.`);

    closeVerificationModal();
    updateUI(); 
});


// --- Manual Stock Addition (No Change) ---
function showAddStockModal() {
    addStockModal.style.display = 'block';
}
function closeAddStockModal() {
    addStockModal.style.display = 'none';
}

document.getElementById('add-stock-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const name = document.getElementById('stock-product-name').value;
    const qty = parseFloat(document.getElementById('stock-quantity').value);
    const source = document.getElementById('stock-source').value;
    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();

    const existing = inventoryStock.find(item => item.name === name);

    if (existing) {
        existing.stock += qty;
        existing.lastFeedback = `Manually added ${qty} kg on ${new Date().toLocaleDateString()}. Source: ${source}`;
    } else {
        inventoryStock.push({
            id: newId,
            name: name,
            stock: qty,
            rating: 'N/A',
            lastFeedback: `Manually added ${qty} kg on ${new Date().toLocaleDateString()}. Source: ${source}`
        });
    }
    localStorage.setItem('inventoryStock', JSON.stringify(inventoryStock));
    alert(`${qty} kg of ${name} added to your stock.`);
    closeAddStockModal();
    updateUI();
});

// --- NEW: Report Selection & Forms Logic ---

function showReportSelectionModal() {
    reportSelectionModal.style.display = 'block';
}

function closeReportSelectionModal() {
    reportSelectionModal.style.display = 'none';
}

// Show Farmer Modal from Selection
function showReportFarmerModal() {
    closeReportSelectionModal();
    reportFarmerModal.style.display = 'block';
}

function closeReportFarmerModal() {
    reportFarmerModal.style.display = 'none';
}

// Show Consumer Modal from Selection
function showReportConsumerModal() {
    closeReportSelectionModal();
    reportConsumerModal.style.display = 'block';
}

function closeReportConsumerModal() {
    reportConsumerModal.style.display = 'none';
}

document.getElementById('report-farmer-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const reportData = {
        id: 'R_F' + Date.now(),
        farmerName: document.getElementById('report-farmer-name').value,
        issueType: document.getElementById('report-issue-farmer').value,
        details: document.getElementById('report-details-farmer').value,
        timestamp: new Date().toISOString(),
        type: 'farmer',
        synced: false
    };

    farmerReports.push(reportData);
    localStorage.setItem('farmerReports', JSON.stringify(farmerReports));
    
    alert(`Report against ${reportData.farmerName} submitted LOCALLY.`);
    
    this.reset();
    closeReportFarmerModal();
    updateUI();
});

document.getElementById('report-consumer-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const reportData = {
        id: 'R_C' + Date.now(),
        consumerName: document.getElementById('report-consumer-name').value,
        issueType: document.getElementById('report-issue-consumer').value,
        details: document.getElementById('report-details-consumer').value,
        timestamp: new Date().toISOString(),
        type: 'consumer',
        synced: false
    };

    consumerReports.push(reportData); // Save to the new consumerReports array
    localStorage.setItem('consumerReports', JSON.stringify(consumerReports));
    
    alert(`Report against consumer ${reportData.consumerName} submitted LOCALLY.`);
    
    this.reset();
    closeReportConsumerModal();
    updateUI();
});

// --- NEW: Consumer Order Two-Step Process Logic ---

function agreeToOrder(orderId) {
    const agreeBtn = document.querySelector(`#actions-${orderId} .action-btn.primary`);
    const dispatchBtn = document.getElementById(`dispatch-${orderId}`);
    const statusEl = document.getElementById(`status-${orderId}`);

    // Change button appearance and enable dispatch
    agreeBtn.style.display = 'none';
    dispatchBtn.disabled = false;
    dispatchBtn.style.backgroundColor = 'var(--primary-color)';
    dispatchBtn.classList.add('primary');
    
    statusEl.innerHTML = statusEl.innerHTML.replace('Awaiting Distributor Check', 'Ready for Dispatch');

    alert(`Distributor has AGREED to fulfill order ${orderId}. Ready for dispatch.`);
}

function dispatchOrder(orderId) {
    const orderCard = document.querySelector(`.order-card[data-order-id="${orderId}"]`);
    if (!orderCard) return;

    // Check if the dispatch button is enabled (meaning distributor agreed)
    const dispatchBtn = document.getElementById(`dispatch-${orderId}`);
    if (dispatchBtn.disabled) {
        alert("Please click 'Agree to Order' first before dispatching.");
        return;
    }
    
    // Simulate order dispatch and removal
    orderCard.remove(); 
    document.getElementById('new-consumer-orders').textContent = 1; // Update metric manually (mock)

    alert(`Order ${orderId} DISPATCHED successfully!`);
}

// --- Synchronization Simulation (Updated to include farmerReports and consumerReports) ---
function syncData() {
    const unsyncedOrders = farmerOrders.filter(o => o.synced === false);
    const unsyncedFarmerReports = farmerReports.filter(r => r.synced === false); 
    const unsyncedConsumerReports = consumerReports.filter(r => r.synced === false); // NEW
    
    const totalUnsynced = localVerifications.length + unsyncedOrders.length + unsyncedFarmerReports.length + unsyncedConsumerReports.length;
    
    if (totalUnsynced === 0) {
        alert("No local data to sync.");
        return;
    }

    if (!isOnline) {
        alert("Cannot sync: You are currently OFFLINE.");
        return;
    }

    networkStatusEl.textContent = '🟡 SYNCING...';
    networkStatusEl.className = 'syncing';
    
    setTimeout(() => {
        // Mark all local data as synced
        localVerifications = [];
        farmerOrders = farmerOrders.map(o => ({ ...o, synced: true })); 
        farmerReports = farmerReports.map(r => ({ ...r, synced: true })); 
        consumerReports = consumerReports.map(r => ({ ...r, synced: true })); // NEW

        localStorage.setItem('verifications', JSON.stringify(localVerifications));
        localStorage.setItem('farmerOrders', JSON.stringify(farmerOrders));
        localStorage.setItem('farmerReports', JSON.stringify(farmerReports)); 
        localStorage.setItem('consumerReports', JSON.stringify(consumerReports)); // NEW

        updateUI();
        alert(`✅ Sync Complete! ${totalUnsynced} total records processed.`);

    }, 2000); 

}

// Listen for actual browser network changes (No Change)
window.addEventListener('online', () => { isOnline = true; updateUI(); });
window.addEventListener('offline', () => { isOnline = false; updateUI(); });

// Initial Load: Ensure dashboard is the starting view (No Change)
window.onload = () => {
    updateUI();
    showPage('dashboard-page');
};