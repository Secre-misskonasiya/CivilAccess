document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // SUPABASE SETUP
    // ============================================
    const SUPABASE_URL      = 'https://upfrofppponiqffbssqb.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_tZyxrTJrpd_OD5-TKUkT8Q__DnuY0tj';
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ============================================
    // STATE
    // ============================================
    let profileData  = { fullName: '', contactNumber: '', address: '', birthdate: '' };
    let selectedDoc  = '';
    let fileIdFile       = null;
    let fileProofFile    = null;
    let file1x1File      = null;

    // ============================================
    // FETCH PROFILE ON LOAD
    // ============================================
    async function loadProfile() {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;
        const { data } = await sb
            .from('residents')
            .select('first_name, last_name, mobile_number, address, birth_date')
            .eq('id', user.id)
            .single();
        if (data) {
            profileData = {
                fullName:      `${data.first_name} ${data.last_name}`,
                contactNumber: data.mobile_number,
                address:       data.address || 'No Address on File',
                birthdate:     data.birth_date || ''
            };
        }
    }
    loadProfile();

    // ============================================
    // DOCUMENT TYPE CHANGE
    // ============================================
    document.getElementById('documentType').addEventListener('change', function() {
        onDocTypeChange(this.value);
    });

    function onDocTypeChange(val) {
        selectedDoc = val;
        showErr('documentType', false);

        const showPrice = val === 'Barangay Clearance';
        document.getElementById('priceBanner').style.display    = showPrice ? 'flex'  : 'none';
        document.getElementById('priceUnderline').style.display = showPrice ? 'block' : 'none';

        const showEmergency = val === 'Barangay ID';
        document.getElementById('emergencySection').style.display = showEmergency ? 'block' : 'none';

        document.getElementById('submitLabel').textContent =
            showPrice ? 'SUBMIT REQUEST (₱30.00)' : 'SUBMIT REQUEST';
    }

    // ============================================
    // FILE UPLOAD HANDLERS
    // ============================================
    document.getElementById('uploadIdBtn').addEventListener('click', () => document.getElementById('fileId').click());
    document.getElementById('uploadProofBtn').addEventListener('click', () => document.getElementById('fileProof').click());
    document.getElementById('upload1x1Btn').addEventListener('click', () => document.getElementById('file1x1').click());

    document.getElementById('fileId').addEventListener('change', function() { onFileSelect('id', this); });
    document.getElementById('fileProof').addEventListener('change', function() { onFileSelect('proof', this); });
    document.getElementById('file1x1').addEventListener('change', function() { onFileSelect('1x1', this); });

    function onFileSelect(type, input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];

        if (!file.type || !file.type.startsWith('image/')) {
            showErrorModal('Invalid file format. Please upload an image file (JPG, PNG, etc.) — videos and other file types are not allowed.');
            input.value = '';
            return;
        }

        if (type === 'id') {
            fileIdFile = file;
            setUploadSelected('uploadIdBtn', 'uploadIdIcon', 'uploadIdLabel', 'ID Selected', 'err-validID');
        } else if (type === 'proof') {
            fileProofFile = file;
            setUploadSelected('uploadProofBtn', 'uploadProofIcon', 'uploadProofLabel', 'Proof Selected', 'err-proofResidency');
        } else if (type === '1x1') {
            file1x1File = file;
            setUploadSelected('upload1x1Btn', 'upload1x1Icon', 'upload1x1Label', '1x1 Image Selected', 'err-twox2Image');
        }
    }

    function setUploadSelected(btnId, iconId, labelId, text, errId) {
        const btn   = document.getElementById(btnId);
        const icon  = document.getElementById(iconId);
        const label = document.getElementById(labelId);
        btn.classList.add('selected');
        btn.classList.remove('has-error');
        icon.className = 'bi bi-check-circle-fill';
        label.textContent = text;
        showErr(errId.replace('err-',''), false);
    }

    // ============================================
    // VALIDATION
    // ============================================
    document.getElementById('purpose').addEventListener('input', function() {
        validatePurpose(this.value);
    });
    document.getElementById('emergencyName').addEventListener('input', function() {
        validateEmergency('emergencyName', this.value);
    });
    document.getElementById('emergencyAddress').addEventListener('input', function() {
        validateEmergency('emergencyAddress', this.value);
    });
    document.getElementById('emergencyContact').addEventListener('input', function() {
        validateEmergency('emergencyContact', this.value);
    });

    function validatePurpose(val) {
        if (!val) { showErr('purpose', true, 'Purpose of request is required'); return false; }
        if (val.length < 5) { showErr('purpose', true, 'Purpose must be at least 5 characters'); return false; }
        if (val.length > 500) { showErr('purpose', true, 'Purpose must be less than 500 characters'); return false; }
        showErr('purpose', false); return true;
    }

    function validateEmergency(field, val) {
        if (field === 'emergencyContact') {
            if (!val) { showErr(field, true, 'Emergency contact number is required'); return false; }
            if (!/^[0-9]{10,11}$/.test(val)) { showErr(field, true, 'Please enter a valid contact number (10-11 digits)'); return false; }
        } else {
            if (!val) { showErr(field, true, `Emergency contact ${field === 'emergencyName' ? 'name' : 'address'} is required`); return false; }
        }
        showErr(field, false); return true;
    }

    function validateAll() {
        let ok = true;
        if (!selectedDoc) { showErr('documentType', true, 'Document type is required'); ok = false; }
        if (!validatePurpose(document.getElementById('purpose').value)) ok = false;
        if (!fileIdFile)    { showErr('validID', true, 'Valid ID is required'); document.getElementById('uploadIdBtn').classList.add('has-error'); ok = false; }
        if (!fileProofFile) { showErr('proofResidency', true, 'Proof of residency is required'); document.getElementById('uploadProofBtn').classList.add('has-error'); ok = false; }
        if (!file1x1File)   { showErr('twox2Image', true, '1x1 image is required'); document.getElementById('upload1x1Btn').classList.add('has-error'); ok = false; }
        if (selectedDoc === 'Barangay ID') {
            if (!validateEmergency('emergencyName',    document.getElementById('emergencyName').value))    ok = false;
            if (!validateEmergency('emergencyAddress', document.getElementById('emergencyAddress').value)) ok = false;
            if (!validateEmergency('emergencyContact', document.getElementById('emergencyContact').value)) ok = false;
        }
        return ok;
    }

    // ============================================
    // SUBMIT
    // ============================================
    document.getElementById('submitBtn').addEventListener('click', handleSubmit);

    async function uploadFile(file, path) {
        const fileName = `${Date.now()}_${file.name}`;
        const { data, error } = await sb.storage
            .from('resident-documents')
            .upload(`${path}/${fileName}`, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        const { data: urlData } = sb.storage.from('resident-documents').getPublicUrl(data.path);
        return urlData.publicUrl;
    }

    async function handleSubmit() {
        if (!validateAll()) {
            showErrorModal('Please fix the errors before submitting.');
            return;
        }

        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.classList.add('loading');

        try {
            const { data: { user } } = await sb.auth.getUser();
            if (!user) throw new Error('No user found. Please log in again.');

            const idUrl    = await uploadFile(fileIdFile,    'valid_ids');
            const proofUrl = await uploadFile(fileProofFile, 'residency_proofs');
            const imgUrl   = await uploadFile(file1x1File,   '2x2_images');

            const now = new Date().toISOString();

            const insertData = {
                resident_id:        user.id,
                full_name:          profileData.fullName,
                contact_number:     profileData.contactNumber,
                address:            profileData.address,
                purpose_of_request: document.getElementById('purpose').value,
                valid_id_url:       idUrl,
                residency_proof_url: proofUrl,
                '2x2_url':          imgUrl,
                document_type:      selectedDoc,
                request_type:       'Document Request',
                status:             'INCOMING',
                date_submitted:     now,
                created_at:         now,
                date_processed:     now,
            };

            if (selectedDoc === 'Barangay ID') {
                insertData.emergency_name    = document.getElementById('emergencyName').value;
                insertData.emergency_address = document.getElementById('emergencyAddress').value;
                insertData.emergency_contact = document.getElementById('emergencyContact').value;
                insertData.birthdate         = profileData.birthdate;
            }

            const { error } = await sb.from('document_requests').insert([insertData]);
            if (error) throw error;

            const showPrice = selectedDoc === 'Barangay Clearance';
            document.getElementById('modalMsg').textContent = showPrice
                ? 'Your document request has been submitted successfully. Please proceed to the barangay hall to pay ₱30.00 once your document is ready for pickup.'
                : 'Your document request has been submitted successfully. Please proceed to the barangay hall once your document is ready for pickup.';
            document.getElementById('successModal').classList.add('show');

        } catch (err) {
            console.error('Submission error:', err);
            showErrorModal('Submission Failed: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.classList.remove('loading');
        }
    }

    // ============================================
    // MODALS
    // ============================================
    function showErrorModal(msg) {
        document.getElementById('errorModalMsg').textContent = msg;
        document.getElementById('errorModal').classList.add('show');
    }
    function closeErrorModal() {
        document.getElementById('errorModal').classList.remove('show');
    }
    function closeModal() {
        document.getElementById('successModal').classList.remove('show');
        window.location.href = '/resident/my-requests';
    }

    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCloseErrorModal').addEventListener('click', closeErrorModal);
    document.getElementById('btnBack').addEventListener('click', () => { history.back(); });

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
});