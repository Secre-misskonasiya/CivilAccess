document.addEventListener('DOMContentLoaded', function() {
    // Prevents the background poller from reloading the page while an
    // edit/add action is in flight or its result modal is still showing.
    let pollSuppressed = false;

    // ============================================
    // STATIC EVENT BINDINGS
    // ============================================
    document.getElementById('btnCloseViewModal').addEventListener('click', closeViewModal);
    document.getElementById('btnCloseViewModalFooter').addEventListener('click', closeViewModal);
    document.getElementById('btnCloseEditModal').addEventListener('click', closeEditModal);
    document.getElementById('btnCancelEditModal').addEventListener('click', closeEditModal);
    document.getElementById('btnSubmitEditForm').addEventListener('click', submitEditForm);
    
    document.getElementById('btnCloseAddModal').addEventListener('click', closeAddModal);
    document.getElementById('btnCancelAddModal').addEventListener('click', closeAddModal);
    document.getElementById('btnSubmitAddForm').addEventListener('click', submitAddForm);
    
    document.getElementById('btnAddBlotter')?.addEventListener('click', openAddBlotterModal);
    document.getElementById('btnExportPDF').addEventListener('click', exportToPDF);
    document.getElementById('btnCloseSysError').addEventListener('click', closeSysError);
    document.getElementById('btnRedirectPassword').addEventListener('click', () => { window.location.href = '/user-profile'; });
    
    // Filter & Search
    document.getElementById('request-search').addEventListener('keyup', applyFilters);
    document.getElementById('filter-type').addEventListener('change', applyFilters);

    // Table Actions (Delegated)
    document.getElementById('blotter-table-body').addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-view-blotter')) {
            viewBlotterDetails(e.target);
        } else if (e.target.classList.contains('btn-edit-blotter')) {
            openEditModal(e.target);
        }
    });

    // Force password change
    const status = document.getElementById('accountStatus')?.value;
    if (status === 'New' || status === 'Newly Updated') {
        document.getElementById('forcePasswordModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // Start Polling
    startPolling();

    // ============================================
    // FUNCTIONS
    // ============================================
    function applyFilters() {
        const searchValue = document.getElementById('request-search').value.toLowerCase();
        const filterType = document.getElementById('filter-type').value;
        const rows = document.querySelectorAll('#blotter-table-body tr');
        let visibleCount = 0;
        
        rows.forEach(row => {
            if (row.querySelector('td[colspan]')) { row.style.display = ''; return; }
            const complainant = row.cells[1]?.textContent.toLowerCase() || '';
            const contact = row.cells[2]?.textContent.toLowerCase() || '';
            const respondent = row.cells[3]?.textContent.toLowerCase() || '';
            const incidentType = row.cells[4]?.textContent.toLowerCase() || '';
            const location = row.cells[6]?.textContent.toLowerCase() || '';
            
            const searchText = `${complainant} ${contact} ${respondent} ${incidentType} ${location}`;
            const matchesSearch = searchValue === '' || searchText.includes(searchValue);
            const matchesFilter = filterType === 'all' || incidentType === filterType.toLowerCase();
            
            if (matchesSearch && matchesFilter) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        const noDataRow = document.querySelector('#blotter-table-body tr td[colspan]')?.parentElement;
        if (noDataRow) {
            if (visibleCount === 0 && (searchValue !== '' || filterType !== 'all')) {
                noDataRow.style.display = '';
                const td = noDataRow.querySelector('td');
                if (td) td.innerHTML = '<i class="bi bi-search"></i><br>No matching blotter records found';
            } else if (visibleCount === 0) {
                noDataRow.style.display = '';
            } else {
                noDataRow.style.display = 'none';
            }
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function viewBlotterDetails(button) {
        const id = button.getAttribute('data-id');
        const complainant = button.getAttribute('data-complainant') || 'N/A';
        const contact = button.getAttribute('data-contact') || 'N/A';
        const respondent = button.getAttribute('data-respondent') || 'N/A';
        const incidentType = button.getAttribute('data-type') || 'N/A';
        const incidentDate = button.getAttribute('data-date') || 'N/A';
        const location = button.getAttribute('data-location') || 'N/A';
        const narrative = button.getAttribute('data-narrative') || 'No narrative provided';
        const remarks = button.getAttribute('data-remarks') || '—';
        
        const formattedDate = incidentDate !== 'N/A' 
            ? new Date(incidentDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : 'N/A';
        
        const html = `
            <div class="modal-section-title">Complainant Information</div>
            <div class="form-group">
                <label>Complainant Name</label>
                <input type="text" value="${escapeHtml(complainant)}" readonly>
            </div>
            <div class="form-group">
                <label>Contact Information</label>
                <input type="text" value="${escapeHtml(contact)}" readonly>
            </div>

            <div class="modal-section-title">Respondent</div>
            <div class="form-group">
                <label>Respondent Name</label>
                <input type="text" value="${escapeHtml(respondent)}" readonly>
            </div>

            <div class="modal-section-title">Incident Information</div>
            <div class="form-row">
                <div class="form-group">
                    <label>Incident Type</label>
                    <input type="text" value="${escapeHtml(incidentType)}" readonly>
                </div>
                <div class="form-group">
                    <label>Incident Date</label>
                    <input type="text" value="${escapeHtml(formattedDate)}" readonly>
                </div>
            </div>
            <div class="form-group">
                <label>Incident Location</label>
                <input type="text" value="${escapeHtml(location)}" readonly>
            </div>
            <div class="form-group">
                <label>Narrative</label>
                <textarea rows="3" readonly>${escapeHtml(narrative)}</textarea>
            </div>

            <div class="modal-section-title">Employee Notes</div>
            <div class="form-group">
                <label>Remarks</label>
                <textarea rows="2" readonly placeholder="No remarks">${escapeHtml(remarks)}</textarea>
            </div>
        `;
        document.getElementById('viewModalBody').innerHTML = html;
        document.getElementById('viewModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeViewModal() {
        document.getElementById('viewModal').style.display = 'none';
        document.body.style.overflow = '';
    }

    function openEditModal(button) {
        const id = button.getAttribute('data-id');
        const complainant = button.getAttribute('data-complainant') || '';
        const contact = button.getAttribute('data-contact') || '';
        const respondent = button.getAttribute('data-respondent') || '';
        const type = button.getAttribute('data-type') || '';
        const date = button.getAttribute('data-date') || '';
        const location = button.getAttribute('data-location') || '';
        const narrative = button.getAttribute('data-narrative') || '';
        const remarks = button.getAttribute('data-remarks') || '';

        document.getElementById('edit-id').value = id;
        document.getElementById('edit-complainant').value = complainant;
        document.getElementById('edit-contact').value = contact;
        document.getElementById('edit-respondent').value = respondent;
        document.getElementById('edit-type').value = type;
        document.getElementById('edit-date').value = date;
        document.getElementById('edit-location').value = location;
        document.getElementById('edit-narrative').value = narrative;
        document.getElementById('edit-remarks').value = remarks;

        document.querySelectorAll('#editForm .field-error').forEach(e => e.style.display = 'none');
        document.querySelectorAll('#editForm .input-error').forEach(e => e.classList.remove('input-error'));

        document.getElementById('editModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        document.body.style.overflow = '';
    }

    function submitEditForm() {
        const required = [
            { id: 'edit-complainant', err: 'err-edit-complainant' },
            { id: 'edit-contact', err: 'err-edit-contact' },
            { id: 'edit-respondent', err: 'err-edit-respondent' },
            { id: 'edit-type', err: 'err-edit-type' },
            { id: 'edit-date', err: 'err-edit-date' },
            { id: 'edit-location', err: 'err-edit-location' },
            { id: 'edit-narrative', err: 'err-edit-narrative' }
        ];
        let valid = true;
        required.forEach(f => {
            const el = document.getElementById(f.id);
            const err = document.getElementById(f.err);
            if (!el.value.trim()) {
                el.classList.add('input-error');
                err.style.display = 'block';
                valid = false;
            } else {
                el.classList.remove('input-error');
                err.style.display = 'none';
            }
        });
        if (valid) {
            const form = document.getElementById('editForm');
            const id = document.getElementById('edit-id').value;
            const formData = new FormData(form);
            
            const submitBtn = document.getElementById('btnSubmitEditForm');
            submitBtn.textContent = 'Saving...';
            submitBtn.disabled = true;
            pollSuppressed = true;
            
            fetch('/requests-blotter/' + id + '/update', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (response.ok) {
                    closeEditModal();
                    showSuccess('Blotter record updated successfully!');
                } else {
                    showError('Failed to update blotter record. Please try again.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showError('Failed to update blotter record. Please try again.');
            })
            .finally(() => {
                submitBtn.textContent = 'Save Changes';
                submitBtn.disabled = false;
            });
        }
    }

    function openAddBlotterModal() {
        document.getElementById('addForm').reset();
        document.querySelectorAll('#addForm .field-error').forEach(e => e.style.display = 'none');
        document.querySelectorAll('#addForm .input-error').forEach(e => e.classList.remove('input-error'));
        document.getElementById('addModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeAddModal() {
        document.getElementById('addModal').style.display = 'none';
        document.body.style.overflow = '';
    }

    function submitAddForm() {
        const required = [
            { id: 'add-complainant', err: 'err-add-complainant' },
            { id: 'add-contact', err: 'err-add-contact' },
            { id: 'add-respondent', err: 'err-add-respondent' },
            { id: 'add-type', err: 'err-add-type' },
            { id: 'add-date', err: 'err-add-date' },
            { id: 'add-location', err: 'err-add-location' },
            { id: 'add-narrative', err: 'err-add-narrative' }
        ];
        let valid = true;
        required.forEach(f => {
            const el = document.getElementById(f.id);
            const err = document.getElementById(f.err);
            if (!el.value.trim()) {
                el.classList.add('input-error');
                err.style.display = 'block';
                valid = false;
            } else {
                el.classList.remove('input-error');
                err.style.display = 'none';
            }
        });
        if (valid) {
            const form = document.getElementById('addForm');
            const formData = new FormData(form);
            
            const submitBtn = document.getElementById('btnSubmitAddForm');
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;
            pollSuppressed = true;
            
            fetch('/requests-blotter/submit', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (response.ok) {
                    closeAddModal();
                    showSuccess('Blotter record created successfully!');
                } else {
                    showError('Failed to create blotter record. Please try again.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showError('Failed to create blotter record. Please try again.');
            })
            .finally(() => {
                submitBtn.textContent = 'Submit Blotter';
                submitBtn.disabled = false;
            });
        }
    }

    function exportToPDF() {
        const exportedBy = document.getElementById('currentUserName')?.value || 'Unknown User';
        const table = document.querySelector('table');
        if (!table) return;

        const title = 'Blotter Records';
        const excludedHeaders = ['Status', ''];

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
        const bodyRows = document.querySelectorAll('#blotter-table-body tr');
        bodyRows.forEach(tr => {
            if (tr.style.display === 'none') return;
            if (tr.querySelector('td[colspan]')) return;
            const cells = tr.querySelectorAll('td');
            const rowData = [];
            includedIndexes.forEach(i => {
                rowData.push(cells[i] ? cells[i].textContent.trim() : '');
            });
            rows.push(rowData);
        });

        const wideColumns = ['Location'];

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
            filename: `Blotter_Records_${new Date().toISOString().split('T')[0]}.pdf`,
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
                showError('Error generating PDF. Please try again.');
                if (exportBtn) {
                    exportBtn.innerHTML = originalText;
                    exportBtn.disabled = false;
                }
            });
    }

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
        document.getElementById('sysErrorMessage').innerHTML = message;
        document.getElementById('sysErrorOverlay').classList.add('show');
    }

    function closeSysError() {
        document.getElementById('sysErrorOverlay').classList.remove('show');
        pollSuppressed = false;
    }

    function startPolling() {
        let lastSnapshot = '';
        function isModalOpen() {
            if (pollSuppressed) return true;
            let modals = ['viewModal', 'editModal', 'addModal'];
            return modals.some(function(id) {
                let el = document.getElementById(id);
                return el && el.style.display === 'block';
            });
        }
        function poll() {
            if (isModalOpen()) return;
            fetch('/requests-blotter/api/poll?t=' + Date.now())
                .then(function(res) { return res.ok ? res.json() : null; })
                .then(function(data) {
                    if (!data) return;
                    var snapshot = JSON.stringify(data);
                    if (lastSnapshot === '') { lastSnapshot = snapshot; }
                    else if (snapshot !== lastSnapshot) { location.reload(); }
                })
                .catch(function() {});
        }
        poll();
        setInterval(poll, 5000);
    }
});