(function () {
    const _actx = new (window.AudioContext || window.webkitAudioContext)();
    ['click', 'keydown', 'touchstart', 'mousedown'].forEach(e =>
        document.addEventListener(e, () => { if (_actx.state === 'suspended') _actx.resume(); }, { passive: true })
    );

    function playSiren() {
        _actx.resume().then(() => {
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