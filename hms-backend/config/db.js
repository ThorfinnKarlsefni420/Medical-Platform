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

// Verify connection and apply any missing schema objects
pool.connect((err, client, release) => {
  if (err) {
    console.error('Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }
  console.log('PostgreSQL connected successfully');

  // Ensure deleted_records table exists (idempotent)
  client.query(`
    CREATE TABLE IF NOT EXISTS deleted_records (
      table_name VARCHAR(50) NOT NULL,
      record_id  INT         NOT NULL,
      deleted_by INT REFERENCES users(user_id) ON DELETE SET NULL,
      deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (table_name, record_id)
    );
    CREATE INDEX IF NOT EXISTS idx_deleted_records_table
      ON deleted_records(table_name, record_id);
  `).then(() => {
    console.log('deleted_records table ensured');
  }).catch((e) => {
    console.error('Failed to ensure deleted_records table:', e.message);
  }).finally(() => release());
});

module.exports = pool;
