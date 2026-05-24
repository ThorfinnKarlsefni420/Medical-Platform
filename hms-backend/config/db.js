const { Pool, types } = require('pg');

// Return TIMESTAMP columns as plain strings so node-postgres doesn't
// shift them to UTC (the DB stores local wall-clock time without a timezone).
types.setTypeParser(1114, (val) => val);

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Keep a few idle connections ready; limit burst connections
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Verify the connection at startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }
  console.log('PostgreSQL connected successfully');
  release();
});

module.exports = pool;
