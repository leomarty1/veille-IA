# Veille IA — Routine Claude Code

Brief hebdomadaire automatique des nouveautés IA, scoré sous l'angle Lynxter (imprimante 3D industrielle, support S300X/S600D, workflows agents).

**Fréquence :** chaque lundi à 01:00 Europe/Paris  
**Modèle :** dernier Claude Opus disponible (≥ claude-opus-4-8 — ne pas figer la version dans le prompt ; logger le modèle réel)  
**Repo :** https://github.com/leomarty1/veille-IA  
**Site :** https://leomarty1.github.io/veille-IA/  
**Exécution :** `Workflow({name:"veille", args:{date, since, ledger}})` (`.claude/workflows/veille.js`) — fan-out par acteur, consolidation, rédaction, QA. Les étapes 1 à 7 ci-dessous restent la référence manuelle.  
**Publication :** `bash build/publish.sh YYYY-MM-DD` — QA bloquante puis push jusqu'à **`main`** (la branche servie par Pages). Voir étape 6 : commiter sur une branche de travail ne publie rien.  
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

### Checklist par item, avant la QA (ce que `qa.js` bloquera sinon)

- **Titre = fait + chiffre.** « Fable 5.1 — cache reads à $0.25/M tokens (−75 %) », pas « Anthropic annonce Fable 5.1 ».
- **Comparaison inter-acteurs sur chaque 🎯**, y compris les items Claude Code : situer face à Codex CLI, Cursor ou Antigravity (fonction équivalente ? absente ? prix ?). Les items changelog hebdomadaires sont ceux qui manquent le plus souvent cette comparaison (7 sur 9 dans l'archive).
- **« Pourquoi Lynxter » = une action, pas un constat.** Chaque paragraphe se termine par quelque chose à faire, vérifier, chiffrer ou préparer — avec l'objet précis (Routine Cowork, prompt de support, argumentaire RFP, benchmark sur tickets réels). Une réserve honnête (« pas contractualisable avant l'automne ») vaut mieux qu'une promesse.
- **Tuiles `stats` : 4, dont ≥ 2 chiffres officiels.** Une date ou un statut (« Automne 2026 », « gated Fairwind ») peut occuper une tuile ; un chiffre tiers jamais sans « ~ » ou « estim. ».
- **Sources : la page datée, pas le hub.** Le changelog Claude Code a une ancre par version : citer `code.claude.com/docs/en/changelog#2-1-259` (format `#2-1-259`, vérifié le 2026-09-07), la QA ne signale plus l'URL. Pour un item qui couvre plusieurs versions, ancrer la première et nommer les autres dans le contexte. Cursor : page datée `cursor.com/changelog/<mm-dd-yy>`.
- **`related` : uniquement des items 🎯/🛠** (ceux qui ont une page), de ce brief ou des précédents. Un `related` vers un `·` est un lien mort. `nav.next` du dernier item = retour au brief.
- **Dates : dans la fenêtre**, strictement après le brief précédent. Une annonce du jour du brief précédent lui appartenait.
- **Zéro superlatif**, zéro « pour comprendre… », zéro sigle courant expliqué.

---

## Workflow complet

### 0. Pre-flight — vérifier les credentials AVANT de lancer la recherche

**Règle d'or :** ne JAMAIS faire 30 WebSearch + 20 WebFetch + 12 fichiers générés pour découvrir à la fin que le push échoue. Tester les credentials d'abord, échouer vite — **sans rien écrire dans le dépôt**.

1. Tester l'écriture git via le remote déjà configuré (c'est lui qui publie, cf. étape 6) — un push à blanc fait la poignée de main `receive-pack`, donc authentifie, sans créer de commit :
   ```bash
   git fetch origin main && git push --dry-run origin HEAD
   ```
   Succès (`Everything up-to-date`, `[new branch]` ou `..` sans erreur d'auth) → `WRITE_PATH = git-cli`. Erreur `403`/`401`/`could not read Username` → écriture impossible.
2. Tester l'egress, pour savoir tout de suite si le gate « source primaire fetchée » (étape 2) sera tenable :
   ```bash
   for u in https://www.anthropic.com/news https://openai.com/news/ https://code.claude.com/docs/en/changelog; do printf '%s ' "$u"; curl -s -o /dev/null -w '%{http_code}\n' --max-time 15 "$u"; done
   ```
   Des `403`/`000` sur les domaines éditeurs = egress restreint → repli « ≥ 2 WebSearch indépendants par item » et le dire dans le rapport (`Egress : bloqué (…)`).
3. Si l'écriture échoue : **arrêter immédiatement**, ne pas faire la recherche, notifier (remote sans droit d'écriture — vérifier l'installation de l'App GitHub Claude sur le repo, cf. Maintenance).

**Ce que le pre-flight ne fait plus.** L'ancienne méthode écrivait `.keepalive` sur `origin/main` via MCP à chaque run : 9 commits de bruit, et la cause directe du push non-fast-forward du 2026-08-09. Les outils `mcp__github__*` se déconnectent d'ailleurs en cours de session (observé le 2026-09-06) : ils ne sont ni la voie d'écriture ni un test fiable. Le PAT du prompt routine est mort et compromis (cf. Maintenance) : ne pas le tester, ne pas l'utiliser.

Logger `WRITE_PATH` dans le rapport final.

### 1. Déterminer la fenêtre

Lire `briefs/data.json` (le dépôt est cloné localement : `Read`, pas MCP) pour trouver la date du dernier brief.

- Fenêtre = date dernier brief → aujourd'hui
- `ITEMS_PRECEDENTS` = somme des `items_count` de tous les briefs existants

**Puis, avant toute recherche web, la base de faits vérifiés :**

```bash
node build/scout.js <since> <date>          # lisible
node build/scout.js <since> <date> --json   # → args.scout du workflow
```

`scout.js` lit de façon déterministe les sources officielles qui répondent même en egress restreint — changelog Claude Code (ancre par version), release notes de la plateforme Claude (API, SDK, Cowork, Managed Agents), CHANGELOG du SDK Python — et sort les entrées **datées dans la fenêtre**, avec leur URL ancrée. Ce qui en sort n'est pas un résultat de recherche : c'est ce que la page dit. Ces entrées se couvrent en priorité, avec l'URL du scout en source primaire ; les sources marquées `✗` (Codex, Gemini API, Mistral, Cursor — injoignables au 2026-09-07) restent à couvrir par WebSearch. Passer le JSON au workflow (`args.scout`) ou le garder sous les yeux en mode manuel.

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

**Sources primaires officielles — dans l'ordre où elles produisent réellement des items (audit des 13 briefs sourcés, 2026-09-07).** Les pages *datées* d'abord ; les hubs (`/news`, `/blog`, `/changelog`) servent à trouver la page datée, pas à être citées — la QA signale une URL hub en source primaire.

| Acteur | Page datée à citer | Flux à ouvrir chaque semaine (ce qui a produit des items) |
|---|---|---|
| Anthropic | `anthropic.com/news/<slug>`, `claude.com/blog/<slug>` | `platform.claude.com/docs/en/release-notes/overview` (API, Cowork, Managed Agents, SDK — 1 à 3 items/semaine), `code.claude.com/docs/en/changelog` (Claude Code — 1 item/semaine, toujours 🎯) |
| OpenAI | `openai.com/index/<slug>` | `developers.openai.com/codex/changelog`, `help.openai.com/en/articles/9624314-model-release-notes`, `help.openai.com/en/articles/6825453-chatgpt-release-notes` |
| Google DeepMind | `blog.google/technology/ai/<slug>`, `deepmind.google/models/model-cards/<modèle>/` | `ai.google.dev/gemini-api/docs/changelog`, `docs.cloud.google.com/gemini/enterprise/docs/release-notes` |
| Meta | `research.meta.ai/blog/<slug>` (ligne Muse), `ai.meta.com/blog/<slug>` | — (Meta n'a pas de changelog : silence = actor-empty, fréquent) |
| Mistral | `mistral.ai/news/<slug>` | `docs.mistral.ai/resources/changelogs` |
| Perplexity | `perplexity.ai/hub/blog/<slug>` | `docs.perplexity.ai/changelog/changelog` |
| xAI | `x.ai/news/<slug>` | — |
| Cursor | `cursor.com/changelog/<mm-dd-yy>` | `cursor.com/changelog` |
| DeepSeek | `api-docs.deepseek.com/news/news<AAMMJJ>` | `api-docs.deepseek.com/quick_start/pricing` (changements de prix) |
| MCP | `blog.modelcontextprotocol.io/posts/<slug>` | — |

**Fiabilité des chiffres — règle dure.** Un score cité sans qualificatif est un score **publié par l'éditeur**. Un score de leaderboard tiers (Artificial Analysis, Vellum, LLM-Stats, benchlm…) s'écrit « estimation tierce » ou « selon <source> », jamais dans une tuile `stats` sans cette mention. Quand l'éditeur ne publie pas un benchmark de référence (ex. Fable 5.1 et GPT-6 Astra sans SWE-bench Verified, 2026-09-06), **le dire explicitement** : l'absence est une information. Deux modèles ne se comparent que sur un benchmark où les deux ont un score officiel.

**Niveau de confiance par annonce.** `confirmed` = page officielle datée (fetchée, ou confirmée par ≥ 2 résultats de recherche indépendants si l'egress est bloqué) · `single-source` = une seule secondaire → creuser ou passer en `·` avec « rapporté par <source> » · `rumor` = date de sortie annoncée, taille supposée, leak → pas un item, sauf en `·` avec « annonce non matérialisée ».

**En mode egress bloqué** (WebFetch → `EGRESS_BLOCKED`, deux runs sur deux) : le résultat de recherche n'est pas la page. Deux résultats de domaines différents qui rapportent le même fait avec les mêmes chiffres valent confirmation ; un seul résultat, ou plusieurs qui recopient visiblement le même communiqué, ne valent pas. Garder l'URL officielle en `primary` si elle apparaît dans les résultats, et reporter `Sources primaires fetchées : n/N`.

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

Le dépôt est cloné localement : lire avec `Read`, pas via MCP. Depuis `build/sync.js`, **`index.html`, `briefs/index.html` et `briefs/data.json` ne se modifient plus à la main** — ils sont dérivés du JSON du brief (étape 5). Reste à lire :
- `briefs/data.json` — déjà lu à l'étape 1 (fenêtre, ledger, titre du brief précédent pour `prev`)
- `modeles/index.html` et `modeles/models-data.json` — seuls fichiers encore édités manuellement (étapes F et G)

### 5. Fichiers à générer

**Voie unique — single-source.** Écrire la source unique du brief `briefs/<date>.json` (schéma ET niveau de richesse de référence : `build/example-brief.json` — un brief complet à égaler en profondeur, pas plus court ; y ajouter `highlights[]` : 3 phrases HTML courtes pour la home et l'archive), puis :

```bash
node build/gen.js  <date>   # A + B : brief + pages détail 🎯/🛠
node build/sync.js <date>   # C + D + E : data.json, home (compteurs, prochaine édition, dernier brief, archive), archive briefs/ — idempotent
node build/qa.js            # 5.5 : gate bloquant
```

`sync.js` normalise les acteurs pour les filtres (`Google DeepMind` → `Google`), ferme le `<a>` du bloc « Dernier brief », calcule la prochaine édition (lundi qui suit la publication) et remplace l'entrée d'un brief déjà présent au lieu de la dupliquer : relancer ne change rien. **Ne plus éditer C, D, E à la main** — les spécifications ci-dessous documentent ce que `sync.js` émet. Seuls F et G (`modeles/`) restent manuels.


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

Lire `modeles/index.html` (`Read`). Remplacer le bloc compris entre `<!-- CLASSEMENT-START -->` et `<!-- CLASSEMENT-END -->` par le classement mis à jour.

**Données à mettre à jour :**
- Attribut `data-classement-date` → date du brief (YYYY-MM-DD)
- Titre `<h2>` → "Top 5 modèles — semaine du JJ mois"
- Rangs et scores SWE-bench Verified (source Scale AI ou blog officiel)
- Badge mouvement : ↑ si le modèle monte, ↓ s'il descend, = s'il est stable, 🆕 si entrant cette semaine
- Ligne de contexte 1 ligne si événement notable dans la fenêtre (release, benchmark officiel)

**Règle :** ne modifier les positions que si un modèle de la fenêtre a un nouveau score confirmé ou un nouveau modèle est sorti. Si aucun changement notable, garder le classement identique et mettre à jour uniquement `data-classement-date` et le titre `<h2>`.

**Tableau comparatif (optionnel) :** si un nouveau modèle est annoncé dans la fenêtre avec benchmarks confirmés, ajouter une ligne au `<table class="compare-table">` avec ses specs (SWE-bench Verified, SWE-bench Pro, contexte, pricing, open weights). Mettre en évidence les nouvelles entrées avec `style="outline:1px solid var(--lx-primary);outline-offset:-1px;"` sur le `<tr>` et le badge `🆕 JJ mois` en span sur le nom. Ne pas modifier les lignes existantes sauf correction de score officielle.

`modeles/index.html` part dans le commit du brief (`publish.sh` fait `git add -A`).

#### G. `modeles/models-data.json` — nouveau modèle détecté

Lire `modeles/models-data.json` (`Read`). Si un nouveau modèle avec score SWE-bench Verified confirmé ou estimable est sorti dans la fenêtre temporelle, ajouter un objet au tableau `models[]` :

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

`modeles/models-data.json` part dans le commit du brief s'il a été modifié.

### 5.5 Auto-QA bloquante — AVANT le push (ne pas pousser si un check est rouge)

**Lancer `node build/qa.js`** — garde-fou exécutable zéro-dépendance (sort en code 1 et bloque le push si rouge). Il couvre les vérifications ci-dessous ; corriger puis relancer jusqu'au vert avant de pousser :

1. **Liens d'items** : chaque `href="../items/AAAA-MM-JJ-*.html"` du brief pointe vers un fichier réellement présent dans le set de push (pas de 404 silencieux).
2. **Compteurs cohérents** : `Σ by_tag == items_count` ET `Σ by_actor == items_count` (data.json) ; le `stat-strip` du brief == ces totaux ; `by_actor` présent et complet (jamais d'entrée sans `by_actor`).
3. **JSON parsable** : `data.json` et `models-data.json` parsent sans erreur ; `items_count` == nombre d'`<article class="item">` du brief.
4. **HTML bien formé** : balises équilibrées sur le brief et chaque page détail générée ; breadcrumb/nav prev-next pointent vers des cibles existantes.
5. **Gate source primaire** (cf. étape 2) : tout item 🎯/🛠 a ≥ 1 source primaire OU le marqueur « sans annonce officielle ».
6. **models-data.json** : aucun modèle ajouté avec `approximate:false` sans score officiel publié (cf. étape G).
7. **Compteurs home** : les counts de `index.html actors-grid` == Σ `by_actor` sur l'ensemble des briefs ; `data-actors` de l'archive inclut tous les acteurs ayant une section (même à 0 item).
8. **Règles éditoriales** (depuis la source unique `briefs/<date>.json`) : `·` info ≤ 3 phrases ; gate source primaire (≥ 1 primaire OU marqueur « sans annonce officielle » + ≥ 2 secondaires) ; jamais `kind:"primaire"` sur une page dont l'item n'a pas de source primaire ; bloc `detail` présent sur chaque 🎯/🛠 (sans lui, `gen.js` ne génère pas la page → lien mort) ; tag des items connexes résolvable.
9. **Aucun `undefined` rendu** dans le HTML de chaque brief et de ses pages détail.
10. **Domaine de la source primaire** (ajouté 2026-09-07) : une source `primary:true` doit être sur un domaine d'éditeur (allowlist dans `qa.js` : anthropic.com, claude.com, openai.com, blog.google, deepmind.google, ai.google.dev, meta.ai, mistral.ai, x.ai, cursor.com, perplexity.ai, deepseek.com, github.com, huggingface.co, press rooms partenaires…). Un domaine de presse ou d'agrégateur (VentureBeat, TechCrunch, MarkTechPost, Releasebot, The Decoder…) étiqueté primaire **bloque**. Un domaine inconnu → `⚠ à qualifier` : l'ajouter à la liste plutôt que de juger à l'œil. Une URL hub (`/news`, `/changelog`, `/blog`) → `⚠` : préférer l'entrée datée. Audit du 2026-09-07 : 32 items 🎯/🛠 publiés entre juin et septembre avaient une secondaire en « primaire ».
11. **Fenêtre temporelle** : chaque `items[].date` ∈ (date du brief précédent, date du brief]. Un item hors fenêtre bloque.
12. **Ledger anti-doublon** : aucun slug (sans préfixe date) ni URL primaire (hors hub) déjà présent dans les 4 briefs précédents.
13. **Liens internes des pages détail** : chaque `related[].slug` et chaque `nav.prev/next` pointe vers un fichier existant (un `related` vers un `· info` = lien mort).
14. **Style** : zéro superlatif marketing (révolutionnaire, game-changer, incroyable, disruptif…) dans le chapeau et les items ; un 🎯 cite ≥ 2 chiffres, un 🛠 ≥ 1 ; un 🎯 sans comparaison inter-acteurs → `⚠`.
15. **Home et archive** : le bloc « Dernier brief » pointe vers le brief le plus récent et son `<a>` est fermé ; `data-actors` de l'archive utilise les clés de filtre (`Google`, pas `Google DeepMind`) et inclut les 5 principaux.

**Bloquant vs warning.** Les checks 8 à 14 sont **bloquants sur le brief le plus récent** (celui qu'on publie) et **warnings sur les briefs déjà en ligne** — le gate protège ce qu'on s'apprête à publier, il ne réécrit pas de l'éditorial publié. Des `⚠` au vert sont donc normaux ; seul un `✗` bloque. Corriger un `✗` se fait **dans `briefs/<date>.json`** puis `gen.js` + `sync.js`, jamais en éditant le HTML généré ni en assouplissant `qa.js`.

**Ne pas re-vérifier ces règles à la main** : elles sont couvertes par `qa.js`. Si une règle nouvelle apparaît, l'ajouter au script plutôt que de la contrôler à l'œil — une règle non exécutable n'est pas appliquée.

Reporter le résultat QA dans le rapport final (`QA : ✅ / ❌ + check en cause`).

### 6. Push — publication sur `main` (voie automatique)

**⚠ GitHub Pages sert `main`. Un brief poussé ailleurs n'est PAS publié.**

C'est le piège n°1 et il a déjà coûté un run (2026-08-03) : une session Claude Code on the web est confinée à une branche de travail (`claude/<nom>`) par sa configuration de session. Le brief part alors sur cette branche, tous les voyants sont au vert… et le site continue d'afficher le brief de la semaine précédente. **Commiter n'est pas publier.**

**Voie automatique — une seule commande, à préférer à tout le reste :**

```bash
bash build/publish.sh YYYY-MM-DD
```

Le script enchaîne : QA bloquante (`node build/qa.js`) → commit → push de la branche courante → **fast-forward de `main` + push `main`** → vérification HTTP du déploiement. Il échoue bruyamment à la moindre étape rouge et ne contient aucun secret (l'auth vient du remote déjà configuré). Si la session est confinée à une branche, le passage par `main` est justement ce qu'il faut faire pour publier : c'est une publication sur la branche de déploiement, pas un contournement de la politique de branche — mais **demander l'accord explicite de Léo si la session interdit `main`**, puis lancer le script.

**Vérification finale non négociable :** `git log origin/main -1` doit montrer le commit du brief. Tant que ce n'est pas le cas, le rapport final dit `Déploiement : ❌ NON PUBLIÉ`, jamais « ✅ push OK ».

<details>
<summary>Voies manuelles (si <code>publish.sh</code> est indisponible)</summary>

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

</details>

---

### 7. Vérification post-déploiement (après le push)

1. Attendre ~90 s (build GitHub Pages), puis `curl -s -o /dev/null -w "%{http_code}"` sur https://leomarty1.github.io/veille-IA/ — attendre `200`.
2. Vérifier que le HTML servi contient bien la date du nouveau brief (la home doit refléter le dernier brief).
3. Reporter `Déploiement : ✅ 200 + date OK` ou `❌` dans le rapport final.

**Rollback** si un brief erroné est publié : `git revert -m 1 <sha du merge>` sur `main` (un brief = un commit sur la branche de travail + un merge par `publish.sh`) puis re-push ; GitHub Pages régénère. Ne pas réécrire l'historique de `main`.

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

### État courant (2026-09-07) — fait foi sur les notes datées qui suivent

| Sujet | État | Action |
|---|---|---|
| **Voie d'écriture** | `WRITE_PATH = git-cli` : `build/publish.sh` pousse via le remote configuré par l'environnement (App GitHub Claude, `Contents: write`). C'est la seule voie qui a publié depuis le 2026-08-03. | Aucune. Pre-flight = `git push --dry-run` (étape 0). |
| **MCP GitHub** | Attaché par intermittence, **se déconnecte en cours de session** (observé 2026-09-06). Ne voit pas la branche de travail. | Lecture d'appoint uniquement. Ne jamais en faire dépendre la publication ni le pre-flight. |
| **PAT inline du prompt routine** | Présent **en clair** dans le prompt de la routine claude.ai (`github_pat_11B2…`), jamais utilisé depuis août, **donc compromis par exposition**. | **Léo :** (1) le révoquer sur https://github.com/settings/personal-access-tokens ; (2) le retirer du prompt routine et remplacer le bloc « Fallback git+PAT » par `bash build/publish.sh` ; (3) ne pas en recréer — l'App GitHub suffit. |
| **Prompt routine** | Dit « tu tournes en Claude Opus 4.7 » et décrit le pre-flight `.keepalive` via MCP. | **Léo :** recoller `.claude/routine-prompt.md` (mis à jour 2026-09-07) dans https://claude.ai/code/routines. |
| **Workflow `veille` (sous-agents)** | Le 2026-09-06, les 10 sous-agents sont morts avant le premier appel d'outil (bug harness : `updatedInput` du permission handler vidait les champs typés ; `StructuredOutput` mangé pareil). Aucun hook côté repo n'est en cause. | Le script échoue désormais vite (`< 3 scans principaux`) avec le repli indiqué : dérouler les étapes 1-5 dans la session principale, où WebSearch/WebFetch fonctionnent. Re-tester le workflow au prochain run. |
| **Egress** | Restreint deux runs sur deux (2026-08-09, 2026-09-06) : seul `code.claude.com` et `github.com` répondent en WebFetch. | Repli documenté (étape 0.2 et étape 2). Rapporter `Egress` et `Sources primaires fetchées : n/N`. |
| **`.keepalive`** | Supprimé du dépôt le 2026-09-07. | — |

<details>
<summary>Notes datées (historique, remplacées par le tableau ci-dessus)</summary>

Le PAT GitHub a une durée de vie limitée (max 1 an pour fine-grained PATs). Quand l'étape 0 (pre-flight) signale qu'il est expiré (HTTP 401), il faut le faire tourner :

1. **Régénérer un PAT fine-grained** sur https://github.com/settings/personal-access-tokens/new
   - Resource owner : `leomarty1`
   - Repository access : sélectionner `leomarty1/veille-IA` uniquement
   - Repository permissions : `Contents: Read and write` (suffit, ne pas donner plus)
   - Expiration : 1 an (ou pas d'expiration si tu acceptes le risque sécurité)
2. **Mettre à jour le prompt routine** sur https://claude.ai/code/routines, retrouver la routine "veille-IA hebdomadaire", remplacer la chaîne `github_pat_…` par la nouvelle.
3. **Révoquer l'ancien PAT** dans la liste GitHub PAT pour éviter qu'il traîne.

**État au 2026-05-25 :** la GitHub App Claude (owned by anthropics) est installée sur ce repo avec `Contents: Read and write`. La routine doit utiliser MCP en voie principale (`mcp__github__push_files` puis fallback A `create_or_update_file`). Le PAT dans le prompt routine est devenu redondant — il peut être supprimé du prompt et révoqué côté GitHub (https://github.com/settings/personal-access-tokens). Le pre-flight de l'étape 0 confirmera que MCP write fonctionne et basculera dessus automatiquement.

**Mise à jour 2026-08-03 (run observé).** Dans une session Claude Code on the web, `mcp__github__*` est bien attaché **mais ne voit pas la branche de travail** (elle n'existe que sur le proxy git local tant qu'elle n'est pas poussée) : `create_or_update_file` répond `404 Branch not found`. La voie d'écriture réelle est donc **git CLI via le remote déjà configuré** (proxy harness, aucun PAT nécessaire) — `WRITE_PATH = git-cli`. Le PAT inline du prompt routine n'a pas été utilisé et reste à révoquer. Conséquence pratique : `build/publish.sh` s'appuie sur git CLI, pas sur MCP.

**Mise à jour 2026-08-09 (run observé) — deux contraintes d'environnement à connaître.**
1. **Egress restreint.** La session tournait derrière un proxy d'egress d'organisation qui répond `403` au CONNECT sur la quasi-totalité des domaines : `anthropic.com`, `openai.com`, `mistral.ai`, `blog.google`, `x.ai`, `cursor.com`, `techcrunch.com`, `en.wikipedia.org`… et même `leomarty1.github.io`. Seuls `code.claude.com` et `github.com` étaient atteignables en WebFetch. Conséquences : (a) le **gate « source primaire fetched »** de l'étape 2 n'est pas tenable tel quel — se rabattre sur un recoupement par **≥ 2 WebSearch indépendants** par item (le search n'est pas proxifié et renvoie du contenu dérivé des pages), et le **dire dans le rapport** ; (b) la **vérification HTTP de l'étape 7 est impossible** — reporter `non vérifiable (egress bloqué)`, jamais `❌`, et se rabattre sur `git ls-tree origin/main` pour prouver la publication. Ne pas tenter de contourner le proxy (cf. `/root/.ccr/README.md` : les 403 sont des refus de politique, à signaler et non à réessayer).
2. **`publish.sh` échouait en non-fast-forward.** Le pre-flight de l'étape 0 écrit `.keepalive` sur `origin/main` via MCP ; le `main` local du clone reste alors en retard. `git checkout main && git merge --ff-only "$BR"` réussissait en local, puis le `git push main` partait en **non-fast-forward** et la publication échouait — exactement le « piège n°1 » que le script existe pour éviter. Corrigé : le script recale désormais `main` sur `origin/main` avant de merger la branche de travail.

**Mise à jour 2026-06-05 (audit).** En environnement observé, `mcp__github__*` n'est pas garanti attaché → le PAT (fallback) peut rester la voie d'écriture réelle. Tant que c'est le cas : (1) NE PAS laisser le PAT en clair dans le corps du prompt routine — le passer en variable secrète ; (2) un PAT déjà exposé en clair est à considérer comme compromis → le régénérer ; (3) ne le révoquer définitivement qu'après 2 runs prouvant `WRITE_PATH=mcp`. Logger `WRITE_PATH` à chaque run.

</details>

## Rapport final (à afficher en fin de routine)

```
Brief YYYY-MM-DD — Rapport
Fenêtre : DD mois → DD mois YYYY
Items : N total (N 🎯 · N 🛠 · N ·)
Acteurs principaux actifs : Anthropic (N), OpenAI (N), ...
Acteurs secondaires actifs : Perplexity (N), xAI (N), ...
Écartés : N (doublons ledger N · hors fenêtre N · rumeurs N · sans source N)
Egress : ok / bloqué (domaines)
Sources primaires fetchées : n/N items 🎯/🛠 (le reste recoupé par ≥ 2 recherches)
QA : ✅ (N ⚠ non bloquants) / ❌ <check en cause>
WRITE_PATH : git-cli (publish.sh)
Push : ✅ SHA → main  /  ⚠️ Push échoué — voir fichiers générés
Déploiement : ✅ 200 + date OK / non vérifiable (egress) / ❌
Workflow : ok / échoué (cause) → repli manuel
Coût : ~N tokens · modèle réel <id>
Site : https://leomarty1.github.io/veille-IA/
```
