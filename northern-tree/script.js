/* Northern Tree Services: scroll-scrubbed felling sequence + tree-ring art */
(() => {
  'use strict';
  const { $, $$, reduce } = window.CORE;

  /* ---------------- Felling scene ---------------- */
  const section = $('.fell');
  const cv = $('#fellCanvas');
  const ctx = cv.getContext('2d');
  const beats = $$('.beat');
  const bar = $('.fell-progress span');
  const hint = $('.scroll-hint');

  let W, H, dpr, mobile, groundY, baseX, Ht, trW, houseX;
  const R = window.rng(42);
  const tiers = Array.from({ length: 9 }, (_, i) => ({ j1: R() * .08 - .04, j2: R() * .08 - .04, w: .9 + R() * .2 }));
  const hillsA = Array.from({ length: 70 }, () => R());
  const hillsB = Array.from({ length: 50 }, () => R());
  const starsArr = Array.from({ length: 90 }, () => [R(), R() * .55, R()]);

  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    mobile = W < 760;
    groundY = mobile ? H * 0.5 : H * 0.8;
    baseX = mobile ? W * 0.22 : W * 0.6;
    houseX = mobile ? -999 : W * 0.47;
    Ht = Math.min(mobile ? H * 0.36 : H * 0.62, (W - baseX) * 0.9);
    trW = Math.max(10, Ht * 0.05);
  }
  size();
  addEventListener('resize', size);

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const easeIn = t => t * t * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  let particles = [];
  let impacted = false, impactT = 0, lastChip = 0;

  function progress() {
    const r = section.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight));
  }

  function drawBackdrop(t) {
    const g = ctx.createLinearGradient(0, 0, 0, groundY);
    g.addColorStop(0, '#071512'); g.addColorStop(.7, '#0f2a22'); g.addColorStop(1, '#1a3d31');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, groundY + 2);

    // stars
    for (const [x, y, s] of starsArr) {
      ctx.globalAlpha = .25 + .5 * Math.abs(Math.sin(t * .0006 + s * 20)) * s;
      ctx.fillStyle = '#dff7ee';
      ctx.fillRect(x * W, y * groundY, 1.4, 1.4);
    }
    ctx.globalAlpha = 1;

    // aurora ribbons
    if (!reduce || true) {
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        const yb = groundY * (.18 + k * .07);
        for (let x = 0; x <= W; x += 16) {
          const y = yb + Math.sin(x * .004 + t * .00025 * (k + 1) + k) * 26 + Math.sin(x * .011 - t * .0004) * 10;
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = k === 1 ? 'rgba(255,138,61,.07)' : 'rgba(159,230,208,.09)';
        ctx.lineWidth = 34 - k * 8;
        ctx.stroke();
      }
    }

    // far ridge with pines
    const ridge = (arr, yBase, amp, color, step) => {
      ctx.beginPath(); ctx.moveTo(0, groundY);
      const n = arr.length;
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * W;
        const y = yBase - Math.sin(i * .35) * amp * .4 - arr[i] * amp;
        ctx.lineTo(x - step * .5, y + amp * .25); ctx.lineTo(x, y); ctx.lineTo(x + step * .5, y + amp * .25);
      }
      ctx.lineTo(W, groundY); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    };
    ridge(hillsA, groundY - 50, mobile ? 40 : 70, '#13322a', W / 70);
    ridge(hillsB, groundY - 10, mobile ? 30 : 46, '#0f271f', W / 50);

    // ground
    const gg = ctx.createLinearGradient(0, groundY, 0, H);
    gg.addColorStop(0, '#2f5a3a'); gg.addColorStop(1, '#173322');
    ctx.fillStyle = gg; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = 'rgba(159,230,208,.18)'; ctx.fillRect(0, groundY, W, 1.5);

    // house silhouette (what we're protecting)
    if (houseX > 0) {
      const hw = Ht * .42, hh = Ht * .26;
      ctx.fillStyle = '#0a1b16';
      ctx.fillRect(houseX - hw, groundY - hh, hw, hh);
      ctx.beginPath(); ctx.moveTo(houseX - hw - 10, groundY - hh); ctx.lineTo(houseX - hw / 2, groundY - hh - hh * .6); ctx.lineTo(houseX + 10, groundY - hh); ctx.fill();
      ctx.fillStyle = 'rgba(255,190,120,.55)';
      ctx.fillRect(houseX - hw * .78, groundY - hh * .66, hw * .16, hh * .22);
      ctx.fillRect(houseX - hw * .42, groundY - hh * .66, hw * .16, hh * .22);
    }
  }

  function drawTreeBody(alphaCanopy, splitGap) {
    // Local frame: base of the felled section at (0,0), tree pointing to -y.
    const hN = trW * 1.1;  // notch height (stump remains below)
    const L = Ht - hN;
    // trunk, split into 5 segments when bucking
    const segs = 5, trunkLen = L * .55;
    for (let i = 0; i < segs; i++) {
      const y0 = -(i / segs) * trunkLen - i * splitGap, len = trunkLen / segs - (splitGap ? 2 : 0);
      const tg = ctx.createLinearGradient(-trW / 2, 0, trW / 2, 0);
      tg.addColorStop(0, '#3a2518'); tg.addColorStop(.5, '#6b4630'); tg.addColorStop(1, '#2a1a10');
      ctx.fillStyle = tg;
      const w = trW * (1 - i * .08);
      ctx.fillRect(-w / 2, y0 - len, w, len);
      if (splitGap > 0.5) { // log end-grain
        ctx.fillStyle = '#d9a46c';
        ctx.fillRect(-w / 2, y0 - len, w, 2.5);
      }
    }
    // canopy tiers
    if (alphaCanopy <= 0) return;
    ctx.globalAlpha = alphaCanopy;
    const top = -L, cStart = -L * .22, n = tiers.length;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const yb = cStart + (top - cStart) * f * .86 - i * splitGap * .3;
      const half = (1 - f * .82) * Ht * .19 * tiers[i].w;
      const th = Ht * .16;
      const cg = ctx.createLinearGradient(-half, 0, half, 0);
      cg.addColorStop(0, '#0e3325'); cg.addColorStop(.55, '#1d5a3d'); cg.addColorStop(1, '#2f7b55');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(-half, yb + tiers[i].j1 * th);
      ctx.quadraticCurveTo(-half * .3, yb - th * .25, 0, yb - th);
      ctx.quadraticCurveTo(half * .3, yb - th * .25, half, yb + tiers[i].j2 * th);
      ctx.quadraticCurveTo(0, yb - th * .12, -half, yb + tiers[i].j1 * th);
      ctx.fill();
      // rim light
      ctx.strokeStyle = 'rgba(159,230,208,.35)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, yb - th); ctx.quadraticCurveTo(half * .3, yb - th * .25, half, yb + tiers[i].j2 * th); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function spawnDust(x, y, n, spread) {
    for (let i = 0; i < n; i++) particles.push({
      x: x + (Math.random() - .5) * spread, y, vx: (Math.random() - .5) * 2.4, vy: -Math.random() * 2.2 - .4,
      life: 1, decay: .006 + Math.random() * .01, r: 6 + Math.random() * 18, kind: 'dust'
    });
  }

  let prevP = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const r = section.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = progress();

    // beats
    const bi = p < .12 ? 0 : p < .34 ? 1 : p < .6 ? 2 : 3;
    beats.forEach((b, i) => b.classList.toggle('is-on', i === bi));
    bar.style.width = (p * 100) + '%';
    hint.style.opacity = p > .02 ? 0 : 1;

    const notch = easeOut(seg(p, .14, .3));
    const fallT = seg(p, .34, .55);
    const fall = easeIn(fallT);
    const buck = easeInOut(seg(p, .62, .78));
    const haul = easeIn(seg(p, .8, .97));

    // impact bookkeeping (resets when scrolling back)
    if (fallT >= 1 && !impacted) {
      impacted = true; impactT = t;
      for (let k = 0; k < 12; k++) spawnDust(baseX + (k / 12) * Ht, groundY, 6, 20);
    }
    if (fallT < 1 && impacted) impacted = false;

    let shake = 0;
    if (impacted && !reduce) { const dt = (t - impactT) / 1000; if (dt < .6) shake = Math.sin(dt * 60) * (1 - dt / .6) * 6; }

    ctx.setTransform(dpr, 0, 0, dpr, 0, shake * dpr);
    ctx.clearRect(0, -10, W, H + 20);
    drawBackdrop(t);

    // drop-zone arc preview while notching
    if (notch > 0 && fall < 1) {
      ctx.save();
      ctx.globalAlpha = notch * (1 - fall) * .9;
      ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t * .02;
      ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(baseX, groundY - trW, Ht * .96, -Math.PI / 2, -Math.PI / 2 + (Math.PI / 2) * notch, false); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,138,61,.16)';
      ctx.fillRect(baseX + trW, groundY - 3, (Ht * .95) * notch, 6);
      ctx.restore();
    }

    // stump
    const hN = trW * 1.1;
    ctx.fillStyle = '#4a2f1f';
    ctx.fillRect(baseX - trW / 2, groundY - hN, trW, hN);
    ctx.fillStyle = '#d9a46c';
    ctx.beginPath(); ctx.ellipse(baseX, groundY - hN, trW / 2, Math.max(1.5, trW * .14), 0, 0, Math.PI * 2); ctx.fill();

    // felled section
    const sway = (!reduce && fall === 0) ? Math.sin(t * .0011) * .006 : 0;
    const ang = fall * (Math.PI / 2) * .985 + sway;
    const alphaC = 1 - buck;
    const gap = buck * (mobile ? 8 : 16);
    if (haul < 1) {
      ctx.save();
      ctx.translate(baseX + haul * W * 1.1, groundY - hN + fall * (hN - trW / 2));
      ctx.rotate(ang);
      ctx.globalAlpha = 1 - haul * .3;
      drawTreeBody(alphaC, gap);
      ctx.restore();
      // notch wedge (only while standing)
      if (fall < .05 && notch > 0) {
        ctx.fillStyle = '#071512';
        ctx.beginPath();
        ctx.moveTo(baseX + trW / 2 + 1, groundY - hN - 1);
        ctx.lineTo(baseX + trW / 2 - trW * .55 * notch, groundY - hN - 1);
        ctx.lineTo(baseX + trW / 2 + 1, groundY - hN - 1 - trW * .9 * notch);
        ctx.fill();
      }
    }

    // chips fly toward the (off-screen) chipper while bucking
    if (buck > 0 && buck < 1 && t - lastChip > 30 && !reduce) {
      lastChip = t;
      const x = baseX + Ht * (.3 + Math.random() * .6);
      particles.push({ x, y: groundY - Ht * .08 * Math.random(), vx: 3 + Math.random() * 4, vy: -2 - Math.random() * 2, life: 1, decay: .012, r: 2 + Math.random() * 3, kind: 'chip' });
    }

    // particles
    particles = particles.filter(q => q.life > 0);
    for (const q of particles) {
      q.x += q.vx; q.y += q.vy; q.life -= q.decay;
      if (q.kind === 'dust') { q.vy *= .97; q.vx *= .98; q.r += .35;
        ctx.fillStyle = `rgba(190,170,140,${q.life * .22})`;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
      } else { q.vy += .15;
        ctx.fillStyle = `rgba(217,164,108,${q.life})`;
        ctx.fillRect(q.x, q.y, q.r, q.r * .7);
      }
    }

    // clean-lawn sparkle at the end
    if (haul > .9) {
      ctx.globalAlpha = (haul - .9) * 10;
      ctx.fillStyle = '#9fe6d0';
      ctx.font = `600 ${mobile ? 12 : 14}px Instrument Sans, sans-serif`;
      ctx.fillText('✓ Lawn intact', baseX + trW * 2, groundY + 28);
      ctx.globalAlpha = 1;
    }
    prevP = p;
  }
  requestAnimationFrame(frame);

  /* ---------------- Tree-ring art (crew section) ---------------- */
  const svg = $('#rings');
  if (svg) {
    const r = window.rng(7), c = 200, n = 14;
    const waves = Array.from({ length: 4 }, () => ({ k: 2 + Math.floor(r() * 4), ph: r() * 6.28, a: .012 + r() * .03 }));
    let out = '';
    for (let i = 1; i <= n; i++) {
      const base = (i / n) * 180, g = i / n;
      let d = '';
      for (let s = 0; s <= 90; s++) {
        const a = (s / 90) * Math.PI * 2;
        let rad = base;
        for (const w of waves) rad *= 1 + Math.sin(a * w.k + w.ph + i * .2) * w.a * g;
        d += (s ? 'L' : 'M') + (c + Math.cos(a) * rad + (1 - g) * 6).toFixed(1) + ' ' + (c + Math.sin(a) * rad).toFixed(1);
      }
      const len = Math.round(2 * Math.PI * base * 1.05);
      out += `<path d="${d}Z" stroke-width="${i === n ? 2.4 : (r() > .7 ? 1.5 : .9)}" opacity="${.35 + g * .6}" style="--len:${len};--dl:${(i * .07).toFixed(2)}s"/>`;
    }
    out += `<circle cx="${c + 6}" cy="${c}" r="4" fill="#ff8a3d"/>`;
    svg.innerHTML = out;
  }
})();
