'use strict';

const { Worker, Queue } = require('bullmq');
const { Op } = require('sequelize');
const { connectionOptions } = require('@config/redis');
const { Source, RawItem } = require('@models');
const githubFetcher = require('@helpers/fetchers/githubFetcher');
const rssFetcher = require('@helpers/fetchers/rssFetcher');
const npmFetcher = require('@helpers/fetchers/npmFetcher');
const logJob = require('@helpers/jobLogger');

const QUEUE_NAME = 'fetch';

const fetchQueue = new Queue(QUEUE_NAME, { connection: connectionOptions });

const fetchers = {
  github_release: githubFetcher,
  rss: rssFetcher,
  npm: npmFetcher,
};

const worker = new Worker(QUEUE_NAME, async (job) => {
  const { sourceId } = job.data;

  const source = await Source.findByPk(sourceId);
  if (!source || !source.active) return;

  const fetcher = fetchers[source.type];
  if (!fetcher) throw new Error(`Unknown source type: ${source.type}`);

  const items = await fetcher(source.identifier, source.lastFetchedAt);

  if (!items.length) {
    console.log(`[fetchWorker] No new items for "${source.name}"`);
    await source.update({ lastFetchedAt: new Date() });
    logJob({ queue: 'fetch', job: 'fetch', status: 'skipped', summary: `No new items from "${source.name}"`, meta: { sourceId, sourceName: source.name } });
    return;
  }

  const existingIds = await RawItem.findAll({
    where: { sourceId, externalId: { [Op.in]: items.map(i => i.externalId) } },
    attributes: ['externalId'],
  }).then(rows => new Set(rows.map(r => r.externalId)));

  const newItems = items.filter(i => !existingIds.has(i.externalId));

  if (!newItems.length) {
    console.log(`[fetchWorker] All items already saved for "${source.name}"`);
    await source.update({ lastFetchedAt: new Date() });
    logJob({ queue: 'fetch', job: 'fetch', status: 'skipped', summary: `All items already saved for "${source.name}"`, meta: { sourceId, sourceName: source.name } });
    return;
  }

  const created = await RawItem.bulkCreate(
    newItems.map(item => ({ ...item, sourceId }))
  );

  console.log(`[fetchWorker] Saved ${created.length} new items for "${source.name}"`);
  await source.update({ lastFetchedAt: new Date() });
  logJob({ queue: 'fetch', job: 'fetch', status: 'success', summary: `Fetched ${created.length} new item${created.length > 1 ? 's' : ''} from "${source.name}"`, meta: { sourceId, sourceName: source.name, count: created.length } });

  const { aiQueue } = require('@queues/workers/aiWorker');
  for (const item of created) {
    await aiQueue.add('process', { rawItemId: item.id });
  }
}, { connection: connectionOptions });

worker.on('ready', () => console.log('[fetchWorker] Worker ready'));
worker.on('error', (err) => console.error('[fetchWorker] Worker error:', err.message));
worker.on('failed', (job, err) => {
  console.error(`[fetchWorker] Job ${job.id} failed:`, err.message);
  logJob({ queue: 'fetch', job: 'fetch', status: 'failed', summary: err.message, meta: { jobId: job.id, data: job.data } });
});

module.exports = { fetchQueue };
