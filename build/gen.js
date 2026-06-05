#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════
   build/gen.js — génère le HTML d'un brief depuis sa source unique
   briefs/<date>.json : la page brief + une page détail par item 🎯/🛠.
       node build/gen.js 2026-06-01            (écrit en place)
       node build/gen.js 2026-06-01 _preview   (suffixe non-destructif)
   ════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const renderBrief = require('./templates/brief');
const renderItem = require('./templates/item');

const arg = process.argv[2];
const suffix = process.argv[3] || '';
if (!arg) { console.error('usage: node build/gen.js <YYYY-MM-DD | chemin/vers/brief.json> [suffix]'); process.exit(1); }

const srcPath = arg.endsWith('.json') ? path.resolve(ROOT, arg) : path.join(ROOT, 'briefs', arg + '.json');
const b = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
const date = b.date;

fs.writeFileSync(path.join(ROOT, 'briefs', date + suffix + '.html'), renderBrief(b));
console.log('✓ briefs/' + date + suffix + '.html');

let n = 0;
for (const it of [...b.items, ...(b.secondary_items || [])]) {
  if (it.detail) {
    fs.writeFileSync(
      path.join(ROOT, 'items', it.slug + suffix + '.html'),
      renderItem(it, { brief_date: b.date, brief_title: b.title })
    );
    console.log('✓ items/' + it.slug + suffix + '.html');
    n++;
  }
}
console.log(`OK — brief + ${n} page(s) détail générée(s)${suffix ? ' (mode preview)' : ''}.`);
