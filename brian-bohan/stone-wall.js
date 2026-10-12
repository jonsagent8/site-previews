/* Piece: stone-wall. A dry-laid fieldstone wall builds itself course by course, then moss
   creeps in. Stones near the pointer lift slightly. Colors come from CSS vars on the container:
   --stone-1..4 (stone tones), --gap (shadow between stones), --moss, --ground. */
(() => {
  const host = document.querySelector('.piece[data-piece="stone-wall"]');
  if (!host) return;
  const reduce = window.CORE ? window.CORE.reduce : matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(host);
  const v = (n, d) => (css.getPropertyValue(n).trim() || d);
  const tones = [v('--stone-1', '#9a948a'), v('--stone-2', '#b3ab9c'), v('--stone-3', '#7f7a72'), v('--stone-4', '#c4b9a5')];
  const GAP = v('--gap', '#2a2622'), MOSS = v('--moss', '#6f8a3e'), GROUND = v('--ground', '#3e4a2a');
  const seed = +(host.dataset.seed || 7);

  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  host.append(cv);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, stones = [], moss = [], t0 = 0, mouse = { x: -1e4, y: -1e4 }, raf = 0, done = false;

  function hexMix(a, b, k) {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * k)).join(',')})`;
  }

  function build() {
    const r = window.rng ? window.rng(seed) : Math.random;
    stones = []; moss = [];
    const wallTop = H * 0.30, groundY = H * 0.88;
    const courses = Math.max(5, Math.round((groundY - wallTop) / Math.max(34, H * 0.075)));
    const ch = (groundY - wallTop) / courses;
    // the wall curves slightly so it reads as a garden wall, not a brick grid
    const curve = x => Math.sin((x / W) * Math.PI) * -H * 0.035;
    for (let c = 0; c < courses; c++) {
      const yBase = groundY - (c + 1) * ch;
      let x = -r() * ch;
      let i = 0;
      while (x < W + ch) {
        const isCap = c === courses - 1;
        const w = ch * (isCap ? 1.6 + r() * 1.4 : 0.9 + r() * 1.5);
        const h = ch * (isCap ? 0.62 + r() * 0.2 : 0.82 + r() * 0.2);
        const cx = x + w / 2, y = yBase + (ch - h) / 2 + curve(cx) + (r() - 0.5) * ch * 0.08;
        // irregular rounded outline
        const pts = [], N = 14;
        for (let k = 0; k < N; k++) {
          const a = (k / N) * Math.PI * 2;
          const sx = Math.cos(a), sy = Math.sin(a);
          const sq = 0.32 + r() * 0.12; // superellipse squareness
          const rx = Math.sign(sx) * Math.pow(Math.abs(sx), sq), ry = Math.sign(sy) * Math.pow(Math.abs(sy), sq);
          const j = 1 - r() * 0.09;
          pts.push([rx * (w / 2 - 2) * j, ry * (h / 2 - 2) * j]);
        }
        const base = tones[Math.floor(r() * tones.length)];
        stones.push({
          x: cx, y: y + h / 2, w, h, pts,
          fill: hexMix(base, '#ffffff', r() * 0.12), shade: hexMix(base, '#000000', 0.32), hi: hexMix(base, '#ffffff', 0.35),
          delay: c * 0.32 + (i * 0.045) + r() * 0.12, rot: (r() - 0.5) * 0.06, lift: 0,
          speckle: Array.from({ length: 5 }, () => [(r() - 0.5) * w * 0.7, (r() - 0.5) * h * 0.6, 0.6 + r() * 1.6]),
        });
        x += w + ch * 0.04; i++;
      }
    }
    // moss tufts settle into joints after the wall is built
    // moss: small tufts tucked into the joints (bottom edge of a stone), mostly low on the wall
    for (let k = 0; k < 26; k++) {
      const s = stones[Math.floor(Math.pow(r(), 1.6) * stones.length)];
      const dx = (r() - 0.5) * s.w * 0.7;
      for (let j = 0; j < 4; j++) moss.push({ s, dx: dx + (r() - 0.5) * 10, dy: s.h * 0.46 + (r() - 0.3) * 4, r: 1.2 + r() * 2.4, delay: 3.2 + k * 0.06 + r() * 0.4 });
    }
  }

  function resize() {
    const b = host.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = b.width; H = b.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  const ease = t => 1 - Math.pow(1 - t, 3);
  function easeBack(t) { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

  function draw(now) {
    const t = reduce ? 99 : (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    // ground
    const g = ctx.createLinearGradient(0, H * 0.84, 0, H);
    g.addColorStop(0, hexMix(GROUND, '#000000', 0.0)); g.addColorStop(1, hexMix(GROUND, '#000000', 0.35));
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.87, W, H);
    let settled = true;
    for (const s of stones) {
      const k = Math.min(1, Math.max(0, (t - s.delay) / 0.7));
      if (k < 1) settled = false;
      if (k <= 0) continue;
      const near = Math.hypot(mouse.x - s.x, mouse.y - s.y) < Math.max(s.w, s.h) * 0.75;
      s.lift += ((near && k >= 1 ? -5 : 0) - s.lift) * 0.18;
      const y = s.y - (1 - easeBack(k)) * H * 0.5 + s.lift;
      ctx.save();
      ctx.globalAlpha = ease(Math.min(1, k * 2));
      ctx.translate(s.x, y); ctx.rotate(s.rot);
      // contact shadow / joint
      ctx.beginPath();
      s.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * 1.06, py * 1.08 + 2) : ctx.moveTo(px * 1.06, py * 1.08 + 2)));
      ctx.closePath(); ctx.fillStyle = GAP; ctx.fill();
      // body
      ctx.beginPath();
      s.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
      const gr = ctx.createLinearGradient(0, -s.h / 2, 0, s.h / 2);
      gr.addColorStop(0, s.hi); gr.addColorStop(0.35, s.fill); gr.addColorStop(1, s.shade);
      ctx.fillStyle = gr; ctx.fill();
      ctx.globalAlpha *= 0.18; ctx.fillStyle = '#000';
      for (const [sx, sy, sr] of s.speckle) { ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    for (const m of moss) {
      const k = Math.min(1, Math.max(0, (t - m.delay) / 1.2));
      if (k <= 0) { settled = false; continue; }
      ctx.globalAlpha = 0.75 * k; ctx.fillStyle = MOSS;
      ctx.beginPath(); ctx.arc(m.s.x + m.dx, m.s.y + m.dy + m.s.lift, m.r * ease(k), 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    done = settled;
  }

  function loop(now) { draw(now); raf = requestAnimationFrame(loop); }
  function start() { cancelAnimationFrame(raf); t0 = performance.now(); if (reduce) draw(0); else raf = requestAnimationFrame(loop); }

  resize();
  new ResizeObserver(() => { resize(); if (reduce || done) draw(performance.now()); }).observe(host);
  host.addEventListener('pointermove', e => { const b = cv.getBoundingClientRect(); mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top; });
  host.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
  // start when visible; pause offscreen
  new IntersectionObserver(([e]) => { if (e.isIntersecting) { if (!t0) start(); else if (!reduce) raf = requestAnimationFrame(loop); } else cancelAnimationFrame(raf); }).observe(host);
})();
