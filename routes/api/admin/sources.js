'use strict';

const sourcesController = require('@controllers/admin/sourcesController');

module.exports = (app) => {
  app.get('/api/admin/sources', sourcesController.list);
  app.post('/api/admin/sources', sourcesController.create);
  app.patch('/api/admin/sources/:uuid/toggle', sourcesController.toggle);
  app.delete('/api/admin/sources/:uuid', sourcesController.remove);
};
