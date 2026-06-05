# build/ — outillage de la veille IA

Outils Node **zéro-dépendance** (aucun `npm install`) pour fiabiliser la routine.

## `node build/qa.js` — garde-fou QA (étape 5.5 de CLAUDE.md)

Garde-fou **exécutable** à lancer **avant tout push** (et en CI). Sort en code `1` si un check échoue → bloque la publication. Vérifie :

- `data.json` et `models-data.json` parsables ;
- invariants par brief : `Σ by_tag == items_count` et `Σ by_actor == items_count` (et `by_actor` présent) ;
- chaque lien `../items/*.html` d'un brief pointe vers un fichier existant ;
- `items_count` == nombre d'`<article class="item">` du brief ;
- compteurs de `index.html` (stat-strip + actors-grid) == sommes recalculées depuis `data.json` ;
- cohérence `briefs/index.html` (archive `data-items`) ;
- tout modèle `status != released` est `approximate:true` (jamais un point « officiel » fantôme).

```bash
node build/qa.js   # ✅ ou ❌ + exit 1
```

## `.claude/workflows/veille.js` — routine en Dynamic Workflow (Track B)

Réécrit la routine séquentielle en **fan-out / fan-in** :

```
Recherche     1 sous-agent par acteur, en parallèle (search + fetch primaire)
Consolidation cross-check + dedup inter-briefs (ledger) + scoring 🎯/🛠/·
Rédaction     écrit briefs/<date>.json (source unique) + le HTML
QA            node build/qa.js (bloquant)
→ push MCP atomique + vérif déploiement (HTTP 200 + date)
```

Lancement : la routine invoque le workflow `veille` avec `args = { date, since, ledger }`. Gain estimé ~3 min vs 12-15, échecs isolés par acteur.

## `build/gen.js` — générateur de pages (Track A)

Source unique → HTML. À partir de `briefs/<date>.json` (un item décrit **une seule fois**), génère la page brief + une page détail par item 🎯/🛠, via les templates `build/templates/` et le chrome partagé `build/lib.js` (header/footer écrits une fois, plus de duplication).

```bash
node build/gen.js 2026-06-01                 # lit briefs/2026-06-01.json → écrit le HTML
node build/gen.js build/example-brief.json _preview   # depuis un chemin, suffixe non-destructif
```

`build/example-brief.json` = schéma de référence (brief 2026-06-01, prouvé rendu dans le navigateur). Champs clés : `title_html`, `intro_html`, `tldr[]`, `lynxter_hero[]`, `synthese_html`, `actors_order[]`, `actor_empty{}`, `items[]` (chaque item : slug, actor, tag, date, title, context_html, sources[], et `detail{}` pour les 🎯/🛠 → stats, context_paragraphs, lynxter_paragraphs, source, related, nav). La section « Acteurs secondaires » = items dont l'`actor` n'est pas dans `actors_order`.

**État** : templates brief + item prouvés fonctionnels (rendu navigateur vérifié). Reste en follow-up : dériver aussi `data.json` + compteurs home + archive + classement depuis la même source (pour l'instant couverts par la QA), et migrer les 4 briefs historiques (transcription pleine).
