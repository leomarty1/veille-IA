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

## `build/gen.js` (Track A — à finaliser)

Générateur statique : `briefs/<date>.json` (source unique d'un brief) → `briefs/<date>.html` + `items/<date>-*.html` + entrée `data.json` + archive + compteurs home + classement, via `build/templates/`. Objectif : **chaque item écrit une seule fois**, compteurs **dérivés** (fin du drift). Templates partagés (chrome) injectés une fois.
