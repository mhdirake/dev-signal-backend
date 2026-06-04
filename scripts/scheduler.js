'use strict';

const cron = require('node-cron');
const { Source } = require('@models');
const { fetchQueue } = require('@queues/workers/fetchWorker');

// Every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('[scheduler] Starting fetch cycle...');
  try {
    const sources = await Source.findAll({ where: { active: true } });
    for (const source of sources) {
      await fetchQueue.add('fetch', { sourceId: source.id });
    }
    console.log(`[scheduler] Enqueued ${sources.length} sources`);
  } catch (err) {
    console.error('[scheduler] Fetch cycle failed:', err.message);
  }
});

console.log('[scheduler] Cron registered — runs every 30 minutes');
