document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // GLOBALS
    // ============================================
    const SUPABASE_URL = 'https://upfrofppponiqffbssqb.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_tZyxrTJrpd_OD5-TKUkT8Q__DnuY0tj';
    let supabaseClient = null;
    let currentImageUrl = null;
    let otpVerified = false;

    const serverData = window.PROFILE_DATA || {};
    window.usernameList = (serverData.usernameList || []).map(u => u.toLowerCase());
    window.emailList    = (serverData.emailList    || []).map(e => e.toLowerCase());
    window.phoneList    = (serverData.phoneList    || []);

    // ============================================
    // MODAL HELPERS
    // ============================================
    function showSuccessModal(message) {
        document.getElementById('successMessage').innerHTML = message;
        const el = document.getElementById('successModal');
        const instance = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
        instance.show();
    }

    function showErrorModal(message) {
        document.getElementById('errorMessage').innerHTML = message;
        const el = document.getElementById('errorModal');
        const instance = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
        instance.show();
    }

    function initSupabase() {
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else {
            setTimeout(initSupabase, 500);
        }
    }
    const supabaseScript = document.createElement('script');
    supabaseScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    supabaseScript.onload = initSupabase;
    document.head.appendChild(supabaseScript);

    // ============================================
    // FORM VALIDATION STATE
    // ============================================
    const originalValues = {
        username: document.getElementById('username')?.value.trim() || '',
        email: document.getElementById('email')?.value.trim() || '',
        phone: document.getElementById('phone')?.value.trim() || ''
    };

    const passwordReqs = {
        length: { regex: /.{8,}/, element: document.getElementById('req-length') },
        uppercase: { regex: /[A-Z]/, element: document.getElementById('req-uppercase') },
        lowercase: { regex: /[a-z]/, element: document.getElementById('req-lowercase') },
        number: { regex: /[0-9]/, element: document.getElementById('req-number') },
        special: { regex: /[!@#$%^&*(),.?":{}|<>]/, element: document.getElementById('req-special') }
    };

    function getMaxBirthdate() {
        const today = new Date();
        today.setFullYear(today.getFullYear() - 18);
        return today.toISOString().split('T')[0];
    }
    const birthdateEl = document.getElementById('birthdate');
    if (birthdateEl) birthdateEl.setAttribute('max', getMaxBirthdate());

    // ============================================
    // EDIT MODE
    // ============================================
    function enterEditMode() {
        document.getElementById('profilePanel').classList.remove('view-mode');
        document.getElementById('profilePanel').classList.add('edit-mode');
        
        const editHero = document.getElementById('editHeroName');
        if (editHero) editHero.value = document.getElementById('view-fullname').textContent.trim();
        document.getElementById('fullname').value = document.getElementById('view-fullname').textContent.trim();
        document.getElementById('phone').value = document.getElementById('view-phone').textContent.trim();
        document.getElementById('username').value = document.getElementById('view-username').textContent.trim();
        document.getElementById('email').value = document.getElementById('view-email').textContent.trim();
        
        if (document.getElementById('birthdate')) {
            let bd = document.getElementById('view-birthdate').textContent.trim();
            document.getElementById('birthdate').value = (bd === 'Not on record' ? '' : bd);
        }
        if (document.getElementById('address')) {
            let ad = document.getElementById('view-address').textContent.trim();
            document.getElementById('address').value = (ad === 'Not on record' ? '' : ad);
        }
        
        ['fullname', 'username', 'email', 'phone'].forEach(id => {
            document.getElementById(id)?.dispatchEvent(new Event('input'));
        });
        if (birthdateEl) birthdateEl.dispatchEvent(new Event('input'));
        if (document.getElementById('address')) document.getElementById('address').dispatchEvent(new Event('input'));
    }

    function cancelEditMode() {
        document.getElementById('profilePanel').classList.remove('edit-mode');
        document.getElementById('profilePanel').classList.add('view-mode');
        document.querySelectorAll('.vicon').forEach(i => { i.className = 'vicon'; i.textContent = ''; });
        document.querySelectorAll('.err').forEach(m => m.classList.remove('show'));
        currentImageUrl = null;
    }

    // ============================================
    // IMAGE UPLOAD
    // ============================================
    async function uploadImageToSupabase(file) {
        if (!supabaseClient) throw new Error('Supabase client not initialized');
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const fileName = `profile_${timestamp}_${randomString}.jpg`;
        const arrayBuffer = await file.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('admin-documents')
            .upload(fileName, fileData, { contentType: file.type || 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabaseClient.storage.from('admin-documents').getPublicUrl(uploadData.path);
        return urlData.publicUrl;
    }

    function handleImageUpload(event) {
        const file = event.target.files[0];
        const fileError = document.getElementById('fileError');
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            fileError.classList.add('show');
            event.target.value = '';
            return;
        }
        fileError.classList.remove('show');

        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('profilePictureDisplay').innerHTML =
                `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
        };
        reader.readAsDataURL(file);

        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Uploading...';

        uploadImageToSupabase(file)
            .then(imageUrl => {
                currentImageUrl = imageUrl;
                document.getElementById('profilePictureUrlHidden').value = imageUrl;
                updateSaveButton();
                saveBtn.textContent = '💾 Save Changes';
            })
            .catch(err => {
                console.error(err);
                fileError.textContent = 'Upload failed. Please try again.';
                fileError.classList.add('show');
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Save Changes';
                event.target.value = '';
                currentImageUrl = null;
                showErrorModal('Image upload failed. Please try again.');
            });
    }

    // ============================================
    // VALIDATION
    // ============================================
    function updateFieldValidation(input, iconId, isValid) {
        const icon = document.getElementById(iconId);
        if (!input.value.trim()) {
            input.classList.remove('valid', 'invalid');
            if (icon) { icon.className = 'vicon'; icon.textContent = ''; }
            return false;
        }
        if (isValid) {
            input.classList.remove('invalid'); input.classList.add('valid');
            if (icon) { icon.className = 'vicon valid'; icon.textContent = '✓'; }
            return true;
        }
        input.classList.remove('valid'); input.classList.add('invalid');
        if (icon) { icon.className = 'vicon invalid'; icon.textContent = '✗'; }
        return false;
    }

    function updateSaveButton() {
        const baseFields = ['fullname', 'username', 'email', 'phone'];
        const adminFields = document.getElementById('birthdate') ? ['birthdate', 'address'] : [];
        const allValid = [...baseFields, ...adminFields].every(id => document.getElementById(id)?.classList.contains('valid'));
        document.getElementById('saveBtn').disabled = !allValid;
    }

    // ============================================
    // FIELD EVENT LISTENERS
    // ============================================
    document.getElementById('fullname')?.addEventListener('input', function() {
        const value = this.value, trimmed = value.trim();
        ['fullname-error','fullname-error2','fullname-error3'].forEach(id => document.getElementById(id)?.classList.remove('show'));
        if (!trimmed) { document.getElementById('fullname-error')?.classList.add('show'); updateFieldValidation(this, 'fullname-icon', false); }
        else if (!/^[a-zA-Z\s]+$/.test(value)) { document.getElementById('fullname-error2')?.classList.add('show'); updateFieldValidation(this, 'fullname-icon', false); }
        else if (trimmed.split(/\s+/).filter(p => p.length > 0).length < 2) { document.getElementById('fullname-error3')?.classList.add('show'); updateFieldValidation(this, 'fullname-icon', false); }
        else { updateFieldValidation(this, 'fullname-icon', true); }
        const editHero = document.getElementById('editHeroName');
        if (editHero) editHero.value = this.value;
        updateSaveButton();
    });

    document.getElementById('phone')?.addEventListener('input', function() {
        const clean = this.value.trim().replace(/\s/g, '');
        ['phone-error','phone-taken'].forEach(id => document.getElementById(id)?.classList.remove('show'));
        if (!clean) { updateFieldValidation(this, 'phone-icon', false); }
        else if (!/^09\d{9}$/.test(clean)) { document.getElementById('phone-error')?.classList.add('show'); updateFieldValidation(this, 'phone-icon', false); }
        else if (clean !== originalValues.phone && window.phoneList?.includes(clean)) { document.getElementById('phone-taken')?.classList.add('show'); updateFieldValidation(this, 'phone-icon', false); }
        else { updateFieldValidation(this, 'phone-icon', true); }
        updateSaveButton();
    });

    document.getElementById('username')?.addEventListener('input', function() {
        const trimmed = this.value.trim(), lower = trimmed.toLowerCase();
        ['username-error','username-error2','username-taken'].forEach(id => document.getElementById(id)?.classList.remove('show'));
        if (trimmed.length < 3) { document.getElementById('username-error')?.classList.add('show'); updateFieldValidation(this, 'username-icon', false); }
        else if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) { document.getElementById('username-error2')?.classList.add('show'); updateFieldValidation(this, 'username-icon', false); }
        else if (window.usernameList?.includes(lower) && trimmed !== originalValues.username) { document.getElementById('username-taken')?.classList.add('show'); updateFieldValidation(this, 'username-icon', false); }
        else { updateFieldValidation(this, 'username-icon', true); }
        updateSaveButton();
    });

    document.getElementById('email')?.addEventListener('input', function() {
        const trimmed = this.value.trim(), lower = trimmed.toLowerCase();
        ['email-error','email-taken'].forEach(id => document.getElementById(id)?.classList.remove('show'));
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { document.getElementById('email-error')?.classList.add('show'); updateFieldValidation(this, 'email-icon', false); }
        else if (window.emailList?.includes(lower) && trimmed !== originalValues.email) { document.getElementById('email-taken')?.classList.add('show'); updateFieldValidation(this, 'email-icon', false); }
        else { updateFieldValidation(this, 'email-icon', true); }
        updateSaveButton();
    });

    if (birthdateEl) {
        birthdateEl.addEventListener('input', function() {
            ['birthdate-error','birthdate-error-age'].forEach(id => document.getElementById(id)?.classList.remove('show'));
            if (!this.value) { updateFieldValidation(this, 'birthdate-icon', true); updateSaveButton(); return; }
            const birth = new Date(this.value), today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            if (age < 18) { document.getElementById('birthdate-error-age')?.classList.add('show'); updateFieldValidation(this, 'birthdate-icon', false); }
            else { updateFieldValidation(this, 'birthdate-icon', true); }
            updateSaveButton();
        });
    }

    const addressEl = document.getElementById('address');
    if (addressEl) {
        addressEl.addEventListener('input', function() {
            document.getElementById('address-error')?.classList.remove('show');
            const len = this.value.trim().length;
            if (len > 0 && len < 5) { document.getElementById('address-error')?.classList.add('show'); updateFieldValidation(this, 'address-icon', false); }
            else { updateFieldValidation(this, 'address-icon', len >= 5 || len === 0); }
            updateSaveButton();
        });
    }

    // ============================================
    // FORM SUBMISSIONS
    // ============================================
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const fullname = document.getElementById('fullname').value.trim();
            const parts = fullname.split(/\s+/);
            document.getElementById('hiddenFirstName').value = parts[0] || '';
            document.getElementById('hiddenLastName').value = parts.slice(1).join(' ') || '';
            document.getElementById('hiddenUsername').value = document.getElementById('username').value.trim();
            document.getElementById('hiddenEmail').value = document.getElementById('email').value.trim();
            document.getElementById('hiddenPhoneNumber').value = document.getElementById('phone').value.trim();

            if (document.getElementById('birthdate')) {
                document.getElementById('hiddenBirthDate').value = document.getElementById('birthdate').value.trim();
            }
            if (document.getElementById('address')) {
                document.getElementById('hiddenAddress').value = document.getElementById('address').value.trim();
            }
            if (currentImageUrl) {
                document.getElementById('profilePictureUrlHidden').value = currentImageUrl;
            }

            const form = document.getElementById('profileForm');
            const formData = new FormData(form);
            const saveBtn = document.getElementById('saveBtn');
            saveBtn.disabled = true;

            fetch(form.action, { method: 'POST', body: formData })
                .then(response => {
                    if (response.ok) {
                        const successEl = document.getElementById('successModal');
                        successEl.addEventListener('hidden.bs.modal', function onHide() {
                            successEl.removeEventListener('hidden.bs.modal', onHide);
                            window.location.reload();
                        });
                        showSuccessModal('Profile updated successfully!');
                    } else {
                        showErrorModal('Failed to update profile. Please try again.');
                        saveBtn.disabled = false;
                    }
                })
                .catch(() => {
                    showErrorModal('An error occurred while saving your profile.');
                    saveBtn.disabled = false;
                });
        });
    }

    // ============================================
    // PASSWORD MODAL
    // ============================================
    function sendOtp() {
        const email = document.getElementById('otpEmail').value.trim();
        if (!email) { showErrorModal('Please enter your email first.'); return; }
        fetch('/send-otp?email=' + encodeURIComponent(email), { method: 'POST' })
            .then(r => r.text()).then(msg => showSuccessModal(msg))
            .catch(() => showErrorModal('Failed to send OTP.'));
    }

    function verifyOtp() {
        const otp = document.getElementById('otpInput').value.trim();
        return fetch('/verify-otp?otp=' + encodeURIComponent(otp), { method: 'POST' })
            .then(r => {
                if (r.ok) {
                    otpVerified = true;
                    document.getElementById('otp-error').style.display = 'none';
                    document.getElementById('otp-success').style.display = 'block';
                    return true;
                }
                otpVerified = false;
                document.getElementById('otp-error').style.display = 'block';
                document.getElementById('otp-success').style.display = 'none';
                return false;
            });
    }

    function openPasswordModal() { 
        otpVerified = false; 
        document.getElementById('passwordModal').classList.add('active'); 
        document.getElementById('changePasswordBtn').disabled = true; 
    }
    function closePasswordModal() { 
        document.getElementById('passwordModal').classList.remove('active'); 
        document.getElementById('newPassword').value = ''; 
        document.getElementById('confirmPassword').value = ''; 
        document.getElementById('otpInput').value = ''; 
        document.getElementById('otp-error').style.display = 'none'; 
        document.getElementById('otp-success').style.display = 'none'; 
        otpVerified = false; 
        document.getElementById('password-requirements')?.classList.remove('show'); 
        Object.values(passwordReqs).forEach(r => r.element.classList.remove('met')); 
    }

    document.getElementById('newPassword')?.addEventListener('focus', () => document.getElementById('password-requirements')?.classList.add('show'));
    document.getElementById('newPassword')?.addEventListener('input', function() {
        const pwd = this.value;
        let allMet = true;
        Object.values(passwordReqs).forEach(req => {
            req.regex.test(pwd) ? req.element.classList.add('met') : (req.element.classList.remove('met'), allMet = false);
        });
        if (allMet && pwd.length > 0) { this.classList.remove('invalid'); this.classList.add('valid'); }
        else if (pwd.length > 0) { this.classList.remove('valid'); this.classList.add('invalid'); }
        else { this.classList.remove('valid','invalid'); }
        updatePasswordModalButton();
    });
    document.getElementById('confirmPassword')?.addEventListener('input', function() {
        const match = this.value.length > 0 && document.getElementById('newPassword').value === this.value;
        document.getElementById('confirm-password-error').classList.toggle('show', !match && this.value.length > 0);
        if (match) { this.classList.remove('invalid'); this.classList.add('valid'); }
        else if (this.value.length > 0) { this.classList.remove('valid'); this.classList.add('invalid'); }
        else { this.classList.remove('valid','invalid'); }
        updatePasswordModalButton();
    });
    document.getElementById('otpInput')?.addEventListener('input', function() {
        if (this.value.trim().length === 6) verifyOtp().then(() => updatePasswordModalButton());
        else { otpVerified = false; updatePasswordModalButton(); }
    });

    function updatePasswordModalButton() { 
        document.getElementById('changePasswordBtn').disabled = !(otpVerified && document.getElementById('newPassword')?.classList.contains('valid') && document.getElementById('confirmPassword')?.classList.contains('valid')); 
    }

    const passwordForm = document.getElementById('passwordChangeForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(event) {
            event.preventDefault();

            if (!otpVerified) { showErrorModal('Please verify your OTP first.'); return; }
            if (!document.getElementById('newPassword').classList.contains('valid') || !document.getElementById('confirmPassword').classList.contains('valid')) { showErrorModal('Please enter a valid password.'); return; }
            document.getElementById('pwdHiddenPassword').value = document.getElementById('newPassword').value;
            const parts = document.getElementById('fullname').value.trim().split(/\s+/);
            document.getElementById('pwdHiddenFirstName').value = parts[0] || '';
            document.getElementById('pwdHiddenLastName').value = parts.slice(1).join(' ') || '';
            document.getElementById('pwdHiddenUsername').value = document.getElementById('username').value.trim();
            document.getElementById('pwdHiddenEmail').value = document.getElementById('email').value.trim();
            document.getElementById('pwdHiddenPhoneNumber').value = document.getElementById('phone').value.trim();

            const form = document.getElementById('passwordChangeForm');
            const formData = new FormData(form);
            const btn = document.getElementById('changePasswordBtn');
            btn.disabled = true;

            fetch(form.action, { method: 'POST', body: formData })
                .then(response => {
                    if (response.ok) {
                        closePasswordModal();
                        showSuccessModal('Password changed successfully!');
                    } else {
                        showErrorModal('Failed to change password. Please try again.');
                        btn.disabled = false;
                    }
                })
                .catch(() => {
                    showErrorModal('An error occurred while changing your password.');
                    btn.disabled = false;
                });
        });
    }

    function togglePwd(inputId) { 
        const input = document.getElementById(inputId);
        if (!input) return;
        
        const iconId = inputId === 'newPassword' ? 'newPasswordIcon' : 'confirmPasswordIcon';
        const icon = document.getElementById(iconId);
        
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) {
                icon.classList.remove('bi-eye-slash');
                icon.classList.add('bi-eye');
            }
        } else {
            input.type = 'password';
            if (icon) {
                icon.classList.remove('bi-eye');
                icon.classList.add('bi-eye-slash');
            }
        }
    }

    // ============================================
    // STATIC EVENT BINDINGS
    // ============================================
    document.getElementById('btnEditProfile').addEventListener('click', enterEditMode);
    document.getElementById('btnCancelEdit').addEventListener('click', cancelEditMode);
    document.getElementById('btnChangePassword').addEventListener('click', openPasswordModal);
    document.getElementById('btnClosePasswordModal').addEventListener('click', closePasswordModal);
    document.getElementById('btnCancelPassword').addEventListener('click', closePasswordModal);
    document.getElementById('avatarEditBtn').addEventListener('click', () => document.getElementById('profileImageInput').click());
    document.getElementById('profileImageInput').addEventListener('change', handleImageUpload);
    document.getElementById('btnSendOtp').addEventListener('click', sendOtp);
    
    document.querySelectorAll('.toggle-pwd-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            togglePwd(this.getAttribute('data-target'));
        });
    });

    // ============================================
    // INIT
    // ============================================
    window.addEventListener('load', () => {
        ['fullname','username','email','phone'].forEach(id => document.getElementById(id)?.dispatchEvent(new Event('input')));
        if (birthdateEl) birthdateEl.dispatchEvent(new Event('input'));
        if (addressEl) addressEl.dispatchEvent(new Event('input'));
    });
});