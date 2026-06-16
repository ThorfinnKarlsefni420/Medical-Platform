const errorHandler = (err, _req, res, _next) => {
  console.error(err);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body too large' });
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({ message: 'Duplicate entry', detail: err.detail });
  }
  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ message: 'Referenced record does not exist', detail: err.detail });
  }
  // PostgreSQL check constraint violation
  if (err.code === '23514') {
    return res.status(400).json({ message: 'Invalid value for field', detail: err.detail });
  }

  res.status(500).json({ message: 'Internal server error' });
};

module.exports = errorHandler;
