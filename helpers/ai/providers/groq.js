'use strict';

const OpenAI = require('openai');
const { SYSTEM_PROMPT, USER_PROMPT } = require('../prompt');

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

module.exports = async function analyzeContent(item) {
  const response = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT(item) },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
};
