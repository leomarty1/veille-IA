#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════
   build/qa.js — Garde-fou QA EXÉCUTABLE de la veille IA.
   Répond au finding "aucune auto-QA bloquante avant push" : du code,
   pas de la prose. À lancer avant tout push (étape 5.5 de CLAUDE.md)
   et en CI. Sort en code 1 si un check échoue.
       node build/qa.js
   ════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));

const fails = [];
function check(name, cond, detail) {
  if (cond) { console.log('  ✓  ' + name); }
  else { console.log('  ✗  ' + name + (detail ? '  — ' + detail : '')); fails.push(name); }
}
/* Écarts sur des briefs DÉJÀ publiés : signalés, non bloquants. Le gate
   protège ce qu'on s'apprête à publier ; réécrire de l'éditorial en ligne
   n'est pas son rôle. */
const warns = [];
function warn(name, cond, detail) {
  if (!cond) { console.log('  ⚠  ' + name + (detail ? '  — ' + detail : '')); warns.push(name); }
}

/* 1. JSON parsable ------------------------------------------------ */
let data = null, models = null;
try { data = JSON.parse(read('briefs/data.json')); check('data.json parsable', true); }
catch (e) { check('data.json parsable', false, e.message); }
try { models = JSON.parse(read('modeles/models-data.json')); check('models-data.json parsable', true); }
catch (e) { check('models-data.json parsable', false, e.message); }

const briefs = (data && data.briefs) || [];

/* 2. Invariants de comptage par brief ----------------------------- */
for (const b of briefs) {
  const st = Object.values(b.by_tag || {}).reduce((a, c) => a + c, 0);
  check(`Σ by_tag == items_count (${b.date})`, st === b.items_count, `${st} vs ${b.items_count}`);
  if (b.by_actor) {
    const sa = Object.values(b.by_actor).reduce((a, c) => a + c, 0);
    check(`Σ by_actor == items_count (${b.date})`, sa === b.items_count, `${sa} vs ${b.items_count}`);
  } else {
    check(`by_actor présent (${b.date})`, false, 'manquant');
  }
}

/* 3. Liens d'items + items_count == nb d'articles ----------------- */
for (const b of briefs) {
  const file = 'briefs/' + b.filename;
  if (!exists(file)) { check(`brief existe (${b.filename})`, false); continue; }
  const html = read(file);
  const links = [...new Set([...html.matchAll(/href="\.\.\/items\/([^"]+\.html)"/g)].map(m => m[1]))];
  for (const l of links) check(`lien item résolu (${b.date} → ${l})`, exists('items/' + l));
  const arts = (html.match(/<article class="item/g) || []).length;
  check(`items_count == nb <article> (${b.date})`, arts === b.items_count, `${arts} vs ${b.items_count}`);
}

/* 3b. COMPLÉTUDE — un brief maigre/incomplet ne doit pas passer ----- */
const PRINCIPAUX = ['Anthropic', 'OpenAI', 'Google', 'Meta', 'Mistral'];
const MIN_CTX = 150; // caractères de contexte mini pour un item 🎯/🛠
const stripTags = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
for (const b of briefs) {
  const file = 'briefs/' + b.filename;
  if (!exists(file)) continue;
  const html = read(file);
  // sections structurantes présentes
  check(`section TL;DR (${b.date})`, /class="tldr/.test(html));
  check(`section lynxter-hero (${b.date})`, /class="lynxter-hero/.test(html));
  check(`section synthèse (${b.date})`, /class="synthese/.test(html));
  // les 5 acteurs principaux ont chacun une section (logo présent)
  const logos = (html.match(/cdn\.simpleicons\.org\/(\w+)/g) || []).join(' ');
  const SLUGS = { Anthropic: 'anthropic', OpenAI: 'openai', Google: 'googlegemini', Meta: 'meta', Mistral: 'mistralai' };
  for (const a of PRINCIPAUX) check(`section acteur présente : ${a} (${b.date})`, logos.includes('/' + SLUGS[a]));
  // chaque item 🎯/🛠 : page détail liée + source + contexte non maigre
  const blocks = html.split('<article').slice(1).map((s) => '<article' + s.split('</article>')[0]);
  for (const blk of blocks) {
    const compact = /class="item item-compact"/.test(blk);
    if (compact) continue; // les · info sont volontairement courts
    const m = blk.match(/<h3 class="item-title">(?:<a[^>]*>)?([^<]{5,60})/);
    const label = m ? m[1].trim().slice(0, 40) : '???';
    check(`item 🎯/🛠 a une page détail liée (${b.date} · ${label})`, /href="\.\.\/items\/[^"]+\.html"/.test(blk));
    check(`item 🎯/🛠 a une source (${b.date} · ${label})`, /class="item-source"[\s\S]*?<a /.test(blk));
    const ctx = (blk.match(/class="item-context">([\s\S]*?)<\/p>/) || [, ''])[1];
    check(`item 🎯/🛠 contexte ≥ ${MIN_CTX} car (${b.date} · ${label})`, stripTags(ctx).length >= MIN_CTX, stripTags(ctx).length + ' car');
  }
}

/* 4. Compteurs home == Σ by_actor sur tous les briefs --------------- */
const totals = {};
for (const b of briefs) for (const [k, v] of Object.entries(b.by_actor || {})) totals[k] = (totals[k] || 0) + v;
if (exists('index.html')) {
  const home = read('index.html');
  const gridMap = { 'Anthropic': 'Anthropic', 'OpenAI': 'OpenAI', 'Google DeepMind': 'Google', 'Meta': 'Meta', 'Mistral AI': 'Mistral' };
  for (const m of home.matchAll(/<a class="actor-card[^>]*>[\s\S]*?<h3>([^<]+)<\/h3>[\s\S]*?<strong>(\d+) items<\/strong>/g)) {
    const key = gridMap[m[1].trim()];
    if (key) check(`compteur home == Σ by_actor (${m[1].trim()})`, parseInt(m[2], 10) === (totals[key] || 0), `${m[2]} vs ${totals[key] || 0}`);
  }
  const briefsN = (home.match(/(\d+)<span class="unit">briefs<\/span>/) || [])[1];
  check('compteur home briefs', parseInt(briefsN, 10) === briefs.length, `${briefsN} vs ${briefs.length}`);
  const itemsTotal = briefs.reduce((a, b) => a + b.items_count, 0);
  const itemsN = (home.match(/(\d+)<span class="unit">items<\/span>/) || [])[1];
  check('compteur home items total', parseInt(itemsN, 10) === itemsTotal, `${itemsN} vs ${itemsTotal}`);
}

/* 5. Cohérence archive (briefs/index.html) ------------------------ */
if (exists('briefs/index.html')) {
  const arch = read('briefs/index.html');
  for (const b of briefs) {
    const re = new RegExp(`data-date="${b.date}"[\\s\\S]*?data-items="(\\d+)"`);
    const m = arch.match(re);
    check(`archive data-items (${b.date})`, !!m && parseInt(m[1], 10) === b.items_count, m ? `${m[1]} vs ${b.items_count}` : 'entrée absente');
  }
}

/* 6. Fiabilité des modèles : non-sortis => approximate:true ------- */
for (const m of (models && models.models) || []) {
  if (m.status && m.status !== 'released') {
    check(`modèle non sorti = approximate:true (${m.id})`, m.approximate === true);
  }
}

/* 7. Règles éditoriales de CLAUDE.md, depuis la source unique JSON ---
   Bloquant sur le brief le plus récent (celui qu'on publie), warning sur
   les briefs déjà en ligne. Couvre les règles qui étaient jusqu'ici
   vérifiées à la main : longueur des · info, gate source primaire,
   présence du bloc detail (sans lui, gen.js ne crée pas la page → lien
   mort), et tags des items connexes. */
const CANON = ['lynxter', 'useful', 'info'];
const ALIAS = { '🎯': 'lynxter', '🛠': 'useful', '·': 'info' };
const sentences = (h) => (h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  .match(/[.!?…](?=\s|$)/g) || []).length;

briefs.forEach((b, idx) => {
  const src = 'briefs/' + b.date + '.json';
  if (!exists(src)) return;
  let j; try { j = JSON.parse(read(src)); } catch (e) { check(`source JSON parsable (${b.date})`, false, e.message); return; }
  const latest = idx === 0;            // data.json est trié du plus récent au plus ancien
  const gate = latest ? check : warn;

  for (const it of j.items || []) {
    const id = `${b.date} · ${it.slug}`;
    if (it.tag === 'info') {
      const n = sentences(it.context_html || '');
      gate(`· info ≤ 3 phrases (${id})`, n <= 3, n + ' phrases');
      continue;
    }
    // Gate source primaire : ≥1 source primaire, sinon marqueur explicite + ≥2 secondaires
    const hasPrimary = (it.sources || []).some((s) => s.primary);
    const marked = /sans annonce officielle/i.test(JSON.stringify(it));
    gate(`gate source primaire (${id})`, hasPrimary || marked,
      'ni source primaire ni marqueur « sans annonce officielle »');
    if (!hasPrimary) {
      gate(`≥ 2 secondaires si pas de primaire (${id})`, (it.sources || []).length >= 2,
        (it.sources || []).length + ' source(s)');
    }
    // Jamais étiqueter une secondaire comme primaire sur la page détail
    if (it.detail && it.detail.source) {
      gate(`source non sur-étiquetée primaire (${id})`,
        !(it.detail.source.kind === 'primaire' && !hasPrimary), 'kind=primaire sans source primaire');
    }
    // detail obligatoire pour 🎯/🛠, sinon page manquante = lien mort
    gate(`bloc detail présent (${id})`, !!it.detail, 'detail absent → lien mort');
    for (const r of (it.detail && it.detail.related) || []) {
      gate(`tag related résolvable (${id} → ${r.slug})`,
        CANON.includes(ALIAS[r.tag] || r.tag), 'tag="' + r.tag + '"');
    }
  }
});

/* 8. Aucun "undefined" littéral dans le HTML généré (tous briefs) ---- */
for (const b of briefs) {
  const pages = ['briefs/' + b.filename].concat(
    fs.existsSync(path.join(ROOT, 'items'))
      ? fs.readdirSync(path.join(ROOT, 'items')).filter((f) => f.startsWith(b.date)).map((f) => 'items/' + f)
      : []
  );
  const dirty = pages.filter((p) => exists(p) && /undefined/.test(read(p)));
  check(`aucun "undefined" rendu (${b.date})`, dirty.length === 0, dirty.join(', '));
}

/* Résumé ---------------------------------------------------------- */
console.log('');
if (warns.length) console.log(`QA: ⚠ ${warns.length} écart(s) sur des briefs déjà publiés (non bloquant).`);
if (fails.length) {
  console.log(`QA: ❌ ${fails.length} check(s) en échec — NE PAS POUSSER.`);
  process.exit(1);
}
console.log(`QA: ✅ tous les checks passent (${briefs.length} briefs).`);
