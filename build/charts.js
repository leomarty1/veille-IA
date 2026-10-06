/* ════════════════════════════════════════════════════════════════
   build/charts.js — graphes SVG statiques, générés au build (zéro
   dépendance, zéro CDN : s'affichent même si le réseau bloque D3).
   Couleurs par classes CSS (assets/v2.css) → clair/sombre sans JS.
   Chaque graphe a : infobulle au survol/clavier (data-tip, géré par
   assets/v2.js), libellés directs sélectifs, et un tableau « Voir les
   données » (la valeur n'est jamais réservée à l'infobulle).
   Règles dataviz : un seul axe, traits 2 px, points ≥ 8 px cerclés,
   grille en filet plein, couleur = identité de l'éditeur (fixe).
   ════════════════════════════════════════════════════════════════ */
'use strict';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (v, d = 1) => (v == null ? '—' : (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('fr-FR', { maximumFractionDigits: d }));
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const dateFr = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MOIS[m - 1]} ${y}`; };
const ACTOR_CLASS = { Anthropic: 'anthropic', OpenAI: 'openai', Google: 'google', 'Google DeepMind': 'google' };
const actorClass = (a) => ACTOR_CLASS[a] || 'other';

/** Graduations « propres » entre min et max. */
function ticks(min, max, n = 5) {
  const span = max - min || 1;
  const step0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => span / s <= n) || 10 * mag;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

function dataTable(caption, head, rows) {
  return `<details class="viz-data"><summary>Voir les données</summary>
<div class="cmp-table-wrap"><table class="cmp-table" style="min-width:0"><caption class="viz-note" style="caption-side:bottom;text-align:left;padding:8px 12px">${caption}</caption>
<thead><tr>${head.map((h, i) => `<th${i ? ' class="n"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="n"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
}

/**
 * Avant / après : une ligne par test, ancien modèle (gris) → nouveau (couleur de l'éditeur).
 * Rendu en HTML/CSS (et non en SVG) pour rester lisible sur mobile : le libellé passe au-dessus
 * de la piste sous 640 px. Axe commun 0–100 % (un seul axe) ; les scores non-% (points Elo…)
 * sont rendus en lignes de texte sous le graphe.
 * rows: [{ label, old, new, unit:'%', note? }]
 */
function dumbbell({ rows, oldName, newName, actor, id = 'db' }) {
  const pct = rows.filter((r) => r.unit === '%' && r.old != null && r.new != null);
  const other = rows.filter((r) => !(r.unit === '%' && r.old != null && r.new != null));
  const cls = actorClass(actor);
  let chart = '';
  if (pct.length) {
    const pos = (v) => `${Math.max(0, Math.min(100, v))}%`;
    const body = pct.map((r) => {
      const d = r.new - r.old;
      const lo = Math.min(r.old, r.new), hi = Math.max(r.old, r.new);
      const tipO = `<b>${esc(fmt(r.old))} %</b> · ${esc(oldName)}<br>${esc(r.label)}`;
      const tipN = `<b>${esc(fmt(r.new))} %</b> · ${esc(newName)}<br>${esc(r.label)} (${d >= 0 ? '+' : ''}${fmt(d)} pt)`;
            return `<div class="db-row">
    <div class="db-label">${esc(r.label)}</div>
    <div class="db-track">
      <span class="db-link" style="left:${pos(lo)};width:${hi - lo}%"></span>
      <span class="db-dot db-old" style="left:${pos(r.old)}" tabindex="0" data-tip="${esc(tipO)}" aria-label="${esc(oldName)} ${esc(fmt(r.old))} %"></span>
      <span class="db-dot db-new s-${cls}" style="left:${pos(r.new)}" tabindex="0" data-tip="${esc(tipN)}" aria-label="${esc(newName)} ${esc(fmt(r.new))} %"></span>
      <span class="db-val${d < 0 ? ' db-val-l' : ''}" style="left:${pos(r.new)}">${fmt(r.new)}</span>
    </div>
  </div>`;
    }).join('\n');
    chart = `<div class="db" role="img" aria-label="${esc(oldName)} comparé à ${esc(newName)} sur ${pct.length} test(s)">
  ${body}
  <div class="db-row db-axis"><div class="db-label"></div><div class="db-track">${[0, 25, 50, 75, 100].map((v) => `<span style="left:${v}%">${v}&nbsp;%</span>`).join('')}</div></div>
</div>
<ul class="viz-legend"><li><i class="dot" style="background:var(--s-old)"></i>${esc(oldName)} (avant)</li><li><i class="dot" style="background:${cls === 'other' ? 'var(--b2-ink-2)' : `var(--s-${cls})`}"></i>${esc(newName)}</li></ul>`;
  }
  const extra = other.length
    ? `<ul class="cmp-vs" style="margin-top:10px">${other.map((r) => `<li><span>${esc(r.label)}</span><span>${r.old != null ? esc(fmt(r.old)) + ' → ' : ''}<b>${esc(fmt(r.new))}</b>${r.unit && r.unit !== '%' ? ' ' + esc(r.unit) : ' %'}${r.note ? ` <span class="est">${esc(r.note)}</span>` : ''}</span></li>`).join('')}</ul>`
    : '';
  const table = dataTable(`Scores publiés par l'éditeur.`,
    ['Test', oldName, newName, 'Écart'],
    rows.map((r) => [esc(r.label), r.old != null ? fmt(r.old) : '—', fmt(r.new), r.old != null && r.new != null ? `${r.new - r.old >= 0 ? '+' : ''}${fmt(r.new - r.old)}` : '—']));
  return `<div class="viz" id="${esc(id)}">${chart}${extra}${table}</div>`;
}

/**
 * Courbes dans le temps, une série par éditeur (couleur fixe), en marches (le prix tient
 * jusqu'au modèle suivant). series: [{ name, actor, points:[{date, value, label}] }]
 */
function timeSteps({ series, yLabel, yMax, asOf, width = 960, height = 340, id = 'ts', unit = '$', note = '', markEvery = true }) {
  const L = 52, R = 150, T = 18, B = 34;
  const all = series.flatMap((s) => s.points);
  const t = (d) => Date.parse(d + 'T00:00:00Z');
  const tMin = Math.min(...all.map((p) => t(p.date)));
  const tMax = Math.max(asOf ? t(asOf) : 0, ...all.map((p) => t(p.date)));
  const vMax = yMax || Math.max(...all.map((p) => p.value)) * 1.1;
  const x = (d) => L + ((t(d) - tMin) / (tMax - tMin)) * (width - L - R);
  const xNow = L + ((tMax - tMin) / (tMax - tMin)) * (width - L - R);
  const y = (v) => T + (1 - Math.min(v, vMax) / vMax) * (height - T - B);
  const yt = ticks(0, vMax, 5);
  const grid = yt.map((v) => `<line class="grid" x1="${L}" x2="${width - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${unit === '$' ? '$' + fmt(v, 2) : fmt(v) + ' ' + unit}</text>`).join('');
  const y0 = new Date(tMin).getUTCFullYear(), y1 = new Date(tMax).getUTCFullYear();
  const xt = [];
  for (let yy = y0; yy <= y1; yy++) for (const m of [1, 7]) { const d = `${yy}-${String(m).padStart(2, '0')}-01`; if (t(d) >= tMin && t(d) <= tMax) xt.push(d); }
  const xgrid = xt.map((d) => `<line class="axis" x1="${x(d)}" x2="${x(d)}" y1="${height - B}" y2="${height - B + 5}"/><text x="${x(d)}" y="${height - B + 20}" text-anchor="middle">${d.slice(5, 7) === '01' ? d.slice(0, 4) : 'juil.'}</text>`).join('');
  const ends = [];
  const lines = series.map((s) => {
    const cls = actorClass(s.actor);
    const pts = [...s.points].sort((a, b) => t(a.date) - t(b.date));
    let dPath = '';
    pts.forEach((p, i) => {
      dPath += i === 0 ? `M${x(p.date)},${y(p.value)}` : `H${x(p.date)}V${y(p.value)}`;
    });
    dPath += `H${xNow}`;
    const marks = pts.map((p) => {
      const tip = `<b>${unit === '$' ? '$' + fmt(p.value, 2) : fmt(p.value) + ' ' + unit}</b> · ${esc(p.label)}<br>${dateFr(p.date)}${p.extra ? ' · ' + esc(p.extra) : ''}`;
      const clipped = p.value > vMax;
      return `<circle class="hit" cx="${x(p.date)}" cy="${y(p.value)}" r="12" tabindex="0" data-tip="${esc(tip)}" aria-label="${esc(tip.replace(/<[^>]+>/g, ' '))}"/><circle class="mk f-${cls}" cx="${x(p.date)}" cy="${y(p.value)}" r="${markEvery ? 4.5 : 0}"/>${clipped ? `<text x="${x(p.date) + 8}" y="${y(p.value) + 4}">↑ ${unit === '$' ? '$' + fmt(p.value, 0) : fmt(p.value)}</text>` : ''}`;
    }).join('');
    const last = pts[pts.length - 1];
    ends.push({ y: y(last.value), text: `${s.name} · ${unit === '$' ? '$' + fmt(last.value, 2) : fmt(last.value) + ' ' + unit}`, cls });
    return `<path class="ln c-${cls}" d="${dPath}"/>${marks}`;
  }).join('\n');
  // libellés de fin : écartés de 16 px min, reliés par un filet si déplacés
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 16) ends[i].ly = (ends[i - 1].ly || ends[i - 1].y) + 16;
  const endLabels = ends.map((e) => {
    const ly = e.ly || e.y;
    return `${ly !== e.y ? `<line class="axis" x1="${xNow + 2}" y1="${e.y}" x2="${xNow + 8}" y2="${ly}"/>` : ''}<text class="t-ink2" x="${xNow + 10}" y="${ly + 4}">${esc(e.text)}</text>`;
  }).join('');
  const svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}-t"><title id="${id}-t">${esc(yLabel)}</title>
${grid}<line class="axis" x1="${L}" x2="${width - R}" y1="${height - B}" y2="${height - B}"/>${xgrid}
${lines}${endLabels}</svg>`;
  const legend = `<ul class="viz-legend">${series.map((s) => `<li><i style="background:var(--s-${actorClass(s.actor)})"></i>${esc(s.name)}</li>`).join('')}</ul>`;
  const table = dataTable(note || esc(yLabel), ['Modèle', 'Sortie', yLabel],
    series.flatMap((s) => s.points.map((p) => [esc(p.label), dateFr(p.date), unit === '$' ? '$' + fmt(p.value, 2) : fmt(p.value) + ' ' + unit])));
  return `<div class="viz"><div class="viz-scroll">${svg}</div>${legend}${note ? `<p class="viz-note">${note}</p>` : ''}${table}</div>`;
}

/**
 * Meilleur score à date (« frontière ») : tous les scores officiels en points gris,
 * le record en marche colorée (forme « emphasis » : une série mise en avant).
 * points: [{ date, value, label, actor }]
 */
function frontier({ points, yLabel, width = 960, height = 320, id = 'fr', yMin = 0, note = '' }) {
  const L = 52, R = 24, T = 18, B = 34;
  const t = (d) => Date.parse(d + 'T00:00:00Z');
  const pts = [...points].sort((a, b) => t(a.date) - t(b.date));
  const tMin = t(pts[0].date) - 20 * 864e5, tMax = t(pts[pts.length - 1].date) + 40 * 864e5;
  const x = (d) => L + ((t(d) - tMin) / (tMax - tMin)) * (width - L - R);
  const y = (v) => T + (1 - (v - yMin) / (100 - yMin)) * (height - T - B);
  const grid = ticks(yMin, 100, 5).map((v) => `<line class="grid" x1="${L}" x2="${width - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v} %</text>`).join('');
  const xt = [];
  for (let yy = new Date(tMin).getUTCFullYear(); yy <= new Date(tMax).getUTCFullYear(); yy++) for (const m of [1, 7]) { const d = `${yy}-${String(m).padStart(2, '0')}-01`; if (t(d) >= tMin && t(d) <= tMax) xt.push(d); }
  const xgrid = xt.map((d) => `<text x="${x(d)}" y="${height - B + 20}" text-anchor="middle">${d.slice(5, 7) === '01' ? d.slice(0, 4) : 'juil.'}</text><line class="axis" x1="${x(d)}" x2="${x(d)}" y1="${height - B}" y2="${height - B + 5}"/>`).join('');
  let best = -1; let dPath = ''; const records = [];
  for (const p of pts) {
    if (p.value > best) {
      dPath += dPath ? `H${x(p.date)}V${y(p.value)}` : `M${x(p.date)},${y(p.value)}`;
      best = p.value; records.push(p);
    }
  }
  dPath += `H${x(pts[pts.length - 1].date)}`;
  const dots = pts.map((p) => {
    const rec = records.includes(p);
    const tip = `<b>${fmt(p.value)} %</b> · ${esc(p.label)}<br>${dateFr(p.date)}${rec ? ' · record à cette date' : ''}`;
    return `<circle class="hit" cx="${x(p.date)}" cy="${y(p.value)}" r="12" tabindex="0" data-tip="${esc(tip)}" aria-label="${esc(tip.replace(/<[^>]+>/g, ' '))}"/><circle class="mk ${rec ? (actorClass(p.actor) === 'other' ? 'f-ink' : 'f-' + actorClass(p.actor)) : 'f-old'}" cx="${x(p.date)}" cy="${y(p.value)}" r="${rec ? 5 : 4}"/>`;
  }).join('');
  // libellés : premier et dernier record + record avec le plus grand saut
  const lab = new Set([records[0], records[records.length - 1]]);
  let jump = null, jv = 0;
  records.forEach((r, i) => { if (i && r.value - records[i - 1].value > jv) { jv = r.value - records[i - 1].value; jump = r; } });
  if (jump) lab.add(jump);
  const labels = [...lab].map((p) => {
    const nearLeft = x(p.date) < L + 230;
    return `<text class="t-ink2" x="${x(p.date) + (nearLeft ? 8 : -8)}" y="${y(p.value) - 10}" text-anchor="${nearLeft ? 'start' : 'end'}">${esc(p.label)} · ${fmt(p.value)} %</text>`;
  }).join('');
  const svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}-t"><title id="${id}-t">${esc(yLabel)}</title>
${grid}<line class="axis" x1="${L}" x2="${width - R}" y1="${height - B}" y2="${height - B}"/>${xgrid}
<path class="ln c-anthropic" style="stroke:var(--b2-ink-2)" d="${dPath}"/>${dots}${labels}</svg>`;
  const legend = `<ul class="viz-legend"><li><i style="background:var(--b2-ink-2)"></i>Meilleur score publié à date</li>${[...new Set(records.map((r) => r.actor))].map((a) => `<li><i class="dot" style="background:${actorClass(a) === 'other' ? 'var(--b2-ink-2)' : `var(--s-${actorClass(a)})`}"></i>Record ${esc(a)}</li>`).join('')}<li><i class="dot" style="background:var(--s-old)"></i>Autres modèles</li></ul>`;
  const table = dataTable(note || esc(yLabel), ['Modèle', 'Date', 'Score'], pts.map((p) => [esc(p.label), dateFr(p.date), fmt(p.value) + ' %']));
  return `<div class="viz"><div class="viz-scroll">${svg}</div>${legend}${note ? `<p class="viz-note">${note}</p>` : ''}${table}</div>`;
}

module.exports = { dumbbell, timeSteps, frontier, fmt, dateFr, actorClass, esc };
