function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((e) => e.message).join(', ');
    return res.status(400).json({ message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Email is already registered' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request too large (screenshot is too big)' });
  }

  res.status(err.status || 500).json({ message: err.message || 'Server error' });
}

module.exports = { notFound, errorHandler };
