/* Green Horizon: pinned outside->inside horizon wipe + review slider */
(() => {
  'use strict';
  const { $, $$, reduce } = window.CORE;

  const hero = $('.reveal-hero'), stage = $('.rh-stage'), hint = $('.rh-hint');
  function onScroll() {
    const r = hero.getBoundingClientRect();
    const raw = Math.max(0, Math.min(1, -r.top / (r.height - innerHeight)));
    const p = raw < .1 ? 0 : Math.min(1, (raw - .1) / .8); // short hold at both ends
    stage.style.setProperty('--p', p.toFixed(4));
    stage.classList.toggle('is-inside', p > .5);
    hint.style.opacity = raw > .03 ? 0 : 1;
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Review slider
  const slides = $$('.rv'), dots = $('#revDots');
  let i = 0, timer;
  slides.forEach((_, k) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', 'Review ' + (k + 1));
    b.addEventListener('click', () => go(k, true));
    dots.append(b);
  });
  function go(k, user) {
    i = (k + slides.length) % slides.length;
    slides.forEach((s, j) => s.classList.toggle('is-on', j === i));
    [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i));
    if (user) restart();
  }
  function restart() { clearInterval(timer); if (!reduce) timer = setInterval(() => go(i + 1), 6500); }
  $('#prevRev').addEventListener('click', () => go(i - 1, true));
  $('#nextRev').addEventListener('click', () => go(i + 1, true));
  go(0); restart();
})();
