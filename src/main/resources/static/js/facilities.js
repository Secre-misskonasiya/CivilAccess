document.addEventListener('DOMContentLoaded', function() {
    // --- Static Event Bindings ---
    
    // Search
    document.getElementById('facility-search').addEventListener('keyup', function() {
        const searchValue = this.value.toLowerCase();
        document.querySelectorAll('.panel-inner:not(.d-none) tbody tr').forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchValue) ? '' : 'none';
        });
        sortFacilitiesByStatus();
    });

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) window.location.href = '/facilities?tab=' + tabName;
        });
    });

    // Phone validation
    document.querySelectorAll('input[data-validate="phone"]').forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            const errorId = this.id === 'contactNumber' ? 'phoneError' : 'editPhoneError';
            const errorEl = document.getElementById(errorId);
            if (errorEl && this.value.length > 0) errorEl.style.display = 'none';
            if (this.value.length > 15) this.value = this.value.slice(0, 15);
        });
    });

    // Modal Buttons
    document.getElementById('btnSaveFacility').addEventListener('click', saveFacilityWithConfirm);
    document.getElementById('btnUpdateFacility').addEventListener('click', updateFacilityWithConfirm);
    document.getElementById('sysErrorOkBtn').addEventListener('click', () => {
        document.getElementById('sysErrorOverlay').classList.remove('show');
    });

    // Delegate dynamic table buttons
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-view-facility')) {
            viewFacility(e.target.getAttribute('data-id'));
        }
        if (e.target.classList.contains('btn-edit-facility')) {
            editFacility(e.target.getAttribute('data-id'));
        }
        if (e.target.classList.contains('btn-delete-facility')) {
            deleteFacilityWithConfirm(e.target.getAttribute('data-id'), e.target.getAttribute('data-name'));
        }
    });

    // Backdrop cleanup init
    cleanupOrphanBackdrops();
    document.querySelectorAll('.modal').forEach(function(modalEl) {
        modalEl.addEventListener('hidden.bs.modal', cleanupOrphanBackdrops);
    });

    // Sorting init
    setTimeout(sortFacilitiesByStatus, 100);
    
    // Polling
    startPolling();
});

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        cleanupOrphanBackdrops();
    }
});

// --- Modal Logic ---
function showError(message) {
    document.getElementById('sysErrorMessage').innerHTML = message;
    document.getElementById('sysErrorOverlay').classList.add('show');
}

function showSuccessWithReload(message) {
    document.getElementById('successMessage').innerHTML = message;
    const successModalEl = document.getElementById('successModal');
    const successModal = new bootstrap.Modal(successModalEl);
    
    const okButton = document.getElementById('successOkBtn');
    const newOkButton = okButton.cloneNode(true);
    okButton.parentNode.replaceChild(newOkButton, okButton);
    
    newOkButton.onclick = function() {
        successModal.hide();
        window.location.reload();
    };
    
    successModal.show();
}

function showConfirm(message, title, onConfirm) {
    document.getElementById('confirmModalMessage').innerHTML = message;
    document.getElementById('confirmModalTitle').innerHTML = title;
    const confirmModalEl = document.getElementById('confirmActionModal');
    const confirmBtn = document.getElementById('confirmActionBtn');
    
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.onclick = () => {
        const modal = bootstrap.Modal.getInstance(confirmModalEl);
        if (modal) modal.hide();
        onConfirm();
    };
    
    const modal = new bootstrap.Modal(confirmModalEl);
    modal.show();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Action Functions ---
function deleteFacilityWithConfirm(id, facilityName) {
    showConfirm(
        'Are you sure you want to delete "<strong>' + escapeHtml(facilityName) + '</strong>"?<br>This action cannot be undone.',
        'Delete Facility',
        function() {
            fetch('/facilities/' + id, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => {
                if (response.ok) {
                    showSuccessWithReload('Facility deleted successfully!');
                } else {
                    showError('Error deleting facility. Please try again.');
                }
            })
            .catch(() => {
                showError('Error deleting facility. Please try again.');
            });
        }
    );
}

function saveFacilityWithConfirm() {
    const facilityName = document.getElementById('facilityName').value;
    const contactNumber = document.getElementById('contactNumber').value;
    
    if (!facilityName) {
        showError('Please enter facility name.');
        return;
    }
    
    if (contactNumber && !/^[0-9]+$/.test(contactNumber)) {
        showError('Contact number must contain only numbers (0-9).');
        return;
    }
    
    const facility = {
        facilityName: facilityName,
        facilityType: document.getElementById('facilityType').value,
        contactNumber: contactNumber,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value,
        status: 'OPEN'
    };
    
    showConfirm(
        'Add new facility "<strong>' + escapeHtml(facility.facilityName) + '</strong>"?',
        'Add Facility',
        function() {
            fetch('/facilities/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(facility)
            })
            .then(response => {
                if (response.ok) {
                    showSuccessWithReload('Facility added successfully!');
                } else {
                    showError('Error adding facility. Please try again.');
                }
            })
            .catch(() => {
                showError('Error adding facility. Please try again.');
            });
        }
    );
}

function updateFacilityWithConfirm() {
    const id = document.getElementById('editFacilityId').value;
    const facilityName = document.getElementById('editFacilityName').value;
    const contactNumber = document.getElementById('editContactNumber').value;
    
    if (!facilityName) {
        showError('Please enter facility name.');
        return;
    }
    
    if (contactNumber && !/^[0-9]+$/.test(contactNumber)) {
        showError('Contact number must contain only numbers (0-9).');
        return;
    }
    
    const facility = {
        facilityName: facilityName,
        facilityType: document.getElementById('editFacilityType').value,
        contactNumber: contactNumber,
        email: document.getElementById('editEmail').value,
        address: document.getElementById('editAddress').value,
        status: 'OPEN'
    };
        
    showConfirm(
        'Update facility "<strong>' + escapeHtml(facility.facilityName) + '</strong>" with the new information?',
        'Update Facility',
        function() {
            fetch('/facilities/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(facility)
            })
            .then(response => {
                if (response.ok) {
                    showSuccessWithReload('Facility updated successfully!');
                } else {
                    showError('Error updating facility. Please try again.');
                }
            })
            .catch(() => {
                showError('Error updating facility. Please try again.');
            });
        }
    );
}

function viewFacility(id) {
    fetch('/facilities/' + id)
        .then(response => response.json())
        .then(data => {
            const modalBody = document.getElementById('viewModalBody');
            modalBody.innerHTML = `
                <label>Facility Name:</label>
                <p>${data.facilityName || 'N/A'}</p>
                <label>Facility Type:</label>
                <p>${data.facilityType || 'N/A'}</p>
                <label>Contact Number:</label>
                <p>${data.contactNumber || 'N/A'}</p>
                <label>Email:</label>
                <p>${data.email || 'N/A'}</p>
                <label>Address:</label>
                <p>${data.address || 'N/A'}</p>
                <label>Status:</label>
                <p>${data.status || 'N/A'}</p>
                <label>Created:</label>
                <p>${data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}</p>
                <label>Last Updated:</label>
                <p>${data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}</p>
            `;
            new bootstrap.Modal(document.getElementById('viewFacilityModal')).show();
        });
}

function editFacility(id) {
    fetch('/facilities/' + id)
        .then(response => response.json())
        .then(data => {
            document.getElementById('editFacilityId').value = data.id;
            document.getElementById('editFacilityName').value = data.facilityName || '';
            document.getElementById('editFacilityType').value = data.facilityType || 'POLICE';
            document.getElementById('editContactNumber').value = data.contactNumber || '';
            document.getElementById('editEmail').value = data.email || '';
            document.getElementById('editAddress').value = data.address || '';
            new bootstrap.Modal(document.getElementById('editFacilityModal')).show();
        });
}

// --- Backdrop / Z-Index Fix ---
function fixBackdropZIndex(modalId, zIndex) {
    const modalEl = document.getElementById(modalId);
    if (!modalEl) return;
    modalEl.addEventListener('shown.bs.modal', function() {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        const topBackdrop = backdrops[backdrops.length - 1];
        if (topBackdrop) {
            topBackdrop.style.zIndex = zIndex;
        }
    });
}
fixBackdropZIndex('confirmActionModal', 10450);
fixBackdropZIndex('successModal', 10550);

function cleanupOrphanBackdrops() {
    if (!document.querySelector('.modal.show')) {
        document.querySelectorAll('.modal-backdrop').forEach(function(b) { b.remove(); });
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
    }
}

// --- Sorting ---
let currentSortMode = 'open-first';

function sortFacilitiesByStatus() {
    const activePanels = document.querySelectorAll('.panel-inner:not(.d-none)');
    if (activePanels.length === 0) return;
    
    activePanels.forEach(panel => {
        const tbody = panel.querySelector('tbody');
        if (!tbody) return;
        
        const rows = Array.from(tbody.querySelectorAll('tr'));
        if (rows.length === 0) return;
        
        const getStatusPriority = (row) => {
            const statusCell = row.cells[2];
            if (!statusCell) return 1;
            const statusText = statusCell.innerText.trim().toUpperCase();
            if (currentSortMode === 'open-first') {
                if (statusText === 'OPEN') return 0;
                if (statusText === 'CLOSED') return 1;
                return 2;
            } else {
                if (statusText === 'CLOSED') return 0;
                if (statusText === 'OPEN') return 1;
                return 2;
            }
        };
        
        rows.sort((a, b) => {
            const priorityA = getStatusPriority(a);
            const priorityB = getStatusPriority(b);
            if (priorityA !== priorityB) return priorityA - priorityB;
            return 0;
        });
        
        rows.forEach(row => tbody.appendChild(row));
    });
}

// --- Polling ---
function startPolling() {
    let lastSnapshot = '';
    
    function isModalOpen() {
        let modalIds = ['viewFacilityModal','addFacilityModal','editFacilityModal','confirmActionModal','successModal','logoutModal'];
        for (let i = 0; i < modalIds.length; i++) {
            let m = document.getElementById(modalIds[i]);
            if (m && m.classList.contains('show')) return true;
        }
        return false;
    }
    
    function poll() {
        if (isModalOpen()) return;
        
        let xhr = new XMLHttpRequest();
        xhr.open('GET', '/facilities/api/poll?t=' + Date.now(), true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    let data = JSON.parse(xhr.responseText);
                    let snapshot = JSON.stringify(data);
                    
                    if (lastSnapshot === '') {
                        lastSnapshot = snapshot;
                    } else if (snapshot !== lastSnapshot) {
                        location.reload();
                    }
                } catch(e) {}
            }
        };
        xhr.send();
    }
    
    poll();
    setInterval(poll, 5000);
}