# Veille IA

Brief hebdomadaire des nouveautés IA écrit pour toute l'équipe Lynxter (ce qui change, ce que ça change pour nous, quoi faire), et comparateur de modèles dont chaque chiffre est sourcé.

**Live :** https://leomarty1.github.io/veille-IA/

## Comment ça marche

Une routine Claude Code distante tourne chaque **lundi à 01:00 Europe/Paris** dans le cloud Anthropic. Elle :

1. Lit `CLAUDE.md` (manuel) et `CONTEXTE_LYNXTER.md` (nos outils, la charte, nos priorités)
2. Scanne les annonces officielles des éditeurs sur les 7 derniers jours, vérifie chaque chiffre à sa source
3. Écrit le brief au format 2 (`briefs/<date>.json`) : En 30 secondes, Pour Lynxter (verdicts), modèles de la semaine, annonces, lexique
4. Met à jour la base modèles (`modeles/models.json`) et le lexique (`build/glossaire.json`)
5. Génère les pages (`build/gen.js`, `build/site.js`, `build/sync.js`), passe la QA (`build/qa.js`), publie (`build/publish.sh`)

Aucune dépendance machine locale. La routine tourne même si le PC est éteint.

## Structure

```
/
├── CLAUDE.md / CONTEXTE_LYNXTER.md   # manuel de la routine / contexte Lynxter (tenu par Léo)
├── index.html                        # accueil (dernier brief, compteurs)
├── briefs/<date>.json → .html        # un brief par semaine (source unique → page)
├── briefs/data.json, index.html      # registre et archive
├── modeles/models.json → index.html  # base modèles sourcée → comparateur et graphes
├── lexique/index.html                # lexique (depuis build/glossaire.json)
├── items/                            # pages détail des briefs format 1 (archives)
├── assets/                           # style.css + app.js (socle), v2.css + v2.js (format 2)
└── build/                            # gen, site, sync, qa, scout, publish, templates, glossaire, charte
```

## Conventions de tagging

- **`lynxter` — « Important pour nous »** : touche un outil qu'on utilise ou une décision proche
- **`useful` — « Bon à savoir »** : changement notable à connaître
- **`info` — « En bref »** : culture IA, une ligne

Chaque brief propose aussi des **verdicts** pour Lynxter : à faire, à tester, à surveiller, rien à faire (voir `CONTEXTE_LYNXTER.md`).

## Acteurs surveillés (ordre fixe)

Anthropic → OpenAI → Google DeepMind → Meta → Mistral (5 principaux, couverts chaque semaine) → secondaires si annonce majeure : Perplexity, xAI, Cursor, DeepSeek, Cohere, Stability AI
