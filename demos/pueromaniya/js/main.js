/* Pueromaniya — інтерфейс: шапка, фільтри каталогу, копіювання назви для Direct */
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
    current = p; opener = from || null;
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
  sheet?.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });   // клік по тлу
  sheet?.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(); });     // Esc

  // «Замовити в Direct»: копіюємо назву, щоб її легко вставити в повідомлення
  sheet?.querySelector('[data-sheet-ask]').addEventListener('click', () => {
    if (!current) return;
    const text = `Вітаю! Цікавить: ${current.name}`;
    navigator.clipboard?.writeText(text).then(() => show('Назву скопійовано — встав її в повідомлення в Direct')).catch(() => {});
  });

  // Пряме посилання на товар: сторінка#id відкриває опис
  const openFromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && (window.PRODUCTS || {})[id] && !sheet.open) openProduct(id);
  };
  setTimeout(openFromHash, 300);
  addEventListener('hashchange', openFromHash);
})();
