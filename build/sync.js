#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════
   build/sync.js — dérive les fichiers « satellites » d'un brief depuis
   sa source unique briefs/<date>.json :
     • briefs/data.json      → entrée du brief (upsert, tri décroissant)
     • index.html            → compteurs, prochaine édition, bloc
                               « Dernier brief », entrée d'archive
     • briefs/index.html     → entrée d'archive (data-* pour les filtres)

   Pourquoi : jusqu'ici ces quatre mises à jour étaient faites à la main
   à chaque run (quatre occasions d'erreur par semaine — compteur faux,
   data-actors incompatible avec le filtre, <a> non fermé). Une seule
   source, un seul générateur, idempotent : relancer ne change rien.

       node build/sync.js 2026-09-06
   ════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, s) => fs.writeFileSync(path.join(ROOT, p), s);

const date = process.argv[2];
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error('usage: node build/sync.js <YYYY-MM-DD>'); process.exit(1); }
const b = JSON.parse(read(`briefs/${date}.json`));
if (b.date !== date) { console.error(`briefs/${date}.json porte la date ${b.date}`); process.exit(1); }

/* ── Normalisation des acteurs ─────────────────────────────────────
   Le brief écrit "Google DeepMind" (nom de section) ; data.json, la home
   et les filtres de l'archive utilisent "Google". Idem "Mistral AI". */
const KEY = { 'Google DeepMind': 'Google', 'Mistral AI': 'Mistral' };
const key = (a) => KEY[a] || a;
const PRINCIPAUX = ['Anthropic', 'OpenAI', 'Google', 'Meta', 'Mistral'];
const TAG_ORDER = ['lynxter', 'useful', 'info'];
const strip = (h) => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const items = b.items || [];
const by_tag = { lynxter: 0, useful: 0, info: 0 };
const by_actor = {};
for (const it of items) { by_tag[it.tag] = (by_tag[it.tag] || 0) + 1; by_actor[key(it.actor)] = (by_actor[key(it.actor)] || 0) + 1; }
for (const a of PRINCIPAUX) if (!(a in by_actor)) by_actor[a] = 0;
const nL = by_tag.lynxter, nU = by_tag.useful;

/* Highlights : `highlights[]` du JSON (1 phrase HTML chacune), sinon le TL;DR. */
const highlightsHtml = (b.highlights && b.highlights.length ? b.highlights : b.tldr || []).slice(0, 3);
const actorsForFilter = [...new Set([...(b.actors_order || []).map(key), ...items.map((i) => key(i.actor))])];
const tagsPresent = TAG_ORDER.filter((t) => by_tag[t] > 0);

const changed = [];

/* 1. briefs/data.json ─────────────────────────────────────────── */
{
  const data = JSON.parse(read('briefs/data.json'));
  const entry = {
    date,
    filename: `${date}.html`,
    items_count: items.length,
    by_tag,
    by_actor,
    mode: 'hebdomadaire',
    title: b.title,
    highlights: highlightsHtml.map(strip),
    items: items.map((it) => ({
      slug: it.slug,
      title: it.title,
      primary_url: ((it.sources || []).find((s) => s.primary) || (it.sources || [])[0] || {}).url || '',
      tag: it.tag,
      actor: it.actor,
    })),
  };
  const before = JSON.stringify(data);
  data.briefs = [entry, ...data.briefs.filter((x) => x.date !== date)].sort((x, y) => y.date.localeCompare(x.date));
  const out = JSON.stringify(data, null, 2) + '\n';
  if (JSON.stringify(data) !== before || read('briefs/data.json') !== out) { write('briefs/data.json', out); changed.push('briefs/data.json'); }
  var briefsAll = data.briefs; // pour les compteurs home
}

/* 2. index.html ───────────────────────────────────────────────── */
{
  let home = read('index.html');
  const orig = home;
  const latest = briefsAll[0];
  const isLatest = latest.date === date;

  // 2a. compteurs globaux (toujours recalculés depuis data.json)
  const totalItems = briefsAll.reduce((a, x) => a + x.items_count, 0);
  const totals = {};
  for (const x of briefsAll) for (const [k, v] of Object.entries(x.by_actor || {})) totals[k] = (totals[k] || 0) + v;
  home = home.replace(/(\d+)(<span class="unit">briefs<\/span>)/, `${briefsAll.length}$2`);
  home = home.replace(/(\d+)(<span class="unit">items<\/span>)/, `${totalItems}$2`);
  const gridMap = { Anthropic: 'Anthropic', OpenAI: 'OpenAI', 'Google DeepMind': 'Google', Meta: 'Meta', 'Mistral AI': 'Mistral' };
  for (const [label, k] of Object.entries(gridMap)) {
    home = home.replace(new RegExp(`(<h3>${esc(label)}</h3>[\\s\\S]*?<strong>)\\d+( items</strong>)`), `$1${totals[k] || 0}$2`);
  }

  if (isLatest) {
    // 2b. prochaine édition = le lundi qui suit la PUBLICATION. Le brief est daté
    // du dimanche (date -u à 01:00 Paris) et publié le lundi : on part de J+1 et
    // on avance au lundi strictement suivant (dimanche 06 → publié lundi 07 →
    // prochaine édition lundi 14 ; un brief daté d'un lundi → lundi suivant).
    const d = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7));
    const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const next = `lundi ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    home = home.replace(/(Prochaine édition&nbsp;: )[^·<]+( · 01:00 Europe\/Paris)/, `$1${next}$2`);

    // 2c. bloc « Dernier brief » — régénéré intégralement, <a> fermé.
    const tagLine = nL > 0 ? `🎯 ${nL} item${nL > 1 ? 's' : ''} impact direct Lynxter · ${nU} 🛠 à connaître` : `Semaine calme · ${nU} 🛠 à connaître`;
    const featured = `<a class="featured reveal" href="briefs/${date}.html">
        <p class="featured-tag">${tagLine}</p>
        <h3>${b.title}</h3>
        <p class="featured-period">${b.period} · ${items.length} items · ${b.actors_scanned} acteurs scannés</p>
        <ul class="featured-highlights">
${highlightsHtml.map((h) => `          <li>${h}</li>`).join('\n')}
        </ul>
        <span class="featured-cta">Lire le brief complet →</span>
      </a>`;
    const featRe = /<a class="featured reveal" href="briefs\/[^"]+">[\s\S]*?<span class="featured-cta">Lire le brief complet →<\/span>(\s*<\/a>)?/;
    if (!featRe.test(home)) { console.error('index.html : bloc featured introuvable'); process.exit(1); }
    // Remplacement par fonction : le contenu éditorial contient des « $10/$50 »
    // que String.replace interpréterait comme des groupes de capture.
    home = home.replace(featRe, () => featured);
  }

  // 2d. entrée d'archive de la home (remplacée si présente, insérée en tête sinon)
  const li = `<li class="archive-entry">
          <a href="briefs/${date}.html">
            <span class="archive-date">${date}</span>
            <div class="archive-main">
              <h3>${b.title}</h3>
              <ul class="archive-highlights">
${highlightsHtml.map((h) => `                <li>${h}</li>`).join('\n')}
              </ul>
            </div>
            <div class="archive-stats">
              <span class="big">${items.length}</span>
              <span>items · ${nL} 🎯</span>
            </div>
          </a>
        </li>`;
  // Une entrée contient des <li> internes (highlights) : sa fin est « </a> puis </li> ».
  const liRe = new RegExp(`<li class="archive-entry">\\s*<a href="briefs/${esc(date)}\\.html">[\\s\\S]*?</a>\\s*</li>`);
  if (liRe.test(home)) home = home.replace(liRe, () => li);
  else home = home.replace(/(<ul class="archive-list reveal">\n)/, (m, p1) => p1 + '        ' + li + '\n');

  if (home !== orig) { write('index.html', home); changed.push('index.html'); }
}

/* 3. briefs/index.html ────────────────────────────────────────── */
{
  let arch = read('briefs/index.html');
  const orig = arch;
  const li = `<li class="archive-entry"
              data-date="${date}"
              data-items="${items.length}"
              data-actors="${actorsForFilter.join(',')}"
              data-tags="${tagsPresent.join(',')}">
            <a href="${date}.html">
              <span class="archive-date">${date}</span>
              <div class="archive-main">
                <h3>${b.title}</h3>
                <ul class="archive-highlights">
${highlightsHtml.map((h) => `                  <li>${h}</li>`).join('\n')}
                </ul>
              </div>
              <div class="archive-stats">
                <span class="big">${items.length}</span>
                <span>items · ${nL} 🎯</span>
              </div>
            </a>
          </li>`;
  const liRe = new RegExp(`<li class="archive-entry"\\s+data-date="${esc(date)}"[\\s\\S]*?</a>\\s*</li>`);
  if (liRe.test(arch)) arch = arch.replace(liRe, () => li);
  else arch = arch.replace(/(<ul class="archive-list">\n)/, (m, p1) => p1 + '          ' + li + '\n');
  if (arch !== orig) { write('briefs/index.html', arch); changed.push('briefs/index.html'); }
}

if (changed.length) console.log('sync ' + date + ' — mis à jour : ' + changed.join(', '));
else console.log('sync ' + date + ' — rien à changer (idempotent).');
