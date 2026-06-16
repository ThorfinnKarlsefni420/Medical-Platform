'use strict';

/**
 * Inpatient edge-case tests.
 *
 * Covers gaps not in test-integration.js:
 *  - updateAdmission: transferring to an already-occupied bed → 409
 *  - createPrescription: missing both record_id and admission_id → 400
 *  - createPrescription: missing medication_name or dosage → 400
 *  - createLabOrder: missing both record_id and admission_id → 400
 *  - createLabOrder: missing test_name → 400
 *
 * Self-contained: creates two wards/beds, one admission, runs assertions,
 * then cleans up.
 */

const { Pool } = require('pg');
const { mintToken, req, assert } = require('./helpers');

module.exports = async function testInpatient(BASE, adminUserId) {
  console.log('\n[INPATIENT] Bed Transfer & Input Validation');

  const pool = new Pool({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const adminToken  = mintToken({ userId: adminUserId, email: 'admin@hms.com', role: 'admin',  patientId: null });
  const doctorToken = mintToken({ userId: adminUserId, email: 'admin@hms.com', role: 'doctor', patientId: null });

  let wardId, freeBedId, occupiedBedId, patientId, doctorId, apptId, recordId, admissionId;

  // Pre-test cleanup for debris from failed previous runs
  try {
    await pool.query(`DELETE FROM doctors WHERE license_number = 'LIC-INP-01'`);
    await pool.query(`DELETE FROM patients WHERE first_name = 'Test' AND last_name = 'Inpatient'`);
    await pool.query(`DELETE FROM wards WHERE ward_name = 'Test Ward Inpatient'`);
  } catch (_) {}

  try {
    const ward = await pool.query(
      `INSERT INTO wards (ward_name, ward_type) VALUES ('Test Ward Inpatient', 'ICU') RETURNING ward_id`
    );
    wardId = ward.rows[0].ward_id;

    const freeBed = await pool.query(
      `INSERT INTO beds (ward_id, bed_number) VALUES ($1, 'TI-FREE') RETURNING bed_id`, [wardId]
    );
    freeBedId = freeBed.rows[0].bed_id;

    const occupiedBed = await pool.query(
      `INSERT INTO beds (ward_id, bed_number, is_occupied) VALUES ($1, 'TI-OCC', TRUE) RETURNING bed_id`, [wardId]
    );
    occupiedBedId = occupiedBed.rows[0].bed_id;

    const patient = await pool.query(
      `INSERT INTO patients (first_name, last_name, date_of_birth) VALUES ('Test','Inpatient','1985-06-15') RETURNING patient_id`
    );
    patientId = patient.rows[0].patient_id;

    const doctor = await pool.query(
      `INSERT INTO doctors (first_name, last_name, license_number) VALUES ('Test','DocInp','LIC-INP-01') RETURNING doctor_id`
    );
    doctorId = doctor.rows[0].doctor_id;

    const appt = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_datetime) VALUES ($1, $2, NOW()) RETURNING appointment_id`,
      [patientId, doctorId]
    );
    apptId = appt.rows[0].appointment_id;

    const record = await pool.query(
      `INSERT INTO medical_records (appointment_id) VALUES ($1) RETURNING record_id`, [apptId]
    );
    recordId = record.rows[0].record_id;

    // Admit to the free bed
    const admission = await pool.query(
      `INSERT INTO admissions (record_id, bed_id) VALUES ($1, $2) RETURNING admission_id`,
      [recordId, freeBedId]
    );
    admissionId = admission.rows[0].admission_id;
    await pool.query('UPDATE beds SET is_occupied = TRUE WHERE bed_id = $1', [freeBedId]);
  } catch (err) {
    await pool.end();
    throw new Error(`Inpatient test setup failed: ${err.message}`);
  }

  // ── bed transfer to occupied bed → 409 ────────────────────────────────────
  const { status: s1, json: j1 } = await req('PUT', `/api/admissions/${admissionId}`, {
    token: adminToken,
    body:  { bed_id: occupiedBedId, status: 'Admitted' },
  }, BASE);
  assert('Transfer to occupied bed → 409', s1 === 409, `got ${s1}`);
  assert('409 message mentions occupied/exist', /occupied|exist/i.test(j1?.message ?? ''), `got "${j1?.message}"`);

  // ── createPrescription: no source ─────────────────────────────────────────
  const { status: s2, json: j2 } = await req('POST', '/api/prescriptions', {
    token: doctorToken,
    body:  { medication_name: 'Amoxicillin', dosage: '500mg' },
  }, BASE);
  assert('Prescription without record_id/admission_id → 400', s2 === 400, `got ${s2}`);
  assert('Message mentions record_id/admission_id', /record_id|admission_id/i.test(j2?.message ?? ''), `got "${j2?.message}"`);

  // ── createPrescription: missing medication_name ───────────────────────────
  const { status: s3, json: j3 } = await req('POST', '/api/prescriptions', {
    token: doctorToken,
    body:  { record_id: recordId, dosage: '500mg' },
  }, BASE);
  assert('Prescription without medication_name → 400', s3 === 400, `got ${s3}`);
  assert('Message mentions medication_name', /medication_name|dosage/i.test(j3?.message ?? ''), `got "${j3?.message}"`);

  // ── createLabOrder: no source ──────────────────────────────────────────────
  const { status: s4, json: j4 } = await req('POST', '/api/lab-orders', {
    token: doctorToken,
    body:  { test_name: 'CBC' },
  }, BASE);
  assert('Lab order without record_id/admission_id → 400', s4 === 400, `got ${s4}`);
  assert('Message mentions record_id/admission_id', /record_id|admission_id/i.test(j4?.message ?? ''), `got "${j4?.message}"`);

  // ── createLabOrder: missing test_name ─────────────────────────────────────
  const { status: s5, json: j5 } = await req('POST', '/api/lab-orders', {
    token: doctorToken,
    body:  { record_id: recordId },
  }, BASE);
  assert('Lab order without test_name → 400', s5 === 400, `got ${s5}`);
  assert('Message mentions test_name', /test_name/i.test(j5?.message ?? ''), `got "${j5?.message}"`);

  // ── cleanup ────────────────────────────────────────────────────────────────
  try {
    if (admissionId)  await pool.query('DELETE FROM admissions WHERE admission_id = $1', [admissionId]);
    if (recordId)     await pool.query('DELETE FROM medical_records WHERE record_id = $1', [recordId]);
    if (apptId)       await pool.query('DELETE FROM appointments WHERE appointment_id = $1', [apptId]);
    if (doctorId)     await pool.query('DELETE FROM doctors WHERE doctor_id = $1', [doctorId]);
    if (patientId)    await pool.query('DELETE FROM patients WHERE patient_id = $1', [patientId]);
    if (freeBedId)    await pool.query('DELETE FROM beds WHERE bed_id = $1', [freeBedId]);
    if (occupiedBedId) await pool.query('DELETE FROM beds WHERE bed_id = $1', [occupiedBedId]);
    if (wardId)       await pool.query('DELETE FROM wards WHERE ward_id = $1', [wardId]);
  } finally {
    await pool.end();
  }
};
