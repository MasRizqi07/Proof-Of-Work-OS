function notFound(req, res) {
  res.status(404).json({ error: 'Not found', requestId: req.id });
}
function errorHandler(err, req, res, _next) {
  console.error({
    requestId: req.id,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
  const status = err.statusCode || 500;
  const error = {
    code: err.code || (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
    message: status === 500 ? 'Internal server error' : err.message,
  };
  if (err.details) error.details = err.details;
  res.status(status).json({ error, requestId: req.id });
}
module.exports = { notFound, errorHandler };
