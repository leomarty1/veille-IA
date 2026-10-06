/* ════════════════════════════════════════════════════════════════
   build/glossary.js — rattache le lexique (build/glossaire.json) au
   texte d'un brief : la première occurrence de chaque terme reçoit une
   infobulle (<span class="term" data-def>), et la liste des termes
   rencontrés alimente la section « Les mots du brief ».
   Jamais dans un titre, un lien, du code, un SVG ou un bloc data-noterm.
   ════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');

const GLOSSARY_PATH = path.join(__dirname, 'glossaire.json');
const PROTECTED = new Set(['a', 'code', 'h1', 'h2', 'h3', 'svg', 'summary', 'button', 'dt', 'dd', 'script', 'style', 'title', 'th']);
const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'col', 'area', 'base', 'embed', 'track', 'param']);

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function load() {
  return JSON.parse(fs.readFileSync(GLOSSARY_PATH, 'utf8')).terms;
}

/** Une RegExp par forme reconnue, bornée aux limites de mots (Unicode). */
function compile(terms) {
  const out = [];
  for (const t of terms) {
    for (const m of t.match) {
      const body = m.startsWith('re:') ? m.slice(3) : escRe(m);
      const flags = t.cs ? 'u' : 'iu';
      out.push({ term: t, len: m.length, re: new RegExp(`(?<![\\p{L}\\p{N}_])(?:${body})(?![\\p{L}\\p{N}_])`, flags) });
    }
  }
  // formes longues d'abord : « fenêtre de contexte » avant « contexte »
  return out.sort((a, b) => b.len - a.len);
}

/** Découpe le HTML en segments texte / balise, en marquant le texte protégé. */
function segment(html) {
  const segs = [];
  const stack = [];
  let prot = 0;
  let last = 0;
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g;
  let m;
  while ((m = re.exec(html))) {
    if (m.index > last) segs.push({ t: 'text', s: html.slice(last, m.index), prot: prot > 0 });
    segs.push({ t: 'tag', s: m[0] });
    last = re.lastIndex;
    if (!m[1]) continue; // commentaire
    const name = m[1].toLowerCase();
    const closing = m[0][1] === '/';
    const selfClosing = /\/\s*>$/.test(m[0]) || VOID.has(name);
    if (closing) {
      // dépile jusqu'à la balise correspondante
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name === name) {
          for (let j = stack.length - 1; j >= i; j--) if (stack[j].prot) prot--;
          stack.length = i;
          break;
        }
      }
    } else if (!selfClosing) {
      const p = PROTECTED.has(name) || /\bdata-noterm\b/.test(m[2]) || /class="[^"]*\bterm\b/.test(m[2]);
      stack.push({ name, prot: p });
      if (p) prot++;
    }
  }
  if (last < html.length) segs.push({ t: 'text', s: html.slice(last), prot: prot > 0 });
  return segs;
}

/**
 * Pose une infobulle sur la première occurrence de chaque terme.
 * @returns {{ html: string, used: object[] }} used = termes rencontrés (ordre d'apparition)
 */
function linkTerms(html, terms = load()) {
  const pats = compile(terms);
  let segs = segment(html);
  const done = new Set();
  const firstPos = new Map();
  for (const p of pats) {
    if (done.has(p.term.id)) continue;
    for (let i = 0; i < segs.length; i++) {
      const sg = segs[i];
      if (sg.t !== 'text' || sg.prot) continue;
      const m = sg.s.match(p.re);
      if (!m) continue;
      const before = sg.s.slice(0, m.index);
      const word = m[0];
      const after = sg.s.slice(m.index + word.length);
      const span = `<span class="term" tabindex="0" data-def="${escAttr(p.term.def)}">${word}</span>`;
      segs.splice(i, 1,
        { t: 'text', s: before, prot: false },
        { t: 'tag', s: span, term: p.term.id },
        { t: 'text', s: after, prot: false });
      done.add(p.term.id);
      break;
    }
  }
  const outHtml = segs.map((s) => s.s).join('');
  segs.forEach((s, i) => { if (s.term && !firstPos.has(s.term)) firstPos.set(s.term, i); });
  const used = terms.filter((t) => done.has(t.id)).sort((a, b) => firstPos.get(a.id) - firstPos.get(b.id));
  return { html: outHtml, used };
}

/** Sigles (≥ 2 majuscules) présents dans le texte et absents du lexique comme de la liste blanche. */
const ACRONYM_OK = new Set([
  'IA', 'AI', 'US', 'UE', 'EU', 'USA', 'UK', 'PU', 'PDF', 'HTML', 'JSON', 'CSV', 'URL', 'PC', 'IT', 'RH', 'RGPD', 'CNIL',
  'GPT', 'GPU', 'CPU', 'SAV', 'PME', 'ETI', 'R&D', 'TTC', 'HT', 'TB', 'GB', 'MB', 'OK', 'NB', 'FAQ', 'BBC', 'CEO', 'CTO',
  'AWS', 'GCP', 'IBM', 'NASA', 'SDK', 'API', 'CLI', 'MCP', 'GA', 'RAG', 'LLM', 'ZDR', 'MOE', 'PR', 'DM', 'VM', 'IP', 'DNS',
  'CAO', 'CAD', 'FDM', 'MEX', 'LIQ', 'S300X', 'S600D', 'ESP32', 'USB', 'IOS', 'MIT', 'OCR', 'TTS', 'XAI', 'SA', 'SAS',
]);
function undefinedAcronyms(text, terms = load()) {
  const known = new Set(ACRONYM_OK);
  for (const t of terms) for (const m of t.match) if (!m.startsWith('re:')) known.add(m.toUpperCase());
  const found = new Set();
  for (const m of String(text).matchAll(/(?<![\p{L}\p{N}])[A-Z][A-Z0-9&]{1,6}(?![\p{L}\p{N}])/gu)) {
    const a = m[0];
    if (/^\d/.test(a) || known.has(a.toUpperCase())) continue;
    found.add(a);
  }
  return [...found];
}

module.exports = { load, linkTerms, undefinedAcronyms };
