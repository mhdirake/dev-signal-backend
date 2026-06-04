const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

module.exports = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
};
