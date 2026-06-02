require('dotenv').config();
const { defineConfig } = require('prisma/config');
const path = require('path');

module.exports = defineConfig({
  schema: path.resolve(__dirname, 'src/prisma/schema.prisma'),
  migrations: {
    path: path.resolve(__dirname, 'src/prisma/migrations'),
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
