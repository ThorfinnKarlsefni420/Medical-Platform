const pool = require('../config/db');

/**
 * Fire-and-forget audit log entry.
 * Never throws — a logging failure must not break the request.
 */
function logAudit(req, action, resource, resourceId) {
  const ip = req.ip ?? req.socket?.remoteAddress ?? null;
  pool.query(
    `INSERT INTO audit_log (user_id, role, action, resource, resource_id, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [req.user?.userId ?? null, req.user?.role ?? null, action, resource, resourceId ?? null, ip]
  ).catch(() => {});
}

module.exports = { logAudit };
