(() => {
  const storedTheme = localStorage.getItem('nexus-theme');
  const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const allowedThemes = ['dark', 'light', 'bright'];
  const initialTheme = allowedThemes.includes(storedTheme) ? storedTheme : preferredTheme;
  document.body.dataset.theme = initialTheme;
  window.NexusTheme = {
    setTheme(theme) {
      const selected = allowedThemes.includes(theme) ? theme : 'light';
      document.body.dataset.theme = selected;
      localStorage.setItem('nexus-theme', selected);
      const themeButton = document.querySelector('[data-theme-toggle]');
      themeButton?.setAttribute('aria-label', `Switch to ${selected === 'dark' ? 'light' : 'dark'} mode`);
      document.dispatchEvent(new CustomEvent('nexus-theme-change', { detail: { theme: selected } }));
      return selected;
    }
  };

  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    window.NexusTheme.setTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  const passwordInput = document.querySelector('#password');
  document.querySelector('[data-password-toggle]')?.addEventListener('click', (event) => {
    const showing = passwordInput.type === 'password';
    passwordInput.type = showing ? 'text' : 'password';
    event.currentTarget.setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
  });

  const form = document.querySelector('#login-form');
  if (!form) {
    const session = JSON.parse(localStorage.getItem('nexus-session') || 'null');
    if (session && !window.NexusDB?.getUser(session.userId)) {
      localStorage.removeItem('nexus-session');
      window.location.replace('index.html');
      return;
    }
    if (session) {
      const name = document.querySelector('[data-user-name]');
      const role = document.querySelector('[data-user-role]');
      if (name) name.textContent = session.name;
      if (role) role.textContent = session.role;
      if (document.body.dataset.page === 'dashboard') {
        const displayRole = { manager: 'Manager', employee: 'Employee', hr: 'HR' }[session.role] || 'Member';
        const today = new Date();
        const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const attendanceKey = 'nexus-attendance';
        const attendance = JSON.parse(localStorage.getItem(attendanceKey) || '[]');
        const currentAttendance = { userId: session.userId, name: session.name, role: session.role, date: dateKey, status: 'Present', timestamp: today.toISOString() };
        const existingAttendanceIndex = attendance.findIndex((entry) => entry.userId === session.userId && entry.date === dateKey);
        if (existingAttendanceIndex >= 0) attendance[existingAttendanceIndex] = currentAttendance;
        else attendance.push(currentAttendance);
        localStorage.setItem(attendanceKey, JSON.stringify(attendance));

        const initials = (session.name || 'Nexus Account').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
        document.querySelector('[data-user-initials]').textContent = initials;
        document.querySelector('[data-user-role-badge]').textContent = displayRole;
        document.querySelector('[data-role-pill]').textContent = displayRole;
        document.querySelector('[data-welcome-title]').textContent = `Welcome back, ${session.name}!`;
        document.querySelector('[data-today-label]').textContent = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
        document.querySelector('[data-dismiss-welcome]').addEventListener('click', () => document.querySelector('[data-welcome]').classList.add('is-hidden'));
        window.setTimeout(() => document.querySelector('[data-welcome]')?.classList.add('is-hidden'), 4800);

        const dashboard = document.querySelector('[data-dashboard-content]');
        const formatTime = (value) => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const card = (title, content, extra = '') => `<section class="dash-card ${extra}"><div class="dash-card-head"><h3>${title}</h3></div>${content}</section>`;
        if (session.role === 'employee') {
          document.querySelector('[data-role-heading]').textContent = 'Your day, at a glance';
          document.querySelector('[data-role-subtitle]').textContent = 'A focused view of your attendance and priorities.';
          const pms = JSON.parse(localStorage.getItem('nexus-pms-db') || '{"projects":[],"tasks":[]}');
          const tasks = pms.tasks.filter((task) => task.assignedTo === session.userId && task.status !== 'Completed');
          const workDays = new Set(attendance.filter((entry) => entry.userId === session.userId && entry.status === 'Present').map((entry) => entry.date));
          let streak = 0;
          for (let offset = 0; offset < 370; offset++) {
            const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
            if ([0, 6].includes(day.getDay())) continue;
            if (!workDays.has(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`)) break;
            streak++;
          }
          dashboard.innerHTML = `
            ${card('Attendance today', `<div class="attendance-status"><span class="attendance-check">✓</span><div><strong>Present</strong><small>Checked in at ${formatTime(currentAttendance.timestamp)}</small></div></div><div class="card-footnote">Attendance recorded automatically for today.</div>`)}
            ${card('Work streak', `<div class="streak-value">🔥 <strong>${streak}</strong> <span>days</span></div><div class="card-footnote">Based on your attendance history.</div>`)}
            ${card('Today’s priority tasks', `<div class="task-list">${tasks.length ? tasks.slice(0, 5).map((task) => `<article class="task-row" data-task-id="${task.id}"><div class="task-main"><span class="task-indicator ${task.status === 'Needs Revision' ? 'priority-high' : ''}"></span><div><strong>${task.title}</strong><small>${task.department} · ${task.progress}% complete</small></div></div><div class="task-actions"><span class="task-state">${task.status}</span><button type="button" class="task-update" data-task-action>Open task</button></div></article>`).join('') : '<p class="empty-state">No active assignments. New tasks from your team will appear here.</p>'}</div>`, 'span-2')}`;
          dashboard.addEventListener('click', (event) => { if (event.target.closest('[data-task-action]')) document.querySelector('[data-view-link="projects"]')?.click(); });
        } else if (session.role === 'manager') {
          document.querySelector('[data-role-heading]').textContent = 'Team overview';
          document.querySelector('[data-role-subtitle]').textContent = 'A live snapshot of your team’s activity and approvals.';
          const pms = JSON.parse(localStorage.getItem('nexus-pms-db') || '{"projects":[],"tasks":[]}');
          const departments = window.NexusDB?.getUser(session.userId)?.departments || [];
          const team = (window.NexusDB?.users || []).filter((person) => person.role === 'employee' && departments.includes(person.department));
          const teamIds = new Set(team.map((person) => person.userId));
          const teamLogs = attendance.filter((entry) => entry.date === dateKey && teamIds.has(entry.userId));
          const teamPresent = teamLogs.filter((entry) => entry.status === 'Present');
          const pendingReports = pms.tasks.filter((task) => task.status === 'Submitted' && departments.includes(task.department));
          const bottlenecks = pms.tasks.filter((task) => task.status === 'Needs Revision' && departments.includes(task.department));
          dashboard.innerHTML = `
            ${card('Team attendance', `<div class="metric-value">${teamPresent.length}<span> / ${team.length}</span></div><div class="metric-caption">Team members present today</div><div class="mini-avatars">${team.slice(0, 3).map((person) => `<span>${person.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>`).join('')}<span>+${Math.max(0, team.length - 3)}</span></div>`)}
            ${card('Reports to review', `<div class="metric-value">${pendingReports.length}</div><div class="metric-caption">Submitted by your team</div>${pendingReports.slice(0, 3).map((task) => `<div class="list-line"><span>${task.title}</span><b>${task.assignedName}</b></div>`).join('') || '<p class="empty-state">No reports are waiting for review.</p>'}`)}
            ${card('High-priority bottlenecks', `${bottlenecks.slice(0, 3).map((task) => `<div class="issue-row"><span class="issue-dot"></span><div><strong>${task.title}</strong><small>${task.department} · ${task.assignedName}</small></div><span class="priority-tag">REVISE</span></div>`).join('') || '<p class="empty-state">No task bottlenecks need attention.</p>'}`)}
            ${card('Team attendance log', `<div class="attendance-log">${teamPresent.length ? teamPresent.slice(-5).reverse().map((entry) => `<div class="log-row"><span class="log-avatar">${entry.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><strong>${entry.name}</strong><span class="present-tag">Present</span><time>${formatTime(entry.timestamp)}</time></div>`).join('') : '<p class="empty-state">Team check-ins will appear here as staff sign in today.</p>'}</div>`, 'span-2')}`;
        } else if (session.role === 'hr') {
          document.querySelector('[data-role-heading]').textContent = 'People operations';
          document.querySelector('[data-role-subtitle]').textContent = 'Company-wide attendance and employee requests.';
          const roster = window.NexusDB?.users || [];
          const hrms = JSON.parse(localStorage.getItem('nexus-hrms-db') || '{"leaveRequests":[],"complaints":[]}');
          const todayRows = attendance.filter((entry) => entry.date === dateKey);
          const present = todayRows.filter((entry) => entry.status === 'Present');
          const pendingLeaves = hrms.leaveRequests.filter((request) => request.status === 'Pending');
          const activeIssues = hrms.complaints.filter((issue) => issue.status !== 'Resolved');
          dashboard.innerHTML = `
            ${card('Company attendance', `<div class="metric-value">${present.length}<span> / ${roster.length}</span></div><div class="metric-caption">Employees present today</div><div class="attendance-bar"><span style="width:${roster.length ? Math.round(present.length / roster.length * 100) : 0}%"></span></div><div class="bar-legend"><span>${roster.length ? Math.round(present.length / roster.length * 100) : 0}% attendance</span><span>${Math.max(0, roster.length - present.length)} not checked in</span></div>`)}
            ${card('Pending leave applications', `<div class="metric-value">${pendingLeaves.length}</div><div class="metric-caption">Awaiting HR review</div>${pendingLeaves.slice(0, 3).map((request) => `<div class="list-line"><span>${request.name} · ${request.leaveType}</span><b>${request.startDate}</b></div>`).join('') || '<p class="empty-state">No leave applications are waiting.</p>'}`)}
            ${card('Employee issue reports', `${activeIssues.slice(0, 3).map((issue) => `<div class="issue-row"><span class="issue-dot neutral"></span><div><strong>${issue.subject}</strong><small>${issue.name} · ${issue.category}</small></div><span class="status-tag">${issue.status.toUpperCase()}</span></div>`).join('') || '<p class="empty-state">No open employee reports.</p>'}`)}
            ${card('Today’s attendance log', `<div class="attendance-log">${present.length ? present.slice(-5).reverse().map((entry) => `<div class="log-row"><span class="log-avatar">${entry.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><strong>${entry.name}</strong><span class="present-tag">Present</span><time>${formatTime(entry.timestamp)}</time></div>`).join('') : '<p class="empty-state">Attendance entries will appear here as employees sign in today.</p>'}</div>`, 'span-2')}`;
        }
      }
      document.querySelector('[data-logout]')?.addEventListener('click', () => {
        localStorage.removeItem('nexus-session');
        window.location.href = 'index.html';
      });
    } else if (document.body.dataset.page === 'dashboard') {
      window.location.replace('index.html');
    }
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const userId = document.querySelector('#user-id').value.trim();
    const password = passwordInput.value;
    const message = document.querySelector('#form-message');
    message.textContent = '';
    if (!userId || !password) {
      message.textContent = 'Enter your user ID and password to continue.';
      (!userId ? document.querySelector('#user-id') : passwordInput).focus();
      return;
    }
    const user = window.NexusDB?.authenticate(userId, password);
    if (!user) {
      message.textContent = 'The user ID or password you entered is incorrect. Please try again.';
      passwordInput.setAttribute('aria-invalid', 'true');
      passwordInput.focus();
      return;
    }
    passwordInput.removeAttribute('aria-invalid');
    localStorage.setItem('nexus-session', JSON.stringify({ userId: userId.toUpperCase(), name: user.name, role: user.role }));
    window.location.href = 'app.html';
  });
})();
