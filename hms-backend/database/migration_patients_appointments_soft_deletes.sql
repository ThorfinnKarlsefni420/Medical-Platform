-- Soft deletes for patients and appointments
-- Run as the table owner: psql -U postgres -d hms_db -f database/migration_patients_appointments_soft_deletes.sql
--
-- Patient profiles and appointment records must never be permanently destroyed.
-- A "delete" now sets deleted_at; all SELECTs filter WHERE deleted_at IS NULL.
-- On Render (managed Postgres) this is applied automatically on server startup.

ALTER TABLE patients     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_patients_deleted_at
  ON patients(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_deleted_at
  ON appointments(deleted_at) WHERE deleted_at IS NULL;
