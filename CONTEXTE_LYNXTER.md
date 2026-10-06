# Contexte Lynxter — pour juger ce qui nous concerne

> Fichier tenu à la main par Léo. La routine le lit **avant** d'écrire la section « Pour Lynxter » et les lignes « Pour nous » du brief.
> Le dépôt est public : rien de confidentiel ici (pas de client, pas de chiffre interne, pas de nom de serveur).
> Dernière mise à jour : 2026-10-06 (première version, **à relire et compléter par Léo**, notamment les lignes marquées « à confirmer »).

## Qui lit le brief

L'équipe Lynxter : support technique, commerce, développement, direction. Des gens à l'aise avec la technique de nos machines, pas des spécialistes de l'IA. Le brief doit se lire en 5 minutes.

Lynxter conçoit et fabrique à Bayonne des imprimantes 3D industrielles multi-têtes (filament, silicone, polyuréthane), pour l'aéronautique, le médical, l'académique et l'industrie.

## Ce qu'on utilise vraiment (octobre 2026)

| Outil | Usage | Statut charte |
|---|---|---|
| Claude Code, Cowork (Anthropic, comptes pro) | Support technique (diagnostic, réponses, base de connaissance), tâches administratives, développement | Autorisé : données publiques et internes anonymisées |
| Routines Claude (tâches planifiées dans le cloud) | Automatisations récurrentes, dont ce brief. Modèle actuel : Claude Opus 5.5 | Autorisé |
| ChatGPT (un compte partagé) | Usage ponctuel | Données publiques uniquement |
| Mistral (compte pro) | Autorisé par la charte ; usage actuel à confirmer | Autorisé |
| Gemini, Perplexity, Copilot, Grok, Meta AI… | Pas d'usage officiel | Hors cadre : données publiques uniquement |
| Infrastructure locale | Prévue, pas encore en place | Seule voie prévue pour les données sensibles |

À confirmer par Léo :
- Appel direct à l'API Claude depuis nos propres logiciels : **a priori aucun**. Les changements purement techniques de l'API (SDK, paramètres) ne sont donc presque jamais « à faire » pour nous.
- Outils IA de l'équipe développement (stack PHP/Symfony, Vue.js, C++ embarqué) : à préciser.
- Forge de code (GitHub, GitLab…) : à préciser.

## Règles à respecter (résumé de la charte IA Lynxter v0.2)

- Données clients nominatives, financières, RH, R&D non publiée, secrets : **jamais** dans une IA cloud.
- Claude et Mistral (comptes pro) : données publiques et données internes anonymisées.
- ChatGPT (compte partagé) : données publiques seulement.
- Toute autre IA cloud : hors cadre officiel, données publiques seulement.
- L'humain décide : le brief **propose**, Léo ou la direction valident.

## Ce qui compte pour nous, par ordre de priorité

1. **Nos outils Claude** (Claude Code, Cowork, routines) : failles et mises à jour de sécurité, retraits de modèles, nouveautés utiles au support technique.
2. **Coût et choix de modèle Claude** (Opus, Sonnet, Haiku) : un modèle moins cher qui fait aussi bien sur nos usages.
3. **Modèles ouverts et souverains** (Mistral, modèles « open weights ») : candidats pour la future infrastructure locale ; noter la taille et le matériel nécessaire.
4. **IA et industrie** : impression 3D, CAO, contrôle qualité, maintenance — ce que nos clients pourraient utiliser ou nous demander.
5. **Règles** : AI Act, RGPD, conditions d'utilisation des données par les éditeurs, pour une PME industrielle européenne.

Tout le reste est de la culture générale : section « En bref », verdict « Rien à faire ».

## Comment choisir le verdict

| Verdict | Quand | Exemple |
|---|---|---|
| **À faire** | Un outil qu'on utilise change et ça casse ou ça expose quelque chose si on ne fait rien. Action précise, courte, datée si besoin. | Mettre à jour Claude Code après une correction de sécurité. |
| **À tester** | Un gain probable sur un usage réel listé ci-dessus, testable en moins d'une demi-journée, sans données sensibles. | Essayer un modèle Claude moins cher sur une routine. |
| **À surveiller** | Peut nous concerner plus tard (infra locale, concurrent d'un outil qu'on utilise, règle en préparation). Aucune action maintenant. | Un modèle ouvert assez petit pour un serveur local. |
| **Rien à faire** | Pas d'impact sur nos usages, ou outil hors charte. | Un agent grand public chez un éditeur hors cadre. |

## Ce que le brief ne fait jamais

- Inventer un outil, un script, un processus ou une équipe interne pour justifier une action.
- Proposer un test qui ferait passer des données clients ou internes dans un outil hors charte.
- Recommander de changer d'outil : il signale, Léo décide.
- Multiplier les actions : 4 lignes maximum dans « Pour Lynxter », et « rien à faire » est une réponse normale.
