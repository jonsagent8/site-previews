/* ===== Shared core: demo-site plumbing (copied into each site) =====
   Each page sets window.SITE = { key, phone:{display, tel} } in its <head>. */
(() => {
  'use strict';
  const S = window.SITE || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.CORE = { $, $$, reduce };

  // Phone wiring: every [data-phone] label and [data-tel] link follows SITE.phone
  if (S.phone) {
    $$('[data-phone]').forEach(el => { el.textContent = S.phone.display; });
    $$('[data-tel]').forEach(el => { el.href = 'tel:' + S.phone.tel; });
  }
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  // Concept banner
  const banner = $('.concept-banner');
  if (banner) {
    const k = (S.key || 'demo') + '-banner';
    try { if (sessionStorage.getItem(k) === '1') banner.classList.add('is-hidden'); } catch (e) {}
    $('.concept-close', banner)?.addEventListener('click', () => {
      banner.classList.add('is-hidden');
      try { sessionStorage.setItem(k, '1'); } catch (e) {}
    });
  }

  // Header state + mobile call bar
  const header = $('.site-header');
  const callbar = $('.callbar');
  const onScroll = () => {
    const y = scrollY;
    header?.classList.toggle('scrolled', y > 24);
    callbar?.classList.toggle('show', y > innerHeight * 0.6);
  };
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  // Mobile nav
  const toggle = $('.nav-toggle');
  toggle?.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', open);
  });
  $$('.main-nav a').forEach(a => a.addEventListener('click', () => {
    document.body.classList.remove('nav-open');
    toggle?.setAttribute('aria-expanded', 'false');
  }));

  // Reveal on scroll
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  // Count-up numbers: <span data-count="17" data-decimals="0" data-suffix="+">
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, end = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0), suf = el.dataset.suffix || '';
    if (reduce) { el.textContent = end.toFixed(dec) + suf; return; }
    const t0 = performance.now(), dur = 1400;
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur), v = end * (1 - Math.pow(1 - p, 3));
      el.textContent = v.toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  // Toast
  let toastEl;
  window.toast = msg => {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.append(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 4200);
  };

  // Estimate form: demo only, nothing is sent
  $$('form[data-demo]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    if (!f.reportValidity()) return;
    window.toast('Thanks! This is a preview site, so the form isn’t connected yet. Please call ' + (S.phone ? S.phone.display : 'us') + '.');
    f.reset();
  }));

  // Seeded RNG helper for generative art
  window.rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
})();
