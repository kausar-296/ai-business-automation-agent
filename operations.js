(() => {
  const session = JSON.parse(localStorage.getItem('nexus-session') || 'null');
  const nav = document.querySelector('[data-operations-nav]');
  const view = document.querySelector('[data-operations-view]');
  const canAccessOperations = session && ['manager', 'hr'].includes(session.role);
  if (!canAccessOperations) {
    nav.hidden = true;
    view.hidden = true;
    if (location.hash === '#operations') history.replaceState(null, '', 'app.html');
    return;
  }
  nav.hidden = false;
  const DB_KEY = 'nexus-operations-db';
  const seed = window.NexusDB?.snapshot().operations || {};
  const loadData = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(DB_KEY) || 'null');
      return saved && Array.isArray(saved.resources) && Array.isArray(saved.licenses) && Array.isArray(saved.servers) ? saved : structuredClone(seed);
    } catch { return structuredClone(seed); }
  };
  let data = loadData();
  const save = () => { data.syncedAt = new Date().toISOString(); localStorage.setItem(DB_KEY, JSON.stringify(data)); };
  if (!localStorage.getItem(DB_KEY)) save();
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const resources = document.querySelector('[data-ops-resources]');
  const licenses = document.querySelector('[data-ops-licenses]');
  const servers = document.querySelector('[data-ops-servers]');
  const summary = document.querySelector('[data-ops-summary]');
  const syncLabel = document.querySelector('[data-ops-sync-label]');
  const dbMeta = document.querySelector('[data-ops-db-meta]');
  const navSelectors = '[data-view-link],[data-sales-nav],[data-hrms-nav],[data-finance-nav]';

  function render() {
    const low = data.resources.filter((item) => item.stock <= item.minimum).length;
    const activeSeats = data.licenses.reduce((sum, item) => sum + item.active, 0);
    const totalSeats = data.licenses.reduce((sum, item) => sum + item.total, 0);
    const degraded = data.servers.filter((item) => item.status !== 'Operational').length;
    summary.innerHTML = `<article class="ops-summary-card"><span class="ops-summary-icon alert-icon">!</span><div><strong>${low}</strong><small>Low-stock alerts</small></div></article><article class="ops-summary-card"><span class="ops-summary-icon seat-icon">▤</span><div><strong>${activeSeats}<small> / ${totalSeats}</small></strong><small>Software seats in use</small></div></article><article class="ops-summary-card"><span class="ops-summary-icon server-icon">⌁</span><div><strong>${data.servers.length - degraded}<small> / ${data.servers.length}</small></strong><small>Services operational</small></div></article>`;
    resources.innerHTML = data.resources.map((item) => {
      const state = item.stock <= item.minimum ? 'Low stock' : item.stock <= item.minimum * 1.5 ? 'Running low' : 'Healthy';
      const cssState = state.toLowerCase().replace(/\s+/g, '-');
      return `<article class="ops-resource-row"><span class="ops-resource-symbol">${item.name === 'Webcams' ? '◉' : item.name === 'Keyboards' ? '⌨' : item.name === 'Headsets' ? '◖' : '▣'}</span><div class="ops-resource-info"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)}</small></div><div class="ops-resource-quantity"><strong>${item.stock}</strong><small>${escapeHtml(item.unit)} remaining</small></div><span class="ops-resource-state state-${cssState}"><i></i>${state}</span><button class="ops-text-button" type="button" data-restock="${escapeHtml(item.id)}">Restock</button></article>`;
    }).join('');
    licenses.innerHTML = data.licenses.map((item) => {
      const percentage = item.total ? Math.min(100, Math.round(item.active / item.total * 100)) : 0;
      return `<article class="ops-license-row"><div class="ops-license-top"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.vendor)} workspace</small></div><button type="button" class="ops-text-button" data-license-edit="${escapeHtml(item.id)}">Manage</button></div><div class="ops-license-count"><strong>${item.active}<span> / ${item.total}</span></strong><small>seats used</small></div><div class="ops-license-track"><span class="${escapeHtml(item.color)}" style="width:${percentage}%"></span></div><div class="ops-license-foot"><span>${percentage}% allocated</span><span>${Math.max(0, item.total - item.active)} seats available</span></div></article>`;
    }).join('');
    const anyDegraded = data.servers.some((item) => item.status !== 'Operational');
    document.querySelector('.ops-overall').innerHTML = `<i class="${anyDegraded ? 'overall-warn' : ''}"></i> ${anyDegraded ? 'Attention required' : 'All systems nominal'}`;
    servers.innerHTML = data.servers.map((item) => `<article class="ops-server-row"><span class="ops-server-icon">⌘</span><div class="ops-server-info"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.service)}</small></div><div class="ops-server-latency"><small>Latency</small><strong>${item.latency} ms</strong></div><div class="ops-server-uptime"><strong>${item.uptime.toFixed(2)}%</strong><small>uptime</small></div><span class="ops-server-state ${item.status === 'Operational' ? 'server-ok' : 'server-degraded'}"><i></i>${escapeHtml(item.status)}</span></article>`).join('');
    syncLabel.textContent = `Synced ${new Date(data.syncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    dbMeta.textContent = `· ${data.resources.length} tracked resources · ${data.licenses.length} license groups · ${data.servers.length} monitored services`;
  }
  function enterView() {
    document.querySelectorAll('[data-app-view]').forEach((item) => { item.hidden = true; });
    document.querySelector('[data-sales-view]').hidden = true;
    document.querySelector('[data-hrms-view]').hidden = true;
    document.querySelector('[data-finance-view]').hidden = true;
    view.hidden = false;
    document.querySelectorAll('[data-view-link],[data-sales-nav],[data-hrms-nav],[data-finance-nav]').forEach((item) => { item.classList.remove('active'); item.removeAttribute('aria-current'); });
    nav.classList.add('active'); nav.setAttribute('aria-current', 'page');
    document.querySelector('.topbar-title h1').textContent = 'Operations & Inventory';
    document.querySelector('.breadcrumb').innerHTML = 'Workspace <b>/</b> Operations &amp; Inventory';
    render();
  }
  nav.addEventListener('click', (event) => { if (!canAccessOperations) return; event.preventDefault(); enterView(); history.replaceState(null, '', '#operations'); });
  document.addEventListener('click', (event) => { if (event.target.closest(navSelectors)) { view.hidden = true; nav.classList.remove('active'); nav.removeAttribute('aria-current'); } }, true);

  function openForm(title, intro, fields, submitText, saveForm) {
    const dialog = document.createElement('dialog');
    dialog.className = 'ops-dialog';
    dialog.innerHTML = `<form method="dialog" class="ops-dialog-close"><button aria-label="Close">×</button></form><div class="ops-dialog-heading"><span>OPERATIONS CONTROL</span><h3>${title}</h3><p>${intro}</p></div><form class="ops-form">${fields}<div class="ops-dialog-actions"><button type="button" class="ops-button-secondary" data-ops-cancel>Cancel</button><button type="submit" class="ops-button-primary">${submitText}</button></div></form>`;
    document.body.append(dialog); dialog.showModal();
    dialog.querySelector('.ops-dialog-close button').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-ops-cancel]').addEventListener('click', () => dialog.close());
    dialog.querySelector('.ops-form').addEventListener('submit', (event) => { event.preventDefault(); if (event.currentTarget.reportValidity()) saveForm(event.currentTarget, dialog); });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
  }
  resources.addEventListener('click', (event) => {
    const button = event.target.closest('[data-restock]');
    if (!button || !canAccessOperations) return;
    const item = data.resources.find((resource) => resource.id === button.dataset.restock);
    if (!item) return;
    openForm(`Restock ${escapeHtml(item.name)}`, `Add units to ${escapeHtml(item.name)} inventory.`, `<p class="ops-current-stock">Current stock <strong>${item.stock} ${escapeHtml(item.unit)}</strong> · Reorder threshold <strong>${item.minimum}</strong></p><label>Units to add<input name="quantity" type="number" min="1" max="5000" step="1" required value="${Math.max(1, item.minimum * 2 - item.stock)}"></label>`, 'Update stock', (form, dialog) => {
      item.stock += Number(form.elements.quantity.value);
      save(); render(); dialog.close();
    });
  });
  licenses.addEventListener('click', (event) => {
    const button = event.target.closest('[data-license-edit]');
    if (!button || !canAccessOperations) return;
    const license = data.licenses.find((item) => item.id === button.dataset.licenseEdit);
    if (!license) return;
    openForm(`Manage ${escapeHtml(license.vendor)} seats`, 'Update active seat usage and purchased seat capacity.', `<label>Active seats<input name="active" type="number" min="0" max="10000" required value="${license.active}"></label><label>Total purchased seats<input name="total" type="number" min="1" max="10000" required value="${license.total}"></label>`, 'Save seat counts', (form, dialog) => {
      const active = Number(form.elements.active.value); const total = Number(form.elements.total.value);
      if (active > total) { form.elements.active.setCustomValidity('Active seats cannot exceed total purchased seats.'); form.elements.active.reportValidity(); form.elements.active.setCustomValidity(''); return; }
      license.active = active; license.total = total;
      save(); render(); dialog.close();
    });
  });
  document.querySelector('[data-ops-refresh]').addEventListener('click', (event) => {
    const button = event.currentTarget;
    if (button.disabled) return;
    button.disabled = true; button.textContent = 'Syncing…';
    window.setTimeout(() => {
      data.servers.forEach((server) => {
        server.latency = Math.max(12, Math.min(240, server.latency + Math.round(Math.random() * 18 - 9)));
        server.uptime = Math.max(99.7, Math.min(100, Number((server.uptime + (Math.random() * .015 - .006)).toFixed(2))));
        server.status = server.latency > 160 || server.uptime < 99.9 ? 'Degraded' : 'Operational';
      });
      save(); render(); button.disabled = false; button.textContent = 'Refresh status';
    }, 500);
  });
  render();
  if (location.hash === '#operations') enterView();
})();
