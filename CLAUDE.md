# Veille IA — Routine Claude Code

Brief hebdomadaire automatique des nouveautés IA, scoré sous l'angle Lynxter (imprimante 3D industrielle, support S300X/S600D, workflows agents).

**Fréquence :** chaque lundi à 01:00 Europe/Paris  
**Modèle :** dernier Claude Opus disponible (≥ claude-opus-4-8 — ne pas figer la version dans le prompt ; logger le modèle réel)  
**Repo :** https://github.com/leomarty1/veille-IA  
**Site :** https://leomarty1.github.io/veille-IA/  
**Exécution :** voie fiable par défaut = étapes 1 à 7 ci-dessous (manuelle, éprouvée sur 4 briefs). Option parallèle = workflow `.claude/workflows/veille.js`. Dans les deux cas, QA bloquante `node build/qa.js` avant tout push.  
**Outillage :** `build/` (zéro dépendance) — voir `build/README.md`

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
- **· info** : **1 à 3 phrases compactes maximum** (règle dure, vérifiée en QA — compter les phrases du `.item-context` ; si > 3, raccourcir ou re-tagger 🛠). Pas de page détail. Reste factuel.

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

**Voie d'écriture réelle (WRITE_PATH) — à clarifier et logger.** En environnement observé, les outils `mcp__github__*` ne sont PAS toujours attachés : si le pre-flight 0.1 échoue, c'est le PAT (fallback git CLI) qui écrit à *chaque* run — la « voie principale MCP » devient alors fictive. Conséquences obligatoires :
- Logger `WRITE_PATH = mcp | pat` dans le rapport final (transparence sur ce qui a réellement poussé).
- Le PAT ne doit JAMAIS vivre en clair dans le corps du prompt routine : le stocker en variable secrète de routine. S'il a déjà été exposé en clair, le considérer comme compromis → rotation.
- Ne révoquer le PAT (cf. Maintenance) qu'après avoir prouvé que MCP write fonctionne deux runs de suite.

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

**Gate source primaire (bloquant pour 🎯/🛠).** Un item 🎯 ou 🛠 ne peut être publié que si son bloc `item-source` contient au moins 1 URL de la liste « Sources primaires officielles » ci-dessous (ou un sous-domaine officiel de l'acteur). Si aucune source primaire n'existe vraiment : soit back-search la release/note officielle, soit publier en marquant explicitement « · sans annonce officielle » avec ≥ 2 secondaires **indépendantes** (jamais un agrégateur ; bannis : chatforest.com et assimilés). Ne JAMAIS étiqueter une source secondaire comme « Source primaire » sur la page détail.

**Anti-doublon inter-briefs (ledger).** À l'étape 1, charger les `items[]` (slug, titre, primary_url) des 3-4 derniers briefs depuis `briefs/data.json`. À l'étape 3, éliminer toute annonce dont le slug OU l'URL primaire a déjà été couvert — ne pas re-rapporter un item à cheval sur deux fenêtres. (Nécessite que `data.json` stocke `items[]` par brief — cf. étape 5.C.)

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

**Cas « semaine calme » (< 3 items au total sur les 5 acteurs principaux).** Ne pas padder. Produire un brief minimal honnête : titre type « Semaine calme côté frontière », TL;DR 1-2 bullets, `lynxter-hero` court (1 paragraphe ou « rien d'actionnable cette semaine »), sections acteurs en `actor-empty`, archive et compteurs mis à jour normalement. Mieux vaut un brief court vrai qu'un brief gonflé.

### 4. Lire les fichiers existants à modifier

Avant de générer, lire via `mcp__github__get_file_contents` (owner: leomarty1, repo: veille-IA) :
- `index.html` — compteurs actuels (briefs, items, acteurs)
- `briefs/index.html` — archive à mettre à jour
- `briefs/data.json` — déjà lu à l'étape 1

### 5. Fichiers à générer

**Voie recommandée — single-source (Track A).** Écrire la source unique du brief `briefs/<date>.json` (schéma ET niveau de richesse de référence : `build/example-brief.json` — un brief complet à égaler en profondeur, pas plus court), puis `node build/gen.js <date>` génère le brief + les pages détail des items 🎯/🛠 (chrome partagé via `build/lib.js`, plus de double saisie brief↔item). Ensuite mettre à jour `data.json` / `index.html` / `briefs/index.html` / `modeles/` comme ci-dessous, puis QA (`node build/qa.js`). La méthode manuelle ci-dessous reste valable pour les sections pas encore générées.


#### A. `briefs/YYYY-MM-DD.html` — brief hebdomadaire

Se baser sur `briefs/2026-05-18.html` comme template gold standard (lire via MCP si besoin). Structure :
- `read-progress` div
- `top-bar` avec nav 7 items (Accueil, Briefs, Acteurs, Modèles, Méthodo, Futur, Graphe) — le lien Graphe pointe vers `../graphe/` depuis les sous-dossiers (même niveau que les autres)
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
  "highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "items": [
    { "slug": "YYYY-MM-DD-slug", "title": "Titre item", "primary_url": "https://...", "tag": "lynxter|useful|info", "actor": "Anthropic" }
  ]
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

#### F. `modeles/index.html` — classement hebdomadaire

Lire `modeles/index.html` via `mcp__github__get_file_contents`. Remplacer le bloc compris entre `<!-- CLASSEMENT-START -->` et `<!-- CLASSEMENT-END -->` par le classement mis à jour.

**Données à mettre à jour :**
- Attribut `data-classement-date` → date du brief (YYYY-MM-DD)
- Titre `<h2>` → "Top 5 modèles — semaine du JJ mois"
- Rangs et scores SWE-bench Verified (source Scale AI ou blog officiel)
- Badge mouvement : ↑ si le modèle monte, ↓ s'il descend, = s'il est stable, 🆕 si entrant cette semaine
- Ligne de contexte 1 ligne si événement notable dans la fenêtre (release, benchmark officiel)

**Règle :** ne modifier les positions que si un modèle de la fenêtre a un nouveau score confirmé ou un nouveau modèle est sorti. Si aucun changement notable, garder le classement identique et mettre à jour uniquement `data-classement-date` et le titre `<h2>`.

**Tableau comparatif (optionnel) :** si un nouveau modèle est annoncé dans la fenêtre avec benchmarks confirmés, ajouter une ligne au `<table class="compare-table">` avec ses specs (SWE-bench Verified, SWE-bench Pro, contexte, pricing, open weights). Mettre en évidence les nouvelles entrées avec `style="outline:1px solid var(--lx-primary);outline-offset:-1px;"` sur le `<tr>` et le badge `🆕 JJ mois` en span sur le nom. Ne pas modifier les lignes existantes sauf correction de score officielle.

Inclure `modeles/index.html` dans le push_files final.

#### G. `modeles/models-data.json` — nouveau modèle détecté

Lire `modeles/models-data.json` via `mcp__github__get_file_contents`. Si un nouveau modèle avec score SWE-bench Verified confirmé ou estimable est sorti dans la fenêtre temporelle, ajouter un objet au tableau `models[]` :

```json
{
  "id": "slug-unique",
  "name": "Nom complet du modèle",
  "actor": "Anthropic|OpenAI|Google|Meta|Mistral|DeepSeek",
  "date": "YYYY-MM-DD",
  "swe_bench_verified": 0.0,
  "approximate": true,
  "context_k": 0,
  "pricing_in": null,
  "pricing_out": null,
  "open_weights": false,
  "notes": "…"
}
```

- `approximate: true` si le score est estimé/non-officiel ; `false` si publié officiellement
- `pricing_in` / `pricing_out` : prix en $ par million de tokens input/output (null si inconnu)
- `context_k` : taille de fenêtre de contexte en milliers de tokens (ex. 1000 pour 1M tokens)
- `open_weights: true` uniquement pour les modèles dont les poids sont publiés
- **Règle dure anti-hallucination (fiabilité).** Ne JAMAIS inscrire un modèle avec `approximate:false` sans un score SWE-bench **officiellement publié**. Un modèle non sorti / preview interne / leak / rumeur → `approximate:true` + `"status":"unreleased"` (ou `"rumored"`), et il ne doit pas s'afficher comme point « officiel » du graphe. Toute entrée porte une `notes` indiquant la source du score. (Ex. corrigé le 2026-06-05 : `claude-mythos-preview` repassé `approximate:true`.)

Mettre à jour `meta.last_updated` à la date du brief.

**Si aucun nouveau modèle avec score SWE-bench dans la fenêtre :** ne pas modifier ce fichier.

Inclure `modeles/models-data.json` dans le push_files final.

### 5.5 Auto-QA bloquante — AVANT le push (ne pas pousser si un check est rouge)

**Lancer `node build/qa.js`** — garde-fou exécutable zéro-dépendance (sort en code 1 et bloque le push si rouge). Il couvre les vérifications ci-dessous ; corriger puis relancer jusqu'au vert avant de pousser :

1. **Liens d'items** : chaque `href="../items/AAAA-MM-JJ-*.html"` du brief pointe vers un fichier réellement présent dans le set de push (pas de 404 silencieux).
2. **Compteurs cohérents** : `Σ by_tag == items_count` ET `Σ by_actor == items_count` (data.json) ; le `stat-strip` du brief == ces totaux ; `by_actor` présent et complet (jamais d'entrée sans `by_actor`).
3. **JSON parsable** : `data.json` et `models-data.json` parsent sans erreur ; `items_count` == nombre d'`<article class="item">` du brief.
4. **HTML bien formé** : balises équilibrées sur le brief et chaque page détail générée ; breadcrumb/nav prev-next pointent vers des cibles existantes.
5. **Gate source primaire** (cf. étape 2) : tout item 🎯/🛠 a ≥ 1 source primaire OU le marqueur « sans annonce officielle ».
6. **models-data.json** : aucun modèle ajouté avec `approximate:false` sans score officiel publié (cf. étape G).
7. **Compteurs home** : les counts de `index.html actors-grid` == Σ `by_actor` sur l'ensemble des briefs ; `data-actors` de l'archive inclut tous les acteurs ayant une section (même à 0 item).

Reporter le résultat QA dans le rapport final (`QA : ✅ / ❌ + check en cause`).

### 6. Push — stratégie MCP GitHub avec fallback

**⚠ Publication = point critique (un run sans push = pas de brief publié).** Le PAT inline du prompt est **MORT** — ne plus l'utiliser. La voie réelle d'écriture est le MCP GitHub fourni par la **GitHub App Claude installée sur le repo** (Contents: write). Si l'écriture échoue (App retirée/sans write, MCP absent), **échouer bruyamment** et reporter l'échec dans le rapport final — ne JAMAIS terminer en succès silencieux sans brief publié. Secours possible : un PAT fine-grained **frais** stocké en variable secrète de routine (jamais en clair).

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
    { path: "modeles/index.html",                content: "..." },
    { path: "modeles/models-data.json",          content: "..." },
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

### 7. Vérification post-déploiement (après le push)

1. Attendre ~90 s (build GitHub Pages), puis `curl -s -o /dev/null -w "%{http_code}"` sur https://leomarty1.github.io/veille-IA/ — attendre `200`.
2. Vérifier que le HTML servi contient bien la date du nouveau brief (la home doit refléter le dernier brief).
3. Reporter `Déploiement : ✅ 200 + date OK` ou `❌` dans le rapport final.

**Rollback** si un brief erroné est publié : `git revert <sha>` (un brief = un commit atomique grâce à `push_files`) puis re-push ; GitHub Pages régénère. Ne pas réécrire l'historique de `main`.

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
├── modeles/
│   ├── index.html
│   └── models-data.json    ← données SWE-bench pour le graphe D3
├── methodo/index.html
├── futur/index.html
└── graphe/
    └── index.html          ← graphe D3 interactif (charge models-data.json)
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

**Mise à jour 2026-06-05 (audit).** En environnement observé, `mcp__github__*` n'est pas garanti attaché → le PAT (fallback) peut rester la voie d'écriture réelle. Tant que c'est le cas : (1) NE PAS laisser le PAT en clair dans le corps du prompt routine — le passer en variable secrète ; (2) un PAT déjà exposé en clair est à considérer comme compromis → le régénérer ; (3) ne le révoquer définitivement qu'après 2 runs prouvant `WRITE_PATH=mcp`. Logger `WRITE_PATH` à chaque run.

## Rapport final (à afficher en fin de routine)

```
Brief YYYY-MM-DD — Rapport
Fenêtre : DD mois → DD mois YYYY
Items : N total (N 🎯 · N 🛠 · N ·)
Acteurs principaux actifs : Anthropic (N), OpenAI (N), ...
Acteurs secondaires actifs : Perplexity (N), xAI (N), ...
QA : ✅ (liens, compteurs, JSON, sources primaires) / ❌ <check en cause>
WRITE_PATH : mcp | pat
Push : ✅ SHA → main  /  ⚠️ Push échoué — voir fichiers générés
Déploiement : ✅ 200 + date OK / ❌
Coût : ~N tokens in / N out · modèle réel claude-opus-4-x
Site : https://leomarty1.github.io/veille-IA/
```
