(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  const backdrop = document.querySelector('.nav-backdrop');
  const mqDesktop = window.matchMedia('(min-width: 961px)');

  function setOpen(open) {
    if (!header || !toggle) return;
    header.dataset.navOpen = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    if (backdrop) backdrop.hidden = !open;
    document.body.style.overflow = open && !mqDesktop.matches ? 'hidden' : '';
    if (open) {
      const firstLink = nav?.querySelector('a');
      firstLink && firstLink.focus({ preventScroll: true });
    } else {
      toggle.focus({ preventScroll: true });
    }
  }

  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    setOpen(!open);
  });

  backdrop?.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });

  (mqDesktop.addEventListener ? mqDesktop.addEventListener('change', () => setOpen(false)) : window.addEventListener('resize', () => setOpen(false)));

  // ローカル編集モード
  const editorToggle = document.querySelector('[data-editor-toggle]');
  const editorPanel = document.getElementById('editor-panel');
  const exportBox = document.getElementById('editor-export');
  const exportBtn = document.querySelector('[data-editor-export]');
  const saveBtn = document.querySelector('[data-editor-save]');
  const resetBtn = document.querySelector('[data-editor-reset]');
  const linkInputs = document.querySelectorAll('[data-edit-link-input]');
  const cssInputs = document.querySelectorAll('[data-edit-css-input]');
  const editableEls = document.querySelectorAll('[data-edit-id]');

  const stateKey = 'coderlessEditorState';
  let editMode = false;
  const baseContent = (typeof window !== 'undefined' && window.__CONTENT__) ? window.__CONTENT__ : {};
  const state = {
    text: { ...(baseContent.text || {}) },
    links: { ...(baseContent.links || {}) },
    cssVars: { ...(baseContent.cssVars || {}) }
  };

  function loadState() {
    try {
      const saved = localStorage.getItem(stateKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          Object.assign(state.text, parsed.text || {});
          Object.assign(state.links, parsed.links || {});
          Object.assign(state.cssVars, parsed.cssVars || {});
        }
      }
    } catch (err) {
      console.warn('editor state load failed', err);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(stateKey, JSON.stringify(state));
    } catch (err) {
      console.warn('editor state save failed', err);
    }
  }

  function applyState() {
    editableEls.forEach(el => {
      const id = el.getAttribute('data-edit-id');
      if (id && state.text[id] != null) {
        el.innerHTML = state.text[id];
      }
    });
    Object.keys(state.links).forEach(key => {
      document.querySelectorAll(`[data-edit-link="${key}"]`).forEach(el => {
        el.setAttribute('href', state.links[key]);
      });
    });
    Object.keys(state.cssVars).forEach(varName => {
      document.documentElement.style.setProperty(varName, state.cssVars[varName]);
    });
  }

  function refreshExportBox() {
    if (!exportBox) return;
    exportBox.value = JSON.stringify(state, null, 2);
  }

  function setEditMode(next) {
    editMode = next;
    document.body.classList.toggle('is-editing', editMode);
    if (editorPanel) editorPanel.hidden = !editMode;
    editableEls.forEach(el => {
      el.setAttribute('contenteditable', String(editMode));
      el.setAttribute('spellcheck', String(editMode));
    });
    if (editMode) {
      refreshExportBox();
    }
  }

  editableEls.forEach(el => {
    const id = el.getAttribute('data-edit-id');
    if (!id) return;
    el.addEventListener('input', () => {
      state.text[id] = el.innerHTML;
      saveState();
      refreshExportBox();
    });
  });

  linkInputs.forEach(input => {
    const key = input.getAttribute('data-edit-link-input');
    if (!key) return;
    input.addEventListener('input', () => {
      state.links[key] = input.value.trim();
      document.querySelectorAll(`[data-edit-link="${key}"]`).forEach(el => {
        el.setAttribute('href', state.links[key]);
      });
      saveState();
      refreshExportBox();
    });
  });

  cssInputs.forEach(input => {
    const varName = input.getAttribute('data-edit-css-var');
    if (!varName) return;
    input.addEventListener('input', () => {
      const raw = input.value.trim();
      state.cssVars[varName] = raw ? `url('${raw}')` : '';
      document.documentElement.style.setProperty(varName, state.cssVars[varName]);
      saveState();
      refreshExportBox();
    });
  });

  editorToggle?.addEventListener('click', () => setEditMode(!editMode));

  exportBtn?.addEventListener('click', async () => {
    refreshExportBox();
    const text = exportBox ? exportBox.value : JSON.stringify(state, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.warn('clipboard write failed', err);
    }
  });

  saveBtn?.addEventListener('click', async () => {
    refreshExportBox();
    const payload = exportBox ? exportBox.value : JSON.stringify(state, null, 2);
    const originalLabel = saveBtn.textContent || 'ファイルに保存';
    try {
      const res = await fetch('/api/save.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });
      if (!res.ok) {
        console.warn('save failed', await res.text());
        return;
      }
      saveBtn.textContent = '保存完了';
      setTimeout(() => {
        saveBtn.textContent = originalLabel;
      }, 1500);
    } catch (err) {
      console.warn('save request failed', err);
    }
  });

  resetBtn?.addEventListener('click', () => {
    localStorage.removeItem(stateKey);
    window.location.reload();
  });

  loadState();
  applyState();

  // 初期値を入力に反映
  linkInputs.forEach(input => {
    const key = input.getAttribute('data-edit-link-input');
    if (!key) return;
    const current = state.links[key] || document.querySelector(`[data-edit-link="${key}"]`)?.getAttribute('href');
    if (current) input.value = current;
  });
  cssInputs.forEach(input => {
    const varName = input.getAttribute('data-edit-css-var');
    if (!varName) return;
    const current = state.cssVars[varName] || getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (current) input.value = current.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
  });

  // スムーズスクロール（ヘッダー分オフセット）
  const offset = () => (header ? header.getBoundingClientRect().height + 10 : 0);
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      if (editMode) {
        e.preventDefault();
        return;
      }
      const id = a.getAttribute('href');
      if (!id || id.length <= 1) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y = window.scrollY + target.getBoundingClientRect().top - offset();
      window.scrollTo({ top: y, behavior: 'smooth' });
      setOpen(false);
    });
  });

  document.addEventListener('click', (e) => {
    if (!editMode) return;
    const target = e.target;
    if (target && target.closest && target.closest('a')) {
      e.preventDefault();
    }
  });
})();
