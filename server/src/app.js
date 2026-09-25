const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { env } = require('./config/env');
const { requestId, requestLogger } = require('./middleware/request');
const { authRequired } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errors');
const { prisma } = require('./db');
const { id, projectInput, taskInput, parse } = require('./validation');

function pagination(req) {
  const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(req.query.limit || '20', 10)),
  );
  return { page, limit, skip: (page - 1) * limit };
}
function createApp() {
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

  app.use('/api', authRequired);
  app.get('/api/user', async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { profile: true },
      });
      if (!user)
        return res.status(404).json({
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
          requestId: req.id,
        });
      res.json({
        ...user,
        metrics: {
          weeklyPoints: 0,
          streakDays: 0,
          projectsCompleted: await prisma.project.count({
            where: { ownerId: req.user.id, archivedAt: null },
          }),
        },
      });
    } catch (e) {
      next(e);
    }
  });
  app.get('/api/projects', async (req, res, next) => {
    try {
      const { page, limit, skip } = pagination(req);
      const where = {
        ownerId: req.user.id,
        archivedAt: null,
        ...(req.query.search
          ? { name: { contains: req.query.search, mode: 'insensitive' } }
          : {}),
      };
      const [items, total] = await Promise.all([
        prisma.project.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.project.count({ where }),
      ]);
      res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/projects', async (req, res, next) => {
    try {
      const data = parse(projectInput, req.body);
      res.status(201).json(
        await prisma.project.create({
          data: { ...data, ownerId: req.user.id },
        }),
      );
    } catch (e) {
      next(e);
    }
  });
  app.get('/api/projects/:projectId', async (req, res, next) => {
    try {
      const project = await prisma.project.findFirst({
        where: {
          id: parse(id, req.params.projectId),
          ownerId: req.user.id,
          archivedAt: null,
        },
        include: { tasks: true },
      });
      if (!project)
        return res
          .status(404)
          .json({ error: 'Project not found', requestId: req.id });
      res.json(project);
    } catch (e) {
      next(e);
    }
  });
  app.patch('/api/projects/:projectId', async (req, res, next) => {
    try {
      const projectId = parse(id, req.params.projectId);
      const data = parse(projectInput.partial(), req.body);
      const result = await prisma.project.updateMany({
        where: { id: projectId, ownerId: req.user.id, archivedAt: null },
        data,
      });
      if (!result.count)
        return res
          .status(404)
          .json({ error: 'Project not found', requestId: req.id });
      res.json(await prisma.project.findUnique({ where: { id: projectId } }));
    } catch (e) {
      next(e);
    }
  });
  app.delete('/api/projects/:projectId', async (req, res, next) => {
    try {
      const projectId = parse(id, req.params.projectId);
      const result = await prisma.project.updateMany({
        where: { id: projectId, ownerId: req.user.id },
        data: { archivedAt: new Date() },
      });
      if (!result.count)
        return res
          .status(404)
          .json({ error: 'Project not found', requestId: req.id });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });
  app.get('/api/tasks', async (req, res, next) => {
    try {
      const { page, limit, skip } = pagination(req);
      const where = {
        userId: req.user.id,
        ...(req.query.status ? { status: req.query.status } : {}),
        ...(req.query.projectId
          ? { projectId: parse(id, req.query.projectId) }
          : {}),
      };
      const [items, total] = await Promise.all([
        prisma.task.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.task.count({ where }),
      ]);
      res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/tasks', async (req, res, next) => {
    try {
      const data = parse(taskInput, req.body);
      if (data.projectId) {
        const project = await prisma.project.findFirst({
          where: { id: data.projectId, ownerId: req.user.id, archivedAt: null },
        });
        if (!project)
          return res.status(404).json({
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'Project not found',
            },
            requestId: req.id,
          });
      }
      res
        .status(201)
        .json(
          await prisma.task.create({ data: { ...data, userId: req.user.id } }),
        );
    } catch (e) {
      next(e);
    }
  });
  app.patch('/api/tasks/:taskId', async (req, res, next) => {
    try {
      const taskId = parse(id, req.params.taskId);
      const data = parse(
        taskInput.partial().omit({ projectId: true }),
        req.body,
      );
      const task = await prisma.task.findFirst({
        where: { id: taskId, userId: req.user.id },
      });
      if (!task)
        return res.status(404).json({
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found' },
          requestId: req.id,
        });
      res.json(await prisma.task.update({ where: { id: taskId }, data }));
    } catch (e) {
      next(e);
    }
  });
  app.delete('/api/tasks/:taskId', async (req, res, next) => {
    try {
      const taskId = parse(id, req.params.taskId);
      const result = await prisma.task.deleteMany({
        where: { id: taskId, userId: req.user.id },
      });
      if (!result.count)
        return res.status(404).json({
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found' },
          requestId: req.id,
        });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
