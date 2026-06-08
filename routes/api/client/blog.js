'use strict';

const blogController = require('@controllers/clientBlogController');

module.exports = (app) => {
  app.get('/api/client/blog', blogController.list);
  app.get('/api/client/blog/:slug', blogController.get);
};
