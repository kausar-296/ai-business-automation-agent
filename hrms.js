(() => {
  const session = JSON.parse(localStorage.getItem('nexus-session') || 'null');
  const nav = document.querySelector('[data-hrms-nav]');
  const view = document.querySelector('[data-hrms-view]');
  if (!session || !['hr', 'manager', 'employee'].includes(session.role)) {
    nav.hidden = true;
    view.hidden = true;
    return;
  }

  const hrAdmin = session.role === 'hr';
  const HRMS_KEY = 'nexus-hrms-db';
  const ATTENDANCE_KEY = 'nexus-attendance';
  const OVERRIDES_KEY = 'nexus-hrms-attendance-overrides';
  const staff = (window.NexusDB?.users || []).map(({ userId, name, role }) => ({ userId, name, role }));
  const safeRead = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  };
  let hrmsData = safeRead(HRMS_KEY, { leaveRequests: [], complaints: [] });
  if (!Array.isArray(hrmsData.leaveRequests)) hrmsData.leaveRequests = [];
  if (!Array.isArray(hrmsData.complaints)) hrmsData.complaints = [];
  let overrides = safeRead(OVERRIDES_KEY, {});
  if (!overrides || Array.isArray(overrides) || typeof overrides !== 'object') overrides = {};
  const saveData = () => {
    localStorage.setItem(HRMS_KEY, JSON.stringify(hrmsData));
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  };
  const attendanceRecords = () => {
    const rows = safeRead(ATTENDANCE_KEY, []);
    return Array.isArray(rows) ? rows : [];
  };
  const panel = document.querySelector('[data-hrms-panel]');
  const notice = document.querySelector('[data-hrms-notice]');
  const dateToday = new Date();
  const todayKey = localDateKey(dateToday);
  document.querySelector('[data-hrms-date]').textContent = dateToday.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  document.querySelector('[data-hrms-title]').textContent = hrAdmin ? 'HRMS & Attendance' : 'My HRMS Portal';
  document.querySelector('[data-hrms-subtitle]').textContent = hrAdmin
    ? 'Organization attendance, leave approvals, and employee concerns.'
    : 'Your attendance history, leave requests, and confidential HR support.';

  function localDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }
  function keyFor(userId, date) { return `${userId}|${date}`; }
  function getStatus(userId, date) {
    const override = overrides[keyFor(userId, date)];
    if (override) return override.status;
    const record = attendanceRecords().find((entry) => entry.userId === userId && entry.date === date);
    return record?.status || 'Absent';
  }
  function getTimestamp(userId, date) {
    return attendanceRecords().find((entry) => entry.userId === userId && entry.date === date)?.timestamp || '';
  }
  function prettyDate(date) {
    if (!date) return '—';
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function showNotice(message, error = false) {
    notice.textContent = message;
    notice.classList.toggle('is-error', error);
    notice.classList.add('is-visible');
    window.setTimeout(() => notice.classList.remove('is-visible'), 3800);
  }
  function statusBadge(status) {
    const style = status.toLowerCase().replace(/\s+/g, '-');
    return `<span class="hrms-status status-${style}">${escapeHtml(status)}</span>`;
  }
  function displayTime(timestamp) {
    return timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';
  }
  function daysBack(count) {
    return Array.from({ length: count }, (_, index) => {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - index);
      return day;
    });
  }

  function personalView() {
    const personalRecords = attendanceRecords().filter((row) => row.userId === session.userId);
    const presentCount = personalRecords.filter((row) => row.status === 'Present').length;
    const leaveCount = Object.entries(overrides).filter(([key, value]) => key.startsWith(`${session.userId}|`) && value.status === 'On Leave').length;
    const history = daysBack(14).map((day) => {
      const date = localDateKey(day);
      const status = getStatus(session.userId, date);
      return `<tr><td>${day.toLocaleDateString(undefined, { weekday: 'short' })}</td><td>${prettyDate(date)}${date === todayKey ? ' <span class="hrms-today-tag">Today</span>' : ''}</td><td>${statusBadge(status)}</td><td>${displayTime(getTimestamp(session.userId, date))}</td></tr>`;
    }).join('');
    const myRequests = hrmsData.leaveRequests.filter((item) => item.userId === session.userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const requestRows = myRequests.length ? myRequests.map((item) => `<div class="hrms-request-row"><div><strong>${escapeHtml(item.leaveType)} leave</strong><small>${prettyDate(item.startDate)} – ${prettyDate(item.endDate)}</small></div>${statusBadge(item.status)}</div>`).join('') : '<div class="hrms-empty-line">No leave applications yet.</div>';
    panel.innerHTML = `
      <div class="hrms-stat-grid">
        <article class="hrms-stat-card"><span>Present days recorded</span><strong>${presentCount}</strong><small>From your personal attendance history</small></article>
        <article class="hrms-stat-card"><span>Approved leave days</span><strong>${leaveCount}</strong><small>Recorded as On Leave</small></article>
        <article class="hrms-stat-card"><span>Attendance entries</span><strong>${personalRecords.length}</strong><small>Only your own records are shown</small></article>
      </div>
      <div class="hrms-self-grid">
        <section class="hrms-card"><div class="hrms-card-heading"><div><h3>My attendance history</h3><p>Your daily status for the last 14 days</p></div></div><div class="hrms-table-wrap"><table class="hrms-table"><thead><tr><th>Day</th><th>Date</th><th>Status</th><th>Check-in</th></tr></thead><tbody>${history}</tbody></table></div></section>
        <section class="hrms-card"><div class="hrms-card-heading"><div><h3>Apply for leave</h3><p>Send a request to the HR Manager for review.</p></div></div><form class="hrms-form" data-leave-form><label>Leave type<select name="leaveType" required><option value="Sick">Sick</option><option value="Casual">Casual</option><option value="Paid">Paid</option></select></label><div class="hrms-date-fields"><label>From<input type="date" name="startDate" min="${todayKey}" required></label><label>To<input type="date" name="endDate" min="${todayKey}" required></label></div><label>Reason<textarea name="reason" rows="3" maxlength="700" required placeholder="Briefly explain your request"></textarea></label><button class="hrms-primary" type="submit">Submit leave request</button></form></section>
        <section class="hrms-card"><div class="hrms-card-heading"><div><h3>My leave requests</h3><p>Track the status of your applications</p></div></div><div class="hrms-request-list">${requestRows}</div></section>
        <section class="hrms-card"><div class="hrms-card-heading"><div><h3>Report an issue to HR</h3><p>Confidential · visible only to the HR team</p></div></div><form class="hrms-form" data-complaint-form><label>Issue type<select name="category"><option>Workplace concern</option><option>Equipment problem</option><option>Facilities</option><option>Other</option></select></label><label>Subject<input type="text" name="subject" maxlength="100" required placeholder="Short description"></label><label>Details<textarea name="details" rows="4" maxlength="1200" required placeholder="Share the details HR needs to understand"></textarea></label><button class="hrms-secondary" type="submit">Send confidential report</button></form></section>
      </div>`;
  }

  function adminView() {
    const records = attendanceRecords();
    const todayPresent = staff.filter((person) => getStatus(person.userId, todayKey) === 'Present').length;
    const todayLeave = staff.filter((person) => getStatus(person.userId, todayKey) === 'On Leave').length;
    const pendingLeaves = hrmsData.leaveRequests.filter((item) => item.status === 'Pending').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const pendingComplaints = hrmsData.complaints.filter((item) => item.status !== 'Resolved').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const allComplaints = hrmsData.complaints.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const rosterRows = staff.map((person) => {
      const status = getStatus(person.userId, todayKey);
      return `<tr><td><div class="hrms-person"><span class="hrms-avatar">${person.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.userId)}</small></span></div></td><td>${escapeHtml(person.role === 'hr' ? 'HR Manager' : person.role === 'manager' ? 'Manager' : 'Employee')}</td><td>${statusBadge(status)}</td><td>${status === 'Present' ? displayTime(getTimestamp(person.userId, todayKey)) : '—'}</td></tr>`;
    }).join('');
    const eventRows = records.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 12).map((record) => `<tr><td>${escapeHtml(record.name)}</td><td>${escapeHtml(record.role)}</td><td>${prettyDate(record.date)}</td><td>${statusBadge(record.status)}</td><td>${displayTime(record.timestamp)}</td></tr>`).join('') || '<tr><td colspan="5" class="hrms-table-empty">No attendance entries have been recorded yet.</td></tr>';
    const leaveQueue = pendingLeaves.map((item) => `<article class="hrms-queue-card"><div class="hrms-queue-head"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.userId)} · ${escapeHtml(item.leaveType)} leave</small></div>${statusBadge(item.status)}</div><p class="hrms-request-dates">${prettyDate(item.startDate)} – ${prettyDate(item.endDate)}</p><p class="hrms-request-reason">${escapeHtml(item.reason)}</p><div class="hrms-queue-actions"><button class="hrms-danger" type="button" data-leave-decision="reject" data-request-id="${escapeHtml(item.id)}">Reject</button><button class="hrms-primary" type="button" data-leave-decision="approve" data-request-id="${escapeHtml(item.id)}">Approve</button></div></article>`).join('') || '<div class="hrms-empty"><strong>Leave queue is clear</strong><span>New employee and manager applications will appear here.</span></div>';
    const complaintCards = allComplaints.map((item) => `<article class="hrms-complaint-card" data-complaint="${escapeHtml(item.id)}"><div class="hrms-queue-head"><div><strong>${escapeHtml(item.subject)}</strong><small>${escapeHtml(item.name)} · ${escapeHtml(item.userId)} · ${escapeHtml(item.category)}</small></div>${statusBadge(item.status)}</div><p>${escapeHtml((item.details || '').slice(0, 180))}${(item.details || '').length > 180 ? '…' : ''}</p>${item.notes ? `<div class="hrms-note-history"><strong>HR notes</strong><p>${escapeHtml(item.notes)}</p></div>` : ''}<div class="hrms-queue-actions hrms-complaint-actions"><button class="hrms-outline" type="button" data-complaint-details="${escapeHtml(item.id)}">Read note / View details</button><button class="hrms-danger" type="button" data-delete-complaint="${escapeHtml(item.id)}">Delete</button></div><form class="hrms-note-form" data-complaint-note="${escapeHtml(item.id)}"><label>Add an internal note<textarea name="note" rows="2" maxlength="500" placeholder="Record follow-up or resolution details"></textarea></label><div class="hrms-queue-actions"><button class="hrms-secondary" type="submit">Save note</button>${item.status !== 'Under Review' ? `<button class="hrms-outline" type="button" data-complaint-status="Under Review" data-complaint-id="${escapeHtml(item.id)}">Mark under review</button>` : ''}${item.status !== 'Resolved' ? `<button class="hrms-primary" type="button" data-complaint-status="Resolved" data-complaint-id="${escapeHtml(item.id)}">Mark resolved</button>` : ''}</div></form></article>`).join('') || '<div class="hrms-empty"><strong>No employee reports yet</strong><span>Confidential messages from employees and managers appear here.</span></div>';
    panel.innerHTML = `
      <div class="hrms-stat-grid">
        <article class="hrms-stat-card"><span>Present today</span><strong>${todayPresent}<small> / ${staff.length}</small></strong><small>Across all departments</small></article>
        <article class="hrms-stat-card"><span>On leave today</span><strong>${todayLeave}</strong><small>Approved leave requests</small></article>
        <article class="hrms-stat-card"><span>Pending leave requests</span><strong>${pendingLeaves.length}</strong><small>Awaiting HR decision</small></article>
        <article class="hrms-stat-card"><span>Open employee reports</span><strong>${pendingComplaints.length}</strong><small>Submitted workplace concerns</small></article>
      </div>
      <section class="hrms-card hrms-wide-card"><div class="hrms-card-heading"><div><h3>Organization-wide attendance</h3><p>Today’s status for every employee, manager, and HR administrator</p></div><span class="hrms-live"><i></i> LIVE ROSTER</span></div><div class="hrms-table-wrap"><table class="hrms-table"><thead><tr><th>Team member</th><th>Role</th><th>Today’s status</th><th>Check-in time</th></tr></thead><tbody>${rosterRows}</tbody></table></div></section>
      <section class="hrms-card hrms-wide-card"><div class="hrms-card-heading"><div><h3>Recent attendance records</h3><p>Latest check-in entries from the attendance log</p></div></div><div class="hrms-table-wrap"><table class="hrms-table"><thead><tr><th>Team member</th><th>Role</th><th>Date</th><th>Status</th><th>Recorded at</th></tr></thead><tbody>${eventRows}</tbody></table></div></section>
      <div class="hrms-admin-grid"><section class="hrms-card"><div class="hrms-card-heading"><div><h3>Leave request queue</h3><p>Requests from employees and managers · ${pendingLeaves.length} pending</p></div></div><div class="hrms-queue-list">${leaveQueue}</div></section><section class="hrms-card"><div class="hrms-card-heading"><div><h3>Employee grievance inbox</h3><p>Private reports shared with HR only · ${pendingComplaints.length} open</p></div></div><div class="hrms-queue-list hrms-grievance-list">${complaintCards}</div></section></div>`;
  }

  function openComplaintDetails(issueId) {
    if (!hrAdmin) return;
    const issue = hrmsData.complaints.find((item) => item.id === issueId);
    if (!issue) return;
    const files = Array.isArray(issue.attachments) ? issue.attachments : [];
    const fileList = files.length ? `<div class="hrms-detail-files"><strong>Attachments</strong>${files.map((file) => {
      const name = escapeHtml(file.name || 'Attachment');
      const href = file.dataUrl || file.url;
      return href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${file.type?.startsWith('image/') ? `<img src="${escapeHtml(href)}" alt="">` : ''}${name}</a>` : `<span>${name}</span>`;
    }).join('')}</div>` : '';
    const dialog = document.createElement('dialog');
    dialog.className = 'hrms-details-dialog';
    dialog.setAttribute('aria-labelledby', 'hrms-complaint-title');
    dialog.innerHTML = `<header class="hrms-details-header"><div><span class="hrms-live">EMPLOYEE REPORT</span><h2 id="hrms-complaint-title">${escapeHtml(issue.subject)}</h2></div><button class="hrms-modal-close" type="button" aria-label="Close details">×</button></header><div class="hrms-details-meta"><div><span>Submitted by</span><strong>${escapeHtml(issue.name)}</strong><small>${escapeHtml(issue.userId)} · ${escapeHtml(issue.role === 'hr' ? 'HR Manager' : issue.role === 'manager' ? 'Manager' : 'Employee')}</small></div><div><span>Category</span><strong>${escapeHtml(issue.category)}</strong></div><div><span>Submitted</span><strong>${escapeHtml(new Date(issue.createdAt).toLocaleString())}</strong></div><div><span>Status</span>${statusBadge(issue.status)}</div></div><section class="hrms-details-body"><h3>Complaint details</h3><p>${escapeHtml(issue.details || 'No details provided.')}</p>${fileList}${issue.notes ? `<div class="hrms-note-history"><strong>HR notes</strong><p>${escapeHtml(issue.notes)}</p></div>` : ''}</section><footer class="hrms-details-actions">${issue.status !== 'Under Review' ? `<button class="hrms-outline" type="button" data-complaint-status="Under Review" data-complaint-id="${escapeHtml(issue.id)}">Mark under review</button>` : ''}${issue.status !== 'Resolved' ? `<button class="hrms-primary" type="button" data-complaint-status="Resolved" data-complaint-id="${escapeHtml(issue.id)}">Mark resolved</button>` : ''}<button class="hrms-danger" type="button" data-delete-complaint="${escapeHtml(issue.id)}">Delete report</button></footer>`;
    panel.append(dialog);
    dialog.showModal();
    dialog.querySelector('.hrms-modal-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
  }

  function render() {
    if (hrAdmin) adminView();
    else personalView();
  }
  function enterView() {
    document.querySelectorAll('[data-app-view]').forEach((item) => { item.hidden = true; });
    document.querySelector('[data-sales-view]').hidden = true;
    view.hidden = false;
    document.querySelectorAll('[data-view-link],[data-sales-nav]').forEach((link) => { link.classList.remove('active'); link.removeAttribute('aria-current'); });
    nav.classList.add('active');
    nav.setAttribute('aria-current', 'page');
    document.querySelector('.topbar-title h1').textContent = 'HRMS & Attendance';
    document.querySelector('.breadcrumb').innerHTML = 'Workspace <b>/</b> HRMS &amp; Attendance';
    render();
  }
  nav.addEventListener('click', (event) => {
    event.preventDefault();
    enterView();
    history.replaceState(null, '', '#hrms');
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-view-link],[data-sales-nav]')) {
      view.hidden = true;
      nav.classList.remove('active');
      nav.removeAttribute('aria-current');
    }
  }, true);

  panel.addEventListener('submit', (event) => {
    const form = event.target;
    if (form.matches('[data-leave-form]') && !hrAdmin) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const startDate = form.elements.startDate.value;
      const endDate = form.elements.endDate.value;
      if (endDate < startDate) { showNotice('The end date must be on or after the start date.', true); return; }
      const request = { id: `leave-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, userId: session.userId, name: session.name, role: session.role, leaveType: form.elements.leaveType.value, startDate, endDate, reason: form.elements.reason.value.trim(), status: 'Pending', createdAt: new Date().toISOString() };
      hrmsData.leaveRequests.push(request);
      saveData(); render(); showNotice('Your leave request has been sent to the HR Manager.');
    } else if (form.matches('[data-complaint-form]') && !hrAdmin) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      hrmsData.complaints.push({ id: `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, userId: session.userId, name: session.name, role: session.role, category: form.elements.category.value, subject: form.elements.subject.value.trim(), details: form.elements.details.value.trim(), status: 'Submitted', notes: '', createdAt: new Date().toISOString() });
      saveData(); render(); showNotice('Your confidential report was sent to HR.');
    } else if (form.matches('[data-complaint-note]') && hrAdmin) {
      event.preventDefault();
      const issue = hrmsData.complaints.find((item) => item.id === form.dataset.complaintNote);
      const note = form.elements.note.value.trim();
      if (!issue || !note) { showNotice('Enter a note before saving.', true); return; }
      const stamp = new Date().toLocaleString();
      issue.notes = `${issue.notes ? `${issue.notes}\n` : ''}${stamp} — ${note}`;
      issue.updatedAt = new Date().toISOString();
      saveData(); render(); showNotice('HR note saved.');
    }
  });

  panel.addEventListener('click', (event) => {
    if (!hrAdmin) return;
    const decision = event.target.closest('[data-leave-decision]');
    if (decision) {
      const request = hrmsData.leaveRequests.find((item) => item.id === decision.dataset.requestId && item.status === 'Pending');
      if (!request) return;
      if (decision.dataset.leaveDecision === 'approve') {
        request.status = 'Approved';
        const start = new Date(`${request.startDate}T00:00:00`);
        const end = new Date(`${request.endDate}T00:00:00`);
        for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
          const date = localDateKey(day);
          overrides[keyFor(request.userId, date)] = { status: 'On Leave', requestId: request.id, timestamp: new Date().toISOString() };
        }
        saveData(); render(); showNotice('Leave approved and attendance updated to On Leave.');
      } else {
        request.status = 'Rejected';
        request.rejectedAt = new Date().toISOString();
        Object.keys(overrides).forEach((key) => { if (overrides[key].requestId === request.id) delete overrides[key]; });
        saveData(); render(); showNotice('Leave request rejected. Attendance remains based on recorded check-ins.');
      }
      return;
    }
    const deleteComplaint = event.target.closest('[data-delete-complaint]');
    if (deleteComplaint) {
      const issue = hrmsData.complaints.find((item) => item.id === deleteComplaint.dataset.deleteComplaint);
      if (!issue) return;
      hrmsData.complaints = hrmsData.complaints.filter((item) => item.id !== issue.id);
      saveData();
      render();
      showNotice('Report deleted from the HR inbox.');
      return;
    }
    const statusButton = event.target.closest('[data-complaint-status]');
    if (statusButton) {
      const issue = hrmsData.complaints.find((item) => item.id === statusButton.dataset.complaintId);
      if (!issue) return;
      issue.status = statusButton.dataset.complaintStatus;
      issue.updatedAt = new Date().toISOString();
      saveData(); render(); showNotice(`Report marked ${issue.status.toLowerCase()}.`);
      return;
    }
    const detailsButton = event.target.closest('[data-complaint-details]');
    if (detailsButton) openComplaintDetails(detailsButton.dataset.complaintDetails);
  });

  render();
  if (location.hash === '#hrms') enterView();
})();
