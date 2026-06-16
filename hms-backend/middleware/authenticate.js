const jwt  = require('jsonwebtoken');
const pool = require('../config/db');

const authenticate = async (req, res, next) => {
  // Accept token from httpOnly cookie first, then fall back to Authorization header
  let token = req.cookies?.hms_token;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ message });
  }

  try {
    const { rows } = await pool.query(
      'SELECT is_active FROM users WHERE user_id = $1',
      [decoded.userId]
    );
    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ message: 'Account is inactive' });
    }
  } catch (err) {
    return next(err);
  }

  req.user = decoded;
  next();
};

module.exports = authenticate;
