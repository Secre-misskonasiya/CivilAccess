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
    // STATE
    // ============================================
    const EQUIPMENT = [
        { label: 'Chair',        value: 'Chair',        price: 15,  unit: 'day' },
        { label: 'Canopy Tent',  value: 'Canopy Tent',  price: 250, unit: 'day' },
        { label: 'Sound System', value: 'Sound System', price: 500, unit: 'day' },
        { label: 'Table',        value: 'Table',        price: 25,  unit: 'day' },
    ];

    let currentUser = null;
    let equipment = EQUIPMENT[0]; // default: Chair

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
        const dt = new Date(y, m-1, d);
        if (dt.getFullYear()!==y || dt.getMonth()!==m-1 || dt.getDate()!==d) return null;
        return dt;
    };
    const daysBetween = (s, e) => {
        const sd = parseLocalDate(s), ed = parseLocalDate(e);
        if (!sd || !ed || ed < sd) return 0;
        return Math.round((ed - sd) / 86400000) + 1;
    };
    const validateRentalDate = (val) => {
        if (!val) return 'Rental date is required';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return 'Use format YYYY-MM-DD';
        const d = parseLocalDate(val);
        if (!d) return 'Invalid date';
        if (d < parseLocalDate(todayStr())) return 'Rental date cannot be in the past';
        return '';
    };
    const validateReturnDate = (val, rentalVal) => {
        if (!val) return 'Expected return date is required';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return 'Use format YYYY-MM-DD';
        const d = parseLocalDate(val);
        if (!d) return 'Invalid date';
        if (d < parseLocalDate(todayStr())) return 'Return date cannot be in the past';
        const rd = parseLocalDate(rentalVal);
        if (rd && d < rd) return 'Return date must be on or after the rental date';
        return '';
    };

    // ============================================
    // HELPERS
    // ============================================
    function showErr(field, show, msg) {
        const el = document.getElementById('err-' + field);
        if (!el) return;
        if (msg) el.textContent = msg;
        el.classList.toggle('show', show);
        const input = document.getElementById(field);
        if (input) input.classList.toggle('has-error', show);
    }
    function showHint(field, show) {
        const el = document.getElementById('hint-' + field);
        if (el) el.classList.toggle('show', show);
    }

    // ============================================
    // FETCH PROFILE
    // ============================================
    (async () => {
        const { data: { user }, error } = await sb.auth.getUser();
        if (error || !user) return;
        currentUser = user;
        const { data } = await sb.from('residents').select('first_name, last_name').eq('id', user.id).single();
        if (data) document.getElementById('renterName').value = `${data.first_name} ${data.last_name}`;
    })();

    // ============================================
    // EQUIPMENT SHEET
    // ============================================
    const sheet = document.getElementById('bottomSheet');
    EQUIPMENT.forEach(eq => {
        const div = document.createElement('div');
        div.className = 'sheet-option' + (eq.value === equipment.value ? ' active' : '');
        div.innerHTML = `
            <div>
                <div class="sheet-option-name">${eq.label}</div>
                <div class="sheet-option-price">₱${eq.price.toLocaleString()}/${eq.unit}</div>
            </div>
            <i class="bi bi-check-circle-fill sheet-check"></i>`;
        div.addEventListener('click', () => selectEquipment(eq));
        sheet.appendChild(div);
    });

    function selectEquipment(eq) {
        equipment = eq;
        document.getElementById('equipName').textContent     = eq.label;
        document.getElementById('equipPriceSub').textContent = `₱${eq.price.toLocaleString()}/${eq.unit}`;
        document.querySelectorAll('.sheet-option').forEach((el, i) => {
            el.classList.toggle('active', EQUIPMENT[i].value === eq.value);
        });
        showErr('equipment', false);
        recalcTotal();
        closeSheet();
    }

    function openSheet() {
        document.getElementById('sheetBackdrop').classList.add('show');
        document.getElementById('bottomSheet').classList.add('show');
    }
    function closeSheet() {
        document.getElementById('sheetBackdrop').classList.remove('show');
        document.getElementById('bottomSheet').classList.remove('show');
    }

    // ============================================
    // QUANTITY
    // ============================================
    function changeQty(delta) {
        const input = document.getElementById('quantity');
        const val = Math.max(1, Math.min(100, (parseInt(input.value) || 1) + delta));
        input.value = val;
        onQtyChange(val);
    }
    function onQtyChange(val) {
        const n = parseInt(val) || 0;
        if (n < 1) showErr('quantity', true, 'Quantity must be at least 1');
        else if (n > 100) showErr('quantity', true, 'Quantity cannot exceed 100');
        else showErr('quantity', false);
        recalcTotal();
    }

    // ============================================
    // DATE CHANGE HANDLERS
    // ============================================
    function onRentalDateChange(val) {
        const err = validateRentalDate(val);
        if (err) { showErr('rentalDate', true, err); showHint('rentalDate', false); }
        else { showErr('rentalDate', false); showHint('rentalDate', true); }
        const ret = document.getElementById('expectedReturn').value;
        if (ret) onReturnDateChange(ret);
        recalcTotal();
    }
    function onReturnDateChange(val) {
        const rental = document.getElementById('rentalDate').value;
        const err = validateReturnDate(val, rental);
        if (err) { showErr('expectedReturn', true, err); showHint('expectedReturn', false); }
        else { showErr('expectedReturn', false); showHint('expectedReturn', true); }
        recalcTotal();
    }

    // ============================================
    // RECALCULATE TOTAL
    // ============================================
    function recalcTotal() {
        const qty = Math.max(0, parseInt(document.getElementById('quantity').value) || 0);
        const days = daysBetween(
            document.getElementById('rentalDate').value,
            document.getElementById('expectedReturn').value
        );
        const total = equipment.price * qty * days;

        document.getElementById('totalUnitPrice').textContent = `₱${equipment.price.toLocaleString()}/${equipment.unit}`;
        document.getElementById('totalQty').textContent = `× ${qty}`;
        document.getElementById('totalDays').textContent = `× ${days} day${days !== 1 ? 's' : ''}`;
        document.getElementById('totalAmount').textContent = `₱${total.toLocaleString()}.00`;
        document.getElementById('submitLabel').textContent = `Create Rental  (₱${total.toLocaleString()}.00)`;

        const chip = document.getElementById('durationChip');
        if (days > 0 && document.getElementById('rentalDate').value && document.getElementById('expectedReturn').value) {
            document.getElementById('durationText').textContent = `${days} day${days !== 1 ? 's' : ''} rental period`;
            chip.classList.add('show');
        } else {
            chip.classList.remove('show');
        }
    }

    // ============================================
    // VALIDATION
    // ============================================
    function validateAll() {
        let ok = true;
        if (!document.getElementById('renterName').value.trim()) {
            showErr('renterName', true, 'Renter name is required'); ok = false;
        } else { showErr('renterName', false); }
        const qty = parseInt(document.getElementById('quantity').value) || 0;
        if (qty < 1) { showErr('quantity', true, 'Quantity must be at least 1'); ok = false; }
        if (qty > 100) { showErr('quantity', true, 'Quantity cannot exceed 100'); ok = false; }
        const rdErr = validateRentalDate(document.getElementById('rentalDate').value);
        if (rdErr) { showErr('rentalDate', true, rdErr); ok = false; }
        const retErr = validateReturnDate(
            document.getElementById('expectedReturn').value,
            document.getElementById('rentalDate').value
        );
        if (retErr) { showErr('expectedReturn', true, retErr); ok = false; }
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
            showErrorModal('Please log in to submit a rental request.');
            return;
        }

        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.classList.add('loading');

        try {
            const qty = parseInt(document.getElementById('quantity').value);
            const days = daysBetween(
                document.getElementById('rentalDate').value,
                document.getElementById('expectedReturn').value
            );
            const total = equipment.price * qty * days;
            const now = new Date().toISOString();

            const { error } = await sb.from('rentals').insert([{
                renter_name: document.getElementById('renterName').value.trim(),
                equipment_type: equipment.value,
                quantity: qty,
                rental_date: document.getElementById('rentalDate').value,
                expected_return_date: document.getElementById('expectedReturn').value,
                total_price: total,
                status: 'INCOMING',
                resident_id: currentUser.id,
                created_at: now,
                updated_at: now,
            }]);
            if (error) throw error;

            document.getElementById('modalTotal').textContent = `₱${total.toLocaleString()}.00`;
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

    function showErrorModal(msg) {
        document.getElementById('errorModalMsg').textContent = msg;
        document.getElementById('errorModal').classList.add('show');
    }
    function closeErrorModal() {
        document.getElementById('errorModal').classList.remove('show');
    }

    // ============================================
    // STATIC EVENT BINDINGS
    // ============================================
    document.getElementById('btnBack').addEventListener('click', () => { history.back(); });
    
    // Equipment selector
    document.getElementById('equipSelector').addEventListener('click', openSheet);
    document.getElementById('sheetBackdrop').addEventListener('click', closeSheet);
    
    // Quantity buttons
    document.getElementById('btnQtyMinus').addEventListener('click', () => changeQty(-1));
    document.getElementById('btnQtyPlus').addEventListener('click', () => changeQty(1));
    document.getElementById('quantity').addEventListener('input', function() { onQtyChange(this.value); });
    
    // Date inputs
    document.getElementById('rentalDate').addEventListener('input', function() { onRentalDateChange(this.value); });
    document.getElementById('expectedReturn').addEventListener('input', function() { onReturnDateChange(this.value); });
    
    // Renter name
    document.getElementById('renterName').addEventListener('input', function() {
        if (!this.value.trim()) showErr('renterName', true, 'Renter name is required');
        else showErr('renterName', false);
    });
    
    // Submit
    document.getElementById('submitBtn').addEventListener('click', handleSubmit);
    
    // Modals
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCloseErrorModal').addEventListener('click', closeErrorModal);
});