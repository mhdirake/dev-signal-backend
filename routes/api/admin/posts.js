'use strict';

const postsController = require('@controllers/admin/postsController');
const blogController = require('@controllers/admin/blogController');

module.exports = (app) => {
  app.get('/api/admin/posts', postsController.list);
  app.get('/api/admin/posts/:uuid', postsController.get);
  app.patch('/api/admin/posts/:uuid/approve', postsController.approve);
  app.patch('/api/admin/posts/:uuid/reject', postsController.reject);
  app.patch('/api/admin/posts/:uuid/schedule', postsController.schedule);
  app.patch('/api/admin/posts/:uuid', postsController.update);
  app.post('/api/admin/posts/:uuid/generate-blog', blogController.generateFromPost);
};
