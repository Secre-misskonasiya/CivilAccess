// Barangay San Sebastian, Kawit boundary polygon
const SAN_SEBASTIAN_POLYGON = [
    [14.418865, 120.886515],
    [14.418666, 120.887862], [14.418969, 120.887902],
    [14.419010, 120.889089], [14.419495, 120.890312],
    [14.419868, 120.891458], [14.421015, 120.892997],
    [14.420850, 120.894121], [14.421649, 120.895839],
    [14.422202, 120.897952], [14.423068, 120.897849],
    [14.423119, 120.901125], [14.424041, 120.901272],
    [14.424003, 120.901537], [14.423712, 120.901693],
    [14.423442, 120.901698], [14.422226, 120.902297],
    [14.421938, 120.902353], [14.421616, 120.902259],
    [14.421310, 120.901863], [14.421144, 120.901766],
    [14.420634, 120.901951], [14.420445, 120.901895],
    [14.420210, 120.902035], [14.420090, 120.902842],
    [14.419753, 120.902879], [14.419026, 120.902860],
    [14.419009, 120.903096], [14.418809, 120.903301],
    [14.418490, 120.902674], [14.418246, 120.902392],
    [14.417720, 120.901458], [14.416779, 120.900345],
    [14.415834, 120.899736], [14.414386, 120.896173],
    [14.413767, 120.895386], [14.411402, 120.895039],
    [14.410154, 120.894599], [14.409451, 120.893831],
    [14.408851, 120.892746],
    [14.409384, 120.892449], [14.409930, 120.891833],
    [14.410030, 120.891627], [14.411015, 120.890809],
    [14.411201, 120.890131], [14.411176, 120.889748],
    [14.411426, 120.889479], [14.411647, 120.889479],
    [14.414170, 120.887581], [14.415289, 120.887273],
    [14.415541, 120.886679], [14.415663, 120.886825],
    [14.418853, 120.886512]
];

let currentStep = 0;
const TOTAL_STEPS = 3;
const STEP_LABELS = [
    'Step 1 of 3 — Basic Profile',
    'Step 2 of 3 — Residency & Social',
    'Step 3 of 3 — Health & Safety'
];

let censusPinMap = null;
let censusPinMarker = null;
let censusMapInitialized = false;

let activeStatusFilter = '';
let _dupProceedCallback = null;
let _dupExistingBtn = null;

document.addEventListener('DOMContentLoaded', () => {
    // Attach UI Bindings
    document.getElementById('censusSearch').addEventListener('input', applySearch);
    document.getElementById('toggleStatusFilterBtn').addEventListener('click', toggleStatusFilter);
    document.getElementById('btnOpenCreateModal')?.addEventListener('click', openCreateModal);
    document.getElementById('closeCensusModalBtn')?.addEventListener('click', closeCensusModal);
    document.getElementById('btnPrev')?.addEventListener('click', () => navStep(-1));
    document.getElementById('btnNext')?.addEventListener('click', () => navStep(1));
    
    // Tab switching
    document.getElementById('tab-active-btn').addEventListener('click', () => switchTab('active'));
    document.getElementById('tab-archived-btn')?.addEventListener('click', () => switchTab('archived'));

    // Filter options
    document.querySelectorAll('.filter-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            const val = e.target.getAttribute('data-status');
            const label = e.target.getAttribute('data-label');
            applyStatusFilter(val, label);
        });
    });

    // View/Edit/Archive Actions
    document.querySelectorAll('.btn-view-record').forEach(btn => btn.addEventListener('click', (e) => viewRecord(e.target)));
    document.querySelectorAll('.btn-edit-record').forEach(btn => btn.addEventListener('click', (e) => editRecord(e.target)));
    document.querySelectorAll('.btn-archive-record').forEach(btn => btn.addEventListener('click', (e) => triggerArchive(e.target)));
    document.querySelectorAll('.btn-restore-record').forEach(btn => btn.addEventListener('click', (e) => triggerRestore(e.target)));
    
    document.querySelectorAll('.btn-view-household').forEach(btn => btn.addEventListener('click', (e) => openHouseholdModal(e.target)));
    document.querySelectorAll('.btn-add-household-member').forEach(btn => btn.addEventListener('click', (e) => addHouseholdMember(e.target)));
    
    document.querySelectorAll('.btn-assistance-archive').forEach(btn => btn.addEventListener('click', openAssistanceModal));
    document.querySelectorAll('.btn-assistance-restore').forEach(btn => btn.addEventListener('click', openAssistanceModal));

    // Modals
    document.getElementById('closeViewModalBtn').addEventListener('click', closeViewModal);
    document.getElementById('btnCloseViewModal').addEventListener('click', closeViewModal);
    document.getElementById('closeHouseholdModalBtn').addEventListener('click', closeHouseholdModal);
    document.getElementById('btnCloseHousehold').addEventListener('click', closeHouseholdModal);
    document.getElementById('btnCloseConfirm').addEventListener('click', closeConfirmModal);
    document.getElementById('closeImageEnlargeBtn').addEventListener('click', closeImageEnlarge);
    document.getElementById('enlargedImage').addEventListener('click', closeImageEnlarge);
    document.getElementById('btnCancelDuplicate').addEventListener('click', closeDuplicateModal);
    document.getElementById('btnEditExisting').addEventListener('click', duplicateEditExisting);
    document.getElementById('btnProceedDuplicate').addEventListener('click', duplicateProceed);

    document.getElementById('hm_add_btn')?.addEventListener('click', addHouseholdMemberFromModal);

    // Form dynamic actions
    document.getElementById('f_dob').addEventListener('change', () => {
        calcAge();
        applyRelationRestrictions();
    });
    
    document.querySelectorAll('.cs-btn').forEach(btn => {
        btn.addEventListener('click', (e) => setCensusStatus(e.target, e.target.getAttribute('data-cs')));
    });
    
    document.querySelectorAll('.s-btn:not(.cs-btn)').forEach(btn => {
        btn.addEventListener('click', (e) => setStatus(e.target, e.target.getAttribute('data-acct')));
    });

    document.querySelectorAll('.v-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggleVacc(e.target, e.target.getAttribute('data-vacc'), e.target.getAttribute('data-val'));
        });
    });

    document.getElementById('uploadZoneId').addEventListener('click', () => document.getElementById('f_idfile').click());
    document.getElementById('uploadZoneSelfie').addEventListener('click', () => document.getElementById('f_selfie').click());
    
    document.getElementById('f_idfile').addEventListener('change', () => previewFile('f_idfile','f_idfile_prev','f_idfile_lbl'));
    document.getElementById('f_selfie').addEventListener('change', () => previewFile('f_selfie','f_selfie_prev','f_selfie_lbl'));

    document.getElementById('btnUseLocation').addEventListener('click', useCurrentLocation);
    document.getElementById('btnSearchAddress').addEventListener('click', searchAddressOnMap);

    // Map Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const m = document.getElementById('imageEnlargeModal');
            if (m && m.style.display === 'block') closeImageEnlarge();
        }
    });

    // Start Pagination & Summary
    initPagination('active-table', 'footer-active');
    initPagination('archived-table', 'footer-archived');
    renderCensusSummary();
});

function switchTab(tab) {
    const activeDiv = document.getElementById('tab-active');
    const archivedDiv = document.getElementById('tab-archived');
    const activeBtn = document.getElementById('tab-active-btn');
    const archivedBtn = document.getElementById('tab-archived-btn');
    
    if (tab === 'active') {
        activeDiv.style.display = 'block';
        archivedDiv.style.display = 'none';
        activeBtn.classList.add('active');
        archivedBtn.classList.remove('active');
    } else {
        activeDiv.style.display = 'none';
        archivedDiv.style.display = 'block';
        activeBtn.classList.remove('active');
        archivedBtn.classList.add('active');
    }
}

function toggleStatusFilter(e) {
    e.stopPropagation();
    const dd = document.getElementById('status-filter-dd');
    dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
}

document.addEventListener('click', () => {
    document.querySelectorAll('.filter-dropdown').forEach(d => d.style.display = 'none');
});

function applyStatusFilter(val, label) {
    activeStatusFilter = val;
    document.getElementById('status-filter-lbl').textContent = label;
    document.getElementById('status-filter-dd').style.display = 'none';
    applySearch();
}

function applySearch() {
    const q = document.getElementById('censusSearch').value.toLowerCase();
    ['active-table', 'archived-table'].forEach(tid => {
        const tbody = document.querySelector('#' + tid + ' tbody');
        if (!tbody) return;
        tbody.querySelectorAll('tr:not(.empty-row)').forEach(row => {
            const name   = (row.getAttribute('data-name')    || '').toLowerCase();
            const addr   = (row.getAttribute('data-address') || '').toLowerCase();
            const rid    = (row.getAttribute('data-id')      || '').toLowerCase();
            const status = (row.getAttribute('data-status')  || '').toUpperCase();
            const matchQ  = !q || name.includes(q) || addr.includes(q) || rid.includes(q);
            const matchSt = !activeStatusFilter || status === activeStatusFilter;
            
            row.dataset.searchMatch = (matchQ && matchSt) ? 'true' : 'false';
        });
    });
    
    if (window.CensusPagination) {
        window.CensusPagination.refresh('active-table');
        window.CensusPagination.refresh('archived-table');
    }
}

// PAGINATION
(function() {
    const PAGE_SIZE = 7;
    const state = {}; 

    function eligibleRows(tbody) {
        return Array.from(tbody.querySelectorAll('tr:not(.empty-row)'))
            .filter(r => r.dataset.searchMatch !== 'false');
    }

    function render(tableId, footerId) {
        const tbody  = document.querySelector('#' + tableId + ' tbody');
        const footer = document.getElementById(footerId);
        if (!tbody || !footer) return;
        if (!state[tableId]) state[tableId] = { page: 1 };
        const s = state[tableId];

        const all   = eligibleRows(tbody);
        const total = all.length;
        const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (s.page > pages) s.page = pages;
        if (s.page < 1) s.page = 1;
        const start = (s.page - 1) * PAGE_SIZE;
        const end   = start + PAGE_SIZE;

        Array.from(tbody.querySelectorAll('tr:not(.empty-row)')).forEach(r => {
            if (r.dataset.searchMatch === 'false') { r.style.display = 'none'; return; }
            const idx = all.indexOf(r);
            r.style.display = (idx >= start && idx < end) ? '' : 'none';
        });

        let html = '<ul class="pagination pagination-sm mb-0">';
        if (s.page > 1)   html += `<li class="page-item"><a class="page-link" href="#" data-a="prev"><i class="bi bi-arrow-left"></i> Prev</a></li>`;
        for (let p = 1; p <= pages; p++)
            html += `<li class="page-item${p === s.page ? ' active' : ''}"><a class="page-link" href="#" data-a="goto" data-p="${p}">${p}</a></li>`;
        if (s.page < pages) html += `<li class="page-item"><a class="page-link" href="#" data-a="next">Next <i class="bi bi-arrow-right"></i></a></li>`;
        html += '</ul>';

        footer.innerHTML = `<span>Showing ${total === 0 ? 0 : start + 1}–${Math.min(end, total)} of ${total}</span><nav>${html}</nav>`;
    }

    function initPagination(tableId, footerId) {
        const tbody  = document.querySelector('#' + tableId + ' tbody');
        const footer = document.getElementById(footerId);
        if (!tbody || !footer) return;
        state[tableId] = { page: 1 };

        footer.addEventListener('click', e => {
            e.preventDefault();
            const a = e.target.closest('a[data-a]');
            if (!a) return;
            const all = eligibleRows(tbody);
            const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
            const s = state[tableId];
            if (a.dataset.a === 'prev' && s.page > 1)          s.page--;
            else if (a.dataset.a === 'next' && s.page < pages) s.page++;
            else if (a.dataset.a === 'goto')                   s.page = +a.dataset.p;
            render(tableId, footerId);
        });

        render(tableId, footerId);
    }

    window.CensusPagination = {
        refresh(tableId) {
            const footerId = tableId === 'active-table' ? 'footer-active' : 'footer-archived';
            if (!state[tableId]) state[tableId] = { page: 1 };
            else state[tableId].page = 1; 
            render(tableId, footerId);
        }
    };

    window.initPagination = initPagination;
})();

// STEPPER
function goStep(n) {
    for (let i = 0; i < TOTAL_STEPS; i++) {
        document.getElementById('step' + i).style.display = i === n ? '' : 'none';
        document.getElementById('ps' + i).className =
            'prog-step' + (i < n ? ' done' : i === n ? ' active' : '');
        document.getElementById('dot' + i).className =
            'dot' + (i < n ? ' done' : i === n ? ' active' : '');
    }
    currentStep = n;
    document.getElementById('btnPrev').style.visibility = n === 0 ? 'hidden' : 'visible';
    const nb = document.getElementById('btnNext');
    nb.textContent = n === TOTAL_STEPS - 1 ? 'Submit ✓' : 'Next →';
    nb.className = 'btn-nav ' + (n === TOTAL_STEPS - 1 ? 'btn-submit-n' : 'btn-next-n');
    document.getElementById('modalStepLabel').textContent = STEP_LABELS[n];
    document.getElementById('formScroll').scrollTop = 0;
    
    if (censusPinMap) {
        setTimeout(() => censusPinMap.invalidateSize(), 300);
    }
}

function navStep(dir) {
    const next = currentStep + dir;
    if (next < 0) return;
    if (next >= TOTAL_STEPS) {
        if (!validateAllRequired()) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        document.getElementById('censusForm').submit();
        return;
    }
    if (dir > 0 && !validateCurrentStep()) {
        showToast('Please fill in all required fields in this step', 'error');
        return;
    }
    if (dir > 0 && next === 1 && document.getElementById('f_isEdit').value === 'false') {
        checkDuplicates(() => {
            checkHouseholdSuggestions();
            goStep(next);
        });
        return; 
    }
    goStep(next);
}

// FORM LOGIC
function openCreateModal() {
    document.getElementById('modalTitle').textContent = 'Add Census Record';
    document.getElementById('f_isEdit').value  = 'false';
    document.getElementById('f_id').value      = '';
    clearForm();
    document.getElementById('f_householdId').value  = '';
    document.getElementById('f_censusStatus').value = 'INCOMPLETE';
    
    const pinBlock = document.getElementById('pinLocationBlock');
    if (pinBlock) pinBlock.style.display = '';
    
    goStep(0);
    document.getElementById('censusModal').style.display = 'block';
    setTimeout(initCensusPinMap, 400);
}

function closeCensusModal() {
    document.getElementById('censusModal').style.display = 'none';
    const banner = document.getElementById('hh-suggest-banner');
    if (banner) banner.remove();
    
    if (censusPinMap) {
        censusPinMap.remove();
        censusPinMap = null;
        censusPinMarker = null;
        censusMapInitialized = false;
    }
}

function editRecord(btn) {
    document.getElementById('modalTitle').textContent = 'Edit Record — ' + btn.getAttribute('data-recordid');
    document.getElementById('f_isEdit').value = 'true';
    document.getElementById('f_id').value     = btn.getAttribute('data-id') || '';
    document.getElementById('f_householdId').value  = btn.getAttribute('data-household') || '';
    document.getElementById('f_censusStatus').value = btn.getAttribute('data-censusstatus') || 'INCOMPLETE';

    setVal('f_fname', btn.getAttribute('data-fname'));
    setVal('f_mname', btn.getAttribute('data-mname'));
    setVal('f_lname', btn.getAttribute('data-lname'));
    setVal('f_mobile', btn.getAttribute('data-mobile'));
    setVal('f_address', btn.getAttribute('data-address'));
    setVal('f_dob', btn.getAttribute('data-dob'));
    setVal('f_nat', btn.getAttribute('data-nationality') || 'Filipino');
    setVal('f_religion', btn.getAttribute('data-religion'));
    setSelectVal('f_gender', btn.getAttribute('data-gender'));
    setSelectVal('f_suffix', btn.getAttribute('data-suffix'));
    setSelectVal('f_civil', btn.getAttribute('data-civil'));
    setSelectVal('f_blood', btn.getAttribute('data-blood'));
    setSelectVal('f_idtype', btn.getAttribute('data-idtype'));
    setVal('f_pob', btn.getAttribute('data-pob'));
    calcAge();

    setSelectVal('f_relation', btn.getAttribute('data-hrel'));
    setSelectVal('f_ownership', btn.getAttribute('data-hown'));
    setSelectVal('f_hoa', btn.getAttribute('data-hoa'));
    setSelectVal('f_dwelling', btn.getAttribute('data-dwelling'));
    setSelectVal('f_educ', btn.getAttribute('data-educ'));
    setVal('f_occupation', btn.getAttribute('data-occupation'));
    setSelectVal('f_employment', btn.getAttribute('data-employment'));
    setSelectVal('f_income', btn.getAttribute('data-income'));
    setVal('f_precinct', btn.getAttribute('data-precinct'));

    document.getElementById('f_senior').checked = btn.getAttribute('data-senior') === 'true';
    document.getElementById('f_pwd').checked    = btn.getAttribute('data-pwd')    === 'true';
    document.getElementById('f_solo').checked   = btn.getAttribute('data-solo')   === 'true';
    document.getElementById('f_ip').checked     = btn.getAttribute('data-ip')     === 'true';
    document.getElementById('f_voter').checked  = btn.getAttribute('data-voter')  === 'true';
    document.getElementById('f_4ps').checked    = btn.getAttribute('data-fourps') === 'true';

    setVal('f_medhist', btn.getAttribute('data-medhist'));
    setVal('f_philhealth', btn.getAttribute('data-philhealth'));
    setSelectVal('f_philcat', btn.getAttribute('data-philcat'));
    setVal('f_bp', btn.getAttribute('data-bp'));
    setSelectVal('f_evac', btn.getAttribute('data-evac'));
    setVal('f_ecname', btn.getAttribute('data-ecname'));
    setVal('f_ecnum', btn.getAttribute('data-ecnum'));
    setVal('f_ecrel', btn.getAttribute('data-ecrel'));

    restoreVacc('f_vacc_covid', btn.getAttribute('data-vaccovid'));
    restoreVacc('f_vacc_flu', btn.getAttribute('data-vaccflu'));
    restoreVacc('f_vacc_hpv', btn.getAttribute('data-vacchpv'));

    window._hhHasHead = false; 
    const hhId = btn.getAttribute('data-household');
    if (hhId) {
        fetch(`/Resident-census/household/${hhId}`)
            .then(r => r.json())
            .then(members => {
                const currentId = btn.getAttribute('data-id');
                window._hhHasHead = members.some(mb =>
                    (mb.householdRelation || '').toLowerCase().includes('head') &&
                    String(mb.id) !== String(currentId)
                );
                applyRelationRestrictions();
            })
            .catch(() => {});
    }
    applyRelationRestrictions();

    const acctStatus = (btn.getAttribute('data-acctstatus') || 'pending').toLowerCase();
    document.querySelectorAll('.s-btn:not(.cs-btn)').forEach(b => b.classList.remove('on'));
    const activeBtn = document.querySelector('.s-btn.' + acctStatus);
    if (activeBtn) activeBtn.classList.add('on');
    document.getElementById('f_accountStatus').value = acctStatus;
    restoreCensusStatus(btn.getAttribute('data-censusstatus'));
    
    const pinBlock = document.getElementById('pinLocationBlock');
    if (pinBlock) pinBlock.style.display = '';
    
    const lat = btn.getAttribute('data-lat');
    const lng = btn.getAttribute('data-lng');
    document.getElementById('f_latitude').value = lat || '';
    document.getElementById('f_longitude').value = lng || '';
    
    goStep(0);
    document.getElementById('censusModal').style.display = 'block';
    
    setTimeout(() => {
        initCensusPinMap();
        if (lat && lng && lat !== 'null' && lng !== 'null') {
            const latNum = parseFloat(lat);
            const lngNum = parseFloat(lng);
            if (!isNaN(latNum) && !isNaN(lngNum)) {
                setPinLocation(latNum, lngNum);
            }
        }
    }, 500);
}

function clearForm() {
    document.getElementById('censusForm').reset();
    document.getElementById('f_age_display').value = '';
    document.getElementById('f_nat').value          = 'Filipino';
    document.getElementById('f_pob').value          = 'Kawit';
    document.getElementById('f_censusStatus').value = 'INCOMPLETE';
    document.getElementById('f_householdId').value  = '';
    window._hhHasHead = false;
    document.querySelectorAll('.s-btn').forEach(b => b.classList.remove('on'));
    document.querySelector('.s-btn.unverified')?.classList.add('on');
    document.getElementById('f_accountStatus').value = 'unverified';
    document.querySelectorAll('.v-btn').forEach(b => b.classList.remove('on'));
    ['f_idfile_prev','f_selfie_prev'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.src = ''; }
    });
    const rel = document.getElementById('f_relation');
    if (rel) {
        Array.from(rel.options).forEach(opt => {
            opt.disabled = false;
            opt.text = opt.text.replace(' (already assigned)', '').replace(' (age restriction: must be 18+)', '');
        });
    }
    document.querySelectorAll('.cs-btn').forEach(b => {
        b.classList.remove('on');
        b.style.background = b.style.color = b.style.borderColor = '';
    });
    const defaultCsBtn = document.querySelector('.cs-btn[data-cs="INCOMPLETE"]');
    if (defaultCsBtn) setCensusStatus(defaultCsBtn, 'INCOMPLETE');
    const banner = document.getElementById('hh-suggest-banner');
    if (banner) banner.remove();
}

function calcAge() {
    const dob = document.getElementById('f_dob').value;
    if (!dob) { document.getElementById('f_age_display').value = ''; return; }
    const b = new Date(dob), t = new Date();
    let age = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
    document.getElementById('f_age_display').value = age >= 0 ? age + ' years old' : '';
}

function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val || ''; }
function setSelectVal(id, val) { const el = document.getElementById(id); if (el && val) el.value = val; }

function setStatus(el, type) {
    document.querySelectorAll('.s-btn:not(.cs-btn)').forEach(b => b.classList.remove('on'));
    el.classList.add('on');
    document.getElementById('f_accountStatus').value = type;
}

function setCensusStatus(el, val) {
    if (val === 'COMPLETE') {
        if (!validateCompleteFields()) {
            showToast('Cannot set to Complete – please fill in all required fields.', 'error');
            return;
        }
    }

    document.querySelectorAll('.cs-btn').forEach(b => {
        b.classList.remove('on');
        b.style.background = '';
        b.style.color = '';
        b.style.borderColor = '';
    });

    el.classList.add('on');
    const styles = {
        INCOMPLETE: { bg:'#fff3cd', color:'#856404', border:'#ffeeba' },
        COMPLETE:   { bg:'#d4edda', color:'#155724', border:'#c3e6cb' },
        PENDING:    { bg:'#cce5ff', color:'#004085', border:'#b8daff' },
        FLAGGED:    { bg:'#f8d7da', color:'#721c24', border:'#f5c6cb' },
    };
    const s = styles[val] || {};
    el.style.background   = s.bg    || '';
    el.style.color        = s.color || '';
    el.style.borderColor  = s.border|| '';
    
    document.getElementById('f_censusStatus').value = val;
}

function restoreCensusStatus(val) {
    const btn = document.querySelector(`.cs-btn[data-cs="${(val||'INCOMPLETE').toUpperCase()}"]`);
    if (btn) setCensusStatus(btn, (val||'INCOMPLETE').toUpperCase());
}

function toggleVacc(el, hiddenId, val) {
    el.closest('.vacc-group').querySelectorAll('.v-btn').forEach(b => b.classList.remove('on'));
    el.classList.add('on');
    document.getElementById(hiddenId).value = val;
}

function restoreVacc(hiddenId, val) {
    if (!val) return;
    const hidden = document.getElementById(hiddenId);
    if (hidden) hidden.value = val;
    if (!hidden) return;
    let group = hidden.nextElementSibling;
    while (group && !group.classList.contains('vacc-group')) group = group.nextElementSibling;
    if (!group) return;
    group.querySelectorAll('.v-btn').forEach(b => {
        b.classList.toggle('on', b.textContent.trim() === val);
    });
}

// VALIDATION
function showFieldError(fieldId, show) {
    const err = document.getElementById('err_' + fieldId);
    if (err) err.style.display = show ? 'block' : 'none';
    const input = document.getElementById('f_' + fieldId);
    if (input) input.style.borderColor = show ? '#e74c3c' : '#d0d5dd';
}

function clearAllErrors() {
    document.querySelectorAll('.field-err').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.field input, .field select, .field textarea').forEach(el => {
        el.style.borderColor = '#d0d5dd';
    });
}

function validateCurrentStep() {
    clearAllErrors();
    let valid = true;
    if (currentStep === 0) {
        if (!document.getElementById('f_fname').value.trim())   { showFieldError('fname', true); valid = false; }
        if (!document.getElementById('f_lname').value.trim())   { showFieldError('lname', true); valid = false; }
        if (!document.getElementById('f_dob').value.trim())     { showFieldError('dob', true); valid = false; }
        if (!document.getElementById('f_nat').value.trim())     { showFieldError('nat', true); valid = false; }
        if (!document.getElementById('f_pob').value.trim())     { showFieldError('pob', true); valid = false; }
        if (!document.getElementById('f_mobile').value.trim())  { showFieldError('mobile', true); valid = false; }
        if (!document.getElementById('f_address').value.trim()) { showFieldError('address', true); valid = false; }
        if (!document.getElementById('f_idtype').value.trim())  { showFieldError('idtype', true); valid = false; }
    }
    if (currentStep === 1) {
        if (!document.getElementById('f_relation').value.trim()) { showFieldError('relation', true); valid = false; }
    }
    if (currentStep === 2) {
        if (!document.getElementById('f_ecname').value.trim()) { showFieldError('ecname', true); valid = false; }
        if (!document.getElementById('f_ecnum').value.trim())  { showFieldError('ecnum', true); valid = false; }
    }
    return valid;
}

function validateAllRequired() {
    clearAllErrors();
    let valid = true;
    const baseFields = [
        { id: 'fname',   selector: '#f_fname' },
        { id: 'lname',   selector: '#f_lname' },
        { id: 'dob',     selector: '#f_dob' },
        { id: 'nat',     selector: '#f_nat' },
        { id: 'pob',     selector: '#f_pob' },
        { id: 'mobile',  selector: '#f_mobile' },
        { id: 'address', selector: '#f_address' },
        { id: 'idtype',  selector: '#f_idtype' },
        { id: 'relation',selector: '#f_relation' },
        { id: 'ecname',  selector: '#f_ecname' },
        { id: 'ecnum',   selector: '#f_ecnum' }
    ];
    const status = document.getElementById('f_censusStatus').value;
    let extraFields = [];
    if (status === 'COMPLETE') {
        extraFields = [
            { id: 'gender', selector: '#f_gender' },
            { id: 'civil',  selector: '#f_civil' }
        ];
    }
    const allFields = baseFields.concat(extraFields);
    allFields.forEach(field => {
        const el = document.querySelector(field.selector);
        if (!el || !el.value.trim()) {
            showFieldError(field.id, true);
            valid = false;
        }
    });
    return valid;
}

function validateCompleteFields() {
    clearAllErrors();
    let valid = true;
    const fields = [
        { id: 'fname',   selector: '#f_fname' },
        { id: 'lname',   selector: '#f_lname' },
        { id: 'dob',     selector: '#f_dob' },
        { id: 'nat',     selector: '#f_nat' },
        { id: 'pob',     selector: '#f_pob' },
        { id: 'mobile',  selector: '#f_mobile' },
        { id: 'address', selector: '#f_address' },
        { id: 'idtype',  selector: '#f_idtype' },
        { id: 'relation',selector: '#f_relation' },
        { id: 'ecname',  selector: '#f_ecname' },
        { id: 'ecnum',   selector: '#f_ecnum' },
        { id: 'gender',  selector: '#f_gender' },
        { id: 'civil',   selector: '#f_civil' }
    ];
    fields.forEach(field => {
        const el = document.querySelector(field.selector);
        if (!el || !el.value.trim()) {
            showFieldError(field.id, true);
            valid = false;
        }
    });
    return valid;
}

// IMAGE UPLOAD
function previewFile(inputId, imgId, lblId) {
    const input = document.getElementById(inputId);
    const file = input.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        document.getElementById(lblId).textContent = file.name;
        return;
    }

    document.getElementById(lblId).textContent = 'Compressing…';

    compressImage(file, 1280, 1280, 0.75, 400 * 1024) 
        .then(compressedFile => {
            const dt = new DataTransfer();
            dt.items.add(compressedFile);
            input.files = dt.files;

            const kb = (compressedFile.size / 1024).toFixed(0);
            document.getElementById(lblId).textContent = compressedFile.name + ' (' + kb + ' KB)';

            const img = document.getElementById(imgId);
            const reader = new FileReader();
            reader.onload = e => { img.src = e.target.result; img.style.display = 'block'; };
            reader.readAsDataURL(compressedFile);
        })
        .catch(() => {
            document.getElementById(lblId).textContent = file.name;
            showToast('Could not compress image — uploading original.', 'error');
        });
}

function compressImage(file, maxW, maxH, startQuality, targetBytes) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = e => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                let { width, height } = img;
                const scale = Math.min(1, maxW / width, maxH / height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);

                let q = startQuality;
                const attempt = () => {
                    canvas.toBlob(blob => {
                        if (!blob) { reject(new Error('toBlob failed')); return; }
                        if (blob.size > targetBytes && q > 0.3) {
                            q -= 0.1;
                            attempt();
                        } else {
                            const newName = file.name.replace(/\.\w+$/, '') + '.jpg';
                            resolve(new File([blob], newName, { type: 'image/jpeg' }));
                        }
                    }, 'image/jpeg', q);
                };
                attempt();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// HOUSEHOLD LOGIC
function checkHouseholdSuggestions() {
    const address  = (document.getElementById('f_address').value || '').toLowerCase().trim();
    const lastName = (document.getElementById('f_lname').value   || '').toLowerCase().trim();
    const midName  = (document.getElementById('f_mname').value   || '').toLowerCase().trim();

    if (!address && !lastName && !midName) return;

    const rows = document.querySelectorAll('#active-table tbody tr:not(.empty-row)');
    const matches = [];

    rows.forEach(row => {
        const rowAddr = (row.getAttribute('data-address') || '').toLowerCase();
        const rowName = (row.getAttribute('data-name')    || '').toLowerCase();

        const addrMatch = address  && rowAddr.includes(address);
        const lnMatch   = lastName && rowName.includes(lastName);
        const mnMatch   = midName  && rowName.includes(midName);

        if (addrMatch || lnMatch || mnMatch) {
            const buttons = row.querySelectorAll('[data-household]');
            buttons.forEach(btn => {
                const hhId = btn.getAttribute('data-household');
                if (!hhId) return;
                
                const existing = matches.find(m => m.householdId === hhId);
                if (!existing) {
                    matches.push({
                        householdId: hhId,
                        address: btn.getAttribute('data-address') || rowAddr,
                        hoa: btn.getAttribute('data-hoa') || '',
                        dwelling: btn.getAttribute('data-dwelling') || '',
                        hown: btn.getAttribute('data-hown') || '',
                        name: rowName,
                        reason: addrMatch ? 'same address' : (lnMatch ? 'same last name' : 'same middle name')
                    });
                }
            });
        }
    });

    const old = document.getElementById('hh-suggest-banner');
    if (old) old.remove();

    if (matches.length === 0) return;

    const optionsHtml = matches.map((m, i) =>
        `<button type="button" class="btn-hh-pick" data-idx="${i}"
            style="margin:4px;padding:6px 12px;border:1px solid #9fe1cb;border-radius:6px;
                   background:#e1f5ee;color:#0b5e48;font-size:12px;font-weight:600;cursor:pointer">
            Join household of <strong>${m.name}</strong>
            <span style="opacity:.7;font-weight:400"> — ${m.reason} · HH ${m.householdId}</span>
        </button>`
    ).join('');

    const banner = document.createElement('div');
    banner.id = 'hh-suggest-banner';
    banner.style.cssText = 'background:#f0faf5;border:1px solid #9fe1cb;border-radius:8px;' +
        'padding:12px 16px;margin:12px 24px 0;font-size:13px;color:#0b5e48;';
    banner.innerHTML = `
        <div style="font-weight:700;margin-bottom:6px">
            <i class="bi bi-people-fill me-1"></i>
            Possible household match${matches.length > 1 ? 'es' : ''} found
        </div>
        <div style="color:#555;font-size:12px;margin-bottom:8px">
            We found existing residents with the same address or name.
            Would you like to add this person to an existing household?
        </div>
        <div>${optionsHtml}</div>
        <button type="button" id="btnNoHousehold"
            style="margin-top:6px;font-size:11px;color:#888;background:none;border:none;cursor:pointer">
            No, create a new household
        </button>`;

    const step1 = document.getElementById('step1');
    step1.insertBefore(banner, step1.firstChild);

    banner.querySelectorAll('.btn-hh-pick').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.closest('.btn-hh-pick').getAttribute('data-idx');
            applyHouseholdSuggestion(parseInt(idx));
        });
    });
    document.getElementById('btnNoHousehold').addEventListener('click', () => banner.remove());

    window._hhSuggestions = matches;
}

function applyHouseholdSuggestion(idx) {
    const m = window._hhSuggestions[idx];
    if (!m) return;

    document.getElementById('f_householdId').value = m.householdId;
    document.getElementById('f_address').value     = m.address || document.getElementById('f_address').value;
    setSelectVal('f_hoa', m.hoa);
    setSelectVal('f_dwelling', m.dwelling);
    setSelectVal('f_ownership', m.hown);

    fetch(`/Resident-census/household/${m.householdId}`)
        .then(r => r.json())
        .then(members => {
            const hasHead = members.some(mb =>
                (mb.householdRelation || '').toLowerCase().includes('head')
            );
            window._hhHasHead = hasHead;
            applyRelationRestrictions();
        })
        .catch(() => {});

    const banner = document.getElementById('hh-suggest-banner');
    if (banner) {
        banner.style.background = '#d4edda';
        banner.style.borderColor = '#c3e6cb';
        banner.innerHTML = `<i class="bi bi-check-circle-fill me-1" style="color:#155724"></i>
            <strong style="color:#155724">Joined household ${m.householdId}</strong>
            <span style="color:#555;font-size:12px"> — ${m.name}'s household</span>
            <button type="button" id="btnUndoHousehold"
                style="margin-left:12px;font-size:11px;color:#888;background:none;border:none;cursor:pointer">
                Undo
            </button>`;
        document.getElementById('btnUndoHousehold').addEventListener('click', clearHouseholdSuggestion);
    }
}

function clearHouseholdSuggestion() {
    document.getElementById('f_householdId').value = '';
    window._hhHasHead = false;
    const rel = document.getElementById('f_relation');
    Array.from(rel.options).forEach(opt => {
        opt.disabled = false;
        opt.text = opt.text.replace(' (already assigned)', '').replace(' (age restriction: must be 18+)', '');
    });
    const banner = document.getElementById('hh-suggest-banner');
    if (banner) banner.remove();
}

function applyRelationRestrictions() {
    const rel = document.getElementById('f_relation');
    const dob = document.getElementById('f_dob').value;
    let age = null;
    if (dob) {
        const b = new Date(dob), t = new Date();
        age = t.getFullYear() - b.getFullYear();
        if (t.getMonth() < b.getMonth() ||
            (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
    }

    Array.from(rel.options).forEach(opt => {
        if (opt.value === '' || opt.value === 'Select…') return;
        if (opt.text.toLowerCase().includes('head')) {
            const tooYoung  = age !== null && age < 18;
            const headTaken = window._hhHasHead === true;
            opt.disabled = tooYoung || headTaken;
            opt.text = 'Head';
            if (tooYoung)  opt.text += ' (age restriction: must be 18+)';
            if (headTaken) opt.text += ' (already assigned)';
            if (opt.disabled && rel.value === 'Head') rel.value = '';
        }
    });
}

function addHouseholdMember(btn) {
    const householdId = btn.getAttribute('data-household') || '';
    const address = btn.getAttribute('data-address') || '';
    const hoa = btn.getAttribute('data-hoa') || '';
    const dwelling = btn.getAttribute('data-dwelling') || '';
    const hown = btn.getAttribute('data-hown') || '';

    document.getElementById('modalTitle').textContent = 'Add Household Member';
    document.getElementById('f_isEdit').value  = 'false';
    document.getElementById('f_id').value      = '';
    clearForm();

    document.getElementById('f_householdId').value  = householdId;
    document.getElementById('f_censusStatus').value = 'INCOMPLETE';

    document.getElementById('f_address').value = address;
    setSelectVal('f_hoa', hoa);
    setSelectVal('f_dwelling', dwelling);
    setSelectVal('f_ownership', hown);

    const pinBlock = document.getElementById('pinLocationBlock');
    if (pinBlock) pinBlock.style.display = 'none';
    document.getElementById('f_latitude').value  = '';
    document.getElementById('f_longitude').value = '';

    if (householdId) {
        fetch(`/Resident-census/household/${householdId}`)
            .then(r => r.json())
            .then(members => {
                window._hhHasHead = members.some(mb =>
                    (mb.householdRelation || '').toLowerCase().includes('head')
                );
                applyRelationRestrictions();
            })
            .catch(() => { window._hhHasHead = false; });
    }

    goStep(0);
    document.getElementById('censusModal').style.display = 'block';
}

function openHouseholdModal(btn) {
    const householdId  = btn.getAttribute('data-household') || '';
    const address      = btn.getAttribute('data-address')   || '—';
    const hoa          = btn.getAttribute('data-hoa')       || '—';
    const currentResId = btn.getAttribute('data-id')        || '';
    window._hhModalBtn = btn;

    document.getElementById('hm_title').textContent = 'Household Members';
    document.getElementById('hm_sub').textContent   = address;
    document.getElementById('hm_info_strip').innerHTML = `
        <div class="hh-info-chip"><i class="bi bi-hash"></i> HH ID: <strong>${householdId || 'N/A'}</strong></div>
        <div class="hh-info-chip"><i class="bi bi-people"></i> <strong>—</strong> members</div>
        <div class="hh-info-chip"><i class="bi bi-shield-check"></i> HOA: <strong>${hoa}</strong></div>`;
    document.getElementById('hm_body').innerHTML = `<div class="hh-empty-state"><i class="bi bi-hourglass-split"></i> Loading…</div>`;
    document.getElementById('householdModal').style.display = 'block';

    if (!householdId) {
        document.getElementById('hm_body').innerHTML = `<div class="hh-empty-state"><i class="bi bi-people"></i> No household ID assigned.</div>`;
        return;
    }

    fetch(`/Resident-census/household/${householdId}`)
        .then(r => r.json())
        .then(members => {
            renderHouseholdCards(members, currentResId);
            window._hhHasHead = members.some(m => (m.householdRelation || '').toLowerCase().includes('head'));
        })
        .catch(() => {
            document.getElementById('hm_body').innerHTML = `<div class="hh-empty-state"><i class="bi bi-exclamation-triangle"></i> Failed to load.</div>`;
        });
}

function closeHouseholdModal() { document.getElementById('householdModal').style.display = 'none'; }

function addHouseholdMemberFromModal() {
    if (!window._hhModalBtn) return;
    closeHouseholdModal();
    addHouseholdMember(window._hhModalBtn);
}

function renderHouseholdCards(members, currentResId) {
    const body = document.getElementById('hm_body');
    const summaryHtml = buildHouseholdSummary(members);
    const cardsHtml = (!members || members.length === 0)
        ? `<div class="hh-empty-state"><i class="bi bi-people"></i> No members found.</div>`
        : members.map(m => buildHHCard(m, currentResId)).join('');

    body.innerHTML = summaryHtml + cardsHtml;

    document.getElementById('hm_info_strip').querySelectorAll('.hh-info-chip').forEach(chip => {
        if (chip.querySelector('i')?.classList.contains('bi-people'))
            chip.innerHTML = `<i class="bi bi-people"></i> <strong>${members ? members.length : 0}</strong> members`;
    });
    
    // Attach image click for enlargement
    body.querySelectorAll('img').forEach(img => {
        img.addEventListener('click', (e) => {
            enlargeImage(e.target.src);
        });
    });

    const addBtn = document.getElementById('hm_add_btn');
    if (addBtn) addBtn.style.display = '';
}

function buildHHCard(m, currentResId) {
    const isCurrent = String(m.id) === String(currentResId);
    const isStudent = (m.employmentStatus || '').toLowerCase() === 'student';
    const isHead    = (m.householdRelation || '').toLowerCase().includes('head');
    const firstName = m.firstName || '', lastName = m.lastName || '', middleName = m.middleName || '';
    const fullName  = lastName + ', ' + firstName + (middleName ? ' ' + middleName : '');
    const initials  = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || '?';
    const gender    = (m.gender || '').toLowerCase();
    const avatarCls = gender === 'female' ? 'female' : gender === 'male' ? 'male' : 'other';
    const age       = hhCalcAge(m.dateOfBirth);
    const metaText  = (m.gender || '—') + ' · ' + (age !== null ? age + ' yrs old' : '—');
    const relCls    = hhRelClass(m.householdRelation);
    let tags = `<span class="hh-tag-pill ${relCls}">${m.householdRelation || 'Member'}</span>`;
    if (isCurrent)          tags += '<span class="hh-tag-pill current">Viewing</span>';
    if (isStudent)          tags += '<span class="hh-tag-pill student">Student</span>';
    if (m.seniorCitizen)    tags += '<span class="hh-tag-pill senior">Senior</span>';
    if (m.pwd)              tags += '<span class="hh-tag-pill pwd">PWD</span>';
    if (m.soloParent)       tags += '<span class="hh-tag-pill solo">Solo parent</span>';
    if (m.indigenousPeople) tags += '<span class="hh-tag-pill ip">IP</span>';
    if (m.registeredVoter)  tags += '<span class="hh-tag-pill voter">Voter</span>';
    const occLabel = isStudent ? 'Course / Year' : 'Occupation';
    const occVal   = isStudent
        ? ((m.courseOrProgram || m.occupation || '—') + (m.yearLevel ? ' · ' + m.yearLevel : ''))
        : (m.occupation || '—');
    const photoIcon  = isStudent ? 'bi-person-badge' : 'bi-file-earmark-person';
    const photoLabel = isStudent ? 'School ID' : "Gov't ID";
    const photoHtml  = m.governmentIdUrl
        ? `<img src="${m.governmentIdUrl}" alt="ID">`
        : `<i class="bi ${photoIcon}"></i>`;
    const phDisp     = m.philhealthId
        ? `<span class="hh-id-value mono">${m.philhealthId}</span>`
        : `<span class="hh-id-value muted">${m.philhealthCategory || 'Not enrolled'}</span>`;
    return `
        <div class="hh-member-card-new${isHead ? ' is-head' : ''}">
            <div class="hh-card-top-row">
                <div class="hh-avatar-wrap-new">
                    <div class="hh-avatar-new ${avatarCls}">${initials}</div>
                    ${isHead ? '<div class="hh-head-star">★</div>' : ''}
                </div>
                <div class="hh-card-info">
                    <div class="hh-card-name">${fullName}</div>
                    <div class="hh-card-meta">${metaText}</div>
                    <div class="hh-card-tags">${tags}</div>
                </div>
                <div class="hh-photo-wrap">
                    <div class="hh-photo-thumb">${photoHtml}</div>
                    <span class="hh-photo-lbl">${photoLabel}</span>
                </div>
            </div>
            <div class="hh-card-id-strip">
                <div class="hh-id-field"><span class="hh-id-label">Record ID</span><span class="hh-id-value mono">${m.recordId || '—'}</span></div>
                <div class="hh-id-field"><span class="hh-id-label">${occLabel}</span><span class="hh-id-value">${occVal}</span></div>
                <div class="hh-id-field"><span class="hh-id-label">Blood type</span><span class="hh-id-value">${m.bloodType || '—'}</span></div>
                <div class="hh-id-field"><span class="hh-id-label">PhilHealth</span>${phDisp}</div>
            </div>
        </div>`;
}

function hhCalcAge(dob) {
    if (!dob) return null;
    const b = new Date(dob), t = new Date();
    let age = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
    return age >= 0 ? age : null;
}

function hhRelClass(rel) {
    if (!rel) return 'other';
    const r = rel.toLowerCase();
    if (r.includes('head'))    return 'head';
    if (r.includes('spouse') || r.includes('wife') || r.includes('husband')) return 'spouse';
    if (r.includes('child')  || r.includes('son')  || r.includes('daughter')) return 'child';
    if (r.includes('sibling') || r.includes('brother') || r.includes('sister')) return 'sibling';
    if (r.includes('parent') || r.includes('father') || r.includes('mother')) return 'parent';
    if (r.includes('relative')) return 'relative';
    return 'other';
}

function buildHouseholdSummary(members) {
    const c = {
        adultMale: 0, adultFemale: 0, children: 0, teenagers: 0,
        pwd: 0, seniorMale: 0, seniorFemale: 0,
        studentGrade: 0, studentHigh: 0, studentCollege: 0
    };

    (members || []).forEach(m => {
        const gender    = (m.gender || '').toLowerCase();
        const age       = hhCalcAge(m.dateOfBirth);
        const isPwd     = !!m.pwd;
        const isSenior  = !!m.seniorCitizen || (age !== null && age >= 60);
        const isStudent = (m.employmentStatus || '').toLowerCase() === 'student';
        const educClass = classifyEducation(m.educationalAttainment);

        if (isPwd) c.pwd++;

        if (age !== null) {
            if (age < 13) c.children++;
            else if (age < 20) c.teenagers++;
            else if (isSenior) {
                if (gender === 'male') c.seniorMale++;
                else if (gender === 'female') c.seniorFemale++;
            } else {
                if (gender === 'male') c.adultMale++;
                else if (gender === 'female') c.adultFemale++;
            }
        }

        if (isStudent) {
            if (educClass === 'grade') c.studentGrade++;
            else if (educClass === 'high') c.studentHigh++;
            else if (educClass === 'college') c.studentCollege++;
        }
    });

    const parts = [
        c.adultMale    && `<b>${c.adultMale}</b> Adult Male`,
        c.adultFemale  && `<b>${c.adultFemale}</b> Adult Female`,
        c.children     && `<b>${c.children}</b> Children`,
        c.teenagers    && `<b>${c.teenagers}</b> Teenagers`,
        c.pwd          && `<b>${c.pwd}</b> PWD`,
        c.seniorMale   && `<b>${c.seniorMale}</b> Senior (M)`,
        c.seniorFemale && `<b>${c.seniorFemale}</b> Senior (F)`,
        c.studentGrade && `<b>${c.studentGrade}</b> Grade School`,
        c.studentHigh  && `<b>${c.studentHigh}</b> High School`,
        c.studentCollege && `<b>${c.studentCollege}</b> College`
    ].filter(Boolean);

    if (!parts.length) return '';
    return `<div class="hh-summary-strip">${parts.join('<span class="sep">·</span>')}</div>`;
}

// VIEW RECORD
function viewRecord(btn) {
    const get = (attr) => btn.getAttribute(attr) || '';
    const fname = get('data-fname');
    const lname = get('data-lname');
    const mname = get('data-mname');
    const suffix = get('data-suffix');
    const fullName = lname + ', ' + fname + (mname ? ' ' + mname : '') + (suffix ? ' ' + suffix : '');

    document.getElementById('vm_name').textContent = fullName;
    document.getElementById('vm_id').textContent   = get('data-recordid') || '—';

    const status     = get('data-status')     || 'pending';
    const acctStatus = get('data-acctstatus') || 'pending';

    const dobStr = get('data-dob');
    let ageText = '—';
    if (dobStr) {
        const b = new Date(dobStr), t = new Date();
        let age = t.getFullYear() - b.getFullYear();
        if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
        ageText = age >= 0 ? age + ' years old' : '—';
    }

    document.getElementById('vm_badges').innerHTML =
        `<span class="badge-status ${statusClass(status)}">Census: ${cap(status)}</span>` +
        `<span class="badge-status ${statusClass(acctStatus)}" style="margin-left:6px">Account: ${cap(acctStatus)}</span>`;

    let sectorTags = '';
    if (get('data-senior') === 'true') sectorTags += '<span class="badge-status" style="background:#fff3cd;color:#856404;margin:2px">Senior Citizen</span>';
    if (get('data-pwd')    === 'true') sectorTags += '<span class="badge-status" style="background:#cce5ff;color:#004085;margin:2px">PWD</span>';
    if (get('data-solo')   === 'true') sectorTags += '<span class="badge-status" style="background:#e2d9f3;color:#6f42c1;margin:2px">Solo Parent</span>';
    if (get('data-ip')     === 'true') sectorTags += '<span class="badge-status" style="background:#d4edda;color:#155724;margin:2px">Indigenous People</span>';
    if (get('data-voter')  === 'true') sectorTags += '<span class="badge-status" style="background:#fde8d8;color:#8a3a00;margin:2px">Registered Voter</span>';
    if (get('data-fourps') === 'true') sectorTags += '<span class="badge-status" style="background:#d1ecf1;color:#0c5460;margin:2px">4Ps Beneficiary</span>';

    const vaccDisplay = (val) => {
        if (!val || val.trim() === '') return '<span class="badge-status" style="background:#f8d7da;color:#721c24">Not recorded</span>';
        const isNone = val.toLowerCase().includes('not vaccinated');
        return `<span class="badge-status" style="background:${isNone?'#f8d7da':'#d4edda'};color:${isNone?'#721c24':'#155724'}">${val}</span>`;
    };

    document.getElementById('vm_body').innerHTML = `
        <div class="view-sec">
            <div class="view-sec-title">Personal Information</div>
            <div class="view-grid">
                ${vf('First Name', fname)} ${vf('Middle Name', get('data-mname'))}
                ${vf('Last Name', lname)}  ${vf('Suffix', get('data-suffix'))}
                ${vf('Date of Birth', get('data-dob'))} ${vf('Age', ageText)}
                ${vf('Gender', get('data-gender'))}     ${vf('Civil Status', get('data-civil'))}
                ${vf('Nationality', get('data-nationality'))} ${vf('Place of Birth', get('data-pob'))}
                ${vf('Religion', get('data-religion'))}       ${vf('Blood Type', get('data-blood'))}
            </div>
        </div>
        <div class="view-sec">
            <div class="view-sec-title">Contact Details</div>
            <div class="view-grid">
                ${vf('Mobile Number', get('data-mobile'))} ${vf('Address', get('data-address'))}
            </div>
        </div>
        <div class="view-sec">
            <div class="view-sec-title">Employment & Education</div>
            <div class="view-grid">
                ${vf('Occupation', get('data-occupation'))}
                ${vf('Employment Status', get('data-employment'))}
                ${vf('Monthly Income', get('data-income'))}
                ${vf('Educational Attainment', get('data-educ'))}
            </div>
        </div>
        <div class="view-sec">
            <div class="view-sec-title">Priority Sectors & Civic Status</div>
            <div style="padding:8px 0">${sectorTags || '<span style="color:#999;font-size:13px">No priority sector tags</span>'}</div>
            <div class="view-grid">
                ${vf('Precinct Number', get('data-precinct'))} ${vf('ID Type', get('data-idtype'))}
            </div>
        </div>
        ${buildHouseholdMemberCards(btn)}
        <div class="view-sec">
            <div class="view-sec-title">Household Details</div>
            <div class="view-grid">
                ${vf('Home Ownership', get('data-hown'))}
                ${vf('HOA Membership', get('data-hoa'))}
                ${vf('Dwelling Type', get('data-dwelling'))}
            </div>
        </div>
        <div class="view-sec">
            <div class="view-sec-title">Health Information</div>
            <div class="view-grid">
                ${vf('PhilHealth ID', get('data-philhealth'))}
                ${vf('PhilHealth Category', get('data-philcat'))}
                ${vf('Blood Pressure', get('data-bp'))}
                ${vf('Evacuation Priority', get('data-evac'))}
            </div>
            ${get('data-medhist') ? `<div class="view-field" style="margin-top:10px">
                <label>Medical History</label>
                <div class="val" style="white-space:pre-line">${get('data-medhist')}</div>
            </div>` : ''}
        </div>
        <div class="view-sec">
            <div class="view-sec-title">Vaccination Status</div>
            <div class="view-grid">
                <div class="view-field"><label>COVID-19</label><div style="padding-top:4px">${vaccDisplay(get('data-vaccovid'))}</div></div>
                <div class="view-field"><label>Influenza (Flu)</label><div style="padding-top:4px">${vaccDisplay(get('data-vaccflu'))}</div></div>
                <div class="view-field"><label>HPV</label><div style="padding-top:4px">${vaccDisplay(get('data-vacchpv'))}</div></div>
            </div>
        </div>
        <div class="view-sec">
            <div class="view-sec-title">Emergency Contact</div>
            <div class="view-grid">
                ${vf('Contact Person', get('data-ecname'))}
                ${vf('Relationship', get('data-ecrel'))}
                ${vf('Primary Contact', get('data-ecnum'))}
            </div>
        </div>`;

    setTimeout(() => loadHouseholdCards(btn), 100);
    document.getElementById('viewModal').style.display = 'block';
}

function closeViewModal() { document.getElementById('viewModal').style.display = 'none'; }

function vf(label, val) {
    return `<div class="view-field"><label>${label}</label><div class="val">${val || '—'}</div></div>`;
}
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s; }
function statusClass(s) {
    if (!s) return 'pending';
    switch (s.toUpperCase()) {
        case 'COMPLETE':    return 'complete';
        case 'INCOMPLETE':  return 'incomplete';
        case 'FLAGGED':     return 'flagged';
        case 'ARCHIVED':    return 'archived';
        case 'VERIFIED':    return 'verified';
        case 'UNVERIFIED':  return 'unverified';
        default:            return 'pending';
    }
}

function buildHouseholdMemberCards(btn) {
    const householdId = btn.getAttribute('data-household') || '';
    const currentId   = btn.getAttribute('data-id')        || '';
    const containerId = 'household-cards-' + currentId;
    return `
        <div class="view-sec">
            <div class="view-sec-title">
                <i class="bi bi-people-fill me-2"></i>Household Members
                <span style="font-size:10px;color:#888;margin-left:8px">HH ID: ${householdId || 'N/A'}</span>
            </div>
            <div id="${containerId}" style="padding:8px 0">
                <div class="hh-empty-state"><i class="bi bi-hourglass-split"></i> Loading…</div>
            </div>
        </div>`;
}

function loadHouseholdCards(btn) {
    const householdId = btn.getAttribute('data-household') || '';
    const currentId   = btn.getAttribute('data-id')        || '';
    const containerId = 'household-cards-' + currentId;
    const container   = document.getElementById(containerId);
    if (!container) return;
    if (!householdId) {
        container.innerHTML = `<div class="hh-empty-state"><i class="bi bi-people"></i> No household ID assigned.</div>`;
        return;
    }
    fetch(`/Resident-census/household/${householdId}`)
        .then(r => r.json())
        .then(members => {
            if (!members || members.length === 0) {
                container.innerHTML = `<div class="hh-empty-state"><i class="bi bi-people"></i> No members found.</div>`;
                return;
            }
            container.innerHTML = members.map(m => buildHHCard(m, currentId)).join('');
            container.querySelectorAll('img').forEach(img => {
                img.addEventListener('click', (e) => enlargeImage(e.target.src));
            });
        })
        .catch(() => {
            container.innerHTML = `<div class="hh-empty-state"><i class="bi bi-exclamation-triangle"></i> Failed to load.</div>`;
        });
}

// CONFIRM & ARCHIVE
function openConfirmModal(icon, title, msg, cb) {
    document.getElementById('conf_icon').textContent  = icon;
    document.getElementById('conf_title').textContent = title;
    document.getElementById('conf_msg').textContent   = msg;
    const btn = document.getElementById('conf_ok');
    const nb  = btn.cloneNode(true);
    btn.parentNode.replaceChild(nb, btn);
    nb.addEventListener('click', () => { closeConfirmModal(); cb(); });
    document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal() { document.getElementById('confirmModal').style.display = 'none'; }

function triggerArchive(btn) {
    const url = btn.getAttribute('data-url'), name = btn.getAttribute('data-name');
    openConfirmModal('🗃️', 'Archive Record',
        `Archive the record for ${name}? You can restore it later from the Archived tab.`,
        () => submitPost(url));
}

function triggerRestore(btn) {
    const url = btn.getAttribute('data-url'), name = btn.getAttribute('data-name');
    openConfirmModal('✅', 'Restore Record', `Restore the record for ${name}?`,
        () => submitPost(url));
}

function submitPost(url) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;

    const csrf = document.querySelector('meta[name="_csrf"]');
    const csrfHeader = document.querySelector('meta[name="_csrf_header"]');
    if (csrf) {
        const input = document.createElement('input');
        input.type  = 'hidden';
        input.name  = '_csrf';
        input.value = csrf.content;
        form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
}

// MAP LOGIC
function initCensusPinMap() {
    if (censusMapInitialized && censusPinMap) {
        setTimeout(() => censusPinMap.invalidateSize(), 200);
        return;
    }

    const mapContainer = document.getElementById('censusPinMap');
    if (!mapContainer) return;

    censusPinMap = L.map('censusPinMap', {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView([14.4160, 120.8950], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(censusPinMap);

    L.polygon(SAN_SEBASTIAN_POLYGON, {
        color: '#2d4a44',
        weight: 2.5,
        opacity: 0.75,
        fillColor: '#2d4a44',
        fillOpacity: 0.06,
        dashArray: '6 4',
        interactive: false
    }).addTo(censusPinMap);

    censusPinMap.on('click', function(e) {
        setPinLocation(e.latlng.lat, e.latlng.lng);
    });

    const lat = parseFloat(document.getElementById('f_latitude').value);
    const lng = parseFloat(document.getElementById('f_longitude').value);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        setPinLocation(lat, lng, false);
        censusPinMap.setView([lat, lng], 16);
    }

    censusMapInitialized = true;
    setTimeout(() => censusPinMap.invalidateSize(), 300);
}

function setPinLocation(lat, lng, shouldCenter = true) {
    if (censusPinMarker) {
        censusPinMap.removeLayer(censusPinMarker);
    }

    censusPinMarker = L.marker([lat, lng], {
        draggable: true,
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    }).addTo(censusPinMap);

    document.getElementById('f_latitude').value = lat.toFixed(6);
    document.getElementById('f_longitude').value = lng.toFixed(6);

    document.getElementById('pin-coords-display').textContent = 
        `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;

    censusPinMarker.on('dragend', function(e) {
        const pos = e.target.getLatLng();
        document.getElementById('f_latitude').value = pos.lat.toFixed(6);
        document.getElementById('f_longitude').value = pos.lng.toFixed(6);
        document.getElementById('pin-coords-display').textContent = 
            `Lat: ${pos.lat.toFixed(5)}, Lng: ${pos.lng.toFixed(5)}`;
    });

    if (shouldCenter) {
        censusPinMap.setView([lat, lng], censusPinMap.getZoom());
    }
}

function useCurrentLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    document.getElementById('censusPinMap').innerHTML = 
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;">' +
        '<i class="bi bi-hourglass-split" style="font-size:24px;margin-right:8px;"></i> Getting location…</div>';
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            if (!censusMapInitialized) initCensusPinMap();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            censusPinMap.setView([lat, lng], 17);
            setPinLocation(lat, lng);
        },
        function(error) {
            alert('Unable to retrieve your location: ' + error.message);
            if (!censusMapInitialized) initCensusPinMap();
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function searchAddressOnMap() {
    const address = document.getElementById('f_address').value.trim();
    if (!address) {
        alert('Please enter an address first, then click "Search Address" to find it on the map.');
        return;
    }
    
    const searchQuery = address + ', Kawit, Cavite, Philippines';
    document.getElementById('censusPinMap').innerHTML = 
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;">' +
        '<i class="bi bi-hourglass-split" style="font-size:24px;margin-right:8px;"></i> Searching address…</div>';
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`)
        .then(r => r.json())
        .then(data => {
            if (!censusMapInitialized) initCensusPinMap();
            
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                censusPinMap.setView([lat, lng], 17);
                setPinLocation(lat, lng);
            } else {
                alert('Address not found. You can manually click on the map to place a pin.');
                if (!censusMapInitialized) initCensusPinMap();
            }
        })
        .catch(() => {
            alert('Geocoding service unavailable. Please click on the map to place a pin manually.');
            if (!censusMapInitialized) initCensusPinMap();
        });
}

// UTILITIES
function showToast(msg, type = '') {
    const w = document.getElementById('toastWrap');
    const d = document.createElement('div');
    d.className = 'toast-msg ' + (type || '');
    d.textContent = (type === 'success' ? '✓ ' : type === 'error' ? '✗ ' : '') + msg;
    w.appendChild(d);
    setTimeout(() => d.remove(), 3500);
}

function enlargeImage(src) {
    if (!src) return;
    document.getElementById('enlargedImage').src = src;
    document.getElementById('imageEnlargeModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeImageEnlarge() {
    document.getElementById('imageEnlargeModal').style.display = 'none';
    document.getElementById('enlargedImage').src = '';
    document.body.style.overflow = '';
}

function getAgeFromDob(dob) {
    if (!dob) return null;
    const b = new Date(dob), t = new Date();
    let age = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
    return age >= 0 ? age : null;
}

function classifyEducation(educ) {
    if (!educ) return null;
    const e = educ.toLowerCase();
    if (e.includes('elementary')) return 'grade';
    if (e.includes('high school')) return 'high';
    if (e.includes('college') || e.includes('vocational') || e.includes('post-graduate')) return 'college';
    return null;
}

function renderCensusSummary() {
    const c = {
        adultMale: 0, adultFemale: 0, children: 0, teenagers: 0,
        pwd: 0, seniorMale: 0, seniorFemale: 0,
        studentGrade: 0, studentHigh: 0, studentCollege: 0
    };

    document.querySelectorAll('#active-table .view-btn').forEach(btn => {
        const gender    = (btn.getAttribute('data-gender') || '').toLowerCase();
        const age       = getAgeFromDob(btn.getAttribute('data-dob'));
        const isPwd     = btn.getAttribute('data-pwd') === 'true';
        const isSenior  = btn.getAttribute('data-senior') === 'true' || (age !== null && age >= 60);
        const isStudent = (btn.getAttribute('data-employment') || '').toLowerCase() === 'student';
        const educClass = classifyEducation(btn.getAttribute('data-educ'));

        if (isPwd) c.pwd++;

        if (age !== null) {
            if (age < 13) c.children++;
            else if (age < 20) c.teenagers++;
            else if (isSenior) {
                if (gender === 'male') c.seniorMale++;
                else if (gender === 'female') c.seniorFemale++;
            } else {
                if (gender === 'male') c.adultMale++;
                else if (gender === 'female') c.adultFemale++;
            }
        }

        if (isStudent) {
            if (educClass === 'grade') c.studentGrade++;
            else if (educClass === 'high') c.studentHigh++;
            else if (educClass === 'college') c.studentCollege++;
        }
    });

    Object.keys(c).forEach(k => {
        const el = document.getElementById('sum_' + k);
        if (el) el.textContent = c[k];
    });
}

// DUPLICATE LOGIC
function checkDuplicates(onNoDuplicate) {
    const fname  = (document.getElementById('f_fname').value  || '').toLowerCase().trim();
    const lname  = (document.getElementById('f_lname').value  || '').toLowerCase().trim();
    const mname  = (document.getElementById('f_mname').value || '').toLowerCase().trim();
    const dob    = (document.getElementById('f_dob').value    || '').trim();
    const mobile = (document.getElementById('f_mobile').value || '').trim();
    const editId = document.getElementById('f_id').value || '';

    const rows = document.querySelectorAll('#active-table tbody tr:not(.empty-row)');
    let bestMatch = null, bestReason = [];

    rows.forEach(row => {
        const rowName   = (row.getAttribute('data-name')    || '').toLowerCase();
        const rowId     = row.querySelector('[data-id]')?.getAttribute('data-id') || '';

        if (editId && rowId === editId) return;

        const reasons = [];

        if (fname && lname && rowName.includes(fname) && rowName.includes(lname)) {
            if (!mname || rowName.includes(mname)) {
                reasons.push('same full name');
            }
        }
        
        if (dob) {
            const viewBtn = row.querySelector('.view-btn');
            if (viewBtn && viewBtn.getAttribute('data-dob') === dob)
                reasons.push('same date of birth');
        }
        
        if (mobile) {
            const viewBtn = row.querySelector('.view-btn');
            if (viewBtn && viewBtn.getAttribute('data-mobile') === mobile)
                reasons.push('same mobile number');
        }
        
        if (reasons.length > 0 && (!bestMatch || reasons.length > bestReason.length)) {
            bestMatch  = row;
            bestReason = reasons;
        }
    });

    if (!bestMatch) { onNoDuplicate(); return; }

    _dupProceedCallback = onNoDuplicate;
    _dupExistingBtn = bestMatch.querySelector('.edit-btn') || bestMatch.querySelector('.view-btn');

    const vb = bestMatch.querySelector('.view-btn');
    document.getElementById('dup_existing').innerHTML = dupCard({
        name:    bestMatch.getAttribute('data-name'),
        address: bestMatch.getAttribute('data-address'),
        status:  bestMatch.getAttribute('data-status'),
        recordId: bestMatch.getAttribute('data-id'),
        dob:     vb?.getAttribute('data-dob'),
        mobile:  vb?.getAttribute('data-mobile'),
        gender:  vb?.getAttribute('data-gender'),
    });

    document.getElementById('dup_new').innerHTML = dupCard({
        name:    `${fname} ${mname ? mname + ' ' : ''}${lname}`.trim(),
        address: document.getElementById('f_address').value,
        status:  'INCOMPLETE',
        recordId: '(new)',
        dob:     dob,
        mobile:  mobile,
        gender:  document.getElementById('f_gender').value,
    });

    document.getElementById('dup_reason').textContent =
        `Match found based on: ${bestReason.join(', ')}.`;

    document.getElementById('duplicateModal').style.display = 'block';
}

function dupCard(d) {
    const row = (label, val) =>
        `<div style="display:flex;justify-content:space-between;padding:5px 0;
                 border-bottom:1px solid #f0f0f0;font-size:12px;">
           <span style="color:#888;font-weight:600;">${label}</span>
           <span style="color:#333;font-weight:500;text-align:right;max-width:60%;
                        word-break:break-word;">${val || '—'}</span>
         </div>`;
    return `
        <div style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
            <div style="background:#f5f5f5;padding:10px 14px;font-weight:700;font-size:13px;color:#1a2e2a;">
                ${(d.name||'—').toUpperCase()}
            </div>
            <div style="padding:10px 14px;">
                ${row('Record ID', d.recordId)}
                ${row('Date of Birth', d.dob)}
                ${row('Gender', d.gender)}
                ${row('Mobile', d.mobile)}
                ${row('Address', d.address)}
                ${row('Status', d.status)}
            </div>
        </div>`;
}

function closeDuplicateModal() {
    document.getElementById('duplicateModal').style.display = 'none';
    _dupProceedCallback = null;
}

function duplicateProceed() {
    document.getElementById('duplicateModal').style.display = 'none';
    if (_dupProceedCallback) _dupProceedCallback();
    _dupProceedCallback = null;
}

function duplicateEditExisting() {
    document.getElementById('duplicateModal').style.display = 'none';
    closeCensusModal();
    if (_dupExistingBtn) _dupExistingBtn.click();
    _dupProceedCallback = null;
}