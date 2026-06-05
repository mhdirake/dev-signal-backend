'use strict';

const { sendMessageToUser } = require('./index');
const escapeHtml = require('./escapeHtml');

module.exports = async function notifyAdmin(post, persianSummary) {
  const adminId = process.env.ADMIN_TELEGRAM_USER_ID;

  const text = [
    `🔔 <b>پست جدید آماده انتشار</b>`,
    ``,
    `📰 <b>${escapeHtml(post.headline)}</b>`,
    ``,
    `<b>TL;DR</b>`,
    escapeHtml(post.tldr),
    ``,
    `──────────────────`,
    `🇮🇷 <b>خلاصه فارسی</b>`,
    escapeHtml(persianSummary),
    `──────────────────`,
    `📂 دسته‌بندی: <code>${post.category}</code>`,
    `⭐️ امتیاز: <code>${parseFloat(post.relevanceScore).toFixed(2)}</code>`,
  ].join('\n');

  const reply_markup = {
    inline_keyboard: [[
      { text: '✅ انتشار در کانال', callback_data: `publish:${post.id}` },
      { text: '❌ رد کردن', callback_data: `cancel:${post.id}` },
    ]],
  };

  return sendMessageToUser(adminId, text, { reply_markup });
};
