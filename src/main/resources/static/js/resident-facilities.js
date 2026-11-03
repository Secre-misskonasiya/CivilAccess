document.addEventListener('DOMContentLoaded', function() {
    // Accessibility fix for buttons
    document.querySelectorAll('button').forEach(btn => {
        const hasName = btn.textContent.trim() ||
                        btn.getAttribute('aria-label') ||
                        btn.getAttribute('aria-labelledby') ||
                        btn.getAttribute('title');
        if (hasName) return;

        const hint = (btn.id + ' ' + btn.className).toLowerCase();
        if (hint.includes('close')) btn.setAttribute('aria-label', 'Close');
        else if (hint.includes('toggle') || hint.includes('menu')) btn.setAttribute('aria-label', 'Toggle navigation menu');
        else btn.setAttribute('aria-label', 'Button');
    });

    // ============================================
    // STATE
    // ============================================
    let currentMap = null;
    let currentRoute = null;
    let lastEtag = '';

    // ============================================
    // HELPERS
    // ============================================
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ============================================
    // MODAL LOGIC
    // ============================================
    const overlay = document.getElementById('overlay');
    const btnCloseModal = document.getElementById('btnCloseModal');

    function openFacilityModal(card) {
        const name = card.getAttribute('data-name') || '';
        const type = card.getAttribute('data-type') || '';
        const contact = card.getAttribute('data-contact') || '';
        const email = card.getAttribute('data-email') || '';
        const address = card.getAttribute('data-address') || '';
        const status = card.getAttribute('data-status') || 'OPEN';
        const latitude = parseFloat(card.getAttribute('data-latitude'));
        const longitude = parseFloat(card.getAttribute('data-longitude'));

        const hasLocation = latitude && longitude && !isNaN(latitude) && !isNaN(longitude) && latitude !== 0 && longitude !== 0;

        const modalContent = document.getElementById('modalContent');
        if (!modalContent) return;

        modalContent.innerHTML = `
            <div class="modal-body-custom">
                <div class="modal-info-row">
                    <div class="modal-label">Facility Name</div>
                    <div class="modal-value">${escapeHtml(name)}</div>
                </div>
                <div class="modal-info-row">
                    <div class="modal-label">Facility Type</div>
                    <div class="modal-value">${escapeHtml(type)}</div>
                </div>
                <div class="modal-info-row">
                    <div class="modal-label">Contact Number</div>
                    <div class="modal-value"><i class="bi bi-telephone-fill"></i> ${escapeHtml(contact)}</div>
                </div>
                <div class="modal-info-row">
                    <div class="modal-label">Email</div>
                    <div class="modal-value"><i class="bi bi-envelope-fill"></i> ${escapeHtml(email)}</div>
                </div>
                <div class="modal-info-row">
                    <div class="modal-label">Address</div>
                    <div class="modal-value"><i class="bi bi-geo-alt-fill" style="color: #e74c3c;"></i> ${escapeHtml(address)}</div>
                </div>
                ${hasLocation ? `
                    <div class="modal-divider"></div>
                    <div class="modal-label">Location Map</div>
                    <div id="modalMap" class="modal-map"></div>
                    <div class="route-info" id="routeInfo">
                        <i class="bi bi-signpost-split-fill"></i>
                        <span id="routeInfoText">Calculating route…</span>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer-custom">
                ${hasLocation ? `<button class="btn-directions" id="directionsBtn" data-lat="${latitude}" data-lon="${longitude}">
                        <i class="bi bi-signpost-2-fill"></i> Get Directions
                    </button>` : '<span></span>'}
                <button class="btn-close-m" id="btnCloseModalFooter">Close</button>
            </div>
        `;

        document.getElementById('btnCloseModalFooter').addEventListener('click', closeModal);
        
        if (hasLocation) {
            document.getElementById('directionsBtn').addEventListener('click', function() {
                getDirections(parseFloat(this.getAttribute('data-lat')), parseFloat(this.getAttribute('data-lon')));
            });
        }

        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';

        if (hasLocation) {
            setTimeout(() => {
                if (currentMap) currentMap.remove();
                const mapContainer = document.getElementById('modalMap');
                if (mapContainer) {
                    const map = L.map('modalMap').setView([latitude, longitude], 15);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(map);
                    const redIcon = L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    });
                    L.marker([latitude, longitude], { icon: redIcon })
                        .addTo(map)
                        .bindPopup(`<b>${escapeHtml(name)}</b><br>${escapeHtml(address)}`)
                        .openPopup();
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
        currentRoute = null;
    }

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeModal();
    });
    btnCloseModal.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // ============================================
    // GET DIRECTIONS
    // ============================================
    function getDirections(destLat, destLon) {
        const btn = document.getElementById('directionsBtn');
        const routeInfo = document.getElementById('routeInfo');
        const routeInfoText = document.getElementById('routeInfoText');

        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Locating…';
        routeInfo.classList.add('visible');
        routeInfoText.textContent = 'Getting your location…';

        navigator.geolocation.getCurrentPosition(
            position => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;

                routeInfoText.textContent = 'Finding route…';

                if (currentRoute && currentMap) {
                    currentMap.removeLayer(currentRoute);
                    currentRoute = null;
                }

                const userIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                });
                L.marker([userLat, userLon], { icon: userIcon })
                    .addTo(currentMap)
                    .bindPopup('Your Location')
                    .openPopup();

                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userLon},${userLat};${destLon},${destLat}?overview=full&geometries=geojson`;

                fetch(osrmUrl)
                    .then(r => r.json())
                    .then(data => {
                        if (!data.routes || data.routes.length === 0) {
                            routeInfoText.textContent = 'No route found.';
                            btn.disabled = false;
                            btn.innerHTML = '<i class="bi bi-signpost-2-fill"></i> Get Directions';
                            return;
                        }

                        const route = data.routes[0];
                        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
                        const distanceKm = (route.distance / 1000).toFixed(1);
                        const durationMin = Math.round(route.duration / 60);

                        currentRoute = L.polyline(coords, {
                            color: '#386660', weight: 5, opacity: 0.85
                        }).addTo(currentMap);

                        currentMap.fitBounds(currentRoute.getBounds(), { padding: [30, 30] });

                        routeInfoText.textContent = `${distanceKm} km · ~${durationMin} min by car`;

                        btn.disabled = false;
                        btn.innerHTML = '<i class="bi bi-signpost-2-fill"></i> Get Directions';

                        const osmUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userLat},${userLon};${destLat},${destLon}`;
                        routeInfo.innerHTML = `<i class="bi bi-signpost-split-fill"></i><span id="routeInfoText">${distanceKm} km · ~${durationMin} min by car</span> &nbsp;<a href="${osmUrl}" target="_blank" style="color:var(--brand-mid);font-weight:700;font-size:12px;">Open in OSM ↗</a>`;
                    })
                    .catch(() => {
                        routeInfoText.textContent = 'Could not fetch route. Try opening in OSM.';
                        btn.disabled = false;
                        btn.innerHTML = '<i class="bi bi-signpost-2-fill"></i> Get Directions';
                    });
            },
            () => {
                routeInfoText.textContent = 'Location access denied.';
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-signpost-2-fill"></i> Get Directions';
            }
        );
    }

    // ============================================
    // TAB SWITCHING
    // ============================================
    document.querySelectorAll('.sub-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const selectedTab = tab.dataset.tab;
            const sectionTitle = document.getElementById('activeSectionTitle');
            const emptyState = document.getElementById('emptyState');

            if (selectedTab === 'police') sectionTitle.textContent = 'Police Stations';
            else if (selectedTab === 'fire') sectionTitle.textContent = 'Fire Stations';
            else if (selectedTab === 'hospital') sectionTitle.textContent = 'Hospitals & Clinics';
            else sectionTitle.textContent = 'Emergency Response';

            const cards = document.querySelectorAll('#feed .facility-card');
            let visibleCount = 0;

            cards.forEach(card => {
                const category = card.getAttribute('data-category');
                if (category === selectedTab) {
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
        });
    });

    // Initial filter - show only police
    document.querySelectorAll('#feed .facility-card').forEach(card => {
        if (card.getAttribute('data-category') !== 'police') {
            card.style.display = 'none';
        }
    });

    const initialPoliceCount = document.querySelectorAll('#feed .facility-card[data-category="police"]').length;
    document.getElementById('emptyState').style.display = initialPoliceCount === 0 ? 'block' : 'none';

    // ============================================
    // EVENT DELEGATION FOR FACILITY CARDS
    // ============================================
    document.getElementById('feed').addEventListener('click', function(e) {
        const btn = e.target.closest('.btn-view-facility');
        if (btn) {
            const card = btn.closest('.facility-card');
            openFacilityModal(card);
        }
    });

    // ============================================
    // POLLING
    // ============================================
    async function pollFacilities() {
        if (overlay.classList.contains('open')) return;

        try {
            const res = await fetch('/resident/facilities/api/poll?t=' + Date.now());
            if (!res.ok) return;
            const data = await res.json();
            if (!data || !data.length) return;

            const etag = data.map(f => f.id + ':' + (f.updatedAt ?? f.id)).join(',');
            if (lastEtag === '') { lastEtag = etag; return; }
            if (etag === lastEtag) return;

            lastEtag = etag;
            window.location.reload();
        } catch(e) {
            console.error('Poll error:', e);
        }
    }

    setInterval(pollFacilities, 5000);
});