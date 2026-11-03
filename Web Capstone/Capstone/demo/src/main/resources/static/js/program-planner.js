document.addEventListener('DOMContentLoaded', function() {
    let _selectedProgramId = null;
    let _currentAIGeneratedProgram = null;
    let _currentAIPendingList = null;
    let _isCreateButtonEnabled = false;
    let _currentViewedProgram = null; 
    let _currentViewedProgramId = null;
    let _savedPrograms = [];
    let _logData = [];
    let _logActiveFilter = 'ALL';

    // ============================================
    // HELPERS
    // ============================================
    function showSuccess(message) {
        document.getElementById('successMessage').innerHTML = message;
        new bootstrap.Modal(document.getElementById('successModal')).show();
    }

    function showConfirm(message, title, onConfirm) {
        const confirmModalId = 'dynamicConfirmModal_' + Date.now();
        const confirmModalHtml = `
            <div id="${confirmModalId}" class="modal fade" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content" style="border-radius: 16px;">
                        <div class="modal-header" style="background: linear-gradient(135deg, #30534D, #3d6b63);">
                            <h5 class="modal-title" style="color: white;">${title}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" style="padding: 24px; font-size: 16px;">${message}</div>
                        <div class="modal-footer" style="border-top: none; padding: 16px 24px;">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="confirmOkBtn_${confirmModalId}" style="background-color: #44C375; border-color: #44C375;">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.querySelectorAll('[id^="dynamicConfirmModal_"]').forEach(modal => modal.remove());
        document.body.insertAdjacentHTML('beforeend', confirmModalHtml);
        const modalEl = document.getElementById(confirmModalId);
        const modal = new bootstrap.Modal(modalEl);
        document.getElementById(`confirmOkBtn_${confirmModalId}`).onclick = function() {
            modal.hide();
            onConfirm();
        };
        modalEl.addEventListener('hidden.bs.modal', function() { modalEl.remove(); });
        modal.show();
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatMessageWithLineBreaks(message) {
        if (!message) return '';
        let escaped = escapeHtml(message);
        escaped = escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#2d7a5f;text-decoration:underline;">$1</a>');
        return escaped.replace(/\n/g, '<br>');
    }

    function formatUserMessage(message) {
        if (!message) return '';
        return escapeHtml(message).replace(/\n/g, '<br>');
    }

    function formatTime(timeStr) {
        if (!timeStr) return 'N/A';
        if (Array.isArray(timeStr)) timeStr = `${timeStr[0]}:${String(timeStr[1]).padStart(2, '0')}`;
        const [hrs, mins] = timeStr.split(':');
        let h = parseInt(hrs);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${mins.padStart(2, '0')} ${ampm}`;
    }

    function openModal(id) { document.getElementById(id).classList.add('show'); }
    function closeModal(id) { document.getElementById(id).classList.remove('show'); }
    function setCreateButtonEnabled(enabled) {
        const btn = document.getElementById('chat-create-btn');
        btn.disabled = !enabled;
        btn.classList.toggle('enabled', enabled);
        _isCreateButtonEnabled = enabled;
    }

    function formatLogDateTime(isoStr) {
        if (!isoStr) return '—';
        try {
            const d = new Date(isoStr);
            return d.toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' }) + ' ' + d.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' });
        } catch { return isoStr; }
    }

    // ============================================
    // STATIC EVENT BINDINGS
    // ============================================
    document.getElementById('btnRedirectPassword').addEventListener('click', () => { window.location.href = '/user-profile'; });
    document.getElementById('btnSendMessage').addEventListener('click', sendMessage);
    
    const textarea = document.getElementById('chat-input');
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
            setTimeout(() => { textarea.style.height = 'auto'; }, 0);
        }
    });

    document.getElementById('chat-create-btn').addEventListener('click', openAICreateModal);
    document.getElementById('btnOpenLogModal').addEventListener('click', openLogModal);
    
    // Budget
    document.getElementById('btnSubmitManualBudget').addEventListener('click', submitManualBudget);
    document.getElementById('btnCloseBudgetModal').addEventListener('click', () => closeModal('budgetModal'));
    document.getElementById('btnCancelBudgetModal').addEventListener('click', () => closeModal('budgetModal'));

    // Create Program Modal
    document.getElementById('btnCloseCreateModal').addEventListener('click', () => closeModal('createProgramModal'));
    document.getElementById('btnCancelCreateModal').addEventListener('click', () => closeModal('createProgramModal'));
    document.getElementById('btnSubmitToCalendar').addEventListener('click', submitToCalendar);
    document.getElementById('modal-program-select').addEventListener('change', populateFromSelected);

    // View Program Modal
    document.getElementById('btnCloseViewModal').addEventListener('click', closeViewModal);
    document.getElementById('btnCloseViewModalFooter').addEventListener('click', closeViewModal);
    document.getElementById('btnAddToCalendarFromView').addEventListener('click', addToCalendarFromView);

    // AI Create Modal
    document.getElementById('btnCloseAICreateModal').addEventListener('click', () => closeModal('aiCreateProgramModal'));
    document.getElementById('btnCancelAICreateModal').addEventListener('click', () => closeModal('aiCreateProgramModal'));
    document.getElementById('btnSaveAIGeneratedProgram').addEventListener('click', saveAIGeneratedProgram);

    // Review Modal
    document.getElementById('btnCloseReviewModal').addEventListener('click', () => closeModal('reviewSuggestionModal'));
    document.getElementById('btnCancelReviewModal').addEventListener('click', () => closeModal('reviewSuggestionModal'));
    document.getElementById('btnApproveSuggestion').addEventListener('click', approveSuggestion);

    // Select Programs Modal
    document.getElementById('btnCloseSelectProgramsModal').addEventListener('click', () => closeModal('selectProgramsModal'));
    document.getElementById('btnCancelSelectProgramsModal').addEventListener('click', () => closeModal('selectProgramsModal'));
    document.getElementById('btnSelectAllPrograms').addEventListener('click', () => selectAllPrograms(true));
    document.getElementById('btnDeselectAllPrograms').addEventListener('click', () => selectAllPrograms(false));
    document.getElementById('save-selected-btn').addEventListener('click', saveSelectedPrograms);
    
    // Activity Log Modal
    document.getElementById('btnCloseActivityLogModal').addEventListener('click', () => closeModal('activityLogModal'));
    document.getElementById('btnCloseActivityLogFooter').addEventListener('click', () => closeModal('activityLogModal'));
    document.querySelectorAll('.log-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterLog(btn.getAttribute('data-filter')));
    });

    // Global Click for Modals
    window.addEventListener('click', (event) => {
        ['budgetModal','createProgramModal','viewProgramModal','aiCreateProgramModal','reviewSuggestionModal','selectProgramsModal','activityLogModal'].forEach(id => {
            const el = document.getElementById(id);
            if (event.target === el) closeModal(id);
        });
    });

    // Force Password onload
    const status = document.getElementById("accountStatus")?.value;
    if (status === "New" || status === 'Newly Updated') {
        document.getElementById("forcePasswordModal").style.display = "block";
        document.body.style.overflow = "hidden";
    }

    // Event Delegation for Suggested Programs
    document.getElementById('suggested-programs-list').addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-blue-btn');
        if (viewBtn) {
            viewProgram(parseInt(viewBtn.getAttribute('data-index')));
            return;
        }
        const removeBtn = e.target.closest('.remove-red-btn');
        if (removeBtn) {
            removeProgram(removeBtn.getAttribute('data-id'), removeBtn.closest('.program-item'));
        }
    });

    // Initial Loads
    loadSuggestedPrograms();
    loadChatHistory();
    loadCurrentBudget();

    // ============================================
    // FUNCTIONS
    // ============================================
    async function sendMessage() {
        const input = document.getElementById('chat-input');
        const messages = document.getElementById('chat-messages');
        const typing = document.getElementById('typing-indicator');
        const text = input.value.trim();
        if (!text) return;

        setCreateButtonEnabled(false);
        _currentAIGeneratedProgram = null;
        _currentAIPendingList = null;

        const userDiv = document.createElement('div');
        userDiv.className = 'd-flex flex-column align-items-end';
        userDiv.innerHTML = `<div class="chat-bubble-label">You</div><div class="chat-bubble user">${formatUserMessage(text)}</div>`;
        messages.insertBefore(userDiv, typing);
        input.value = '';
        input.style.height = 'auto';

        typing.classList.add('show');
        messages.scrollTop = messages.scrollHeight;

        try {
            const response = await fetch('/api/calendar/chat-plan?programId=1', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: text
            });

            typing.classList.remove('show');
            const aiDiv = document.createElement('div');
            aiDiv.className = 'd-flex flex-column align-items-start';

            if (response.ok) {
                const data = await response.json();
                const formattedMessage = formatMessageWithLineBreaks(data.message);
                let chatHTML = `<div class="chat-bubble-label">AI Assistant</div><div class="chat-bubble ai">${formattedMessage}</div>`;

                if (data.pendingList && data.pendingList.length > 0) {
                    _currentAIGeneratedProgram = null;
                    _currentAIPendingList = data.pendingList;
                    setCreateButtonEnabled(true);

                    const totalBudget = data.pendingList.reduce((s, p) => s + (p.program_budget || 0), 0);
                    const rows = data.pendingList.map((p, i) => `
                        <tr>
                            <td style="padding:5px 8px;font-weight:bold;color:#2d4a44;">${i + 1}</td>
                            <td style="padding:5px 8px;">${escapeHtml(p.programName)}</td>
                            <td style="padding:5px 8px;">${escapeHtml(p.programDate || 'TBD')}</td>
                            <td style="padding:5px 8px;">${formatTime(p.programTime)}</td>
                            <td style="padding:5px 8px;">${escapeHtml(p.program_place)}</td>
                            <td style="padding:5px 8px;text-align:right;">&#8369;${(p.program_budget || 0).toLocaleString()}</td>
                        </tr>`).join('');

                    chatHTML += `
                        <div class="chat-bubble ai mt-2" style="max-width:100%;">
                            <strong style="color:#2d4a44;"><i class="bi bi-calendar2-range"></i> ${data.pendingList.length}-Program Plan Ready</strong>
                            <div style="overflow-x:auto;margin-top:10px;">
                                <table style="width:100%;border-collapse:collapse;font-size:12px;">
                                    <thead>
                                        <tr style="background:#f0faf5;color:#2d4a44;">
                                            <th style="padding:6px 8px;text-align:left;">#</th>
                                            <th style="padding:6px 8px;text-align:left;">Program</th>
                                            <th style="padding:6px 8px;text-align:left;">Date</th>
                                            <th style="padding:6px 8px;text-align:left;">Time</th>
                                            <th style="padding:6px 8px;text-align:left;">Location</th>
                                            <th style="padding:6px 8px;text-align:right;">Budget</th>
                                        </tr>
                                    </thead>
                                    <tbody>${rows}</tbody>
                                    <tfoot>
                                        <tr style="background:#f0faf5;font-weight:bold;">
                                            <td colspan="5" style="padding:6px 8px;color:#2d4a44;">Total Estimated Cost</td>
                                            <td style="padding:6px 8px;text-align:right;color:#2d4a44;">&#8369;${totalBudget.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <br><small style="color:#888;">Click the <strong>Create</strong> button to save all ${data.pendingList.length} programs.</small>
                        </div>`;
                }

                if (data.pending) {
                    _currentAIPendingList = null;
                    const aiNotes = data.pending.notes || data.message || '';
                    const budgetBreakdown = data.pending.budgetBreakdown || '';

                    _currentAIGeneratedProgram = {
                        programName: data.pending.programName || '',
                        programDate: data.pending.programDate || '',
                        program_place: data.pending.program_place || '',
                        programTime: data.pending.programTime || '',
                        programEndTime: data.pending.programendTime || '',
                        program_budget: data.pending.program_budget || 0,
                        budgetBreakdown: budgetBreakdown,
                        notes: aiNotes
                    };

                    setCreateButtonEnabled(true);

                    chatHTML += `
                        <div class="chat-bubble ai mt-2">
                            <strong style="color:#2d4a44;"><i class="bi bi-clipboard-data"></i> Program Suggestion Ready</strong><br><br>
                            <i class="bi bi-tag"></i> <b>Name:</b> ${escapeHtml(data.pending.programName)}<br>
                            <i class="bi bi-calendar3"></i> <b>Date:</b> ${escapeHtml(data.pending.programDate || 'TBD')}<br>
                            <i class="bi bi-clock"></i> <b>Time:</b> ${formatTime(data.pending.programTime)}<br>
                            <i class="bi bi-geo-alt"></i> <b>Location:</b> ${escapeHtml(data.pending.program_place)}<br>
                            <i class="bi bi-cash-coin"></i> <b>Est. Budget:</b> ₱${(data.pending.program_budget || 0).toLocaleString()}
                            ${budgetBreakdown ? `<div class="ai-notes-block"><strong><i class="bi bi-receipt"></i> Budget Breakdown</strong>${formatMessageWithLineBreaks(budgetBreakdown)}</div>` : ''}
                            ${aiNotes ? `<div class="ai-notes-block"><strong><i class="bi bi-journal-text"></i> Notes</strong>${formatMessageWithLineBreaks(aiNotes)}</div>` : ''}
                            <br><small style="color:#888;">Click the <strong>Create</strong> button to save this program.</small>
                        </div>`;
                }

                if (data.event) {
                    chatHTML += `
                        <div class="chat-bubble ai mt-2">
                            <strong><i class="bi bi-calendar-check"></i> Event Scheduled</strong><br>
                            <i class="bi bi-tag"></i> <b>Plan:</b> ${escapeHtml(data.event.notes || 'Community Program')}<br>
                            <i class="bi bi-calendar3"></i> <b>Date:</b> ${escapeHtml(data.event.eventDate)}<br>
                            <i class="bi bi-clock"></i> <b>Time:</b> ${formatTime(data.event.startTime)}<br>
                        </div>`;
                }

                if (data.budget) {
                    chatHTML += `
                        <div class="chat-bubble ai mt-2">
                            <strong><i class="bi bi-wallet2"></i> Budget Added</strong><br>
                            <i class="bi bi-card-text"></i> <b>Item:</b> ${escapeHtml(data.budget.budgetItem)}<br>
                            <i class="bi bi-cash"></i> <b>Amount:</b> &#8369;${data.budget.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </div>`;
                }

                aiDiv.innerHTML = chatHTML;
            } else {
                aiDiv.innerHTML = `<div class="chat-bubble-label">AI Assistant</div><div class="chat-bubble ai">I'm sorry, I'm having trouble processing that right now.</div>`;
            }
            messages.insertBefore(aiDiv, typing);
        } catch (error) {
            typing.classList.remove('show');
            console.error('Error:', error);
        }
        messages.scrollTop = messages.scrollHeight;
    }

    function openAICreateModal() {
        if (_currentAIPendingList && _currentAIPendingList.length > 0) {
            openSelectProgramsModal(_currentAIPendingList);
            return;
        }
        if (!_currentAIGeneratedProgram) {
            alert('No program data available. Please ask the AI to suggest a program first.');
            return;
        }
        document.getElementById('ai-program-name-display').value      = _currentAIGeneratedProgram.programName    || '';
        document.getElementById('ai-program-date-display').value      = _currentAIGeneratedProgram.programDate    || '';
        document.getElementById('ai-program-location-display').value  = _currentAIGeneratedProgram.program_place  || '';
        document.getElementById('ai-program-starttime-display').value = _currentAIGeneratedProgram.programTime    || '';
        document.getElementById('ai-program-endtime-display').value   = _currentAIGeneratedProgram.programEndTime || '';
        document.getElementById('ai-program-budget-display').value    = _currentAIGeneratedProgram.program_budget || 0;
        document.getElementById('ai-program-notes-display').value     = _currentAIGeneratedProgram.notes          || '';
        openModal('aiCreateProgramModal');
    }

    async function saveAIGeneratedProgram() {
        const programData = {
            programName:    document.getElementById('ai-program-name-display').value,
            programDate:    document.getElementById('ai-program-date-display').value,
            program_place:  document.getElementById('ai-program-location-display').value,
            programTime:    document.getElementById('ai-program-starttime-display').value,
            programendTime: document.getElementById('ai-program-endtime-display').value,
            program_budget: parseFloat(document.getElementById('ai-program-budget-display').value) || 0,
            budgetBreakdown: _currentAIGeneratedProgram?.budgetBreakdown || '',
            notes:          document.getElementById('ai-program-notes-display').value
        };
        if (!programData.programName) { alert('Program name is required.'); return; }
        try {
            const response = await fetch('/api/calendar/suggested', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(programData)
            });
            if (response.ok) {
                showSuccess('Program saved successfully!');
                closeModal('aiCreateProgramModal');
                setCreateButtonEnabled(false);
                _currentAIGeneratedProgram = null;
                loadSuggestedPrograms();
            } else {
                alert('Failed to save program: ' + await response.text());
            }
        } catch (error) { 
            console.error('Error saving program:', error); 
            alert('Error saving program. Please try again.'); 
        }
    }

    async function loadChatHistory() {
        try {
            const response = await fetch('/api/calendar/chat-history');
            if (!response.ok) return;
            const history = await response.json();
            const messages = document.getElementById('chat-messages');
            const typing = document.getElementById('typing-indicator');
            history.forEach(chat => {
                const div = document.createElement('div');
                div.className = chat.sender === 'user' ? 'd-flex flex-column align-items-end' : 'd-flex flex-column align-items-start';
                div.innerHTML = `
                    <div class="chat-bubble-label">${chat.sender === 'user' ? 'You' : 'AI Assistant'}</div>
                    <div class="chat-bubble ${chat.sender === 'user' ? 'user' : 'ai'}">${formatMessageWithLineBreaks(chat.message)}</div>`;
                messages.insertBefore(div, typing);
            });
            messages.scrollTop = messages.scrollHeight;
        } catch (error) { console.error('History load error:', error); }
    }

    async function loadSuggestedPrograms() {
        try {
            const response = await fetch('/api/calendar/suggested');
            if (response.ok) {
                const programs = await response.json();
                renderPrograms(programs);
            }
        } catch (error) { console.error('Failed to load programs:', error); }
    }

    function renderPrograms(programs) {
        const list = document.getElementById('suggested-programs-list');
        _savedPrograms = programs || [];
        
        if (!programs || programs.length === 0) {
            list.innerHTML = `<div class="empty-programs"><i class="bi bi-calendar2-x" style="font-size:24px;display:block;margin-bottom:8px;"></i>No programs yet. Ask AI!</div>`;
            return;
        }
        
        list.innerHTML = programs.map((p, index) => `
            <div class="program-item">
                <div class="circle-id">${index + 1}</div>
                <div class="program-info">
                    <div class="program-name">${escapeHtml(p.programName || 'Community Program')}</div>
                    <div class="program-time">
                        <i class="bi bi-clock"></i> ${formatTime(p.programTime)} &nbsp;|&nbsp;
                        <i class="bi bi-calendar3"></i> ${escapeHtml(p.programDate || 'TBD')} &nbsp;|&nbsp;
                        <i class="bi bi-geo-alt"></i> ${escapeHtml(p.program_place || 'TBD')} &nbsp;|&nbsp;
                        <i class="bi bi-cash-coin"></i> ₱${(p.program_budget || 0).toLocaleString()}
                    </div>
                </div>
                <button class="view-blue-btn" data-index="${index}">View</button>
                <button class="remove-red-btn" data-id="${p.id}" aria-label="Remove program"><i class="bi bi-trash"></i></button>
            </div>`).join('');
    }

    function viewProgram(index) {
        const p = _savedPrograms[index];
        if (!p) { alert('Error loading program details.'); return; }
        
        _currentViewedProgramId = p.id;
        _currentViewedProgram = p;

        document.getElementById('view-program-name').value = p.programName || '';
        document.getElementById('view-program-date').value = p.programDate || '';
        document.getElementById('view-program-location').value = p.program_place || '';
        document.getElementById('view-program-start').value = p.programTime || '';
        document.getElementById('view-program-end').value = p.programendTime || '';
        document.getElementById('view-program-budget').value = p.program_budget || 0;
        document.getElementById('view-program-notes').value = p.notes || '';
        
        openModal('viewProgramModal');
    }

    let _isAddingToCalendar = false;

    async function addToCalendarFromView() {
        if (_isAddingToCalendar) return;
        if (!_currentViewedProgram) { alert('No program selected.'); return; }

        const name = document.getElementById('view-program-name').value.trim();
        const date = document.getElementById('view-program-date').value;
        const location = document.getElementById('view-program-location').value.trim();
        const start = document.getElementById('view-program-start').value;
        const end = document.getElementById('view-program-end').value;
        const budget = parseFloat(document.getElementById('view-program-budget').value) || 0;
        const notes = document.getElementById('view-program-notes').value.trim();

        const today = new Date(); today.setHours(0,0,0,0);
        const eventDate = new Date(date); eventDate.setHours(0,0,0,0);
        if (eventDate < today) { alert('Cannot add events on past dates.'); return; }

        _isAddingToCalendar = true;
        const addBtn = document.getElementById('btnAddToCalendarFromView');
        if (addBtn) { addBtn.disabled = true; addBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Adding...'; }

        const eventData = { notes: name, description: notes, eventDate: date, startTime: start, endTime: end, location: location, program_budget: budget, programId: 1 };

        try {
            const response = await fetch('/api/calendar/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });
            if (!response.ok) { alert('Failed to add to calendar.'); return; }
            
            if (_currentViewedProgramId) {
                await fetch(`/api/calendar/suggested/${_currentViewedProgramId}/mark-added`, { method: 'PATCH' }).catch(() => {});
            }
            showSuccess('Program successfully added to calendar!');
            closeViewModal();
            loadSuggestedPrograms();
        } catch (error) { 
            console.error('Error:', error); 
            alert('Error adding program. Please try again.'); 
        } finally {
            _isAddingToCalendar = false;
            if (addBtn) { addBtn.disabled = false; addBtn.innerHTML = '<i class="bi bi-calendar-plus"></i> Add to Calendar'; }
        }
    }

    function closeViewModal() {
        closeModal('viewProgramModal');
        _currentViewedProgram = null;
        _currentViewedProgramId = null;
        _isAddingToCalendar = false;
        const addBtn = document.getElementById('btnAddToCalendarFromView');
        if (addBtn) { addBtn.disabled = false; addBtn.innerHTML = '<i class="bi bi-calendar-plus"></i> Add to Calendar'; }
    }

    async function removeProgram(id, programItemElement) {
        showConfirm('Are you sure you want to remove this program?', 'Confirm Remove', async function() {
            try {
                const response = await fetch(`/api/calendar/suggested/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    programItemElement.remove();
                    showSuccess('Program removed successfully!');
                    loadSuggestedPrograms(); // Refresh indices
                } else { alert('Failed to remove program'); }
            } catch (error) { console.error('Remove failed:', error); }
        });
    }

    // ── Select Programs Modal ──
    function openSelectProgramsModal(programList) {
        const container = document.getElementById('select-programs-list');
        container.innerHTML = programList.map((p, i) => `
            <label style="display:flex;align-items:center;gap:12px;border:1px solid #e0e0e0;border-radius:8px;padding:10px 14px;cursor:pointer;transition:border-color .15s;background:white;" id="prog-row-${i}">
                <input type="checkbox" class="program-select-cb" data-index="${i}" style="width:16px;height:16px;accent-color:#44C375;flex-shrink:0;cursor:pointer;" checked>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:bold;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.programName)}</div>
                    <div style="font-size:11px;color:#888;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        <i class="bi bi-calendar3"></i> ${escapeHtml(p.programDate || 'TBD')} &nbsp;|&nbsp;<i class="bi bi-clock"></i> ${formatTime(p.programTime)} &nbsp;|&nbsp;<i class="bi bi-geo-alt"></i> ${escapeHtml(p.program_place || 'TBD')}
                    </div>
                </div>
                <div style="font-size:13px;font-weight:bold;color:#2d4a44;flex-shrink:0;">&#8369;${(p.program_budget || 0).toLocaleString()}</div>
            </label>`).join('');

        container.querySelectorAll('.program-select-cb').forEach(cb => {
            cb.addEventListener('change', updateSelectSummary);
        });

        updateSelectSummary();
        openModal('selectProgramsModal');
    }

    function selectAllPrograms(checked) {
        document.querySelectorAll('.program-select-cb').forEach(cb => {
            cb.checked = checked;
            const row = cb.closest('label');
            if (row) row.style.borderColor = checked ? '#44C375' : '#e0e0e0';
        });
        updateSelectSummary();
    }

    function updateSelectSummary() {
        const checkboxes = document.querySelectorAll('.program-select-cb');
        let count = 0, total = 0;
        checkboxes.forEach(cb => {
            const row = cb.closest('label');
            if (cb.checked) {
                count++;
                const idx = parseInt(cb.dataset.index);
                total += (_currentAIPendingList[idx]?.program_budget || 0);
                if (row) row.style.borderColor = '#44C375';
            } else {
                if (row) row.style.borderColor = '#e0e0e0';
            }
        });
        document.getElementById('select-count-label').textContent = `${count} selected`;
        document.getElementById('select-total-label').textContent = total.toLocaleString();
        const saveBtn = document.getElementById('save-selected-btn');
        if (saveBtn) { saveBtn.disabled = count === 0; saveBtn.style.opacity = count === 0 ? '0.5' : '1'; }
    }

    async function saveSelectedPrograms() {
        const checkboxes = document.querySelectorAll('.program-select-cb');
        const selected = [];
        checkboxes.forEach(cb => {
            if (cb.checked) {
                const program = _currentAIPendingList[parseInt(cb.dataset.index)];
                selected.push({ ...program, budgetBreakdown: program.budgetBreakdown || '' });
            }
        });
        if (selected.length === 0) { alert('Please select at least one program.'); return; }

        try {
            const response = await fetch('/api/calendar/suggested/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selected)
            });
            if (response.ok) {
                const result = await response.json();
                closeModal('selectProgramsModal');
                showSuccess(`${result.saved} program(s) saved to Suggested Programs!`);
                setCreateButtonEnabled(false);
                _currentAIPendingList = null;
                loadSuggestedPrograms();
            } else {
                alert('Failed to save programs: ' + await response.text());
            }
        } catch (error) { console.error('Bulk save error:', error); alert('Error saving programs.'); }
    }

    // ── Activity Log ──
    async function openLogModal() {
        _logActiveFilter = 'ALL';
        ['ALL','ADDED','DELETED'].forEach(f => {
            const btn = document.getElementById('log-filter-' + f);
            if (btn) btn.classList.toggle('active', f === 'ALL');
        });
        document.getElementById('log-record-count').textContent = '— records';
        document.getElementById('log-table-wrapper').innerHTML = `<div class="log-empty"><i class="bi bi-arrow-repeat" style="font-size:24px;display:block;margin-bottom:10px;animation:spin 1s linear infinite;"></i>Loading activity log...</div>`;
        openModal('activityLogModal');

        try {
            const res = await fetch('/api/calendar/suggested/log');
            if (!res.ok) throw new Error('Server error ' + res.status);
            _logData = await res.json();
            renderLogTable(_logData);
        } catch (err) {
            document.getElementById('log-table-wrapper').innerHTML = `<div class="log-empty"><i class="bi bi-exclamation-circle" style="font-size:24px;display:block;margin-bottom:10px;color:#e74c3c;"></i>Failed to load activity log.</div>`;
        }
    }

    function filterLog(filter) {
        _logActiveFilter = filter;
        ['ALL','ADDED','DELETED'].forEach(f => {
            const btn = document.getElementById('log-filter-' + f);
            if (btn) btn.classList.toggle('active', f === filter);
        });
        const filtered = filter === 'ALL' ? _logData : _logData.filter(p => p.status === filter);
        renderLogTable(filtered);
    }

    function renderLogTable(records) {
        const count = records.length;
        document.getElementById('log-record-count').textContent = count + ' record' + (count !== 1 ? 's' : '');

        if (count === 0) {
            document.getElementById('log-table-wrapper').innerHTML = `<div class="log-empty"><i class="bi bi-journal-x" style="font-size:26px;display:block;margin-bottom:10px;"></i>No records found.</div>`;
            return;
        }

        const rows = records.map((p, i) => {
            const st = p.status || 'PROCESSING';
            const badgeIcon  = st === 'ADDED' ? '<i class="bi bi-calendar-check"></i>' : st === 'DELETED' ? '<i class="bi bi-trash"></i>' : '<i class="bi bi-hourglass-split"></i>';
            const badgeLabel = st === 'ADDED' ? 'Added to Calendar' : st === 'DELETED' ? 'Deleted' : 'Processing';
            const when = p.statusUpdatedAt ? formatLogDateTime(p.statusUpdatedAt) : '—';
            return `<tr>
                <td style="color:#aaa;font-size:12px;text-align:center;">${i + 1}</td>
                <td style="font-weight:bold;color:#1a1a1a;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.programName || 'Community Program')}</td>
                <td style="white-space:nowrap;">${escapeHtml(p.programDate || '—')}</td>
                <td style="white-space:nowrap;">${formatTime(p.programTime)}</td>
                <td style="max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.program_place || '—')}</td>
                <td style="text-align:right;white-space:nowrap;">&#8369;${(p.program_budget || 0).toLocaleString()}</td>
                <td><span class="status-badge ${st}">${badgeIcon} ${badgeLabel}</span></td>
                <td style="font-size:12px;color:#888;white-space:nowrap;">${when}</td>
            </tr>`;
        }).join('');

        document.getElementById('log-table-wrapper').innerHTML = `
            <table class="log-table">
                <thead>
                    <tr>
                        <th style="width:36px;text-align:center;">#</th>
                        <th>Program Name</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Location</th>
                        <th style="text-align:right;">Budget</th>
                        <th>Status</th>
                        <th>When</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;
    }

    // ── Budget ──
    async function loadCurrentBudget() {
        try {
            const response = await fetch('/api/calendar/budget/current');
            const data = await response.json();
            updateBudgetDisplay(data.totalBudget);
        } catch (e) { updateBudgetDisplay(0); }
    }

    function updateBudgetDisplay(value) {
        const display = document.getElementById('total-budget-display');
        if (display) display.innerText = (value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function submitManualBudget() {
        showConfirm('Are you sure you want to update the budget?', 'Confirm Budget Update', async function() {
            const amountEl = document.getElementById('manual-budget-amount');
            const amount = parseFloat(amountEl.value);
            if (!amount || amount < 0) { alert('Please enter a valid amount.'); return; }
            try {
                const response = await fetch('/api/calendar/budget/update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount })
                });
                const data = await response.json();
                updateBudgetDisplay(data.totalBudget);
                amountEl.value = '';
                closeModal('budgetModal');
                showSuccess('Budget updated successfully!');
            } catch (error) { alert('Update failed'); }
        });
    }

    // ── Empty logic for other modals ──
    function submitToCalendar() {}
    function populateFromSelected() {}
    function approveSuggestion() {}
});