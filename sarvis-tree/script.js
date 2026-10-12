/* Sarvis Tree Services: storm sky that clears into blossoms on scroll + live 24h clock */
(() => {
  'use strict';
  const { $, reduce } = window.CORE;

  /* ---------------- Sky ---------------- */
  const cv = $('#sky'), ctx = cv.getContext('2d'), flash = $('#flash');
  let W, H, dpr;
  const R = window.rng(11);

  // Precomputed branching tree (silhouette at the right edge)
  const branches = [];
  (function grow(x, y, ang, len, depth, parent) {
    const id = branches.length;
    branches.push({ ang, len, depth, parent, w: Math.max(1, depth * 2.6) });
    if (depth <= 0) return;
    const n = depth > 4 ? 2 : 2 + (R() > .5 ? 1 : 0);
    for (let i = 0; i < n; i++) grow(0, 0, (R() - .5) * 1.1 + (i - (n - 1) / 2) * .5, len * (.68 + R() * .12), depth - 1, id);
  })(0, 0, 0, 1, 7, -1);

  const clouds = Array.from({ length: 9 }, () => ({ x: R(), y: R() * .35, r: .25 + R() * .3, v: .00002 + R() * .00004 }));
  const drops = Array.from({ length: 520 }, () => ({ x: R(), y: R(), l: .6 + R() * .8, v: .8 + R() * .6 }));
  const petals = Array.from({ length: 70 }, () => ({ x: R(), y: R(), s: 4 + R() * 6, v: .25 + R() * .5, a: R() * 6.28, w: R() * 6.28 }));

  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
  }
  size(); addEventListener('resize', size);

  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (c1, c2, t) => `rgb(${c1.map((v, i) => Math.round(lerp(v, c2[i], t))).join(',')})`;

  let storm = 1, bolt = null, nextBolt = 2500;
  const joe = $('#joe');
  function stormLevel() {
    const end = joe.offsetTop - H * .4;
    return Math.max(0, Math.min(1, 1 - scrollY / Math.max(1, end)));
  }

  function makeBolt() {
    const pts = [[W * (.45 + Math.random() * .5), 0]];
    let [x, y] = pts[0];
    while (y < H * (.45 + Math.random() * .25)) { x += (Math.random() - .5) * 60; y += 20 + Math.random() * 30; pts.push([x, y]); }
    return { pts, t: 0 };
  }

  function drawTree(t, s) {
    // trunk anchored bottom-right, bends with wind
    const baseX = W * (W < 760 ? .92 : .88), baseY = H + 10, unit = Math.min(H * .2, 190);
    const wind = s * (.12 + Math.sin(t * .0021) * .06 + Math.sin(t * .0057) * .03);
    const pos = [];
    ctx.strokeStyle = mix([30, 40, 56], [40, 26, 36], 1 - s); ctx.lineCap = 'round';
    branches.forEach((b, i) => {
      let x0, y0, a0;
      if (b.parent < 0) { x0 = baseX; y0 = baseY; a0 = -Math.PI / 2 - .25; }
      else { [x0, y0, a0] = pos[b.parent]; }
      const sway = -wind * (8 - b.depth) * .09;
      const a = a0 + b.ang + sway;
      const L = unit * b.len;
      const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L;
      pos[i] = [x1, y1, a];
      ctx.lineWidth = b.w * (W < 760 ? .7 : 1);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      if (b.depth === 0 && s < .9) { // blossoms appear as the storm clears
        ctx.fillStyle = `rgba(247,232,238,${(1 - s) * .9})`;
        ctx.beginPath(); ctx.arc(x1, y1, 3.2 + (i % 3), 0, 6.28); ctx.fill();
      }
    });
  }

  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(50, t - last); last = t;
    storm = lerp(storm, stormLevel(), .08);
    const s = storm;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // sky gradient: storm navy -> dusk rose
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, mix([6, 9, 14], [28, 20, 34], 1 - s));
    g.addColorStop(1, mix([22, 30, 44], [92, 58, 78], 1 - s));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // clouds
    for (const c of clouds) {
      c.x += c.v * dt * (reduce ? 0 : 1) * (1 + s * 2); if (c.x > 1.4) c.x = -.4;
      const cx = c.x * W, cy = c.y * H, r = c.r * Math.max(W, H);
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      cg.addColorStop(0, `rgba(${s > .5 ? '40,50,66' : '120,80,100'},${.35 * (.3 + s * .7)})`);
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    // lightning
    if (!reduce && s > .45) {
      nextBolt -= dt;
      if (nextBolt <= 0) { bolt = makeBolt(); nextBolt = 3500 + Math.random() * 4500; }
    }
    if (bolt) {
      bolt.t += dt;
      const a = bolt.t < 60 ? 1 : bolt.t < 120 ? .3 : bolt.t < 180 ? .9 : Math.max(0, 1 - (bolt.t - 180) / 250);
      flash.style.opacity = a * .9 * s;
      ctx.strokeStyle = `rgba(230,238,255,${a})`; ctx.lineWidth = 2.2; ctx.shadowColor = '#bcd2ff'; ctx.shadowBlur = 18;
      ctx.beginPath(); bolt.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      ctx.shadowBlur = 0;
      if (bolt.t > 430) { bolt = null; flash.style.opacity = 0; }
    }

    drawTree(t, s);

    // rain
    if (s > .02) {
      const n = Math.floor(drops.length * s), wind = 0.25;
      ctx.strokeStyle = `rgba(170,190,220,${.35 * s})`; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const d = drops[i];
        if (!reduce) { d.y += d.v * dt * .0016; d.x += wind * d.v * dt * .0004; }
        if (d.y > 1) { d.y -= 1.05; d.x = Math.random(); }
        if (d.x > 1) d.x -= 1;
        const x = d.x * W, y = d.y * H, L = 18 * d.l;
        ctx.moveTo(x, y); ctx.lineTo(x - L * wind, y - L);
      }
      ctx.stroke();
    }

    // petals
    if (s < .98) {
      const n = Math.floor(petals.length * (1 - s));
      for (let i = 0; i < n; i++) {
        const p = petals[i];
        if (!reduce) { p.y += p.v * dt * .00008; p.w += dt * .002; p.a += dt * .0015; }
        if (p.y > 1.05) { p.y = -.05; p.x = Math.random(); }
        const x = p.x * W + Math.sin(p.w) * 30, y = p.y * H;
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.a);
        ctx.fillStyle = i % 4 ? `rgba(247,232,238,${.85 * (1 - s)})` : `rgba(233,165,189,${.8 * (1 - s)})`;
        ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * .55, 0, 0, 6.28); ctx.fill();
        ctx.restore();
      }
    }
  }
  requestAnimationFrame(frame);

  /* ---------------- 24-hour clock ---------------- */
  const ticks = $('#ticks');
  let tk = '';
  for (let h = 0; h < 24; h++) {
    const a = (h / 24) * Math.PI * 2 - Math.PI / 2, major = h % 6 === 0;
    const r1 = 138, r2 = major ? 124 : 130;
    tk += `<line class="${major ? 'major' : ''}" x1="${150 + Math.cos(a) * r1}" y1="${150 + Math.sin(a) * r1}" x2="${150 + Math.cos(a) * r2}" y2="${150 + Math.sin(a) * r2}"/>`;
    if (major) tk += `<text x="${150 + Math.cos(a) * 104}" y="${150 + Math.sin(a) * 104}">${['12a', '6a', '12p', '6p'][h / 6]}</text>`;
  }
  ticks.innerHTML = tk;
  const arc = $('#dayArc'), C = 2 * Math.PI * 118;
  arc.style.strokeDasharray = C; arc.style.strokeDashoffset = C;
  const clockIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { arc.style.transition = 'stroke-dashoffset 2.4s cubic-bezier(.3,.6,.2,1)'; arc.style.strokeDashoffset = 0; clockIO.disconnect(); }
  }), { threshold: .4 });
  clockIO.observe(arc);

  function tickClock() {
    const d = new Date(), mins = d.getHours() * 60 + d.getMinutes();
    $('#hand').style.transform = `rotate(${(mins / 1440) * 360}deg)`;
    const tstr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    $('#clockTime').textContent = tstr;
    $('#nowLine').textContent = `right now (${tstr})`;
  }
  tickClock(); setInterval(tickClock, 20000);
})();
