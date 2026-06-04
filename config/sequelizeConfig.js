require('dotenv').config();

module.exports = {
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT || 3306,
  dialect: 'mysql',
  logging: process.env.DEBUG_MODE === 'true',
};
