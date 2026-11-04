document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // SUPABASE SETUP
    // ============================================
    if (typeof window.supabase === 'undefined') {
        alert('Failed to load authentication service. Please refresh the page.');
        return;
    }
    
    const SUPABASE_URL = 'https://upfrofppponiqffbssqb.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_tZyxrTJrpd_OD5-TKUkT8Q__DnuY0tj';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // ============================================
    // MODAL HELPERS
    // ============================================
    function showForgotPasswordModal() {
        var modal = document.getElementById('fpModalOverlay');
        if (modal) modal.classList.add('show');
    }

    function hideForgotPasswordModal() {
        var modal = document.getElementById('fpModalOverlay');
        if (modal) modal.classList.remove('show');
    }

    // Overlay close
    document.getElementById('fpModalClose').addEventListener('click', hideForgotPasswordModal);
    document.getElementById('fpModalOverlay').addEventListener('click', function(e) {
        if (e.target === this) hideForgotPasswordModal();
    });

    // System overlay buttons
    document.getElementById('sysSuccessOkBtn').addEventListener('click', function() {
        document.getElementById('sysSuccessOverlay').classList.remove('show');
    });
    document.getElementById('sysErrorOkBtn').addEventListener('click', function() {
        document.getElementById('sysErrorOverlay').classList.remove('show');
    });
    document.getElementById('deactOkBtn').addEventListener('click', function() {
        document.getElementById('deactivatedOverlay').classList.remove('show');
    });

    // Logo error handler
    const logoImg = document.getElementById('logoImg');
    if (logoImg) {
        logoImg.addEventListener('error', function() {
            this.style.display = 'none';
        });
    }

    // ============================================
    // FORGOT PASSWORD FLOW
    // ============================================
    document.getElementById('forgotPasswordLink').addEventListener('click', function(e) {
        e.preventDefault();
        showForgotPasswordModal();
    });

    // Password toggle - main form
    var passwordInput = document.getElementById('password');
    var togglePassword = document.getElementById('togglePassword');
    var eyeIcon = document.getElementById('eyeIcon');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function(e) {
            e.preventDefault();
            var show = passwordInput.type === 'password';
            passwordInput.type = show ? 'text' : 'password';
            eyeIcon.className = show ? 'bi bi-eye-slash' : 'bi bi-eye';
        });
    }

    // Password toggle - modal
    document.addEventListener('click', function(e) {
        var eyeBtn = e.target.closest('.fp-modal-eye');
        if (!eyeBtn) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        var targetId = eyeBtn.getAttribute('data-target');
        if (!targetId) return;
        
        var input = document.getElementById(targetId);
        if (!input) return;
        
        var isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        
        var icon = eyeBtn.querySelector('i');
        if (icon) {
            icon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
        }
    });

    // ============================================
    // FORGOT PASSWORD STEPS
    // ============================================
    var fpCurrentEmail = '';
    var resendTimerRef = null;
    var fpStep1 = document.getElementById('fpStep1');
    var fpStep2 = document.getElementById('fpStep2');
    var fpStep3 = document.getElementById('fpStep3');

    function showFpStep(n) {
        [fpStep1, fpStep2, fpStep3].forEach(function(s) { if (s) s.classList.remove('active'); });
        var step = document.getElementById('fpStep' + n);
        if (step) step.classList.add('active');
    }

    // Send OTP
    var fpSendOtpBtn = document.getElementById('fpSendOtpBtn');
    if (fpSendOtpBtn) {
        fpSendOtpBtn.addEventListener('click', async function() {
            var emailInput = document.getElementById('fpEmailInput');
            var email = emailInput ? emailInput.value.trim().toLowerCase() : '';
            
            var errorEl = document.getElementById('fp1Error');
            errorEl.classList.remove('show');

            if (!emailRegex.test(email)) {
                errorEl.textContent = 'Please enter a valid email address.';
                errorEl.classList.add('show');
                return;
            }
            
            this.disabled = true;
            this.textContent = 'Sending...';
            
            try {
                var { data: residentCheck, error: checkError } = await supabase
                    .from('residents').select('email').eq('email', email).single();
                
                if (checkError || !residentCheck) {
                    throw new Error('Email not found in our records.');
                }
                
                var { error } = await supabase.auth.signInWithOtp({
                    email: email,
                    options: { shouldCreateUser: false }
                });
                
                if (error) throw error;
                
                fpCurrentEmail = email;
                document.getElementById('fpStep2Email').textContent = email;
                showFpStep(2);
                startResendTimer();
                
            } catch (err) {
                errorEl.textContent = err.message || 'Failed to send code.';
                errorEl.classList.add('show');
            } finally {
                this.disabled = false;
                this.textContent = 'Send 6-Digit Code';
            }
        });
    }

    // OTP boxes
    var otpBoxes = document.querySelectorAll('.fp-otp-box');
    otpBoxes.forEach(function(box, i) {
        box.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value && i < 5) otpBoxes[i + 1].focus();
        });
        box.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && i > 0) otpBoxes[i - 1].focus();
        });
    });

    function getOtp() {
        var otp = '';
        otpBoxes.forEach(function(b) { otp += b.value; });
        return otp;
    }

    // Verify OTP
    var fpVerifyOtpBtn = document.getElementById('fpVerifyOtpBtn');
    if (fpVerifyOtpBtn) {
        fpVerifyOtpBtn.addEventListener('click', async function() {
            var otp = getOtp();
            var errorEl = document.getElementById('fp2Error');
            errorEl.classList.remove('show');

            if (otp.length !== 6) {
                errorEl.textContent = 'Please enter the complete 6-digit code.';
                errorEl.classList.add('show');
                return;
            }
            
            this.disabled = true;
            this.textContent = 'Verifying...';
            
            try {
                var { error } = await supabase.auth.verifyOtp({
                    email: fpCurrentEmail,
                    token: otp,
                    type: 'email'
                });
                
                if (error) throw error;
                
                if (resendTimerRef) clearInterval(resendTimerRef);
                showFpStep(3);
                
            } catch (err) {
                errorEl.textContent = err.message || 'Invalid or expired code.';
                errorEl.classList.add('show');
            } finally {
                this.disabled = false;
                this.textContent = 'Verify Code';
            }
        });
    }

    // Reset password
    var fpResetBtn = document.getElementById('fpResetBtn');
    if (fpResetBtn) {
        fpResetBtn.addEventListener('click', async function() {
            var newPw = document.getElementById('fpNewPassword').value;
            var confPw = document.getElementById('fpConfirmPassword').value;
            var errorEl = document.getElementById('fp3Error');
            var successEl = document.getElementById('fp3Success');
            
            errorEl.classList.remove('show');
            successEl.classList.remove('show');
            
            if (!newPw || newPw.length < 8) {
                errorEl.textContent = 'Password must be at least 8 characters.';
                errorEl.classList.add('show');
                return;
            }
            if (newPw !== confPw) {
                errorEl.textContent = 'Passwords do not match.';
                errorEl.classList.add('show');
                return;
            }
            
            this.disabled = true;
            this.textContent = 'Resetting...';
            
            try {
                var { error } = await supabase.auth.updateUser({ password: newPw });
                if (error) throw error;
                
                try {
                    await supabase.from('residents').update({ valid_id: newPw }).eq('email', fpCurrentEmail);
                } catch (e) {}
                
                successEl.textContent = 'Password reset successfully!';
                successEl.classList.add('show');
                
                setTimeout(function() {
                    hideForgotPasswordModal();
                    supabase.auth.signOut();
                    
                    setTimeout(function() {
                        showFpStep(1);
                        document.getElementById('fpEmailInput').value = '';
                        document.getElementById('fpNewPassword').value = '';
                        document.getElementById('fpConfirmPassword').value = '';
                        otpBoxes.forEach(function(b) { b.value = ''; });
                        document.querySelectorAll('.fp-modal-error, .fp-modal-success').forEach(function(el) {
                            el.textContent = '';
                            el.classList.remove('show');
                        });
                    }, 300);
                }, 1800);
                
            } catch (err) {
                errorEl.textContent = err.message || 'Failed to reset password.';
                errorEl.classList.add('show');
            } finally {
                this.disabled = false;
                this.textContent = 'Reset Password';
            }
        });
    }

    function startResendTimer() {
        var countdown = 60;
        var link = document.getElementById('fpResendLink');
        var timerTxt = document.getElementById('fpResendTimer');
        var counter = document.getElementById('fpResendCountdown');
        
        if (link) link.classList.add('disabled');
        if (timerTxt) timerTxt.style.display = 'inline';
        if (counter) counter.textContent = countdown;
        
        if (resendTimerRef) clearInterval(resendTimerRef);
        resendTimerRef = setInterval(function() {
            countdown--;
            if (counter) counter.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(resendTimerRef);
                if (link) link.classList.remove('disabled');
                if (timerTxt) timerTxt.style.display = 'none';
            }
        }, 1000);
    }

    var resendLink = document.getElementById('fpResendLink');
    if (resendLink) {
        resendLink.addEventListener('click', async function() {
            if (this.classList.contains('disabled')) return;
            
            var successEl = document.getElementById('fp2Success');
            var errorEl = document.getElementById('fp2Error');
            successEl.classList.remove('show');
            errorEl.classList.remove('show');

            try {
                var { error } = await supabase.auth.signInWithOtp({
                    email: fpCurrentEmail,
                    options: { shouldCreateUser: false }
                });
                
                if (error) throw error;
                
                otpBoxes.forEach(function(b) { b.value = ''; });
                if (otpBoxes[0]) otpBoxes[0].focus();
                successEl.textContent = 'New code sent successfully!';
                successEl.classList.add('show');
                startResendTimer();
                
            } catch (err) {
                errorEl.textContent = 'Failed to resend code.';
                errorEl.classList.add('show');
            }
        });
    }

    // ============================================
    // LOGIN FORM
    // ============================================
    var emailInput = document.getElementById('email');
    var loginButton = document.getElementById('loginButton');

    if (loginButton) {
        loginButton.disabled = true;
        loginButton.style.opacity = '0.55';
    }

    if (emailInput) {
        emailInput.addEventListener('input', function() {
            var valid = emailRegex.test(this.value.trim());
            this.classList.toggle('valid', valid);
            this.classList.toggle('invalid', !valid && this.value.trim() !== '');
            if (loginButton) {
                loginButton.disabled = !valid;
                loginButton.style.opacity = valid ? '1' : '0.55';
            }
        });
    }

    // Clear existing session
    (async function() {
        try {
            var { data: { session } } = await supabase.auth.getSession();
            if (session) await supabase.auth.signOut();
        } catch (e) {}
    })();

    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            var email = emailInput.value.trim().toLowerCase();
            var password = passwordInput.value;
            var errorMsg = document.getElementById('loginErrorMsg');
            
            errorMsg.classList.remove('show');
            
            if (!password) return;
            
            loginButton.textContent = 'Verifying...';
            loginButton.disabled = true;
            
            try {
                var checkRes = await fetch('/resident-check-status?email=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(password));
                
                if (!checkRes.ok) {
                    errorMsg.textContent = await checkRes.text();
                    errorMsg.classList.add('show');
                    resetLoginButton();
                    return;
                }
                
                var result = await checkRes.text();
                var isAdmin = result === 'OK_ADMIN';
                var authData = null;
                
                if (!isAdmin) {
                    var { data, error: authError } = await supabase.auth.signInWithPassword({ email: email, password: password });
                    if (authError) {
                        errorMsg.textContent = 'Invalid email or password.';
                        errorMsg.classList.add('show');
                        resetLoginButton();
                        return;
                    }
                    authData = data;
                }
                
                // Check deactivation status
                var { data: residentData } = await supabase.from('residents').select('account_status, first_name, last_name, id').eq('email', email).single();
                
                if (residentData && residentData.account_status === 'DEACTIVATED') {
                    document.getElementById('deactivatedOverlay').classList.add('show');
                    resetLoginButton();
                    return;
                }
                
                // Store basic info
                localStorage.setItem('userEmail', email);
                if (authData?.user?.id) localStorage.setItem('userId', authData.user.id);
                if (residentData) {
                    localStorage.setItem('residentName', (residentData.first_name + ' ' + residentData.last_name).trim() || email);
                }
                
                // Establish server session
                var formData = new URLSearchParams();
                formData.append('email', email);
                formData.append('password', password);
                
                var sessionRes = await fetch('/resident-login', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
                    body: formData 
                });
                
                // Redirect to dashboard
                window.location.href = '/resident/announcements';
                
            } catch (err) {
                console.error('Login error:', err);
                errorMsg.textContent = 'A connection error occurred.';
                errorMsg.classList.add('show');
                resetLoginButton();
            }
        });
    }

    function resetLoginButton() {
        loginButton.textContent = 'Sign In';
        loginButton.disabled = false;
        loginButton.style.opacity = emailRegex.test(emailInput.value.trim()) ? '1' : '0.55';
    }
});