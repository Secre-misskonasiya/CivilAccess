// rbac.js - Global RBAC for all pages
document.addEventListener('DOMContentLoaded', function() {
    const role = document.getElementById('currentUserRole')?.value || 
                 document.getElementById('dataCurrentRole')?.value || 
                 'GUEST';
    
    window.currentRole = role;
    window.isAdmin = role === 'ADMIN';
    window.isSecretary = role === 'SECRETARY';
    window.isSecretariatStaff = role === 'SECRETARIAT STAFF';
    window.isBarangayCaptain = role === 'BARANGAY-CAPTAIN';
    window.isTreasurer = role === 'TREASURER';
    window.isTanod = role === 'TANOD';
    
    console.log('🔐 Role:', role);
});