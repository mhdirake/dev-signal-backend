'use strict';

const { BlogPost } = require('@models');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const { rows, count } = await BlogPost.findAndCountAll({
      where: { status: 'published' },
      attributes: ['uuid', 'title', 'slug', 'summary', 'coverImage', 'tags', 'readTime', 'publishedAt'],
      order: [['publishedAt', 'DESC']],
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
    const post = await BlogPost.findOne({
      where: { slug: req.params.slug, status: 'published' },
    });
    if (!post) return res.status(404).json({ message: 'Blog post not found' });
    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
