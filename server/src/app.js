const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { env } = require('./config/env');
const { requestId, requestLogger } = require('./middleware/request');
const { authRequired } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errors');
const { prisma: defaultDb } = require('./db');

const { registerUserRoutes } = require('./routes/user');
const { registerProjectRoutes } = require('./routes/projects');
const { registerTaskRoutes } = require('./routes/tasks');

function createApp({ db = defaultDb, authMiddleware = authRequired } = {}) {
  const app = express();
  app.use(requestId);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()) }));
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(express.json({ limit: env.BODY_LIMIT }));
  app.use(requestLogger);

  app.get('/api/ping', (req, res) =>
    res.json({ status: 'ok', requestId: req.id }),
  );

  app.use('/api', authMiddleware);

  registerUserRoutes(app, db);
  registerProjectRoutes(app, db);
  registerTaskRoutes(app, db);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
