/* Nanuet Paving: scroll-scrubbed resurfacing + live hours */
(() => {
  'use strict';
  const { $, $$, reduce } = window.CORE;

  const sec = $('.pave'), cv = $('#pave'), ctx = cv.getContext('2d');
  const beats = $$('.pc'), meter = $('.pave-meter span'), meterTxt = $('#meterTxt');
  let W, H, dpr, oldTex, newTex, steam = [];

  function noiseLayer(w, h, base, specks, seed) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), R = window.rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (const [col, n, s] of specks) { g.fillStyle = col; for (let i = 0; i < n; i++) g.fillRect(R() * w, R() * h, s * (0.5 + R()), s * (0.5 + R())); }
    return { c, R };
  }

  function build() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const w = W * dpr, h = H * dpr, area = (W * H) / 1e4;
    // weathered asphalt with cracks, patches and weeds
    const o = noiseLayer(w, h, '#6f6e69', [['#85847e', area * 70, 2 * dpr], ['#5a5955', area * 70, 2 * dpr], ['#9b9a93', area * 18, 1.5 * dpr]], 9);
    const g = o.c.getContext('2d'), R = o.R;
    g.fillStyle = 'rgba(40,40,38,.35)';
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(R() * w, R() * h, 60 * dpr + R() * 90 * dpr, 30 * dpr + R() * 50 * dpr, R() * 3, 0, 6.28); g.fill(); }
    g.strokeStyle = '#2b2a27'; g.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      let x = R() * w, y = R() * h, a = R() * 6.28;
      g.lineWidth = (1 + R() * 2.5) * dpr; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 30; k++) {
        a += (R() - .5) * 1.1; x += Math.cos(a) * 14 * dpr; y += Math.sin(a) * 14 * dpr; g.lineTo(x, y);
        if (R() < .06) { g.stroke(); g.fillStyle = 'rgba(88,128,50,.9)'; for (let j = 0; j < 6; j++) { g.beginPath(); g.arc(x + (R() - .5) * 10 * dpr, y + (R() - .5) * 10 * dpr, (2 + R() * 3) * dpr, 0, 6.28); g.fill(); } g.beginPath(); g.moveTo(x, y); }
      }
      g.stroke();
    }
    oldTex = o.c;
    newTex = noiseLayer(w, h, '#151515', [['#2a2a2a', area * 140, 1.6 * dpr], ['#0b0b0b', area * 100, 1.6 * dpr], ['#3a3a3a', area * 25, 1.2 * dpr]], 3).c;
  }
  build();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 150); });

  const clamp = v => Math.max(0, Math.min(1, v));
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  function frame(t) {
    requestAnimationFrame(frame);
    const r = sec.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = clamp(-r.top / (r.height - innerHeight));
    const pave = ease(clamp((p - .08) / .47));
    const seal = ease(clamp((p - .58) / .22));
    beats.forEach((b, i) => b.classList.toggle('on', i === (p < .08 ? 0 : p < .56 ? 1 : p < .82 ? 2 : 3)));
    meter.style.setProperty('--m', pave.toFixed(3));
    meterTxt.textContent = p < .56 ? Math.round(pave * 100) + '% paved' : p < .82 ? Math.round(seal * 100) + '% sealed' : 'Done';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(oldTex, 0, 0);
    const bx = pave * (W + 140) - 70; // roller position (css px)
    if (bx > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, Math.max(0, bx) * dpr, H * dpr); ctx.clip();
      ctx.drawImage(newTex, 0, 0);
      // sealcoat: deeper black + moving sheen up to the seal line
      if (seal > 0) {
        const sx = seal * (W + 200) * dpr;
        ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, Math.min(sx, bx * dpr), H * dpr);
        const sg = ctx.createLinearGradient(sx - 320 * dpr, 0, sx, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.85, 'rgba(255,255,255,.24)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg; ctx.fillRect(sx - 320 * dpr, 0, 320 * dpr, H * dpr);
      }
      // fresh-mat sheen right behind the roller
      if (pave < 1) {
        const hg = ctx.createLinearGradient((bx - 160) * dpr, 0, bx * dpr, 0);
        hg.addColorStop(0, 'rgba(255,170,90,0)'); hg.addColorStop(1, 'rgba(255,170,90,.12)');
        ctx.fillStyle = hg; ctx.fillRect((bx - 160) * dpr, 0, 160 * dpr, H * dpr);
      }
      ctx.restore();
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // roller (top-down): yellow machine trailing left, steel drum at the seam
    if (pave > 0 && pave < 1) {
      const drumW = 64, bodyW = 150, y0 = H * .5 - Math.min(H * .38, 260), hh = Math.min(H * .76, 520);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(bx - bodyW - 4, y0 + 12, bodyW + drumW, hh);
      ctx.fillStyle = '#ffcc00'; ctx.fillRect(bx - bodyW, y0 + hh * .12, bodyW - 6, hh * .76);
      ctx.fillStyle = '#111'; ctx.fillRect(bx - bodyW + 20, y0 + hh * .3, bodyW - 60, hh * .4);
      ctx.fillStyle = '#ffcc00'; ctx.font = `bold 13px Barlow Condensed, sans-serif`; ctx.save(); ctx.translate(bx - bodyW / 2 - 15, y0 + hh * .5); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('NANUET PAVING', 0, 4); ctx.restore();
      for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#111' : '#ffcc00'; ctx.fillRect(bx - bodyW, y0 + hh * .12 + k * 10, 10, 10); }
      const dg = ctx.createLinearGradient(bx - 6, 0, bx + drumW - 6, 0);
      dg.addColorStop(0, '#5d6266'); dg.addColorStop(.45, '#d9dde0'); dg.addColorStop(1, '#4a4e52');
      ctx.fillStyle = dg; ctx.fillRect(bx - 6, y0, drumW, hh);
      const off = reduce ? 0 : (t * .12) % 18;
      ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2;
      for (let x = bx - 6 + off; x < bx - 6 + drumW; x += 18) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + hh); ctx.stroke(); }
      // steam
      if (!reduce && Math.random() < .7) steam.push({ x: bx - 20 - Math.random() * 120, y: y0 + Math.random() * hh, r: 10 + Math.random() * 20, a: .22, vx: -.3, vy: -.4 - Math.random() * .4 });
    }
    steam = steam.filter(s => s.a > 0);
    for (const s of steam) { s.x += s.vx; s.y += s.vy; s.r += .5; s.a -= .004; ctx.fillStyle = `rgba(230,230,230,${s.a})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill(); }
  }
  requestAnimationFrame(frame);

  /* Live hours (America/New_York) */
  const HOURS = { 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 17], 6: [10, 13], 0: null };
  function hours() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const get = k => parts.find(x => x.type === k).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    const h = (+get('hour') % 24) + +get('minute') / 60, today = HOURS[day];
    $$('#week li').forEach(li => li.classList.toggle('today', +li.dataset.day === day));
    const el = $('#openNow');
    const fmt = x => (x > 12 ? x - 12 : x) + (x >= 12 ? ' PM' : ' AM');
    if (today && h >= today[0] && h < today[1]) { el.className = 'open-now open'; el.textContent = `● Open now, until ${fmt(today[1])}`; }
    else { el.className = 'open-now closed'; el.textContent = '● Closed now. Leave a request below.'; }
  }
  hours(); setInterval(hours, 60000);
})();
