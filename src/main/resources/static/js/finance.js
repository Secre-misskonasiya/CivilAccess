document.addEventListener('DOMContentLoaded', function() {
    // --- Modal Helpers ---
    window.showSuccess = function(message) {
        var successMessageEl = document.getElementById('successMessage');
        if (successMessageEl) successMessageEl.innerHTML = message;
        var modalEl = document.getElementById('successModal');
        if (!modalEl) return;
        var successModal = new bootstrap.Modal(modalEl);
        successModal.show();
    }

    window.showError = function(message) {
        var errMsgEl = document.getElementById('sysErrorMessage');
        if (errMsgEl) errMsgEl.innerHTML = message;
        var overlay = document.getElementById('sysErrorOverlay');
        if (overlay) overlay.classList.add('show');
    }

    window.showConfirm = function(message, title, onConfirm) {
        var confirmModalId = 'dynamicConfirmModal_' + Date.now();
        var confirmModalHtml = `
            <div id="${confirmModalId}" class="modal fade" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content" style="border-radius: 16px;">
                        <div class="modal-header" style="background: linear-gradient(135deg, #2d4a44, #3d6b63);">
                            <h5 class="modal-title" style="color: white;">${title}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" style="padding: 24px; font-size: 15px; color:#333;">
                            ${message}
                        </div>
                        <div class="modal-footer" style="border-top: none; padding: 16px 24px;">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="confirmOkBtn_${confirmModalId}" style="background-color: #2d4a44; border-color: #2d4a44;">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.querySelectorAll('[id^="dynamicConfirmModal_"]').forEach(function(modal) { modal.remove(); });
        document.body.insertAdjacentHTML('beforeend', confirmModalHtml);
        var modalEl = document.getElementById(confirmModalId);
        var modal = new bootstrap.Modal(modalEl);

        document.getElementById('confirmOkBtn_' + confirmModalId).onclick = function() {
            modal.hide();
            onConfirm();
        };

        modalEl.addEventListener('hidden.bs.modal', function() { modalEl.remove(); });
        modal.show();
    }

    // --- Global Event Bindings ---
    
    // Error Modal Close
    document.getElementById('sysErrorOkBtn').addEventListener('click', function() {
        document.getElementById('sysErrorOverlay').classList.remove('show');
    });

    // Success/Error Toasts on Load
    if (window._th_success) { window.showSuccess(window._th_success); }
    if (window._th_error) { window.showError(window._th_error); }

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById('tab-' + tabName).classList.add('active');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            window.location.hash = tabName;
        });
    });

    if (window.location.hash) {
        var tab = window.location.hash.substring(1);
        if (['dashboard', 'income', 'expenses', 'budget', 'archive'].includes(tab)) {
            document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.click();
        }
    }

    // Confirm Links
    document.body.addEventListener('click', function(e) {
        const link = e.target.closest('.btn-confirm-nav');
        if (link) {
            e.preventDefault();
            const msg = link.getAttribute('data-msg');
            const title = link.getAttribute('data-title') || 'Confirm Action';
            window.showConfirm(msg, title, function() {
                window.location.href = link.getAttribute('href');
            });
        }
        if (e.target.closest('.btn-assistance-archive')) {
            openAssistanceModal();
        }
    });

    // Income Form
    document.getElementById('incomeTypeSelect')?.addEventListener('change', function() {
        const docDiv = document.getElementById('documentTypeDiv');
        const rentalDiv = document.getElementById('rentalItemDiv');
        if (docDiv) docDiv.style.display = (this.value === 'DOCUMENT_FEE') ? 'block' : 'none';
        if (rentalDiv) rentalDiv.style.display = (this.value === 'RENTAL') ? 'block' : 'none';
    });

    document.getElementById('btnSaveIncome')?.addEventListener('click', function() {
        const form = document.getElementById('incomeForm');
        if (!form.checkValidity()) { form.reportValidity(); return; }
        window.showConfirm('Save this income record?', 'Save Income', function() { form.submit(); });
    });

    document.getElementById('btnSaveExpense')?.addEventListener('click', function() {
        const form = document.getElementById('expenseForm');
        if (!form.checkValidity()) { form.reportValidity(); return; }
        window.showConfirm('Save this expense record?', 'Save Expense', function() { form.submit(); });
    });

    // Export Buttons
    document.querySelectorAll('.btn-export-table').forEach(btn => {
        btn.addEventListener('click', function() {
            const tbody = this.getAttribute('data-tbody');
            const title = this.getAttribute('data-title');
            const headers = JSON.parse(this.getAttribute('data-headers'));
            exportTablePDF(tbody, title, headers);
        });
    });

    // Tab Filters
    setupIncomeFilters();
    setupExpenseFilters();
    setupArchiveFilters();

    // Budget Modal
    setupBudgetModal();

    // Dashboard Filter
    setupDashboardFilter();
});

// --- Helper Functions ---

function getTabDateRange(period) {
    var now = new Date();
    var start, end;
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    if (period === 'day') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === 'week') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 0, 0, 0);
    } else if (period === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'year') {
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else {
        start = new Date('1900-01-01'); end = new Date('2999-12-31');
    }
    return { start: start, end: end };
}

function rowInDateRange(row, range) {
    var d = row.getAttribute('data-date');
    if (!d) return true;
    var rowDate = new Date(d + 'T00:00:00');
    return rowDate >= range.start && rowDate <= range.end;
}

function setupIncomeFilters() {
    let period = 'month';
    function filter() {
        const search = (document.getElementById('incomeSearch')?.value || '').toLowerCase();
        const type = document.getElementById('incomeTypeFilter')?.value || '';
        const range = getTabDateRange(period);
        document.querySelectorAll('#incomeTableBody tr').forEach(row => {
            if (row.cells.length < 5) return;
            const source = row.cells[2]?.textContent.toLowerCase() || '';
            const orNum = row.cells[1]?.textContent.toLowerCase() || '';
            const rowType = row.getAttribute('data-type') || '';
            const match = (!search || source.includes(search) || orNum.includes(search)) && 
                          (!type || rowType === type) && 
                          rowInDateRange(row, range);
            row.style.display = match ? '' : 'none';
        });
    }
    document.getElementById('incomeSearch')?.addEventListener('keyup', filter);
    document.getElementById('incomeTypeFilter')?.addEventListener('change', filter);
    document.getElementById('incomePeriodFilter')?.addEventListener('change', function() {
        period = this.value;
        filter();
    });
    filter();
}

function setupExpenseFilters() {
    let period = 'month';
    let status = 'all';
    function filter() {
        const search = (document.getElementById('expenseSearch')?.value || '').toLowerCase();
        const range = getTabDateRange(period);
        document.querySelectorAll('#expenseTableBody tr').forEach(row => {
            if (row.cells.length < 5) return;
            const rowStatus = row.getAttribute('data-status') || '';
            const desc = row.cells[1]?.textContent.toLowerCase() || '';
            const match = (status === 'all' || rowStatus === status) && 
                          (!search || desc.includes(search)) && 
                          rowInDateRange(row, range);
            row.style.display = match ? '' : 'none';
        });
    }
    document.querySelectorAll('.nav-link[data-status]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            status = this.getAttribute('data-status');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            filter();
        });
    });
    document.getElementById('expenseSearch')?.addEventListener('keyup', filter);
    document.getElementById('expensePeriodFilter')?.addEventListener('change', function() {
        period = this.value;
        filter();
    });
    filter();
}

function setupArchiveFilters() {
    function filterIncome() {
        const search = (document.getElementById('archivedIncomeSearch')?.value || '').toLowerCase();
        const type = document.getElementById('archivedIncomeTypeFilter')?.value || '';
        document.querySelectorAll('#archivedIncomeTableBody tr').forEach(row => {
            if (row.cells.length < 5) return;
            const source = row.cells[2]?.textContent.toLowerCase() || '';
            const orNum = row.cells[1]?.textContent.toLowerCase() || '';
            const rowType = row.getAttribute('data-type') || '';
            const match = (!search || source.includes(search) || orNum.includes(search)) && (!type || rowType === type);
            row.style.display = match ? '' : 'none';
        });
    }
    function filterExpense() {
        const search = (document.getElementById('archivedExpenseSearch')?.value || '').toLowerCase();
        const status = document.getElementById('archivedExpenseStatusFilter')?.value || '';
        document.querySelectorAll('#archivedExpenseTableBody tr').forEach(row => {
            if (row.cells.length < 5) return;
            const desc = row.cells[1]?.textContent.toLowerCase() || '';
            const rowStatus = row.getAttribute('data-status') || '';
            const match = (!search || desc.includes(search)) && (!status || rowStatus === status);
            row.style.display = match ? '' : 'none';
        });
    }
    document.getElementById('archivedIncomeSearch')?.addEventListener('keyup', filterIncome);
    document.getElementById('archivedIncomeTypeFilter')?.addEventListener('change', filterIncome);
    document.getElementById('archivedExpenseSearch')?.addEventListener('keyup', filterExpense);
    document.getElementById('archivedExpenseStatusFilter')?.addEventListener('change', filterExpense);
}

async function exportTablePDF(tbodyId, title, headers) {
    var exportedBy = document.getElementById('currentUserName')?.value || 'Unknown User';
    var rows = document.querySelectorAll('#' + tbodyId + ' tr');
    var tableRows = '';
    var rowIndex = 0;
    rows.forEach(function(row) {
        if (row.style.display === 'none') return;
        if (row.cells.length < 2) return;
        var bg = rowIndex % 2 === 0 ? 'white' : '#f5faf8';
        tableRows += '<tr style="background:' + bg + ';">';
        for (var i = 0; i < row.cells.length - 1; i++) {
            var txt = (row.cells[i].textContent || '').trim();
            var isAmt = txt.startsWith('₱');
            tableRows += '<td style="border:1px solid #ddd;padding:7px 8px;font-size:11px;' + (isAmt ? 'text-align:right;font-weight:bold;' : '') + '">' + txt + '</td>';
        }
        tableRows += '</tr>';
        rowIndex++;
    });

    var headerCells = headers.map(function(h) {
        var isWide = h === 'Description' || h === 'Source';
        return '<th style="background:#2d4a44;color:white;padding:8px;font-size:11px;border:1px solid #1a3530;text-align:left;' + (isWide ? 'min-width:160px;' : 'white-space:nowrap;') + '">' + h + '</th>';
    }).join('');

    var bodyContent =
    '<div style="position:relative;text-align:center;padding-bottom:12px;margin-bottom:20px;border-bottom:3px solid #2d4a44;">' +
        '<div style="font-size:22px;font-weight:bold;color:#2d4a44;margin-bottom:4px;">' + title + '</div>' +
        '<div style="font-size:13px;color:#555;">' + new Date().toLocaleString() + '</div>' +
        '<div style="font-size:11px;color:#888;margin-top:2px;">Exported by: <strong style="color:#2d4a44;">' + exportedBy + '</strong></div>' +
    '</div>' +
        '<div style="font-size:13px;font-weight:bold;color:#2d4a44;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #ddd;">' +
            title + ' <span style="font-weight:normal;font-size:11px;color:#888;">(' + (tableRows ? rows.length : 0) + ' records)</span>' +
        '</div>' +
        '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;table-layout:auto;">' +
            '<thead><tr>' + headerCells + '</tr></thead>' +
            '<tbody>' + (tableRows || '<tr><td colspan="' + headers.length + '" style="border:1px solid #ddd;padding:20px;text-align:center;color:#aaa;font-size:12px;">No records</td></tr>') + '</tbody>' +
        '</table>';

    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'font-family:Arial,sans-serif;padding:36px;background:white;color:#222;';
    wrapper.innerHTML = bodyContent;

    var opt = {
        margin: [0.3, 0.3, 0.3, 0.3],
        filename: title.replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    try {
        await html2pdf().set(opt).from(wrapper).save();
        showSuccess('PDF downloaded!');
    } catch (err) {
        console.error('PDF generation error:', err);
        showError('PDF error: ' + err.message);
    }
}

// --- Budget Modal Logic ---
let _budgetMode = 'increase';

function setupBudgetModal() {
    const modal1 = document.getElementById('budgetModal1');
    const modal2 = document.getElementById('budgetModal2');
    
    document.getElementById('btnOpenBudgetModal')?.addEventListener('click', function() {
        _budgetMode = 'increase';
        document.getElementById('budgetStep1Input').value = '';
        document.getElementById('budgetReasonInput').value = '';
        document.getElementById('budgetReasonError').style.display = 'none';
        document.querySelectorAll('input[name="budgetAdjustType"]').forEach(r => r.checked = (r.value === 'increase'));
        modal1.style.display = 'flex';
    });

    document.getElementById('btnCloseBudgetModal1')?.addEventListener('click', function() {
        modal1.style.display = 'none';
    });
    
    document.getElementById('btnBackToStep1')?.addEventListener('click', function() {
        modal2.style.display = 'none';
        modal1.style.display = 'flex';
    });

    document.getElementById('budgetModal1NextBtn')?.addEventListener('click', function() {
        const checkedRadio = document.querySelector('input[name="budgetAdjustType"]:checked');
        if (checkedRadio) _budgetMode = checkedRadio.value;
        
        const amount = document.getElementById('budgetStep1Input').value;
        const reason = document.getElementById('budgetReasonInput').value.trim();
        
        if (!amount || parseFloat(amount) <= 0) {
            showError('Please enter a valid amount.');
            return;
        }
        if (!reason) {
            document.getElementById('budgetReasonError').style.display = 'block';
            return;
        }
        document.getElementById('budgetReasonError').style.display = 'none';

        const sign = _budgetMode === 'increase' ? '+' : '−';
        const color = _budgetMode === 'increase' ? '#27ae60' : '#e74c3c';
        document.getElementById('budgetConfirmDisplay').innerHTML = '<span style="color:' + color + ';">' + sign + ' ₱' + parseFloat(amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</span>';
        document.getElementById('budgetConfirmReasonDisplay').textContent = reason;
        document.getElementById('budgetModal2Title').innerHTML = _budgetMode === 'increase' ? '<i class="bi bi-shield-check me-2"></i>Confirm Increase' : '<i class="bi bi-shield-check me-2"></i>Confirm Decrease';
        
        document.getElementById('budgetStep2Input').value = '';
        document.getElementById('budgetMismatchError').style.display = 'none';
        modal1.style.display = 'none';
        modal2.style.display = 'flex';
    });

    document.getElementById('btnSubmitBudget')?.addEventListener('click', function() {
        const amount1 = parseFloat(document.getElementById('budgetStep1Input').value);
        const amount2 = parseFloat(document.getElementById('budgetStep2Input').value);
        if (isNaN(amount2) || amount1 !== amount2) {
            document.getElementById('budgetMismatchError').style.display = 'block';
            return;
        }
        document.getElementById('budgetMismatchError').style.display = 'none';

        const currentTotal = parseFloat(window._th_totalBudget) || 0;
        const newTotal = _budgetMode === 'increase' ? (currentTotal + amount1) : (currentTotal - amount1);

        if (newTotal < 0) {
            showError('Decrease amount cannot exceed the current total budget.');
            return;
        }

        document.getElementById('budgetFinalAmount').value = newTotal;
        document.getElementById('budgetAdjustmentAmount').value = amount1;
        document.getElementById('budgetAdjustmentType').value = _budgetMode;
        document.getElementById('budgetAdjustmentReason').value = document.getElementById('budgetReasonInput').value.trim();
        document.getElementById('budgetUpdateForm').submit();
    });

    // Close on backdrop click
    modal1?.addEventListener('click', function(e) { if (e.target === this) modal1.style.display = 'none'; });
    modal2?.addEventListener('click', function(e) { if (e.target === this) modal2.style.display = 'none'; });
}

// --- Dashboard Filter Logic ---
function setupDashboardFilter() {
    let dashIncomeChart = null;
    let dashExpenseChart = null;
    let currentPeriod = 'month';
    
    const allIncomeList = window._th_incomeList || [];
    const allExpenseList = window._th_expenseList || [];
    
    const incomeColors = ['#27ae60','#1abc9c','#2ecc71','#16a085','#0e6655','#27ae60'];
    const expenseColors = ['#e74c3c','#c0392b','#e67e22','#d35400','#922b21','#78281f','#f1948a','#aaa'];

    function parseAmt(v) { return parseFloat(v) || 0; }
    function formatPHP(v) { return '₱' + parseAmt(v).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2}); }
    
    function getDateRange(period) {
        let now = new Date(), start, end;
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        if (period === 'day') start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        else if (period === 'week') start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 0, 0, 0);
        else if (period === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0); end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); }
        else if (period === 'year') { start = new Date(now.getFullYear(), 0, 1, 0, 0, 0); end = new Date(now.getFullYear(), 11, 31, 23, 59, 59); }
        else { start = new Date('1900-01-01'); end = new Date('2999-12-31'); }
        return { start, end };
    }

    function periodLabel(period, startDate, endDate) {
        let opts = { year:'numeric', month:'short', day:'numeric' };
        if (period === 'day') return 'Today';
        if (period === 'week') return 'This Week';
        if (period === 'month') return 'Current Month';
        if (period === 'year') return 'This Year';
        if (period === 'all') return 'All Time';
        if (period === 'custom' && startDate && endDate) return startDate.toLocaleDateString('en-PH', opts) + ' – ' + endDate.toLocaleDateString('en-PH', opts);
        return '';
    }

    function inRange(dateStr, start, end) {
        if (!dateStr) return false;
        let d = new Date(dateStr + 'T00:00:00');
        return d >= start && d <= end;
    }

    function groupByType(list, typeKey) {
        let map = {};
        list.forEach(item => {
            let t = (item[typeKey] || 'Other').replace(/_/g,' ');
            t = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
            map[t] = (map[t] || 0) + parseAmt(item.amount);
        });
        return map;
    }

    function rebuildChart(canvasId, wrapId, labels, values, colors, label, existingChart) {
        let canvas = document.getElementById(canvasId);
        let wrap = document.getElementById(wrapId);
        if (!canvas || !wrap) return null;
        if (existingChart) existingChart.destroy();
        if (!labels || labels.length === 0) {
            wrap.innerHTML = '<p style="color:#aaa;text-align:center;padding:50px 0;font-size:13px;">No data for this period</p>';
            return null;
        }
        if (!wrap.querySelector('canvas')) {
            wrap.innerHTML = '<canvas id="' + canvasId + '" style="position:absolute;inset:0;width:100%!important;height:100%!important;"></canvas>';
            canvas = document.getElementById(canvasId);
        }
        let ctx = canvas.getContext('2d');
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{ label: label, data: values, backgroundColor: colors, borderRadius: 6, borderWidth: 0 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } }
            }
        });
    }

    function applyFilter(period, start, end) {
        let filteredIncome = allIncomeList.filter(r => inRange(r.incomeDate, start, end));
        let filteredExpense = allExpenseList.filter(r => inRange(r.expenseDate, start, end));

        let totalInc = filteredIncome.reduce((s,r) => s + parseAmt(r.amount), 0);
        let totalExp = filteredExpense.reduce((s,r) => s + parseAmt(r.amount), 0);
        let netSav = totalInc - totalExp;
        let title = periodLabel(period, start, end).replace('Current ', '').replace('This ', '');

        document.getElementById('dashIncomeLabel').innerHTML = '<i class="bi bi-graph-up"></i> Income — ' + title;
        document.getElementById('dashExpenseLabel').innerHTML = '<i class="bi bi-graph-down"></i> Expenses — ' + title;
        document.getElementById('dashSavingsLabel').innerHTML = '<i class="bi bi-piggy-bank"></i> Net Savings — ' + title;
        
        document.getElementById('dashIncomeAmt').textContent = formatPHP(totalInc);
        document.getElementById('dashExpenseAmt').textContent = formatPHP(totalExp);
        document.getElementById('dashSavingsAmt').textContent = formatPHP(netSav);
        document.getElementById('dashSavingsAmt').className = 'stat-amount ' + (netSav >= 0 ? 'text-success' : 'text-danger');

        document.getElementById('incomeChartTitle').innerHTML = '<i class="bi bi-bar-chart"></i> Income Breakdown — ' + title;
        document.getElementById('expenseChartTitle').innerHTML = '<i class="bi bi-bar-chart"></i> Expenses by Category — ' + title;

        let incByType = groupByType(filteredIncome, 'incomeType');
        let expByType = groupByType(filteredExpense, 'expenseType');
        dashIncomeChart = rebuildChart('incomeChart', 'incomeChartWrap', Object.keys(incByType), Object.values(incByType), incomeColors, 'Amount (₱)', dashIncomeChart);
        dashExpenseChart = rebuildChart('expenseChart', 'expenseChartWrap', Object.keys(expByType), Object.values(expByType), expenseColors, 'Amount (₱)', dashExpenseChart);

        document.getElementById('dashPeriodLabel').textContent = 'Showing: ' + periodLabel(period, start, end);
    }

    // Bind Period Buttons
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const period = this.getAttribute('data-period');
            currentPeriod = period;
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const customInputs = document.getElementById('customRangeInputs');
            if (period === 'custom') {
                customInputs.classList.add('visible');
                return;
            } else {
                customInputs.classList.remove('visible');
            }
            
            let range = getDateRange(period);
            applyFilter(period, range.start, range.end);
        });
    });

    // Bind Custom Range Apply
    document.getElementById('btnApplyCustomRange')?.addEventListener('click', function() {
        let s = document.getElementById('dashCustomStart').value;
        let e = document.getElementById('dashCustomEnd').value;
        if (!s || !e) { showError('Please select both start and end dates.'); return; }
        let start = new Date(s + 'T00:00:00');
        let end = new Date(e + 'T23:59:59');
        if (start > end) { showError('Start date must be before end date.'); return; }
        applyFilter('custom', start, end);
    });

    // Initial Load
    let range = getDateRange('month');
    applyFilter('month', range.start, range.end);
}