#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════
   build/qa.js — Garde-fou QA EXÉCUTABLE de la veille IA.
   Répond au finding "aucune auto-QA bloquante avant push" : du code,
   pas de la prose. À lancer avant tout push (étape 5.5 de CLAUDE.md)
   et en CI. Sort en code 1 si un check échoue.
       node build/qa.js

   Politique bloquant / warning : les checks structurels (compteurs,
   liens, JSON) bloquent sur tous les briefs. Les règles ÉDITORIALES et
   de SOURCING bloquent sur le brief le plus récent (celui qu'on publie)
   et ne font que signaler (⚠) sur les briefs déjà en ligne — le gate
   protège ce qu'on s'apprête à publier, il ne réécrit pas l'éditorial.
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
const warns = [];
function warn(name, cond, detail) {
  if (!cond) { console.log('  ⚠  ' + name + (detail ? '  — ' + detail : '')); warns.push(name); }
}

/* ── Référentiel de sourcing ───────────────────────────────────────
   Le gate « source primaire » de CLAUDE.md §2 était jusqu'ici un simple
   booléen `primary:true` posé par le rédacteur : 32 items 🎯/🛠 publiés
   entre juin et septembre 2026 pointaient en réalité vers VentureBeat,
   TechCrunch, MarkTechPost, Releasebot… Le domaine est désormais vérifié.

   OFFICIAL : domaines d'éditeurs (ou de partenaires annonceurs : press
   room Microsoft/Salesforce/Broadcom, dépôt GitHub/Hugging Face d'une
   release). SECONDARY : presse, agrégateurs, trackers de changelogs,
   blogs d'analyse. Un domaine inconnu n'est ni bloqué ni validé : ⚠ « à
   qualifier » — l'ajouter ici plutôt que de le juger à l'œil. */
const OFFICIAL = [
  /(^|\.)anthropic\.com$/, /(^|\.)claude\.com$/, /(^|\.)claude\.ai$/,
  /(^|\.)openai\.com$/,
  /(^|\.)blog\.google$/, /(^|\.)deepmind\.google$/, /(^|\.)ai\.google\.dev$/, /(^|\.)google\.com$/, /(^|\.)googleblog\.com$/,
  /(^|\.)meta\.ai$/, /(^|\.)meta\.com$/, /(^|\.)fb\.com$/, /(^|\.)llama\.com$/,
  /(^|\.)mistral\.ai$/,
  /(^|\.)perplexity\.ai$/, /(^|\.)x\.ai$/, /(^|\.)cursor\.com$/, /(^|\.)deepseek\.com$/,
  /(^|\.)modelcontextprotocol\.io$/, /(^|\.)cohere\.com$/, /(^|\.)stability\.ai$/, /(^|\.)z\.ai$/,
  /(^|\.)longcatai\.org$/, /(^|\.)lbl\.gov$/, // Meituan LongCat ; press room Berkeley Lab (annonceur Genesis Mission)
  /(^|\.)github\.com$/, /(^|\.)huggingface\.co$/,
  /(^|\.)microsoft\.com$/, /(^|\.)salesforce\.com$/, /(^|\.)broadcom\.com$/, /(^|\.)nvidia\.com$/,
  /(^|\.)aboutamazon\.com$/, /(^|\.)apple\.com$/,
];
const SECONDARY = [
  'venturebeat.com', 'techcrunch.com', 'theverge.com', 'arstechnica.com', 'marktechpost.com', 'the-decoder.com',
  'releasebot.io', 'gradually.ai', 'techtimes.com', 'alternativeto.net', 'siliconangle.com', 'thenextweb.com',
  'byteiota.com', 'thehackernews.com', 'artificialanalysis.ai', 'law.com', 'classmethod.jp', 'chatforest.com',
  'engadget.com', 'androidauthority.com', 'sitepronews.com', '9to5mac.com', 'macrumors.com', 'wikipedia.org',
  'cnbc.com', 'bloomberg.com', 'reuters.com', 'aljazeera.com', 'medium.com', 'substack.com', 'x.com', 'twitter.com',
  'vellum.ai', 'eesel.ai', 'llm-stats.com', 'benchlm.ai', 'aiweekly.co', 'mean.ceo', 'explainx.ai', 'felloai.com',
  'coursiv.io', 'techresearchonline.com', 'cellcog.ai', 'tech-insider.org', 'blockchain.news', 'unite.ai', 'qz.com',
  'datacamp.com', 'computingforgeeks.com', 'apidog.com', 'emergent.sh', 'openrouter.ai', 'yottalabs.ai', 'evolink.ai',
  'intuitionlabs.ai', 'cybersecuritynews.com', 'edtechinnovationhub.com', 'progressiverobot.com', 'codersera.com',
  'aicybr.com', 'flowtivity.ai', 'aireleasetracker.com', 'llmgateway.io', 'mungomash.com', 'msn.com', 'ultrathink.ai',
  'aitoolsworth.com', 'note.com', 'aibase.com', 'ai-360.online', 'getreadyforagents.com', 'bighatgroup.com', 'atoms.dev',
  'iweaver.ai', 'learncursor.dev', 'promptlayer.com', 'justainews.com', 'reconn-ai.com', 'dailyaibrief.com',
  'bismarckanalysis.com', 'aiscopehub.com', 'deepseek.ai', 'thenewstack.io', 'inc.com', 'cryptobriefing.com', 'mlq.ai',
  'memeburn.com', 'havoptic.com', 'updatify.io', 'ventureatlas.org', 'resultsense.com', 'bitcoinethereumnews.com',
  'github.io',
];
const HUB_LAST = new Set(['', 'news', 'blog', 'hub', 'changelog', 'changelogs', 'overview', 'releases', 'release-notes', 'updates']);

function hostOf(url) { try { return new URL(url).hostname.toLowerCase(); } catch (e) { return ''; } }
function classify(url) {
  const h = hostOf(url);
  if (!h) return 'invalid';
  if (OFFICIAL.some((re) => re.test(h))) return 'official';
  if (SECONDARY.some((d) => h === d || h.endsWith('.' + d))) return 'secondary';
  return 'unknown';
}
function isHub(url) {
  try {
    const u = new URL(url);
    if (u.hash && u.hash.length > 1) return false; // ancre vers une entrée précise (ex. changelog#2-1-259)
    const segs = u.pathname.split('/').filter(Boolean);
    const last = segs.length ? segs[segs.length - 1].toLowerCase() : '';
    // page cumulative (changelog, release notes) = hub, même avec un id devant
    return HUB_LAST.has(last) || /changelog|release-?notes/.test(last);
  } catch (e) { return false; }
}

/* ── Référentiel éditorial ─────────────────────────────────────── */
// « historique » est volontairement absent : c'est un nom bien plus souvent qu'un superlatif.
const SUPERLATIVES = /\b(révolutionnaire|revolutionnaire|game[- ]?changer|incroyable|bluffant|époustouflant|epoustouflant|disruptif|magique|sans précédent|sans precedent)\b/i;
const ACTOR_FAMILY = {
  Anthropic: /anthropic|claude|opus|sonnet|haiku|fable|mythos/i,
  OpenAI: /openai|gpt|codex|chatgpt|astra/i,
  'Google DeepMind': /google|deepmind|gemini|gemma/i,
  Google: /google|deepmind|gemini|gemma/i,
  Meta: /\bmeta\b|llama|muse/i,
  Mistral: /mistral|\w+stral\b/i,
  xAI: /\bxai\b|grok/i,
  Cursor: /cursor/i,
  Perplexity: /perplexity|pplx/i,
  DeepSeek: /deepseek/i,
};
const stripTags = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const sentences = (h) => (stripTags(h).match(/[.!?…](?=\s|$)/g) || []).length;
const figures = (h) => (stripTags(h).replace(/\b20\d\d\b/g, '').match(/\d+([.,]\d+)?/g) || []).length;

/* 1. JSON parsable ------------------------------------------------ */
let data = null, models = null;
try { data = JSON.parse(read('briefs/data.json')); check('data.json parsable', true); }
catch (e) { check('data.json parsable', false, e.message); }
try { models = JSON.parse(read('modeles/models-data.json')); check('models-data.json parsable', true); }
catch (e) { check('models-data.json parsable', false, e.message); }

const briefs = (data && data.briefs) || [];
check('data.json trié du plus récent au plus ancien',
  briefs.every((b, i) => i === 0 || briefs[i - 1].date > b.date));

/* 2. Invariants de comptage par brief ----------------------------- */
for (const b of briefs) {
  const st = Object.values(b.by_tag || {}).reduce((a, c) => a + c, 0);
  check(`Σ by_tag == items_count (${b.date})`, st === b.items_count, `${st} vs ${b.items_count}`);
  if (b.by_actor) {
    const sa = Object.values(b.by_actor).reduce((a, c) => a + c, 0);
    check(`Σ by_actor == items_count (${b.date})`, sa === b.items_count, `${sa} vs ${b.items_count}`);
    check(`by_actor sans clé "Google DeepMind" (${b.date})`, !('Google DeepMind' in b.by_actor), 'la clé canonique est "Google"');
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
for (const b of briefs) {
  const file = 'briefs/' + b.filename;
  if (!exists(file)) continue;
  const html = read(file);
  check(`section TL;DR (${b.date})`, /class="tldr/.test(html));
  check(`section lynxter-hero (${b.date})`, /class="lynxter-hero/.test(html));
  check(`section synthèse (${b.date})`, /class="synthese/.test(html));
  const logos = (html.match(/cdn\.simpleicons\.org\/(\w+)/g) || []).join(' ');
  const SLUGS = { Anthropic: 'anthropic', OpenAI: 'openai', Google: 'googlegemini', Meta: 'meta', Mistral: 'mistralai' };
  for (const a of PRINCIPAUX) check(`section acteur présente : ${a} (${b.date})`, logos.includes('/' + SLUGS[a]));
  const blocks = html.split('<article').slice(1).map((s) => '<article' + s.split('</article>')[0]);
  for (const blk of blocks) {
    if (/class="item item-compact"/.test(blk)) continue; // les · info sont volontairement courts
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
  // Le bloc "Dernier brief" pointe vers le brief le plus récent et son <a> est fermé.
  if (briefs.length) {
    const feat = home.match(/<a class="featured[^>]*href="briefs\/([^"]+)"[\s\S]*?(<\/a>|<\/section>)/);
    check('featured = brief le plus récent', !!feat && feat[1] === briefs[0].filename, feat ? feat[1] : 'bloc absent');
    check('featured : balise <a> fermée', !!feat && feat[2] === '</a>', 'le </a> manque avant </section>');
    check('archive home contient le brief le plus récent', home.includes(`href="briefs/${briefs[0].filename}"`));
  }
}

/* 5. Cohérence archive (briefs/index.html) ------------------------ */
if (exists('briefs/index.html')) {
  const arch = read('briefs/index.html');
  const filters = new Set([...arch.matchAll(/data-group="actor" data-filter="([^"]+)"/g)].map((m) => m[1]));
  briefs.forEach((b, idx) => {
    const re = new RegExp(`data-date="${b.date}"[\\s\\S]*?data-items="(\\d+)"[\\s\\S]*?data-actors="([^"]*)"`);
    const m = arch.match(re);
    check(`archive data-items (${b.date})`, !!m && parseInt(m[1], 10) === b.items_count, m ? `${m[1]} vs ${b.items_count}` : 'entrée absente');
    if (m) {
      // Les filtres de l'archive matchent sur "Google", pas "Google DeepMind" :
      // une entrée mal nommée disparaît silencieusement du filtre.
      const gate = idx === 0 ? check : warn;
      const actors = m[2].split(',').map((s) => s.trim());
      gate(`archive data-actors utilise les clés de filtre (${b.date})`,
        !actors.includes('Google DeepMind') && !actors.includes('Mistral AI'), m[2]);
      for (const a of PRINCIPAUX) gate(`archive data-actors inclut ${a} (${b.date})`, actors.includes(a), 'section acteur présente mais absente du filtre');
      void filters;
    }
  });
}

/* 6. Fiabilité des modèles : non-sortis => approximate:true ------- */
for (const m of (models && models.models) || []) {
  if (m.status && m.status !== 'released') {
    check(`modèle non sorti = approximate:true (${m.id})`, m.approximate === true);
  }
  warn(`modèle a une note de source (${m.id})`, typeof m.notes === 'string' && m.notes.length > 20, 'notes absente — d\'où vient le score ?');
}

/* 7. Règles éditoriales et de sourcing, depuis la source unique JSON.
   Bloquant sur le brief le plus récent, warning sur les briefs en ligne. */
const CANON = ['lynxter', 'useful', 'info'];
const ALIAS = { '🎯': 'lynxter', '🛠': 'useful', '·': 'info' };
const LEDGER_DEPTH = 4;

briefs.forEach((b, idx) => {
  const src = 'briefs/' + b.date + '.json';
  if (!exists(src)) return;
  let j; try { j = JSON.parse(read(src)); } catch (e) { check(`source JSON parsable (${b.date})`, false, e.message); return; }
  const latest = idx === 0;
  const gate = latest ? check : warn;
  const prevDate = briefs[idx + 1] ? briefs[idx + 1].date : null;

  // Ledger anti-doublon : slugs (sans préfixe date) et URLs primaires des N briefs précédents.
  const ledgerSlugs = new Set(), ledgerUrls = new Set();
  for (const pb of briefs.slice(idx + 1, idx + 1 + LEDGER_DEPTH)) {
    for (const it of pb.items || []) {
      ledgerSlugs.add(it.slug.replace(/^\d{4}-\d{2}-\d{2}-/, ''));
      if (it.primary_url && !isHub(it.primary_url)) ledgerUrls.add(it.primary_url.replace(/\/+$/, ''));
    }
  }

  check(`JSON.date == data.json (${b.date})`, j.date === b.date);
  gate(`actors_scanned numérique ≥ 5 (${b.date})`, typeof j.actors_scanned === 'number' && j.actors_scanned >= 5, String(j.actors_scanned));
  check(`items JSON == items_count (${b.date})`, (j.items || []).length === b.items_count, `${(j.items || []).length} vs ${b.items_count}`);
  gate(`tldr : 1 à 3 bullets (${b.date})`, Array.isArray(j.tldr) && j.tldr.length >= 1 && j.tldr.length <= 3);
  for (const blob of [...(j.tldr || []), ...(j.lynxter_hero || []), j.intro_html || '', j.synthese_html || '']) {
    const hit = stripTags(blob).match(SUPERLATIVES);
    gate(`zéro superlatif marketing dans le chapeau (${b.date})`, !hit, hit ? '« ' + hit[0] + ' »' : '');
  }

  for (const it of j.items || []) {
    const id = `${b.date} · ${it.slug}`;

    // Fenêtre temporelle : l'annonce est datée dans (brief précédent, ce brief].
    gate(`date dans la fenêtre (${id})`,
      /^\d{4}-\d{2}-\d{2}$/.test(it.date || '') && it.date <= b.date && (!prevDate || it.date > prevDate),
      `${it.date} ∉ (${prevDate || '−∞'}, ${b.date}]`);
    gate(`slug préfixé par la date du brief (${id})`, (it.slug || '').startsWith(b.date + '-'));

    // Dedup inter-briefs (ledger).
    const bare = (it.slug || '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
    gate(`slug non déjà couvert (${id})`, !ledgerSlugs.has(bare), 'déjà dans un des ' + LEDGER_DEPTH + ' briefs précédents');
    const prim = (it.sources || []).find((s) => s.primary);
    if (prim && prim.url && !isHub(prim.url)) {
      gate(`URL primaire non déjà couverte (${id})`, !ledgerUrls.has(prim.url.replace(/\/+$/, '')), prim.url);
    }

    // Style : pas de superlatif, chiffres concrets.
    const body = [it.title, it.context_html, ...((it.detail && it.detail.context_paragraphs) || []), ...((it.detail && it.detail.lynxter_paragraphs) || [])].join(' ');
    const sup = stripTags(body).match(SUPERLATIVES);
    gate(`zéro superlatif marketing (${id})`, !sup, sup ? '« ' + sup[0] + ' »' : '');

    if (it.tag === 'info') {
      const n = sentences(it.context_html || '');
      gate(`· info ≤ 3 phrases (${id})`, n <= 3, n + ' phrases');
      gate(`· info sans bloc detail (${id})`, !it.detail, 'un · info n\'a pas de page détail');
      for (const s of it.sources || []) {
        if (s.primary) gate(`· info : source "primary" est bien un domaine officiel (${id})`, classify(s.url) === 'official', s.url);
      }
      continue;
    }

    // Gate source primaire : ≥ 1 source primaire, sinon marqueur explicite + ≥ 2 secondaires indépendantes.
    const primaries = (it.sources || []).filter((s) => s.primary);
    const hasPrimary = primaries.length > 0;
    const marked = /sans annonce officielle/i.test(JSON.stringify(it)) || it.has_primary === false;
    gate(`gate source primaire (${id})`, hasPrimary || marked, 'ni source primaire ni marqueur « sans annonce officielle »');
    gate(`has_primary cohérent avec sources[] (${id})`, (it.has_primary !== false) === hasPrimary, `has_primary=${it.has_primary} vs ${primaries.length} primaire(s)`);
    for (const s of primaries) {
      const cls = classify(s.url);
      gate(`source primaire = domaine officiel (${id})`, cls !== 'secondary' && cls !== 'invalid', `${cls} : ${s.url}`);
      warn(`domaine primaire connu, à qualifier dans qa.js sinon (${id})`, cls !== 'unknown', hostOf(s.url));
      warn(`URL primaire datée plutôt que page hub (${id})`, !isHub(s.url), s.url + ' — préférer l\'entrée/ancre de l\'annonce');
    }
    if (!hasPrimary) {
      const secs = (it.sources || []).filter((s) => !s.primary);
      gate(`≥ 2 secondaires si pas de primaire (${id})`, secs.length >= 2, secs.length + ' source(s)');
      const hosts = new Set(secs.map((s) => hostOf(s.url)));
      gate(`secondaires indépendantes (${id})`, hosts.size >= Math.min(2, secs.length), [...hosts].join(', '));
      for (const s of secs) gate(`pas d'agrégateur en secondaire (${id})`, !/chatforest|releasebot|gradually\.ai|aireleasetracker|llmgateway/i.test(s.url), s.url);
    }
    // Jamais étiqueter une secondaire comme primaire sur la page détail.
    if (it.detail && it.detail.source) {
      gate(`source non sur-étiquetée primaire (${id})`,
        !(it.detail.source.kind === 'primaire' && !hasPrimary), 'kind=primaire sans source primaire');
      if (it.detail.source.kind === 'primaire') {
        gate(`source de la page détail = domaine officiel (${id})`, classify(it.detail.source.url) !== 'secondary', it.detail.source.url);
      }
    }
    // Profondeur (CLAUDE.md « Profondeur attendue par item »).
    gate(`bloc detail présent (${id})`, !!it.detail, 'detail absent → lien mort');
    const minFig = it.tag === 'lynxter' ? 2 : 1;
    gate(`${it.tag === 'lynxter' ? '🎯 ≥ 2' : '🛠 ≥ 1'} chiffre(s) concret(s) (${id})`, figures(it.context_html) >= minFig, figures(it.context_html) + ' chiffre(s)');
    if (it.detail) {
      const minP = it.tag === 'lynxter' ? 3 : 2;
      gate(`detail : ≥ ${minP} paragraphes de contexte (${id})`, (it.detail.context_paragraphs || []).length >= minP);
      gate(`detail : ≥ 2 paragraphes Lynxter (${id})`, (it.detail.lynxter_paragraphs || []).length >= 2);
      gate(`detail : 4 stats (${id})`, (it.detail.stats || []).length === 4, (it.detail.stats || []).length + ' stats');
      if (it.tag === 'lynxter') {
        const own = ACTOR_FAMILY[it.actor] || /$^/;
        const others = Object.entries(ACTOR_FAMILY).filter(([a]) => a !== it.actor && !(a === 'Google' && it.actor === 'Google DeepMind') && !(a === 'Google DeepMind' && it.actor === 'Google'));
        const text = stripTags(body).replace(own, ' ');
        warn(`🎯 cite une comparaison inter-acteurs (${id})`, others.some(([, re]) => re.test(text)), 'aucun autre acteur nommé');
      }
      for (const r of it.detail.related || []) {
        gate(`tag related résolvable (${id} → ${r.slug})`, CANON.includes(ALIAS[r.tag] || r.tag), 'tag="' + r.tag + '"');
        gate(`related pointe vers une page existante (${id} → ${r.slug})`, exists('items/' + r.slug + '.html'), 'items/' + r.slug + '.html absent (item · info ou slug erroné ?)');
      }
      const nav = it.detail.nav || {};
      for (const [k, n] of Object.entries(nav)) {
        if (!n || !n.href) continue;
        const target = n.href.startsWith('../') ? n.href.slice(3) : 'items/' + n.href;
        gate(`nav ${k} résolue (${id})`, exists(target), n.href);
      }
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

/* 9. Pages détail orphelines : un fichier items/<date>-*.html sans article dans son brief. */
if (fs.existsSync(path.join(ROOT, 'items'))) {
  const byDate = new Map(briefs.map((b) => [b.date, exists('briefs/' + b.filename) ? read('briefs/' + b.filename) : '']));
  for (const f of fs.readdirSync(path.join(ROOT, 'items')).filter((f) => f.endsWith('.html'))) {
    const d = f.slice(0, 10);
    if (!byDate.has(d)) continue;
    warn(`page détail référencée par son brief (items/${f})`, byDate.get(d).includes('../items/' + f), 'orpheline');
  }
}

/* Résumé ---------------------------------------------------------- */
console.log('');
if (warns.length) console.log(`QA: ⚠ ${warns.length} écart(s) non bloquant(s) (briefs déjà publiés ou domaines à qualifier).`);
if (fails.length) {
  console.log(`QA: ❌ ${fails.length} check(s) en échec — NE PAS POUSSER.`);
  process.exit(1);
}
console.log(`QA: ✅ tous les checks passent (${briefs.length} briefs).`);
