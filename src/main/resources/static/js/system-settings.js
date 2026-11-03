document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // READ SERVER DATA FROM DATA ATTRIBUTES
    // ============================================
    const dataContainer = document.getElementById('settingsDataContainer');
    let savedSettings = {};
    
    try {
        const rawSettings = dataContainer?.getAttribute('data-settings');
        if (rawSettings) {
            // Thymeleaf might encode quotes and ampersands as HTML entities.
            // We decode them before parsing the JSON.
            const decoded = rawSettings.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            savedSettings = JSON.parse(decoded);
        }
    } catch (e) {
        console.error("Failed to parse settings data:", e);
    }

    const SECTIONS = ["Dashboard","Accounts","Blotter","Documents","Announcements","SoS Monitoring","Safety Reports","Program Planner","System Settings"];

    let isDirty = false;
    let originalToggles = {};

    // ============================================
    // MODAL HELPERS
    // ============================================
    function showSuccess(message) {
        document.getElementById('successMessage').innerHTML = message;
        const successModal = new bootstrap.Modal(document.getElementById('successModal'));
        successModal.show();
    }

    function showConfirm(message, title, onConfirm) {
        const confirmModalId = 'dynamicConfirmModal_' + Date.now();
        const confirmModalHtml = `
            <div id="${confirmModalId}" class="modal fade" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content" style="border-radius: 16px;">
                        <div class="modal-header" style="background: linear-gradient(135deg, #30534D, #3d6b63);">
                            <h5 class="modal-title" style="color: white;">${title}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" style="padding: 24px; font-size: 16px;">
                            ${message}
                        </div>
                        <div class="modal-footer" style="border-top: none; padding: 16px 24px;">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="confirmOkBtn_${confirmModalId}" style="background-color: #44C375; border-color: #44C375;">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.querySelectorAll('[id^="dynamicConfirmModal_"]').forEach(modal => modal.remove());
        document.body.insertAdjacentHTML('beforeend', confirmModalHtml);
        const modalEl = document.getElementById(confirmModalId);
        const modal = new bootstrap.Modal(modalEl);
        
        const confirmBtn = document.getElementById(`confirmOkBtn_${confirmModalId}`);
        confirmBtn.onclick = function() {
            modal.hide();
            onConfirm();
        };
        
        modalEl.addEventListener('hidden.bs.modal', function() {
            modalEl.remove();
        });
        
        modal.show();
    }

    function showToast(msg, isError) {
        const t = document.getElementById('toastMsg');
        t.textContent = msg;
        t.className = 'toast-msg' + (isError ? ' error' : '');
        t.style.display = 'block';
        setTimeout(() => { t.style.display = 'none'; }, 3500);
    }

    // ============================================
    // PERMISSIONS
    // ============================================
    function loadPermissions() {
        const role = document.getElementById('roleSelector').value;
        const grid = document.getElementById('permGrid');
        grid.innerHTML = SECTIONS.map(section => {
            const key = 'perm.' + role + '.' + section.replace(/\s+/g, '_');
            const checked = savedSettings[key] === 'true';
            const checkboxId = 'perm_' + key.replace(/\./g, '_');
            return `
            <div class="perm-item">
                <div class="form-check form-switch mb-0">
                    <input class="form-check-input perm-toggle" type="checkbox" data-key="${key}" aria-label="${section}" id="${checkboxId}" ${checked ? 'checked' : ''}>
                </div>
                <label for="${checkboxId}" style="margin:0; cursor:pointer;">${section}</label>
            </div>`;
        }).join('');
    }

    function savePermissionsWithConfirm() {
        const role = document.getElementById('roleSelector').value;
        const roleName = role === 'SECRETARY' ? 'Secretary' : role === 'TREASURER' ? 'Treasurer' : 'Barangay Captain';
        
        showConfirm(
            `Save permission changes for <strong>${roleName}</strong>?`,
            'Confirm Save Permissions',
            function() {
                const payload = {};
                document.querySelectorAll('.perm-toggle').forEach(input => {
                    payload[input.getAttribute('data-key')] = String(input.checked);
                });
                fetch('/api/settings/permissions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(r => {
                    if (r.ok) {
                        Object.assign(savedSettings, payload);
                        showSuccess('Permissions saved successfully!');
                    } else {
                        showToast('Failed to save permissions.', true);
                    }
                }).catch(() => showToast('Network error.', true));
            }
        );
    }

    // ============================================
    // BACKUP DATABASE
    // ============================================
    function backupDatabaseWithConfirm() {
        showConfirm(
            'Are you sure you want to download a backup of the database?',
            'Confirm Backup',
            function() {
                const btn = document.getElementById('backupBtn');
                btn.disabled = true;
                btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Preparing...';

                fetch('/api/settings/backup', { method: 'POST' })
                    .then(response => {
                        if (!response.ok) throw new Error('Backup failed');
                        return response.blob();
                    })
                    .then(blob => {
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
                        a.href = url;
                        a.download = `barangay-backup-${timestamp}.sql`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                        showSuccess('Backup downloaded successfully!');
                    })
                    .catch(() => {
                        showToast('❌ Backup failed. Please try again.', true);
                    })
                    .finally(() => {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="bi bi-download"></i> Download Backup';
                    });
            }
        );
    }

    // ============================================
    // TEST ALERT
    // ============================================
    function sendTestAlertWithConfirm() {
        showConfirm(
            'This will send a test emergency alert email to all active admins. Continue?',
            'Confirm Test Alert',
            function() {
                const btn = document.getElementById('testAlertBtn');
                btn.disabled = true;
                btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending...';
                fetch('/api/settings/test-alert', { method: 'POST' })
                    .then(r => r.text().then(msg => {
                        if (r.ok) {
                            showSuccess('Test alert sent successfully!');
                        } else {
                            showToast('❌ Failed to send alert.', true);
                        }
                    }))
                    .catch(() => showToast('Network error.', true))
                    .finally(() => {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="bi bi-broadcast"></i> Send Test Alert';
                    });
            }
        );
    }

    // ============================================
    // NOTIFICATIONS (Save Bar logic)
    // ============================================
    function loadNotifications() {
        document.querySelectorAll('.notif-toggle').forEach(input => {
            const key = input.getAttribute('data-key');
            const val = savedSettings[key];
            input.checked = (val === 'true');
            originalToggles[key] = input.checked;
        });
    }

    function markDirty() {
        isDirty = true;
        document.getElementById('saveBar').classList.add('show');
    }

    function discardChanges() {
        document.querySelectorAll('.notif-toggle').forEach(input => {
            const key = input.getAttribute('data-key');
            input.checked = originalToggles[key] || false;
        });
        isDirty = false;
        document.getElementById('saveBar').classList.remove('show');
    }

    function saveNotifications() {
        const payload = {};
        document.querySelectorAll('.notif-toggle').forEach(input => {
            payload[input.getAttribute('data-key')] = String(input.checked);
        });
        fetch('/api/settings/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(r => {
            if (r.ok) {
                document.querySelectorAll('.notif-toggle').forEach(input => {
                    originalToggles[input.getAttribute('data-key')] = input.checked;
                });
                isDirty = false;
                document.getElementById('saveBar').classList.remove('show');
                showToast('Notification settings saved.', false);
            } else {
                showToast('Failed to save. Please try again.', true);
            }
        }).catch(() => showToast('Network error.', true));
    }

    // ============================================
    // STATIC EVENT BINDINGS
    // ============================================
    document.getElementById('roleSelector').addEventListener('change', loadPermissions);
    document.getElementById('btnSavePermissions').addEventListener('click', savePermissionsWithConfirm);
    document.getElementById('backupBtn').addEventListener('click', backupDatabaseWithConfirm);
    document.getElementById('testAlertBtn').addEventListener('click', sendTestAlertWithConfirm);
    document.getElementById('btnSaveNotifications').addEventListener('click', saveNotifications);
    document.getElementById('btnDiscardChanges').addEventListener('click', discardChanges);
    document.getElementById('btnRedirectPassword').addEventListener('click', () => {
        window.location.href = '/user-profile';
    });

    // ============================================
    // INIT
    // ============================================
    const status = document.getElementById('accountStatus').value;
    if (status === 'New' || status === 'Newly Updated') {
        document.getElementById('forcePasswordModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    loadNotifications();
    loadPermissions();
});