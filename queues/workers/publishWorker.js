'use strict';

const { Worker, Queue } = require('bullmq');
const { connectionOptions } = require('@config/redis');

const QUEUE_NAME = 'publish';

const publishQueue = new Queue(QUEUE_NAME, { connection: connectionOptions });

const worker = new Worker(QUEUE_NAME, async (job) => {
  const { postId } = job.data;
  console.log(`[publishWorker] Publishing post ${postId}`);
  // TODO: Block 5 — Telegram Bot API publish logic
}, { connection: connectionOptions });

worker.on('failed', (job, err) => {
  console.error(`[publishWorker] Job ${job.id} failed:`, err.message);
});

module.exports = { publishQueue };
