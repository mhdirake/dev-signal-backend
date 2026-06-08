'use strict';

const postsRoutes = require('./posts');
const sourcesRoutes = require('./sources');
const blogRoutes = require('./blog');
const uploadRoutes = require('./upload');

module.exports = (app) => {
  postsRoutes(app);
  sourcesRoutes(app);
  blogRoutes(app);
  uploadRoutes(app);
};
