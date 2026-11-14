(() => {
  const session = JSON.parse(localStorage.getItem('nexus-session') || 'null');
  const nav = document.querySelector('[data-notes-nav]');
  const view = document.querySelector('[data-notes-view]');
  if (!session?.userId || !['employee', 'manager', 'hr'].includes(session.role)) {
    nav.hidden = true;
    view.hidden = true;
    if (location.hash === '#notes') history.replaceState(null, '', 'app.html');
    return;
  }

  const userId = String(session.userId);
  const storageKey = `nexus-personal-notes-${encodeURIComponent(userId)}`;
  const grid = document.querySelector('[data-notes-grid]');
  const search = document.querySelector('[data-notes-search]');
  const count = document.querySelector('[data-notes-count]');
  const notice = document.querySelector('[data-notes-notice]');
  const MAX_FILES = 4;
  const MAX_FILE_BYTES = 500 * 1024;
  const MAX_NOTE_BYTES = 1.5 * 1024 * 1024;

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }
  function readOwnedNotes() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(stored) ? stored.filter((note) => note && note.userId === userId && typeof note.id === 'string') : [];
    } catch { return []; }
  }
  let notes = readOwnedNotes();
  function writeNotes(next) {
    const owned = next.filter((note) => note.userId === userId);
    const serialized = JSON.stringify(owned);
    if (new Blob([serialized]).size > MAX_NOTE_BYTES) {
      showNotice('Your notes are near the browser storage limit. Remove a large attachment and try again.', true);
      return false;
    }
    try {
      localStorage.setItem(storageKey, serialized);
      notes = owned;
      return true;
    } catch {
      showNotice('Browser storage is full. Remove a large attachment and try again.', true);
      return false;
    }
  }
  function showNotice(message, isError = false) {
    notice.textContent = message;
    notice.classList.toggle('is-error', isError);
    notice.classList.add('is-visible');
    window.setTimeout(() => notice.classList.remove('is-visible'), 3800);
  }
  function formatDate(value) {
    return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function formatSize(bytes = 0) {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  function renderAttachmentCards(note) {
    if (!note.attachments?.length) return '';
    return `<div class="note-attachments">${note.attachments.map((file, index) => `<article class="note-attachment">${file.type?.startsWith('image/') && file.dataUrl ? `<button class="note-image-preview" type="button" data-note-file-open="${index}" data-note-id="${escapeHtml(note.id)}" aria-label="Open image ${escapeHtml(file.name)}"><img src="${escapeHtml(file.dataUrl)}" alt="${escapeHtml(file.name)}"></button>` : `<span class="note-file-icon">▧</span>`}<div class="note-file-details"><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(file.type || 'Document')} · ${formatSize(file.size)}</small></div><div class="note-file-actions"><button type="button" data-note-file-open="${index}" data-note-id="${escapeHtml(note.id)}">Open</button>${file.dataUrl ? `<a href="${escapeHtml(file.dataUrl)}" download="${escapeHtml(file.name)}">Download</a>` : ''}</div></article>`).join('')}</div>`;
  }
  function render() {
    const query = search.value.trim().toLowerCase();
    const visibleNotes = notes.filter((note) => note.userId === userId && (!query || `${note.title} ${note.body} ${(note.attachments || []).map((file) => file.name).join(' ')}`.toLowerCase().includes(query)))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    count.textContent = `${visibleNotes.length} ${visibleNotes.length === 1 ? 'note' : 'notes'}`;
    if (!visibleNotes.length) {
      grid.innerHTML = query
        ? '<div class="notes-empty"><span class="notes-empty-icon">⌕</span><strong>No matching notes</strong><p>Try another title, note detail, or file name.</p></div>'
        : '<div class="notes-empty"><span class="notes-empty-icon">✎</span><strong>Your notes are private to you</strong><p>Create a note to keep personal details and files together.</p><button type="button" class="notes-primary" data-empty-create>＋ Create your first note</button></div>';
      return;
    }
    grid.innerHTML = visibleNotes.map((note) => `<article class="note-card" data-note-card="${escapeHtml(note.id)}"><div class="note-card-top"><span class="note-card-icon">✎</span><div class="note-card-actions"><button type="button" data-edit-note="${escapeHtml(note.id)}" aria-label="Edit ${escapeHtml(note.title)}">Edit</button><button type="button" class="note-delete" data-delete-note="${escapeHtml(note.id)}" aria-label="Delete ${escapeHtml(note.title)}">Delete</button></div></div><h3>${escapeHtml(note.title)}</h3><p class="note-body">${escapeHtml(note.body)}</p>${renderAttachmentCards(note)}<div class="note-card-footer"><span>${note.attachments?.length || 0} ${note.attachments?.length === 1 ? 'file' : 'files'}</span><time datetime="${escapeHtml(note.updatedAt)}">Updated ${formatDate(note.updatedAt)}</time></div></article>`).join('');
  }
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, dataUrl: reader.result });
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    });
  }
  function filePreviewMarkup(files) {
    if (!files.length) return '<p class="note-file-help">No attachments selected.</p>';
    return files.map((file, index) => `<div class="note-edit-file">${file.type?.startsWith('image/') && file.dataUrl ? `<img src="${escapeHtml(file.dataUrl)}" alt="">` : '<span class="note-file-icon">▧</span>'}<span><strong>${escapeHtml(file.name)}</strong><small>${formatSize(file.size)}</small></span><button type="button" data-remove-file="${index}" aria-label="Remove ${escapeHtml(file.name)}">×</button></div>`).join('');
  }
  function openEditor(note = null) {
    const original = note && notes.find((item) => item.id === note.id && item.userId === userId);
    if (note && !original) return;
    let attachments = original ? [...(original.attachments || [])] : [];
    const dialog = document.createElement('dialog');
    dialog.className = 'notes-dialog';
    dialog.innerHTML = `<form method="dialog" class="notes-dialog-close"><button aria-label="Close editor">×</button></form><div class="notes-dialog-heading"><span>PRIVATE TO YOUR ACCOUNT</span><h3>${original ? 'Edit note' : 'Create a note'}</h3><p>Your notes and files are saved under your user account.</p></div><form class="notes-editor" data-note-editor><label>Title<input name="title" maxlength="120" required placeholder="Give your note a title" value="${escapeHtml(original?.title || '')}"></label><label>Note<textarea name="body" rows="7" maxlength="8000" required placeholder="Write your note here...">${escapeHtml(original?.body || '')}</textarea></label><div class="note-attachment-label"><label for="note-files">Attachments <small>Images and documents · max ${formatSize(MAX_FILE_BYTES)} per file</small></label><input id="note-files" type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"></div><div class="note-edit-files" data-edit-files>${filePreviewMarkup(attachments)}</div><div class="notes-dialog-actions"><button type="button" class="notes-secondary" data-cancel-editor>Cancel</button><button type="submit" class="notes-primary">${original ? 'Save changes' : 'Save note'}</button></div></form>`;
    document.body.append(dialog);
    dialog.showModal();
    const fileInput = dialog.querySelector('#note-files');
    const editFiles = dialog.querySelector('[data-edit-files]');
    const refreshFiles = () => { editFiles.innerHTML = filePreviewMarkup(attachments); };
    dialog.querySelector('.notes-dialog-close button').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-cancel-editor]').addEventListener('click', () => dialog.close());
    editFiles.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-remove-file]');
      if (!remove) return;
      attachments.splice(Number(remove.dataset.removeFile), 1);
      refreshFiles();
    });
    fileInput.addEventListener('change', async () => {
      const chosen = [...fileInput.files];
      fileInput.value = '';
      if (attachments.length + chosen.length > MAX_FILES) {
        showNotice(`A note can have up to ${MAX_FILES} attachments.`, true);
        return;
      }
      if (chosen.some((file) => file.size > MAX_FILE_BYTES)) {
        showNotice(`Each attachment must be ${formatSize(MAX_FILE_BYTES)} or smaller.`, true);
        return;
      }
      const nextSize = attachments.reduce((total, file) => total + file.size, 0) + chosen.reduce((total, file) => total + file.size, 0);
      if (nextSize > MAX_NOTE_BYTES) {
        showNotice('Attachments for one note must total less than 1.5 MB.', true);
        return;
      }
      try {
        attachments.push(...await Promise.all(chosen.map(readFile)));
        refreshFiles();
      } catch (error) {
        showNotice(error.message, true);
      }
    });
    dialog.querySelector('[data-note-editor]').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const title = form.elements.title.value.trim();
      const body = form.elements.body.value.trim();
      if (!title || !body) {
        showNotice('Add both a title and note content before saving.', true);
        return;
      }
      const now = new Date().toISOString();
      const updatedNote = {
        id: original?.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        userId,
        title,
        body,
        attachments,
        createdAt: original?.createdAt || now,
        updatedAt: now
      };
      const next = original ? notes.map((item) => item.id === original.id && item.userId === userId ? updatedNote : item) : [updatedNote, ...notes];
      if (!writeNotes(next)) return;
      dialog.close();
      dialog.remove();
      render();
      showNotice(original ? 'Note updated and saved privately.' : 'Note saved privately to your account.');
    });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
  }
  function openFile(noteId, index) {
    const note = notes.find((item) => item.id === noteId && item.userId === userId);
    const file = note?.attachments?.[index];
    if (!file?.dataUrl) return;
    const match = file.dataUrl.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
    if (!match) return;
    let bytes;
    if (match[2]) {
      const binary = atob(match[3]);
      bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    } else bytes = new TextEncoder().encode(decodeURIComponent(match[3]));
    const url = URL.createObjectURL(new Blob([bytes], { type: file.type || match[1] || 'application/octet-stream' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  const navSelectors = '[data-view-link],[data-sales-nav],[data-hrms-nav],[data-finance-nav],[data-operations-nav]';
  function enterView() {
    document.querySelectorAll('[data-app-view]').forEach((item) => { item.hidden = true; });
    document.querySelector('[data-sales-view]').hidden = true;
    document.querySelector('[data-hrms-view]').hidden = true;
    document.querySelector('[data-finance-view]').hidden = true;
    document.querySelector('[data-operations-view]').hidden = true;
    view.hidden = false;
    document.querySelectorAll(`${navSelectors},[data-notes-nav]`).forEach((link) => { link.classList.remove('active'); link.removeAttribute('aria-current'); });
    nav.classList.add('active');
    nav.setAttribute('aria-current', 'page');
    document.querySelector('.topbar-title h1').textContent = 'Notes & Files';
    document.querySelector('.breadcrumb').innerHTML = 'Workspace <b>/</b> Notes &amp; Files';
    render();
  }
  nav.addEventListener('click', (event) => {
    event.preventDefault();
    enterView();
    history.replaceState(null, '', '#notes');
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest(navSelectors)) {
      view.hidden = true;
      nav.classList.remove('active');
      nav.removeAttribute('aria-current');
    }
    const fileButton = event.target.closest('[data-note-file-open]');
    if (fileButton) openFile(fileButton.dataset.noteId, Number(fileButton.dataset.noteFileOpen));
    const create = event.target.closest('[data-new-note],[data-empty-create]');
    if (create) openEditor();
    const edit = event.target.closest('[data-edit-note]');
    if (edit) {
      const note = notes.find((item) => item.id === edit.dataset.editNote && item.userId === userId);
      if (note) openEditor(note);
    }
    const remove = event.target.closest('[data-delete-note]');
    if (remove) {
      const note = notes.find((item) => item.id === remove.dataset.deleteNote && item.userId === userId);
      if (note && window.confirm(`Delete “${note.title}” and its attachments?`)) {
        if (writeNotes(notes.filter((item) => item.id !== note.id && item.userId === userId))) {
          render();
          showNotice('Note and attachments deleted.');
        }
      }
    }
  });
  search.addEventListener('input', render);

  render();
  if (location.hash === '#notes') enterView();
})();
