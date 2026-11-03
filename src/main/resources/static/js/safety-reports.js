document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // GLOBALS
    // ============================================
    let currentMap = null;
    let currentTypeFilter = 'all';
    let pendingActionId = null;
    let pendingActionType = null;
    let currentModalReportId = null;
    let currentModalReportStatus = null;
    let isAnyModalOpen = false;
    let pollingInterval = null;
    let lastSeenId = 0;

    // Incident Map Variables
    let incidentMapInstance = null;
    let incidentMapMarkers = [];
    let incidentMapInitialized = false;
    let allReportsData = [];
    let allResidentData = [];
    let residentMarkers = [];
    let showSeniorLayer = true;
    let showPwdLayer = true;
    let mapSearchValue = '';
    let currentMapStatusFilter = 'all';
    let markerClusterGroup = null;
    let heatmapLayer = null;
    let heatmapVisible = false;
    let summaryPanelOpen = false;

    // ============================================
    // HELPERS
    // ============================================
    function escapeHtml(text) {
        if (!text) return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getStatusColor(status) {
        switch (status?.toUpperCase()) {
            case 'INCOMING': return '#FF9800';
            case 'APPROVED': return '#FF9800';
            case 'IN_PROGRESS': return '#2bb6f7';
            case 'RESOLVED': return '#44C375';
            case 'REJECTED': return '#e74c3c';
            case 'CANCELLED': return '#e67e22';
            default: return '#888';
        }
    }

    function getStatusBadgeColor(status) {
        switch ((status || '').toUpperCase()) {
            case 'INCOMING': return '#cce5ff';
            case 'APPROVED': return '#d1ecf1';
            case 'IN_PROGRESS': return '#d6d8db';
            case 'RESOLVED': return '#d4edda';
            case 'REJECTED': return '#f8d7da';
            case 'CANCELLED': return '#fff3cd';
            default: return '#e2e3e5';
        }
    }

    function getStatusLabel(status) {
        switch ((status || '').toUpperCase()) {
            case 'INCOMING': return 'Incoming';
            case 'APPROVED': return 'Approved';
            case 'IN_PROGRESS': return 'In Progress';
            case 'RESOLVED': return 'Resolved';
            case 'REJECTED': return 'Rejected';
            case 'CANCELLED': return 'Cancelled';
            default: return status || 'Unknown';
        }
    }

    function getPriorityColor(priority) {
        switch ((priority || '').toUpperCase()) {
            case 'HIGH': return '#e74c3c';
            case 'MEDIUM': return '#e67e22';
            case 'LOW': return '#27ae60';
            default: return '#888888';
        }
    }

    // ============================================
    // MODAL STATE MANAGEMENT
    // ============================================
    function updateModalState(isOpen) {
        isAnyModalOpen = isOpen;
    }

    function trackAllModals() {
        const bootstrapModals = ['viewReportModal', 'resolutionModal', 'viewResolutionModal', 'successModal', 'approveModal'];
        bootstrapModals.forEach(modalId => {
            const modalEl = document.getElementById(modalId);
            if (modalEl) {
                modalEl.addEventListener('show.bs.modal', () => updateModalState(true));
                modalEl.addEventListener('hidden.bs.modal', () => updateModalState(false));
            }
        });
        
        const archiveModal = document.getElementById('archiveConfirmModal');
        if (archiveModal) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        updateModalState(archiveModal.style.display === 'flex');
                    }
                });
            });
            observer.observe(archiveModal, { attributes: true, attributeFilter: ['style'] });
        }
    }

    // ============================================
    // SUCCESS MODAL
    // ============================================
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

    document.getElementById('successOkBtn').addEventListener('click', function() {
        window.location.reload();
    });

    // ============================================
    // CONFIRM ACTION MODAL
    // ============================================
    function confirmAction(id, actionType) {
        pendingActionId = id;
        pendingActionType = actionType;
        
        const title = document.getElementById('confirmModalTitle');
        const message = document.getElementById('confirmModalMessage');
        const confirmBtn = document.getElementById('confirmArchiveBtn');
        
        if (actionType === 'reject') {
            title.innerHTML = `<i class="bi bi-x-circle me-2" style="color:#e74c3c;"></i> Reject Report`;
            message.textContent = 'Are you sure you want to reject this incoming safety report?';
            confirmBtn.className = 'confirm-yes reject';
            confirmBtn.textContent = 'Yes';
            confirmBtn.style.backgroundColor = '#e74c3c';
        } else if (actionType === 'cancel') {
            title.innerHTML = `<i class="bi bi-archive me-2" style="color:#e67e22;"></i> Cancel Report`;
            message.textContent = 'Are you sure you want to cancel this safety report?';
            confirmBtn.className = 'confirm-yes cancel';
            confirmBtn.textContent = 'Yes';
            confirmBtn.style.backgroundColor = '#e67e22';
        }
        
        document.getElementById('archiveConfirmModal').style.display = 'flex';
    }

    function closeActionConfirm() {
        pendingActionId = null;
        pendingActionType = null;
        document.getElementById('archiveConfirmModal').style.display = 'none';
    }

    document.getElementById('confirmArchiveBtn').addEventListener('click', function() {
        if (pendingActionId && pendingActionType) {
            let status = pendingActionType === 'reject' ? 'REJECTED' : 'CANCELLED';
            updateStatusWithSuccess(pendingActionId, status);
            closeActionConfirm();
        }
    });

    document.getElementById('btnCloseActionConfirm').addEventListener('click', closeActionConfirm);
    document.getElementById('archiveConfirmModal').addEventListener('click', function(e) {
        if (e.target === this) closeActionConfirm();
    });

    // ============================================
    // UPDATE STATUS
    // ============================================
    function updateStatusWithSuccess(id, status) {
        let statusText = '';
        switch(status) {
            case 'APPROVED': statusText = 'approved'; break;
            case 'IN_PROGRESS': statusText = 'moved to In Progress'; break;
            case 'RESOLVED': statusText = 'resolved'; break;
            case 'REJECTED': statusText = 'rejected'; break;
            case 'CANCELLED': statusText = 'cancelled'; break;
            default: statusText = 'updated';
        }
        fetch('/safety-reports/' + id + '/status?status=' + status, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' } 
        })
        .then(response => { 
            if (response.ok) {
                showSuccessWithReload(`Report ${statusText} successfully!`);
            } else {
                alert('Error updating status');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error updating status');
        });
    }

    // ============================================
    // APPROVE MODAL
    // ============================================
    function openApproveModal(id) {
        document.getElementById('approvePendingId').value = id;
        document.querySelector('input[name="approvePriority"][value="LOW"]').checked = true;
        new bootstrap.Modal(document.getElementById('approveModal')).show();
    }

    document.getElementById('confirmApproveBtn').addEventListener('click', function() {
        const id = document.getElementById('approvePendingId').value;
        const priority = document.querySelector('input[name="approvePriority"]:checked').value;

        fetch('/safety-reports/' + id + '/priority?priority=' + priority, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(res => {
            if (!res.ok) throw new Error('Priority update failed');
            return fetch('/safety-reports/' + id + '/status?status=APPROVED', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });
        })
        .then(res => {
            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('approveModal')).hide();
                showSuccessWithReload('Report approved successfully!');
            } else {
                alert('Error approving report');
            }
        })
        .catch(err => { console.error(err); alert('Error updating priority'); });
    });

    // ============================================
    // FILTER AND SEARCH
    // ============================================
    function applyTypeFilter() {
        const activePanel = document.querySelector('.panel-inner:not(.d-none)');
        if (!activePanel) return;

        if (activePanel.id === 'tab-incidentmap') {
            renderIncidentMapMarkers();
            return;
        }

        const rows = activePanel.querySelectorAll('tbody tr');
        const searchValue = document.getElementById('report-search').value.toLowerCase();
        
        rows.forEach(row => {
            if (row.querySelector('td[colspan]')) {
                row.style.display = '';
                return;
            }
            
            const typeCell = row.querySelector('.type-cell');
            let matchType = true;
            if (currentTypeFilter !== 'all') {
                const typeText = typeCell ? typeCell.innerText.trim() : '';
                matchType = typeText.toUpperCase() === currentTypeFilter.toUpperCase();
            }
            
            const text = row.textContent.toLowerCase();
            const matchesSearch = text.includes(searchValue);
            
            row.style.display = (matchesSearch && matchType) ? '' : 'none';
        });
    }

    document.getElementById('report-search').addEventListener('keyup', function() {
        const searchValue = this.value.toLowerCase();
        mapSearchValue = searchValue;

        const activePanel = document.querySelector('.panel-inner:not(.d-none)');
        if (!activePanel) return;

        if (activePanel.id === 'tab-incidentmap') {
            renderIncidentMapMarkers();
            return;
        }

        const rows = activePanel.querySelectorAll('tbody tr');
        rows.forEach(row => {
            if (row.querySelector('td[colspan]')) {
                row.style.display = '';
                return;
            }
            
            const text = row.textContent.toLowerCase();
            const matchesSearch = text.includes(searchValue);
            
            let matchesType = true;
            if (currentTypeFilter !== 'all') {
                const typeCell = row.querySelector('.type-cell');
                const typeText = typeCell ? typeCell.innerText.trim() : '';
                matchesType = typeText.toUpperCase() === currentTypeFilter.toUpperCase();
            }
            
            row.style.display = (matchesSearch && matchesType) ? '' : 'none';
        });
    });

    document.getElementById('typeFilterMenu').addEventListener('click', function(e) {
        const item = e.target.closest('.dropdown-item');
        if (!item) return;
        e.preventDefault();
        currentTypeFilter = item.getAttribute('data-type');
        const buttonText = currentTypeFilter === 'all' ? 'Filter by Type' : currentTypeFilter;
        document.getElementById('typeFilterDropdown').innerHTML = `<i class="bi bi-funnel"></i> ${buttonText}`;
        applyTypeFilter();
    });

    // ============================================
    // EVENT DELEGATION FOR TABLE BUTTONS
    // ============================================
    document.querySelector('.panel').addEventListener('click', function(e) {
        // View Report
        if (e.target.classList.contains('btn-view-report')) {
            viewReport(e.target.getAttribute('data-id'));
            return;
        }
        // Open Approve Modal
        if (e.target.classList.contains('btn-open-approve')) {
            openApproveModal(e.target.getAttribute('data-id'));
            return;
        }
        // Confirm Action (Reject/Cancel)
        if (e.target.classList.contains('btn-confirm-action')) {
            confirmAction(e.target.getAttribute('data-id'), e.target.getAttribute('data-action'));
            return;
        }
        // Update Status (Process)
        if (e.target.classList.contains('btn-update-status')) {
            updateStatusWithSuccess(e.target.getAttribute('data-id'), e.target.getAttribute('data-status'));
            return;
        }
        // Open Resolution Modal
        if (e.target.classList.contains('btn-open-resolution')) {
            openResolutionModal(e.target.getAttribute('data-id'));
            return;
        }
        // View Resolution
        if (e.target.classList.contains('btn-view-resolution')) {
            viewResolutionDetails(e.target.getAttribute('data-id'));
            return;
        }
    });

    // ============================================
    // VIEW REPORT
    // ============================================
    function findResidentPriority(reporterId, residents) {
        if (!reporterId) return null;
        return residents.find(res => String(res.id) === String(reporterId)) || null;
    }

    function viewReport(id) {
        currentModalReportId = id;
        Promise.all([
            fetch('/safety-reports/' + id).then(r => r.json()),
            fetch('/Resident-census/api/priority-residents').then(r => r.json()).catch(() => [])
        ])
        .then(([data, residents]) => {
            currentModalReportStatus = data.status;

            const hasLocation = data.latitude && data.longitude && data.latitude !== 0 && data.longitude !== 0;
            const statusColor = getStatusColor(data.status);

            const matched = findResidentPriority(data.reporterId, residents || []);
            const isSenior = matched ? !!matched.isSeniorCitizen : false;
            const isPwd = matched ? !!matched.isPwd : false;
            const isUnverified = data.reporterId && !matched;

            let priorityLabel, priorityColor, priorityTextColor;
            if (isSenior && isPwd) {
                priorityLabel = 'Senior & PWD'; priorityColor = '#e67e22'; priorityTextColor = 'white';
            } else if (isSenior) {
                priorityLabel = 'Senior Citizen'; priorityColor = '#FED734'; priorityTextColor = '#5a4200';
            } else if (isPwd) {
                priorityLabel = 'PWD'; priorityColor = '#27ae60'; priorityTextColor = 'white';
            } else if (isUnverified) {
                priorityLabel = 'Unverified'; priorityColor = '#bbb'; priorityTextColor = 'white';
            } else {
                priorityLabel = 'Regular Resident'; priorityColor = '#95a5a6'; priorityTextColor = 'white';
            }

            let timeSubmittedDisplay = 'N/A';
            if (data.timeSubmitted) {
                try {
                    const timeParts = data.timeSubmitted.split(':');
                    let hour = parseInt(timeParts[0]);
                    const minute = timeParts[1] || '00';
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    hour = hour % 12 || 12;
                    timeSubmittedDisplay = `${hour}:${minute} ${ampm}`;
                } catch(e) {
                    timeSubmittedDisplay = data.timeSubmitted;
                }
            }

            let resolutionBlock = '';
            if (data.resolutionActions || data.resolutionResponseTime || data.resolutionNotes) {
                resolutionBlock = `
                    <div class="vr-resolution-block">
                        ${data.resolutionResponseTime ? `<div class="vr-res-row"><span class="vr-res-label">Response Time</span>${escapeHtml(data.resolutionResponseTime)}</div>` : ''}
                        ${data.resolutionActions ? `<div class="vr-res-row"><span class="vr-res-label">Actions Taken</span>${escapeHtml(data.resolutionActions)}</div>` : ''}
                        ${data.resolutionNotes ? `<div class="vr-res-row"><span class="vr-res-label">Additional Notes</span>${escapeHtml(data.resolutionNotes)}</div>` : ''}
                    </div>`;
            }

            const imageStrip = data.imageUrl ? `
                <div style="border-top:2px solid #eaf2f0;background:white;">
                    <div style="display:flex;align-items:center;gap:10px;padding:12px 20px 10px;background:#f8faf9;border-bottom:1px solid #e8e8e8;">
                        <div style="width:32px;height:32px;border-radius:8px;background:#eaf2f0;display:flex;align-items:center;justify-content:center;color:#2d4a44;font-size:16px;flex-shrink:0;">
                            <i class="bi bi-image"></i>
                        </div>
                        <span style="font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.7px;">Photo Evidence</span>
                        <a href="${data.imageUrl}" target="_blank" style="margin-left:auto;font-size:11px;color:#3498db;text-decoration:none;display:flex;align-items:center;gap:4px;">
                            <i class="bi bi-arrows-fullscreen"></i> Open full size
                        </a>
                    </div>
                    <div style="padding:16px 20px;background:white;">
                        <a href="${data.imageUrl}" target="_blank" style="display:block;">
                            <img src="${data.imageUrl}" alt="Report photo" style="width:100%;max-height:300px;object-fit:contain;border-radius:8px;border:1px solid #e0e0e0;cursor:zoom-in;background:#f5f5f5;transition:opacity 0.2s;" onerror="this.closest('div').parentElement.parentElement.style.display='none'">
                        </a>
                    </div>
                </div>` : '';

            document.getElementById('viewModalBody').innerHTML = `
                <div style="border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">
                    <div class="vr-layout" style="border:none;border-radius:0;">
                        <div class="vr-left">
                            <div class="vr-card">
                                <div class="vr-card-icon"><i class="bi bi-person-fill"></i></div>
                                <div class="vr-card-body">
                                    <div class="vr-card-label">Submitted By</div>
                                    <div class="vr-card-value">${escapeHtml(data.reporterName) || 'Anonymous'}
                                        <span class="vr-status-pill" style="background-color:${priorityColor};color:${priorityTextColor};">
                                            <i class="bi bi-circle-fill" style="font-size:7px;"></i> ${priorityLabel}
                                        </span>
                                    </div>
                                    <div class="vr-card-sub">${escapeHtml(data.reporterContact) || 'No contact info'}</div>
                                </div>
                            </div>
                            <div class="vr-card">
                                <div class="vr-card-icon"><i class="bi bi-exclamation-triangle-fill"></i></div>
                                <div class="vr-card-body">
                                    <div class="vr-card-label">Incident Type &amp; Location</div>
                                    <div class="vr-card-value">${escapeHtml(data.type) || 'General Incident'}</div>
                                    <div class="vr-card-sub"><i class="bi bi-geo-alt-fill" style="color:#e74c3c;font-size:12px;"></i> ${escapeHtml(data.location) || 'No address provided'}</div>
                                </div>
                            </div>
                            <div class="vr-card" style="flex-direction:column;align-items:stretch;">
                                <div style="display:flex;gap:16px;align-items:flex-start;">
                                    <div class="vr-card-icon" style="flex-shrink:0;"><i class="bi bi-file-text-fill"></i></div>
                                    <div class="vr-card-body">
                                        <div class="vr-card-label">Report Details</div>
                                        <div class="vr-card-value" style="font-size:14px;font-weight:600;margin-bottom:6px;">${escapeHtml(data.title) || 'Untitled'}</div>
                                        <div class="vr-pill-row">
                                            <span class="vr-status-pill" style="background-color:${statusColor};">
                                                <i class="bi bi-circle-fill" style="font-size:7px;"></i> ${getStatusLabel(data.status)}
                                            </span>
                                        </div>
                                        <div class="vr-card-value wrap" style="margin-top:10px;">${escapeHtml(data.description) || 'No description provided.'}</div>
                                        <div style="font-size:12px;color:#aaa;margin-top:10px;line-height:1.6;">
                                            <i class="bi bi-calendar3"></i> ${data.dateSubmitted || 'N/A'}
                                            ${data.timeSubmitted ? `&nbsp;&nbsp;<i class="bi bi-clock"></i> ${timeSubmittedDisplay}` : ''}
                                            ${data.resolvedBy ? `&nbsp;&nbsp;<i class="bi bi-person-check-fill"></i> Resolved by: ${escapeHtml(data.resolvedBy)}` : ''}
                                        </div>
                                    </div>
                                </div>
                                ${resolutionBlock}
                            </div>
                        </div>
                        <div class="vr-right">
                            ${hasLocation ? `<div id="viewMap" style="width:100%;height:100%;"></div>` : `<div class="vr-no-map"><i class="bi bi-map"></i><span>No location coordinates available</span></div>`}
                        </div>
                    </div>
                    ${imageStrip}
                </div>
            `;

            const approveBtn = document.getElementById('modalApproveBtn');
            const role = document.getElementById('currentUserRole')?.value;
            const canAct = role === 'ADMIN' || role === 'SECRETARY' || role === 'SECRETARIAT STAFF';
            approveBtn.style.display = (data.status === 'INCOMING' && canAct) ? 'inline-block' : 'none';

            if (currentMap) { currentMap.remove(); currentMap = null; }

            const modalEl = document.getElementById('viewReportModal');
            const modal = new bootstrap.Modal(modalEl);

            if (hasLocation) {
                modalEl.addEventListener('shown.bs.modal', function handler() {
                    modalEl.removeEventListener('shown.bs.modal', handler);
                    const mapContainer = document.getElementById('viewMap');
                    if (!mapContainer) return;
                    const map = L.map('viewMap').setView([data.latitude, data.longitude], 16);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
                    const redIcon = L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                    });
                    L.marker([data.latitude, data.longitude], { icon: redIcon })
                        .addTo(map)
                        .bindPopup(`<b>${escapeHtml(data.title || 'Report Location')}</b>`)
                        .openPopup();

                    fetch('/Resident-census/api/priority-residents')
                        .then(r => r.json())
                        .then(residents => {
                            residents.forEach(res => {
                                const lat = parseFloat(res.latitude);
                                const lng = parseFloat(res.longitude);
                                if (isNaN(lat) || isNaN(lng)) return;

                                const isSenior = !!res.isSeniorCitizen;
                                const isPwd = !!res.isPwd;
                                const color = (isSenior && isPwd) ? '#e67e22' : isSenior ? '#FED734' : '#27ae60';
                                const border = (isSenior && isPwd) ? '#c0560a' : isSenior ? '#c0a000' : '#1a7a3a';
                                const label = (isSenior && isPwd) ? 'Senior & PWD' : isSenior ? 'Senior Citizen' : 'PWD';
                                const emoji = (isSenior && isPwd) ? '★' : isSenior ? '👴' : '♿';
                                const fullName = `${res.lastName || ''}, ${res.firstName || ''}`.replace(/^,\s*/, '');

                                const icon = L.divIcon({
                                    html: `<div style="width:22px;height:22px;transform:rotate(45deg);background:${color};border:2.5px solid ${border};border-radius:4px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3);"><span style="transform:rotate(-45deg);font-size:10px;line-height:1">${emoji}</span></div>`,
                                    className: '', iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -14]
                                });

                                L.marker([lat, lng], { icon, draggable: false })
                                    .addTo(map)
                                    .bindPopup(`
                                        <div style="min-width:210px;font-family:Arial,sans-serif;padding:4px 0">
                                            <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#1a1a1a">${escapeHtml(fullName) || '—'}</div>
                                            <div style="margin-bottom:8px"><span style="background:${color};color:${(isSenior&&!isPwd)?'#5a4200':'white'};padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700">${label}</span></div>
                                            <div style="font-size:12px;color:#555;line-height:1.8;border-top:1px solid #f0f0f0;padding-top:6px">
                                                <div><strong style="color:#2d4a44">Address:</strong> ${escapeHtml(res.address) || '—'}</div>
                                                <div><strong style="color:#2d4a44">Emergency Contact:</strong> ${escapeHtml(res.emergencyContactName) || '—'} ${res.emergencyContactRelation ? '(' + escapeHtml(res.emergencyContactRelation) + ')' : ''}</div>
                                                <div><strong style="color:#2d4a44">Contact No.:</strong> ${escapeHtml(res.emergencyContactNumber) || '—'}</div>
                                            </div>
                                        </div>`, { maxWidth: 250 });
                            });
                        })
                        .catch(err => console.warn('Could not load priority residents:', err));

                    map.invalidateSize();
                    currentMap = map;
                });
            }

            modal.show();
        })
        .catch(error => { console.error(error); alert("Error loading report details"); });
    }

    document.getElementById('modalApproveBtn').addEventListener('click', function() {
        if (currentModalReportId && currentModalReportStatus === 'INCOMING') {
            const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewReportModal'));
            viewModal.hide();
            openApproveModal(currentModalReportId);
        }
    });

    // ============================================
    // RESOLUTION MODAL
    // ============================================
    let pendingResolveId = null;

    function openResolutionModal(id) {
        pendingResolveId = id;
        fetch('/safety-reports/' + id).then(response => response.json()).then(data => {
            document.getElementById('infoTitle').textContent = data.title || 'Untitled';
            document.getElementById('infoLocation').textContent = data.location || 'No location';
            document.getElementById('infoType').textContent = data.type || 'Safety';
            const priorityClass = data.priority === 'HIGH' ? 'priority-high' : data.priority === 'MEDIUM' ? 'priority-medium' : 'priority-low';
            document.getElementById('infoPriority').innerHTML = `<span class="badge-priority ${priorityClass}">${data.priority || 'LOW'}</span>`;
            document.getElementById('infoReporter').textContent = data.reporterName || 'N/A';
            document.getElementById('infoDate').textContent = data.dateSubmitted || 'N/A';
            const approvedTime = data.dateHandled ? new Date(data.dateHandled) : null;
            if (approvedTime) {
                const now = new Date(); const diffMs = now - approvedTime; const diffMins = Math.floor(diffMs / 60000); const diffHours = Math.floor(diffMins / 60); const diffDays = Math.floor(diffHours / 24);
                let responseTimeText = diffDays > 0 ? `${diffDays} day(s), ${diffHours % 24} hour(s), ${diffMins % 60} minute(s)` : diffHours > 0 ? `${diffHours} hour(s), ${diffMins % 60} minute(s)` : `${diffMins} minute(s)`;
                document.getElementById('resolutionResponseTime').value = responseTimeText;
            } else { document.getElementById('resolutionResponseTime').value = 'Not yet approved'; }
            document.getElementById('resolutionActions').value = '';
            document.getElementById('resolutionNotes').value = '';
            new bootstrap.Modal(document.getElementById('resolutionModal')).show();
        }).catch(error => { console.error(error); });
    }

    document.getElementById('confirmResolveBtn').addEventListener('click', function() {
        if (!pendingResolveId) return;
        const resolutionData = { 
            actions: document.getElementById('resolutionActions').value, 
            notes: document.getElementById('resolutionNotes').value, 
            responseTime: document.getElementById('resolutionResponseTime').value 
        };
        fetch('/safety-reports/' + pendingResolveId + '/resolution', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(resolutionData) 
        })
        .then(response => { 
            if (response.ok) {
                return fetch('/safety-reports/' + pendingResolveId + '/status?status=RESOLVED', { method: 'PUT', headers: { 'Content-Type': 'application/json' } });
            } else {
                throw new Error('Failed to save resolution');
            }
        })
        .then(response => { 
            if (response.ok) showSuccessWithReload('Report resolved successfully!'); 
            else alert('Error updating status'); 
        })
        .catch(error => { console.error(error); alert('Error saving resolution'); });
    });

    function viewResolutionDetails(id) {
        fetch('/safety-reports/' + id).then(response => response.json()).then(data => {
            document.getElementById('viewInfoTitle').textContent = data.title || 'Untitled';
            document.getElementById('viewInfoLocation').textContent = data.location || 'No location';
            document.getElementById('viewInfoType').textContent = data.type || 'Safety';
            const priorityClass = data.priority === 'HIGH' ? 'priority-high' : data.priority === 'MEDIUM' ? 'priority-medium' : 'priority-low';
            document.getElementById('viewInfoPriority').innerHTML = `<span class="badge-priority ${priorityClass}">${data.priority || 'LOW'}</span>`;
            document.getElementById('viewInfoReporter').textContent = data.reporterName || 'N/A';
            document.getElementById('viewInfoDate').textContent = data.dateSubmitted || 'N/A';
            document.getElementById('viewInfoResolvedBy').textContent = data.resolvedBy || 'N/A';
            document.getElementById('viewInfoResolvedOn').textContent = data.dateHandled ? new Date(data.dateHandled).toLocaleString() : 'N/A';
            document.getElementById('viewResponseTime').textContent = data.resolutionResponseTime || 'N/A';
            document.getElementById('viewActionsTaken').textContent = data.resolutionActions || 'No actions recorded';
            document.getElementById('viewAdditionalNotes').textContent = data.resolutionNotes || 'No additional notes';
            new bootstrap.Modal(document.getElementById('viewResolutionModal')).show();
        }).catch(error => { console.error(error); alert('Error loading resolution details'); });
    }

    // ============================================
    // EXPORT TO PDF
    // ============================================
    function exportToPDF() {
        const exportedBy = document.getElementById('currentUserName')?.value || 'Unknown User';
        const activePanel = document.querySelector('.panel-inner:not(.d-none)');
        if (!activePanel) return;

        if (activePanel.id === 'tab-incidentmap') {
            exportMapSummaryPDF();
            return;
        }

        const table = activePanel.querySelector('table');
        if (!table) return;

        const title = activePanel.querySelector('.panel-header').innerText.trim();
        const excludedHeaders = ['Actions', ''];

        const headerCellsAll = table.querySelectorAll('thead th');
        const includedIndexes = [];
        const headers = [];
        headerCellsAll.forEach((th, idx) => {
            const text = th.textContent.trim();
            if (!excludedHeaders.includes(text)) {
                includedIndexes.push(idx);
                headers.push(text);
            }
        });

        const rows = [];
        const bodyRows = table.querySelectorAll('tbody tr');
        bodyRows.forEach(tr => {
            if (tr.style.display === 'none') return;
            if (tr.querySelector('td[colspan]')) return;
            const cells = tr.querySelectorAll('td');
            const rowData = [];
            includedIndexes.forEach(i => {
                const cell = cells[i];
                let text = '';
                if (cell) {
                    const titleDiv = cell.querySelector('.report-title');
                    const locDiv = cell.querySelector('.report-location');
                    if (titleDiv) {
                        text = titleDiv.textContent.trim() + (locDiv ? ' — ' + locDiv.textContent.trim() : '');
                    } else {
                        text = cell.textContent.trim();
                    }
                }
                rowData.push(text);
            });
            rows.push(rowData);
        });

        const wideColumns = ['Report'];
        let tableHtml = `
        <div style="position:relative;text-align:center;padding-bottom:12px;margin-bottom:20px;border-bottom:3px solid #2d4a44;">
            <div style="position:absolute;left:-30px;top:-25px;display:flex;align-items:center;gap:5px;">
                <img src="/images/seal1.png" alt="Barangay Seal" style="width:16px;height:16px;object-fit:contain;">
                <span style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#888;white-space:nowrap;">CivilAccess Web System</span>
            </div>
            <div style="font-size:22px;font-weight:bold;color:#2d4a44;margin-bottom:4px;">${title}</div>
            <div style="font-size:13px;color:#555;">${new Date().toLocaleString()}</div>
            <div style="font-size:11px;color:#888;margin-top:2px;">Exported by: <strong style="color:#2d4a44;">${exportedBy}</strong></div>
        </div>`;

        tableHtml += `
        <div style="font-size:13px;font-weight:bold;color:#2d4a44;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #ddd;">
            ${title} <span style="font-weight:normal;font-size:11px;color:#888;">(${rows.length} record${rows.length !== 1 ? 's' : ''})</span>
        </div>`;

        if (rows.length === 0) {
            tableHtml += `<p style="color:#888;text-align:center;padding:20px 0;">No data to display.</p>`;
        } else {
            let headerRowHtml = '';
            headers.forEach(h => {
                const isWide = wideColumns.includes(h);
                headerRowHtml += `<th style="background-color:#2d4a44 !important;color:white !important;padding:8px;font-size:11px !important;border:1px solid #1a3530;${isWide ? 'min-width:160px;' : 'white-space:nowrap;'}">${h}</th>`;
            });

            let tableRowsHtml = '';
            rows.forEach((row, i) => {
                const bg = i % 2 === 0 ? 'white' : '#f5faf8';
                tableRowsHtml += `<tr style="background-color:${bg} !important;">`;
                row.forEach((cell, idx) => {
                    const isWide = wideColumns.includes(headers[idx]);
                    tableRowsHtml += `<td style="border:1px solid #ddd;padding:7px 8px;font-size:11px !important;vertical-align:top;${isWide ? 'white-space:normal;word-break:break-word;' : 'white-space:nowrap;'}">${cell}</td>`;
                });
                tableRowsHtml += `</tr>`;
            });

            tableHtml += `
            <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;table-layout:auto;">
                <thead><tr>${headerRowHtml}</tr></thead>
                <tbody>${tableRowsHtml}</tbody>
            </table>`;
        }

        tableHtml += `<div style="margin-top:20px;padding-top:10px;border-top:1px solid #e0e0e0;text-align:center;font-size:9px;color:#aaa;">Official document from Brgy. San Sebastian &nbsp;|&nbsp; Confidential</div>`;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'font-family:Arial,sans-serif;padding:36px;background:white;color:#222;';
        wrapper.innerHTML = tableHtml;

        const opt = {
            margin: [0.3, 0.3, 0.3, 0.3],
            filename: `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
        };

        const exportBtn = document.getElementById('export-pdf-btn');
        const originalText = exportBtn ? exportBtn.innerHTML : 'Export';
        if (exportBtn) {
            exportBtn.innerHTML = 'Generating...';
            exportBtn.disabled = true;
        }

        html2pdf().set(opt).from(wrapper).save()
            .then(() => {
                if (exportBtn) {
                    exportBtn.innerHTML = originalText;
                    exportBtn.disabled = false;
                }
            })
            .catch(error => {
                console.error('PDF generation error:', error);
                alert('Error generating PDF. Please try again.');
                if (exportBtn) {
                    exportBtn.innerHTML = originalText;
                    exportBtn.disabled = false;
                }
            });
    }

    function exportMapSummaryPDF() {
        const data = allReportsData || [];
        const title = 'Incident Map Summary';

        const byType = {};
        data.forEach(r => {
            const t = r.type || 'Unknown';
            byType[t] = (byType[t] || 0) + 1;
        });
        const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]);

        const byPriority = { HIGH: 0, MEDIUM: 0, LOW: 0 };
        data.forEach(r => { byPriority[(r.priority || 'LOW').toUpperCase()] = (byPriority[(r.priority || 'LOW').toUpperCase()] || 0) + 1; });

        const byStatus = {};
        data.forEach(r => { byStatus[r.status || 'UNKNOWN'] = (byStatus[r.status || 'UNKNOWN'] || 0) + 1; });

        let tableRows = '';
        let rowCount = 0;

        const priorityColors = { HIGH: '#e74c3c', MEDIUM: '#e67e22', LOW: '#27ae60' };
        Object.entries(byPriority).forEach(([p, c]) => {
            const bg = rowCount % 2 === 0 ? 'white' : '#f5faf8';
            tableRows += `
                <tr style="background-color:${bg} !important;">
                    <td style="border:1px solid #ddd;padding:7px 8px;font-size:11px !important;">
                        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${priorityColors[p]};margin-right:8px;"></span>
                        ${p}
                    </td>
                    <td style="border:1px solid #ddd;padding:7px 8px;font-size:11px !important;text-align:center;font-weight:bold;">${c}</td>
                </tr>
            `;
            rowCount++;
        });

        Object.entries(byStatus).forEach(([s, c]) => {
            const bg = rowCount % 2 === 0 ? 'white' : '#f5faf8';
            tableRows += `
                <tr style="background-color:${bg} !important;">
                    <td style="border:1px solid #ddd;padding:7px 8px;font-size:11px !important;">
                        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${getStatusColor(s)};margin-right:8px;"></span>
                        ${getStatusLabel(s)}
                    </td>
                    <td style="border:1px solid #ddd;padding:7px 8px;font-size:11px !important;text-align:center;font-weight:bold;">${c}</td>
                </tr>
            `;
            rowCount++;
        });

        sortedTypes.forEach(([t, c]) => {
            const bg = rowCount % 2 === 0 ? 'white' : '#f5faf8';
            tableRows += `
                <tr style="background-color:${bg} !important;">
                    <td style="border:1px solid #ddd;padding:7px 8px;font-size:11px !important;">${t}</td>
                    <td style="border:1px solid #ddd;padding:7px 8px;font-size:11px !important;text-align:center;font-weight:bold;">${c}</td>
                </tr>
            `;
            rowCount++;
        });

        tableRows += `
            <tr style="background-color:#eaf2f0 !important;font-weight:bold;">
                <td style="border:1px solid #ddd;padding:7px 8px;font-size:12px !important;">TOTAL REPORTS</td>
                <td style="border:1px solid #ddd;padding:7px 8px;font-size:12px !important;text-align:center;">${data.length}</td>
            </tr>
        `;

        let tableHtml = `
        <div style="position:relative;text-align:center;padding-bottom:12px;margin-bottom:20px;border-bottom:3px solid #2d4a44;">
            <div style="position:absolute;left:-30px;top:-25px;display:flex;align-items:center;gap:5px;">
                <img src="/images/seal1.png" alt="Barangay Seal" style="width:16px;height:16px;object-fit:contain;">
                <span style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#888;white-space:nowrap;">CivilAccess Web System</span>
            </div>
            <div style="font-size:22px;font-weight:bold;color:#2d4a44;margin-bottom:4px;">${title}</div>
            <div style="font-size:13px;color:#555;">${new Date().toLocaleString()}</div>
        </div>
        <div style="font-size:13px;font-weight:bold;color:#2d4a44;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #ddd;">
            Incident Summary <span style="font-weight:normal;font-size:11px;color:#888;">(Total: ${data.length} reports)</span>
        </div>`;

        if (data.length === 0) {
            tableHtml += `<p style="color:#888;text-align:center;padding:20px 0;">No incident data available.</p>`;
        } else {
            tableHtml += `
            <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;table-layout:auto;">
                <thead>
                    <tr>
                        <th style="background-color:#2d4a44 !important;color:white !important;padding:8px;font-size:11px !important;border:1px solid #1a3530;text-align:left;width:70%;">Category</th>
                        <th style="background-color:#2d4a44 !important;color:white !important;padding:8px;font-size:11px !important;border:1px solid #1a3530;text-align:center;width:30%;">Count</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>`;
        }

        tableHtml += `<div style="margin-top:20px;padding-top:10px;border-top:1px solid #e0e0e0;text-align:center;font-size:9px;color:#aaa;">Official document from Brgy. San Sebastian &nbsp;|&nbsp; Confidential</div>`;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'font-family:Arial,sans-serif;padding:36px;background:white;color:#222;';
        wrapper.innerHTML = tableHtml;

        const opt = {
            margin: [0.3, 0.3, 0.3, 0.3],
            filename: `Incident_Map_Summary_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        const exportBtn = document.getElementById('export-pdf-btn');
        const originalText = exportBtn ? exportBtn.innerHTML : 'Export';
        if (exportBtn) {
            exportBtn.innerHTML = 'Generating...';
            exportBtn.disabled = true;
        }

        html2pdf().set(opt).from(wrapper).save()
            .then(() => {
                if (exportBtn) {
                    exportBtn.innerHTML = originalText;
                    exportBtn.disabled = false;
                }
            })
            .catch(error => {
                console.error('PDF generation error:', error);
                alert('Error generating PDF. Please try again.');
                if (exportBtn) {
                    exportBtn.innerHTML = originalText;
                    exportBtn.disabled = false;
                }
            });
    }

    // ============================================
    // INCIDENT MAP
    // ============================================
    const SAN_SEBASTIAN_POLYGON = [
        [14.418865, 120.886515], [14.418666, 120.887862], [14.418969, 120.887902], [14.419010, 120.889089],
        [14.419495, 120.890312], [14.419868, 120.891458], [14.421015, 120.892997], [14.420850, 120.894121],
        [14.421649, 120.895839], [14.422202, 120.897952], [14.423068, 120.897849], [14.423119, 120.901125],
        [14.424041, 120.901272], [14.424003, 120.901537], [14.423712, 120.901693], [14.423442, 120.901698],
        [14.422226, 120.902297], [14.421938, 120.902353], [14.421616, 120.902259], [14.421310, 120.901863],
        [14.421144, 120.901766], [14.420634, 120.901951], [14.420445, 120.901895], [14.420210, 120.902035],
        [14.420090, 120.902842], [14.419753, 120.902879], [14.419026, 120.902860], [14.419009, 120.903096],
        [14.418809, 120.903301], [14.418490, 120.902674], [14.418246, 120.902392], [14.417720, 120.901458],
        [14.416779, 120.900345], [14.415834, 120.899736], [14.414386, 120.896173], [14.413767, 120.895386],
        [14.411402, 120.895039], [14.410154, 120.894599], [14.409451, 120.893831], [14.408851, 120.892746],
        [14.409384, 120.892449], [14.409930, 120.891833], [14.410030, 120.891627], [14.411015, 120.890809],
        [14.411201, 120.890131], [14.411176, 120.889748], [14.411426, 120.889479], [14.411647, 120.889479],
        [14.414170, 120.887581], [14.415289, 120.887273], [14.415541, 120.886679], [14.415663, 120.886825],
        [14.418853, 120.886512]
    ];

    function setMapStatusFilter(status) {
        currentMapStatusFilter = status;
        document.querySelectorAll('.map-status-btn').forEach(btn => {
            const active = btn.dataset.status === status;
            const c = btn.dataset.color || '#2d4a44';
            btn.style.background = active ? c : 'white';
            btn.style.color = active ? 'white' : c;
        });
        renderIncidentMapMarkers();
        if (summaryPanelOpen) renderSummaryPanel();
    }

    function fitToBoundary() {
        if (!incidentMapInstance) return;
        incidentMapInstance.fitBounds(L.latLngBounds(SAN_SEBASTIAN_POLYGON), { padding: [30, 30] });
    }

    function toggleSummaryPanel() {
        summaryPanelOpen = !summaryPanelOpen;
        const panel = document.getElementById('mapSummaryPanel');
        const btn = document.getElementById('summaryToggleBtn');
        panel.classList.toggle('open', summaryPanelOpen);
        btn.classList.toggle('active', summaryPanelOpen);
        if (summaryPanelOpen) {
            renderSummaryPanel();
            setTimeout(() => { if (incidentMapInstance) incidentMapInstance.invalidateSize(); }, 320);
        } else {
            setTimeout(() => { if (incidentMapInstance) incidentMapInstance.invalidateSize(); }, 320);
        }
    }

    function renderSummaryPanel() {
        const body = document.getElementById('mapSummaryBody');
        const data = allReportsData;
        if (!data || data.length === 0) {
            body.innerHTML = '<div style="text-align:center;padding:30px;color:#aaa;font-size:13px;">No report data available</div>';
            return;
        }

        const byType = {};
        data.forEach(r => {
            const t = r.type || 'Unknown';
            byType[t] = (byType[t] || 0) + 1;
        });
        const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]);
        const maxType = sortedTypes[0]?.[1] || 1;

        const byPriority = { HIGH: 0, MEDIUM: 0, LOW: 0 };
        data.forEach(r => { byPriority[(r.priority || 'LOW').toUpperCase()] = (byPriority[(r.priority || 'LOW').toUpperCase()] || 0) + 1; });
        const priorityColors = { HIGH: '#e74c3c', MEDIUM: '#e67e22', LOW: '#27ae60' };

        const byStatus = {};
        data.forEach(r => { byStatus[r.status || 'UNKNOWN'] = (byStatus[r.status || 'UNKNOWN'] || 0) + 1; });

        const crimeCount = data.filter(r => (r.type || '').toLowerCase().includes('crime')).length;
        const nonCrimeCount = data.length - crimeCount;

        const GRID = 0.002;
        const gridMap = {};
        data.forEach(r => {
            if (!r.latitude || !r.longitude) return;
            const gx = Math.round(r.latitude / GRID);
            const gy = Math.round(r.longitude / GRID);
            const key = `${gx}_${gy}`;
            if (!gridMap[key]) gridMap[key] = { lat: gx * GRID, lng: gy * GRID, reports: [] };
            gridMap[key].reports.push(r);
        });
        const hotspots = Object.values(gridMap)
            .filter(g => g.reports.length > 0)
            .sort((a, b) => b.reports.length - a.reports.length)
            .slice(0, 5);

        function topLocation(reports) {
            const locCount = {};
            reports.forEach(r => {
                if (r.location) locCount[r.location] = (locCount[r.location] || 0) + 1;
            });
            const sorted = Object.entries(locCount).sort((a, b) => b[1] - a[1]);
            return sorted[0]?.[0] || 'Unknown area';
        }

        function dominantType(reports) {
            const tc = {};
            reports.forEach(r => { if (r.type) tc[r.type] = (tc[r.type] || 0) + 1; });
            return Object.entries(tc).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        }

        function dominantPriority(reports) {
            if (reports.some(r => r.priority === 'HIGH')) return { label: 'HIGH', color: '#e74c3c' };
            if (reports.some(r => r.priority === 'MEDIUM')) return { label: 'MEDIUM', color: '#e67e22' };
            return { label: 'LOW', color: '#27ae60' };
        }

        const now = new Date();
        const recentCount = data.filter(r => {
            if (!r.dateSubmitted) return false;
            const d = new Date(r.dateSubmitted);
            return (now - d) / 86400000 <= 30;
        }).length;

        body.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
                <div style="background:#eaf2f0;border-radius:8px;padding:10px 12px;text-align:center;">
                    <div style="font-size:22px;font-weight:700;color:#2d4a44;">${data.length}</div>
                    <div style="font-size:10px;color:#888;font-weight:600;text-transform:uppercase;">Total Reports</div>
                </div>
                <div style="background:#fff3cd;border-radius:8px;padding:10px 12px;text-align:center;">
                    <div style="font-size:22px;font-weight:700;color:#856404;">${recentCount}</div>
                    <div style="font-size:10px;color:#888;font-weight:600;text-transform:uppercase;">Last 30 Days</div>
                </div>
                <div style="background:#fdecea;border-radius:8px;padding:10px 12px;text-align:center;">
                    <div style="font-size:22px;font-weight:700;color:#c0392b;">${crimeCount}</div>
                    <div style="font-size:10px;color:#888;font-weight:600;text-transform:uppercase;">Crime Reports</div>
                </div>
                <div style="background:#e8f5f0;border-radius:8px;padding:10px 12px;text-align:center;">
                    <div style="font-size:22px;font-weight:700;color:#2d7a5f;">${nonCrimeCount}</div>
                    <div style="font-size:10px;color:#888;font-weight:600;text-transform:uppercase;">Other Incidents</div>
                </div>
            </div>

            <div class="summary-section">
                <div class="summary-section-title">By Priority</div>
                ${Object.entries(byPriority).map(([p, c]) => `
                    <div class="summary-row">
                        <div class="summary-row-label">
                            <span class="summary-dot" style="background:${priorityColors[p]};"></span>
                            ${p}
                        </div>
                        <span class="summary-count">${c}</span>
                    </div>
                    <div class="summary-bar-wrap">
                        <div class="summary-bar" style="width:${Math.round(c/data.length*100)}%;background:${priorityColors[p]};"></div>
                    </div>
                `).join('')}
            </div>

            <div class="summary-section">
                <div class="summary-section-title">By Status</div>
                ${Object.entries(byStatus).map(([s, c]) => `
                    <div class="summary-row">
                        <div class="summary-row-label">
                            <span class="summary-dot" style="background:${getStatusBadgeColor(s)};"></span>
                            ${getStatusLabel(s)}
                        </div>
                        <span class="summary-count">${c}</span>
                    </div>
                `).join('')}
            </div>

            <div class="summary-section">
                <div class="summary-section-title">By Incident Type</div>
                ${sortedTypes.map(([t, c]) => `
                    <div class="summary-row">
                        <div class="summary-row-label" title="${escapeHtml(t)}">${escapeHtml(t)}</div>
                        <span class="summary-count">${c}</span>
                    </div>
                    <div class="summary-bar-wrap">
                        <div class="summary-bar" style="width:${Math.round(c/maxType*100)}%;background:#3d6b64;"></div>
                    </div>
                `).join('')}
            </div>

            <div class="summary-section">
                <div class="summary-section-title">⚠️ Prone Areas (Hotspots)</div>
                ${hotspots.length === 0
                    ? '<div style="color:#aaa;font-size:12px;font-style:italic;">No location data available</div>'
                    : hotspots.map((h, i) => {
                        const loc = topLocation(h.reports);
                        const type = dominantType(h.reports);
                        const prio = dominantPriority(h.reports);
                        const crimeHere = h.reports.filter(r => (r.type || '').toLowerCase().includes('crime')).length;
                        return `
                            <div class="hotspot-item btn-fly-hotspot" data-lat="${h.lat}" data-lng="${h.lng}" title="Click to zoom to this area">
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                                    <span class="hotspot-rank">${i + 1}</span>
                                    <div class="hotspot-name">${escapeHtml(loc)}</div>
                                    <span style="margin-left:auto;font-size:11px;font-weight:700;color:${prio.color};">
                                        ${h.reports.length} reports
                                    </span>
                                </div>
                                <div class="hotspot-meta">
                                    ${type ? `<i class="bi bi-exclamation-triangle-fill" style="color:${prio.color};font-size:10px;"></i> ${escapeHtml(type)}` : ''}
                                    ${crimeHere > 0 ? `&nbsp;·&nbsp;<i class="bi bi-shield-exclamation" style="color:#e74c3c;font-size:10px;"></i> ${crimeHere} crime${crimeHere > 1 ? 's' : ''}` : ''}
                                </div>
                                <div class="hotspot-pills">
                                    <span class="hotspot-pill" style="background:${prio.color}22;color:${prio.color};border:1px solid ${prio.color}55;">
                                        ${prio.label}
                                    </span>
                                    ${h.reports.filter(r => r.status === 'INCOMING' || r.status === 'IN_PROGRESS').length > 0
                                        ? `<span class="hotspot-pill" style="background:#fdecea;color:#c0392b;border:1px solid #f5c6cb;">
                                            ${h.reports.filter(r => r.status === 'INCOMING' || r.status === 'IN_PROGRESS').length} active
                                           </span>` : ''}
                                </div>
                            </div>`;
                    }).join('')
                }
            </div>

            <div style="font-size:10px;color:#bbb;text-align:center;padding-top:4px;padding-bottom:8px;">
                Click a hotspot to zoom to that area
            </div>
        `;

        body.querySelectorAll('.btn-fly-hotspot').forEach(el => {
            el.addEventListener('click', function() {
                flyToHotspot(parseFloat(this.getAttribute('data-lat')), parseFloat(this.getAttribute('data-lng')));
            });
        });
    }

    function flyToHotspot(lat, lng) {
        if (!incidentMapInstance) return;
        incidentMapInstance.flyTo([lat, lng], 16, { duration: 1.2 });
    }

    function toggleHeatmap() {
        if (!incidentMapInstance) return;
        heatmapVisible = !heatmapVisible;
        const btn = document.getElementById('heatmap-btn');

        if (heatmapVisible) {
            const points = allReportsData
                .filter(r => r.latitude && r.longitude && (r.type || '').toLowerCase().includes('crime'))
                .map(r => {
                    const intensity = r.priority === 'HIGH' ? 1.0 : r.priority === 'MEDIUM' ? 0.6 : 0.3;
                    return [r.latitude, r.longitude, intensity];
                });

            if (points.length === 0) {
                alert('No crime reports with location data to display.');
                heatmapVisible = false;
                return;
            }

            heatmapLayer = L.heatLayer(points, {
                radius: 35, blur: 25, maxZoom: 17,
                gradient: { 0.3: '#ffeb3b', 0.6: '#ff9800', 1.0: '#e74c3c' }
            }).addTo(incidentMapInstance);

            if (markerClusterGroup) incidentMapInstance.removeLayer(markerClusterGroup);
            btn.style.background = '#8e44ad';
            btn.style.color = 'white';
        } else {
            if (heatmapLayer) { incidentMapInstance.removeLayer(heatmapLayer); heatmapLayer = null; }
            if (markerClusterGroup) incidentMapInstance.addLayer(markerClusterGroup);
            btn.style.background = 'white';
            btn.style.color = '#8e44ad';
        }
    }

    function initIncidentMap() {
        if (incidentMapInitialized) {
            if (incidentMapInstance) setTimeout(() => incidentMapInstance.invalidateSize(), 150);
            return;
        }

        const mapContainer = document.getElementById('incidentMap');
        if (!mapContainer) return;

        incidentMapInstance = L.map('incidentMap', { zoomControl: true, scrollWheelZoom: true }).setView([14.4160, 120.8950], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(incidentMapInstance);
        L.polygon(SAN_SEBASTIAN_POLYGON, { color: '#2d4a44', weight: 2.5, opacity: 0.75, fillColor: '#2d4a44', fillOpacity: 0.06, dashArray: '6 4', interactive: false }).addTo(incidentMapInstance);

        incidentMapInitialized = true;
        fetchAllReportsForMap();
        fetchResidentOverlay();
    }

    function fetchAllReportsForMap() {
        fetch('/safety-reports/api/all')
            .then(r => r.json())
            .then(reports => {
                allReportsData = reports;
                document.getElementById('map-total-count').textContent = reports.length;
                renderIncidentMapMarkers();
            })
            .catch(err => console.error('Error loading reports for map:', err));
    }

    function fetchResidentOverlay() {
        fetch('/Resident-census/api/priority-residents')
            .then(r => r.json())
            .then(data => {
                allResidentData = data;
                renderResidentMarkers();
            })
            .catch(err => console.warn('Resident overlay unavailable:', err));
    }

    function renderResidentMarkers() {
        if (!incidentMapInstance) return;
        residentMarkers.forEach(m => incidentMapInstance.removeLayer(m));
        residentMarkers = [];

        allResidentData.forEach(res => {
            const isSenior = !!res.isSeniorCitizen;
            const isPwd = !!res.isPwd;
            const lat = parseFloat(res.latitude);
            const lng = parseFloat(res.longitude);
            if (isNaN(lat) || isNaN(lng)) return;

            if (isSenior && !isPwd && !showSeniorLayer) return;
            if (isPwd && !isSenior && !showPwdLayer) return;
            if (isSenior && isPwd && !showSeniorLayer && !showPwdLayer) return;

            const color = (isSenior && isPwd) ? '#e67e22' : isSenior ? '#FED734' : '#27ae60';
            const border = (isSenior && isPwd) ? '#c0560a' : isSenior ? '#c0a000' : '#1a7a3a';
            const label = (isSenior && isPwd) ? 'Senior & PWD' : isSenior ? 'Senior Citizen' : 'PWD';
            const emoji = (isSenior && isPwd) ? '★' : isSenior ? '👴' : '♿';

            const icon = L.divIcon({
                html: `<div style="width:22px;height:22px;transform:rotate(45deg);background:${color};border:2.5px solid ${border};border-radius:4px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3);"><span style="transform:rotate(-45deg);font-size:10px;line-height:1">${emoji}</span></div>`,
                className: '', iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -14]
            });

            const fullName = `${res.lastName || ''}, ${res.firstName || ''}`.replace(/^,\s*/, '');
            const marker = L.marker([lat, lng], { icon, draggable: false });
            marker.bindPopup(`
                <div style="min-width:210px;font-family:Arial,sans-serif;padding:4px 0">
                    <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#1a1a1a">${escapeHtml(fullName) || '—'}</div>
                    <div style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:4px">
                        <span style="background:${color};color:${(isSenior&&!isPwd)?'#5a4200':'white'};padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700">${label}</span>
                        <span style="background:#d4edda;color:#155724;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">✓ Verified</span>
                    </div>
                    <div style="font-size:12px;color:#555;line-height:1.8;border-top:1px solid #f0f0f0;padding-top:6px">
                        <div><i class="bi bi-house-fill" style="color:#2d4a44"></i> <strong style="color:#2d4a44"> Address:</strong> ${escapeHtml(res.address) || '—'}</div>
                        <div><i class="bi bi-person-fill" style="color:#2d4a44"></i> <strong style="color:#2d4a44"> Emergency Contact:</strong> ${escapeHtml(res.emergencyContactName) || '—'} ${res.emergencyContactRelation ? '(' + escapeHtml(res.emergencyContactRelation) + ')' : ''}</div>
                        <div><i class="bi bi-telephone-fill" style="color:#2d4a44"></i> <strong style="color:#2d4a44"> Contact No.:</strong> ${escapeHtml(res.emergencyContactNumber) || '—'}</div>
                    </div>
                </div>`, { maxWidth: 250 });

            marker.addTo(incidentMapInstance);
            residentMarkers.push(marker);
        });
    }

    function toggleResidentLayer(type) {
        if (type === 'senior') showSeniorLayer = !showSeniorLayer;
        else showPwdLayer = !showPwdLayer;
        const btn = document.getElementById('toggle-' + type + '-btn');
        if (btn) btn.style.opacity = (type === 'senior' ? showSeniorLayer : showPwdLayer) ? '1' : '0.45';
        renderResidentMarkers();
    }

    function reportMatchesFilters(report) {
        if (currentTypeFilter !== 'all') {
            if ((report.type || '').toUpperCase() !== currentTypeFilter.toUpperCase()) return false;
        }
        if (mapSearchValue) {
            const haystack = [report.title, report.location, report.reporterName, report.type, report.description].join(' ').toLowerCase();
            if (!haystack.includes(mapSearchValue)) return false;
        }
        return true;
    }

    function renderIncidentMapMarkers() {
        if (!incidentMapInstance) return;

        if (markerClusterGroup) {
            incidentMapInstance.removeLayer(markerClusterGroup);
            markerClusterGroup = null;
        }
        incidentMapMarkers = [];

        const filtered = allReportsData.filter(r => {
            if (!r.latitude || !r.longitude || r.latitude === 0 || r.longitude === 0) return false;
            if (currentMapStatusFilter !== 'all' && r.status !== currentMapStatusFilter) return false;
            return reportMatchesFilters(r);
        });

        document.getElementById('map-visible-count').textContent = filtered.length;
        if (filtered.length === 0) {
            fitToBoundary();
            renderResidentMarkers();
            return;
        }

        markerClusterGroup = L.markerClusterGroup({
            maxClusterRadius: 50,
            iconCreateFunction: function(cluster) {
                const children = cluster.getAllChildMarkers();
                const priorities = children.map(m => (m.options.reportPriority || '').toUpperCase());
                const color = priorities.includes('HIGH') ? '#e74c3c' : priorities.includes('MEDIUM') ? '#e67e22' : '#27ae60';
                const count = cluster.getChildCount();
                return L.divIcon({
                    html: `<div style="position:relative;width:44px;height:44px;"><div style="position:absolute;inset:0;background:${color};opacity:0.22;border-radius:50%;"></div><div style="position:absolute;inset:5px;background:${color};border:2.5px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${count}</div></div>`,
                    className: '', iconSize: [44, 44], iconAnchor: [22, 22]
                });
            }
        });

        filtered.forEach(report => {
            const color = getPriorityColor(report.priority);
            const statusColor = getStatusBadgeColor(report.status);
            const priorityClass = (report.priority || '').toUpperCase() === 'HIGH' ? 'priority-high' : (report.priority || '').toUpperCase() === 'MEDIUM' ? 'priority-medium' : 'priority-low';

            const markerIcon = L.divIcon({
                html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
                className: '', iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -14]
            });

            const imageThumb = report.imageUrl ? `<a href="${report.imageUrl}" target="_blank" style="display:block;margin-bottom:8px;"><img src="${report.imageUrl}" alt="photo" style="width:100%;height:80px;object-fit:cover;border-radius:6px;border:1px solid #e0e0e0;"></a>` : '';

            const marker = L.marker([report.latitude, report.longitude], { icon: markerIcon, reportPriority: report.priority, draggable: false });

            marker.bindPopup(`
                <div style="min-width:210px;font-family:Arial,sans-serif;padding:4px 0;">
                    ${imageThumb}
                    <div style="font-weight:bold;font-size:14px;color:#1a1a1a;margin-bottom:5px;line-height:1.3;">${escapeHtml(report.title) || 'Untitled'}</div>
                    <div style="font-size:12px;color:#555;margin-bottom:5px;"><i class="bi bi-geo-alt-fill" style="color:#e74c3c;"></i> ${escapeHtml(report.location) || 'No location'}</div>
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
                        <span class="badge-priority ${priorityClass}" style="font-size:11px;">${report.priority || 'N/A'}</span>
                        <span style="background:${statusColor};color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${getStatusLabel(report.status)}</span>
                    </div>
                    <div style="font-size:11px;color:#888;margin-bottom:8px;"><i class="bi bi-person"></i> ${escapeHtml(report.reporterName) || 'N/A'} &nbsp;·&nbsp; <i class="bi bi-calendar3"></i> ${report.dateSubmitted || 'N/A'}</div>
                    <button class="view-btn btn-popup-view" data-id="${report.id}" style="font-size:12px;padding:5px 12px;width:100%;"><i class="bi bi-eye"></i> View Report</button>
                </div>
            `, { maxWidth: 260 });

            markerClusterGroup.addLayer(marker);
            incidentMapMarkers.push({ marker });
        });

        if (!heatmapVisible) incidentMapInstance.addLayer(markerClusterGroup);

        const latlngs = filtered.map(r => [r.latitude, r.longitude]);
        incidentMapInstance.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50], maxZoom: 16 });

        renderResidentMarkers();
    }

    // ============================================
    // STATIC EVENT BINDINGS
    // ============================================
    document.getElementById('tabHeaderSafety').addEventListener('click', () => { window.location.href = '/safety-reports'; });
    document.getElementById('tabHeaderEmergency').addEventListener('click', () => { window.location.href = '/emergency-alerts'; });

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) {
                window.location.href = `/safety-reports?tab=${tabName}`;
            }
        });
    });

    document.getElementById('export-pdf-btn').addEventListener('click', exportToPDF);

    // Map Toolbar Buttons
    document.getElementById('fitBoundaryBtn').addEventListener('click', fitToBoundary);
    document.getElementById('heatmap-btn').addEventListener('click', toggleHeatmap);
    document.getElementById('summaryToggleBtn').addEventListener('click', toggleSummaryPanel);
    document.getElementById('closeSummaryBtn').addEventListener('click', toggleSummaryPanel);
    document.getElementById('toggle-senior-btn').addEventListener('click', () => toggleResidentLayer('senior'));
    document.getElementById('toggle-pwd-btn').addEventListener('click', () => toggleResidentLayer('pwd'));
    
    document.querySelectorAll('.map-status-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setMapStatusFilter(this.getAttribute('data-status'));
        });
    });

    // Popup button event delegation for map
    document.getElementById('incidentMap').addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-popup-view')) {
            const id = e.target.getAttribute('data-id');
            viewReport(id);
        }
    });

    // Polling
    function initLastSeenId() {
        let maxId = 0;
        document.querySelectorAll('.panel-inner tbody tr').forEach(row => {
            const viewBtn = row.querySelector('.btn-view-report');
            if (viewBtn) {
                const id = parseInt(viewBtn.getAttribute('data-id'));
                if (id && id > maxId) maxId = id;
            }
        });
        lastSeenId = maxId;
    }

    async function pollReports() {
        if (isAnyModalOpen) return;
        try {
            const response = await fetch('/safety-reports/api/poll?lastId=' + lastSeenId + '&t=' + Date.now());
            if (!response.ok) return;
            const data = await response.json();

            const oldIncoming = document.getElementById('badge-incoming')?.textContent || '0';

            if (data.counts) {
                ['incoming', 'approved', 'inprogress', 'resolved', 'cancelled_rejected'].forEach(function(badge) {
                    var el = document.getElementById('badge-' + badge);
                    if (el) el.textContent = data.counts[badge] || 0;
                });
            }

            const newIncoming = document.getElementById('badge-incoming')?.textContent || '0';

            if (parseInt(newIncoming) > parseInt(oldIncoming) || (data.newReports && data.newReports.length > 0)) {
                window.location.reload();
            }
        } catch (error) {
            console.error("Polling error:", error);
        }
    }

    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(pollReports, 5000);
    }

    // ============================================
    // INIT
    // ============================================
    trackAllModals();
    initLastSeenId();
    startPolling();

    const mapTab = document.getElementById('tab-incidentmap');
    if (mapTab && !mapTab.classList.contains('d-none')) {
        setTimeout(initIncidentMap, 200);
    }

    window.addEventListener('beforeunload', function() {
        if (pollingInterval) clearInterval(pollingInterval);
    });
});