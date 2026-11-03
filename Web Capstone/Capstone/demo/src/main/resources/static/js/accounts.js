function getCurrentUserRole() {
    return document.getElementById('currentUserRole')?.value || '';
}

function canManageAccounts() {
    const role = getCurrentUserRole();
    return role === 'ADMIN' || role === 'SECRETARY' || role === 'SECRETARIAT STAFF';
}

function canArchive() {
    return getCurrentUserRole() === 'ADMIN';
}

// ─── Tab switching ──────────────────────────────────────────
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('employee-panel').style.display = 'none';
    document.getElementById('residents-panel').style.display = 'none';
    document.getElementById('archived-panel').style.display = 'none';
    document.getElementById('residents-archived-panel').style.display = 'none';
    
    const tabMap = { employee: 0, residents: 1, archives: 2, resarchives: 3 };
    const panelMap = { employee: 'employee-panel', residents: 'residents-panel', archives: 'archived-panel', resarchives: 'residents-archived-panel' };
    
    // Only show tab if it exists (some may be hidden based on role)
    const tabs = document.querySelectorAll('.tab');
    if (tabs[tabMap[tabName]]) {
        tabs[tabMap[tabName]].classList.add('active');
        document.getElementById(panelMap[tabName]).style.display = 'block';
    }
}

// ─── Filter functions ────────────────────────────────────────────────────

function toggleFilter(event, dropdownId) {
    event.stopPropagation();
    document.querySelectorAll('.filter-dropdown').forEach(dd => {
        if (dd.id !== dropdownId) dd.style.display = 'none';
    });
    const dd = document.getElementById(dropdownId);
    dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

function applyFilter(tabKey, value, label, labelElId, colIndex) {
    // Store filter state
    if (!window.activeFilters) window.activeFilters = {};
    if (!window.activeFilters[tabKey]) window.activeFilters[tabKey] = {};
    window.activeFilters[tabKey].value = value;
    window.activeFilters[tabKey].colIndex = colIndex;

    document.getElementById(labelElId).textContent = label;

    const dropdown = document.getElementById(tabKey + '-filter-dropdown');
    dropdown.querySelectorAll('.filter-option').forEach(opt => {
        const check = opt.querySelector('.filter-check');
        const optText = Array.from(opt.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent.trim())
            .join('').trim();
        check.style.display = (optText === label) ? 'inline' : 'none';
    });

    dropdown.style.display = 'none';

    const searchInputId = tabKey === 'employee' ? 'employee-search' :
                          tabKey === 'residents' ? 'residents-search' :
                          tabKey === 'archive' ? 'archive-search' : 'resarchive-search';
    const tableSelector = tabKey === 'employee' ? '#employee-table' :
                          tabKey === 'residents' ? '#resident-table' :
                          tabKey === 'archive' ? '#archived-employee-table' : '#resarchive-table';
    const q = document.getElementById(searchInputId).value.toLowerCase();
    filterRows(tableSelector, q, tabKey);
}

function applyFilterByStatus(tabKey, value, label, labelElId) {
    document.getElementById(labelElId).textContent = label;
    
    const dropdown = document.getElementById(tabKey + '-filter-dropdown');
    dropdown.querySelectorAll('.filter-option').forEach(opt => {
        const check = opt.querySelector('.filter-check');
        const optText = Array.from(opt.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent.trim())
            .join('').trim();
        check.style.display = (optText === label) ? 'inline' : 'none';
    });
    
    dropdown.style.display = 'none';
    
    const tableSelector = '#resident-table';
    const searchInput = document.getElementById('residents-search');
    const q = searchInput ? searchInput.value.toLowerCase() : '';
    
    document.querySelectorAll(tableSelector + ' tbody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        const statusCell = row.getAttribute('data-status') || '';
        
        const matchesSearch = !q || buildRowHaystack(row).includes(q);
        
        let matchesStatus = true;
        if (value !== '') {
            matchesStatus = statusCell === value;
        }
        
        row.setAttribute('data-filtered', (matchesSearch && matchesStatus) ? '' : 'hidden');
    });
}

// Builds a lowercase haystack of everything searchable in a row:
// visible cell text + hidden data-* attributes (email, username, phone…).
function buildRowHaystack(row) {
    let haystack = '';
    const cells = row.querySelectorAll('td');
    // Skip the last cell (Actions column)
    for (let i = 0; i < cells.length - 1; i++) {
        haystack += ' ' + cells[i].textContent;
    }

    // Attributes on the <tr> itself (resident rows carry email here)
    ['data-email','data-username','data-phone','data-resident-id','data-employee']
        .forEach(attr => {
            const v = row.getAttribute(attr);
            if (v) haystack += ' ' + v;
        });

    // Attributes on any buttons inside the row (employee rows carry
    // email/username/phone on the View button)
    row.querySelectorAll('button').forEach(btn => {
        ['data-email','data-username','data-phone','data-employee']
            .forEach(attr => {
                const v = btn.getAttribute(attr);
                if (v) haystack += ' ' + v;
            });
    });

    return haystack.toLowerCase();
}

function filterRows(tableSelector, q, tabKey) {
    const filterVal = window.activeFilters && window.activeFilters[tabKey] ? window.activeFilters[tabKey].value : '';
    const colIndex = window.activeFilters && window.activeFilters[tabKey] ? window.activeFilters[tabKey].colIndex : 3;

    document.querySelectorAll(tableSelector + ' tbody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        const matchesSearch = !q || buildRowHaystack(row).includes(q);
        const cellVal = cells[colIndex] ? cells[colIndex].textContent.trim() : '';
        const matchesFilter = !filterVal || cellVal === filterVal;
        const visible = matchesSearch && matchesFilter;
        row.setAttribute('data-filtered', visible ? '' : 'hidden');
    });
}

function setupSearch(inputId, tableSelector, tabKey) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('keyup', function () {
        filterRows(tableSelector, this.value.toLowerCase(), tabKey);
    });
}

setupSearch('employee-search', '#employee-table', 'employee');
setupSearch('residents-search', '#resident-table', 'residents');
setupSearch('archive-search', '#archived-employee-table', 'archive');
setupSearch('resarchive-search', '#resarchive-table', 'resarchive');

// ─── Modal functions ────────────────────────────────────────────────────

// Account Modal
const modal = document.getElementById("accountModal");
const viewModal = document.getElementById("viewModal");
const adminForm = document.getElementById("adminForm");

let originalUsername = '';
let originalEmail = '';
let originalPhone = '';
let isEditMode = false;
let activeAdminForm = null;
let activeResidentForm = null;

const today = new Date();
const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
const maxDateString = maxDate.toISOString().split('T')[0];

// ─── Password helpers ───────────────────────────────────────
function generatePassword() {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ', lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789', special = '!@#$%';
    const all = upper + lower + digits + special;
    let pwd = '';
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += lower[Math.floor(Math.random() * lower.length)];
    pwd += digits[Math.floor(Math.random() * digits.length)];
    pwd += special[Math.floor(Math.random() * special.length)];
    for (let i = 4; i < 6; i++) pwd += all[Math.floor(Math.random() * all.length)];
    return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

function regenerateCreatePassword() {
    const pwd = generatePassword();
    document.getElementById('password-actual').value = pwd;
    document.getElementById('edit-password-display').value = pwd;
}

function enablePasswordRegen() {
    const pwd = generatePassword();
    document.getElementById('password-actual').value = pwd;
    document.getElementById('password-new-display').textContent = pwd;
    document.getElementById('password-keep-notice').style.display = 'none';
    document.getElementById('password-new-notice').style.display = 'block';
    const btn = document.getElementById('regenToggleBtn');
    btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Regenerate Password';
    btn.style.background = '#1a6e1a';
    btn.onclick = function () {
        const newPwd = generatePassword();
        document.getElementById('password-actual').value = newPwd;
        document.getElementById('password-new-display').textContent = newPwd;
    };
}

// ─── Phone helpers ──────────────────────────────────────────
function enforcePhoneFormat(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 0 && value[0] !== '0') value = '09' + value;
    else if (value.length >= 2 && value.substring(0, 2) !== '09') value = '09' + value.substring(1);
    else if (value.length === 1 && value === '0') value = '09';
    else if (value.length === 0) value = '09';
    if (value.length > 11) value = value.substring(0, 11);
    input.value = value;
    validatePhoneNumber(input);
}

function validatePhoneNumber(input) {
    const value = input.value;
    const isValidFormat = /^09[0-9]{9}$/.test(value);
    const errorMsg = document.getElementById('phone-error');
    const errorMsg2 = document.getElementById('phone-error2');
    if (errorMsg) errorMsg.style.display = 'none';
    if (errorMsg2) errorMsg2.style.display = 'none';
    if (!isValidFormat) {
        if (errorMsg) errorMsg.style.display = 'block';
        updateFieldValidation(input, null, null, false);
        return;
    }
    if (value !== originalPhone && window.phoneList && window.phoneList.includes(value)) {
        if (errorMsg2) errorMsg2.style.display = 'block';
        updateFieldValidation(input, null, null, false);
        return;
    }
    updateFieldValidation(input, null, null, true);
}

// ─── Address builders ───────────────────────────────────────
function buildAddress() {
    const block = document.getElementById('edit-block').value.trim();
    const lot = document.getElementById('edit-lot').value.trim();
    const street = document.getElementById('edit-street').value.trim();
    const village = document.getElementById('edit-village').value;
    document.getElementById('edit-address').value = (block && lot && street && village)
        ? `Block ${block} Lot ${lot} ${street}, ${village}, San Sebastian, Kawit, Cavite` : '';
    if (block && lot && street && village) document.getElementById('address-error').style.display = 'none';
}

function buildResAddress() {
    const block = document.getElementById('res-block').value.trim();
    const lot = document.getElementById('res-lot').value.trim();
    const street = document.getElementById('res-street').value.trim();
    const village = document.getElementById('res-village').value;
    document.getElementById('res-address').value = (block && lot && street && village)
        ? `Block ${block} Lot ${lot} ${street}, ${village}, San Sebastian, Kawit, Cavite` : '';
    if (block && lot && street && village) document.getElementById('res-address-error').style.display = 'none';
}

// ─── Validation helpers ─────────────────────────────────────
function updateFieldValidation(input, iconId, errorId, isValid) {
    if (!input) return false;
    const errorMsg = errorId ? document.getElementById(errorId) : null;
    const isEmpty = (input.tagName === 'SELECT') ? (input.value === '') : (input.value.trim() === '');
    if (isEmpty) {
        input.classList.remove('valid', 'invalid');
        if (errorMsg) errorMsg.style.display = 'none';
        return false;
    }
    if (isValid) {
        input.classList.remove('invalid');
        input.classList.add('valid');
        if (errorMsg) errorMsg.style.display = 'none';
        return true;
    }
    input.classList.remove('valid');
    input.classList.add('invalid');
    if (errorMsg) errorMsg.style.display = 'block';
    return false;
}

function validateField(input, errorId, isValid) {
    const errorMsg = document.getElementById(errorId);
    if (!isValid) {
        input.classList.add('invalid');
        if (errorMsg) errorMsg.style.display = 'block';
        return false;
    }
    input.classList.remove('invalid');
    if (errorMsg) errorMsg.style.display = 'none';
    return true;
}

// ─── Modal open/close ───────────────────────────────────────
function openModal() {
    if (!canManageAccounts()) {
        alert('You do not have permission to create accounts.');
        return;
    }
    
    isEditMode = false;
    document.getElementById("modalTitle").innerText = "Create New Account";
    document.getElementById("submitBtn").innerText = "Save Account";
    
    const currentRole = document.getElementById('currentUserRole').value;
    const roleSelect = document.getElementById('edit-role');
    const allowedRoles = currentRole === 'ADMIN'
        ? ['ADMIN', 'BARANGAY-CAPTAIN', 'TREASURER', 'SECRETARY', 'SECRETARIAT STAFF', 'TANOD']
        : ['SECRETARIAT STAFF', 'TREASURER', 'BARANGAY-CAPTAIN', 'TANOD'];
    
    Array.from(roleSelect.options).forEach(opt => {
        if (opt.value === '') return;
        opt.style.display = allowedRoles.includes(opt.value) ? '' : 'none';
    });
    
    adminForm.reset();
    document.getElementById("edit-id").value = "";
    originalUsername = '';
    originalEmail = '';
    originalPhone = '';
    document.getElementById('edit-employeeId').value = "Auto-generated";
    document.getElementById('edit-phoneNumber').value = '09';
    document.getElementById('edit-birthDate').setAttribute('max', maxDateString);
    document.getElementById('create-password-row').style.display = 'flex';
    document.getElementById('edit-password-row').style.display = 'none';
    document.getElementById('password-hint').style.display = 'block';
    
    const pwd = generatePassword();
    document.getElementById('password-actual').value = pwd;
    document.getElementById('edit-password-display').value = pwd;
    
    ['edit-block','edit-lot','edit-street','edit-village'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    resetProfilePreview();
    document.getElementById('removePhotoFlag').value = 'false';
    resetFormStyles();
    modal.style.display = "block";
}

function closeModal() {
    if (document.getElementById('sendPasswordModal').style.display === 'block') return;
    modal.style.display = "none";
    adminForm.reset();
    ['edit-block','edit-lot','edit-street','edit-village'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    resetProfilePreview();
    document.getElementById('removePhotoFlag').value = 'false';
    resetFormStyles();
    const pic = document.getElementById('profilePicture');
    if (pic) pic.value = '';
}

function resetFormStyles() {
    document.querySelectorAll('.error-msg').forEach(m => m.style.display = 'none');
    document.querySelectorAll('#adminForm input, #adminForm select').forEach(el => el.classList.remove('invalid', 'valid'));
    const fe = document.getElementById('fileError');
    if (fe) fe.style.display = 'none';
}

function openEditModal(id, employee, fName, lName, username, email, role, gender, birth, phone, address, picture) {
    if (!canManageAccounts()) {
        alert('You do not have permission to edit accounts.');
        return;
    }
    
    isEditMode = true;
    document.getElementById("modalTitle").innerText = "Edit Account";
    document.getElementById("submitBtn").innerText = "Update Changes";
    document.getElementById("edit-id").value = id || '';
    document.getElementById("edit-firstName").value = fName || '';
    document.getElementById("edit-lastName").value = lName || '';
    document.getElementById("edit-username").value = username || '';
    document.getElementById("edit-email").value = email || '';
    document.getElementById("edit-phoneNumber").value = phone || '09';
    originalUsername = username || '';
    originalEmail = email || '';
    originalPhone = phone || '';
    
    const addrStr = address || '';
    const blockMatch = addrStr.match(/Block\s+(\S+)/i);
    const lotMatch = addrStr.match(/Lot\s+(\S+)/i);
    const villageMatch = addrStr.match(/(Lancaster Village \d)/i);
    const streetMatch = addrStr.match(/Lot\s+\S+\s+(.+?),\s*Lancaster/i);
    
    document.getElementById('edit-block').value = blockMatch ? blockMatch[1] : '';
    document.getElementById('edit-lot').value = lotMatch ? lotMatch[1] : '';
    document.getElementById('edit-street').value = streetMatch ? streetMatch[1].trim() : '';
    document.getElementById('edit-village').value = villageMatch ? villageMatch[1] : '';
    document.getElementById('edit-address').value = addrStr;
    document.getElementById("edit-gender").value = gender || '';
    document.getElementById("edit-birthDate").value = birth || '';
    document.getElementById("edit-birthDate").setAttribute('max', maxDateString);
    document.getElementById("edit-role").value = role || '';
    
    const currentRoleEdit = document.getElementById('currentUserRole').value;
    const roleSelectEdit = document.getElementById('edit-role');
    const allowedRolesEdit = currentRoleEdit === 'ADMIN'
        ? ['ADMIN', 'BARANGAY-CAPTAIN', 'TREASURER', 'SECRETARY', 'SECRETARIAT STAFF', 'TANOD']
        : ['SECRETARIAT STAFF', 'TREASURER', 'BARANGAY-CAPTAIN', 'TANOD'];
    
    Array.from(roleSelectEdit.options).forEach(opt => {
        if (opt.value === '') return;
        opt.style.display = allowedRolesEdit.includes(opt.value) ? '' : 'none';
    });
    
    const empInput = document.getElementById('edit-employeeId');
    if (empInput) {
        empInput.value = employee || '';
        empInput.readOnly = true;
        empInput.style.backgroundColor = "#f0f0f0";
    }
    
    document.getElementById('create-password-row').style.display = 'none';
    document.getElementById('edit-password-row').style.display = 'block';
    document.getElementById('password-hint').style.display = 'none';
    document.getElementById('password-actual').value = '';
    document.getElementById('password-keep-notice').style.display = 'block';
    document.getElementById('password-new-notice').style.display = 'none';
    
    const regenBtn = document.getElementById('regenToggleBtn');
    regenBtn.innerHTML = '<i class="bi bi-envelope-arrow-up"></i> Generate &amp; Send New Password';
    regenBtn.style.background = '#30534D';
    regenBtn.disabled = false;
    regenBtn.onclick = enablePasswordRegen;
    
    resetFormStyles();
    resetProfilePreview();
    document.getElementById('removePhotoFlag').value = 'false';
    if (picture && picture !== 'null' && picture.trim() !== '') {
        const previewImg = document.getElementById('profilePreviewImg');
        const previewSvg = document.getElementById('profilePreviewSvg');
        previewImg.src = picture;
        previewImg.style.display = 'block';
        previewSvg.style.display = 'none';
        const removeBtn = document.getElementById('removePhotoBtn');
        if (removeBtn) removeBtn.style.display = 'inline-block';
    }
    modal.style.display = "block";
}

// ─── Form submit ────────────────────────────────────────────
adminForm.addEventListener('submit', function (e) {
    e.preventDefault();
    let valid = true;
    valid &= validateField(document.getElementById('edit-firstName'), 'name-error', document.getElementById('edit-firstName').value.trim().length > 0);
    valid &= validateField(document.getElementById('edit-lastName'), 'lastname-error', document.getElementById('edit-lastName').value.trim().length >= 2);
    valid &= validateField(document.getElementById('edit-username'), 'username-error', document.getElementById('edit-username').value.trim().length >= 3);
    valid &= validateField(document.getElementById('edit-email'), 'email-error', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(document.getElementById('edit-email').value));
    valid &= validateField(document.getElementById('edit-phoneNumber'), 'phone-error', /^09[0-9]{9}$/.test(document.getElementById('edit-phoneNumber').value));
    valid &= validateField(document.getElementById('edit-role'), 'role-error', document.getElementById('edit-role').value !== '');
    
    const birthVal = document.getElementById('edit-birthDate').value;
    if (birthVal) valid &= validateField(document.getElementById('edit-birthDate'), 'birthdate-error', new Date(birthVal) <= maxDate);
    
    if (!document.getElementById('edit-address').value.trim()) {
        document.getElementById('address-error').style.display = 'block';
        valid = false;
    }
    if (!valid) return;
    handleFormSubmit(e);
});

function handleFormSubmit(event) {
    event.preventDefault();
    activeAdminForm = adminForm;
    const email = document.getElementById('edit-email').value;
    if (!email) {
        alert("Email is required.");
        return;
    }
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.innerText = "Saving...";
    submitBtn.disabled = true;
    
    if (!isEditMode) {
        document.getElementById('edit-employeeStatus').value = 'New';
        const password = document.getElementById('password-actual').value;
        if (!password) {
            alert("Password not generated. Please click Regenerate.");
            submitBtn.innerText = "Save Changes";
            submitBtn.disabled = false;
            return;
        }
        sendPasswordEmail(email, password);
    } else {
        const newPassword = document.getElementById('password-actual').value;
        if (newPassword.trim() !== '') sendPasswordEmail(email, newPassword);
        else activeAdminForm.submit();
    }
}

function sendPasswordEmail(email, password) {
    const capturedPassword = password;
    document.getElementById("displayEmail").innerText = email;
    document.getElementById("sendPasswordStatus").innerText = "Please wait...";
    document.getElementById("accountModal").style.display = "none";
    document.getElementById("sendPasswordModal").style.display = "block";
    
    fetch('/send-password?email=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(capturedPassword), { method: 'POST' })
        .then(response => {
            document.getElementById("sendPasswordStatus").innerHTML = response.ok
                ? '✅ Password sent successfully! Saving account...'
                : '⚠️ Could not send email, but account will still be saved.';
            document.getElementById('password-actual').value = capturedPassword;
            setTimeout(() => { activeAdminForm.submit(); }, 1200);
        })
        .catch(() => {
            document.getElementById("sendPasswordStatus").innerHTML = '⚠️ Network error — saving account anyway.';
            document.getElementById('password-actual').value = capturedPassword;
            setTimeout(() => { activeAdminForm.submit(); }, 1800);
        });
}

function handleImageUpload(event) {
    const file       = event.target.files[0];
    const fileError  = document.getElementById('fileError');
    const fileNameEl = document.getElementById('fileName');
    const removeBtn  = document.getElementById('removePhotoBtn');
    const previewImg = document.getElementById('profilePreviewImg');
    const previewSvg = document.getElementById('profilePreviewSvg');

    if (!file) return;
    fileError.style.display = 'none';

    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
        fileError.textContent = 'Only PNG/JPG/WEBP allowed';
        fileError.style.display = 'block';
        event.target.value = '';
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        fileError.textContent = 'Max 2MB';
        fileError.style.display = 'block';
        event.target.value = '';
        return;
    }

    // Downscale to max 512×512 and re-encode as JPEG (~50–100 KB).
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const MAX = 512;
            let w = img.width, h = img.height;
            if (w > h && w > MAX) { h = h * MAX / w; w = MAX; }
            else if (h > MAX)     { w = w * MAX / h; h = MAX; }

            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);

            canvas.toBlob(function (blob) {
                const resized = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

                // Replace the file input's contents with the resized blob
                const dt = new DataTransfer();
                dt.items.add(resized);
                event.target.files = dt.files;

                previewImg.src = canvas.toDataURL('image/jpeg', 0.85);
                previewImg.style.display = 'block';
                previewSvg.style.display = 'none';
                if (fileNameEl) fileNameEl.textContent = 'avatar.jpg';
                if (removeBtn)  removeBtn.style.display = 'inline-block';

                const removeFlag = document.getElementById('removePhotoFlag');
                if (removeFlag) removeFlag.value = 'false';
            }, 'image/jpeg', 0.85);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function resetProfilePreview() {
    const pic         = document.getElementById('profilePicture');
    const previewImg  = document.getElementById('profilePreviewImg');
    const previewSvg  = document.getElementById('profilePreviewSvg');
    const fileNameEl  = document.getElementById('fileName');
    const removeBtn   = document.getElementById('removePhotoBtn');
    const fileError   = document.getElementById('fileError');

    if (pic)         pic.value = '';
    if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }
    if (previewSvg)  previewSvg.style.display = 'block';
    if (fileNameEl)  fileNameEl.textContent = '';
    if (removeBtn)   removeBtn.style.display = 'none';
    if (fileError)   fileError.style.display = 'none';
}

// Called when the user clicks "Remove photo" on an existing picture.
// Clears the preview AND tells the server (via the hidden flag) to
// actually delete the stored picture on save.
function removeProfilePhoto() {
    resetProfilePreview();
    const removeFlag = document.getElementById('removePhotoFlag');
    if (removeFlag) removeFlag.value = 'true';
}

// ─── View modal (Employee) ─────────────────────────────────
function openViewModalFromButton(button) {
    const fname = button.getAttribute('data-fname');
    const lname = button.getAttribute('data-lname');
    const picture = button.getAttribute('data-picture');

    document.getElementById('view-id').textContent = button.getAttribute('data-employee') || '';
    document.getElementById('view-fullname').textContent = (fname || '') + ' ' + (lname || '');
    document.getElementById('view-role').textContent = button.getAttribute('data-role') || '';
    document.getElementById('view-email').textContent = button.getAttribute('data-email') || '';
    document.getElementById('view-username').textContent = button.getAttribute('data-username') || '';
    document.getElementById('view-phone').textContent = button.getAttribute('data-phone') || '';
    document.getElementById('view-gender').textContent = button.getAttribute('data-gender') || '';
    document.getElementById('view-birth').textContent = button.getAttribute('data-birth') || '';
    document.getElementById('view-address').textContent = button.getAttribute('data-address') || '';
    document.getElementById('view-status').textContent = button.getAttribute('data-status') || '';

    const img = document.getElementById('view-avatar-img');
    const svg = document.getElementById('view-avatar-svg');
    if (picture && picture !== 'null' && picture.trim() !== '') {
        img.src = picture;
        img.style.display = 'block';
        svg.style.display = 'none';
    } else {
        img.src = '';
        img.style.display = 'none';
        svg.style.display = 'block';
    }

    viewModal.style.display = "block";
}

function closeViewModal() {
    viewModal.style.display = "none";
}

// ─── Resident View Modal ───────────────────────────────────
function openResidentViewModal(button) {
    const firstName = button.getAttribute('data-first-name') || '';
    const lastName = button.getAttribute('data-last-name') || '';
    const residentId = button.getAttribute('data-resident-id') || '';
    const gender = button.getAttribute('data-gender') || '';
    const birth = button.getAttribute('data-birth') || '';
    const phone = button.getAttribute('data-phone') || '';
    const address = button.getAttribute('data-address') || '';
    const email = button.getAttribute('data-email') || '';
    const status = button.getAttribute('data-status') || 'UNVERIFIED';
    const avatar = button.getAttribute('data-avatar') || '';

    document.getElementById('rv_fullname').textContent = firstName + ' ' + lastName;
    document.getElementById('rv_id').textContent = residentId;
    document.getElementById('rv_email').textContent = email;
    document.getElementById('rv_phone').textContent = phone;
    document.getElementById('rv_gender').textContent = gender;
    document.getElementById('rv_birth').textContent = birth;
    document.getElementById('rv_address').textContent = address;
    document.getElementById('rv_status').textContent = status;

    const avatarImg = document.getElementById('rv-avatar-img');
    const avatarSvg = document.getElementById('rv-avatar-svg');
    if (avatar && avatar !== 'null' && avatar !== '') {
        avatarImg.src = avatar;
        avatarImg.style.display = 'block';
        avatarSvg.style.display = 'none';
    } else {
        avatarImg.src = '';
        avatarImg.style.display = 'none';
        avatarSvg.style.display = 'block';
    }

    document.getElementById('residentViewModal').style.display = 'block';
}

// ─── Verify Modal ──────────────────────────────────────────
function openVerifyModal(button) {
    if (!canManageAccounts()) {
        alert('You do not have permission to verify residents.');
        return;
    }

    // Read from the BUTTON, not the row
    const residentId = button.getAttribute('data-id') || '';
    const firstName = button.getAttribute('data-first-name') || '';
    const lastName = button.getAttribute('data-last-name') || '';
    const status = button.getAttribute('data-status') || 'UNVERIFIED';
    
    // Get images from the ROW (they're on the <tr>)
    const row = button.closest('tr');
    const selfie = row.getAttribute('data-selfie') || '';
    const validId = row.getAttribute('data-validid') || '';
    const indigency = row.getAttribute('data-indigency') || '';
    const pwdImage = row.getAttribute('data-pwdimage') || '';
    const seniorImage = row.getAttribute('data-seniorimage') || '';

    console.log('selfie:', selfie ? selfie.substring(0, 50) + '...' : 'NULL');
    console.log('validId:', validId ? validId.substring(0, 50) + '...' : 'NULL');
    console.log('indigency:', indigency ? indigency.substring(0, 50) + '...' : 'NULL');

    window.currentVerifyId = residentId;
    window.currentVerifyName = firstName + ' ' + lastName;
    document.getElementById('verifyName').innerHTML = 'Resident: <strong>' + window.currentVerifyName + '</strong>';
    document.getElementById('verifyStatus').innerText = status;

    function setImage(url, container) {
        if (url && url !== 'null' && url !== '' && url !== 'undefined') {
            let imgSrc = url;
            
            // If it's a file name without a path, prepend the uploads directory
            if (!url.startsWith('data:') && !url.startsWith('http') && !url.startsWith('/')) {
                imgSrc = '/uploads/' + url;
            }
            
            console.log('Loading image from:', imgSrc);
            
            container.innerHTML = '<img src="' + imgSrc + '" style="max-width:100%; max-height:180px; border-radius:8px; cursor:pointer;" onclick="enlargeImage(\'' + imgSrc + '\')">';
        } else {
            container.innerHTML = '<div style="padding:60px;color:#999;">No document</div>';
        }
    }

    setImage(selfie, document.getElementById('selfieImg'));
    setImage(validId, document.getElementById('validIdImg'));
    setImage(indigency, document.getElementById('indigencyImg'));

    const hasPwd = pwdImage && pwdImage !== 'null' && pwdImage !== '';
    const hasSenior = seniorImage && seniorImage !== 'null' && seniorImage !== '';
    const prioritySection = document.getElementById('priorityDocsSection');
    const pwdCard = document.getElementById('pwdDocCard');
    const seniorCard = document.getElementById('seniorDocCard');

    if (hasPwd || hasSenior) {
        prioritySection.style.display = 'flex';
        if (hasPwd) {
            pwdCard.style.display = 'flex';
            pwdCard.style.flexDirection = 'column';
            setImage(pwdImage, document.getElementById('pwdImg'));
        } else {
            pwdCard.style.display = 'none';
        }
        if (hasSenior) {
            seniorCard.style.display = 'flex';
            seniorCard.style.flexDirection = 'column';
            setImage(seniorImage, document.getElementById('seniorImg'));
        } else {
            seniorCard.style.display = 'none';
        }
    } else {
        prioritySection.style.display = 'none';
    }

    const buttonsDiv = document.getElementById('verifyModalButtons');
    if (status === 'VERIFIED') {
        buttonsDiv.style.display = 'none';
    } else {
        buttonsDiv.style.display = 'flex';
    }

    document.getElementById('verifyModal').style.display = 'block';
}

// Setup verify confirmation
document.addEventListener('DOMContentLoaded', function() {
    const verifyBtnConfirm = document.getElementById('verifyConfirmBtn');
    if (verifyBtnConfirm) {
        const newBtn = verifyBtnConfirm.cloneNode(true);
        verifyBtnConfirm.parentNode.replaceChild(newBtn, verifyBtnConfirm);
        newBtn.onclick = function() {
            if (!window.currentVerifyId) {
                alert('No resident selected');
                return;
            }
            if (!canManageAccounts()) {
                alert('You do not have permission to verify residents.');
                return;
            }
            const btn = this;
            btn.disabled = true;
            btn.innerText = 'Processing...';
            fetch('/residents/verify/' + window.currentVerifyId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(function(response) { return response.json(); })
            .then(function(data) {
                if (data.success) {
                    alert('✅ ' + window.currentVerifyName + ' has been VERIFIED!');
                    document.getElementById('verifyModal').style.display = 'none';
                    window.location.reload();
                } else {
                    alert('Error: Could not verify resident');
                    btn.disabled = false;
                    btn.innerText = 'Verify & Set VERIFIED';
                }
            })
            .catch(function() {
                alert('Server error');
                btn.disabled = false;
                btn.innerText = 'Verify & Set VERIFIED';
            });
        };
    }
});

// ─── Image Enlarge ──────────────────────────────────────────
function enlargeImage(src) {
    document.getElementById('enlargedImage').src = src;
    document.getElementById('imageEnlargeModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // prevent background scroll
}

function closeImageEnlarge() {
    document.getElementById('imageEnlargeModal').style.display = 'none';
    document.getElementById('enlargedImage').src = '';
    document.body.style.overflow = '';
}

document.getElementById('imageEnlargeModal').onclick = function(e) {
    if (e.target === this) closeImageEnlarge();
};

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const m = document.getElementById('imageEnlargeModal');
        if (m && m.style.display === 'block') closeImageEnlarge();
    }
});

// ─── Resident Modal ─────────────────────────────────────────
function openEditResidentModal(id, resId, fName, lName, gender, bDate, phone, email, addr) {
    if (!canManageAccounts()) {
        alert('You do not have permission to edit resident accounts.');
        return;
    }
    
    document.getElementById("res-id").value = id;
    document.getElementById("res-residentId").value = resId;
    document.getElementById("res-firstName").value = fName;
    document.getElementById("res-lastName").value = lName;
    document.getElementById("res-gender").value = gender;
    document.getElementById("res-birthDate").value = bDate;
    document.getElementById("res-birthDate").setAttribute('max', maxDateString);
    document.getElementById("res-mobileNumber").value = phone || '09';
    document.getElementById("res-email").value = email;
    
    const addrStr = addr || '';
    const blockMatch = addrStr.match(/Block\s+(\S+)/i);
    const lotMatch = addrStr.match(/Lot\s+(\S+)/i);
    const villageMatch = addrStr.match(/(Lancaster Village \d)/i);
    const streetMatch = addrStr.match(/Lot\s+\S+\s+(.+?),\s*Lancaster/i);
    
    document.getElementById('res-block').value = blockMatch ? blockMatch[1] : '';
    document.getElementById('res-lot').value = lotMatch ? lotMatch[1] : '';
    document.getElementById('res-street').value = streetMatch ? streetMatch[1].trim() : '';
    document.getElementById('res-village').value = villageMatch ? villageMatch[1] : '';
    document.getElementById('res-address').value = addrStr;
    
    document.getElementById("residentModal").style.display = "block";
}

function closeResidentModal() {
    const rm = document.getElementById("residentModal");
    if (rm) rm.style.display = "none";
}

function handleResidentFormSubmit(event) {
    event.preventDefault();
    activeResidentForm = event.currentTarget;
    activeResidentForm.submit();
}

// ─── Confirm modal ─────────────────────────────────────────
let pendingArchiveAction = null;

function openConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    const btn = document.getElementById('confirmContinue');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    pendingArchiveAction = onConfirm;
    newBtn.addEventListener('click', function () {
        if (pendingArchiveAction) pendingArchiveAction();
        closeConfirmModal();
    });
    document.getElementById('confirmModal').style.display = 'block';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    pendingArchiveAction = null;
}

// ─── Archive triggers ──────────────────────────────────────
function triggerAdminDelete(btn) {
    if (!canArchive()) {
        alert('You do not have permission to archive employee accounts.');
        return;
    }
    const deleteUrl = btn.getAttribute('data-url');
    const email = btn.getAttribute('data-email');
    if (!email || email === "undefined") {
        alert("Error: Could not retrieve admin email.");
        return;
    }
    openConfirmModal("Archive Employee Account", `Are you sure you want to archive the account of ${email}? This action can be reverted from the Archives tab.`, function () {
        window.location.href = deleteUrl;
    });
}

function triggerResidentDelete(btn) {
    if (!canArchive()) {
        alert('You do not have permission to archive resident accounts.');
        return;
    }
    const deleteUrl = btn.getAttribute('data-url');
    const fullname = btn.getAttribute('data-fullname');
    if (!fullname || fullname.trim() === '' || fullname === 'null undefined') {
        alert("Error: Could not retrieve resident name.");
        return;
    }
    openConfirmModal("Archive Resident Account", `Are you sure you want to archive the resident account of ${fullname}? This action can be reverted from the Residents Archives tab.`, function () {
        window.location.href = deleteUrl;
    });
}

// ─── Restore Employee ──────────────────────────────────────
function restoreEmployee(id) {
    if (!canArchive()) {
        alert('You do not have permission to restore employee accounts.');
        return;
    }
    if (confirm('Are you sure you want to restore this employee?')) {
        window.location.href = '/restore-admin/' + id;
    }
}

// ─── Restore Resident ──────────────────────────────────────
function restoreResident(id, fullName) {
    if (!canArchive()) {
        alert('You do not have permission to restore resident accounts.');
        return;
    }
    
    if (confirm(`Are you sure you want to restore the resident account of ${fullName}?`)) {
        // Show loading state
        const restoreBtn = document.querySelector(`button[onclick*="restoreResident(${id}"]`);
        if (restoreBtn) {
            restoreBtn.disabled = true;
            restoreBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Restoring...';
        }
        
        fetch('/residents/restore/' + id, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                alert('✅ Resident account restored successfully!');
                window.location.reload();
            } else {
                alert('❌ Error restoring resident account. Please try again.');
                if (restoreBtn) {
                    restoreBtn.disabled = false;
                    restoreBtn.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i> Restore';
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('❌ Server error. Please try again.');
            if (restoreBtn) {
                restoreBtn.disabled = false;
                restoreBtn.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i> Restore';
            }
        });
    }
}

function exportToPDF(panelId) {
    if (!canManageAccounts()) {
        alert('You do not have permission to export data.');
        return;
    }

    const panel = document.getElementById(panelId);
    if (!panel) return;

    const table = panel.querySelector('table');
    if (!table) {
        alert('No table found to export.');
        return;
    }

    const headerText = panel.querySelector('.panel-header')?.innerText || 'Accounts Export';
    const title = headerText;

    const headers = [];
    const headerCells = table.querySelectorAll('thead th');
    for (let i = 0; i < headerCells.length - 1; i++) {
        headers.push(headerCells[i].textContent.trim());
    }

    const rows = [];
    const tbody = table.querySelector('tbody');
    if (tbody) {
        const trs = tbody.querySelectorAll('tr');
        trs.forEach(tr => {
            if (tr.style.display === 'none' || tr.getAttribute('data-filtered') === 'hidden') return;
            const cells = tr.querySelectorAll('td');
            const rowData = [];
            for (let i = 0; i < cells.length - 1; i++) {
                rowData.push(cells[i].textContent.trim());
            }
            if (rowData.length > 0) rows.push(rowData);
        });
    }

    // Columns that need to wrap instead of clip
    const wideColumns = ['Address', 'Priority'];

    // Page header — identical markup/colors to Program Calendar's exportToPDF
    const exportedBy = document.getElementById('currentUserName')?.value || 'Unknown User';

let tableHtml = `
<div style="position:relative;text-align:center;padding-bottom:12px;margin-bottom:20px;border-bottom:3px solid #2d4a44;">
    <div style="position:absolute;left:-30px;top:-25px;display:flex;align-items:center;gap:5px;">
        <img src="/images/seal1.png" alt="Barangay Seal" style="width:16px;height:16px;object-fit:contain;">
        <span style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#888;white-space:nowrap;">CivilAccess Web System</span>
    </div>
    <div style="font-size:22px;font-weight:bold;color:#2d4a44;margin-bottom:4px;">${title}</div>
    <div style="font-size:13px;color:#555;">${new Date().toLocaleString()}</div>
    <div style="font-size:11px;color:#888;margin-top:2px;">Exported by: <strong style="color:#2d4a44;">${exportedBy}</strong></div>
</div>`;

    // Section title — identical markup to calendar's "Upcoming Events" label
    tableHtml += `
    <div style="font-size:13px;font-weight:bold;color:#2d4a44;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #ddd;">
        ${title} <span style="font-weight:normal;font-size:11px;color:#888;">(${rows.length} record${rows.length !== 1 ? 's' : ''})</span>
    </div>`;

    if (rows.length === 0) {
        tableHtml += `<p style="color:#888;text-align:center;padding:20px 0;">No data to display.</p>`;
    } else {
        // Header row — same background/border/padding/font-size as calendar's buildEventsTable()
                let headerRowHtml = '';
        headers.forEach(h => {
            const isWide = wideColumns.includes(h);
            headerRowHtml += `<th style="background-color:#2d4a44 !important;color:white !important;padding:8px;font-size:11px !important;border:1px solid #1a3530;${isWide ? 'min-width:160px;' : 'white-space:nowrap;'}">${h}</th>`;
        });

        // Row styling — same alternating bg and cell padding/font-size as calendar's buildEventsTable()
        let tableRowsHtml = '';
        rows.forEach((row, i) => {
            const bg = i % 2 === 0 ? 'white' : '#f5faf8';
            tableRowsHtml += `<tr style="background:${bg};">`;
            row.forEach((cell, idx) => {
                const isWide = wideColumns.includes(headers[idx]);
                tableRowsHtml += `<td style="border:1px solid #ddd;padding:7px 8px;font-size:11px;vertical-align:top;${isWide ? 'white-space:normal;word-break:break-word;' : 'white-space:nowrap;'}">${cell}</td>`;
            });
            tableRowsHtml += `</tr>`;
        });

        tableHtml += `
        <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;table-layout:auto;">
            <thead><tr>${headerRowHtml}</tr></thead>
            <tbody>${tableRowsHtml}</tbody>
        </table>`;
    }

    tableHtml += `<div style="margin-top:20px;padding-top:10px;border-top:1px solid #e0e0e0;text-align:center;font-size:9px;color:#aaa;">Official document from Brgy. San Sebastian &nbsp;|&nbsp; Confidential</div>`;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'font-family:Arial,sans-serif;padding:36px;background:white;color:#222;';
    wrapper.innerHTML = tableHtml;

    const opt = {
        margin: [0.3, 0.3, 0.3, 0.3],
        filename: `Accounts_${title.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    const exportBtn = panel.querySelector('.export-btn');
    const originalText = exportBtn ? exportBtn.innerHTML : 'Export';
    if (exportBtn) {
        exportBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Generating...';
        exportBtn.disabled = true;
    }

    html2pdf().set(opt).from(wrapper).save()
        .then(() => {
            if (exportBtn) {
                exportBtn.innerHTML = originalText;
                exportBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('PDF generation error:', error);
            alert('Error generating PDF. Please try again.');
            if (exportBtn) {
                exportBtn.innerHTML = originalText;
                exportBtn.disabled = false;
            }
        });
}

// ─── Logout ──────────────────────────────────────────────────
function openLogoutModal() {
    document.getElementById('logoutModal').style.display = 'block';
}

function closeLogoutModal() {
    document.getElementById('logoutModal').style.display = 'none';
}

function confirmLogout() {
    window.location.href = '/logout';
}

// ─── Close modals on outside click ─────────────────────────
window.onclick = function (event) {
    if (!event.target.closest('.filter-dropdown') && !event.target.closest('.filter-btn')) {
        document.querySelectorAll('.filter-dropdown').forEach(dd => dd.style.display = 'none');
    }
    if (event.target === viewModal) closeViewModal();
    const isSending = document.getElementById('sendPasswordModal').style.display === 'block';
    if (event.target === modal && !isSending) closeModal();
    const logoutModal = document.getElementById('logoutModal');
    if (logoutModal && event.target === logoutModal) closeLogoutModal();
    const residentModal = document.getElementById('residentModal');
    if (residentModal && event.target === residentModal) closeResidentModal();
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal && event.target === confirmModal) closeConfirmModal();
    const residentViewModal = document.getElementById('residentViewModal');
    if (residentViewModal && event.target === residentViewModal) {
        residentViewModal.style.display = 'none';
    }
    const verifyModal = document.getElementById('verifyModal');
    if (verifyModal && event.target === verifyModal) {
        verifyModal.style.display = 'none';
    }
    const imageEnlargeModal = document.getElementById('imageEnlargeModal');
    if (imageEnlargeModal && event.target === imageEnlargeModal) {
        imageEnlargeModal.style.display = 'none';
    }
};

// ─── Field validation listeners ─────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    // Setup phone input initial value
    const phoneInput = document.getElementById('edit-phoneNumber');
    if (phoneInput) {
        if (!phoneInput.value) phoneInput.value = '09';
        phoneInput.addEventListener('focus', function() {
            if (this.value.length < 2) this.value = '09';
        });
        phoneInput.addEventListener('keydown', function(e) {
            if ((e.key === 'Backspace' || e.key === 'Delete') && this.selectionStart <= 2) {
                e.preventDefault();
            }
        });
    }

    // Setup other field validations
    document.getElementById('edit-firstName').addEventListener('input', function() {
        const value = this.value.trim();
        const regexValid = /^[a-zA-Z\s-]+$/.test(value);
        document.getElementById('name-error').style.display = value.length > 0 ? 'none' : 'block';
        document.getElementById('name-error2').style.display = (value && !regexValid) ? 'block' : 'none';
        updateFieldValidation(this, null, null, value.length > 0 && regexValid);
    });

    document.getElementById('edit-lastName').addEventListener('input', function() {
        const value = this.value.trim();
        const regexValid = /^[a-zA-Z\s-]+$/.test(value);
        document.getElementById('lastname-error').style.display = 'none';
        document.getElementById('lastname-error2').style.display = 'none';
        if (value.length > 0 && value.length < 2) {
            document.getElementById('lastname-error').style.display = 'block';
            updateFieldValidation(this, null, null, false);
            return;
        }
        if (value && !regexValid) {
            document.getElementById('lastname-error2').style.display = 'block';
            updateFieldValidation(this, null, null, false);
            return;
        }
        updateFieldValidation(this, null, null, value.length >= 2 && regexValid);
    });

    document.getElementById('edit-birthDate').addEventListener('change', function() {
        const isValid = new Date(this.value) <= maxDate;
        document.getElementById('birthdate-error').style.display = isValid ? 'none' : 'block';
        updateFieldValidation(this, null, null, isValid);
    });

    document.getElementById('edit-username').addEventListener('input', function() {
        const value = this.value.trim();
        const regexValid = /^[a-zA-Z0-9-]*$/.test(value);
        ['username-error','username-error2','username-error3'].forEach(id => {
            document.getElementById(id).style.display = 'none';
        });
        if (!value) {
            updateFieldValidation(this, null, null, false);
            return;
        }
        if (value.length < 3) {
            document.getElementById('username-error').style.display = 'block';
            updateFieldValidation(this, null, null, false);
            return;
        }
        if (!regexValid) {
            document.getElementById('username-error2').style.display = 'block';
            updateFieldValidation(this, null, null, false);
            return;
        }
        if (value.toLowerCase() !== originalUsername.toLowerCase() && window.usernameList && window.usernameList.includes(value.toLowerCase())) {
            document.getElementById('username-error3').style.display = 'block';
            updateFieldValidation(this, null, null, false);
            return;
        }
        updateFieldValidation(this, null, null, true);
    });

    document.getElementById('edit-email').addEventListener('input', function() {
        const value = this.value.trim();
        const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        ['email-error','email-error2'].forEach(id => document.getElementById(id).style.display = 'none');
        if (!isValidFormat) {
            document.getElementById('email-error').style.display = 'block';
            updateFieldValidation(this, null, null, false);
            return;
        }
        if (value !== originalEmail && window.emailList && window.emailList.includes(value.toLowerCase())) {
            document.getElementById('email-error2').style.display = 'block';
            updateFieldValidation(this, null, null, false);
            return;
        }
        updateFieldValidation(this, null, null, true);
    });

    document.getElementById('edit-role').addEventListener('change', function() {
        updateFieldValidation(this, null, 'role-error', this.value !== '');
    });

    document.getElementById('edit-gender').addEventListener('change', function() {
        updateFieldValidation(this, null, null, this.value !== '');
    });
});

// ─── Polling ──────────────────────────────────────────────────
console.log("=== POLLING SCRIPT STARTED ===");

(function() {
    var lastDataSnapshot = '';
    
    function checkModals() {
        var ids = ['accountModal','viewModal','residentModal','confirmModal','residentViewModal','verifyModal','sendPasswordModal','imageEnlargeModal','logoutModal'];
        for (var i = 0; i < ids.length; i++) {
            var m = document.getElementById(ids[i]);
            if (m && (m.style.display === 'block' || m.style.display === 'flex')) return true;
        }
        return false;
    }
    
    function poll() {
        if (checkModals()) {
            console.log("[Poll] Modal open, skipped");
            return;
        }
        
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/accounts/api/poll?t=' + Date.now(), true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    var snapshot = JSON.stringify({
                        employees: data.employeeAccounts ? data.employeeAccounts.length : 0,
                        archivedEmployees: data.archivedEmployeeAccounts ? data.archivedEmployeeAccounts.length : 0,
                        residents: data.residentAccounts ? data.residentAccounts.length : 0,
                        archivedResidents: data.archivedResidentAccounts ? data.archivedResidentAccounts.length : 0
                    });
                    
                    if (lastDataSnapshot === '') {
                        lastDataSnapshot = snapshot;
                        console.log("[Poll] Baseline set: " + snapshot);
                    } else if (snapshot !== lastDataSnapshot) {
                        console.log("[Poll] CHANGE DETECTED! Old: " + lastDataSnapshot + " New: " + snapshot);
                        location.reload();
                    }
                } catch(e) {
                    console.log("[Poll] Error: " + e.message);
                }
            }
        };
        xhr.onerror = function() { console.log("[Poll] Network error"); };
        xhr.send();
    }
    
    console.log("[Poll] Running first poll...");
    poll();
    setInterval(poll, 5000);
})();

// ─── Pagination ──────────────────────────────────────────────
(function() {
    const PAGE_SIZE = 7;

    function initPagination(tableId, footerId) {
        const tbody = document.querySelector('#' + tableId + ' tbody');
        const footer = document.getElementById(footerId);
        if (!tbody || !footer) return;

        let currentPage = 1;

        function getVisibleRows() {
            return Array.from(tbody.querySelectorAll('tr')).filter(r => r.getAttribute('data-filtered') !== 'hidden');
        }

        function render() {
            const all = getVisibleRows();
            const total = all.length;
            const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
            if (currentPage > totalPages) currentPage = totalPages;

            const start = (currentPage - 1) * PAGE_SIZE;
            const end = start + PAGE_SIZE;

            Array.from(tbody.querySelectorAll('tr')).forEach(r => {
                if (r.getAttribute('data-filtered') === 'hidden') {
                    r.style.display = 'none';
                    return;
                }
                const idx = all.indexOf(r);
                r.style.display = (idx >= start && idx < end) ? '' : 'none';
            });

            const fromNum = total === 0 ? 0 : start + 1;
            const toNum = Math.min(end, total);

            let paginationHtml = '<ul class="pagination pagination-sm mb-0">';
            if (currentPage > 1) {
                paginationHtml += `<li class="page-item">
                    <a class="page-link" href="#" data-action="prev"><i class="bi bi-arrow-left"></i> Prev</a>
                </li>`;
            }
            for (let p = 1; p <= totalPages; p++) {
                paginationHtml += `<li class="page-item${p === currentPage ? ' active' : ''}">
                    <a class="page-link" href="#" data-action="goto" data-page="${p}">${p}</a>
                </li>`;
            }
            if (currentPage < totalPages) {
                paginationHtml += `<li class="page-item">
                    <a class="page-link" href="#" data-action="next">Next <i class="bi bi-arrow-right"></i></a>
                </li>`;
            }
            paginationHtml += '</ul>';

            footer.innerHTML = `<span>Showing ${fromNum}–${toNum} of ${total}</span><nav>${paginationHtml}</nav>`;
        }

        footer.addEventListener('click', function(e) {
            e.preventDefault();
            const link = e.target.closest('a[data-action]');
            if (!link) return;

            const all = getVisibleRows();
            const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
            const action = link.getAttribute('data-action');

            if (action === 'prev' && currentPage > 1) currentPage--;
            else if (action === 'next' && currentPage < totalPages) currentPage++;
            else if (action === 'goto') currentPage = parseInt(link.getAttribute('data-page'));

            render();
        });

        new MutationObserver(() => {
            currentPage = 1;
            render();
        }).observe(tbody, { attributes: true, subtree: true, attributeFilter: ['data-filtered'] });

        render();
    }

    document.addEventListener('DOMContentLoaded', function() {
        initPagination('employee-table', 'footer-employee');
        initPagination('archived-employee-table', 'footer-archive');
        initPagination('resident-table', 'footer-residents');
        initPagination('resarchive-table', 'footer-resarchive');
    });
})();

// ─── Protected accounts: hide Edit/Update & Archive buttons ──
// The following email addresses have their Edit (Update for employees) and
// Archive buttons hidden on both the Employee and Resident tables.
(function () {
    const PROTECTED_EMAILS = [
        'shamellemserrano@gmail.com',
        'cymieussilvestre@gmail.com',
        'gabbygstb@gmail.com',
        'pogitravis353@gmail.com',
        'jonathanripo27@gmail.com',
        'depechemode19y@gmail.com'
    ].map(e => e.toLowerCase());

    function isProtected(email) {
        return !!email && PROTECTED_EMAILS.indexOf(email.trim().toLowerCase()) !== -1;
    }

    function hideProtectedButtons() {
        // Employee table
        document.querySelectorAll('#employee-table tbody tr').forEach(function (row) {
            const viewBtn = row.querySelector('.view-btn[data-email]');
            if (!viewBtn) return;
            const email = viewBtn.getAttribute('data-email');
            if (isProtected(email)) {
                row.querySelectorAll('.update-btn, .delete-btn').forEach(function (btn) {
                    btn.style.display = 'none';
                });
            }
        });

        // Residents table
        document.querySelectorAll('#resident-table tbody tr').forEach(function (row) {
            let email = row.getAttribute('data-email');
            if (!email) {
                const viewBtn = row.querySelector('.view-btn[data-email]');
                if (viewBtn) email = viewBtn.getAttribute('data-email');
            }
            if (isProtected(email)) {
                row.querySelectorAll('.update-btn, .delete-btn').forEach(function (btn) {
                    btn.style.display = 'none';
                });
            }
        });
    }

    // Run on DOMContentLoaded (main path)
    document.addEventListener('DOMContentLoaded', hideProtectedButtons);

    // Safety net: run once more after everything settles (in case rows are
    // rendered late by the pagination / polling scripts).
    window.addEventListener('load', function () {
        hideProtectedButtons();
        setTimeout(hideProtectedButtons, 500);
    });
})();

// ─── Thymeleaf inline script data ───────────────────────────