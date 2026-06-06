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

/* Résumé ---------------------------------------------------------- */
console.log('');
if (fails.length) {
  console.log(`QA: ❌ ${fails.length} check(s) en échec — NE PAS POUSSER.`);
  process.exit(1);
}
console.log(`QA: ✅ tous les checks passent (${briefs.length} briefs).`);
