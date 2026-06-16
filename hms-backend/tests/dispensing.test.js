'use strict';

/**
 * Dispensing stock reconciliation tests.
 *
 * Covers gaps not in test-integration.js:
 *  - Deleting a dispense record restores drug stock
 *  - Updating quantity_dispensed adjusts stock correctly
 *  - Updating with insufficient additional stock → 409
 *
 * Self-contained: creates drug → patient → doctor → appointment →
 * medical record → prescription, runs assertions, then cleans up.
 */

const { Pool } = require('pg');
const { mintToken, req, assert } = require('./helpers');

module.exports = async function testDispensing(BASE, adminUserId) {
  console.log('\n[DISPENSING] Stock Reconciliation on Update & Delete');

  const pool = new Pool({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const pharmacistToken = mintToken({ userId: adminUserId, email: 'admin@hms.com', role: 'pharmacist', patientId: null });
  const adminToken      = mintToken({ userId: adminUserId, email: 'admin@hms.com', role: 'admin',      patientId: null });

  const INITIAL_STOCK = 100;
  let drugId, patientId, doctorId, apptId, recordId, prescriptionId, dispenseId;

  // Pre-test cleanup in case a previous run left debris
  try {
    await pool.query(`DELETE FROM pharmacy_dispensing WHERE prescription_id IN
      (SELECT prescription_id FROM prescriptions WHERE medication_name = 'TestDrugDispense__')`);
    await pool.query(`DELETE FROM prescriptions WHERE medication_name = 'TestDrugDispense__'`);
    await pool.query(`DELETE FROM drug_inventory WHERE medication_name = 'TestDrugDispense__'`);
    await pool.query(`DELETE FROM doctors WHERE license_number = 'LIC-DISP-01'`);
    await pool.query(`DELETE FROM patients WHERE first_name = 'Test' AND last_name = 'Dispense'`);
  } catch (_) {}

  try {
    const drug = await pool.query(
      `INSERT INTO drug_inventory (medication_name, unit, quantity_in_stock, reorder_threshold)
       VALUES ('TestDrugDispense__', 'tablets', $1, 5) RETURNING drug_id`,
      [INITIAL_STOCK]
    );
    drugId = drug.rows[0].drug_id;

    const patient = await pool.query(
      `INSERT INTO patients (first_name, last_name, date_of_birth) VALUES ('Test','Dispense','1990-01-01') RETURNING patient_id`
    );
    patientId = patient.rows[0].patient_id;

    const doctor = await pool.query(
      `INSERT INTO doctors (first_name, last_name, license_number) VALUES ('Test','DocDisp','LIC-DISP-01') RETURNING doctor_id`
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

    const prescription = await pool.query(
      `INSERT INTO prescriptions (record_id, medication_name, dosage) VALUES ($1, 'TestDrugDispense__', '10mg') RETURNING prescription_id`,
      [recordId]
    );
    prescriptionId = prescription.rows[0].prescription_id;
  } catch (err) {
    await pool.end();
    throw new Error(`Dispensing test setup failed: ${err.message}`);
  }

  // ── initial dispense of 20 units ──────────────────────────────────────────
  const { status: s1, json: j1 } = await req('POST', '/api/pharmacy-dispensing', {
    token: pharmacistToken,
    body:  { prescription_id: prescriptionId, quantity_dispensed: 20, status: 'Stock Verified' },
  }, BASE);
  assert('Initial dispense → 201', s1 === 201, `got ${s1}`);
  dispenseId = j1?.dispense_id;

  const { rows: afterDispense } = await pool.query(
    'SELECT quantity_in_stock FROM drug_inventory WHERE drug_id = $1', [drugId]
  );
  assert(
    'Stock decremented by 20 after dispense',
    afterDispense[0]?.quantity_in_stock === INITIAL_STOCK - 20,
    `expected ${INITIAL_STOCK - 20}, got ${afterDispense[0]?.quantity_in_stock}`
  );

  // ── update: increase quantity by 10 (total 30) ────────────────────────────
  const { status: s2 } = await req('PUT', `/api/pharmacy-dispensing/${dispenseId}`, {
    token: pharmacistToken,
    body:  { quantity_dispensed: 30, status: 'Stock Verified' },
  }, BASE);
  assert('Update quantity 20→30 → 200', s2 === 200, `got ${s2}`);

  const { rows: afterUpdate } = await pool.query(
    'SELECT quantity_in_stock FROM drug_inventory WHERE drug_id = $1', [drugId]
  );
  assert(
    'Stock decremented by additional 10 on update',
    afterUpdate[0]?.quantity_in_stock === INITIAL_STOCK - 30,
    `expected ${INITIAL_STOCK - 30}, got ${afterUpdate[0]?.quantity_in_stock}`
  );

  // ── update: request more than available stock ─────────────────────────────
  const { status: s3, json: j3 } = await req('PUT', `/api/pharmacy-dispensing/${dispenseId}`, {
    token: pharmacistToken,
    body:  { quantity_dispensed: 30 + afterUpdate[0].quantity_in_stock + 1, status: 'Stock Verified' },
  }, BASE);
  assert('Update exceeding stock → 409', s3 === 409, `got ${s3}`);
  assert('409 mentions stock', /stock|available/i.test(j3?.message ?? ''), `got "${j3?.message}"`);

  // ── delete restores stock ─────────────────────────────────────────────────
  const { status: s4 } = await req('DELETE', `/api/pharmacy-dispensing/${dispenseId}`, {
    token: adminToken,
  }, BASE);
  assert('Delete dispense → 204', s4 === 204, `got ${s4}`);
  dispenseId = null;

  const { rows: afterDelete } = await pool.query(
    'SELECT quantity_in_stock FROM drug_inventory WHERE drug_id = $1', [drugId]
  );
  assert(
    'Stock restored to initial after delete',
    afterDelete[0]?.quantity_in_stock === INITIAL_STOCK,
    `expected ${INITIAL_STOCK}, got ${afterDelete[0]?.quantity_in_stock}`
  );

  // ── cleanup ────────────────────────────────────────────────────────────────
  try {
    if (dispenseId)     await pool.query('DELETE FROM pharmacy_dispensing WHERE dispense_id = $1', [dispenseId]);
    if (prescriptionId) await pool.query('DELETE FROM pharmacy_dispensing WHERE prescription_id = $1', [prescriptionId]);
    if (prescriptionId) await pool.query('DELETE FROM prescriptions WHERE prescription_id = $1', [prescriptionId]);
    if (recordId)       await pool.query('DELETE FROM medical_records WHERE record_id = $1', [recordId]);
    if (apptId)         await pool.query('DELETE FROM appointments WHERE appointment_id = $1', [apptId]);
    if (doctorId)       await pool.query('DELETE FROM doctors WHERE doctor_id = $1', [doctorId]);
    if (patientId)      await pool.query('DELETE FROM patients WHERE patient_id = $1', [patientId]);
    if (drugId)         await pool.query('DELETE FROM drug_inventory WHERE drug_id = $1', [drugId]);
  } finally {
    await pool.end();
  }
};
