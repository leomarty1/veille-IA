/* ════════════════════════════════════════════════════════════════
   build/lib.js — chrome partagé (head, top-bar, footer, baseline).
   Écrit UNE fois ici, injecté dans chaque page générée → fin des
   ~150 lignes de header/footer dupliquées par fichier.
   Toutes les pages générées vivent à profondeur 1 (briefs/, items/),
   donc préfixe "../".
   ════════════════════════════════════════════════════════════════ */
'use strict';

const THEME_INIT = `<script>(function(){var t=null;try{t=localStorage.getItem('veille-ia-theme');}catch(e){}if(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)t='dark';if(t==='dark')document.documentElement.classList.add('dark');})();</script>`;

const ICONS = `        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;

const GH_PATH = `<path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2 1-.3 2-.4 3-.4s2 .1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/>`;

/** <head> + ouverture body. `active` = clé de nav active ('briefs' pour les briefs). */
function head(title, description, active) {
  const link = (key, href, label) =>
    `      <a href="${href}"${active === key ? ' class="active"' : ''}>${label}</a>`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Veille IA Lynxter</title>
<meta name="description" content="${description}">
<link rel="stylesheet" href="../assets/style.css">
${THEME_INIT}
</head>
<body>

<div class="read-progress"></div>

<header class="top-bar">
  <div class="top-bar-inner">
    <a class="brand" href="../"><span class="brand-dot"></span>LYNXTER<span class="brand-divider"></span>VEILLE IA</a>
    <nav class="nav-primary">
${link('accueil', '../', 'Accueil')}
${link('briefs', '../briefs/', 'Briefs')}
${link('acteurs', '../acteurs/', 'Acteurs')}
${link('modeles', '../modeles/', 'Modèles')}
${link('methodo', '../methodo/', 'Méthodo')}
${link('futur', '../futur/', 'Futur')}
${link('graphe', '../graphe/', 'Graphe')}
    </nav>
    <div class="nav-actions">
      <button class="icon-btn" data-theme-toggle aria-label="Basculer thème sombre/clair">
${ICONS}
      </button>
      <a class="icon-btn" href="https://github.com/leomarty1/veille-IA" target="_blank" rel="noopener" aria-label="Code source GitHub">
        <svg viewBox="0 0 24 24" fill="currentColor">${GH_PATH}</svg>
      </a>
    </div>
  </div>
</header>
`;
}

/** baseline + footer + scripts + fermeture. `signature` = texte de la baseline-band. */
function footer(signature) {
  return `
<aside class="baseline-band">
  <div class="container">
    <p class="smarter">Make it <em>smarter</em>.</p>
    <p class="signature">${signature}</p>
  </div>
</aside>

<footer class="site-footer">
  <div class="container">
    <div>
      <h4>Veille IA</h4>
      <ul>
        <li><a href="../">Accueil</a></li>
        <li><a href="../briefs/">Tous les briefs</a></li>
        <li><a href="../acteurs/">Acteurs</a></li>
        <li><a href="../modeles/">Modèles</a></li>
        <li><a href="../methodo/">Méthodologie</a></li>
        <li><a href="../futur/">Prospective</a></li>
      </ul>
    </div>
    <div>
      <h4>Sources primaires</h4>
      <ul>
        <li><a href="https://www.anthropic.com/news" target="_blank" rel="noopener">anthropic.com</a></li>
        <li><a href="https://openai.com/news/" target="_blank" rel="noopener">openai.com</a></li>
        <li><a href="https://blog.google/technology/ai/" target="_blank" rel="noopener">blog.google</a></li>
        <li><a href="https://ai.meta.com/blog/" target="_blank" rel="noopener">ai.meta.com</a></li>
        <li><a href="https://mistral.ai/news/" target="_blank" rel="noopener">mistral.ai</a></li>
      </ul>
    </div>
    <div>
      <h4>Code</h4>
      <ul>
        <li><a href="https://github.com/leomarty1/veille-IA" target="_blank" rel="noopener">Source GitHub</a></li>
        <li><a href="https://github.com/leomarty1/veille-IA/commits/main" target="_blank" rel="noopener">Historique commits</a></li>
        <li><a href="https://claude.ai/code/routines" target="_blank" rel="noopener">Routine Claude Code</a></li>
      </ul>
    </div>
  </div>
  <div class="container">
    <div class="legal">
      <span>Léo Marty · Lynxter · 2026</span>
      <span>Généré par routine Claude Code</span>
    </div>
  </div>
</footer>

<script src="../assets/app.js" defer></script>
</body>
</html>
`;
}

const LOGOS = {
  Anthropic: 'anthropic', OpenAI: 'openai', 'Google DeepMind': 'googlegemini',
  Google: 'googlegemini', Meta: 'meta', Mistral: 'mistralai',
};
const TAGS = {
  lynxter: '<span class="tag tag-lynxter">🎯 Lynxter</span>',
  useful: '<span class="tag tag-useful">🛠 Utile</span>',
  info: '<span class="tag tag-info">· Info</span>',
};

module.exports = { head, footer, LOGOS, TAGS };
