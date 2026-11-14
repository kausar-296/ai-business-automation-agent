(() => {
  const session = (() => {
    try { return JSON.parse(localStorage.getItem('nexus-session') || 'null'); }
    catch { return null; }
  })();
  const nav = document.querySelector('[data-settings-nav]');
  const view = document.querySelector('[data-settings-view]');
  if (!session?.userId || !['employee', 'manager', 'hr'].includes(session.role) || !nav || !view) return;

  const viewSelectors = [
    '[data-app-view]', '[data-sales-view]', '[data-hrms-view]',
    '[data-finance-view]', '[data-operations-view]', '[data-notes-view]',
    '[data-settings-view]'
  ].join(',');
  const navSelector = '[data-view-link],[data-sales-nav],[data-hrms-nav],[data-finance-nav],[data-operations-nav],[data-notes-nav],[data-settings-nav]';
  const themeButtons = [...view.querySelectorAll('[data-set-theme]')];
  const keyForm = view.querySelector('[data-gemini-key-form]');
  const keyInput = view.querySelector('#settings-gemini-key');
  const keyStatus = view.querySelector('[data-key-status]');

  function syncThemeButtons() {
    const currentTheme = document.body.dataset.theme || 'light';
    themeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.setTheme === currentTheme)));
  }

  function enterSettings() {
    document.querySelectorAll(viewSelectors).forEach((item) => { item.hidden = true; });
    view.hidden = false;
    document.querySelectorAll(navSelector).forEach((link) => {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    });
    nav.classList.add('active');
    nav.setAttribute('aria-current', 'page');
    const title = document.querySelector('.topbar-title h1');
    const breadcrumb = document.querySelector('.breadcrumb');
    if (title) title.textContent = 'Settings';
    if (breadcrumb) breadcrumb.innerHTML = 'Workspace <b>/</b> Settings';
    syncThemeButtons();
    keyInput.value = localStorage.getItem('nexus-gemini-key') || '';
    keyStatus.textContent = '';
  }

  nav.addEventListener('click', (event) => {
    event.preventDefault();
    enterSettings();
    history.replaceState(null, '', '#settings');
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest(navSelector) && !event.target.closest('[data-settings-nav]')) {
      view.hidden = true;
      nav.classList.remove('active');
      nav.removeAttribute('aria-current');
    }
  });

  themeButtons.forEach((button) => button.addEventListener('click', () => {
    const theme = button.dataset.setTheme;
    if (window.NexusTheme?.setTheme) window.NexusTheme.setTheme(theme);
    else {
      document.body.dataset.theme = theme;
      localStorage.setItem('nexus-theme', theme);
    }
    syncThemeButtons();
  }));
  document.addEventListener('nexus-theme-change', syncThemeButtons);

  view.querySelector('[data-toggle-key]').addEventListener('click', (event) => {
    const show = keyInput.type === 'password';
    keyInput.type = show ? 'text' : 'password';
    event.currentTarget.textContent = show ? 'Hide' : 'Show';
    event.currentTarget.setAttribute('aria-label', `${show ? 'Hide' : 'Show'} API key`);
  });

  keyForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const apiKey = keyInput.value.trim();
    if (!apiKey) {
      keyStatus.textContent = 'Enter an API key before saving.';
      keyInput.focus();
      return;
    }
    localStorage.setItem('nexus-gemini-key', apiKey);
    keyInput.value = apiKey;
    keyInput.type = 'password';
    const toggle = view.querySelector('[data-toggle-key]');
    toggle.textContent = 'Show';
    toggle.setAttribute('aria-label', 'Show API key');
    keyStatus.textContent = 'API key saved. The assistant can use it immediately.';
  });

  syncThemeButtons();
  if (location.hash === '#settings') enterSettings();
})();
