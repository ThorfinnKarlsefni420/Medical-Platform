-- Soft deletes for clinical tables
-- Clinical records must never be permanently destroyed.
-- A DELETE now sets deleted_at; all SELECTs filter WHERE deleted_at IS NULL.

ALTER TABLE medical_records  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE prescriptions    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE lab_orders       ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE lab_results      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_medical_records_deleted_at  ON medical_records(deleted_at)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_prescriptions_deleted_at    ON prescriptions(deleted_at)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lab_orders_deleted_at       ON lab_orders(deleted_at)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lab_results_deleted_at      ON lab_results(deleted_at)      WHERE deleted_at IS NULL;
