const pool = require('../config/db');

const getAllPrescriptions = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT pr.*,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name,
              d.first_name AS doctor_first_name,  d.last_name  AS doctor_last_name
       FROM prescriptions pr
       JOIN medical_records mr ON pr.record_id = mr.record_id
       JOIN appointments    a  ON mr.appointment_id = a.appointment_id
       JOIN patients        p  ON a.patient_id = p.patient_id
       JOIN doctors         d  ON a.doctor_id  = d.doctor_id
       ORDER BY pr.prescription_id DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getPrescriptionById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT pr.*,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name,
              d.first_name AS doctor_first_name,  d.last_name  AS doctor_last_name
       FROM prescriptions pr
       JOIN medical_records mr ON pr.record_id = mr.record_id
       JOIN appointments    a  ON mr.appointment_id = a.appointment_id
       JOIN patients        p  ON a.patient_id = p.patient_id
       JOIN doctors         d  ON a.doctor_id  = d.doctor_id
       WHERE pr.prescription_id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Prescription not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const createPrescription = async (req, res, next) => {
  const { record_id, medication_name, dosage, instructions, status } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO prescriptions (record_id, medication_name, dosage, instructions, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [record_id, medication_name, dosage, instructions, status ?? 'Created']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const updatePrescription = async (req, res, next) => {
  const { medication_name, dosage, instructions, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE prescriptions
       SET medication_name = $1, dosage = $2, instructions = $3, status = $4
       WHERE prescription_id = $5
       RETURNING *`,
      [medication_name, dosage, instructions, status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Prescription not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const deletePrescription = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM prescriptions WHERE prescription_id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Prescription not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  deletePrescription,
};
