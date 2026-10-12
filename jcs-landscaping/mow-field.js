/* Piece: mow-field. A full-bleed shaggy lawn. Move the pointer (or drag a finger) to mow;
   the cut leaves light/dark stripes like a striped lawn. With no input, a mower runs neat
   back-and-forth passes on its own. CSS vars: --grass-long, --grass-light, --grass-dark, --mower. */
(() => {
  const host = document.querySelector('.piece[data-piece="mow-field"]');
  if (!host) return;
  const reduce = window.CORE ? window.CORE.reduce : matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(host);
  const v = (n, d) => (css.getPropertyValue(n).trim() || d);
  const LONG = v('--grass-long', '#4f7d2c'), LIGHT = v('--grass-light', '#8dbb4f'), DARK = v('--grass-dark', '#5e8f33'), MOWER = v('--mower', '#e8562a');
  const seed = +(host.dataset.seed || 3);

  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:pan-y';
  host.append(cv);
  const ctx = cv.getContext('2d');
  const shag = document.createElement('canvas'), stripes = document.createElement('canvas'), mask = document.createElement('canvas');
  let W, H, dpr, deck, raf = 0, lastInput = -1e9, prev = null, auto = null;

  function blades(c, w, h, color, len, density, r) {
    c.strokeStyle = color; c.lineCap = 'round';
    for (let i = 0; i < w * h * density; i++) {
      const x = r() * w, y = r() * h, l = len * (0.5 + r()), a = -Math.PI / 2 + (r() - 0.5) * 0.9;
      c.globalAlpha = 0.25 + r() * 0.5; c.lineWidth = 1 + r() * 1.2;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
    c.globalAlpha = 1;
  }

  function paint() {
    const r = window.rng ? window.rng(seed) : Math.random;
    for (const c of [shag, stripes, mask]) { c.width = W; c.height = H; } // texture res = CSS px (cheap)
    // long, uncut grass
    let c = shag.getContext('2d');
    c.fillStyle = LONG; c.fillRect(0, 0, W, H);
    blades(c, W, H, '#23401a', 16, 0.010, r);
    blades(c, W, H, LIGHT, 18, 0.006, r);
    // freshly cut: alternating stripes, diagonal like a pro lawn
    c = stripes.getContext('2d');
    const sw = deck * 1.0;
    c.save(); c.translate(W / 2, H / 2); c.rotate(-0.35);
    for (let i = -Math.ceil((W + H) / sw); i < (W + H) / sw; i++) { c.fillStyle = i % 2 ? LIGHT : DARK; c.fillRect(i * sw, -W - H, sw + 1, (W + H) * 2); }
    c.restore();
    blades(c, W, H, '#2c4d1c', 5, 0.006, r);
    mask.getContext('2d').clearRect(0, 0, W, H);
  }

  function resize() {
    const b = host.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2); W = Math.round(b.width); H = Math.round(b.height);
    deck = Math.max(46, Math.min(90, W / 14));
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(); auto = null;
  }

  function mowTo(x, y) {
    const m = mask.getContext('2d');
    m.strokeStyle = '#000'; m.lineWidth = deck; m.lineCap = 'round';
    m.beginPath(); m.moveTo(prev ? prev[0] : x, prev ? prev[1] : y); m.lineTo(x, y); m.stroke();
    prev = [x, y];
  }

  // auto mower: boustrophedon passes across the lower part of the hero
  function autoStep(dt) {
    if (!auto) auto = { x: -deck, y: H * 0.62, dir: 1, row: 0 };
    const speed = Math.max(160, W / 7) * dt;
    auto.x += speed * auto.dir;
    if (auto.x > W + deck || auto.x < -deck) {
      auto.dir *= -1; auto.row++;
      auto.y = H * 0.62 + (auto.row % 6) * deck * 0.9;
      if (auto.y > H + deck) auto.row = 0;
      prev = null;
    }
    mowTo(auto.x, auto.y);
    return auto;
  }

  function drawMower(x, y, dir) {
    ctx.save(); ctx.translate(x, y); if (dir < 0) ctx.scale(-1, 1);
    const s = deck / 60;
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 16, 30, 7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = MOWER; ctx.beginPath(); ctx.roundRect(-26, -8, 52, 20, 7); ctx.fill();
    ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(-17, 13, 6, 0, 7); ctx.arc(19, 13, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-22, -6); ctx.lineTo(-40, -34); ctx.lineTo(-48, -34); ctx.stroke();
    ctx.restore();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    let mower = null;
    if (now - lastInput > 2500) { const a = autoStep(dt); mower = [a.x, a.y, a.dir]; }
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(shag, 0, 0, W, H);
    // cut stripes only where the mask has been mowed
    ctx.save();
    const tmp = frame.tmp || (frame.tmp = document.createElement('canvas'));
    if (tmp.width !== W || tmp.height !== H) { tmp.width = W; tmp.height = H; }
    const t = tmp.getContext('2d');
    t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, W, H); t.drawImage(mask, 0, 0);
    t.globalCompositeOperation = 'source-in'; t.drawImage(stripes, 0, 0);
    ctx.drawImage(tmp, 0, 0, W, H);
    ctx.restore();
    if (mower) drawMower(...mower);
    raf = requestAnimationFrame(frame);
  }

  resize();
  if (reduce) { // static: a lawn already half striped
    for (let y = H * 0.55; y < H + deck; y += deck) { prev = null; mowTo(-deck, y); mowTo(W + deck, y); }
    frame(performance.now()); cancelAnimationFrame(raf); return;
  }
  new ResizeObserver(() => resize()).observe(host);
  const onMove = e => {
    const b = cv.getBoundingClientRect(); const x = e.clientX - b.left, y = e.clientY - b.top;
    if (performance.now() - lastInput > 400) prev = null;
    lastInput = performance.now(); auto = null; mowTo(x, y);
  };
  host.closest('.hero').addEventListener('pointermove', onMove);
  new IntersectionObserver(([e]) => { cancelAnimationFrame(raf); if (e.isIntersecting) { last = performance.now(); raf = requestAnimationFrame(frame); } }).observe(host);
})();
