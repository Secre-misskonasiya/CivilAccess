document.addEventListener('DOMContentLoaded', function() {
    let currentRequest = null;
    let pollInterval = null;
    let lastMessageId = 0;
    let isChatDisabled = false;
    let lastMessageInfo = {};
    let knownRequestIds = new Set();
    let isInitialLoad = true;
    let activeTypeFilter = '';
    let residentAvatarUrl = null;
    let residentName = '';
    
    let pendingAction = { id: null, status: null };

    // Attach initial event listeners
    document.getElementById('redirectPasswordBtn')?.addEventListener('click', redirectToPassword);
    document.getElementById('confirmActionBtn').addEventListener('click', executePendingAction);
    document.getElementById('btnCloseConfirm').addEventListener('click', closeConfirmModal);
    document.getElementById('btnCloseSuccess').addEventListener('click', closeSuccessModalAndReload);
    
    document.getElementById('filterToggleBtn').addEventListener('click', toggleTypeFilter);
    
    // Filter Options
    document.querySelectorAll('.type-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            const type = e.target.closest('.type-option').getAttribute('data-type');
            const label = e.target.closest('.type-option').getAttribute('data-label');
            filterByType(type, label);
        });
    });

    // Search Input
    document.getElementById('contact-search').addEventListener('keyup', function() {
        const searchValue = this.value.toLowerCase();
        document.querySelectorAll('.panel-inner:not(.d-none) .contact-row').forEach(row => {
            const text = row.textContent.toLowerCase();
            const typeEl = row.querySelector('.badge-type');
            const rowType = typeEl ? typeEl.textContent.trim() : '';
            const matchesSearch = text.includes(searchValue);
            const matchesType = !activeTypeFilter || rowType === activeTypeFilter;
            row.style.display = (matchesSearch && matchesType) ? '' : 'none';
        });
    });

    // Tab links
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) {
                window.location.href = '/contact-help?tab=' + tabName;
            }
        });
    });

    // Chat Modal Events
    document.getElementById('chatSendBtn').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', handleChatKeyPress);
    document.getElementById('chatInput').addEventListener('input', autoResizeTextarea);

    // Table Action Buttons
    document.querySelectorAll('.btn-open-chat').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const tab = e.target.getAttribute('data-tab');
            openChatModal(id, tab);
        });
    });

    document.querySelectorAll('.btn-resolve').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const status = e.target.getAttribute('data-status');
            showConfirmModal(id, status);
        });
    });

    document.querySelectorAll('.btn-archive').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const status = e.target.getAttribute('data-status');
            showConfirmModal(id, status);
        });
    });

    document.querySelectorAll('.btn-assistance-archive').forEach(btn => {
        btn.addEventListener('click', openAssistanceModal);
    });

    // Outside click for dropdown
    document.addEventListener('click', function() { 
        const dd = document.getElementById('typeFilterDropdown'); 
        if (dd) dd.style.display = 'none'; 
    });

    // Forced Password Modal
    const status = document.getElementById("accountStatus").value;
    if (status === "New" || status === 'Newly Updated') { 
        document.getElementById("forcePasswordModal").style.display = "block"; 
        document.body.style.overflow = "hidden"; 
    }

    // Init Data & Polling
    initMessageInfo();
    
    setInterval(checkForNewRequests, 3000);
    setInterval(checkNewMessages, 5000);

    // ---------------------------------------------
    // POLLING - Reload on external data changes
    // ---------------------------------------------
    let lastSnapshot = '';
    
    function isModalOpen() {
        var chatModal = document.getElementById('chatModal');
        if (chatModal && chatModal.classList.contains('show')) return true;
        var confirmModal = document.getElementById('confirmModal');
        if (confirmModal && confirmModal.style.display === 'flex') return true;
        var successModal = document.getElementById('successModal');
        if (successModal && successModal.style.display === 'flex') return true;
        var forceModal = document.getElementById('forcePasswordModal');
        if (forceModal && forceModal.style.display === 'block') return true;
        var logoutModal = document.getElementById('logoutModal');
        if (logoutModal && (logoutModal.style.display === 'block' || logoutModal.style.display === 'flex')) return true;
        return false;
    }
    
    function poll() {
        if (isModalOpen()) return;
        
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/contact-help/api/counts?t=' + Date.now(), true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    var snapshot = JSON.stringify(data);
                    
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

    // ---------------------------------------------
    // INNER FUNCTIONS
    // ---------------------------------------------
    function syncBadges() {
        Object.keys(lastMessageInfo).forEach(requestId => {
            const row = document.querySelector(`.contact-row[data-request-id="${requestId}"]`);
            if (!row) return;
            const badge = row.querySelector('.new-msg-badge');
            if (!badge) return;
            badge.style.display = lastMessageInfo[requestId].hasUnread ? 'inline-block' : 'none';
        });
    }
    
    function reorderCards() {
        const list = document.querySelector('#tab-incoming .contact-list');
        if (!list) return;
        const rows = Array.from(list.querySelectorAll('.contact-row'));
        const unreadRows = rows.filter(row => {
            const id = row.getAttribute('data-request-id');
            return lastMessageInfo[id] && lastMessageInfo[id].hasUnread;
        });
        const readRows = rows.filter(row => {
            const id = row.getAttribute('data-request-id');
            return !lastMessageInfo[id] || !lastMessageInfo[id].hasUnread;
        });
        const fragment = document.createDocumentFragment();
        [...unreadRows, ...readRows].forEach(row => fragment.appendChild(row));
        list.innerHTML = '';
        list.appendChild(fragment);
    }

    function markAsRead(requestId) {
        fetch('/contact-help/' + requestId + '/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).then(response => {
            if (response.ok) {
                if (lastMessageInfo[requestId]) lastMessageInfo[requestId].hasUnread = false;
                syncBadges();
                reorderCards();
            }
        }).catch(err => console.error('Error marking as read:', err));
    }

    function showConfirmModal(id, status) {
        pendingAction = { id: id, status: status };
        const modalBody = document.getElementById('confirmModalBody');
        const actionText = status === 'RESOLVED' ? 'resolve' : 'archive';
        modalBody.innerHTML = `Are you sure you want to ${actionText} this contact request? This action cannot be undone.`;
        document.getElementById('confirmModal').style.display = 'flex';
    }
    
    function closeConfirmModal() {
        document.getElementById('confirmModal').style.display = 'none';
        pendingAction = { id: null, status: null };
    }
    
    function showSuccessModal(message) {
        document.getElementById('successModalBody').textContent = message;
        document.getElementById('successModal').style.display = 'flex';
    }
    
    function closeSuccessModalAndReload() {
        document.getElementById('successModal').style.display = 'none';
        window.location.reload();
    }
    
    function executePendingAction() {
        if (!pendingAction.id || !pendingAction.status) return;
        const id = pendingAction.id;
        const status = pendingAction.status;
        
        fetch('/contact-help/' + id + '/status?status=' + status, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        }).then(response => {
            if (response.ok) {
                closeConfirmModal();
                const successMsg = status === 'RESOLVED' ? 'Request resolved successfully!' : 'Request archived successfully!';
                showSuccessModal(successMsg);
            } else {
                alert('Error updating status');
                closeConfirmModal();
            }
        }).catch(() => {
            alert('Error updating status');
            closeConfirmModal();
        });
    }

    function toggleTypeFilter(event) {
        event.stopPropagation();
        const dd = document.getElementById('typeFilterDropdown');
        dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
    }

    function filterByType(type, label) {
        activeTypeFilter = type;
        document.getElementById('filterLabel').textContent = label || 'All Types';
        document.querySelectorAll('.type-option').forEach(opt => {
            const check = opt.querySelector('.type-check');
            check.style.display = opt.textContent.trim() === (label || 'All Types') ? 'inline' : 'none';
        });
        document.getElementById('typeFilterDropdown').style.display = 'none';
        document.querySelectorAll('.panel-inner:not(.d-none) .contact-row').forEach(row => {
            const typeEl = row.querySelector('.badge-type');
            const rowType = typeEl ? typeEl.textContent.trim() : '';
            row.style.display = (!type || rowType === type) ? '' : 'none';
        });
    }

    function autoResizeTextarea() {
        const textarea = document.getElementById('chatInput');
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
        }
    }

    function openChatModal(id, tabType) {
        markAsRead(id);
        currentRequest = null;
        lastMessageId = 0;
        residentAvatarUrl = null;
        isChatDisabled = (tabType === 'resolved' || tabType === 'archive');

        const headerAvatar = document.getElementById('chatHeaderAvatar');
        headerAvatar.className = 'chat-header-avatar-placeholder';
        headerAvatar.textContent = '?';

        const chatModalEl = document.getElementById('chatModal');
        const chatModal = new bootstrap.Modal(chatModalEl);
        chatModal.show();

        chatModalEl.addEventListener('hidden.bs.modal', function onClose() {
            chatModalEl.removeEventListener('hidden.bs.modal', onClose);
            stopPolling();
            syncBadges();
            reorderCards();
        });

        fetch('/contact-help/' + id)
            .then(response => response.json())
            .then(data => {
                currentRequest = data;
                residentName = data.name || 'Resident';
                const initials = getInitials(residentName);

                document.getElementById('chatTitle').textContent = residentName;
                document.getElementById('chatHeaderSub').textContent = (data.type || 'General Inquiry') + ' · ' + (data.phoneNumber || 'N/A');

                const hav = document.getElementById('chatHeaderAvatar');
                hav.className = 'chat-header-avatar-placeholder';
                hav.textContent = initials;

                const statusDot = document.getElementById('chatStatusDot');
                const disabledBadge = document.getElementById('chatDisabledBadge');
                const chatInput = document.getElementById('chatInput');
                const sendBtn = document.getElementById('chatSendBtn');
                const inputArea = document.getElementById('chatInputArea');

                if (isChatDisabled) {
                    statusDot.classList.add('disabled');
                    disabledBadge.style.display = 'inline-block';
                    chatInput.disabled = true;
                    sendBtn.disabled = true;
                    inputArea.classList.add('disabled');
                } else {
                    statusDot.classList.remove('disabled');
                    disabledBadge.style.display = 'none';
                    chatInput.disabled = false;
                    sendBtn.disabled = false;
                    inputArea.classList.remove('disabled');
                }

                document.getElementById('chatRequestInfo').innerHTML = `
                    <strong>${escapeHtml(residentName)}</strong> &nbsp;|&nbsp;
                    <i class="bi bi-telephone"></i> ${escapeHtml(data.phoneNumber || 'N/A')} &nbsp;|&nbsp;
                    <i class="bi bi-envelope"></i> ${escapeHtml(data.email || 'N/A')}<br>
                    <small><strong>Issue:</strong> ${escapeHtml(data.type || 'General Inquiry')}</small>
                    <div class="mt-1"><strong>Initial Message:</strong> "${escapeHtml(data.message || 'No message')}"</div>
                    ${data.resolvedBy ? `<div class="mt-1"><strong>Resolved By:</strong> ${escapeHtml(data.resolvedBy)}</div>` : ''}
                `;

                const msgsDiv = document.getElementById('chatMessages');
                msgsDiv.innerHTML = '<div class="empty-chat"><i class="bi bi-chat-dots"></i><p>Loading…</p></div>';

                fetch('/contact-help/' + id + '/resident-avatar')
                    .then(r => r.ok ? r.json() : null)
                    .then(avatarData => {
                        if (avatarData && avatarData.avatar_url && avatarData.avatar_url !== '') {
                            residentAvatarUrl = avatarData.avatar_url;
                            const currentHav = document.getElementById('chatHeaderAvatar');
                            const img = document.createElement('img');
                            img.src = residentAvatarUrl;
                            img.className = 'chat-header-avatar';
                            img.alt = residentName;
                            img.id = 'chatHeaderAvatar';
                            img.onerror = () => {
                                residentAvatarUrl = '';
                                img.className = 'chat-header-avatar-placeholder';
                                img.alt = '';
                                const fallback = document.createElement('div');
                                fallback.className = 'chat-header-avatar-placeholder';
                                fallback.textContent = initials;
                                fallback.id = 'chatHeaderAvatar';
                                img.replaceWith(fallback);
                            };
                            currentHav.replaceWith(img);
                        } else {
                            residentAvatarUrl = '';
                        }
                    })
                    .catch(() => { residentAvatarUrl = ''; })
                    .finally(() => {
                        loadMessages();
                        if (!isChatDisabled) {
                            if (pollInterval) clearInterval(pollInterval);
                            pollInterval = setInterval(loadMessages, 3000);
                        }
                        const textarea = document.getElementById('chatInput');
                        if (textarea) {
                            textarea.focus();
                        }
                    });
            })
            .catch(() => alert('Error loading conversation'));
    }

    function stopPolling() {
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        currentRequest = null;
        lastMessageId = 0;
    }

    function loadMessages() {
        if (!currentRequest) return;
        fetch('/contact-help/' + currentRequest.id + '/messages')
            .then(r => r.json())
            .then(messages => {
                const msgsDiv = document.getElementById('chatMessages');
                if (messages.length === 0) {
                    msgsDiv.innerHTML = `<div class="empty-chat" id="emptyChat"><i class="bi bi-chat-dots"></i><p>No messages yet</p><small>Type your message to start the conversation</small></div>`;
                    lastMessageId = 0;
                    return;
                }
                messages.sort((a, b) => a.id - b.id);
                if (lastMessageId === 0) {
                    msgsDiv.innerHTML = '';
                    renderMessagesWithDates(messages, msgsDiv);
                    lastMessageId = messages[messages.length - 1].id;
                    scrollChatToBottom();
                    return;
                }
                const newMsgs = messages.filter(m => m.id > lastMessageId).sort((a, b) => a.id - b.id);
                if (newMsgs.length > 0) {
                    appendMessagesWithDates(newMsgs, msgsDiv);
                    lastMessageId = newMsgs[newMsgs.length - 1].id;
                    scrollChatToBottom();
                }
            })
            .catch(err => console.error('Poll error:', err));
    }

    function getDateLabel(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
        if (sameDay(d, today)) return 'Today';
        if (sameDay(d, yesterday)) return 'Yesterday';
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    function renderMessagesWithDates(messages, container) {
        let lastDateLabel = null;
        messages.forEach(msg => {
            const label = getDateLabel(msg.createdAt);
            if (label && label !== lastDateLabel) {
                container.appendChild(makeDateSeparator(label));
                lastDateLabel = label;
            }
            renderBubble(msg, container);
        });
    }

    function appendMessagesWithDates(newMsgs, container) {
        const separators = container.querySelectorAll('.date-separator');
        let lastRenderedLabel = separators.length > 0 ? separators[separators.length - 1].querySelector('.date-separator-label').textContent : null;
        newMsgs.forEach(msg => {
            const label = getDateLabel(msg.createdAt);
            if (label && label !== lastRenderedLabel) {
                container.appendChild(makeDateSeparator(label));
                lastRenderedLabel = label;
            }
            renderBubble(msg, container);
        });
    }

    function makeDateSeparator(label) {
        const sep = document.createElement('div');
        sep.className = 'date-separator';
        sep.innerHTML = `<div class="date-separator-line"></div><span class="date-separator-label">${escapeHtml(label)}</span><div class="date-separator-line"></div>`;
        return sep;
    }

    function renderBubble(msg, container) {
        const msgsDiv = container || document.getElementById('chatMessages');
        const isAdmin = msg.senderType === 'ADMIN';
        const side = isAdmin ? 'admin' : 'resident';

        let timeStr = '';
        if (msg.createdAt) {
            try {
                const d = new Date(msg.createdAt);
                timeStr = d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            } catch(e) {}
        }

        const senderName = isAdmin ? (msg.senderName || 'Staff') : (msg.senderName || residentName || 'Resident');

        const prevRow = msgsDiv.lastElementChild;
        const isSameGroup = prevRow && prevRow.classList && prevRow.classList.contains('bubble-row') && prevRow.getAttribute('data-side') === side;

        if (isSameGroup) {
            const prevCol = prevRow.querySelector('.bubble-col');
            if (prevCol) {
                const prevTime = prevCol.querySelector('.bubble-time');
                if (prevTime) prevTime.remove();
            }
        }

        const row = document.createElement('div');
        row.className = 'bubble-row ' + side;
        row.setAttribute('data-side', side);

        if (!isAdmin) {
            if (!isSameGroup) {
                const avatar = makeResidentAvatar(senderName);
                row.appendChild(avatar);
            } else {
                const spacer = document.createElement('div');
                spacer.className = 'bubble-avatar-spacer';
                row.appendChild(spacer);
            }
        }

        const col = document.createElement('div');
        col.className = 'bubble-col ' + side;

        if (!isAdmin && !isSameGroup) {
            const nameEl = document.createElement('div');
            nameEl.className = 'bubble-sender-name';
            nameEl.textContent = senderName;
            col.appendChild(nameEl);
        }

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble ' + side;
        bubble.textContent = msg.message;
        col.appendChild(bubble);

        const timeEl = document.createElement('div');
        timeEl.className = 'bubble-time';
        timeEl.textContent = timeStr;
        col.appendChild(timeEl);

        row.appendChild(col);

        if (isAdmin) {
            const spacer = document.createElement('div');
            spacer.className = 'bubble-avatar-spacer';
            row.appendChild(spacer);
        }

        msgsDiv.appendChild(row);
    }

    function makeResidentAvatar(name) {
        if (residentAvatarUrl && residentAvatarUrl !== '') {
            const img = document.createElement('img');
            img.src = residentAvatarUrl;
            img.className = 'bubble-avatar';
            img.alt = name;
            img.onerror = () => {
                const placeholder = document.createElement('div');
                placeholder.className = 'bubble-avatar-placeholder';
                placeholder.textContent = getInitials(name);
                img.replaceWith(placeholder);
            };
            return img;
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'bubble-avatar-placeholder';
            placeholder.textContent = getInitials(name);
            return placeholder;
        }
    }

    function getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function sendMessage() {
        if (isChatDisabled) { alert('This conversation is resolved/archived and cannot be modified.'); return; }
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (!text || !currentRequest) return;
        input.value = '';
        autoResizeTextarea();
        fetch('/contact-help/' + currentRequest.id + '/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        }).then(r => r.json()).then(saved => {
            const msgsDiv = document.getElementById('chatMessages');
            const emptyEl = msgsDiv.querySelector('.empty-chat');
            if (emptyEl) emptyEl.remove();
            const label = getDateLabel(saved.createdAt);
            const separators = msgsDiv.querySelectorAll('.date-separator');
            const lastLabel = separators.length > 0 ? separators[separators.length - 1].querySelector('.date-separator-label').textContent : null;
            if (label && label !== lastLabel) msgsDiv.appendChild(makeDateSeparator(label));
            renderBubble(saved, msgsDiv);
            if (saved.id > lastMessageId) lastMessageId = saved.id;
            scrollChatToBottom();
        }).catch(() => alert('Failed to send message. Please try again.'));
    }

    function handleChatKeyPress(event) { 
        if (event.key === 'Enter' && !event.shiftKey && !isChatDisabled) { 
            event.preventDefault(); 
            sendMessage(); 
        } 
    }
    
    function scrollChatToBottom() { 
        const msgsDiv = document.getElementById('chatMessages'); 
        msgsDiv.scrollTop = msgsDiv.scrollHeight; 
    }
    
    function escapeHtml(text) { 
        if (text == null) return ''; 
        const d = document.createElement('div'); 
        d.textContent = String(text); 
        return d.innerHTML; 
    }
    
    function redirectToPassword() { 
        window.location.href = '/change-password'; 
    }

    function buildAndInjectNewCard(req) {
        const list = document.querySelector('#tab-incoming .contact-list');
        if (!list) return;
        const emptyText = document.querySelector('#tab-incoming .text-center');
        if (emptyText && emptyText.style.display !== 'none') emptyText.style.display = 'none';
        const dateStr = req.createdAt ? new Date(req.createdAt).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'No date';
        const row = document.createElement('div');
        row.className = 'contact-row';
        row.setAttribute('data-request-id', req.id);
        
        // Build via DOM to avoid inline onclicks
        row.innerHTML = `
            <div class="row-name">${escapeHtml(req.name || 'Unknown')}</div>
            <div class="row-type"><span class="badge-type">${escapeHtml(req.type || 'General Inquiry')}</span></div>
            <div class="row-status"><span class="status-incoming">Incoming</span></div>
            <div class="row-message">${escapeHtml(req.message || 'No message provided')}</div>
            <div class="row-date"><span>${escapeHtml(dateStr)}</span><span class="new-msg-badge" style="display: inline-block;">NEW</span></div>
            <div class="row-actions">
                <button class="view-btn btn-open-chat" data-id="${req.id}" data-tab="incoming">View</button>
                <button class="resolve-btn btn-resolve" data-id="${req.id}" data-status="RESOLVED">Resolve</button>
                <button class="archive-btn btn-archive" data-id="${req.id}" data-status="ARCHIVED">Archive</button>
            </div>
        `;
        
        // Attach events to dynamic buttons
        row.querySelector('.btn-open-chat').addEventListener('click', () => openChatModal(req.id, 'incoming'));
        row.querySelector('.btn-resolve').addEventListener('click', () => showConfirmModal(req.id, 'RESOLVED'));
        row.querySelector('.btn-archive').addEventListener('click', () => showConfirmModal(req.id, 'ARCHIVED'));

        list.prepend(row);
        lastMessageInfo[req.id] = { hasUnread: true };
        reorderCards();
        if (activeTypeFilter && (req.type || 'General Inquiry') !== activeTypeFilter) row.style.display = 'none';
        
        const tabBadge = document.querySelector('.tabbar .tab:first-child .tab-badge');
        if (tabBadge) tabBadge.textContent = parseInt(tabBadge.textContent || '0') + 1;
    }

    function checkForNewRequests() {
        fetch('/contact-help/api/incoming-requests').then(r => r.json()).then(requests => {
            requests.forEach(req => { 
                const id = String(req.id); 
                if (!knownRequestIds.has(id)) { 
                    knownRequestIds.add(id); 
                    lastMessageInfo[id] = { hasUnread: true }; 
                    buildAndInjectNewCard(req); 
                } 
            });
        }).catch(err => console.error('Error checking new requests:', err));
    }

    function initMessageInfo() {
        const promises = [];
        document.querySelectorAll('.contact-row').forEach(row => {
            const requestId = row.getAttribute('data-request-id');
            if (!requestId) return;
            knownRequestIds.add(requestId);
            const promise = fetch('/contact-help/' + requestId + '/unread-status').then(r => r.json()).then(status => {
                const badge = row.querySelector('.new-msg-badge');
                lastMessageInfo[requestId] = { hasUnread: status.hasUnread };
                if (badge) badge.style.display = status.hasUnread ? 'inline-block' : 'none';
            }).catch(err => console.error('Error getting unread status:', err));
            promises.push(promise);
        });
        Promise.all(promises).then(() => { reorderCards(); isInitialLoad = false; });
    }

    function checkNewMessages() {
        if (isInitialLoad) return;
        document.querySelectorAll('.contact-row').forEach(row => {
            const requestId = row.getAttribute('data-request-id');
            if (!requestId) return;
            fetch('/contact-help/' + requestId + '/check-new-messages').then(r => r.json()).then(data => {
                if (data.hasNewResidentMessage && lastMessageInfo[requestId] && !lastMessageInfo[requestId].hasUnread) {
                    lastMessageInfo[requestId].hasUnread = true;
                    syncBadges();
                    reorderCards();
                }
            }).catch(err => console.error('Error checking new messages:', err));
        });
    }
});