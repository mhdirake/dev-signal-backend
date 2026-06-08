'use strict';

const blogRoutes = require('./client/blog');

module.exports = (app) => {
  blogRoutes(app);
};
