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

  // スムーズスクロール（ヘッダー分オフセット）
  const offset = () => (header ? header.getBoundingClientRect().height + 10 : 0);
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
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
})();
