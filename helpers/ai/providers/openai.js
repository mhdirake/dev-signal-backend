'use strict';

// npm install openai
const OpenAI = require('openai');
const { SYSTEM_PROMPT, USER_PROMPT } = require('../prompt');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function call(systemPrompt, userMessage) {
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });
  return JSON.parse(response.choices[0].message.content);
}

module.exports = {
  analyzeContent: (item) => call(SYSTEM_PROMPT, USER_PROMPT(item)),
  call,
};
