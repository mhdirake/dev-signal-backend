'use strict';

const postsRoutes = require('./posts');
const sourcesRoutes = require('./sources');
const blogRoutes = require('./blog');
const uploadRoutes = require('./upload');
const statsRoutes = require('./stats');

module.exports = (app) => {
  postsRoutes(app);
  sourcesRoutes(app);
  blogRoutes(app);
  uploadRoutes(app);
  statsRoutes(app);
};
