'use strict';

const { Worker, Queue } = require('bullmq');
const { connectionOptions } = require('@config/redis');
const { RawItem, Post } = require('@models');
const { analyzeContent } = require('@helpers/ai');
const generatePersianSummary = require('@helpers/ai/persian');
const notifyAdmin = require('@helpers/telegram/adminNotifier');

const QUEUE_NAME = 'ai';
const RELEVANCE_THRESHOLD = 0.5;

const aiQueue = new Queue(QUEUE_NAME, { connection: connectionOptions });

const worker = new Worker(QUEUE_NAME, async (job) => {
  const { rawItemId } = job.data;

  const rawItem = await RawItem.findByPk(rawItemId);
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

  generatePersianSummary(post)
    .then(summary => notifyAdmin(post, summary))
    .catch(err => console.error('[aiWorker] notify failed:', err.message));
}, { connection: connectionOptions });

worker.on('ready', () => console.log('[aiWorker] Worker ready'));
worker.on('error', (err) => console.error('[aiWorker] Worker error:', err.message));
worker.on('failed', (job, err) => {
  console.error(`[aiWorker] Job ${job.id} failed:`, err.message);
});

module.exports = { aiQueue };
