-- Phase 3: Inpatient Clinical Orders
-- Allow prescriptions and lab orders to be linked to an admission
-- instead of (or in addition to) a medical record.
-- Either record_id OR admission_id must be set (enforced by CHECK constraint).

-- 1. Make record_id nullable
ALTER TABLE prescriptions ALTER COLUMN record_id DROP NOT NULL;
ALTER TABLE lab_orders    ALTER COLUMN record_id DROP NOT NULL;

-- 2. Add admission_id FK
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS admission_id INT REFERENCES admissions(admission_id);

ALTER TABLE lab_orders
  ADD COLUMN IF NOT EXISTS admission_id INT REFERENCES admissions(admission_id);

-- 3. Enforce: at least one context must be set
ALTER TABLE prescriptions
  ADD CONSTRAINT chk_prescription_context
  CHECK (record_id IS NOT NULL OR admission_id IS NOT NULL);

ALTER TABLE lab_orders
  ADD CONSTRAINT chk_lab_order_context
  CHECK (record_id IS NOT NULL OR admission_id IS NOT NULL);

-- 4. Indexes on new FK columns
CREATE INDEX IF NOT EXISTS idx_prescriptions_admission_id ON prescriptions(admission_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_admission_id    ON lab_orders(admission_id);
