// ESB Case — Quiet Modern SaaS App Logic & Markdown Renderer

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------
  // Application State
  // --------------------------------------------------
  let customCases = JSON.parse(localStorage.getItem('intern_cases_custom') || '[]');
  let casesData = [...customCases, ...INITIAL_CASES];
  let bookmarks = JSON.parse(localStorage.getItem('intern_cases_bookmarks') || '[]');
  
  let currentView = 'home'; // 'home', 'all', 'bookmarks', 'templates'
  let currentCategory = 'all'; // 'all', 'hardware', 'git', etc.
  let currentSeverity = 'all';
  let currentSearchQuery = '';
  let selectedCaseId = casesData.length > 0 ? casesData[0].id : null;
  let recentSearches = JSON.parse(localStorage.getItem('intern_cases_recent') || '[]');

  // --------------------------------------------------
  // DOM Elements
  // --------------------------------------------------
  const paneCases = document.getElementById('pane-cases');
  const paneTemplates = document.getElementById('pane-templates');
  const paneHome = document.getElementById('pane-home');

  const appHeader = document.getElementById('app-header');
  const filterBar = document.getElementById('filter-bar');
  const mobileBottomNav = document.getElementById('mobile-bottom-nav');

  const masterListContainer = document.getElementById('case-list-master');
  const readerContainer = document.getElementById('detail-pane-reader');
  const templatesGridContainer = document.getElementById('templates-grid-container');

  const navTabs = document.querySelectorAll('.nav-tab');
  const catTabs = document.querySelectorAll('.cat-tab');
  const severitySelect = document.getElementById('severity-select');
  const bottomNavItems = document.querySelectorAll('.bottom-nav-item');

  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear');

  // Home / Landing elements
  const homeSearchInput = document.getElementById('home-search-input');
  const homeSearchForm = document.getElementById('home-search-form');
  const homeSearchClear = document.getElementById('home-search-clear');
  const homeSuggestions = document.getElementById('home-suggestions');
  const homeBrowseButton = document.getElementById('home-browse-button');
  const homeRecent = document.getElementById('home-recent');
  const homeRecentChips = document.getElementById('home-recent-chips');
  const homeCatChips = document.querySelectorAll('.home-cat-chip');

  const countAllEl = document.getElementById('count-all');
  const countBookmarksEl = document.getElementById('count-bookmarks');
  const masterTitleEl = document.getElementById('master-list-title');
  const filteredCountEl = document.getElementById('filtered-count');

  // Theme Toggle
  const btnToggleTheme = document.getElementById('btn-toggle-theme');
  const themeIcon = document.getElementById('theme-icon');

  // Drawer Elements
  const createDrawerBackdrop = document.getElementById('create-drawer-backdrop');
  const btnOpenCreate = document.getElementById('btn-open-create');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const btnCancelDrawer = document.getElementById('btn-cancel-drawer');
  const addCaseForm = document.getElementById('add-case-form');

  // --------------------------------------------------
  // Initialization
  // --------------------------------------------------
  initTheme();
  updateCounts();
  renderRecentSearches();
  initHashRoute();
  renderTemplates();

  // --------------------------------------------------
  // Filtering & Logic
  // --------------------------------------------------

  function getFilteredCases() {
    return casesData.filter(item => {
      // Search Query
      const matchSearch = !currentSearchQuery || 
        item.title.toLowerCase().includes(currentSearchQuery) ||
        item.summary.toLowerCase().includes(currentSearchQuery) ||
        item.tags.some(t => t.toLowerCase().includes(currentSearchQuery)) ||
        item.actionSteps.some(s => s.toLowerCase().includes(currentSearchQuery));

      // View
      let matchView = true;
      if (currentView === 'bookmarks') {
        matchView = bookmarks.includes(item.id);
      }

      // Category
      const matchCategory = currentCategory === 'all' || item.category === currentCategory;

      // Severity
      const matchSeverity = currentSeverity === 'all' || item.severity === currentSeverity;

      return matchSearch && matchView && matchCategory && matchSeverity;
    });
  }

  function renderApp() {
    // HOME / LANDING VIEW — minimal, centered, search-first
    if (currentView === 'home') {
      paneCases.classList.remove('active');
      paneTemplates.classList.remove('active');
      paneHome.classList.add('active');

      // Minimal header: hide nav tabs, search, new-case; keep brand + theme
      appHeader.classList.add('header-home');
      filterBar.classList.add('hidden');
      mobileBottomNav.classList.add('hidden');
      mobileBackToList();
      return;
    }

    // NON-HOME VIEWS — full application chrome returns
    appHeader.classList.remove('header-home');
    filterBar.classList.remove('hidden');
    mobileBottomNav.classList.remove('hidden');

    if (currentView === 'templates') {
      paneHome.classList.remove('active');
      paneCases.classList.remove('active');
      paneTemplates.classList.add('active');
      mobileBackToList();
      return;
    }

    paneHome.classList.remove('active');
    paneTemplates.classList.remove('active');
    paneCases.classList.add('active');

    // Update List Title
    if (currentView === 'bookmarks') {
      masterTitleEl.textContent = 'Bookmarks';
    } else if (currentCategory !== 'all') {
      masterTitleEl.textContent = getCategoryLabel(currentCategory);
    } else {
      masterTitleEl.textContent = 'All Cases';
    }

    renderMasterList();
    renderReader();
  }

  function renderMasterList() {
    const filtered = getFilteredCases();
    filteredCountEl.textContent = filtered.length;

    // Ensure selectedCaseId remains valid
    if (filtered.length > 0) {
      if (!filtered.some(c => c.id === selectedCaseId)) {
        selectedCaseId = filtered[0].id;
      }
    } else {
      selectedCaseId = null;
    }

    if (filtered.length === 0) {
      masterListContainer.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: var(--text-sub);">
          <p style="font-size: 0.825rem; font-weight: 500; color: var(--text-muted);">No cases found</p>
          <p style="font-size: 0.75rem; margin-top: 4px;">Try adjusting your search or filters.</p>
        </div>
      `;
      return;
    }

    masterListContainer.innerHTML = filtered.map(item => {
      const isSelected = item.id === selectedCaseId;
      const isBookmarked = bookmarks.includes(item.id);

      return `
        <div class="case-row ${isSelected ? 'active' : ''}" onclick="selectCase('${item.id}')">
          <div class="row-top">
            <span class="row-dot ${item.severity}"></span>
            <span class="row-category">${getCategoryLabel(item.category)}</span>
            ${isBookmarked ? '<i class="fa-solid fa-star row-star"></i>' : ''}
          </div>
          <h4 class="row-title">${escapeHtml(item.title)}</h4>
          <p class="row-snippet">${stripMarkdown(item.summary)}</p>
        </div>
      `;
    }).join('');
  }

  function renderReader() {
    if (!selectedCaseId) {
      readerContainer.innerHTML = `
        <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-sub);">
          <p style="font-size: 0.9rem; font-weight: 500;">Select a case to view documentation</p>
        </div>
      `;
      return;
    }

    const item = casesData.find(c => c.id === selectedCaseId);
    if (!item) return;

    const isBookmarked = bookmarks.includes(item.id);
    const categoryLabel = getCategoryLabel(item.category);
    const severityLabel = item.severity === 'high' ? 'High' : (item.severity === 'medium' ? 'Medium' : 'Low');

    // SOP Steps
    const stepsHtml = item.actionSteps.map((step, idx) => `
      <li class="sop-item">
        <span class="sop-index">${(idx + 1).toString().padStart(2, '0')}</span>
        <div class="sop-content">${formatMarkdownText(step)}</div>
      </li>
    `).join('');

    // Code Snippets
    const snippetsHtml = item.snippets && item.snippets.length > 0 ? item.snippets.map(snip => `
      <div class="code-box">
        <div class="code-box-header">
          <span>${escapeHtml(snip.label)}</span>
          <button class="btn-copy-snippet" data-code="${escapeHtml(snip.code)}">
            <i class="fa-regular fa-copy"></i> Copy Snippet
          </button>
        </div>
        <pre><code>${escapeHtml(snip.code)}</code></pre>
      </div>
    `).join('') : '';

    // Guidelines
    const dosHtml = item.dosAndDonts?.dos ? item.dosAndDonts.dos.map(d => `<li>${formatMarkdownText(d)}</li>`).join('') : '';
    const dontsHtml = item.dosAndDonts?.donts ? item.dosAndDonts.donts.map(d => `<li>${formatMarkdownText(d)}</li>`).join('') : '';

    readerContainer.innerHTML = `
      <article class="doc-article">
        <!-- Mobile Back Navigation Button -->
        <button class="btn-mobile-back" onclick="mobileBackToList()" aria-label="Back to Cases List">
          <i class="fa-solid fa-arrow-left"></i>
          <span>Back to Cases</span>
        </button>

        <!-- Article Header -->
        <header class="doc-header">
          <div class="doc-meta-line">
            <span class="doc-meta-item">${categoryLabel}</span>
            <span>·</span>
            <span class="doc-meta-item">${severityLabel} Severity</span>
          </div>

          <h1 class="doc-title">${escapeHtml(item.title)}</h1>
          <p class="doc-summary">${formatMarkdownText(item.summary)}</p>

          <div class="doc-toolbar">
            <button class="btn-doc-action ${isBookmarked ? 'active' : ''}" onclick="toggleBookmark('${item.id}')">
              <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
              <span>${isBookmarked ? 'Bookmarked' : 'Save to Bookmarks'}</span>
            </button>
            <button class="btn-doc-action" onclick="copyTitle('${item.id}')">
              <i class="fa-regular fa-copy"></i>
              <span>Copy Title</span>
            </button>
          </div>
        </header>

        <!-- Section 1: Context -->
        <section class="doc-section">
          <h2 class="doc-section-heading">Context</h2>
          <p class="doc-text">${formatMarkdownText(item.problemContext || item.summary)}</p>
        </section>

        <!-- Section 2: Resolution SOP -->
        <section class="doc-section">
          <h2 class="doc-section-heading">Resolution</h2>
          <ul class="sop-list">
            ${stepsHtml}
          </ul>
        </section>

        <!-- Section 3: Commands -->
        ${snippetsHtml ? `
          <section class="doc-section">
            <h2 class="doc-section-heading">Commands</h2>
            ${snippetsHtml}
          </section>
        ` : ''}

        <!-- Section 4: Guidelines -->
        ${dosHtml || dontsHtml ? `
          <section class="doc-section">
            <h2 class="doc-section-heading">Guidelines</h2>
            <div class="guidelines-grid">
              ${dosHtml ? `
                <div>
                  <div class="guidelines-col-title do">Do</div>
                  <ul class="guideline-list">${dosHtml}</ul>
                </div>
              ` : ''}
              ${dontsHtml ? `
                <div>
                  <div class="guidelines-col-title avoid">Avoid</div>
                  <ul class="guideline-list">${dontsHtml}</ul>
                </div>
              ` : ''}
            </div>
          </section>
        ` : ''}
      </article>
    `;

    // Code copy listener
    readerContainer.querySelectorAll('.btn-copy-snippet').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        navigator.clipboard.writeText(code);
        showToast('Snippet copied to clipboard');
      });
    });
  }

  function renderTemplates() {
    if (!templatesGridContainer) return;
    templatesGridContainer.innerHTML = COMMUNICATION_TEMPLATES.map(tpl => `
      <div class="tpl-card">
        <div class="tpl-header">
          <h3 class="tpl-title">${escapeHtml(tpl.title)}</h3>
          <button class="btn-tpl-copy" data-template="${escapeHtml(tpl.content)}">
            <i class="fa-regular fa-copy"></i> Copy
          </button>
        </div>
        <div class="tpl-body">${escapeHtml(tpl.content)}</div>
      </div>
    `).join('');

    templatesGridContainer.querySelectorAll('.btn-tpl-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-template');
        navigator.clipboard.writeText(text);
        showToast('Template copied to clipboard');
      });
    });
  }

  // --------------------------------------------------
  // Home / Landing: Search, Suggestions, Recent, Categories
  // --------------------------------------------------

  function getHomeMatches(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return casesData.filter(item => {
      return item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q));
    }).slice(0, 5);
  }

  function renderSuggestions(query) {
    const matches = getHomeMatches(query);
    if (matches.length === 0) {
      homeSuggestions.innerHTML = '';
      homeSuggestions.hidden = true;
      return;
    }
    homeSuggestions.innerHTML = matches.map(item => `
      <button type="button" class="home-suggestion" data-case-id="${escapeHtml(item.id)}">
        <i class="fa-solid fa-magnifying-glass"></i>
        <span class="home-suggestion-title">${escapeHtml(item.title)}</span>
        <span class="home-suggestion-cat">${getCategoryLabel(item.category)}</span>
      </button>
    `).join('');
    homeSuggestions.hidden = false;

    homeSuggestions.querySelectorAll('.home-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        const caseId = btn.dataset.caseId;
        recordRecentSearch(query);
        goToCases();
        selectCase(caseId);
        homeSearchInput.value = '';
        homeSearchInput.blur();
        hideSuggestions();
      });
    });
  }

  function hideSuggestions() {
    homeSuggestions.innerHTML = '';
    homeSuggestions.hidden = true;
  }

  function recordRecentSearch(query) {
    const q = query.trim();
    if (!q) return;
    recentSearches = recentSearches.filter(s => s.toLowerCase() !== q.toLowerCase());
    recentSearches.unshift(q);
    if (recentSearches.length > 5) recentSearches = recentSearches.slice(0, 5);
    localStorage.setItem('intern_cases_recent', JSON.stringify(recentSearches));
    renderRecentSearches();
  }

  function renderRecentSearches() {
    if (!recentSearches || recentSearches.length === 0) {
      homeRecent.hidden = true;
      homeRecentChips.innerHTML = '';
      return;
    }
    homeRecent.hidden = false;
    homeRecentChips.innerHTML = recentSearches.map(q => `
      <button type="button" class="home-recent-chip" data-query="${escapeHtml(q)}">
        <i class="fa-solid fa-clock-rotate-left"></i> ${escapeHtml(q)}
      </button>
    `).join('');

    homeRecentChips.querySelectorAll('.home-recent-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.dataset.query;
        runHomeSearch(query);
      });
    });
  }

  // Execute a search from the home page: navigate to Cases with the query applied
  function runHomeSearch(rawQuery) {
    const query = (rawQuery || '').trim();
    if (query) {
      currentSearchQuery = query.toLowerCase();
      searchInput.value = query;
      searchClearBtn.style.display = 'inline-block';
      if (mobileSearchInput) {
        mobileSearchInput.value = query;
        mobileSearchClearBtn.classList.toggle('visible', true);
      }
      recordRecentSearch(query);
    } else {
      currentSearchQuery = '';
      searchInput.value = '';
      searchClearBtn.style.display = 'none';
      if (mobileSearchInput) { mobileSearchInput.value = ''; mobileSearchClearBtn.classList.remove('visible'); }
    }
    currentView = 'all';
    currentCategory = 'all';
    setNavActive('all');
    syncCategoryTabs('all');
    homeSearchInput.value = '';
    hideSuggestions();
    setHash('cases');
    renderApp();
  }

  // Navigate to Cases view without changing search/filters
  function goToCases() {
    currentView = 'all';
    setNavActive('all');
    setHash('cases');
    renderApp();
  }

  function setNavActive(view) {
    navTabs.forEach(t => t.classList.toggle('active', t.dataset.view === view));
    bottomNavItems.forEach(n => n.classList.toggle('active', n.dataset.view === view));
  }

  function syncCategoryTabs(category) {
    catTabs.forEach(t => t.classList.toggle('active', t.dataset.category === category));
  }

  // --------------------------------------------------
  // Hash Routing (vanilla, no router library)
  // --------------------------------------------------
  function parseHash() {
    const h = (window.location.hash || '').replace(/^#\/?/, '');
    return h.trim();
  }

  function setHash(view) {
    const target = view === 'home' ? '#/' : '#/' + view;
    if (window.location.hash !== target) {
      window.location.hash = target;
    }
  }

  function initHashRoute() {
    // Determine initial view from hash (defaults to home)
    const route = parseHash();
    if (route === 'cases' || route === 'all') {
      currentView = 'all';
      setNavActive('all');
    } else if (route === 'bookmarks') {
      currentView = 'bookmarks';
      setNavActive('bookmarks');
    } else if (route === 'templates') {
      currentView = 'templates';
      setNavActive('templates');
    } else {
      currentView = 'home';
      setHash('home');
    }
    renderApp();

    window.addEventListener('hashchange', () => {
      const r = parseHash();
      if (r === 'cases' || r === 'all') {
        if (currentView !== 'all') { currentView = 'all'; setNavActive('all'); }
      } else if (r === 'bookmarks') {
        if (currentView !== 'bookmarks') { currentView = 'bookmarks'; setNavActive('bookmarks'); }
      } else if (r === 'templates') {
        if (currentView !== 'templates') { currentView = 'templates'; setNavActive('templates'); }
      } else {
        if (currentView !== 'home') { currentView = 'home'; }
      }
      renderApp();
    });
  }

  // --------------------------------------------------
  // Event Handlers & Global Helpers
  // --------------------------------------------------

  window.selectCase = function(caseId) {
    selectedCaseId = caseId;
    renderMasterList();
    renderReader();

    // Mobile screen stack transition
    const workspaceSplit = document.querySelector('.workspace-split');
    if (workspaceSplit) {
      workspaceSplit.classList.add('show-detail');
      const readerPane = document.getElementById('detail-pane-reader');
      if (readerPane) readerPane.scrollTop = 0;
    }
  };

  function mobileBackToList() {
    const workspaceSplit = document.querySelector('.workspace-split');
    if (workspaceSplit) {
      workspaceSplit.classList.remove('show-detail');
    }
  }
  window.mobileBackToList = mobileBackToList;

  window.toggleBookmark = function(caseId) {
    if (bookmarks.includes(caseId)) {
      bookmarks = bookmarks.filter(id => id !== caseId);
      showToast('Removed from bookmarks');
    } else {
      bookmarks.push(caseId);
      showToast('Saved to bookmarks');
    }
    localStorage.setItem('intern_cases_bookmarks', JSON.stringify(bookmarks));
    updateCounts();
    renderApp();
  };

  window.copyTitle = function(caseId) {
    const item = casesData.find(c => c.id === caseId);
    if (item) {
      navigator.clipboard.writeText(item.title);
      showToast('Title copied');
    }
  };

  function updateCounts() {
    countAllEl.textContent = casesData.length;
    countBookmarksEl.textContent = bookmarks.length;
  }

  // View Navigation Tabs
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      currentView = view;
      setNavActive(view);
      setHash(view);
      renderApp();
    });
  });

  // Category Tabs
  catTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      catTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.dataset.category;
      renderApp();
    });
  });

  // Severity Select
  severitySelect.addEventListener('change', (e) => {
    currentSeverity = e.target.value;
    renderApp();
  });

  // Search Input
  searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.trim().toLowerCase();
    searchClearBtn.style.display = currentSearchQuery ? 'inline-block' : 'none';
    // Sync mobile search
    if (mobileSearchInput && mobileSearchInput.value !== e.target.value) {
      mobileSearchInput.value = e.target.value;
      mobileSearchClearBtn.classList.toggle('visible', !!currentSearchQuery);
    }
    renderApp();
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    searchClearBtn.style.display = 'none';
    searchInput.focus();
    if (mobileSearchInput) { mobileSearchInput.value = ''; mobileSearchClearBtn.classList.remove('visible'); }
    renderApp();
  });

  // --------------------------------------------------
  // Mobile Search Input
  // --------------------------------------------------
  const mobileSearchInput = document.getElementById('mobile-search-input');
  const mobileSearchClearBtn = document.getElementById('mobile-search-clear');

  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.trim().toLowerCase();
      mobileSearchClearBtn.classList.toggle('visible', !!currentSearchQuery);
      // Sync desktop search
      if (searchInput.value !== e.target.value) {
        searchInput.value = e.target.value;
        searchClearBtn.style.display = currentSearchQuery ? 'inline-block' : 'none';
      }
      renderApp();
    });
  }

  if (mobileSearchClearBtn) {
    mobileSearchClearBtn.addEventListener('click', () => {
      mobileSearchInput.value = '';
      currentSearchQuery = '';
      mobileSearchClearBtn.classList.remove('visible');
      searchInput.value = '';
      searchClearBtn.style.display = 'none';
      mobileSearchInput.focus();
      renderApp();
    });
  }

  // --------------------------------------------------
  // Home Search & Landing Interactions
  // --------------------------------------------------
  if (homeSearchForm) {
    homeSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      runHomeSearch(homeSearchInput.value);
    });
  }

  if (homeSearchInput) {
    homeSearchInput.addEventListener('input', (e) => {
      const q = e.target.value;
      homeSearchClear.style.display = q ? 'inline-flex' : 'none';
      renderSuggestions(q);
    });

    homeSearchInput.addEventListener('focus', () => {
      if (homeSearchInput.value.trim()) {
        renderSuggestions(homeSearchInput.value);
      }
    });
  }

  if (homeSearchClear) {
    homeSearchClear.addEventListener('click', () => {
      homeSearchInput.value = '';
      homeSearchClear.style.display = 'none';
      hideSuggestions();
      homeSearchInput.focus();
    });
  }

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (homeSuggestions && !homeSuggestions.hidden) {
      if (!homeSearchForm.contains(e.target)) {
        hideSuggestions();
      }
    }
  });

  // Browse Cases CTA
  if (homeBrowseButton) {
    homeBrowseButton.addEventListener('click', () => {
      goToCases();
    });
  }

  // Quick Category chips → open Cases with category filter
  homeCatChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const category = chip.dataset.category;
      currentCategory = category;
      syncCategoryTabs(category);
      currentView = 'all';
      setNavActive('all');
      setHash('cases');
      renderApp();
    });
  });

  // Brand / logo click → go home
  const logoHome = document.getElementById('logo-home');
  if (logoHome) {
    logoHome.addEventListener('click', (e) => {
      e.preventDefault();
      currentView = 'home';
      setNavActive('home');
      setHash('home');
      renderApp();
    });
  }

  // --------------------------------------------------
  // Mobile Bottom Navigation
  // --------------------------------------------------

  bottomNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;

      if (view === 'home') {
        currentView = 'home';
        setNavActive('home');
        setHash('home');
        mobileBackToList();
        renderApp();
        return;
      }

      if (view === 'search') {
        // Switch to cases view and focus mobile search
        currentView = 'all';
        setNavActive('all');
        setHash('cases');
        mobileBackToList();
        renderApp();
        // Focus the mobile search input after rendering
        setTimeout(() => {
          if (mobileSearchInput) mobileSearchInput.focus();
        }, 100);
        return;
      }

      // Map bottom nav views to desktop view system
      if (view === 'all' || view === 'bookmarks' || view === 'templates') {
        currentView = view;
        setNavActive(view);
        setHash(view);
        mobileBackToList();
        renderApp();
      }
    });
  });

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement.tagName;
    const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

    // '/' focuses the active search field (home search when on home)
    if (e.key === '/' && !isTyping) {
      e.preventDefault();
      if (currentView === 'home') {
        homeSearchInput.focus();
      } else {
        searchInput.focus();
      }
    }

    // Ctrl/Cmd + K focuses the active search field
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (currentView === 'home') {
        homeSearchInput.focus();
      } else {
        searchInput.focus();
      }
    }

    if (e.key === 'Escape') {
      if (createDrawerBackdrop.classList.contains('active')) {
        createDrawerBackdrop.classList.remove('active');
      } else if (document.activeElement === searchInput) {
        searchInput.blur();
      } else if (document.activeElement === homeSearchInput) {
        // Clear & blur home search, hide suggestions
        homeSearchInput.value = '';
        homeSearchInput.blur();
        hideSuggestions();
      }
    }
  });

  // Drawer Handlers
  btnOpenCreate.addEventListener('click', () => createDrawerBackdrop.classList.add('active'));
  btnCloseDrawer.addEventListener('click', () => createDrawerBackdrop.classList.remove('active'));
  btnCancelDrawer.addEventListener('click', () => createDrawerBackdrop.classList.remove('active'));
  createDrawerBackdrop.addEventListener('click', (e) => {
    if (e.target === createDrawerBackdrop) createDrawerBackdrop.classList.remove('active');
  });

  // Add Case Form
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
        dos: ['Confirm fixes with senior engineer or IT team.'],
        donts: ['Do not hesitate to ask if still blocked.']
      },
      snippets: snippetCode ? [{ label: 'Command / Code Snippet', code: snippetCode }] : []
    };

    customCases.unshift(newCase);
    localStorage.setItem('intern_cases_custom', JSON.stringify(customCases));
    casesData = [...customCases, ...INITIAL_CASES];
    selectedCaseId = newCase.id;

    addCaseForm.reset();
    createDrawerBackdrop.classList.remove('active');
    showToast('New case saved');
    
    updateCounts();
    renderApp();
  });

  // Theme Toggle
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

  // Utilities
  function getCategoryLabel(cat) {
    switch (cat) {
      case 'all': return 'All';
      case 'hardware': return 'Hardware';
      case 'git': return 'Git';
      case 'backend': return 'Backend';
      case 'environment': return 'Environment';
      case 'workplace': return 'Workplace';
      case 'devops': return 'DevOps';
      default: return cat;
    }
  }

  function showToast(message) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-check"></i> <span>${escapeHtml(message)}</span>`;
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

  /**
   * Safe Markdown Text Formatter
   * Converts markdown links [Text](URL), bold **text**, italic *text*, and inline code `code`
   * safely without raw markdown syntax artifacts remaining.
   */
  function formatMarkdownText(text) {
    if (!text) return '';
    
    // 1. Escape unsafe HTML characters
    let html = escapeHtml(text);

    // 2. Parse Links: [Text](URL)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="doc-link">${linkText}</a>`;
    });

    // 3. Parse Bold: **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 4. Parse Italic: *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 5. Parse Inline Code: `code`
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    return html;
  }

  /**
   * Helper to strip markdown formatting for plain snippet previews
   */
  function stripMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links -> link text
      .replace(/\*\*([^*]+)\*\*/g, '$1')       // Bold -> text
      .replace(/\*([^*]+)\*/g, '$1')           // Italic -> text
      .replace(/`([^`]+)`/g, '$1');            // Inline code -> text
  }
});
