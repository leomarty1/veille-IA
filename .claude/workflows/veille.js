export const meta = {
  name: "veille",
  description: "Brief de veille IA hebdomadaire Lynxter — fan-out par acteur, cross-check/dedup, redaction, QA bloquante",
  whenToUse: "Routine hebdomadaire (lundi 01:00 Europe/Paris) ou run manuel pour produire le brief veille IA.",
  phases: [
    { title: "Recherche", detail: "1 sous-agent par acteur, en parallele (search + fetch primaire)" },
    { title: "Consolidation", detail: "cross-check, dedup inter-briefs, scoring 🎯/🛠/·" },
    { title: "Redaction", detail: "ecrit le JSON du brief + le HTML (brief + pages detail)" },
    { title: "QA", detail: "node build/qa.js — bloquant" },
  ],
}

// Fenetre temporelle passee en args: { date: "YYYY-MM-DD", since: "YYYY-MM-DD", ledger: [...slugs/urls deja couverts...] }
const A = (args && args.date) ? args : { date: "(a fournir)", since: "(dernier brief)", ledger: [] }

const PRINCIPAUX = [
  { actor: "Anthropic", sources: ["https://www.anthropic.com/news", "https://code.claude.com/docs/en/changelog"] },
  { actor: "OpenAI", sources: ["https://openai.com/news/", "https://developers.openai.com/codex/changelog"] },
  { actor: "Google DeepMind", sources: ["https://blog.google/technology/ai/", "https://deepmind.google/discover/blog/"] },
  { actor: "Meta", sources: ["https://ai.meta.com/blog/"] },
  { actor: "Mistral", sources: ["https://mistral.ai/news/"] },
]
const SECONDAIRES = [
  { actor: "Perplexity", sources: ["https://www.perplexity.ai/hub"] },
  { actor: "xAI", sources: ["https://x.ai/news"] },
  { actor: "Cursor", sources: ["https://cursor.com/changelog"] },
  { actor: "DeepSeek", sources: ["https://api-docs.deepseek.com/news"] },
]

const SCAN_SCHEMA = {
  type: "object",
  properties: {
    actor: { type: "string" },
    actor_empty: { type: "boolean", description: "true si rien de notable dans la fenetre" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD de l'annonce" },
          summary: { type: "string", description: "3-5 phrases factuelles, chiffres concrets" },
          primary_url: { type: "string", description: "URL source primaire FETCHÉE (officielle) ou vide" },
          secondary_urls: { type: "array", items: { type: "string" } },
          has_primary: { type: "boolean" },
        },
        required: ["title", "date", "summary", "primary_url", "secondary_urls", "has_primary"],
      },
    },
  },
  required: ["actor", "actor_empty", "items"],
}

const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    date: { type: "string" },
    title: { type: "string" },
    period: { type: "string" },
    tldr: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
    lynxter_hero: { type: "array", items: { type: "string" } },
    synthese_html: { type: "string" },
    highlights: { type: "array", items: { type: "string" }, maxItems: 3 },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slug: { type: "string" },
          actor: { type: "string" },
          tag: { type: "string", enum: ["lynxter", "useful", "info"] },
          date: { type: "string" },
          title: { type: "string" },
          context_html: { type: "string" },
          sources: { type: "array", items: { type: "object", properties: { label: { type: "string" }, url: { type: "string" }, primary: { type: "boolean" } }, required: ["label", "url", "primary"] } },
          has_primary: { type: "boolean" },
          detail: { type: "object", description: "OBLIGATOIRE pour les items 🎯/🛠 (sinon gen.js ne crée pas la page détail -> lien mort). Forme : { short, date_long, description, stats:[{num,unit,label}] (4), context_paragraphs:[...] (3 pour 🎯, 2-3 pour 🛠), lynxter_paragraphs:[...] (3 pour 🎯, 2-3 pour 🛠), source:{kind,url,label,meta}, related:[{slug,actor,title,tag}], nav:{prev:{href,label,title},next:{href,label,title}} }. ABSENT pour les · info (pas de page détail)." },
        },
        required: ["slug", "actor", "tag", "date", "title", "context_html", "sources", "has_primary"],
      },
    },
  },
  required: ["date", "title", "period", "tldr", "lynxter_hero", "synthese_html", "highlights", "items"],
}

const QA_SCHEMA = {
  type: "object",
  properties: {
    passed: { type: "boolean" },
    output: { type: "string" },
    blocking_issues: { type: "array", items: { type: "string" } },
  },
  required: ["passed", "output", "blocking_issues"],
}

const TON = `Ton editorial (cf. CLAUDE.md) : lecteur technique (dev/ingenieur/support avance), pas de vulgarisation. Phrases denses, chiffres concrets systematiques (scores benchmarks, pricing/M tokens, dates, tailles modele, contexte), comparaisons inter-acteurs, zero superlatif marketing. Angle Lynxter (impression 3D industrielle S300X/S600D, workflows agents Claude Code/Cowork) actionnable.`

function scanPrompt(a) {
  return `Tu scannes l'actualite IA de ${a.actor} sur la fenetre ${A.since} -> ${A.date}.
Sources primaires officielles a privilegier : ${a.sources.join(" · ")}.
Methode : WebSearch large (3-4 requetes ciblees) puis WebFetch des sources PRIMAIRES retournees (blog/release officiel). Regle d'or : chaque item doit s'appuyer sur >=1 source primaire FETCHÉE ; si seules des secondaires existent, mets has_primary=false et remplis secondary_urls (>=2 independantes, jamais d'agregateur).
Ne RIEN inventer. Si rien de notable dans la fenetre : actor_empty=true, items=[]. Ne pas re-rapporter ce qui est deja couvert (slugs/urls deja vus) : ${JSON.stringify((A.ledger || []).slice(0, 40))}.
${TON}
Renvoie via la sortie structuree (un item = une annonce reelle datee dans la fenetre).`
}

function crosscheckPrompt(scans) {
  return `Tu consolides le brief veille IA du ${A.date} (periode ${A.since} -> ${A.date}).
Voici les resultats de scan par acteur :
${JSON.stringify(scans, null, 2)}

Ta tache :
1. DEDUP intra-fenetre ET inter-briefs (elimine tout item dont le sujet/URL recoupe le ledger : ${JSON.stringify((A.ledger || []).slice(0, 40))}).
2. SCORING : 🎯 lynxter (impact direct workflow Lynxter : Claude Code, agents, MCP, automation, support S300X/S600D) · 🛠 useful (a connaitre/anticiper/benchmarker) · · info (culture IA).
3. GATE source primaire : un item 🎯/🛠 SANS source primaire reste publiable mais marque has_primary=false (le rédacteur ajoutera "· sans annonce officielle"). Jamais d'agregateur en source.
4. Si < 3 items au total sur les 5 acteurs principaux : produire un brief "semaine calme" honnete (pas de padding).
5. Construire le brief : titre accrocheur sec, period, 3 highlights, tldr (3 bullets denses), lynxter_hero (2-3 paragraphes HTML actionnables), synthese_html (1 paragraphe couvrant chaque acteur actif), et items[] (slug = ${A.date}-kebab, actor, tag, date, title, context_html = 3-5 phrases pour 🎯/🛠 (1-3 pour ·), sources[], ET detail{} OBLIGATOIRE pour chaque 🎯/🛠 : 4 stats, 3 paragraphes contexte étendu, 2-3 paragraphes implications Lynxter, source, related, nav — sinon page détail manquante = lien mort). Profondeur attendue : voir build/example-brief.json.
${TON}
Renvoie le BRIEF complet via la sortie structuree.`
}

function writerPrompt(brief) {
  return `Tu ecris les fichiers du brief veille IA a partir de ce JSON (deja valide) :
${JSON.stringify(brief, null, 2)}

Actions (utilise Write) :
1. Ecris 'briefs/${brief.date}.json' = ce JSON (source unique du brief).
2. Genere le HTML : si 'build/gen.js' existe, lance 'node build/gen.js ${brief.date}' (genere brief + pages detail depuis le JSON). Sinon, ecris a la main 'briefs/${brief.date}.html' + une page 'items/${brief.date}-SLUG.html' par item 🎯/🛠, en suivant EXACTEMENT les templates de CLAUDE.md (sections 5.A et 5.B) et les briefs existants comme gold standard.
3. Mets a jour 'briefs/data.json' (ajoute l'entree en tete : date, filename, items_count, by_tag, by_actor COMPLET, mode, title, highlights, items[] avec slug/title/primary_url), 'briefs/index.html' (archive), 'index.html' (compteurs = somme recalculee, featured, hero-next = lundi suivant 01:00), et 'modeles/' si nouveau modele avec score officiel (jamais approximate:false sans score publie).
Renvoie la liste des fichiers ecrits/modifies.`
}

// ─────────────────────────────────────────────────────────────
phase("Recherche")
log(`Fenetre ${A.since} -> ${A.date} · scan parallele de ${PRINCIPAUX.length + SECONDAIRES.length} acteurs`)

const scans = (await parallel(
  [...PRINCIPAUX, ...SECONDAIRES].map((a) => () =>
    agent(scanPrompt(a), { schema: SCAN_SCHEMA, phase: "Recherche", label: "scan:" + a.actor }).catch(() => null)
  )
)).filter(Boolean)

const principauxActifs = scans.filter((s) => PRINCIPAUX.some((p) => p.actor === s.actor) && !s.actor_empty)
const totalItems = scans.reduce((n, s) => n + (s.items ? s.items.length : 0), 0)
log(`${totalItems} items bruts · ${principauxActifs.length}/${PRINCIPAUX.length} acteurs principaux actifs`)

phase("Consolidation")
const brief = await agent(crosscheckPrompt(scans), { schema: BRIEF_SCHEMA, phase: "Consolidation", label: "cross-check+dedup" })
log(`Brief consolide : ${brief.items.length} items retenus · ${brief.items.filter((i) => i.tag === "lynxter").length} 🎯`)

phase("Redaction")
const written = await agent(writerPrompt(brief), { phase: "Redaction", label: "redaction+build" })

phase("QA")
const qa = await agent(
  `Lance la QA bloquante du repo : execute 'node build/qa.js' (Bash) et rapporte. Si exit != 0, passed=false et liste les checks en echec (blocking_issues). Verifie aussi visuellement que le brief ${brief.date} et ses pages detail sont coherents (liens, compteurs, source primaire par item 🎯/🛠). NE PAS pousser si rouge.`,
  { schema: QA_SCHEMA, phase: "QA", label: "qa-gate" }
)

return {
  date: brief.date,
  items: brief.items.length,
  by_tag: {
    lynxter: brief.items.filter((i) => i.tag === "lynxter").length,
    useful: brief.items.filter((i) => i.tag === "useful").length,
    info: brief.items.filter((i) => i.tag === "info").length,
  },
  actors_actifs: principauxActifs.map((s) => s.actor),
  qa_passed: qa.passed,
  qa_issues: qa.blocking_issues,
  written,
  brief_json: brief,
  note: "PUBLICATION (critique) : si qa_passed=true, pousser via MCP github push_files (commit atomique) — voie primaire car la GitHub App Claude est installee sur le repo. Le PAT inline du prompt est MORT : ne pas s'y fier. Si l'ecriture echoue (App absente/sans write), ECHOUER BRUYAMMENT (rapport en erreur explicite) — ne JAMAIS terminer en succes silencieux sans brief publie. Puis verifier le deploiement (HTTP 200 + date du brief sur le site). Si qa_passed=false : corriger avant tout push.",
}
