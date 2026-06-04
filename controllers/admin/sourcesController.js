'use strict';

const { Source } = require('@models');

exports.list = async (req, res) => {
  try {
    const sources = await Source.findAll({ order: [['createdAt', 'ASC']] });
    res.json({ sources });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { type, name, identifier } = req.body;
    if (!type || !name || !identifier) {
      return res.status(400).json({ message: 'type, name, and identifier are required' });
    }

    const source = await Source.create({ type, name, identifier });
    res.status(201).json({ source });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Source already exists' });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.toggle = async (req, res) => {
  try {
    const source = await Source.findOne({ where: { uuid: req.params.uuid } });
    if (!source) return res.status(404).json({ message: 'Source not found' });

    await source.update({ active: !source.active });
    res.json({ source });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const source = await Source.findOne({ where: { uuid: req.params.uuid } });
    if (!source) return res.status(404).json({ message: 'Source not found' });

    await source.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
