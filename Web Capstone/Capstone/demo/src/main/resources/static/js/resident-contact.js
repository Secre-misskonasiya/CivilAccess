document.addEventListener('DOMContentLoaded', function () {
    // Fix for buttons with no accessible name
    document.querySelectorAll('button').forEach(function (b) {
        var named = b.textContent.trim() || b.getAttribute('aria-label') ||
                    b.getAttribute('aria-labelledby') || b.title;
        if (!named) b.setAttribute('aria-label', 'Toggle menu');
    });

    // ── State ──────────────────────────────────────────────────
    let currentTab      = 'incoming';
    let allRequests     = [];
    let activeReqId     = null;
    let pollTimer       = null;
    let msgPollTimer    = null;
    let adminPics       = {};
    let lastMsgCount    = -1;
    let residentName    = '';

    // ── Fixed Fetch wrapper with credentials ─────────────────────
    async function fetchWithAuth(url, options = {}) {
        options.credentials = 'include';
        if (!options.headers) options.headers = {};
        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            if (!options.headers['Content-Type']) options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }
        try {
            return await fetch(url, options);
        } catch (error) {
            console.error(`Fetch error for ${url}:`, error);
            throw error;
        }
    }

    // ── Format helpers ─────────────────────────────────────────
    const fmt = {
        date(iso) {
            if (!iso) return '';
            return new Date(iso).toLocaleDateString('en-US', {
                month:'short', day:'numeric', year:'numeric', timeZone:'Asia/Manila'
            });
        },
        time(iso) {
            if (!iso) return '';
            return new Date(iso).toLocaleTimeString('en-US', {
                hour:'2-digit', minute:'2-digit', hour12:true, timeZone:'Asia/Manila'
            });
        },
        dateKey(iso) {
            if (!iso) return '';
            return new Date(iso).toLocaleDateString('en-CA', { timeZone:'Asia/Manila' });
        },
        dateSep(key) {
            if (!key) return '';
            const today = fmt.dateKey(new Date().toISOString());
            const yest  = fmt.dateKey(new Date(Date.now() - 86400000).toISOString());
            if (key === today) return 'Today';
            if (key === yest)  return 'Yesterday';
            return new Date(key + 'T00:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
        }
    };

    function esc(s) {
        return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── Boot ───────────────────────────────────────────────────
    async function boot() {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            console.error('Not authenticated, redirecting to login...');
            window.location.href = '/resident-login';
            return;
        }
        
        await loadMe();
        await loadRequests();
        pollTimer = setInterval(loadRequests, 4000);
    }
    boot();

    async function checkAuth() {
        try {
            const response = await fetchWithAuth('/api/resident/me');
            if (response.ok) {
                const data = await response.json();
                console.log('Authenticated as:', data.email);
                return true;
            } else {
                console.log('Not authenticated, status:', response.status);
                return false;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    async function loadMe() {
        try {
            const r = await fetchWithAuth('/api/resident/me');
            if (!r.ok) return;
            const d = await r.json();
            residentName = ((d.firstName||'') + ' ' + (d.lastName||'')).trim() || d.email || 'Resident';
        } catch(e) {
            console.error('loadMe error:', e);
        }
    }

    // ── Load & render thread list ──────────────────────────────
    async function loadRequests() {
        try {
            const r = await fetchWithAuth('/api/resident/contact-requests');
            if (!r.ok) {
                if (r.status === 401) {
                    console.error('Session expired, redirecting to login...');
                    window.location.href = '/resident-login';
                }
                return;
            }
            allRequests = await r.json();

            if (activeReqId !== null) {
                const live = allRequests.find(x => x.id === activeReqId);
                if (live) syncChatStatus(live);
            }

            renderThreads();
        } catch(e) {
            console.error('loadRequests error:', e);
        }
    }

    function renderThreads() {
        const incoming = allRequests.filter(r => r.status === 'INCOMING')
            .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        const resolved = allRequests.filter(r => r.status === 'RESOLVED' || r.status === 'ARCHIVED')
            .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

        document.getElementById('badgeIn').textContent  = incoming.length;
        document.getElementById('badgeRes').textContent = resolved.length;

        const hasActive = incoming.length > 0;
        document.getElementById('warnBanner').style.display = hasActive ? 'flex' : 'none';
        document.getElementById('newBtn').disabled = hasActive;

        const list = currentTab === 'incoming' ? incoming : resolved;
        const el   = document.getElementById('threadList');

        if (list.length === 0) {
            el.innerHTML = `
                <div class="empty-threads">
                    <i class="bi bi-chat-square-dots"></i>
                    <p>${currentTab === 'incoming' ? 'No requests yet' : 'No resolved requests'}</p>
                    <small>${currentTab === 'incoming' ? 'Tap New Request to contact staff' : 'Resolved tickets will appear here'}</small>
                </div>`;
            return;
        }

        el.innerHTML = list.map(req => {
            const isActive   = req.id === activeReqId;
            const dispStatus = req.status === 'ARCHIVED' ? 'RESOLVED' : req.status;
            const ringClass  = dispStatus === 'INCOMING' ? 'ring-incoming' : 'ring-resolved';
            const icon       = dispStatus === 'INCOMING' ? 'bi-chat-dots-fill' : 'bi-check2-circle';

            return `
                <div class="thread-item${isActive ? ' active' : ''}" data-req-id="${req.id}">
                    <div class="thread-avatar">
                        <i class="bi ${icon}"></i>
                        <span class="status-ring ${ringClass}"></span>
                    </div>
                    <div class="thread-body">
                        <div class="thread-type">${esc(req.type || 'General Inquiry')}</div>
                        <div class="thread-preview">${esc((req.message||'').slice(0, 55))}${(req.message||'').length>55?'…':''}</div>
                    </div>
                    <div class="thread-meta">
                        <span class="thread-date">${fmt.date(req.createdAt)}</span>
                    </div>
                </div>`;
        }).join('');
    }

    function switchTab(tab) {
        currentTab = tab;
        document.getElementById('tabIn').classList.toggle('active',  tab === 'incoming');
        document.getElementById('tabRes').classList.toggle('active', tab === 'resolved');
        renderThreads();
    }

    // ── Views ──────────────────────────────────────────────────
    function showWelcome() {
        stopMsgPoll();
        activeReqId = null;
        lastMsgCount = -1;
        document.getElementById('welcomePane').style.display = 'flex';
        document.getElementById('formPane').style.display    = 'none';
        document.getElementById('chatPane').style.display    = 'none';
        renderThreads();
    }

    function showNewForm() {
        if (allRequests.some(r => r.status === 'INCOMING')) {
            showActiveTicketAlert();
            return;
        }
        document.getElementById('welcomePane').style.display = 'none';
        document.getElementById('formPane').style.display    = 'flex';
        document.getElementById('chatPane').style.display    = 'none';
    }

    function showActiveTicketAlert() {
        document.getElementById('successOverlay').classList.add('open');
        document.querySelector('.modal-top h2').innerHTML =
            '<i class="bi bi-exclamation-triangle-fill" style="margin-right:6px;color:var(--gold)"></i>Active Request';
        document.querySelector('.modal-icon-ring').innerHTML = '<i class="bi bi-clock-history"></i>';
        document.querySelector('.modal-icon-ring').style.background = '#fff8e1';
        document.querySelector('.modal-icon-ring').style.borderColor = 'var(--gold)';
        document.querySelector('.modal-icon-ring').style.color = 'var(--gold-dim)';
        document.querySelector('.modal-box h3').textContent = 'Request In Progress';
        document.querySelector('.modal-box p').textContent  = 'You already have an ongoing request. Please wait for it to be resolved before submitting a new one.';
    }

    // ── Submit ─────────────────────────────────────────────────
    async function submitRequest() {
        const type    = document.getElementById('formType').value;
        const message = document.getElementById('formMessage').value.trim();
        if (!message) { document.getElementById('formMessage').focus(); return; }

        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Submitting…';

        try {
            const r = await fetchWithAuth('/api/resident/contact-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { type, message }
            });
            
            if (!r.ok) {
                const errorText = await r.text();
                alert('Error: ' + errorText);
                return;
            }
            
            document.getElementById('formMessage').value = '';
            resetSuccessModal();
            document.getElementById('successOverlay').classList.add('open');
            await loadRequests(); // Refresh the list
        } catch(e) {
            console.error('Submit error:', e);
            alert('Could not submit. Please try again.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-send-fill"></i> Submit Request';
        }
    }

    function resetSuccessModal() {
        document.querySelector('.modal-top h2').innerHTML = '<i class="bi bi-send-fill" style="margin-right:6px"></i>Request Sent';
        document.querySelector('.modal-icon-ring').innerHTML = '<i class="bi bi-check-lg"></i>';
        document.querySelector('.modal-icon-ring').style.background = '#e8f5ee';
        document.querySelector('.modal-icon-ring').style.borderColor = '#c3e6cb';
        document.querySelector('.modal-icon-ring').style.color = 'var(--resolve-col)';
        document.querySelector('.modal-box h3').textContent = 'Submitted!';
        document.querySelector('.modal-box p').textContent  = 'Your request has been sent to the barangay staff. They will respond as soon as possible.';
    }

    function closeSuccess() {
        document.getElementById('successOverlay').classList.remove('open');
        showWelcome();
        loadRequests();
    }

    // ── Open chat ──────────────────────────────────────────────
    async function openChat(reqId) {
        const req = allRequests.find(r => r.id === reqId);
        if (!req) return;
        activeReqId  = reqId;
        lastMsgCount = -1;

        try { 
            await fetchWithAuth(`/api/resident/contact-requests/${reqId}/mark-viewed`, { method:'POST' }); 
        } catch(e) {
            console.error('mark-viewed error:', e);
        }

        document.getElementById('welcomePane').style.display = 'none';
        document.getElementById('formPane').style.display    = 'none';
        document.getElementById('chatPane').style.display    = 'flex';

        document.getElementById('chatHeaderSub').textContent = req.type || 'General Inquiry';
        document.getElementById('chatSubType').textContent   = req.type || 'General Inquiry';
        document.getElementById('chatSubMsg').textContent    = '"' + (req.message || '') + '"';

        syncChatStatus(req);
        renderThreads();

        await fetchMessages(reqId);
        startMsgPoll(reqId);
    }

    function syncChatStatus(req) {
        const dispStatus = (req.status === 'ARCHIVED') ? 'RESOLVED' : req.status;
        const pill   = document.getElementById('chatStatusPill');
        const txt    = document.getElementById('chatStatusText');
        const iWrap  = document.getElementById('chatInputWrap');
        const rBar   = document.getElementById('resolvedBar');
        const input  = document.getElementById('chatInput');
        const sBtn   = document.getElementById('sendBtn');

        txt.textContent = dispStatus;
        pill.className = 'chat-status-pill ' + (dispStatus === 'RESOLVED' ? 'pill-resolved' : 'pill-incoming');

        if (dispStatus === 'RESOLVED') {
            iWrap.style.display  = 'none';
            rBar.style.display   = 'flex';
            input.disabled = true; 
            sBtn.disabled = true;
        } else {
            iWrap.style.display  = 'flex';
            rBar.style.display   = 'none';
            input.disabled = false; 
            sBtn.disabled = false;
        }
    }

    // ── Messages ───────────────────────────────────────────────
    function startMsgPoll(reqId) {
        stopMsgPoll();
        msgPollTimer = setInterval(() => fetchMessages(reqId), 2000);
    }
    
    function stopMsgPoll() {
        if (msgPollTimer) { clearInterval(msgPollTimer); msgPollTimer = null; }
    }

    async function fetchMessages(reqId) {
        try {
            const r = await fetchWithAuth(`/api/resident/contact-requests/${reqId}/messages`);
            if (!r.ok) return;
            const msgs = await r.json();

            const names = [...new Set(msgs.filter(m => m.senderType==='ADMIN' && m.senderName).map(m => m.senderName))];
            if (names.length) await fetchAvatars(names);

            if (msgs.length !== lastMsgCount) {
                lastMsgCount = msgs.length;
                renderMessages(msgs);
                scrollBottom();
            }

            const sr = await fetchWithAuth(`/api/resident/contact-requests/${reqId}/status`);
            if (sr.ok) {
                const { status } = await sr.json();
                const req = allRequests.find(x => x.id === reqId);
                if (req && req.status !== status) {
                    req.status = status;
                    syncChatStatus(req);
                    renderThreads();
                }
            }
        } catch(e) {
            console.error('fetchMessages error:', e);
        }
    }

    async function fetchAvatars(names) {
        const needed = names.filter(n => !(n in adminPics));
        if (!needed.length) return;
        try {
            const r = await fetchWithAuth('/api/resident/admin-profiles?names=' + needed.map(encodeURIComponent).join(','));
            if (!r.ok) return;
            const data = await r.json();
            data.forEach(a => { adminPics[a.name] = a.profilePicture || null; });
        } catch(e) {
            console.error('fetchAvatars error:', e);
        }
    }

    function renderMessages(msgs) {
        const container = document.getElementById('chatMessages');

        if (!msgs.length) {
            container.innerHTML = `
                <div class="no-msgs">
                    <i class="bi bi-chat-square"></i>
                    <p>No messages yet — be the first to write!</p>
                </div>`;
            return;
        }

        let html = '';
        let lastDate = null, lastKey = null;

        msgs.forEach((msg, idx) => {
            const dk  = fmt.dateKey(msg.createdAt);
            const isMe = msg.senderType === 'RESIDENT';
            const key  = isMe ? '__me__' : `admin__${msg.senderName}`;

            if (dk !== lastDate) {
                html += `<div class="date-sep"><hr/><span>${esc(fmt.dateSep(dk))}</span><hr/></div>`;
                lastDate = dk; lastKey = null;
            }

            const grouped   = lastKey === key;
            const nextMsg   = msgs[idx + 1];
            const nextKey   = nextMsg ? (nextMsg.senderType==='RESIDENT' ? '__me__' : `admin__${nextMsg.senderName}`) : null;
            const isLast    = !nextMsg || fmt.dateKey(nextMsg.createdAt) !== dk || nextKey !== key;

            if (isMe) {
                html += `
                    <div class="msg-row me${grouped ? ' grouped' : ''}">
                        <div class="msg-col me">
                            <div class="bubble me">${esc(msg.message)}</div>
                            ${isLast ? `<span class="ts">${fmt.time(msg.createdAt)}</span>` : ''}
                        </div>
                    </div>`;
            } else {
                const pic      = adminPics[msg.senderName];
                const initials = (msg.senderName||'BS').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
                const avHtml   = grouped
                    ? `<div class="staff-av-spacer"></div>`
                    : (pic
                        ? `<div class="staff-av"><img src="${esc(pic)}" alt="${esc(msg.senderName)}"/></div>`
                        : `<div class="staff-av">${esc(initials)}</div>`);

                html += `
                    <div class="msg-row${grouped ? ' grouped' : ''}">
                        ${avHtml}
                        <div class="msg-col">
                            ${!grouped ? `<span class="sender-name">${esc(msg.senderName||'Brgy Staff')}</span>` : ''}
                            <div class="bubble them">${esc(msg.message)}</div>
                            ${isLast ? `<span class="ts">${fmt.time(msg.createdAt)}</span>` : ''}
                        </div>
                    </div>`;
            }

            lastKey = key;
        });

        container.innerHTML = html;
    }

    function scrollBottom() {
        const c = document.getElementById('chatMessages');
        c.scrollTop = c.scrollHeight;
    }

    // ── Send ───────────────────────────────────────────────────
    async function sendMessage() {
        const input = document.getElementById('chatInput');
        const text  = input.value.trim();
        if (!text || activeReqId === null) return;

        const prev = input.value;
        input.value = '';
        input.style.height = 'auto';
        document.getElementById('sendBtn').disabled = true;

        try {
            const r = await fetchWithAuth(`/api/resident/contact-requests/${activeReqId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { message: text }
            });
            
            if (!r.ok) { 
                input.value = prev; 
            } else { 
                lastMsgCount = -1; 
                await fetchMessages(activeReqId); 
            }
        } catch(e) { 
            console.error('sendMessage error:', e);
            input.value = prev; 
        } finally {
            document.getElementById('sendBtn').disabled = false;
            input.focus();
        }
    }

    function handleKey(e) {
        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            sendMessage(); 
        }
    }

    // ── Event Bindings ─────────────────────────────────────────
    document.getElementById('btnNewForm').addEventListener('click', showNewForm);
    document.getElementById('btnBackFromForm').addEventListener('click', showWelcome);
    document.getElementById('btnBackFromChat').addEventListener('click', showWelcome);
    document.getElementById('submitBtn').addEventListener('click', submitRequest);
    document.getElementById('btnCloseSuccess').addEventListener('click', closeSuccess);
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('newBtn').addEventListener('click', showNewForm);
    
    document.getElementById('tabIn').addEventListener('click', () => switchTab('incoming'));
    document.getElementById('tabRes').addEventListener('click', () => switchTab('resolved'));
    
    document.getElementById('chatInput').addEventListener('keydown', handleKey);
    document.getElementById('chatInput').addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    // Thread list event delegation
    document.getElementById('threadList').addEventListener('click', function(e) {
        const item = e.target.closest('.thread-item');
        if (item) {
            const reqId = parseInt(item.getAttribute('data-req-id'));
            openChat(reqId);
        }
    });
});