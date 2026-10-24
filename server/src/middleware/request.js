const crypto = require('crypto');
const morgan = require('morgan');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requestId(req, res, next) {
  const client = req.get('x-request-id');
  const id = client && UUID_RE.test(client) ? client : crypto.randomUUID();
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
