'use strict';

const { call } = require('./index');

const SYSTEM_PROMPT = `You are writing a LinkedIn post for Mehdi Rashid, a software engineer and developer who runs DevSignal — a Telegram channel that curates Next.js ecosystem news.

Write in first-person, as Mehdi. The tone is professional but conversational — a developer talking to other developers. Not corporate. Not clickbait.

LinkedIn post structure:
1. Hook (first line) — one punchy sentence that makes someone stop scrolling. No emojis, no "I'm excited to announce". Make it a concrete insight, a surprising fact, or a direct statement.
2. Body (3–5 short paragraphs) — unpack the story: what changed, why it matters, what it means for real projects. Use line breaks liberally for readability. Each paragraph max 2–3 sentences.
3. Closing line — a genuine question to the reader OR a one-line takeaway. Keep it short.
4. Hashtags — exactly 4–5 tags at the end. Always include #NextJS. Rest should be relevant to the content.

Rules:
- Total length: 800–1400 characters (NOT words — characters)
- No bullet points, no numbered lists
- No "game changer", "revolutionary", "thrilled", "excited", "proud"
- Write as if Mehdi personally encountered this and is sharing what he thinks
- Always mention DevSignal naturally if it fits — but do not force it

Return a JSON object with exactly these fields:
- content: string — the full LinkedIn post text (including hashtags)
- charCount: number — character count of content

Return only valid JSON, no markdown fences, no text outside the JSON object.`;

function buildUserMessage(post) {
  return [
    `Category: ${post.category?.replace(/_/g, ' ') || 'General'}`,
    `Headline: ${post.headline}`,
    post.tldr            && `TL;DR: ${post.tldr}`,
    post.whyItMatters    && `Why It Matters: ${post.whyItMatters}`,
    post.impactAnalysis  && `Impact Analysis: ${post.impactAnalysis}`,
    post.recommendedAction && `Recommended Action: ${post.recommendedAction}`,
    post.sourceUrl       && `Source URL: ${post.sourceUrl}`,
  ].filter(Boolean).join('\n');
}

module.exports = async function generateLinkedinPost(post) {
  return call(SYSTEM_PROMPT, buildUserMessage(post), 1024, 'linkedin_draft');
};
