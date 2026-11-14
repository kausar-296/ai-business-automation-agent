(() => {
  const session = JSON.parse(localStorage.getItem('nexus-session') || 'null');
  const salesNav = document.querySelector('[data-sales-nav]');
  const salesView = document.querySelector('[data-sales-view]');
  if (!session || session.role !== 'manager') {
    if (salesNav) salesNav.hidden = true;
    if (salesView) salesView.hidden = true;
    if (location.hash === '#sales') history.replaceState(null, '', 'app.html');
    return;
  }

  salesNav.hidden = false;
  const DB_KEY = 'nexus-sales-db';
  const seed = window.NexusDB?.snapshot().sales || {};
  const loadData = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(DB_KEY) || 'null');
      return saved && saved.metrics && Array.isArray(saved.inventory) ? saved : structuredClone(seed);
    } catch {
      return structuredClone(seed);
    }
  };
  let data = loadData();
  const saveData = () => localStorage.setItem(DB_KEY, JSON.stringify(data));
  if (!localStorage.getItem(DB_KEY)) saveData();

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const currency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  const shortCurrency = (value) => `$${(value / 1000).toFixed(1)}k`;
  const changeLabel = (value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  const elements = {
    kpis: document.querySelector('[data-sales-kpis]'), chart: document.querySelector('[data-revenue-chart]'),
    regions: document.querySelector('[data-region-list]'), inventory: document.querySelector('[data-inventory-table]'),
    inventoryCount: document.querySelector('[data-inventory-count]'), transactions: document.querySelector('[data-transactions]'),
    synced: document.querySelector('[data-sales-synced]'), records: document.querySelector('[data-sales-record-count]'), refresh: document.querySelector('[data-sales-refresh]')
  };

  function renderKpis() {
    const items = [
      { label: 'Total monthly revenue', value: currency(data.metrics.revenue), change: data.trends.revenue, icon: '$', note: 'vs. previous month' },
      { label: 'Active stock units', value: new Intl.NumberFormat('en-US').format(data.inventory.reduce((sum, item) => sum + item.stock, 0)), change: data.trends.stock, icon: '▤', note: 'vs. previous month' },
      { label: 'Conversion rate', value: `${data.metrics.conversion.toFixed(2)}%`, change: data.trends.conversion, icon: '◎', note: 'vs. previous month' },
      { label: 'Net profit margin', value: `${data.metrics.margin.toFixed(1)}%`, change: data.trends.margin, icon: '↗', note: 'vs. previous month' }
    ];
    elements.kpis.innerHTML = items.map((item) => `<article class="sales-kpi"><div class="sales-kpi-top"><span>${escapeHtml(item.label)}</span><i>${item.icon}</i></div><strong class="sales-kpi-value">${item.value}</strong><div class="sales-kpi-foot"><span class="sales-trend ${item.change >= 0 ? 'trend-up' : 'trend-down'}"><b aria-hidden="true">${item.change >= 0 ? '↑' : '↓'}</b> ${changeLabel(item.change)}</span><span>${item.note}</span></div></article>`).join('');
  }
  function renderChart() {
    const max = Math.max(...data.weekly);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    elements.chart.innerHTML = `<div class="chart-total"><strong>${shortCurrency(data.weekly.reduce((sum, value) => sum + value, 0))}</strong><span>total this week</span></div><div class="chart-bars">${data.weekly.map((value, index) => `<div class="chart-column"><span class="chart-tooltip">${currency(value)}</span><div class="chart-bar ${index === (new Date().getDay() + 6) % 7 ? 'today' : ''}" style="height:${Math.max(8, Math.round(value / max * 100))}%"></div><span class="chart-day">${days[index]}</span></div>`).join('')}</div>`;
  }
  function renderRegions() {
    elements.regions.innerHTML = data.regions.map((region) => `<div class="region-row"><div class="region-label"><strong>${escapeHtml(region.name)}</strong><span>${currency(region.revenue)}</span></div><div class="region-track"><span style="width:${Math.max(2, Math.min(100, region.share))}%"></span></div><small>${region.share}% of revenue</small></div>`).join('');
  }
  function renderInventory() {
    elements.inventory.innerHTML = data.inventory.map((item) => {
      const state = item.stock <= item.reorder ? 'Reorder' : item.stock < item.reorder * 1.5 ? 'Low stock' : 'Healthy';
      const stateClass = state.toLowerCase().replace(' ', '-');
      return `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td class="sku-cell">${escapeHtml(item.sku)}</td><td>${new Intl.NumberFormat('en-US').format(item.stock)}</td><td>${new Intl.NumberFormat('en-US').format(item.reorder)}</td><td><span class="stock-state stock-${stateClass}"><i></i>${state}</span></td></tr>`;
    }).join('');
    elements.inventoryCount.textContent = `${data.inventory.length} products`;
  }
  function renderTransactions() {
    elements.transactions.innerHTML = data.transactions.slice(0, 5).map((transaction) => `<div class="transaction-row"><span class="transaction-icon">${escapeHtml(transaction.client.slice(0, 1))}</span><div class="transaction-info"><strong>${escapeHtml(transaction.client)}</strong><small>${escapeHtml(transaction.product)} · ${transaction.id}</small></div><div class="transaction-amount"><strong>${currency(transaction.amount)}</strong><small class="transaction-status ${transaction.status.toLowerCase()}">${escapeHtml(transaction.status)}</small></div></div>`).join('');
  }
  function render() {
    renderKpis(); renderChart(); renderRegions(); renderInventory(); renderTransactions();
    elements.synced.textContent = `Synced at ${new Date(data.syncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    elements.records.textContent = `· ${data.inventory.length} SKUs · ${data.transactions.length} recent orders`;
  }

  function showSales() {
    document.querySelectorAll('[data-app-view]').forEach((view) => { view.hidden = true; });
    salesView.hidden = false;
    document.querySelectorAll('[data-view-link]').forEach((link) => { link.classList.remove('active'); link.removeAttribute('aria-current'); });
    salesNav.classList.add('active');
    salesNav.setAttribute('aria-current', 'page');
    document.querySelector('.topbar-title h1').textContent = 'Sales & Stocks';
    document.querySelector('.breadcrumb').innerHTML = 'Workspace <b>/</b> Sales &amp; Stocks';
    render();
  }
  salesNav.addEventListener('click', (event) => {
    if (session.role !== 'manager') return;
    event.preventDefault();
    showSales();
    history.replaceState(null, '', '#sales');
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-view-link]')) salesView.hidden = true;
  }, true);

  function refreshData() {
    const button = elements.refresh;
    if (button.disabled) return;
    button.disabled = true;
    button.classList.add('is-syncing');
    button.dataset.originalText = button.textContent.trim();
    button.innerHTML = '<span class="sync-spinner"></span>Syncing DB';
    window.setTimeout(() => {
      const delta = (min, max) => min + Math.random() * (max - min);
      data.metrics.revenue = Math.round(data.metrics.revenue * (1 + delta(-.012, .021)));
      data.metrics.conversion = Math.max(1, Math.min(12, data.metrics.conversion + delta(-.14, .16)));
      data.metrics.margin = Math.max(5, Math.min(60, data.metrics.margin + delta(-.18, .2)));
      data.inventory.forEach((item) => { item.stock = Math.max(0, item.stock + Math.round(delta(-7, 9))); });
      data.metrics.stockUnits = data.inventory.reduce((sum, item) => sum + item.stock, 0);
      data.trends = { revenue: Number(delta(-2.5, 3.1).toFixed(1)), stock: Number(delta(-2.2, 1.8).toFixed(1)), conversion: Number(delta(-.8, 1.4).toFixed(1)), margin: Number(delta(-1.1, .9).toFixed(1)) };
      data.weekly = data.weekly.map((value) => Math.round(value * (1 + delta(-.025, .035))));
      data.regions = data.regions.map((region) => ({ ...region, revenue: Math.round(region.revenue * (1 + delta(-.018, .024))) }));
      const product = data.inventory[Math.floor(Math.random() * data.inventory.length)];
      const clients = ['Vertex Dynamics', 'Northstar Labs', 'BluePeak Systems', 'Meridian Group', 'Asteron Tech', 'Cloudline Partners'];
      data.transactions.unshift({ id: `NX-${Math.floor(48300 + Math.random() * 700)}`, client: clients[Math.floor(Math.random() * clients.length)], product: product.name, amount: Math.round(900 + Math.random() * 7800), status: Math.random() > .25 ? 'Completed' : 'Processing', minutes: 0 });
      data.transactions = data.transactions.slice(0, 8);
      data.syncedAt = new Date().toISOString();
      saveData();
      render();
      button.disabled = false;
      button.classList.remove('is-syncing');
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"></path><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2"></path></svg>Refresh data';
    }, 550);
  }
  elements.refresh.addEventListener('click', refreshData);

  render();
  if (location.hash === '#sales') showSales();
})();
