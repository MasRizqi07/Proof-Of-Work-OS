const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { env } = require('./config/env');
const { requestId, requestLogger } = require('./middleware/request');
const { authRequired } = require('./middleware/auth');
const {
  notFound,
  errorHandler,
  errorResponse,
} = require('./middleware/errors');
const { prisma: defaultDb } = require('./db');

const { registerUserRoutes } = require('./routes/user');
const { registerProjectRoutes } = require('./routes/projects');
const { registerTaskRoutes } = require('./routes/tasks');
const { registerEvidenceRoutes } = require('./routes/evidence');
const { registerMetricsRoutes } = require('./routes/metrics');

function createApp({ db = defaultDb, authMiddleware = authRequired } = {}) {
  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);
  app.use(requestId);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()) }));
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === '/api/ping' || req.path === '/api/ready',
      handler: (req, res) =>
        res
          .status(429)
          .json(errorResponse(req, 'RATE_LIMITED', 'Too many requests')),
    }),
  );
  app.use(express.json({ limit: env.BODY_LIMIT }));
  app.use(requestLogger);

  app.get('/api/ping', (req, res) =>
    res.json({ status: 'ok', requestId: req.id }),
  );

  app.get('/api/ready', async (req, res) => {
    try {
      await db.$queryRaw`SELECT 1`;
      return res.json({ status: 'ready', requestId: req.id });
    } catch {
      return res
        .status(503)
        .json(
          errorResponse(req, 'SERVICE_UNAVAILABLE', 'Database unavailable'),
        );
    }
  });

  app.use('/api', authMiddleware);

  registerUserRoutes(app, db);
  registerProjectRoutes(app, db);
  registerTaskRoutes(app, db);
  registerEvidenceRoutes(app, db);
  registerMetricsRoutes(app, db);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
