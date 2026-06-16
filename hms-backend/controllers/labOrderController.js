const pool = require('../config/db');
const { parsePagination, paginatedResponse } = require('../utils/paginate');
const { logAudit } = require('../middleware/audit');

const SELECT_LAB_ORDERS = `
  SELECT lo.*,
         COALESCE(mr_out.diagnosis, mr_in.diagnosis) AS diagnosis,
         COALESCE(p_out.first_name, p_in.first_name) AS patient_first_name,
         COALESCE(p_out.last_name,  p_in.last_name)  AS patient_last_name
  FROM lab_orders lo
  LEFT JOIN medical_records mr_out ON lo.record_id    = mr_out.record_id
  LEFT JOIN appointments    a_out  ON mr_out.appointment_id = a_out.appointment_id
  LEFT JOIN patients        p_out  ON a_out.patient_id = p_out.patient_id
  LEFT JOIN admissions      adm    ON lo.admission_id  = adm.admission_id
  LEFT JOIN medical_records mr_in  ON adm.record_id    = mr_in.record_id
  LEFT JOIN appointments    a_in   ON mr_in.appointment_id = a_in.appointment_id
  LEFT JOIN patients        p_in   ON a_in.patient_id  = p_in.patient_id
`;

const getAllLabOrders = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req.query);
  try {
    const { rows } = await pool.query(
      `SELECT t.*, COUNT(*) OVER() AS _total
       FROM (${SELECT_LAB_ORDERS}) t
       WHERE NOT EXISTS (
         SELECT 1 FROM deleted_records dr
         WHERE dr.table_name = 'lab_orders' AND dr.record_id = t.lab_order_id
       )
       ORDER BY t.order_date DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(paginatedResponse(rows, page, limit));
  } catch (err) {
    next(err);
  }
};

const getLabOrderById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      SELECT_LAB_ORDERS + ' WHERE lo.lab_order_id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Lab order not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const getAdmissionLabOrders = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.* FROM (${SELECT_LAB_ORDERS}) t
       WHERE t.admission_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM deleted_records dr
           WHERE dr.table_name = 'lab_orders' AND dr.record_id = t.lab_order_id
         )
       ORDER BY t.order_date DESC`,
      [req.params.admissionId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const createLabOrder = async (req, res, next) => {
  const { record_id, admission_id, test_name, status } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO lab_orders (record_id, admission_id, test_name, status)
       VALUES ($1, $2, $3, $4)
       RETURNING lab_order_id`,
      [record_id ?? null, admission_id ?? null, test_name, status ?? 'Ordered']
    );
    const { rows: full } = await pool.query(
      SELECT_LAB_ORDERS + ' WHERE lo.lab_order_id = $1',
      [rows[0].lab_order_id]
    );
    logAudit(req, 'CREATE', 'lab_orders', rows[0].lab_order_id);
    res.status(201).json(full[0]);
  } catch (err) {
    next(err);
  }
};

const updateLabOrder = async (req, res, next) => {
  const { test_name, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE lab_orders SET test_name = $1, status = $2 WHERE lab_order_id = $3 RETURNING lab_order_id`,
      [test_name, status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Lab order not found' });
    const { rows: full } = await pool.query(
      SELECT_LAB_ORDERS + ' WHERE lo.lab_order_id = $1',
      [rows[0].lab_order_id]
    );
    logAudit(req, 'UPDATE', 'lab_orders', rows[0].lab_order_id);
    res.json(full[0]);
  } catch (err) {
    next(err);
  }
};

const deleteLabOrder = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT lab_order_id FROM lab_orders WHERE lab_order_id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Lab order not found' });
    await pool.query(
      `INSERT INTO deleted_records (table_name, record_id, deleted_by)
       VALUES ('lab_orders', $1, $2)
       ON CONFLICT DO NOTHING`,
      [req.params.id, req.user?.userId ?? null]
    );
    logAudit(req, 'DELETE', 'lab_orders', Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllLabOrders,
  getLabOrderById,
  getAdmissionLabOrders,
  createLabOrder,
  updateLabOrder,
  deleteLabOrder,
};
