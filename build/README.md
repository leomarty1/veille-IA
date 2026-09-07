# build/ — outillage de la veille IA

Outils Node **zéro-dépendance** (aucun `npm install`) pour fiabiliser la routine.

## Chaîne de production d'un brief

```bash
node build/gen.js  2026-09-06   # briefs/<date>.json → brief HTML + pages détail 🎯/🛠
node build/sync.js 2026-09-06   # → data.json, index.html, briefs/index.html (idempotent)
node build/qa.js                # gate bloquant
bash build/publish.sh 2026-09-06
```

## `node build/sync.js <date>` — satellites dérivés de la source unique

Jusqu'au 2026-09-06, quatre fichiers étaient mis à jour à la main à chaque run — quatre occasions d'erreur par semaine (compteur faux, `data-actors="Google DeepMind"` invisible pour le filtre `Google`, `<a>` du bloc « Dernier brief » jamais fermé). `sync.js` les dérive de `briefs/<date>.json` :

- `briefs/data.json` : entrée du brief (compteurs `by_tag`/`by_actor` recalculés, `highlights` = `highlights[]` du JSON sinon le TL;DR, `items[]` pour le ledger), upsert + tri décroissant ;
- `index.html` : compteurs globaux (toujours), et si le brief est le plus récent : prochaine édition (lundi qui suit la publication), bloc « Dernier brief » régénéré, entrée d'archive ;
- `briefs/index.html` : entrée d'archive avec `data-actors` normalisé (`Google DeepMind` → `Google`) et `data-tags`.

Relancer ne change rien ; relancer sur un ancien brief régénère son entrée sans toucher au reste. Le contenu éditorial passe par des remplacements-fonction (`$10/$50` n'est pas un groupe de capture).

## `node build/qa.js` — garde-fou QA (étape 5.5 de CLAUDE.md)

Garde-fou **exécutable** à lancer **avant tout push** (et en CI). Sort en code `1` si un check échoue → bloque la publication. Les checks structurels bloquent partout ; les règles éditoriales et de sourcing bloquent sur le brief le plus récent et signalent (`⚠`) sur les briefs déjà publiés. Vérifie :

- `data.json` et `models-data.json` parsables, `data.json` trié ;
- invariants par brief : `Σ by_tag == items_count` et `Σ by_actor == items_count` (et `by_actor` présent, clé `Google` et non `Google DeepMind`) ;
- chaque lien `../items/*.html` d'un brief pointe vers un fichier existant ; `items_count` == nombre d'`<article class="item">` ;
- compteurs de `index.html` == sommes recalculées ; bloc « Dernier brief » = brief le plus récent, `<a>` fermé ; cohérence de l'archive (`data-items`, `data-actors` compatibles avec les filtres) ;
- **sourcing** : une source `primary:true` est sur un domaine d'éditeur (allowlist `OFFICIAL`) — presse/agrégateur (`SECONDARY`) en primaire = ✗ ; domaine inconnu = ⚠ à qualifier ; URL hub = ⚠ ; sans primaire → marqueur « sans annonce officielle » + ≥ 2 secondaires indépendantes, jamais d'agrégateur ; `has_primary` cohérent avec `sources[]` ;
- **fenêtre** : `items[].date` ∈ (brief précédent, brief] ; slug préfixé par la date ;
- **ledger** : slug et URL primaire non déjà couverts dans les 4 briefs précédents ;
- **profondeur** : `· info` ≤ 3 phrases et sans `detail` ; 🎯/🛠 avec `detail` (≥ 3/2 paragraphes de contexte, ≥ 2 Lynxter, 4 stats), ≥ 2/1 chiffres ; 🎯 sans comparaison inter-acteurs = ⚠ ;
- **style** : zéro superlatif marketing ;
- **liens internes** : `related[].slug` et `nav.prev/next` résolus, tag des related canonique ; aucun `undefined` rendu ; page détail orpheline = ⚠ ;
- tout modèle `status != released` est `approximate:true` ; modèle sans `notes` = ⚠.

```bash
node build/qa.js   # ✅ ou ❌ + exit 1
```

## `.claude/workflows/veille.js` — routine en Dynamic Workflow (Track B)

Réécrit la routine séquentielle en **fan-out / fan-in** :

```
Recherche     1 sous-agent par acteur, en parallèle (search + fetch primaire ; repli search-only si egress bloqué)
              → fail-fast si < 3 scans principaux aboutissent (sous-agents HS) : repli manuel indiqué
Consolidation cross-check + dedup inter-briefs (ledger) + scoring 🎯/🛠/· → ÉCRIT briefs/<date>.json
Rédaction     node build/gen.js + node build/sync.js (+ modeles/ à la main si score officiel)
QA            node build/qa.js (bloquant ; corrections dans le JSON, jusqu'à 3 passes)
→ bash build/publish.sh <date> (hors workflow, par la session principale)
```

Lancement : la routine invoque le workflow `veille` avec `args = { date, since, ledger }`. Le brief ne transite plus en `StructuredOutput` géant (cause de l'échec du 2026-09-06) : le sous-agent de consolidation écrit le fichier et ne renvoie qu'un résumé (compteurs, titre, annonces écartées et pourquoi). Le retour du workflow porte `egress_blocked`, `primary_fetched_ratio`, `scans_failed` et `dropped` pour le rapport final.

## `build/gen.js` — générateur de pages (Track A)

Source unique → HTML. À partir de `briefs/<date>.json` (un item décrit **une seule fois**), génère la page brief + une page détail par item 🎯/🛠, via les templates `build/templates/` et le chrome partagé `build/lib.js` (header/footer écrits une fois, plus de duplication).

```bash
node build/gen.js 2026-06-01                 # lit briefs/2026-06-01.json → écrit le HTML
node build/gen.js build/example-brief.json _preview   # depuis un chemin, suffixe non-destructif
```

`build/example-brief.json` = schéma de référence (brief 2026-06-01, prouvé rendu dans le navigateur). Champs clés : `title_html`, `intro_html`, `tldr[]`, `lynxter_hero[]`, `synthese_html`, `actors_order[]`, `actor_empty{}`, `items[]` (chaque item : slug, actor, tag, date, title, context_html, sources[], et `detail{}` pour les 🎯/🛠 → stats, context_paragraphs, lynxter_paragraphs, source, related, nav). La section « Acteurs secondaires » = items dont l'`actor` n'est pas dans `actors_order`.

**État** : templates brief + item prouvés fonctionnels (rendu navigateur vérifié). `data.json`, compteurs home et archives sont dérivés par `sync.js` depuis le 2026-09-07. Reste en follow-up : le classement `modeles/` (éditorial, encore manuel) et la migration des 4 briefs historiques sans JSON (2026-05-11 → 2026-06-01) — tant qu'ils n'ont pas de `items[]` dans `data.json`, le ledger anti-doublon ne les voit pas.
