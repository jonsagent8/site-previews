/* GLS Lawn & Landscaping: interactive paver field + pinned horizontal project */
(() => {
  'use strict';
  const { $, $$, reduce } = window.CORE;

  /* ---------------- Paver field ---------------- */
  const host = $('#field');
  const cv = document.createElement('canvas');
  host.append(cv);
  const ctx = cv.getContext('2d');
  let W, H, dpr, pavers = [];
  const R = window.rng(5);
  const tones = ['#b7b2a7', '#a7a296', '#c4bfb4', '#9b968b', '#aea89b', '#8f8a80'];

  function layout() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = host.clientWidth; H = host.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    pavers = [];
    const unit = W < 760 ? 34 : 46, gap = 4;
    // ashlar-ish: rows of mixed widths (1x, 1.5x, 2x unit), rows of two heights
    let y = -unit * .5, row = 0;
    while (y < H + unit) {
      const h = (row % 3 === 2 ? unit * .75 : unit);
      let x = -(R() * unit);
      while (x < W + unit) {
        const w = unit * [1, 1.5, 2, 1, 1.5][Math.floor(R() * 5)];
        pavers.push({ x, y, w: w - gap, h: h - gap, tone: tones[Math.floor(R() * tones.length)], lift: 0, born: Math.hypot(x - W * .7, y - H * .5) });
        x += w;
      }
      y += h; row++;
    }
  }
  layout();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });

  let px = -9999, py = -9999, hasPointer = false;
  host.parentElement.addEventListener('pointermove', e => {
    const r = host.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; hasPointer = true;
  });
  host.parentElement.addEventListener('pointerleave', () => { hasPointer = false; });

  const t0 = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const r = host.getBoundingClientRect();
    if (r.bottom < 0) return;
    const el = t - t0;
    // auto-wander when no pointer (touch devices / idle)
    let cx = px, cy = py;
    if (!hasPointer) { cx = W * (.68 + Math.sin(el * .0005) * .22); cy = H * (.5 + Math.sin(el * .0008 + 1) * .3); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#15191b'; ctx.fillRect(0, 0, W, H);
    const radius = W < 760 ? 140 : 220;
    for (const p of pavers) {
      const intro = reduce ? 1 : Math.max(0, Math.min(1, (el - p.born * 1.1) / 500));
      if (intro <= 0) continue;
      const d = Math.hypot(p.x + p.w / 2 - cx, p.y + p.h / 2 - cy);
      const target = Math.max(0, 1 - d / radius);
      p.lift += ((reduce ? 0 : target) - p.lift) * .12;
      const L = p.lift * 10 + (1 - intro) * 30;
      const a = intro;
      // shadow
      ctx.globalAlpha = a * .55;
      ctx.fillStyle = '#000';
      ctx.fillRect(p.x + L * .6, p.y + L * .9, p.w, p.h);
      // face
      ctx.globalAlpha = a;
      ctx.fillStyle = p.tone;
      ctx.fillRect(p.x - L * .3, p.y - L * .5, p.w, p.h);
      // bevel highlight
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.fillRect(p.x - L * .3, p.y - L * .5, p.w, 2);
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.fillRect(p.x - L * .3, p.y - L * .5 + p.h - 2, p.w, 2);
      // lime edge glow near the cursor
      if (p.lift > .35) {
        ctx.strokeStyle = `rgba(181,224,79,${(p.lift - .35) * 1.4})`; ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x - L * .3 + .75, p.y - L * .5 + .75, p.w - 1.5, p.h - 1.5);
      }
    }
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(frame);

  /* ---------------- Pinned horizontal project ---------------- */
  const sec = $('#project'), track = $('#projTrack'), bar = $('#projBar');
  const frames = $$('.frame', track);
  function proj() {
    const r = sec.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, -r.top / (r.height - innerHeight)));
    const max = track.scrollWidth - innerWidth + Math.max(16, (innerWidth - 1200) / 2);
    track.style.transform = `translate3d(${-p * Math.max(0, max)}px,0,0)`;
    bar.style.width = (p * 100) + '%';
    frames.forEach(f => { const fr = f.getBoundingClientRect(); if (fr.left < innerWidth * .85) f.classList.add('seen'); });
  }
  addEventListener('scroll', proj, { passive: true }); addEventListener('resize', proj); proj();
})();
