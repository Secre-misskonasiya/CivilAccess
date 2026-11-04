/**
 * realtime.js
 * Centralized real-time polling for all pages.
 * On new data: shows a toast notification then does a discreet background refresh.
 *
 * Usage — drop this at the bottom of any HTML page's <body>:
 *
 *   <script src="/js/realtime.js"></script>
 *   <script>
 *     RealtimeManager.init({
 *       page:        'safety-reports',
 *       pollUrl:     '/safety-reports/api/poll',
 *       toastTitle:  'Safety Reports',
 *       toastType:   'warning',
 *       badgeMap: {
 *         'badge-incoming':   'incoming',
 *         'badge-approved':   'approved',
 *         'badge-inprogress': 'inprogress',
 *         'badge-resolved':   'resolved',
 *         'badge-archive':    'archive',
 *       }
 *     });
 *   </script>
 */

const RealtimeManager = (() => {

    // ─── Toast Queue ───────────────────────────────────────────────────────────

    const toastQueue = [];
    let activeToasts = 0;
    const MAX_TOASTS = 3;
    const TOAST_DURATION = 5000;

    function injectStyles() {
        if (document.getElementById('realtime-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'realtime-toast-styles';
        style.textContent = `
            #realtime-toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            }
            .rt-toast {
                pointer-events: all;
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                padding: 14px 16px;
                min-width: 280px;
                max-width: 340px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
                border-left: 4px solid #2d4a44;
                animation: rt-slide-in 0.35s ease forwards;
                position: relative;
                overflow: hidden;
            }
            .rt-toast.rt-hiding {
                animation: rt-slide-out 0.35s ease forwards;
            }
            .rt-toast-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
            .rt-toast-body { flex: 1; }
            .rt-toast-title { font-size: 13px; font-weight: 700; color: #2d4a44; margin-bottom: 2px; }
            .rt-toast-msg   { font-size: 12px; color: #555; line-height: 1.4; }
            .rt-toast-close {
                background: none; border: none; cursor: pointer;
                color: #aaa; font-size: 16px; padding: 0;
                line-height: 1; flex-shrink: 0; margin-top: 1px;
            }
            .rt-toast-close:hover { color: #333; }
            .rt-toast-progress {
                position: absolute; bottom: 0; left: 0;
                height: 3px; background: #2d4a44;
                animation: rt-progress linear forwards;
            }
            .rt-toast.info    { border-left-color: #3498db; }
            .rt-toast.info    .rt-toast-title    { color: #3498db; }
            .rt-toast.info    .rt-toast-progress { background: #3498db; }
            .rt-toast.warning { border-left-color: #FED734; }
            .rt-toast.warning .rt-toast-title    { color: #b8960a; }
            .rt-toast.warning .rt-toast-progress { background: #FED734; }
            .rt-toast.success { border-left-color: #44C375; }
            .rt-toast.success .rt-toast-title    { color: #2ea05e; }
            .rt-toast.success .rt-toast-progress { background: #44C375; }
            .rt-toast.danger  { border-left-color: #e74c3c; }
            .rt-toast.danger  .rt-toast-title    { color: #e74c3c; }
            .rt-toast.danger  .rt-toast-progress { background: #e74c3c; }

            /* Discreet refresh overlay */
            #rt-refresh-overlay {
                display: none;
                position: fixed;
                inset: 0;
                background: rgba(255,255,255,0.45);
                z-index: 9990;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            #rt-refresh-overlay.visible { opacity: 1; }

            /* Refreshing pill at bottom center */
            #rt-refresh-spinner {
                display: none;
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%);
                background: #2d4a44;
                color: white;
                padding: 7px 18px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                letter-spacing: 0.4px;
                align-items: center;
                gap: 8px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.18);
                z-index: 9991;
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
            }
            #rt-refresh-spinner.visible { opacity: 1; }
            .rt-spin {
                width: 12px; height: 12px;
                border: 2px solid rgba(255,255,255,0.4);
                border-top-color: white;
                border-radius: 50%;
                animation: rt-spinner 0.7s linear infinite;
                flex-shrink: 0;
            }
            @keyframes rt-spinner { to { transform: rotate(360deg); } }
            @keyframes rt-slide-in {
                from { transform: translateX(110%); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
            }
            @keyframes rt-slide-out {
                from { transform: translateX(0);    opacity: 1; }
                to   { transform: translateX(110%); opacity: 0; }
            }
            @keyframes rt-progress {
                from { width: 100%; }
                to   { width: 0%; }
            }
        `;
        document.head.appendChild(style);

        const container = document.createElement('div');
        container.id = 'realtime-toast-container';
        document.body.appendChild(container);

        const overlay = document.createElement('div');
        overlay.id = 'rt-refresh-overlay';
        document.body.appendChild(overlay);

        const spinner = document.createElement('div');
        spinner.id = 'rt-refresh-spinner';
        spinner.innerHTML = `<div class="rt-spin"></div> Refreshing...`;
        document.body.appendChild(spinner);
    }

    function showToast({ title, message, type = 'default', duration = TOAST_DURATION }) {
        injectStyles();

        if (activeToasts >= MAX_TOASTS) {
            toastQueue.push({ title, message, type, duration });
            return;
        }

        activeToasts++;

        const icons = { default: '🔔', info: 'ℹ️', success: '✅', warning: '⚠️', danger: '🚨' };

        const toast = document.createElement('div');
        toast.className = `rt-toast ${type}`;
        toast.innerHTML = `
            <div class="rt-toast-icon">${icons[type] || icons.default}</div>
            <div class="rt-toast-body">
                <div class="rt-toast-title">${title}</div>
                <div class="rt-toast-msg">${message}</div>
            </div>
            <button class="rt-toast-close" title="Close">&times;</button>
            <div class="rt-toast-progress" style="animation-duration:${duration}ms;"></div>
        `;

        document.getElementById('realtime-toast-container').appendChild(toast);

        const dismiss = () => {
            if (toast.classList.contains('rt-hiding')) return;
            toast.classList.add('rt-hiding');
            setTimeout(() => {
                toast.remove();
                activeToasts--;
                if (toastQueue.length > 0) showToast(toastQueue.shift());
            }, 350);
        };

        toast.querySelector('.rt-toast-close').addEventListener('click', dismiss);
        setTimeout(dismiss, duration);
    }


    // ─── Discreet Refresh ──────────────────────────────────────────────────────

    let isRefreshing = false;

    function discreetRefresh() {
        if (isRefreshing) return;
        isRefreshing = true;

        injectStyles();

        const overlay = document.getElementById('rt-refresh-overlay');
        const spinner = document.getElementById('rt-refresh-spinner');

        overlay.style.display = 'block';
        spinner.style.display = 'flex';

        requestAnimationFrame(() => {
            overlay.classList.add('visible');
            spinner.classList.add('visible');
        });

        setTimeout(() => window.location.reload(), 600);
    }


    // ─── Badge Updater ─────────────────────────────────────────────────────────

    function updateBadges(badgeMap, counts) {
        if (!badgeMap || !counts) return;
        Object.entries(badgeMap).forEach(([badgeId, countKey]) => {
            const el = document.getElementById(badgeId);
            if (!el) return;
            const newVal = counts[countKey] ?? 0;
            const oldVal = parseInt(el.textContent) || 0;
            el.textContent = newVal;
            if (newVal > oldVal) {
                el.style.transition = 'transform 0.2s';
                el.style.transform = 'scale(1.4)';
                setTimeout(() => el.style.transform = 'scale(1)', 300);
            }
        });
    }


    // ─── Sidebar Badge Updater ─────────────────────────────────────────────────
    // Add to your sidebar: <span id="sidebar-badge-safety-reports"></span>

    function updateSidebarBadges(pageCounts) {
        if (!pageCounts) return;
        Object.entries(pageCounts).forEach(([page, count]) => {
            const el = document.getElementById('sidebar-badge-' + page);
            if (!el) return;
            el.textContent = count > 0 ? count : '';
            el.style.display = count > 0 ? 'inline-block' : 'none';
        });
    }


    // ─── Core Polling ──────────────────────────────────────────────────────────

    let pollingInterval = null;
    let lastSeenId = 0;
    let config = {};

    function resolveLastSeenId() {
        // For timestamp-based pages (like accounts), use current time so we
        // never immediately re-trigger on first load.
        if (config.useTimestamp) {
            return Date.now();
        }

        // For ID-based pages, find the max ID already rendered in the table.
        let maxId = 0;
        document.querySelectorAll('tbody tr').forEach(row => {
            const id = parseInt(row.getAttribute('data-id') || '0');
            if (id > maxId) maxId = id;
            row.querySelectorAll('[onclick]').forEach(el => {
                const match = el.getAttribute('onclick').match(/\((\d+)[,)]/);
                if (match) maxId = Math.max(maxId, parseInt(match[1]));
            });
        });
        return maxId;
    }

    async function poll() {
        // Skip poll if caller says so (e.g. a modal is open)
        if (typeof config.shouldSkipPoll === 'function' && config.shouldSkipPoll()) return;

        try {
            const url = `${config.pollUrl}?lastId=${lastSeenId}&page=${config.page}&t=${Date.now()}`;
            const response = await fetch(url);
            if (!response.ok) return;

            const data = await response.json();

            // 1. Update tab badges
            if (data.counts && config.badgeMap) {
                updateBadges(config.badgeMap, data.counts);
            }

            // 2. Update sidebar badges
            if (data.pageCounts) {
                updateSidebarBadges(data.pageCounts);
            }

            // 3. New records → toast then discreet refresh
            if (data.newRecords && data.newRecords.length > 0) {
                // Advance lastSeenId so next poll doesn't re-trigger
                const maxNew = Math.max(...data.newRecords.map(r => r.id || 0));
                if (maxNew > 0) lastSeenId = maxNew;

                const count = data.newRecords.length;
                showToast({
                    title: config.toastTitle || 'New Data',
                    message: count === 1
                        ? `1 new ${config.recordLabel || 'record'} received.`
                        : `${count} new ${config.recordLabel || 'records'} received.`,
                    type: config.toastType || 'default',
                });

                // Stop polling before refresh so interval doesn't fire mid-reload
                stop();
                setTimeout(discreetRefresh, 1500);
            }

            // 4. Status changes → toast then discreet refresh
            if (data.statusChanges && data.statusChanges.length > 0) {
                data.statusChanges.forEach(change => {
                    showToast({
                        title: 'Status Updated',
                        message: `"${change.title}" is now ${change.newStatus}.`,
                        type: 'info',
                    });
                });
                stop();
                setTimeout(discreetRefresh, 1500);
            }

            // 5. Priority alerts (SOS, emergency) — longer toast, no refresh
            if (data.alerts && data.alerts.length > 0) {
                data.alerts.forEach(alert => {
                    showToast({
                        title: alert.title || '⚠️ Alert',
                        message: alert.message || '',
                        type: alert.type || 'danger',
                        duration: 8000,
                    });
                });
            }

        } catch (error) {
            console.warn('[RealtimeManager] Poll error:', error);
        }
    }

    function start() {
        if (pollingInterval) clearInterval(pollingInterval);
        lastSeenId = resolveLastSeenId();
        poll();
        pollingInterval = setInterval(poll, config.interval || 5000);
    }

    function stop() {
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = null;
    }


    // ─── Public API ────────────────────────────────────────────────────────────

    function init(options = {}) {
        config = Object.assign({
            page:            'unknown',
            pollUrl:         '/api/poll',
            interval:        5000,
            badgeMap:        null,
            recordLabel:     'record',
            toastTitle:      'New Update',
            toastType:       'default',
            useTimestamp:    false,   // set true for timestamp-based poll endpoints
            shouldSkipPoll:  null,
        }, options);

        document.addEventListener('DOMContentLoaded', () => {
            injectStyles();
            start();
        });

        window.addEventListener('beforeunload', stop);
    }

    // Manual toast — callable from any page script
    function notify(title, message, type = 'default', duration = TOAST_DURATION) {
        injectStyles();
        showToast({ title, message, type, duration });
    }

    return { init, notify, stop, start };

})();