const pool = require('../config/db');
const { parsePagination, paginatedResponse } = require('../utils/paginate');
const { logAudit } = require('../middleware/audit');

const getAllAdmissions = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req.query);
  try {
    const { rows } = await pool.query(
      `SELECT ad.*,
              a.patient_id,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name,
              w.ward_name, b.bed_number, b.ward_id,
              COUNT(*) OVER() AS _total
       FROM admissions ad
       JOIN medical_records mr ON ad.record_id = mr.record_id
       JOIN appointments    a  ON mr.appointment_id = a.appointment_id
       JOIN patients        p  ON a.patient_id = p.patient_id
       JOIN beds            b  ON ad.bed_id = b.bed_id
       JOIN wards           w  ON b.ward_id  = w.ward_id
       ORDER BY ad.admission_date DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(paginatedResponse(rows, page, limit));
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: bedRows } = await client.query(
      'SELECT bed_id FROM beds WHERE bed_id = $1 AND is_occupied = FALSE FOR UPDATE',
      [bed_id]
    );
    if (!bedRows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Bed is already occupied or does not exist' });
    }

    const { rows } = await client.query(
      `INSERT INTO admissions (record_id, bed_id, inpatient_monitoring_notes, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [record_id, bed_id, inpatient_monitoring_notes, status ?? 'Admitted']
    );
    await client.query('UPDATE beds SET is_occupied = TRUE WHERE bed_id = $1', [bed_id]);

    await client.query('COMMIT');
    logAudit(req, 'CREATE', 'admissions', rows[0].admission_id);
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

const updateAdmission = async (req, res, next) => {
  const { bed_id, inpatient_monitoring_notes, status } = req.body;
  try {
    const cur = await pool.query('SELECT bed_id FROM admissions WHERE admission_id = $1', [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ message: 'Admission not found' });
    const oldBedId = cur.rows[0].bed_id;
    const newBedId = bed_id ?? oldBedId;

    const { rows } = await pool.query(
      `UPDATE admissions
       SET bed_id = $1, inpatient_monitoring_notes = $2, status = $3
       WHERE admission_id = $4
       RETURNING *`,
      [newBedId, inpatient_monitoring_notes, status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Admission not found' });

    if (newBedId !== oldBedId) {
      await pool.query('UPDATE beds SET is_occupied = FALSE WHERE bed_id = $1', [oldBedId]);
      await pool.query('UPDATE beds SET is_occupied = TRUE  WHERE bed_id = $1', [newBedId]);
    }

    logAudit(req, 'UPDATE', 'admissions', rows[0].admission_id);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteAdmission = async (req, res, next) => {
  try {
    const { rows, rowCount } = await pool.query(
      'DELETE FROM admissions WHERE admission_id = $1 RETURNING bed_id, admission_id',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Admission not found' });
    await pool.query('UPDATE beds SET is_occupied = FALSE WHERE bed_id = $1', [rows[0].bed_id]);
    logAudit(req, 'DELETE', 'admissions', rows[0].admission_id);
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
