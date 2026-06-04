'use strict';

const { Source, RawItem } = require('@models');
const { fetchQueue } = require('@queues/workers/fetchWorker');
const { aiQueue } = require('@queues/workers/aiWorker');

module.exports = (app) => {
  app.get('/api/system/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.post('/api/system/fetch-now', async (req, res) => {
    const { sourceId } = req.body;
    if (sourceId) {
      await fetchQueue.add('fetch', { sourceId: parseInt(sourceId) });
      return res.json({ queued: 1 });
    }
    const sources = await Source.findAll({ where: { active: true } });
    for (const source of sources) {
      await fetchQueue.add('fetch', { sourceId: source.id });
    }
    res.json({ queued: sources.length });
  });

  app.post('/api/system/process-now', async (req, res) => {
    const items = await RawItem.findAll({ where: { processed: false } });
    for (const item of items) {
      await aiQueue.add('process', { rawItemId: item.id });
    }
    res.json({ queued: items.length });
  });
};
