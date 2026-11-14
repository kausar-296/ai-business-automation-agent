(() => {
  const session = JSON.parse(localStorage.getItem('nexus-session') || 'null');
  if (!session || document.body.dataset.page !== 'dashboard') return;

  const DB_KEY = 'nexus-pms-db';
  const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const seed = window.NexusDB?.snapshot().pms || { projects: [], tasks: [] };
  const readDb = () => {
    const saved = JSON.parse(localStorage.getItem(DB_KEY) || 'null');
    return saved && Array.isArray(saved.projects) && Array.isArray(saved.tasks) ? saved : seed;
  };
  let db = readDb();
  const save = () => localStorage.setItem(DB_KEY, JSON.stringify(db));
  if (!localStorage.getItem(DB_KEY)) save();

  const role = session.role;
  const isManager = role === 'manager';
  const isEmployee = role === 'employee';
  const isHr = role === 'hr';
  const canManageProjects = isManager || isHr;
  const currentUser = window.NexusDB?.getUser(session.userId);
  const scopedDepartments = currentUser?.departments || (isHr ? ['HR'] : []);
  const canAccessTask = (task) => isHr ? task.department === 'HR' : isManager ? scopedDepartments.includes(task.department) : isEmployee && task.assignedTo === session.userId;
  const panel = document.querySelector('[data-pms-panel]');
  const tabs = document.querySelector('[data-pms-tabs]');
  const notice = document.querySelector('[data-pms-notice]');
  const newProjectButton = document.querySelector('[data-new-project]');
  const esc = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const statusClass = (status) => status.toLowerCase().replace(/\s+/g, '-');
  const prettyDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date';
  const projectFor = (task) => db.projects.find((project) => project.id === task.projectId)?.name || 'General project';
  const allowedTasks = () => {
    return db.tasks.filter(canAccessTask);
  };
  const toast = (message, error = false) => {
    notice.textContent = message;
    notice.classList.toggle('is-error', error);
    notice.classList.add('is-visible');
    window.setTimeout(() => notice.classList.remove('is-visible'), 3600);
  };

  const views = [...document.querySelectorAll('[data-app-view]')];
  const navLinks = [...document.querySelectorAll('[data-view-link]')];
  const title = document.querySelector('.topbar-title h1');
  const breadcrumb = document.querySelector('.breadcrumb');
  function activateView(viewName) {
    views.forEach((view) => { view.hidden = view.dataset.appView !== viewName; });
    navLinks.forEach((link) => {
      const active = link.dataset.viewLink === viewName;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const projects = viewName === 'projects';
    title.textContent = projects ? 'Projects & Tasks' : 'Dashboard';
    breadcrumb.innerHTML = `Workspace <b>/</b> ${projects ? 'Projects &amp; Tasks' : 'Dashboard'}`;
    if (projects) render();
  }
  navLinks.forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    activateView(link.dataset.viewLink);
    history.replaceState(null, '', link.getAttribute('href'));
  }));
  document.querySelector('[data-pms-title]').textContent = isManager ? 'Projects & Tasks' : isHr ? 'HR Projects & Tasks' : 'My Projects & Tasks';
  document.querySelector('[data-pms-description]').textContent = canManageProjects
    ? isHr ? 'Create HR projects, allocate work, and review HR team submissions.' : 'Create projects, allocate work, and review your team’s submissions.'
    : isHr ? 'A dedicated view of HR projects and assigned work.' : 'Work through your assignments and submit progress for review.';
  newProjectButton.hidden = !canManageProjects;
  const tabNames = canManageProjects ? ['Projects', 'All Tasks', 'Pending Reviews'] : ['My Tasks', 'Projects'];
  let activeTab = tabNames[0];
  function renderTabs() {
    tabs.innerHTML = tabNames.map((tab) => `<button class="pms-tab ${activeTab === tab ? 'active' : ''}" type="button" role="tab" aria-selected="${activeTab === tab}" data-pms-tab="${esc(tab)}">${esc(tab)}${tab === 'Pending Reviews' ? `<span>${db.tasks.filter((task) => task.status === 'Submitted' && canAccessTask(task)).length}</span>` : ''}</button>`).join('');
  }
  function statusBadge(status) { return `<span class="pms-status status-${statusClass(status)}">${esc(status)}</span>`; }
  function renderAttachments(task) {
    const files = Array.isArray(task.attachments) ? task.attachments : [];
    if (!files.length) return '<span class="pms-muted">No files attached</span>';
    return `<div class="pms-attachments">${files.map((file, index) => {
      const isImage = file.type?.startsWith('image/') && file.dataUrl;
      const size = file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : 'Attachment';
      return `<article class="pms-attachment-item">${isImage ? `<button type="button" class="pms-attachment-preview" data-attachment-open="${index}" data-attachment-task="${esc(task.id)}" aria-label="Preview ${esc(file.name)}"><img src="${esc(file.dataUrl)}" alt="Preview of ${esc(file.name)}"></button>` : `<span class="pms-attachment-file-icon">▧</span>`}<div class="pms-attachment-info"><strong>${esc(file.name)}</strong><small>${esc(file.type || 'File')} · ${size}</small></div><div class="pms-attachment-actions"><button type="button" class="pms-attachment-open" data-attachment-open="${index}" data-attachment-task="${esc(task.id)}">Open</button>${file.dataUrl ? `<a href="${esc(file.dataUrl)}" download="${esc(file.name)}">Download</a>` : ''}</div></article>`;
    }).join('')}</div>`;
  }
  function openAttachment(taskId, attachmentIndex) {
    const task = db.tasks.find((item) => item.id === taskId && item.status === 'Submitted' && canAccessTask(item));
    const file = task?.attachments?.[attachmentIndex];
    if (!file?.dataUrl) return;
    const parts = file.dataUrl.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
    if (!parts) return;
    let bytes;
    if (parts[2]) {
      const binary = atob(parts[3]);
      bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(parts[3]));
    }
    const blob = new Blob([bytes], { type: file.type || parts[1] || 'application/octet-stream' });
    const objectUrl = URL.createObjectURL(blob);
    const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = file.name || 'attachment';
      anchor.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  }
  function projectCards(projects) {
    if (isManager) projects = projects.filter((project) => scopedDepartments.includes(project.department));
    if (isHr) projects = projects.filter((project) => project.department === 'HR');
    if (isEmployee) {
      const employeeProjectIds = new Set(db.tasks.filter((task) => task.assignedTo === session.userId).map((task) => task.projectId));
      projects = projects.filter((project) => employeeProjectIds.has(project.id));
    }
    if (!projects.length) return '<div class="pms-empty"><strong>No projects yet</strong><span>Projects created by your manager will appear here.</span></div>';
    return `<div class="pms-project-grid">${projects.map((project) => {
      const tasks = db.tasks.filter((task) => task.projectId === project.id && canAccessTask(task));
      const done = tasks.filter((task) => task.status === 'Completed').length;
      return `<article class="pms-project-card"><div class="pms-project-icon">▦</div><span class="pms-department">${esc(project.department)}</span><h3>${esc(project.name)}</h3><p>${tasks.length} task${tasks.length === 1 ? '' : 's'} · ${done} completed</p><div class="pms-progress-track"><span style="width:${tasks.length ? Math.round(done / tasks.length * 100) : 0}%"></span></div></article>`;
    }).join('')}</div>`;
  }
  function taskCards(tasks, managerMode = false) {
    if (!tasks.length) return `<div class="pms-empty"><strong>${managerMode ? 'Nothing waiting for review' : 'No tasks here yet'}</strong><span>${managerMode ? 'New employee submissions will appear in this queue.' : 'Tasks assigned to you will appear here.'}</span></div>`;
    return `<div class="pms-task-list">${tasks.map((task) => `<article class="pms-task-card" data-task-card="${esc(task.id)}">
      <div class="pms-task-top"><div><span class="pms-department">${esc(task.department)} · ${esc(projectFor(task))}</span><h3>${esc(task.title)}</h3></div>${statusBadge(task.status)}</div>
      <p class="pms-task-description">${esc(task.description || 'No description provided.')}</p>
      <div class="pms-task-meta"><span>${managerMode ? `Assigned to ${esc(task.assignedName)}` : `Due ${esc(prettyDate(task.dueDate))}`}</span><span>${Number(task.progress) || 0}% complete</span></div>
      <div class="pms-progress-track"><span style="width:${Math.max(0, Math.min(100, Number(task.progress) || 0))}%"></span></div>
      ${task.feedback ? `<div class="pms-feedback"><strong>Manager feedback</strong><p>${esc(task.feedback)}</p></div>` : ''}
      ${task.status === 'Submitted' ? `<div class="pms-report"><strong>Employee report</strong><p>${esc(task.report || 'No summary provided.')}</p>${renderAttachments(task)}</div>` : ''}
      <div class="pms-task-actions">${isEmployee && task.status !== 'Submitted' && task.status !== 'Completed' ? `<button type="button" class="pms-secondary" data-open-submission="${esc(task.id)}">${task.status === 'Needs Revision' ? 'Update & resubmit' : 'Update task'}</button>` : isEmployee ? '<span class="pms-muted">Awaiting manager review</span>' : ''}${managerMode && task.status === 'Submitted' ? `<button type="button" class="pms-secondary" data-request-changes="${esc(task.id)}">Request changes</button><button type="button" class="pms-primary" data-approve="${esc(task.id)}">Approve work</button>` : ''}</div>
    </article>`).join('')}</div>`;
  }
  function render() {
    renderTabs();
    if (activeTab === 'Projects') {
      const projects = db.projects;
      panel.innerHTML = projectCards(projects) + (canManageProjects ? `<div class="pms-task-section"><div class="pms-section-heading"><div><h3>Allocate a task</h3><p>${isHr ? 'Assign HR work to an employee in an HR project.' : 'Assign work to an employee in a project.'}</p></div></div><div data-task-create></div></div>` : '');
      if (canManageProjects) {
        renderTaskForm();
        const assigneeSelect = panel.querySelector('[data-task-form] select[name="assignee"]');
        const eligibleUsers = (window.NexusDB?.users || []).filter((user) => isHr ? user.role === 'hr' : user.role === 'employee' && scopedDepartments.includes(user.department));
        if (assigneeSelect) assigneeSelect.innerHTML = eligibleUsers.map((user) => `<option value="${esc(user.userId)}">${esc(user.name)} (${esc(user.userId)})</option>`).join('');
      }
    } else if (activeTab === 'Pending Reviews') {
      panel.innerHTML = taskCards(db.tasks.filter((task) => task.status === 'Submitted' && canAccessTask(task)), true);
    } else {
      const tasks = allowedTasks();
      panel.innerHTML = taskCards(tasks);
    }
  }
  function renderTaskForm() {
    const mount = panel.querySelector('[data-task-create]');
    if (!mount) return;
    const projects = db.projects.filter((project) => isHr ? project.department === 'HR' : scopedDepartments.includes(project.department));
    if (!projects.length) { mount.innerHTML = '<p class="pms-muted">Create a project before assigning tasks.</p>'; return; }
    mount.innerHTML = `<form class="pms-inline-form" data-task-form><label>Task title<input name="title" required maxlength="100" placeholder="e.g. Audit workflow exceptions"></label><label>Project<select name="projectId" required>${projects.map((project) => `<option value="${esc(project.id)}">${esc(project.name)}</option>`).join('')}</select></label><label>Assigned employee<select name="assignee" required><option value="">Select a team member</option></select></label><label>Due date<input name="dueDate" type="date"></label><label class="pms-form-wide">Description<textarea name="description" rows="2" placeholder="Describe the expected outcome"></textarea></label><button class="pms-primary" type="submit">＋ Assign task</button></form>`;
  }
  function showSubmission(taskId) {
    const task = db.tasks.find((item) => item.id === taskId && item.assignedTo === session.userId && item.status !== 'Submitted' && item.status !== 'Completed');
    if (!task) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'pms-dialog';
    dialog.innerHTML = `<form method="dialog" class="pms-modal-close"><button aria-label="Close submission form">×</button></form><div class="pms-modal-heading"><span class="pms-department">${esc(projectFor(task))}</span><h2>${esc(task.title)}</h2><p>${esc(task.description || '')}</p></div>${task.feedback ? `<div class="pms-feedback"><strong>Manager feedback · revise and resubmit</strong><p>${esc(task.feedback)}</p></div>` : ''}<form class="pms-submission-form" data-submission-form="${esc(task.id)}"><label for="progress-range">Completion progress <strong data-progress-value>${Number(task.progress) || 0}%</strong></label><input id="progress-range" type="range" name="progress" min="0" max="100" value="${Math.max(0, Math.min(100, Number(task.progress) || 0))}"><label for="work-report">Work summary <span>Required</span></label><textarea id="work-report" name="report" rows="5" required maxlength="1200" placeholder="Summarize the work completed, results, and any blockers.">${esc(task.report || '')}</textarea><label for="work-files">Attach files or images <span>Optional · up to 600 KB each</span></label><input id="work-files" name="files" type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt"><div class="pms-file-preview" data-file-preview>${(task.attachments || []).map((file) => file.type.startsWith('image/') && file.dataUrl ? `<span><img src="${file.dataUrl}" alt="">${esc(file.name)}</span>` : `<span class="pms-file-chip">▧ ${esc(file.name)}</span>`).join('')}</div><div class="pms-modal-actions"><button type="button" class="pms-secondary" data-cancel-modal>Cancel</button><button class="pms-primary" type="submit">Submit for Review</button></div></form>`;
    document.body.append(dialog);
    dialog.showModal();
    const fileInput = dialog.querySelector('#work-files');
    let attachments = [...(task.attachments || [])];
    dialog.querySelector('#progress-range').addEventListener('input', (event) => { dialog.querySelector('[data-progress-value]').textContent = `${event.target.value}%`; });
    dialog.querySelector('[data-cancel-modal]').addEventListener('click', () => dialog.close());
    dialog.querySelector('.pms-modal-close button').addEventListener('click', () => dialog.close());
    fileInput.addEventListener('change', async () => {
      const files = [...fileInput.files];
      if (files.some((file) => file.size > 600 * 1024)) {
        toast('Each attachment must be 600 KB or smaller.', true);
        fileInput.value = '';
        return;
      }
      try {
        attachments = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, dataUrl: reader.result });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })));
        dialog.querySelector('[data-file-preview]').innerHTML = attachments.map((file) => file.type.startsWith('image/') ? `<span><img src="${file.dataUrl}" alt="">${esc(file.name)}</span>` : `<span class="pms-file-chip">▧ ${esc(file.name)}</span>`).join('');
      } catch {
        toast('A file could not be read. Please try another attachment.', true);
      }
    });
    dialog.querySelector('[data-submission-form]').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      task.progress = Number(form.elements.progress.value);
      task.report = form.elements.report.value.trim();
      task.attachments = attachments;
      task.status = 'Submitted';
      task.feedback = '';
      task.updatedAt = new Date().toISOString();
      try {
        save();
        dialog.close();
        dialog.remove();
        render();
        toast('Your work has been submitted for manager review.');
      } catch {
        toast('Storage is full. Remove an attachment and submit again.', true);
      }
    });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
  }
  function requestChanges(taskId) {
    const task = db.tasks.find((item) => item.id === taskId && item.status === 'Submitted' && canAccessTask(item));
    if (!task) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'pms-dialog pms-review-dialog';
    dialog.innerHTML = `<form method="dialog" class="pms-modal-close"><button aria-label="Close">×</button></form><div class="pms-modal-heading"><span class="pms-department">${esc(task.assignedName)} · ${esc(task.title)}</span><h2>Request changes</h2><p>Feedback is required and will be shown to the employee with the task.</p></div><form class="pms-submission-form" data-feedback-form><label for="review-feedback">Manager feedback <span>Required</span></label><textarea id="review-feedback" name="feedback" rows="5" required minlength="3" maxlength="1000" placeholder="Explain what needs to be improved or completed."></textarea><div class="pms-modal-actions"><button type="button" class="pms-secondary" data-cancel-modal>Cancel</button><button class="pms-primary" type="submit">Send feedback</button></div></form>`;
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector('.pms-modal-close button').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-cancel-modal]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-feedback-form]').addEventListener('submit', (event) => {
      event.preventDefault();
      const feedback = event.currentTarget.elements.feedback.value.trim();
      if (!feedback) return;
      task.feedback = feedback;
      task.status = 'Needs Revision';
      task.updatedAt = new Date().toISOString();
      save();
      dialog.close();
      dialog.remove();
      render();
      toast('Changes requested. The employee can revise and resubmit.');
    });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
  }

  newProjectButton.addEventListener('click', () => {
    if (!canManageProjects) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'pms-dialog pms-review-dialog';
    const departmentField = isHr ? '<input type="hidden" name="department" value="HR"><div class="pms-fixed-department">Department <strong>HR</strong></div>' : `<label>Department<select name="department">${scopedDepartments.map((department) => `<option>${esc(department)}</option>`).join('')}</select></label>`;
    dialog.innerHTML = `<form method="dialog" class="pms-modal-close"><button aria-label="Close">×</button></form><div class="pms-modal-heading"><span class="pms-department">PROJECT SETUP</span><h2>Create a project</h2><p>${isHr ? 'Create a project for the HR department.' : 'Projects group work for a team or department.'}</p></div><form class="pms-submission-form" data-project-form><label>Project name<input name="name" required maxlength="80" placeholder="e.g. Workflow Optimization"></label>${departmentField}<div class="pms-modal-actions"><button type="button" class="pms-secondary" data-cancel-modal>Cancel</button><button class="pms-primary" type="submit">Create project</button></div></form>`;
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector('.pms-modal-close button').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-cancel-modal]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-project-form]').addEventListener('submit', (event) => {
      event.preventDefault();
      if (!canManageProjects) return;
      const form = event.currentTarget;
      const department = isHr ? 'HR' : form.elements.department.value;
      if ((isHr && department !== 'HR') || (isManager && department === 'HR')) { toast('Choose a project department available to your role.', true); return; }
      db.projects.push({ id: createId('proj'), name: form.elements.name.value.trim(), department, ownerId: session.userId, createdAt: new Date().toISOString(), status: 'Active' });
      save();
      dialog.close();
      dialog.remove();
      render();
      toast(`Project created for ${department}. You can now allocate tasks to an employee.`);
    });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
  });
  if (isEmployee) newProjectButton.remove();

  tabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pms-tab]');
    if (!button) return;
    activeTab = button.dataset.pmsTab;
    render();
  });
  panel.addEventListener('click', (event) => {
    const attachment = event.target.closest('[data-attachment-open]');
    if (attachment && (isManager || isHr || isEmployee)) openAttachment(attachment.dataset.attachmentTask, Number(attachment.dataset.attachmentOpen));
    const open = event.target.closest('[data-open-submission]');
    const approve = event.target.closest('[data-approve]');
    const revise = event.target.closest('[data-request-changes]');
    if (open && isEmployee) showSubmission(open.dataset.openSubmission);
    if (approve && canManageProjects) {
      const task = db.tasks.find((item) => item.id === approve.dataset.approve && item.status === 'Submitted' && canAccessTask(item));
      if (task) { task.status = 'Completed'; task.progress = 100; task.feedback = ''; task.updatedAt = new Date().toISOString(); save(); render(); toast('Work approved and marked completed.'); }
    }
    if (revise && canManageProjects) requestChanges(revise.dataset.requestChanges);
  });
  panel.addEventListener('submit', (event) => {
    if (!event.target.matches('[data-task-form]') || !canManageProjects) return;
    event.preventDefault();
    const form = event.target;
    const assignee = form.elements.assignee.value;
    const project = db.projects.find((item) => item.id === form.elements.projectId.value && (isHr ? item.department === 'HR' : scopedDepartments.includes(item.department)));
    if (!project) { toast('Choose a project available to your department.', true); return; }
    const assigneeUser = (window.NexusDB?.users || []).find((user) => user.userId === assignee);
    if (!assigneeUser || (isHr ? assigneeUser.role !== 'hr' : assigneeUser.role !== 'employee' || !scopedDepartments.includes(assigneeUser.department))) { toast('Choose an eligible team member.', true); return; }
    const task = { id: createId('task'), projectId: project.id, title: form.elements.title.value.trim(), description: form.elements.description.value.trim(), department: project.department, assignedTo: assignee, assignedName: assigneeUser.name, createdBy: session.userId, dueDate: form.elements.dueDate.value, progress: 0, status: 'Pending', report: '', attachments: [], feedback: '', updatedAt: new Date().toISOString() };
    db.tasks.push(task);
    save();
    render();
    toast(`Task assigned to ${task.assignedName}.`);
  });

  if (location.hash === '#projects') { activeTab = 'Projects'; activateView('projects'); }
  else render();
})();
