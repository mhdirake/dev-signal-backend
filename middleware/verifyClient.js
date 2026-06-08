'use strict';

module.exports = (req, res, next) => {
  const secret = req.headers['x-client-secret'];
  if (!secret || secret !== process.env.CLIENT_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};
