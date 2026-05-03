const pool = require('../config/db');

const getAllWards = async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM wards ORDER BY ward_id');
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getWardById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM wards WHERE ward_id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Ward not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const createWard = async (req, res, next) => {
  const { ward_name, ward_type } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO wards (ward_name, ward_type) VALUES ($1, $2) RETURNING *',
      [ward_name, ward_type]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateWard = async (req, res, next) => {
  const { ward_name, ward_type } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE wards SET ward_name = $1, ward_type = $2 WHERE ward_id = $3 RETURNING *',
      [ward_name, ward_type, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Ward not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteWard = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM wards WHERE ward_id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Ward not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllWards, getWardById, createWard, updateWard, deleteWard };
