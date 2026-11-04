document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // PURE CSS MODAL HELPERS
    // ============================================
    const sysSuccessOkBtn = document.getElementById('sysSuccessOkBtn');
    if (sysSuccessOkBtn) {
        sysSuccessOkBtn.addEventListener('click', function() {
            document.getElementById('sysSuccessOverlay').classList.remove('show');
        });
    }

    const sysErrorOkBtn = document.getElementById('sysErrorOkBtn');
    if (sysErrorOkBtn) {
        sysErrorOkBtn.addEventListener('click', function() {
            document.getElementById('sysErrorOverlay').classList.remove('show');
        });
    }

    const sysConfirmCloseBtn = document.getElementById('sysConfirmCloseBtn');
    const sysConfirmCancelBtn = document.getElementById('sysConfirmCancelBtn');
    if (sysConfirmCloseBtn) {
        sysConfirmCloseBtn.addEventListener('click', function() {
            document.getElementById('sysConfirmOverlay').classList.remove('show');
        });
    }
    if (sysConfirmCancelBtn) {
        sysConfirmCancelBtn.addEventListener('click', function() {
            document.getElementById('sysConfirmOverlay').classList.remove('show');
        });
    }

    window.showSuccess = function(message) {
        document.getElementById('sysSuccessMessage').innerHTML = message;
        document.getElementById('sysSuccessOverlay').classList.add('show');
    };

    window.showError = function(message) {
        document.getElementById('sysErrorMessage').innerHTML = message;
        document.getElementById('sysErrorOverlay').classList.add('show');
    };

    window.showConfirm = function(message, title, onConfirm) {
        document.getElementById('sysConfirmTitle').innerHTML = title;
        document.getElementById('sysConfirmMessage').innerHTML = message;
        const overlay = document.getElementById('sysConfirmOverlay');
        overlay.classList.add('show');
        const okBtn = document.getElementById('sysConfirmOkBtn');
        okBtn.onclick = function() {
            overlay.classList.remove('show');
            onConfirm();
        };
    };

    // ============================================
    // OTP BYPASS LIST
    // ============================================
    const OTP_BYPASS_EMAILS = [
        'silvestre.jhaypee12@gmail.com'
    ];

    function isOtpBypassed(email) {
        if (!email) return false;
        return OTP_BYPASS_EMAILS.includes(email.trim().toLowerCase());
    }

    // ============================================
    // LOGIN FORM LOGIC
    // ============================================
    const loginForm     = document.getElementById('loginForm');
    const emailInput    = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError    = document.getElementById('email-error');
    const loginButton   = document.getElementById('loginButton');
    const loginErrorMsg = document.getElementById('loginErrorMsg');

    let isOtpVerified = false;
    const emailRegex  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    emailInput.addEventListener('input', () => { validateEmail(); updateLoginButton(); });
    emailInput.addEventListener('blur', function() {
        if (this.value.trim() !== '') validateEmail();
    });

    function validateEmail() {
        const email   = emailInput.value.trim();
        const isValid = emailRegex.test(email);
        emailInput.classList.toggle('valid',   isValid);
        emailInput.classList.toggle('invalid', !isValid && email !== '');
        emailError.classList.toggle('show',    !isValid && email !== '');
        return isValid;
    }

    function updateLoginButton() {
        const isEmailValid = emailInput.classList.contains('valid');
        loginButton.disabled = !isEmailValid;
        loginButton.style.opacity = isEmailValid ? '1' : '0.55';
    }

    function showLoginError(msg) {
        loginErrorMsg.textContent = msg;
        loginErrorMsg.classList.add('show');
    }

    function hideLoginError() {
        loginErrorMsg.textContent = '';
        loginErrorMsg.classList.remove('show');
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideLoginError();

        const email    = emailInput.value.trim();
        const password = passwordInput.value;

        if (!password) {
            document.getElementById('password-error').classList.add('show');
            return;
        }

        loginButton.innerText = "Loading...";
        loginButton.disabled = true;

        try {
            const response = await fetch(
                '/check-admin-email?email='    + encodeURIComponent(email) +
                '&password=' + encodeURIComponent(password)
            );

            if (response.ok) {
                if (isOtpBypassed(email)) {
                    console.log('[OTP BYPASS] Skipping 2FA for:', email);
                    isOtpVerified = true;
                    loginForm.submit();
                    return;
                }
                handleAdmin2FA(email);
            } else if (response.status === 403) {
                const message = await response.text();
                resetLoginButton();
                showError(message);
            } else if (response.status === 401) {
                showLoginError("Invalid email or password.");
                resetLoginButton();
            } else {
                isOtpVerified = true;
                loginForm.submit();
            }
        } catch (err) {
            console.error("Connection Error:", err);
            showError("A connection error occurred. Please try again.");
            resetLoginButton();
        }
    });

    async function handleAdmin2FA(email) {
        try {
            const res = await fetch('/send-otp?email=' + encodeURIComponent(email), { method: 'POST' });
            if (res.ok) {
                document.getElementById('displayEmail').innerText = email;
                document.getElementById('otpModal').classList.add('show');
            } else {
                showError("Failed to send verification code. Please try again.");
                resetLoginButton();
            }
        } catch (err) {
            console.error("OTP Error:", err);
            showError("A connection error occurred. Please try again.");
            resetLoginButton();
        }
    }

    function verifyLoginOTP() {
        const otp   = document.getElementById('otp-single-input').value;
        const email = document.getElementById('displayEmail').innerText;
        const btn   = document.getElementById('otpVerifyBtn');

        btn.innerText = "Loading...";
        btn.disabled = true;

        fetch('/verify-otp?otp=' + encodeURIComponent(otp) + '&email=' + encodeURIComponent(email), { method: 'POST' })
          .then(response => {
            if (response.ok) {
              isOtpVerified = true;
              loginForm.submit();
            } else {
              showError("Invalid verification code. Please try again.");
              resetOtpButton();
            }
          })
          .catch(err => {
            console.error("Verification error:", err);
            showError("A connection error occurred. Please try again.");
            resetOtpButton();
          });
    }

    function resetOtpButton() {
        const btn = document.getElementById('otpVerifyBtn');
        if (!btn) return;
        btn.innerText = "Verify & Sign In";
        btn.disabled = false;
    }

    window.closeOtpModal = function() {
        document.getElementById('otpModal').classList.remove('show');
        document.getElementById('otp-single-input').value = '';
        resetOtpButton();
        resetLoginButton();
    };

    document.getElementById('closeOtpBtn').addEventListener('click', closeOtpModal);

    function resetLoginButton() {
        loginButton.innerText = "Sign In";
        loginButton.disabled = false;
        updateLoginButton();
    }

    loginButton.disabled = true;
    loginButton.style.opacity = '0.55';

    // Password toggle
    const togglePassword = document.getElementById('togglePassword');
    togglePassword.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
    });

    // ============================================
    // FORGOT PASSWORD FUNCTIONS
    // ============================================
    const modal           = document.getElementById('forgotPasswordModal');
    const forgotLink      = document.getElementById('forgotPasswordLink');
    const closeModalBtn   = document.getElementById('closeModal');
    const resetEmailInput = document.getElementById('resetEmail');
    const sendOtpBtn      = document.getElementById('sendOtpBtn');
    const verifyOtpBtn    = document.getElementById('verifyOtpBtn');
    const resendLink      = document.getElementById('resendLink');
    const doneBtn         = document.getElementById('doneBtn');
    const forgotOtpInput  = document.getElementById('forgotOtpInput');

    let resendTimer;
    let countdown = 60;

    function showModal()  { modal.classList.add('show');    document.body.style.overflow = 'hidden'; }
    function hideModal()  { modal.classList.remove('show'); document.body.style.overflow = 'auto';   resetModal(); }

    function showStep(n) {
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        document.getElementById('step' + n).classList.add('active');
    }

    function resetModal() {
        showStep(1);
        resetEmailInput.value = '';
        forgotOtpInput.value  = '';
        hideAllMessages();
        clearInterval(resendTimer);
    }

    function hideAllMessages() {
        document.querySelectorAll('.success-message, .modal-error-message')
                .forEach(m => m.classList.remove('show'));
    }

    function showMessage(id, text, isError = false) {
        hideAllMessages();
        const el = document.getElementById(id);
        el.textContent = text;
        el.classList.add('show');
    }

    function startResendTimer() {
        countdown = 60;
        resendLink.classList.add('disabled');
        document.getElementById('timerText').style.display = 'inline';

        resendTimer = setInterval(() => {
          countdown--;
          document.getElementById('timer').textContent = countdown;
          if (countdown <= 0) {
            clearInterval(resendTimer);
            resendLink.classList.remove('disabled');
            document.getElementById('timerText').style.display = 'none';
          }
        }, 1000);
    }

    forgotLink.addEventListener('click', showModal);
    closeModalBtn.addEventListener('click', hideModal);
    modal.addEventListener('click', e => { if (e.target === modal) hideModal(); });
    doneBtn.addEventListener('click', hideModal);

    sendOtpBtn.addEventListener('click', async () => {
        const email = resetEmailInput.value.trim();
        if (!emailRegex.test(email)) {
          showMessage('emailError', 'Please enter a valid email address', true);
          return;
        }
        sendOtpBtn.disabled    = true;
        sendOtpBtn.textContent = 'Sending...';
        try {
          const response = await fetch('/api/forgot-password/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await response.json();
          if (response.ok) {
            document.getElementById('emailDisplay').textContent = email;
            showStep(2);
            startResendTimer();
          } else {
            showMessage('emailError', data.message || 'Email not found. Please try again.', true);
          }
        } catch {
          showMessage('emailError', 'An error occurred. Please try again.', true);
        } finally {
          sendOtpBtn.disabled    = false;
          sendOtpBtn.textContent = 'Send Verification Code';
        }
    });

    verifyOtpBtn.addEventListener('click', async () => {
        const otp = forgotOtpInput.value.trim();
        if (otp.length !== 6) {
          showMessage('otpError', 'Please enter the complete 6-digit code', true);
          return;
        }
        verifyOtpBtn.disabled    = true;
        verifyOtpBtn.textContent = 'Verifying...';
        try {
          const response = await fetch('/api/forgot-password/verify-and-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: resetEmailInput.value.trim(), otp })
          });
          const data = await response.json();
          if (response.ok) {
            document.getElementById('doneEmailDisplay').textContent = resetEmailInput.value.trim();
            showStep(3);
            clearInterval(resendTimer);
          } else {
            showMessage('otpError', data.message || 'Invalid verification code', true);
          }
        } catch {
          showMessage('otpError', 'An error occurred. Please try again.', true);
        } finally {
          verifyOtpBtn.disabled    = false;
          verifyOtpBtn.textContent = 'Verify Code';
        }
    });

    resendLink.addEventListener('click', async () => {
        if (resendLink.classList.contains('disabled')) return;
        try {
          const response = await fetch('/api/forgot-password/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: resetEmailInput.value.trim() })
          });
          if (response.ok) {
            showMessage('otpSuccess', 'New code sent successfully!');
            startResendTimer();
            forgotOtpInput.value = '';
            forgotOtpInput.focus();
          }
        } catch {
          showMessage('otpError', 'Failed to resend code. Please try again.', true);
        }
    });

    // ============================================
    // AUTO-SUBMIT OTP & RESTRICT TO NUMBERS
    // ============================================
    function setupOtpAutoSubmit(inputId, actionCallback) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.addEventListener('input', function() {
          this.value = this.value.replace(/\D/g, '');
          if (this.value.length === 6) {
            this.blur();
            actionCallback();
          }
        });

        input.addEventListener('keydown', function(e) {
          if (e.ctrlKey || e.altKey || e.metaKey) return;
          if (e.key.length === 1 && /\D/.test(e.key)) {
            e.preventDefault();
          }
        });
    }

    setupOtpAutoSubmit('otp-single-input', function() {
        if (!document.getElementById('otpModal').classList.contains('show')) return;
        verifyLoginOTP();
    });

    setupOtpAutoSubmit('forgotOtpInput', function() {
        const step2 = document.getElementById('step2');
        if (!step2 || !step2.classList.contains('active')) return;
        document.getElementById('verifyOtpBtn').click();
    });

    // Attach click listener to OTP verify button
    document.getElementById('otpVerifyBtn').addEventListener('click', verifyLoginOTP);

    // Logo Error Handler
    const logoImg = document.getElementById('logoImg');
    if (logoImg) {
        logoImg.addEventListener('error', function() {
            this.style.display = 'none';
        });
    }
});