const pool = require('../config/db');

const getAllAppointments = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name,
              d.first_name AS doctor_first_name,  d.last_name  AS doctor_last_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       JOIN doctors  d ON a.doctor_id  = d.doctor_id
       ORDER BY a.appointment_datetime DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getAppointmentById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name,
              d.first_name AS doctor_first_name,  d.last_name  AS doctor_last_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       JOIN doctors  d ON a.doctor_id  = d.doctor_id
       WHERE a.appointment_id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Appointment not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const createAppointment = async (req, res, next) => {
  const { patient_id, doctor_id, appointment_datetime, reason, status } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_datetime, reason, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [patient_id, doctor_id, appointment_datetime, reason, status ?? 'Scheduled']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateAppointment = async (req, res, next) => {
  const { patient_id, doctor_id, appointment_datetime, reason, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE appointments
       SET patient_id = $1, doctor_id = $2, appointment_datetime = $3,
           reason = $4, status = $5
       WHERE appointment_id = $6
       RETURNING *`,
      [patient_id, doctor_id, appointment_datetime, reason, status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Appointment not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteAppointment = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM appointments WHERE appointment_id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Appointment not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};
