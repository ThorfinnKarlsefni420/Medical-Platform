-- Migration: Add drug_inventory table
-- Run: psql -U <user> -d <dbname> -f database/migration_drug_inventory.sql
-- Safe to re-run: all statements are idempotent.

-- Ensure the updated_at trigger function exists (also defined in schema.sql)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS drug_inventory (
    drug_id           SERIAL PRIMARY KEY,
    medication_name   VARCHAR(255) NOT NULL UNIQUE,
    unit              VARCHAR(50)  NOT NULL DEFAULT 'tablets',
    quantity_in_stock INT          NOT NULL DEFAULT 0 CHECK (quantity_in_stock >= 0),
    reorder_threshold INT          NOT NULL DEFAULT 10 CHECK (reorder_threshold >= 0),
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_drug_inventory_name ON drug_inventory(medication_name);

DROP TRIGGER IF EXISTS trg_drug_inventory_updated_at ON drug_inventory;
CREATE TRIGGER trg_drug_inventory_updated_at
    BEFORE UPDATE ON drug_inventory
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
