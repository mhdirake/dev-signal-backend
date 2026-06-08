'use strict';

const { BlogPost, Post, RawItem, Source } = require('@models');
const generateBlogPost = require('@helpers/ai/blogGenerator');

exports.list = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = status ? { status } : {};

    const { rows, count } = await BlogPost.findAndCountAll({
      where,
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
    const post = await BlogPost.findOne({ where: { uuid: req.params.uuid } });
    if (!post) return res.status(404).json({ message: 'Blog post not found' });
    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, slug, summary, content, coverImage, tags, readTime } = req.body;
    const post = await BlogPost.create({ title, slug, summary, content, coverImage, tags, readTime });
    res.status(201).json({ post });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Slug already exists' });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const post = await BlogPost.findOne({ where: { uuid: req.params.uuid } });
    if (!post) return res.status(404).json({ message: 'Blog post not found' });

    const allowed = ['title', 'slug', 'summary', 'content', 'coverImage', 'tags', 'readTime'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) post[field] = req.body[field];
    });

    await post.save();
    res.json({ post });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Slug already exists' });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const post = await BlogPost.findOne({ where: { uuid: req.params.uuid } });
    if (!post) return res.status(404).json({ message: 'Blog post not found' });
    await post.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.publish = async (req, res) => {
  try {
    const post = await BlogPost.findOne({ where: { uuid: req.params.uuid } });
    if (!post) return res.status(404).json({ message: 'Blog post not found' });
    await post.update({ status: 'published', publishedAt: new Date() });
    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.unpublish = async (req, res) => {
  try {
    const post = await BlogPost.findOne({ where: { uuid: req.params.uuid } });
    if (!post) return res.status(404).json({ message: 'Blog post not found' });
    await post.update({ status: 'draft', publishedAt: null });
    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.generateFromPost = async (req, res) => {
  try {
    const sourcePost = await Post.findOne({
      where: { uuid: req.params.uuid },
      include: [{ model: RawItem, as: 'rawItem', include: [{ model: Source, as: 'source' }] }],
    });
    if (!sourcePost) return res.status(404).json({ message: 'Post not found' });

    const generated = await generateBlogPost(sourcePost);

    // Ensure slug uniqueness with a suffix if needed
    let { slug } = generated;
    const existing = await BlogPost.findOne({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const blogPost = await BlogPost.create({
      title: generated.title,
      slug,
      summary: generated.summary || null,
      content: generated.content,
      tags: Array.isArray(generated.tags) ? generated.tags : [],
      readTime: generated.readTime ? Number(generated.readTime) : null,
      status: 'draft',
    });

    res.status(201).json({ post: blogPost });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
