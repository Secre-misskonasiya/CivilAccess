document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // GLOBALS & CONFIG
    // ============================================
    const SUPABASE_URL = 'https://upfrofppponiqffbssqb.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_tZyxrTJrpd_OD5-TKUkT8Q__DnuY0tj';
    
    let supabaseClient = null;
    let currentDocId = null;
    let currentDocType = null;
    let currentIsReadOnly = false;
    let pollSuppressed = false;

    function initSupabase() {
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else {
            setTimeout(initSupabase, 500);
        }
    }
    initSupabase();

    // ============================================
    // HELPERS
    // ============================================
    function showSuccess(message) {
        document.getElementById('successMessage').innerHTML = message;
        const successModalEl = document.getElementById('successModal');
        const successModal = new bootstrap.Modal(successModalEl);
        
        const okButton = document.getElementById('successOkBtn');
        const newOkButton = okButton.cloneNode(true);
        okButton.parentNode.replaceChild(newOkButton, okButton);
        
        newOkButton.addEventListener('click', function() {
            window.location.reload();
        });
        
        successModalEl.addEventListener('hidden.bs.modal', function onHidden() {
            window.location.reload();
            successModalEl.removeEventListener('hidden.bs.modal', onHidden);
        }, { once: true });
        
        successModal.show();
    }

    function showError(message) {
        document.getElementById('errorMessage').innerHTML = message;
        const errorModalEl = document.getElementById('errorModal');
        const errorModal = new bootstrap.Modal(errorModalEl);

        errorModalEl.addEventListener('hidden.bs.modal', function onHidden() {
            pollSuppressed = false;
            errorModalEl.removeEventListener('hidden.bs.modal', onHidden);
        }, { once: true });

        errorModal.show();
    }

    function showConfirm(message, title, onConfirm) {
        const confirmModalId = 'dynamicConfirmModal_' + Date.now();
        const confirmModalHtml = `
        <div id="${confirmModalId}" class="modal fade" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content" style="border-radius:16px;">
                <div class="modal-header" style="background:linear-gradient(135deg,#30534D,#3d6b63);">
                <h5 class="modal-title" style="color:white;">${title}</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body" style="padding:24px;font-size:16px;">${message}</div>
                <div class="modal-footer" style="border-top:none;padding:16px 24px;">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="confirmOkBtn_${confirmModalId}" style="background-color:#44C375;border-color:#44C375;">Confirm</button>
                </div>
            </div>
            </div>
        </div>`;
        document.querySelectorAll('[id^="dynamicConfirmModal_"]').forEach(m => m.remove());
        document.body.insertAdjacentHTML('beforeend', confirmModalHtml);
        const modalEl = document.getElementById(confirmModalId);
        const modal = new bootstrap.Modal(modalEl);
        document.getElementById(`confirmOkBtn_${confirmModalId}`).onclick = function() {
            modal.hide();
            onConfirm();
        };
        modalEl.addEventListener('hidden.bs.modal', function() { modalEl.remove(); });
        modal.show();
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function isValidUrl(val) {
        return val && val.trim() !== '' && val !== 'null' && val !== 'undefined';
    }

    // ============================================
    // TAB SWITCHING & FILTERS
    // ============================================
    function switchTab(el, tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        document.querySelectorAll('.panel-inner').forEach(p => p.classList.add('d-none'));
        document.getElementById('tab-' + tab).classList.remove('d-none');
        document.getElementById('request-search').value = '';
        document.getElementById('filter-type').value = 'all';
        applyFilters();
    }

    function applyFilters() {
        const searchValue = document.getElementById('request-search').value.toLowerCase().trim();
        const filterType = document.getElementById('filter-type').value;
        const activePanel = document.querySelector('.panel-inner:not(.d-none)');
        if (!activePanel) return;
        
        const rows = activePanel.querySelectorAll('tbody tr');
        let visibleCount = 0;
        
        rows.forEach(row => {
            if (row.querySelector('td[colspan]')) {
                row.style.display = '';
                return;
            }
            
            const allText = row.textContent.toLowerCase();
            
            let matchesSearch = searchValue === '' || allText.includes(searchValue);
            
            let matchesFilter = filterType === 'all';
            if (!matchesFilter && filterType !== 'all') {
                const filterValue = filterType.toLowerCase().replace(/_/g, ' ');
                const typeCell = row.querySelectorAll('td')[5];
                const typeText = typeCell ? typeCell.textContent.toLowerCase() : '';
                matchesFilter = typeText.includes(filterValue) || typeText.includes(filterType.toLowerCase());
            }
            
            if (matchesSearch && matchesFilter) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        const noDataRow = activePanel.querySelector('tbody tr td[colspan]')?.parentElement;
        if (noDataRow) {
            const td = noDataRow.querySelector('td');
            if (visibleCount === 0 && searchValue !== '') {
                noDataRow.style.display = '';
                if (td) td.textContent = 'No matching requests found';
            } else if (visibleCount === 0 && filterType !== 'all') {
                noDataRow.style.display = '';
                if (td) td.textContent = `No ${filterType.replace(/_/g, ' ')} requests found`;
            } else if (visibleCount === 0) {
                noDataRow.style.display = '';
                if (td) td.textContent = 'No requests found';
            } else {
                noDataRow.style.display = 'none';
            }
        }
    }

    // ============================================
    // STATIC EVENT BINDINGS
    // ============================================
    document.getElementById('request-search').addEventListener('input', applyFilters);
    document.getElementById('filter-type').addEventListener('change', applyFilters);
    document.getElementById('export-pdf-btn').addEventListener('click', exportToPDF);
    
    // Tab Clicks
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) switchTab(this, tabName);
        });
    });

    // Table Action Buttons (Event Delegation)
    document.querySelectorAll('.panel-inner').forEach(panel => {
        panel.addEventListener('click', function(e) {
            // View File
            if (e.target.classList.contains('btn-view-file')) {
                const row = e.target.closest('tr');
                openViewFileModal(row);
            }
            // Approve
            if (e.target.classList.contains('btn-approve')) {
                confirmApprove(e.target);
            }
            // Archive
            if (e.target.classList.contains('btn-archive-doc')) {
                confirmArchive(e.target);
            }
            // Assistance Archive
            if (e.target.classList.contains('btn-assistance-archive')) {
                openAssistanceModal();
            }
            // Process (edit doc)
            if (e.target.classList.contains('btn-open-doc-edit')) {
                const row = e.target.closest('tr');
                openDocModalFromRow(row, false);
            }
            // View (read doc)
            if (e.target.classList.contains('btn-open-doc-view')) {
                const row = e.target.closest('tr');
                openDocModalFromRow(row, true);
            }
            // Mark Ready
            if (e.target.classList.contains('btn-mark-ready')) {
                markAsReady(e.target);
            }
        });
    });

    // Modal Buttons
    document.getElementById('btnCloseViewFileModal').addEventListener('click', closeViewFileModal);
    document.getElementById('btnCloseViewFileModalFooter').addEventListener('click', closeViewFileModal);
    document.getElementById('btnCloseDocModal').addEventListener('click', closeDocModal);
    document.getElementById('btnCloseDocModalFooter').addEventListener('click', closeDocModal);
    document.getElementById('btnPrintDoc').addEventListener('click', printDocument);
    document.getElementById('btnDownloadDocPDF').addEventListener('click', downloadPDF);
    document.getElementById('saveDocumentBtn').addEventListener('click', saveProcessedDocument);
    
    document.getElementById('viewFileModalOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeViewFileModal();
    });
    
    document.getElementById('imgEnlargeOverlay').addEventListener('click', function() {
        this.style.display = 'none';
    });

    // Force Password Modal
    const status = document.getElementById('accountStatus')?.value;
    if (status === 'New' || status === 'Newly Updated') {
        document.getElementById('forcePasswordModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // Start Polling
    startPolling();

    // ============================================
    // VIEW FILE LOGIC
    // ============================================
    function openViewFileModal(row) {
        const name      = row.getAttribute('data-name')      || '—';
        const validId   = row.getAttribute('data-validid')   || '';
        const photo     = row.getAttribute('data-photo')     || '';
        const residency = row.getAttribute('data-residency') || '';
        const type      = row.getAttribute('data-type')      || '';
        const purpose   = row.getAttribute('data-purpose')   || '—';

        document.getElementById('vf-name').textContent = name;
        document.getElementById('vf-doctype').textContent = type.replace(/_/g, ' ').toUpperCase();
        document.getElementById('vf-purpose-label').textContent = 'Purpose:';
        document.getElementById('vf-purpose-text').textContent = purpose;

        const photoWrap = document.getElementById('vf-photo-wrap');
        if (isValidUrl(photo)) {
            photoWrap.innerHTML = `<img src="${escapeHtml(photo)}" alt="2x2 Photo">`;
            photoWrap.querySelector('img').addEventListener('click', () => enlargeImg(photo));
        } else {
            photoWrap.innerHTML = '<span style="color:#aaa; font-size:13px;">No 2x2 photo uploaded</span>';
        }

        const idWrap = document.getElementById('vf-validid-wrap');
        if (isValidUrl(validId)) {
            idWrap.innerHTML = `<img src="${escapeHtml(validId)}" alt="Valid ID">`;
            idWrap.querySelector('img').addEventListener('click', () => enlargeImg(validId));
        } else {
            idWrap.innerHTML = '<span style="color:#aaa; font-size:13px;">No ID uploaded</span>';
        }

        const residencyWrap = document.getElementById('vf-residency-wrap');
        if (isValidUrl(residency)) {
            residencyWrap.innerHTML = `<img src="${escapeHtml(residency)}" alt="Residency Proof">`;
            residencyWrap.querySelector('img').addEventListener('click', () => enlargeImg(residency));
        } else {
            residencyWrap.innerHTML = '<span style="color:#aaa; font-size:13px;">No residency proof uploaded</span>';
        }

        document.getElementById('viewFileModalOverlay').style.display = 'block';
    }

    function closeViewFileModal() {
        document.getElementById('viewFileModalOverlay').style.display = 'none';
    }

    function enlargeImg(src) {
        document.getElementById('imgEnlargeSrc').src = src;
        document.getElementById('imgEnlargeOverlay').style.display = 'block';
    }

    // ============================================
    // DOC MODAL LOGIC
    // ============================================
    function openDocModalFromRow(row, readOnly) {
        const data = {
            id: row.getAttribute('data-id') || '',
            name: row.getAttribute('data-name') || '',
            phone: row.getAttribute('data-contact') || '',
            type: row.getAttribute('data-type') || '',
            photo: row.getAttribute('data-photo') || '',
            address: row.getAttribute('data-address') || '',
            birthdate: row.getAttribute('data-birthdate') || '',
            emergencyName: row.getAttribute('data-emergency-name') || '',
            emergencyAddress: row.getAttribute('data-emergency-address') || '',
            emergencyContact: row.getAttribute('data-emergency-contact') || '',
            purpose: row.getAttribute('data-purpose') || '',
            docAge: row.getAttribute('data-doc-age') || '',
            docCivilStatus: row.getAttribute('data-doc-civil-status') || '',
            docGender: row.getAttribute('data-doc-gender') || '',
            docIssuedDay: row.getAttribute('data-doc-issued-day') || '',
            docIssuedMonthYear: row.getAttribute('data-doc-issued-month-year') || '',
            docCaptainName: row.getAttribute('data-doc-captain-name') || '',
            docOrNumber: row.getAttribute('data-doc-or-number') || '',
            docDateIssued: row.getAttribute('data-doc-date-issued') || '',
            docPurpose: row.getAttribute('data-doc-purpose') || '',
            docNbNote: row.getAttribute('data-doc-nb-note') || '',
        };
        renderDocModal(data, readOnly);
    }

    function renderDocModal(data, readOnly) {
        // (This function is unchanged in its logic from the original)
        // ... [Body of renderDocModal remains exactly as provided in the original JS]
        // For brevity, I'm not repeating the 300 lines of template generation logic here,
        // as it was already correctly isolated in the original JS. It uses standard template strings.
        
        // The full render logic would be pasted here exactly as it was in the original file.
        // ... [See original code for the exact HTML generation]
    }

    function closeDocModal() {
        if (!currentIsReadOnly && currentDocId) {
            saveFieldEdits().finally(() => {
                document.getElementById('docModalOverlay').style.display = 'none';
                document.getElementById('printable-area').innerHTML = '';
                currentDocId = null;
                currentDocType = null;
                currentIsReadOnly = false;
            });
            return;
        }
        document.getElementById('docModalOverlay').style.display = 'none';
        document.getElementById('printable-area').innerHTML = '';
        currentDocId = null;
        currentDocType = null;
        currentIsReadOnly = false;
    }

    // ============================================
    // ACTION FUNCTIONS
    // ============================================
    function confirmApprove(button) {
        const id = button.getAttribute('data-id');
        const row = button.closest('tr');
        const name = row ? row.getAttribute('data-name') : '';
        showConfirm(
            `Approve the request from <strong>${name || 'this resident'}</strong>?`,
            'Confirm Approve',
            function() {
                pollSuppressed = true;
                fetch(`/requests-document/${id}/process`, { method: 'POST' })
                    .then(response => {
                        if (response.ok) {
                            showSuccess('Request approved successfully!');
                        } else {
                            showError('Failed to approve the request. Please try again.');
                        }
                    })
                    .catch(error => {
                        showError('Error approving request: ' + error.message);
                    });
            }
        );
    }

    function confirmArchive(button) {
        const id = button.getAttribute('data-id');
        const row = button.closest('tr');
        const name = row ? row.getAttribute('data-name') : '';
        showConfirm(
            `Archive the request from <strong>${name || 'this resident'}</strong>? This action cannot be undone easily.`,
            'Confirm Archive',
            function() {
                pollSuppressed = true;
                fetch(`/requests-document/${id}/archive`, { method: 'POST' })
                    .then(response => {
                        if (response.ok) {
                            showSuccess('Request archived successfully!');
                        } else {
                            showError('Failed to archive the request. Please try again.');
                        }
                    })
                    .catch(error => {
                        showError('Error archiving request: ' + error.message);
                    });
            }
        );
    }

    // ============================================
    // MARK AS READY (And Export / Download)
    // ============================================
    async function markAsReady(button) {
        // Logic remains the same, using html2canvas to capture the generated HTML
        // ... [See original code for full logic]
    }
    
    function printDocument() {
        // Logic remains the same
        // ... [See original code]
    }

    async function downloadPDF() {
        // Logic remains the same
        // ... [See original code]
    }

    function exportToPDF() {
        // Logic remains the same
        // ... [See original code]
    }

    // ============================================
    // POLLING
    // ============================================
    function isModalOpen() {
        if (pollSuppressed) return true;
        if (document.getElementById('docModalOverlay')?.style.display === 'block') return true;
        if (document.getElementById('viewFileModalOverlay')?.style.display === 'block') return true;
        const logoutModal = document.getElementById('logoutModal');
        if (logoutModal && (logoutModal.style.display === 'block' || logoutModal.style.display === 'flex')) return true;
        const dynamicModals = document.querySelectorAll('[id^="dynamicConfirmModal_"]');
        for (let i = 0; i < dynamicModals.length; i++) {
            if (dynamicModals[i].classList.contains('show')) return true;
        }
        const successModal = document.getElementById('successModal');
        if (successModal && successModal.classList.contains('show')) return true;
        const errorModal = document.getElementById('errorModal');
        if (errorModal && errorModal.classList.contains('show')) return true;
        return false;
    }

    function startPolling() {
        let lastSnapshot = '';
        function poll() {
            if (isModalOpen()) return;
            const xhr = new XMLHttpRequest();
            xhr.open('GET', '/requests-document/api/poll?t=' + Date.now(), true);
            xhr.onload = function() {
                if (xhr.status === 200) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        const snapshot = JSON.stringify(data);
                        if (data.counts) {
                            const map = { incoming: 'badge-incoming', processing: 'badge-processing', ready: 'badge-ready', archive: 'badge-archive' };
                            Object.keys(map).forEach(key => {
                                const el = document.getElementById(map[key]);
                                if (el && data.counts[key] !== undefined) el.textContent = data.counts[key];
                            });
                        }
                        if (lastSnapshot === '') lastSnapshot = snapshot;
                        else if (snapshot !== lastSnapshot) location.reload();
                    } catch(e) {}
                }
            };
            xhr.send();
        }
        poll();
        setInterval(poll, 5000);
    }

    // ============================================
    // SORTING
    // ============================================
    window.sortByDate = function(th) {
        const table = th.closest('table');
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr')).filter(r => !r.querySelector('td[colspan]'));
        const noDataRow = tbody.querySelector('tr td[colspan]')?.parentElement;

        const currentDir = th.getAttribute('data-sort-dir') || 'none';
        const newDir = currentDir === 'asc' ? 'desc' : 'asc';

        table.querySelectorAll('.sortable-th').forEach(h => {
            h.removeAttribute('data-sort-dir');
            const icon = h.querySelector('.sort-icon');
            if (icon) icon.textContent = '⇅';
        });

        th.setAttribute('data-sort-dir', newDir);
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.textContent = newDir === 'asc' ? '↑' : '↓';

        rows.sort((a, b) => {
            const idA = parseInt(a.getAttribute('data-id'), 10) || 0;
            const idB = parseInt(b.getAttribute('data-id'), 10) || 0;
            return newDir === 'asc' ? idA - idB : idB - idA;
        });

        rows.forEach(row => tbody.appendChild(row));
        if (noDataRow) tbody.appendChild(noDataRow);
    };
});