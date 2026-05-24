const pool    = require('../config/db');
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

const SALT_ROUNDS        = 12;
const INVITE_EXPIRY_HOURS = 48;
const STAFF_ROLES        = ['admin', 'receptionist', 'doctor', 'nurse', 'pharmacist', 'lab_technician'];

const generateToken = () => crypto.randomBytes(32).toString('hex');

// GET /api/staff
const getStaff = async (_req, res, next) => {
  try {
    const { rows: users } = await pool.query(
      `SELECT u.user_id, u.email, u.role, u.is_active, u.created_at,
              COALESCE(d.first_name, '') AS first_name,
              COALESCE(d.last_name,  '') AS last_name,
              d.specialty
       FROM users u
       LEFT JOIN doctors d ON u.doctor_id = d.doctor_id
       WHERE u.role != 'patient'
       ORDER BY u.created_at DESC`
    );

    const { rows: invites } = await pool.query(
      `SELECT invite_id, email, role, first_name, last_name, specialty,
              expires_at, created_at
       FROM staff_invites
       WHERE accepted_at IS NULL
       ORDER BY created_at DESC`
    );

    res.json({
      staff: users.map((u) => ({
        ...u,
        source: 'user',
        status: u.is_active ? 'active' : 'inactive',
      })),
      pending_invites: invites.map((i) => ({
        ...i,
        source: 'invite',
        status: new Date(i.expires_at) < new Date() ? 'expired' : 'pending',
      })),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/staff/invite
const sendInvite = async (req, res, next) => {
  const { email, role, first_name, last_name, specialty, license_number } = req.body;

  if (!email || !role || !first_name || !last_name) {
    return res.status(400).json({ message: 'email, role, first_name, and last_name are required' });
  }
  if (!STAFF_ROLES.includes(role)) {
    return res.status(400).json({ message: `role must be one of: ${STAFF_ROLES.join(', ')}` });
  }
  if (role === 'doctor' && !license_number) {
    return res.status(400).json({ message: 'license_number is required for doctor accounts' });
  }

  const client = await pool.connect();
  try {
    const { rows: existing } = await client.query(
      'SELECT user_id FROM users WHERE email = $1', [email]
    );
    if (existing.length) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }

    // Expire any previous pending invite for the same email
    await client.query(
      `UPDATE staff_invites SET expires_at = NOW()
       WHERE email = $1 AND accepted_at IS NULL`,
      [email]
    );

    // Pre-create doctors row so doctor_id is ready when invite is accepted
    let doctor_id = null;
    if (role === 'doctor') {
      const { rows: docRows } = await client.query(
        `INSERT INTO doctors (first_name, last_name, specialty, license_number, email)
         VALUES ($1, $2, $3, $4, $5) RETURNING doctor_id`,
        [first_name, last_name, specialty ?? null, license_number, email]
      );
      doctor_id = docRows[0].doctor_id;
    }

    const token     = generateToken();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO staff_invites
         (email, role, first_name, last_name, specialty, license_number, token, doctor_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [email, role, first_name, last_name, specialty ?? null, license_number ?? null, token, doctor_id, expiresAt]
    );

    const inviteUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/invite/${token}`;

    // TODO: send invite email once an email provider is configured
    res.status(201).json({ message: 'Invite created', invite_url: inviteUrl, expires_at: expiresAt });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/staff/invite/:token  (public — no auth)
const validateInvite = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT invite_id, email, role, first_name, last_name, specialty, expires_at
       FROM staff_invites
       WHERE token = $1 AND accepted_at IS NULL`,
      [req.params.token]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'This invite link is invalid or has already been used.' });
    }
    if (new Date(rows[0].expires_at) < new Date()) {
      return res.status(410).json({ message: 'This invite link has expired. Ask your admin to resend it.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/staff/invite/:token/accept  (public — no auth)
const acceptInvite = async (req, res, next) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT * FROM staff_invites WHERE token = $1 AND accepted_at IS NULL`,
      [req.params.token]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'This invite link is invalid or has already been used.' });
    }
    const invite = rows[0];
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ message: 'This invite link has expired. Ask your admin to resend it.' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows: userRows } = await client.query(
      `INSERT INTO users (email, password, role, doctor_id)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, email, role, doctor_id`,
      [invite.email, hashed, invite.role, invite.doctor_id ?? null]
    );
    const user = userRows[0];

    await client.query(
      `UPDATE staff_invites SET accepted_at = NOW() WHERE invite_id = $1`,
      [invite.invite_id]
    );

    await client.query('COMMIT');

    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user: {
        user_id:   user.user_id,
        email:     user.email,
        role:      user.role,
        doctor_id: user.doctor_id,
        profile:   { first_name: invite.first_name, last_name: invite.last_name },
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// PATCH /api/staff/:id/status
const updateStaffStatus = async (req, res, next) => {
  const { is_active } = req.body;
  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ message: 'is_active must be a boolean' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE users SET is_active = $1
       WHERE user_id = $2 AND role != 'patient'
       RETURNING user_id, email, role, is_active`,
      [is_active, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Staff member not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/staff/invites/:inviteId/resend
const resendInvite = async (req, res, next) => {
  try {
    const token     = generateToken();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    const { rows } = await pool.query(
      `UPDATE staff_invites
       SET token = $1, expires_at = $2
       WHERE invite_id = $3 AND accepted_at IS NULL
       RETURNING email, role, first_name, last_name`,
      [token, expiresAt, req.params.inviteId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Pending invite not found' });

    const inviteUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/invite/${token}`;

    res.json({ message: 'Invite resent', invite_url: inviteUrl, expires_at: expiresAt });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStaff, sendInvite, validateInvite, acceptInvite, updateStaffStatus, resendInvite };
