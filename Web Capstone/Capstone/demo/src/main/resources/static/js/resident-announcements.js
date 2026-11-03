document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // MODAL LOGIC
    // ============================================
    const overlay = document.getElementById('overlay');
    const btnCloseModal = document.getElementById('btnCloseModal');

    function openModal(card) {
        const title    = card.dataset.title    || '';
        const content  = card.dataset.content  || '';
        const date     = card.dataset.date     || '';
        const image    = card.dataset.image    || '';
        const priority = (card.dataset.priority || 'NORMAL').toUpperCase();
        const badgeClass = priority === 'HIGH' ? 'badge-high' : 'badge-normal';

        let dateFormatted = 'N/A';
        if (date) {
            try {
                dateFormatted = new Date(date).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
            } catch(e) { dateFormatted = date; }
        }

        const imgHtml = image
            ? `<img class="m-img" src="${escHtml(image)}" alt="Announcement image" onerror="this.style.display='none'">`
            : '';

        document.getElementById('modalContent').innerHTML = `
            <div class="m-head">
                <div class="avatar" style="background:var(--brand-dark);color:var(--gold);border:2px solid rgba(56,102,96,.15)">
                    <i class="bi bi-megaphone-fill"></i>
                </div>
                <div class="head-meta">
                    <div class="sender">Barangay Official</div>
                    <div class="post-dt">${escHtml(dateFormatted)}</div>
                </div>
                <span class="badge ${badgeClass}">${escHtml(priority)}</span>
            </div>
            <div class="m-title">${escHtml(title)}</div>
            <div class="m-body">${escHtml(content)}</div>
            ${imgHtml}
            <div class="m-foot">
                <div class="m-foot-left">
                    <i class="bi bi-info-circle"></i> Official Barangay Announcement
                </div>
                <button class="btn-close-m" id="btnCloseModalFooter">Close</button>
            </div>
        `;

        document.getElementById('btnCloseModalFooter').addEventListener('click', closeModal);
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    btnCloseModal.addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
    });

    // Event Delegation for the static cards
    document.getElementById('feed').addEventListener('click', function(e) {
        const btn = e.target.closest('.btn-open-modal');
        if (btn) {
            const cardId = btn.getAttribute('data-card-id');
            const card = document.getElementById(cardId);
            if (card) openModal(card);
        }
    });

    // ============================================
    // HELPERS
    // ============================================
    function escHtml(str) {
        if (!str) return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function thumbUrl(url) {
        return 'https://wsrv.nl/?url=' + encodeURIComponent(url) + '&w=800&q=70&output=webp';
    }

    // ============================================
    // FILTERS & SEARCH
    // ============================================
    let currentFilter = 'all';
    let currentSearch = '';

    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            applyFilters();
        });
    });

    document.getElementById('searchInput').addEventListener('input', function() {
        currentSearch = this.value.toLowerCase().trim();
        applyFilters();
    });

    function applyFilters() {
        const cards = document.querySelectorAll('#feed .card');
        let anyVisible = false;

        cards.forEach(card => {
            const priority = (card.dataset.priority || 'NORMAL').toUpperCase();
            const text = ((card.dataset.title || '') + ' ' + (card.dataset.content || '')).toLowerCase();

            const matchesFilter =
                currentFilter === 'all'    ? true :
                currentFilter === 'HIGH'   ? priority === 'HIGH' :
                currentFilter === 'NORMAL' ? priority === 'NORMAL' : true;

            const matchesSearch = !currentSearch || text.includes(currentSearch);

            const show = matchesFilter && matchesSearch;
            card.style.display = show ? '' : 'none';
            if (show) anyVisible = true;
        });

        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.style.display = anyVisible ? 'none' : 'block';
    }

    // ============================================
    // POLLING
    // ============================================
    let lastEtag = null;

    async function pollFeed() {
        try {
            const res = await fetch('/resident/announcements/api/feed?t=' + Date.now());
            if (!res.ok) return;
            const data = await res.json();
            const etag = JSON.stringify(data.map(a => a.id + ':' + a.datePosted + ':' + a.priority + ':' + a.status));
            if (etag === lastEtag) return;
            const isFirstPoll = (lastEtag === null);
            lastEtag = etag;

            if (isFirstPoll) {
                const domIds  = Array.from(document.querySelectorAll('#feed .card')).map(c => c.dataset.id).join(',');
                const dataIds = data.map(a => String(a.id)).join(',');
                if (domIds === dataIds) return;
            }

            rebuildFeed(data);
        } catch(e) { /* silent */ }
    }

    function rebuildFeed(announcements) {
        document.querySelectorAll('#feed .card').forEach(c => c.remove());
        const feed = document.getElementById('feed');
        const emptyState = document.getElementById('emptyState');
        announcements.forEach(a => feed.insertBefore(buildCard(a), emptyState));
        applyFilters();
    }

    function buildCard(a) {
        const isHigh   = (a.priority || '').toUpperCase() === 'HIGH';
        const priority = (a.priority || 'NORMAL').toUpperCase();
        const content  = a.content || '';
        const clamp    = content.length > 280;

        let dateStr = 'N/A';
        if (a.datePosted) {
            try {
                const d = new Date(a.datePosted);
                dateStr = d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });
            } catch(e) {}
        }

        const imgHtml = a.image
            ? `<img class="card-img" loading="lazy" src="${escHtml(thumbUrl(a.image))}" data-orig="${escHtml(a.image)}" alt="Announcement image" onerror="if(!this.dataset.f){this.dataset.f=1;this.src=this.dataset.orig;}else{this.style.display='none'}">`
            : `<div class="no-img"><i class="bi bi-image"></i><span>No image attached</span></div>`;

        const article = document.createElement('article');
        article.id            = 'card-' + a.id;
        article.className     = 'card' + (isHigh ? ' pinned' : '');
        article.dataset.id       = a.id;
        article.dataset.priority = priority;
        article.dataset.title    = a.title || '';
        article.dataset.content  = content;
        article.dataset.date     = a.datePosted || '';
        article.dataset.image    = a.image || '';

        article.innerHTML = `
            <div class="card-head">
                <div class="avatar"><i class="bi bi-megaphone-fill"></i></div>
                <div class="head-meta">
                    <div class="sender">Barangay Official</div>
                    <div class="post-dt">${escHtml(dateStr)}</div>
                </div>
                <span class="badge ${isHigh ? 'badge-high' : 'badge-normal'}">${escHtml(priority)}</span>
            </div>
            <div class="card-title">${escHtml(a.title || '')}</div>
            <div class="card-body${clamp ? ' clamped' : ''}">${escHtml(content)}</div>
            ${clamp ? `<button class="read-more btn-open-modal" data-card-id="card-${a.id}">Read more…</button>` : ''}
            ${imgHtml}
            <div class="card-foot">
                <div class="foot-left"></div>
                <button class="view-btn btn-open-modal" data-card-id="card-${a.id}">
                    View full <i class="bi bi-arrow-right-short"></i>
                </button>
            </div>
        `;
        return article;
    }

    setInterval(pollFeed, 5000);
});