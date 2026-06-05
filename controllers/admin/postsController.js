'use strict';

const { Post, RawItem, Source } = require('@models');
const generatePersianSummary = require('@helpers/ai/persian');
const notifyAdmin = require('@helpers/telegram/adminNotifier');

exports.list = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = status ? { status } : {};

    const { rows, count } = await Post.findAndCountAll({
      where,
      include: [{ model: RawItem, as: 'rawItem', include: [{ model: Source, as: 'source' }] }],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    });

    res.json({ posts: rows, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const post = await Post.findOne({
      where: { uuid: req.params.uuid },
      include: [{ model: RawItem, as: 'rawItem', include: [{ model: Source, as: 'source' }] }],
    });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const post = await Post.findOne({ where: { uuid: req.params.uuid } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const allowed = ['headline', 'tldr', 'whyItMatters', 'impactAnalysis', 'recommendedAction', 'category'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) post[field] = req.body[field];
    });

    await post.save();
    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const post = await Post.findOne({ where: { uuid: req.params.uuid } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    await post.update({ status: 'approved' });
    res.json({ post });

    // async — don't block the response
    generatePersianSummary(post)
      .then((summary) => notifyAdmin(post, summary))
      .catch((err) => console.error('[approve] notify failed:', err.message));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const post = await Post.findOne({ where: { uuid: req.params.uuid } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    await post.update({ status: 'rejected', rejectionReason: req.body.reason || null });
    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.schedule = async (req, res) => {
  try {
    const post = await Post.findOne({ where: { uuid: req.params.uuid } });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!req.body.scheduledAt) return res.status(400).json({ message: 'scheduledAt is required' });

    await post.update({ status: 'scheduled', scheduledAt: req.body.scheduledAt });
    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
