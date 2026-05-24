-- Migration: Add staff_invites table
-- Run: psql -U <user> -d <dbname> -f database/migration_staff_invites.sql
-- Safe to re-run: all statements are idempotent.

CREATE TABLE IF NOT EXISTS staff_invites (
    invite_id   SERIAL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL
                    CHECK (role IN ('admin', 'doctor', 'nurse', 'pharmacist', 'lab_technician')),
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    specialty   VARCHAR(100),
    license_number VARCHAR(50),
    token       VARCHAR(255) UNIQUE NOT NULL,
    doctor_id   INT REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    expires_at  TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_invites_token ON staff_invites(token);
CREATE INDEX IF NOT EXISTS idx_staff_invites_email ON staff_invites(email);
