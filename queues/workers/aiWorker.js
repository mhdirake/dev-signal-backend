'use strict';

const { Worker, Queue } = require('bullmq');
const { Op } = require('sequelize');
const { connectionOptions } = require('@config/redis');
const { RawItem, Post, PostTranslation } = require('@models');
const { analyzeContent } = require('@helpers/ai');
const generatePersianSummary = require('@helpers/ai/persian');
const generateLinkedinPost = require('@helpers/ai/linkedinGenerator');
const translatePostToFarsi = require('@helpers/ai/translatePost');
const notifyAdmin = require('@helpers/telegram/adminNotifier');

const QUEUE_NAME = 'ai';
const RELEVANCE_THRESHOLD = 0.5;
const DUPLICATE_THRESHOLD = 0.6;
const DUPLICATE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function headlineSimilarity(a, b) {
  const words = s => new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
  const A = words(a), B = words(b);
  const intersection = new Set([...A].filter(x => B.has(x)));
  const union = new Set([...A, ...B]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

const aiQueue = new Queue(QUEUE_NAME, { connection: connectionOptions });

const worker = new Worker(QUEUE_NAME, async (job) => {
  const { rawItemId } = job.data;

  const rawItem = await RawItem.findByPk(rawItemId, { include: [{ association: 'source' }] });
  if (!rawItem || rawItem.processed) return;

  const result = await analyzeContent({
    title: rawItem.title,
    url: rawItem.url,
    body: rawItem.body,
  });

  await rawItem.update({ processed: true });

  if (result.relevanceScore < RELEVANCE_THRESHOLD) {
    console.log(`[aiWorker] Skipped raw item ${rawItemId} — score: ${result.relevanceScore}`);
    return;
  }

  const recentPosts = await Post.findAll({
    where: {
      status: { [Op.ne]: 'rejected' },
      createdAt: { [Op.gte]: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    },
    attributes: ['id', 'headline'],
  });

  const duplicate = recentPosts.find(
    p => headlineSimilarity(p.headline, result.headline) >= DUPLICATE_THRESHOLD
  );

  if (duplicate) {
    console.log(`[aiWorker] Duplicate of post ${duplicate.id} — skipping raw item ${rawItemId}`);
    return;
  }

  const post = await Post.create({
    rawItemId: rawItem.id,
    category: result.category,
    relevanceScore: result.relevanceScore,
    headline: result.headline,
    tldr: result.tldr,
    whyItMatters: result.whyItMatters,
    impactAnalysis: result.impactAnalysis,
    recommendedAction: result.recommendedAction,
    sourceUrl: rawItem.url,
    status: 'pending',
  });

  console.log(`[aiWorker] Created post ${post.id} — score: ${result.relevanceScore}, category: ${result.category}`);

  const sourceType = rawItem.source?.type;
  const linkedinEligible = sourceType !== 'npm' && result.relevanceScore >= 0.7;

  Promise.all([
    generatePersianSummary(post),
    linkedinEligible
      ? generateLinkedinPost(post)
          .then(async res => {
            if (res?.content) await post.update({ linkedinDraft: res.content });
            return res?.content || null;
          })
          .catch(err => {
            console.error('[aiWorker] linkedin failed:', err.message);
            return null;
          })
      : Promise.resolve(null),
    translatePostToFarsi(post)
      .then(async translation => {
        await PostTranslation.upsert({
          postId: post.id,
          locale: 'fa',
          headline: translation.headline,
          tldr: translation.tldr,
          whyItMatters: translation.whyItMatters,
          impactAnalysis: translation.impactAnalysis,
          recommendedAction: translation.recommendedAction,
        });
        return translation;
      })
      .catch(err => {
        console.error('[aiWorker] translation failed:', err.message);
        return null;
      }),
  ])
    .then(([summary, linkedinDraft]) => notifyAdmin(post, summary, linkedinDraft))
    .catch(err => console.error('[aiWorker] notify failed:', err.message));
}, { connection: connectionOptions });

worker.on('ready', () => console.log('[aiWorker] Worker ready'));
worker.on('error', (err) => console.error('[aiWorker] Worker error:', err.message));
worker.on('failed', (job, err) => {
  console.error(`[aiWorker] Job ${job.id} failed:`, err.message);
});

module.exports = { aiQueue };
