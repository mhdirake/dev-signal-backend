'use strict';

const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

module.exports = async function generatePersianSummary(post) {
  const response = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `یک خلاصه فنی و مختصر از این خبر توسعه‌دهندگان را به فارسی بنویس. حداکثر ۳ جمله. فنی و دقیق باش.

عنوان: ${post.headline}
خلاصه: ${post.tldr}
چرا مهم است: ${post.whyItMatters}`,
    }],
    max_tokens: 400,
  });

  return response.choices[0].message.content.trim();
};
