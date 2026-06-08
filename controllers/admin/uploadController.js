'use strict';

exports.upload = (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const base = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
  const url = `${base}/uploads/${req.file.filename}`;

  res.json({ url, filename: req.file.filename });
};
