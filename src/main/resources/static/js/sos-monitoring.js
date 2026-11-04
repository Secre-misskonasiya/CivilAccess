document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // HELPERS & MODALS
    // ============================================
    function showSuccess(message) {
        document.getElementById('successMessage').innerHTML = message;
        const successModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('successModal'));
        successModal.show();
    }

    function showConfirm(message, title, onConfirm) {
        document.querySelectorAll('[id^="dynamicConfirmModal_"]').forEach(oldModalEl => {
            const oldInstance = bootstrap.Modal.getInstance(oldModalEl);
            if (oldInstance) {
                oldModalEl.addEventListener('hidden.bs.modal', () => oldModalEl.remove(), { once: true });
                oldInstance.hide();
            } else {
                oldModalEl.remove();
            }
        });

        const confirmModalId = 'dynamicConfirmModal_' + Date.now();
        const confirmModalHtml = `
            <div id="${confirmModalId}" class="modal fade" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content" style="border-radius: 16px;">
                        <div class="modal-header" style="background: linear-gradient(135deg, #30534D, #3d6b63);">
                            <h5 class="modal-title" style="color: white;">${title}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" style="padding: 24px; font-size: 16px;">
                            ${message}
                        </div>
                        <div class="modal-footer" style="border-top: none; padding: 16px 24px;">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="confirmOkBtn_${confirmModalId}" style="background-color: #44C375; border-color: #44C375;">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', confirmModalHtml);
        const modalEl = document.getElementById(confirmModalId);
        const modal = new bootstrap.Modal(modalEl);

        let confirmed = false;
        const confirmBtn = document.getElementById(`confirmOkBtn_${confirmModalId}`);
        confirmBtn.onclick = () => { confirmed = true; modal.hide(); };

        modalEl.addEventListener('hidden.bs.modal', () => {
            modalEl.remove();
            if (confirmed) onConfirm();
        }, { once: true });

        modal.show();
    }

    function getCsrfHeaders() {
        const token = document.querySelector('meta[name="_csrf"]')?.content;
        const header = document.querySelector('meta[name="_csrf_header"]')?.content;
        return (token && header) ? { [header]: token } : {};
    }

    function adjustBadge(tab, delta) {
        const idMap = {
            incoming:   'badge-incoming',
            processing: 'badge-processing',
            resolved:   'badge-resolved',
            archive:    'badge-archive',
            cancelled:  'badge-cancelled'
        };
        const badge = idMap[tab] && document.getElementById(idMap[tab]);
        if (!badge) return;
        const count = parseInt(badge.textContent) || 0;
        badge.textContent = Math.max(0, count + delta);
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function getStatusColor(status) {
        switch (status?.toUpperCase()) {
            case 'INCOMING': return '#e67e22';
            case 'PROCESSING': return '#2471a3';
            case 'RESOLVED': return '#27ae60';
            case 'CANCELLED': return '#c0392b';
            case 'ARCHIVED': return '#888';
            default: return '#888';
        }
    }

    // ============================================
    // UPDATE STATUS
    // ============================================
    window.updateStatusWithConfirm = function(id, status) {
        let title = '';
        let message = '';

        switch (status) {
            case 'PROCESSING':
                title = 'Confirm Process';
                message = 'Are you sure you want to mark this SoS alert as Processing?';
                break;
            case 'RESOLVED':
                title = 'Confirm Resolve';
                message = 'Are you sure you want to mark this SoS alert as Resolved?';
                break;
            case 'ARCHIVED':
                title = 'Confirm Archive';
                message = 'Are you sure you want to archive this SoS alert?';
                break;
            case 'INCOMING':
                title = 'Confirm Restore';
                message = 'Are you sure you want to restore this SoS alert back to Incoming?';
                break;
            default:
                title = 'Confirm Update';
                message = 'Are you sure you want to update this SoS alert?';
        }

        showConfirm(message, title, () => {
            const responderName = document.getElementById('currentUserName')?.value?.trim() || 'Barangay Responder';

            let url = '/sos-monitoring/' + id + '/status?status=' + status;
            if (status === 'PROCESSING') url += '&responderName=' + encodeURIComponent(responderName);

            fetch(url, { method: 'PUT', headers: getCsrfHeaders() })
                .then(r => {
                    if (!r.ok) {
                        alert('Error updating status');
                        return;
                    }

                    const successMsg = {
                        PROCESSING: 'SoS alert moved to Processing!',
                        RESOLVED:   'SoS alert marked as Resolved!',
                        ARCHIVED:   'SoS alert archived successfully!',
                        INCOMING:   'SoS alert restored to Incoming!'
                    }[status] || 'Status updated successfully!';
                    showSuccess(successMsg);

                    const row = document.querySelector(`[data-id="${id}"]`);
                    const tbody = row ? row.parentElement : null;
                    if (row) row.remove();

                    const activeTab = document.querySelector('.tab.active');
                    const sourceTab = activeTab?.dataset.tab;
                    adjustBadge(sourceTab, -1);
                    if (status === 'PROCESSING') adjustBadge('processing', 1);
                    if (status === 'INCOMING')   adjustBadge('incoming', 1);
                    if (status === 'RESOLVED')   adjustBadge('resolved', 1);
                    if (status === 'ARCHIVED')   adjustBadge('archive', 1);

                    if (tbody && tbody.children.length === 0) {
                        const emptyDiv = document.querySelector(`#${tbody.id}-empty`);
                        if (emptyDiv) emptyDiv.style.display = 'block';
                    }
                    applyFilters();
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Network error occurred');
                });
        });
    };

    // ============================================
    // AUDIO
    // ============================================
    let _actx = null;
    function getAudioCtx() {
        if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
        return _actx;
    }
    ['click','keydown','touchstart','mousedown'].forEach(e =>
        document.addEventListener(e, () => { const c = getAudioCtx(); if (c.state === 'suspended') c.resume(); }, { passive: true })
    );

    function playSiren() {
        const _actx = getAudioCtx();
        _actx.resume().then(() => {
            const now = _actx.currentTime;
            const totalDur = 5.0;
            const cycleDur = 1.5;
            const toneDur = 1.0;
            const freqA = 853;
            const freqB = 960;
            const master = _actx.createGain();
            master.connect(_actx.destination);
            const oscA = _actx.createOscillator();
            const oscB = _actx.createOscillator();
            oscA.type = 'sine';
            oscB.type = 'sine';
            oscA.frequency.setValueAtTime(freqA, now);
            oscB.frequency.setValueAtTime(freqB, now);
            master.gain.setValueAtTime(0.0001, now);
            for (let i = 0; i < totalDur / cycleDur; i++) {
                const tStart = now + (i * cycleDur);
                const tEnd = tStart + toneDur;
                master.gain.exponentialRampToValueAtTime(0.5, tStart + 0.02);
                master.gain.setValueAtTime(0.5, tEnd - 0.05);
                master.gain.exponentialRampToValueAtTime(0.0001, tEnd);
            }
            oscA.connect(master);
            oscB.connect(master);
            oscA.start(now);
            oscB.start(now);
            oscA.stop(now + totalDur);
            oscB.stop(now + totalDur);
        });
    }

    let _toastTimer = null;
    function showToast(msg) {
        const t = document.getElementById('sos-toast');
        t.textContent = msg;
        t.style.display = 'block';
        t.style.animation = 'none';
        void t.offsetWidth;
        t.style.animation = 'slideIn 0.3s ease-out';
        if (_toastTimer) clearTimeout(_toastTimer);
        _toastTimer = setTimeout(() => { t.style.display = 'none'; }, 5000);
    }

    // ============================================
    // FILTERS & UTILITIES
    // ============================================
    let currentDateRange = 'all';

    const _dateColIndexCache = new WeakMap();
    function getDateColumnIndex(table) {
        if (_dateColIndexCache.has(table)) return _dateColIndexCache.get(table);
        const headers = table.querySelectorAll('thead th');
        let idx = 3;
        for (let i = 0; i < headers.length; i++) {
            if (headers[i].textContent.trim().toLowerCase().startsWith('date')) { idx = i; break; }
        }
        _dateColIndexCache.set(table, idx);
        return idx;
    }

    function parseRowDate(row) {
        const table = row.closest('table');
        const idx = table ? getDateColumnIndex(table) : 3;
        const cell = row.querySelectorAll('td')[idx];
        if (!cell) return null;
        const txt = cell.textContent.trim();
        if (!txt || txt === 'N/A') return null;
        const m = txt.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
        if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
        const d = new Date(txt.replace(' ', 'T'));
        return isNaN(d) ? null : d;
    }

    function matchesDateRange(row) {
        if (currentDateRange === 'all') return true;
        const d = parseRowDate(row);
        if (!d) return true;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 864e5);
        switch (currentDateRange) {
            case 'today': return d >= today && d < tomorrow;
            case '7':     return d >= new Date(today.getTime() - 6 * 864e5);
            case '30':    return d >= new Date(today.getTime() - 29 * 864e5);
            case 'month': return d >= new Date(now.getFullYear(), now.getMonth(), 1);
            default:      return true;
        }
    }

    function applyFilters() {
        const val = (document.getElementById('sos-search').value || '').toLowerCase().trim();
        const activePanel = document.querySelector('.panel-inner:not(.d-none)');
        if (!activePanel) return;

        let visibleCount = 0;
        const rows = activePanel.querySelectorAll('tbody tr');

        rows.forEach(row => {
            if (row.querySelector('td[colspan]')) return;

            const matchSearch = !val || row.textContent.toLowerCase().includes(val);
            const matchDate   = matchesDateRange(row);

            const show = matchSearch && matchDate;
            row.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });

        const tabId = activePanel.id.replace('tab-', '');
        const emptyDiv = document.getElementById(tabId + '-empty');
        if (emptyDiv) {
            const hasAnyRealRow = Array.from(rows).some(r => !r.querySelector('td[colspan]'));
            emptyDiv.style.display = (!hasAnyRealRow || visibleCount === 0) ? 'block' : 'none';
        }

        const countSpan = document.getElementById(tabId + 'Count');
        if (countSpan) {
            const total = Array.from(rows).filter(r => !r.querySelector('td[colspan]')).length;
            const isFiltered = val || currentDateRange !== 'all';
            countSpan.textContent = isFiltered
                ? `Showing ${visibleCount} of ${total} alert(s)`
                : `Showing ${total} alert(s)`;
        }
    }

    function fmtDate(iso) {
        if (!iso) return 'N/A';
        const d = new Date(iso);
        if (isNaN(d)) return 'N/A';
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Manila',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        }).format(d).replace(',', '');
    }

    function formatDateCells(root = document) {
        root.querySelectorAll('.date-cell[data-iso]').forEach(td => {
            const iso = td.dataset.iso;
            td.textContent = iso ? fmtDate(iso) : 'N/A';
        });
    }

    // ============================================
    // EXPORT TO PDF
    // ============================================
    function exportToPDF() {
        const activePanel = document.querySelector('.panel-inner:not(.d-none)');
        if (!activePanel) return;
        const table = activePanel.querySelector('table');
        if (!table) return;
        const panelHeaderEl = activePanel.querySelector('.panel-header');
        if (!panelHeaderEl) return;
        const title = panelHeaderEl.innerText.trim();

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
                    const nameDiv = cell.querySelector('.sos-name');
                    const idDiv = cell.querySelector('.sos-id');
                    if (nameDiv) {
                        text = nameDiv.textContent.trim() + (idDiv ? ' — ' + idDiv.textContent.trim() : '');
                    } else {
                        text = cell.textContent.trim();
                    }
                }
                rowData.push(text);
            });
            rows.push(rowData);
        });

        const wideColumns = ['Resident'];
        let tableHtml = `
        <div style="position:relative;text-align:center;padding-bottom:12px;margin-bottom:20px;border-bottom:3px solid #2d4a44;">
            <div style="position:absolute;left:-30px;top:-25px;display:flex;align-items:center;gap:5px;">
                <img src="/images/seal1.png" alt="Barangay Seal" style="width:16px;height:16px;object-fit:contain;">
                <span style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#888;white-space:nowrap;">CivilAccess Web System</span>
            </div>
            <div style="font-size:22px;font-weight:bold;color:#2d4a44;margin-bottom:4px;">${title}</div>
            <div style="font-size:13px;color:#555;">${new Date().toLocaleString()}</div>
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

        const exportBtn = document.getElementById('btnExportPDF');
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

    document.getElementById('btnExportPDF')?.addEventListener('click', exportToPDF);

    // ============================================
    // POLLING
    // ============================================
    let lastSeenIncomingId = 0;
    let lastSeenProcessingId = 0;
    let lastSeenCancelledId = 0;
    let currentMap = null;

    function initLastSeenIds() {
        let maxId = 0;
        document.querySelectorAll('#incoming-tbody tr').forEach(row => {
            const m = (row.querySelector('.sos-id')?.innerText || '').match(/ID:\s*(\d+)/);
            if (m) maxId = Math.max(maxId, parseInt(m[1]));
        });
        lastSeenIncomingId = maxId;

        maxId = 0;
        document.querySelectorAll('#processing-tbody tr').forEach(row => {
            const m = (row.querySelector('.sos-id')?.innerText || '').match(/ID:\s*(\d+)/);
            if (m) maxId = Math.max(maxId, parseInt(m[1]));
        });
        lastSeenProcessingId = maxId;

        maxId = 0;
        document.querySelectorAll('#cancelled-tbody tr').forEach(row => {
            const m = (row.querySelector('.sos-id')?.innerText || '').match(/ID:\s*(\d+)/);
            if (m) maxId = Math.max(maxId, parseInt(m[1]));
        });
        lastSeenCancelledId = maxId;
    }

    function isPrivilegedRole() {
        const role = document.getElementById('currentUserRole')?.value;
        return role === 'ADMIN' || role === 'SECRETARY' || role === 'SECRETARIAT STAFF';
    }

    function archiveBtnHtml(id) {
        const role = document.getElementById('currentUserRole')?.value;
        if (role === 'ADMIN') {
            return `<button class="archive-btn btn-update-status" data-id="${id}" data-status="ARCHIVED">Archive</button>`;
        }
        if (role === 'SECRETARY' || role === 'SECRETARIAT STAFF') {
            return `<button class="archive-btn btn-assistance-archive">Archive</button>`;
        }
        return '';
    }

    function buildIncomingRow(r) {
        const processBtn = isPrivilegedRole()
            ? `<button class="resolve-btn btn-update-status" data-id="${r.id}" data-status="PROCESSING">Process</button>`
            : '';
        return `<td><div class="sos-name">${escapeHtml(r.reporterName) || 'Unknown'}</div><div class="sos-id">ID: ${r.id}</div></td>
                <td>${escapeHtml(r.phoneNumber) || 'N/A'}</td>
                <td class="sos-type-cell"><span class="badge-sos">${escapeHtml(r.sosType) || 'General'}</span></td>
                <td>${fmtDate(r.dateReported)}</td>
                <td><span class="status-incoming">Incoming</span></td>
                <td><div class="d-flex gap-2"><button class="view-btn btn-view-sos" data-id="${r.id}">View</button>${processBtn}${archiveBtnHtml(r.id)}</div></td>`;
    }

    function buildProcessingRow(r) {
        const resolveBtn = isPrivilegedRole()
            ? `<button class="resolve-btn btn-update-status" data-id="${r.id}" data-status="RESOLVED">Resolve</button>`
            : '';
        return `<td><div class="sos-name">${escapeHtml(r.reporterName) || 'Unknown'}</div><div class="sos-id">ID: ${r.id}</div></td>
                <td>${escapeHtml(r.phoneNumber) || 'N/A'}</td>
                <td class="sos-type-cell"><span class="badge-sos">${escapeHtml(r.sosType) || 'General'}</span></td>
                <td>${fmtDate(r.dateReported)}</td>
                <td><span class="status-processing">Processing</span></td>
                <td><div class="d-flex gap-2"><button class="view-btn btn-view-sos" data-id="${r.id}">View</button>${resolveBtn}${archiveBtnHtml(r.id)}</div></td>`;
    }

    function buildCancelledRow(r) {
        return `<td><div class="sos-name">${escapeHtml(r.reporterName) || 'Unknown'}</div><div class="sos-id">ID: ${r.id}</div></td>
                <td>${escapeHtml(r.phoneNumber) || 'N/A'}</td>
                <td class="sos-type-cell"><span class="badge-sos">${escapeHtml(r.sosType) || 'General'}</span></td>
                <td>${fmtDate(r.dateReported)}</td>
                <td><span class="status-cancelled">Cancelled</span></td>
                <td><div class="d-flex gap-2"><button class="view-btn btn-view-sos" data-id="${r.id}">View</button>${archiveBtnHtml(r.id)}</div></td>`;
    }

    async function pollIncoming() {
        if (document.hidden) return;
        try {
            const res = await fetch('/sos-monitoring/api/incoming?lastId=' + lastSeenIncomingId + '&t=' + Date.now());
            if (!res.ok) return;
            const data = await res.json();
            const badge = document.getElementById('badge-incoming');
            if (badge && data.count != null) badge.textContent = data.count;
            if (data.newSos && data.newSos.length > 0) {
                lastSeenIncomingId = Math.max(lastSeenIncomingId, ...data.newSos.map(r => r.id));
                playSiren();
                showToast('🚨 New SoS Alert received! ' + data.newSos.length + ' new alert(s)');
                const tbody = document.getElementById('incoming-tbody');
                const empty = document.getElementById('incoming-empty');
                if (empty) empty.style.display = 'none';
                data.newSos.forEach(r => {
                    if (!tbody || tbody.querySelector('[data-id="' + r.id + '"]')) return;
                    const tr = document.createElement('tr');
                    tr.className = 'new-sos-row';
                    tr.setAttribute('data-id', r.id);
                    tr.innerHTML = buildIncomingRow(r);
                    tbody.prepend(tr);
                });
                applyFilters();
            }
        } catch (err) {
            console.warn('pollIncoming failed:', err);
        }
    }

    async function pollProcessing() {
        if (document.hidden) return;
        try {
            const res = await fetch('/sos-monitoring/api/processing?lastId=' + lastSeenProcessingId + '&t=' + Date.now());
            if (!res.ok) return;
            const data = await res.json();
            const badge = document.getElementById('badge-processing');
            if (badge && data.count != null) badge.textContent = data.count;
            if (data.newProcessing && data.newProcessing.length > 0) {
                lastSeenProcessingId = Math.max(lastSeenProcessingId, ...data.newProcessing.map(r => r.id));
                const tbody = document.getElementById('processing-tbody');
                const empty = document.getElementById('processing-empty');
                if (empty && tbody && tbody.children.length === 0) empty.style.display = 'none';
                data.newProcessing.forEach(r => {
                    if (tbody && !tbody.querySelector('[data-id="' + r.id + '"]')) {
                        const tr = document.createElement('tr');
                        tr.setAttribute('data-id', r.id);
                        tr.innerHTML = buildProcessingRow(r);
                        tbody.prepend(tr);
                    }
                });
                applyFilters();
            }
        } catch (err) {
            console.warn('pollProcessing failed:', err);
        }
    }

    async function pollCancelled() {
        if (document.hidden) return;
        try {
            const res = await fetch('/sos-monitoring/api/cancelled?lastId=' + lastSeenCancelledId + '&t=' + Date.now());
            if (!res.ok) return;
            const data = await res.json();
            const badge = document.getElementById('badge-cancelled');
            if (badge && data.count != null) badge.textContent = data.count;
            if (data.newCancelled && data.newCancelled.length > 0) {
                lastSeenCancelledId = Math.max(lastSeenCancelledId, ...data.newCancelled.map(r => r.id));
                const tbody = document.getElementById('cancelled-tbody');
                const empty = document.getElementById('cancelled-empty');
                data.newCancelled.forEach(r => {
                    const procRow = document.querySelector('#processing-tbody [data-id="' + r.id + '"]');
                    if (procRow) procRow.remove();
                    const incRow = document.querySelector('#incoming-tbody [data-id="' + r.id + '"]');
                    if (incRow) incRow.remove();
                    if (tbody && !tbody.querySelector('[data-id="' + r.id + '"]')) {
                        if (empty) empty.style.display = 'none';
                        const tr = document.createElement('tr');
                        tr.className = 'new-cancelled-row';
                        tr.setAttribute('data-id', r.id);
                        tr.innerHTML = buildCancelledRow(r);
                        tbody.prepend(tr);
                    }
                });
                applyFilters();
            }
        } catch (err) {
            console.warn('pollCancelled failed:', err);
        }
    }

    // ============================================
    // VIEW REPORT
    // ============================================
    function viewReport(id) {
        fetch('/sos-monitoring/' + id)
            .then(r => {
                if (!r.ok) throw new Error('Failed to load report ' + id);
                return r.json();
            })
            .then(data => {
                const hasLocation = data.latitude && data.longitude && data.latitude !== 0 && data.longitude !== 0;
                const statusColor = getStatusColor(data.status);

                document.getElementById('modalBody').innerHTML = `
                    <div class="vm-layout">
                        <div class="vm-left">
                            <div class="vm-card">
                                <div class="vm-card-icon"><i class="bi bi-person-fill"></i></div>
                                <div class="vm-card-body">
                                    <div class="vm-card-label">Submitted By</div>
                                    <div class="vm-card-value">${escapeHtml(data.reporterName) || 'Anonymous'}</div>
                                    <div class="vm-card-sub">${escapeHtml(data.phoneNumber) || 'No contact info'}</div>
                                </div>
                            </div>
                            <div class="vm-card">
                                <div class="vm-card-icon"><i class="bi bi-exclamation-octagon-fill"></i></div>
                                <div class="vm-card-body">
                                    <div class="vm-card-label">SoS Type &amp; Location</div>
                                    <div class="vm-card-value">${escapeHtml(data.sosType) || 'General'}</div>
                                    <div class="vm-card-sub" id="vm-location-text"><i class="bi bi-geo-alt-fill" style="color:#e74c3c;font-size:12px;"></i> ${escapeHtml(data.location) || 'Fetching address...'}</div>
                                </div>
                            </div>
                            <div class="vm-card" style="flex-direction: column; align-items: stretch;">
                                <div style="display:flex; gap:16px; align-items:flex-start;">
                                    <div class="vm-card-icon" style="flex-shrink:0;"><i class="bi bi-file-text-fill"></i></div>
                                    <div class="vm-card-body">
                                        <div class="vm-card-label">Report Details</div>
                                        <div class="vm-pill-row">
                                            <span class="vm-status-pill" style="background-color:${statusColor};">
                                                <i class="bi bi-circle-fill" style="font-size:7px;"></i> ${escapeHtml(data.status) || 'Pending'}
                                            </span>
                                        </div>
                                        <div class="vm-card-value wrap">${escapeHtml(data.description) || 'No description provided.'}</div>
                                        <div class="vm-meta-row">
                                            <i class="bi bi-calendar3"></i> ${data.dateReported ? new Date(data.dateReported).toLocaleString() : 'N/A'}
                                            ${data.responderName ? `&nbsp;&nbsp;<i class="bi bi-person-check-fill"></i> Responder: ${escapeHtml(data.responderName)}` : ''}
                                        </div>
                                        ${data.dateResolved ? `<div class="vm-meta-row"><i class="bi bi-check-circle-fill" style="color:#44C375;"></i> Resolved: ${new Date(data.dateResolved).toLocaleString()}</div>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="vm-right">
                            ${hasLocation ? `<div id="viewMap"></div>` : `<div class="vm-no-map"><i class="bi bi-map"></i><span>No location coordinates available</span></div>`}
                        </div>
                    </div>
                `;

                if (currentMap) { currentMap.remove(); currentMap = null; }

                const modalEl = document.getElementById('viewModal');
                const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

                const renderMap = () => {
                    const mapContainer = document.getElementById('viewMap');
                    if (!mapContainer) return;
                    const map = L.map('viewMap').setView([data.latitude, data.longitude], 16);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
                    const redIcon = L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                    });
                    const marker = L.marker([data.latitude, data.longitude], { icon: redIcon }).addTo(map);
                    if (data.location && data.location !== 'N/A' && data.location.trim() !== '') {
                        marker.bindPopup(`<b>${escapeHtml(data.sosType) || 'SOS Location'}</b><br><small>${escapeHtml(data.location)}</small>`).openPopup();
                    } else {
                        marker.bindPopup(`<b>${escapeHtml(data.sosType) || 'SOS Location'}</b><br><small>Loading address...</small>`).openPopup();
                        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${data.latitude}&lon=${data.longitude}&format=json`)
                            .then(r => r.json())
                            .then(geo => {
                                const address = geo.display_name || `${data.latitude}, ${data.longitude}`;
                                marker.setPopupContent(`<b>${escapeHtml(data.sosType) || 'SOS Location'}</b><br><small>${address}</small>`);
                                const locEl = document.getElementById('vm-location-text');
                                if (locEl) locEl.innerHTML = `<i class="bi bi-geo-alt-fill" style="color:#e74c3c;font-size:12px;"></i> ${address}`;
                            })
                            .catch(() => {
                                marker.setPopupContent(`<b>${escapeHtml(data.sosType) || 'SOS Location'}</b><br><small>${data.latitude}, ${data.longitude}</small>`);
                            });
                    }
                    map.invalidateSize();
                    currentMap = map;
                };

                if (hasLocation) {
                    if (modalEl.classList.contains('show')) {
                        renderMap();
                    } else {
                        modalEl.addEventListener('shown.bs.modal', renderMap, { once: true });
                    }
                }

                modal.show();
            })
            .catch(error => {
                console.error('viewReport failed:', error);
                alert('Unable to load report details. Please try again.');
            });
    }

    // ============================================
    // STATIC EVENT BINDINGS
    // ============================================
    document.getElementById('sos-search').addEventListener('keyup', applyFilters);

    document.querySelectorAll('#dateFilterMenu .dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            currentDateRange = this.getAttribute('data-range');
            document.getElementById('dateFilterLabel').textContent = this.textContent.trim();
            applyFilters();
        });
    });

    document.querySelectorAll('.tabbar .tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const target = this.dataset.tab;
            if (!target) return;

            document.querySelectorAll('.tabbar .tab').forEach(t => t.classList.toggle('active', t === this));
            document.querySelectorAll('.panel-inner').forEach(p => p.classList.add('d-none'));
            const panel = document.getElementById('tab-' + target);
            if (panel) panel.classList.remove('d-none');

            history.replaceState({}, '', '/sos-monitoring?tab=' + target);
            applyFilters();
        });
    });

    // Table action event delegation
    document.querySelector('.panel').addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-view-sos')) {
            viewReport(e.target.getAttribute('data-id'));
            return;
        }
        if (e.target.classList.contains('btn-update-status')) {
            updateStatusWithConfirm(e.target.getAttribute('data-id'), e.target.getAttribute('data-status'));
            return;
        }
        if (e.target.classList.contains('btn-assistance-archive')) {
            openAssistanceModal();
            return;
        }
    });

    // ============================================
    // INIT
    // ============================================
    formatDateCells();
    applyFilters();
    initLastSeenIds();
    setInterval(pollIncoming, 5000);
    setInterval(pollProcessing, 5000);
    setInterval(pollCancelled, 5000);
    setTimeout(() => { const c = getAudioCtx(); if (c.state === 'suspended') c.resume(); }, 100);
});