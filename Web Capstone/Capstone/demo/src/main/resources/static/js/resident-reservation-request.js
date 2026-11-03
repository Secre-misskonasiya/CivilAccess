document.addEventListener('DOMContentLoaded', function() {
    // Fix accessibility for icon-only buttons
    document.querySelectorAll('button').forEach(btn => {
        if (btn.textContent.trim() || btn.getAttribute('aria-label') ||
            btn.getAttribute('aria-labelledby') || btn.getAttribute('title')) return;
        const hint = (btn.id + ' ' + btn.className).toLowerCase();
        btn.setAttribute('aria-label',
            hint.includes('close') ? 'Close' :
            (hint.includes('toggle') || hint.includes('menu')) ? 'Toggle navigation menu' : 'Button');
    });

    // ============================================
    // SUPABASE SETUP
    // ============================================
    const SUPABASE_URL = 'https://upfrofppponiqffbssqb.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_tZyxrTJrpd_OD5-TKUkT8Q__DnuY0tj';
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ============================================
    // CONSTANTS & STATE
    // ============================================
    const COURTS = [
        'Barangay Covered Court',
        'Multi-Purpose Hall',
        'Open Basketball Court',
        'Barangay Session Hall',
    ];

    const OPEN_TIME  = '07:00';
    const CLOSE_TIME = '22:00';

    let currentUser = null;
    let selectedCourt = COURTS[0];

    // ============================================
    // DATE HELPERS
    // ============================================
    const todayStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };
    const parseLocalDate = (val) => {
        if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return null;
        const [y,m,d] = val.split('-').map(Number);
        const dt = new Date(y,m-1,d);
        if (dt.getFullYear()!==y || dt.getMonth()!==m-1 || dt.getDate()!==d) return null;
        return dt;
    };
    const validateDate = (val) => {
        if (!val) return 'Date is required';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return 'Use format YYYY-MM-DD';
        const d = parseLocalDate(val);
        if (!d) return 'Invalid date';
        if (d < parseLocalDate(todayStr())) return 'Date cannot be in the past';
        return '';
    };

    // ============================================
    // TIME HELPERS
    // ============================================
    function validateOperatingHours(time) {
        if (!time) return '';
        if (time < OPEN_TIME || time > CLOSE_TIME) {
            return 'The court is only open from 7:00 AM to 10:00 PM. Please select a time within operating hours.';
        }
        return '';
    }

    function validateTimeRange() {
        const from = document.getElementById('timeFrom').value;
        const to = document.getElementById('timeTo').value;
        let ok = true;
        showHint('time', false);

        if (!from) {
            showErr('timeFrom', true, 'Start time is required'); ok = false;
        } else {
            const hoursErr = validateOperatingHours(from);
            if (hoursErr) { showErr('timeFrom', true, hoursErr); ok = false; }
            else showErr('timeFrom', false);
        }

        if (!to) {
            showErr('timeTo', true, 'End time is required'); ok = false;
        } else {
            const hoursErr = validateOperatingHours(to);
            if (hoursErr) { showErr('timeTo', true, hoursErr); ok = false; }
            else showErr('timeTo', false);
        }

        if (ok && from && to) {
            if (from >= to) {
                showErr('timeTo', true, 'End time must be after start time');
                ok = false;
            } else {
                showHint('time', true);
            }
        }
        return ok;
    }

    function onTimeChange() {
        validateTimeRange();
        checkTimeConflict();
    }

    // ============================================
    // CONFLICT CHECK
    // ============================================
    async function checkTimeConflict() {
        const dateVal = document.getElementById('date').value;
        const from = document.getElementById('timeFrom').value;
        const to = document.getElementById('timeTo').value;
        if (!selectedCourt || !dateVal || !from || !to || from >= to) return false;
        if (validateOperatingHours(from) || validateOperatingHours(to)) return false;

        const { data, error } = await sb
            .from('reservations')
            .select('id, time_from, time_to, status')
            .eq('court', selectedCourt)
            .eq('date', dateVal)
            .in('status', ['INCOMING', 'APPROVED', 'IN_PROGRESS', 'READY']);

        if (error) { console.error('Conflict check failed:', error); return false; }

        const hasConflict = (data || []).some(r => {
            if (!r.time_from || !r.time_to) return false;
            return r.time_from < to && r.time_to > from;
        });

        if (hasConflict) {
            showErr('timeTo', true, 'This court is already reserved for an overlapping time on that date. Please pick another time.');
            showHint('time', false);
        }
        return hasConflict;
    }

    // ============================================
    // FETCH PROFILE
    // ============================================
    (async () => {
        const { data: { user }, error } = await sb.auth.getUser();
        if (error || !user) return;
        currentUser = user;
        const { data } = await sb.from('residents').select('first_name, last_name').eq('id', user.id).single();
        if (data) document.getElementById('fullName').value = `${data.first_name} ${data.last_name}`;
    })();

    // ============================================
    // COURT SHEET
    // ============================================
    const courtSheet = document.getElementById('courtSheet');
    COURTS.forEach(c => {
        const div = document.createElement('div');
        div.className = 'sheet-option';
        div.textContent = c;
        div.addEventListener('click', () => { selectCourt(c); closeSheet(); });
        courtSheet.appendChild(div);
    });

    function selectCourt(val) {
        selectedCourt = val;
        document.getElementById('courtDisplay').textContent = val;
        document.getElementById('courtDisplay').className = 'selected-text';
        showErr('court', false);
        checkTimeConflict();
    }

    function openSheet() {
        document.getElementById('sheetBackdrop').classList.add('show');
        document.getElementById('courtSheet').classList.add('show');
    }
    function closeSheet() {
        document.getElementById('sheetBackdrop').classList.remove('show');
        document.getElementById('courtSheet').classList.remove('show');
    }

    // ============================================
    // VALIDATION
    // ============================================
    function validateFullName(val) {
        if (!val.trim()) { showErr('fullName', true, 'Full name is required'); return false; }
        showErr('fullName', false); return true;
    }
    function onDateChange(val) {
        const err = validateDate(val);
        if (err) { showErr('date', true, err); showHint('date', false); }
        else { showErr('date', false); showHint('date', true); checkTimeConflict(); }
    }
    function validatePurpose(val) {
        if (!val.trim()) { showErr('purpose', true, 'Purpose is required'); return false; }
        if (val.trim().length < 5) { showErr('purpose', true, 'Purpose must be at least 5 characters'); return false; }
        showErr('purpose', false); return true;
    }
    function validateAll() {
        let ok = true;
        if (!validateFullName(document.getElementById('fullName').value)) ok = false;
        if (!selectedCourt) { showErr('court', true, 'Please select a court'); ok = false; }
        const dateErr = validateDate(document.getElementById('date').value);
        if (dateErr) { showErr('date', true, dateErr); ok = false; }
        if (!validateTimeRange()) ok = false;
        if (!validatePurpose(document.getElementById('purpose').value)) ok = false;
        return ok;
    }

    // ============================================
    // SUBMIT
    // ============================================
    async function handleSubmit() {
        if (!validateAll()) {
            showErrorModal('Please fix the errors before submitting.');
            return;
        }
        if (!currentUser) {
            showErrorModal('Please log in to submit a reservation.');
            return;
        }

        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.classList.add('loading');

        try {
            const conflict = await checkTimeConflict();
            if (conflict) {
                showErrorModal('That time was just booked by someone else. Please choose another.');
                return;
            }

            const from = document.getElementById('timeFrom').value;
            const to = document.getElementById('timeTo').value;
            const now = new Date().toISOString();

            const { error } = await sb.from('reservations').insert([{
                full_name: document.getElementById('fullName').value.trim(),
                court: selectedCourt,
                date: document.getElementById('date').value,
                time_from: from,
                time_to: to,
                purpose: document.getElementById('purpose').value.trim(),
                status: 'INCOMING',
                resident_id: currentUser.id,
                created_at: now,
                updated_at: now,
            }]);
            if (error) throw error;
            document.getElementById('successModal').classList.add('show');

        } catch (err) {
            showErrorModal('Submission Failed: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.classList.remove('loading');
        }
    }

    function closeModal() {
        document.getElementById('successModal').classList.remove('show');
        window.location.href = '/resident/my-requests';
    }

    // ============================================
    // MODAL HELPERS
    // ============================================
    function showErrorModal(msg) {
        document.getElementById('errorModalMsg').textContent = msg;
        document.getElementById('errorModal').classList.add('show');
    }
    function closeErrorModal() {
        document.getElementById('errorModal').classList.remove('show');
    }

    function showErr(field, show, msg) {
        const el = document.getElementById('err-' + field);
        if (!el) return;
        if (msg) el.textContent = msg;
        el.classList.toggle('show', show);
        const input = document.getElementById(field);
        if (input) input.classList.toggle('has-error', show);
        const selectorEl = document.getElementById(field === 'court' ? 'courtSelector' : null);
        if (selectorEl) selectorEl.classList.toggle('has-error', show);
    }
    function showHint(field, show) {
        const el = document.getElementById('hint-' + field);
        if (el) el.classList.toggle('show', show);
    }

    // ============================================
    // STATIC EVENT BINDINGS
    // ============================================
    document.getElementById('btnBack').addEventListener('click', () => { history.back(); });
    
    // Court selector
    document.getElementById('courtSelector').addEventListener('click', openSheet);
    document.getElementById('sheetBackdrop').addEventListener('click', closeSheet);
    
    // Form fields
    document.getElementById('fullName').addEventListener('input', function() { validateFullName(this.value); });
    document.getElementById('date').addEventListener('change', function() { onDateChange(this.value); });
    document.getElementById('timeFrom').addEventListener('input', onTimeChange);
    document.getElementById('timeTo').addEventListener('input', onTimeChange);
    document.getElementById('purpose').addEventListener('input', function() { validatePurpose(this.value); });
    
    // Submit
    document.getElementById('submitBtn').addEventListener('click', handleSubmit);
    
    // Modals
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCloseErrorModal').addEventListener('click', closeErrorModal);
});