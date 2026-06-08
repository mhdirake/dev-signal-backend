'use strict';

const blogController = require('@controllers/admin/blogController');

module.exports = (app) => {
  app.get('/api/admin/blog', blogController.list);
  app.get('/api/admin/blog/:uuid', blogController.get);
  app.post('/api/admin/blog', blogController.create);
  app.patch('/api/admin/blog/:uuid', blogController.update);
  app.delete('/api/admin/blog/:uuid', blogController.remove);
  app.patch('/api/admin/blog/:uuid/publish', blogController.publish);
  app.patch('/api/admin/blog/:uuid/unpublish', blogController.unpublish);
};
