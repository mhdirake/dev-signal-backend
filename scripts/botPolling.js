'use strict';

const axios = require('axios');
const { Post, PublishLog } = require('@models');
const { publishQueue } = require('@queues/workers/publishWorker');
const { answerCallbackQuery, editMessageReplyMarkup, sendMessageToUser } = require('@helpers/telegram');

const BASE_URL = () =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

const ADMIN_ID = () => process.env.ADMIN_TELEGRAM_USER_ID;

let offset = 0;

async function getUpdates() {
  try {
    const { data } = await axios.get(`${BASE_URL()}/getUpdates`, {
      params: { offset, timeout: 30, allowed_updates: ['callback_query', 'message'] },
      timeout: 35000,
    });

    if (!data.ok || !data.result.length) return;

    for (const update of data.result) {
      offset = update.update_id + 1;
      await handleUpdate(update);
    }
  } catch (err) {
    if (!err.message?.includes('ECONNREFUSED') && !err.message?.includes('timeout')) {
      console.error('[botPolling] Error:', err.message);
    }
  }
}

async function handleUpdate(update) {
  // Handle /start — register admin chat ID
  if (update.message?.text === '/start') {
    const chatId = update.message.chat.id;
    const username = update.message.from?.username;
    console.log(`[botPolling] /start from ${username} — chat_id: ${chatId}`);
    await sendMessageToUser(chatId, `✅ سلام! آیدی تلگرامت <code>${chatId}</code> هست.\n\nاین عدد رو در ADMIN_TELEGRAM_USER_ID بذار.`);
    return;
  }

  if (!update.callback_query) return;

  const { id: callbackId, data: callbackData, message, from } = update.callback_query;
  if (!callbackData) return;

  const [action, postIdStr] = callbackData.split(':');
  const postId = parseInt(postIdStr);

  if (action === 'publish') {
    try {
      const post = await Post.findByPk(postId);
      if (!post) {
        await answerCallbackQuery(callbackId, '⚠️ پست پیدا نشد');
        return;
      }
      if (post.status === 'published') {
        await answerCallbackQuery(callbackId, '✅ قبلاً منتشر شده');
        await editMessageReplyMarkup(message.chat.id, message.message_id);
        return;
      }

      await answerCallbackQuery(callbackId, '⏳ در حال انتشار...');
      await editMessageReplyMarkup(message.chat.id, message.message_id);

      await publishQueue.add('publish', { postId: post.id }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
      });

      await sendMessageToUser(ADMIN_ID(), `✅ پست به صف انتشار اضافه شد.\n\n📰 <b>${post.headline}</b>`);
    } catch (err) {
      console.error('[botPolling] publish error:', err.message);
      await answerCallbackQuery(callbackId, '❌ خطا در انتشار');
    }

  } else if (action === 'cancel') {
    try {
      await Post.update({ status: 'rejected' }, { where: { id: postId } });
      await answerCallbackQuery(callbackId, '❌ پست رد شد');
      await editMessageReplyMarkup(message.chat.id, message.message_id);
      await sendMessageToUser(ADMIN_ID(), `❌ پست رد شد و منتشر نخواهد شد.`);
    } catch (err) {
      console.error('[botPolling] cancel error:', err.message);
    }
  }
}

function startPolling() {
  console.log('[botPolling] Started — listening for Telegram updates');

  async function poll() {
    await getUpdates();
    setImmediate(poll);
  }

  poll();
}

module.exports = { startPolling };
