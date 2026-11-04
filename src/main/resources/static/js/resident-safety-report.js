document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // STATE & HELPERS
    // ============================================
    let currentMap = null;
    let currentFilter = 'all';
    let currentSearch = '';
    let lastEtag = '';

    function getStatusBadgeClass(status) {
        const s = (status || 'INCOMING').toUpperCase();
        switch(s) {
            case 'INCOMING': return 'badge-status-incoming';
            case 'APPROVED': return 'badge-status-approved';
            case 'IN_PROGRESS': return 'badge-status-inprogress';
            case 'RESOLVED': return 'badge-status-resolved';
            case 'ARCHIVED': return 'badge-status-archived';
            default: return 'badge-status-incoming';
        }
    }

    function getPriorityClass(priority) {
        const p = (priority || 'MEDIUM').toUpperCase();
        switch(p) {
            case 'HIGH': return 'priority-high';
            case 'MEDIUM': return 'priority-medium';
            case 'LOW': return 'priority-low';
            default: return 'priority-medium';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ============================================
    // MODAL LOGIC
    // ============================================
    const overlay = document.getElementById('overlay');
    const btnCloseModal = document.getElementById('btnCloseModal');

    function openReportModal(reportId) {
        const card = document.getElementById('report-' + reportId);
        if (!card) return;

        const title = card.dataset.title || 'Untitled Report';
        const description = card.dataset.description || 'No description provided.';
        const date = card.dataset.date || '';
        const location = card.dataset.location || 'No location specified';
        const reporter = card.dataset.reporter || 'Anonymous Resident';
        const status = (card.dataset.status || 'INCOMING').toUpperCase();
        const priority = (card.dataset.priority || 'MEDIUM').toUpperCase();
        const type = card.dataset.type || 'General Safety';
        const latitude = parseFloat(card.dataset.latitude);
        const longitude = parseFloat(card.dataset.longitude);
        const resolvedBy = card.dataset.resolvedby || null;
        const resolutionActions = card.dataset.resolutionactions || null;
        const resolutionNotes = card.dataset.resolutionnotes || null;
        const responseTime = card.dataset.responsetime || null;
        const imageUrl = card.dataset.imageurl || null;

        let dateFormatted = 'N/A';
        if (date) {
            try {
                dateFormatted = new Date(date).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric'
                });
            } catch(e) { dateFormatted = date; }
        }

        const statusBadgeClass = getStatusBadgeClass(status);
        const priorityClass = getPriorityClass(priority);

        let resolutionHtml = '';
        if (status === 'RESOLVED' && (resolutionActions || resolutionNotes || responseTime)) {
            resolutionHtml = `
                <div style="background: #f8faf9; border-radius: 8px; padding: 14px; margin: 12px 16px;">
                    <div style="font-weight: 700; color: var(--brand-dark); margin-bottom: 10px; font-size: 13px;">
                        <i class="bi bi-check-circle-fill" style="color: #44C375;"></i> Resolution Details
                    </div>
                    ${responseTime ? `<div style="margin-bottom: 8px;"><span style="font-weight: 600; font-size: 11px; color: #888;">RESPONSE TIME</span><br><span style="font-size: 13px;">${escapeHtml(responseTime)}</span></div>` : ''}
                    ${resolutionActions ? `<div style="margin-bottom: 8px;"><span style="font-weight: 600; font-size: 11px; color: #888;">ACTIONS TAKEN</span><br><span style="font-size: 13px;">${escapeHtml(resolutionActions)}</span></div>` : ''}
                    ${resolutionNotes ? `<div><span style="font-weight: 600; font-size: 11px; color: #888;">ADDITIONAL NOTES</span><br><span style="font-size: 13px;">${escapeHtml(resolutionNotes)}</span></div>` : ''}
                    ${resolvedBy ? `<div style="margin-top: 8px; font-size: 11px; color: #888;"><i class="bi bi-person-check"></i> Resolved by: ${escapeHtml(resolvedBy)}</div>` : ''}
                </div>
            `;
        }

        let mapHtml = '';
        const hasValidLocation = latitude && longitude && !isNaN(latitude) && !isNaN(longitude) && latitude !== 0 && longitude !== 0;
        if (hasValidLocation) {
            mapHtml = `<div id="modalMap" class="m-map"></div>`;
        }

        let photoHtml = '';
        if (imageUrl) {
            photoHtml = `
                <div class="m-photo">
                    <div class="m-photo-label"><i class="bi bi-camera-fill"></i> Photo Evidence</div>
                    <a href="${imageUrl}" target="_blank">
                        <img src="${imageUrl}" alt="Report photo"
                             onerror="this.closest('.m-photo').style.display='none'">
                    </a>
                </div>
            `;
        }

        document.getElementById('modalContent').innerHTML = `
            <div class="m-head">
                <div class="avatar" style="background:var(--brand-dark);color:var(--gold);">
                    <i class="bi bi-exclamation-triangle-fill"></i>
                </div>
                <div class="head-meta">
                    <div class="sender">${escapeHtml(reporter)}</div>
                    <div class="post-dt">${escapeHtml(dateFormatted)}</div>
                </div>
                <span class="badge ${statusBadgeClass}">${escapeHtml(status)}</span>
            </div>
            <div class="m-title">${escapeHtml(title)}</div>
            <div class="m-location">
                <i class="bi bi-geo-alt-fill" style="color:#e74c3c;"></i>
                <span>${escapeHtml(location)}</span>
                <span class="badge ${priorityClass}" style="margin-left: auto;">${escapeHtml(priority)}</span>
            </div>
            <div class="m-body"><strong>Type:</strong> ${escapeHtml(type)}<br><br>${escapeHtml(description)}</div>
            ${photoHtml}
            ${mapHtml}
            ${resolutionHtml}
            <div class="m-foot">
                <div class="m-foot-left">
                    <i class="bi bi-info-circle"></i> Official Barangay Safety Report
                </div>
                <button class="btn-close-m" id="btnCloseModalFooter">Close</button>
            </div>
        `;

        document.getElementById('btnCloseModalFooter').addEventListener('click', closeModal);
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';

        if (hasValidLocation) {
            setTimeout(() => {
                if (currentMap) currentMap.remove();
                const mapContainer = document.getElementById('modalMap');
                if (mapContainer) {
                    const map = L.map('modalMap').setView([latitude, longitude], 15);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(map);
                    const redIcon = L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    });
                    L.marker([latitude, longitude], { icon: redIcon })
                        .addTo(map)
                        .bindPopup(`<b>${escapeHtml(title)}</b><br>${escapeHtml(location)}`)
                        .openPopup();
                    map.invalidateSize();
                    currentMap = map;
                }
            }, 100);
        }
    }

    function closeModal() {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
        if (currentMap) {
            currentMap.remove();
            currentMap = null;
        }
    }

    btnCloseModal.addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
    });

    // ============================================
    // FILTERS & SEARCH
    // ============================================
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            applyFilters();
        });
    });

    document.getElementById('searchInput').addEventListener('input', function() {
        currentSearch = this.value.toLowerCase().trim();
        applyFilters();
    });

    function applyFilters() {
        const cards = document.querySelectorAll('#feed .card');
        let anyVisible = false;

        cards.forEach(card => {
            const status = (card.dataset.status || 'INCOMING').toUpperCase();
            const reporterId = card.dataset.reporterid || '';
            const isMine = CURRENT_RESIDENT_ID && reporterId === CURRENT_RESIDENT_ID;
            const text = ((card.dataset.title || '') + ' ' + (card.dataset.type || '') + ' ' + (card.dataset.location || '')).toLowerCase();

            let matchesFilter = true;
            if (currentFilter === 'incoming') {
                matchesFilter = status === 'INCOMING';
            } else if (currentFilter === 'approved') {
                matchesFilter = status === 'APPROVED';
            } else if (currentFilter === 'inprogress') {
                matchesFilter = status === 'IN_PROGRESS';
            } else if (currentFilter === 'resolved') {
                matchesFilter = status === 'RESOLVED';
            } else if (currentFilter === 'mine') {
                matchesFilter = isMine;
            } else {
                matchesFilter = true;
            }

            const matchesSearch = !currentSearch || text.includes(currentSearch);
            const show = matchesFilter && matchesSearch;
            card.style.display = show ? '' : 'none';
            if (show) anyVisible = true;
        });

        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.style.display = anyVisible ? 'none' : 'block';
    }

    // ============================================
    // EVENT DELEGATION
    // ============================================
    document.getElementById('feed').addEventListener('click', function(e) {
        const btn = e.target.closest('.btn-open-report');
        if (btn) {
            const reportId = btn.getAttribute('data-report-id');
            openReportModal(reportId);
        }
    });

    // ============================================
    // POLLING
    // ============================================
    async function pollReports() {
        try {
            const res = await fetch('/resident/safety-reports/api/feed?t=' + Date.now());
            if (!res.ok) return;
            const data = await res.json();
            const etag = JSON.stringify(data.map(r => r.id + ':' + r.status + ':' + r.dateSubmitted));
            if (etag === lastEtag) return;
            lastEtag = etag;
            rebuildFeed(data);
        } catch(e) { /* silent */ }
    }

    function rebuildFeed(reports) {
        document.querySelectorAll('#feed .card:not(.empty)').forEach(c => c.remove());
        const feed = document.getElementById('feed');
        const emptyState = document.getElementById('emptyState');
        reports.forEach(r => feed.insertBefore(buildCard(r), emptyState));
        applyFilters();
    }

    function buildCard(r) {
        const status = (r.status || 'INCOMING').toUpperCase();
        const priority = (r.priority || 'MEDIUM').toUpperCase();
        const priorityClass = priority === 'HIGH' ? 'priority-high' : priority === 'MEDIUM' ? 'priority-medium' : 'priority-low';
        const statusClass = 'badge-status-' + status.toLowerCase();
        const desc = r.description || '';
        const clamp = desc.length > 200;

        let dateStr = 'N/A';
        if (r.dateSubmitted) {
            try {
                dateStr = new Date(r.dateSubmitted).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
            } catch(e) {}
        }

        const article = document.createElement('article');
        article.id = 'report-' + r.id;
        article.className = 'card';
        article.dataset.id = r.id;
        article.dataset.reporterid = r.reporterId || '';
        article.dataset.status = status;
        article.dataset.type = r.type || '';
        article.dataset.title = r.title || '';
        article.dataset.description = desc;
        article.dataset.date = r.dateSubmitted || '';
        article.dataset.location = r.location || '';
        article.dataset.latitude = r.latitude || '';
        article.dataset.longitude = r.longitude || '';
        article.dataset.reporter = r.reporterName || '';
        article.dataset.priority = priority;
        article.dataset.resolvedby = r.resolvedBy || '';
        article.dataset.resolutionactions = r.resolutionActions || '';
        article.dataset.resolutionnotes = r.resolutionNotes || '';
        article.dataset.responsetime = r.resolutionResponseTime || '';
        article.dataset.imageurl = r.imageUrl || '';

        article.innerHTML = `
            <div class="card-head">
                <div class="avatar"><i class="bi bi-exclamation-triangle-fill"></i></div>
                <div class="head-meta">
                    <div class="sender">${escapeHtml(r.reporterName || 'Anonymous Resident')}</div>
                    <div class="post-dt">${escapeHtml(dateStr)}</div>
                </div>
                <span class="badge ${statusClass}">${escapeHtml(status)}</span>
            </div>
            <div class="card-title">${escapeHtml(r.title || 'Untitled Report')}</div>
            ${desc ? `<div class="card-body${clamp ? ' clamped' : ''}">${escapeHtml(desc)}</div>` : ''}
            ${clamp ? `<button class="read-more btn-open-report" data-report-id="${r.id}">Read more…</button>` : ''}
            <div class="card-foot">
                <div class="foot-left">
                    <span class="location-text"><i class="bi bi-geo-alt-fill" style="color:#e74c3c;"></i> ${escapeHtml(r.location || 'No location')}</span>
                    <span class="badge ${priorityClass}">${escapeHtml(priority)}</span>
                    ${status === 'RESOLVED' ? `<span class="resolved-badge"><i class="bi bi-check-circle-fill"></i> Resolved</span>` : ''}
                    ${r.imageUrl ? `<span class="photo-indicator"><i class="bi bi-camera-fill"></i> Photo</span>` : ''}
                </div>
                <button class="view-btn btn-open-report" data-report-id="${r.id}">
                    View details <i class="bi bi-arrow-right-short"></i>
                </button>
            </div>
        `;
        return article;
    }

    setInterval(pollReports, 5000);
});