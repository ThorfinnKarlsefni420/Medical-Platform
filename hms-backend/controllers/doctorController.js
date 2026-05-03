const pool = require('../config/db');

const getAllDoctors = async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM doctors ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getDoctorById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM doctors WHERE doctor_id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Doctor not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const createDoctor = async (req, res, next) => {
  const { first_name, last_name, specialty, license_number, contact_number, email } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO doctors (first_name, last_name, specialty, license_number, contact_number, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [first_name, last_name, specialty, license_number, contact_number, email]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateDoctor = async (req, res, next) => {
  const { first_name, last_name, specialty, license_number, contact_number, email } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE doctors
       SET first_name = $1, last_name = $2, specialty = $3,
           license_number = $4, contact_number = $5, email = $6
       WHERE doctor_id = $7
       RETURNING *`,
      [first_name, last_name, specialty, license_number, contact_number, email, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Doctor not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteDoctor = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM doctors WHERE doctor_id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Doctor not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor };
