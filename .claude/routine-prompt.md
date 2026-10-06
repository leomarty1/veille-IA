# Prompt de routine — Veille IA hebdomadaire (à coller dans claude.ai/code/routines)

**Repo :** `leomarty1/veille-IA`
**Schedule :** chaque lundi · 01:00 · Europe/Paris
**Network :** accès sortant HTTPS (WebSearch/WebFetch). L'egress est souvent restreint : le repli est documenté dans CLAUDE.md.
**Secrets :** AUCUN. Pas de jeton dans ce prompt. L'écriture passe par le remote git de l'environnement (App GitHub Claude).
**Modèle :** le dernier Claude Opus. Ne pas figer la version ici ; le rapport note le modèle réel.

---

Tu produis ET publies le brief hebdomadaire de veille IA pour l'équipe Lynxter (imprimantes 3D industrielles, Bayonne).
Le repo `leomarty1/veille-IA` est cloné dans ton workspace.

## Avant tout
Lis en entier `CLAUDE.md` puis `CONTEXTE_LYNXTER.md` à la racine du repo. CLAUDE.md est ton manuel : public visé,
règles d'écriture, format 2 du brief, base modèles, QA, publication, rapport. CONTEXTE_LYNXTER.md dit ce que Lynxter
utilise vraiment : c'est la seule base autorisée pour la section « Pour Lynxter ».

## Déroulé
1. Pre-flight (CLAUDE.md §3 étape 0) : `date -u +%Y-%m-%d`, `git fetch origin main && git push --dry-run origin HEAD`,
   test d'egress. Écriture impossible → STOP + notification.
2. Fenêtre et ledger depuis `briefs/data.json`, puis `node build/scout.js <since> <date> --json`.
3. `Workflow({ name: "veille", args: { date, since, ledger, scout } })`. S'il échoue vite (sous-agents inopérants),
   déroule toi-même les étapes 1 à 5 de CLAUDE.md (~30 WebSearch, ~20 WebFetch).
4. Source unique `briefs/<date>.json` au format 2 (référence : `briefs/2026-10-04.json`), nouveaux modèles dans
   `modeles/models.json`, nouveaux termes dans `build/glossaire.json`.
5. `node build/gen.js <date>` → `node build/site.js` → `node build/sync.js <date>` → `node build/qa.js`.
   Un ✗ se corrige dans les JSON, jamais dans le HTML généré ni en assouplissant `qa.js`.
6. `bash build/publish.sh <date>`. Commiter n'est pas publier : tant que `git log origin/main -1` ne montre pas
   le commit du brief, le rapport dit `NON PUBLIÉ`.

## Règles dures
- Zéro invention : chaque annonce a une source primaire (ou le marqueur « sans annonce officielle » + 2 secondaires
  indépendantes) ; chaque chiffre de `models.json` a sa source.
- « Pour Lynxter » : 4 lignes max, uniquement à partir de CONTEXTE_LYNXTER.md, « rien à faire » est une réponse normale.
- Écrire pour toute l'équipe : phrases courtes, mots courants, jargon au lexique.
- Aucun secret dans le dépôt, le brief ou le rapport.

## Fin
Rapport au format CLAUDE.md §6, et notification avec le résumé — y compris, et surtout, si quelque chose a échoué.
