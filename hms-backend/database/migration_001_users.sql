-- Run after schema.sql:
-- psql -U <user> -d hms_db -f database/migration_001_users.sql

CREATE TABLE users (
    user_id    SERIAL PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,           -- bcrypt hash, never plain-text
    role       VARCHAR(20)  NOT NULL
                   CHECK (role IN ('admin', 'doctor', 'nurse', 'pharmacist', 'lab_technician', 'patient')),
    doctor_id  INT REFERENCES doctors(doctor_id),   -- set when role = 'doctor'
    patient_id INT REFERENCES patients(patient_id), -- set when role = 'patient'
    is_active  BOOLEAN   DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- a user account maps to at most one doctor or one patient profile
    CONSTRAINT chk_single_profile CHECK (
        (doctor_id IS NULL OR patient_id IS NULL)
    )
);

CREATE INDEX idx_users_email     ON users(email);
CREATE INDEX idx_users_doctor_id ON users(doctor_id);
CREATE INDEX idx_users_patient_id ON users(patient_id);
