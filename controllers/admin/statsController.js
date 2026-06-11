'use strict';

const { Op, fn, col } = require('sequelize');
const { PublishLog, BlogPost, Post, TokenUsage } = require('@models');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function fillDailyCost(rows, days = 30) {
  const map = {};
  for (const r of rows) {
    map[r.date] = { costUsd: parseFloat(r.costUsd) || 0, inputTokens: Number(r.inputTokens) || 0, outputTokens: Number(r.outputTokens) || 0 };
  }
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    result.push({ date: key, ...(map[key] || { costUsd: 0, inputTokens: 0, outputTokens: 0 }) });
  }
  return result;
}

function fillDailyCount(rows, days = 30) {
  const map = {};
  for (const r of rows) map[r.date] = Number(r.count) || 0;
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    result.push({ date: key, count: map[key] || 0 });
  }
  return result;
}

async function countSince(Model, dateField, whereExtra = {}) {
  const [d1, d7, d30] = await Promise.all([
    Model.count({ where: { ...whereExtra, [dateField]: { [Op.gte]: daysAgo(1) } } }),
    Model.count({ where: { ...whereExtra, [dateField]: { [Op.gte]: daysAgo(7) } } }),
    Model.count({ where: { ...whereExtra, [dateField]: { [Op.gte]: daysAgo(30) } } }),
  ]);
  return { '1d': d1, '7d': d7, '30d': d30 };
}

exports.getStats = async (_req, res) => {
  try {
    const [telegram, blog, linkedin, last30dRows, allTimeRows, dailyCostRows, dailyTelegramRows] = await Promise.all([
      countSince(PublishLog, 'createdAt', { status: 'success' }),
      countSince(BlogPost, 'publishedAt', { status: 'published' }),
      countSince(Post, 'createdAt', { linkedinDraft: { [Op.ne]: null } }),
      TokenUsage.findAll({
        attributes: [
          'provider',
          [fn('SUM', col('inputTokens')), 'totalInput'],
          [fn('SUM', col('outputTokens')), 'totalOutput'],
          [fn('SUM', col('costUsd')), 'totalCost'],
        ],
        where: { createdAt: { [Op.gte]: daysAgo(30) } },
        group: ['provider'],
        raw: true,
      }),
      TokenUsage.findAll({
        attributes: [
          [fn('SUM', col('inputTokens')), 'totalInput'],
          [fn('SUM', col('outputTokens')), 'totalOutput'],
          [fn('SUM', col('costUsd')), 'totalCost'],
        ],
        raw: true,
      }),
      TokenUsage.findAll({
        attributes: [
          [fn('DATE', col('createdAt')), 'date'],
          [fn('SUM', col('costUsd')), 'costUsd'],
          [fn('SUM', col('inputTokens')), 'inputTokens'],
          [fn('SUM', col('outputTokens')), 'outputTokens'],
        ],
        where: { createdAt: { [Op.gte]: daysAgo(30) } },
        group: [fn('DATE', col('createdAt'))],
        order: [[fn('DATE', col('createdAt')), 'ASC']],
        raw: true,
      }),
      PublishLog.findAll({
        attributes: [
          [fn('DATE', col('createdAt')), 'date'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { status: 'success', createdAt: { [Op.gte]: daysAgo(30) } },
        group: [fn('DATE', col('createdAt'))],
        order: [[fn('DATE', col('createdAt')), 'ASC']],
        raw: true,
      }),
    ]);

    const allTime = allTimeRows[0] || {};

    const last30dTotals = last30dRows.reduce((acc, r) => ({
      inputTokens: acc.inputTokens + (Number(r.totalInput) || 0),
      outputTokens: acc.outputTokens + (Number(r.totalOutput) || 0),
      costUsd: acc.costUsd + (parseFloat(r.totalCost) || 0),
    }), { inputTokens: 0, outputTokens: 0, costUsd: 0 });

    res.json({
      telegram,
      blog,
      linkedin,
      tokens: {
        byProvider: last30dRows,
        last30dTotals,
        allTime: {
          inputTokens: Number(allTime.totalInput) || 0,
          outputTokens: Number(allTime.totalOutput) || 0,
          costUsd: parseFloat(allTime.totalCost) || 0,
        },
        dailyCost: fillDailyCost(dailyCostRows),
        dailyTelegram: fillDailyCount(dailyTelegramRows),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
