'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT, USER_PROMPT } = require('../prompt');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function call(systemPrompt, userMessage, maxTokens = 1024) {
  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  });
  return JSON.parse(response.content[0].text.trim());
}

module.exports = {
  analyzeContent: (item) => call(SYSTEM_PROMPT, USER_PROMPT(item)),
  call,
};
