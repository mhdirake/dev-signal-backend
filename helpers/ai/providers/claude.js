'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT, USER_PROMPT } = require('../prompt');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PRICE_PER_MTOK = {
  'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
  'claude-opus-4-8':   { input: 5.00, output: 25.00 },
  'claude-opus-4-7':   { input: 5.00, output: 25.00 },
  'claude-opus-4-6':   { input: 5.00, output: 25.00 },
  'claude-haiku-4-5':  { input: 1.00, output: 5.00 },
};

function computeCost(modelName, inputTokens, outputTokens) {
  const price = PRICE_PER_MTOK[modelName] || PRICE_PER_MTOK['claude-sonnet-4-6'];
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

async function call(systemPrompt, userMessage, maxTokens = 1024, feature = 'unknown') {
  const modelName = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
  const response = await client.messages.create({
    model: modelName,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  });

  const usage = response.usage;
  if (usage) {
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    require('@models').TokenUsage.create({
      provider: 'anthropic',
      model: modelName,
      feature,
      inputTokens,
      outputTokens,
      costUsd: computeCost(modelName, inputTokens, outputTokens),
    }).catch(err => console.error('[claude] token tracking failed:', err.message));
  }

  return JSON.parse(response.content[0].text.trim());
}

module.exports = {
  analyzeContent: (item) => call(SYSTEM_PROMPT, USER_PROMPT(item), 1024, 'analyze'),
  call,
};
