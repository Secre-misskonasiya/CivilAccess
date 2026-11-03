document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // SUPABASE SETUP
    // ============================================
    const SUPABASE_URL = 'https://upfrofppponiqffbssqb.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_tZyxrTJrpd_OD5-TKUkT8Q__DnuY0tj';
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let allRequests = [];
    let currentTab = 'active';

    // ============================================
    // HELPERS
    // ============================================
    function getStatusStyles(status) {
        const s = (status || 'INCOMING').toUpperCase();
        switch (s) {
            case 'READY': return { color: '#4CAF50', label: 'READY FOR PICKUP', icon: 'bi-check-circle-fill' };
            case 'APPROVED': return { color: '#4CAF50', label: 'APPROVED', icon: 'bi-check-circle-fill' };
            case 'RESOLVED':
            case 'COMPLETED': return { color: '#2196F3', label: 'COMPLETED', icon: 'bi-check-circle' };
            case 'REJECTED':
            case 'CANCELLED': return { color: '#C62828', label: s, icon: 'bi-x-circle-fill' };
            case 'PROCESSING': return { color: '#FF9800', label: 'PROCESSING', icon: 'bi-clock-history' };
            case 'IN_PROGRESS': return { color: '#FF9800', label: 'IN PROGRESS', icon: 'bi-clock-history' };
            case 'RETURNED': return { color: '#2196F3', label: 'RETURNED', icon: 'bi-arrow-return-left' };
            case 'OVERDUE': return { color: '#C62828', label: 'OVERDUE', icon: 'bi-exclamation-triangle-fill' };
            case 'RENTED': return { color: '#9C27B0', label: 'RENTED', icon: 'bi-box-seam' };
            case 'INCOMING':
            case 'PENDING': return { color: '#FF9800', label: 'PENDING', icon: 'bi-clock' };
            default: return { color: '#2bb6f7', label: s || 'PROCESSING', icon: 'bi-info-circle' };
        }
    }

    function getItemTab(status) {
        const s = (status || 'INCOMING').toUpperCase();
        if (s === 'READY') return 'ready';
        if (['RESOLVED','APPROVED','COMPLETED','REJECTED','CANCELLED','CLOSED','ARCHIVE','RETURNED'].includes(s)) return 'history';
        return 'active';
    }

    function getSourceLabel(src) {
        if (src === 'document_requests') return 'Document Request';
        if (src === 'reservations') return 'Court Reservation';
        if (src === 'rentals') return 'Equipment Rental';
        return 'Request';
    }

    function getSourceColor(src) {
        if (src === 'document_requests') return '#386660';
        if (src === 'reservations') return '#1565C0';
        if (src === 'rentals') return '#6A1B9A';
        return '#386660';
    }

    function getSourceIcon(src) {
        if (src === 'document_requests') return 'bi-file-text';
        if (src === 'reservations') return 'bi-calendar-check';
        if (src === 'rentals') return 'bi-box-seam';
        return 'bi-file-text';
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-PH', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    function formatTime12h(t) {
        if (!t) return 'N/A';
        const [h, m] = t.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2, '0')} ${period}`;
    }

    function formatTimeRange(from, to) {
        if (!from || !to) return 'N/A';
        return `${formatTime12h(from)} – ${formatTime12h(to)}`;
    }

    function daysBetween(start, end) {
        if (!start || !end) return 0;
        const sd = new Date(start), ed = new Date(end);
        if (isNaN(sd) || isNaN(ed) || ed < sd) return 0;
        return Math.round((ed - sd) / (1000 * 60 * 60 * 24)) + 1;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ============================================
    // MODAL RENDERERS
    // ============================================
    function showDocumentDetails(request) {
        const status = getStatusStyles(request.status);
        const showEmergency = request.document_type === 'Barangay ID';
        const showReadiedDoc = request.status === 'READY' || request.status === 'RESOLVED';

        let emergencyHtml = '';
        if (showEmergency) {
            emergencyHtml = `
                <div class="detail-section">
                    <div class="section-title">
                        <i class="bi bi-heart-pulse"></i>
                        <span>Emergency Contact</span>
                    </div>
                    <div class="info-grid">
                        <div class="info-row">
                            <span class="info-label">Emergency Name</span>
                            <span class="info-value">${escapeHtml(request.emergency_name || 'Not specified')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Emergency Address</span>
                            <span class="info-value">${escapeHtml(request.emergency_address || 'Not specified')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Emergency Contact</span>
                            <span class="info-value">${escapeHtml(request.emergency_contact || 'Not specified')}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        let attachmentsHtml = '';
        if (request.valid_id_url) {
            attachmentsHtml += `
                <div class="image-preview" data-img-url="${escapeHtml(request.valid_id_url)}">
                    <span class="image-hint"><i class="bi bi-card-id"></i> Valid ID</span>
                    <img src="${request.valid_id_url}" alt="Valid ID">
                </div>
            `;
        }
        if (request.residency_proof_url) {
            attachmentsHtml += `
                <div class="image-preview" data-img-url="${escapeHtml(request.residency_proof_url)}">
                    <span class="image-hint"><i class="bi bi-house-door"></i> Proof of Residency</span>
                    <img src="${request.residency_proof_url}" alt="Proof of Residency">
                </div>
            `;
        }
        const imgUrl2x2 = request['2x2_url'] || request.twox2_url;
        if (imgUrl2x2) {
            attachmentsHtml += `
                <div class="image-preview" data-img-url="${escapeHtml(imgUrl2x2)}">
                    <span class="image-hint"><i class="bi bi-person-badge"></i> 1x1 Image</span>
                    <img src="${imgUrl2x2}" alt="1x1 Image">
                </div>
            `;
        }
        if (showReadiedDoc && request.readied_document) {
            attachmentsHtml += `
                <div class="image-preview" data-img-url="${escapeHtml(request.readied_document)}">
                    <span class="image-hint"><i class="bi bi-file-check-fill" style="color:#4CAF50;"></i> Ready Document</span>
                    <img src="${request.readied_document}" alt="Ready Document" style="border:2px solid #4CAF50;">
                </div>
            `;
        }

        if (!attachmentsHtml) {
            attachmentsHtml = '<div style="text-align:center; padding:20px; color:#999;"><i class="bi bi-image"></i><br>No attachments</div>';
        }

        const html = `
            <div class="status-banner" style="background:${status.color}20;">
                <i class="bi ${status.icon}" style="color:${status.color}; font-size:24px;"></i>
                <span style="color:${status.color};">${status.label}</span>
            </div>

            <div class="detail-section">
                <div class="section-title">
                    <i class="bi bi-file-text"></i>
                    <span>Request Details</span>
                </div>
                <div class="info-grid">
                    <div class="info-row">
                        <span class="info-label">Document Type</span>
                        <span class="info-value">${escapeHtml(request.document_type)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Full Name</span>
                        <span class="info-value">${escapeHtml(request.full_name)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Contact Number</span>
                        <span class="info-value">${escapeHtml(request.contact_number || 'N/A')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Address</span>
                        <span class="info-value">${escapeHtml(request.address || 'N/A')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Purpose</span>
                        <span class="info-value">${escapeHtml(request.purpose || request.purpose_of_request || 'Not specified')}</span>
                    </div>
                </div>
            </div>

            ${emergencyHtml}

            <div class="detail-section">
                <div class="section-title">
                    <i class="bi bi-paperclip"></i>
                    <span>Attachments</span>
                </div>
                ${attachmentsHtml}
            </div>

            <div class="detail-section">
                <div class="section-title">
                    <i class="bi bi-chat-text"></i>
                    <span>Admin Remarks</span>
                </div>
                <div class="info-value" style="font-style:italic;">${escapeHtml(request.admin_notes || 'Your request is being reviewed by the office.')}</div>
            </div>

            <div class="ref-id">
                <i class="bi bi-hash"></i> Reference: #${String(request.id).padStart(6, '0')}<br>
                <i class="bi bi-calendar"></i> Submitted: ${formatDate(request.date_submitted || request.created_at)}
            </div>
        `;

        document.getElementById('modalTitle').textContent = 'Document Request Details';
        document.getElementById('modalBody').innerHTML = html;
        document.getElementById('detailModal').classList.add('show');
        
        // Attach image click handlers
        document.querySelectorAll('#modalBody .image-preview').forEach(el => {
            el.addEventListener('click', function() {
                const url = this.getAttribute('data-img-url');
                if (url) window.open(url, '_blank');
            });
        });
    }

    function showReservationDetails(reservation) {
        const status = getStatusStyles(reservation.status);

        const html = `
            <div class="status-banner" style="background:${status.color}20;">
                <i class="bi ${status.icon}" style="color:${status.color}; font-size:24px;"></i>
                <span style="color:${status.color};">${status.label}</span>
            </div>

            <div class="detail-section">
                <div class="section-title">
                    <i class="bi bi-calendar-check"></i>
                    <span>Schedule</span>
                </div>
                <div class="info-grid">
                    <div class="info-row">
                        <span class="info-label">Court / Venue</span>
                        <span class="info-value">${escapeHtml(reservation.court)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Date</span>
                        <span class="info-value">${formatDate(reservation.date)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Time Slot</span>
                        <span class="info-value">${formatTimeRange(reservation.time_from, reservation.time_to)}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="section-title">
                    <i class="bi bi-person"></i>
                    <span>Reservation Info</span>
                </div>
                <div class="info-grid">
                    <div class="info-row">
                        <span class="info-label">Reserved By</span>
                        <span class="info-value">${escapeHtml(reservation.full_name)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Purpose</span>
                        <span class="info-value">${escapeHtml(reservation.purpose)}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="section-title">
                    <i class="bi bi-chat-text"></i>
                    <span>Admin Remarks</span>
                </div>
                <div class="info-value" style="font-style:italic;">${escapeHtml(reservation.admin_notes || 'Your reservation is pending review.')}</div>
            </div>

            <div class="ref-id">
                <i class="bi bi-hash"></i> Reference: #${String(reservation.id).padStart(6, '0')}<br>
                <i class="bi bi-calendar"></i> Submitted: ${formatDate(reservation.created_at)}
            </div>
        `;

        document.getElementById('modalTitle').textContent = 'Reservation Details';
        document.getElementById('modalBody').innerHTML = html;
        document.getElementById('detailModal').classList.add('show');
    }

    function showRentalDetails(rental) {
        const status = getStatusStyles(rental.status);
        const days = daysBetween(rental.rental_date, rental.expected_return_date);
        const total = rental.total_price || 0;

        const paymentStatusHtml = rental.payment_status ? `
            <div class="payment-badge" style="background:${rental.payment_status === 'PAID' ? '#C8E6C9' : '#FFF9C4'}">
                <i class="bi ${rental.payment_status === 'PAID' ? 'bi-check-circle-fill' : 'bi-clock'}"></i>
                <span>${rental.payment_status}</span>
            </div>
        ` : '';

        const actualReturnHtml = rental.actual_return_date ? `
            <div class="info-row">
                <span class="info-label">Actual Return</span>
                <span class="info-value">${formatDate(rental.actual_return_date)}</span>
            </div>
        ` : '';

        const html = `
            <div class="status-banner" style="background:${status.color}20;">
                <i class="bi ${status.icon}" style="color:${status.color}; font-size:24px;"></i>
                <span style="color:${status.color};">${status.label}</span>
            </div>

            <div class="detail-section">
                <div class="section-title">
                    <i class="bi bi-box-seam"></i>
                    <span>Equipment Details</span>
                </div>
                <div class="info-grid">
                    <div class="info-row">
                        <span class="info-label">Equipment Type</span>
                        <span class="info-value">${escapeHtml(rental.equipment_type)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Quantity</span>
                        <span class="info-value">${rental.quantity || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Unit Price</span>
                        <span class="info-value">₱${(((rental.total_price/days)/rental.quantity ) || 0).toLocaleString()}/day</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="section-title">
                    <i class="bi bi-calendar-range"></i>
                    <span>Rental Period</span>
                </div>
                <div class="info-grid">
                    <div class="info-row">
                        <span class="info-label">Rental Date</span>
                        <span class="info-value">${formatDate(rental.rental_date)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Expected Return</span>
                        <span class="info-value">${formatDate(rental.expected_return_date)}</span>
                    </div>
                    ${actualReturnHtml}
                    <div class="info-row">
                        <span class="info-label">Duration</span>
                        <span class="info-value">${days} day${days !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="section-title">
                    <i class="bi bi-cash-stack"></i>
                    <span>Payment Summary</span>
                </div>
                <div class="info-grid">
                    <div class="info-row">
                        <span class="info-label">Renter Name</span>
                        <span class="info-value">${escapeHtml(rental.renter_name)}</span>
                    </div>
                </div>
                <div class="total-box">
                    <span class="total-label">Total Amount</span>
                    <span class="total-amount">₱${total.toLocaleString()}.00</span>
                </div>
                ${paymentStatusHtml}
            </div>

            <div class="detail-section">
                <div class="section-title">
                    <i class="bi bi-chat-text"></i>
                    <span>Admin Remarks</span>
                </div>
                <div class="info-value" style="font-style:italic;">${escapeHtml(rental.admin_notes || 'Your rental request is being processed.')}</div>
            </div>

            <div class="ref-id">
                <i class="bi bi-hash"></i> Reference: #${String(rental.id).padStart(6, '0')}<br>
                <i class="bi bi-calendar"></i> Submitted: ${formatDate(rental.created_at)}
            </div>
        `;

        document.getElementById('modalTitle').textContent = 'Rental Details';
        document.getElementById('modalBody').innerHTML = html;
        document.getElementById('detailModal').classList.add('show');
    }

    function showDetails(id, source) {
        const item = allRequests.find(r => r.id === id && r.table_source === source);
        if (!item) return;
        
        if (source === 'document_requests') showDocumentDetails(item);
        else if (source === 'reservations') showReservationDetails(item);
        else if (source === 'rentals') showRentalDetails(item);
    }

    function closeModal() {
        document.getElementById('detailModal').classList.remove('show');
    }

    // ============================================
    // DATA FETCHING & RENDERING
    // ============================================
    async function fetchAllRequests() {
        try {
            const { data: { user } } = await sb.auth.getUser();
            if (!user) return;

            const [docRes, resRes, renRes] = await Promise.all([
                sb.from('document_requests').select('*').eq('resident_id', user.id),
                sb.from('reservations').select('*').eq('resident_id', user.id),
                sb.from('rentals').select('*').eq('resident_id', user.id),
            ]);

            const docs = (docRes.data || []).map(d => ({
                ...d,
                table_source: 'document_requests',
                display_name: d.document_type || 'Document Request',
                display_detail: d.purpose_of_request || d.purpose || '',
                display_meta: d.address || '',
                status: d.status || 'INCOMING',
                date_submitted: d.date_submitted || d.created_at,
            }));

            const reservations = (resRes.data || []).map(r => ({
                ...r,
                table_source: 'reservations',
                display_name: r.court || 'Court Reservation',
                display_detail: r.purpose || '',
                display_meta: r.date ? `${r.date}${r.time_from && r.time_to ? ' • ' + formatTimeRange(r.time_from, r.time_to) : ''}` : '',
                status: r.status || 'INCOMING',
                date_submitted: r.created_at,
            }));

            const rentals = (renRes.data || []).map(r => ({
                ...r,
                table_source: 'rentals',
                display_name: r.equipment_type || 'Equipment Rental',
                display_detail: r.quantity ? `Qty: ${r.quantity}` : '',
                display_meta: r.rental_date ? `Rental: ${r.rental_date}` : '',
                status: r.status || 'INCOMING',
                date_submitted: r.created_at,
            }));

            allRequests = [...docs, ...reservations, ...rentals]
                .sort((a, b) => new Date(b.date_submitted) - new Date(a.date_submitted));

            updateBadge();
            render();
        } catch (err) {
            console.error('Fetch error:', err);
        }
    }

    function updateBadge() {
        const count = allRequests.filter(r => getItemTab(r.status) === 'ready').length;
        const el = document.getElementById('readyBadge');
        el.textContent = count;
        el.classList.toggle('visible', count > 0);
    }

    function render() {
        const wrap = document.getElementById('requestsWrap');
        const filtered = allRequests.filter(r => getItemTab(r.status) === currentTab);

        if (filtered.length === 0) {
            const icon = currentTab === 'history' ? 'bi-clipboard-data'
                       : currentTab === 'ready' ? 'bi-check-circle'
                       : 'bi-tray';
            const sub = currentTab === 'active' ? 'Tap a button above to submit a request'
                       : currentTab === 'ready' ? 'Items ready for pickup will appear here'
                       : 'Completed requests will appear here';
            wrap.innerHTML = `
                <div class="empty-state">
                    <i class="bi ${icon}"></i>
                    <p>No ${currentTab} requests found</p>
                    <span>${sub}</span>
                </div>`;
            return;
        }

        wrap.innerHTML = filtered.map(item => {
            const status = getStatusStyles(item.status);
            const color = getSourceColor(item.table_source);
            const icon = getSourceIcon(item.table_source);
            const sourceLabel = getSourceLabel(item.table_source);
            const dateStr = item.date_submitted ? new Date(item.date_submitted).toLocaleDateString() : 'No date';
            const ref = 'Ref: ' + (item.id?.toString().substring(0, 8).toUpperCase() || 'N/A');

            return `
                <div class="request-card" data-id="${item.id}" data-source="${item.table_source}">
                    <div class="card-accent" style="background:${color};"></div>
                    <div class="card-body-wrap">
                        <div class="card-header">
                            <div class="left-header">
                                <div class="avatar" style="background:${color}18;">
                                    <i class="bi ${icon}" style="color:${color};"></i>
                                </div>
                                <div class="header-info">
                                    <div class="request-title">${escapeHtml(item.display_name)}</div>
                                    <div class="post-meta">
                                        <span class="source-label" style="color:${color};">${sourceLabel}</span>
                                        <span class="date-text">&nbsp;•&nbsp;${dateStr}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="status-badge" style="background:${status.color};">${status.label}</div>
                        </div>
                        <div class="card-footer">${ref}</div>
                    </div>
                </div>`;
        }).join('');
    }

    function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        render();
    }

    // ============================================
    // EVENT BINDINGS
    // ============================================
    
    // Static buttons
    document.getElementById('btnGoDocuments').addEventListener('click', () => { window.location.href = '/resident/documents/new'; });
    document.getElementById('btnGoReserve').addEventListener('click', () => { window.location.href = '/resident/reservations/new'; });
    document.getElementById('btnGoRent').addEventListener('click', () => { window.location.href = '/resident/rentals/new'; });
    
    // Modal close
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('detailModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) switchTab(tabName);
        });
    });

    // Delegation for dynamically generated cards
    document.getElementById('requestsWrap').addEventListener('click', function(e) {
        const card = e.target.closest('.request-card');
        if (card) {
            const id = card.getAttribute('data-id');
            const source = card.getAttribute('data-source');
            showDetails(id, source);
        }
    });

    // ============================================
    // INIT
    // ============================================
    fetchAllRequests();
    setInterval(fetchAllRequests, 5000);
});