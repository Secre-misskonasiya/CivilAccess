// rbac-permissions.js - Module-specific permission checks

const RBACPermissions = {
    // Dashboard permissions
    dashboard: {
        viewFull: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF', 'BARANGAY-CAPTAIN'],
        viewLimited: ['TREASURER']
    },
    
    // Announcements permissions
    announcements: {
        manage: ['ADMIN'],
        addView: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF'],
        view: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF', 'TREASURER', 'BARANGAY-CAPTAIN']
    },
    
    // Safety Reports permissions
    safetyReports: {
        manage: ['ADMIN'],
        manageVerify: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF'],
        view: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF', 'BARANGAY-CAPTAIN']
    },
    
    // SOS Monitoring permissions
    sosMonitoring: {
        manage: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF'],
        view: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF', 'BARANGAY-CAPTAIN']
    },
    
    // Barangay Requests permissions
    requests: {
        manage: ['ADMIN'],
        addView: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF'],
        view: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF', 'TREASURER', 'BARANGAY-CAPTAIN']
    },
    
    // Emergency Alerts permissions
    emergencyAlerts: {
        manage: ['ADMIN'],
        addView: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF'],
        view: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF', 'BARANGAY-CAPTAIN']
    },
    
    // Resident Accounts permissions
    residentAccounts: {
        manage: ['ADMIN'],
        addViewRestore: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF'],
        view: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF', 'BARANGAY-CAPTAIN']
    },
    
    // Facilities & Hotlines permissions
    facilities: {
        manage: ['ADMIN'],
        addView: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF'],
        view: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF', 'BARANGAY-CAPTAIN']
    },
    
    // Program Calendar permissions
    programCalendar: {
        manage: ['ADMIN'],
        addView: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF'],
        view: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF', 'TREASURER', 'BARANGAY-CAPTAIN']
    },
    
    // Activity Logs permissions
    activityLogs: {
        view: ['ADMIN']
    },
    
    // Chat Assistance permissions
    chatAssistance: {
        manage: ['ADMIN'],
        handle: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF']
    },
    
    // System Settings permissions
    systemSettings: {
        manage: ['ADMIN']
    },
    
    // Census permissions
    census: {
        manage: ['ADMIN'],
        addView: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF'],
        view: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF', 'TREASURER', 'BARANGAY-CAPTAIN']
    },
    
    // Expenses permissions
    expenses: {
        manage: ['ADMIN', 'TREASURER'],
        view: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF', 'TREASURER', 'BARANGAY-CAPTAIN']
    },
    
    // Employee Accounts permissions
    employeeAccounts: {
        manage: ['ADMIN'],
        addView: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF'],
        view: ['ADMIN', 'SECRETARY', 'SECRETARIAT STAFF', 'TREASURER', 'BARANGAY-CAPTAIN']
    }
};

// Helper functions for permission checks
function canAccess(module, action) {
    const role = window.currentRole || 'GUEST';
    const modulePermissions = RBACPermissions[module];
    
    if (!modulePermissions || !modulePermissions[action]) {
        return false;
    }
    
    return modulePermissions[action].includes(role);
}

function canManage(module) {
    return canAccess(module, 'manage');
}

function canAddView(module) {
    return canAccess(module, 'manage') || 
           canAccess(module, 'addView') || 
           canAccess(module, 'addViewRestore');
}

function canView(module) {
    return canAccess(module, 'manage') || 
           canAccess(module, 'addView') || 
           canAccess(module, 'addViewRestore') ||
           canAccess(module, 'manageVerify') ||
           canAccess(module, 'handle') ||
           canAccess(module, 'view');
}

// Export globally
window.RBACPermissions = RBACPermissions;
window.canAccess = canAccess;
window.canManage = canManage;
window.canAddView = canAddView;
window.canView = canView;