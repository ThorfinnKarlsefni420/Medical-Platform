const pool = require('../config/db');

const getAllDischarges = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT dc.*,
              ad.admission_date,
              a.patient_id,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name,
              w.ward_name, b.bed_number
       FROM discharges dc
       JOIN admissions      ad ON dc.admission_id = ad.admission_id
       JOIN medical_records mr ON ad.record_id = mr.record_id
       JOIN appointments    a  ON mr.appointment_id = a.appointment_id
       JOIN patients        p  ON a.patient_id = p.patient_id
       JOIN beds            b  ON ad.bed_id = b.bed_id
       JOIN wards           w  ON b.ward_id  = w.ward_id
       ORDER BY dc.discharge_date DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getDischargeById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT dc.*,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name,
              w.ward_name, b.bed_number
       FROM discharges dc
       JOIN admissions      ad ON dc.admission_id = ad.admission_id
       JOIN medical_records mr ON ad.record_id = mr.record_id
       JOIN appointments    a  ON mr.appointment_id = a.appointment_id
       JOIN patients        p  ON a.patient_id = p.patient_id
       JOIN beds            b  ON ad.bed_id = b.bed_id
       JOIN wards           w  ON b.ward_id  = w.ward_id
       WHERE dc.discharge_id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Discharge not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const createDischarge = async (req, res, next) => {
  const { admission_id, discharge_summary, follow_up_plan } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO discharges (admission_id, discharge_summary, follow_up_plan)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [admission_id, discharge_summary, follow_up_plan]
    );
    // Update admission status and free the bed
    const admRow = await pool.query(
      `UPDATE admissions SET status = 'Discharged' WHERE admission_id = $1 RETURNING bed_id`,
      [admission_id]
    );
    if (admRow.rows.length) {
      await pool.query('UPDATE beds SET is_occupied = FALSE WHERE bed_id = $1', [admRow.rows[0].bed_id]);
    }
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateDischarge = async (req, res, next) => {
  const { discharge_summary, follow_up_plan } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE discharges
       SET discharge_summary = $1, follow_up_plan = $2
       WHERE discharge_id = $3
       RETURNING *`,
      [discharge_summary, follow_up_plan, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Discharge not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteDischarge = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM discharges WHERE discharge_id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Discharge not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllDischarges,
  getDischargeById,
  createDischarge,
  updateDischarge,
  deleteDischarge,
};
