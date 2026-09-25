const crypto = require('crypto');
const morgan = require('morgan');

function requestId(req, res, next) {
  const id = req.get('x-request-id') || crypto.randomUUID();
  req.id = id;
  req['x-request-id'] = id;
  res.setHeader('x-request-id', id);
  next();
}

morgan.token('request-id', (req) => req.id);
const requestLogger = morgan(
  ':method :url :status :response-time ms request_id=:request-id',
);
module.exports = { requestId, requestLogger };
