#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════
   build/site.js — pages dérivées des données, régénérées à chaque brief :
     • modeles/index.html  ← modeles/models.json  (comparateur + graphes)
     • lexique/index.html  ← build/glossaire.json
     • graphe/index.html   → redirection vers modeles/#graphes
   Idempotent : la date « mis à jour le » vient de models.json (meta.updated),
   jamais de l'horloge.
       node build/site.js
   ════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { head, footer } = require('./lib');
const { dumbbell, timeSteps, frontier, fmt, dateFr, actorClass, esc } = require('./charts');
const charte = require('./charte');
const { load: loadGlossary } = require('./glossary');

const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'modeles', 'models.json'), 'utf8'));
const M = db.models;
const byId = new Map(M.map((m) => [m.id, m]));
const B = db.benchmarks || {};
const FAM = db.families || {};
const ACTOR_ORDER = ['Anthropic', 'OpenAI', 'Google', 'Mistral', 'Meta', 'DeepSeek', 'xAI'];
const actorRank = (a) => { const i = ACTOR_ORDER.indexOf(a); return i < 0 ? 99 : i; };
const LIVE = new Set(['ga', 'preview', 'restricted']);
const MAIN_ACTORS = ['Anthropic', 'OpenAI', 'Google', 'Mistral', 'Meta'];
const STATUS_FR = { ga: 'Disponible', preview: 'Préversion', restricted: 'Accès restreint', unreleased: 'Non sorti', deprecated: 'Déprécié', retired: 'Retiré' };
const TIER_FR = { premium: 'Très haut de gamme', haut: 'Haut de gamme', milieu: 'Milieu de gamme', eco: 'Économique', ouvert: 'Modèle ouvert', special: 'Spécialisé' };
const successors = new Map();
for (const m of M) if (m.replaces) successors.set(m.replaces, [...(successors.get(m.replaces) || []), m]);

const priceStr = (m) => (m.price_in == null ? '<span class="na">non publié</span>' : `$${fmt(m.price_in, 2)} / $${fmt(m.price_out, 2)}`);
const ctxStr = (k) => (k == null ? '<span class="na">non communiqué</span>' : k >= 1000 ? `${fmt(k / 1000, 2)} M tokens` : `${Math.round(k)} k tokens`);
const pct = (a, b) => (a == null || b == null || a === 0 ? null : Math.round(((b - a) / a) * 100));
function deltaTxt(d, lowerIsBetter) {
  if (d == null) return '';
  if (d === 0) return ' <span class="d delta-flat">inchangé</span>';
  const good = lowerIsBetter ? d < 0 : d > 0;
  return ` <span class="d ${good ? 'delta-good' : 'delta-bad'}">${d > 0 ? '+' : '−'}${Math.abs(d)} %</span>`;
}
const benchName = (k) => (B[k] && (B[k].short || B[k].name)) || k;
const benchUnit = (k) => (B[k] && B[k].unit) || '%';
function commonBench(m, p) {
  if (!p) return [];
  return Object.keys(m.scores || {}).filter((k) => p.scores && p.scores[k] && m.scores[k].official && p.scores[k].official);
}
const tierOf = (m) => (FAM[m.family] && FAM[m.family].tier) || (m.open_weights ? 'ouvert' : 'special');

/* « En service » = disponible, et pas remplacé par un successeur disponible. Un successeur en accès
   restreint (programme partenaires) ne remplace pas, pour nous, un modèle ouvert à tous. */
const replacedFor = (m) => (successors.get(m.id) || []).some((x) => LIVE.has(x.status) && (x.status !== 'restricted' || m.status === 'restricted'));
// … ni dépassé par un modèle plus récent de la même gamme (lignée incomplète dans la base).
const newerInFamily = (m) => M.some((x) => x.family === m.family && x.date > m.date && LIVE.has(x.status) && (x.status !== 'restricted' || m.status === 'restricted'));
const isCurrent = (m) => LIVE.has(m.status) && !replacedFor(m) && !newerInFamily(m);
const current = M.filter(isCurrent)
  .sort((a, b) => actorRank(a.actor) - actorRank(b.actor) || (b.price_out || 0) - (a.price_out || 0) || b.date.localeCompare(a.date));
/* Cartes : modèles accessibles (pas d'accès restreint ni de variante spécialisée), regroupés par éditeur. */
const TIER_ORDER = ['premium', 'haut', 'milieu', 'eco', 'ouvert'];
const cardModels = current.filter((m) => m.status !== 'restricted' && tierOf(m) !== 'special')
  .sort((a, b) => actorRank(a.actor) - actorRank(b.actor) || TIER_ORDER.indexOf(tierOf(a)) - TIER_ORDER.indexOf(tierOf(b)) || b.date.localeCompare(a.date));
function cardsByActor() {
  const groups = [];
  for (const a of MAIN_ACTORS) {
    const ms = cardModels.filter((m) => m.actor === a);
    if (ms.length) groups.push(`<h3 class="cmp-actor"><span class="b2-actor a-${actorClass(a)}"><i></i></span>${esc(a)}</h3>\n<div class="cmp-grid">${ms.map(card).join('\n')}</div>`);
  }
  const rest = cardModels.filter((m) => !MAIN_ACTORS.includes(m.actor));
  if (rest.length) groups.push(`<details class="b2-section" style="margin-top:28px"><summary>Autres éditeurs (${rest.length} modèles : ${[...new Set(rest.map((m) => esc(m.actor)))].join(', ')})</summary>\n<div class="cmp-grid" style="margin-top:12px">${rest.map(card).join('\n')}</div></details>`);
  return groups.join('\n');
}

function card(m) {
  const p = m.replaces ? byId.get(m.replaces) : null;
  const vs = [];
  if (p) {
    vs.push(['Prix (lecture / écriture)', `${priceStr(m)}${deltaTxt(pct(p.price_out, m.price_out), true)}`]);
    if (p.context_k && m.context_k && p.context_k !== m.context_k) vs.push(['Mémoire de travail', `${ctxStr(m.context_k)}${deltaTxt(pct(p.context_k, m.context_k), false)}`]);
    for (const k of commonBench(m, p).slice(0, 3)) {
      const d = m.scores[k].value - p.scores[k].value;
      const u = benchUnit(k);
      vs.push([benchName(k), `${fmt(p.scores[k].value)} → <b>${fmt(m.scores[k].value)}</b>${u === '%' ? ' %' : ' ' + esc(u)} <span class="d ${d >= 0 ? 'delta-good' : 'delta-bad'}">${d >= 0 ? '+' : '−'}${fmt(Math.abs(d))}${u === '%' ? ' pt' : ''}</span>`]);
    }
  } else {
    vs.push(['Prix (lecture / écriture)', priceStr(m)]);
  }
  vs.push(['Mémoire de travail', ctxStr(m.context_k)]);
  const seen = new Set();
  const rows = vs.filter(([k]) => (seen.has(k) ? false : seen.add(k)));
  return `<article class="cmp-card">
  <span class="fam"><span class="b2-actor a-${actorClass(m.actor)}"><i></i>${esc(m.actor)}</span> · ${esc(TIER_FR[tierOf(m)] || '')}</span>
  <h3>${esc(m.name)}</h3>
  <p class="b2-quiet" style="margin:0">Sorti le ${dateFr(m.date)} · ${STATUS_FR[m.status]}${m.retire_date ? ` · fin le ${dateFr(m.retire_date)}` : ''}${p ? ` · remplace ${esc(p.name)}` : ''}</p>
  ${m.en_clair ? `<p class="plain">${m.en_clair}</p>` : ''}
  <ul class="cmp-vs">${rows.map(([k, v]) => `<li><span>${esc(k)}</span><span>${v}</span></li>`).join('')}</ul>
  ${charte.chip(charte.statusOf(m))}
</article>`;
}

/* Paires « nouveau vs ancien » avec au moins un test % officiel en commun. */
const pairs = M.filter((m) => m.replaces && byId.get(m.replaces) && LIVE.has(m.status) && tierOf(m) !== 'special')
  .map((m) => ({ m, p: byId.get(m.replaces), common: commonBench(m, byId.get(m.replaces)).filter((k) => benchUnit(k) === '%') }))
  .filter((x) => x.common.length)
  .filter((x, i, arr) => arr.findIndex((y) => y.m.family === x.m.family && y.m.date > x.m.date) === -1) // la plus récente par gamme
  // les éditeurs principaux d'abord, puis du plus récent au plus ancien ; 8 paires au plus
  .sort((a, b) => (MAIN_ACTORS.includes(a.m.actor) ? 0 : 1) - (MAIN_ACTORS.includes(b.m.actor) ? 0 : 1) || b.m.date.localeCompare(a.m.date))
  .slice(0, 8);
const pairCharts = pairs.map(({ m, p, common }, i) => `<div class="viz-card" style="min-width:0">
  <h3>${esc(p.name)} → ${esc(m.name)}</h3>
  <p class="b2-quiet" style="margin:0 0 4px">${esc(m.actor)} · ${dateFr(p.date)} → ${dateFr(m.date)} · ${p.price_out != null && m.price_out != null ? `prix $${fmt(p.price_out, 2)} → $${fmt(m.price_out, 2)} par M tokens écrits` : 'prix non publié'}</p>
  ${dumbbell({ rows: common.map((k) => ({ label: benchName(k), old: p.scores[k].value, new: m.scores[k].value, unit: '%' })), oldName: p.name, newName: m.name, actor: m.actor, id: `pair${i}` })}
</div>`).join('\n');

/* Prix dans le temps : une courbe par éditeur et par gamme. */
function priceSeries(tier) {
  const out = [];
  for (const actor of ['Anthropic', 'OpenAI', 'Google']) {
    const pts = M.filter((m) => m.actor === actor && tierOf(m) === tier && m.price_out != null && m.status !== 'unreleased')
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({ date: m.date, value: m.price_out, label: m.name, extra: `lecture $${fmt(m.price_in, 2)}` }));
    if (pts.length >= 2) out.push({ name: actor, actor, points: pts });
  }
  return out;
}
const asOf = db.meta.updated;
/* Résumé honnête de l'évolution : premier → dernier prix, et le maximum s'il est au milieu. */
function trend(series) {
  return series.map((x) => {
    const pts = [...x.points].sort((a, b) => a.date.localeCompare(b.date));
    const first = pts[0], last = pts[pts.length - 1];
    const peak = pts.reduce((a, p) => (p.value > a.value ? p : a), first);
    const mid = peak !== first && peak !== last && peak.value > Math.max(first.value, last.value) ? ` (pic à $${fmt(peak.value, 2)} avec ${esc(peak.label)})` : '';
    return `<strong>${esc(x.name)}</strong> : $${fmt(first.value, 2)} → $${fmt(last.value, 2)}${mid}`;
  }).join(' · ');
}
const hautSeries = priceSeries('haut');
const milieuSeries = priceSeries('milieu');
const capHaut = 80;
const priceHaut = hautSeries.length ? timeSteps({ series: hautSeries, yLabel: 'Prix écriture ($ par M tokens) — haut de gamme', yMax: capHaut, asOf, id: 'ph', note: `Prix publics de l'API, en dollars pour un million de tokens écrits par le modèle (≈ 750 000 mots). Chaque point = une sortie de modèle ; le prix tient jusqu'au modèle suivant. Au-delà de $${capHaut}, la valeur est indiquée par une flèche.` }) : '';
const priceMilieu = milieuSeries.length ? timeSteps({ series: milieuSeries, yLabel: 'Prix écriture ($ par M tokens) — milieu de gamme', asOf, id: 'pm', note: 'Mêmes règles, pour les gammes intermédiaires (Sonnet, Flash, GPT « mini » ou équivalents).' }) : '';

/* SWE-bench Verified : historique officiel tant que le test était publié. */
const swe = M.filter((m) => m.scores && m.scores['swe-bench-verified'] && m.scores['swe-bench-verified'].official && m.status !== 'unreleased')
  .map((m) => ({ date: m.date, value: m.scores['swe-bench-verified'].value, label: m.name, actor: m.actor }));
const sweLast = swe.reduce((a, p) => (p.date > a ? p.date : a), '');
const sweChart = swe.length > 3 ? frontier({ points: swe, yLabel: 'SWE-bench Verified, scores publiés par les éditeurs', yMin: 20, id: 'swe', note: `Scores officiels uniquement. Dernier score publié : ${dateFr(sweLast)}. Le test est désormais saturé (près de 90 %) : les éditeurs ont cessé de le publier et chacun met en avant ses propres tests.` }) : '';

/* Tableau complet : ce qui se compare entre tous les modèles (prix, mémoire, accès). Les scores,
   qui ne se comparent que sur un même test, sont dans « Nouveau contre ancien » et la page source. */
const rowsSorted = [...M].sort((a, b) => b.date.localeCompare(a.date));
const td = (v, txt, n = true) => `<td${n ? ' class="n"' : ''} data-v="${v == null ? '' : esc(v)}">${txt}</td>`;
const table = `<div class="cmp-filters" role="group" aria-label="Filtrer">
  <button type="button" data-cmp-actor="all" aria-pressed="true">Tous</button>
  ${[...new Set(M.map((m) => m.actor))].sort((a, b) => actorRank(a) - actorRank(b)).map((a) => `<button type="button" data-cmp-actor="${esc(a)}" aria-pressed="false">${esc(a)}</button>`).join('')}
  <label><input type="checkbox" data-cmp-live checked> En service seulement</label>
</div>
<div class="cmp-table-wrap"><table class="cmp-table" data-cmp-table>
<thead><tr><th>Modèle</th><th>Éditeur</th><th>Gamme</th><th>Sortie</th><th class="n">Lecture $/M</th><th class="n">Écriture $/M</th><th class="n">Mémoire</th><th>Ouvert</th><th>Statut</th><th>Chez Lynxter</th></tr></thead>
<tbody>
${rowsSorted.map((m) => `<tr data-actor="${esc(m.actor)}" data-live="${isCurrent(m) ? 1 : 0}">
  ${td(m.name, esc(m.name), false).replace('<td', '<td class="name"')}${td(m.actor, esc(m.actor), false)}${td(TIER_ORDER.indexOf(tierOf(m)), esc(TIER_FR[tierOf(m)] || ''), false)}${td(m.date, `<span style="white-space:nowrap">${dateFr(m.date)}</span>`, false)}
  ${td(m.price_in, m.price_in == null ? '<span class="na">—</span>' : '$' + fmt(m.price_in, 2))}${td(m.price_out, m.price_out == null ? '<span class="na">—</span>' : '$' + fmt(m.price_out, 2))}${td(m.context_k, ctxStr(m.context_k).replace(' tokens', ''))}
  ${td(m.open_weights ? 1 : 0, m.open_weights ? 'oui' : '<span class="na">non</span>', false)}${td(STATUS_FR[m.status], STATUS_FR[m.status] || '', false)}${td(charte.statusOf(m), charte.chip(charte.statusOf(m)), false)}
</tr>`).join('\n')}
</tbody></table></div>
<p class="viz-note">« — » = non publié. Prix : tarif API standard de l'éditeur ; un modèle ouvert n'a souvent pas de prix éditeur (il s'héberge soi-même). Cliquez un en-tête pour trier.</p>`;

const updated = dateFr(db.meta.updated);
const nLive = current.length;
const page = head('Comparateur de modèles', 'Les modèles d\'IA en service, comparés à ceux qu\'ils remplacent : prix, mémoire de travail, scores publiés. Mis à jour à chaque brief.', 'modeles', { v2: true }) + `
<main>
<div class="b2-wide">
  <div class="breadcrumb" style="margin-top:32px"><a href="../">Accueil</a><span class="breadcrumb-sep">/</span><span class="current">Modèles</span></div>
  <header class="cmp-hero">
    <p class="b2-kicker">Comparateur · mis à jour le ${updated}</p>
    <h1 class="b2-title">Quel modèle, à quel prix, et qu'a-t-il gagné ?</h1>
    <p class="b2-lead" style="max-width:760px">${cardModels.length} modèles en service et accessibles, chacun comparé à la version qu'il remplace. Les chiffres viennent des annonces officielles ; une estimation extérieure est toujours signalée.</p>
    <div class="b2-callout" style="max-width:760px">
      <p><strong>Prix</strong> : en dollars pour un million de tokens (≈ 750 000 mots). Le premier chiffre pour ce que le modèle lit, le second pour ce qu'il écrit.</p>
      <p><strong>Mémoire de travail</strong> (contexte) : la quantité de texte qu'il garde en tête. 1 M tokens ≈ 1 500 pages.</p>
      <p><strong>Tests</strong> : chaque éditeur publie ses propres tests. Deux modèles ne se comparent que sur un même test, publié pour les deux.</p>
    </div>
  </header>

  <section class="b2-section" id="en-service">
    <h2 class="b2-h2">Les modèles en service</h2>
    <p class="b2-sub">Le dernier modèle de chaque gamme accessible au public, et ce qui a changé par rapport au précédent. Les modèles en accès restreint sont dans le tableau complet.</p>
${cardsByActor()}
  </section>

  <section class="b2-section" id="graphes">
    <h2 class="b2-h2">Nouveau contre ancien</h2>
    <p class="b2-sub">Les dernières générations face à celles qu'elles remplacent, sur les tests que l'éditeur a publiés pour les deux.</p>
    <div class="cmp-grid" style="grid-template-columns:repeat(auto-fill,minmax(420px,1fr))">
${pairCharts || '<p class="b2-quiet">Aucune paire avec un test commun publié.</p>'}
    </div>
  </section>

  <section class="b2-section" id="prix">
    <h2 class="b2-h2">Combien coûte un modèle</h2>
    <p class="b2-sub">Prix pour un million de tokens écrits, à chaque sortie de modèle, depuis 2024.</p>
    <div class="viz-card"><h3>Haut de gamme</h3><p class="b2-quiet" style="margin:0">${trend(hautSeries)}</p>${priceHaut}</div>
    ${priceMilieu ? `<div class="viz-card" style="margin-top:14px"><h3>Milieu de gamme</h3><p class="b2-quiet" style="margin:0">${trend(milieuSeries)}</p>${priceMilieu}</div>` : ''}
  </section>

  ${sweChart ? `<section class="b2-section" id="programmation">
    <h2 class="b2-h2">Deux ans de progrès en programmation</h2>
    <p class="b2-sub">Le meilleur score publié sur SWE-bench Verified (corriger de vrais bugs de logiciels) : de ${fmt(Math.min(...swe.map((p) => p.value)))} % à ${fmt(Math.max(...swe.map((p) => p.value)))} %.</p>
    <div class="viz-card">${sweChart}</div>
  </section>` : ''}

  <section class="b2-section" id="tableau">
    <h2 class="b2-h2">Tous les modèles</h2>
    <p class="b2-sub">${M.length} modèles suivis depuis 2024. Décochez « En service seulement » pour voir l'historique.</p>
${table}
  </section>

  <section class="b2-section" id="methode">
    <h2 class="b2-h2">D'où viennent les chiffres</h2>
    <div class="b2-callout">
      <p>Prix, dates et mémoire de travail : pages officielles des éditeurs. Scores : tableaux publiés par l'éditeur à la sortie du modèle, qui comparent souvent au modèle précédent.</p>
      <p>« Chez Lynxter » applique la charte IA : Claude et Mistral autorisés (données publiques et internes anonymisées), ChatGPT limité aux données publiques, les autres hors cadre ; les modèles ouverts sont candidats pour la future infrastructure locale.</p>
      <p>Mise à jour : à chaque brief hebdomadaire, par la routine (fichier <code>modeles/models.json</code>, chaque chiffre avec sa source). Un écart ? Le signaler à Léo.</p>
    </div>
  </section>
</div>
</main>
` + footer(`Comparateur · données au ${db.meta.updated}`, { v2: true });

fs.writeFileSync(path.join(ROOT, 'modeles', 'index.html'), page);

/* Lexique */
const terms = loadGlossary().slice().sort((a, b) => a.label.localeCompare(b.label, 'fr'));
const lex = head('Lexique', 'Les mots de l\'IA utilisés dans la veille, expliqués simplement.', 'lexique', { v2: true }) + `
<main>
<div class="b2">
  <div class="breadcrumb" style="margin-top:32px"><a href="../">Accueil</a><span class="breadcrumb-sep">/</span><span class="current">Lexique</span></div>
  <header class="b2-head">
    <p class="b2-kicker">Lexique</p>
    <h1 class="b2-title">Les mots de la veille, en clair</h1>
    <p class="b2-lead">${terms.length} termes. Dans chaque brief, les mots soulignés en pointillés affichent leur définition au survol ou au toucher.</p>
  </header>
  <dl class="b2-lexique" style="grid-template-columns:1fr">
${terms.map((t) => `    <div id="${esc(t.id)}"><dt>${esc(t.label)}</dt><dd>${esc(t.def)}</dd></div>`).join('\n')}
  </dl>
</div>
</main>
` + footer('Lexique de la veille IA', { v2: true });
fs.mkdirSync(path.join(ROOT, 'lexique'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'lexique', 'index.html'), lex);

/* Ancienne page « Graphe » (D3 + SWE-bench seul) → comparateur */
fs.writeFileSync(path.join(ROOT, 'graphe', 'index.html'), `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Graphe — déplacé vers le comparateur</title>
<meta http-equiv="refresh" content="0; url=../modeles/#graphes"><link rel="canonical" href="../modeles/#graphes"></head>
<body style="font-family:system-ui;padding:40px">Les graphes sont désormais dans le <a href="../modeles/#graphes">comparateur de modèles</a>.</body></html>
`);

console.log(`site — modeles/index.html (${M.length} modèles, ${nLive} en service, ${pairs.length} paires), lexique/index.html (${terms.length} termes), graphe/ → redirection`);
