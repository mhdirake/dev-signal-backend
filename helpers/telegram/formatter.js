'use strict';

const escape = require('./escapeHtml');

const CATEGORY_TAGS = {
  news_intelligence: '#NewsIntelligence',
  architecture_insights: '#ArchitectureInsights',
  performance_signals: '#PerformanceSignals',
  ecosystem_signals: '#EcosystemSignals',
};

const CATEGORY_ICONS = {
  news_intelligence: '📰',
  architecture_insights: '🏗',
  performance_signals: '⚡️',
  ecosystem_signals: '🌐',
};

module.exports = function formatPost(post) {
  const icon = CATEGORY_ICONS[post.category] || '📡';
  const tag = CATEGORY_TAGS[post.category] || '';

  return [
    `${icon} <b>${escape(post.headline)}</b>`,
    '',
    `<b>TL;DR</b>`,
    escape(post.tldr),
    '',
    `<b>Why It Matters</b>`,
    escape(post.whyItMatters),
    '',
    `<b>Impact Analysis</b>`,
    escape(post.impactAnalysis),
    '',
    `<b>Recommended Action</b>`,
    escape(post.recommendedAction),
    '',
    `<a href="${escape(post.sourceUrl)}">🔗 Read More</a>`,
    '',
    `${tag} #NextJS #DevSignal`,
  ].join('\n');
};
