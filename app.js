// Main Application Logic for Intern Case Playbook & FAQ Hub

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let casesData = [...INITIAL_CASES];
  let bookmarks = JSON.parse(localStorage.getItem('intern_cases_bookmarks') || '[]');
  let customCases = JSON.parse(localStorage.getItem('intern_cases_custom') || '[]');
  
  // Combine Initial and Custom Cases
  casesData = [...customCases, ...INITIAL_CASES];

  let currentCategory = 'all';
  let currentSeverity = 'all';
  let currentSearchQuery = '';
  let showOnlyBookmarks = false;

  // DOM Elements
  const casesContainer = document.getElementById('cases-list-container');
  const templatesContainer = document.getElementById('templates-list-container');
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const totalCountEl = document.getElementById('total-cases-count');
  const bookmarkCountBadge = document.getElementById('bookmark-count-badge');
  const categoryPills = document.querySelectorAll('.pill-btn');
  const severityChips = document.querySelectorAll('.severity-chip');
  const btnToggleBookmarks = document.getElementById('btn-toggle-bookmarks');
  const btnToggleTheme = document.getElementById('btn-toggle-theme');
  const themeIcon = document.getElementById('theme-icon');

  // Modal Elements
  const addCaseModal = document.getElementById('add-case-modal');
  const btnOpenAddModal = document.getElementById('btn-open-add-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const addCaseForm = document.getElementById('add-case-form');

  // Initialize App Theme
  initTheme();

  // Render Initial Data
  renderCases();
  renderTemplates();
  updateBookmarkBadge();

  // Event Listeners
  // 1. Live Search
  searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.trim().toLowerCase();
    searchClear.style.display = currentSearchQuery ? 'block' : 'none';
    renderCases();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    searchClear.style.display = 'none';
    searchInput.focus();
    renderCases();
  });

  // 2. Category Filter Pills
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.dataset.category;
      renderCases();
    });
  });

  // 3. Severity Filter Chips
  severityChips.forEach(chip => {
    chip.addEventListener('click', () => {
      severityChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentSeverity = chip.dataset.severity;
      renderCases();
    });
  });

  // 4. Bookmark Toggle Filter
  btnToggleBookmarks.addEventListener('click', () => {
    showOnlyBookmarks = !showOnlyBookmarks;
    btnToggleBookmarks.classList.toggle('btn-primary', showOnlyBookmarks);
    btnToggleBookmarks.classList.toggle('btn-secondary', !showOnlyBookmarks);
    renderCases();
  });

  // 5. Modal Handlers
  btnOpenAddModal.addEventListener('click', () => addCaseModal.classList.add('active'));
  btnCloseModal.addEventListener('click', () => addCaseModal.classList.remove('active'));
  btnCancelModal.addEventListener('click', () => addCaseModal.classList.remove('active'));
  addCaseModal.addEventListener('click', (e) => {
    if (e.target === addCaseModal) addCaseModal.classList.remove('active');
  });

  // 6. Submit Add Case Form
  addCaseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('case-title').value.trim();
    const category = document.getElementById('case-category').value;
    const severity = document.getElementById('case-severity').value;
    const summary = document.getElementById('case-summary').value.trim();
    const stepsRaw = document.getElementById('case-steps').value.trim();
    const snippetCode = document.getElementById('case-snippet').value.trim();

    const actionSteps = stepsRaw.split('\n').filter(s => s.trim().length > 0);

    const newCase = {
      id: 'custom-' + Date.now(),
      title,
      category,
      severity,
      tags: ['custom', category],
      summary,
      problemContext: summary,
      actionSteps,
      dosAndDonts: {
        dos: ['Selalu konfirmasi perbaikan dengan mentor.'],
        donts: ['Jangan ragu bertanya jika masih terkendala.']
      },
      snippets: snippetCode ? [{ label: 'Command / Code Snippet', code: snippetCode }] : []
    };

    customCases.unshift(newCase);
    localStorage.setItem('intern_cases_custom', JSON.stringify(customCases));
    casesData = [...customCases, ...INITIAL_CASES];

    addCaseForm.reset();
    addCaseModal.classList.remove('active');
    showToast('Case magang baru berhasil disimpan!');
    renderCases();
  });

  // 7. Theme Toggle
  btnToggleTheme.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('intern_app_theme', newTheme);
    updateThemeIcon(newTheme);
  });

  function initTheme() {
    const savedTheme = localStorage.getItem('intern_app_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function updateThemeIcon(theme) {
    if (theme === 'dark') {
      themeIcon.className = 'fa-solid fa-moon';
    } else {
      themeIcon.className = 'fa-solid fa-sun';
    }
  }

  // Core Render Functions
  function renderCases() {
    const filtered = casesData.filter(item => {
      // Search filter
      const matchSearch = !currentSearchQuery || 
        item.title.toLowerCase().includes(currentSearchQuery) ||
        item.summary.toLowerCase().includes(currentSearchQuery) ||
        item.tags.some(t => t.toLowerCase().includes(currentSearchQuery)) ||
        item.actionSteps.some(s => s.toLowerCase().includes(currentSearchQuery));

      // Category filter
      const matchCategory = currentCategory === 'all' || item.category === currentCategory;

      // Severity filter
      const matchSeverity = currentSeverity === 'all' || item.severity === currentSeverity;

      // Bookmark filter
      const matchBookmark = !showOnlyBookmarks || bookmarks.includes(item.id);

      return matchSearch && matchCategory && matchSeverity && matchBookmark;
    });

    totalCountEl.textContent = filtered.length;

    if (filtered.length === 0) {
      casesContainer.innerHTML = `
        <div style="text-align: center; padding: 48px 24px; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg);">
          <i class="fa-solid fa-folder-open" style="font-size: 3rem; color: var(--text-sub); margin-bottom: 16px;"></i>
          <h3 style="font-size: 1.1rem; margin-bottom: 8px;">Tidak Ada Case Yang Ditemukan</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 400px; margin: 0 auto;">
            Coba ganti kata kunci pencarian atau reset filter kategori & severity yang sedang aktif.
          </p>
        </div>
      `;
      return;
    }

    casesContainer.innerHTML = filtered.map(item => {
      const isBookmarked = bookmarks.includes(item.id);
      const severityClass = `chip-${item.severity}`;
      const severityLabel = item.severity === 'high' ? 'High / Blocker' : (item.severity === 'medium' ? 'Medium' : 'Low / Tip');
      const categoryLabel = getCategoryLabel(item.category);

      const stepsHtml = item.actionSteps.map((step, idx) => `
        <li class="step-item">
          <span class="step-num">${idx + 1}</span>
          <span class="step-text">${formatMarkdownText(step)}</span>
        </li>
      `).join('');

      const dosHtml = item.dosAndDonts?.dos ? item.dosAndDonts.dos.map(d => `<li>${formatMarkdownText(d)}</li>`).join('') : '';
      const dontsHtml = item.dosAndDonts?.donts ? item.dosAndDonts.donts.map(d => `<li>${formatMarkdownText(d)}</li>`).join('') : '';

      const snippetsHtml = item.snippets && item.snippets.length > 0 ? item.snippets.map(snip => `
        <div class="code-block" style="margin-top: 12px;">
          <div class="code-header">
            <span><i class="fa-solid fa-terminal"></i> ${escapeHtml(snip.label)}</span>
            <button class="btn-copy-code" data-code="${escapeHtml(snip.code)}">
              <i class="fa-solid fa-copy"></i> Copy Snippet
            </button>
          </div>
          <pre><code>${escapeHtml(snip.code)}</code></pre>
        </div>
      `).join('') : '';

      return `
        <article class="case-card" id="card-${item.id}">
          <div class="case-header" onclick="toggleAccordion('${item.id}')">
            <div class="case-header-content">
              <div class="case-badges">
                <span class="badge-category">${categoryLabel}</span>
                <span class="badge-severity ${severityClass}">${severityLabel}</span>
              </div>
              <h3 class="case-title">${escapeHtml(item.title)}</h3>
              <p class="case-summary">${formatMarkdownText(item.summary)}</p>
            </div>
            
            <div class="case-actions-right">
              <button class="btn-bookmark ${isBookmarked ? 'bookmarked' : ''}" 
                      onclick="event.stopPropagation(); toggleBookmark('${item.id}')" 
                      title="${isBookmarked ? 'Hapus Bookmark' : 'Simpan ke Favorit'}">
                <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
              </button>
              <i class="fa-solid fa-chevron-down accordion-chevron"></i>
            </div>
          </div>

          <div class="case-detail">
            <div class="case-detail-inner">
              
              <!-- Context Box -->
              <div class="section-box">
                <div class="section-label"><i class="fa-solid fa-circle-info"></i> Konteks Masalah</div>
                <p style="font-size: 0.925rem; color: var(--text-main);">${formatMarkdownText(item.problemContext || item.summary)}</p>
              </div>

              <!-- Steps Box -->
              <div class="section-box">
                <div class="section-label"><i class="fa-solid fa-list-check"></i> Langkah Penanganan Bertahap (SOP)</div>
                <ul class="steps-list">
                  ${stepsHtml}
                </ul>
              </div>

              <!-- Code Snippets if any -->
              ${snippetsHtml}

              <!-- Dos and Donts -->
              ${dosHtml || dontsHtml ? `
                <div class="dos-donts-grid">
                  ${dosHtml ? `
                    <div class="dos-box">
                      <div class="box-title"><i class="fa-solid fa-circle-check"></i> Yang SEBAIKNYA Dilakukan (Do's)</div>
                      <ul class="box-list">${dosHtml}</ul>
                    </div>
                  ` : ''}

                  ${dontsHtml ? `
                    <div class="donts-box">
                      <div class="box-title"><i class="fa-solid fa-circle-xmark"></i> Yang HINDARI (Don'ts)</div>
                      <ul class="box-list">${dontsHtml}</ul>
                    </div>
                  ` : ''}
                </div>
              ` : ''}

            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach copy snippet event listeners
    document.querySelectorAll('.btn-copy-code').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = btn.getAttribute('data-code');
        navigator.clipboard.writeText(code);
        showToast('Snippet kode berhasil di-copy!');
      });
    });
  }

  function renderTemplates() {
    templatesContainer.innerHTML = COMMUNICATION_TEMPLATES.map(tpl => `
      <div class="template-item">
        <div class="template-item-title">
          <span>${escapeHtml(tpl.title)}</span>
          <button class="btn-copy-code" data-template="${escapeHtml(tpl.content)}" title="Copy template">
            <i class="fa-solid fa-copy"></i>
          </button>
        </div>
        <div class="template-preview">${escapeHtml(tpl.content)}</div>
      </div>
    `).join('');

    // Copy template listeners
    templatesContainer.querySelectorAll('.btn-copy-code').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-template');
        navigator.clipboard.writeText(text);
        showToast('Template chat berhasil di-copy!');
      });
    });
  }

  // Global Helpers attached to window for inline onclick handlers
  window.toggleAccordion = function(caseId) {
    const card = document.getElementById(`card-${caseId}`);
    if (card) {
      card.classList.toggle('expanded');
    }
  };

  window.toggleBookmark = function(caseId) {
    if (bookmarks.includes(caseId)) {
      bookmarks = bookmarks.filter(id => id !== caseId);
      showToast('Dihapus dari Favorit');
    } else {
      bookmarks.push(caseId);
      showToast('Disimpan ke Favorit');
    }
    localStorage.setItem('intern_cases_bookmarks', JSON.stringify(bookmarks));
    updateBookmarkBadge();
    renderCases();
  };

  function updateBookmarkBadge() {
    bookmarkCountBadge.textContent = bookmarks.length;
  }

  function getCategoryLabel(cat) {
    switch (cat) {
      case 'hardware': return 'Hardware & Laptop Setup';
      case 'git': return 'Git & Version Control';
      case 'backend': return 'Backend & API';
      case 'environment': return 'Environment Setup';
      case 'workplace': return 'Workplace SOP';
      case 'devops': return 'CI/CD & Deploy';
      default: return cat;
    }
  }

  function showToast(message) {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatMarkdownText(text) {
    if (!text) return '';
    let escaped = escapeHtml(text);
    // Inline code `code`
    escaped = escaped.replace(/`([^`]+)`/g, '<code style="background: rgba(99, 102, 241, 0.15); color: #a5b4fc; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.85em;">$1</code>');
    // Bold **text**
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return escaped;
  }
});
