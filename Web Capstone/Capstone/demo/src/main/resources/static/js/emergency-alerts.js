document.addEventListener('DOMContentLoaded', () => {
    // --- Static Event Bindings ---
    document.getElementById('redirectPasswordBtn')?.addEventListener('click', () => {
        window.location.href = '/user-profile';
    });

    document.getElementById('tabHeaderSafety')?.addEventListener('click', () => {
        window.location.href = '/safety-reports';
    });
    document.getElementById('tabHeaderEmergency')?.addEventListener('click', () => {
        window.location.href = '/emergency-alerts';
    });

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            if (tabName) window.location.href = '/emergency-alerts?tab=' + tabName;
        });
    });

    document.getElementById('btnUseMyLocation')?.addEventListener('click', getCurrentLocation);
    document.getElementById('btnPostAlert')?.addEventListener('click', createAlertWithConfirm);
    document.getElementById('btnResetCurrent')?.addEventListener('click', () => { window.location.href='/emergency-alerts?tab=current'; });
    document.getElementById('btnResetHistory')?.addEventListener('click', () => { window.location.href='/emergency-alerts?tab=history'; });

    document.getElementById('alertType')?.addEventListener('change', handleAlertTypeChange);
    
    // Search functionality
    document.getElementById('current-search')?.addEventListener('keyup', function() {
        const val = this.value.toLowerCase();
        document.querySelectorAll('#tab-current .alert-card').forEach(card => {
            card.style.display = card.textContent.toLowerCase().includes(val) ? '' : 'none';
        });
    });
    
    document.getElementById('history-search')?.addEventListener('keyup', function() {
        const val = this.value.toLowerCase();
        document.querySelectorAll('#tab-history .alert-card').forEach(card => {
            card.style.display = card.textContent.toLowerCase().includes(val) ? '' : 'none';
        });
    });

    // Delegate Table Action Buttons
    document.body.addEventListener('click', (e) => {
        // View
        if (e.target.classList.contains('btn-view-alert')) {
            const id = e.target.getAttribute('data-id');
            viewAlert(id);
        }
        // Archive
        if (e.target.classList.contains('btn-archive-alert')) {
            const id = e.target.getAttribute('data-id');
            archiveAlertWithConfirm(id, e.target);
        }
        // Assistance
        if (e.target.classList.contains('btn-assistance-archive')) {
            openAssistanceModal();
        }
    });

    // Success Modal OK button
    document.getElementById('successOkBtn')?.addEventListener('click', () => {
        window.location.reload();
    });

    // Initialize Onload Logic
    const status = document.getElementById('accountStatus')?.value;
    if (status === 'New' || status === 'Newly Updated') {
        document.getElementById('forcePasswordModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    const createTab = document.getElementById('tab-create');
    if (createTab && !createTab.classList.contains('d-none')) {
        const alertType = document.getElementById('alertType').value;
        if (alertType === 'Severe Weather') {
            document.getElementById('mapSection')?.classList.add('hidden');
            document.getElementById('location').value = 'San Sebastian, Kawit Cavite';
            document.getElementById('latitude').value = '14.418865';
            document.getElementById('longitude').value = '120.886515';
        } else if (alertType === 'Evacuation') {
            handleAlertTypeChange();
        } else {
            initCreateMap();
        }
    }

    // Polling Logic
    let lastSnapshot = '';
    function isModalOpen() {
        let ids = ['viewAlertModal','successModal','forcePasswordModal','logoutModal'];
        for (let i = 0; i < ids.length; i++) {
            let m = document.getElementById(ids[i]);
            if (m && m.classList.contains('show')) return true;
        }
        let dynamicModals = document.querySelectorAll('[id^="dynamicConfirmModal_"]');
        for (let j = 0; j < dynamicModals.length; j++) {
            if (dynamicModals[j].classList.contains('show')) return true;
        }
        return false;
    }
    
    function poll() {
        if (isModalOpen()) return;
        let xhr = new XMLHttpRequest();
        xhr.open('GET', '/emergency-alerts/api/poll?t=' + Date.now(), true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    let data = JSON.parse(xhr.responseText);
                    let snapshot = JSON.stringify(data);
                    if (lastSnapshot === '') {
                        lastSnapshot = snapshot;
                    } else if (snapshot !== lastSnapshot) {
                        location.reload();
                    }
                } catch(e) {}
            }
        };
        xhr.send();
    }
    poll();
    setInterval(poll, 5000);
});


// --- State ---
let createMap = null;
let createMarker = null;
let viewMap = null;

// --- UI Helpers ---
function showSuccess(message) {
    document.getElementById('successMessage').innerHTML = message;
    const successModalEl = document.getElementById('successModal');
    const successModal = new bootstrap.Modal(successModalEl);
    successModal.show();
}

function showConfirm(message, title, onConfirm) {
    const confirmModalId = 'dynamicConfirmModal_' + Date.now();
    const confirmModalHtml = `
        <div id="${confirmModalId}" class="modal fade" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content" style="border-radius: 16px;">
                    <div class="modal-header" style="background: linear-gradient(135deg, #30534D, #3d6b63);">
                        <h5 class="modal-title" style="color: white;">${title}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" style="padding: 24px; font-size: 16px;">
                        ${message}
                    </div>
                    <div class="modal-footer" style="border-top: none; padding: 16px 24px;">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="confirmOkBtn_${confirmModalId}" style="background-color: #44C375; border-color: #44C375;">Confirm</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.querySelectorAll('[id^="dynamicConfirmModal_"]').forEach(modal => modal.remove());
    document.body.insertAdjacentHTML('beforeend', confirmModalHtml);
    const modalEl = document.getElementById(confirmModalId);
    const modal = new bootstrap.Modal(modalEl);
    
    const confirmBtn = document.getElementById(`confirmOkBtn_${confirmModalId}`);
    confirmBtn.onclick = function() {
        modal.hide();
        onConfirm();
    };
    
    modalEl.addEventListener('hidden.bs.modal', function() {
        modalEl.remove();
    });
    
    modal.show();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Action Functions ---
function archiveAlertWithConfirm(id, buttonElement) {
    showConfirm(
        'Are you sure you want to archive this alert?',
        'Archive Alert',
        function() {
            fetch('/emergency-alerts/' + id + '/archive', { method: 'PUT' })
                .then(response => {
                    if (response.ok) {
                        const alertCard = buttonElement.closest('.alert-card');
                        if (alertCard) alertCard.remove();
                        const remainingAlerts = document.querySelectorAll('#tab-current .alert-card').length;
                        if (remainingAlerts === 0) {
                            const currentPanel = document.querySelector('#tab-current .panel-content');
                            if (currentPanel && !currentPanel.querySelector('.no-alerts-message')) {
                                const emptyMessage = document.createElement('div');
                                emptyMessage.className = 'text-center p-4 no-alerts-message';
                                emptyMessage.innerHTML = '<p class="text-muted">No current alerts</p>';
                                currentPanel.appendChild(emptyMessage);
                            }
                        }
                        showSuccess('Alert archived successfully!');
                    } else {
                        alert('Error archiving alert');
                    }
                });
        }
    );
}

function createAlertWithConfirm() {
    const alertData = {
        type: document.getElementById('alertType').value,
        priority: document.getElementById('priority').value,
        title: document.getElementById('title').value,
        location: document.getElementById('location').value,
        message: document.getElementById('message').value,
        latitude: document.getElementById('latitude').value,
        longitude: document.getElementById('longitude').value
    };
    
    if (!alertData.type || !alertData.priority || !alertData.title || !alertData.message) {
        alert('Please fill in all required fields');
        return;
    }
    if (alertData.type === 'Evacuation') {
        alertData.priority = 'Level 4';
    }
    if (!alertData.latitude || !alertData.longitude) {
        alert('Please select a valid location within Barangay San Sebastian');
        return;
    }
    
    showConfirm(
        'Post this emergency alert to all residents?',
        'Post Alert',
        function() {
            fetch('/emergency-alerts/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alertData)
            }).then(response => response.json().then(data => ({ status: response.status, data })))
                .then(({ status, data }) => {
                    if (status === 200 || status === 201) {
                        showSuccess('Alert posted successfully!');
                        document.getElementById('alertType').value = '';
                        document.getElementById('priority').value = '';
                        document.getElementById('title').value = '';
                        document.getElementById('message').value = '';
                        document.getElementById('location').value = '';
                        document.getElementById('latitude').value = '';
                        document.getElementById('longitude').value = '';
                        if (createMarker) {
                            createMap.removeLayer(createMarker);
                            createMarker = null;
                        }
                        document.getElementById('boundaryStatus').style.display = 'none';
                    } else {
                        alert('Error creating alert: ' + (data.message || 'Unknown error'));
                    }
                }).catch(error => {
                    alert('Error creating alert: ' + error.message);
                });
        }
    );
}

function viewAlert(id) {
    fetch('/emergency-alerts/' + id).then(response => response.json()).then(data => {
        const modalBody = document.getElementById('viewModalBody');
        const hasLocation = data.latitude && data.longitude && data.latitude !== 0 && data.longitude !== 0;
        const priorityClass = data.priority === 'Level 4' ? 'high' : '';
        const isEvacuation = data.type === 'Evacuation';
        
        modalBody.innerHTML = `
            <div class="view-post-header">
                <div class="view-post-avatar"><i class="bi bi-megaphone-fill"></i></div>
                <div class="view-post-meta">
                    <div class="view-post-author">${escapeHtml(data.createdByName || 'Barangay San Sebastian')}</div>
                    <div class="view-post-date">${data.dateCreated ? new Date(data.dateCreated).toLocaleString() : 'N/A'}</div>
                </div>
                <span class="view-post-badge ${priorityClass}">${escapeHtml(data.priority || 'N/A')}</span>
            </div>
            <div class="view-post-title">${escapeHtml(data.title || 'Untitled')}</div>
            <div class="view-post-content">${escapeHtml(data.message || 'No message')}</div>
            <div class="view-post-location"><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(data.location || 'No location')}</div>
            ${hasLocation ? '<div class="view-map-container"><div id="viewMapModal" style="width:100%; height:200px; border-radius:8px; border:1px solid #E4E6EB; background:#F7F8FA;"></div></div>' : ''}
            <hr class="view-post-divider">
            <div class="view-post-footer">
                <i class="bi bi-info-circle"></i> Type: ${escapeHtml(data.type || 'N/A')} &nbsp;|&nbsp;
                <i class="bi bi-person-badge"></i> Role: ${escapeHtml(data.createdByRole || 'N/A')}
            </div>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('viewAlertModal'));
        if (hasLocation) {
            document.getElementById('viewAlertModal').addEventListener('shown.bs.modal', function handler() {
                this.removeEventListener('shown.bs.modal', handler);
                setTimeout(function() {
                    if (viewMap) viewMap.remove();
                    const mapContainer = document.getElementById('viewMapModal');
                    if (mapContainer) {
                        viewMap = L.map('viewMapModal').setView([data.latitude, data.longitude], 16);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                            attribution: '© OpenStreetMap contributors' 
                        }).addTo(viewMap);
                        const markerIcon = isEvacuation ? L.icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            popupAnchor: [1, -34],
                            shadowSize: [41, 41]
                        }) : new L.Icon.Default();

                        L.marker([data.latitude, data.longitude], { icon: markerIcon })
                            .addTo(viewMap)
                            .bindPopup(`<b>${escapeHtml(isEvacuation ? 'Barangay Hall Evacuation Center' : (data.title || 'Alert Location'))}</b>`)
                            .openPopup();
                        setTimeout(function() {
                            viewMap.invalidateSize();
                        }, 100);
                    }
                }, 200);
            });
        }
        modal.show();
    });
}

// --- Map Logic ---
const BARANGAY_BOUNDARY = [
    [14.418865, 120.886515], [14.418666, 120.887862], [14.418969, 120.887902],
    [14.419010, 120.889089], [14.419495, 120.890312], [14.419868, 120.891458],
    [14.421015, 120.892997], [14.420850, 120.894121], [14.421649, 120.895839],
    [14.422202, 120.897952], [14.423068, 120.897849], [14.423119, 120.901125],
    [14.424041, 120.901272], [14.424003, 120.901537], [14.423712, 120.901693],
    [14.423442, 120.901698], [14.422226, 120.902297], [14.421938, 120.902353],
    [14.421616, 120.902259], [14.421310, 120.901863], [14.421144, 120.901766],
    [14.420634, 120.901951], [14.420445, 120.901895], [14.420210, 120.902035],
    [14.420090, 120.902842], [14.419753, 120.902879], [14.419026, 120.902860],
    [14.419009, 120.903096], [14.418809, 120.903301], [14.418490, 120.902674],
    [14.418246, 120.902392], [14.417720, 120.901458], [14.416779, 120.900345],
    [14.415834, 120.899736], [14.414386, 120.896173], [14.413767, 120.895386],
    [14.411402, 120.895039], [14.410154, 120.894599], [14.409451, 120.893831],
    [14.408851, 120.892746], [14.409384, 120.892449], [14.409930, 120.891833],
    [14.410030, 120.891627], [14.411015, 120.890809], [14.411201, 120.890131],
    [14.411176, 120.889748], [14.411426, 120.889479], [14.411647, 120.889479],
    [14.414170, 120.887581], [14.415289, 120.887273], [14.415541, 120.886679],
    [14.415663, 120.886825], [14.418853, 120.886512]
];

function isPointInPolygon(point, polygon) {
    const x = point[0];
    const y = point[1];
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];
        
        const intersect = ((yi > y) != (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function isPointInsideBoundary(lat, lng) {
    return isPointInPolygon([lng, lat], BARANGAY_BOUNDARY.map(coord => [coord[1], coord[0]]));
}

function updateBoundaryStatus(lat, lng) {
    const statusDiv = document.getElementById('boundaryStatus');
    const isInside = isPointInsideBoundary(lat, lng);
    
    statusDiv.style.display = 'flex';
    if (isInside) {
        statusDiv.className = 'boundary-status valid';
        statusDiv.innerHTML = '<i class="bi bi-check-circle-fill"></i> Location is within Barangay San Sebastian boundaries';
        document.getElementById('latitude').value = lat;
        document.getElementById('longitude').value = lng;
    } else {
        statusDiv.className = 'boundary-status invalid';
        statusDiv.innerHTML = '<i class="bi bi-x-circle-fill"></i> Location is OUTSIDE Barangay San Sebastian boundaries. Please select a location within the barangay.';
        document.getElementById('latitude').value = '';
        document.getElementById('longitude').value = '';
    }
    return isInside;
}

function initCreateMap(lat = 14.418865, lng = 120.886515) {
    const mapContainer = document.getElementById('createMap');
    if (!mapContainer) return;
    
    const tabCreate = document.getElementById('tab-create');
    if (tabCreate && tabCreate.classList.contains('d-none')) {
        setTimeout(() => initCreateMap(lat, lng), 200);
        return;
    }
    
    if (createMap) {
        createMap.remove();
    }
    
    createMap = L.map('createMap').setView([lat, lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(createMap);
    
    L.polygon(BARANGAY_BOUNDARY, {
        color: '#2d4a44',
        weight: 3,
        fillColor: '#2d4a44',
        fillOpacity: 0.1
    }).addTo(createMap);
    
    createMap.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        if (createMarker) {
            createMap.removeLayer(createMarker);
        }
        
        const redIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
        
        createMarker = L.marker([lat, lng], { icon: redIcon }).addTo(createMap);
        updateBoundaryStatus(lat, lng);
        
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('location').value = data.display_name || `${lat}, ${lng}`;
            })
            .catch(() => {
                document.getElementById('location').value = `${lat}, ${lng}`;
            });
    });
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            initCreateMap(lat, lng);
            setTimeout(() => {
                if (createMarker) createMap.removeLayer(createMarker);
                const redIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });
                createMarker = L.marker([lat, lng], { icon: redIcon }).addTo(createMap);
                updateBoundaryStatus(lat, lng);
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('location').value = data.display_name || `${lat}, ${lng}`;
                    });
            }, 100);
        }, function(error) {
            alert("Could not get your location. Please check permissions.");
        });
    }
}

function handleAlertTypeChange() {
    const alertType = document.getElementById('alertType').value;
    const mapSection = document.getElementById('mapSection');
    const locationField = document.getElementById('location');
    const latitudeField = document.getElementById('latitude');
    const longitudeField = document.getElementById('longitude');
    const boundaryStatusDiv = document.getElementById('boundaryStatus');
    const prioritySelect = document.getElementById('priority');
    const messageField = document.getElementById('message');
    
    if (alertType === 'Evacuation') {
        prioritySelect.value = 'Level 4';
        prioritySelect.disabled = true;
        
        const evacLat = 14.4122909076492;
        const evacLng = 120.891226530075;
        latitudeField.value = evacLat;
        longitudeField.value = evacLng;
        locationField.value = 'Barangay Hall - Evacuation Center';
        
        mapSection.classList.remove('hidden');
        
        messageField.value = `EVACUATION INSTRUCTIONS:
        
1. REMAIN CALM and gather your emergency kit if already prepared.
2. Secure your home - turn off gas, electricity, and lock all doors.
3. Proceed IMMEDIATELY to the Evacuation Location Pinned in the map provided.
4. Bring only essential items: IDs, medications, drinking water, and ready-to-eat food.
5. Wear face masks and follow health protocols at the center.
6. Assist elderly, children, and persons with disabilities.
7. Register at the evacuation center upon arrival for proper headcount.
8. Stay tuned to official Barangay announcements for updates.
9. DO NOT return home until authorities declare it safe.
10. For emergencies, contact Barangay Hotline: [Your Hotline Number]

- Barangay San Sebastian Disaster Response Team`;
        
        boundaryStatusDiv.style.display = 'flex';
        boundaryStatusDiv.className = 'boundary-status valid';
        boundaryStatusDiv.innerHTML = '<i class="bi bi-check-circle-fill"></i> Evacuation Point: Barangay Hall';
        
        if (createMap) {
            if (createMarker) createMap.removeLayer(createMarker);
            const greenIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
            createMarker = L.marker([evacLat, evacLng], { icon: greenIcon }).addTo(createMap);
            createMarker.bindPopup('<b>Barangay Hall</b>').openPopup();
            createMap.setView([evacLat, evacLng], 17);
        }
        
    } else if (alertType === 'Severe Weather') {
        prioritySelect.disabled = false;
        prioritySelect.value = '';
        
        mapSection.classList.add('hidden');
        locationField.value = 'San Sebastian, Kawit Cavite';
        latitudeField.value = '14.418865';
        longitudeField.value = '120.886515';
        
        if (createMarker && createMap) {
            createMap.removeLayer(createMarker);
            createMarker = null;
        }
        
        boundaryStatusDiv.style.display = 'flex';
        boundaryStatusDiv.className = 'boundary-status valid';
        boundaryStatusDiv.innerHTML = '<i class="bi bi-check-circle-fill"></i> Location is within Barangay San Sebastian boundaries (Severe Weather default)';
        
    } else {
        prioritySelect.disabled = false;
        
        mapSection.classList.remove('hidden');
        const currentLoc = locationField.value;
        const currentLat = latitudeField.value;
        const currentLng = longitudeField.value;
        const isDefaultSevereLoc = (currentLoc === 'San Sebastian, Kawit Cavite' && currentLat === '14.418865' && currentLng === '120.886515');
        
        if (isDefaultSevereLoc || !currentLat || !currentLng || currentLat === '' || currentLng === '') {
            locationField.value = '';
            latitudeField.value = '';
            longitudeField.value = '';
            boundaryStatusDiv.style.display = 'none';
            if (createMarker && createMap) {
                createMap.removeLayer(createMarker);
                createMarker = null;
            }
        } else {
            if (currentLat && currentLng && isPointInsideBoundary(parseFloat(currentLat), parseFloat(currentLng))) {
                boundaryStatusDiv.style.display = 'flex';
                boundaryStatusDiv.className = 'boundary-status valid';
                boundaryStatusDiv.innerHTML = '<i class="bi bi-check-circle-fill"></i> Location is within Barangay San Sebastian boundaries';
            } else if (currentLat && currentLng) {
                boundaryStatusDiv.style.display = 'flex';
                boundaryStatusDiv.className = 'boundary-status invalid';
                boundaryStatusDiv.innerHTML = '<i class="bi bi-x-circle-fill"></i> Location is OUTSIDE Barangay San Sebastian boundaries.';
            }
            if (createMap && currentLat && currentLng && !createMarker) {
                const redIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });
                createMarker = L.marker([parseFloat(currentLat), parseFloat(currentLng)], { icon: redIcon }).addTo(createMap);
            }
        }
        if (!createMap) {
            setTimeout(initCreateMap, 300);
        }
    }
}