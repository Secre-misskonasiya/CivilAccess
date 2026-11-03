document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // RENTALS MODULE - Full JavaScript
    // ============================================
    
    let pollingInterval = null;
    let currentTab = 'incoming';
    let currentEquipmentFilter = 'all';
    let pendingActionId = null;
    let pendingActionType = null;
    let pendingRefreshCallback = null;

    const role = document.getElementById('dataCurrentRole')?.value;
    const isAdmin = role === 'ADMIN';
    const canManage = ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF', 'TREASURER', 'BARANGAY-CAPTAIN'].includes(role);

    // Helper function to calculate days overdue correctly
    function calculateDaysOverdue(expectedReturnDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expected = new Date(expectedReturnDate);
        expected.setHours(0, 0, 0, 0);
        
        const diffTime = today - expected;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    // ── Overdue badge labels ─────────────────────────────────────
    function fillOverdueBadges() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        document.querySelectorAll('.overdue-badge').forEach(el => {
            const expected = new Date(el.dataset.expected);
            expected.setHours(0, 0, 0, 0);
            const days = Math.ceil((today - expected) / 86400000);
            if (days <= 0) {
                el.classList.replace('bg-danger', 'bg-warning');
                el.classList.add('text-dark');
                el.textContent = 'Due Today!';
            } else {
                el.textContent = days === 1 ? '1 day overdue' : days + ' days overdue';
            }
        });
    }

    // ── Due-date badges for active/incoming tabs ─────────────────
    function fillDueDateBadges() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        document.querySelectorAll('.due-date-badge').forEach(el => {
            const expected = new Date(el.dataset.expected);
            expected.setHours(0, 0, 0, 0);
            const days = Math.ceil((expected - today) / 86400000);

            el.style.display = 'inline-block';
            el.style.padding = '2px 8px';
            el.style.borderRadius = '10px';
            el.style.fontSize = '11px';
            el.style.fontWeight = '700';
            el.style.marginLeft = '6px';

            if (days < 0) {
                el.textContent = Math.abs(days) + 'd overdue';
                el.style.background = '#fdecea';
                el.style.color = '#c0392b';
                el.style.border = '1px solid #f5c6cb';
            } else if (days === 0) {
                el.textContent = 'Due today';
                el.style.background = '#fff3cd';
                el.style.color = '#856404';
                el.style.border = '1px solid #ffc107';
            } else if (days <= 2) {
                el.textContent = 'Due in ' + days + 'd';
                el.style.background = '#fff3cd';
                el.style.color = '#856404';
                el.style.border = '1px solid #ffc107';
            } else {
                el.textContent = 'Due in ' + days + 'd';
                el.style.background = '#e8f5f0';
                el.style.color = '#2d7a5f';
                el.style.border = '1px solid #b8ddd0';
            }
        });
    }

    // ============================================
    // STATIC EVENT BINDINGS
    // ============================================
    document.getElementById('tabHeaderReservations').addEventListener('click', () => { window.location.href = '/reservations'; });
    document.getElementById('tabHeaderRentals').addEventListener('click', () => { window.location.href = '/rentals'; });
    document.getElementById('btnResetFilters').addEventListener('click', () => { window.location.href = '/rentals'; });
    
    document.getElementById('btnCreateRental').addEventListener('click', createRental);
    document.getElementById('equipmentType').addEventListener('change', updateRentalTotal);
    document.getElementById('quantity').addEventListener('change', updateRentalTotal);
    
    document.getElementById('rental-search').addEventListener('keyup', function() {
        filterRentals(this.value);
    });
    
    // Equipment filter dropdown
    document.querySelectorAll('#equipmentFilterMenu .dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            currentEquipmentFilter = this.getAttribute('data-equipment');
            const buttonText = currentEquipmentFilter === 'all' ? 'Filter by Equipment' : currentEquipmentFilter;
            document.getElementById('typeFilterDropdown').innerHTML = `<i class="bi bi-funnel"></i> ${buttonText}`;
            filterRentals(document.getElementById('rental-search').value);
        });
    });

    // Confirmation buttons
    document.getElementById('btnCancelApprove').addEventListener('click', closeApproveConfirm);
    document.getElementById('btnCancelReturn').addEventListener('click', closeReturnConfirm);
    document.getElementById('btnCancelArchive').addEventListener('click', closeArchiveConfirm);
    
    document.getElementById('confirmApproveBtn').addEventListener('click', function() {
        if (pendingActionId && pendingActionType === 'approve') {
            executeApproveRental(pendingActionId);
            closeApproveConfirm();
        }
    });
    
    document.getElementById('confirmReturnBtn').addEventListener('click', function() {
        if (pendingActionId && pendingActionType === 'return') {
            executeReturnRental(pendingActionId);
            closeReturnConfirm();
        }
    });
    
    document.getElementById('confirmArchiveBtn').addEventListener('click', function() {
        if (pendingActionId && pendingActionType === 'archive') {
            executeArchiveRental(pendingActionId);
            closeArchiveConfirm();
        }
    });
    
    // Close modals when clicking outside
    document.getElementById('approveConfirmModal').addEventListener('click', function(e) {
        if (e.target === this) closeApproveConfirm();
    });
    
    document.getElementById('returnConfirmModal').addEventListener('click', function(e) {
        if (e.target === this) closeReturnConfirm();
    });
    
    document.getElementById('archiveConfirmModal').addEventListener('click', function(e) {
        if (e.target === this) closeArchiveConfirm();
    });

    // Success Modal OK Button
    document.getElementById('successOkBtn').addEventListener('click', function() {
        const successModalEl = document.getElementById('successModal');
        const modalInstance = bootstrap.Modal.getInstance(successModalEl) || new bootstrap.Modal(successModalEl);
        modalInstance.hide();
    });

    document.getElementById('successModal').addEventListener('hidden.bs.modal', function() {
        if (pendingRefreshCallback) {
            const cb = pendingRefreshCallback;
            pendingRefreshCallback = null;
            cb();
        }
    });

    window.addEventListener('beforeunload', function() {
        if (pollingInterval) clearInterval(pollingInterval);
    });

    // ============================================
    // INITIAL SETUP
    // ============================================
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['incoming', 'active', 'overdue', 'returned', 'archive'].includes(tabParam)) {
        currentTab = tabParam;
    }
    
    initializeTabs();
    loadRentals(currentTab);
    startPolling();

    // ============================================
    // FUNCTIONS
    // ============================================
    function initializeTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === currentTab) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
            
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                if (tabName) {
                    currentTab = tabName;
                    window.history.pushState({}, '', `/rentals?tab=${currentTab}`);
                    tabs.forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    
                    document.querySelectorAll('.panel-inner').forEach(panel => {
                        panel.classList.add('d-none');
                    });
                    document.getElementById(`tab-${currentTab}`).classList.remove('d-none');
                    
                    loadRentals(currentTab);
                }
            });
        });
    }

    function updateRentalTotal() {
        const type = document.getElementById('equipmentType').value;
        const qty = parseInt(document.getElementById('quantity').value) || 1;
        let rate = 0;
        switch(type) {
            case 'Chair': rate = 15; break;
            case 'Canopy Tent': rate = 250; break;
            case 'Sound System': rate = 500; break;
            case 'Table': rate = 100; break;
            default: rate = 0;
        }
        const total = rate * qty;
        const totalDisplay = document.getElementById('rentalTotalDisplay');
        if (totalDisplay) totalDisplay.innerHTML = `Total: ₱${total.toFixed(2)} (per day)`;
    }

    function loadRentals(status) {
        fetch(`/rentals/api/${status}`)
            .then(response => response.json())
            .then(data => renderRentals(data, status))
            .catch(error => console.error('Error loading rentals:', error));
    }

    function renderRentals(rentals, status) {
        const tbody   = document.getElementById(`${status}-tbody`);
        const countEl = document.getElementById(`${status}Count`);

        if (!rentals || rentals.length === 0) {
            const colspan = (status === 'returned' || status === 'archive') ? 8 : 7;
            if (tbody)   tbody.innerHTML   = `<tr><td colspan="${colspan}" class="text-center text-muted">No ${status} rentals found</td></tr>`;
            if (countEl) countEl.textContent = `0 ${status} rentals`;
            return;
        }

        if (countEl) countEl.textContent = `${rentals.length} ${status} rentals`;

        let html = '';

        if (status === 'incoming') {
            for (const r of rentals) {
                html += `
                    <tr>
                        <td>${escapeHtml(r.renterName)}</td>
                        <td>${escapeHtml(r.equipmentType)}</td>
                        <td>${r.quantity}</td>
                        <td>${r.rentalDate || 'N/A'}</td>
                        <td>
                            ${r.expectedReturnDate || 'N/A'}
                            <span class="due-date-badge" data-expected="${r.expectedReturnDate || ''}"></span>
                        </td>
                        <td><span class="status-badge status-incoming">INCOMING</span></td>
                        <td>
                            ${canManage ? `<button class="btn-sm btn-approve btn-approve-rental" data-id="${r.id}">Approve</button>` : ''}
                            <button class="btn-sm btn-view btn-view-rental" data-id="${r.id}">View</button>
                            ${isAdmin ? `<button class="btn-sm btn-archive btn-archive-rental" data-id="${r.id}">Archive</button>` : ''}
                        </td>
                    </tr>`;
            }
        } else if (status === 'active') {
            for (const r of rentals) {
                html += `
                    <tr>
                        <td>${escapeHtml(r.renterName)}</td>
                        <td>${escapeHtml(r.equipmentType)}</td>
                        <td>${r.quantity}</td>
                        <td>${r.rentalDate || 'N/A'}</td>
                        <td>
                            ${r.expectedReturnDate || 'N/A'}
                            <span class="due-date-badge" data-expected="${r.expectedReturnDate || ''}"></span>
                        </td>
                        <td><span class="status-badge status-active">ACTIVE</span></td>
                        <td>
                            ${canManage ? `<button class="btn-sm btn-return btn-return-rental" data-id="${r.id}">Mark as Returned</button>` : ''}
                            <button class="btn-sm btn-view btn-view-rental" data-id="${r.id}">View</button>
                            ${isAdmin ? `<button class="btn-sm btn-archive btn-archive-rental" data-id="${r.id}">Archive</button>` : ''}
                        </td>
                    </tr>`;
            }
        } else if (status === 'overdue') {
            for (const r of rentals) {
                const days = calculateDaysOverdue(r.expectedReturnDate);
                const badge = days <= 0
                    ? `<span class="badge bg-warning text-dark">Due Today!</span>`
                    : `<span class="badge bg-danger overdue-badge" data-expected="${r.expectedReturnDate}">${days === 1 ? '1 day overdue' : days + ' days overdue'}</span>`;
                html += `
                    <tr>
                        <td>${escapeHtml(r.renterName)}</td>
                        <td>${escapeHtml(r.equipmentType)}</td>
                        <td>${r.quantity}</td>
                        <td>${r.rentalDate || 'N/A'}</td>
                        <td>${r.expectedReturnDate || 'N/A'}</td>
                        <td>${badge}</td>
                        <td>
                            ${canManage ? `<button class="btn-sm btn-return btn-return-rental" data-id="${r.id}">Mark as Returned</button>` : ''}
                            <button class="btn-sm btn-view btn-view-rental" data-id="${r.id}">View</button>
                            ${isAdmin ? `<button class="btn-sm btn-archive btn-archive-rental" data-id="${r.id}">Archive</button>` : ''}
                        </td>
                    </tr>`;
            }
        } else if (status === 'returned') {
            for (const r of rentals) {
                html += `
                    <tr>
                        <td>${escapeHtml(r.renterName)}</td>
                        <td>${escapeHtml(r.equipmentType)}</td>
                        <td>${r.quantity}</td>
                        <td>${r.rentalDate || 'N/A'}</td>
                        <td>${r.actualReturnDate || 'N/A'}</td>
                        <td>${escapeHtml(r.processedBy) || 'N/A'}</td>
                        <td>₱${(r.totalPrice || 0).toFixed(2)}</td>
                        <td>
                            <button class="btn-sm btn-view btn-view-rental" data-id="${r.id}">View</button>
                            ${isAdmin ? `<button class="btn-sm btn-archive btn-archive-rental" data-id="${r.id}">Archive</button>` : ''}
                        </td>
                    </tr>`;
            }
        } else if (status === 'archive') {
            for (const r of rentals) {
                html += `
                    <tr>
                        <td>${escapeHtml(r.renterName)}</td>
                        <td>${escapeHtml(r.equipmentType)}</td>
                        <td>${r.quantity}</td>
                        <td>${r.rentalDate || 'N/A'}</td>
                        <td>${r.archivedDate || r.updatedAt || 'N/A'}</td>
                        <td>${escapeHtml(r.processedBy) || 'N/A'}</td>
                        <td><span class="status-badge status-archive">ARCHIVED</span></td>
                        <td>
                            <button class="btn-sm btn-view btn-view-rental" data-id="${r.id}">View</button>
                        </td>
                    </tr>`;
            }
        }

        if (tbody) tbody.innerHTML = html;

        // Run badge calculations after every render
        fillDueDateBadges();
        fillOverdueBadges();

        // Re-apply whatever search/equipment filter is currently active.
        const searchInput = document.getElementById('rental-search');
        filterRentals(searchInput ? searchInput.value : '');
        
        // Attach listeners for newly created buttons
        attachRowButtonListeners();
    }

    function attachRowButtonListeners() {
        document.querySelectorAll('.btn-view-rental').forEach(btn => {
            btn.addEventListener('click', (e) => viewRental(e.target.getAttribute('data-id')));
        });
        document.querySelectorAll('.btn-approve-rental').forEach(btn => {
            btn.addEventListener('click', (e) => openApproveConfirm(e.target.getAttribute('data-id')));
        });
        document.querySelectorAll('.btn-return-rental').forEach(btn => {
            btn.addEventListener('click', (e) => openReturnConfirm(e.target.getAttribute('data-id')));
        });
        document.querySelectorAll('.btn-archive-rental').forEach(btn => {
            btn.addEventListener('click', (e) => openArchiveConfirm(e.target.getAttribute('data-id')));
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function openApproveConfirm(id) {
        pendingActionId = id;
        pendingActionType = 'approve';
        document.getElementById('approveConfirmModal').style.display = 'flex';
    }
    function closeApproveConfirm() {
        pendingActionId = null;
        pendingActionType = null;
        document.getElementById('approveConfirmModal').style.display = 'none';
    }
    function openReturnConfirm(id) {
        pendingActionId = id;
        pendingActionType = 'return';
        document.getElementById('returnConfirmModal').style.display = 'flex';
    }
    function closeReturnConfirm() {
        pendingActionId = null;
        pendingActionType = null;
        document.getElementById('returnConfirmModal').style.display = 'none';
    }
    function openArchiveConfirm(id) {
        pendingActionId = id;
        pendingActionType = 'archive';
        document.getElementById('archiveConfirmModal').style.display = 'flex';
    }
    function closeArchiveConfirm() {
        pendingActionId = null;
        pendingActionType = null;
        document.getElementById('archiveConfirmModal').style.display = 'none';
    }

    function executeApproveRental(id) {
        fetch(`/rentals/${id}/approve`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccess('Rental approved successfully!', function() {
                    loadRentals(currentTab);
                    updateAllCounts();
                });
            } else {
                showSuccess('Error: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => console.error('Error:', error));
    }

    function executeReturnRental(id) {
        fetch(`/rentals/${id}/return`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccess('Equipment returned successfully!', function() {
                    loadRentals(currentTab);
                    updateAllCounts();
                });
            } else {
                showSuccess('Error: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showSuccess('An error occurred while processing the return');
        });
    }

    function executeArchiveRental(id) {
        fetch(`/rentals/${id}/archive`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccess('Rental archived successfully!', function() {
                    loadRentals(currentTab);
                    updateAllCounts();
                });
            } else {
                showSuccess('Error: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showSuccess('An error occurred while archiving');
        });
    }

    function createRental() {
        const rental = {
            renterName: document.getElementById('renterName').value,
            equipmentType: document.getElementById('equipmentType').value,
            quantity: parseInt(document.getElementById('quantity').value) || 1,
            expectedReturnDate: document.getElementById('expectedReturnDate').value
        };
        
        if (!rental.renterName || !rental.expectedReturnDate) {
            showSuccess('Please fill in all required fields');
            return;
        }
        
        fetch('/rentals/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rental)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('createRentalModal'));
                if (modal) modal.hide();
                document.getElementById('rentalForm').reset();
                updateRentalTotal();
                showSuccess('Rental request created successfully!', function() {
                    loadRentals(currentTab);
                    updateAllCounts();
                });
            } else {
                showSuccess('Error: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => console.error('Error:', error));
    }

    function viewRental(id) {
        fetch('/rentals/' + id)
            .then(response => response.json())
            .then(data => {
                const statusClass = data.status === 'INCOMING' ? 'status-incoming' : 
                                   (data.status === 'ACTIVE' ? 'status-active' :
                                   (data.status === 'OVERDUE' ? 'status-overdue' :
                                   (data.status === 'RETURNED' ? 'status-returned' : 'status-archive')));
                const modalBody = document.getElementById('viewRentalModalBody');
                modalBody.innerHTML = `
                    <p><strong>Rental ID:</strong> ${data.id}</p>
                    <p><strong>Status:</strong> <span class="status-badge ${statusClass}">${data.status}</span></p>
                    <hr>
                    <p><strong>Renter:</strong> ${escapeHtml(data.renterName)}</p>
                    <p><strong>Equipment:</strong> ${escapeHtml(data.equipmentType)}</p>
                    <p><strong>Quantity:</strong> ${data.quantity}</p>
                    <p><strong>Rental Date:</strong> ${data.rentalDate}</p>
                    <p><strong>Expected Return:</strong> ${data.expectedReturnDate}</p>
                    ${data.actualReturnDate ? `<p><strong>Actual Return:</strong> ${data.actualReturnDate}</p>` : ''}
                    ${data.processedBy ? `<p><strong>Processed By:</strong> ${escapeHtml(data.processedBy)}</p>` : ''}
                    <hr>
                    <p><strong>Total Price:</strong> ₱${(data.totalPrice || 0).toFixed(2)}</p>
                    <p><small>Created: ${new Date(data.createdAt).toLocaleString()}</small></p>
                `;
                new bootstrap.Modal(document.getElementById('viewRentalModal')).show();
            })
            .catch(error => console.error('Error:', error));
    }

    function filterRentals(keyword) {
        const rows = document.querySelectorAll(`#tab-${currentTab} tbody tr`);
        const lowerKeyword = keyword.toLowerCase();
        rows.forEach(row => {
            if (row.cells && row.cells.length > 0) {
                let text = '';
                if (currentTab === 'returned' || currentTab === 'archive') {
                    text = Array.from(row.cells).slice(0, 5).map(cell => cell.textContent).join(' ').toLowerCase();
                } else {
                    text = Array.from(row.cells).slice(0, 6).map(cell => cell.textContent).join(' ').toLowerCase();
                }
                let matchesSearch = text.includes(lowerKeyword);
                let matchesEquipment = true;
                
                if (currentEquipmentFilter !== 'all') {
                    const equipmentCell = row.cells[1];
                    const equipmentText = equipmentCell ? equipmentCell.textContent.trim() : '';
                    matchesEquipment = equipmentText === currentEquipmentFilter;
                }
                
                row.style.display = (matchesSearch && matchesEquipment) ? '' : 'none';
            }
        });
    }

    function updateAllCounts() {
        fetch('/rentals/api/counts')
            .then(response => response.json())
            .then(data => {
                document.getElementById('incomingBadge').textContent = data.incoming || 0;
                document.getElementById('activeBadge').textContent = data.active || 0;
                document.getElementById('overdueBadge').textContent = data.overdue || 0;
                document.getElementById('returnedBadge').textContent = data.returned || 0;
                document.getElementById('archiveBadge').textContent = data.archive || 0;
            })
            .catch(error => console.error('Error loading counts:', error));
    }

    function showSuccess(message, onDismissCallback) {
        document.getElementById('successMessage').innerHTML = message;
        pendingRefreshCallback = typeof onDismissCallback === 'function' ? onDismissCallback : null;
        const successModal = new bootstrap.Modal(document.getElementById('successModal'));
        successModal.show();
    }

    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(() => {
            fetch(`/rentals/api/poll?tab=${currentTab}&t=` + Date.now())
                .then(r => r.json())
                .then(data => {
                    if (data[currentTab]) {
                        renderRentals(data[currentTab], currentTab);
                    }
                    if (data.counts) {
                        document.getElementById('incomingBadge').textContent = data.counts.incoming || 0;
                        document.getElementById('activeBadge').textContent   = data.counts.active   || 0;
                        document.getElementById('overdueBadge').textContent  = data.counts.overdue  || 0;
                        document.getElementById('returnedBadge').textContent = data.counts.returned || 0;
                        document.getElementById('archiveBadge').textContent  = data.counts.archive  || 0;
                    }
                })
                .catch(err => console.error('Poll error:', err));
        }, 5000);
    }
});