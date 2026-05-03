/**
 * Restricts a route to users whose role is in the allowed list.
 * Must be used after authenticate middleware.
 *
 * Usage:  router.get('/', authenticate, authorize('admin', 'doctor'), handler)
 */
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient role' });
  }
  next();
};

module.exports = authorize;
