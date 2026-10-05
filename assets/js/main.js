/* =============================================================
   NORTH WEB — main.js
   Geen libraries nodig. Alles hieronder is vanilla JavaScript.
   ============================================================= */

/* -------------------------------------------------------------
   CONFIG — dit zijn de instellingen die je zelf aanpast
   ------------------------------------------------------------- */
const CONFIG = {
  // E-mailadres voor contact (pas ook aan in index.html, zoek op "infonorthwebstudio.nl@gmail.com")
  email: 'infonorthwebstudio.nl@gmail.com',

  // Adres waar het contactformulier naartoe verzendt.
  // Leeg laten = nog niet gekoppeld: het formulier verzendt dan NIETS en
  // biedt de bezoeker eerlijk aan om het bericht via e-mail te sturen.
  // Voorbeelden (zie README.md):
  //   'https://formspree.io/f/jouwcode'
  //   'https://api.web3forms.com/submit'
  //   '/contact.php'
  formEndpoint: 'https://formsubmit.co/ajax/infonorthwebstudio.nl@gmail.com',

  // Extra velden die de formulierdienst nodig heeft (bijv. Web3Forms access_key)
  formExtraFields: {
    // access_key: 'jouw-web3forms-sleutel',
    _subject: 'Nieuwe aanvraag via northwebstudio.nl',
    _template: 'table',
    _captcha: 'false',
  },
};

(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const isDesktop = () => window.innerWidth >= 900;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- Startanimatie ---------- */
  const markLoaded = () => requestAnimationFrame(() => root.classList.add('is-loaded'));
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 900))]).then(markLoaded);

  /* ---------- Jaartal in footer ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- E-mailadres uit CONFIG ---------- */
  document.querySelectorAll('[data-email-link]').forEach((el) => {
    el.href = `mailto:${CONFIG.email}`;
    el.textContent = CONFIG.email;
  });

  /* ---------- Header: achtergrond bij scrollen, verbergen bij omlaag scrollen ---------- */
  const header = document.querySelector('[data-header]');
  let lastY = window.scrollY;
  const onScrollHeader = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    const goingDown = y > lastY && y > window.innerHeight * 0.6;
    if (!body.classList.contains('menu-open')) header.classList.toggle('is-hidden', goingDown);
    lastY = y;
  };

  /* ---------- Mobiel menu ---------- */
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-mobile-menu]');
  const label = toggle.querySelector('.menu-toggle-label');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Sluiten' : 'Menu';
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('menu-open')));
      body.style.overflow = 'hidden';
      header.classList.remove('is-hidden');
    } else {
      body.classList.remove('menu-open');
      body.style.overflow = '';
      const done = () => { if (!body.classList.contains('menu-open')) menu.hidden = true; };
      reduceMotion.matches ? done() : setTimeout(done, 700);
    }
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && body.classList.contains('menu-open')) setMenu(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 860 && body.classList.contains('menu-open')) setMenu(false); });

  /* ---------- Actieve link in navigatie ---------- */
  const navLinks = [...document.querySelectorAll('[data-nav]')];
  const navTargets = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const navObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navTargets.forEach((t) => navObs.observe(t));
  }

  /* ---------- Reveal-animaties ---------- */
  const revealEls = document.querySelectorAll('[data-reveal], [data-reveal-lines], [data-reveal-image]');
  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    revealEls.forEach((el) => el.classList.add('is-in'));
  } else {
    const revealObs = new IntersectionObserver((entries) => {
      const batch = entries.filter((e) => e.isIntersecting);
      batch.forEach((entry, i) => {
        const el = entry.target;
        if (el.hasAttribute('data-reveal')) el.style.transitionDelay = `${Math.min(i, 5) * 70}ms`;
        el.classList.add('is-in');
        revealObs.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => revealObs.observe(el));
  }

  /* ---------- "Waarom"-statement: woorden lichten op tijdens scrollen ---------- */
  const statement = document.querySelector('[data-words]');
  let words = [];
  if (statement) {
    const wrap = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = part;
            frag.appendChild(span);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          wrap(child);
        }
      });
    };
    wrap(statement);
    words = [...statement.querySelectorAll('.word')];
  }
  const updateWords = () => {
    if (!words.length) return;
    const r = statement.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = clamp((vh * 0.88 - r.top) / (vh * 0.5 + r.height * 0.6), 0, 1);
    const lit = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
  };

  /* ---------- Werkwijze: actieve stap ---------- */
  const steps = [...document.querySelectorAll('[data-step]')];
  const counter = [...document.querySelectorAll('[data-process-counter] span')];
  const bar = document.querySelector('[data-process-bar]');
  const setStep = (index) => {
    steps.forEach((s, i) => s.classList.toggle('is-active', i === index));
    counter.forEach((c, i) => {
      c.classList.toggle('is-current', i === index);
      c.classList.toggle('is-past', i < index);
    });
    if (bar) bar.style.setProperty('--p', (index + 1) / steps.length);
  };
  if (steps.length) {
    setStep(0);
    if ('IntersectionObserver' in window) {
      const stepObs = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setStep(steps.indexOf(e.target)); });
      }, { rootMargin: '-48% 0px -48% 0px' });
      steps.forEach((s) => stepObs.observe(s));
    }
  }

  /* ---------- Lichte parallax (alleen desktop) ---------- */
  const parallaxEls = [...document.querySelectorAll('[data-parallax]')];
  const updateParallax = () => {
    const active = isDesktop() && !reduceMotion.matches;
    parallaxEls.forEach((el) => {
      if (!active) { el.style.translate = ''; return; }
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
      const offset = (r.top + r.height / 2 - window.innerHeight / 2) * parseFloat(el.dataset.parallax);
      el.style.translate = `0 ${offset.toFixed(1)}px`;
    });
  };

  /* ---------- Eén scroll-loop voor alles ---------- */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onScrollHeader();
      updateWords();
      updateParallax();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Cursor-label boven projecten ---------- */
  const cursor = document.querySelector('[data-cursor]');
  if (cursor && finePointer.matches) {
    let tx = -200, ty = -200, cx = -200, cy = -200, raf = null;
    const loop = () => {
      cx = lerp(cx, tx, 0.22); cy = lerp(cy, ty, 0.22);
      cursor.style.setProperty('--x', `${cx}px`);
      cursor.style.setProperty('--y', `${cy}px`);
      raf = Math.abs(cx - tx) + Math.abs(cy - ty) > 0.3 ? requestAnimationFrame(loop) : null;
    };
    document.querySelectorAll('[data-cursor-label]').forEach((el) => {
      el.addEventListener('mouseenter', (e) => {
        tx = cx = e.clientX; ty = cy = e.clientY;
        cursor.querySelector('span').textContent = el.dataset.cursorLabel;
        cursor.classList.add('is-visible');
        loop();
      });
      el.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; if (!raf) raf = requestAnimationFrame(loop); });
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
    });
  }

  /* ---------- Magnetische CTA-knop ---------- */
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    if (!finePointer.matches) return;
    const inner = el.firstElementChild;
    const zone = el.parentElement;
    zone.addEventListener('mousemove', (e) => {
      if (reduceMotion.matches) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      const reach = r.width * 1.4;
      if (dist < reach) {
        const f = 1 - dist / reach;
        el.style.translate = `${dx * 0.3 * f}px ${dy * 0.3 * f}px`;
        inner.style.translate = `${dx * 0.12 * f}px ${dy * 0.12 * f}px`;
      } else {
        el.style.translate = ''; inner.style.translate = '';
      }
    });
    zone.addEventListener('mouseleave', () => { el.style.translate = ''; inner.style.translate = ''; });
  });

  /* ---------- Projectdetail (dialog) ---------- */
  const openDialog = (id) => {
    const dlg = document.getElementById(id);
    if (!dlg) return;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    body.classList.add('dialog-open');
    if (cursor) cursor.classList.remove('is-visible');
  };
  document.querySelectorAll('[data-open-dialog]').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); openDialog(el.dataset.openDialog); });
  });
  document.querySelectorAll('dialog').forEach((dlg) => {
    const close = () => (typeof dlg.close === 'function' ? dlg.close() : dlg.removeAttribute('open'));
    dlg.querySelectorAll('[data-close-dialog]').forEach((b) => b.addEventListener('click', close));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
    dlg.addEventListener('close', () => body.classList.remove('dialog-open'));
  });
  if (location.hash.startsWith('#project-')) openDialog(location.hash.slice(1));

  /* ---------- Contactformulier ---------- */
  const form = document.querySelector('[data-contact-form]');
  if (form) {
    const status = form.querySelector('[data-form-status]');
    const submitBtn = form.querySelector('button[type="submit"]');
    const messages = {
      naam: 'Vul je naam in.',
      email: 'Vul een geldig e-mailadres in.',
      bericht: 'Vertel kort waar we mee kunnen helpen.',
    };

    const setError = (field, msg) => {
      const wrap = field.closest('.field');
      let err = wrap.querySelector('.field-error');
      if (msg) {
        wrap.classList.add('has-error');
        field.setAttribute('aria-invalid', 'true');
        if (!err) {
          err = document.createElement('p');
          err.className = 'field-error';
          err.id = `${field.id}-error`;
          wrap.appendChild(err);
          field.setAttribute('aria-describedby', err.id);
        }
        err.textContent = msg;
      } else {
        wrap.classList.remove('has-error');
        field.removeAttribute('aria-invalid');
        if (err) err.remove();
        field.removeAttribute('aria-describedby');
      }
    };

    const validate = () => {
      let firstInvalid = null;
      ['naam', 'email', 'bericht'].forEach((name) => {
        const field = form.elements[name];
        const ok = name === 'email'
          ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())
          : field.value.trim().length > 0;
        setError(field, ok ? '' : messages[name]);
        if (!ok && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) firstInvalid.focus();
      return !firstInvalid;
    };

    form.querySelectorAll('input, textarea').forEach((f) => {
      f.addEventListener('input', () => { if (f.closest('.field')?.classList.contains('has-error')) setError(f, ''); });
    });

    const buildMailto = () => {
      const d = new FormData(form);
      const subject = `Nieuw project — ${d.get('bedrijf') || d.get('naam')}`;
      const lines = [
        `Naam: ${d.get('naam')}`,
        `Bedrijf: ${d.get('bedrijf') || '-'}`,
        `E-mail: ${d.get('email')}`,
        `Telefoon: ${d.get('telefoon') || '-'}`,
        '',
        String(d.get('bericht')),
      ];
      return `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    };

    const showStatus = (html) => { status.innerHTML = html; };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showStatus('');
      if (form.elements.website.value) return; // spam-val ingevuld → negeren
      if (!validate()) return;

      // Nog geen backend gekoppeld: niets verzenden, eerlijk alternatief bieden.
      if (!CONFIG.formEndpoint) {
        showStatus(`Het formulier is nog niet gekoppeld, dus je bericht is <strong>niet</strong> verzonden. <a href="${buildMailto()}">Open je e-mail met dit bericht</a> of mail naar <a href="mailto:${CONFIG.email}">${CONFIG.email}</a>.`);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.querySelector('span').textContent = 'Bezig met verzenden…';
      try {
        const data = new FormData(form);
        data.delete('website');
        Object.entries(CONFIG.formExtraFields).forEach(([k, v]) => data.append(k, v));
        const res = await fetch(CONFIG.formEndpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Sommige diensten (zoals FormSubmit) geven 200 terug maar melden een fout in de JSON
        const json = await res.json().catch(() => ({}));
        if (json.success === false || json.success === 'false') throw new Error(json.message || 'Niet verzonden');
        form.reset();
        showStatus('Bedankt! Je bericht is verzonden. Je hoort zo snel mogelijk van ons.');
      } catch (err) {
        showStatus(`Er ging iets mis bij het verzenden. Probeer het later opnieuw of <a href="${buildMailto()}">stuur je bericht via e-mail</a>.`);
      } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = 'Versturen';
      }
    });
  }

  /* =============================================================
     HERO — kompasveld
     Een raster van naaldjes die naar het noorden wijzen (North Web).
     Op desktop draaien ze mee richting de cursor. Op mobiel beweegt
     het veld rustig vanzelf. Bij "minder beweging" staat het stil.
     ============================================================= */
  const canvas = document.querySelector('[data-hero-field]');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const INK = [20, 19, 18];
    const ACCENT = [210, 80, 42];
    let w = 0, h = 0, dpr = 1, cols = 0, rows = 0, gap = 36, needles = [];
    let pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, strength: 0, target: 0 };
    let running = false, visible = true, rafId = null, t0 = performance.now();

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gap = w < 600 ? 30 : w < 1100 ? 36 : 42;
      cols = Math.ceil(w / gap) + 1;
      rows = Math.ceil(h / gap) + 1;
      const ox = (w - (cols - 1) * gap) / 2;
      const oy = (h - (rows - 1) * gap) / 2;
      needles = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          needles.push({ x: ox + x * gap, y: oy + y * gap, a: -Math.PI / 2, s: 0 });
        }
      }
    };

    const draw = (time, staticFrame = false) => {
      ctx.clearRect(0, 0, w, h);
      const t = (time - t0) / 1000;
      const touch = !finePointer.matches;

      // Op touch-apparaten zweeft een onzichtbaar 'magneetpunt' rustig rond
      if (touch && !staticFrame) {
        pointer.tx = w * (0.62 + 0.25 * Math.sin(t * 0.23));
        pointer.ty = h * (0.38 + 0.22 * Math.sin(t * 0.31 + 1.3));
        pointer.target = 0.55;
      }
      pointer.x = lerp(pointer.x === -9999 ? pointer.tx : pointer.x, pointer.tx, 0.12);
      pointer.y = lerp(pointer.y === -9999 ? pointer.ty : pointer.y, pointer.ty, 0.12);
      pointer.strength = lerp(pointer.strength, pointer.target, 0.06);

      const radius = Math.max(220, Math.min(w, h) * 0.42);
      const len = gap * 0.3;
      ctx.lineCap = 'round';

      for (let i = 0; i < needles.length; i++) {
        const n = needles[i];
        const dx = pointer.x - n.x;
        const dy = pointer.y - n.y;
        const dist = Math.hypot(dx, dy);
        let influence = clamp(1 - dist / radius, 0, 1);
        influence = influence * influence * (3 - 2 * influence) * pointer.strength;

        const sway = staticFrame ? 0 : Math.sin(t * 0.6 + n.x * 0.006 + n.y * 0.009) * 0.14;
        const north = -Math.PI / 2 + sway;
        const toward = Math.atan2(dy, dx);
        let diff = toward - north;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const targetA = north + diff * influence;
        n.a = staticFrame ? targetA : n.a + (targetA - n.a) * 0.14;
        n.s = staticFrame ? influence : n.s + (influence - n.s) * 0.14;

        // Iets minder zichtbaar in de linkeronderhoek, waar de tekst staat
        const topFade = clamp((n.y - 70) / 70, 0, 1);
        const textFade = topFade * (1 - 0.55 * clamp((n.y / h - 0.35) / 0.5, 0, 1) * clamp(1 - n.x / (w * 0.8), 0, 1));
        const l = len * (1 + n.s * 0.9);
        const cos = Math.cos(n.a), sin = Math.sin(n.a);
        const r = Math.round(lerp(INK[0], ACCENT[0], n.s));
        const g = Math.round(lerp(INK[1], ACCENT[1], n.s));
        const b = Math.round(lerp(INK[2], ACCENT[2], n.s));
        const alpha = (0.16 + n.s * 0.7) * textFade;

        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx.lineWidth = 1 + n.s * 0.6;
        ctx.beginPath();
        ctx.moveTo(n.x - cos * l * 0.5, n.y - sin * l * 0.5);
        ctx.lineTo(n.x + cos * l * 0.5, n.y + sin * l * 0.5);
        ctx.stroke();

        // Puntje aan de 'noordkant' van de naald
        if (n.s > 0.05) {
          ctx.fillStyle = `rgba(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]},${(n.s * 0.9).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(n.x + cos * l * 0.5, n.y + sin * l * 0.5, 1.4 * n.s + 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const frame = (time) => {
      draw(time);
      rafId = running ? requestAnimationFrame(frame) : null;
    };
    const start = () => {
      if (reduceMotion.matches) { draw(performance.now(), true); return; }
      if (running || !visible || document.hidden) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    };
    const stop = () => { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; };

    build();
    start();
    if (reduceMotion.matches) draw(performance.now(), true);

    const hero = canvas.parentElement;
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = canvas.getBoundingClientRect();
      pointer.tx = e.clientX - r.left;
      pointer.ty = e.clientY - r.top;
      pointer.target = 1;
    });
    hero.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') pointer.target = 0; });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { build(); if (!running) draw(performance.now(), true); }, 150);
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        visible ? start() : stop();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    reduceMotion.addEventListener?.('change', () => { stop(); start(); });
  }
})();
