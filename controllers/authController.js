'use strict';

const jwt = require('jsonwebtoken');

exports.login = (req, res) => {
  const { secret } = req.body;

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ role: 'admin' }, process.env.ADMIN_JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
};
