# Veille IA — Routine Claude Code

Brief hebdomadaire automatique des nouveautés IA, scoré sous l'angle Lynxter (imprimante 3D industrielle, support S300X/S600D, workflows agents).

**Fréquence :** chaque lundi à 08:00 Europe/Paris  
**Modèle :** Claude Opus 4.7 (claude-opus-4-7)  
**Repo :** https://github.com/leomarty1/veille-IA  
**Site :** https://leomarty1.github.io/veille-IA/

---

## Workflow complet

### 1. Déterminer la fenêtre

Lire `briefs/data.json` via `mcp__github__get_file_contents` (owner: leomarty1, repo: veille-IA, path: briefs/data.json) pour trouver la date du dernier brief.

- Fenêtre = date dernier brief → aujourd'hui
- `ITEMS_PRECEDENTS` = somme des `items_count` de tous les briefs existants

### 2. Recherche approfondie — tous les acteurs

Faire **au minimum 30 WebSearch** réparties sur tous les acteurs. Ne pas s'arrêter au premier résultat — croiser les sources, vérifier les dates, éliminer les doublons.

#### Acteurs principaux (5 — couvrir chaque semaine)

Pour chaque acteur : 3 à 4 recherches distinctes.

| Acteur | Recherches à faire |
|--------|-------------------|
| **Anthropic** | `site:anthropic.com news [mois] [année]` · `site:code.claude.com changelog [mois]` · `Claude Code release [mois] [année]` · `Anthropic announcement [mois] [année]` |
| **OpenAI** | `site:openai.com news [mois] [année]` · `OpenAI release update [mois] [année]` · `ChatGPT GPT new feature [mois] [année]` |
| **Google DeepMind** | `site:blog.google AI [mois] [année]` · `site:deepmind.google blog [mois] [année]` · `Gemini release [mois] [année]` |
| **Meta** | `site:ai.meta.com blog [mois] [année]` · `Meta AI Llama release [mois] [année]` |
| **Mistral** | `site:mistral.ai news [mois] [année]` · `Mistral model release [mois] [année]` |

**Sources primaires officielles :**
- https://www.anthropic.com/news
- https://code.claude.com/docs/en/changelog
- https://openai.com/news/
- https://blog.google/technology/ai/
- https://deepmind.google/discover/blog/
- https://ai.meta.com/blog/
- https://mistral.ai/news/

#### Acteurs secondaires (couvrir si annonce notable dans la fenêtre)

| Acteur | Recherches |
|--------|-----------|
| **Perplexity** | `Perplexity AI news [mois] [année]` · `site:perplexity.ai/hub [mois]` |
| **xAI / Grok** | `xAI Grok release announcement [mois] [année]` · `site:x.ai/news [mois]` |
| **Cursor** | `Cursor IDE release changelog [mois] [année]` · `site:cursor.com/changelog` |
| **DeepSeek** | `DeepSeek model release [mois] [année]` |
| **Cohere** | `Cohere announcement [mois] [année]` |
| **Stability AI** | `Stability AI release [mois] [année]` |
| **Autres** | Si un acteur fait une annonce majeure signalée dans les résultats des autres recherches, couvrir. |

#### Thèmes transversaux à rechercher en plus

- `MCP Model Context Protocol news [mois] [année]` — annonces d'écosystème
- `AI coding agent CLI release [mois] [année]` — benchmark concurrentiel
- `AI voice agent API release [mois] [année]` — voix
- `open weights model release [mois] [année]` — open-source

### 3. Filtrage et scoring

Ne garder que les annonces **dans la fenêtre temporelle**. Éliminer : repackagings marketing, partenariats sans substance technique, annonces sans date claire, rumeurs non confirmées.

**Score :**
- 🎯 `lynxter` — impact direct workflow Lynxter (Claude Code, agents, MCP, automation, support S300X/S600D)
- 🛠 `useful` — changement notable à connaître, anticiper ou benchmarker
- `info` — culture IA, pas d'impact pratique immédiat

### 4. Lire les fichiers existants à modifier

Avant de générer, lire via `mcp__github__get_file_contents` (owner: leomarty1, repo: veille-IA) :
- `index.html` — compteurs actuels (briefs, items, acteurs)
- `briefs/index.html` — archive à mettre à jour
- `briefs/data.json` — déjà lu à l'étape 1

### 5. Fichiers à générer

#### A. `briefs/YYYY-MM-DD.html` — brief hebdomadaire

Se baser sur `briefs/2026-05-18.html` comme template gold standard (lire via MCP si besoin). Structure :
- `read-progress` div
- `top-bar` avec nav 6 items (Accueil, Briefs, Acteurs, Modèles, Méthodo, Futur)
- Header avec `stat-strip` (total items, 🎯 count, 🛠 count, acteurs scannés)
- Section `tldr` (3 bullets)
- Section `lynxter-hero` (🎯 implications Lynxter, 3 paragraphes)
- Section `synthese` — résumé de chaque acteur actif (principaux + secondaires)
- Sections par acteur dans l'ordre : Anthropic → OpenAI → Google DeepMind → Meta → Mistral
  - Acteur sans items → `<p class="actor-empty">Rien de notable cette semaine.</p>`
  - Logo via `https://cdn.simpleicons.org/SLUG/1b1818/f3f1ee` (slugs : anthropic, openai, googlegemini, meta, mistralai)
- Section "Acteurs secondaires" si au moins 1 item (Perplexity, xAI, Cursor, DeepSeek...)
- `sources-footer`
- `brief-nav` (← brief précédent, → archive)
- `baseline-band` : `Brief généré le YYYY-MM-DD`
- Footer 3 colonnes

**Articles items :** `<article class="item">` pour 🎯/🛠, `<article class="item item-compact">` pour info.

#### B. `items/YYYY-MM-DD-SLUG.html` — page détail par item 🎯 et 🛠

Se baser sur `items/2026-05-18-claude-code-agent-view-goal.html` comme template. Structure :
- Breadcrumb : Accueil / Briefs / YYYY-MM-DD / Titre court
- `item-detail-hero` avec actor-name, date, tag
- `detail-block` "Chiffres clés" avec `stat-strip` (4 stats)
- `detail-block` "Contexte étendu" (3 paragraphes minimum)
- Section `detail-lynxter` (🎯 ou 🛠 selon le tag)
- `source-block` avec URL source primaire
- `related-items` (2-3 items connexes si possible)
- `brief-nav` (item précédent / item suivant dans le brief)
- `baseline-band` : `Item · brief YYYY-MM-DD`

Créer une page détail pour chaque item 🎯 et 🛠 (pas pour les `info`).

#### C. `briefs/data.json` mis à jour

Ajouter en tête du tableau `briefs` :

```json
{
  "date": "YYYY-MM-DD",
  "filename": "YYYY-MM-DD.html",
  "items_count": N,
  "by_tag": { "lynxter": N, "useful": N, "info": N },
  "by_actor": { "Anthropic": N, "OpenAI": N, "Google": N, "Meta": N, "Mistral": N, "Perplexity": N, "xAI": N, "Cursor": N },
  "mode": "hebdomadaire",
  "title": "Titre du brief",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"]
}
```

#### D. `briefs/index.html` mis à jour

Ajouter en tête de `<ul class="archive-list">` :

```html
<li class="archive-entry"
    data-date="YYYY-MM-DD"
    data-items="N"
    data-actors="Anthropic,OpenAI,..."
    data-tags="lynxter,useful,info">
  <a href="YYYY-MM-DD.html">
    <span class="archive-date">YYYY-MM-DD</span>
    <div class="archive-main">
      <h3>Titre du brief</h3>
      <ul class="archive-highlights">
        <li>Highlight 1</li>
        <li>Highlight 2</li>
        <li>Highlight 3</li>
      </ul>
    </div>
    <div class="archive-stats">
      <span class="big">N</span>
      <span>items · N 🎯</span>
    </div>
  </a>
</li>
```

#### E. `index.html` mis à jour

- `hero-next` : date du prochain lundi
- `stat-strip` global : incrémenter `briefs` (+1) et `items` (+N nouveaux)
- Section `featured` : pointer vers le nouveau brief (titre, période, highlights)
- Counts acteurs dans `actors-grid` : incrémenter selon `by_actor` du nouveau brief
- `archive-list` : ajouter le nouveau brief en tête (garder les 2 plus récents visibles)

### 6. Push via MCP GitHub

Pousser **tous les fichiers nouveaux et modifiés en un seul appel** `mcp__github__push_files` :

```
mcp__github__push_files(
  owner: "leomarty1",
  repo: "veille-IA",
  branch: "main",
  message: "brief: semaine du YYYY-MM-DD (N items, N 🎯, N 🛠, N ·)",
  files: [
    { path: "briefs/YYYY-MM-DD.html",           content: "..." },
    { path: "items/YYYY-MM-DD-SLUG-1.html",      content: "..." },
    ...
    { path: "briefs/data.json",                  content: "..." },
    { path: "briefs/index.html",                 content: "..." },
    { path: "index.html",                        content: "..." }
  ]
)
```

**Si mcp__github__push_files retourne 403** : le connecteur GitHub n'a pas les droits d'écriture. Avertir l'utilisateur et documenter les fichiers générés sans pusher. Ne pas utiliser de PAT ou de clés API.

⚠️ Pas de `git add`, pas de `git commit`, pas de `git push`. Uniquement `mcp__github__push_files`.

---

## Structure du repo

```
/
├── CLAUDE.md               ← ce fichier (instructions routine)
├── index.html              ← toujours = dernier brief + stats globales
├── assets/
│   ├── style.css           ← styles partagés (ne pas modifier)
│   └── app.js              ← JS archive/filtre (ne pas modifier)
├── briefs/
│   ├── index.html          ← archive avec filtres
│   ├── data.json           ← métadonnées machine-readable
│   └── YYYY-MM-DD.html     ← un fichier par brief
├── items/
│   └── YYYY-MM-DD-SLUG.html ← pages détail items 🎯 et 🛠
├── acteurs/index.html
├── modeles/index.html
├── methodo/index.html
└── futur/index.html
```

---

## Rapport final (à afficher en fin de routine)

```
Brief YYYY-MM-DD — Rapport
Fenêtre : DD mois → DD mois YYYY
Items : N total (N 🎯 · N 🛠 · N ·)
Acteurs principaux actifs : Anthropic (N), OpenAI (N), ...
Acteurs secondaires actifs : Perplexity (N), xAI (N), ...
Push : ✅ SHA → main  /  ⚠️ Push échoué — voir fichiers générés
Site : https://leomarty1.github.io/veille-IA/
```
