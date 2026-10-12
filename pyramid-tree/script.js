/* Pyramid Tree Experts: clickable low-poly 3D forest (Three.js r128) + timeline */
(() => {
  'use strict';
  const { $, reduce } = window.CORE;

  /* ---------------- Timeline reveal ---------------- */
  const tl = $('#timeline');
  const tio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { tl.classList.add('in'); tio.disconnect(); } }), { threshold: .35 });
  tio.observe(tl);

  /* ---------------- Forest ---------------- */
  const host = $('#forest'), hud = $('.hud'), countEl = $('#hudCount'), tip = $('#hudTip');
  let renderer;
  try {
    if (!window.THREE) throw new Error('no three');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) { hud.style.display = 'none'; return; }

  const T = THREE;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  host.append(renderer.domElement);

  const scene = new T.Scene();
  scene.fog = new T.Fog(0xdcefe5, 40, 95);
  const camera = new T.PerspectiveCamera(38, 1, .1, 200);

  scene.add(new T.HemisphereLight(0xeaf8ff, 0x5c7a4a, .85));
  const sun = new T.DirectionalLight(0xfff1d6, 1.0);
  sun.position.set(-18, 30, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 90 });
  scene.add(sun);

  // ground with gentle low-poly hills
  const gGeo = new T.CircleGeometry(70, 48, 0, Math.PI * 2);
  gGeo.rotateX(-Math.PI / 2);
  const gp = gGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    gp.setY(i, Math.sin(x * .12) * .6 + Math.cos(z * .1) * .5);
  }
  gGeo.computeVertexNormals();
  const ground = new T.Mesh(gGeo, new T.MeshLambertMaterial({ color: 0x92c48a, flatShading: true }));
  ground.receiveShadow = true;
  scene.add(ground);
  const groundY = (x, z) => Math.sin(x * .12) * .6 + Math.cos(z * .1) * .5;

  const R = window.rng(77);
  const greens = [0x2f8a5b, 0x3a9e66, 0x26754c, 0x48a86d, 0x1e6443];
  const trunkMat = new T.MeshLambertMaterial({ color: 0x7a5236, flatShading: true });
  const stumpTop = new T.MeshLambertMaterial({ color: 0xd9a46c, flatShading: true });
  const trees = [], pickables = [];

  function makeTree(x, z, s) {
    const g = new T.Group();
    const trunk = new T.Mesh(new T.CylinderGeometry(.22, .3, 1.4, 6), trunkMat);
    trunk.position.y = .7; trunk.castShadow = true; g.add(trunk);
    const mat = new T.MeshLambertMaterial({ color: greens[Math.floor(R() * greens.length)], flatShading: true, emissive: 0x000000 });
    const tiers = 3 + (R() > .6 ? 1 : 0);
    for (let k = 0; k < tiers; k++) {
      const r = 1.6 - k * .34, h = 2.2 - k * .25;
      const cone = new T.Mesh(new T.ConeGeometry(r, h, 4 + Math.floor(R() * 3)), mat);
      cone.position.y = 1.4 + k * 1.05 + h / 2 - .3;
      cone.rotation.y = R() * Math.PI;
      cone.castShadow = true;
      g.add(cone); pickables.push(cone); cone.userData.tree = g;
    }
    pickables.push(trunk); trunk.userData.tree = g;
    g.position.set(x, groundY(x, z) - .05, z);
    g.scale.setScalar(s);
    g.userData = { mat, s, home: [x, z], state: 'up', t0: 0 };
    scene.add(g); trees.push(g);
    return g;
  }

  // scatter with simple rejection so trees don't overlap
  const spots = [];
  for (let tries = 0; spots.length < 70 && tries < 3000; tries++) {
    const x = (R() - .5) * 70, z = (R() - .5) * 60 - 4;
    if (spots.some(([a, b]) => Math.hypot(a - x, b - z) < 3.4)) continue;
    spots.push([x, z]);
  }
  spots.forEach(([x, z]) => makeTree(x, z, .75 + R() * .7));

  const stumps = new T.Group(); scene.add(stumps);
  function addStump(tree) {
    const s = tree.userData.s, [x, z] = tree.userData.home;
    const st = new T.Group();
    const side = new T.Mesh(new T.CylinderGeometry(.3 * s, .34 * s, .35 * s, 7), trunkMat);
    side.position.y = .17 * s; side.castShadow = true;
    const top = new T.Mesh(new T.CylinderGeometry(.3 * s, .3 * s, .02, 7), stumpTop);
    top.position.y = .35 * s;
    st.add(side, top); st.position.set(x, groundY(x, z), z);
    stumps.add(st); tree.userData.stump = st;
  }

  // chips burst
  const chipGeo = new T.BoxGeometry(.12, .06, .12);
  const chipMat = new T.MeshLambertMaterial({ color: 0xd9a46c });
  let chips = [];
  function burst(pos) {
    for (let i = 0; i < 26; i++) {
      const m = new T.Mesh(chipGeo, chipMat);
      m.position.copy(pos);
      m.userData.v = new T.Vector3((Math.random() - .5) * .3, .15 + Math.random() * .25, (Math.random() - .5) * .3);
      m.userData.life = 1;
      scene.add(m); chips.push(m);
    }
  }

  let removed = 0;
  function fell(tree) {
    if (tree.userData.state !== 'up') return;
    const dir = Math.random() * Math.PI * 2;
    tree.userData.state = 'falling';
    tree.userData.t0 = performance.now();
    tree.userData.axis = new T.Vector3(Math.cos(dir), 0, Math.sin(dir));
    removed++; countEl.textContent = removed;
    tip.textContent = removed === 1 ? 'Nice cut. Try another' : removed < 5 ? 'Clean work. Keep going' : 'Hire Tony for the real ones →';
  }

  // picking
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  let hover = null;
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.tree : null;
  }
  renderer.domElement.addEventListener('pointerdown', e => { const t = pick(e); if (t) fell(t); });
  renderer.domElement.addEventListener('pointermove', e => {
    const t = pick(e);
    if (hover && hover !== t) hover.userData.mat.emissive.setHex(0x000000);
    hover = t && t.userData.state === 'up' ? t : null;
    if (hover) hover.userData.mat.emissive.setHex(0x3a2200);
    renderer.domElement.style.cursor = hover ? 'pointer' : 'default';
  });

  let px = 0, pxT = 0;
  addEventListener('pointermove', e => { pxT = e.clientX / innerWidth - .5; }, { passive: true });

  let mobile = false;
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    mobile = w < 760;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = mobile ? 52 : 38;
    camera.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);

  const q = new T.Quaternion(), clock0 = performance.now();
  const easeIn = t => t * t * t;
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(host);

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = now - clock0;
    px += (pxT - px) * .04;
    const focusX = mobile ? 0 : 9;
    const sway = reduce ? 0 : Math.sin(t * .00012) * 3;
    camera.position.set(focusX - 6 + sway + px * 4, mobile ? 20 : 15, mobile ? 40 : 34);
    camera.lookAt(focusX, 1.5, -2);

    for (const tr of trees) {
      const u = tr.userData;
      if (u.state === 'falling') {
        const k = Math.min(1, (now - u.t0) / 900);
        q.setFromAxisAngle(u.axis, easeIn(k) * Math.PI * .5 * .97);
        tr.quaternion.copy(q);
        if (k >= 1) {
          u.state = 'down'; u.t1 = now; addStump(tr);
          const tip = new T.Vector3(0, 3.4 * u.s, 0).applyQuaternion(q).add(tr.position);
          burst(tip.lerp(tr.position, .5));
        }
      } else if (u.state === 'down') {
        const k = Math.min(1, (now - u.t1 - 500) / 600);
        if (k > 0) tr.scale.setScalar(u.s * (1 - k));
        if (k >= 1) { u.state = 'gone'; u.t2 = now; tr.visible = false; }
      } else if (u.state === 'gone' && now - u.t2 > 7000) {
        // it grows back so the forest never runs out
        if (u.stump) { stumps.remove(u.stump); u.stump = null; }
        tr.quaternion.identity(); tr.visible = true; tr.scale.setScalar(.001);
        u.state = 'growing'; u.t3 = now;
      } else if (u.state === 'growing') {
        const k = Math.min(1, (now - u.t3) / 1400);
        tr.scale.setScalar(u.s * (1 - Math.pow(1 - k, 3)));
        if (k >= 1) u.state = 'up';
      } else if (!reduce) {
        tr.rotation.z = Math.sin(t * .0012 + tr.position.x) * .015;
      }
    }

    chips = chips.filter(c => {
      c.userData.v.y -= .012; c.position.add(c.userData.v); c.rotation.x += .2; c.userData.life -= .015;
      const gy = groundY(c.position.x, c.position.z);
      if (c.position.y < gy) { c.position.y = gy; c.userData.v.multiplyScalar(.4); c.userData.v.y = 0; }
      if (c.userData.life <= 0) { scene.remove(c); return false; }
      return true;
    });

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
})();
