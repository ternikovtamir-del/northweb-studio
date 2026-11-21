/* =============================================================
   Pueromaniya — 3D-блин пуеру з реальних фото.
   Повільно обертається, як монета: лицевий бік з печаткою → зворот зі
   складками паперу. Натисни (і тримай) — блин розкручується, відпусти —
   плавно сповільнюється.
   ============================================================= */
import * as THREE from '../vendor/three.module.min.js';

const canvas = document.querySelector('[data-tea3d]');
const hint = document.querySelector('[data-spin-hint]');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEBUG = location.search.includes('debug') ? (window.__tea = { js: [], speed: [] }) : null;
const lerp = (a, b, t) => a + (b - a) * t;

async function start3D() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    return;
  }
  const isMobile = matchMedia('(max-width: 700px)').matches;
  const maxDpr = Math.min(devicePixelRatio, isMobile ? 1.5 : 1.75);
  renderer.setPixelRatio(maxDpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

  /* Світло: теплий ключовий, зелений неон зліва (як вивіска PUEROMANIYA), тепле заповнення */
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x2a1d14, 1.25));
  const key = new THREE.DirectionalLight(0xfff0dc, 1.6); key.position.set(2.5, 3, 5); scene.add(key);
  const neon = new THREE.PointLight(0x39ff6a, 5, 8, 2); neon.position.set(-2.8, 0.9, -0.6); scene.add(neon);
  const warm = new THREE.PointLight(0xff8a3d, 5, 8, 2); warm.position.set(2.4, -1.4, 1.5); scene.add(warm);

  /* Текстури з фото */
  const loader = new THREE.TextureLoader();
  const load = (src) => new Promise((res, rej) => loader.load(src, res, undefined, rej));
  let front, back, side;
  try {
    [front, back, side] = await Promise.all([load('img/cake-front.webp?v=3'), load('img/cake-back.webp'), load('img/cake-side.webp')]);
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    return;
  }
  const aniso = renderer.capabilities.getMaxAnisotropy();
  [front, back, side].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, aniso); });
  side.wrapS = THREE.RepeatWrapping;

  /* Геометрія: лицевий бік (злегка опуклий), заокруглений борт, зворот */
  const R = 1, H = 0.17, EDGE = 0.07;
  const TEX_R = 500 / 1024;                    // радіус кола на текстурі
  const capR = R - EDGE;
  const dome = (r) => 0.035 * (1 - (r / R) ** 2);

  function cap(sign, flipU) {
    const rings = 24, segs = 96, pos = [], uv = [], idx = [];
    for (let i = 0; i <= rings; i++) {
      const r = (i / rings) * capR;
      const y = sign * (H / 2 + dome(r));
      for (let j = 0; j <= segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        pos.push(x, y, z);
        uv.push(0.5 + (flipU ? -x : x) * TEX_R, 0.5 - z * TEX_R);
      }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j, b = a + segs + 1;
      if (sign > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  function rim() {
    const steps = 16, segs = 128, pos = [], uv = [], idx = [];
    const topY = H / 2 + dome(capR);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, a = Math.PI / 2 - t * Math.PI;
      const r = capR + EDGE * Math.cos(a);
      const y = topY * Math.sin(a);
      for (let j = 0; j <= segs; j++) {
        const p = (j / segs) * Math.PI * 2;
        pos.push(Math.cos(p) * r, y, Math.sin(p) * r);
        uv.push(j / segs, t);
      }
    }
    for (let i = 0; i < steps; i++) for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j, b = a + segs + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  const mat = (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.88, metalness: 0, side: THREE.DoubleSide });
  const faceFront = new THREE.Mesh(cap(1, false), mat(front));
  const faceBack = new THREE.Mesh(cap(-1, true), mat(back));
  const edge = new THREE.Mesh(rim(), mat(side));
  const cake = new THREE.Group();
  cake.add(faceFront, faceBack, edge);
  cake.rotation.x = Math.PI / 2;               // блин «на ребро», лицем до глядача

  const spinner = new THREE.Group(); spinner.add(cake);   // обертання навколо вертикалі
  const holder = new THREE.Group(); holder.add(spinner);  // нахил і «плавання»
  scene.add(holder);

  /* М'яке сяйво позаду */
  const glowC = document.createElement('canvas'); glowC.width = glowC.height = 256;
  const gg = glowC.getContext('2d'); const grd = gg.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,170,90,.32)'); grd.addColorStop(0.5, 'rgba(195,49,31,.12)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  gg.fillStyle = grd; gg.fillRect(0, 0, 256, 256);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowC), transparent: true, depthWrite: false }));
  glow.position.z = -1.2; holder.add(glow);

  /* Розмір / камера: розмір і місце блину рахуємо в пікселях екрана */
  let lastW = 0, lastH = 0, baseX = 0, baseY = 0;
  const TAN = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || (w === lastW && h === lastH)) return;   // iOS шле resize при прокрутці адресного рядка
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = w < 700;
    let rPx, cx, cy;
    if (narrow) { rPx = Math.min(w * 0.41, 175); cx = w / 2; cy = 64 + 30 + rPx; }
    else { rPx = Math.min(h * 0.33, w * 0.19); cx = w * 0.75; cy = h * 0.53; }
    camera.position.set(0, 0, h / (2 * TAN * rPx));           // 1 одиниця = rPx пікселів
    camera.lookAt(0, 0, 0);
    baseX = (cx - w / 2) / rPx;
    baseY = (h / 2 - cy) / rPx;
    camera.updateProjectionMatrix();
    if (hint) hint.style.top = narrow ? `${Math.round(cy + rPx + 16)}px` : '';
  }
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  resize();

  /* Натискання: розкручуємо, поки тримаєш; відпустив — сповільнюється */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const BASE = reduceMotion ? 0.15 : 0.45;     // рад/с у спокої
  const FAST = 11;                             // рад/с, коли тримаєш
  let speed = BASE, holding = false, angle = 0;
  const hit = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects([faceFront, faceBack, edge], false).length > 0;
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (!hit(e)) return;
    holding = true;
    speed += 4;                                // відчутний поштовх навіть від короткого тапу
    hint?.classList.add('is-used');
  });
  const release = () => { holding = false; };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', release);
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    canvas.style.cursor = hit(e) ? 'pointer' : '';
  });

  /* Адаптивна якість для слабких пристроїв */
  let slow = 0, lastNow = 0, dpr = maxDpr;
  function adapt(now) {
    const dt = now - lastNow; lastNow = now;
    if (dt > 0 && dt < 200) slow = slow * 0.95 + (dt > 24 ? 1 : 0) * 0.05;
    if (slow > 0.5 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); lastW = 0; resize(); slow = 0; }
  }

  let visible = true, prev = performance.now();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { lastNow = 0; prev = now; return; }
    const t0 = performance.now();
    adapt(now);
    const dt = Math.min(0.05, Math.max(0, (now - prev) / 1000)); prev = now;
    const time = now / 1000;

    // швидко набирає оберти, повільно гасне
    const target = holding ? FAST : BASE;
    speed = lerp(speed, target, 1 - Math.pow(holding ? 0.12 : 0.55, dt));
    angle += speed * dt;
    spinner.rotation.y = angle;

    const sway = reduceMotion ? 0 : 1;
    holder.position.set(baseX, baseY + Math.sin(time * 1.2) * 0.05 * sway, 0);
    holder.rotation.set(-0.12 + Math.sin(time * 0.7) * 0.03 * sway, 0, 0.08);
    glow.material.opacity = 0.8 + Math.min(1, speed / FAST) * 0.6;

    if (DEBUG) { DEBUG.js.push(performance.now() - t0); DEBUG.speed.push(+speed.toFixed(2)); }
    renderer.render(scene, camera);
  }
  renderer.compile(scene, camera);
  requestAnimationFrame(frame);
  requestAnimationFrame(() => document.documentElement.classList.add('has-webgl'));
}

function schedule() {
  if ('requestIdleCallback' in window) requestIdleCallback(start3D, { timeout: 600 }); else setTimeout(start3D, 60);
}
if (document.readyState === 'complete') schedule(); else addEventListener('load', schedule, { once: true });
