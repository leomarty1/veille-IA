# build/ — outillage de la veille IA

Outils Node **zéro-dépendance** (aucun `npm install`) pour fiabiliser la routine.

## Chaîne de production d'un brief

```bash
node build/scout.js 2026-09-27 2026-10-04   # base de faits vérifiés (avant toute recherche web)
node build/gen.js  2026-10-04   # briefs/<date>.json → brief HTML (format 2 : page unique ; format 1 : + pages détail)
node build/site.js              # modeles/models.json → comparateur ; glossaire.json → lexique ; graphe/ → redirection
node build/sync.js 2026-10-04   # → data.json, index.html, briefs/index.html (idempotent)
node build/qa.js                # gate bloquant
bash build/publish.sh 2026-10-04
```

## Format 2 (depuis le 2026-10-06)

| Fichier | Rôle |
|---|---|
| `templates/brief-v2.js` | Brief en page unique : En 30 secondes, Pour Lynxter (verdicts), cartes modèles, annonces par thème, En bref, lexique automatique |
| `site.js` | Comparateur (`modeles/index.html`) : modèles en service par éditeur, « nouveau contre ancien », prix dans le temps, SWE-bench historique, tableau filtrable ; lexique ; redirection de l'ancien graphe |
| `charts.js` | Graphes générés au build, sans CDN : avant/après en HTML (lisible sur mobile), courbes en SVG ; infobulles (`assets/v2.js`) et tableau « Voir les données » pour chacun |
| `glossary.js` + `glossaire.json` | Lexique : infobulle sur la 1re occurrence de chaque terme, section « Les mots du brief », détection des sigles non définis (QA) |
| `charte.js` | Statut de chaque éditeur/modèle au regard de la charte IA Lynxter (une seule table) |

Couleurs des graphes : bleu Lynxter (Anthropic), orange (OpenAI), aqua (Google), gris (autres) — palette validée daltonisme en clair et en sombre. La QA du format 2 vérifie en plus : longueur des phrases, nombre de lignes « Pour Lynxter », verdicts et thèmes connus, absence de code dans le texte courant, cartes modèles présentes dans `models.json`, et que chaque score de `models.json` a sa source.

## `node build/scout.js <since> <until>` — base de faits vérifiés

Lit de façon déterministe les sources officielles qui répondent même en egress restreint, et sort les entrées **datées dans la fenêtre** (since exclu → until inclus) avec leur URL ancrée. Zéro modèle entre la page et la sortie : ce qui en sort est ce que la page dit. `--json` produit `args.scout` pour le workflow (injecté dans les scans de l'acteur et dans la consolidation, où ces faits priment sur les résultats de recherche) ; `--all` montre tous les bullets.

| Source | Ce qui est lu | Ancre citée |
|---|---|---|
| Claude Code | `code.claude.com/docs/en/changelog.md` — blocs `<Update label description>` | `changelog#2-1-259` |
| Claude Platform | `platform.claude.com/docs/en/release-notes/overview.md` — titres `### September 3, 2026` | `overview#september-3-2026` |
| SDK Python Anthropic | `raw.githubusercontent.com/…/CHANGELOG.md` — `## 1.4.0 (2026-09-04)` | `releases/tag/v1.4.0` |
| Codex CLI, Gemini API, Mistral, Cursor | déclarés mais **injoignables** (403 proxy au 2026-09-07) — signalés `✗`, à couvrir par WebSearch | — |

Premier run (fenêtre 2026-08-30 → 09-06) : 11 entrées, dont deux release notes plateforme et deux versions du SDK que le brief manuel n'avait pas relevées. Réseau via `curl` (honore `HTTPS_PROXY` et le bundle CA, contrairement au `fetch()` de Node). Ajouter une source = un objet dans `SOURCES` avec un parseur ; les releases GitHub (`api.github.com`, `releases.atom`) sont bloquées, `raw.githubusercontent.com` ne l'est pas.

## `node build/sync.js <date>` — satellites dérivés de la source unique

Jusqu'au 2026-09-06, quatre fichiers étaient mis à jour à la main à chaque run — quatre occasions d'erreur par semaine (compteur faux, `data-actors="Google DeepMind"` invisible pour le filtre `Google`, `<a>` du bloc « Dernier brief » jamais fermé). `sync.js` les dérive de `briefs/<date>.json` :

- `briefs/data.json` : entrée du brief (compteurs `by_tag`/`by_actor` recalculés, `highlights` = `highlights[]` du JSON sinon le TL;DR, `items[]` pour le ledger), upsert + tri décroissant ;
- `index.html` : compteurs globaux (toujours), et si le brief est le plus récent : prochaine édition (lundi qui suit la publication), bloc « Dernier brief » régénéré, entrée d'archive ;
- `briefs/index.html` : entrée d'archive avec `data-actors` normalisé (`Google DeepMind` → `Google`) et `data-tags`.

Relancer ne change rien ; relancer sur un ancien brief régénère son entrée sans toucher au reste. Le contenu éditorial passe par des remplacements-fonction (`$10/$50` n'est pas un groupe de capture).

## `node build/qa.js` — garde-fou QA (CLAUDE.md §3 étape 5)

Garde-fou **exécutable** à lancer **avant tout push**. Sort en code `1` si un check échoue : la publication est bloquée. Les checks structurels bloquent partout ; les règles éditoriales et de sourcing bloquent sur le brief le plus récent et ne font que signaler (`⚠`) sur les briefs déjà publiés.

Communs aux deux formats :
- `data.json` et `modeles/models.json` parsables, `data.json` trié ; `Σ by_tag == items_count`, `Σ by_actor == items_count`, clé `Google` (pas `Google DeepMind`) ;
- compteurs de la home, bloc « Dernier brief » (le plus récent, `<a>` fermé), cohérence de l'archive et de ses filtres ;
- **sourcing** : `primary:true` seulement sur un domaine d'éditeur (allowlist `OFFICIAL`, presse en primaire = ✗, domaine inconnu = ⚠) ; sans primaire : marqueur « sans annonce officielle » + ≥ 2 secondaires indépendantes, jamais d'agrégateur ;
- **ledger** : slug et URL primaire non couverts par les 4 briefs précédents ; aucun `undefined`/`NaN` rendu ;
- **base modèles** : id unique, date ISO, statut connu, `replaces` et `family` déclarés, éditeur canonique, chaque score avec sa source et `official` explicite, aucun score « officiel » pour un modèle non sorti.

Format 2 (`"schema": 2`) :
- sections « En 30 secondes », « Pour Lynxter », « Les annonces » présentes, chaque annonce rendue (ancre `id="<slug>"`) ;
- titre ≤ 90 caractères, chapeau ≤ 60 mots, En 30 secondes 1 à 3 points de ≤ 45 mots, highlights 1 à 3 ;
- Pour Lynxter ≤ 4 lignes, verdict connu, pourquoi ≤ 60 mots, statut charte connu, annonces liées existantes ; cartes modèles présentes dans `models.json`, « en clair » ≤ 50 mots ;
- phrases courtes (≤ 24 mots en moyenne), zéro superlatif, pas de code dans le texte courant, sigles absents du lexique = ⚠ ;
- fenêtre : `items[].date` ∈ [brief précédent, brief] (jour précédent inclus, le ledger écarte les doublons) ; résumé ≤ 3 phrases et ≤ 75 mots (En bref : ≤ 2 phrases et ≤ 35 mots) ; « pour nous » ≤ 40 mots.

Format 1 (briefs jusqu'au 2026-09-27) : pages détail liées et présentes, profondeur 🎯/🛠, `· info` ≤ 3 phrases.

```bash
node build/qa.js   # ✅ ou ❌ + exit 1
```

## `.claude/workflows/veille.js` — la routine en workflow

```
Recherche     1 sous-agent par éditeur, en parallèle (recherche + lecture de la source officielle ; repli recherche seule si egress bloqué)
              → arrêt rapide si < 3 scans principaux aboutissent : repli manuel indiqué
Consolidation recoupement + dédoublonnage (ledger) + verdicts Lynxter → ÉCRIT briefs/<date>.json (format 2),
              met à jour modeles/models.json et build/glossaire.json
Rédaction     node build/gen.js + build/site.js + build/sync.js
QA            node build/qa.js (bloquant ; corrections dans les JSON, jusqu'à 3 passes)
→ bash build/publish.sh <date> (par la session principale)
```

Lancement : `Workflow({ name: "veille", args: { date, since, ledger, scout } })`. Le quota de recherches web (~200 par tour) est partagé entre tous les sous-agents : une annonce non vérifiable faute de quota est « indéterminée », pas fausse.

## `build/gen.js` — générateur de pages

Source unique → HTML. Un brief `"schema": 2` donne une page unique (`templates/brief-v2.js`, cartes modèles lues dans `modeles/models.json`) ; un brief format 1 donne la page brief et une page détail par item 🎯/🛠 (`templates/brief.js`, `templates/item.js`).

```bash
node build/gen.js 2026-10-06                 # lit briefs/2026-10-06.json → écrit briefs/2026-10-06.html
node build/gen.js briefs/2026-10-06.json _preview   # depuis un chemin, suffixe non destructif
```

Référence du format 2 : `briefs/2026-10-04.json` et `briefs/2026-10-06.json`. `build/example-brief.json` reste la référence du format 1 (archives).
