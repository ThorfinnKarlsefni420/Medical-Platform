/**
 * Parse ?page= and ?limit= from a request query string.
 * Defaults: page=1, limit=50. Max limit: 100.
 */
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page  ?? 1, 10)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? 50, 10) || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Strip the internal _total column added by COUNT(*) OVER() and return
 * { data, total, page, limit } ready to send as a JSON response.
 */
function paginatedResponse(rows, page, limit) {
  const total = rows.length > 0 ? parseInt(rows[0]._total, 10) : 0;
  const data  = rows.map(({ _total, ...rest }) => rest);
  return { data, total, page, limit };
}

module.exports = { parsePagination, paginatedResponse };
