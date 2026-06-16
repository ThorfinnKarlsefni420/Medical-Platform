const pool = require('../config/db');
const { parsePagination, paginatedResponse } = require('../utils/paginate');
const { logAudit } = require('../middleware/audit');

const getAllDispensings = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req.query);
  try {
    const { rows } = await pool.query(
      `SELECT pd.*, pr.medication_name, pr.dosage,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name,
              COUNT(*) OVER() AS _total
       FROM pharmacy_dispensing pd
       JOIN prescriptions   pr ON pd.prescription_id = pr.prescription_id
       JOIN medical_records mr ON pr.record_id = mr.record_id
       JOIN appointments    a  ON mr.appointment_id = a.appointment_id
       JOIN patients        p  ON a.patient_id = p.patient_id
       ORDER BY pd.dispensed_date DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(paginatedResponse(rows, page, limit));
  } catch (err) {
    next(err);
  }
};

const getDispensingById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT pd.*, pr.medication_name, pr.dosage,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name
       FROM pharmacy_dispensing pd
       JOIN prescriptions   pr ON pd.prescription_id = pr.prescription_id
       JOIN medical_records mr ON pr.record_id = mr.record_id
       JOIN appointments    a  ON mr.appointment_id = a.appointment_id
       JOIN patients        p  ON a.patient_id = p.patient_id
       WHERE pd.dispense_id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Dispensing record not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const createDispensing = async (req, res, next) => {
  const { prescription_id, quantity_dispensed, status } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: stockRows } = await client.query(
      `SELECT di.drug_id, di.quantity_in_stock
       FROM drug_inventory di
       JOIN prescriptions pr ON di.medication_name ILIKE pr.medication_name
       WHERE pr.prescription_id = $1
       FOR UPDATE`,
      [prescription_id]
    );

    if (stockRows.length > 0 && stockRows[0].quantity_in_stock < quantity_dispensed) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        message: `Insufficient stock. Available: ${stockRows[0].quantity_in_stock}, requested: ${quantity_dispensed}`,
      });
    }

    const { rows } = await client.query(
      `INSERT INTO pharmacy_dispensing (prescription_id, quantity_dispensed, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [prescription_id, quantity_dispensed, status ?? 'Stock Verified']
    );

    if (stockRows.length > 0) {
      await client.query(
        'UPDATE drug_inventory SET quantity_in_stock = quantity_in_stock - $1 WHERE drug_id = $2',
        [quantity_dispensed, stockRows[0].drug_id]
      );
    }

    await client.query('COMMIT');
    logAudit(req, 'CREATE', 'pharmacy_dispensing', rows[0].dispense_id);
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

const updateDispensing = async (req, res, next) => {
  const { quantity_dispensed, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE pharmacy_dispensing
       SET quantity_dispensed = $1, status = $2
       WHERE dispense_id = $3
       RETURNING *`,
      [quantity_dispensed, status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Dispensing record not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteDispensing = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM pharmacy_dispensing WHERE dispense_id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Dispensing record not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllDispensings,
  getDispensingById,
  createDispensing,
  updateDispensing,
  deleteDispensing,
};
