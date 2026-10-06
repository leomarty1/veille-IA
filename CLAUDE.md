# Veille IA — Routine Claude Code

Brief hebdomadaire des nouveautés IA, écrit pour toute l'équipe Lynxter, et comparateur de modèles tenu à jour.

**Fréquence :** chaque lundi à 01:00 Europe/Paris
**Modèle :** le dernier Claude Opus disponible. Ne pas figer la version ici ; noter le modèle réel dans le rapport.
**Repo :** https://github.com/leomarty1/veille-IA · **Site :** https://leomarty1.github.io/veille-IA/
**Format :** brief **format 2** depuis le 2026-10-06 (`"schema": 2`). Référence à égaler : `briefs/2026-10-04.json`.
**Publication :** `bash build/publish.sh YYYY-MM-DD` (QA bloquante, puis push jusqu'à `main`, la branche servie par Pages).
**Outillage :** `build/` (Node, zéro dépendance) — voir `build/README.md`.

---

## 1. Pour qui on écrit, et comment

### Le lecteur

L'équipe Lynxter : support technique, commerce, développement, direction. À l'aise avec nos machines, **pas spécialiste de l'IA**. Il lit le brief en 5 minutes le lundi matin et doit savoir : ce qui a changé, si ça nous concerne, et quoi faire.

Avant d'écrire, lire **`CONTEXTE_LYNXTER.md`** : nos outils réels, la charte IA, nos priorités, et la grille des verdicts.

### Les règles d'écriture

- **Phrases courtes.** Une idée par phrase, 20 mots en moyenne (la QA bloque au-delà de 24).
- **Mots courants.** Tout terme technique est soit remplacé par un mot simple, soit défini dans `build/glossaire.json` : le brief lui pose alors automatiquement une infobulle et l'ajoute à « Les mots du brief ». Un sigle absent du lexique déclenche un avertissement QA : **l'ajouter au lexique** (définition de 25 mots max, sans autre jargon) plutôt que de l'expliquer dans le texte.
- **Pas de code ni de nom de paramètre** dans « En 30 secondes » et dans les résumés (`tool_choice`, `thinking`, numéros de build…). Ils vont dans le bloc dépliable « Les chiffres », qui sert aux développeurs.
- **Un ou deux chiffres utiles par annonce**, avec leur point de comparaison (« 70,6 %, contre 66,4 % pour Opus 5.5 »). Les autres dans « Les chiffres ». Nombres à la française : virgule décimale, espace pour les milliers.
- **Titre = le fait et ce qu'il change**, en langage courant : « Claude Sonnet 5.5 : presque le niveau d'Opus, pour deux fois moins cher », pas « Anthropic annonce Claude Sonnet 5.5 ».
- **Zéro superlatif** (révolutionnaire, incroyable, game-changer…), zéro « pour comprendre, il faut savoir que… ».
- **Honnêteté** : une absence est une information (« aucun test commun publié avec Sonnet 5.5 ») ; un chiffre de l'éditeur s'écrit « selon Google » quand il compare à des concurrents ; une rumeur n'est pas un item.

### « Pour Lynxter » : la partie la plus importante

C'est ce qui distingue ce brief d'une revue de presse. Règles (détail dans `CONTEXTE_LYNXTER.md`) :

- **4 lignes maximum**, triées : à faire → à tester → à surveiller → rien à faire.
- Chaque ligne : un **verdict** (`a-faire`, `a-tester`, `a-surveiller`, `rien`), un **titre-action**, un **pourquoi** de 60 mots max, **qui** est concerné, et le **statut charte** si un outil est en jeu (`ok`, `vert`, `hors-cadre`, `local`).
- **S'appuyer uniquement sur ce que `CONTEXTE_LYNXTER.md` dit qu'on utilise.** Ne jamais inventer un pipeline, un script, une équipe ou un processus interne. Si l'impact dépend d'un point « à confirmer », le dire (« si un de nos scripts appelle… »).
- **« Rien à faire » est une réponse normale.** Mieux vaut une ligne honnête que trois actions fabriquées. Une semaine sans rien pour nous : une seule ligne « rien ».
- Jamais de test qui ferait passer des données internes dans un outil hors charte.

---

## 2. Le format 2 en bref

Le brief est une page unique (plus de pages détail) :

1. **En-tête** : titre, chapeau de 2 phrases, temps de lecture.
2. **En 30 secondes** : 1 à 3 points, 45 mots max chacun.
3. **Pour Lynxter cette semaine** : les verdicts (ci-dessus).
4. **Les modèles de la semaine** : une carte par nouveau modèle, comparé à celui qu'il remplace. Prix, mémoire de travail, disponibilité, statut charte et graphe « avant / après » sont **lus dans `modeles/models.json`** : il faut donc y ajouter le modèle (étape 5.B) avant de générer.
5. **Les annonces**, regroupées par thème (`modeles`, `outils`, `entreprise`, `ouvert`, `autre`) : résumé de 3 phrases max, ligne « Pour nous » optionnelle avec verdict, bloc dépliable « Les chiffres », sources.
6. **En bref** : les annonces `info`, une ligne chacune (2 phrases, 35 mots max).
7. **Les mots du brief** : généré automatiquement depuis le lexique.

Importance d'une annonce (`tag`, inchangé dans les données) : `lynxter` = « Important pour nous » (touche un outil qu'on utilise ou une décision proche), `useful` = « Bon à savoir », `info` = « En bref ».

---

## 3. Workflow

### 0. Pre-flight — avant toute recherche, sans rien écrire

1. Droit d'écriture : `git fetch origin main && git push --dry-run origin HEAD`. Erreur `401`/`403`/`could not read Username` → **arrêter**, notifier (App GitHub Claude absente ou sans écriture). Logger `WRITE_PATH`.
2. Egress : `for u in https://www.anthropic.com/news https://openai.com/news/ https://code.claude.com/docs/en/changelog; do printf '%s ' "$u"; curl -s -o /dev/null -w '%{http_code}\n' --max-time 15 "$u"; done`. Des `403`/`000` = egress restreint → repli « 2 recherches indépendantes par fait », à dire dans le rapport.

Les outils `mcp__github__*` ne servent ni de voie d'écriture ni de test (ils se déconnectent en cours de session). Aucun jeton dans le prompt ni dans le dépôt.

### 1. Fenêtre, ledger, faits vérifiés

- Lire `briefs/data.json` : fenêtre = date du dernier brief (exclue) → aujourd'hui (incluse). Ledger anti-doublon = `items[]` (slug, primary_url) des 4 derniers briefs.
- `node build/scout.js <since> <date> --json` : entrées datées lues sur les pages officielles qui répondent (changelog Claude Code ancré par version, release notes de la plateforme Claude, SDK). À couvrir en priorité, avec l'URL du scout en source primaire.

### 2. Recherche

~30 WebSearch et ~20 WebFetch au total. Chaque annonce retenue s'appuie sur **au moins une source primaire** (page datée de l'éditeur), idéalement confirmée par une secondaire. Sans source primaire : marqueur « sans annonce officielle » + 2 secondaires indépendantes, jamais d'agrégateur.

| Acteur | Où chercher (pages datées à citer) |
|---|---|
| Anthropic | `anthropic.com/news/<slug>`, `claude.com/blog/<slug>` ; flux : `platform.claude.com/docs/en/release-notes/overview`, `code.claude.com/docs/en/changelog` (ancre `#2-1-259`) |
| OpenAI | `openai.com/index/<slug>` ; flux : `developers.openai.com/codex/changelog`, notes de version ChatGPT et modèles sur `help.openai.com` |
| Google DeepMind | `blog.google/...`, `deepmind.google/models/model-cards/<modèle>/` ; flux : `ai.google.dev/gemini-api/docs/changelog` |
| Meta | `ai.meta.com/blog/<slug>`, `about.fb.com/news/...` (souvent rien : c'est une réponse valide) |
| Mistral | `mistral.ai/news/<slug>` ; flux : `docs.mistral.ai/resources/changelogs` |
| Secondaires si annonce notable | Perplexity, xAI, Cursor, DeepSeek, Qwen, Cohere |

Thèmes transversaux à chercher aussi, parce qu'ils comptent pour nous : modèles ouverts (taille, licence, matériel requis), IA et impression 3D / CAO / industrie, AI Act et RGPD.

**Chiffres.** Un score sans qualificatif est un score **publié par l'éditeur**. Un score tiers (Artificial Analysis, LMArena, Vellum…) s'écrit « selon <source> » et porte `official:false` dans `models.json`. Deux modèles ne se comparent que sur un test où les deux ont un score officiel.

### 3. Tri

Garder ce qui est daté dans la fenêtre. Écarter : repackagings, partenariats sans substance, rumeurs, doublons du ledger. Classer `lynxter` / `useful` / `info` selon `CONTEXTE_LYNXTER.md`, attribuer un thème.

**Semaine calme** (moins de 3 annonces chez les 5 principaux) : brief court et honnête, titre du type « Semaine calme », une ligne « Rien à faire » dans « Pour Lynxter ». Pas de remplissage.

### 4. Écrire la source unique `briefs/<date>.json`

Schéma de `briefs/2026-10-04.json` (à égaler en clarté, pas en longueur) :

```
schema: 2, date, period, title (≤ 90 car.), description, lead (≤ 60 mots), actors_scanned,
en_30s[1-3], highlights[3] (phrases courtes, home et archive),
pour_lynxter[≤4] { verdict, titre, pourquoi, qui, charte|null, items[slug] },
modeles[] { id (dans models.json), item (slug), en_clair (≤ 50 mots), verdict, pour_nous },
items[] { slug "<date>-<kebab>", actor ("Google DeepMind" pour Google), tag, theme, date, title, resume,
          pour_nous?{verdict, texte ≤ 40 mots}, chiffres?[], sources[{label,url,primary}], has_primary },
rien_de_notable[] (acteurs suivis sans annonce), sources_footer[], prev { href, title }
```

### 5. Mettre à jour les données et générer

**A. Lexique.** Tout nouveau terme ou sigle utilisé → `build/glossaire.json` (`id`, `label`, `match[]`, `def`, `cs:true` pour un sigle sensible à la casse ; `re:` pour une expression régulière).

**B. Base modèles `modeles/models.json`.** Pour chaque modèle sorti dans la fenêtre (même sans benchmark) : ajouter un objet

```
{ id, name, actor ("Google", pas "Google DeepMind"), family, replaces (id du modèle précédent de la gamme | null),
  date, status (ga | preview | restricted | unreleased | deprecated | retired), retire_date?,
  price_in, price_out ($ par M tokens, tarif standard | null), context_k, output_k, open_weights,
  scores { <bench-id>: { value, official, source } }, claims?[{text, source}], en_clair?, sources[], confidence, notes }
```

- Reprendre **tout le tableau de l'annonce** : le score du nouveau modèle **et** celui du modèle précédent quand l'éditeur le publie (à poser dans l'objet du modèle précédent, `source` = l'annonce). C'est ce qui alimente « nouveau contre ancien ».
- Un nouveau test → le déclarer dans `benchmarks{}` (`name`, `unit`, `what` en une phrase simple).
- Une nouvelle gamme → `families{}` (`name`, `actor`, `tier` : `haut` | `milieu` | `eco` | `ouvert` | `special`).
- Un modèle retiré ou déprécié dans la fenêtre → mettre à jour `status` et `retire_date`.
- Jamais de score inventé ni « estimé » sans `official:false` et sa source. Mettre `meta.updated` à la date du brief.

**C. Générer.**

```bash
node build/gen.js  <date>   # brief HTML (format 2 : page unique, cartes modèles depuis models.json)
node build/site.js          # comparateur modeles/, lexique/, redirection graphe/
node build/sync.js <date>   # data.json, home, archive — idempotent
node build/qa.js            # gate bloquant
```

Un ✗ se corrige **dans le JSON** (brief ou models.json), jamais dans le HTML généré ni en assouplissant `qa.js`. Les ⚠ sur des briefs déjà publiés sont normaux.

### 6. Publier

```bash
bash build/publish.sh <date>
```

QA → commit → push de la branche → fast-forward et push de `main` → vérification HTTP. **Commiter n'est pas publier** : tant que `git log origin/main -1` ne montre pas le commit du brief, le rapport dit `NON PUBLIÉ`. Si la session interdit `main`, demander l'accord explicite de Léo avant de lancer le script.

### 7. Vérifier

~90 s après le push : `curl` de la home, qui doit montrer la date du brief. Egress bloqué → `non vérifiable`, et `git ls-tree origin/main briefs/` comme preuve. Rollback : `git revert -m 1 <sha du merge>` sur `main`, jamais de réécriture d'historique.

---

## 4. Structure du repo

```
/
├── CLAUDE.md               ← ce fichier
├── CONTEXTE_LYNXTER.md     ← nos outils, la charte, nos priorités (tenu par Léo)
├── index.html              ← home (dernier brief, compteurs) — mise à jour par sync.js
├── briefs/<date>.json      ← source unique de chaque brief
├── briefs/<date>.html      ← généré (gen.js)
├── briefs/data.json        ← registre (sync.js)
├── modeles/models.json     ← base modèles, chaque chiffre sourcé
├── modeles/index.html      ← comparateur (site.js)
├── lexique/index.html      ← lexique (site.js)
├── items/                  ← pages détail des briefs format 1 (archives, plus générées)
├── assets/style.css, app.js        ← socle graphique (charte Lynxter)
├── assets/v2.css, v2.js            ← composants format 2, graphes, comparateur
└── build/                  ← gen, site, sync, qa, scout, publish, templates, glossaire.json, charte.js
```

`graphe/` redirige vers le comparateur. `acteurs/`, `futur/` et `methodo/` sont des pages fixes, éditées à la main.

---

## 5. Maintenance — état au 2026-10-06

| Sujet | État | Action |
|---|---|---|
| **Jeton GitHub (PAT) en clair dans le prompt de la routine** | Toujours présent dans le prompt stocké sur claude.ai au 2026-10-06, alors que le dépôt est **public**. Inutilisé depuis août : à considérer comme compromis. | **Léo :** le révoquer sur https://github.com/settings/personal-access-tokens, puis recoller `.claude/routine-prompt.md` (sans jeton) dans https://claude.ai/code/routines. |
| **Prompt de la routine** | Mentionne encore « Claude Opus 4.7 », le PAT et l'ancien format. | Recoller `.claude/routine-prompt.md`. |
| **Voie d'écriture** | `WRITE_PATH = git-cli` : `build/publish.sh` pousse via le remote configuré par l'environnement (App GitHub Claude). | — |
| **Workflow `veille` (sous-agents)** | Échoue vite si moins de 3 scans principaux aboutissent ; repli : dérouler les étapes 1 à 5 dans la session principale. | Re-tester au prochain run. |
| **Egress** | Souvent restreint (seuls `code.claude.com` et `github.com` répondent en WebFetch). | Repli documenté étape 0 et 2. |
| **Quota de recherches web** | Environ 200 WebSearch par tour, **partagés entre tous les sous-agents**. Au-delà, les recherches échouent sans bruit. Observé le 2026-10-06 : un run avec double vérification par annonce a épuisé le quota et trois annonces vraies (dont une de Mistral) ont été écartées comme « non confirmées ». | Viser ~50 recherches au total. Une annonce qu'on n'a pas pu vérifier faute de quota est **indéterminée, pas fausse** : la signaler dans le rapport et la reprendre au brief suivant, jamais la classer comme réfutée. |
| **Dépôt public sur compte personnel** | Écart avec la charte IA Lynxter (actifs IA sur serveurs Lynxter, pas d'hébergement personnel, pas d'exposition sans validation IT). Arbitrage direction en attente. | Ne rien publier ici qui ne soit public par ailleurs. Suivre l'arbitrage. |

---

## 6. Rapport final (fin de routine)

```
Brief YYYY-MM-DD — Rapport
Fenêtre : DD mois → DD mois YYYY
Annonces : N (N importantes · N bon à savoir · N en bref) · Pour Lynxter : N à faire, N à tester, N à surveiller
Modèles ajoutés à models.json : … (ou aucun)
Écartés : N (doublons N · hors fenêtre N · rumeurs N · sans source N)
Egress : ok / bloqué (domaines) · Sources primaires lues : n/N
QA : ✅ (N ⚠) / ❌ <check>
Push : ✅ SHA → main / ❌ · Déploiement : ✅ 200 + date / non vérifiable / ❌
Modèle réel : <id> · Site : https://leomarty1.github.io/veille-IA/
```
