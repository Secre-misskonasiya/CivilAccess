(function () {
    const _actx = new (window.AudioContext || window.webkitAudioContext)();

    // Visible prompt so staff know alert sound isn't armed yet — browsers
    // block audio until a real user gesture happens anywhere on the page.
    function showEnableSoundBanner() {
        if (document.getElementById('sos-enable-sound-banner')) return;
        const b = document.createElement('div');
        b.id = 'sos-enable-sound-banner';
        b.textContent = '🔇 Click anywhere to enable SOS alert sound';
        b.style.cssText = `
            position:fixed; top:0; left:0; right:0; background:#FED734; color:#1E322F;
            text-align:center; padding:8px 12px; font-size:13px; font-weight:bold;
            font-family:Arial,sans-serif; z-index:100000; cursor:pointer;
        `;
        document.body.appendChild(b);
    }
    function hideEnableSoundBanner() {
        const b = document.getElementById('sos-enable-sound-banner');
        if (b) b.remove();
    }
    if (_actx.state === 'suspended') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', showEnableSoundBanner);
        } else {
            showEnableSoundBanner();
        }
    }

    ['click', 'keydown', 'touchstart', 'mousedown'].forEach(e =>
        document.addEventListener(e, () => {
            if (_actx.state === 'suspended') {
                _actx.resume().then(hideEnableSoundBanner);
            } else {
                hideEnableSoundBanner();
            }
        }, { passive: true })
    );

    // Tracks the currently-sounding siren's gain node (if any) so a new
    // alert can silence it instantly instead of layering a second siren
    // on top. We never call .stop() on the old oscillators directly —
    // they keep running (silently) until their own original stop
    // schedule fires, which avoids any risk of a stop()-related error
    // interrupting the new siren from starting.
    let activeMaster = null;

    function stopActiveSiren() {
        if (!activeMaster) return;
        try {
            const now = _actx.currentTime;
            activeMaster.gain.cancelScheduledValues(now);
            activeMaster.gain.setValueAtTime(0.0, now);
        } catch (_) {
            // Node may already be disconnected/ended; ignore.
        }
        activeMaster = null;
    }

    function playSiren() {
        _actx.resume().then(() => {
            // A siren is already sounding — mute it first instead of
            // starting an overlapping second one.
            stopActiveSiren();

            const now = _actx.currentTime;
            const totalDur = 5.0, cycleDur = 1.5, toneDur = 1.0;
            const master = _actx.createGain();
            master.connect(_actx.destination);
            const oscA = _actx.createOscillator();
            const oscB = _actx.createOscillator();
            oscA.type = 'sine'; oscB.type = 'sine';
            oscA.frequency.setValueAtTime(853, now);
            oscB.frequency.setValueAtTime(960, now);
            for (let i = 0; i < totalDur / cycleDur; i++) {
                const tStart = now + (i * cycleDur);
                master.gain.setValueAtTime(0.5, tStart);
                master.gain.setValueAtTime(0.0, tStart + toneDur);
            }
            oscA.connect(master); oscB.connect(master);
            oscA.start(now); oscB.start(now);
            oscA.stop(now + totalDur); oscB.stop(now + totalDur);

            activeMaster = master;
            oscA.onended = () => {
                if (activeMaster === master) activeMaster = null;
                try { master.disconnect(); } catch (_) {}
            };
        });
    }

    function showToast(msg) {
        let t = document.getElementById('sos-global-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'sos-global-toast';
            t.style.cssText = `
                position:fixed; bottom:30px; right:30px; background:#2d4a44; color:white;
                padding:14px 20px; border-radius:8px; border-left:4px solid #FED734;
                font-size:14px; font-weight:bold; z-index:99999; display:none;
                box-shadow:0 4px 12px rgba(0,0,0,0.3); font-family:Arial,sans-serif;
                animation: sosSlideIn 0.3s ease-out;
            `;
            const style = document.createElement('style');
            style.textContent = `@keyframes sosSlideIn { from { transform:translateX(100px); opacity:0; } to { transform:translateX(0); opacity:1; } }`;
            document.head.appendChild(style);
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.style.display = 'block';
        t.style.animation = 'none';
        void t.offsetWidth;
        t.style.animation = 'sosSlideIn 0.3s ease-out';
        clearTimeout(t._timer);
        t._timer = setTimeout(() => { t.style.display = 'none'; }, 5000);
    }

    // ============================================
    // OS-LEVEL NOTIFICATIONS (fire even if the tab is unfocused/backgrounded)
    // ============================================
    // Audio autoplay can only ever be unlocked by a click on THIS page, and
    // dies the moment the tab is closed. Browser/OS notifications only need
    // a one-time permission grant and keep firing as long as the browser
    // process is running — including with the SOS tab in the background or
    // another app focused. They won't fire if the browser itself is fully
    // closed; that's an OS-level limit no page script can get around.
    const canNotify = 'Notification' in window;

    function requestNotifPermissionIfNeeded() {
        if (canNotify && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    function notifyOs(count) {
        if (!canNotify || Notification.permission !== 'granted') return;
        try {
            const n = new Notification('🚨 New SOS Alert' + (count > 1 ? 's' : ''), {
                body: count + ' new SOS report(s) received.',
                requireInteraction: true
            });
            n.onclick = () => { window.focus(); n.close(); };
        } catch (_) {
            // Notification construction can fail in some contexts; ignore.
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', requestNotifPermissionIfNeeded);
    } else {
        requestNotifPermissionIfNeeded();
    }

    let lastSeenId = parseInt(sessionStorage.getItem('sos_lastSeenId') || '0');
    let initialized = false;

    async function poll() {
        try {
            const res = await fetch('/sos-monitoring/api/incoming?lastId=' + lastSeenId + '&t=' + Date.now());
            if (!res.ok) return;
            const data = await res.json();

            if (!initialized) {
                // On first load, just record the current max ID silently
                if (data.reports && data.reports.length > 0) {
                    lastSeenId = Math.max(lastSeenId, ...data.reports.map(r => r.id));
                }
                if (data.newSos && data.newSos.length > 0) {
                    lastSeenId = Math.max(lastSeenId, ...data.newSos.map(r => r.id));
                }
                sessionStorage.setItem('sos_lastSeenId', lastSeenId);
                initialized = true;
                return;
            }

            if (data.newSos && data.newSos.length > 0) {
                playSiren();
                showToast('🚨 ' + data.newSos.length + ' new SoS Alert(s) received!');
                notifyOs(data.newSos.length);
                lastSeenId = Math.max(lastSeenId, ...data.newSos.map(r => r.id));
                sessionStorage.setItem('sos_lastSeenId', lastSeenId);
            }
        } catch (_) {}
    }

    // Start polling after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { poll(); setInterval(poll, 5000); });
    } else {
        poll();
        setInterval(poll, 5000);
    }
})();