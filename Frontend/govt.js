// Sample certificate data
let certificates = [
    {
        id: "FT-2023-001234",
        farmerName: "Vikram Singh",
        farmLocation: "Nashik, Maharashtra",
        productType: "Organic Grapes",
        harvestDate: "15 March 2023",
        issueDate: "20 March 2023",
        status: "pending",
        notes: "This certificate confirms that the produce meets all organic farming standards."
    },
    {
        id: "FT-2023-001235",
        farmerName: "Priya Patel",
        farmLocation: "Varanasi, Uttar Pradesh",
        productType: "Basmati Rice",
        harvestDate: "10 February 2023",
        issueDate: "18 February 2023",
        status: "pending",
        notes: "Certified organic basmati rice with geographical indication."
    },
    {
        id: "FT-2023-001236",
        farmerName: "Rajesh Kumar",
        farmLocation: "Coimbatore, Tamil Nadu",
        productType: "Turmeric",
        harvestDate: "5 January 2023",
        issueDate: "12 January 2023",
        status: "pending",
        notes: "Traditional turmeric farming with no chemical pesticides."
    },
    {
        id: "FT-2023-001237",
        farmerName: "Anita Sharma",
        farmLocation: "Mysore, Karnataka",
        productType: "Coffee Beans",
        harvestDate: "28 February 2023",
        issueDate: "5 March 2023",
        status: "pending",
        notes: "Shade-grown coffee beans with fair trade certification."
    },
    {
        id: "FT-2023-001238",
        farmerName: "Sanjay Reddy",
        farmLocation: "Hyderabad, Telangana",
        productType: "Chili Peppers",
        harvestDate: "20 January 2023",
        issueDate: "28 January 2023",
        status: "pending",
        notes: "Organic chili peppers with high capsaicin content."
    },
    {
        id: "FT-2023-001239",
        farmerName: "Meera Iyer",
        farmLocation: "Kochi, Kerala",
        productType: "Coconut",
        harvestDate: "12 March 2023",
        issueDate: "19 March 2023",
        status: "pending",
        notes: "Organic coconuts from traditional coconut groves."
    }
];

// DOM elements
const certificateGrid = document.getElementById('certificateGrid');
const certificateModal = document.getElementById('certificateModal');
const closeModal = document.getElementById('closeModal');
const verifyBtn = document.getElementById('verifyBtn');
const rejectBtn = document.getElementById('rejectBtn');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const refreshBtn = document.getElementById('refreshBtn');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const pendingCount = document.getElementById('pendingCount');
const verifiedCount = document.getElementById('verifiedCount');
const rejectedCount = document.getElementById('rejectedCount');

// Modal detail elements
const modalCertId = document.getElementById('modalCertId');
const modalFarmerName = document.getElementById('modalFarmerName');
const modalFarmLocation = document.getElementById('modalFarmLocation');
const modalProductType = document.getElementById('modalProductType');
const modalHarvestDate = document.getElementById('modalHarvestDate');
const modalIssueDate = document.getElementById('modalIssueDate');
const modalStatus = document.getElementById('modalStatus');
const modalNotes = document.getElementById('modalNotes');

// Current certificate being viewed
let currentCertificate = null;

// Function to update stats
function updateStats() {
    const pending = certificates.filter(cert => cert.status === 'pending').length;
    const verified = certificates.filter(cert => cert.status === 'verified').length;
    const rejected = certificates.filter(cert => cert.status === 'rejected').length;
    
    pendingCount.textContent = pending;
    verifiedCount.textContent = verified;
    rejectedCount.textContent = rejected;
}

// Function to show toast notification
function showToast(message, isError = false) {
    toastMessage.textContent = message;
    toast.className = 'toast';
    if (isError) {
        toast.classList.add('error');
    }
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Function to render certificates
function renderCertificates() {
    certificateGrid.innerHTML = '';
    
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilterValue = statusFilter.value;
    
    const filteredCertificates = certificates.filter(cert => {
        const matchesSearch = cert.id.toLowerCase().includes(searchTerm) || 
                             cert.farmerName.toLowerCase().includes(searchTerm) ||
                             cert.productType.toLowerCase().includes(searchTerm);
        
        const matchesStatus = statusFilterValue === 'all' || cert.status === statusFilterValue;
        
        return matchesSearch && matchesStatus;
    });
    
    if (filteredCertificates.length === 0) {
        certificateGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--gray);">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>No certificates found</h3>
                <p>Try adjusting your search or filter criteria</p>
            </div>
        `;
        return;
    }
    
    filteredCertificates.forEach(cert => {
        const statusClass = `status-${cert.status}`;
        const statusText = cert.status === 'pending' ? 'Pending Verification' : 
                          cert.status === 'verified' ? 'Verified' : 'Rejected';
        
        const card = document.createElement('div');
        card.className = 'certificate-card';
        card.innerHTML = `
            <div class="certificate-image">
                <i class="fas fa-file-certificate"></i>
            </div>
            <div class="certificate-details">
                <div class="certificate-id">${cert.id}</div>
                <h3 class="certificate-title">${cert.productType}</h3>
                <div class="certificate-info">
                    <div class="info-item">
                        <span class="info-label">Farmer:</span>
                        <span class="info-value">${cert.farmerName}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Location:</span>
                        <span class="info-value">${cert.farmLocation}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Harvest Date:</span>
                        <span class="info-value">${cert.harvestDate}</span>
                    </div>
                </div>
                <span class="certificate-status ${statusClass}">${statusText}</span>
                <div class="certificate-actions">
                    <button class="btn btn-outline view-btn" data-id="${cert.id}">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    ${cert.status === 'pending' ? 
                        `<button class="btn btn-success verify-card-btn" data-id="${cert.id}">
                            <i class="fas fa-check"></i> Verify
                        </button>` : 
                        ''
                    }
                </div>
            </div>
        `;
        
        certificateGrid.appendChild(card);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const certId = this.getAttribute('data-id');
            openCertificateModal(certId);
        });
    });
    
    // Add event listeners to verify buttons on cards
    document.querySelectorAll('.verify-card-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const certId = this.getAttribute('data-id');
            const certificate = certificates.find(cert => cert.id === certId);
            
            if (certificate && certificate.status === 'pending') {
                certificate.status = 'verified';
                updateStats();
                renderCertificates();
                showToast(`Certificate ${certId} has been verified successfully!`);
            } else {
                showToast('This certificate cannot be verified again.', true);
            }
        });
    });
}

// Function to open certificate modal
function openCertificateModal(certId) {
    currentCertificate = certificates.find(cert => cert.id === certId);
    
    if (currentCertificate) {
        modalCertId.textContent = currentCertificate.id;
        modalFarmerName.textContent = currentCertificate.farmerName;
        modalFarmLocation.textContent = currentCertificate.farmLocation;
        modalProductType.textContent = currentCertificate.productType;
        modalHarvestDate.textContent = currentCertificate.harvestDate;
        modalIssueDate.textContent = currentCertificate.issueDate;
        modalNotes.textContent = currentCertificate.notes;
        
        // Update status
        const statusText = currentCertificate.status === 'pending' ? 'Pending Verification' : 
                         currentCertificate.status === 'verified' ? 'Verified' : 'Rejected';
        modalStatus.textContent = statusText;
        modalStatus.className = `certificate-status status-${currentCertificate.status}`;
        
        // Update button states
        if (currentCertificate.status === 'pending') {
            verifyBtn.disabled = false;
            rejectBtn.disabled = false;
        } else {
            verifyBtn.disabled = true;
            rejectBtn.disabled = true;
        }
        
        certificateModal.style.display = 'flex';
    }
}

// Function to close modal
function closeCertificateModal() {
    certificateModal.style.display = 'none';
    currentCertificate = null;
}

// Function to verify certificate
function verifyCertificate() {
    if (currentCertificate && currentCertificate.status === 'pending') {
        currentCertificate.status = 'verified';
        updateStats();
        renderCertificates();
        closeCertificateModal();
        showToast(`Certificate ${currentCertificate.id} has been verified successfully!`);
    } else {
        showToast('This certificate cannot be verified again.', true);
    }
}

// Function to reject certificate
function rejectCertificate() {
    if (currentCertificate && currentCertificate.status === 'pending') {
        const reason = prompt("Please provide a reason for rejection:");
        if (reason !== null) {
            currentCertificate.status = 'rejected';
            updateStats();
            renderCertificates();
            closeCertificateModal();
            showToast(`Certificate ${currentCertificate.id} has been rejected. Reason: ${reason}`);
        }
    } else {
        showToast('This certificate cannot be rejected.', true);
    }
}

// Event listeners
closeModal.addEventListener('click', closeCertificateModal);
verifyBtn.addEventListener('click', verifyCertificate);
rejectBtn.addEventListener('click', rejectCertificate);
refreshBtn.addEventListener('click', renderCertificates);

// Search and filter event listeners
searchInput.addEventListener('input', renderCertificates);
statusFilter.addEventListener('change', renderCertificates);

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target === certificateModal) {
        closeCertificateModal();
    }
});

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    updateStats();
    renderCertificates();
});