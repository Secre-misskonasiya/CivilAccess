document.addEventListener('DOMContentLoaded', function () {
    
    // Global Config (populated by Thymeleaf in the HTML head)
    const currentRole = window.APP_CONFIG.currentRole || '';
    const currentTab = window.APP_CONFIG.currentTab || 'announcements';

    function canEditAnnouncements() {
        return currentRole === 'ADMIN' || currentRole === 'SECRETARY' || currentRole === 'SECRETARIAT STAFF';
    }
    function canArchiveAnnouncements() {
        return currentRole === 'ADMIN';
    }
    function canRequestArchive() {
        return currentRole === 'SECRETARY' || currentRole === 'SECRETARIAT STAFF';
    }

    // Supabase configuration
    const SUPABASE_URL = 'https://upfrofppponiqffbssqb.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_tZyxrTJrpd_OD5-TKUkT8Q__DnuY0tj';
    let supabaseClient = null;

    function initSupabase() {
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else {
            setTimeout(initSupabase, 500);
        }
    }
    initSupabase();

    // ============================================
    // POLLING VARIABLES
    // ============================================
    let pollingInterval = null;
    let lastKnownAnnouncementIds = new Set();
    let lastKnownArchivedIds = new Set();
    let isModalOpen = false;
    let pendingUpdates = false;
    let currentPriorityFilter = 'all';

    // ============================================
    // IMAGE UPLOAD HANDLER REFERENCES
    // ============================================
    let createImageHandlers = null;
    let editImageHandlers = null;

    // ============================================
    // MODAL BACKDROP WATCHDOG
    // ============================================
    function cleanupOrphanBackdrops() {
        const visibleModal = document.querySelector('.modal.show');
        if (visibleModal) return;
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
    }

    let backdropCleanupTimer = null;
    function scheduleBackdropCleanup() {
        clearTimeout(backdropCleanupTimer);
        backdropCleanupTimer = setTimeout(cleanupOrphanBackdrops, 250);
    }
    new MutationObserver(scheduleBackdropCleanup).observe(document.body, {
        childList: true, subtree: false, attributes: true, attributeFilter: ['class']
    });
    setInterval(cleanupOrphanBackdrops, 500);

    // ============================================
    // TRACK MODAL STATE
    // ============================================
    function trackModalState() {
        document.addEventListener('show.bs.modal', () => { isModalOpen = true; });
        document.addEventListener('hidden.bs.modal', () => { 
            isModalOpen = false; 
            setTimeout(cleanupOrphanBackdrops, 50);
            if (pendingUpdates) {
                pendingUpdates = false;
                pollAnnouncements(true);
            }
        });
    }

    // ============================================
    // INITIALIZE KNOWN IDS
    // ============================================
    function initKnownIds() {
        document.querySelectorAll('#announcementsGrid .announcement-row').forEach(row => {
            const id = row.getAttribute('data-id');
            if (id) lastKnownAnnouncementIds.add(parseInt(id));
        });
        document.querySelectorAll('#archivedGrid .announcement-row').forEach(row => {
            const id = row.getAttribute('data-id');
            if (id) lastKnownArchivedIds.add(parseInt(id));
        });
    }

    // ============================================
    // POLLING
    // ============================================
    async function pollAnnouncements(forceUpdate = false) {
        try {
            const response = await fetch('/announcements/api/poll?t=' + Date.now());
            if (!response.ok) return;
            const data = await response.json();
            
            const hasChanges = checkForChanges(data);
            if (!hasChanges && !forceUpdate) return;
            
            if (isModalOpen && !forceUpdate) {
                pendingUpdates = true;
                return;
            }

            const activeTab = document.getElementById('tab-announcements');
            if (data.activeAnnouncements && activeTab && !activeTab.classList.contains('d-none')) {
                rebuildActiveList(data.activeAnnouncements);
            }

            const archivedTab = document.getElementById('tab-archived');
            if (data.archivedAnnouncements && archivedTab && !archivedTab.classList.contains('d-none')) {
                rebuildArchivedList(data.archivedAnnouncements);
            }

            if (data.activeCount !== undefined) {
                const footer = document.getElementById('activeFooter');
                if (footer) footer.querySelector('span').textContent = `Showing ${data.activeCount} announcements`;
            }
            if (data.archivedCount !== undefined) {
                const footer = document.getElementById('archivedFooter');
                if (footer) footer.querySelector('span').textContent = `Showing ${data.archivedCount} archived announcements`;
            }
        } catch (error) {
            console.error("Polling error:", error);
        }
    }

    function checkForChanges(data) {
        if (data.activeAnnouncements) {
            const newIds = new Set(data.activeAnnouncements.map(a => a.id));
            if (newIds.size !== lastKnownAnnouncementIds.size) return true;
            for (const id of newIds) if (!lastKnownAnnouncementIds.has(id)) return true;
        }
        if (data.archivedAnnouncements) {
            const newIds = new Set(data.archivedAnnouncements.map(a => a.id));
            if (newIds.size !== lastKnownArchivedIds.size) return true;
            for (const id of newIds) if (!lastKnownArchivedIds.has(id)) return true;
        }
        return false;
    }

    function rebuildActiveList(announcements) {
        const grid = document.getElementById('announcementsGrid');
        if (!grid) return;
        
        const container = document.createElement('div');
        announcements.forEach(a => {
            const row = document.createElement('div');
            row.className = 'announcement-row' + (a.priority === 'HIGH' ? ' pinned' : '');
            row.setAttribute('data-id', a.id);
            
            const isHigh = a.priority === 'HIGH';
            const dateStr = a.datePosted ? new Date(a.datePosted).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A';
            
            row.innerHTML = `
                <div class="row-pin">
                    <i class="bi bi-pin-angle-fill pin-icon pin-trigger ${isHigh ? 'active' : ''}" data-id="${a.id}" title="${isHigh ? 'Unpin' : 'Pin'}"></i>
                </div>
                <div class="row-badge">
                    <span class="card-category ${isHigh ? 'high' : ''}">${escapeHtml(a.priority || 'NORMAL')}</span>
                </div>
                <div class="row-title">${escapeHtml(a.title || 'N/A')}</div>
                <div class="row-sep">—</div>
                <div class="row-snippet">${escapeHtml(a.content || '')}</div>
                <div class="row-date">${dateStr}</div>
                <div class="row-actions">
                    <button class="view-btn view-trigger" data-id="${a.id}">View</button>
                    ${canEditAnnouncements() ? `<button class="edit-btn edit-trigger" data-id="${a.id}">Edit</button>` : ''}
                    ${canArchiveAnnouncements() ? `<button class="archive-btn archive-trigger" data-id="${a.id}">Archive</button>` : ''}
                    ${canRequestArchive() ? `<button class="archive-btn assistance-trigger" data-action="archive">Archive</button>` : ''}
                </div>
            `;
            container.appendChild(row);
        });
        
        grid.innerHTML = container.innerHTML;
        lastKnownAnnouncementIds = new Set(announcements.map(a => a.id));
        attachDynamicEventListeners(grid);
        filterAndSortAnnouncements();
    }

    function rebuildArchivedList(announcements) {
        const grid = document.getElementById('archivedGrid');
        if (!grid) return;
        
        const container = document.createElement('div');
        announcements.forEach(a => {
            const row = document.createElement('div');
            row.className = 'announcement-row';
            row.setAttribute('data-id', a.id);
            
            const dateStr = a.datePosted ? new Date(a.datePosted).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A';
            
            row.innerHTML = `
                <div class="row-pin"></div>
                <div class="row-badge">
                    <span class="card-category">${escapeHtml(a.priority || 'NORMAL')}</span>
                </div>
                <div class="row-title">${escapeHtml(a.title || 'N/A')}</div>
                <div class="row-sep">—</div>
                <div class="row-snippet">${escapeHtml(a.content || '')}</div>
                <div class="row-date">${dateStr}</div>
                <div class="row-actions">
                    <button class="view-btn view-trigger" data-id="${a.id}">View</button>
                    ${canArchiveAnnouncements() ? `<button class="restore-btn restore-trigger" data-id="${a.id}">Restore</button>` : ''}
                    ${canRequestArchive() ? `<button class="restore-btn assistance-trigger">Restore</button>` : ''}
                </div>
            `;
            container.appendChild(row);
        });
        
        grid.innerHTML = container.innerHTML;
        lastKnownArchivedIds = new Set(announcements.map(a => a.id));
        attachDynamicEventListeners(grid);
        applyArchivedFilters();
    }

    // ============================================
    // START POLLING
    // ============================================
    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        initKnownIds();
        pollingInterval = setInterval(() => pollAnnouncements(false), 5000);
    }

    // ============================================
    // CUSTOM OVERLAYS (Confirm & Success)
    // ============================================
    function showSuccess(message) {
        document.querySelectorAll('.custom-success-overlay').forEach(el => el.remove());
        const overlay = document.createElement('div');
        overlay.className = 'custom-success-overlay';
        overlay.innerHTML = `
            <div class="custom-success-box">
                <div class="success-icon"><i class="bi bi-check-circle-fill"></i></div>
                <h5>${message}</h5>
                <button type="button">OK</button>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));

        overlay.querySelector('button').addEventListener('click', () => {
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
                pollAnnouncements(true);
            }, 220);
        });
    }

    function showError(message, title = 'Error') {
        document.getElementById('sysErrorMessage').innerHTML = message;
        document.getElementById('sysErrorOverlay').classList.add('show');
    }

    function showConfirm(message, title, onConfirm) {
        document.querySelectorAll('.custom-confirm-overlay').forEach(el => el.remove());
        const overlay = document.createElement('div');
        overlay.className = 'custom-confirm-overlay';
        overlay.innerHTML = `
            <div class="custom-confirm-box">
                <div class="custom-confirm-header">${title}</div>
                <div class="custom-confirm-body">${message}</div>
                <div class="custom-confirm-footer">
                    <button type="button" class="btn-cancel">Cancel</button>
                    <button type="button" class="btn-confirm">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));

        function close() {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 220);
        }

        overlay.querySelector('.btn-cancel').addEventListener('click', close);
        overlay.querySelector('.btn-confirm').addEventListener('click', () => {
            close();
            setTimeout(onConfirm, 120);
        });
    }

    function resetCreateForm() {
        const form = document.getElementById('createAnnouncementForm');
        if (form) form.reset();
        document.getElementById('title').value = '';
        document.getElementById('priority').value = 'NORMAL';
        document.getElementById('content').value = '';
        document.getElementById('imageUrl').value = '';
        if (createImageHandlers && typeof createImageHandlers.hideImage === 'function') {
            createImageHandlers.hideImage();
        }
    }

    // ============================================
    // API ACTIONS
    // ============================================
    function archiveAnnouncementWithConfirm(id) {
        showConfirm('Are you sure you want to archive this announcement?', 'Archive Announcement', () => {
            fetch('/announcements/' + id + '/archive', { method: 'PUT' })
            .then(response => { 
                if (response.ok) showSuccess('Announcement archived successfully!');
                else showError('Failed to archive announcement. Please try again.');
            })
            .catch(error => { console.error('Error archiving announcement:', error); showError('Failed to archive announcement. Please try again.'); });
        });
    }
    
    function restoreAnnouncementWithConfirm(id) {
        showConfirm('Are you sure you want to restore this announcement?', 'Restore Announcement', () => {
            fetch('/announcements/' + id + '/restore', { method: 'PUT' })
            .then(response => { 
                if (response.ok) showSuccess('Announcement restored successfully!');
                else showError('Failed to restore announcement. Please try again.');
            })
            .catch(error => { console.error('Error restoring announcement:', error); showError('Failed to restore announcement. Please try again.'); });
        });
    }
    
    function createAnnouncementWithConfirm() {
        const announcement = {
            title: document.getElementById('title').value,
            priority: document.getElementById('priority').value,
            content: document.getElementById('content').value,
            image: document.getElementById('imageUrl').value
        };
        if (!announcement.title || !announcement.content) {
            showError('Please fill in all required fields.', 'Missing Information');
            return;
        }
        showConfirm('Create this new announcement?', 'Create Announcement', () => {
            fetch('/announcements/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(announcement)
            })
            .then(response => {
                if (response.ok) {
                    const createModal = bootstrap.Modal.getInstance(document.getElementById('createAnnouncementModal'));
                    if (createModal) createModal.hide();
                    resetCreateForm();
                    showSuccess('Announcement created successfully!');
                } else {
                    showError('Error creating announcement. Please try again.');
                }
            })
            .catch(error => { console.error('Error:', error); showError('Error creating announcement. Please try again.'); });
        });
    }
    
    function updateAnnouncementWithConfirm() {
        const id = document.getElementById('editId').value;
        const announcement = {
            title: document.getElementById('editTitle').value,
            priority: document.getElementById('editPriority').value,
            content: document.getElementById('editContent').value,
            image: document.getElementById('editImageUrl').value
        };
        if (!announcement.title || !announcement.content) {
            showError('Please fill in all required fields.', 'Missing Information');
            return;
        }
        showConfirm('Update this announcement with the new changes?', 'Update Announcement', () => {
            fetch('/announcements/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(announcement)
            })
            .then(response => {
                if (response.ok) {
                    const editModal = bootstrap.Modal.getInstance(document.getElementById('editAnnouncementModal'));
                    if (editModal) editModal.hide();
                    showSuccess('Announcement updated successfully!');
                } else {
                    showError('Error updating announcement. Please try again.');
                }
            })
            .catch(error => { console.error('Error updating announcement:', error); showError('Error updating announcement. Please try again.'); });
        });
    }

    function viewAnnouncement(id) {
        fetch('/announcements/' + id)
          .then(response => response.json())
          .then(data => {
            const priority = data.priority || 'NORMAL';
            const isHigh = priority === 'HIGH';
            const dateStr = data.datePosted ? new Date(data.datePosted).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A';
            const imageHtml = data.image ? `<img src="${data.image}" class="view-post-image" alt="Announcement image" onerror="this.style.display='none'">` : '';
            const modalBody = document.getElementById('viewModalBody');
            modalBody.innerHTML = `
              <div class="view-post-header">
                <div class="view-post-avatar"><i class="bi bi-megaphone-fill"></i></div>
                <div class="view-post-meta">
                  <div class="view-post-author">Barangay San Sebastian</div>
                  <div class="view-post-date">${dateStr}</div>
                </div>
                <span class="view-post-badge ${isHigh ? 'high' : ''}">${priority}</span>
              </div>
              <div class="view-post-title">${escapeHtml(data.title || 'N/A')}</div>
              <div class="view-post-content">${escapeHtml(data.content || 'N/A')}</div>
              ${imageHtml}
              <hr class="view-post-divider">
              <div class="view-post-footer">
                <i class="bi bi-info-circle"></i> Status: ${data.status || 'N/A'}
              </div>
            `;
            new bootstrap.Modal(document.getElementById('viewAnnouncementModal')).show();
          })
          .catch(error => { console.error('Error viewing announcement:', error); showError('Failed to load announcement details.'); });
    }

    function editAnnouncement(id) {
        fetch('/announcements/' + id)
          .then(response => response.json())
          .then(data => {
            document.getElementById('editId').value = data.id;
            document.getElementById('editTitle').value = data.title || '';
            document.getElementById('editPriority').value = data.priority || 'NORMAL';
            document.getElementById('editContent').value = data.content || '';
            const imageUrl = data.image || '';
            document.getElementById('editImageUrl').value = imageUrl;
            if (imageUrl) {
              const preview = document.getElementById('editImagePreview');
              const placeholder = document.getElementById('editUploadPlaceholder');
              const removeBtn = document.getElementById('editRemoveImageBtn');
              const uploadArea = document.getElementById('editImageUploadArea');
              preview.src = imageUrl;
              preview.style.display = 'block';
              if (placeholder) placeholder.style.display = 'none';
              if (uploadArea) uploadArea.classList.add('has-image');
              if (removeBtn) removeBtn.style.display = 'inline-block';
            }
            new bootstrap.Modal(document.getElementById('editAnnouncementModal')).show();
          })
          .catch(error => { console.error('Error loading announcement for edit:', error); showError('Failed to load announcement for editing.'); });
    }

    function togglePin(el, id) {
        const row = el.closest('.announcement-row');
        const wasPinned = el.classList.contains('active');
        const newPriority = wasPinned ? 'NORMAL' : 'HIGH';
        el.style.opacity = '0.5';
        el.style.cursor = 'wait';
        fetch('/announcements/' + id + '/priority?priority=' + newPriority, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        })
        .then(response => {
          if (response.ok) {
            if (wasPinned) {
              el.classList.remove('active');
              row.classList.remove('pinned');
              el.title = 'Pin';
            } else {
              el.classList.add('active');
              row.classList.add('pinned');
              el.title = 'Unpin';
            }
            const badge = row.querySelector('.card-category');
            if (badge) {
              badge.textContent = newPriority;
              if (newPriority === 'HIGH') badge.classList.add('high');
              else badge.classList.remove('high');
            }
            setTimeout(() => { filterAndSortAnnouncements(); }, 50);
          } else {
            showError('Failed to update pin status.');
          }
        })
        .catch(error => { console.error('Error updating priority:', error); showError('Failed to update pin status.'); })
        .finally(() => { el.style.opacity = ''; el.style.cursor = ''; });
    }

    // ============================================
    // HELPERS: Filtering & Sorting
    // ============================================
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function isHighPriority(row) {
        if (row.classList.contains('pinned')) return true;
        const badge = row.querySelector('.card-category');
        if (badge) {
          const priorityText = badge.textContent.toUpperCase().trim();
          if (priorityText === 'HIGH') return true;
        }
        return false;
    }

    function isArchivedTabActive() {
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) return activeTab.textContent.trim().toLowerCase().includes('archived');
        const archivedPane = document.getElementById('tab-archived');
        return !!archivedPane && !archivedPane.classList.contains('d-none');
    }

    function applyFiltersForActiveTab() {
        if (isArchivedTabActive()) {
          applyArchivedFilters();
        } else {
          filterAndSortAnnouncements();
        }
    }

    function applyArchivedFilters() {
        const grid = document.getElementById('archivedGrid');
        if (!grid) return;
        sortArchivedAnnouncements();
        const searchInput = document.getElementById('announcement-search');
        const searchValue = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const rows = Array.from(grid.querySelectorAll('.announcement-row'));
        let visibleCount = 0;

        rows.forEach(row => {
          const highPriority = isHighPriority(row);
          const matchesSearch = !searchValue || row.textContent.toLowerCase().includes(searchValue);
          let matchesPriority = true;
          if (currentPriorityFilter === 'high') matchesPriority = highPriority;
          else if (currentPriorityFilter === 'normal') matchesPriority = !highPriority;
          const show = matchesSearch && matchesPriority;
          row.style.display = show ? '' : 'none';
          if (show) visibleCount++;
        });

        const footer = document.getElementById('archivedFooter');
        if (footer && footer.querySelector('span')) {
          footer.querySelector('span').textContent = `Showing ${visibleCount} of ${rows.length} archived announcements`;
        }
    }
      
    function filterAndSortAnnouncements() {
        const grid = document.getElementById('announcementsGrid');
        if (!grid) return;
        const allRows = Array.from(grid.querySelectorAll('.announcement-row'));
        if (allRows.length === 0) return;
        const searchInput = document.getElementById('announcement-search');
        const searchValue = searchInput ? searchInput.value.toLowerCase() : '';
        allRows.forEach(row => {
          const highPriority = isHighPriority(row);
          const matchesSearch = row.textContent.toLowerCase().includes(searchValue);
          let matchesPriority = true;
          if (currentPriorityFilter === 'high') matchesPriority = highPriority;
          else if (currentPriorityFilter === 'normal') matchesPriority = !highPriority;
          row.style.display = (matchesSearch && matchesPriority) ? '' : 'none';
        });
        const pinnedRows = allRows.filter(r => isHighPriority(r));
        const normalRows = allRows.filter(r => !isHighPriority(r));
        const sortByDate = (a, b) => getRowDate(b) - getRowDate(a);
        pinnedRows.sort(sortByDate);
        normalRows.sort(sortByDate);
        grid.innerHTML = '';
        pinnedRows.forEach(r => grid.appendChild(r));
        normalRows.forEach(r => grid.appendChild(r));
    }
      
    function sortArchivedAnnouncements() {
        const archivedList = document.querySelector('#tab-archived .announcement-list');
        if (!archivedList) return;
        const rows = Array.from(archivedList.querySelectorAll('.announcement-row'));
        if (rows.length === 0) return;
        rows.sort((a, b) => getRowDate(b) - getRowDate(a));
        archivedList.innerHTML = '';
        rows.forEach(r => archivedList.appendChild(r));
    }
      
    function getRowDate(row) {
        const dateEl = row.querySelector('.row-date');
        if (!dateEl) return 0;
        const parsed = new Date(dateEl.textContent.trim());
        return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    }

    // ============================================
    // IMAGE UPLOAD LOGIC
    // ============================================
    async function compressImage(file, maxW = 1024, quality = 0.8) {
        const bitmap = await createImageBitmap(file);
        const scale  = Math.min(1, maxW / bitmap.width);
        const w = Math.round(bitmap.width  * scale);
        const h = Math.round(bitmap.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close();
        return new Promise((resolve, reject) =>
          canvas.toBlob(
            b => b ? resolve(b) : reject(new Error('Could not compress image')),
            'image/jpeg', quality
          )
        );
    }

    async function uploadImageToSupabase(blob) {
        if (!supabaseClient) throw new Error('Supabase client not initialized');
        const filePath = `announcements/announcement_${Date.now()}.jpg`;
        const { data, error } = await supabaseClient.storage
          .from('announcements')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            cacheControl: '31536000',
            upsert: false
          });
        if (error) throw error;
        return supabaseClient.storage.from('announcements').getPublicUrl(data.path).data.publicUrl;
    }

    async function processImageUpload(file, preview, placeholder, progressDiv, progressBar, urlInput, removeBtn, showImage, hideImage) {
        if (progressDiv) { progressDiv.style.display = 'block'; if (progressBar) progressBar.style.width = '30%'; }
        try {
          const blob = await compressImage(file);
          showImage(URL.createObjectURL(blob));
          if (progressBar) progressBar.style.width = '60%';
          urlInput.value = await uploadImageToSupabase(blob);
          if (progressBar) progressBar.style.width = '100%';
          setTimeout(() => {
            if (progressDiv) progressDiv.style.display = 'none';
            if (progressBar) progressBar.style.width = '0%';
          }, 500);
        } catch (error) {
          console.error('Image upload error:', error);
          showError('Failed to upload image: ' + error.message, 'Upload Error');
          if (progressDiv) progressDiv.style.display = 'none';
          if (progressBar) progressBar.style.width = '0%';
          hideImage();
        }
    }
      
    function setupImageUpload(uploadAreaId, fileInputId, previewId, progressId, urlInputId, removeBtnId, placeholderId) {
        const uploadArea = document.getElementById(uploadAreaId);
        const fileInput = document.getElementById(fileInputId);
        const preview = document.getElementById(previewId);
        const placeholder = document.getElementById(placeholderId);
        const progressDiv = document.getElementById(progressId);
        const progressBar = progressDiv?.querySelector('.progress-bar');
        const urlInput = document.getElementById(urlInputId);
        const removeBtn = document.getElementById(removeBtnId);
        if (!uploadArea || !fileInput) return;
        function showImage(imageUrl) {
          preview.src = imageUrl;
          preview.style.display = 'block';
          if (placeholder) placeholder.style.display = 'none';
          uploadArea.classList.add('has-image');
          if (removeBtn) removeBtn.style.display = 'inline-block';
        }
        function hideImage() {
          preview.style.display = 'none';
          preview.src = '';
          if (placeholder) placeholder.style.display = 'flex';
          uploadArea.classList.remove('has-image');
          if (removeBtn) removeBtn.style.display = 'none';
          urlInput.value = '';
          fileInput.value = '';
        }
        uploadArea.addEventListener('click', (e) => {
          if (e.target === removeBtn || removeBtn?.contains(e.target)) return;
          fileInput.click();
        });
        fileInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (file && file.type.startsWith('image/')) {
            await processImageUpload(file, preview, placeholder, progressDiv, progressBar, urlInput, removeBtn, showImage, hideImage);
          }
        });
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('dragover'); });
        uploadArea.addEventListener('drop', async (e) => {
          e.preventDefault();
          uploadArea.classList.remove('dragover');
          const file = e.dataTransfer.files[0];
          if (file && file.type.startsWith('image/')) {
            await processImageUpload(file, preview, placeholder, progressDiv, progressBar, urlInput, removeBtn, showImage, hideImage);
          }
        });
        if (removeBtn) {
          removeBtn.addEventListener('click', (e) => { e.stopPropagation(); hideImage(); });
        }
        return { showImage, hideImage };
    }

    // ============================================
    // ATTACH EVENT LISTENERS (CSP Compliant)
    // ============================================
    function attachDynamicEventListeners(container) {
        // For dynamically generated rows (Polling)
        container.querySelectorAll('.view-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => viewAnnouncement(e.currentTarget.getAttribute('data-id')));
        });
        container.querySelectorAll('.edit-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => editAnnouncement(e.currentTarget.getAttribute('data-id')));
        });
        container.querySelectorAll('.archive-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => archiveAnnouncementWithConfirm(e.currentTarget.getAttribute('data-id')));
        });
        container.querySelectorAll('.restore-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => restoreAnnouncementWithConfirm(e.currentTarget.getAttribute('data-id')));
        });
        container.querySelectorAll('.pin-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => togglePin(e.currentTarget, e.currentTarget.getAttribute('data-id')));
        });
        container.querySelectorAll('.assistance-trigger').forEach(btn => {
            btn.addEventListener('click', openAssistanceModal);
        });
    }

    // Attach to the initial server-rendered DOM
    attachDynamicEventListeners(document);

    // ============================================
    // UI INITIALIZATION
    // ============================================
    
    // 1. Create Modal Handlers & Cleanup
    createImageHandlers = setupImageUpload('imageUploadArea', 'imageFile', 'imagePreview', 'uploadProgress', 'imageUrl', 'removeImageBtn', 'uploadPlaceholder');
    editImageHandlers = setupImageUpload('editImageUploadArea', 'editImageFile', 'editImagePreview', 'editUploadProgress', 'editImageUrl', 'editRemoveImageBtn', 'editUploadPlaceholder');

    const createModalEl = document.getElementById('createAnnouncementModal');
    if (createModalEl) {
        createModalEl.addEventListener('hidden.bs.modal', function() {
            resetCreateForm();
            setTimeout(cleanupOrphanBackdrops, 50);
        });
    }
    
    // 2. Bind Submit Buttons
    document.getElementById('createAnnouncementBtn')?.addEventListener('click', createAnnouncementWithConfirm);
    document.getElementById('updateAnnouncementBtn')?.addEventListener('click', updateAnnouncementWithConfirm);
    document.getElementById('sysErrorOkBtn')?.addEventListener('click', () => {
        document.getElementById('sysErrorOverlay').classList.remove('show');
    });

    // 3. Search input
    const searchInput = document.getElementById('announcement-search');
    if (searchInput) {
        searchInput.addEventListener('keyup', applyFiltersForActiveTab);
    }

    // 4. Setup Filter Dropdown dynamically (replaces the hardcoded reset button)
    const filterContainer = document.getElementById('filterContainer');
    if (filterContainer) {
        const filterBtn = document.createElement('button');
        filterBtn.id = 'priorityFilterBtn';
        filterBtn.className = 'filter-btn';
        filterBtn.innerHTML = '<i class="bi bi-funnel"></i> Filter: All Priorities';
        
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'position-relative d-inline-block';
        
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'priority-dropdown-menu';
        dropdownMenu.innerHTML = `
            <div class="priority-option" data-value="all">
                <i class="bi bi-list-ul"></i> All Priorities
            </div>
            <div class="priority-option" data-value="high">
                <i class="bi bi-pin-angle-fill text-warning"></i> High Priority Only
            </div>
            <div class="priority-option" data-value="normal">
                <i class="bi bi-flag"></i> Normal Priority Only
            </div>
        `;

        // Bind option clicks
        dropdownMenu.querySelectorAll('.priority-option').forEach(option => {
            option.addEventListener('click', () => {
                const value = option.getAttribute('data-value');
                if (value === 'all') filterBtn.innerHTML = '<i class="bi bi-funnel"></i> Filter: All Priorities';
                else if (value === 'high') filterBtn.innerHTML = '<i class="bi bi-pin-angle-fill"></i> Filter: High Priority';
                else if (value === 'normal') filterBtn.innerHTML = '<i class="bi bi-flag"></i> Filter: Normal Priority';
                dropdownMenu.classList.remove('show');
                currentPriorityFilter = value;
                applyFiltersForActiveTab();
            });
        });

        // Toggle dropdown
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target)) dropdownMenu.classList.remove('show');
        });

        dropdownContainer.appendChild(filterBtn);
        dropdownContainer.appendChild(dropdownMenu);
        filterContainer.appendChild(dropdownContainer);
    }

    // 5. Tab Switching logic
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) {
                window.location.href = '/announcements?tab=' + tabName;
            }
        });
    });

    // Start polling and initial filter
    applyFiltersForActiveTab();
    trackModalState();
    startPolling();

    window.addEventListener('beforeunload', function() {
        if (pollingInterval) clearInterval(pollingInterval);
    });
});