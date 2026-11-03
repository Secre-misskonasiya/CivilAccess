document.addEventListener('DOMContentLoaded', () => {
    // Bind static UI events
    document.getElementById('refreshWeatherBtn').addEventListener('click', fetchWeather);
    document.getElementById('notificationBell').addEventListener('click', (e) => {
        e.stopPropagation();
        openNotificationModal();
    });
    document.getElementById('profileAvatarBtn').addEventListener('click', () => {
        window.location.href = '/user-profile';
    });
    document.getElementById('assistanceNotifBtn')?.addEventListener('click', openPendingRequestsModal);
    document.getElementById('closeNotifModalBtn').addEventListener('click', closeNotificationModal);
    
    // Close notification modal when clicking overlay
    const notifModal = document.getElementById('notificationModal');
    if (notifModal) {
        notifModal.addEventListener('click', closeNotificationModal);
        // Stop propagation inside the actual box
        notifModal.firstElementChild.addEventListener('click', e => e.stopPropagation());
    }

    document.getElementById('calPrevBtn').addEventListener('click', () => changeMonth(-1));
    document.getElementById('calNextBtn').addEventListener('click', () => changeMonth(1));

    // Init Dashboard Data
    initCalendar();
    loadUpcomingPrograms();
    fetchWeather();
    weatherInterval = setInterval(fetchWeather, 30 * 60 * 1000);
    trackModalState();

    updateAnnouncementRelativeDate();
    setInterval(updateAnnouncementRelativeDate, 60 * 1000);

    const chartsSection = document.getElementById('chartsSection');
    if (chartsSection) {
        initCharts();
        initDemographicCharts();
    }

    startPolling();
});

window.addEventListener('pagehide', function() {
    if (pollingInterval) clearInterval(pollingInterval);
    if (weatherInterval) clearInterval(weatherInterval);
});

window.addEventListener('pageshow', function(e) {
    if (e.persisted) {
        startPolling();
        weatherInterval = setInterval(fetchWeather, 30 * 60 * 1000);
    }
});

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
    } else {
        pollDashboard(false);
        startPolling();
    }
});

// --- Weather Logic ---
let weatherData = { current: null, daily: [] };
let weatherInterval = null;

async function fetchWeather() {
    const weatherContent = document.getElementById('weatherContent');
    weatherContent.innerHTML = '<div class="weather-loading">Loading weather data...</div>';
    try {
        const lat = 14.4443, lon = 120.9016;
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=Asia%2FSingapore&forecast_days=7`
        );
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        weatherData.current = {
            temp: Math.round(data.current.temperature_2m),
            humidity: data.current.relative_humidity_2m,
            windSpeed: data.current.wind_speed_10m,
            weatherCode: data.current.weather_code
        };
        weatherData.daily = [];
        for (let i = 0; i < data.daily.time.length; i++) {
            const date = new Date(data.daily.time[i]);
            weatherData.daily.push({
                dayName: date.toLocaleDateString('en-PH', { weekday: 'short' }),
                maxTemp: Math.round(data.daily.temperature_2m_max[i]),
                minTemp: Math.round(data.daily.temperature_2m_min[i]),
                weatherCode: data.daily.weather_code[i],
                precipProb: data.daily.precipitation_probability_max[i]
            });
        }
        updateWeatherUI();
    } catch (error) {
        console.error("Weather fetch failed:", error);
        document.getElementById('weatherContent').innerHTML =
            `<div class="weather-error">⚠️ Unable to load weather data<br><small>${error.message}</small></div>`;
    }
}

function getWeatherIcon(code) {
    const map = {
        0:'bi-sun-fill', 1:'bi-cloud-sun-fill', 2:'bi-cloud-fill', 3:'bi-clouds-fill',
        45:'bi-cloud-fog2-fill', 48:'bi-cloud-fog2-fill',
        51:'bi-cloud-drizzle-fill', 53:'bi-cloud-drizzle-fill', 55:'bi-cloud-drizzle-fill',
        61:'bi-cloud-rain-fill', 63:'bi-cloud-rain-heavy-fill', 65:'bi-cloud-rain-heavy-fill',
        71:'bi-cloud-snow-fill', 73:'bi-cloud-snow-fill', 75:'bi-cloud-snow-fill',
        80:'bi-cloud-rain-fill', 81:'bi-cloud-rain-heavy-fill', 82:'bi-cloud-rain-heavy-fill',
        95:'bi-cloud-lightning-rain-fill', 96:'bi-cloud-lightning-rain-fill', 99:'bi-cloud-lightning-rain-fill'
    };
    return map[code] || 'bi-cloud-sun-fill';
}

function updateWeatherUI() {
    if (!weatherData.current) return;
    let chips = '';
    weatherData.daily.forEach(day => {
        chips += `
            <div class="forecast-chip">
                <div class="forecast-chip-day">${day.dayName}</div>
                <div class="forecast-chip-icon"><i class="bi ${getWeatherIcon(day.weatherCode)}"></i></div>
                <div class="forecast-chip-temps">${day.maxTemp}°<br>  <span style="color:#4a5655;font-weight:400;">${day.minTemp}°</span></div>
                <div class="forecast-chip-precip"><i class="bi bi-droplet-fill"></i>${day.precipProb}%</div>
            </div>`;
    });

    document.getElementById('weatherContent').innerHTML = `
        <div class="weather-body-landscape">
            <div class="weather-current-side">
                <div class="weather-location"><i class="bi bi-geo-alt-fill"></i> Kawit, Cavite</div>
                <div class="weather-temp">${weatherData.current.temp}°C</div>
                <div class="weather-meta">
                    <div class="weather-meta-row"><i class="bi bi-droplet-fill"></i> ${weatherData.current.humidity}% humidity</div>
                    <div class="weather-meta-row"><i class="bi bi-wind"></i> ${weatherData.current.windSpeed} km/h</div>
                </div>
            </div>
            <div class="weather-forecast-side">
                <div class="forecast-scroll">${chips}</div>
            </div>
        </div>
        <div class="weather-attribution">
            <a href="https://open-meteo.com/" target="_blank" rel="noopener">Weather data by Open-Meteo.com</a>
        </div>`;
}

// --- Modal Logic ---
function openPendingRequestsModal() {
    const el = document.getElementById('pendingRequestsModal');
    if (!el) return;

    if (window.bootstrap && window.bootstrap.Modal) {
        bootstrap.Modal.getOrCreateInstance(el).show();
    } else {
        el.style.display = 'block';
        el.classList.add('show');
        el.removeAttribute('aria-hidden');
        el.setAttribute('aria-modal', 'true');
        document.body.classList.add('modal-open');
        let bd = document.getElementById('__pendingBackdrop');
        if (!bd) {
            bd = document.createElement('div');
            bd.id = '__pendingBackdrop';
            bd.className = 'modal-backdrop fade show';
            bd.addEventListener('click', closePendingRequestsModal);
            document.body.appendChild(bd);
        }
        el.querySelectorAll('[data-bs-dismiss="modal"]').forEach(btn => {
            btn.onclick = closePendingRequestsModal;
        });
    }
    loadPendingRequests();
}

function closePendingRequestsModal() {
    const el = document.getElementById('pendingRequestsModal');
    if (!el) return;
    if (window.bootstrap && window.bootstrap.Modal) {
        const inst = bootstrap.Modal.getInstance(el);
        if (inst) inst.hide();
    } else {
        el.style.display = 'none';
        el.classList.remove('show');
        document.body.classList.remove('modal-open');
        const bd = document.getElementById('__pendingBackdrop');
        if (bd) bd.remove();
    }
}

function loadPendingRequests() {
    const list = document.getElementById('pendingRequestsList');
    if (!list) return;
    list.innerHTML = '<div style="text-align:center;padding:24px;color:#5a6564;">Loading…</div>';

    fetch('/system-logs/api/pending')
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                list.innerHTML = '<div style="text-align:center;padding:24px;color:#5a6564;">No pending requests</div>';
                return;
            }
            list.innerHTML = data.map(r => `
                <div style="padding:12px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;gap:12px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:13px;color:#1a1f1e;">
                            ${esc(r.requesterName)}
                            <span style="color:#5a6564;font-weight:400;">(${esc(r.requesterRole)})</span>
                        </div>
                        <div style="font-size:12px;color:#4a5655;margin-top:4px;">${esc(r.description)}</div>
                        <div style="font-size:11px;color:#5a6564;margin-top:4px;">${esc(r.timestamp)}</div>
                    </div>
                    <button class="btn btn-sm btn-success align-self-start btn-resolve-req" data-id="${r.id}">Resolve</button>
                </div>
            `).join('');

            // Attach listeners for resolve buttons
            list.querySelectorAll('.btn-resolve-req').forEach(btn => {
                btn.addEventListener('click', (e) => resolveAssistanceRequest(e.target.getAttribute('data-id')));
            });
        })
        .catch(err => {
            console.error('Failed to load pending requests', err);
            list.innerHTML = '<div style="text-align:center;padding:24px;color:#e74c3c;">Could not load requests</div>';
        });
}

function resolveAssistanceRequest(id) {
    fetch('/system-logs/resolve/' + id, { method: 'POST' })
        .then(r => r.json())
        .then(() => {
            loadPendingRequests();
            fetch('/system-logs/api/pending')
                .then(res => res.json())
                .then(pending => {
                    const dot = document.getElementById('dot-assistance');
                    if (dot) {
                        dot.textContent = (Array.isArray(pending) && pending.length > 0) ? pending.length : '';
                    }
                })
                .catch(() => {});
        })
        .catch(err => console.error('Resolve failed', err));
}

function openNotificationModal() {
    document.getElementById('notificationModal').style.display = 'block';
    loadNotifications();
}
function closeNotificationModal() {
    document.getElementById('notificationModal').style.display = 'none';
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeNotificationModal();
        closePendingRequestsModal();
    }
});

function loadNotifications() {
    fetch('/api/dashboard/notifications')
        .then(r => r.json())
        .then(notifs => {
            const list = document.getElementById('notifList');
            if (!notifs || notifs.length === 0) {
                list.innerHTML = '<div style="text-align:center;padding:30px;color:#aaa;"><i class="bi bi-bell-slash" style="font-size:28px;display:block;margin-bottom:8px;"></i>No new notifications</div>';
            } else {
                list.innerHTML = notifs.map(n => `
                    <a href="${n.link}" class="notif-item" style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid #f0f0f0;text-decoration:none;color:inherit;cursor:pointer;transition:background 0.2s;">
                        <div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;background:${getIconBg(n.iconClass)};color:${getIconColor(n.iconClass)};">
                            <i class="bi ${n.icon || 'bi-bell'}"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:13px;font-weight:bold;color:#1a1a1a;margin-bottom:2px;">${esc(n.title)}</div>
                            <div style="font-size:12px;color:#666;">${esc(n.description)}</div>
                            <div style="font-size:11px;color:#aaa;margin-top:3px;">${n.timeAgo || 'Just now'}</div>
                        </div>
                    </a>
                `).join('');
                
                // Add hover/close listeners for static bindings
                list.querySelectorAll('.notif-item').forEach(a => {
                    a.addEventListener('mouseover', function() { this.style.background = '#f5faf8'; });
                    a.addEventListener('mouseout', function() { this.style.background = 'white'; });
                    a.addEventListener('click', closeNotificationModal);
                });
            }
        })
        .catch(() => {
            document.getElementById('notifList').innerHTML = '<div style="text-align:center;padding:30px;color:#aaa;">Could not load notifications</div>';
        });
}

function getIconBg(cls) {
    const map = { accounts:'#eaf0fb', announcements:'#fef8e6', documents:'#fef0ee', safety:'#fff0f0', emergency:'#ffeaea', programs:'#eaf5f0' };
    return map[cls] || '#eaf0fb';
}
function getIconColor(cls) {
    const map = { accounts:'#3498db', announcements:'#f39c12', documents:'#e74c3c', safety:'#e74c3c', emergency:'#c0392b', programs:'#27ae60' };
    return map[cls] || '#3498db';
}


// --- Polling & Charts Logic ---
let pollingInterval = null;
let isModalOpen = false;
let pendingUpdates = false;
let chartInstances = {};
let lastAnnouncementId = null;
let lastActivityId = null;
let currentStats = {};

function initCurrentStats() {
    currentStats = {
        residents:   document.getElementById('numResidents')?.textContent?.trim()   || '0',
        pendingDocs: document.getElementById('numPendingDocs')?.textContent?.trim() || '0',
        budget:      document.getElementById('numBudget')?.textContent?.trim()      || '₱0',
        senior:      document.getElementById('numSenior')?.textContent?.trim()      || '0',
        newRequests: document.getElementById('numNewRequests')?.textContent?.trim() || '0',
        sosAlerts:   document.getElementById('numSOS')?.textContent?.trim()         || '0',
        incidents:   document.getElementById('numIncidents')?.textContent?.trim()   || '0'
    };
    const announceTitle = document.getElementById('announceTitle');
    if (announceTitle) lastAnnouncementId = announceTitle.textContent?.trim() || null;
    const firstActivity = document.querySelector('.activity-detail span');
    if (firstActivity) lastActivityId = firstActivity.textContent?.trim() || null;
}

function trackModalState() {
    document.addEventListener('show.bs.modal', () => { isModalOpen = true; });
    document.addEventListener('hidden.bs.modal', () => {
        isModalOpen = false;
        if (pendingUpdates) { pendingUpdates = false; pollDashboard(true); }
    });
}

async function pollDashboard(forceUpdate = false) {
    try {
        const response = await fetch('/api/dashboard/poll?t=' + Date.now());
        if (!response.ok) return;
        const data = await response.json();
        const hasChanges = checkForChanges(data);
        if (!hasChanges && !forceUpdate) return;

        if (data.newNotifications) {
            data.newNotifications.forEach(function(n) {
                if (typeof showToast === 'function') {
                    showToast(n.title, n.description, n.link, '<i class="bi ' + n.icon + '"></i>');
                }
            });
        }
        if (isModalOpen && !forceUpdate) { pendingUpdates = true; return; }

        updateStatCard('numResidents',   data.residents,           'statResidents',   currentStats.residents);
        updateStatCard('numPendingDocs', data.pendingDocuments,     'statPendingDocs', currentStats.pendingDocs);
        updateStatCard('numBudget',      data.budget,               'statBudget',      currentStats.budget);
        updateStatCard('numSenior',      data.seniorPwdCount,       'statSenior',      currentStats.senior);
        updateStatCard('numNewRequests', data.newRequestsThisMonth, 'statNewRequests', currentStats.newRequests);
        updateStatCard('numSOS',         data.sosAlertsThisMonth,   'statSOS',         currentStats.sosAlerts);
        updateStatCard('numIncidents',   data.allReports,           'statIncidents',   currentStats.incidents);

        if (data.latestAnnouncement)        updateAnnouncement(data.latestAnnouncement);
        if (data.recentLogs?.length > 0)    updateActivityLogs(data.recentLogs);
        if (data.upcomingProgramsChanged)   loadUpcomingPrograms();

        const role = document.getElementById('dataCurrentRole').value;
        if (role === 'ADMIN' || role === 'BARANGAY-CAPTAIN' || role === 'SECRETARY' || role === 'SECRETARIAT STAFF') {
            if (data.resolvedIncidents !== undefined || data.unresolvedIncidents !== undefined) {
                var blotter = parseInt(document.getElementById('dataBlotterPending').value) || 0;
                if (data.blotterPending !== undefined) blotter = data.blotterPending;

                updateCharts(data.resolvedIncidents || 0, data.unresolvedIncidents || 0,
                            data.pendingDocuments || 0, data.allReports || 0, blotter);
            }
        }
        if (data.resolvedIncidents !== undefined)   document.getElementById('dataResolved').value   = data.resolvedIncidents;
        if (data.unresolvedIncidents !== undefined) document.getElementById('dataUnresolved').value = data.unresolvedIncidents;
    } catch (error) { console.error("Polling error:", error); }
}

function checkForChanges(data) {
    if (data.latestAnnouncement && data.latestAnnouncement.title !== lastAnnouncementId) return true;
    if (data.recentLogs?.length > 0 && data.recentLogs[0]?.details !== lastActivityId) return true;
    if (data.residents        !== undefined && String(data.residents)             !== currentStats.residents)   return true;
    if (data.pendingDocuments !== undefined && String(data.pendingDocuments)       !== currentStats.pendingDocs) return true;
    if (data.sosAlertsThisMonth !== undefined && String(data.sosAlertsThisMonth)  !== currentStats.sosAlerts)   return true;
    if (data.allReports       !== undefined && String(data.allReports)             !== currentStats.incidents)   return true;
    return false;
}

function updateStatCard(elementId, newValue, cardId, oldValue) {
    if (newValue === undefined || newValue === null) return false;
    const element = document.getElementById(elementId);
    if (!element) return false;
    const newValueStr = String(newValue);
    if (oldValue !== newValueStr) {
        element.textContent = newValueStr;
        const statKey = elementId.replace('num', '').toLowerCase();
        currentStats[statKey] = newValueStr;
        const card = document.getElementById(cardId);
        if (card) { card.classList.add('updating'); setTimeout(() => card.classList.remove('updating'), 500); }
        return true;
    }
    return false;
}

function formatRelativeTime(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d`;
    if (diffWeeks === 1) return '1w';
    if (diffWeeks < 4) return `${diffWeeks}w`;
    if (diffMonths === 1) return '1mo';
    if (diffMonths < 12) return `${diffMonths}mo`;
    if (diffYears === 1) return '1y';
    return `${diffYears}y`;
}

function updateAnnouncementRelativeDate() {
    const originalDateSpan = document.getElementById('announceOriginalDate');
    const relativeSpan = document.getElementById('announceRelativeDate');

    if (originalDateSpan && originalDateSpan.textContent && relativeSpan) {
        const dateText = originalDateSpan.textContent;
        const parsedDate = new Date(dateText);

        if (!isNaN(parsedDate.getTime())) {
            relativeSpan.textContent = formatRelativeTime(parsedDate);
        } else {
            const dataDate = originalDateSpan.getAttribute('data-date');
            if (dataDate) {
                relativeSpan.textContent = formatRelativeTime(dataDate);
            }
        }
    }
}

function updateAnnouncement(announcement) {
    if (!announcement || !announcement.title) return false;
    if (announcement.title === lastAnnouncementId) return false;
    lastAnnouncementId = announcement.title;
    const announceBox         = document.getElementById('announcementBox');
    const noAnnouncement      = document.getElementById('noAnnouncement');
    const announcementContent = document.getElementById('announcementContent');
    if (noAnnouncement)      noAnnouncement.style.display = 'none';
    if (announcementContent) announcementContent.style.display = 'flex';
    const titleEl = document.getElementById('announceTitle');
    if (titleEl) titleEl.textContent = announcement.title;
    const contentEl = document.getElementById('announceContent');
    if (contentEl) contentEl.textContent = announcement.content || '';

    const originalDateEl = document.getElementById('announceOriginalDate');
    if (originalDateEl && announcement.datePosted) {
        const date = new Date(announcement.datePosted);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const formattedDate = `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`;
        originalDateEl.textContent = formattedDate;
        originalDateEl.setAttribute('data-date', announcement.datePosted);

        const relativeDateEl = document.getElementById('announceRelativeDate');
        if (relativeDateEl) {
            relativeDateEl.textContent = formatRelativeTime(announcement.datePosted);
        }
    }

    const imageEl = document.getElementById('announceImage');
    if (announcement.image && announcement.id) {
        if (imageEl) {
            imageEl.src = String(announcement.image).startsWith('http')
                ? announcement.image
                : '/media/announcement/' + announcement.id;
            imageEl.style.display = 'block';
        }
    } else if (imageEl) { imageEl.style.display = 'none'; }
    const badge = document.getElementById('announceBadge');
    if (badge) { badge.style.display = 'inline-block'; }
    if (announceBox) {
        announceBox.classList.add('new-content');
        setTimeout(() => announceBox.classList.remove('new-content'), 3000);
    }
    return true;
}

function updateActivityLogs(logs) {
    if (!logs || logs.length === 0) return false;
    const newFirstActivity = logs[0]?.details;
    if (newFirstActivity === lastActivityId) return false;
    lastActivityId = newFirstActivity;
    const activityList = document.getElementById('activityList');
    if (!activityList) return false;
    let html = '';
    logs.forEach(log => {
        const time = log.timestamp ? new Date(log.timestamp).toLocaleString('en-US', {
            month: '2-digit', day: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: true
        }) : 'N/A';
        html += `
            <div class="activity-item">
                <div class="activity-dot"></div>
                <div class="activity-info">
                    <div class="activity-detail">
                        ${esc(log.details || '')}
                        <span class="activity-by"> — By ${esc(log.UserName || 'Unknown')}</span>
                    </div>
                    <div class="activity-time-label">${time}</div>
                </div>
            </div>`;
    });
    activityList.innerHTML = html || '<div class="no-programs">No recent activity</div>';
    return true;
}

function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    initCurrentStats();
    pollingInterval = setInterval(() => pollDashboard(false), 15000);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`;
}

const CHART_ANIM_OFF = { duration: 0 };

function initDemographicCharts() {
    const seniorMale = parseInt(document.getElementById('dataSeniorMale')?.value) || 0;
    const seniorFemale = parseInt(document.getElementById('dataSeniorFemale')?.value) || 0;

    if (document.getElementById('seniorGenderDonut') && (seniorMale > 0 || seniorFemale > 0)) {
        new Chart(document.getElementById('seniorGenderDonut'), {
            type: 'doughnut',
            data: {
                labels: ['Male Seniors', 'Female Seniors'],
                datasets: [{
                    data: [seniorMale, seniorFemale],
                    backgroundColor: ['#3498db', '#e74c3c'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                animation: CHART_ANIM_OFF,
                plugins: { legend: { display: false } },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            let total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            let pct = total > 0 ? Math.round(ctx.parsed * 100 / total) : 0;
                            return ctx.label + ': ' + ctx.parsed + ' (' + pct + '%)';
                        }
                    }
                }
            }
        });
    }

    const pwdChildren = parseInt(document.getElementById('dataPwdChildren')?.value) || 0;
    const pwdAdultMales = parseInt(document.getElementById('dataPwdAdultMales')?.value) || 0;
    const pwdAdultFemales = parseInt(document.getElementById('dataPwdAdultFemales')?.value) || 0;
    const pwdSeniors = parseInt(document.getElementById('dataPwdSeniors')?.value) || 0;

    if (document.getElementById('pwdBreakdownChart')) {
        const totalPWD = pwdChildren + pwdAdultMales + pwdAdultFemales + pwdSeniors;

        if (totalPWD > 0) {
            new Chart(document.getElementById('pwdBreakdownChart'), {
                type: 'bar',
                data: {
                    labels: ['Children', 'Adult Males', 'Adult Females', 'Seniors'],
                    datasets: [{
                        data: [pwdChildren, pwdAdultMales, pwdAdultFemales, pwdSeniors],
                        backgroundColor: ['#3498db', '#27ae60', '#8e44ad', '#f39c12'],
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: CHART_ANIM_OFF,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#5a6564' }, grid: { color: '#f0f0f0' } },
                        x: { grid: { display: false }, ticks: { color: '#4a5655' } }
                    }
                }
            });
        } else {
            const parent = document.getElementById('pwdBreakdownChart').parentElement;
            parent.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:180px; color:#5a6564; font-style:italic;">No PWDs registered in the barangay</div>';
        }
    }
}

function initCharts() {
    const resolved   = parseInt(document.getElementById('dataResolved')?.value || '0') || 0;
    const unresolved = parseInt(document.getElementById('dataUnresolved')?.value || '0') || 0;
    const pending    = parseInt(document.getElementById('dataPending')?.value || '0') || 0;
    const allReports = parseInt(document.getElementById('dataAllReports')?.value || '0') || 0;
    const blotter    = parseInt(document.getElementById('dataBlotterPending')?.value || '0') || 0;

    if (document.getElementById('incidentDonut') &&
        document.getElementById('rateChart') &&
        document.getElementById('workloadChart')) {
        createCharts(resolved, unresolved, pending, allReports, blotter);
    }
}

function createCharts(resolved, unresolved, pending, allReports, blotter) {
    const incidentCanvas = document.getElementById('incidentDonut');
    const rateCanvas = document.getElementById('rateChart');
    const workloadCanvas = document.getElementById('workloadChart');

    if (!incidentCanvas || !rateCanvas || !workloadCanvas) {
        console.warn('Chart canvases not found - skipping chart creation');
        return;
    }

    Chart.defaults.font.family = "'DM Sans', Arial, sans-serif";
    Chart.defaults.font.size   = 11;
    if (chartInstances.incidentDonut) chartInstances.incidentDonut.destroy();
    if (chartInstances.rateChart)     chartInstances.rateChart.destroy();
    if (chartInstances.workloadChart) chartInstances.workloadChart.destroy();

    chartInstances.incidentDonut = new Chart(incidentCanvas, {
        type: 'doughnut',
        data: {
            labels: ['Resolved', 'Unresolved'],
            datasets: [{ data: [resolved, unresolved], backgroundColor: ['#27ae60','#e74c3c'], borderWidth: 0, hoverOffset: 4 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            animation: CHART_ANIM_OFF,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + ctx.parsed } } }
        }
    });

    const total = resolved + unresolved;
    const rate  = total > 0 ? Math.round(resolved * 100 / total) : 0;
    document.getElementById('ratePctLabel').textContent = rate + '%';
    document.getElementById('rateSubLabel').textContent = resolved + ' of ' + total + ' resolved';

    chartInstances.rateChart = new Chart(rateCanvas, {
        type: 'doughnut',
        data: {
            labels: ['Resolved', 'Remaining'],
            datasets: [{ data: [rate, 100 - rate], backgroundColor: ['#27ae60','#f0f0f0'], borderWidth: 0 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '72%',
            animation: CHART_ANIM_OFF,
            plugins: { legend: { display: false } }
        }
    });

    chartInstances.workloadChart = new Chart(workloadCanvas, {
        type: 'bar',
        data: {
            labels: ['Pending Blotter','Pending Docs', 'Total Incidents'],
            datasets: [{ data: [blotter, pending, allReports], backgroundColor: ['#f0c040','#52887F'], borderRadius: 4, borderSkipped: false }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            animation: CHART_ANIM_OFF,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + ctx.parsed.x } } },
            scales: {
                x: { grid: { color: '#f0f0f0' }, ticks: { color: '#5a6564', stepSize: 1 }, beginAtZero: true },
                y: { grid: { display: false }, ticks: { color: '#4a5655' } }
            }
        }
    });
}

function updateCharts(resolved, unresolved, pending, allReports, blotter) {
    if (!chartInstances.incidentDonut || !chartInstances.rateChart || !chartInstances.workloadChart) {
        createCharts(resolved, unresolved, pending, allReports, blotter);
        return;
    }

    chartInstances.incidentDonut.data.datasets[0].data = [resolved, unresolved];
    chartInstances.incidentDonut.update();

    var total = resolved + unresolved;
    var rate = total > 0 ? Math.round(resolved * 100 / total) : 0;
    chartInstances.rateChart.data.datasets[0].data = [rate, 100 - rate];
    chartInstances.rateChart.update();
    document.getElementById('ratePctLabel').textContent = rate + '%';
    document.getElementById('rateSubLabel').textContent = resolved + ' of ' + total + ' resolved';

    chartInstances.workloadChart.data.datasets[0].data = [blotter, pending, allReports];
    chartInstances.workloadChart.update();
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const today    = new Date();
let   calYear  = today.getFullYear();
let   calMonth = today.getMonth();
const eventCache = {};

function changeMonth(delta) {
    calMonth += delta;
    if (calMonth > 11) { calMonth = 0;  calYear++; }
    if (calMonth < 0)  { calMonth = 11; calYear--; }
    renderCalendar();
}
function initCalendar() { renderCalendar(); }

async function getEventDays(year, month) {
    const key = `${year}-${month + 1}`;
    if (eventCache[key] !== undefined) return eventCache[key];
    try {
        const res  = await fetch(`/api/calendar/month?year=${year}&month=${month + 1}`);
        const data = await res.json();
        const days = new Set(data.map(e => e.day));
        eventCache[key] = days;
        return days;
    } catch {
        eventCache[key] = new Set();
        return new Set();
    }
}

async function renderCalendar() {
    const titleEl = document.getElementById('calendarTitle');
    titleEl.innerHTML = `<i class="bi bi-calendar3"></i> ${MONTH_NAMES[calMonth]} ${calYear}`;
    const eventDays   = await getEventDays(calYear, calMonth);
    const firstDow    = new Date(calYear, calMonth, 1).getDay();
    const startOffset = (firstDow + 6) % 7;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrev  = new Date(calYear, calMonth,     0).getDate();
    const grid = document.getElementById('calendarGrid');
    while (grid.children.length > 7) grid.removeChild(grid.lastChild);
    for (let i = startOffset - 1; i >= 0; i--) {
        const d = document.createElement('div');
        d.className = 'calendar-day other-month';
        d.textContent = daysInPrev - i;
        grid.appendChild(d);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const d = document.createElement('div');
        const isToday = calYear === today.getFullYear() && calMonth === today.getMonth() && day === today.getDate();
        let cls = 'calendar-day';
        if (isToday)            cls += ' today';
        if (eventDays.has(day)) cls += ' has-event';
        d.className = cls;
        d.textContent = day;
        grid.appendChild(d);
    }
    const total = startOffset + daysInMonth;
    const trailingCount = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let i = 1; i <= trailingCount; i++) {
        const d = document.createElement('div');
        d.className = 'calendar-day other-month';
        d.textContent = i;
        grid.appendChild(d);
    }
}

async function loadUpcomingPrograms() {
    const container = document.getElementById('upcomingProgramsList');
    try {
        const res  = await fetch('/api/calendar/upcoming');
        const data = await res.json();
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="no-programs">No upcoming programs</div>';
            return;
        }
        container.innerHTML = '';
        data.forEach(program => {
            const parts = program.eventDate.split('-');
            const date  = new Date(+parts[0], +parts[1] - 1, +parts[2]);
            const day   = date.getDate();
            const mon   = date.toLocaleString('default', { month: 'short' });
            let timeLabel = mon;
            if (program.startTime) {
                const [hStr, mStr] = program.startTime.split(':');
                let h = parseInt(hStr, 10);
                const ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12 || 12;
                timeLabel += ` · ${h}:${mStr} ${ampm}`;
            }
            const item = document.createElement('div');
            item.className = 'program-item';
            item.innerHTML = `
                <div class="program-date-circle">${day}</div>
                <div class="program-info">
                    <div class="program-name">${esc(program.notes)}</div>
                    <div class="program-time"><i class="bi bi-clock"></i> ${esc(timeLabel)}</div>
                </div>`;
            container.appendChild(item);
        });
    } catch (e) {
        container.innerHTML = '<div class="no-programs">Could not load programs</div>';
    }
}

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}