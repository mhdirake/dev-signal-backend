'use strict';

const { Worker, Queue } = require('bullmq');
const { connectionOptions } = require('@config/redis');
const { Post, PublishLog } = require('@models');
const { sendMessage } = require('@helpers/telegram');
const formatPost = require('@helpers/telegram/formatter');
const logJob = require('@helpers/jobLogger');

const QUEUE_NAME = 'publish';

const publishQueue = new Queue(QUEUE_NAME, { connection: connectionOptions });

const worker = new Worker(QUEUE_NAME, async (job) => {
  const { postId } = job.data;

  const post = await Post.findByPk(postId);
  if (!post) throw new Error(`Post ${postId} not found`);

  if (post.status === 'published') {
    console.log(`[publishWorker] Post ${postId} already published — skipping`);
    logJob({ queue: 'publish', job: 'publish', status: 'skipped', summary: `Post #${postId} already published`, meta: { postId } });
    return;
  }

  const text = formatPost(post);

  let result;
  try {
    result = await sendMessage(text);
  } catch (err) {
    await PublishLog.create({ postId: post.id, status: 'failed', error: err.message });
    logJob({ queue: 'publish', job: 'publish', status: 'failed', summary: `Failed to publish post #${postId}: ${err.message}`, meta: { postId, headline: post.headline } });
    throw err; // let BullMQ retry
  }

  await post.update({
    status: 'published',
    publishedAt: new Date(),
    telegramMessageId: String(result.message_id),
  });

  await PublishLog.create({
    postId: post.id,
    telegramMessageId: String(result.message_id),
    status: 'success',
  });

  logJob({ queue: 'publish', job: 'publish', status: 'success', summary: `Published → Telegram #${result.message_id}: "${post.headline.length > 60 ? post.headline.slice(0, 60) + '…' : post.headline}"`, meta: { postId, telegramMessageId: result.message_id } });
  console.log(`[publishWorker] Post ${postId} published → Telegram message ${result.message_id}`);
}, { connection: connectionOptions });

worker.on('ready', () => console.log('[publishWorker] Worker ready'));
worker.on('error', (err) => console.error('[publishWorker] Worker error:', err.message));
worker.on('failed', (job, err) => {
  console.error(`[publishWorker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  logJob({ queue: 'publish', job: 'publish', status: 'failed', summary: err.message, meta: { jobId: job?.id, data: job?.data } });
});

module.exports = { publishQueue };
