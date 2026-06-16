const pool = require('../config/db');
const { parsePagination, paginatedResponse } = require('../utils/paginate');
const { logAudit } = require('../middleware/audit');

const SELECT_PRESCRIPTIONS = `
  SELECT pr.*,
         COALESCE(p_out.first_name, p_in.first_name) AS patient_first_name,
         COALESCE(p_out.last_name,  p_in.last_name)  AS patient_last_name,
         COALESCE(d_out.first_name, d_in.first_name) AS doctor_first_name,
         COALESCE(d_out.last_name,  d_in.last_name)  AS doctor_last_name,
         COALESCE(a_out.patient_id, a_in.patient_id) AS patient_id
  FROM prescriptions pr
  LEFT JOIN medical_records mr_out ON pr.record_id    = mr_out.record_id
  LEFT JOIN appointments    a_out  ON mr_out.appointment_id = a_out.appointment_id
  LEFT JOIN patients        p_out  ON a_out.patient_id = p_out.patient_id
  LEFT JOIN doctors         d_out  ON a_out.doctor_id  = d_out.doctor_id
  LEFT JOIN admissions      adm    ON pr.admission_id  = adm.admission_id
  LEFT JOIN medical_records mr_in  ON adm.record_id    = mr_in.record_id
  LEFT JOIN appointments    a_in   ON mr_in.appointment_id = a_in.appointment_id
  LEFT JOIN patients        p_in   ON a_in.patient_id  = p_in.patient_id
  LEFT JOIN doctors         d_in   ON a_in.doctor_id   = d_in.doctor_id
`;

const getAllPrescriptions = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req.query);
  try {
    const { rows } = await pool.query(
      `SELECT t.*, COUNT(*) OVER() AS _total
       FROM (${SELECT_PRESCRIPTIONS}) t
       WHERE NOT EXISTS (
         SELECT 1 FROM deleted_records dr
         WHERE dr.table_name = 'prescriptions' AND dr.record_id = t.prescription_id
       )
       ORDER BY t.prescription_id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(paginatedResponse(rows, page, limit));
  } catch (err) {
    next(err);
  }
};

const getPrescriptionById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      SELECT_PRESCRIPTIONS + ' WHERE pr.prescription_id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Prescription not found' });
    if (req.user.role === 'patient' && rows[0].patient_id !== req.user.patientId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const getAdmissionPrescriptions = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.* FROM (${SELECT_PRESCRIPTIONS}) t
       WHERE t.admission_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM deleted_records dr
           WHERE dr.table_name = 'prescriptions' AND dr.record_id = t.prescription_id
         )
       ORDER BY t.prescription_id DESC`,
      [req.params.admissionId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const createPrescription = async (req, res, next) => {
  const { record_id, admission_id, medication_name, dosage, instructions, status } = req.body;
  if (!record_id && !admission_id) {
    return res.status(400).json({ message: 'Either record_id or admission_id is required' });
  }
  if (!medication_name || !dosage) {
    return res.status(400).json({ message: 'medication_name and dosage are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO prescriptions (record_id, admission_id, medication_name, dosage, instructions, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING prescription_id`,
      [record_id ?? null, admission_id ?? null, medication_name, dosage, instructions, status ?? 'Created']
    );
    const { rows: full } = await pool.query(
      SELECT_PRESCRIPTIONS + ' WHERE pr.prescription_id = $1',
      [rows[0].prescription_id]
    );
    logAudit(req, 'CREATE', 'prescriptions', rows[0].prescription_id);
    res.status(201).json(full[0]);
  } catch (err) {
    next(err);
  }
};

const updatePrescription = async (req, res, next) => {
  const { medication_name, dosage, instructions, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE prescriptions
       SET medication_name = $1, dosage = $2, instructions = $3, status = $4
       WHERE prescription_id = $5
       RETURNING prescription_id`,
      [medication_name, dosage, instructions, status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Prescription not found' });
    const { rows: full } = await pool.query(
      SELECT_PRESCRIPTIONS + ' WHERE pr.prescription_id = $1',
      [rows[0].prescription_id]
    );
    logAudit(req, 'UPDATE', 'prescriptions', rows[0].prescription_id);
    res.json(full[0]);
  } catch (err) {
    next(err);
  }
};

const deletePrescription = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT prescription_id FROM prescriptions WHERE prescription_id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Prescription not found' });
    await pool.query(
      `INSERT INTO deleted_records (table_name, record_id, deleted_by)
       VALUES ('prescriptions', $1, $2)
       ON CONFLICT DO NOTHING`,
      [req.params.id, req.user?.userId ?? null]
    );
    logAudit(req, 'DELETE', 'prescriptions', Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllPrescriptions,
  getPrescriptionById,
  getAdmissionPrescriptions,
  createPrescription,
  updatePrescription,
  deletePrescription,
};
