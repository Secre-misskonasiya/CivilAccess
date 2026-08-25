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
    localStorage.removeItem('lastSeenProgramEventId');
    window.location.href = '/logout';
}

window.onclick = function (event) {
    const logoutModal = document.getElementById('logoutModal');
    if (event.target === logoutModal) closeLogoutModal();
};

// ─── Lock Modal Controller ────────────────────────────────────────────────────
// Handles showing/hiding the force password change modal

(function() {
    // Avoid duplicate initialization
    if (window.__lockModalInitialized) return;
    window.__lockModalInitialized = true;

    function checkAndShowLockModal() {
        // Try multiple ways to get the account status
        let status = null;
        
        // Check all possible input fields
        const statusInputs = [
            document.getElementById('accountStatus'),
            document.getElementById('currentstatus'),
            document.getElementById('status'),
            document.querySelector('input[name="accountStatus"]'),
            document.querySelector('input[name="currentstatus"]'),
            document.querySelector('meta[name="account-status"]')
        ];
        
        for (const input of statusInputs) {
            if (input) {
                const value = input.value || input.getAttribute('content');
                if (value) {
                    status = value;
                    break;
                }
            }
        }
        
        // If still not found, check for inline script variables
        if (!status && window.accountStatus) {
            status = window.accountStatus;
        }
        if (!status && window.currentstatus) {
            status = window.currentstatus;
        }
        
        // Check if status requires password change
        const needsPasswordChange = status === 'New' || status === 'Newly Updated';
        
        // Find the modal
        const modal = document.getElementById('forcePasswordModal');
        if (!modal) {
            // Modal doesn't exist - create it dynamically
            createLockModal();
            // Try again after creation
            setTimeout(checkAndShowLockModal, 100);
            return;
        }
        
        if (needsPasswordChange) {
            modal.style.display = 'block';
            modal.style.visibility = 'visible';
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            document.body.style.pointerEvents = 'none';
            // Allow clicks on the modal itself
            modal.style.pointerEvents = 'auto';
            
            // Create overlay if needed
            let overlay = document.querySelector('.force-modal-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'force-modal-overlay';
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.65);
                    backdrop-filter: blur(3px);
                    z-index: 99998;
                    pointer-events: auto;
                `;
                document.body.insertBefore(overlay, modal);
            }
        } else {
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
            modal.classList.remove('show');
            document.body.style.overflow = '';
            document.body.style.pointerEvents = '';
            const overlay = document.querySelector('.force-modal-overlay');
            if (overlay) overlay.remove();
        }
    }

    function createLockModal() {
        // Check if modal already exists
        if (document.getElementById('forcePasswordModal')) return;
        
        const modalHTML = `
            <div id="forcePasswordModal" class="force-modal" style="display:none; position:fixed; z-index:99999; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.65); backdrop-filter:blur(3px); align-items:center; justify-content:center;">
                <div class="force-modal-content" style="background:white; width:420px; max-width:90%; padding:32px 36px 36px 36px; border-radius:20px; text-align:center; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); animation:modalFadeIn 0.3s ease-out;">
                    <div style="width:72px; height:72px; background:linear-gradient(135deg,#f4c542,#f5d06a); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 18px; font-size:32px; color:#1a3a30;">
                        <i class="bi bi-lock-fill"></i>
                    </div>
                    <h2 style="color:#2d4a44; margin-bottom:12px; font-size:24px; font-weight:700;">Password Change Required</h2>
                    <p style="font-size:15px; color:#555; line-height:1.5; margin-bottom:8px;">Your account is new. For security, please set a new password before you can continue using the system.</p>
                    <a href="/user-profile" class="force-modal-btn" style="margin-top:24px; padding:12px 32px; background:#2d4a44; color:white !important; border:none; border-radius:40px; cursor:pointer; font-size:15px; font-weight:600; display:inline-block; text-decoration:none !important; transition:all 0.2s ease;">Go to Profile Settings</a>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add CSS if not already present
        if (!document.getElementById('lock-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'lock-modal-styles';
            style.textContent = `
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: translate(-50%, -48%); }
                    to { opacity: 1; transform: translate(-50%, -50%); }
                }
                .force-modal-btn:hover {
                    background: #1f3631 !important;
                    transform: translateY(-1px);
                    color: white !important;
                }
                .force-modal.show {
                    display: flex !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Run on page load
    function initLockModal() {
        // Small delay to ensure DOM is fully loaded
        setTimeout(checkAndShowLockModal, 100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLockModal);
    } else {
        initLockModal();
    }

    // Also re-check when navigating (for SPA-like behavior)
    window.addEventListener('popstate', function() {
        setTimeout(checkAndShowLockModal, 200);
    });

    // Expose functions globally
    window.checkLockModal = checkAndShowLockModal;
    window.createLockModal = createLockModal;
})();

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

(function() {
    // Avoid duplicate script execution
    if (window.__programNotifInitialized) return;
    window.__programNotifInitialized = true;

    // ---- Create toast element if not present ----
    function ensureToastElement() {
        let toast = document.getElementById('global-program-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'global-program-toast';
            toast.style.cssText = `
                position: fixed; bottom: 30px; right: 30px;
                background-color: #2d4a44; color: white;
                padding: 14px 20px; border-radius: 8px;
                border-left: 4px solid #FED734;
                font-size: 14px; font-weight: bold;
                z-index: 99999; display: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease-out;
                max-width: 350px;
            `;
            document.body.appendChild(toast);

            // Add keyframes if not already present
            if (!document.getElementById('program-toast-style')) {
                const style = document.createElement('style');
                style.id = 'program-toast-style';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100px); opacity: 0; }
                        to   { transform: translateX(0);     opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        return toast;
    }

    const toast = ensureToastElement();
    let toastTimer = null;

    function showToast(message) {
        toast.innerHTML = `📅 <span>${message}</span>`;
        toast.style.display = 'block';
        toast.style.animation = 'none';
        void toast.offsetWidth; // restart animation
        toast.style.animation = 'slideIn 0.3s ease-out';

        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.style.display = 'none';
        }, 6000);
    }

    // ---- Optional gentle sound ----
    function playChime() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const now = audioCtx.currentTime;

            const playBeep = (freq, start, duration) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.3, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(start);
                osc.stop(start + duration + 0.05);
            };

            playBeep(880, now, 0.15);
            playBeep(1108.73, now + 0.2, 0.15);
        } catch (e) { /* Audio not available */ }
    }

    // ---- Browser Notification (optional) ----
    function requestBrowserNotification() {
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }

    function showBrowserNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('📅 Upcoming Program', { body: message });
        }
    }

    // ---- Polling logic ----
    const STORAGE_KEY = 'lastSeenProgramEventId';
    const POLL_INTERVAL = 30000; // 30 seconds

    function getLastSeenId() {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? parseInt(stored, 10) : 0;
    }

    function setLastSeenId(id) {
        localStorage.setItem(STORAGE_KEY, id);
    }

    async function pollUpcomingPrograms() {
        try {
            const lastId = getLastSeenId();
            const response = await fetch(`/api/calendar/upcoming?minutes=10080&lastId=${lastId}&t=${Date.now()}`);
            if (!response.ok) return;

            const events = await response.json();
            if (events && events.length > 0) {
                // Update last seen ID
                const maxId = Math.max(...events.map(e => e.id));
                setLastSeenId(maxId);

                // Show toast for each new event (or combine)
                events.forEach(event => {
                    const message = `${event.programName || 'Community Program'} starts at ${formatTime(event.startTime)} on ${event.eventDate}`;
                    showToast(message);
                    showBrowserNotification(message);
                });

                // Play sound only once per batch
                if (events.length > 0) playChime();
            }
        } catch (err) {
            console.error('Error polling upcoming programs:', err);
        }
    }

    // Helper to format time (HH:MM -> 12-hour)
    function formatTime(timeStr) {
        if (!timeStr) return 'N/A';
        const [hrs, mins] = timeStr.split(':');
        let h = parseInt(hrs, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${mins.padStart(2, '0')} ${ampm}`;
    }

    // ---- Start on page load ----
    window.addEventListener('DOMContentLoaded', () => {
        requestBrowserNotification();
        pollUpcomingPrograms(); // immediate first poll
        setInterval(pollUpcomingPrograms, POLL_INTERVAL);
    });
})();