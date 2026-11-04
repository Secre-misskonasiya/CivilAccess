// rbac-check.js - Include in all pages
document.addEventListener('DOMContentLoaded', function() {
    // Check both possible hidden input IDs
    const role = document.getElementById('dataCurrentRole')?.value || 
                 document.getElementById('currentUserRole')?.value ||
                 window.userPermissions?.role || 
                 'GUEST';
    
    window.currentRole = role;
    
    // Apply role-based restrictions
    applyRoleRestrictions(role);
});

function applyRoleRestrictions(role) {
    switch(role) {
        case 'BARANGAY-CAPTAIN':
            applyCaptainRestrictions();
            break;
        case 'TREASURER':
            applyTreasurerRestrictions();
            break;
        case 'SECRETARY':
            applySecretaryRestrictions();
            break;
        case 'ADMIN':
            // No restrictions - full access
            break;
        default:
            // Guest or unknown - apply maximum restrictions
            applyCaptainRestrictions();
            break;
    }
}

function applyCaptainRestrictions() {
    console.log('Applying Barangay Captain restrictions (View Only mode)');
    
    // 1. Hide all action buttons with specific classes
    const actionClasses = [
        '.btn-add', '.btn-edit', '.btn-delete', '.btn-manage', 
        '.btn-verify', '.btn-restore', '.btn-update-status',
        '.btn-approve', '.btn-reject', '.btn-save', '.btn-submit',
        '.btn-create', '.btn-remove', '.btn-cancel-request'
    ];
    
    actionClasses.forEach(selector => {
        document.querySelectorAll(selector).forEach(btn => {
            btn.style.display = 'none';
            btn.disabled = true;
        });
    });
    
    // 2. Hide forms with create/edit/delete actions
    const formActions = ['create', 'edit', 'delete', 'update', 'manage', 'verify', 'restore'];
    formActions.forEach(action => {
        document.querySelectorAll(`form[data-action="${action}"]`).forEach(form => {
            form.style.display = 'none';
        });
    });
    
    // 3. Disable all input fields (read-only mode)
    document.querySelectorAll('input, select, textarea').forEach(field => {
        if (field.type !== 'search' && field.type !== 'hidden') {
            field.disabled = true;
            field.readOnly = true;
            field.style.backgroundColor = '#f5f5f5';
            field.style.cursor = 'not-allowed';
        }
    });
    
    // 4. Hide action buttons based on text content
    const actionKeywords = [
        'add', 'edit', 'delete', 'manage', 'verify', 'restore',
        'update', 'approve', 'reject', 'submit', 'create', 'remove',
        'save', 'cancel', 'process', 'resolve', 'respond'
    ];
    
    document.querySelectorAll('button, a.btn, input[type="submit"], input[type="button"]').forEach(btn => {
        const text = btn.textContent.trim().toLowerCase();
        const value = btn.value?.toLowerCase() || '';
        const title = btn.title?.toLowerCase() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        
        const combinedText = `${text} ${value} ${title} ${ariaLabel}`;
        
        if (actionKeywords.some(keyword => combinedText.includes(keyword))) {
            btn.style.display = 'none';
            btn.disabled = true;
        }
    });
    
    // 5. Hide action columns in tables
    document.querySelectorAll('th, td').forEach(cell => {
        const text = cell.textContent.trim().toLowerCase();
        if (text === 'actions' || text === 'action' || text === 'manage' || text === 'operations') {
            cell.style.display = 'none';
        }
    });
    
    // 6. Add view-only badge to page
    addViewOnlyIndicator('View Only Mode - Barangay Captain');
    
    // 7. Disable all links with action classes
    document.querySelectorAll('a.btn-action, a[data-action], a.btn-danger, a.btn-warning').forEach(link => {
        link.style.display = 'none';
        link.style.pointerEvents = 'none';
    });
    
    // 8. Hide modal triggers
    document.querySelectorAll('[data-bs-toggle="modal"][data-bs-target*="add"], [data-bs-toggle="modal"][data-bs-target*="edit"], [data-bs-toggle="modal"][data-bs-target*="delete"]').forEach(trigger => {
        trigger.style.display = 'none';
    });
}

function applyTreasurerRestrictions() {
    console.log('Applying Treasurer restrictions');
    
    // Treasurer can only manage expenses
    // Hide all buttons except expense-related ones
    document.querySelectorAll('.btn-add, .btn-edit, .btn-delete, .btn-manage, .btn-verify, .btn-restore').forEach(btn => {
        const parentSection = btn.closest('.expense-section, .finance-section, [data-module="expenses"]');
        if (!parentSection) {
            btn.style.display = 'none';
            btn.disabled = true;
        }
    });
    
    // Hide safety-related sections
    document.querySelectorAll('[data-module="safety"], [data-module="sos"], [data-module="emergency"]').forEach(section => {
        section.style.display = 'none';
    });
    
    // Disable all inputs except in expense module
    document.querySelectorAll('input, select, textarea').forEach(field => {
        const parentSection = field.closest('.expense-section, .finance-section, [data-module="expenses"]');
        if (!parentSection && field.type !== 'search' && field.type !== 'hidden') {
            field.disabled = true;
            field.readOnly = true;
        }
    });
}

function applySecretaryRestrictions() {
    console.log('Applying Secretary restrictions');
    
    // Secretary cannot access system settings and activity logs
    document.querySelectorAll('[data-module="system-settings"], [data-module="activity-logs"]').forEach(section => {
        section.style.display = 'none';
    });
    
    // Secretary cannot manage expenses (view only)
    document.querySelectorAll('[data-module="expenses"] .btn-add, [data-module="expenses"] .btn-edit, [data-module="expenses"] .btn-delete').forEach(btn => {
        btn.style.display = 'none';
        btn.disabled = true;
    });
    
    // Disable expense inputs
    document.querySelectorAll('[data-module="expenses"] input, [data-module="expenses"] select, [data-module="expenses"] textarea').forEach(field => {
        if (field.type !== 'search' && field.type !== 'hidden') {
            field.disabled = true;
            field.readOnly = true;
        }
    });
}

function addViewOnlyIndicator(message) {
    // Check if indicator already exists
    if (document.getElementById('viewOnlyIndicator')) {
        return;
    }
    
    const indicator = document.createElement('div');
    indicator.id = 'viewOnlyIndicator';
    indicator.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #30534D;
        color: #FED734;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 6px;
        animation: slideInRight 0.5s ease-out;
    `;
    indicator.innerHTML = `
        <i class="bi bi-eye-fill"></i>
        ${message}
    `;
    
    // Add animation keyframes if not exists
    if (!document.getElementById('rbacAnimations')) {
        const style = document.createElement('style');
        style.id = 'rbacAnimations';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(indicator);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        indicator.style.transition = 'opacity 0.5s';
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 500);
    }, 5000);
}

// Utility function to check if current user has specific role
function hasRole(role) {
    return window.currentRole === role;
}

// Utility function to check if current user has any of the specified roles
function hasAnyRole(...roles) {
    return roles.includes(window.currentRole);
}

// Utility function to enforce read-only mode
function setReadOnly(container) {
    const target = container || document;
    target.querySelectorAll('input, select, textarea').forEach(field => {
        if (field.type !== 'search' && field.type !== 'hidden') {
            field.disabled = true;
            field.readOnly = true;
            field.style.backgroundColor = '#f5f5f5';
            field.style.cursor = 'not-allowed';
        }
    });
}

// Export functions for use in other scripts
window.rbac = {
    hasRole,
    hasAnyRole,
    setReadOnly,
    applyCaptainRestrictions,
    applyTreasurerRestrictions,
    applySecretaryRestrictions
};