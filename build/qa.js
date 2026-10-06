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
  /(^|\.)longcatai\.org$/, /(^|\.)lbl\.gov$/, /(^|\.)reflection\.ai$/, // Meituan LongCat ; press room Berkeley Lab (annonceur Genesis Mission)
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
try { models = JSON.parse(read('modeles/models.json')); check('models.json parsable', true); }
catch (e) { check('models.json parsable', false, e.message); }

const briefs = (data && data.briefs) || [];
check('data.json trié du plus récent au plus ancien',
  briefs.every((b, i) => i === 0 || briefs[i - 1].date > b.date));

/* Format de chaque brief : 2 = brief simplifié (oct. 2026, templates/brief-v2.js),
   1 = format historique avec pages détail. Les checks de structure HTML diffèrent. */
const SCHEMA = new Map();
for (const b of briefs) {
  let s = 1;
  if (exists('briefs/' + b.date + '.json')) { try { s = JSON.parse(read('briefs/' + b.date + '.json')).schema === 2 ? 2 : 1; } catch (e) { /* signalé plus bas */ } }
  SCHEMA.set(b.date, s);
}
const isV2 = (b) => SCHEMA.get(b.date) === 2;

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
  if (isV2(b)) {
    // format 2 : chaque annonce a une ancre id="<slug>" (article, carte modèle ou ligne « En bref »)
    const missing = (b.items || []).filter((it) => !html.includes(`id="${it.slug}"`));
    check(`chaque annonce est rendue (${b.date})`, missing.length === 0, missing.map((i) => i.slug).join(', '));
    continue;
  }
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
  if (isV2(b)) {
    check(`section « En 30 secondes » (${b.date})`, /id="en-30-secondes"/.test(html));
    check(`section « Pour Lynxter » (${b.date})`, /id="pour-lynxter"/.test(html));
    check(`section « Les annonces » (${b.date})`, /id="annonces"/.test(html));
    check(`feuille de style v2 chargée (${b.date})`, /assets\/v2\.css/.test(html));
    continue;
  }
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

/* 6. Base modèles (modeles/models.json) : chaque chiffre a sa source --- */
const MODEL_STATUS = ['ga', 'preview', 'restricted', 'unreleased', 'deprecated', 'retired'];
{
  const list = (models && models.models) || [];
  const ids = new Set();
  for (const m of list) {
    check(`modèle : id unique (${m.id})`, !ids.has(m.id));
    ids.add(m.id);
  }
  for (const m of list) {
    check(`modèle : date ISO (${m.id})`, /^\d{4}-\d{2}-\d{2}$/.test(m.date || ''), m.date);
    check(`modèle : statut connu (${m.id})`, MODEL_STATUS.includes(m.status), m.status);
    check(`modèle : remplace un modèle connu (${m.id})`, !m.replaces || ids.has(m.replaces), m.replaces);
    check(`modèle : gamme déclarée dans families{} (${m.id})`, !!(models.families && models.families[m.family]), m.family);
    check(`modèle : éditeur canonique (${m.id})`, !['Google DeepMind', 'Mistral AI'].includes(m.actor), m.actor);
    check(`modèle : au moins une source (${m.id})`, Array.isArray(m.sources) && m.sources.length > 0);
    for (const k of ['price_in', 'price_out', 'context_k']) {
      check(`modèle : ${k} numérique ou null (${m.id})`, m[k] == null || typeof m[k] === 'number', String(m[k]));
    }
    for (const [k, sc] of Object.entries(m.scores || {})) {
      check(`score sourcé (${m.id} · ${k})`, sc && typeof sc.value === 'number' && /^https?:\/\//.test(sc.source || ''), JSON.stringify(sc));
      check(`score : officiel ou non, explicitement (${m.id} · ${k})`, sc && typeof sc.official === 'boolean');
      check(`score : test déclaré dans benchmarks{} (${m.id} · ${k})`, !!(models.benchmarks && models.benchmarks[k]), k);
    }
    // Un modèle non sorti n'affiche pas de score présenté comme officiel.
    if (m.status === 'unreleased') {
      check(`modèle non sorti sans score « officiel » (${m.id})`, Object.values(m.scores || {}).every((s) => !s.official));
    }
  }
}

/* 7bis. Règles du format 2 : lisible par toute l'équipe, verdicts Lynxter, cartes modèles.
   Mêmes gates de sourcing, de fenêtre et de ledger que le format 1. */
const VERDICTS = ['a-faire', 'a-tester', 'a-surveiller', 'rien'];
const THEMES = ['modeles', 'outils', 'entreprise', 'ouvert', 'autre'];
const CHARTE = ['ok', 'vert', 'hors-cadre', 'local'];
const words = (h) => stripTags(h).split(' ').filter(Boolean).length;
const glossary = require('./glossary');
function qaV2(j, { gate, prevDate, ledgerSlugs, ledgerUrls }) {
  const d = j.date;
  const slugs = new Set((j.items || []).map((i) => i.slug));
  gate(`titre court, ≤ 90 caractères (${d})`, (j.title || '').length > 0 && j.title.length <= 90, (j.title || '').length + ' car');
  gate(`chapeau (lead) présent, ≤ 60 mots (${d})`, !!j.lead && words(j.lead) <= 60, words(j.lead || '') + ' mots');
  gate(`En 30 secondes : 1 à 3 points (${d})`, Array.isArray(j.en_30s) && j.en_30s.length >= 1 && j.en_30s.length <= 3);
  for (const p of j.en_30s || []) gate(`En 30 secondes : ≤ 45 mots par point (${d})`, words(p) <= 45, words(p) + ' mots : ' + stripTags(p).slice(0, 50));
  gate(`highlights : 1 à 3 phrases pour la home (${d})`, Array.isArray(j.highlights) && j.highlights.length >= 1 && j.highlights.length <= 3);
  gate(`Pour Lynxter : 0 à 4 lignes (${d})`, Array.isArray(j.pour_lynxter) && j.pour_lynxter.length <= 4);
  for (const r of j.pour_lynxter || []) {
    const id = `${d} · ${stripTags(r.titre || '').slice(0, 40)}`;
    gate(`Pour Lynxter : verdict connu (${id})`, VERDICTS.includes(r.verdict), r.verdict);
    gate(`Pour Lynxter : titre + pourquoi (${id})`, !!r.titre && !!r.pourquoi);
    gate(`Pour Lynxter : pourquoi ≤ 60 mots (${id})`, words(r.pourquoi || '') <= 60, words(r.pourquoi || '') + ' mots');
    gate(`Pour Lynxter : statut charte connu (${id})`, r.charte == null || CHARTE.includes(r.charte), r.charte);
    for (const s of r.items || []) gate(`Pour Lynxter : annonce liée existe (${id} → ${s})`, slugs.has(s));
  }
  const mdb = (models && models.models) || [];
  for (const e of j.modeles || []) {
    const m = mdb.find((x) => x.id === e.id);
    gate(`carte modèle : présent dans models.json (${d} · ${e.id})`, !!m);
    gate(`carte modèle : annonce liée existe (${d} · ${e.id})`, !e.item || slugs.has(e.item), e.item);
    gate(`carte modèle : « en clair » ≤ 50 mots (${d} · ${e.id})`, !!e.en_clair && words(e.en_clair) <= 50, words(e.en_clair || '') + ' mots');
    gate(`carte modèle : verdict connu (${d} · ${e.id})`, !e.pour_nous || VERDICTS.includes(e.verdict), e.verdict);
  }
  const prose = [j.lead, ...(j.en_30s || []), ...(j.pour_lynxter || []).map((r) => r.pourquoi), ...(j.items || []).map((i) => i.resume)].join(' ');
  const sentences = stripTags(prose).split(/(?<=[.!?…])\s+/).filter((s) => s.length > 3);
  const avg = sentences.length ? Math.round(words(prose) / sentences.length) : 0;
  gate(`phrases courtes : ≤ 24 mots en moyenne (${d})`, avg <= 24, avg + ' mots/phrase');
  const hit = stripTags(prose).match(SUPERLATIVES);
  gate(`zéro superlatif marketing (${d})`, !hit, hit ? '« ' + hit[0] + ' »' : '');
  for (const blob of [...(j.en_30s || []), ...(j.items || []).map((i) => i.resume)]) {
    gate(`pas de code ni de nom de paramètre dans le texte courant (${d})`, !/<code>/.test(blob || ''), stripTags(blob).slice(0, 60) + ' — le mettre dans « chiffres »');
  }
  const acr = glossary.undefinedAcronyms(stripTags([...(j.en_30s || []), ...(j.pour_lynxter || []).map((r) => r.pourquoi), ...(j.items || []).map((i) => i.resume)].join(' ')));
  warn(`sigles définis dans le lexique (${d})`, acr.length === 0, acr.join(', ') + ' → ajouter à build/glossaire.json');

  for (const it of j.items || []) {
    const id = `${d} · ${it.slug}`;
    // Format 2 : le jour du brief précédent est inclus (un brief peut sortir en milieu de journée) ; le ledger écarte les doublons.
    gate(`date dans la fenêtre (${id})`, /^\d{4}-\d{2}-\d{2}$/.test(it.date || '') && it.date <= d && (!prevDate || it.date >= prevDate), `${it.date} ∉ [${prevDate || '−∞'}, ${d}]`);
    gate(`slug préfixé par la date du brief (${id})`, (it.slug || '').startsWith(d + '-'));
    gate(`slug non déjà couvert (${id})`, !ledgerSlugs.has((it.slug || '').replace(/^\d{4}-\d{2}-\d{2}-/, '')), 'déjà dans un des ' + LEDGER_DEPTH + ' briefs précédents');
    const prim = (it.sources || []).find((s) => s.primary);
    if (prim && prim.url && !isHub(prim.url)) gate(`URL primaire non déjà couverte (${id})`, !ledgerUrls.has(prim.url.replace(/\/+$/, '')), prim.url);
    gate(`importance connue (${id})`, CANON.includes(it.tag), it.tag);
    gate(`thème connu (${id})`, THEMES.includes(it.theme), it.theme);
    gate(`titre + résumé (${id})`, !!it.title && !!it.resume);
    const n = (stripTags(it.resume).match(/[.!?…](?=\s|$)/g) || []).length;
    if (it.tag === 'info') {
      gate(`En bref : ≤ 2 phrases, ≤ 35 mots (${id})`, n <= 2 && words(it.resume) <= 35, `${n} phrases, ${words(it.resume)} mots`);
    } else {
      gate(`résumé : ≤ 3 phrases, ≤ 75 mots (${id})`, n <= 3 && words(it.resume) <= 75, `${n} phrases, ${words(it.resume)} mots`);
    }
    if (it.pour_nous) {
      gate(`pour nous : verdict connu (${id})`, VERDICTS.includes(it.pour_nous.verdict), it.pour_nous.verdict);
      gate(`pour nous : ≤ 40 mots (${id})`, words(it.pour_nous.texte || '') <= 40, words(it.pour_nous.texte || '') + ' mots');
    }
    // Gate source primaire, identique au format 1.
    const primaries = (it.sources || []).filter((s) => s.primary);
    const hasPrimary = primaries.length > 0;
    gate(`has_primary cohérent avec sources[] (${id})`, (it.has_primary !== false) === hasPrimary, `has_primary=${it.has_primary} vs ${primaries.length} primaire(s)`);
    for (const s of primaries) {
      const cls = classify(s.url);
      gate(`source primaire = domaine officiel (${id})`, cls !== 'secondary' && cls !== 'invalid', `${cls} : ${s.url}`);
      warn(`domaine primaire connu, à qualifier dans qa.js sinon (${id})`, cls !== 'unknown', hostOf(s.url));
    }
    if (!hasPrimary) {
      const secs = (it.sources || []).filter((s) => !s.primary);
      gate(`≥ 2 secondaires si pas de primaire (${id})`, secs.length >= 2, secs.length + ' source(s)');
      gate(`secondaires indépendantes (${id})`, new Set(secs.map((s) => hostOf(s.url))).size >= Math.min(2, secs.length));
      for (const s of secs) gate(`pas d'agrégateur en secondaire (${id})`, !/chatforest|releasebot|gradually\.ai|aireleasetracker|llmgateway/i.test(s.url), s.url);
    }
  }
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
  if (j.schema === 2) { qaV2(j, { gate, prevDate, ledgerSlugs, ledgerUrls }); return; }
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
  const dirty = pages.filter((p) => exists(p) && /undefined|>NaN<|NaN %/.test(read(p)));
  check(`aucun "undefined"/"NaN" rendu (${b.date})`, dirty.length === 0, dirty.join(', '));
}
for (const p of ['modeles/index.html', 'lexique/index.html']) {
  if (exists(p)) check(`aucun "undefined"/"NaN" rendu (${p})`, !/undefined|>NaN<|NaN %|"NaN"/.test(read(p)));
  else check(`page générée présente (${p})`, false, 'lancer node build/site.js');
}

/* 9. Pages détail orphelines : un fichier items/<date>-*.html sans article dans son brief. */
if (fs.existsSync(path.join(ROOT, 'items'))) {
  const byDate = new Map(briefs.map((b) => [b.date, exists('briefs/' + b.filename) ? read('briefs/' + b.filename) : '']));
  for (const f of fs.readdirSync(path.join(ROOT, 'items')).filter((f) => f.endsWith('.html'))) {
    const d = f.slice(0, 10);
    if (!byDate.has(d) || SCHEMA.get(d) === 2) continue; // format 2 : plus de pages détail
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
