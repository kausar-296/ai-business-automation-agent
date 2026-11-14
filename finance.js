(() => {
  const session = JSON.parse(localStorage.getItem('nexus-session') || 'null');
  const nav = document.querySelector('[data-finance-nav]');
  const view = document.querySelector('[data-finance-view]');
  const canAccessFinance = session && ['manager', 'hr'].includes(session.role);
  if (!canAccessFinance) {
    nav.hidden = true;
    view.hidden = true;
    if (location.hash === '#finance') history.replaceState(null, '', 'app.html');
    return;
  }
  nav.hidden = false;
  const DB_KEY = 'nexus-finance-db';
  const seed = window.NexusDB?.snapshot().finance || {};
  const readData = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(DB_KEY) || 'null');
      return saved && Array.isArray(saved.projects) && saved.accounts ? saved : structuredClone(seed);
    } catch { return structuredClone(seed); }
  };
  let data = readData();
  const save = () => { data.updatedAt = new Date().toISOString(); localStorage.setItem(DB_KEY, JSON.stringify(data)); };
  if (!localStorage.getItem(DB_KEY)) save();
  function syncProjectList() {
    try {
      const pms = JSON.parse(localStorage.getItem('nexus-pms-db') || 'null');
      if (!pms || !Array.isArray(pms.projects)) return;
      pms.projects.filter((project) => project.department !== 'HR' && project.status !== 'Completed').forEach((project) => {
        if (!data.projects.some((entry) => entry.id === project.id)) data.projects.push({ id: project.id, name: project.name, department: project.department, allocated: 50000, spent: 0 });
      });
      save();
    } catch { /* The finance view remains available if the separate PMS store is unavailable. */ }
  }
  syncProjectList();
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  const kpis = document.querySelector('[data-finance-kpis]');
  const budgets = document.querySelector('[data-budget-list]');
  const cashSummary = document.querySelector('[data-cash-summary]');
  const transactions = document.querySelector('[data-finance-transactions]');
  const accounts = document.querySelector('[data-account-list]');
  const syncLabel = document.querySelector('[data-finance-sync]');
  const navSelectors = '[data-view-link],[data-sales-nav],[data-hrms-nav],[data-operations-nav]';
  function render() {
    const totalAllocated = data.projects.reduce((sum, project) => sum + project.allocated, 0);
    const totalSpent = data.projects.reduce((sum, project) => sum + project.spent, 0);
    const kpiData = [
      { label: 'Accounts receivable', value: money(data.accounts.receivable), detail: 'Outstanding client invoices', icon: '↗', trend: 'finance-positive' },
      { label: 'Accounts payable', value: money(data.accounts.payable), detail: 'Vendor obligations this period', icon: '↘', trend: 'finance-neutral' },
      { label: 'Monthly payroll', value: money(data.accounts.payroll), detail: 'Current monthly outlay', icon: '◎', trend: 'finance-neutral' },
      { label: 'Budget utilization', value: `${totalAllocated ? Math.round(totalSpent / totalAllocated * 100) : 0}%`, detail: `${money(totalSpent)} of ${money(totalAllocated)} allocated`, icon: '◫', trend: 'finance-positive' }
    ];
    kpis.innerHTML = kpiData.map((item) => `<article class="finance-kpi"><div class="finance-kpi-top"><span>${item.label}</span><i>${item.icon}</i></div><strong>${item.value}</strong><small class="${item.trend}">${item.detail}</small></article>`).join('');
    budgets.innerHTML = data.projects.length ? data.projects.map((project) => {
      const remaining = project.allocated - project.spent;
      const progress = project.allocated ? Math.max(0, Math.min(100, project.spent / project.allocated * 100)) : 0;
      return `<article class="budget-row"><div class="budget-project"><span class="budget-icon">${escapeHtml(project.department.slice(0, 1))}</span><div><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.department)} · Active</small></div></div><div class="budget-values"><span><small>Allocated</small><strong>${money(project.allocated)}</strong></span><span><small>Spent</small><strong>${money(project.spent)}</strong></span><span><small>Remaining</small><strong>${money(remaining)}</strong></span></div><div class="budget-bar"><span style="width:${progress}%"></span></div><div class="budget-progress-label">${Math.round(progress)}% utilized</div></article>`;
    }).join('') : '<div class="finance-empty">No active projects are available.</div>';
    const paid = data.transactions.filter((item) => item.status === 'Paid').length;
    const pending = data.transactions.filter((item) => item.status === 'Pending').length;
    const overdue = data.transactions.filter((item) => item.status === 'Overdue').length;
    cashSummary.innerHTML = `<span><i class="cash-paid"></i>${paid} paid</span><span><i class="cash-pending"></i>${pending} pending</span><span><i class="cash-overdue"></i>${overdue} overdue</span>`;
    transactions.innerHTML = data.transactions.slice(0, 6).map((item) => `<div class="finance-transaction"><span class="transaction-symbol ${item.amount < 0 ? 'outflow' : 'inflow'}">${item.amount < 0 ? '↙' : '↗'}</span><div class="finance-transaction-name"><strong>${escapeHtml(item.counterparty)}</strong><small>${escapeHtml(item.kind)} · ${escapeHtml(item.id)}</small></div><span class="finance-transaction-date">${escapeHtml(item.date)}</span><strong class="finance-transaction-amount ${item.amount < 0 ? 'negative' : ''}">${item.amount < 0 ? '−' : '+'}${money(Math.abs(item.amount))}</strong><span class="finance-status status-${item.status.toLowerCase()}">${escapeHtml(item.status)}</span></div>`).join('') || '<div class="finance-empty">No recent transactions.</div>';
    accounts.innerHTML = `<div class="account-line"><span><i class="account-dot receivable"></i>Accounts receivable</span><strong>${money(data.accounts.receivable)}</strong></div><div class="account-line"><span><i class="account-dot payable"></i>Accounts payable</span><strong>${money(data.accounts.payable)}</strong></div><div class="account-line"><span><i class="account-dot payroll"></i>Monthly payroll outlay</span><strong>${money(data.accounts.payroll)}</strong></div><div class="account-line account-total"><span>Available cash</span><strong>${money(data.accounts.cashOnHand)}</strong></div><div class="finance-account-foot">Balances updated ${new Date(data.updatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>`;
    syncLabel.textContent = `· Last synced ${new Date(data.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  function enterView() {
    syncProjectList();
    document.querySelectorAll('[data-app-view]').forEach((item) => { item.hidden = true; });
    document.querySelector('[data-sales-view]').hidden = true;
    document.querySelector('[data-hrms-view]').hidden = true;
    document.querySelector('[data-operations-view]').hidden = true;
    view.hidden = false;
    document.querySelectorAll('[data-view-link],[data-sales-nav],[data-hrms-nav],[data-operations-nav]').forEach((item) => { item.classList.remove('active'); item.removeAttribute('aria-current'); });
    nav.classList.add('active'); nav.setAttribute('aria-current', 'page');
    document.querySelector('.topbar-title h1').textContent = 'Finance & Invoicing';
    document.querySelector('.breadcrumb').innerHTML = 'Workspace <b>/</b> Finance &amp; Invoicing';
    render();
  }
  nav.addEventListener('click', (event) => { if (!canAccessFinance) return; event.preventDefault(); enterView(); history.replaceState(null, '', '#finance'); });
  document.addEventListener('click', (event) => { if (event.target.closest(navSelectors)) { view.hidden = true; nav.classList.remove('active'); nav.removeAttribute('aria-current'); } }, true);

  function openDialog(title, description, fields, submitLabel, onSubmit) {
    const dialog = document.createElement('dialog');
    dialog.className = 'finance-dialog';
    dialog.innerHTML = `<form method="dialog" class="finance-dialog-close"><button aria-label="Close">×</button></form><div class="finance-dialog-heading"><span>FINANCE WORKSPACE</span><h3>${title}</h3><p>${description}</p></div><form class="finance-action-form">${fields}<div class="finance-dialog-actions"><button type="button" class="finance-secondary" data-finance-cancel>Cancel</button><button type="submit" class="finance-primary">${submitLabel}</button></div></form>`;
    document.body.append(dialog); dialog.showModal();
    dialog.querySelector('.finance-dialog-close button').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-finance-cancel]').addEventListener('click', () => dialog.close());
    dialog.querySelector('.finance-action-form').addEventListener('submit', (event) => {
      event.preventDefault();
      if (!event.currentTarget.reportValidity()) return;
      onSubmit(event.currentTarget, dialog);
    });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
  }
  document.querySelector('[data-generate-invoice]').addEventListener('click', () => {
    openDialog('Generate invoice', 'Create a client invoice and add it to accounts receivable.', `<label>Client name<input name="client" required maxlength="80" placeholder="Company or client"></label><label>Project<select name="projectId" required>${data.projects.map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`).join('')}</select></label><label>Invoice amount<input name="amount" type="number" min="1" step="0.01" required placeholder="0.00"></label><label>Due date<input name="dueDate" type="date" required></label>`, 'Generate invoice', (form, dialog) => {
      const amount = Number(form.elements.amount.value);
      if (!(amount > 0)) return;
      const number = `INV-${String(5300 + data.invoices.length).padStart(5, '0')}`;
      const client = form.elements.client.value.trim();
      const invoice = { id: number, client, projectId: form.elements.projectId.value, amount, dueDate: form.elements.dueDate.value, status: 'Pending', createdAt: new Date().toISOString() };
      data.invoices.unshift(invoice);
      data.accounts.receivable += amount;
      data.transactions.unshift({ id: number, kind: 'Client invoice', counterparty: client, date: 'Just now', amount, status: 'Pending' });
      data.transactions = data.transactions.slice(0, 20);
      save(); render(); dialog.close();
    });
  });
  if (location.hash === '#finance') enterView(); else render();
})();
