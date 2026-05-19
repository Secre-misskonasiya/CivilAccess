// ─── Section & submenu toggles ────────────────────────────────────────────────

function toggleSection(btn, sectionId) {
    const body = document.getElementById(sectionId);
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open', !isOpen);
    btn.classList.toggle('open', !isOpen);
}

function toggleSubMenu(li, subMenuId) {
    const sub = document.getElementById(subMenuId);
    const arrow = li.querySelector('.dropdown-arrow');
    const isOpen = sub.classList.contains('open');
    sub.classList.toggle('open', !isOpen);
    if (arrow) arrow.classList.toggle('open', !isOpen);
}

// ─── Logout ───────────────────────────────────────────────────────────────────

function openLogoutModal() {
    document.getElementById('logoutModal').style.display = 'block';
}

function closeLogoutModal() {
    document.getElementById('logoutModal').style.display = 'none';
}

function confirmLogout() {
    window.location.href = '/logout';
}

window.onclick = function (event) {
    const logoutModal = document.getElementById('logoutModal');
    if (event.target === logoutModal) closeLogoutModal();
};

// ─── Active section & submenu on page load ────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {

    const path = window.location.pathname;

    const sectionMap = [
        { match: ['/home', '/announcements'],                                    section: 'sec-main' },
        { match: ['/account', '/user-profile', '/Resident-census', '/finance', '/finance#dashboard', '/finance#income', '/finance#expenses', '/finance#budget'],              section: 'sec-management' },
        { match: ['/requests-document', '/requests-blotter', '/reservations', '/rentals'],                    section: 'sec-resident', sub: 'sub-requests' },
        { match: ['/contact-help', '/facilities'],                               section: 'sec-resident' },
        { match: ['/safety-reports', '/emergency-alerts', '/sos-monitoring'],    section: 'sec-safety' },
        { match: ['/program-calendar', '/program-planner'],                      section: 'sec-programs' },
        { match: ['/Activity-logs', '/system-settings'],                                             section: 'sec-system' },
    ];

    sectionMap.forEach(function (entry) {
        if (entry.match.some(function (route) { return path.startsWith(route); })) {

            const sectionBody = document.getElementById(entry.section);
            if (sectionBody) {
                sectionBody.classList.add('open');
                const toggle = sectionBody.previousElementSibling;
                if (toggle && toggle.classList.contains('section-toggle')) {
                    toggle.classList.add('open');
                }
            }

            if (entry.sub) {
                const subMenu = document.getElementById(entry.sub);
                if (subMenu) {
                    subMenu.classList.add('open');
                    subMenu.style.display = 'block';
                }
                const parentLi = subMenu ? subMenu.previousElementSibling : null;
                if (parentLi) {
                    const arrow = parentLi.querySelector('.dropdown-arrow');
                    if (arrow) arrow.classList.add('open');
                }
            }
        }
    });

    // Start sidebar notification badge polling immediately, then every 15 s
    pollSidebarCounts();
    setInterval(pollSidebarCounts, 15000);
});

// ─── Sidebar notification badges ──────────────────────────────────────────────
//
// Backend endpoint: GET /api/sidebar/counts
// Expected response shape:
// {
//   "announcements":  2,
//   "accounts":       1,
//   "requests":       3,
//   "documents":      3,
//   "facilities":     0,
//   "safety-reports": 5,
//   "sos":            1,
//   "programs":       0,
//   "activity-logs":  0
// }

// Maps each badge ID to which section dot should light up
const SIDEBAR_SECTION_MAP = {
    'badge-announcements':  'dot-main',
    'badge-accounts':       'dot-management',
    'badge-requests':       'dot-resident',
    'badge-documents':      'dot-resident',
    'badge-blotter':        'dot-resident',
    'badge-facilities':     'dot-resident',
    'badge-safety-reports': 'dot-safety',
    'badge-sos':            'dot-safety',
    'badge-programs':       'dot-programs',
    'badge-activity-logs':  'dot-system',
};

function setSidebarBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    if (count > 0) {
        el.textContent = count > 99 ? '99+' : count;
        el.classList.add('visible');
    } else {
        el.textContent = '';
        el.classList.remove('visible');
    }
}

function updateSidebarDots(counts) {
    // Reset all dots first
    document.querySelectorAll('.section-notif-dot').forEach(d => d.classList.remove('visible'));

    // Light up a dot if any badge in its section has a count > 0
    Object.entries(counts).forEach(([key, count]) => {
        if (count > 0) {
            const dotId = SIDEBAR_SECTION_MAP['badge-' + key];
            if (dotId) {
                const dot = document.getElementById(dotId);
                if (dot) dot.classList.add('visible');
            }
        }
    });
}

function updateSidebarBadges(counts) {
    Object.entries(counts).forEach(([key, count]) => {
        setSidebarBadge('badge-' + key, count);
    });
    updateSidebarDots(counts);
}

async function pollSidebarCounts() {
    try {
        const res = await fetch('/api/sidebar/counts?t=' + Date.now());
        if (!res.ok) return;
        const data = await res.json();
        updateSidebarBadges(data);
    } catch (e) {
        // Non-critical — fail silently
    }
}

// Allow any page or realtime script to push counts directly without waiting for next poll:
//   SidebarBadges.update({ 'safety-reports': 3, 'sos': 1 });
//   SidebarBadges.set('badge-accounts', 2);
window.SidebarBadges = {
    update: updateSidebarBadges,
    set:    setSidebarBadge,
};