'use strict';

const upload = require('@middleware/upload');
const uploadController = require('@controllers/admin/uploadController');

module.exports = (app) => {
  app.post('/api/admin/upload', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      uploadController.upload(req, res);
    });
  });
};
