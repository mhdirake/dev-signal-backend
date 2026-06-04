'use strict';

const postsRoutes = require('./posts');
const sourcesRoutes = require('./sources');

module.exports = (app) => {
  postsRoutes(app);
  sourcesRoutes(app);
};
