document.addEventListener('DOMContentLoaded', function() {
    // Fix for buttons with no accessible name
    document.querySelectorAll('button').forEach(function (b) {
        var named = b.textContent.trim() || b.getAttribute('aria-label') ||
                    b.getAttribute('aria-labelledby') || b.title;
        if (!named) b.setAttribute('aria-label', 'Toggle menu');
    });

    // ============================================
    // STATE
    // ============================================
    let currentTab = 'alerts';
    let currentMap = null;
    let lastEtag = '';
    let weeklyForecast = [];
    let weatherData = null;
    let expandedDay = null;

    // ============================================
    // HELPERS
    // ============================================
    function getPriorityClass(priority) {
        const p = priority ? priority.toString().toUpperCase() : '';
        if (p === 'LEVEL 3' || p === 'CRITICAL') return 'critical';
        if (p === 'LEVEL 2' || p === 'WARNING') return 'warning';
        return 'mild';
    }

    function getPriorityLabel(priority) {
        const p = priority ? priority.toString().toUpperCase() : '';
        if (p === 'LEVEL 3' || p === 'CRITICAL') return 'CRITICAL';
        if (p === 'LEVEL 2' || p === 'WARNING') return 'WARNING';
        return 'MILD';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ============================================
    // MODAL LOGIC
    // ============================================
    const overlay = document.getElementById('overlay');
    const btnCloseModal = document.getElementById('btnCloseModal');

    function openAlertModal(element) {
        const title = element.getAttribute('data-title') || '';
        const message = element.getAttribute('data-message') || '';
        const type = element.getAttribute('data-type') || '';
        const location = element.getAttribute('data-location') || '';
        const priority = element.getAttribute('data-priority') || '';
        const date = element.getAttribute('data-date') || '';
        const latitude = parseFloat(element.getAttribute('data-latitude'));
        const longitude = parseFloat(element.getAttribute('data-longitude'));

        const priorityClass = getPriorityClass(priority);
        const priorityLabel = getPriorityLabel(priority);

        let dateFormatted = 'N/A';
        if (date) {
            try {
                dateFormatted = new Date(date).toLocaleString('en-PH');
            } catch (e) {}
        }

        const hasLocation = latitude && longitude && !isNaN(latitude) && !isNaN(longitude) && latitude !== 0 && longitude !== 0;

        const modalContent = document.getElementById('modalContent');
        if (!modalContent) return;

        modalContent.innerHTML = `
            <div class="modal-body-custom">
                <div style="text-align: center; margin-bottom: 16px;">
                    <div style="background: ${priorityClass === 'critical' ? '#E35248' : priorityClass === 'warning' ? '#F2A03D' : '#2D9CDB'}; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                        <i class="bi bi-exclamation-triangle-fill" style="font-size: 28px; color: white;"></i>
                    </div>
                </div>
                <h3 style="font-family: var(--font-h); font-size: 18px; margin-bottom: 8px; text-align: center;">${escapeHtml(title)}</h3>
                <div style="text-align: center; margin-bottom: 16px;">
                    <span style="background: ${priorityClass === 'critical' ? '#E35248' : priorityClass === 'warning' ? '#F2A03D' : '#2D9CDB'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;">${priorityLabel}</span>
                    <span style="margin-left: 8px; font-size: 12px; color: #888;">${escapeHtml(type)}</span>
                </div>
                <p style="font-size: 14px; line-height: 1.6; margin-bottom: 12px;">${escapeHtml(message)}</p>
                <div class="modal-location">
                    <i class="bi bi-geo-alt-fill" style="color: #e74c3c;"></i>
                    <span>${escapeHtml(location || 'San Sebastian, Kawit')}</span>
                </div>
                <div style="font-size: 11px; color: #888; margin-top: 8px;">
                    <i class="bi bi-calendar3"></i> Created: ${escapeHtml(dateFormatted)}
                </div>
                ${hasLocation ? `<div id="modalMap" class="modal-map"></div>` : ''}
            </div>
            <div class="modal-footer-custom">
                <button class="btn-close-m" id="btnCloseModalFooter">Close</button>
            </div>
        `;

        document.getElementById('btnCloseModalFooter').addEventListener('click', closeModal);
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';

        if (hasLocation) {
            setTimeout(() => {
                if (currentMap) currentMap.remove();
                const mapContainer = document.getElementById('modalMap');
                if (mapContainer) {
                    const map = L.map('modalMap').setView([latitude, longitude], 14);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(map);
                    const redIcon = L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41]
                    });
                    L.marker([latitude, longitude], { icon: redIcon }).addTo(map).bindPopup(`<b>${escapeHtml(title)}</b>`).openPopup();
                    map.invalidateSize();
                    currentMap = map;
                }
            }, 100);
        }
    }

    function closeModal() {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
        if (currentMap) { currentMap.remove(); currentMap = null; }
    }

    btnCloseModal.addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
    });

    // ============================================
    // TAB FILTERING
    // ============================================
    function applyTabFilter(tab) {
        currentTab = tab;

        const weatherContent = document.getElementById('weatherContent');
        const alertsContent  = document.getElementById('alertsContent');
        const sectionTitle   = document.getElementById('activeSectionTitle');
        const emptyState     = document.getElementById('emptyState');

        if (tab === 'weather') {
            if (weatherContent) weatherContent.style.display = 'block';
            if (alertsContent)  alertsContent.style.display  = 'none';
            fetchWeather();
            return;
        }

        if (weatherContent) weatherContent.style.display = 'none';
        if (alertsContent)  alertsContent.style.display  = 'block';

        const cards = document.querySelectorAll('#feed .alert-card');
        let anyVisible = false;

        cards.forEach(card => {
            const type = card.getAttribute('data-type') || '';
            const isPublicSafety = type === 'Public Safety';
            const show = (tab === 'road') ? isPublicSafety : !isPublicSafety;

            card.style.display = show ? '' : 'none';
            if (show) anyVisible = true;
        });

        if (sectionTitle) {
            sectionTitle.textContent = (tab === 'road')
                ? 'Public Safety Advisories'
                : 'Emergency Alerts';
        }
        if (emptyState) emptyState.style.display = anyVisible ? 'none' : 'block';
    }

    document.querySelectorAll('.sub-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            applyTabFilter(tab.dataset.tab);
        });
    });

    // ============================================
    // POLLING FOR NEW ALERTS
    // ============================================
    function getCurrentAlertIds() {
        const cards = document.querySelectorAll('#feed .alert-card');
        const ids = [];
        cards.forEach(card => {
            const id = card.getAttribute('data-id');
            if (id) ids.push(id);
        });
        return ids;
    }

    async function pollAlerts() {
        if (currentTab === 'weather') return;

        try {
            const res = await fetch('/resident/emergency-alerts/api/feed?t=' + Date.now());
            if (!res.ok) return;
            const data = await res.json();

            const activeAlerts = data.filter(a => !a.archived);

            const currentIds = getCurrentAlertIds();
            const newIds = activeAlerts.map(a => String(a.id));

            const idsChanged =
                currentIds.length !== newIds.length ||
                currentIds.some(id => !newIds.includes(id)) ||
                newIds.some(id => !currentIds.includes(id));

            if (!idsChanged) {
                for (const alert of activeAlerts) {
                    const card = document.getElementById(`alert-${alert.id}`);
                    if (card) {
                        if (card.getAttribute('data-priority') !== alert.priority ||
                            card.getAttribute('data-type')     !== alert.type) {
                            window.location.reload();
                            return;
                        }
                    }
                }
                return;
            }

            window.location.reload();
        } catch (e) {
            console.error('Poll error:', e);
        }
    }

    // ============================================
    // WEATHER LOGIC
    // ============================================
    async function fetchWeather() {
        try {
            const lat = 14.4129;
            const lon = 120.8886;
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=Asia%2FSingapore&forecast_days=7`
            );
            const data = await response.json();

            weatherData = {
                temp: Math.round(data.current.temperature_2m),
                code: data.current.weather_code
            };

            weeklyForecast = [];
            for (let i = 0; i < data.daily.time.length; i++) {
                const date = new Date(data.daily.time[i]);
                const dayName = date.toLocaleDateString('en-PH', { weekday: 'short' });
                const monthDay = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

                weeklyForecast.push({
                    id: i,
                    dayName,
                    monthDay,
                    maxTemp: Math.round(data.daily.temperature_2m_max[i]),
                    minTemp: Math.round(data.daily.temperature_2m_min[i]),
                    weatherCode: data.daily.weather_code[i],
                    precipProb: data.daily.precipitation_probability_max[i],
                });
            }

            updateWeatherUI();
        } catch (error) {
            console.error("Weather fetch failed:", error);
        }
    }

    function getWeatherIconClass(code) {
        if (code === 0) return 'bi bi-sun';
        if (code === 1 || code === 2) return 'bi bi-cloud-sun';
        if (code === 3) return 'bi bi-cloud';
        if (code >= 45 && code <= 48) return 'bi bi-cloud-fog';
        if (code >= 51 && code <= 55) return 'bi bi-cloud-drizzle';
        if (code >= 61 && code <= 65) return 'bi bi-cloud-rain';
        if (code >= 71 && code <= 77) return 'bi bi-snow';
        if (code >= 80 && code <= 82) return 'bi bi-cloud-rain-heavy';
        if (code >= 95 && code <= 99) return 'bi bi-cloud-lightning-rain';
        return 'bi bi-cloud-sun';
    }

    function updateWeatherUI() {
        if (weatherData) {
            const iconClass = getWeatherIconClass(weatherData.code);
            const weatherIcon = document.querySelector('#weatherHeader .weather-icon i');
            if (weatherIcon) weatherIcon.className = iconClass;
            const currentTemp = document.getElementById('currentTemp');
            if (currentTemp) currentTemp.textContent = weatherData.temp + '°C';
        }

        const forecastContainer = document.getElementById('forecastList');
        if (forecastContainer && weeklyForecast.length) {
            forecastContainer.innerHTML = '';
            weeklyForecast.forEach((day, idx) => {
                const iconClass = getWeatherIconClass(day.weatherCode);
                const isExpanded = expandedDay === idx;
                const dayDiv = document.createElement('div');
                dayDiv.className = 'forecast-day';
                dayDiv.innerHTML = `
                    <div class="forecast-header" data-forecast-index="${idx}">
                        <div class="day-info">
                            <div class="day-name">${escapeHtml(day.dayName)}</div>
                            <div class="day-date">${escapeHtml(day.monthDay)}</div>
                        </div>
                        <i class="${iconClass} weather-icon-small"></i>
                        <div class="temp-range">
                            <span class="temp-max">${day.maxTemp}°</span>
                            <span class="temp-min">${day.minTemp}°</span>
                        </div>
                        <i class="bi bi-chevron-down"></i>
                    </div>
                    <div class="forecast-details" id="forecastDetails-${idx}" style="display: ${isExpanded ? 'block' : 'none'}">
                        <div class="detail-row"><i class="bi bi-droplet"></i> Precipitation: ${day.precipProb}% chance</div>
                        <div class="detail-row"><i class="bi bi-thermometer-half"></i> Feels like: ~${Math.round((day.maxTemp + day.minTemp) / 2)}°C average</div>
                        <div class="detail-row"><i class="bi bi-wind"></i> ${day.precipProb > 70 ? 'High chance of rain' : day.precipProb > 40 ? 'Moderate chance of rain' : 'Low chance of rain'}</div>
                    </div>
                `;
                forecastContainer.appendChild(dayDiv);
            });

            // Attach click listeners for forecast toggle
            forecastContainer.querySelectorAll('.forecast-header').forEach(header => {
                header.addEventListener('click', function() {
                    const idx = parseInt(this.getAttribute('data-forecast-index'));
                    expandedDay = expandedDay === idx ? null : idx;
                    updateWeatherUI();
                });
            });
        }
    }

    // ============================================
    // EVENT DELEGATION FOR ALERT CARDS
    // ============================================
    document.getElementById('feed').addEventListener('click', function(e) {
        const card = e.target.closest('.alert-card-clickable');
        if (card) {
            openAlertModal(card);
        }
    });

    // ============================================
    // INIT
    // ============================================
    applyTabFilter('alerts');
    setInterval(pollAlerts, 5000);
    fetchWeather();
});