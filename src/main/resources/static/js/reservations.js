document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // GLOBALS
    // ============================================
    let pollingInterval = null;
    let currentTab = 'incoming';
    let pendingActionId = null;
    let pendingActionType = null;
    let currentCourtFilter = 'all';
    let lastRenderSnapshot = {};

    // ============================================
    // INITIALIZATION
    // ============================================
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['incoming', 'approved', 'inprogress', 'resolved', 'archive'].includes(tabParam)) {
        currentTab = tabParam;
    }
    
    initializeTabs();
    loadReservations(currentTab);
    updateAllCounts();
    startPolling();
    
    // Set min date to today
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }

    // ============================================
    // STATIC EVENT BINDINGS
    // ============================================
    document.getElementById('tabHeaderReservations').addEventListener('click', () => { window.location.href = '/reservations'; });
    document.getElementById('tabHeaderRentals').addEventListener('click', () => { window.location.href = '/rentals'; });
    document.getElementById('btnResetFilters').addEventListener('click', () => { window.location.href = '/reservations'; });
    
    document.getElementById('reservation-search').addEventListener('keyup', function() {
        filterReservations(this.value);
    });
    
    document.getElementById('courtFilterMenu').addEventListener('click', function(e) {
        const item = e.target.closest('.dropdown-item');
        if (!item) return;
        e.preventDefault();
        currentCourtFilter = item.getAttribute('data-court');
        const buttonText = currentCourtFilter === 'all' ? 'Filter by Court' : currentCourtFilter;
        document.getElementById('typeFilterDropdown').innerHTML = `<i class="bi bi-funnel"></i> ${buttonText}`;
        filterReservations(document.getElementById('reservation-search').value);
    });

    // Create Reservation Button
    document.getElementById('btnCreateReservation').addEventListener('click', createReservation);

    // Confirmation Modals
    document.getElementById('btnCancelApprove').addEventListener('click', closeApproveConfirm);
    document.getElementById('btnCancelProcess').addEventListener('click', closeProcessConfirm);
    document.getElementById('btnCancelResolve').addEventListener('click', closeResolveConfirm);
    document.getElementById('btnCancelArchive').addEventListener('click', closeArchiveConfirm);
    document.getElementById('btnCloseTimeConflict').addEventListener('click', closeTimeConflictModal);

    document.getElementById('confirmApproveBtn').addEventListener('click', function() {
        if (pendingActionId && pendingActionType === 'approve') {
            updateStatus(pendingActionId, 'APPROVED');
            closeApproveConfirm();
        }
    });
    document.getElementById('confirmProcessBtn').addEventListener('click', function() {
        if (pendingActionId && pendingActionType === 'process') {
            updateStatus(pendingActionId, 'IN_PROGRESS');
            closeProcessConfirm();
        }
    });
    document.getElementById('confirmResolveBtn').addEventListener('click', function() {
        if (pendingActionId && pendingActionType === 'resolve') {
            updateStatus(pendingActionId, 'RESOLVED');
            closeResolveConfirm();
        }
    });
    document.getElementById('confirmArchiveBtn').addEventListener('click', function() {
        if (pendingActionId && pendingActionType === 'archive') {
            updateStatus(pendingActionId, 'ARCHIVED');
            closeArchiveConfirm();
        }
    });

    // Close modals when clicking outside
    document.getElementById('approveConfirmModal').addEventListener('click', function(e) { if (e.target === this) closeApproveConfirm(); });
    document.getElementById('processConfirmModal').addEventListener('click', function(e) { if (e.target === this) closeProcessConfirm(); });
    document.getElementById('resolveConfirmModal').addEventListener('click', function(e) { if (e.target === this) closeResolveConfirm(); });
    document.getElementById('archiveConfirmModal').addEventListener('click', function(e) { if (e.target === this) closeArchiveConfirm(); });
    document.getElementById('timeConflictModal').addEventListener('click', function(e) { if (e.target === this) closeTimeConflictModal(); });

    // Event delegation for dynamically generated table buttons
    document.querySelector('.panel').addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-view-res')) {
            viewReservation(e.target.getAttribute('data-id'));
        } else if (e.target.classList.contains('btn-approve-res')) {
            checkApprovalConflict(e.target.getAttribute('data-id'));
        } else if (e.target.classList.contains('btn-process-res')) {
            openProcessConfirm(e.target.getAttribute('data-id'));
        } else if (e.target.classList.contains('btn-resolve-res')) {
            openResolveConfirm(e.target.getAttribute('data-id'));
        } else if (e.target.classList.contains('btn-archive-res')) {
            openArchiveConfirm(e.target.getAttribute('data-id'));
        } else if (e.target.classList.contains('btn-assistance-archive')) {
            openAssistanceModal();
        }
    });

    // ============================================
    // LOGOUT HANDLER
    // ============================================
    attachLogoutHandler();
    setTimeout(attachLogoutHandler, 300);
    setTimeout(attachLogoutHandler, 1000);

    // ============================================
    // LOGIC FUNCTIONS
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
                    window.history.pushState({}, '', `/reservations?tab=${currentTab}`);
                    tabs.forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    
                    document.querySelectorAll('.panel-inner').forEach(panel => {
                        panel.classList.add('d-none');
                    });
                    document.getElementById(`tab-${currentTab}`).classList.remove('d-none');
                    
                    loadReservations(currentTab);
                }
            });
        });
    }

    function attachLogoutHandler() {
        const logoutLink = document.querySelector(
            '.sidebar a[href*="logout"], ' +
            '.sidebar .nav-link:has(i.bi-box-arrow-right), ' +
            '.logout-btn, ' +
            '.sidebar .nav-item:last-child a'
        );
        if (logoutLink) {
            logoutLink.removeEventListener('click', handleLogoutClick);
            logoutLink.addEventListener('click', handleLogoutClick);
        } else {
            const allLinks = document.querySelectorAll('.sidebar a, .sidebar .nav-link, .sidebar button');
            for (let el of allLinks) {
                if (el.textContent && el.textContent.toLowerCase().includes('logout')) {
                    el.removeEventListener('click', handleLogoutClick);
                    el.addEventListener('click', handleLogoutClick);
                    break;
                }
            }
        }
    }

    function handleLogoutClick(e) {
        e.preventDefault();
        e.stopPropagation();
        const modalElement = document.getElementById('logoutModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            if (confirm('Are you sure you want to logout?')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = '/logout';
                document.body.appendChild(form);
                form.submit();
            }
        }
    }

    // ============================================
    // DATE & TIME FORMATTING
    // ============================================
    function formatTime12(timeString) {
        if (!timeString) return '';
        const parts = timeString.split(':');
        if (parts.length < 2) return timeString;
        const hour = parseInt(parts[0], 10);
        const minutes = parts[1].padStart(2, '0');
        if (isNaN(hour)) return timeString;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    function formatTimeSlot(r) {
        if (!r) return 'N/A';
        if (r.timeFrom && r.timeTo) {
            return `${formatTime12(r.timeFrom)} - ${formatTime12(r.timeTo)}`;
        }
        if (r.timeSlot) {
            const bits = r.timeSlot.split('-').map(b => b.trim());
            if (bits.length === 2 && /^\d{1,2}:\d{2}$/.test(bits[0]) && /^\d{1,2}:\d{2}$/.test(bits[1])) {
                return `${formatTime12(bits[0])} - ${formatTime12(bits[1])}`;
            }
            return r.timeSlot;
        }
        return 'N/A';
    }

    function getRawTimeRange(r) {
        if (r.timeFrom && r.timeTo) {
            return { from: r.timeFrom, to: r.timeTo };
        }
        if (r.timeSlot) {
            const bits = r.timeSlot.split('-').map(b => b.trim());
            if (bits.length === 2) return { from: bits[0], to: bits[1] };
        }
        return { from: null, to: null };
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================
    // DATA LOADING & RENDERING
    // ============================================
    function loadReservations(status) {
        fetch(`/reservations/api/${status}`)
            .then(response => response.json())
            .then(data => renderReservationsIfChanged(data, status))
            .catch(error => console.error('Error loading reservations:', error));
    }

    function renderReservationsIfChanged(reservations, status) {
        const snapshot = JSON.stringify(reservations || []);
        if (lastRenderSnapshot[status] === snapshot) return;
        lastRenderSnapshot[status] = snapshot;
        renderReservations(reservations, status);
    }

    function renderReservations(reservations, status) {
        const tbody = document.getElementById(`${status}-tbody`);
        const countSpan = document.getElementById(`${status}Count`);
        const badge = document.getElementById(`badge-${status}`);
        
        if (!reservations || reservations.length === 0) {
            const colspan = (status === 'resolved' || status === 'archive') ? 7 : 6;
            if (tbody) tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-muted">No reservations found</td></tr>`;
            if (countSpan) countSpan.textContent = `0 ${status} reservations`;
            if (badge) badge.textContent = '0';
            return;
        }
        
        if (badge) badge.textContent = reservations.length;
        if (countSpan) countSpan.textContent = `${reservations.length} ${status} reservations`;
        
        const isAdmin = document.getElementById('dataCurrentRole')?.value === 'ADMIN';
        const canApproveResolve = ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF', 'TREASURER', 'BARANGAY-CAPTAIN'].includes(document.getElementById('dataCurrentRole')?.value);
        
        let html = '';
        for (let r of reservations) {
            if (status === 'resolved') {
                html += `
                    <tr>
                        <td>${escapeHtml(r.fullName)}</td>
                        <td>${escapeHtml(r.court)}</td>
                        <td>${formatDate(r.date)}</td>
                        <td>${formatTimeSlot(r)}</td>
                        <td>${escapeHtml(r.purpose || 'N/A')}</td>
                        <td>${escapeHtml(r.processedBy) || 'N/A'}</td>
                        <td>
                            <button class="view-btn btn-view-res" data-id="${r.id}">View</button>
                            ${isAdmin ? `<button class="archive-btn btn-archive-res" data-id="${r.id}">Archive</button>` : ''}
                            ${!isAdmin && canApproveResolve ? `<button class="archive-btn btn-assistance-archive">Archive</button>` : ''}
                        </td>
                    </tr>
                `;
            } else if (status === 'archive') {
                html += `
                    <tr>
                        <td>${escapeHtml(r.fullName)}</td>
                        <td>${escapeHtml(r.court)}</td>
                        <td>${formatDate(r.date)}</td>
                        <td>${formatTimeSlot(r)}</td>
                        <td>${escapeHtml(r.purpose || 'N/A')}</td>
                        <td>${escapeHtml(r.processedBy) || 'N/A'}</td>
                        <td>
                            <button class="view-btn btn-view-res" data-id="${r.id}">View</button>
                        </td>
                    </tr>
                `;
            } else {
                html += `
                    <tr>
                        <td>${escapeHtml(r.fullName)}</td>
                        <td>${escapeHtml(r.court)}</td>
                        <td>${formatDate(r.date)}</td>
                        <td>${formatTimeSlot(r)}</td>
                        <td>${escapeHtml(r.purpose || 'N/A')}</td>
                        <td>
                            <button class="view-btn btn-view-res" data-id="${r.id}">View</button>
                            ${status === 'incoming' && canApproveResolve ? `<button class="approve-btn btn-approve-res" data-id="${r.id}">Approve</button>` : ''}
                            ${status === 'approved' && canApproveResolve ? `<button class="process-btn btn-process-res" data-id="${r.id}">Process</button>` : ''}
                            ${status === 'inprogress' && canApproveResolve ? `<button class="resolve-btn btn-resolve-res" data-id="${r.id}">Resolve</button>` : ''}
                            ${status !== 'archive' && status !== 'resolved' && isAdmin ? `<button class="archive-btn btn-archive-res" data-id="${r.id}">Archive</button>` : ''}
                            ${status !== 'archive' && status !== 'resolved' && !isAdmin && canApproveResolve ? `<button class="archive-btn btn-assistance-archive">Archive</button>` : ''}
                        </td>
                    </tr>
                `;
            }
        }
        
        if (tbody) tbody.innerHTML = html;
    }

    // ============================================
    // TIME SLOT CONFLICT CHECK
    // ============================================
    async function checkApprovalConflict(id) {
        try {
            const [target, approvedList, inProgressList] = await Promise.all([
                fetch('/reservations/' + id).then(r => r.json()),
                fetch('/reservations/api/approved').then(r => r.json()),
                fetch('/reservations/api/inprogress').then(r => r.json())
            ]);

            const targetRange = getRawTimeRange(target);
            const activeReservations = [...(approvedList || []), ...(inProgressList || [])];

            const conflict = activeReservations.find(r => {
                if (r.id === target.id) return false;
                if (r.court !== target.court) return false;
                if (r.date !== target.date) return false;

                const rRange = getRawTimeRange(r);
                if (!rRange.from || !rRange.to || !targetRange.from || !targetRange.to) return false;

                return targetRange.from < rRange.to && targetRange.to > rRange.from;
            });

            if (conflict) {
                const conflictLabel = conflict.status === 'IN_PROGRESS' ? 'In Progress' : 'Approved';
                document.getElementById('timeConflictMessage').innerHTML =
                    `<strong>${escapeHtml(target.court)}</strong> on <strong>${formatDate(target.date)}</strong> ` +
                    `is already booked by <strong>${escapeHtml(conflict.fullName)}</strong> ` +
                    `from <strong>${formatTimeSlot(conflict)}</strong> (${conflictLabel}). ` +
                    `Please resolve, archive, or reschedule the conflicting reservation before approving this one.`;
                document.getElementById('timeConflictModal').style.display = 'flex';
                return;
            }

            openApproveConfirm(id);
        } catch (error) {
            console.error('Error checking time slot conflict:', error);
            showError('Could Not Verify Availability', 'We couldn\'t check for scheduling conflicts right now. Please try again.');
        }
    }

    function closeTimeConflictModal() {
        document.getElementById('timeConflictModal').style.display = 'none';
    }

    // ============================================
    // CONFIRM MODALS
    // ============================================
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
    function openProcessConfirm(id) {
        pendingActionId = id;
        pendingActionType = 'process';
        document.getElementById('processConfirmModal').style.display = 'flex';
    }
    function closeProcessConfirm() {
        pendingActionId = null;
        pendingActionType = null;
        document.getElementById('processConfirmModal').style.display = 'none';
    }
    function openResolveConfirm(id) {
        pendingActionId = id;
        pendingActionType = 'resolve';
        document.getElementById('resolveConfirmModal').style.display = 'flex';
    }
    function closeResolveConfirm() {
        pendingActionId = null;
        pendingActionType = null;
        document.getElementById('resolveConfirmModal').style.display = 'none';
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

    // ============================================
    // CRUD FUNCTIONS
    // ============================================
    function createReservation() {
        const reservation = {
            fullName: document.getElementById('fullName').value,
            court: document.getElementById('court').value,
            date: document.getElementById('date').value,
            timeFrom: document.getElementById('timeFrom').value,
            timeTo: document.getElementById('timeTo').value,
            purpose: document.getElementById('purpose').value,
            status: 'INCOMING'
        };
        
        if (!reservation.fullName || !reservation.date || !reservation.timeFrom || !reservation.timeTo) {
            showError('Missing Fields', 'Please fill in all required fields.');
            return;
        }
        
        if (reservation.timeFrom >= reservation.timeTo) {
            showError('Invalid Time', 'End time must be after start time.');
            return;
        }
        
        fetch('/reservations/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reservation)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('createReservationModal'));
                if (modal) modal.hide();
                showSuccess('Reservation created successfully!');
                document.getElementById('reservationForm').reset();
                loadReservations(currentTab);
            } else {
                showError('Could Not Create Reservation', data.error || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Could Not Create Reservation', 'Something went wrong while saving. Please try again.');
        });
    }

    function viewReservation(id) {
        fetch('/reservations/' + id)
            .then(response => response.json())
            .then(data => {
                const statusClass = data.status === 'INCOMING' ? 'status-incoming' : 
                                   (data.status === 'APPROVED' ? 'status-approved' :
                                   (data.status === 'IN_PROGRESS' ? 'status-inprogress' :
                                   (data.status === 'RESOLVED' ? 'status-resolved' : 'status-archive')));
                const modalBody = document.getElementById('viewModalBody');
                modalBody.innerHTML = `
                    <p><strong>Reservation ID:</strong> ${data.id}</p>
                    <p><strong>Status:</strong> <span class="status-badge ${statusClass}">${data.status}</span></p>
                    <hr>
                    <p><strong>Resident/Organization:</strong> ${escapeHtml(data.fullName)}</p>
                    <p><strong>Court:</strong> ${escapeHtml(data.court)}</p>
                    <p><strong>Date:</strong> ${formatDate(data.date)}</p>
                    <p><strong>Time Slot:</strong> ${formatTimeSlot(data)}</p>
                    <p><strong>Purpose:</strong> ${escapeHtml(data.purpose || 'N/A')}</p>
                    ${data.processedBy ? `<p><strong>Processed By:</strong> ${escapeHtml(data.processedBy)}</p>` : ''}
                    <hr>
                    <p><small>Created: ${new Date(data.createdAt).toLocaleString()}</small></p>
                `;
                new bootstrap.Modal(document.getElementById('viewReservationModal')).show();
            })
            .catch(error => console.error('Error:', error));
    }

    function updateStatus(id, status) {
        let statusText = '';
        switch(status) {
            case 'APPROVED': statusText = 'approved'; break;
            case 'IN_PROGRESS': statusText = 'moved to In Progress'; break;
            case 'RESOLVED': statusText = 'resolved'; break;
            case 'ARCHIVED': statusText = 'archived'; break;
            default: statusText = 'updated';
        }
        
        fetch('/reservations/' + id + '/status?status=' + status, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' } 
        })
        .then(response => { 
            if (response.ok) {
                showSuccess(`Reservation ${statusText} successfully!`);
                loadReservations(currentTab);
                updateAllCounts();
            } else {
                showError('Update Failed', `We couldn't mark this reservation as ${statusText}. Please try again.`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Update Failed', 'Something went wrong. Please try again.');
        });
    }

    function updateAllCounts() {
        fetch('/reservations/api/counts')
            .then(response => response.json())
            .then(data => {
                document.getElementById('badge-incoming').textContent = data.incoming || 0;
                document.getElementById('badge-approved').textContent = data.approved || 0;
                document.getElementById('badge-inprogress').textContent = data.inprogress || 0;
                document.getElementById('badge-resolved').textContent = data.resolved || 0;
                document.getElementById('badge-archive').textContent = data.archive || 0;
            })
            .catch(error => console.error('Error loading counts:', error));
    }

    function filterReservations(keyword) {
        const rows = document.querySelectorAll(`#tab-${currentTab} tbody tr`);
        const lowerKeyword = keyword.toLowerCase();
        rows.forEach(row => {
            if (row.cells && row.cells.length > 0) {
                let text = Array.from(row.cells).slice(0, 5).map(cell => cell.textContent).join(' ').toLowerCase();
                let matchesSearch = text.includes(lowerKeyword);
                let matchesCourt = true;
                
                if (currentCourtFilter !== 'all') {
                    const courtCell = row.cells[1];
                    const courtText = courtCell ? courtCell.textContent.trim() : '';
                    matchesCourt = courtText === currentCourtFilter;
                }
                
                row.style.display = (matchesSearch && matchesCourt) ? '' : 'none';
            }
        });
    }

    // ============================================
    // TOASTS
    // ============================================
    function showSuccess(message) {
        document.getElementById('successMessage').innerHTML = message;
        const successModal = new bootstrap.Modal(document.getElementById('successModal'));
        successModal.show();
    }

    function showError(title, message) {
        document.getElementById('errorTitle').textContent = title || 'Something went wrong';
        document.getElementById('errorMessage').textContent = message || '';
        const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
        errorModal.show();
    }

    // ============================================
    // POLLING
    // ============================================
    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        const pollOnce = () => {
            fetch('/reservations/api/poll?t=' + Date.now())
                .then(response => response.json())
                .then(data => {
                    if (data[currentTab]) {
                        renderReservationsIfChanged(data[currentTab], currentTab);
                    }
                    if (data.counts) {
                        document.getElementById('badge-incoming').textContent = data.counts.incoming || 0;
                        document.getElementById('badge-approved').textContent = data.counts.approved || 0;
                        document.getElementById('badge-inprogress').textContent = data.counts.inprogress || 0;
                        document.getElementById('badge-resolved').textContent = data.counts.resolved || 0;
                        document.getElementById('badge-archive').textContent = data.counts.archive || 0;
                    }
                })
                .catch(error => console.error('Poll error:', error));
        };
        pollOnce();
        pollingInterval = setInterval(pollOnce, 5000);
    }

    window.addEventListener('beforeunload', function() {
        if (pollingInterval) clearInterval(pollingInterval);
    });
});