require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 3000,
  mongoUrl: process.env.MONGODB_URL,
  adminKey: process.env.ADMIN_KEY,
};

if (!config.mongoUrl) {
  throw new Error('MONGODB_URL is not set. Copy .env.example to .env and fill it in.');
}

module.exports = config;
