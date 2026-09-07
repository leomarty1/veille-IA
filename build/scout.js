#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════
   build/scout.js — base de faits VÉRIFIÉS avant toute recherche web.

   Lit de façon déterministe les sources officielles joignables même
   quand l'egress est restreint (observé 2026-08-09 et 2026-09-06 : seuls
   code.claude.com, platform.claude.com, github.com et
   raw.githubusercontent.com répondent), et sort la liste DATÉE des
   entrées dans la fenêtre (since exclu → until inclus). Zéro modèle,
   zéro hallucination possible : ce qui sort d'ici est ce que la page dit.

       node build/scout.js 2026-08-30 2026-09-06          # lisible
       node build/scout.js 2026-08-30 2026-09-06 --json   # pour args.scout du workflow
       node build/scout.js 2026-08-30 2026-09-06 --all    # tous les bullets (sinon 12 max/entrée)

   Réseau via curl (honore HTTPS_PROXY et le bundle CA, ce que fetch() de
   Node ne fait pas). Zéro dépendance.
   ════════════════════════════════════════════════════════════════ */
'use strict';
const { execFileSync } = require('child_process');

const [since, until] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const JSON_OUT = process.argv.includes('--json');
const ALL = process.argv.includes('--all');
const MAX_BULLETS = ALL ? Infinity : 12;
if (!/^\d{4}-\d{2}-\d{2}$/.test(since || '') || !/^\d{4}-\d{2}-\d{2}$/.test(until || '')) {
  console.error('usage: node build/scout.js <since YYYY-MM-DD> <until YYYY-MM-DD> [--json] [--all]');
  process.exit(2);
}

/* ── Parsers ────────────────────────────────────────────────────── */
const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
function enDate(s) { // "September 4, 2026" → "2026-09-04"
  const m = String(s).trim().match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (!m || !MONTHS[m[1].toLowerCase()]) return null;
  return `${m[3]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}
// Garde les lignes qui étaient des puces, sans le marqueur.
function bulletLines(block) {
  return block.split('\n').filter((l) => /^\s*[*-]\s+\S/.test(l)).map((l) => l.replace(/^\s*[*-]\s+/, '').trim());
}
const anchor = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Mintlify <Update label="2.1.259" description="September 2, 2026"> … </Update>
function parseMintlifyUpdates(md, pageUrl) {
  const out = [];
  for (const m of md.matchAll(/<Update label="([^"]+)" description="([^"]+)">([\s\S]*?)<\/Update>/g)) {
    const date = enDate(m[2]);
    if (!date) continue;
    out.push({ date, version: m[1], title: `Claude Code ${m[1]}`, url: `${pageUrl}#${anchor(m[1])}`, bullets: bulletLines(m[3]) });
  }
  return out;
}
// "### September 3, 2026" + puces jusqu'au titre suivant
function parseDateHeadings(md, pageUrl, label) {
  const out = [];
  const parts = md.split(/^### /m).slice(1);
  for (const p of parts) {
    const nl = p.indexOf('\n');
    const head = p.slice(0, nl).trim();
    const date = enDate(head);
    if (!date) continue;
    out.push({ date, version: null, title: `${label} — ${head}`, url: `${pageUrl}#${anchor(head)}`, bullets: bulletLines(p.slice(nl + 1)) });
  }
  return out;
}
// release-please : "## 1.4.0 (2026-09-04)" puis "### Features" / "### Bug Fixes" avec puces
function parseReleasePlease(md, repoUrl, label) {
  const out = [];
  const re = /^## \[?(\d+\.\d+\.\d+[^\]\s]*)\]?(?:\([^)]*\))?\s*\((\d{4}-\d{2}-\d{2})\)/gm;
  const heads = [...md.matchAll(re)];
  heads.forEach((h, i) => {
    const body = md.slice(h.index + h[0].length, heads[i + 1] ? heads[i + 1].index : undefined);
    // préfixer chaque puce par sa sous-section (Features / Bug Fixes / Chores…)
    let section = '';
    const bl = [];
    for (const line of body.split('\n')) {
      const s = line.match(/^### (.+)$/);
      if (s) { section = s[1].trim(); continue; }
      if (/^\s*[*-]\s+\S/.test(line)) bl.push((section ? `[${section}] ` : '') + line.replace(/^\s*[*-]\s+/, '').trim());
    }
    out.push({ date: h[2], version: h[1], title: `${label} ${h[1]}`, url: `${repoUrl}/releases/tag/v${h[1]}`, bullets: bl });
  });
  return out;
}

/* ── Sources ────────────────────────────────────────────────────── */
const SOURCES = [
  {
    id: 'claude-code', actor: 'Anthropic', label: 'Claude Code (changelog officiel, ancre par version)',
    url: 'https://code.claude.com/docs/en/changelog',
    fetch: 'https://code.claude.com/docs/en/changelog.md',
    parse: (md) => parseMintlifyUpdates(md, 'https://code.claude.com/docs/en/changelog'),
  },
  {
    id: 'claude-platform', actor: 'Anthropic', label: 'Claude Platform release notes (API, SDK, Console, Cowork, Managed Agents)',
    url: 'https://platform.claude.com/docs/en/release-notes/overview',
    fetch: 'https://platform.claude.com/docs/en/release-notes/overview.md',
    parse: (md) => parseDateHeadings(md, 'https://platform.claude.com/docs/en/release-notes/overview', 'Claude Platform'),
  },
  {
    id: 'anthropic-sdk-python', actor: 'Anthropic', label: 'SDK Python Anthropic (CHANGELOG release-please)',
    url: 'https://github.com/anthropics/anthropic-sdk-python/blob/main/CHANGELOG.md',
    fetch: 'https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/CHANGELOG.md',
    parse: (md) => parseReleasePlease(md, 'https://github.com/anthropics/anthropic-sdk-python', 'anthropic-sdk-python'),
  },
  // Sources voulues mais NON exploitables de façon déterministe (audit 2026-09-07) — listées pour que
  // le run sache qu'elles restent à couvrir par WebSearch, et pour re-tester si l'egress évolue :
  { id: 'codex-cli', actor: 'OpenAI', label: 'Codex CLI (changelog)', url: 'https://developers.openai.com/codex/changelog', fetch: 'https://developers.openai.com/codex/changelog', parse: () => { throw new Error('page non parsée — à implémenter si le domaine répond'); } },
  { id: 'gemini-api', actor: 'Google DeepMind', label: 'Gemini API changelog', url: 'https://ai.google.dev/gemini-api/docs/changelog', fetch: 'https://ai.google.dev/gemini-api/docs/changelog', parse: () => { throw new Error('page non parsée — à implémenter si le domaine répond'); } },
  { id: 'mistral-changelog', actor: 'Mistral', label: 'Mistral changelog', url: 'https://docs.mistral.ai/resources/changelogs', fetch: 'https://docs.mistral.ai/resources/changelogs', parse: () => { throw new Error('page non parsée — à implémenter si le domaine répond'); } },
  { id: 'cursor-changelog', actor: 'Cursor', label: 'Cursor changelog', url: 'https://cursor.com/changelog', fetch: 'https://cursor.com/changelog', parse: () => { throw new Error('page non parsée — à implémenter si le domaine répond'); } },
];

function curl(url) {
  return execFileSync('curl', ['-sS', '-L', '-f', '--max-time', '25', '-A', 'veille-IA scout (+https://github.com/leomarty1/veille-IA)', url], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

const inWindow = (d) => d > since && d <= until;
const result = { since, until, sources: [] };
for (const s of SOURCES) {
  const r = { id: s.id, actor: s.actor, label: s.label, url: s.url, ok: false, error: null, entries: [], total_parsed: 0 };
  try {
    const raw = curl(s.fetch);
    const all = s.parse(raw);
    r.total_parsed = all.length;
    r.entries = all.filter((e) => inWindow(e.date)).sort((a, b) => a.date.localeCompare(b.date));
    r.ok = true;
    if (all.length === 0) { r.ok = false; r.error = 'page lue mais aucune entrée datée reconnue (format changé ?)'; }
  } catch (e) {
    const msg = String(e.stderr || e.message || e).split('\n')[0].trim();
    r.error = /403|Forbidden/.test(msg) ? 'egress bloqué (403)' : /Could not resolve|Connection|000|timed out/i.test(msg) ? 'injoignable (' + msg.slice(0, 60) + ')' : msg.slice(0, 120);
  }
  result.sources.push(r);
}

if (JSON_OUT) { console.log(JSON.stringify(result, null, 2)); process.exit(0); }

/* ── Sortie lisible ─────────────────────────────────────────────── */
console.log(`scout · fenêtre ${since} (exclu) → ${until} (inclus)\n`);
let nEntries = 0;
for (const r of result.sources) {
  if (!r.ok) { console.log(`✗ ${r.label} — ${r.error}\n   ${r.url}\n   → à couvrir par WebSearch (≥ 2 résultats indépendants)\n`); continue; }
  console.log(`✓ ${r.label} — ${r.entries.length} entrée(s) dans la fenêtre (${r.total_parsed} lues)`);
  for (const e of r.entries) {
    nEntries++;
    console.log(`  • ${e.date} · ${e.title}\n    ${e.url}`);
    e.bullets.slice(0, MAX_BULLETS).forEach((b) => console.log(`      - ${b}`));
    if (e.bullets.length > MAX_BULLETS) console.log(`      … +${e.bullets.length - MAX_BULLETS} (--all pour tout voir)`);
  }
  console.log('');
}
const ok = result.sources.filter((r) => r.ok).length;
console.log(`sources : ${ok}/${result.sources.length} lues · ${nEntries} entrée(s) vérifiée(s) dans la fenêtre`);
