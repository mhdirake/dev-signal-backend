'use strict';

const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, process.env.ADMIN_JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Forbidden' });
    req.admin = decoded;
    next();
  });
};
