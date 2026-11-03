document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // BARANGAY BUDGET & OPERATING HOURS
    // ============================================
    let BARANGAY_BUDGET = 0;
    const OPERATING_START = '07:00';
    const OPERATING_END = '22:00';

    let dbEvents = {}; 
    let allEvents = [];
    let currentSelectedDate = null;
    let _dayEventsForNotes = [];

    let currentDate = new Date();
    currentDate.setDate(1);
    const isAdmin = document.getElementById('dataCurrentRole')?.value === 'ADMIN';
    let currentView = 'month';

    // ============================================
    // MODAL HELPERS & BINDINGS
    // ============================================
    document.getElementById('sysSuccessOkBtn').addEventListener('click', () => {
        document.getElementById('sysSuccessOverlay').classList.remove('show');
    });
    document.getElementById('sysErrorOkBtn').addEventListener('click', () => {
        document.getElementById('sysErrorOverlay').classList.remove('show');
    });
    document.getElementById('sysConfirmCloseBtn').addEventListener('click', () => {
        document.getElementById('sysConfirmOverlay').classList.remove('show');
    });
    document.getElementById('sysConfirmCancelBtn').addEventListener('click', () => {
        document.getElementById('sysConfirmOverlay').classList.remove('show');
    });

    function showSuccess(message) {
        document.getElementById('sysSuccessMessage').innerHTML = message;
        document.getElementById('sysSuccessOverlay').classList.add('show');
    }

    function showError(message) {
        document.getElementById('sysErrorMessage').innerHTML = message;
        document.getElementById('sysErrorOverlay').classList.add('show');
    }

    function showConfirm(message, title, onConfirm) {
        document.getElementById('sysConfirmTitle').innerHTML = title || 'Confirm Action';
        document.getElementById('sysConfirmMessage').innerHTML = message;
        const overlay = document.getElementById('sysConfirmOverlay');
        overlay.classList.add('show');
        const okBtn = document.getElementById('sysConfirmOkBtn');
        okBtn.onclick = function() {
            overlay.classList.remove('show');
            onConfirm();
        };
    }

    // ============================================
    // STATIC EVENT BINDINGS
    // ============================================
    document.getElementById('nav-prev').addEventListener('click', navPrev);
    document.getElementById('nav-next').addEventListener('click', navNext);
    document.getElementById('btn-month-view').addEventListener('click', () => setView('month'));
    document.getElementById('btn-year-view').addEventListener('click', () => setView('year'));
    document.getElementById('btnExportPDF').addEventListener('click', exportToPDF);
    
    document.getElementById('btnOpenAddEvent')?.addEventListener('click', openAddEventModal);
    document.getElementById('closeAddEventModalBtn').addEventListener('click', closeAddEventModal);
    document.getElementById('btnCancelAddEvent').addEventListener('click', closeAddEventModal);
    document.getElementById('btnSaveEvent').addEventListener('click', saveNewEvent);
    
    document.getElementById('closeViewEventsModalBtn').addEventListener('click', closeViewEventsModal);
    document.getElementById('btnCloseViewEvents').addEventListener('click', closeViewEventsModal);
    document.getElementById('btnAddEventOnDay')?.addEventListener('click', openAddEventModalWithDate);

    document.getElementById('startTime').addEventListener('change', validateEventTimes);
    document.getElementById('endTime').addEventListener('change', validateEventTimes);
    document.getElementById('eventBudget').addEventListener('change', validateBudget);
    document.getElementById('eventDate').addEventListener('change', updateMaxBudgetDisplay);

    // ============================================
    // DATA FETCHING
    // ============================================
    async function loadCurrentBudget() {
        try {
            const response = await fetch('/api/calendar/budget/current');
            const data = await response.json();
            BARANGAY_BUDGET = data.totalBudget || 0;
            updateMaxBudgetDisplay();
        } catch (e) {
            console.error('Failed to load budget:', e);
            BARANGAY_BUDGET = 0;
        }
    }

    async function loadEvents() {
        try {
            const response = await fetch('/api/calendar/all');
            if (!response.ok) return;
            allEvents = await response.json();
            
            dbEvents = {};
            allEvents.forEach(e => {
                const key = e.eventDate;
                if (!dbEvents[key]) dbEvents[key] = [];
                dbEvents[key].push(e);
            });

            if (currentView === 'year') renderYearView(); else renderCalendar();
            renderUpcomingEvents(allEvents);
            updateMaxBudgetDisplay();
        } catch (error) {
            console.error('Failed to load events:', error);
            if (currentView === 'year') renderYearView(); else renderCalendar();
        }
    }

    // ============================================
    // UI HELPERS
    // ============================================
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatTime(timeStr) {
        if (!timeStr) return 'N/A';
        const [hour, minute] = timeStr.split(':').map(Number);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h = hour % 12 || 12;
        return `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-').map(Number);
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${monthNames[month - 1]} ${day}`;
    }

    function formatDateLong(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-').map(Number);
        const monthNames = ['January','February','March','April','May','June',
                            'July','August','September','October','November','December'];
        return `${monthNames[month - 1]} ${day}, ${year}`;
    }

    // ============================================
    // RENDER FUNCTIONS
    // ============================================
    function renderUpcomingEvents(events) {
        const list = document.getElementById('upcoming-events-list');
        if (!events || events.length === 0) {
            list.innerHTML = `<div style="text-align: center; color: #aaa; font-size: 13px; padding: 20px 0;"><i class="bi bi-calendar2-x" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>No events found.</div>`;
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const upcomingEvents = events.filter(e => e.eventDate >= today);
        upcomingEvents.sort((a, b) => a.eventDate.localeCompare(b.eventDate));

        if (upcomingEvents.length === 0) {
            list.innerHTML = `<div style="text-align: center; color: #aaa; font-size: 13px; padding: 20px 0;"><i class="bi bi-calendar2-check" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>No upcoming events.</div>`;
            return;
        }

        list.innerHTML = upcomingEvents.slice(0, 10).map((e, index) => {
            const budgetValue = e.program_budget !== undefined && e.program_budget !== null ? e.program_budget : 0;
            return `
            <div class="event-item">
                <div class="circle-id">${index + 1}</div>
                <div class="event-info">
                    <div class="event-name">${escapeHtml(e.notes || 'Community Program')}</div>
                    <div class="event-time">
                        <i class="bi bi-clock"></i> ${formatTime(e.startTime)}
                        &nbsp;&middot;&nbsp;
                        <i class="bi bi-calendar"></i> ${formatDate(e.eventDate)}
                        &nbsp;&middot;&nbsp;
                        <i class="bi bi-geo-alt"></i> ${escapeHtml(e.location || 'TBD')}
                        ${budgetValue > 0 ? `&nbsp;&middot;&nbsp;<i class="bi bi-cash"></i> &#8369;${budgetValue.toLocaleString()}` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 5px; flex-shrink: 0;">
                    <button class="btn-blue" data-action="view" data-date="${e.eventDate}">View</button>
                    ${isAdmin ? `<button class="btn-red" data-action="delete-list" data-id="${e.id}" data-date="${e.eventDate}" aria-label="Delete event"><i class="bi bi-trash"></i></button>` : ''}
                </div>
            </div>
        `}).join('');

        list.querySelectorAll('[data-action="view"]').forEach(btn => {
            btn.addEventListener('click', (e) => showEventsForDay(e.target.getAttribute('data-date')));
        });
        list.querySelectorAll('[data-action="delete-list"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                deleteEventFromList(e.target.closest('button').getAttribute('data-id'), e.target.closest('button').getAttribute('data-date'));
            });
        });
    }

    function renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const title = document.getElementById('calendar-title');
        grid.querySelectorAll('.cal-day').forEach(c => c.remove());

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const today = new Date();
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        title.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrev = new Date(year, month, 0).getDate();

        for (let i = firstDay - 1; i >= 0; i--) {
            const d = document.createElement('div');
            d.className = 'cal-day other-month';
            d.innerHTML = `<div class="day-number">${daysInPrev - i}</div>`;
            grid.appendChild(d);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateKey = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const dayEvents = dbEvents[dateKey] || [];
            const hasEvent = dayEvents.length > 0;
            const cellDate = new Date(year, month, d);
            const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isPast = cellDate < todayMidnight;

            const div = document.createElement('div');
            div.className = `cal-day${isToday ? ' today' : ''}${hasEvent && !isPast ? ' has-event' : ''}${hasEvent && isPast ? ' past-event' : ''}`;
            div.dataset.date = dateKey;

            let labelsHtml = '';
            if (hasEvent) {
                const maxLabels = 2;
                labelsHtml = dayEvents.slice(0, maxLabels).map(e => `<div class="event-label">${escapeHtml(e.notes || 'Program')}</div>`).join('');
                if (dayEvents.length > maxLabels) {
                    labelsHtml += `<div class="event-label" style="background:#e0f0e8; color:#555;">+${dayEvents.length - maxLabels} more</div>`;
                }
            }

            div.innerHTML = `<div class="day-number">${d}</div>${labelsHtml}`;
            div.addEventListener('click', () => showEventsForDay(dateKey));
            grid.appendChild(div);
        }

        const totalCells = firstDay + daysInMonth;
        const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let i = 1; i <= remaining; i++) {
            const d = document.createElement('div');
            d.className = 'cal-day other-month';
            d.innerHTML = `<div class="day-number">${i}</div>`;
            grid.appendChild(d);
        }
    }

    function renderYearView() {
        const year = currentDate.getFullYear();
        document.getElementById('calendar-title').textContent = `${year}`;
        const container = document.getElementById('year-view');
        container.innerHTML = '';

        const today = new Date();
        const todayY = today.getFullYear(), todayM = today.getMonth(), todayD = today.getDate();
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const dayLetters = ['S','M','T','W','T','F','S'];

        for (let m = 0; m < 12; m++) {
            const isCurrentMonth = year === todayY && m === todayM;
            const firstDay = new Date(year, m, 1).getDay();
            const daysInMonth = new Date(year, m + 1, 0).getDate();
            const daysInPrev = new Date(year, m, 0).getDate();

            let eventCount = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                const key = `${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                if (dbEvents[key] && dbEvents[key].length > 0) eventCount += dbEvents[key].length;
            }

            let cells = [];
            for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, other: true });
            for (let d = 1; d <= daysInMonth; d++) {
                const key = `${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const hasEv = dbEvents[key] && dbEvents[key].length > 0;
                const cellDate = new Date(year, m, d);
                const todayMid = new Date(todayY, todayM, todayD);
                const isPast = cellDate < todayMid;
                const isTodayCell = d === todayD && m === todayM && year === todayY;
                cells.push({ day: d, other: false, hasEv, isPast, isToday: isTodayCell, dateKey: key });
            }
            const rem = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
            for (let i = 1; i <= rem; i++) cells.push({ day: i, other: true });

            let rows = '';
            for (let r = 0; r < cells.length / 7; r++) {
                rows += '<tr>';
                for (let c = 0; c < 7; c++) {
                    const cell = cells[r * 7 + c];
                    let cls = '';
                    if (cell.other) cls = 'other-m';
                    else if (cell.isToday) cls = 'today-m';
                    else if (cell.hasEv && cell.isPast) cls = 'past-ev';
                    else if (cell.hasEv) cls = 'has-ev';
                    const inner = cell.isToday ? `<span>${cell.day}</span>` : cell.day;
                    const onClick = (!cell.other && cell.dateKey) ? `data-date="${cell.dateKey}"` : '';
                    rows += `<td class="${cls}" style="${!cell.other && cell.dateKey ? 'cursor:pointer;' : ''}" ${onClick}>${inner}</td>`;
                }
                rows += '</tr>';
            }

            const headerRow = dayLetters.map(l => `<th>${l}</th>`).join('');
            const miniDiv = document.createElement('div');
            miniDiv.className = `mini-month${isCurrentMonth ? ' current-month' : ''}`;
            miniDiv.innerHTML = `
                <div class="mini-month-header">${monthNames[m]}</div>
                <table class="mini-cal">
                    <thead><tr>${headerRow}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                ${eventCount > 0 ? `<div class="year-event-count"><span>${eventCount} event${eventCount !== 1 ? 's' : ''}</span></div>` : '<div class="year-event-count" style="color:#ddd;">No events</div>'}
            `;
            
            miniDiv.querySelector('.mini-month-header').addEventListener('click', (e) => {
                e.stopPropagation();
                currentDate.setMonth(m);
                setView('month');
            });
            
            miniDiv.querySelectorAll('td[data-date]').forEach(td => {
                td.addEventListener('click', (e) => {
                    showEventsForDay(e.target.getAttribute('data-date'));
                });
            });
            
            container.appendChild(miniDiv);
        }
    }

    // ============================================
    // VIEW LOGIC (SHOW EVENTS, ADD, DELETE)
    // ============================================
    function showEventsForDay(dateKey) {
        currentSelectedDate = dateKey;
        const events = dbEvents[dateKey] || [];
        document.getElementById('viewEventsDate').textContent = formatDateLong(dateKey);
        const container = document.getElementById('viewEventsList');
        const notesPanel = document.getElementById('viewEventsNotesPanel');

        if (events.length === 0) {
            container.innerHTML = `<div class="no-events"><i class="bi bi-calendar-x" style="font-size: 48px; display: block; margin-bottom: 10px;"></i>No events scheduled for this day.</div>`;
            notesPanel.innerHTML = `<div class="notes-panel-empty">No events selected.</div>`;
            _dayEventsForNotes = [];
            document.getElementById('viewEventsModal').style.display = 'block';
            return;
        }

        container.innerHTML = events.map((e, index) => {
            const budgetValue = e.program_budget !== undefined && e.program_budget !== null ? e.program_budget : 0;
            return `
            <div class="event-card${index === 0 ? ' selected' : ''}" id="event-card-${index}" data-index="${index}" style="cursor:pointer;">
                <div class="event-title">
                    <i class="bi bi-calendar-check"></i> ${escapeHtml(e.notes || 'Community Program')}
                </div>
                <div class="event-detail">
                    <i class="bi bi-clock"></i> ${formatTime(e.startTime)} &ndash; ${formatTime(e.endTime)}
                </div>
                <div class="event-detail">
                    <i class="bi bi-geo-alt"></i> ${escapeHtml(e.location || 'TBD')}
                </div>
                <div class="event-detail">
                    <i class="bi bi-cash"></i> &#8369;${budgetValue.toLocaleString()}
                </div>
                ${isAdmin ? `<div class="event-detail" style="margin-top: 10px;">
                    <button class="btn-red btn-delete-day-event" data-id="${e.id}" data-date="${dateKey}" style="padding: 4px 12px;">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>` : ''}
            </div>
        `}).join('');

        _dayEventsForNotes = events;
        selectEventCard(0);
        
        container.querySelectorAll('.event-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if(e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                    selectEventCard(card.getAttribute('data-index'));
                }
            });
        });
        
        container.querySelectorAll('.btn-delete-day-event').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteEvent(btn.getAttribute('data-id'), btn.getAttribute('data-date'));
            });
        });

        document.getElementById('viewEventsModal').style.display = 'block';
    }

    function selectEventCard(index) {
        document.querySelectorAll('#viewEventsList .event-card').forEach((el, i) => {
            el.classList.toggle('selected', i === index);
        });

        const e = _dayEventsForNotes && _dayEventsForNotes[index];
        const notesPanel = document.getElementById('viewEventsNotesPanel');
        const eventTag = document.getElementById('viewEventsNotesEventTag');

        if (e) {
            eventTag.innerHTML = `<div class="notes-panel-current-event"><i class="bi bi-calendar-check"></i><span>${escapeHtml(e.notes || 'Community Program')}</span></div>`;
        } else {
            eventTag.innerHTML = '';
        }

        if (e && e.description) {
            notesPanel.innerHTML = `<div class="notes-panel-body">${escapeHtml(e.description).replace(/\n/g, '<br>')}</div>`;
        } else {
            notesPanel.innerHTML = `<div class="notes-panel-empty">No notes for this event.</div>`;
        }
    }

    function openAddEventModalWithDate() {
        if (currentSelectedDate) {
            document.getElementById('eventDate').value = currentSelectedDate;
        }
        closeViewEventsModal();
        openAddEventModal();
    }

    function closeViewEventsModal() {
        document.getElementById('viewEventsModal').style.display = 'none';
        currentSelectedDate = null;
    }

    function openAddEventModal() {
        const today = new Date().toISOString().split('T')[0];
        if (!document.getElementById('eventDate').value) {
            document.getElementById('eventDate').value = today;
        }
        document.getElementById('eventName').value = '';
        document.getElementById('startTime').value = '09:00';
        document.getElementById('endTime').value = '12:00';
        document.getElementById('eventLocation').value = '';
        document.getElementById('eventBudget').value = 0;
        document.getElementById('eventNotes').value = '';
        document.getElementById('timeError').style.display = 'none';
        document.getElementById('budgetError').style.display = 'none';
        updateMaxBudgetDisplay();
        document.getElementById('addEventModal').style.display = 'block';
    }

    function closeAddEventModal() {
        document.getElementById('addEventModal').style.display = 'none';
    }

    async function saveNewEvent() {
        const eventName = document.getElementById('eventName').value.trim();
        const eventDate = document.getElementById('eventDate').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        const location = document.getElementById('eventLocation').value.trim();
        const budget = parseInt(document.getElementById('eventBudget').value) || 0;
        const notes = document.getElementById('eventNotes').value.trim();

        if (!eventName) { showError('Please enter an event name.'); return; }
        if (!eventDate) { showError('Please select a date.'); return; }
        if (!startTime) { showError('Please select a start time.'); return; }
        if (!endTime) { showError('Please select an end time.'); return; }
        
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(eventDate); selectedDate.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
            showError('Cannot add events on past dates. Please select a future or today\'s date.');
            return;
        }

        if (!validateEventTimes()) return;
        if (!validateBudget()) return;

        if (budget > BARANGAY_BUDGET) {
            showError(`Budget cannot exceed the barangay budget of ₱${BARANGAY_BUDGET.toLocaleString()}`);
            return;
        }

        const totalMonthly = calculateTotalBudgetForMonth(eventDate);
        if (budget + totalMonthly > BARANGAY_BUDGET) {
            const available = BARANGAY_BUDGET - totalMonthly;
            showError(`Budget exceeds available funds. Remaining budget for this month: ₱${available.toLocaleString()}`);
            return;
        }

        if (location) {
            const conflictCheck = checkLocationConflict(eventDate, location, startTime, endTime);
            if (conflictCheck.conflict) {
                const conflictingEvent = conflictCheck.conflictingEvent;
                showError(`Location "${location}" is already booked on ${formatDateLong(eventDate)} from ${formatTime(conflictingEvent.startTime)} to ${formatTime(conflictingEvent.endTime)} for "${conflictingEvent.notes || 'Community Program'}".\n\nPlease choose a different time, date, or location.`);
                return;
            }
        }

        const eventData = {
            notes: eventName,
            description: notes,
            eventDate: eventDate,
            startTime: startTime,
            endTime: endTime,
            location: location || 'TBD',
            program_budget: budget,
            programId: 1
        };

        try {
            const response = await fetch('/api/calendar/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });

            if (response.ok) {
                showSuccess('Event added successfully!');
                closeAddEventModal();
                loadEvents();
                loadCurrentBudget();
            } else {
                const error = await response.text();
                showError('Failed to add event: ' + error);
            }
        } catch (error) {
            console.error('Error adding event:', error);
            showError('Error adding event. Please try again.');
        }
    }

    function deleteEventFromList(eventId, dateKey) {
        showConfirm('Are you sure you want to delete this event?', 'Confirm Delete', async function() {
            try {
                const response = await fetch(`/api/calendar/${eventId}`, { method: 'DELETE' });
                if (response.ok) {
                    showSuccess('Event deleted successfully!');
                    loadEvents();
                } else {
                    showError('Failed to delete event. Please try again.');
                }
            } catch (error) {
                console.error('Error deleting event:', error);
                showError('Error deleting event. Please try again.');
            }
        });
    }

    function deleteEvent(eventId, dateKey) {
        showConfirm('Are you sure you want to delete this event?', 'Confirm Delete', async function() {
            try {
                const response = await fetch(`/api/calendar/${eventId}`, { method: 'DELETE' });
                if (response.ok) {
                    showSuccess('Event deleted successfully!');
                    loadEvents();
                    closeViewEventsModal();
                } else {
                    showError('Failed to delete event. Please try again.');
                }
            } catch (error) {
                console.error('Error deleting event:', error);
                showError('Error deleting event. Please try again.');
            }
        });
    }

    // ============================================
    // VALIDATION LOGIC
    // ============================================
    function validateEventTimes() {
        const start = document.getElementById('startTime').value;
        const end = document.getElementById('endTime').value;
        const errorEl = document.getElementById('timeError');
        
        if (!start || !end) { errorEl.style.display = 'none'; return true; }
        if (start < OPERATING_START || start > OPERATING_END) {
            errorEl.textContent = `Start time must be between ${OPERATING_START} and ${OPERATING_END}`;
            errorEl.style.display = 'block'; return false;
        }
        if (end < OPERATING_START || end > OPERATING_END) {
            errorEl.textContent = `End time must be between ${OPERATING_START} and ${OPERATING_END}`;
            errorEl.style.display = 'block'; return false;
        }
        if (start >= end) {
            errorEl.textContent = 'End time must be after start time';
            errorEl.style.display = 'block'; return false;
        }
        errorEl.style.display = 'none'; return true;
    }

    function validateBudget() {
        const budget = parseInt(document.getElementById('eventBudget').value) || 0;
        const errorEl = document.getElementById('budgetError');
        
        if (budget < 0) {
            errorEl.textContent = 'Budget cannot be negative';
            errorEl.style.display = 'block'; return false;
        }

        const date = document.getElementById('eventDate').value;
        if (date) {
            const totalBudget = calculateTotalBudgetForMonth(date);
            if (budget + totalBudget > BARANGAY_BUDGET) {
                const available = BARANGAY_BUDGET - totalBudget;
                errorEl.textContent = `Budget exceeds available funds. Remaining budget: ₱${available.toLocaleString()}`;
                errorEl.style.display = 'block'; return false;
            }
        }

        if (budget > BARANGAY_BUDGET) {
            errorEl.textContent = `Budget cannot exceed the barangay budget of ₱${BARANGAY_BUDGET.toLocaleString()}`;
            errorEl.style.display = 'block'; return false;
        }
        errorEl.style.display = 'none'; return true;
    }

    function calculateTotalBudgetForMonth(dateStr) {
        if (!dateStr) return 0;
        const [year, month] = dateStr.split('-').map(Number);
        let total = 0;
        allEvents.forEach(e => {
            if (!e.eventDate) return;
            const [y, m] = e.eventDate.split('-').map(Number);
            if (y === year && m === month) total += e.program_budget || 0;
        });
        return total;
    }

    function updateMaxBudgetDisplay() {
        const date = document.getElementById('eventDate').value;
        let totalUsed = 0;
        if (date) totalUsed = calculateTotalBudgetForMonth(date);
        const available = BARANGAY_BUDGET - totalUsed;
        document.getElementById('maxBudgetDisplay').textContent = `₱${available.toLocaleString()}`;
    }

    function checkLocationConflict(eventDate, location, startTime, endTime, excludeEventId) {
        const dayEvents = dbEvents[eventDate] || [];
        for (let event of dayEvents) {
            if (excludeEventId && event.id === excludeEventId) continue;
            if (event.location && event.location.toLowerCase() === location.toLowerCase()) {
                const existingStart = event.startTime || '00:00';
                const existingEnd = event.endTime || '23:59';
                const newStart = startTime || '00:00';
                const newEnd = endTime || '23:59';
                if (newStart < existingEnd && newEnd > existingStart) {
                    return { conflict: true, conflictingEvent: event };
                }
            }
        }
        return { conflict: false };
    }

    // ============================================
    // NAVIGATION & VIEW TOGGLES
    // ============================================
    function setView(view) {
        currentView = view;
        document.getElementById('btn-month-view').classList.toggle('active', view === 'month');
        document.getElementById('btn-year-view').classList.toggle('active', view === 'year');
        document.getElementById('calendar-grid').style.display = view === 'month' ? 'grid' : 'none';
        document.getElementById('year-view').style.display = view === 'year' ? 'grid' : 'none';
        if (view === 'month') renderCalendar(); else renderYearView();
    }

    function navPrev() {
        if (currentView === 'month') changeMonth(-1);
        else changeYear(-1);
    }
    function navNext() {
        if (currentView === 'month') changeMonth(1);
        else changeYear(1);
    }
    function changeMonth(dir) {
        currentDate.setMonth(currentDate.getMonth() + dir);
        renderCalendar();
    }
    function changeYear(dir) {
        currentDate.setFullYear(currentDate.getFullYear() + dir);
        renderYearView();
    }

    // ============================================
    // PDF EXPORT
    // ============================================
    async function exportToPDF() {
        const exportedBy = document.getElementById('currentUserName')?.value || 'Unknown User';
        const format = document.getElementById('exportFormat').value;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthNamesAll = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const dayNamesShort = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const currentMonthYear = `${monthNamesAll[month]} ${year}`;
        const todayStr = new Date().toISOString().split('T')[0];
        const upcomingEvents = allEvents.filter(e => e.eventDate >= todayStr).sort((a, b) => a.eventDate.localeCompare(b.eventDate));

        function buildCalendarGrid() {
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const daysInPrev = new Date(year, month, 0).getDate();
            const todayObj = new Date();

            const headerCells = dayNamesShort.map(d => `<th style="background:#2d4a44;color:white;padding:8px 4px;font-size:11px;font-weight:bold;text-align:center;border:1px solid #1a3530;">${d}</th>`).join('');
            let cells = [];
            for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, otherMonth: true });
            
            for (let d = 1; d <= daysInMonth; d++) {
                const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const isToday = d === todayObj.getDate() && month === todayObj.getMonth() && year === todayObj.getFullYear();
                const cellDate = new Date(year, month, d);
                const todayMidnight = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
                const isPast = cellDate < todayMidnight;
                cells.push({ day: d, otherMonth: false, isToday, isPast, events: dbEvents[dateKey] || [] });
            }
            
            const rem = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
            for (let i = 1; i <= rem; i++) cells.push({ day: i, otherMonth: true });

            let rows = '';
            for (let r = 0; r < cells.length / 7; r++) {
                let row = '<tr>';
                for (let c = 0; c < 7; c++) {
                    const cell = cells[r * 7 + c];
                    let bg = cell.otherMonth ? '#f9f9f9' : 'white';
                    if (!cell.otherMonth) {
                        if (cell.isPast && cell.events && cell.events.length > 0) bg = '#e8e8e8';
                        else if (cell.events && cell.events.length > 0 && !cell.isPast) bg = '#f0faf5';
                    }
                    const color = cell.otherMonth ? '#bbb' : '#222';
                    const numStyle = cell.isToday ? 'display:inline-block;background:#FED734;color:#2d4a44;border-radius:50%;width:20px;height:20px;line-height:20px;text-align:center;font-weight:bold;font-size:11px;' : 'font-size:11px;font-weight:bold;';
                    
                    let eventLabels = '';
                    if (cell.events && cell.events.length > 0) {
                        const isPastEvent = cell.isPast === true;
                        const labelBg = isPastEvent ? '#c0c0c0' : '#c8f0dc';
                        const labelColor = isPastEvent ? '#555' : '#0f6e56';
                        cell.events.slice(0, 2).forEach(e => {
                            eventLabels += `<div style="background:${labelBg};color:${labelColor};font-size:8px;border-radius:2px;padding:1px 3px;margin-top:2px;line-height:1.3;word-break:break-word;">${escapeHtml(e.notes || 'Program')}</div>`;
                        });
                        if (cell.events.length > 2) eventLabels += `<div style="font-size:8px;color:#888;margin-top:1px;">+${cell.events.length - 2} more</div>`;
                    }
                    row += `<td style="border:1px solid #ddd;padding:5px 4px;vertical-align:top;background:${bg};color:${color};width:14.28%;height:70px;overflow:hidden;"><div style="${numStyle}">${cell.day}</div>${eventLabels}</td>`;
                }
                row += '</tr>';
                rows += row;
            }
            return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;
        }

        function buildEventsTable() {
            if (upcomingEvents.length === 0) return `<p style="color:#888;text-align:center;padding:20px 0;">No upcoming events scheduled.</p>`;
            const rows = upcomingEvents.map((e, i) => {
                const budget = e.program_budget !== undefined && e.program_budget !== null ? e.program_budget : 0;
                const bg = i % 2 === 0 ? 'white' : '#f5faf8';
                return `<tr style="background:${bg};">
                    <td style="border:1px solid #ddd;padding:7px 8px;text-align:center;font-size:11px;">${i + 1}</td>
                    <td style="border:1px solid #ddd;padding:7px 8px;font-size:11px;font-weight:bold;">${escapeHtml(e.notes || 'Community Program')}</td>
                    <td style="border:1px solid #ddd;padding:7px 8px;font-size:11px;">${formatDateLong(e.eventDate)}</td>
                    <td style="border:1px solid #ddd;padding:7px 8px;font-size:11px;">${formatTime(e.startTime)} &ndash; ${formatTime(e.endTime)}</td>
                    <td style="border:1px solid #ddd;padding:7px 8px;font-size:11px;">${escapeHtml(e.location || 'TBD')}</td>
                    <td style="border:1px solid #ddd;padding:7px 8px;font-size:11px;text-align:right;">&#8369;${budget.toLocaleString()}</td>
                 </tr>`;
            }).join('');
            return `<table style="width:100%;border-collapse:collapse;margin-top:8px;"><thead><tr>
                        <th style="background:#2d4a44;color:white;padding:8px;font-size:11px;border:1px solid #1a3530;width:4%;">#</th>
                        <th style="background:#2d4a44;color:white;padding:8px;font-size:11px;border:1px solid #1a3530;width:28%;">Event Name</th>
                        <th style="background:#2d4a44;color:white;padding:8px;font-size:11px;border:1px solid #1a3530;width:20%;">Date</th>
                        <th style="background:#2d4a44;color:white;padding:8px;font-size:11px;border:1px solid #1a3530;width:18%;">Time</th>
                        <th style="background:#2d4a44;color:white;padding:8px;font-size:11px;border:1px solid #1a3530;width:18%;">Location</th>
                        <th style="background:#2d4a44;color:white;padding:8px;font-size:11px;border:1px solid #1a3530;width:12%;text-align:right;">Budget</th>
                    </tr></thead><tbody>${rows}</tbody></table>`;
        }

        let bodyContent = `
        <div style="text-align:center;padding-bottom:16px;margin-bottom:24px;border-bottom:3px solid #2d4a44;">
            <div style="display:inline-flex;align-items:center;gap:6px;margin-bottom:4px;">
                <img src="/images/seal1.png" alt="Barangay Seal" style="width:50px;height:50px;object-fit:contain;">
                <span style="font-size:15px;text-transform:uppercase;letter-spacing:2px;color:#888;">CivilAccess Web System</span>
            </div>
            <div style="font-size:22px;font-weight:bold;color:#2d4a44;margin-bottom:4px;">Program Calendar</div>
            <div style="font-size:13px;color:#555;">${currentMonthYear}</div>
            <div style="font-size:9px;color:#aaa;margin-top:6px;">Generated on: ${new Date().toLocaleString()}</div>
            <div style="font-size:9px;color:#aaa;margin-top:2px;">Exported by: <strong style="color:#666;">${exportedBy}</strong></div>
        </div>`;

        if (format === 'both') {
            bodyContent += `
                <div style="margin-bottom:28px;">
                    <div style="font-size:13px;font-weight:bold;color:#2d4a44;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #ddd;"> ${currentMonthYear}</div>
                    ${buildCalendarGrid()}
                </div>
                <div>
                    <div style="font-size:13px;font-weight:bold;color:#2d4a44;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #ddd;"> Upcoming Events <span style="font-weight:normal;font-size:11px;color:#888;">(${upcomingEvents.length} event${upcomingEvents.length !== 1 ? 's' : ''} scheduled)</span></div>
                    ${buildEventsTable()}
                </div>`;
        } else if (format === 'events') {
            bodyContent += `
                <div>
                    <div style="font-size:13px;font-weight:bold;color:#2d4a44;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #ddd;"> Upcoming Events <span style="font-weight:normal;font-size:11px;color:#888;">(${upcomingEvents.length} event${upcomingEvents.length !== 1 ? 's' : ''} scheduled)</span></div>
                    ${buildEventsTable()}
                </div>`;
        }

        bodyContent += `<div style="margin-top:30px;padding-top:12px;border-top:1px solid #e0e0e0;text-align:center;font-size:9px;color:#aaa;">Official document from Brgy. San Sebastian &nbsp;|&nbsp; Confidential</div>`;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'font-family:Arial,sans-serif;padding:36px;background:white;color:#222;';
        wrapper.innerHTML = bodyContent;

        const opt = {
            margin: [0.3, 0.3, 0.3, 0.3],
            filename: `Barangay_Calendar_${currentMonthYear.replace(/ /g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        const exportBtn = document.getElementById('btnExportPDF');
        const originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Generating...';
        exportBtn.disabled = true;

        try {
            await html2pdf().set(opt).from(wrapper).save();
        } catch (error) {
            console.error('PDF generation error:', error);
            showError('Error generating PDF. Please try again.');
        } finally {
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }
    }

    // ============================================
    // POLLING
    // ============================================
    function isModalOpen() {
        let ids = ['addEventModal','viewEventsModal','forcePasswordModal','logoutModal'];
        for (let i = 0; i < ids.length; i++) {
            let m = document.getElementById(ids[i]);
            if (m && m.style.display === 'block') return true;
        }
        return false;
    }
    let lastSnapshot = '';
    function poll() {
        if (isModalOpen()) return;
        let xhr = new XMLHttpRequest();
        xhr.open('GET', '/api/calendar/poll?t=' + Date.now(), true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    let data = JSON.parse(xhr.responseText);
                    let snapshot = JSON.stringify(data);
                    if (lastSnapshot === '') lastSnapshot = snapshot;
                    else if (snapshot !== lastSnapshot) { loadEvents(); lastSnapshot = snapshot; }
                } catch(e) {}
            }
        };
        xhr.send();
    }

    // ============================================
    // INITIAL LOAD
    // ============================================
    loadCurrentBudget().then(() => { loadEvents(); });
    setTimeout(function() { poll(); setInterval(poll, 5000); }, 2000);
});