const pool = require('../config/db');

const getAllLabResults = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT lr.*, lo.test_name, lo.record_id,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name
       FROM lab_results lr
       JOIN lab_orders      lo ON lr.lab_order_id = lo.lab_order_id
       JOIN medical_records mr ON lo.record_id = mr.record_id
       JOIN appointments    a  ON mr.appointment_id = a.appointment_id
       JOIN patients        p  ON a.patient_id = p.patient_id
       ORDER BY lr.result_id DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getLabResultById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT lr.*, lo.test_name, lo.record_id,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name
       FROM lab_results lr
       JOIN lab_orders      lo ON lr.lab_order_id = lo.lab_order_id
       JOIN medical_records mr ON lo.record_id = mr.record_id
       JOIN appointments    a  ON mr.appointment_id = a.appointment_id
       JOIN patients        p  ON a.patient_id = p.patient_id
       WHERE lr.result_id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Lab result not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const FULL_RESULT = `
  SELECT lr.*, lo.test_name, lo.record_id,
         p.first_name AS patient_first_name, p.last_name AS patient_last_name
  FROM lab_results lr
  JOIN lab_orders      lo ON lr.lab_order_id = lo.lab_order_id
  LEFT JOIN medical_records mr ON lo.record_id = mr.record_id
  LEFT JOIN appointments    a  ON mr.appointment_id = a.appointment_id
  LEFT JOIN patients        p  ON a.patient_id = p.patient_id
`;

const createLabResult = async (req, res, next) => {
  const { lab_order_id, result_data, status, reviewed_at } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO lab_results (lab_order_id, result_data, status, reviewed_at)
       VALUES ($1, $2, $3, $4)
       RETURNING result_id`,
      [lab_order_id, result_data, status ?? 'Pending Review', reviewed_at ?? null]
    );
    const { rows: full } = await pool.query(FULL_RESULT + ' WHERE lr.result_id = $1', [rows[0].result_id]);
    res.status(201).json(full[0]);
  } catch (err) {
    next(err);
  }
};

const updateLabResult = async (req, res, next) => {
  const { result_data, status, reviewed_at } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE lab_results
       SET result_data = $1, status = $2, reviewed_at = $3
       WHERE result_id = $4
       RETURNING result_id`,
      [result_data, status, reviewed_at, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Lab result not found' });
    const { rows: full } = await pool.query(FULL_RESULT + ' WHERE lr.result_id = $1', [rows[0].result_id]);
    res.json(full[0]);
  } catch (err) {
    next(err);
  }
};

const deleteLabResult = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM lab_results WHERE result_id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Lab result not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// GET /api/lab-results/my  — patient sees only their own results
const getMyLabResults = async (req, res, next) => {
  try {
    const { rows: userRows } = await pool.query(
      'SELECT patient_id FROM users WHERE user_id = $1',
      [req.user.userId]
    );
    const patient_id = userRows[0]?.patient_id;
    if (!patient_id) return res.status(400).json({ message: 'No patient profile linked to this account' });

    const { rows } = await pool.query(
      `SELECT lr.*, lo.test_name, lo.status AS order_status, lo.order_date
       FROM lab_results lr
       JOIN lab_orders      lo ON lr.lab_order_id = lo.lab_order_id
       JOIN medical_records mr ON lo.record_id = mr.record_id
       JOIN appointments    a  ON mr.appointment_id = a.appointment_id
       WHERE a.patient_id = $1
       ORDER BY lr.result_id DESC`,
      [patient_id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllLabResults,
  getLabResultById,
  createLabResult,
  updateLabResult,
  deleteLabResult,
  getMyLabResults,
};
