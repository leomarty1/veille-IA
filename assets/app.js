/* ════════════════════════════════════════════════════════════════
   VEILLE IA × LYNXTER — comportements front
   - Dark mode toggle (persisted)
   - Scroll-reveal sur sections .reveal
   - Reading progress bar (briefs)
   - Search + filters (archive)
   ════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Dark mode toggle ──────────────────────────────────
  const themeBtn = document.querySelector('[data-theme-toggle]');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      try { localStorage.setItem('veille-ia-theme', isDark ? 'dark' : 'light'); } catch (e) {}
    });
  }

  // ─── Scroll-reveal ─────────────────────────────────────
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  // ─── Reading progress (briefs) ─────────────────────────
  const progress = document.querySelector('.read-progress');
  if (progress) {
    const update = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? Math.min(100, (scrolled / max) * 100) : 0;
      progress.style.width = pct + '%';
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // ─── Archive search + filters ──────────────────────────
  const archive = document.querySelector('[data-archive]');
  if (archive) {
    const searchInput = archive.querySelector('[data-search]');
    const entries = Array.from(archive.querySelectorAll('.archive-entry'));
    const emptyState = archive.querySelector('.archive-empty');
    const filterBtns = Array.from(archive.querySelectorAll('[data-filter]'));
    const sortBtns = Array.from(archive.querySelectorAll('[data-sort]'));
    const list = archive.querySelector('.archive-list');

    const state = { q: '', actor: 'all', tag: 'all', sort: 'date-desc' };

    function normalize(str) {
      return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    function applyFilters() {
      let visible = entries.slice();

      if (state.q) {
        const q = normalize(state.q);
        visible = visible.filter((el) => normalize(el.textContent).includes(q));
      }
      if (state.actor !== 'all') {
        visible = visible.filter((el) => {
          const actors = (el.dataset.actors || '').split(',');
          return actors.includes(state.actor);
        });
      }
      if (state.tag !== 'all') {
        visible = visible.filter((el) => {
          const tags = (el.dataset.tags || '').split(',');
          return tags.includes(state.tag);
        });
      }

      const sortFn = {
        'date-desc': (a, b) => b.dataset.date.localeCompare(a.dataset.date),
        'date-asc':  (a, b) => a.dataset.date.localeCompare(b.dataset.date),
        'items-desc': (a, b) => parseInt(b.dataset.items) - parseInt(a.dataset.items),
        'items-asc':  (a, b) => parseInt(a.dataset.items) - parseInt(b.dataset.items),
      }[state.sort];
      visible.sort(sortFn);

      entries.forEach((el) => { el.style.display = 'none'; });
      visible.forEach((el, i) => {
        el.style.display = '';
        el.style.order = i;
      });

      if (emptyState) emptyState.style.display = visible.length ? 'none' : '';
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.q = e.target.value;
        applyFilters();
      });
    }

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const group = btn.dataset.group;
        const value = btn.dataset.filter;
        archive.querySelectorAll(`[data-group="${group}"]`).forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state[group] = value;
        applyFilters();
      });
    });

    sortBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        sortBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.sort = btn.dataset.sort;
        applyFilters();
      });
    });

    applyFilters();
  }
})();
