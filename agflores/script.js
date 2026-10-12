/* AG Flores: day/night switch with fireplace embers */
(() => {
  'use strict';
  const { $, reduce } = window.CORE;
  const root = document.documentElement, sw = $('#dnSwitch');
  const meta = document.querySelector('meta[name=theme-color]');
  const sync = () => {
    const n = root.classList.contains('night');
    sw.setAttribute('aria-checked', n);
    meta.content = n ? '#0f1018' : '#f5ede2';
  };
  [sw, ...document.querySelectorAll('[data-dn]')].forEach(b => b.addEventListener('click', () => { root.classList.toggle('night'); sync(); }));
  sync();

  // Embers rising from the fireplace (fire sits at ~61% x, ~55% y of the night photo)
  const cv = $('#embers'), ctx = cv.getContext('2d');
  let W, H, dpr, parts = [];
  const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
  size(); addEventListener('resize', size);
  function frame() {
    requestAnimationFrame(frame);
    if (!root.classList.contains('night') || reduce) { if (parts.length) { parts = []; ctx.clearRect(0, 0, cv.width, cv.height); } return; }
    // The photo is object-fit: cover, so map image coords onto the box
    const iw = 1050, ih = 1400, s = Math.max(W / iw, H / ih);
    const fx = (W - iw * s) / 2 + iw * .62 * s, fy = (H - ih * s) / 2 + ih * .55 * s, fw = iw * .12 * s;
    if (parts.length < 70 && Math.random() < .6) parts.push({ x: fx + (Math.random() - .5) * fw, y: fy, vx: (Math.random() - .5) * .4, vy: -.6 - Math.random() * 1.2, life: 1, r: .8 + Math.random() * 1.8, w: Math.random() * 6 });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // warm flicker glow
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, fw * 3.2);
    g.addColorStop(0, `rgba(255,150,60,${.16 + Math.random() * .05})`); g.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.w += .05; p.x += p.vx + Math.sin(p.w) * .35; p.y += p.vy; p.life -= .008;
      ctx.fillStyle = `rgba(255,${120 + p.life * 100 | 0},50,${p.life})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + p.life * .6), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  requestAnimationFrame(frame);
})();
