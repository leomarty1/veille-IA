/* ════════════════════════════════════════════════════════════════
   build/templates/brief-v2.js — brief hebdomadaire, format 2 (oct. 2026).
   Lisible en 5 minutes par toute l'équipe :
     1. En 30 secondes          — 3 points, sans jargon
     2. Pour Lynxter            — verdict (à faire / à tester / à surveiller / rien),
                                  pourquoi, qui, statut charte
     3. Les modèles de la semaine — nouveau vs ancien (données modeles/models.json)
     4. Les annonces            — regroupées par thème, « pour nous » en une ligne
     5. En bref                 — une ligne par annonce secondaire
     6. Les mots du brief       — lexique automatique (build/glossaire.json)
   Pas de page détail : les chiffres sont dans un bloc dépliable.
   ════════════════════════════════════════════════════════════════ */
'use strict';
const { head, footer, IMPORTANCE, VERDICTS } = require('../lib');
const { linkTerms } = require('../glossary');
const { dumbbell, fmt, dateFr, actorClass, esc } = require('../charts');
const charte = require('../charte');

const THEMES = [
  { id: 'modeles', label: 'Modèles' },
  { id: 'outils', label: 'Outils et assistants' },
  { id: 'entreprise', label: 'Entreprises, sécurité et règles' },
  { id: 'ouvert', label: 'Modèles ouverts et IA locale' },
  { id: 'autre', label: 'Le reste' },
];
const strip = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const actorKey = (a) => (a === 'Google DeepMind' ? 'Google' : a);

function verdictChip(v) {
  const d = VERDICTS[v];
  return d ? `<span class="verdict ${d.cls}">${d.label}</span>` : '';
}
function actorChip(a) {
  return `<span class="b2-actor a-${actorClass(a)}"><i></i>${esc(actorKey(a))}</span>`;
}
function sourcesLine(sources, hasPrimary) {
  const links = (sources || []).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>${s.primary ? '' : ' <span class="est">(presse)</span>'}`).join(' · ');
  return `<p class="b2-src">Sources : ${links}${hasPrimary === false ? ' · <em>sans annonce officielle</em>' : ''}</p>`;
}

function pctDelta(a, b) {
  if (a == null || b == null || a === 0) return null;
  return Math.round(((b - a) / a) * 100);
}
function deltaHtml(d, lowerIsBetter) {
  if (d == null) return '';
  if (d === 0) return ' <span class="d delta-flat">inchangé</span>';
  const good = lowerIsBetter ? d < 0 : d > 0;
  return ` <span class="d ${good ? 'delta-good' : 'delta-bad'}">${d > 0 ? '+' : '−'}${Math.abs(d)} %</span>`;
}
const priceStr = (m) => (m.price_in == null ? 'non publié' : `$${fmt(m.price_in, 2)} / $${fmt(m.price_out, 2)}`);
const ctxStr = (k) => (k == null ? 'non communiqué' : k >= 1000 ? `${fmt(k / 1000, 1)} M tokens` : `${k} k tokens`);
const STATUS_FR = { ga: 'Disponible', preview: 'Préversion', restricted: 'Accès restreint', unreleased: 'Non sorti', deprecated: 'Déprécié', retired: 'Retiré' };

function modelCard(entry, db, idx, item) {
  const m = db.models.find((x) => x.id === entry.id);
  if (!m) throw new Error(`brief v2 : modèle « ${entry.id} » absent de modeles/models.json`);
  const prev = m.replaces ? db.models.find((x) => x.id === m.replaces) : null;
  const benches = db.benchmarks || {};
  const rows = prev
    ? Object.keys(m.scores || {}).filter((k) => prev.scores && prev.scores[k]).map((k) => ({
        label: (benches[k] && (benches[k].short || benches[k].name)) || k,
        old: prev.scores[k].value, new: m.scores[k].value, unit: (benches[k] && benches[k].unit) || '%',
      }))
    : [];
  const solo = Object.keys(m.scores || {}).filter((k) => !prev || !prev.scores || !prev.scores[k]).map((k) => ({
    label: (benches[k] && (benches[k].short || benches[k].name)) || k, old: null, new: m.scores[k].value, unit: (benches[k] && benches[k].unit) || '%',
    note: m.scores[k].official ? '' : '(estimation tierce)',
  }));
  const dIn = prev ? pctDelta(prev.price_in, m.price_in) : null;
  const dOut = prev ? pctDelta(prev.price_out, m.price_out) : null;
  const priceDelta = dIn != null && dIn === dOut ? deltaHtml(dOut, true) : dOut != null ? deltaHtml(dOut, true) : '';
  const facts = [
    ['Prix (lecture / écriture)', `${priceStr(m)}${priceDelta}`],
    ['Mémoire de travail', `${ctxStr(m.context_k)}${prev && prev.context_k && m.context_k && prev.context_k !== m.context_k ? deltaHtml(pctDelta(prev.context_k, m.context_k), false) : ''}`],
    ['Disponibilité', `${STATUS_FR[m.status] || esc(m.status || '—')}${m.retire_date ? ` · fin ${dateFr(m.retire_date)}` : ''}`],
    ['Chez Lynxter', charte.chip(charte.statusOf(m))],
  ];
  const chart = rows.length || solo.length
    ? dumbbell({ rows: [...rows, ...solo], oldName: prev ? prev.name : '—', newName: m.name, actor: actorKey(m.actor), id: `m${idx}` })
    : '<p class="b2-quiet">Aucun score officiel publié pour ce modèle.</p>';
  const figs = item && item.chiffres && item.chiffres.length
    ? `<details><summary>Les chiffres</summary><ul>${item.chiffres.map((c) => `<li>${c}</li>`).join('')}</ul></details>` : '';
  const srcLine = item
    ? sourcesLine(item.sources, item.has_primary)
    : `<p class="b2-src">Sources : ${(m.sources || []).slice(0, 2).map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(new URL(u).hostname.replace(/^www\./, ''))}</a>`).join(' · ')}</p>`;
  return `<article class="b2-model"${item ? ` id="${esc(item.slug)}"` : ''}>
  <div class="b2-model-head">
    <h3><span class="b2-actor a-${actorClass(m.actor)}"><i></i></span>${esc(m.name)}</h3>
    <span class="replaces">${prev ? `remplace ${esc(prev.name)}` : 'nouvelle gamme'} · sorti le ${dateFr(m.date)}</span>
  </div>
  <p class="plain">${entry.en_clair}</p>
  <ul class="b2-facts">${facts.map(([k, v]) => `<li><span class="k">${k}</span><span class="v">${v}</span></li>`).join('')}</ul>
  ${chart}
  ${entry.pour_nous ? `<div class="b2-forus">${verdictChip(entry.verdict || 'rien')}<p>${entry.pour_nous}</p></div>` : ''}
  ${figs}
  ${srcLine}
</article>`;
}

function itemHtml(it) {
  const imp = IMPORTANCE[it.tag] || IMPORTANCE.useful;
  const forUs = it.pour_nous && it.pour_nous.texte
    ? `<div class="b2-forus">${verdictChip(it.pour_nous.verdict)}<p>${it.pour_nous.texte}</p></div>` : '';
  const figs = it.chiffres && it.chiffres.length
    ? `<details><summary>Les chiffres</summary><ul>${it.chiffres.map((c) => `<li>${c}</li>`).join('')}</ul></details>` : '';
  return `<article class="b2-item" id="${esc(it.slug)}">
  <div class="b2-item-top">${actorChip(it.actor)}<span>${dateFr(it.date)}</span>${it.tag === 'lynxter' ? `<span class="b2-imp ${imp.cls}">${imp.label}</span>` : ''}</div>
  <h4>${it.title}</h4>
  <p>${it.resume}</p>
  ${forUs}${figs}
  ${sourcesLine(it.sources, it.has_primary)}
</article>`;
}

module.exports = function renderBriefV2(b, db) {
  // Une annonce de modèle présentée en carte (b.modeles[].item) n'est pas répétée dans « Les annonces ».
  const carded = new Set((b.modeles || []).map((e) => e.item).filter(Boolean));
  const main = b.items.filter((i) => i.tag !== 'info' && !carded.has(i.slug));
  const brefs = b.items.filter((i) => i.tag === 'info');

  const lx = (b.pour_lynxter || []).map((r) => `<li class="b2-lx-row">
    ${verdictChip(r.verdict)}
    <div>
      <h3>${r.titre}</h3>
      <p>${r.pourquoi}</p>
      <div class="b2-lx-foot">${r.qui ? `<span><b>Qui :</b> ${esc(r.qui)}</span>` : ''}${r.charte ? `<span>${charte.chip(r.charte)}</span>` : ''}${(r.items || []).length ? `<span><a href="#${esc(r.items[0])}">Voir l'annonce ↓</a></span>` : ''}</div>
    </div>
  </li>`).join('\n');

  const models = (b.modeles || []).map((e, i) => modelCard(e, db, i, b.items.find((it) => it.slug === e.item))).join('\n');

  const themes = THEMES.map((t) => {
    const its = main.filter((i) => (i.theme || 'autre') === t.id);
    if (!its.length) return '';
    return `<div class="b2-theme"><h3>${t.label}</h3>\n${its.map(itemHtml).join('\n')}\n</div>`;
  }).join('\n');

  const bref = brefs.length
    ? `<section class="b2-section" id="en-bref">
  <h2 class="b2-h2">En bref</h2>
  <ul class="b2-brief-list">${brefs.map((it) => `<li id="${esc(it.slug)}">${actorChip(it.actor)} — <strong>${it.title}</strong> ${it.resume} <span class="b2-src" style="display:inline">${(it.sources || []).slice(0, 1).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join('')}${it.has_primary === false ? ' · <em>sans annonce officielle</em>' : ''}</span></li>`).join('')}</ul>
</section>` : '';

  let body = `
<main>
<div class="b2">
  <div class="breadcrumb" style="margin-top:32px">
    <a href="../">Accueil</a><span class="breadcrumb-sep">/</span><a href="./">Briefs</a><span class="breadcrumb-sep">/</span><span class="current">${b.date}</span>
  </div>

  <header class="b2-head">
    <p class="b2-kicker">Veille IA · ${esc(b.period)}</p>
    <h1 class="b2-title">${b.title_html || esc(b.title)}</h1>
    <p class="b2-lead">${b.lead}</p>
    <ul class="b2-meta"><li>${b.items.length} annonces retenues</li><li>${b.actors_scanned} éditeurs suivis</li><li>Lecture : ~__MIN__ min</li><li><a href="../modeles/">Comparateur de modèles</a></li></ul>
  </header>

  <section class="b2-section" id="en-30-secondes">
    <h2 class="b2-h2">En 30 secondes</h2>
    <div class="b2-30s"><ol>
${b.en_30s.map((p) => `      <li>${p}</li>`).join('\n')}
    </ol></div>
  </section>

  <section class="b2-section" id="pour-lynxter">
    <h2 class="b2-h2">Pour Lynxter cette semaine</h2>
    <p class="b2-sub">Ce que ces annonces changent pour nous. Propositions à valider : rien n'est engagé sans feu vert.</p>
    <ul class="b2-lx">
${lx || '<li class="b2-lx-row"><span class="verdict v-rien">Rien à faire</span><div><h3>Rien qui nous concerne directement cette semaine</h3></div></li>'}
    </ul>
  </section>
${models ? `
  <section class="b2-section" id="modeles">
    <h2 class="b2-h2">Les modèles de la semaine</h2>
    <p class="b2-sub">Chaque nouveau modèle face à celui qu'il remplace, sur les tests publiés par son éditeur. Prix en dollars pour un million de tokens. <a href="../modeles/">Tous les modèles →</a></p>
    <div class="b2-models">
${models}
    </div>
  </section>` : ''}

  <section class="b2-section" id="annonces">
    <h2 class="b2-h2">Les annonces</h2>
${themes}
  </section>
${bref}
${(b.rien_de_notable || []).length ? `  <p class="b2-quiet" style="margin-top:28px">Rien de notable cette semaine chez : ${b.rien_de_notable.map(esc).join(', ')}.</p>` : ''}

  __LEXIQUE__

  <section class="sources-footer" style="margin-top:48px">
    <strong>Sources consultées</strong>
    ${(b.sources_footer || []).map((s) => `<a href="${esc(s.url)}">${esc(s.label)}</a>`).join(' · ')}
  </section>

  <nav class="brief-nav">
    <a class="prev" href="${esc(b.prev.href)}"><span class="label">← Brief précédent</span><span class="title">${esc(b.prev.title)}</span></a>
    <a class="next" href="./"><span class="label">Voir l'archive →</span><span class="title">Tous les briefs</span></a>
  </nav>
</div>
</main>
`;
  // Lexique : infobulle sur la 1re occurrence de chaque terme, puis section récapitulative.
  const linked = linkTerms(body);
  body = linked.html;
  const lexique = linked.used.length
    ? `<section class="b2-section" id="mots" data-noterm>
    <h2 class="b2-h2">Les mots du brief</h2>
    <p class="b2-sub">Survolez ou touchez un mot souligné en pointillés pour sa définition. <a href="../lexique/">Lexique complet →</a></p>
    <dl class="b2-lexique">${linked.used.map((t) => `<div><dt>${esc(t.label)}</dt><dd>${esc(t.def)}</dd></div>`).join('')}</dl>
  </section>` : '';
  body = body.replace('__LEXIQUE__', lexique);
  // Temps de lecture : le texte courant (hors chiffres dépliables, lexique et sources), à 220 mots/min.
  const prose = [b.lead, ...b.en_30s, ...(b.pour_lynxter || []).flatMap((r) => [r.titre, r.pourquoi]),
    ...(b.modeles || []).flatMap((e) => [e.en_clair, e.pour_nous]),
    ...b.items.filter((i) => !carded.has(i.slug)).flatMap((i) => [i.title, i.resume, i.pour_nous && i.pour_nous.texte])].join(' ');
  body = body.replace('__MIN__', String(Math.max(2, Math.round(strip(prose).split(' ').length / 220))));

  return head(b.title, b.description, 'briefs', { v2: true }) + body + footer(`Brief du ${b.date} · format 2`, { v2: true });
};

module.exports.THEMES = THEMES;
