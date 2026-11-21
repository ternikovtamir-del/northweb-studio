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

  // «Запитати в Direct»: копіюємо назву, щоб її легко вставити в повідомлення
  const toast = document.querySelector('[data-toast]');
  let tid;
  const show = (msg) => { toast.textContent = msg; toast.classList.add('is-on'); clearTimeout(tid); tid = setTimeout(() => toast.classList.remove('is-on'), 3200); };
  document.querySelectorAll('[data-ask]').forEach((a) => {
    a.addEventListener('click', () => {
      const text = `Вітаю! Цікавить: ${a.dataset.ask}`;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => show('Назву скопійовано — встав її в повідомлення в Direct')).catch(() => {});
      }
    });
  });
})();
