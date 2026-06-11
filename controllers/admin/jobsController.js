'use strict';

const { JobLog } = require('@models');

exports.list = async (_req, res) => {
  try {
    const jobs = await JobLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: 60,
    });
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
