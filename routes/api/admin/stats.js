'use strict';

const { getStats } = require('@controllers/admin/statsController');

module.exports = (app) => {
  app.get('/api/admin/stats', getStats);
};
