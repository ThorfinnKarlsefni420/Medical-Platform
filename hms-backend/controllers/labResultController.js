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

const createLabResult = async (req, res, next) => {
  const { lab_order_id, result_data, status, reviewed_at } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO lab_results (lab_order_id, result_data, status, reviewed_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [lab_order_id, result_data, status ?? 'Pending Review', reviewed_at ?? null]
    );
    res.status(201).json(rows[0]);
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
       RETURNING *`,
      [result_data, status, reviewed_at, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Lab result not found' });
    res.json(rows[0]);
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

module.exports = {
  getAllLabResults,
  getLabResultById,
  createLabResult,
  updateLabResult,
  deleteLabResult,
};
