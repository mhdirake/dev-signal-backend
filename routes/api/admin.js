'use strict';

const adminRoutes = require('./admin/index');

module.exports = (app) => {
  adminRoutes(app);
};
