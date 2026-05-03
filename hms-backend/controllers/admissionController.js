const pool = require('../config/db');

const getAllAdmissions = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ad.*,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name,
              w.ward_name, b.bed_number
       FROM admissions ad
       JOIN medical_records mr ON ad.record_id = mr.record_id
       JOIN appointments    a  ON mr.appointment_id = a.appointment_id
       JOIN patients        p  ON a.patient_id = p.patient_id
       JOIN beds            b  ON ad.bed_id = b.bed_id
       JOIN wards           w  ON b.ward_id  = w.ward_id
       ORDER BY ad.admission_date DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getAdmissionById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ad.*,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name,
              w.ward_name, b.bed_number
       FROM admissions ad
       JOIN medical_records mr ON ad.record_id = mr.record_id
       JOIN appointments    a  ON mr.appointment_id = a.appointment_id
       JOIN patients        p  ON a.patient_id = p.patient_id
       JOIN beds            b  ON ad.bed_id = b.bed_id
       JOIN wards           w  ON b.ward_id  = w.ward_id
       WHERE ad.admission_id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Admission not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const createAdmission = async (req, res, next) => {
  const { record_id, bed_id, inpatient_monitoring_notes, status } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO admissions (record_id, bed_id, inpatient_monitoring_notes, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [record_id, bed_id, inpatient_monitoring_notes, status ?? 'Admitted']
    );
    // Mark the bed as occupied
    await pool.query('UPDATE beds SET is_occupied = TRUE WHERE bed_id = $1', [bed_id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateAdmission = async (req, res, next) => {
  const { bed_id, inpatient_monitoring_notes, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE admissions
       SET bed_id = $1, inpatient_monitoring_notes = $2, status = $3
       WHERE admission_id = $4
       RETURNING *`,
      [bed_id, inpatient_monitoring_notes, status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Admission not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteAdmission = async (req, res, next) => {
  try {
    const { rows, rowCount } = await pool.query(
      'DELETE FROM admissions WHERE admission_id = $1 RETURNING bed_id',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Admission not found' });
    await pool.query('UPDATE beds SET is_occupied = FALSE WHERE bed_id = $1', [rows[0].bed_id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllAdmissions,
  getAdmissionById,
  createAdmission,
  updateAdmission,
  deleteAdmission,
};
