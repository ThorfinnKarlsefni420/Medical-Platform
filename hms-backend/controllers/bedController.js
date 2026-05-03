const pool = require('../config/db');

const getAllBeds = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, w.ward_name FROM beds b
       JOIN wards w ON b.ward_id = w.ward_id
       ORDER BY b.bed_id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getBedById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, w.ward_name FROM beds b
       JOIN wards w ON b.ward_id = w.ward_id
       WHERE b.bed_id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Bed not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const createBed = async (req, res, next) => {
  const { ward_id, bed_number, is_occupied } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO beds (ward_id, bed_number, is_occupied)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [ward_id, bed_number, is_occupied ?? false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateBed = async (req, res, next) => {
  const { ward_id, bed_number, is_occupied } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE beds
       SET ward_id = $1, bed_number = $2, is_occupied = $3
       WHERE bed_id = $4
       RETURNING *`,
      [ward_id, bed_number, is_occupied, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Bed not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteBed = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM beds WHERE bed_id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Bed not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllBeds, getBedById, createBed, updateBed, deleteBed };
