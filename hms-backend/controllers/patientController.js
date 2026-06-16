const pool = require('../config/db');
const { parsePagination, paginatedResponse } = require('../utils/paginate');

const getAllPatients = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req.query);
  try {
    const { rows } = await pool.query(
      `SELECT *, COUNT(*) OVER() AS _total
       FROM patients
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
      'SELECT * FROM patients WHERE patient_id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Patient not found' });
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
       WHERE patient_id = $9
       RETURNING *`,
      [first_name, last_name, date_of_birth, gender, blood_type,
       contact_number, email, address, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Patient not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const deletePatient = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM patients WHERE patient_id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Patient not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllPatients, getPatientById, createPatient, updatePatient, deletePatient };
