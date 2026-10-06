export const meta = {
  name: "veille",
  description: "Brief de veille IA hebdomadaire Lynxter — fan-out par acteur, cross-check/dedup, redaction, QA bloquante",
  whenToUse: "Routine hebdomadaire (lundi 01:00 Europe/Paris) ou run manuel pour produire le brief veille IA.",
  phases: [
    { title: "Recherche", detail: "1 sous-agent par acteur, en parallele (search + fetch primaire, repli search-only si egress bloque)" },
    { title: "Consolidation", detail: "cross-check, dedup inter-briefs, verdicts Lynxter → ecrit briefs/<date>.json (format 2) + modeles/models.json" },
    { title: "Redaction", detail: "node build/gen.js + build/site.js + build/sync.js (brief, comparateur, lexique, data.json, home, archive)" },
    { title: "QA", detail: "node build/qa.js — bloquant" },
  ],
}

// ─────────────────────────────────────────────────────────────
// Fenetre temporelle passee en args : { date, since, ledger: [...slugs | urls deja couverts] }
// Le script ne touche jamais au disque lui-meme : les sous-agents ecrivent
// briefs/<date>.json puis lancent gen.js / sync.js / qa.js. Aucun brief ne
// transite plus en StructuredOutput geant (cause de l'echec du 2026-09-06).
// ─────────────────────────────────────────────────────────────
if (!args || !args.date || !args.since) {
  throw new Error("veille: args { date, since, ledger } requis — ex. { date: '2026-09-06', since: '2026-08-30', ledger: [...] }")
}
const A = { date: args.date, since: args.since, ledger: Array.isArray(args.ledger) ? args.ledger : [] }
const MIN_SCANS_PRINCIPAUX = 3 // en dessous, l'outillage est en panne : on s'arrete au lieu de generer a partir de rien

// Base de faits verifiee en amont par `node build/scout.js <since> <date> --json` (args.scout, optionnel) :
// entrees DATEES lues deterministiquement sur les sources officielles joignables. Injectee dans les scans
// de l'acteur concerne et dans la consolidation — ce sont des faits, pas des resultats de recherche.
const SCOUT = args.scout && Array.isArray(args.scout.sources) ? args.scout : null
function scoutFor(actor) {
  if (!SCOUT) return []
  return SCOUT.sources.filter((s) => s.ok && s.actor === actor && s.entries.length).flatMap((s) =>
    s.entries.map((e) => ({ date: e.date, title: e.title, url: e.url, bullets: e.bullets.slice(0, 15) })))
}
function scoutBlock(actor) {
  const entries = scoutFor(actor)
  if (!entries.length) return ""
  return `\nENTREES VERIFIEES PAR build/scout.js (dates et contenus lus sur la page officielle — a couvrir EN PRIORITE, ne pas les re-chercher, les enrichir et les contextualiser ; l'URL donnee est la source primaire a citer, ancre comprise) :\n${JSON.stringify(entries, null, 1)}\n`
}
const SCOUT_UNREACHABLE = SCOUT ? SCOUT.sources.filter((s) => !s.ok).map((s) => `${s.label} (${s.error})`) : []

const PRINCIPAUX = [
  { actor: "Anthropic", sources: ["https://www.anthropic.com/news", "https://code.claude.com/docs/en/changelog", "https://platform.claude.com/docs/en/release-notes/overview"] },
  { actor: "OpenAI", sources: ["https://openai.com/news/", "https://developers.openai.com/codex/changelog", "https://help.openai.com/en/articles/9624314-model-release-notes"] },
  { actor: "Google DeepMind", sources: ["https://blog.google/technology/ai/", "https://deepmind.google/discover/blog/", "https://ai.google.dev/gemini-api/docs/changelog"] },
  { actor: "Meta", sources: ["https://ai.meta.com/blog/", "https://research.meta.ai/blog"] },
  { actor: "Mistral", sources: ["https://mistral.ai/news/", "https://docs.mistral.ai/resources/changelogs"] },
]
const SECONDAIRES = [
  { actor: "Perplexity", sources: ["https://www.perplexity.ai/hub/blog", "https://docs.perplexity.ai/changelog/changelog"] },
  { actor: "xAI", sources: ["https://x.ai/news"] },
  { actor: "Cursor", sources: ["https://cursor.com/changelog"] },
  { actor: "DeepSeek", sources: ["https://api-docs.deepseek.com/news"] },
]
const PRINCIPAUX_NOMS = PRINCIPAUX.map((p) => p.actor)

const SCAN_SCHEMA = {
  type: "object",
  properties: {
    actor: { type: "string" },
    actor_empty: { type: "boolean", description: "true si rien de notable dans la fenetre" },
    fetch_blocked: { type: "boolean", description: "true si WebFetch a repondu EGRESS_BLOCKED sur les sources officielles (repli search-only)" },
    searches_done: { type: "integer", description: "nombre de WebSearch effectivement executees" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD de l'annonce, DANS la fenetre" },
          summary: { type: "string", description: "3-5 phrases factuelles, chiffres concrets (scores, prix/M tokens, contexte, dates)" },
          primary_url: { type: "string", description: "URL de l'annonce officielle sur le domaine de l'editeur (page datee, pas la page hub), ou vide" },
          primary_fetched: { type: "boolean", description: "true seulement si primary_url a ete OUVERTE via WebFetch dans cette session" },
          secondary_urls: { type: "array", items: { type: "string" }, description: ">= 2 secondaires INDEPENDANTES si pas de primaire ; jamais d'agregateur (releasebot, gradually.ai, chatforest...)" },
          has_primary: { type: "boolean", description: "true si primary_url est un domaine officiel de l'acteur (confirme par >= 2 recherches si non fetche)" },
          confidence: { type: "string", enum: ["confirmed", "single-source", "rumor"], description: "rumor = a exclure du brief ou a marquer explicitement" },
        },
        required: ["title", "date", "summary", "primary_url", "primary_fetched", "secondary_urls", "has_primary", "confidence"],
      },
    },
  },
  required: ["actor", "actor_empty", "fetch_blocked", "searches_done", "items"],
}

const CONSOLIDATED_SCHEMA = {
  type: "object",
  properties: {
    path: { type: "string", description: "chemin ecrit, ex. briefs/2026-09-06.json" },
    title: { type: "string" },
    items_count: { type: "integer" },
    by_tag: {
      type: "object",
      properties: { lynxter: { type: "integer" }, useful: { type: "integer" }, info: { type: "integer" } },
      required: ["lynxter", "useful", "info"],
    },
    actors_actifs: { type: "array", items: { type: "string" } },
    calm_week: { type: "boolean" },
    dropped: { type: "array", items: { type: "string" }, description: "annonces ecartees et pourquoi (doublon ledger, hors fenetre, rumeur, sans source)" },
  },
  required: ["path", "title", "items_count", "by_tag", "actors_actifs", "calm_week", "dropped"],
}

const QA_SCHEMA = {
  type: "object",
  properties: {
    passed: { type: "boolean" },
    output_tail: { type: "string", description: "les 40 dernieres lignes de node build/qa.js" },
    blocking_issues: { type: "array", items: { type: "string" } },
    fixed: { type: "array", items: { type: "string" }, description: "corrections appliquees pour passer au vert (fichiers + nature)" },
  },
  required: ["passed", "output_tail", "blocking_issues", "fixed"],
}

const TON = `Ton editorial (CLAUDE.md §1 et CONTEXTE_LYNXTER.md) : lecteur = equipe Lynxter (support, commerce, dev, direction), PAS specialiste de l'IA, lecture en 5 minutes. Phrases courtes (20 mots en moyenne), mots courants, tout terme technique soit remplace soit present dans build/glossaire.json. Pas de code ni de nom de parametre dans les resumes (ils vont dans chiffres[]). Un ou deux chiffres utiles par annonce avec leur point de comparaison. Zero superlatif. Pour Lynxter : uniquement a partir de ce que CONTEXTE_LYNXTER.md dit qu'on utilise, jamais d'outil ou de processus interne invente ; « rien a faire » est une reponse normale.`

const LEDGER_TXT = A.ledger.length ? JSON.stringify(A.ledger.slice(0, 60)) : "[]"

function scanPrompt(a) {
  return `Tu scannes l'actualite IA de ${a.actor} sur la fenetre ${A.since} (exclu) -> ${A.date} (inclus).
Sources officielles a ouvrir en priorite : ${a.sources.join(" · ")}.

METHODE
1. 3 a 4 WebSearch distinctes et ciblees (ex. "site:<domaine> <mois> <annee>", "<acteur> release <mois> <annee>", "<acteur> announcement <mois> <annee>"). Ne pas s'arreter au premier resultat.
2. WebFetch des annonces officielles trouvees (page DATEE de l'annonce, pas la page hub /news ou /blog).
3. Si WebFetch repond EGRESS_BLOCKED sur le domaine de l'acteur : fetch_blocked=true, et chaque item doit alors etre recoupe par >= 2 WebSearch INDEPENDANTES (resultats de sources differentes). primary_url reste l'URL officielle si elle est confirmee par les resultats de recherche, avec primary_fetched=false.
4. Pour un benchmark cite : verifier le chiffre avec 2 sources si possible. Distinguer score OFFICIEL (publie par l'editeur) et estimation tierce (leaderboard) — le dire dans summary.
5. Rumeurs (date de sortie annoncee, taille supposee, leak) : confidence="rumor", ne pas presenter comme un fait.

REGLES DURES
- Ne RIEN inventer. Une annonce = une date verifiable dans la fenetre. Hors fenetre = exclue (meme si interessante).
- Ne pas re-rapporter ce qui est deja couvert par les briefs precedents (slug | url) : ${LEDGER_TXT}
- Si rien de notable dans la fenetre : actor_empty=true, items=[] — c'est une reponse valide et frequente, ne pas remplir.
- Jamais d'agregateur (releasebot, gradually.ai, chatforest, aireleasetracker, llmgateway) en source.
${scoutBlock(a.actor)}${TON}
Renvoie via la sortie structuree.`
}

function consolidatePrompt(scans) {
  return `Tu consolides et REDIGES le brief veille IA du ${A.date} (fenetre ${A.since} exclu -> ${A.date} inclus).

RESULTATS DE SCAN PAR ACTEUR (bruts, a croiser) :
${JSON.stringify(scans, null, 2)}
${SCOUT ? `
FAITS VERIFIES PAR build/scout.js (lus sur les pages officielles, dates certaines — priment sur les scans en cas de contradiction ; leurs URL ancrees sont les sources primaires a citer) :
${JSON.stringify(SCOUT.sources.filter((s) => s.ok && s.entries.length).map((s) => ({ source: s.label, actor: s.actor, entries: s.entries.map((e) => ({ date: e.date, title: e.title, url: e.url, bullets: e.bullets.slice(0, 15) })) })), null, 1)}
Sources officielles NON lisibles ce run (a couvrir uniquement par les scans ci-dessus) : ${SCOUT_UNREACHABLE.join(" · ") || "aucune"}
` : ""}
TA TACHE
1. DEDUP intra-fenetre (une meme annonce vue par deux scans = un item) ET inter-briefs : ecarte tout ce qui recoupe le ledger ${LEDGER_TXT}. Ecarte aussi : hors fenetre, confidence="rumor" (sauf mention explicite « annonce non materialisee » en · info), repackagings marketing, partenariats sans substance technique.
2. SCORING (lis d'abord CONTEXTE_LYNXTER.md) : tag lynxter = « Important pour nous » (touche un outil qu'on utilise ou une decision proche), useful = « Bon a savoir », info = « En bref » (2 phrases, 35 mots max). theme = modeles | outils | entreprise | ouvert | autre.
3. GATE source primaire : un 🎯/🛠 a >= 1 source sur le domaine OFFICIEL de l'acteur (has_primary=true, sources[].primary=true sur cette URL) ; sinon has_primary=false + >= 2 secondaires independantes, et le brief affichera « sans annonce officielle ». Ne JAMAIS poser primary=true sur un domaine de presse ou d'agregateur — build/qa.js le bloque.
4. Semaine calme (< 3 items sur Anthropic/OpenAI/Google DeepMind/Meta/Mistral) : brief minimal honnete, titre type « Semaine calme cote frontiere », pas de padding, sections en actor_empty.
5. ECRIS le fichier briefs/${A.date}.json avec l'outil Write, au FORMAT 2. Reference : LIS d'abord briefs/2026-10-04.json et la section 4 de CLAUDE.md. Cles :
   schema: 2, date, period, title (<= 90 car., le fait + ce qu'il change), description, lead (<= 60 mots), actors_scanned (nombre),
   en_30s[1-3] (<= 45 mots chacun), highlights[3] (phrases courtes pour la home),
   pour_lynxter[<= 4] { verdict: a-faire|a-tester|a-surveiller|rien, titre, pourquoi (<= 60 mots), qui, charte: ok|vert|hors-cadre|local|null, items[slugs] },
   modeles[] { id (modele de modeles/models.json), item (slug), en_clair (<= 50 mots), verdict, pour_nous } pour chaque nouveau modele de la fenetre,
   items[] { slug "${A.date}-<kebab>", actor ("Google DeepMind" pour Google), tag, theme, date (dans la fenetre), title, resume (<= 3 phrases, <= 75 mots, sans code),
             pour_nous? { verdict, texte <= 40 mots }, chiffres?[] (details, code autorise), sources[] ({label,url,primary}), has_primary },
   rien_de_notable[] (acteurs suivis sans annonce), sources_footer[], prev = { href: "${A.since}.html", title: <titre du brief ${A.since}, lu dans briefs/data.json> }.
   Pour chaque nouveau modele : ajoute-le AUSSI a modeles/models.json (CLAUDE.md etape 5.B : prix, contexte, statut, replaces, scores officiels du nouveau ET de l'ancien modele quand l'annonce les donne, chacun avec sa source ; meta.updated = ${A.date}). Tout nouveau sigle ou terme technique : ajoute-le a build/glossaire.json.
6. Ne modifie AUCUN autre fichier que briefs/${A.date}.json, modeles/models.json et build/glossaire.json. Renvoie via la sortie structuree le resume (path, title, compteurs, actors_actifs, calm_week, dropped avec la raison de chaque exclusion).
${TON}`
}

function writerPrompt(c) {
  return `Le brief ${A.date} est ecrit dans ${c.path} (${c.items_count} annonces). Genere tout le reste depuis les sources uniques, dans cet ordre (Bash) :
1. node build/gen.js ${A.date}   → briefs/${A.date}.html (format 2 : page unique, cartes modeles lues dans modeles/models.json)
2. node build/site.js            → modeles/index.html (comparateur), lexique/index.html, redirection graphe/
3. node build/sync.js ${A.date}  → briefs/data.json, index.html, briefs/index.html
Si un script echoue, corrige la CAUSE dans ${c.path}, modeles/models.json ou build/glossaire.json (jamais dans les scripts ni dans le HTML genere) et relance.
Renvoie la liste des fichiers ecrits/modifies et toute anomalie rencontree.`
}

// ─────────────────────────────────────────────────────────────
phase("Recherche")
log(`Fenetre ${A.since} -> ${A.date} · ledger ${A.ledger.length} entrees · scan parallele de ${PRINCIPAUX.length + SECONDAIRES.length} acteurs`)

const scans = (await parallel(
  [...PRINCIPAUX, ...SECONDAIRES].map((a) => () =>
    agent(scanPrompt(a), { schema: SCAN_SCHEMA, phase: "Recherche", label: "scan:" + a.actor }).catch(() => null)
  )
)).filter(Boolean)

const okPrincipaux = scans.filter((s) => PRINCIPAUX_NOMS.includes(s.actor))
const missing = [...PRINCIPAUX, ...SECONDAIRES].map((a) => a.actor).filter((n) => !scans.some((s) => s.actor === n))
if (missing.length) log(`⚠ scans en echec (sous-agent mort) : ${missing.join(", ")}`)

// Fail-fast : si l'outillage des sous-agents est en panne (le 2026-09-06, les 10 scans
// sont morts sur un bug de permission handler), on s'arrete ICI avec un diagnostic
// clair plutot que de consolider a partir de rien.
if (okPrincipaux.length < MIN_SCANS_PRINCIPAUX) {
  throw new Error(
    `veille: ${okPrincipaux.length}/${PRINCIPAUX.length} scans principaux ont abouti (minimum ${MIN_SCANS_PRINCIPAUX}). ` +
    `Sous-agents probablement inoperants (verifier les transcripts : erreurs d'outils, StructuredOutput). ` +
    `Repli : derouler les etapes 1-5 de CLAUDE.md dans la session principale (WebSearch/WebFetch y fonctionnent), ` +
    `puis node build/gen.js, node build/sync.js, node build/qa.js, bash build/publish.sh.`
  )
}

const egressBlocked = scans.filter((s) => s.fetch_blocked).map((s) => s.actor)
const rawItems = scans.reduce((n, s) => n + (s.items ? s.items.length : 0), 0)
const fetched = scans.reduce((n, s) => n + (s.items || []).filter((i) => i.primary_fetched).length, 0)
const principauxActifs = okPrincipaux.filter((s) => !s.actor_empty).map((s) => s.actor)
log(`${rawItems} items bruts · ${principauxActifs.length}/${PRINCIPAUX.length} acteurs principaux actifs · ${fetched}/${rawItems} sources primaires reellement fetchees` +
  (egressBlocked.length ? ` · egress bloque sur ${egressBlocked.join(", ")} (repli search-only)` : ""))

phase("Consolidation")
const c = await agent(consolidatePrompt(scans), { schema: CONSOLIDATED_SCHEMA, phase: "Consolidation", label: "consolidation+redaction JSON" })
log(`Brief ${c.calm_week ? "(semaine calme) " : ""}« ${c.title} » : ${c.items_count} items (${c.by_tag.lynxter} 🎯 · ${c.by_tag.useful} 🛠 · ${c.by_tag.info} ·) · ${c.dropped.length} ecartes`)

phase("Redaction")
const written = await agent(writerPrompt(c), { phase: "Redaction", label: "gen+site+sync" })

phase("QA")
const qa = await agent(
  `Lance la QA bloquante : Bash 'node build/qa.js'. Seuls les ✗ bloquent ; les ⚠ sur des briefs deja publies sont normaux.
Si exit != 0 : corrige la cause dans briefs/${A.date}.json, modeles/models.json ou build/glossaire.json (jamais en editant le HTML genere, jamais en assouplissant qa.js), relance 'node build/gen.js ${A.date}', 'node build/site.js' puis 'node build/sync.js ${A.date}', puis re-teste — jusqu'a 3 fois. Liste ce que tu as corrige dans fixed[].
Si un ✗ ne peut pas etre corrige sans inventer une source : passed=false et explique dans blocking_issues. NE PAS pousser.`,
  { schema: QA_SCHEMA, phase: "QA", label: "qa-gate" }
)

return {
  date: A.date,
  title: c.title,
  items: c.items_count,
  by_tag: c.by_tag,
  calm_week: c.calm_week,
  actors_actifs: principauxActifs,
  scans_failed: missing,
  egress_blocked: egressBlocked,
  primary_fetched_ratio: `${fetched}/${rawItems}`,
  scout_entries: SCOUT ? SCOUT.sources.reduce((n, s) => n + (s.ok ? s.entries.length : 0), 0) : null,
  scout_unreachable: SCOUT_UNREACHABLE,
  dropped: c.dropped,
  qa_passed: qa.passed,
  qa_issues: qa.blocking_issues,
  qa_fixed: qa.fixed,
  written,
  note: "PUBLICATION : si qa_passed=true, lancer `bash build/publish.sh " + A.date + "` (QA + commit + push branche + fast-forward de main + verification). " +
    "GitHub Pages sert `main` : un brief sur une branche de travail n'est PAS publie. Verifier `git log origin/main -1` avant d'annoncer un succes. " +
    "Dans le rapport final, logger egress_blocked et primary_fetched_ratio (gate « source primaire fetchee » tenu ou pas). Si qa_passed=false : corriger avant tout push.",
}
