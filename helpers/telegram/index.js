'use strict';

const axios = require('axios');

const BASE_URL = () =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendMessage(text) {
  const { data } = await axios.post(`${BASE_URL()}/sendMessage`, {
    chat_id: process.env.TELEGRAM_CHANNEL_ID,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: false },
  });
  if (!data.ok) throw new Error(`Telegram error: ${data.description}`);
  return data.result;
}

async function sendMessageToUser(chatId, text, extra = {}) {
  const { data } = await axios.post(`${BASE_URL()}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...extra,
  });
  if (!data.ok) throw new Error(`Telegram error: ${data.description}`);
  return data.result;
}

async function answerCallbackQuery(callbackQueryId, text = '') {
  await axios.post(`${BASE_URL()}/answerCallbackQuery`, {
    callback_query_id: callbackQueryId,
    text,
  });
}

async function editMessageReplyMarkup(chatId, messageId, replyMarkup = { inline_keyboard: [] }) {
  await axios.post(`${BASE_URL()}/editMessageReplyMarkup`, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: replyMarkup,
  });
}

async function deleteMessage(messageId) {
  await axios.post(`${BASE_URL()}/deleteMessage`, {
    chat_id: process.env.TELEGRAM_CHANNEL_ID,
    message_id: messageId,
  });
}

module.exports = { sendMessage, sendMessageToUser, answerCallbackQuery, editMessageReplyMarkup, deleteMessage };
