'use strict';

/**
 * Discharge edge-case tests.
 *
 * Covers gaps not in test-integration.js:
 *  - Missing discharge_summary → 400 (newly added validation)
 *  - Missing admission_id → 400
 *  - Duplicate discharge for same admission → 409
 *  - Discharge frees the bed (is_occupied = FALSE)
 *
 * Self-contained: creates ward → bed → patient → doctor → appointment →
 * medical record → admission, then runs all discharge assertions, then cleans up.
 */

const { Pool } = require('pg');
const { mintToken, req, assert } = require('./helpers');

module.exports = async function testDischarge(BASE, adminUserId) {
  console.log('\n[DISCHARGE] Validation & Side Effects');

  const pool = new Pool({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const adminToken = mintToken({ userId: adminUserId, email: 'admin@hms.com', role: 'admin', patientId: null });

  // ── setup: minimal clinical chain ─────────────────────────────────────────
  let wardId, bedId, patientId, doctorId, apptId, recordId, admissionId, dischargeId;

  // Pre-test cleanup for debris from failed previous runs
  try {
    await pool.query(`DELETE FROM doctors WHERE license_number = 'LIC-DISCHARGE-01'`);
    await pool.query(`DELETE FROM patients WHERE first_name = 'Test' AND last_name = 'Discharge'`);
    await pool.query(`DELETE FROM wards WHERE ward_name = 'Test Ward Discharge'`);
  } catch (_) {}

  try {
    const ward = await pool.query(
      `INSERT INTO wards (ward_name, ward_type) VALUES ('Test Ward Discharge', 'General') RETURNING ward_id`
    );
    wardId = ward.rows[0].ward_id;

    const bed = await pool.query(
      `INSERT INTO beds (ward_id, bed_number) VALUES ($1, 'TD-01') RETURNING bed_id`, [wardId]
    );
    bedId = bed.rows[0].bed_id;

    const patient = await pool.query(
      `INSERT INTO patients (first_name, last_name, date_of_birth) VALUES ('Test','Discharge','1990-01-01') RETURNING patient_id`
    );
    patientId = patient.rows[0].patient_id;

    const doctor = await pool.query(
      `INSERT INTO doctors (first_name, last_name, license_number) VALUES ('Test','DocD','LIC-DISCHARGE-01') RETURNING doctor_id`
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

    const admission = await pool.query(
      `INSERT INTO admissions (record_id, bed_id) VALUES ($1, $2) RETURNING admission_id`,
      [recordId, bedId]
    );
    admissionId = admission.rows[0].admission_id;
    await pool.query('UPDATE beds SET is_occupied = TRUE WHERE bed_id = $1', [bedId]);
  } catch (err) {
    await pool.end();
    throw new Error(`Discharge test setup failed: ${err.message}`);
  }

  // ── missing admission_id ───────────────────────────────────────────────────
  const { status: s1, json: j1 } = await req('POST', '/api/discharges', {
    token: adminToken,
    body:  { discharge_summary: 'Patient recovered' },
  }, BASE);
  assert('Missing admission_id → 400', s1 === 400, `got ${s1}`);
  assert('Missing admission_id message', /admission_id/i.test(j1?.message ?? ''), `got "${j1?.message}"`);

  // ── missing discharge_summary ──────────────────────────────────────────────
  const { status: s2, json: j2 } = await req('POST', '/api/discharges', {
    token: adminToken,
    body:  { admission_id: admissionId },
  }, BASE);
  assert('Missing discharge_summary → 400', s2 === 400, `got ${s2}`);
  assert('Missing discharge_summary message', /discharge_summary/i.test(j2?.message ?? ''), `got "${j2?.message}"`);

  // ── blank discharge_summary ────────────────────────────────────────────────
  const { status: s3 } = await req('POST', '/api/discharges', {
    token: adminToken,
    body:  { admission_id: admissionId, discharge_summary: '   ' },
  }, BASE);
  assert('Blank discharge_summary → 400', s3 === 400, `got ${s3}`);

  // ── valid discharge frees bed ──────────────────────────────────────────────
  const { status: s4, json: j4 } = await req('POST', '/api/discharges', {
    token: adminToken,
    body:  { admission_id: admissionId, discharge_summary: 'Patient fully recovered.' },
  }, BASE);
  assert('Valid discharge → 201', s4 === 201, `got ${s4}`);
  dischargeId = j4?.discharge_id;

  const { rows: bedRows } = await pool.query('SELECT is_occupied FROM beds WHERE bed_id = $1', [bedId]);
  assert('Bed freed after discharge', bedRows[0]?.is_occupied === false, `is_occupied=${bedRows[0]?.is_occupied}`);

  const { rows: admRows } = await pool.query('SELECT status FROM admissions WHERE admission_id = $1', [admissionId]);
  assert('Admission status set to Discharged', admRows[0]?.status === 'Discharged', `status=${admRows[0]?.status}`);

  // ── duplicate discharge → 409 ──────────────────────────────────────────────
  const { status: s5 } = await req('POST', '/api/discharges', {
    token: adminToken,
    body:  { admission_id: admissionId, discharge_summary: 'Second discharge attempt' },
  }, BASE);
  assert('Duplicate discharge → 409', s5 === 409, `got ${s5}`);

  // ── cleanup ────────────────────────────────────────────────────────────────
  try {
    if (dischargeId) await pool.query('DELETE FROM discharges WHERE discharge_id = $1', [dischargeId]);
    if (admissionId) await pool.query('DELETE FROM admissions WHERE admission_id = $1', [admissionId]);
    if (recordId)    await pool.query('DELETE FROM medical_records WHERE record_id = $1', [recordId]);
    if (apptId)      await pool.query('DELETE FROM appointments WHERE appointment_id = $1', [apptId]);
    if (doctorId)    await pool.query('DELETE FROM doctors WHERE doctor_id = $1', [doctorId]);
    if (patientId)   await pool.query('DELETE FROM patients WHERE patient_id = $1', [patientId]);
    if (bedId)       await pool.query('DELETE FROM beds WHERE bed_id = $1', [bedId]);
    if (wardId)      await pool.query('DELETE FROM wards WHERE ward_id = $1', [wardId]);
  } finally {
    await pool.end();
  }
};
