'use strict';

const { call } = require('./index');

const SYSTEM_PROMPT = `You are a senior developer blogger. Given a structured DevSignal intelligence post about a software topic, write a complete, high-quality blog post for developers.

Return a JSON object with exactly these fields:
- title: string — compelling, specific blog post title
- slug: string — URL-friendly slug derived from title (lowercase, hyphens, no special chars)
- summary: string — 2–3 sentence paragraph summarizing the post for previews
- content: string — full blog post in Markdown with headers and a conclusion section. At least 600 words.
- tags: array of strings — 3–6 relevant tech tags (e.g. ["Next.js", "Performance", "React"])
- readTime: number — estimated reading time in minutes (integer)

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
    post.rawItem?.source?.name && `Source: ${post.rawItem.source.name}`,
  ].filter(Boolean).join('\n');
}

module.exports = async function generateBlogPost(post) {
  return call(SYSTEM_PROMPT, buildUserMessage(post), 4096);
};
