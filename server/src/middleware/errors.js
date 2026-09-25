function errorResponse(req, code, message, details) {
  const error = { code, message };
  if (details !== undefined) error.details = details;
  return { error, requestId: req.id };
}

function notFound(req, res) {
  res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Resource not found'));
}

function errorHandler(err, req, res, _next) {
  console.error({
    requestId: req.id,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
  const status = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const code =
    err.code || (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
  const message = status === 500 ? 'Internal server error' : err.message;
  res.status(status).json(errorResponse(req, code, message, err.details));
}

module.exports = { errorResponse, notFound, errorHandler };
