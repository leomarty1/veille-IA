/* build/templates/brief.js — page brief depuis le JSON du brief. */
'use strict';
const { head, footer, LOGOS, TAGS } = require('../lib');

const H1_STYLE = 'font-family:var(--font-display);font-stretch:125%;font-weight:300;font-size:clamp(36px,5.5vw,64px);text-transform:uppercase;letter-spacing:-0.005em;line-height:1.02;margin:0 0 28px;color:var(--text);';
const INTRO_STYLE = 'font-size:18px;font-weight:300;color:var(--text-soft);max-width:720px;margin:0 0 48px;line-height:1.7;';

const plural = (n) => (n > 1 ? 'items' : 'item');

function sourcesLine(sources) {
  return sources
    .map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`)
    .join(' · ');
}

function article(it) {
  const tag = TAGS[it.tag];
  const date = `<span class="item-date">${it.date}</span>`;
  if (it.tag === 'info') {
    return `        <article class="item item-compact">
          <div class="item-head">
            <h3 class="item-title">${it.title}</h3>
            ${tag}
            ${date}
          </div>
          <p class="item-context">${it.context_html}</p>
        </article>`;
  }
  return `        <article class="item">
          <div class="item-head">
            <h3 class="item-title"><a href="../items/${it.slug}.html">${it.title}</a></h3>
            ${tag}
            ${date}
          </div>
          <p class="item-context">${it.context_html}</p>
          <p class="item-source">${sourcesLine(it.sources)}</p>
        </article>`;
}

function actorSection(actor, items, emptyMsg) {
  const slug = LOGOS[actor] || actor.toLowerCase();
  const n = items.length;
  const logo = `<img class="actor-logo" src="https://cdn.simpleicons.org/${slug}/1b1818/f3f1ee" alt="" />`;
  const body = n
    ? items.map(article).join('\n\n')
    : `        <p class="actor-empty">${emptyMsg || 'Rien de notable cette semaine.'}</p>`;
  return `      <!-- ─── ${actor.toUpperCase()} ─── -->
      <section class="actor-section reveal">
        <h2>${logo}${actor}<span class="count">${n} ${plural(n)}</span></h2>

${body}
      </section>`;
}

module.exports = function renderBrief(b) {
  const by = (t) => b.items.filter((i) => i.tag === t).length;
  const stat = (num, unit, label) =>
    `          <div class="stat">\n            <div class="stat-num">${num}<span class="unit">${unit}</span></div>\n            <div class="stat-label">${label}</div>\n          </div>`;

  const main = b.actors_order
    .map((a) => actorSection(a, b.items.filter((i) => i.actor === a), (b.actor_empty || {})[a]))
    .join('\n\n');

  const sec = b.items.filter((i) => !b.actors_order.includes(i.actor));
  const secSection = sec.length
    ? `\n\n      <!-- ─── ACTEURS SECONDAIRES ─── -->
      <section class="actor-section reveal">
        <h2 style="font-size:18px;color:var(--text-muted);">Acteurs secondaires<span class="count">${sec.length} ${plural(sec.length)}</span></h2>

${sec.map(article).join('\n\n')}
      </section>`
    : '';

  return head(b.title, b.description, 'briefs') + `
<main>

  <section class="section-sm">
    <div class="container-narrow">

      <div class="breadcrumb">
        <a href="../">Accueil</a>
        <span class="breadcrumb-sep">/</span>
        <a href="./">Briefs</a>
        <span class="breadcrumb-sep">/</span>
        <span class="current">${b.date}</span>
      </div>

      <header style="margin-bottom:64px;">
        <p class="section-label">Brief hebdomadaire · ${b.period}</p>
        <h1 style="${H1_STYLE}">${b.title_html}</h1>
        <p style="${INTRO_STYLE}">${b.intro_html}</p>

        <div class="stat-strip">
${stat(b.items.length, 'items', 'Total semaine')}
${stat(by('lynxter'), '🎯', 'Impact Lynxter')}
${stat(by('useful'), '🛠', 'À connaître')}
${stat(b.actors_scanned, 'acteurs', 'Sources scannées')}
        </div>
      </header>

      <p class="section-label">TL;DR</p>
      <section class="tldr reveal" style="margin-bottom:72px;">
        <ul>
${b.tldr.map((t) => `          <li>${t}</li>`).join('\n')}
        </ul>
      </section>

      <section class="lynxter-hero reveal">
        <h2>🎯 Implications Lynxter</h2>
        <div class="body">
${b.lynxter_hero.map((p) => `          <p>${p}</p>`).join('\n')}
        </div>
      </section>

      <p class="section-label">Synthèse</p>
      <section class="synthese reveal">
        ${b.synthese_html}
      </section>

${main}${secSection}

      <section class="sources-footer">
        <strong>Sources consultées</strong>
        ${(b.sources_footer || []).map((s) => `<a href="${s.url}">${s.label}</a>`).join(' · ')}
      </section>

      <nav class="brief-nav">
        <a class="prev" href="${b.prev.href}">
          <span class="label">← Brief précédent</span>
          <span class="title">${b.prev.title}</span>
        </a>
        <a class="next" href="./">
          <span class="label">Voir l'archive →</span>
          <span class="title">Tous les briefs</span>
        </a>
      </nav>

    </div>
  </section>

</main>
` + footer(`Brief généré le ${b.date}`);
};
