const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.PGHOST,
  database: process.env.PGDATABASE,
  user:     process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port:     5432,
  ssl:      process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  max : 10,
  ideleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => console.log('Connected to PostgreSQL'));
pool.on('error', (err) => { console.error('PostgreSQL pool error:', err); process.exit(-1); });

module.exports = pool;