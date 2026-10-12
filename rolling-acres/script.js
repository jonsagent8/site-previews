/* Rolling Acres: living hills hero, before/after slider, build-up cross-section */
(() => {
  'use strict';
  const { $, $$, reduce } = window.CORE;

  /* ---------------- Rolling hills ---------------- */
  const hills = $$('.hill');
  const sun = $('#sun'), glow = $('#sunGlow');
  let mx = 0, mxT = 0;
  addEventListener('pointermove', e => { mxT = e.clientX / innerWidth - .5; }, { passive: true });
  function hillPath(base, amp, freq, phase, shift) {
    let d = `M-20 900 L-20 ${base}`;
    for (let x = -20; x <= 1460; x += 20) {
      const y = base + Math.sin(x / 1440 * Math.PI * 2 * freq + phase) * amp + Math.sin(x / 1440 * Math.PI * 5.3 * freq + phase * 1.7) * amp * .35;
      d += ` L${x + shift} ${y.toFixed(1)}`;
    }
    return d + ' L1460 900 Z';
  }
  function hillsFrame(t) {
    mx += (mxT - mx) * .05;
    const sy = Math.min(scrollY, innerHeight);
    hills.forEach((h, i) => {
      const dep = +h.dataset.depth;
      const phase = (reduce ? 0 : t * .00012 * (1 + i * .25)) + i;
      h.setAttribute('d', hillPath(+h.dataset.base + sy * dep * .25 * -1 + sy * .1, +h.dataset.amp, +h.dataset.freq, phase, mx * -40 * dep));
    });
    const cy = 380 - sy * .35;
    sun.setAttribute('cy', cy); glow.setAttribute('cy', cy);
    sun.setAttribute('cx', 1060 + mx * 20); glow.setAttribute('cx', 1060 + mx * 20);
    requestAnimationFrame(hillsFrame);
  }
  requestAnimationFrame(hillsFrame);

  /* ---------------- Before / after ---------------- */
  const ba = $('#ba'), range = $('#baRange');
  const setPos = v => ba.style.setProperty('--pos', v + '%');
  range.addEventListener('input', () => setPos(range.value));
  // Gentle auto-sweep once when it first appears, to show it's interactive
  const baIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting || reduce) return;
    baIO.disconnect();
    const t0 = performance.now();
    const sweep = t => {
      const p = Math.min(1, (t - t0) / 2200);
      const v = 50 + Math.sin(p * Math.PI * 2) * 30 * (1 - p);
      setPos(v); range.value = v;
      if (p < 1) requestAnimationFrame(sweep);
    };
    requestAnimationFrame(sweep);
  }), { threshold: .6 });
  baIO.observe(ba);

  /* ---------------- Cross-section build ---------------- */
  const row = $('#paverRow');
  let pv = '';
  for (let i = 0, x = 0; x < 600; i++, x += 60) {
    const y = 214 + (x / 600) * 12;
    pv += `<rect class="paver" x="${x + 2}" y="${y}" width="56" height="20" rx="2" fill="${i % 3 ? '#7e8790' : '#6c7580'}" style="transition-delay:${i * 50}ms"/>`;
  }
  row.innerHTML = pv;
  // grass tufts at the edges
  const below = $('#below'), xsec = $('#xsec');
  const order = [4, 3, 2, 1, 0];
  const lis = $$('#layersList li');
  function belowFrame() {
    const r = below.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, -r.top / (r.height - innerHeight)));
    const step = Math.min(order.length, Math.floor(p * (order.length + .6)));
    order.forEach((l, i) => $(`.lyr[data-l="${l}"]`, xsec).classList.toggle('on', i < step || reduce));
    const cur = order[Math.max(0, step - 1)];
    lis.forEach(li => li.classList.toggle('on', +li.dataset.l === cur));
    $$('.paver', row).forEach(el => el.style.transform = step >= 5 ? 'none' : 'translateY(-80px)');
    xsec.classList.toggle('done', step >= 5);
  }
  addEventListener('scroll', belowFrame, { passive: true }); belowFrame();
})();
