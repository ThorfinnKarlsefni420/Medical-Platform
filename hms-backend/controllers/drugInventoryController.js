const pool  = require('../config/db');
const Excel = require('exceljs');
const { parsePagination, paginatedResponse } = require('../utils/paginate');

const getAllDrugs = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req.query);
  try {
    const { rows } = await pool.query(
      `SELECT *, COUNT(*) OVER() AS _total
       FROM drug_inventory
       ORDER BY medication_name ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(paginatedResponse(rows, page, limit));
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

const importDrugs = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const workbook = new Excel.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return res.status(400).json({ message: 'File is empty or has no sheets' });

    // Read header row to build column index map
    const headerRow = sheet.getRow(1);
    const normalise = (key) => String(key ?? '').toLowerCase().replace(/[\s-]+/g, '_');
    const colIndex  = {};
    headerRow.eachCell((cell, colNum) => { colIndex[normalise(cell.value)] = colNum; });

    if (!colIndex['medication_name']) {
      return res.status(400).json({ message: 'Missing required column: medication_name' });
    }

    const dataRows = [];
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // skip header
      dataRows.push({ row, rowNum });
    });

    if (!dataRows.length) return res.status(400).json({ message: 'File has no data rows' });

    let added = 0, updated = 0;
    const errors = [];

    for (const { row, rowNum } of dataRows) {
      const name = String(row.getCell(colIndex['medication_name']).value ?? '').trim();
      if (!name) { errors.push(`Row ${rowNum}: medication_name is empty`); continue; }

      const unit      = String(row.getCell(colIndex['unit'])?.value ?? 'tablets').trim() || 'tablets';
      const qty       = parseInt(row.getCell(colIndex['quantity_in_stock'] ?? colIndex['quantity'])?.value ?? 0, 10);
      const threshold = parseInt(row.getCell(colIndex['reorder_threshold'] ?? colIndex['reorder_level'])?.value ?? 10, 10);

      if (isNaN(qty) || qty < 0)             { errors.push(`Row ${rowNum}: invalid quantity_in_stock`); continue; }
      if (isNaN(threshold) || threshold < 0) { errors.push(`Row ${rowNum}: invalid reorder_threshold`); continue; }

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
        errors.push(`Row ${rowNum} (${name}): ${err.message}`);
      }
    }

    res.json({ added, updated, errors, total: dataRows.length });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllDrugs, getDrugById, createDrug, updateDrug, adjustStock, deleteDrug, importDrugs };
