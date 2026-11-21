/* =============================================================
   Pueromaniya — 3D-блин пуеру, керований прокруткою.
   Прокрутка вниз: блин у папері → обгортка розлітається →
   блин розколюється на шматки → шматок летить до глядача.
   Прокрутка вгору — усе у зворотному порядку.
   ============================================================= */
import * as THREE from '../vendor/three.module.min.js';

const canvas = document.querySelector('[data-tea3d]');
const section = document.querySelector('[data-scrolly]');
const stages = [...document.querySelectorAll('[data-stage]')];
const progressBar = document.querySelector('[data-progress]');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (p, a, b) => ease(clamp((p - a) / (b - a)));

/* ---------- Прогрес прокрутки та підписи (працюють і без WebGL) ---------- */
let target = 0;
function readScroll() {
  const r = section.getBoundingClientRect();
  const total = r.height - innerHeight;
  target = clamp(-r.top / total);
  if (progressBar) progressBar.style.setProperty('--p', target.toFixed(3));
  stages.forEach((el) => {
    const [a, b] = el.dataset.stage.split(',').map(Number);
    el.classList.toggle('is-on', target >= a && target < b);
  });
}
addEventListener('scroll', readScroll, { passive: true });
addEventListener('resize', readScroll);
readScroll();

/* ---------- WebGL ----------
   Запускаємо 3D після того, як сторінка вже показана: генерація текстур
   не затримує перший екран на слабких телефонах. */
async function start3D() {
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
}

if (renderer) {
  const isMobile = matchMedia('(max-width: 700px)').matches;
  // Якість під пристрій: на телефоні менша щільність пікселів, далі — автопідлаштування
  let maxDpr = Math.min(devicePixelRatio, isMobile ? 1.5 : 1.75);
  renderer.setPixelRatio(maxDpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  /* ---------- Світло: теплий ключовий + холодний контровий ---------- */
  scene.add(new THREE.HemisphereLight(0xffe9cf, 0x1a120c, 0.55));
  const key = new THREE.DirectionalLight(0xffd6a8, 2.6); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 1.4); rim.position.set(-4, 2, -3); scene.add(rim);
  const fill = new THREE.PointLight(0xc3311f, 6, 9, 2); fill.position.set(-2.5, -1.2, 2.5); scene.add(fill);

  /* ---------- Процедурні текстури ---------- */
  const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

  // малюємо листя порціями між кадрами — без «підвисань» прокрутки
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  async function leafCanvas(size, tones, bg, count) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, size, size);
    for (let i = 0; i < count; i++) {
      if (i && i % 2500 === 0) await nextFrame();
      const x = rand() * size, y = rand() * size;
      const len = size * (0.006 + rand() * 0.016), w = len * (0.12 + rand() * 0.16);
      g.save(); g.translate(x, y); g.rotate(rand() * Math.PI * 2);
      g.fillStyle = tones[(rand() * tones.length) | 0];
      g.globalAlpha = 0.45 + rand() * 0.5;
      g.beginPath(); g.ellipse(0, 0, len, w, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    return c;
  }
  const texSize = isMobile ? 1024 : 2048;
  // шу пуер: темне листя із золотистими типсами
  const leafC = await leafCanvas(texSize, ['#2e190c', '#3b2212', '#24140a', '#4a2c16', '#5a3519', '#2a170b', '#7a4a22', '#a8722f', '#1a0e06', '#3f2412'], '#1d1008', isMobile ? 18000 : 48000);
  const leafTex = new THREE.CanvasTexture(leafC); leafTex.colorSpace = THREE.SRGBColorSpace; leafTex.anisotropy = 8;
  const bumpTex = new THREE.CanvasTexture(leafC);

  // рисовий папір з червоним друком
  function paperCanvas(size) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = '#efe7d6'; g.fillRect(0, 0, size, size);
    for (let i = 0; i < 2600; i++) { // волокна
      g.strokeStyle = `rgba(120,95,60,${0.04 + rand() * 0.06})`; g.lineWidth = 0.6 + rand();
      const x = rand() * size, y = rand() * size, a = rand() * Math.PI * 2, l = 6 + rand() * 26;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    const cx = size / 2, cy = size / 2;
    g.strokeStyle = '#c3311f'; g.fillStyle = '#c3311f';
    g.lineWidth = size * 0.012; g.beginPath(); g.arc(cx, cy, size * 0.36, 0, Math.PI * 2); g.stroke();
    g.lineWidth = size * 0.004; g.beginPath(); g.arc(cx, cy, size * 0.33, 0, Math.PI * 2); g.stroke();
    // текст по колу
    const ring = ' PUEROMANIYA · ПУЕР · YUNNAN · 357 Г ·';
    g.font = `700 ${size * 0.034}px Unbounded, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const step = (Math.PI * 2) / ring.length;
    for (let i = 0; i < ring.length; i++) {
      const a = i * step - Math.PI / 2;
      g.save(); g.translate(cx + Math.cos(a) * size * 0.4, cy + Math.sin(a) * size * 0.4); g.rotate(a + Math.PI / 2);
      g.fillText(ring[i], 0, 0); g.restore();
    }
    // центральна «печатка»
    g.save(); g.translate(cx, cy); g.rotate(-0.08);
    g.fillRect(-size * 0.12, -size * 0.12, size * 0.24, size * 0.24);
    g.fillStyle = '#efe7d6';
    g.font = `900 ${size * 0.085}px "Noto Serif CJK TC", "Songti SC", "SimSun", serif`;
    g.fillText('普洱', 0, -size * 0.038);
    g.font = `800 ${size * 0.028}px Unbounded, Arial, sans-serif`;
    g.fillText('PUEROMANIYA', 0, size * 0.068);
    g.restore();
    return c;
  }
  const paperTex = new THREE.CanvasTexture(paperCanvas(isMobile ? 1024 : 2048)); paperTex.colorSpace = THREE.SRGBColorSpace; paperTex.anisotropy = 8;

  function ticketCanvas() { // нейфей: ярлик, впресований у блин
    const c = document.createElement('canvas'); c.width = 512; c.height = 360;
    const g = c.getContext('2d');
    g.fillStyle = '#f2ead9'; g.fillRect(0, 0, 512, 360);
    g.strokeStyle = '#c3311f'; g.lineWidth = 10; g.strokeRect(26, 26, 460, 308);
    g.fillStyle = '#c3311f'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 150px "Noto Serif CJK TC", "Songti SC", serif'; g.fillText('茶', 256, 160);
    g.font = '700 34px Unbounded, Arial, sans-serif'; g.fillText('PUEROMANIYA', 256, 285);
    return c;
  }
  const ticketTex = new THREE.CanvasTexture(ticketCanvas()); ticketTex.colorSpace = THREE.SRGBColorSpace;

  /* ---------- Геометрія блину ---------- */
  const R = 1, H = 0.2;
  // профіль (r, y): від центру зверху → край → центр знизу (з ямкою «гніздо»)
  const profile = [];
  const N = 26;
  for (let i = 0; i <= N; i++) { const r = (i / N) * 0.9 * R; profile.push([r, H / 2 + 0.07 * (1 - (r / R) ** 2)]); }
  for (let i = 1; i < 12; i++) { // заокруглений край
    const a = Math.PI / 2 - (i / 12) * Math.PI;
    const top = H / 2 + 0.07 * (1 - 0.81), bot = -H / 2;
    const cy = (top + bot) / 2, ry = (top - bot) / 2;
    profile.push([0.9 * R + 0.1 * R * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  for (let i = N; i >= 0; i--) { const r = (i / N) * 0.9 * R; profile.push([r, -H / 2 + 0.05 * Math.exp(-((r / 0.28) ** 2))]); }

  // межі шматків: нерівні кути, «ламана» лінія розлому
  const cuts = [0, 0.95, 2.0, 3.05, 4.1, 5.2, Math.PI * 2];
  const jag = (k, r) => (k === 0 || k === cuts.length - 1 ? 0 : 0.07 * Math.sin(r * 19 + k * 3.1) + 0.04 * Math.sin(r * 41 + k));
  const phiAt = (k, r) => cuts[k] + jag(k, r) * (r / R);

  const uvTop = (x, z) => [0.5 + x / (2.15 * R), 0.5 - z / (2.15 * R)];

  function wedge(k0, k1, scale = 1, segs = 22) {
    const pos = [], uv = [], idx = [];
    const P = profile.length;
    for (let i = 0; i < P; i++) {
      const [r, y] = profile[i];
      const a0 = phiAt(k0, r), a1 = phiAt(k1, r);
      for (let j = 0; j <= segs; j++) {
        const a = lerp(a0, a1, j / segs);
        const x = Math.cos(a) * r * scale, z = Math.sin(a) * r * scale;
        pos.push(x, y * scale, z); uv.push(...uvTop(x, z));
      }
    }
    for (let i = 0; i < P - 1; i++) for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j, b = a + segs + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    // площини розлому (лише для шматків, не для обгортки)
    const capFaces = [];
    if (scale === 1) {
      const contour = profile.map(([r, y]) => new THREE.Vector2(r, y));
      const tris = THREE.ShapeUtils.triangulateShape(contour, []);
      [[k0, -1], [k1, 1]].forEach(([k, side]) => {
        const base = pos.length / 3;
        profile.forEach(([r, y]) => {
          const a = phiAt(k, r);
          pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
          uv.push(0.15 + (r / R) * 0.7, 0.5 + y * 1.6);
        });
        tris.forEach(([a, b, c]) => capFaces.push(side > 0 ? [base + a, base + b, base + c] : [base + a, base + c, base + b]));
      });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx.concat(capFaces.flat()));
    g.computeVertexNormals();
    return g;
  }

  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, bumpMap: bumpTex, bumpScale: 1.1, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const cake = new THREE.Group();
  scene.add(cake);

  const pieces = [];
  for (let k = 0; k < cuts.length - 1; k++) {
    const m = new THREE.Mesh(wedge(k, k + 1), leafMat);
    const mid = (cuts[k] + cuts[k + 1]) / 2;
    m.userData = { dir: new THREE.Vector3(Math.cos(mid), 0, Math.sin(mid)), spin: (k % 2 ? 1 : -1) * (0.25 + 0.1 * k), lift: 0.06 * ((k * 7) % 3) };
    cake.add(m); pieces.push(m);
  }
  // нейфей на шматку 1 (він потім летить до глядача)
  const hero = pieces[1];
  const ticket = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), new THREE.MeshStandardMaterial({ map: ticketTex, roughness: 0.85 }));
  const ta = (cuts[1] + cuts[2]) / 2, tr = 0.5;
  ticket.position.set(Math.cos(ta) * tr, H / 2 + 0.07 * (1 - tr * tr) + 0.006, Math.sin(ta) * tr);
  ticket.rotation.set(-Math.PI / 2, 0, -ta + Math.PI / 2);
  hero.add(ticket);

  // обгортка: верхня і нижня половини
  const paperMat = () => new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.75, side: THREE.DoubleSide, transparent: true });
  function shell(top) {
    const half = top ? profile.slice(0, N + 7) : profile.slice(N + 5);
    const saved = profile.splice(0, profile.length, ...half);
    const g = wedge(0, cuts.length - 1, 1.035, 96);
    profile.splice(0, profile.length, ...saved);
    return new THREE.Mesh(g, paperMat());
  }
  const wrapTop = shell(true), wrapBot = shell(false);
  cake.add(wrapTop, wrapBot);

  // листочки, що розлітаються
  const leafCount = isMobile ? 60 : 140;
  const leafGeo = new THREE.PlaneGeometry(0.07, 0.022);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ color: 0x5a3519, roughness: 0.9, side: THREE.DoubleSide }), leafCount);
  const leafData = Array.from({ length: leafCount }, () => ({
    a: rand() * Math.PI * 2, r: 0.3 + rand() * 0.6, y: (rand() - 0.5) * 0.15,
    out: 1.2 + rand() * 2.2, up: (rand() - 0.3) * 1.6, rot: [rand() * 6, rand() * 6, rand() * 6], spd: 0.5 + rand(),
  }));
  leaves.visible = false;
  cake.add(leaves);
  const dummy = new THREE.Object3D();
  const heroOffset = new THREE.Vector3(), invQ = new THREE.Quaternion();

  // м'яка тінь під блином
  const shadowC = document.createElement('canvas'); shadowC.width = shadowC.height = 256;
  const sg = shadowC.getContext('2d'); const grd = sg.createRadialGradient(128, 128, 10, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = grd; sg.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowC), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.95;
  scene.add(shadow);

  /* ---------- Розмір і камера ---------- */
  let lastW = 0, lastH = 0;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === lastW && h === lastH) return; // iOS шле resize при прокрутці адресного рядка
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = w < 700;
    camera.position.set(0, narrow ? 1.8 : 1.4, narrow ? 8.6 : 5.6);
    camera.lookAt(0, narrow ? -0.35 : 0, 0);
    baseX = narrow ? 0 : 1.15;
    camera.updateProjectionMatrix();
  }
  let baseX = 1.15;
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  resize();

  /* ---------- Анімація ---------- */
  // ?debug у адресі — замір часу кадру (для перевірки продуктивності)
  const DEBUG = location.search.includes('debug') ? (window.__tea = { js: [], gpu: [] }) : null;
  let p = target, visible = true, t0 = performance.now();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(section);

  // Якщо кадри довгі (слабкий пристрій) — зменшуємо роздільність, щоб не підлагувало
  let slow = 0, lastNow = 0, dpr = maxDpr;
  function adapt(now) {
    const dt = now - lastNow; lastNow = now;
    if (dt > 0 && dt < 200) slow = slow * 0.95 + (dt > 24 ? 1 : 0) * 0.05;
    if (slow > 0.5 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); lastW = 0; resize(); slow = 0; }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { lastNow = 0; return; }
    const tStart = performance.now();
    adapt(now);
    const time = (now - t0) / 1000;
    p = reduceMotion ? target : lerp(p, target, 0.09);

    const sOpen = seg(p, 0.1, 0.4);     // обгортка розлітається
    const sBreak = seg(p, 0.44, 0.7);   // блин розколюється
    const sHero = seg(p, 0.7, 0.95);    // шматок летить до глядача
    const sLeaves = clamp((p - 0.48) / 0.5);

    // увесь блин (на першому екрані — правіше й менший, щоб не заважати заголовку)
    const intro = 1 - seg(p, 0, 0.12);
    const narrowNow = canvas.clientWidth < 700;
    cake.position.x = baseX + (narrowNow ? 0 : intro * 0.35);
    cake.scale.setScalar(1 - intro * (narrowNow ? 0.12 : 0.18));
    shadow.position.x = cake.position.x;
    cake.rotation.y = p * 2.6 + (reduceMotion ? 0 : time * 0.12);
    cake.rotation.x = lerp(0.18, 0.85, seg(p, 0.08, 0.42)) - sHero * 0.25;
    cake.position.y += ((reduceMotion ? 0 : Math.sin(time * 1.1) * 0.04) + (canvas.clientWidth < 700 ? 0.55 : 0) - cake.position.y) * 0.1;
    shadow.material.opacity = 1 - sBreak * 0.6;

    // обгортка
    wrapTop.position.set(sOpen * 0.4, sOpen * 1.9, -sOpen * 0.3);
    wrapTop.rotation.set(-sOpen * 0.9, sOpen * 0.5, sOpen * 1.1);
    wrapTop.material.opacity = 1 - clamp(sOpen * 1.3);
    wrapBot.position.set(-sOpen * 0.3, -sOpen * 1.5, sOpen * 0.2);
    wrapBot.rotation.set(sOpen * 0.7, 0, -sOpen * 0.6);
    wrapBot.material.opacity = 1 - clamp(sOpen * 1.5);
    wrapTop.visible = wrapTop.material.opacity > 0.01;
    wrapBot.visible = wrapBot.material.opacity > 0.01;
    wrapTop.material.depthWrite = wrapTop.material.opacity > 0.98;
    wrapBot.material.depthWrite = wrapBot.material.opacity > 0.98;

    // шматки
    pieces.forEach((m, i) => {
      const d = m.userData;
      const out = sBreak * (0.28 + (i % 3) * 0.08);
      m.position.set(d.dir.x * out, sBreak * d.lift, d.dir.z * out);
      m.rotation.set(sBreak * 0.18 * d.spin, 0, sBreak * 0.12 * -d.spin);
      if (m === hero) {
        // летить до глядача: зсув задаємо у світових координатах
        heroOffset.set(narrowNow ? 0 : -0.55, 0.55, 1.5).applyQuaternion(invQ.copy(cake.quaternion).invert()).multiplyScalar(sHero);
        m.position.add(heroOffset);
        m.rotation.x += sHero * 0.6;
      }
    });

    // листочки
    leaves.visible = sLeaves > 0.01;
    if (leaves.visible) {
      leafData.forEach((l, i) => {
        const k = sLeaves * l.out;
        dummy.position.set(Math.cos(l.a) * (l.r + k), l.y + sLeaves * l.up + Math.sin(time * l.spd + i) * 0.03 * sLeaves, Math.sin(l.a) * (l.r + k));
        dummy.rotation.set(l.rot[0] + time * 0.3 * l.spd, l.rot[1] + sLeaves * 3, l.rot[2]);
        const s = clamp(sLeaves * 3) * (1 - clamp((sLeaves - 0.85) * 6) * 0.6);
        dummy.scale.setScalar(Math.max(0.001, s));
        dummy.updateMatrix();
        leaves.setMatrixAt(i, dummy.matrix);
      });
      leaves.instanceMatrix.needsUpdate = true;
    }

    if (DEBUG) { const t1 = performance.now(); DEBUG.js.push(t1 - tStart); renderer.render(scene, camera); renderer.getContext().finish(); DEBUG.gpu.push(performance.now() - t1); }
    else renderer.render(scene, camera);
  }
  // шейдери компілюємо заздалегідь — без ривка на першому кадрі
  renderer.compile(scene, camera);
  requestAnimationFrame(frame);
  requestAnimationFrame(() => document.documentElement.classList.add('has-webgl'));
}
}

if (document.readyState === 'complete') schedule(); else addEventListener('load', schedule, { once: true });
function schedule() {
  if ('requestIdleCallback' in window) requestIdleCallback(start3D, { timeout: 600 }); else setTimeout(start3D, 60);
}
