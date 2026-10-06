/* ════════════════════════════════════════════════════════════════
   VEILLE IA × LYNXTER — comportements v2
   - Infobulles des graphes ([data-tip]) : survol, clavier, toucher
   - Comparateur : filtres par éditeur / modèles en service, tri des colonnes
   Les libellés viennent de données : insertion par textContent ou
   par HTML déjà échappé au build (charts.js), jamais de saisie libre.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ─── Infobulles des graphes ────────────────────────────
  var tip = document.createElement('div');
  tip.className = 'viz-tip';
  tip.setAttribute('role', 'status');
  document.body.appendChild(tip);
  function show(el, x, y) {
    tip.innerHTML = el.getAttribute('data-tip'); // HTML échappé au build (charts.js)
    tip.classList.add('on');
    var r = tip.getBoundingClientRect();
    var left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x + 14));
    var top = y - r.height - 12 < 8 ? y + 16 : y - r.height - 12;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function hide() { tip.classList.remove('on'); }
  document.addEventListener('pointerover', function (e) {
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (el) show(el, e.clientX, e.clientY);
  });
  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (el) show(el, e.clientX, e.clientY); else hide();
  });
  document.addEventListener('focusin', function (e) {
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (!el) return;
    var r = el.getBoundingClientRect();
    show(el, r.left + r.width / 2, r.top);
  });
  document.addEventListener('focusout', hide);
  window.addEventListener('scroll', function () {
    var a = document.activeElement;
    var el = a && a.closest && a.closest('[data-tip]');
    if (el) { var r = el.getBoundingClientRect(); show(el, r.left + r.width / 2, r.top); } else hide();
  }, { passive: true });

  // ─── Comparateur : filtres + tri ───────────────────────
  var table = document.querySelector('[data-cmp-table]');
  if (!table) return;
  var rows = Array.prototype.slice.call(table.tBodies[0].rows);
  var actorBtns = Array.prototype.slice.call(document.querySelectorAll('[data-cmp-actor]'));
  var liveOnly = document.querySelector('[data-cmp-live]');
  var state = { actor: 'all', live: liveOnly ? liveOnly.checked : false };
  function apply() {
    rows.forEach(function (tr) {
      var okA = state.actor === 'all' || tr.getAttribute('data-actor') === state.actor;
      var okL = !state.live || tr.getAttribute('data-live') === '1';
      tr.hidden = !(okA && okL);
    });
  }
  actorBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.actor = b.getAttribute('data-cmp-actor');
      actorBtns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      apply();
    });
  });
  if (liveOnly) liveOnly.addEventListener('change', function () { state.live = liveOnly.checked; apply(); });
  Array.prototype.slice.call(table.tHead.rows[0].cells).forEach(function (th, i) {
    th.tabIndex = 0;
    function sort() {
      var dir = th.getAttribute('aria-sort') === 'descending' ? 'ascending' : 'descending';
      Array.prototype.forEach.call(table.tHead.rows[0].cells, function (c) { c.removeAttribute('aria-sort'); });
      th.setAttribute('aria-sort', dir);
      var k = dir === 'ascending' ? 1 : -1;
      rows.sort(function (a, b) {
        var va = a.cells[i].getAttribute('data-v'), vb = b.cells[i].getAttribute('data-v');
        var na = parseFloat(va), nb = parseFloat(vb);
        if (va === '' && vb !== '') return 1;
        if (vb === '' && va !== '') return -1;
        if (!isNaN(na) && !isNaN(nb)) return (na - nb) * k;
        return String(va).localeCompare(String(vb), 'fr') * k;
      });
      rows.forEach(function (tr) { table.tBodies[0].appendChild(tr); });
    }
    th.addEventListener('click', sort);
    th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sort(); } });
  });
  apply();
})();
