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

function openLogoutModal() {
    document.getElementById('logoutModal').style.display = 'block';
}

function closeLogoutModal() {
    document.getElementById('logoutModal').style.display = 'none';
}

function confirmLogout() {
    window.location.href = '/logout';
}

window.onclick = function(event) {
    const logoutModal = document.getElementById('logoutModal');
    if (event.target === logoutModal) closeLogoutModal();
};
document.addEventListener('DOMContentLoaded', function () {

    const path = window.location.pathname;

    // Map each route to which section ID (and optional sub-menu ID) it belongs to
    const sectionMap = [
        { match: ['/home', '/announcements'],                           section: 'sec-main' },
        { match: ['/account', '/user-profile', '/system-settings'],    section: 'sec-management' },
        { match: ['/requests-document'], section: 'sec-resident', sub: 'sub-requests' },
        { match: ['/contact-help', '/facilities'],                      section: 'sec-resident' },
        { match: ['/safety-reports', '/sos-monitoring'],               section: 'sec-safety' },
        { match: ['/program-calendar', '/program-planner'],            section: 'sec-programs' },
        { match: ['/Activity-logs'],                                    section: 'sec-system' },
    ];

    sectionMap.forEach(function (entry) {
        if (entry.match.some(function (route) { return path.startsWith(route); })) {

            // Open the section body
            const sectionBody = document.getElementById(entry.section);
            if (sectionBody) {
                sectionBody.classList.add('open');
            }

            // Find the matching toggle button and mark it open
            if (sectionBody) {
                const toggle = sectionBody.previousElementSibling;
                if (toggle && toggle.classList.contains('section-toggle')) {
                    toggle.classList.add('open');
                }
            }

            // Open sub-menu if applicable
            if (entry.sub) {
                const subMenu = document.getElementById(entry.sub);
                if (subMenu) {
                        subMenu.classList.add('open');
                        subMenu.style.display = 'block';  // keep as fallback
                    }
                // Also rotate/activate the parent <li>'s dropdown arrow
                const parentLi = subMenu.previousElementSibling;
                if (parentLi) {
                    const arrow = parentLi.querySelector('.dropdown-arrow');
                    if (arrow) arrow.classList.add('open');
                }
            }

            // Highlight the active <li>
            // const allLis = document.querySelectorAll('.sidebar .menu li, .sidebar .sub-menu li');
            // allLis.forEach(function (li) {
            //     const onclick = li.getAttribute('onclick') || '';
            //     if (onclick.includes("'" + path + "'") || onclick.includes('"' + path + '"')) {
            //         li.classList.add('active');
            //     }
            // });
        }
    });
});