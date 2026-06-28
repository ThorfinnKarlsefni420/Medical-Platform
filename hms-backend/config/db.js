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
  // Supabase and other managed providers require SSL
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // Keep a few idle connections ready; limit burst connections
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// expose a migration helper so server.js can await it before listen()
async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deleted_records (
      table_name VARCHAR(50) NOT NULL,
      record_id  INT         NOT NULL,
      deleted_by INT REFERENCES users(user_id) ON DELETE SET NULL,
      deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (table_name, record_id)
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_deleted_records_table
      ON deleted_records(table_name, record_id)
  `);
  // Soft-delete columns — require table ownership (postgres on local dev, app user on Render).
  // On Render this succeeds automatically; locally, run database/migration_patients_appointments_soft_deletes.sql as postgres.
  try {
    await pool.query(`ALTER TABLE patients     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_patients_deleted_at     ON patients(deleted_at)     WHERE deleted_at IS NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_appointments_deleted_at ON appointments(deleted_at) WHERE deleted_at IS NULL`);
  } catch (err) {
    console.warn('Soft-delete migration skipped (run as table owner to apply):', err.message);
  }
  console.log('Migrations complete');
}

pool.runMigrations = runMigrations;

module.exports = pool;
