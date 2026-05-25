# Veille IA — Routine Claude Code

Brief hebdomadaire automatique des nouveautés IA, scoré sous l'angle Lynxter (imprimante 3D industrielle, support S300X/S600D, workflows agents).

**Fréquence :** chaque lundi à 08:00 Europe/Paris  
**Modèle :** Claude Opus 4.7 (claude-opus-4-7)  
**Repo :** https://github.com/leomarty1/veille-IA  
**Site :** https://leomarty1.github.io/veille-IA/

---

## Ton éditorial & profondeur

### Public cible

Léo Marty (Lynxter) et la communauté de passionnés IA qui suit le brief : **développeurs, ingénieurs, support technique avancé, dirigeants industriels curieux**. Pas le grand public — pas besoin de vulgariser les bases. Mais pas non plus un papier de recherche — l'objectif reste l'actionable, pas l'érudition.

### Vocabulaire

**À utiliser sans définir** (le lecteur connaît) : SWE-bench, AIME, MMLU, GPQA, MoE (Mixture of Experts), MCP (Model Context Protocol), RLHF, RAG, fenêtre de contexte, tokens, throughput, latence, fine-tuning, distillation, agentic loop, open weights, prompt caching, attention multi-head, embeddings, vector store, function calling, tool use, chain of thought, scaling laws.

**À expliquer brièvement (5-15 mots)** quand le terme est niche ou très récent : un nouveau benchmark obscur, une technique de recherche publiée le mois même, un acronyme propriétaire d'un acteur (ex. "Dreaming d'Anthropic — agents qui poursuivent leur tâche entre les sessions actives").

**À éviter** : tournures didactiques façon Wikipedia ("L'intelligence artificielle, ou IA, est…"), parenthèses explicatives pour tout sigle commun, phrases d'amorce du type "Pour comprendre cette annonce, il faut d'abord savoir que…".

### Style d'écriture

- **Phrases denses, factuelles, comparatives.** Préférer "Opus 4.7 monte à 87.6 % sur SWE-bench Verified, +6.8 pts vs 4.6, devant Gemini 3 Pro (~82 %)" à "Le nouveau modèle d'Anthropic affiche des performances en hausse sur le benchmark de code".
- **Chiffres concrets systématiques.** Scores benchmarks, pricing par M tokens, dates précises, tailles de modèle (paramètres actifs + total pour les MoE), contexte (en tokens), latence si disponible.
- **Comparaisons inter-acteurs** dès que possible. Tout item gagne à être positionné face à la concurrence frontière du moment.
- **Pas de superlatifs marketing.** Pas de "révolutionnaire", "incroyable", "game-changer". Préférer le constat sec : "saute la barre des 80 % sur SWE-bench Pro pour la première fois en open weights".
- **Implications Lynxter actionnables.** Pas du blabla — des choses à faire ou à savoir précisément (audit prompts, benchmark client, préparation argumentaire RFP, etc.).

### Profondeur attendue par item

- **🎯 lynxter** : 3-6 phrases de contexte dans le brief + page détail de **3 paragraphes minimum** (contexte étendu + Pourquoi Lynxter + chiffres). Doit citer 2+ chiffres concrets et 1 comparaison inter-acteurs.
- **🛠 useful** : 3-5 phrases de contexte dans le brief + page détail de **2-3 paragraphes**. Au moins 1 chiffre concret.
- **· info** : 1-2 phrases compactes. Pas de page détail. Reste factuel.

---

## Workflow complet

### 0. Pre-flight — vérifier les credentials AVANT de lancer la recherche

**Règle d'or :** ne JAMAIS faire 30 WebSearch + 20 WebFetch + 12 fichiers générés pour découvrir à la fin que le push échoue. Tester les credentials d'abord, échouer vite.

1. Tester l'écriture via MCP GitHub :
   ```
   mcp__github__create_or_update_file(owner: "leomarty1", repo: "veille-IA", branch: "main",
     path: ".keepalive", content: "ok", message: "preflight: check write perms")
   ```
   Si succès : MCP est la voie principale, marquer `WRITE_PATH = "mcp"`.
2. Sinon, tester le PAT fourni dans le prompt :
   ```
   curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: token <PAT>" https://api.github.com/repos/leomarty1/veille-IA
   ```
   Si HTTP 200 : marquer `WRITE_PATH = "pat"`.
3. Si les deux échouent : **arrêter immédiatement**, ne pas faire la recherche. Reporter à l'utilisateur que le PAT a expiré ET que MCP est en read-only, en demandant l'une des deux corrections (rotation PAT ou élévation des droits MCP).

### 1. Déterminer la fenêtre

Lire `briefs/data.json` via `mcp__github__get_file_contents` (owner: leomarty1, repo: veille-IA, path: briefs/data.json) pour trouver la date du dernier brief.

- Fenêtre = date dernier brief → aujourd'hui
- `ITEMS_PRECEDENTS` = somme des `items_count` de tous les briefs existants

### 2. Recherche approfondie — tous les acteurs

**Règle d'or :** chaque item du brief doit s'appuyer sur **au moins 1 source primaire fetched** (annonce officielle, release notes, blog éditeur) + idéalement 1 source secondaire qui confirme/contextualise. Pas de seconde main seule, pas de rumeur Twitter sans confirmation.

Faire **au minimum 30 WebSearch** réparties sur tous les acteurs. Ne pas s'arrêter au premier résultat — croiser les sources, vérifier les dates, éliminer les doublons et repackagings.

**Méthode de croisement :**
1. WebSearch large pour identifier les annonces de la semaine
2. WebFetch sur les sources primaires retournées (blogs officiels, release notes)
3. Si l'info est dans une source secondaire (TechCrunch, The Verge, Ars Technica, etc.), backsearcher la source primaire correspondante
4. Pour les benchmarks cités : vérifier les chiffres avec 2 sources indépendantes si possible
5. Pour les rumeurs (Behemoth size, Claude 5 release date, etc.) : marquer explicitement "rumeur, source X" plutôt que d'en faire un item ferme

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

### 6. Push — stratégie MCP GitHub avec fallback

**Voie principale (préférée) :** push via `mcp__github__push_files` en un seul appel atomique :

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

**Fallback A — MCP file by file (si push_files renvoie 403 mais le pre-flight create_or_update_file a marché) :** appeler `mcp__github__create_or_update_file` séquentiellement pour chaque fichier. Pour les 3 fichiers existants (index.html, briefs/index.html, briefs/data.json), récupérer leur SHA via `git rev-parse main:<path>` et le passer en argument `sha`. Pour les fichiers nouveaux (brief + pages détail), pas de SHA requis. Accepter que ça produit N commits au lieu d'un seul — c'est acceptable si l'atomicité n'est pas possible.

**Fallback B — git CLI avec PAT (si MCP est complètement bloqué et que `WRITE_PATH = "pat"`) :** push via git CLI avec PAT injecté dans l'URL du remote :
```
git remote set-url origin https://x-access-token:<PAT>@github.com/leomarty1/veille-IA.git
git add -A && git commit -m "..." && git push origin main
git remote set-url origin https://github.com/leomarty1/veille-IA.git
```
**Important** : restaurer l'URL du remote SANS le PAT après le push (le PAT ne doit jamais traîner dans `.git/config` au repos).

**Sous aucun prétexte :**
- Ne pas écrire le PAT dans un fichier du repo (CLAUDE.md, README, scripts, etc.)
- Ne pas pousser de fichiers hors du périmètre listé en étape 5
- Ne pas continuer à générer du contenu si le pre-flight a échoué (étape 0)

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

## Maintenance — rotation PAT et permissions MCP

Le PAT GitHub a une durée de vie limitée (max 1 an pour fine-grained PATs). Quand l'étape 0 (pre-flight) signale qu'il est expiré (HTTP 401), il faut le faire tourner :

1. **Régénérer un PAT fine-grained** sur https://github.com/settings/personal-access-tokens/new
   - Resource owner : `leomarty1`
   - Repository access : sélectionner `leomarty1/veille-IA` uniquement
   - Repository permissions : `Contents: Read and write` (suffit, ne pas donner plus)
   - Expiration : 1 an (ou pas d'expiration si tu acceptes le risque sécurité)
2. **Mettre à jour le prompt routine** sur https://claude.ai/code/routines, retrouver la routine "veille-IA hebdomadaire", remplacer la chaîne `github_pat_…` par la nouvelle.
3. **Révoquer l'ancien PAT** dans la liste GitHub PAT pour éviter qu'il traîne.

**État au 2026-05-25 :** la GitHub App Claude (owned by anthropics) est installée sur ce repo avec `Contents: Read and write`. La routine doit utiliser MCP en voie principale (`mcp__github__push_files` puis fallback A `create_or_update_file`). Le PAT dans le prompt routine est devenu redondant — il peut être supprimé du prompt et révoqué côté GitHub (https://github.com/settings/personal-access-tokens). Le pre-flight de l'étape 0 confirmera que MCP write fonctionne et basculera dessus automatiquement.

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
