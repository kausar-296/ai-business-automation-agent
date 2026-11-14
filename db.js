/* NexusAI shared mock company database. Legacy module keys remain virtual compatibility views. */
(() => {
  const ROOT_KEY = 'nexus-company-db';
  const users = [
    { userId: 'MGR-ENG-001', password: 'NexusSarah!2026', name: 'Sarah Jenkins', role: 'manager', department: 'Engineering', departments: ['Engineering', 'Sales'] },
    { userId: 'MGR-OPS-002', password: 'NexusRobert!2026', name: 'Robert Vance', role: 'manager', department: 'Operations', departments: ['Operations', 'Support', 'QA', 'Marketing'] },
    { userId: 'HR-CHIEF-001', password: 'NexusElena!2026', name: 'Elena Rostova', role: 'hr', department: 'HR', departments: ['HR'] },
    { userId: 'HR-SPEC-002', password: 'NexusMarcus!2026', name: 'Marcus Brody', role: 'hr', department: 'HR', departments: ['HR'] },
    { userId: 'EMP-SALES-001', password: 'NexusAlex!2026', name: 'Alex Reed', role: 'employee', department: 'Sales', departments: ['Sales'] },
    { userId: 'EMP-ENG-002', password: 'NexusDavid!2026', name: 'David Kim', role: 'employee', department: 'Engineering', departments: ['Engineering'] },
    { userId: 'EMP-SUP-003', password: 'NexusJessica!2026', name: 'Jessica Taylor', role: 'employee', department: 'Support', departments: ['Support'] },
    { userId: 'EMP-QA-004', password: 'NexusLiam!2026', name: 'Liam Smith', role: 'employee', department: 'QA', departments: ['QA'] },
    { userId: 'EMP-MKT-005', password: 'NexusChloe!2026', name: 'Chloe Bennett', role: 'employee', department: 'Marketing', departments: ['Marketing'] }
  ];
  const oldUsers = {
    'NX-1001': 'MGR-ENG-001', 'NX-1002': 'EMP-SALES-001', 'NX-1003': 'HR-CHIEF-001'
  };
  const now = new Date();
  const isoDay = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const departments = ['Engineering', 'Sales', 'Support', 'QA', 'Marketing', 'HR', 'Operations'];
  const projects = departments.map((department, index) => ({
    id: `proj-${department.toLowerCase()}`, name: ({ Engineering: 'Data Platform Modernization', Sales: 'Revenue Enablement', Support: 'Customer Experience Operations', QA: 'Quality Automation', Marketing: 'Campaign Intelligence', HR: 'People Operations', Operations: 'Operations Automation' })[department],
    department, ownerId: department === 'HR' ? 'HR-CHIEF-001' : index < 2 ? 'MGR-ENG-001' : 'MGR-OPS-002', createdAt: new Date(now.getFullYear(), now.getMonth() - (index + 1) * 2, 4 + index).toISOString(), status: 'Active'
  }));
  projects.push({ id: 'proj-service-archive', name: 'Service Desk Automation Rollout', department: 'Support', ownerId: 'MGR-OPS-002', createdAt: new Date(now.getFullYear(), now.getMonth() - 9, 8).toISOString(), status: 'Completed', completedAt: new Date(now.getFullYear(), now.getMonth() - 6, 26).toISOString() });
  const tasks = [
    ['task-eng-01', 'proj-engineering', 'Harden data pipeline retries', 'Engineering', 'EMP-ENG-002', 68, 'In Progress', -1],
    ['task-eng-02', 'proj-engineering', 'Document connector health checks', 'Engineering', 'EMP-ENG-002', 100, 'Completed', -3],
    ['task-sales-01', 'proj-sales', 'Prepare enterprise renewal brief', 'Sales', 'EMP-SALES-001', 100, 'Submitted', 0],
    ['task-sales-02', 'proj-sales', 'Reconcile qualified pipeline records', 'Sales', 'EMP-SALES-001', 42, 'Needs Revision', -1],
    ['task-support-01', 'proj-support', 'Audit priority support cases', 'Support', 'EMP-SUP-003', 55, 'In Progress', -1],
    ['task-support-02', 'proj-support', 'Publish service handoff checklist', 'Support', 'EMP-SUP-003', 100, 'Completed', -4],
    ['task-qa-01', 'proj-qa', 'Validate release candidate workflows', 'QA', 'EMP-QA-004', 100, 'Submitted', 0],
    ['task-qa-02', 'proj-qa', 'Refresh regression coverage map', 'QA', 'EMP-QA-004', 20, 'Pending', 0],
    ['task-marketing-01', 'proj-marketing', 'Review campaign attribution results', 'Marketing', 'EMP-MKT-005', 72, 'In Progress', -1],
    ['task-marketing-02', 'proj-marketing', 'Finalize monthly content calendar', 'Marketing', 'EMP-MKT-005', 100, 'Completed', -5],
    ['task-support-03', 'proj-support', 'Review support automation run results', 'Support', 'EMP-SUP-003', 80, 'In Progress', -1],
    ['task-support-archive', 'proj-service-archive', 'Roll out automated ticket routing', 'Support', 'EMP-SUP-003', 100, 'Completed', -7],
    ['task-hr-01', 'proj-hr', 'Review benefits enrollment checklist', 'HR', 'HR-SPEC-002', 0, 'Pending', 0]
  ].map(([id, projectId, title, department, assignedTo, progress, status, monthsAgo]) => {
    const person = users.find((user) => user.userId === assignedTo);
    const project = projects.find((entry) => entry.id === projectId);
    const submitted = status === 'Submitted';
    return { id, projectId, title, description: `${title} for the ${department} team.`, department, assignedTo, assignedName: person.name, createdBy: department === 'HR' ? 'HR-CHIEF-001' : (project.ownerId), dueDate: isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5)), progress, status, report: submitted ? `${title} is complete. Validation notes and supporting evidence are attached for review.` : '', attachments: [], feedback: status === 'Needs Revision' ? 'Please include the final reconciliation notes before resubmitting.' : '', updatedAt: new Date(now.getFullYear(), now.getMonth() + monthsAgo, Math.max(1, now.getDate() - (monthsAgo ? 2 : 0)), 10, 15).toISOString() };
  });
  const attendance = [];
  for (let offset = 180; offset >= 1; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    if ([0, 6].includes(date.getDay())) continue;
    users.forEach((user, userIndex) => {
      const absent = (offset + userIndex * 3) % 47 === 0;
      attendance.push({ userId: user.userId, name: user.name, role: user.role, date: isoDay(date), status: absent ? 'Absent' : 'Present', timestamp: absent ? '' : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8 + (userIndex % 2), 35 + (userIndex * 7) % 20).toISOString() });
    });
  }
  const attendanceOverrides = {};
  const hrms = {
    leaveRequests: [
      { id: 'leave-history-01', userId: 'EMP-ENG-002', name: 'David Kim', role: 'employee', leaveType: 'Paid', startDate: isoDay(new Date(now.getFullYear(), now.getMonth() - 2, 12)), endDate: isoDay(new Date(now.getFullYear(), now.getMonth() - 2, 13)), reason: 'Personal leave', status: 'Approved', createdAt: new Date(now.getFullYear(), now.getMonth() - 3, 25).toISOString() },
      { id: 'leave-history-02', userId: 'EMP-SUP-003', name: 'Jessica Taylor', role: 'employee', leaveType: 'Sick', startDate: isoDay(new Date(now.getFullYear(), now.getMonth() - 1, 7)), endDate: isoDay(new Date(now.getFullYear(), now.getMonth() - 1, 7)), reason: 'Recovery day', status: 'Approved', createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 6).toISOString() },
      { id: 'leave-pending-01', userId: 'EMP-QA-004', name: 'Liam Smith', role: 'employee', leaveType: 'Casual', startDate: isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 12)), endDate: isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 13)), reason: 'Family commitment', status: 'Pending', createdAt: new Date(now.getTime() - 2 * 86400000).toISOString() },
      { id: 'leave-pending-02', userId: 'MGR-OPS-002', name: 'Robert Vance', role: 'manager', leaveType: 'Paid', startDate: isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 20)), endDate: isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 21)), reason: 'Planned time off', status: 'Pending', createdAt: new Date(now.getTime() - 86400000).toISOString() }
    ],
    complaints: [
      { id: 'issue-history-01', userId: 'EMP-SALES-001', name: 'Alex Reed', role: 'employee', category: 'Equipment', subject: 'Replacement headset request', details: 'The team headset has intermittent audio and needs inspection.', status: 'Under Review', notes: 'IT equipment review opened.', createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 14).toISOString() },
      { id: 'issue-history-02', userId: 'EMP-MKT-005', name: 'Chloe Bennett', role: 'employee', category: 'Workplace', subject: 'Shared workspace scheduling', details: 'Requesting a more predictable schedule for the shared campaign room.', status: 'Resolved', notes: 'Updated the room calendar and shared the new process.', createdAt: new Date(now.getFullYear(), now.getMonth() - 2, 9).toISOString() }
    ]
  };
  hrms.leaveRequests.filter((request) => request.status === 'Approved').forEach((request) => {
    const start = new Date(`${request.startDate}T00:00:00`);
    const end = new Date(`${request.endDate}T00:00:00`);
    for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      const date = isoDay(day);
      const record = attendance.find((entry) => entry.userId === request.userId && entry.date === date);
      if (record) { record.status = 'On Leave'; record.timestamp = ''; }
      attendanceOverrides[`${request.userId}|${date}`] = { status: 'On Leave', requestId: request.id, timestamp: request.createdAt };
    }
  });
  const sales = {
    metrics: { revenue: 128450, stockUnits: 8420, conversion: 4.82, margin: 28.6 }, trends: { revenue: 8.4, stock: -2.1, conversion: 1.2, margin: -0.6 }, weekly: [12600, 15300, 13900, 18200, 16900, 21800, 19750],
    regions: [{ name: 'North America', revenue: 54820, share: 43 }, { name: 'Europe', revenue: 35410, share: 28 }, { name: 'Asia Pacific', revenue: 24690, share: 19 }, { name: 'Latin America', revenue: 13530, share: 10 }],
    inventory: [{ name: 'Workflow Hub Pro', sku: 'NXS-WH-204', stock: 3240, reorder: 900 }, { name: 'Automation Suite', sku: 'NXS-AS-118', stock: 1890, reorder: 650 }, { name: 'Data Connector X', sku: 'NXS-DC-052', stock: 1686, reorder: 500 }, { name: 'Analytics Engine', sku: 'NXS-AE-310', stock: 1535, reorder: 400 }, { name: 'Secure Gateway', sku: 'NXS-SG-091', stock: 69, reorder: 120 }],
    transactions: [{ id: 'NX-48291', client: 'Vertex Dynamics', product: 'Workflow Hub Pro', amount: 4850, status: 'Completed', minutes: 8 }, { id: 'NX-48290', client: 'Northstar Labs', product: 'Automation Suite', amount: 3270, status: 'Processing', minutes: 24 }, { id: 'NX-48289', client: 'BluePeak Systems', product: 'Data Connector X', amount: 1890, status: 'Completed', minutes: 51 }, { id: 'NX-48288', client: 'Meridian Group', product: 'Analytics Engine', amount: 6420, status: 'Completed', minutes: 83 }, { id: 'NX-48287', client: 'Asteron Tech', product: 'Secure Gateway', amount: 2150, status: 'Processing', minutes: 126 }], syncedAt: now.toISOString()
  };
  const finance = {
    projects: projects.filter((project) => project.department !== 'HR' && project.status !== 'Completed').map((project, index) => ({ id: project.id, name: project.name, department: project.department, allocated: [315000, 128000, 96000, 84000, 112000, 185000][index], spent: [192600, 73900, 41600, 52200, 68400, 121400][index] })),
    accounts: { receivable: 184600, payable: 76450, payroll: 342000, cashOnHand: 1284000 }, invoices: [], transactions: [
      { id: 'TX-98431', kind: 'Client payment', counterparty: 'Vertex Dynamics', date: 'Today, 10:42 AM', amount: 24500, status: 'Paid' }, { id: 'TX-98430', kind: 'Vendor payout', counterparty: 'Cloudscale Systems', date: 'Today, 9:18 AM', amount: -12800, status: 'Pending' }, { id: 'TX-98429', kind: 'Client invoice', counterparty: 'Northstar Labs', date: 'Yesterday', amount: 18600, status: 'Overdue' }, { id: 'TX-98428', kind: 'Payroll', counterparty: 'Monthly payroll run', date: 'Nov 12, 2026', amount: -342000, status: 'Paid' }, { id: 'TX-98427', kind: 'Client payment', counterparty: 'Meridian Group', date: 'Nov 12, 2026', amount: 37200, status: 'Paid' }
    ], updatedAt: now.toISOString()
  };
  const operations = {
    resources: [{ id: 'webcam', name: 'Webcams', category: 'Video equipment', stock: 3, minimum: 10, unit: 'units' }, { id: 'keyboard', name: 'Keyboards', category: 'Peripherals', stock: 42, minimum: 15, unit: 'units' }, { id: 'headset', name: 'Headsets', category: 'Audio equipment', stock: 8, minimum: 12, unit: 'units' }, { id: 'dock', name: 'Docking stations', category: 'Workstation hardware', stock: 6, minimum: 8, unit: 'units' }],
    licenses: [{ id: 'github', name: 'GitHub Enterprise', vendor: 'GitHub', active: 42, total: 50, color: 'license-violet' }, { id: 'slack', name: 'Slack Business+', vendor: 'Slack', active: 86, total: 100, color: 'license-green' }, { id: 'jira', name: 'Jira Software', vendor: 'Atlassian', active: 37, total: 40, color: 'license-blue' }, { id: 'figma', name: 'Figma Professional', vendor: 'Figma', active: 18, total: 25, color: 'license-orange' }],
    servers: [{ id: 'aws-use1', name: 'AWS US-East', service: 'Primary application cluster', uptime: 99.98, status: 'Operational', latency: 42 }, { id: 'gcp-euw1', name: 'GCP EU-West', service: 'Regional processing cluster', uptime: 99.91, status: 'Degraded', latency: 186 }, { id: 'internal-db', name: 'Internal Database', service: 'Core transactional database', uptime: 99.99, status: 'Operational', latency: 18 }], syncedAt: now.toISOString()
  };
  const seed = { schemaVersion: 1, updatedAt: now.toISOString(), users, attendance, pms: { projects, tasks }, sales, hrms, attendanceOverrides, finance, operations, notes: {} };

  const nativeGet = Storage.prototype.getItem;
  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;
  const validRoot = (value) => value && value.schemaVersion === 1 && Array.isArray(value.users) && value.pms?.projects && value.pms?.tasks;
  const readJson = (key, fallback) => { try { const value = JSON.parse(nativeGet.call(localStorage, key) || 'null'); return value ?? fallback; } catch { return fallback; } };
  const root = readJson(ROOT_KEY, null);
  const state = validRoot(root) ? root : seed;
  const remapId = (id) => oldUsers[id] || id;
  const mergeArray = (base, additions, idKey = 'id') => { const ids = new Set(base.map((item) => item[idKey])); additions.forEach((item) => { if (!ids.has(item[idKey])) { base.push(item); ids.add(item[idKey]); } }); };
  if (!validRoot(root)) {
    const oldAttendance = readJson('nexus-attendance', []);
    if (Array.isArray(oldAttendance)) oldAttendance.forEach((record) => {
      const mappedId = remapId(record?.userId);
      const person = users.find((user) => user.userId === mappedId);
      if (!person || !record.date) return;
      const entry = { ...record, userId: mappedId, name: person.name, role: person.role };
      const existing = state.attendance.findIndex((item) => item.userId === mappedId && item.date === entry.date);
      if (existing >= 0) state.attendance[existing] = { ...state.attendance[existing], ...entry }; else state.attendance.push(entry);
    });
    const oldPms = readJson('nexus-pms-db', null);
    if (oldPms?.projects && oldPms?.tasks) {
      const extraProjects = oldPms.projects.filter((project) => !['proj-ops', 'proj-people'].includes(project.id)).map((project) => ({ ...project, ownerId: remapId(project.ownerId) }));
      mergeArray(state.pms.projects, extraProjects);
      const knownProjects = new Set(state.pms.projects.map((item) => item.id));
      const extraTasks = oldPms.tasks.filter((task) => !['task-ops-1', 'task-hr-1'].includes(task.id) && knownProjects.has(task.projectId) && users.some((user) => user.userId === remapId(task.assignedTo))).map((task) => {
        const assignedTo = remapId(task.assignedTo); const person = users.find((user) => user.userId === assignedTo);
        return { ...task, assignedTo, assignedName: person.name, createdBy: remapId(task.createdBy) };
      });
      mergeArray(state.pms.tasks, extraTasks);
    }
    const oldHrms = readJson('nexus-hrms-db', null);
    const migratePeople = (rows) => Array.isArray(rows) ? rows.map((item) => { const userId = remapId(item.userId); const person = users.find((user) => user.userId === userId); return person ? { ...item, userId, name: person.name, role: person.role } : null; }).filter(Boolean) : [];
    if (oldHrms) {
      mergeArray(state.hrms.leaveRequests, migratePeople(oldHrms.leaveRequests));
      mergeArray(state.hrms.complaints, migratePeople(oldHrms.complaints));
    }
    const oldOverrides = readJson('nexus-hrms-attendance-overrides', {});
    if (oldOverrides && typeof oldOverrides === 'object') Object.entries(oldOverrides).forEach(([key, value]) => { const [id, date] = key.split('|'); const mapped = remapId(id); if (users.some((user) => user.userId === mapped)) state.attendanceOverrides[`${mapped}|${date}`] = value; });
    for (const [legacyKey, section] of [['nexus-sales-db', 'sales'], ['nexus-finance-db', 'finance'], ['nexus-operations-db', 'operations']]) {
      const saved = readJson(legacyKey, null);
      if (saved && typeof saved === 'object') state[section] = saved;
    }
    const projectIds = new Set(state.pms.projects.map((project) => project.id));
    const addLinkedProject = (id, name, department = 'Sales') => {
      if (!id || projectIds.has(id)) return;
      const safeDepartment = departments.includes(department) ? department : 'Operations';
      const ownerId = safeDepartment === 'HR' ? 'HR-CHIEF-001' : ['Engineering', 'Sales'].includes(safeDepartment) ? 'MGR-ENG-001' : 'MGR-OPS-002';
      state.pms.projects.push({ id, name: name || 'Migrated company project', department: safeDepartment, ownerId, createdAt: now.toISOString(), status: 'Active' });
      projectIds.add(id);
    };
    (state.finance.projects || []).forEach((project) => addLinkedProject(project.id, project.name, project.department));
    (state.finance.invoices || []).forEach((invoice) => addLinkedProject(invoice.projectId, invoice.projectName || 'Client invoicing project', 'Sales'));
    state.pms.tasks = state.pms.tasks.filter((task) => state.pms.projects.some((project) => project.id === task.projectId) && users.some((user) => user.userId === task.assignedTo));
    // Reconcile project budget references with real PMS projects, while preserving valid saved budgets.
    state.finance.projects = state.finance.projects.filter((item) => state.pms.projects.some((project) => project.id === item.id && project.department !== 'HR' && project.status !== 'Completed'));
    state.finance.projects.forEach((item) => {
      const project = state.pms.projects.find((entry) => entry.id === item.id);
      item.name = project.name;
      item.department = project.department;
    });
    state.pms.projects.filter((project) => project.department !== 'HR' && project.status !== 'Completed').forEach((project) => {
      if (!state.finance.projects.some((item) => item.id === project.id)) state.finance.projects.push({ id: project.id, name: project.name, department: project.department, allocated: 50000, spent: 0 });
    });
    ['nexus-attendance', 'nexus-pms-db', 'nexus-sales-db', 'nexus-hrms-db', 'nexus-hrms-attendance-overrides', 'nexus-finance-db', 'nexus-operations-db'].forEach((key) => nativeRemove.call(localStorage, key));
    Object.keys(oldUsers).forEach((oldId) => nativeRemove.call(localStorage, `nexus-tasks-${oldId}`));
  }
  nativeSet.call(localStorage, ROOT_KEY, JSON.stringify(state));

  const paths = {
    'nexus-attendance': ['attendance'], 'nexus-pms-db': ['pms'], 'nexus-sales-db': ['sales'],
    'nexus-hrms-db': ['hrms'], 'nexus-hrms-attendance-overrides': ['attendanceOverrides'],
    'nexus-finance-db': ['finance'], 'nexus-operations-db': ['operations']
  };
  function notesUserId(key) {
    const prefix = 'nexus-personal-notes-';
    if (!key.startsWith(prefix)) return null;
    try { return decodeURIComponent(key.slice(prefix.length)); } catch { return key.slice(prefix.length); }
  }
  function valueFor(key) {
    if (paths[key]) return paths[key].reduce((value, part) => value?.[part], state);
    const userId = notesUserId(key);
    return userId ? (state.notes[userId] || []) : undefined;
  }
  Storage.prototype.getItem = function (key) {
    if (this !== localStorage) return nativeGet.call(this, key);
    const virtual = valueFor(String(key));
    return virtual === undefined ? nativeGet.call(this, key) : JSON.stringify(virtual);
  };
  Storage.prototype.setItem = function (key, value) {
    if (this !== localStorage) return nativeSet.call(this, key, value);
    key = String(key);
    if (paths[key]) {
      try {
        const parsed = JSON.parse(String(value));
        if (key === 'nexus-hrms-db') {
          state.hrms = { ...state.hrms, leaveRequests: parsed.leaveRequests || [], complaints: parsed.complaints || [] };
        } else state[paths[key][0]] = parsed;
        state.updatedAt = new Date().toISOString();
        nativeSet.call(localStorage, ROOT_KEY, JSON.stringify(state));
      } catch { /* Keep malformed writes out of the canonical state. */ }
      return;
    }
    const userId = notesUserId(key);
    if (userId) {
      try { const notes = JSON.parse(String(value)); if (!Array.isArray(notes) || notes.some((note) => note.userId !== userId)) return; state.notes[userId] = notes; state.updatedAt = new Date().toISOString(); nativeSet.call(localStorage, ROOT_KEY, JSON.stringify(state)); } catch { /* Ignore malformed note updates. */ }
      return;
    }
    nativeSet.call(this, key, value);
  };
  Storage.prototype.removeItem = function (key) {
    if (this !== localStorage) return nativeRemove.call(this, key);
    key = String(key);
    if (paths[key]) { const top = paths[key][0]; state[top] = top === 'attendance' ? [] : top === 'attendanceOverrides' ? {} : null; nativeSet.call(localStorage, ROOT_KEY, JSON.stringify(state)); return; }
    const userId = notesUserId(key);
    if (userId) { delete state.notes[userId]; nativeSet.call(localStorage, ROOT_KEY, JSON.stringify(state)); return; }
    nativeRemove.call(this, key);
  };

  window.NexusDB = Object.freeze({
    get users() { return state.users.map(({ password, ...user }) => ({ ...user })); },
    authenticate(userId, password) { const user = users.find((entry) => entry.userId === String(userId).trim().toUpperCase() && entry.password === password); return user ? { ...user } : null; },
    getUser(userId) { const user = users.find((entry) => entry.userId === userId); return user ? (({ password, ...safe }) => ({ ...safe }))(user) : null; },
    snapshot() { return JSON.parse(JSON.stringify(state)); },
    getNotes(userId) { return (state.notes[userId] || []).filter((note) => note.userId === userId); }
  });
})();
