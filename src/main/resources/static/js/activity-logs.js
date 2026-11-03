document.addEventListener('DOMContentLoaded', function () {
    
    // ── Force password modal ──────────────────────────────────
    const redirectBtn = document.getElementById('redirectPasswordBtn');
    if (redirectBtn) {
        redirectBtn.addEventListener('click', function() {
            window.location.href = "/user-profile";
        });
    }

    populateFilterDropdowns();

    // ── Search ────────────────────────────────────────────────
    document.getElementById('contact-search').addEventListener('keyup', function () {
        applyFilters();
    });

    // ── Filter panel toggle ───────────────────────────────────
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const filterPanel = document.getElementById('filterPanel');
    
    if (filterToggleBtn && filterPanel) {
        filterToggleBtn.addEventListener('click', function() {
            filterPanel.style.display = filterPanel.style.display === 'none' ? 'block' : 'none';
        });
    }

    // Close filter panel when clicking outside
    document.addEventListener('click', function (e) {
        if (filterPanel && filterPanel.style.display === 'block' && !filterPanel.contains(e.target) && !filterToggleBtn.contains(e.target)) {
            filterPanel.style.display = 'none';
        }
    });

    // ── Filter Buttons ────────────────────────────────────────
    const applyBtn = document.getElementById('applyFiltersBtn');
    if(applyBtn) applyBtn.addEventListener('click', applyFilters);
    
    const clearBtn = document.getElementById('clearFiltersBtn');
    if(clearBtn) {
        clearBtn.addEventListener('click', function() {
            document.getElementById('filter-status').value    = '';
            document.getElementById('filter-action').value    = '';
            document.getElementById('filter-role').value      = '';
            document.getElementById('filter-date-from').value = '';
            document.getElementById('filter-date-to').value   = '';
            applyFilters();
            document.getElementById('filterPanel').style.display = 'none';
        });
    }

    // ── Export PDF ────────────────────────────────────────────
    const exportBtn = document.getElementById('export-pdf-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToPDF);
    }

    // ── Pagination Initialization ─────────────────────────────
    initPagination('activity-log-table', 'footer-logs');

    // ── Polling ───────────────────────────────────────────────
    var lastSnapshot = '';
    
    function isModalOpen() {
        var forceModal = document.getElementById('forcePasswordModal');
        if (forceModal && forceModal.style.display === 'block') return true;
        var logoutModal = document.getElementById('logoutModal');
        if (logoutModal && (logoutModal.style.display === 'block' || logoutModal.style.display === 'flex')) return true;
        return false;
    }
    
    function poll() {
        if (isModalOpen()) return;
        
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/Activity-logs/api/poll?t=' + Date.now(), true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    var snapshot = JSON.stringify(data);
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
});


// ── Populate Action + Role dropdowns from actual table data ─
function populateFilterDropdowns() {
    const rows = document.querySelectorAll('#tab-police tbody tr');
    const actions = new Set();
    const roles   = new Set();

    rows.forEach(function (row) {
        const actionEl = row.querySelector('td:nth-child(3) .action-badge');
        const roleEl   = row.querySelector('td:nth-child(2) .user-role');
        if (actionEl && actionEl.textContent.trim()) actions.add(actionEl.textContent.trim());
        if (roleEl   && roleEl.textContent.trim())   roles.add(roleEl.textContent.trim());
    });

    const actionSel = document.getElementById('filter-action');
    actions.forEach(function (a) {
        const opt = document.createElement('option');
        opt.value = a; opt.textContent = a;
        actionSel.appendChild(opt);
    });

    const roleSel = document.getElementById('filter-role');
    roles.forEach(function (r) {
        const opt = document.createElement('option');
        opt.value = r; opt.textContent = r;
        roleSel.appendChild(opt);
    });
}

// ── Core filter logic ─────────────────────────────────────
function applyFilters() {
    const search   = document.getElementById('contact-search').value.toLowerCase().trim();
    const status   = document.getElementById('filter-status').value;
    const action   = document.getElementById('filter-action').value;
    const role     = document.getElementById('filter-role').value;
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo   = document.getElementById('filter-date-to').value;

    let visibleCount = 0;

    document.querySelectorAll('#tab-police tbody tr').forEach(function (row) {
        const cells      = row.querySelectorAll('td');
        const rowText    = row.textContent.toLowerCase();
        const rowStatus  = cells[6] ? cells[6].textContent.trim() : '';
        const rowAction  = cells[2] ? cells[2].textContent.trim() : '';
        const rowRole    = row.querySelector('.user-role') ? row.querySelector('.user-role').textContent.trim() : '';
        const rowTsRaw   = cells[7] ? cells[7].textContent.trim() : '';  
        const rowDate    = rowTsRaw ? new Date(rowTsRaw) : null;

        const matchSearch = !search || rowText.includes(search);
        const matchStatus = !status || rowStatus === status;
        const matchAction = !action || rowAction === action;
        const matchRole = !role || rowRole === role;

        let matchDate = true;
        if (dateFrom && rowDate) matchDate = matchDate && rowDate >= new Date(dateFrom);
        if (dateTo   && rowDate) {
            const toEnd = new Date(dateTo);
            toEnd.setHours(23, 59, 59, 999);
            matchDate = matchDate && rowDate <= toEnd;
        }

        const visible = matchSearch && matchStatus && matchAction && matchRole && matchDate;
        
        // Updated to trigger MutationObserver for pagination
        if (visible) {
            row.removeAttribute('data-filtered');
        } else {
            row.setAttribute('data-filtered', 'hidden');
        }
        
        if (visible) visibleCount++;
    });

    updateFilterBadge();
    updateRowCount(visibleCount);
}

// Show a count badge on the button when filters are active
function updateFilterBadge() {
    const status   = document.getElementById('filter-status').value;
    const action   = document.getElementById('filter-action').value;
    const role     = document.getElementById('filter-role').value;
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo   = document.getElementById('filter-date-to').value;
    const count    = [status, action, role, dateFrom, dateTo].filter(Boolean).length;
    const badge    = document.getElementById('activeFilterCount');
    badge.textContent    = count;
    badge.style.display  = count > 0 ? 'inline' : 'none';
}

// Update the "Showing X results" footer text
function updateRowCount(count) {
    const footer = document.querySelector('.table-footer span');
    if (footer) footer.textContent = 'Showing ' + count + ' result' + (count !== 1 ? 's' : '');
}

// ── Export PDF ────────────────────────────────────────────
function exportToPDF() {
    const exportedBy = document.getElementById('currentUserName')?.value || 'Unknown User';
    const panel = document.querySelector('.panel-inner:not(.d-none)');
    if (!panel) return;
    const table = panel.querySelector('table');
    if (!table) return;

    const title = panel.querySelector('.panel-header').innerText.trim();

    const excludedHeaders = [];

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
        if (tr.getAttribute('data-filtered') === 'hidden') return;
        if (tr.style.display === 'none') return; // Skip paginated rows
        if (tr.querySelector('td[colspan]')) return;

        const cells = tr.querySelectorAll('td');
        const rowData = [];
        includedIndexes.forEach(i => {
            const cell = cells[i];
            let text = '';
            if (cell) {
                const nameDiv = cell.querySelector('.facility-name');
                const roleDiv = cell.querySelector('.user-role');
                if (nameDiv) {
                    text = nameDiv.textContent.trim() + (roleDiv ? ' — ' + roleDiv.textContent.trim() : '');
                } else {
                    text = cell.textContent.trim();
                }
            }
            rowData.push(text);
        });
        rows.push(rowData);
    });

    const limitedRows = rows.slice(0, 8);

    const wideColumns = ['User', 'Details'];

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
        ${title} <span style="font-weight:normal;font-size:11px;color:#888;">(${limitedRows.length} record${limitedRows.length !== 1 ? 's' : ''})</span>
    </div>`;

    if (limitedRows.length === 0) {
        tableHtml += `<p style="color:#888;text-align:center;padding:20px 0;">No data to display.</p>`;
    } else {
        let headerRowHtml = '';
        headers.forEach(h => {
            const isWide = wideColumns.includes(h);
            headerRowHtml += `<th style="background-color:#2d4a44 !important;color:white !important;padding:8px;font-size:11px !important;border:1px solid #1a3530;${isWide ? 'min-width:160px;' : 'white-space:nowrap;'}">${h}</th>`;
        });

        let tableRowsHtml = '';
        limitedRows.forEach((row, i) => {
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

// ── Pagination ────────────────────────────────────────────
function initPagination(tableId, footerId) {
    const tbody = document.querySelector('#' + tableId + ' tbody');
    const footer = document.getElementById(footerId);
    if (!tbody || !footer) return;

    let currentPage = 1;
    const PAGE_SIZE = 10;

    function getVisibleRows() {
        return Array.from(tbody.querySelectorAll('tr')).filter(r => r.getAttribute('data-filtered') !== 'hidden');
    }

    function render() {
        const all = getVisibleRows();
        const total = all.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * PAGE_SIZE;
        const end   = start + PAGE_SIZE;

        Array.from(tbody.querySelectorAll('tr')).forEach(r => {
            if (r.getAttribute('data-filtered') === 'hidden') {
                r.style.display = 'none';
                return;
            }
            const idx = all.indexOf(r);
            r.style.display = (idx >= start && idx < end) ? '' : 'none';
        });

        const fromNum = total === 0 ? 0 : start + 1;
        const toNum   = Math.min(end, total);

        let paginationHtml = '<ul class="pagination pagination-sm mb-0">';

        if (currentPage > 1) {
            paginationHtml += `<li class="page-item">
                <a class="page-link" href="#" data-action="prev"><i class="bi bi-arrow-left"></i> Prev</a>
            </li>`;
        }

        for (let p = 1; p <= totalPages; p++) {
            paginationHtml += `<li class="page-item${p === currentPage ? ' active' : ''}">
                <a class="page-link" href="#" data-action="goto" data-page="${p}">${p}</a>
            </li>`;
        }

        if (currentPage < totalPages) {
            paginationHtml += `<li class="page-item">
                <a class="page-link" href="#" data-action="next">Next <i class="bi bi-arrow-right"></i></a>
            </li>`;
        }

        paginationHtml += '</ul>';
        footer.innerHTML = `<span>Showing ${fromNum}–${toNum} of ${total}</span><nav>${paginationHtml}</nav>`;
    }

    footer.addEventListener('click', function(e) {
        e.preventDefault();
        const link = e.target.closest('a[data-action]');
        if (!link) return;

        const all = getVisibleRows();
        const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
        const action = link.getAttribute('data-action');

        if (action === 'prev' && currentPage > 1) currentPage--;
        else if (action === 'next' && currentPage < totalPages) currentPage++;
        else if (action === 'goto') currentPage = parseInt(link.getAttribute('data-page'));

        render();
    });

    new MutationObserver(() => {
        currentPage = 1;
        render();
    }).observe(tbody, { attributes: true, subtree: true, attributeFilter: ['data-filtered'] });

    render();
}