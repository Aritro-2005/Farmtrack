document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Element References ---
    const sidebarLinks = document.querySelectorAll('.sidebar nav a');
    const contentSections = document.querySelectorAll('.content-section');
    const newBatchForm = document.getElementById('newBatchForm');
    const statusMessage = document.getElementById('statusMessage');
    const recentEventsTableBody = document.querySelector('#dashboard table tbody'); 
    const acceptButtons = document.querySelectorAll('.btn-accept');

    // REFERENCES for dynamic pricing
    const productSelect = document.getElementById('product');
    const setPriceSelect = document.getElementById('set-price');

    // REFERENCE for the Payments Download Button
    const downloadTaxReportButton = document.getElementById('downloadReportBtn'); 
    const paymentsSection = document.getElementById('payments'); 
    
    // Configuration for the Dashboard log
    const MAX_ROWS = 6;

    // --- 2. Tab Switching Logic (Unchanged) ---
    window.showSection = (sectionId) => {
        contentSections.forEach(section => {
            section.classList.remove('active');
        });
        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) {
            selectedSection.classList.add('active');
        }
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
            }
        });
    }
    sidebarLinks.forEach(link => {
        if (link.getAttribute('href').startsWith('#')) {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const sectionId = link.getAttribute('href').substring(1);
                showSection(sectionId);
            });
        }
    });
    showSection('dashboard');

    // --- 3. Load orders data when page loads ---
    loadOrdersData();
    
    // Refresh data every 30 seconds
    setInterval(loadOrdersData, 30000);

    // --- 4. Dynamic Pricing Logic (Unchanged) ---
    const populatePriceDropdown = (basePrice) => { 
        setPriceSelect.innerHTML = ''; 
        
        if (isNaN(basePrice) || basePrice <= 0) {
            setPriceSelect.innerHTML = '<option value="">Select Product First</option>';
            return;
        }
        
        const minPrice = basePrice * 0.90; 
        const maxPrice = basePrice * 1.10; 
        const step = basePrice * 0.01;      

        setPriceSelect.innerHTML = `<option value="">Default (Base Price ₹${basePrice.toFixed(2)}/kg)</option>`; 
        
        for (let price = minPrice; price <= maxPrice; price += step) {
            const roundedPrice = price.toFixed(2); 
            const option = document.createElement('option');
            option.value = roundedPrice;
            option.textContent = `₹${roundedPrice} / kg`; 
            setPriceSelect.appendChild(option);
        }
    };

    if (productSelect) {
        productSelect.addEventListener('change', () => {
            const selectedOption = productSelect.options[productSelect.selectedIndex];
            const basePrice = parseFloat(selectedOption.getAttribute('data-base-price')); 
            populatePriceDropdown(basePrice); 
        });
    }

    // ------------------------------------------------------------------
    // --- 5. New Batch Form Submission Simulation ---
    // ------------------------------------------------------------------
    if (newBatchForm) {
        newBatchForm.addEventListener('submit', (event) => {
            event.preventDefault(); 

            const selectedOption = productSelect.options[productSelect.selectedIndex];
            const productText = selectedOption.text.split('(')[0].trim();
            const basePriceValue = parseFloat(selectedOption.getAttribute('data-base-price'));

            const weight = document.getElementById('weight').value;
            const quality = document.getElementById('quality').value;
            let finalSetPrice = document.getElementById('set-price').value; 

            if (!finalSetPrice && !isNaN(basePriceValue)) {
                finalSetPrice = basePriceValue.toFixed(2);
            } else if (!finalSetPrice) {
                finalSetPrice = "N/A";
            }
            
            const batchID = '#BAT-' + Math.random().toString(16).slice(2, 8).toUpperCase();
            
            const now = new Date();
            const currentTimestamp = now.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';

            statusMessage.style.display = 'block';
            statusMessage.className = 'status-message';
            statusMessage.textContent = `Processing... Submitting ${productText} batch data to the Blockchain network.`;

            setTimeout(() => {
                statusMessage.className = 'status-message status-success-msg';
                statusMessage.innerHTML = `<i class="fas fa-check-circle"></i> **SUCCESS!** Blockchain Record Minted. <br> **Batch ID:** ${batchID} <br> Price Set: **₹${finalSetPrice}/kg**`;

                if (recentEventsTableBody) {
                    const newRow = recentEventsTableBody.insertRow(0); 
                    newRow.innerHTML = `<td>${batchID}</td><td>${productText}</td><td>Batch Created, Price Set: ₹${finalSetPrice}/kg</td><td>${currentTimestamp}</td>`;
                    
                    if (recentEventsTableBody.rows.length > MAX_ROWS) {
                        recentEventsTableBody.deleteRow(MAX_ROWS); 
                    }
                }

                newBatchForm.reset();
                setPriceSelect.innerHTML = '<option value="">Select Product First</option>'; 

            }, 2000); 
        });
    }

    // ------------------------------------------------------------------
    // --- 6. Accept Order Function (Updated for Shipment Table) ---
    // ------------------------------------------------------------------
    window.acceptOrder = (orderId, productName, consumerId, event) => {
        // Show confirmation dialog
        if (confirm(`Are you sure you want to accept this order?`)) {
            
            // Disable the button to prevent double submission
            const acceptBtn = event.target;
            acceptBtn.disabled = true;
            acceptBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            // Send AJAX request to update order status and create shipment
            fetch('accept_order.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'order_id=' + encodeURIComponent(orderId)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update the UI
                    const orderRow = document.getElementById('order-' + orderId.replace(/[^a-zA-Z0-9]/g, '_'));
                    if (orderRow) {
                        // Change the button to accepted status
                        const actionCell = orderRow.cells[6]; // Adjust index based on your table structure
                        actionCell.innerHTML = `<span class="status-accepted"><i class="fas fa-check-circle"></i> Accepted (Shipment: ${data.shipment_id})</span>`;
                        orderRow.style.backgroundColor = '#e6ffed';
                        orderRow.style.opacity = '0.7';
                    }

                    // Add to dashboard events
                    if (recentEventsTableBody) {
                        const now = new Date();
                        const currentTimestamp = now.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';
                        
                        const newRow = recentEventsTableBody.insertRow(0);
                        newRow.innerHTML = `
                            <td>${orderId}</td>
                            <td>${productName}</td>
                            <td><strong>Order Accepted - Shipment Created: ${data.shipment_id}</strong></td>
                            <td>${currentTimestamp}</td>
                        `;

                        // Keep only last 6 rows
                        if (recentEventsTableBody.rows.length > MAX_ROWS) {
                            recentEventsTableBody.deleteRow(MAX_ROWS);
                        }
                    }

                    // Show success message
                    alert('Order accepted successfully! Shipment ID: ' + data.shipment_id);
                    
                    // Refresh the orders data to update counts
                    setTimeout(() => {
                        loadOrdersData();
                    }, 2000);
                    
                } else {
                    alert('Error accepting order: ' + data.message);
                    // Re-enable the button
                    acceptBtn.disabled = false;
                    acceptBtn.innerHTML = '<i class="fas fa-check-circle"></i> Accept Order';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while accepting the order');
                // Re-enable the button
                acceptBtn.disabled = false;
                acceptBtn.innerHTML = '<i class="fas fa-check-circle"></i> Accept Order';
            });
        }
    };

    // ------------------------------------------------------------------
    // --- 7. Function to Load Orders Data from Database ---
    // ------------------------------------------------------------------
    function loadOrdersData() {
        fetch('get_orders.php')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Error:', data.error);
                    return;
                }
                
                // Log the data for debugging
                console.log('Orders data:', data);
                
                // Populate pending orders table
                const ordersTableBody = document.getElementById('ordersTableBody');
                if (ordersTableBody) {
                    ordersTableBody.innerHTML = '';
                    
                    if (data.pending_orders && data.pending_orders.length > 0) {
                        data.pending_orders.forEach(order => {
                            const row = document.createElement('tr');
                            // Create a safe ID for the row (remove special characters)
                            const safeOrderId = order.order_id.replace(/[^a-zA-Z0-9]/g, '_');
                            row.id = `order-${safeOrderId}`;
                            
                            // Format price as number with 2 decimal places
                            const price = parseFloat(order.price).toFixed(2);
                            
                            row.innerHTML = `
                                <td>${order.order_id}</td>
                                <td>${order.consumer_id}</td>
                                <td>${order.product_name}</td>
                                <td>${order.quantity}</td>
                                <td>₹${price}</td>
                                <td>${order.delivery_address || 'Not specified'}</td>
                                <td><button class="btn-accept" onclick="acceptOrder('${order.order_id}', '${order.product_name}', '${order.consumer_id}', event)"><i class="fas fa-check-circle"></i> Accept Order</button></td>
                            `;
                            ordersTableBody.appendChild(row);
                        });
                    } else {
                        ordersTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;">No pending orders found</td></tr>';
                    }
                }
                
                // Populate accepted orders table
                const acceptedTableBody = document.getElementById('acceptedOrdersTableBody');
                if (acceptedTableBody) {
                    acceptedTableBody.innerHTML = '';
                    
                    if (data.accepted_orders && data.accepted_orders.length > 0) {
                        data.accepted_orders.forEach(order => {
                            const row = document.createElement('tr');
                            const totalValue = parseFloat(order.total_value || (order.quantity * order.price)).toFixed(2);
                            
                            row.innerHTML = `
                                <td>${order.order_id}</td>
                                <td>${order.consumer_id}</td>
                                <td>${order.product_name}</td>
                                <td>${order.quantity}</td>
                                <td>₹${totalValue}</td>
                                <td><span class="status-accepted"><i class="fas fa-check-circle"></i> Accepted</span></td>
                            `;
                            acceptedTableBody.appendChild(row);
                        });
                    } else {
                        acceptedTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No recently accepted orders</td></tr>';
                    }
                }
                
                // Update statistics
                const pendingCount = document.getElementById('pendingCount');
                if (pendingCount) pendingCount.textContent = data.pending_count || 0;
                
                const monthlyQuantity = document.getElementById('monthlyQuantity');
                if (monthlyQuantity) monthlyQuantity.innerHTML = (data.monthly_quantity || 0) + ' <small>kg</small>';
                
                const monthlyRevenue = document.getElementById('monthlyRevenue');
                if (monthlyRevenue) monthlyRevenue.textContent = '₹' + (parseFloat(data.monthly_revenue) || 0).toFixed(0);
                
                const activeConsumers = document.getElementById('activeConsumers');
                if (activeConsumers) activeConsumers.textContent = data.active_consumers || 0;
            })
            .catch(error => {
                console.error('Error loading orders:', error);
            });
    }

    // ------------------------------------------------------------------
    // --- 8. Payments Section: Print-to-PDF Logic (Unchanged) ---
    // ------------------------------------------------------------------
    if (downloadTaxReportButton && paymentsSection) {
        downloadTaxReportButton.addEventListener('click', (event) => {
            event.preventDefault(); 
            
            // 1. Ensure the Payments section is active before printing
            showSection('payments'); 

            // 2. Trigger the browser print dialog immediately.
            window.print();
        });
    }
});