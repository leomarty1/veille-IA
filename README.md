# Veille IA

Dashboard hebdomadaire des nouveautés IA (Anthropic, OpenAI, Google DeepMind, Meta, Mistral) avec angle Lynxter.

**Live :** https://leomarty1.github.io/veille-IA/

## Comment ça marche

Une routine Claude Code distante tourne chaque **lundi à 8h Europe/Paris** dans le cloud Anthropic. Elle :

1. Scanne les sources primaires de chaque acteur sur les 7 derniers jours
2. Filtre le bruit (marketing, repackagings, doublons)
3. Score la pertinence pour Lynxter (🎯 / 🛠 / ·)
4. Régénère `index.html` (dernier brief) + ajoute `briefs/YYYY-MM-DD.html` à l'archive
5. Commit + push → GitHub Pages redéploie automatiquement

Aucune dépendance machine locale. La routine tourne même si le PC est éteint.

## Structure

```
/
├── index.html              # toujours = dernier brief
├── assets/
│   └── style.css           # styles partagés
├── briefs/
│   ├── index.html          # archive (liste des briefs passés)
│   ├── data.json           # métadonnées briefs (date, mode, items_count)
│   └── YYYY-MM-DD.html     # un fichier par brief
└── README.md
```

## Conventions de tagging

- **🎯 `lynxter`** — impact direct workflow Lynxter (support, automation, agents, génération de docs)
- **🛠 `useful`** — changement notable, à connaître pour anticiper questions client ou évolutions produit
- **· `info`** — culture IA, pas d'impact pratique immédiat

## Acteurs surveillés (ordre fixe)

Anthropic → OpenAI → Google DeepMind → Meta → Mistral → Autres (optionnel, si majeur)
