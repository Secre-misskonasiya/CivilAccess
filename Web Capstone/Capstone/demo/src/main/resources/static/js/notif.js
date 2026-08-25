/**
 * notif.js
 * Self-contained global notification system.
 * Injects its own CSS — just include this one script tag on every page:
 *
 *   <script src="/js/notif.js"></script>
 *
 * Provides:
 *   - Toast popups (bottom-right, dark style)
 *   - Notification bell badge polling (/api/dashboard/notifications)
 *   - Cross-page new-notification detection with toast alerts
 *   - SOS alert sound for emergency notifications
 *   - window.NotifManager.showToast(title, msg, link, icon) — callable anywhere
 */

if (!window.__notifManagerLoaded) {
    window.__notifManagerLoaded = true;

    const NotifManager = (() => {

        // ─── Audio context (lazy init) ────────────────────────────────────────────
        let audioCtx = null;

        function getAudioCtx() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') audioCtx.resume();
            return audioCtx;
        }

        // Initialize audio on first user interaction (browsers require this)
        function initAudio() {
            try { getAudioCtx(); } catch(e) {}
        }
        ['click', 'keydown', 'touchstart'].forEach(evt => {
            document.addEventListener(evt, initAudio, { once: true });
        });

        function playSosSound() {
            try {
                const ctx = getAudioCtx();
                if (!ctx) return;

                console.log('[Notif] Playing SOS siren...');

                const now = ctx.currentTime;
                const totalDur = 3.0;  // shorter version for notifications
                const cycleDur = 1.0;
                const toneDur = 0.7;
                const freqA = 853;
                const freqB = 960;

                const master = ctx.createGain();
                master.connect(ctx.destination);

                for (let i = 0; i < totalDur / cycleDur; i++) {
                    const tStart = now + (i * cycleDur);
                    const tEnd = tStart + toneDur;
                    master.gain.setValueAtTime(0.3, tStart);
                    master.gain.setValueAtTime(0.0, tEnd);

                    // Alternating frequency for siren effect
                    const osc = ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime((i % 2 === 0) ? freqA : freqB, tStart);
                    osc.connect(master);
                    osc.start(tStart);
                    osc.stop(tEnd);
                }
            } catch(e) {
                console.log('[Notif] Siren error:', e);
            }
        }

        // ─── Inject CSS once ───────────────────────────────────────────────────────

        function injectStyles() {
            if (document.getElementById('notif-manager-styles')) return;
            const style = document.createElement('style');
            style.id = 'notif-manager-styles';
            style.textContent = `
                /* ── Toast container ── */
                #notif-toast-container {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 99999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    pointer-events: none;
                }

                /* ── Individual toast ── */
                .notif-toast-popup {
                    pointer-events: all;
                    background: #1a1a1a;
                    border-radius: 12px;
                    padding: 14px 16px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    min-width: 300px;
                    max-width: 360px;
                    animation: notif-slide-in 0.3s ease;
                    cursor: pointer;
                    transition: background 0.2s;
                    border-left: 3px solid #FED734;
                }
                .notif-toast-popup.emergency { border-left-color: #e74c3c; }
                .notif-toast-popup:hover { background: #252525; }
                .notif-toast-popup.removing {
                    animation: notif-slide-out 0.3s ease forwards;
                }
                .notif-toast-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
                .notif-toast-body { flex: 1; min-width: 0; }
                .notif-toast-title {
                    font-size: 13px; font-weight: 600;
                    color: #ffffff; margin-bottom: 3px; letter-spacing: 0.1px;
                }
                .notif-toast-msg {
                    font-size: 12px; color: #aaaaaa;
                    line-height: 1.5;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .notif-toast-close {
                    background: none; border: none; color: #555;
                    cursor: pointer; font-size: 18px; padding: 0;
                    line-height: 1; margin-top: 2px; flex-shrink: 0;
                }
                .notif-toast-close:hover { color: #999; }

                @keyframes notif-slide-in {
                    from { transform: translateX(120%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                @keyframes notif-slide-out {
                    from { transform: translateX(0);    opacity: 1; }
                    to   { transform: translateX(120%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);

            // Create toast container
            const container = document.createElement('div');
            container.id = 'notif-toast-container';
            document.body.appendChild(container);
        }


        // ─── Toast ─────────────────────────────────────────────────────────────────

        const MAX_TOASTS = 3;
        let activeToasts = 0;
        const toastQueue = [];

        function showToast(title, message, link, icon, isEmergency) {
            injectStyles();

            if (activeToasts >= MAX_TOASTS) {
                toastQueue.push({ title, message, link, icon, isEmergency });
                return;
            }

            activeToasts++;

            const container = document.getElementById('notif-toast-container');
            const toast = document.createElement('div');
            toast.className = 'notif-toast-popup' + (isEmergency ? ' emergency' : '');

            const iconHtml = icon
                ? (typeof icon === 'string' && icon.startsWith('<')
                    ? icon
                    : `<span>${icon}</span>`)
                : '🔔';

            toast.innerHTML = `
                <div class="notif-toast-icon">${iconHtml}</div>
                <div class="notif-toast-body">
                    <div class="notif-toast-title">${esc(title)}</div>
                    <div class="notif-toast-msg">${esc(message)}</div>
                </div>
                <button class="notif-toast-close" title="Dismiss">&times;</button>
            `;

            // Click to navigate
            if (link && link !== '#') {
                toast.style.cursor = 'pointer';
                toast.addEventListener('click', function (e) {
                    if (e.target.classList.contains('notif-toast-close')) return;
                    window.location.href = link;
                });
            }

            // Close button
            toast.querySelector('.notif-toast-close').addEventListener('click', function (e) {
                e.stopPropagation();
                dismiss(toast);
            });

            container.appendChild(toast);

            // Auto-dismiss after 6 seconds
            setTimeout(() => dismiss(toast), 6000);
        }

        function dismiss(toast) {
            if (toast.classList.contains('removing')) return;
            toast.classList.add('removing');
            setTimeout(() => {
                toast.remove();
                activeToasts--;
                if (toastQueue.length > 0) {
                    const next = toastQueue.shift();
                    showToast(next.title, next.message, next.link, next.icon, next.isEmergency);
                }
            }, 300);
        }


        // ─── Notification badge polling ────────────────────────────────────────────

        function pollBadge() {
            fetch('/api/dashboard/notifications?countOnly=true')
                .then(r => r.json())
                .then(data => {
                    const badge = document.getElementById('notifBadge');
                    if (!badge) return;
                    const count = data.count || 0;
                    badge.style.display = count > 0 ? 'inline' : 'none';
                    badge.textContent = count > 0 ? count : '';
                })
                .catch(() => {
                    const badge = document.getElementById('notifBadge');
                    if (badge) badge.style.display = 'none';
                });
        }


        // ─── Cross-page new notification detection ─────────────────────────────────

        let previousSnapshot = '';
        let snapshotInterval = null;

        function checkAndToast() {
            fetch('/api/dashboard/notifications')
                .then(r => r.json())
                .then(notifs => {
                    if (!notifs || notifs.length === 0) return;

                    const real = notifs.filter(n => n.link && n.link !== '#');
                    const currentSnapshot = JSON.stringify(real);

                    if (previousSnapshot && currentSnapshot !== previousSnapshot) {
                        const prev = JSON.parse(previousSnapshot);
                        real.forEach(n => {
                            const exists = prev.some(p =>
                                p.title === n.title && p.description === n.description
                            );
                            if (!exists) {
                                // Check if it's an emergency/SOS notification
                                const isEmergency = n.iconClass === 'emergency' ||
                                                  (n.title && n.title.includes('SOS'));

                                // 🔔 PLAY SOUND for emergency notifications
                                if (isEmergency) {
                                    playSosSound();
                                }

                                showToast(
                                    n.title,
                                    n.description,
                                    n.link,
                                    `<i class="bi ${n.icon || 'bi-bell'}" style="font-size:18px;${isEmergency ? 'color:#e74c3c;' : 'color:#FED734;'}"></i>`,
                                    isEmergency
                                );
                            }
                        });
                    }

                    previousSnapshot = currentSnapshot;
                    pollBadge();
                })
                .catch(() => {});
        }


        // ─── Init ──────────────────────────────────────────────────────────────────

        function init() {
            injectStyles();
            pollBadge();
            setTimeout(checkAndToast, 2000);
            snapshotInterval = setInterval(checkAndToast, 10000);
            window.addEventListener('beforeunload', () => {
                if (snapshotInterval) clearInterval(snapshotInterval);
            });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

        // ─── Helpers ───────────────────────────────────────────────────────────────

        function esc(str) {
            if (!str) return '';
            const d = document.createElement('div');
            d.textContent = str;
            return d.innerHTML;
        }

        // ─── Public API ────────────────────────────────────────────────────────────

        return { showToast, pollBadge, playSosSound };

    })();

    window.NotifManager = NotifManager;
}