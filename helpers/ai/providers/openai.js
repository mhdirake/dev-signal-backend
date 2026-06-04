'use strict';

// npm install openai
const OpenAI = require('openai');
const { SYSTEM_PROMPT, USER_PROMPT } = require('../prompt');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async function analyzeContent(item) {
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT(item) },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
};
