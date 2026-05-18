# Veille IA — Routine Claude Code

Brief hebdomadaire automatique des nouveautés IA, scoré sous l'angle Lynxter (imprimante 3D industrielle, support S300X/S600D, workflows agents).

**Fréquence :** chaque lundi à 08:00 Europe/Paris  
**Repo :** https://github.com/leomarty1/veille-IA  
**Site :** https://leomarty1.github.io/veille-IA/

---

## ⚠️ SETUP OBLIGATOIRE — à faire en tout premier

L'environnement d'exécution utilise un proxy git local qui n'a pas accès en écriture. Avant tout push, reconfigurer le remote avec le PAT :

```bash
git remote set-url origin "https://x-access-token:$GITHUB_PAT@github.com/leomarty1/veille-IA.git"
```

`$GITHUB_PAT` doit être configuré comme variable d'environnement dans les settings de la routine (voir section Configuration ci-dessous). Ce PAT doit avoir la permission **Contents: Read and write** sur le repo `leomarty1/veille-IA`.

---

## Workflow complet

### 1. Déterminer la fenêtre

- Lire `briefs/data.json` pour trouver la date du dernier brief
- Fenêtre = date dernier brief → aujourd'hui
- Calculer : `ITEMS_PRECEDENTS` = somme des items_count de tous les briefs existants

### 2. Recherche (WebSearch par acteur)

Pour chaque acteur, chercher les annonces dans la fenêtre temporelle :

| Acteur | Requête type |
|--------|-------------|
| Anthropic | `site:anthropic.com OR site:code.claude.com annonce mai 2026` |
| OpenAI | `site:openai.com annonce nouveauté mai 2026` |
| Google DeepMind | `site:blog.google OR site:deepmind.google IA mai 2026` |
| Meta | `site:ai.meta.com annonce mai 2026` |
| Mistral | `site:mistral.ai annonce mai 2026` |

**Sources primaires officielles :**
- https://www.anthropic.com/news
- https://code.claude.com/docs/en/changelog
- https://openai.com/news/
- https://blog.google/technology/ai/
- https://deepmind.google/discover/blog/
- https://ai.meta.com/blog/
- https://mistral.ai/news/

### 3. Filtrage et scoring

Ne garder que les annonces dans la fenêtre. Éliminer : repackagings marketing, partenariats sans substance, annonces sans date claire.

**Score :**
- 🎯 `lynxter` — impact direct workflow Lynxter (Claude Code, agents, MCP, automation, support)
- 🛠 `useful` — changement notable pour anticiper l'évolution des outils
- `info` — culture IA, pas d'impact pratique immédiat

### 4. Fichiers à générer

#### A. `briefs/YYYY-MM-DD.html` — brief hebdomadaire

Se baser sur `briefs/2026-05-18.html` comme template gold standard. Structure :
- `read-progress` div
- `top-bar` avec nav 6 items (Accueil, Briefs, Acteurs, Modèles, Méthodo, Futur)
- Header avec `stat-strip` (total items, 🎯 count, 🛠 count, acteurs scannés)
- Section `tldr` (3 bullets maximum)
- Section `lynxter-hero` (🎯 implications Lynxter, 3 paragraphes)
- Section `synthese` (1 paragraphe par acteur actif)
- Sections par acteur dans l'ordre : Anthropic → OpenAI → Google DeepMind → Meta → Mistral
  - Acteur sans items → `<p class="actor-empty">Rien de notable cette semaine.</p>`
  - Logo via `https://cdn.simpleicons.org/SLUG/1b1818/f3f1ee` (slugs : anthropic, openai, googlegemini, meta, mistralai)
- `sources-footer`
- `brief-nav` (← brief précédent, → archive)
- `baseline-band` : `Brief généré le YYYY-MM-DD`
- Footer 3 colonnes

**Articles items :** utiliser `<article class="item">` pour 🎯/🛠, `<article class="item item-compact">` pour info.

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

#### C. Mise à jour `briefs/data.json`

Ajouter en tête du tableau `briefs` :

```json
{
  "date": "YYYY-MM-DD",
  "filename": "YYYY-MM-DD.html",
  "items_count": N,
  "by_tag": { "lynxter": N, "useful": N, "info": N },
  "by_actor": { "Anthropic": N, "OpenAI": N, "Google": N, "Meta": N, "Mistral": N },
  "mode": "hebdomadaire",
  "title": "Titre du brief",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"]
}
```

#### D. Mise à jour `briefs/index.html`

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

#### E. Mise à jour `index.html`

- `hero-next` : mettre la date du prochain lundi
- `stat-strip` global : incrémenter `briefs` (+1) et `items` (+N nouveaux)
- Section `featured` : pointer vers le nouveau brief avec titre, période, highlights
- Counts acteurs dans `actors-grid` : incrémenter selon `by_actor` du nouveau brief
- `archive-list` : ajouter le nouveau brief en tête (garder les 2 plus récents visibles)

### 5. Commit et push

```bash
# Fix le remote (obligatoire à chaque session)
git remote set-url origin "https://x-access-token:$GITHUB_PAT@github.com/leomarty1/veille-IA.git"

# Stager tous les fichiers nouveaux et modifiés
git add briefs/YYYY-MM-DD.html
git add items/YYYY-MM-DD-*.html
git add briefs/data.json briefs/index.html index.html

# Commit
git commit -m "brief: semaine du YYYY-MM-DD (N items, N 🎯, N 🛠, N ·)"

# Push
git push origin HEAD:main
```

**⚠️ Ne jamais écrire le PAT dans un fichier du repo.**

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

## Configuration requise

Dans les settings de la routine Claude Code on the web, configurer :

| Variable | Valeur |
|----------|--------|
| `GITHUB_PAT` | Token fine-grained GitHub avec `Contents: Read and write` sur `leomarty1/veille-IA` |

Pour générer ou renouveler le PAT : GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → New token → Repository: `leomarty1/veille-IA` → Permissions → Contents: **Read and write**.

---

## Rapport final (à afficher en fin de routine)

```
Brief YYYY-MM-DD — Rapport
Fenêtre : DD mois → DD mois YYYY
Items : N total (N 🎯 · N 🛠 · N ·)
Acteurs actifs : Anthropic (N), OpenAI (N), ...
Push : ✅ SHA → main
Site : https://leomarty1.github.io/veille-IA/
```
