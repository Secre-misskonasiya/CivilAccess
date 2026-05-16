// sidebar2.js - Resident Sidebar Functionality

function openLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.style.display = 'flex';
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.style.display = 'none';
}

function confirmLogout() {
    window.location.href = '/resident-logout';
}

function toggleMobileMenu() {
    const sidebar = document.getElementById('mainSidebar');
    if (sidebar) sidebar.classList.toggle('mobile-open');
}

window.onclick = function(event) {
    const modal = document.getElementById('logoutModal');
    if (event.target === modal) closeLogoutModal();
};

document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;

    const menuMap = {
        '/resident/announcements': 'nav-announcements',
        '/resident/my-requests':   'nav-requests',
        '/resident/safety-reports':'nav-safety',
        '/resident/emergency-alerts': 'nav-alerts',
        '/resident/contact':       'nav-contact'
    };

    document.querySelectorAll('.menu li').forEach(item => item.classList.remove('active'));

    for (const [route, id] of Object.entries(menuMap)) {
        if (path === route || path.startsWith(route)) {
            const el = document.getElementById(id);
            if (el) el.classList.add('active');
            break;
        }
    }
});