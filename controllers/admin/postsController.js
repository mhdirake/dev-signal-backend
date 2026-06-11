'use strict';

const { Post, RawItem, Source, PostTranslation } = require('@models');
const { publishQueue } = require('@queues/workers/publishWorker');
const generateLinkedinPost = require('@helpers/ai/linkedinGenerator');
const translatePostToFarsi = require('@helpers/ai/translatePost');

exports.list = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = status ? { status } : {};

    const { rows, count } = await Post.findAndCountAll({
      where,
      include: [
        { model: RawItem, as: 'rawItem', include: [{ model: Source, as: 'source' }] },
        { model: PostTranslation, as: 'translations', where: { locale: 'fa' }, required: false },
      ],
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

    const allowed = [
      'headline',
      'tldr',
      'whyItMatters',
      'impactAnalysis',
      'recommendedAction',
      'category',
      'linkedinDraft',
    ];
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

    publishQueue.add('publish', { postId: post.id }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    }).catch((err) => console.error('[approve] publish queue error:', err.message));
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

exports.getTranslation = async (req, res) => {
  try {
    const post = await Post.findOne({ where: { uuid: req.params.uuid } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const translation = await PostTranslation.findOne({ where: { postId: post.id, locale: req.params.locale } });
    if (!translation) return res.status(404).json({ message: 'Translation not found' });

    res.json({ translation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.generateTranslation = async (req, res) => {
  try {
    const post = await Post.findOne({ where: { uuid: req.params.uuid } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const locale = req.params.locale;
    if (locale !== 'fa') return res.status(400).json({ message: 'Only fa locale supported' });

    const result = await translatePostToFarsi(post);
    const [translation] = await PostTranslation.upsert({
      postId: post.id,
      locale,
      headline: result.headline,
      tldr: result.tldr,
      whyItMatters: result.whyItMatters,
      impactAnalysis: result.impactAnalysis,
      recommendedAction: result.recommendedAction,
    });

    res.json({ translation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTranslation = async (req, res) => {
  try {
    const post = await Post.findOne({ where: { uuid: req.params.uuid } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const allowed = ['headline', 'tldr', 'whyItMatters', 'impactAnalysis', 'recommendedAction'];
    const fields = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) fields[f] = req.body[f]; });

    const [translation] = await PostTranslation.upsert({ postId: post.id, locale: req.params.locale, ...fields });
    res.json({ translation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.generateLinkedinDraft = async (req, res) => {
  try {
    const post = await Post.findOne({
      where: { uuid: req.params.uuid },
      include: [{ model: RawItem, as: 'rawItem', include: [{ model: Source, as: 'source' }] }],
    });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const generated = await generateLinkedinPost(post);
    if (!generated.content) {
      return res.status(502).json({ message: 'LinkedIn generator returned no content' });
    }

    await post.update({ linkedinDraft: generated.content });
    res.json({ post, linkedinDraft: generated.content, charCount: generated.charCount || generated.content.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
