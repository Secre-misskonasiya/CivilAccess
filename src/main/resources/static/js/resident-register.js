(function() {
    // Everything in this file lives inside this IIFE (immediately-invoked
    // function expression) instead of the top-level script scope.

    // ---- Supabase configuration ----
    const SUPABASE_URL = 'https://upfrofppponiqffbssqb.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_tZyxrTJrpd_OD5-TKUkT8Q__DnuY0tj';
    let supabase = null;
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.error('Failed to initialize Supabase client:', e);
    }

    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobileRx = /^09\d{9}$/;

    let pendingFormData = null;
    let resendTimerInterval = null;
    let otpTimeout = 60;
    let isOtpVerified = false;

    let isEmailTaken = false;
    let emailCheckTimeout = null;
    const DEFAULT_EMAIL_ERROR = 'Please enter a valid email address.';

    function bindClick(id, handler) {
        const el = document.getElementById(id);
        if (!el) {
            console.error('[register.html] Could not find element with id="' + id + '" — its button will not work.');
            return;
        }
        el.addEventListener('click', handler);
    }

    function bindInput(id, handler) {
        const el = document.getElementById(id);
        if (!el) {
            console.error('[register.html] Could not find element with id="' + id + '" — its input handler will not work.');
            return;
        }
        el.addEventListener('input', handler);
    }

    function initRegisterForm() {
        console.log('[register.html] Initializing form controls...');

        bindClick('genderMale', function() { selectGender('Male'); });
        bindClick('genderFemale', function() { selectGender('Female'); });

        bindClick('pwdYes', function() { setToggle('pwd', true); });
        bindClick('pwdNo', function() { setToggle('pwd', false); });
        bindClick('seniorYes', function() { setToggle('senior', true); });
        bindClick('seniorNo', function() { setToggle('senior', false); });

        bindClick('togglePwBtn1', function() { togglePw('password', this); });
        bindClick('togglePwBtn2', function() { togglePw('confirmPassword', this); });

        bindClick('nextBtn', goToStep2);
        bindClick('backBtn', goToStep1);
        bindClick('submitBtn', sendOtp);

        bindInput('email', function() {
            clearTimeout(emailCheckTimeout);
            isEmailTaken = false;
            const email = this.value.trim().toLowerCase();

            const errEl = document.getElementById('err-email');
            errEl.textContent = DEFAULT_EMAIL_ERROR;
            hide('err-email');

            if (!emailRx.test(email)) return;
            emailCheckTimeout = setTimeout(function() {
                checkEmailAvailability(email);
            }, 500);
        });

        try {
            setupOtpInputs();
        } catch (e) {
            console.error('[register.html] setupOtpInputs failed:', e);
        }
        bindClick('resendOtpLink', resendOtp);
        bindClick('verifyOtpBtn', verifyOtp);

        bindInput('mobileNumber', function() {
            this.value = this.value.replace(/\D/g, '');
        });

        const dateInput = document.getElementById('birthDate');
        if (dateInput) {
            const today = new Date();
            const sixteenYearsAgo = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
            dateInput.max = sixteenYearsAgo.toISOString().split('T')[0];
        } else {
            console.error('[register.html] Could not find #birthDate.');
        }

        console.log('[register.html] Form controls initialized.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRegisterForm);
    } else {
        initRegisterForm();
    }

    function selectGender(g) {
        document.getElementById('gender').value = g;
        document.getElementById('genderMale').classList.toggle('active', g === 'Male');
        document.getElementById('genderFemale').classList.toggle('active', g === 'Female');
        hide('err-gender');
    }

    function setToggle(type, val) {
        const yesId = type === 'pwd' ? 'pwdYes' : 'seniorYes';
        const noId = type === 'pwd' ? 'pwdNo' : 'seniorNo';
        const hiddenId = type === 'pwd' ? 'isPwd' : 'isSenior';
        const fieldId = type === 'pwd' ? 'pwdField' : 'seniorField';
        document.getElementById(yesId).classList.toggle('active', val);
        document.getElementById(noId).classList.toggle('active', !val);
        document.getElementById(hiddenId).value = val ? 'true' : 'false';
        document.getElementById(fieldId).classList.toggle('show', val);
        if (!val) {
            const inp = document.getElementById(fieldId).querySelector('input[type="text"]');
            if (inp) inp.value = '';
        }
    }

    function togglePw(fieldId, btn) {
        const inp = document.getElementById(fieldId);
        const pass = inp.type === 'password';
        inp.type = pass ? 'text' : 'password';
        btn.querySelector('i').className = pass ? 'bi bi-eye-slash' : 'bi bi-eye';
    }

    function show(id) { document.getElementById(id).classList.add('show'); }
    function hide(id) { document.getElementById(id).classList.remove('show'); }
    function val(id) { return document.getElementById(id).value.trim(); }

    function showError(msg) {
        const b = document.getElementById('errorBanner');
        b.textContent = msg;
        b.classList.add('show');
        b.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function clearErrors() {
        document.getElementById('errorBanner').classList.remove('show');
        document.querySelectorAll('.field-error').forEach(e => e.classList.remove('show'));
    }

    function getAge(dateStr) {
        if (!dateStr) return null;
        const birth = new Date(dateStr);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    }

    function updatePills(step) {
        for (let i = 1; i <= 2; i++) {
            const pill = document.getElementById('pill-' + i);
            const num = document.getElementById('pill-num-' + i);
            pill.classList.remove('active', 'done');
            if (i < step) {
                pill.classList.add('done');
                num.innerHTML = '<i class="bi bi-check" style="font-size:13px"></i>';
            }
            if (i === step) {
                pill.classList.add('active');
                num.textContent = i;
            }
            if (i > step) {
                num.textContent = i;
            }
        }
    }

    function validateStep1() {
        clearErrors();
        let ok = true;
        if (!val('firstName')) { show('err-firstName'); ok = false; }
        if (!val('lastName')) { show('err-lastName'); ok = false; }
        if (!val('gender')) { show('err-gender'); ok = false; }
        const age = getAge(val('birthDate'));
        if (age === null || age < 16) { show('err-birthDate'); ok = false; }
        if (!val('address')) { show('err-address'); ok = false; }
        if (document.getElementById('isPwd').value === 'true') {
            const v = val('pwdIdUri');
            if (!v || !/^\d+$/.test(v)) { show('err-pwdIdUri'); ok = false; }
        }
        if (document.getElementById('isSenior').value === 'true') {
            const v = val('seniorIdUri');
            if (!v || !/^\d+$/.test(v)) { show('err-seniorIdUri'); ok = false; }
        }
        if (!ok) showError('Please fix the highlighted fields before continuing.');
        return ok;
    }

    function validateStep2() {
        clearErrors();
        let ok = true;
        if (!emailRx.test(val('email'))) {
            document.getElementById('err-email').textContent = DEFAULT_EMAIL_ERROR;
            show('err-email');
            ok = false;
        } else if (isEmailTaken) {
            document.getElementById('err-email').textContent = 'An account with this email already exists. Please sign in instead.';
            show('err-email');
            ok = false;
        }
        if (!mobileRx.test(val('mobileNumber'))) { show('err-mobileNumber'); ok = false; }
        const pw = document.getElementById('password').value;
        const cpw = document.getElementById('confirmPassword').value;
        if (pw.length < 6) { show('err-password'); ok = false; }
        if (pw !== cpw) { show('err-confirmPassword'); ok = false; }
        if (!ok) showError('Please fix the highlighted fields before continuing.');
        return ok;
    }

    async function checkEmailAvailability(email) {
        if (!supabase) return;

        try {
            const { data, error } = await supabase
                .from('residents')
                .select('email')
                .eq('email', email)
                .maybeSingle();

            if (error) {
                console.error('[register.html] Email availability check failed:', error);
                return;
            }

            if (val('email').toLowerCase() !== email) return;

            const errEl = document.getElementById('err-email');
            if (data) {
                isEmailTaken = true;
                errEl.textContent = 'An account with this email already exists. Please sign in instead.';
                show('err-email');
            } else {
                isEmailTaken = false;
                errEl.textContent = DEFAULT_EMAIL_ERROR;
                hide('err-email');
            }
        } catch (err) {
            console.error('[register.html] Email availability check threw:', err);
        }
    }

    function goToStep2() {
        if (!validateStep1()) return;
        document.getElementById('formStep1').classList.remove('active');
        document.getElementById('formStep2').classList.add('active');
        document.getElementById('stepTitle').textContent = 'Account Details';
        document.getElementById('stepSubtitle').textContent = 'Step 2 of 2 — Set up your login credentials';
        updatePills(2);
        document.getElementById('rightPanel').scrollTop = 0;
    }

    function goToStep1() {
        document.getElementById('formStep2').classList.remove('active');
        document.getElementById('formStep1').classList.add('active');
        document.getElementById('stepTitle').textContent = 'Personal Information';
        document.getElementById('stepSubtitle').textContent = 'Step 1 of 2 — Fill in your basic details';
        updatePills(1);
        clearErrors();
        document.getElementById('rightPanel').scrollTop = 0;
    }

    function setupOtpInputs() {
        const otpInputs = document.querySelectorAll('.otp-input');
        otpInputs.forEach((input, index) => {
            input.value = '';
            input.addEventListener('input', function(e) {
                this.value = this.value.replace(/\D/g, '').slice(0, 1);
                if (this.value.length === 1 && index < 5) {
                    otpInputs[index + 1].focus();
                }
            });
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && !this.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
            input.addEventListener('paste', function(e) {
                const paste = (e.clipboardData || window.clipboardData).getData('text');
                const digits = paste.replace(/\D/g, '').slice(0, 6);
                setTimeout(function() {
                    digits.split('').forEach((d, i) => {
                        if (i < 6) otpInputs[i].value = d;
                    });
                    if (digits.length === 6) {
                        document.getElementById('verifyOtpBtn').focus();
                    } else if (digits.length > 0) {
                        otpInputs[Math.min(digits.length, 5)].focus();
                    }
                }, 0);
            });
        });
    }

    async function sendOtp() {
        clearErrors();
        if (!validateStep2()) return;

        if (!supabase) {
            showError('Unable to connect to the verification service. Please refresh the page and try again.');
            return;
        }

        const email = val('email');

        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.innerHTML = '<span style="display:inline-block;width:18px;height:18px;border:2px solid #1a3a30;border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite;"></span> Sending...';

        try {
            pendingFormData = {
                firstName: val('firstName'),
                lastName: val('lastName'),
                gender: val('gender'),
                birthDate: val('birthDate'),
                address: val('address'),
                email: email,
                mobileNumber: val('mobileNumber'),
                password: document.getElementById('password').value,
                isPwd: document.getElementById('isPwd').value === 'true',
                pwdIdUri: val('pwdIdUri'),
                isSenior: document.getElementById('isSenior').value === 'true',
                seniorIdUri: val('seniorIdUri')
            };

            const { error } = await supabase.auth.signInWithOtp({
                email: email,
                options: {
                    shouldCreateUser: true
                }
            });

            if (error) throw error;

            document.getElementById('otpEmailDisplay').textContent = email;
            document.getElementById('otpOverlay').classList.add('show');
            isOtpVerified = false;
            setupOtpInputs();
            document.querySelectorAll('.otp-input')[0].focus();
            startResendTimer();
            document.getElementById('otpError').classList.remove('show');

        } catch (err) {
            console.error('Send OTP error:', err);
            let msg = err.message || 'Failed to send OTP. Please try again.';
            if (msg.includes('already registered')) {
                msg = 'This email is already registered. Please login instead.';
            }
            showError(msg);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-envelope-paper"></i> Send OTP';
        }
    }

    function startResendTimer() {
        otpTimeout = 60;
        const resendLink = document.getElementById('resendOtpLink');
        const timerSpan = document.getElementById('resendTimer');
        const countdownSpan = document.getElementById('countdown');

        resendLink.classList.add('disabled');
        timerSpan.style.display = 'inline';

        if (resendTimerInterval) clearInterval(resendTimerInterval);
        resendTimerInterval = setInterval(() => {
            otpTimeout--;
            countdownSpan.textContent = otpTimeout;
            if (otpTimeout <= 0) {
                clearInterval(resendTimerInterval);
                resendLink.classList.remove('disabled');
                timerSpan.style.display = 'none';
            }
        }, 1000);
    }

    async function resendOtp() {
        if (this.classList.contains('disabled')) return;

        if (!supabase) {
            document.getElementById('otpError').textContent = 'Unable to connect to the verification service. Please refresh the page and try again.';
            document.getElementById('otpError').classList.add('show');
            return;
        }

        if (!pendingFormData) {
            showError('Please fill in your details first.');
            return;
        }

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: pendingFormData.email,
                options: {
                    shouldCreateUser: true
                }
            });
            if (error) throw error;

            document.querySelectorAll('.otp-input').forEach(input => input.value = '');
            document.querySelectorAll('.otp-input')[0].focus();
            startResendTimer();
            document.getElementById('otpError').classList.remove('show');

        } catch (err) {
            document.getElementById('otpError').textContent = err.message;
            document.getElementById('otpError').classList.add('show');
        }
    }

    async function verifyOtp() {
        if (!supabase) {
            document.getElementById('otpError').textContent = 'Unable to connect to the verification service. Please refresh the page and try again.';
            document.getElementById('otpError').classList.add('show');
            return;
        }

        const otpInputs = document.querySelectorAll('.otp-input');
        const otp = Array.from(otpInputs).map(input => input.value).join('');

        if (otp.length !== 6) {
            document.getElementById('otpError').textContent = 'Please enter the complete 6-digit code.';
            document.getElementById('otpError').classList.add('show');
            return;
        }

        const btn = this;
        btn.disabled = true;
        btn.textContent = 'Verifying...';

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email: pendingFormData.email,
                token: otp,
                type: 'email'
            });

            if (error) throw error;

            if (data && data.user) {
                isOtpVerified = true;

                const { error: pwError } = await supabase.auth.updateUser({
                    password: pendingFormData.password
                });
                if (pwError) throw pwError;

                const finalUserId = data.user.id;
                const resId = `RES-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

                const residentRecord = {
                    id: finalUserId,
                    first_name: pendingFormData.firstName || null,
                    last_name: pendingFormData.lastName || null,
                    address: pendingFormData.address || null,
                    birth_date: pendingFormData.birthDate || null,
                    resident_id: resId,
                    email: pendingFormData.email,
                    mobile_number: pendingFormData.mobileNumber || null,
                    gender: pendingFormData.gender || null,
                    isPwd: pendingFormData.isPwd || false,
                    pwdIdUri: pendingFormData.isPwd ? pendingFormData.pwdIdUri : null,
                    isSenior: pendingFormData.isSenior || false,
                    seniorIdUri: pendingFormData.isSenior ? pendingFormData.seniorIdUri : null,
                    account_status: 'UNVERIFIED'
                };

                console.log('[register.html] Inserting resident record:', residentRecord);

                const { error: dbError } = await supabase
                    .from('residents')
                    .upsert([residentRecord]);

                if (dbError) {
                    console.error('[register.html] residents upsert error:', dbError);
                    throw dbError;
                }

                document.getElementById('otpOverlay').classList.remove('show');
                document.getElementById('successOverlay').classList.add('show');
            }

        } catch (err) {
            console.error('Verification error:', err);
            let msg = err.message || 'Invalid or expired code. Please try again.';
            if (msg.includes('Invalid token') || msg.includes('Token has expired')) {
                msg = 'The code you entered is incorrect or has expired. Please check your email for the latest code.';
            }
            document.getElementById('otpError').textContent = msg;
            document.getElementById('otpError').classList.add('show');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Verify Code';
        }
    }
})();