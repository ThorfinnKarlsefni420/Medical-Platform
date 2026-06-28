const pool = require('../config/db');
const { parsePagination, paginatedResponse } = require('../utils/paginate');
const { logAudit } = require('../middleware/audit');

const getAllPatients = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req.query);
  try {
    const { rows } = await pool.query(
      `SELECT *, COUNT(*) OVER() AS _total
       FROM patients
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(paginatedResponse(rows, page, limit));
  } catch (err) {
    next(err);
  }
};

const getPatientById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM patients WHERE patient_id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Patient not found' });
    logAudit(req, 'READ', 'patients', rows[0].patient_id);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const createPatient = async (req, res, next) => {
  const { first_name, last_name, date_of_birth, gender, blood_type,
          contact_number, email, address } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO patients
         (first_name, last_name, date_of_birth, gender, blood_type, contact_number, email, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [first_name, last_name, date_of_birth, gender, blood_type, contact_number, email, address]
    );
    logAudit(req, 'CREATE', 'patients', rows[0].patient_id);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const updatePatient = async (req, res, next) => {
  const { first_name, last_name, date_of_birth, gender, blood_type,
          contact_number, email, address } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE patients
       SET first_name = $1, last_name = $2, date_of_birth = $3, gender = $4,
           blood_type = $5, contact_number = $6, email = $7, address = $8
       WHERE patient_id = $9 AND deleted_at IS NULL
       RETURNING *`,
      [first_name, last_name, date_of_birth, gender, blood_type,
       contact_number, email, address, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Patient not found' });
    logAudit(req, 'UPDATE', 'patients', rows[0].patient_id);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// Soft-delete: stamps deleted_at and deactivates any linked user account.
// Records are retained to satisfy the health records retention requirement.
const deletePatient = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE patients SET deleted_at = NOW()
       WHERE patient_id = $1 AND deleted_at IS NULL
       RETURNING patient_id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Patient not found' });

    // Deactivate the linked user account so they can no longer log in
    await client.query(
      `UPDATE users SET is_active = false
       WHERE patient_id = $1 AND is_active = true`,
      [req.params.id]
    );

    await client.query('COMMIT');
    logAudit(req, 'DELETE', 'patients', Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { getAllPatients, getPatientById, createPatient, updatePatient, deletePatient };
