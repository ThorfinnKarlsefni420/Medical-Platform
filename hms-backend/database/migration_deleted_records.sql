-- Soft-delete ledger (alternative to ALTER TABLE deleted_at columns)
-- Works without table ownership — any user with CREATE TABLE can apply this.
-- Clinical records are soft-deleted by inserting a row here rather than
-- physically deleting from the source table.

CREATE TABLE IF NOT EXISTS deleted_records (
  table_name VARCHAR(50) NOT NULL,
  record_id  INT        NOT NULL,
  deleted_by INT REFERENCES users(user_id) ON DELETE SET NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (table_name, record_id)
);

CREATE INDEX IF NOT EXISTS idx_deleted_records_table ON deleted_records(table_name, record_id);
