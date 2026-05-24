-- Migration: Add receptionist role
-- Safe to re-run: drops and recreates the CHECK constraints only.

ALTER TABLE users
  DROP CONSTRAINT users_role_check,
  ADD  CONSTRAINT users_role_check
       CHECK (role IN ('admin','receptionist','doctor','nurse','pharmacist','lab_technician','patient'));

ALTER TABLE staff_invites
  DROP CONSTRAINT staff_invites_role_check,
  ADD  CONSTRAINT staff_invites_role_check
       CHECK (role IN ('admin','receptionist','doctor','nurse','pharmacist','lab_technician'));
