'use strict';

const { Op, fn, col } = require('sequelize');
const { PublishLog, BlogPost, Post, TokenUsage } = require('@models');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function countSince(Model, dateField, whereExtra = {}) {
  const [d1, d7, d30] = await Promise.all([
    Model.count({ where: { ...whereExtra, [dateField]: { [Op.gte]: daysAgo(1) } } }),
    Model.count({ where: { ...whereExtra, [dateField]: { [Op.gte]: daysAgo(7) } } }),
    Model.count({ where: { ...whereExtra, [dateField]: { [Op.gte]: daysAgo(30) } } }),
  ]);
  return { '1d': d1, '7d': d7, '30d': d30 };
}

exports.getStats = async (req, res) => {
  try {
    const [telegram, blog, linkedin, last30dRows, allTimeRows] = await Promise.all([
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
    ]);

    const allTime = allTimeRows[0] || {};

    res.json({
      telegram,
      blog,
      linkedin,
      tokens: {
        last30d: last30dRows,
        allTime: {
          inputTokens: Number(allTime.totalInput) || 0,
          outputTokens: Number(allTime.totalOutput) || 0,
          costUsd: parseFloat(allTime.totalCost) || 0,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
