const pool = require('../config/db');

const getAllMedicalRecords = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT mr.*,
              a.appointment_datetime, a.patient_id,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name,
              d.first_name AS doctor_first_name,  d.last_name  AS doctor_last_name
       FROM medical_records mr
       JOIN appointments a ON mr.appointment_id = a.appointment_id
       JOIN patients     p ON a.patient_id = p.patient_id
       JOIN doctors      d ON a.doctor_id  = d.doctor_id
       ORDER BY mr.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getMedicalRecordById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT mr.*,
              a.appointment_datetime,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name,
              d.first_name AS doctor_first_name,  d.last_name  AS doctor_last_name
       FROM medical_records mr
       JOIN appointments a ON mr.appointment_id = a.appointment_id
       JOIN patients     p ON a.patient_id = p.patient_id
       JOIN doctors      d ON a.doctor_id  = d.doctor_id
       WHERE mr.record_id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Medical record not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const createMedicalRecord = async (req, res, next) => {
  const { appointment_id, consultation_notes, diagnosis } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO medical_records (appointment_id, consultation_notes, diagnosis)
       VALUES ($1, $2, $3)
       RETURNING record_id`,
      [appointment_id, consultation_notes, diagnosis]
    );
    const { rows: full } = await pool.query(
      `SELECT mr.*,
              a.appointment_datetime, a.patient_id,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name,
              d.first_name AS doctor_first_name,  d.last_name  AS doctor_last_name
       FROM medical_records mr
       JOIN appointments a ON mr.appointment_id = a.appointment_id
       JOIN patients     p ON a.patient_id = p.patient_id
       JOIN doctors      d ON a.doctor_id  = d.doctor_id
       WHERE mr.record_id = $1`,
      [rows[0].record_id]
    );
    res.status(201).json(full[0]);
  } catch (err) {
    next(err);
  }
};

const updateMedicalRecord = async (req, res, next) => {
  const { consultation_notes, diagnosis } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE medical_records
       SET consultation_notes = $1, diagnosis = $2
       WHERE record_id = $3
       RETURNING *`,
      [consultation_notes, diagnosis, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Medical record not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteMedicalRecord = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM medical_records WHERE record_id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Medical record not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
};
