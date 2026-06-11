'use strict';

const { call } = require('./index');

const SYSTEM_PROMPT = `You are a technical translator. Translate the given developer news post fields from English to Persian (Farsi).

Rules:
- Keep technical terms in English (Next.js, React, TypeScript, API, etc.)
- Translate naturally — not word-for-word
- Stay concise and technical in tone
- Do NOT add extra commentary or explanation

Return a JSON object with exactly these fields:
- headline: string
- tldr: string
- whyItMatters: string
- impactAnalysis: string
- recommendedAction: string

Return only valid JSON, no markdown fences, no text outside the JSON object.`;

function buildUserMessage(post) {
  return JSON.stringify({
    headline: post.headline,
    tldr: post.tldr,
    whyItMatters: post.whyItMatters,
    impactAnalysis: post.impactAnalysis,
    recommendedAction: post.recommendedAction,
  });
}

module.exports = async function translatePostToFarsi(post) {
  return call(SYSTEM_PROMPT, buildUserMessage(post), 1200, 'translate_post');
};
