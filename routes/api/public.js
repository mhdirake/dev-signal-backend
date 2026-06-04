'use strict';

const authController = require('@controllers/authController');

module.exports = (app) => {
  app.post('/api/auth/login', authController.login);
};
