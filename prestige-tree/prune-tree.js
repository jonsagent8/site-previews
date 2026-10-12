/* Piece: prune-tree. A generative tree full of grey deadwood. Sweep the pointer (or a finger)
   across a dead limb to cut it: it drops, spins and fades. Idle for a few seconds and the crew
   (an auto-cutter) works through the deadwood on its own. Shows a running count.
   CSS vars on the container: --bark, --leaf-1, --leaf-2, --dead, --cut (saw-line flash). */
(() => {
  const host = document.querySelector('.piece[data-piece="prune-tree"]');
  if (!host) return;
  const reduce = window.CORE ? window.CORE.reduce : matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(host);
  const v = (n, d) => (css.getPropertyValue(n).trim() || d);
  const BARK = v('--bark', '#3b2f26'), L1 = v('--leaf-1', '#4f7a34'), L2 = v('--leaf-2', '#6e9a45'), DEAD = v('--dead', '#8d8a84'), CUT = v('--cut', '#ff7a1a');
  const seed = +(host.dataset.seed || 11);
  const counter = document.querySelector('[data-prune-count]');

  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:pan-y';
  host.append(cv);
  const ctx = cv.getContext('2d');
  const base = document.createElement('canvas'), bctx = base.getContext('2d');
  let W, H, dpr, live = [], dead = [], leaves = [], falling = [], sparks = [], cut = 0, lastInput = 0, raf = 0, prev = null, regrowing = false;

  function grow() {
    const r = window.rng ? window.rng(seed) : Math.random;
    live = []; dead = []; leaves = [];
    const S = Math.min(W * 0.78, H * 0.78);
    const trunkX = W * 0.52, groundY = H * 0.98;
    function branch(x, y, ang, len, wid, depth) {
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      // slight bend through a control point
      const bend = (r() - 0.5) * len * 0.25;
      const cx = (x + x2) / 2 + Math.cos(ang + Math.PI / 2) * bend, cy = (y + y2) / 2 + Math.sin(ang + Math.PI / 2) * bend;
      const isDead = depth >= 2 && depth <= 4 && r() < 0.24 && y2 < groundY - S * 0.3;
      const seg = { x, y, cx, cy, x2, y2, wid, depth, dead: isDead, kids: [] };
      (isDead ? dead : live).push(seg);
      if (depth > 6 || len < S * 0.03) {
        if (!isDead) for (let k = 0; k < 5; k++) leaves.push({ x: x2 + (r() - 0.5) * S * 0.07, y: y2 + (r() - 0.5) * S * 0.06, r: S * (0.018 + r() * 0.022), c: r() < 0.5 ? L1 : L2 });
        return seg;
      }
      const n = depth < 2 ? 2 + (r() < 0.5 ? 1 : 0) : 2;
      for (let i = 0; i < n; i++) {
        const spread = 0.35 + r() * 0.45;
        const a = ang + (i - (n - 1) / 2) * spread + (r() - 0.5) * 0.25 - (ang + Math.PI / 2) * 0.12;
        const kid = branch(x2, y2, a, len * (0.68 + r() * 0.14), wid * 0.66, depth + 1);
        if (isDead) markDead(kid); // everything past a dead limb is dead too
        seg.kids.push(kid);
      }
      return seg;
    }
    function markDead(s) {
      if (!s.dead) { s.dead = true; live.splice(live.indexOf(s), 1); dead.push(s); leaves = leaves.filter(l => Math.hypot(l.x - s.x2, l.y - s.y2) > S * 0.06); }
      s.kids.forEach(markDead);
    }
    branch(trunkX, groundY, -Math.PI / 2 + (r() - 0.5) * 0.08, S * 0.27, S * 0.055, 0);
    // dead "roots": only the top dead segment of each chain is cuttable; children ride along
    dead = dead.filter(s => !dead.some(p => p.kids.includes(s)));
  }

  function strokeSeg(c, s, color) {
    c.strokeStyle = color; c.lineWidth = Math.max(1.2, s.wid); c.lineCap = 'round';
    c.beginPath(); c.moveTo(s.x, s.y); c.quadraticCurveTo(s.cx, s.cy, s.x2, s.y2); c.stroke();
  }
  function drawTree(c, s, color) { strokeSeg(c, s, color); s.kids.forEach(k => drawTree(c, k, color)); }

  function paintBase() {
    base.width = W * dpr; base.height = H * dpr;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.clearRect(0, 0, W, H);
    // canopy leaves behind, then live wood, then front leaves
    leaves.forEach((l, i) => { if (i % 2) return; bctx.globalAlpha = 0.85; bctx.fillStyle = l.c; bctx.beginPath(); bctx.arc(l.x, l.y, l.r, 0, 7); bctx.fill(); });
    bctx.globalAlpha = 1;
    live.forEach(s => strokeSeg(bctx, s, BARK));
    leaves.forEach((l, i) => { if (!(i % 2)) return; bctx.globalAlpha = 0.92; bctx.fillStyle = l.c; bctx.beginPath(); bctx.arc(l.x, l.y, l.r, 0, 7); bctx.fill(); });
    bctx.globalAlpha = 1;
  }

  function resize() {
    const b = host.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2); W = b.width; H = b.height;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    falling = []; sparks = [];
    grow(); paintBase();
    cut = 0; if (counter) counter.textContent = '0';
  }

  // distance from point to the segment's chord (good enough for a swipe hit test)
  function hit(s, x, y, pad) {
    const dx = s.x2 - s.x, dy = s.y2 - s.y, L = dx * dx + dy * dy || 1;
    const t = Math.max(0.15, Math.min(1, ((x - s.x) * dx + (y - s.y) * dy) / L));
    return Math.hypot(s.x + dx * t - x, s.y + dy * t - y) < s.wid / 2 + pad;
  }
  function cutLimb(s, x, y) {
    dead.splice(dead.indexOf(s), 1);
    falling.push({ s, ox: s.x, oy: s.y, vx: (Math.random() - 0.5) * 1.5, vy: -1.5, a: 0, va: (Math.random() - 0.5) * 0.12, dy: 0, dx: 0, life: 1 });
    for (let i = 0; i < 10; i++) sparks.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.8) * 4, life: 1 });
    cut++; if (counter) counter.textContent = String(cut);
  }
  function swipe(x, y) {
    lastInput = performance.now();
    const pts = prev ? Array.from({ length: 6 }, (_, i) => [prev[0] + (x - prev[0]) * i / 5, prev[1] + (y - prev[1]) * i / 5]) : [[x, y]];
    for (const [px, py] of pts) for (const s of dead.slice()) if (hit(s, px, py, 6)) cutLimb(s, px, py);
    prev = [x, y];
  }

  function frame(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0, W, H);
    dead.forEach(s => drawTree(ctx, s, DEAD));
    // idle: auto-cutter works top-down after 3.5s without input
    if (now - lastInput > 3500 && dead.length && Math.random() < 0.025) {
      const s = dead.reduce((a, b) => (a.y2 < b.y2 ? a : b));
      cutLimb(s, (s.x + s.x2) / 2, (s.y + s.y2) / 2);
    }
    falling = falling.filter(f => {
      f.vy += 0.35; f.dx += f.vx; f.dy += f.vy; f.a += f.va; f.life -= 0.008;
      ctx.save(); ctx.globalAlpha = Math.max(0, f.life);
      ctx.translate(f.ox + f.dx, f.oy + f.dy); ctx.rotate(f.a); ctx.translate(-f.ox, -f.oy);
      drawTree(ctx, f.s, DEAD); ctx.restore();
      return f.life > 0 && f.oy + f.dy < H + 200;
    });
    sparks = sparks.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life -= 0.04;
      ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = CUT; ctx.fillRect(p.x, p.y, 2.5, 2.5); ctx.globalAlpha = 1;
      return p.life > 0;
    });
    // regrow deadwood once the crew has cleared it, so the toy never runs out
    if (!dead.length && !falling.length && !regrowing) {
      regrowing = true;
      setTimeout(() => { const c0 = cut; resize(); cut = c0; if (counter) counter.textContent = String(cut); regrowing = false; }, 2500);
    }
    raf = requestAnimationFrame(frame);
  }

  resize();
  if (reduce) { ctx.drawImage(base, 0, 0, W, H); dead.forEach(s => drawTree(ctx, s, DEAD)); return; }
  new ResizeObserver(() => resize()).observe(host);
  const pos = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  cv.addEventListener('pointermove', e => swipe(...pos(e)));
  cv.addEventListener('pointerdown', e => { prev = null; swipe(...pos(e)); });
  cv.addEventListener('pointerleave', () => { prev = null; });
  new IntersectionObserver(([e]) => { cancelAnimationFrame(raf); if (e.isIntersecting) raf = requestAnimationFrame(frame); }).observe(host);
})();
