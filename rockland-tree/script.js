/* Rockland Tree Service: growing ink tree, live open/closed status, photo parallax */
(() => {
  'use strict';
  const { $, $$, reduce } = window.CORE;

  /* ---------------- Growing botanical tree ---------------- */
  const cv = $('#treeCanvas'), ctx = cv.getContext('2d');
  let W, H, dpr;
  const R = window.rng(2024);
  const nodes = []; // {parent, ang, len, depth, w, start, dur}
  let maxEnd = 0;
  (function grow(parent, ang, len, depth, start) {
    const dur = 260 + len * 2.2;
    const id = nodes.length;
    nodes.push({ parent, ang, len, depth, start, dur, leafSeed: R() });
    maxEnd = Math.max(maxEnd, start + dur);
    if (depth === 0) return;
    const kids = depth > 6 ? 2 : (R() < .3 ? 3 : 2);
    for (let i = 0; i < kids; i++) {
      const spread = (depth > 6 ? .42 : .55) + R() * .25;
      const a = (i - (kids - 1) / 2) * spread + (R() - .5) * .3;
      grow(id, a, len * (.7 + R() * .12), depth - 1, start + dur * (.75 + R() * .2));
    }
  })(-1, 0, 1, 9, 0);

  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
  }
  size(); addEventListener('resize', size);

  let pointer = 0, pointerT = 0;
  addEventListener('pointermove', e => { pointerT = (e.clientX / innerWidth - .5) * 2; }, { passive: true });

  const t0 = performance.now();
  const ink = '#1d3326';
  function draw(now) {
    const t = reduce ? maxEnd + 2000 : now - t0;
    pointer += (pointerT - pointer) * .04;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const baseX = W * .5, baseY = H * .9, unit = H * .2;

    // ground hatching
    ctx.strokeStyle = 'rgba(29,51,38,.5)'; ctx.lineWidth = 1;
    const gp = Math.min(1, t / 700);
    ctx.beginPath(); ctx.moveTo(baseX - W * .38 * gp, baseY); ctx.lineTo(baseX + W * .38 * gp, baseY); ctx.stroke();
    for (let i = 0; i < 26 * gp; i++) {
      const x = baseX - W * .34 + i * (W * .68 / 26);
      ctx.beginPath(); ctx.moveTo(x, baseY + 4); ctx.lineTo(x - 7, baseY + 12); ctx.stroke();
    }

    const pos = [];
    const sway = Math.sin(now * .0009) * .02 + pointer * .05;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const p = Math.max(0, Math.min(1, (t - n.start) / n.dur));
      let x0, y0, a0;
      if (n.parent < 0) { x0 = baseX; y0 = baseY; a0 = -Math.PI / 2; }
      else { const q = pos[n.parent]; if (!q || q.p < .7) { pos[i] = null; continue; } x0 = q.x; y0 = q.y; a0 = q.a; }
      const a = a0 + n.ang + sway * (9 - n.depth) * .06;
      const L = unit * n.len * (1 - Math.pow(1 - p, 2.2));
      const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L;
      pos[i] = { x: x1, y: y1, a, p };
      if (p <= 0) continue;
      // trunk/branch: tapered quad for an engraved look
      const w0 = Math.pow(n.depth + 1, 1.55) * .55 * (H / 600), w1 = w0 * .7;
      const nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2);
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(x0 + nx * w0, y0 + ny * w0); ctx.lineTo(x1 + nx * w1, y1 + ny * w1);
      ctx.lineTo(x1 - nx * w1, y1 - ny * w1); ctx.lineTo(x0 - nx * w0, y0 - ny * w0); ctx.fill();
      // bark hatching on thick limbs
      if (n.depth >= 7 && p === 1) {
        ctx.strokeStyle = 'rgba(243,238,227,.35)'; ctx.lineWidth = .8;
        for (let k = .15; k < 1; k += .14) {
          const hx = x0 + (x1 - x0) * k, hy = y0 + (y1 - y0) * k;
          ctx.beginPath(); ctx.moveTo(hx - nx * w0 * .6, hy - ny * w0 * .6); ctx.lineTo(hx + nx * w0 * .2, hy + ny * w0 * .2 - 3); ctx.stroke();
        }
      }
      // leaves on finished tips
      if (n.depth <= 1 && p === 1) {
        const lt = Math.min(1, (t - n.start - n.dur) / 500);
        if (lt > 0) {
          const s = (5 + n.leafSeed * 5) * (H / 600) * (1 - Math.pow(1 - lt, 3));
          const la = a + (n.leafSeed - .5) * 1.4;
          ctx.save(); ctx.translate(x1, y1); ctx.rotate(la);
          ctx.fillStyle = n.leafSeed > .8 ? '#c8462a' : n.leafSeed > .45 ? '#2f5a40' : '#4f7a55';
          ctx.beginPath(); ctx.ellipse(s, 0, s * 1.1, s * .5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(243,238,227,.5)'; ctx.lineWidth = .7;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 2, 0); ctx.stroke();
          ctx.restore();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  /* ---------------- Open / closed (America/New_York) ---------------- */
  const HOURS = { 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 16], 6: null, 0: null };
  function nyNow() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const get = k => parts.find(p => p.type === k).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, h: (+get('hour') % 24) + (+get('minute')) / 60 };
  }
  function status() {
    const { day, h } = nyNow();
    const pill = $('#statusPill'), txt = $('.s-text', pill);
    const today = HOURS[day];
    $$('#hoursTable tr').forEach(tr => tr.classList.toggle('today', +tr.dataset.day === day));
    const fmt = x => (x > 12 ? x - 12 : x) + (x >= 12 ? ' PM' : ' AM');
    if (today && h >= today[0] && h < today[1]) {
      pill.className = 'status reveal in open'; txt.textContent = `Open now · until ${fmt(today[1])}`;
    } else {
      let d = day, add = 0;
      do { d = (d + 1) % 7; add++; } while (!HOURS[d]);
      if (today && h < today[0]) { d = day; add = 0; }
      const name = add === 0 ? 'today' : add === 1 ? 'tomorrow' : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d];
      pill.className = 'status reveal in closed'; txt.textContent = `Closed now · opens ${name} at ${fmt(HOURS[d][0])}`;
    }
  }
  status(); setInterval(status, 60000);

  /* ---------------- Photo parallax ---------------- */
  const img = $('#parallaxImg');
  if (img && !reduce) {
    const frame = img.parentElement;
    const onScroll = () => {
      const r = frame.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      img.style.transform = `translateY(${p * -12}%) scale(1.02)`;
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
})();
