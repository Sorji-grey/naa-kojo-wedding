/* ==========================================================================
   hero3d.js — floating gallery hero (three.js r187)

   Art direction: a quiet, deep forest-green room (#001a0b) with fog. Naa & Kojo's
   pre-wedding photos, two polaroids and small wedding-day cards (countdown,
   order of the day, invitation, "just replied" toast) hang at different
   depths around one studio portrait. Unlit, true-colour images; depth comes
   from fog and parallax, not lighting. Motion: cards fly in from the dark,
   bob gently, lean with the pointer; scrolling dollies the camera through them.

   Knobs: CARDS (what floats where), BG, WEDDING, camera FOV / distance in layout().
   ========================================================================== */
import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';

const BG = '#001a0b';
const INK = '#001a0b';
const INK_A = (a) => 'rgba(0,26,11,' + a + ')';
const ORANGE = '#ff623b';
const LIME = '#d5e96d';
const YELLOW = '#efd85d';
const CREAM = '#f0e8d6';
const SAGE = '#e8ede2';
const html = document.documentElement;
const hero = document.querySelector('[data-hero]');
const stage = document.querySelector('[data-hero-stage]');
const canvas = stage && stage.querySelector('canvas');
const pctEl = document.querySelector('[data-loader-pct]');

const done = (ok) => {
  if (!ok) html.classList.remove('want-3d');
  document.dispatchEvent(new CustomEvent('kr:ready', { detail: { webgl: ok } }));
};

if (!hero || !stage || !canvas || !WebGL.isWebGL2Available()) done(false);
else init().catch((err) => { console.warn('[hero3d] static fallback:', err); done(false); });

async function init() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const paused = () => html.classList.contains('motion-paused');

  /* ---------- Assets ---------- */
  const IMG = {
    portrait: 'img/couple/portrait.webp',
    bride: 'img/couple/bride.webp',
    groom: 'img/couple/groom.webp',
    bw: 'img/couple/bw.webp',
    street: 'img/couple/street.webp',
    beach: 'img/couple/beach.webp',
    garden: 'img/couple/garden.webp',
    night: 'img/couple/night.webp',
    proposal: 'img/couple/proposal.webp',
    hands: 'img/couple/hands.webp',
  };
  const keys = Object.keys(IMG);
  let loaded = 0;
  const report = () => { if (pctEl) pctEl.textContent = Math.round((loaded / (keys.length + 1)) * 100) + '%'; };
  const images = {};
  await Promise.all(keys.map((k) => new Promise((res) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = im.onerror = () => { loaded++; report(); res(); };
    im.src = IMG[k];
    images[k] = im;
  })));
  if (document.fonts) {
    await Promise.race([
      Promise.all(['300 80px Newsreader', 'italic 300 80px Newsreader', '500 24px Geist', '400 24px Geist', '600 24px Geist'].map((f) => document.fonts.load(f))),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  }
  loaded++; report();

  /* ---------- Renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.75 : 2));
  renderer.setClearColor(BG, 1);
  renderer.toneMapping = THREE.NoToneMapping;     // flat, true-colour images
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 11, 27);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);

  /* ---------- Canvas helpers ---------- */
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const cover = (ctx, img, x, y, w, h, fy = 0.5) => {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / s, sh = h / s;
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) * fy, sw, sh, x, y, w, h);
  };
  const toTex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t; };
  const spaced = (ctx, px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = px; };
  const aspectOf = (img, fallback) => (img.naturalWidth ? img.naturalWidth / img.naturalHeight : fallback);

  // Kente ribbon, matching the .kente stripe in the CSS (one 74-unit repeat, scaled)
  const kente = (x, y0, w, hgt, unit = 1.6) => {
    const bands = [[YELLOW, 18], [INK, 3], [LIME, 6], [INK, 3], [YELLOW, 16], ['#0f4a26', 12], [ORANGE, 4], ['#0f4a26', 12]];
    let px = 0;
    while (px < w) for (const [col, bw] of bands) { x.fillStyle = col; x.fillRect(px, y0, bw * unit + 0.5, hgt); px += bw * unit; }
  };

  const photoCard = (img, aspect, r = 26) => {
    const w = 1000, h = Math.round(w / aspect);
    const [c, x] = mk(w, h);
    x.beginPath(); x.roundRect(0, 0, w, h, r); x.clip();
    x.fillStyle = '#0b2a17'; x.fillRect(0, 0, w, h);
    if (img.naturalWidth) cover(x, img, 0, 0, w, h, 0.4);
    return { tex: toTex(c), aspect };
  };

  // Polaroid with a handwritten-feeling caption
  const polaroid = (img, caption) => {
    const w = 760, pad = 34, ih = Math.round((w - pad * 2) * 4 / 3), h = pad + ih + 150;
    const [c, x] = mk(w, h);
    x.beginPath(); x.roundRect(0, 0, w, h, 14); x.fillStyle = '#fbf7f0'; x.fill();
    x.save(); x.beginPath(); x.rect(pad, pad, w - pad * 2, ih); x.clip();
    x.fillStyle = '#0b2a17'; x.fillRect(pad, pad, w - pad * 2, ih);
    if (img.naturalWidth) cover(x, img, pad, pad, w - pad * 2, ih, 0.2);
    x.restore();
    x.fillStyle = INK; x.font = 'italic 300 74px Newsreader'; spaced(x, '-2px');
    x.fillText(caption[0], pad + 6, pad + ih + 96); spaced(x, '0px');
    x.font = '400 22px Geist'; x.fillStyle = INK_A(0.5); x.textAlign = 'right'; spaced(x, '4px');
    x.fillText(caption[1], w - pad - 6, pad + ih + 92); spaced(x, '0px'); x.textAlign = 'left';
    return { tex: toTex(c), aspect: w / h };
  };

  const uiCard = (w, h, r, bg, draw) => {
    const [c, x] = mk(w, h);
    x.beginPath(); x.roundRect(0, 0, w, h, r); x.clip();
    if (typeof bg === 'function') bg(x, w, h); else { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
    draw(x, w, h);
    return { tex: toTex(c), aspect: w / h, canvas: c, ctx: x, draw, bg };
  };

  // Countdown (cream) — redrawn every second
  const WEDDING = new Date('2027-04-17T14:00:00Z');   // Accra is on GMT all year
  const countdown = uiCard(900, 600, 40, CREAM, (x, w, h) => {
    x.fillStyle = CREAM; x.fillRect(0, 0, w, h);
    x.fillStyle = INK; x.font = '500 22px Geist'; spaced(x, '5px');
    x.fillText('COUNTING DOWN', 56, 84); spaced(x, '0px');
    const ms = Math.max(0, WEDDING - Date.now());
    const v = [Math.floor(ms / 864e5), Math.floor(ms / 36e5) % 24, Math.floor(ms / 6e4) % 60, Math.floor(ms / 1e3) % 60];
    ['days', 'hrs', 'min', 'sec'].forEach((l, i) => {
      const cx = 56 + i * 205;
      x.fillStyle = INK; x.font = (v[i] > 99 ? '300 118px' : '300 150px') + ' Newsreader'; spaced(x, '-6px');
      x.fillText(String(v[i]).padStart(2, '0'), cx - 6, 330); spaced(x, '0px');
      x.font = '400 24px Geist'; x.fillStyle = INK_A(0.55); x.fillText(l, cx, 380);
    });
    x.fillStyle = INK_A(0.12); x.fillRect(56, 450, w - 112, 2);
    x.fillStyle = INK; x.font = 'italic 300 40px Newsreader'; x.fillText('Naa & Kojo', 56, 525);
    x.font = '400 24px Geist'; x.fillStyle = INK_A(0.6); x.textAlign = 'right'; x.fillText('17 · 04 · 2027', w - 56, 522); x.textAlign = 'left';
  });

  // Order of the day (white)
  const schedule = uiCard(720, 940, 44, '#ffffff', (x, w) => {
    x.fillStyle = INK; x.font = '500 22px Geist'; spaced(x, '5px'); x.fillText('SATURDAY · 17 APRIL', 52, 82); spaced(x, '0px');
    x.font = '300 84px Newsreader'; spaced(x, '-3px'); x.fillText('Order of', 46, 186); x.font = 'italic 300 84px Newsreader'; x.fillText('the day', 46, 262); spaced(x, '0px');
    const rows = [['13:45', 'Please be seated'], ['14:00', 'Church service'], ['16:00', 'Photos & cocktails'], ['18:30', 'Reception & dinner'], ['21:30', 'Dance floor opens']];
    rows.forEach(([t, s], i) => {
      const y = 372 + i * 112;
      x.fillStyle = '#f3f5f0'; x.beginPath(); x.roundRect(40, y - 52, w - 80, 92, 22); x.fill();
      x.fillStyle = i === 1 ? ORANGE : INK_A(0.18); x.beginPath(); x.arc(84, y - 6, 10, 0, Math.PI * 2); x.fill();
      x.fillStyle = INK; x.font = '400 30px Newsreader'; x.fillText(t, 116, y + 4);
      x.font = '500 27px Geist'; x.fillStyle = INK_A(0.75); x.fillText(s, 236, y + 2);
    });
  });

  // Invitation (blush → cream, kente band on top)
  const invite = uiCard(860, 600, 40, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#f2dbf1'); g.addColorStop(1, '#f6e3d6'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    kente(x, 0, w, 22);
  }, (x, w) => {
    x.textAlign = 'center'; x.fillStyle = INK;
    x.font = '500 20px Geist'; spaced(x, '6px'); x.fillText('TOGETHER WITH THEIR FAMILIES', w / 2, 128); spaced(x, '0px');
    x.font = '300 124px Newsreader'; spaced(x, '-4px'); x.fillText('Naa & Kojo', w / 2, 292); spaced(x, '0px');
    x.font = '400 26px Geist'; x.fillStyle = INK_A(0.6); x.fillText('16 & 17 April 2027 · Accra, Ghana', w / 2, 352);
    x.fillStyle = INK; x.beginPath(); x.roundRect(w / 2 - 150, 420, 300, 84, 42); x.fill();
    x.fillStyle = SAGE; x.font = '500 28px Geist'; x.fillText('Kindly reply  →', w / 2, 472);
    x.textAlign = 'left';
  });

  // "Just replied" toast (midnight glass)
  const toast = uiCard(820, 230, 115, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(40,62,46,.96)'); g.addColorStop(1, 'rgba(22,44,30,.96)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  }, (x, w, h) => {
    x.fillStyle = '#f2dbf1'; x.beginPath(); x.arc(115, h / 2, 72, 0, Math.PI * 2); x.fill();
    x.fillStyle = INK; x.font = 'italic 300 64px Newsreader'; x.textAlign = 'center'; x.fillText('AD', 113, h / 2 + 22); x.textAlign = 'left';
    x.fillStyle = SAGE; x.font = '500 38px Geist'; x.fillText('Auntie Dede is coming!', 220, 104);
    x.fillStyle = 'rgba(232,237,226,.6)'; x.font = '400 28px Geist'; x.fillText('All three moments · 2 seats · just now', 220, 152);
    x.fillStyle = LIME; x.beginPath(); x.roundRect(w - 120, h / 2 - 34, 68, 68, 18); x.fill();
    x.strokeStyle = INK; x.lineWidth = 6; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(w - 101, h / 2 + 1); x.lineTo(w - 90, h / 2 + 13); x.lineTo(w - 70, h / 2 - 11); x.stroke();
  });

  const redrawCountdown = () => { const c = countdown; c.ctx.save(); c.draw(c.ctx, c.canvas.width, c.canvas.height); c.ctx.restore(); c.tex.needsUpdate = true; };

  /* ---------- Cards: [content, desktop {x,y,z,h,r}, mobile {x,y,z,h} | null] ---------- */
  const I = images;
  const CARDS = [
    [photoCard(I.portrait, 0.75, 30), [0, 0.05, 0, 3.15, 0], [0, 0.35, 0, 2.7]],
    [photoCard(I.beach, aspectOf(I.beach, 16 / 9)), [-5.3, 2.55, -3, 1.9, 0.015], [-1.9, 3.35, -3.5, 1.3]],
    [photoCard(I.garden, aspectOf(I.garden, 16 / 9)), [5.7, 2.75, -3.6, 1.9, -0.015], [2.0, 2.75, -4.5, 1.3]],
    [polaroid(I.bride, ['Naa', 'THE BRIDE']), [-3.6, -1.8, 1.1, 2.35, 0.05], [-1.75, -2.35, 0.9, 1.75]],
    [polaroid(I.groom, ['Kojo', 'THE GROOM']), [3.85, -1.8, 0.5, 2.3, -0.045], [1.85, -1.75, 0.3, 1.7]],
    [countdown, [-3.1, -3.3, -4, 1.45, -0.02], [-2.6, -0.2, -6.5, 1.15]],
    [schedule, [3.55, 2.7, -6, 2.1, 0.025], [2.9, -4.4, -6.5, 1.7]],
    [photoCard(I.night, aspectOf(I.night, 4 / 3)), [0.87, 4.0, -7.5, 2.4, 0.01], [0.4, 5.6, -8, 2.0]],
    [photoCard(I.proposal, aspectOf(I.proposal, 4 / 3)), [-5.23, 1.3, -9, 2.0, -0.02], null],
    [photoCard(I.street, 0.75), [-2.9, 3.8, -8, 2.4, -0.015], null],
    [invite, [0.58, -4.15, -9, 1.95, 0.02], [3.6, 7.2, -12, 1.6]],
    [photoCard(I.bw, 0.75), null, [-3.3, 6.4, -12, 2.6]],
    [toast, [1.75, -2.05, 2.1, 0.5, 0], [0.55, -0.95, 2.4, 0.42]],
  ];

  const group = new THREE.Group(); scene.add(group);
  const meshes = CARDS.map(([card, d, m], i) => {
    const mat = new THREE.MeshBasicMaterial({ map: card.tex, transparent: true, opacity: 0, depthWrite: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(card.aspect, 1), mat);
    mesh.userData = { d, m, phase: i * 1.37, delay: 0.05 + i * 0.055, hover: 0, base: new THREE.Vector3(), h: 1, r: 0 };
    group.add(mesh);
    return mesh;
  });

  /* ---------- Layout ---------- */
  let portrait = false, camZ = 10;
  function layout() {
    const w = stage.clientWidth || innerWidth, h = stage.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    portrait = camera.aspect < 0.9;
    camZ = portrait ? 12.5 : camera.aspect < 1.3 ? 12 : 10;
    camera.updateProjectionMatrix();
    meshes.forEach((m) => {
      const spec = portrait ? m.userData.m : m.userData.d;
      m.visible = !!spec;
      if (!spec) return;
      m.userData.base.set(spec[0], spec[1], spec[2]);
      m.userData.h = spec[3];
      m.userData.r = spec[4] || 0;
    });
  }
  new ResizeObserver(layout).observe(stage);
  layout();

  /* ---------- Interaction ---------- */
  const pointer = new THREE.Vector2(), ndc = new THREE.Vector2(-9, -9);
  if (!coarse) addEventListener('pointermove', (e) => {
    pointer.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }, { passive: true });
  const ray = new THREE.Raycaster();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '80px' }).observe(hero);

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const readProgress = () => {
    const r = hero.getBoundingClientRect();
    const span = r.height - innerHeight;
    return span > 0 ? clamp01(-r.top / span) : clamp01(-r.top / innerHeight);
  };
  const damp = THREE.MathUtils.damp, lerp = THREE.MathUtils.lerp;
  const expoOut = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

  /* ---------- Loop ---------- */
  const timer = new THREE.Timer(); timer.connect(document);
  let started = false, introT = reduce ? 10 : 0, prog = 0, lastSec = -1, motionT = 0;
  const par = new THREE.Vector2();
  if (html.classList.contains('is-loaded')) started = true; // loader already gave up waiting
  else document.addEventListener('kr:start', () => { started = true; }, { once: true });

  renderer.setAnimationLoop((t) => {
    timer.update(t);
    if (!visible) return;
    const dt = Math.min(timer.getDelta(), 1 / 30);
    const still = reduce || paused();
    if (!still) motionT += dt;
    if (started) introT += dt;

    const target = readProgress();
    prog = reduce ? target : damp(prog, target, 6, dt);
    hero.style.setProperty('--p', prog.toFixed(4));

    par.x = damp(par.x, still ? 0 : pointer.x, 2.5, dt);
    par.y = damp(par.y, still ? 0 : pointer.y, 2.5, dt);
    camera.position.set(par.x * 0.7, -par.y * 0.45, lerp(camZ, camZ - 4.6, prog));
    camera.lookAt(par.x * 0.2, -par.y * 0.1, -3);

    // hover
    let hovered = null;
    if (!coarse && !still) {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(meshes.filter((m) => m.visible), false)[0];
      hovered = hit ? hit.object : null;
    }
    canvas.style.cursor = hovered ? 'pointer' : '';

    const spread = 1 + prog * 0.9;
    meshes.forEach((m) => {
      if (!m.visible) return;
      const u = m.userData;
      const e = expoOut(clamp01((introT - u.delay) / 1.6));
      u.hover = damp(u.hover, m === hovered ? 1 : 0, 8, dt);
      const bob = Math.sin(motionT * 0.55 + u.phase) * 0.07;
      m.position.set(u.base.x * spread, u.base.y * spread + bob, u.base.z - (1 - e) * 9 + u.hover * 0.25);
      const s = u.h * (1 + u.hover * 0.04);
      m.scale.set(s, s, 1);
      m.rotation.z = u.r + Math.sin(motionT * 0.4 + u.phase) * 0.008;
      m.material.opacity = e;
    });

    const sec = Math.floor(Date.now() / 1000);
    if (sec !== lastSec) { lastSec = sec; redrawCountdown(); }

    renderer.render(scene, camera);
  });

  canvas.addEventListener('click', () => {
    const story = document.getElementById('story');
    if (!story) return;
    if (window.JasonMotion && window.JasonMotion.lenis) window.JasonMotion.lenis.scrollTo(story, { offset: -40 });
    else story.scrollIntoView({ behavior: 'smooth' });
  });

  await renderer.compileAsync(scene, camera);
  html.classList.add('has-3d');
  stage.classList.add('is-ready');
  done(true);
}
