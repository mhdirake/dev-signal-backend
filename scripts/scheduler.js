'use strict';

const cron = require('node-cron');
const { Op } = require('sequelize');
const { Source, Post } = require('@models');
const { fetchQueue } = require('@queues/workers/fetchWorker');
const { publishQueue } = require('@queues/workers/publishWorker');
const { listTasks } = require('@helpers/calendar');
const { sendMessageToUser } = require('@helpers/telegram');

// Every 30 minutes — fetch new content from sources
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

// Every minute — publish scheduled posts whose time has come
cron.schedule('* * * * *', async () => {
  try {
    const due = await Post.findAll({
      where: {
        status: 'scheduled',
        scheduledAt: { [Op.lte]: new Date() },
      },
    });

    if (!due.length) return;

    for (const post of due) {
      await publishQueue.add('publish', { postId: post.id }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
      });
    }

    console.log(`[scheduler] Enqueued ${due.length} scheduled post(s) for publishing`);
  } catch (err) {
    console.error('[scheduler] Scheduled publish cycle failed:', err.message);
  }
});

// Every morning at 8:00 AM Tehran — send daily task briefing
cron.schedule('0 8 * * *', async () => {
  try {
    const adminId = process.env.ADMIN_TELEGRAM_USER_ID;
    const message = await listTasks({ days: 1 });
    const header = `☀️ <b>Good morning! Today's tasks:</b>\n\n`;
    await sendMessageToUser(adminId, header + message.replace(/^📅 <b>.*?<\/b>\n\n/, ''));
    console.log('[scheduler] Daily briefing sent');
  } catch (err) {
    console.error('[scheduler] Daily briefing failed:', err.message);
  }
}, { timezone: 'Asia/Tehran' });

console.log('[scheduler] Cron registered — fetch every 30min, publish check every 1min, briefing at 8AM');
