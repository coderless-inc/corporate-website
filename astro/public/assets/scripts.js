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
  const collapseBtn = document.querySelector('[data-editor-collapse]');
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
  const inlineOnlyIds = new Set([
    'heroSubtitle',
    'heroLead',
    'messageP1',
    'messageP2',
    'messageP3',
    'messageP4',
    'messageP5',
    'ctaBody',
    // aeformlib page (keep contenteditable from introducing <div>)
    'aeLead',
    'aeOutcome1',
    'aeOutcome2',
    'aeOutcome3',
    'aeValue1Body',
    'aeValue2Body',
    'aeValue3Body',
    'aeWhyP1',
    'aeWhyP2',
    'aeWhyP3',
    'aeFitL1',
    'aeFitL2',
    'aeFitL3',
    'aeFitR1',
    'aeFitR2',
    'aeFitR3',
    'aeFeat1Body',
    'aeFeat2Body',
    'aeFeat3Body',
    'aeCtaBody',
    // marketing page
    'mkHeroLead',
    'mkPainIntro',
    'mkPain1Copy',
    'mkPain2Copy',
    'mkPain3Copy',
    'mkPain4Copy',
    'mkPain5Copy',
    'mkPain6Copy',
    'mkVisualP1',
    'mkVisualP2',
    'mkVisualP3',
    'mkScope1Desc',
    'mkScope2Desc',
    'mkScope3Desc',
    'mkProcess1Desc',
    'mkProcess2Desc',
    'mkProcess3Desc',
    'mkDeliver1',
    'mkDeliver2',
    'mkDeliver3',
    'mkDeliver4',
    'mkDeliver5',
    'mkDeliver6',
    'mkProductDesc',
    'mkCtaBody'
  ]);

  function normalizeInlineHtml(html) {
    return html
      .replace(/<div[^>]*>/gi, '<br>')
      .replace(/<\/div>/gi, '')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '')
      .replace(/(<br>\s*){2,}/gi, '<br>')
      .replace(/^<br>/i, '');
  }

  function normalizeInlineState() {
    let changed = false;
    Object.keys(state.text).forEach((id) => {
      if (!inlineOnlyIds.has(id)) return;
      const raw = state.text[id];
      if (typeof raw !== 'string') return;
      const next = normalizeInlineHtml(raw);
      if (next !== raw) {
        state.text[id] = next;
        changed = true;
      }
    });
    return changed;
  }

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
    const didNormalize = normalizeInlineState();
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
    return didNormalize;
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
      const raw = el.innerHTML;
      const next = inlineOnlyIds.has(id) ? normalizeInlineHtml(raw) : raw;
      if (next !== raw) {
        el.innerHTML = next;
      }
      state.text[id] = next;
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

  collapseBtn?.addEventListener('click', () => {
    if (!editorPanel) return;
    const isCollapsed = editorPanel.classList.toggle('is-collapsed');
    collapseBtn.textContent = isCollapsed ? '展開' : '折りたたむ';
  });

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
    if (normalizeInlineState()) {
      applyState();
    }
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
  const didNormalize = applyState();
  if (didNormalize) {
    saveState();
    refreshExportBox();
  }

  if (editorPanel && collapseBtn) {
    editorPanel.classList.add('is-collapsed');
    collapseBtn.textContent = '展開';
  }

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
