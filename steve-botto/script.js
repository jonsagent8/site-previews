/* Steve Botto: self-drawing site plan that renders into color on scroll */
(() => {
  'use strict';
  const { $, $$, reduce } = window.CORE;
  const sec = $('.plan'), stage = $('.plan-stage'), header = $('.site-header');
  const lines = $$('.lines > *'), fills = $$('.fills > *'), notes = $$('.note'), steps = $$('.ps');
  const label = $('#sheetLabel'), tb = $('#tbText');
  const lens = lines.map(el => { const L = el.getTotalLength ? el.getTotalLength() : 1000; el.style.strokeDasharray = L; el.style.strokeDashoffset = L; return L; });
  // keep dashed elements dashed once drawn
  const dashed = lines.map(el => el.getAttribute('stroke-dasharray'));
  const clamp = v => Math.max(0, Math.min(1, v));

  function update() {
    const r = sec.getBoundingClientRect();
    const p = reduce ? 1 : clamp(-r.top / (r.height - innerHeight));
    const draw = clamp((p - .04) / .5), render = clamp((p - .56) / .3);
    const n = lines.length;
    lines.forEach((el, i) => {
      const local = clamp(draw * (n * .35 + 1) - i * .35);
      if (local >= 1 && dashed[i]) { el.style.strokeDasharray = dashed[i]; el.style.strokeDashoffset = 0; }
      else { el.style.strokeDasharray = lens[i]; el.style.strokeDashoffset = lens[i] * (1 - local); }
    });
    fills.forEach((el, i) => el.classList.toggle('on', render * (fills.length + 1) > i + .5));
    notes.forEach(el => el.classList.toggle('on', p >= +el.dataset.at && p < .9));
    const paper = p > .6;
    stage.classList.toggle('paper', paper);
    header.classList.toggle('on-bp', !paper && r.bottom > 80);
    const si = p < .05 ? 0 : p < .56 ? 1 : p < .86 ? 2 : 3;
    steps.forEach((s, i) => s.classList.toggle('on', i === si));
    label.textContent = ['Sheet L-1 · Survey', 'Sheet L-1 · Design drawing', 'Sheet L-2 · Color rendering', 'Approved · Ready to build'][si];
    tb.textContent = si === 3 ? 'APPROVED · BUILD' : si === 2 ? 'RENDER · 1:100' : 'DRAFT · SCALE 1:100';
  }
  addEventListener('scroll', update, { passive: true }); addEventListener('resize', update); update();
})();
