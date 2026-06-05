/* build/templates/item.js — page détail d'un item 🎯/🛠 depuis son JSON. */
'use strict';
const { head, footer } = require('../lib');

const TAG_FULL = {
  lynxter: '<span class="tag tag-lynxter">🎯 Lynxter</span>',
  useful: '<span class="tag tag-useful">🛠 Utile</span>',
};
const TAG_MINI = {
  lynxter: '<span class="tag tag-lynxter">🎯</span>',
  useful: '<span class="tag tag-useful">🛠</span>',
  info: '<span class="tag tag-info">·</span>',
};
const LYNXTER_H2 = {
  lynxter: "🎯 Pourquoi c'est important pour Lynxter",
  useful: "🛠 Pourquoi c'est utile à savoir pour Lynxter",
};

// it = item (avec it.detail) ; ctx = { brief_date, brief_title }
module.exports = function renderItem(it, ctx) {
  const d = it.detail;
  const stat = (s) =>
    `          <div class="stat">\n            <div class="stat-num">${s.num}<span class="unit">${s.unit}</span></div>\n            <div class="stat-label">${s.label}</div>\n          </div>`;
  const related = (r) =>
    `          <li><a href="${r.slug}.html">
            <span class="related-actor">${r.actor}</span>
            <span class="related-title">${r.title}</span>
            ${TAG_MINI[r.tag]}
          </a></li>`;
  const navLink = (cls, n) =>
    n
      ? `        <a class="${cls}" href="${n.href}">
          <span class="label">${n.label}</span>
          <span class="title">${n.title}</span>
        </a>`
      : '';

  return head(it.title, d.description || '', null) + `
<main>

  <section class="section-sm">
    <div class="container-narrow">

      <div class="breadcrumb">
        <a href="../">Accueil</a>
        <span class="breadcrumb-sep">/</span>
        <a href="../briefs/">Briefs</a>
        <span class="breadcrumb-sep">/</span>
        <a href="../briefs/${ctx.brief_date}.html">${ctx.brief_date}</a>
        <span class="breadcrumb-sep">/</span>
        <span class="current">${d.short}</span>
      </div>

      <div class="item-detail-hero">
        <div class="item-detail-meta-top">
          <span class="actor-name">${it.actor}</span>
          <span class="dot-sep">·</span>
          <span>${d.date_long}</span>
          <span class="dot-sep">·</span>
          ${TAG_FULL[it.tag]}
        </div>
        <h1>${it.title}</h1>
        <p class="item-detail-from">Extrait du brief <a href="../briefs/${ctx.brief_date}.html">${ctx.brief_title} — ${ctx.brief_date}</a></p>
      </div>

      <div class="detail-block">
        <p class="detail-block-label">Chiffres clés</p>
        <div class="stat-strip">
${d.stats.map(stat).join('\n')}
        </div>
      </div>

      <div class="detail-block">
        <p class="detail-block-label">Contexte étendu</p>
${d.context_paragraphs.map((p) => `        <p>${p}</p>`).join('\n')}
      </div>

      <section class="detail-lynxter">
        <h2>${LYNXTER_H2[it.tag]}</h2>
${d.lynxter_paragraphs.map((p) => `        <p>${p}</p>`).join('\n')}
      </section>

      <div class="source-block" style="margin-top:48px;">
        <strong>Source ${d.source.kind}</strong>
        <a class="source-url" href="${d.source.url}" target="_blank" rel="noopener">${d.source.label}</a>
        <span class="source-meta">${d.source.meta}</span>
      </div>

      <div class="related-items">
        <h3>Items connexes</h3>
        <ul class="related-list">
${d.related.map(related).join('\n')}
        </ul>
      </div>

      <nav class="brief-nav">
${navLink('prev', d.nav && d.nav.prev)}
${navLink('next', d.nav && d.nav.next)}
      </nav>

    </div>
  </section>

</main>
` + footer(`Item · brief ${ctx.brief_date}`);
};
