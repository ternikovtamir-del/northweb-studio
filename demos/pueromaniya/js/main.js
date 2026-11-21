/* Pueromaniya — інтерфейс: шапка, фільтри, опис товару, кошик і форма замовлення */
(() => {
  // Шапка: світла, коли закінчилась темна 3D-сцена
  const header = document.querySelector('[data-header]');
  const scrolly = document.querySelector('[data-scrolly]');
  const darkSections = [...document.querySelectorAll('.scrolly, .energy, .order, .insta')];
  const onScroll = () => {
    const y = header.getBoundingClientRect().bottom;
    const overDark = darkSections.some((s) => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
    header.classList.toggle('is-light', !overDark);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Фільтри каталогу
  const filters = document.querySelector('[data-filters]');
  const cards = [...document.querySelectorAll('[data-grid] .card')];
  filters?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    filters.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
    const f = btn.dataset.filter;
    cards.forEach((c) => { c.hidden = f !== 'all' && c.dataset.cat !== f; });
  });

  // Тост
  const toast = document.querySelector('[data-toast]');
  let tid;
  const show = (msg) => { toast.textContent = msg; toast.classList.add('is-on'); clearTimeout(tid); tid = setTimeout(() => toast.classList.remove('is-on'), 3200); };

  // Опис товару: вікно (на телефоні — шторка знизу)
  const sheet = document.querySelector('[data-sheet]');
  const $ = (sel) => sheet.querySelector(sel);
  let current = null, opener = null;
  function openProduct(id, from) {
    const p = (window.PRODUCTS || {})[id];
    if (!p || !sheet) return;
    current = { ...p, id }; opener = from || null;
    $('[data-sheet-img]').src = p.img;
    $('[data-sheet-img]').alt = p.name;
    $('[data-sheet-type]').textContent = p.type;
    $('[data-sheet-name]').textContent = p.name;
    $('[data-sheet-origin]').textContent = p.origin;
    $('[data-sheet-about]').textContent = p.about;
    const list = $('[data-sheet-props]'); list.replaceChildren(...p.props.map((t) => { const li = document.createElement('li'); li.textContent = t; return li; }));
    const isTea = p.type !== 'Посуд';
    $('[data-sheet-brew-h]').textContent = isTea ? 'Як заварювати' : 'Порада';
    $('[data-sheet-brew]').textContent = p.brew;
    sheet.querySelector('.sheet-inner').scrollTop = 0;
    if (typeof sheet.showModal === 'function') sheet.showModal(); else sheet.setAttribute('open', '');
    document.body.classList.add('sheet-open');
    history.replaceState(null, '', '#' + id);
  }
  function closeSheet() {
    if (!sheet.open) return;
    sheet.classList.add('is-closing');
    setTimeout(() => {
      sheet.classList.remove('is-closing');
      if (typeof sheet.close === 'function') sheet.close(); else sheet.removeAttribute('open');
    }, 220);
  }
  sheet?.addEventListener('close', () => {
    document.body.classList.remove('sheet-open');
    history.replaceState(null, '', location.pathname + location.search);
    opener?.focus({ preventScroll: true });
  });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open]');
    if (btn) { e.preventDefault(); openProduct(btn.dataset.open, btn); }
  });
  sheet?.querySelector('[data-sheet-close]').addEventListener('click', closeSheet);
  sheet?.querySelector('[data-sheet-add]')?.addEventListener('click', () => {
    if (!current) return;
    window.__cartAdd?.(current.id);
    closeSheet();
  });
  sheet?.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });   // клік по тлу
  sheet?.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(); });     // Esc

  // Пряме посилання на товар: сторінка#id відкриває опис
  const openFromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && (window.PRODUCTS || {})[id] && !sheet.open) openProduct(id);
  };
  setTimeout(openFromHash, 300);
  addEventListener('hashchange', openFromHash);

  /* ================= Кошик ================= */
  // Куди приходять замовлення (FormSubmit)
  const ORDER_EMAIL = 'maksmaksimuk41@gmail.com';
  const ENDPOINT = 'https://formsubmit.co/ajax/' + ORDER_EMAIL;
  const KEY = 'pueromaniya-cart';
  const P = window.PRODUCTS || {};

  let cart = {};
  try { cart = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { cart = {}; }
  for (const id of Object.keys(cart)) if (!P[id] || !(cart[id] > 0)) delete cart[id];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {} };
  const total = () => Object.values(cart).reduce((a, b) => a + b, 0);

  const cartEl = document.querySelector('[data-cart]');
  const c$ = (sel) => cartEl.querySelector(sel);
  const listEl = c$('[data-cart-list]');
  const form = c$('[data-cart-form]');
  const done = c$('[data-cart-done]');
  const errEl = c$('[data-form-error]');

  // Кнопка «+» на кожному товарі
  document.querySelectorAll('.card, .ware').forEach((li) => {
    const id = li.querySelector('[data-open]')?.dataset.open;
    if (!id || !P[id]) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'add-btn'; b.dataset.add = id;
    b.setAttribute('aria-label', `Додати в кошик: ${P[id].name}`);
    b.innerHTML = '<span class="add-plus" aria-hidden="true">+</span><span class="add-n" aria-hidden="true"></span>';
    li.querySelector('.card-photo').after(b);
  });
  const addBtns = [...document.querySelectorAll('[data-add]')];

  function render() {
    const n = total();
    document.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = n; el.hidden = n === 0; });
    document.querySelectorAll('.cart-btn').forEach((el) => el.setAttribute('aria-label', `Кошик, товарів: ${n}`));
    addBtns.forEach((b) => {
      const q = cart[b.dataset.add] || 0;
      b.classList.toggle('is-in', q > 0);
      b.querySelector('.add-n').textContent = q > 0 ? q : '';
    });
    const ids = Object.keys(cart);
    c$('[data-cart-empty]').hidden = ids.length > 0;
    form.hidden = ids.length === 0 || !done.hidden;
    listEl.replaceChildren(...ids.map((id) => {
      const p = P[id];
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML = `<img src="${p.img}" alt="" width="56" height="70" loading="lazy">
        <div class="ci-text"><p class="card-type"></p><p class="ci-name"></p></div>
        <div class="qty" role="group">
          <button type="button" data-dec="${id}" aria-label="Менше">−</button>
          <output>${cart[id]}</output>
          <button type="button" data-inc="${id}" aria-label="Більше">+</button>
        </div>
        <button type="button" class="ci-del" data-del="${id}" aria-label="Прибрати">×</button>`;
      li.querySelector('.card-type').textContent = p.type;
      li.querySelector('.ci-name').textContent = p.name;
      li.querySelector('.qty').setAttribute('aria-label', `Кількість: ${p.name}`);
      return li;
    }));
  }

  function add(id) {
    if (!P[id]) return;
    cart[id] = (cart[id] || 0) + 1;
    save(); render();
    const badge = document.querySelector('.cart-btn');
    badge?.classList.remove('bump'); void badge?.offsetWidth; badge?.classList.add('bump');
    show(`«${P[id].name}» у кошику · ${total()} шт.`);
  }
  window.__cartAdd = add;

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-add]');
    if (a) { e.preventDefault(); add(a.dataset.add); return; }
    if (e.target.closest('[data-cart-open]')) { e.preventDefault(); openCart(); }
  });
  listEl.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    const { inc, dec, del } = t.dataset;
    if (inc) cart[inc]++;
    if (dec) { cart[dec]--; if (cart[dec] <= 0) delete cart[dec]; }
    if (del) delete cart[del];
    save(); render();
  });

  function openCart() {
    if (!done.hidden && total() > 0) { done.hidden = true; }
    render();
    if (typeof cartEl.showModal === 'function') cartEl.showModal(); else cartEl.setAttribute('open', '');
    document.body.classList.add('sheet-open');
  }
  function closeCart() {
    if (!cartEl.open) return;
    cartEl.classList.add('is-closing');
    setTimeout(() => { cartEl.classList.remove('is-closing'); if (typeof cartEl.close === 'function') cartEl.close(); else cartEl.removeAttribute('open'); }, 220);
  }
  cartEl.addEventListener('close', () => {
    document.body.classList.remove('sheet-open');
    if (!done.hidden) { done.hidden = true; render(); }
  });
  cartEl.querySelectorAll('[data-cart-close]').forEach((b) => b.addEventListener('click', closeCart));
  cartEl.addEventListener('click', (e) => { if (e.target === cartEl) closeCart(); });
  cartEl.addEventListener('cancel', (e) => { e.preventDefault(); closeCart(); });

  // Спосіб зв'язку: підказка в полі
  const handle = form.querySelector('[data-handle]');
  const handleLabel = form.querySelector('[data-handle-label]');
  const VIA = {
    Telegram: ['Твій Telegram', '@нікнейм', 'text'],
    Instagram: ['Твій Instagram', '@нікнейм', 'text'],
    'Телефон': ['Номер телефону', '+380 …', 'tel'],
  };
  form.addEventListener('change', (e) => {
    if (e.target.name !== 'via') return;
    const [l, ph, type] = VIA[e.target.value];
    handleLabel.textContent = l; handle.placeholder = ph; handle.type = type;
    handle.autocomplete = type === 'tel' ? 'tel' : 'off';
  });

  const fail = (msg, field) => { errEl.textContent = msg; errEl.hidden = false; field?.focus(); };
  form.addEventListener('input', () => { errEl.hidden = true; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.hidden = true;
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim();
    const via = String(fd.get('via') || 'Telegram');
    const contact = String(fd.get('handle') || '').trim();
    const comment = String(fd.get('comment') || '').trim();
    if (total() === 0) return fail('Кошик порожній.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Вкажи правильний email.', form.email);
    if (via === 'Телефон' ? contact.replace(/\D/g, '').length < 9 : contact.replace(/^@/, '').length < 2)
      return fail(via === 'Телефон' ? 'Вкажи номер телефону.' : `Вкажи свій ${via}.`, handle);
    if (fd.get('_honey')) return;   // бот

    const items = Object.entries(cart).map(([id, q]) => `${P[id].name} (${P[id].type}) — ${q} шт.`);
    const contactLine = via === 'Телефон' ? `Телефон: ${contact}` : `${via}: ${contact.startsWith('@') ? contact : '@' + contact}`;
    const payload = {
      _subject: `Нове замовлення з сайту — від ${email}`,
      _template: 'table',
      _replyto: email,
      _captcha: 'false',
      'Від кого': email,
      'Готовий зв’язатися через': contactLine,
    };
    items.forEach((t, i) => { payload[`Хоче — товар ${i + 1}`] = t; });
    payload['Коментар'] = comment || '—';

    const btn = form.querySelector('[data-cart-submit]');
    btn.disabled = true; btn.textContent = 'Надсилаємо…';
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || String(data.success) !== 'true') throw new Error(data.message || 'send failed');
      cart = {}; save();
      form.reset(); form.dispatchEvent(new Event('change'));
      handleLabel.textContent = VIA.Telegram[0]; handle.placeholder = VIA.Telegram[1]; handle.type = 'text';
      done.querySelector('[data-done-text]').textContent = `Ми зв’яжемося з тобою через ${via === 'Телефон' ? 'телефон' : via} найближчим часом.`;
      done.hidden = false;
      render();
      cartEl.querySelector('.cart-scroll').scrollTop = 0;
    } catch (err) {
      fail('Не вдалося надіслати замовлення. Спробуй ще раз або напиши нам у Direct.');
    } finally {
      btn.disabled = false; btn.textContent = 'Надіслати замовлення';
    }
  });

  render();
})();
