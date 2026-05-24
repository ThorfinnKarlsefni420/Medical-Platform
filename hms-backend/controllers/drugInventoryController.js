const pool = require('../config/db');
const xlsx = require('xlsx');

const getAllDrugs = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM drug_inventory ORDER BY medication_name ASC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getDrugById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM drug_inventory WHERE drug_id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Drug not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const createDrug = async (req, res, next) => {
  const { medication_name, unit, quantity_in_stock, reorder_threshold } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO drug_inventory (medication_name, unit, quantity_in_stock, reorder_threshold)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [medication_name, unit ?? 'tablets', quantity_in_stock ?? 0, reorder_threshold ?? 10]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateDrug = async (req, res, next) => {
  const { medication_name, unit, quantity_in_stock, reorder_threshold } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE drug_inventory
       SET medication_name = $1, unit = $2, quantity_in_stock = $3, reorder_threshold = $4
       WHERE drug_id = $5
       RETURNING *`,
      [medication_name, unit, quantity_in_stock, reorder_threshold, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Drug not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// Adjust stock by a positive or negative delta
const adjustStock = async (req, res, next) => {
  const { delta } = req.body;
  if (typeof delta !== 'number') {
    return res.status(400).json({ message: 'delta must be a number' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE drug_inventory
       SET quantity_in_stock = GREATEST(0, quantity_in_stock + $1)
       WHERE drug_id = $2
       RETURNING *`,
      [delta, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Drug not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteDrug = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM drug_inventory WHERE drug_id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Drug not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// POST /api/drug-inventory/import  — bulk upsert from CSV or Excel
const importDrugs = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) return res.status(400).json({ message: 'File is empty' });

    // Normalise header names — tolerate spaces, casing, underscores
    const normalise = (key) => key.toLowerCase().replace(/[\s-]+/g, '_');
    const normRows  = rows.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [normalise(k), v]))
    );

    const required = ['medication_name'];
    const missing  = required.filter((f) => !Object.keys(normRows[0] ?? {}).includes(f));
    if (missing.length) {
      return res.status(400).json({ message: `Missing required column(s): ${missing.join(', ')}` });
    }

    let added = 0, updated = 0;
    const errors = [];

    for (let i = 0; i < normRows.length; i++) {
      const row  = normRows[i];
      const name = String(row.medication_name ?? '').trim();
      if (!name) { errors.push(`Row ${i + 2}: medication_name is empty`); continue; }

      const unit      = String(row.unit ?? 'tablets').trim() || 'tablets';
      const qty       = parseInt(row.quantity_in_stock ?? row.quantity ?? 0, 10);
      const threshold = parseInt(row.reorder_threshold ?? row.reorder_level ?? 10, 10);

      if (isNaN(qty) || qty < 0)       { errors.push(`Row ${i + 2}: invalid quantity_in_stock`); continue; }
      if (isNaN(threshold) || threshold < 0) { errors.push(`Row ${i + 2}: invalid reorder_threshold`); continue; }

      try {
        const { rows: result } = await pool.query(
          `INSERT INTO drug_inventory (medication_name, unit, quantity_in_stock, reorder_threshold)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (medication_name)
           DO UPDATE SET
             unit              = EXCLUDED.unit,
             quantity_in_stock = EXCLUDED.quantity_in_stock,
             reorder_threshold = EXCLUDED.reorder_threshold
           RETURNING (xmax = 0) AS inserted`,
          [name, unit, qty, threshold]
        );
        result[0].inserted ? added++ : updated++;
      } catch (err) {
        errors.push(`Row ${i + 2} (${name}): ${err.message}`);
      }
    }

    res.json({ added, updated, errors, total: normRows.length });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllDrugs, getDrugById, createDrug, updateDrug, adjustStock, deleteDrug, importDrugs };
