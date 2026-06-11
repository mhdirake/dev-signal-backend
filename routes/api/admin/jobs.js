'use strict';

const { list } = require('@controllers/admin/jobsController');

module.exports = (app) => {
  app.get('/api/admin/jobs', list);
};
