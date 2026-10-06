/* ════════════════════════════════════════════════════════════════
   build/charte.js — statut d'un outil ou d'un modèle au regard de la
   Charte IA Lynxter (v0.2, §8 « Outil utilisé »). Une seule table,
   utilisée par le brief et le comparateur : si la charte change, on
   change ici et tout le site suit.
     • Claude / Mistral (compte pro)  → données publiques + internes anonymisées
     • ChatGPT                        → données publiques uniquement
     • autres IA cloud                → hors cadre officiel, données publiques uniquement
     • infra locale (à venir)         → toutes données ; concerne les modèles ouverts
   ════════════════════════════════════════════════════════════════ */
'use strict';

const STATUS = {
  ok: { cls: 'ch-ok', short: 'Autorisé', long: 'Autorisé par la charte : données publiques et données internes anonymisées' },
  vert: { cls: 'ch-vert', short: 'Données publiques seulement', long: 'ChatGPT : données publiques uniquement' },
  'hors-cadre': { cls: 'ch-non', short: 'Hors cadre', long: 'Hors du cadre officiel de la charte : données publiques uniquement' },
  local: { cls: 'ch-local', short: 'Infra locale ?', long: 'Modèle ouvert : candidat pour la future infrastructure locale Lynxter (seule voie prévue pour les données sensibles)' },
};

const BY_ACTOR = { Anthropic: 'ok', Mistral: 'ok', OpenAI: 'vert' };

/** Statut d'un modèle : override explicite > modèle ouvert > éditeur > hors cadre. */
function statusOf(model) {
  if (model.charte && STATUS[model.charte]) return model.charte;
  if (model.open_weights && !BY_ACTOR[model.actor]) return 'local';
  return BY_ACTOR[model.actor] || 'hors-cadre';
}

function chip(key) {
  const s = STATUS[key];
  if (!s) return '';
  return `<span class="charte ${s.cls}" title="${s.long}">${s.short}</span>`;
}

module.exports = { STATUS, statusOf, chip };
