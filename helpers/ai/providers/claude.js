'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT, USER_PROMPT } = require('../prompt');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = async function analyzeContent(item) {
  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: USER_PROMPT(item) }],
  });

  return JSON.parse(response.content[0].text.trim());
};
