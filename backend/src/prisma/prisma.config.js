require('dotenv').config();
const { defineConfig } = require('prisma/config');
const path = require('path');

module.exports = defineConfig({
  schema: path.resolve(__dirname, 'schema.prisma'),
  migrations: {
    path: path.resolve(__dirname, 'migrations'),
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
