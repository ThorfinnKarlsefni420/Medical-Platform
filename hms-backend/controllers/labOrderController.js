const pool = require('../config/db');

const getAllLabOrders = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT lo.*, mr.diagnosis,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name
       FROM lab_orders lo
       JOIN medical_records mr ON lo.record_id = mr.record_id
       JOIN appointments    a  ON mr.appointment_id = a.appointment_id
       JOIN patients        p  ON a.patient_id = p.patient_id
       ORDER BY lo.order_date DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getLabOrderById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT lo.*, mr.diagnosis,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name
       FROM lab_orders lo
       JOIN medical_records mr ON lo.record_id = mr.record_id
       JOIN appointments    a  ON mr.appointment_id = a.appointment_id
       JOIN patients        p  ON a.patient_id = p.patient_id
       WHERE lo.lab_order_id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Lab order not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const createLabOrder = async (req, res, next) => {
  const { record_id, test_name, status } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO lab_orders (record_id, test_name, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [record_id, test_name, status ?? 'Ordered']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateLabOrder = async (req, res, next) => {
  const { test_name, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE lab_orders
       SET test_name = $1, status = $2
       WHERE lab_order_id = $3
       RETURNING *`,
      [test_name, status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Lab order not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteLabOrder = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM lab_orders WHERE lab_order_id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Lab order not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllLabOrders,
  getLabOrderById,
  createLabOrder,
  updateLabOrder,
  deleteLabOrder,
};
