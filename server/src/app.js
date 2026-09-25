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
const {
  id,
  projectCreate,
  projectUpdate,
  taskCreate,
  taskUpdate,
  parse,
} = require('./validation');

const statusToDb = {
  todo: 'TODO',
  'in-progress': 'IN_PROGRESS',
  done: 'DONE',
  cancelled: 'CANCELLED',
};
const projectStatusToDb = {
  active: 'ACTIVE',
  paused: 'PAUSED',
  completed: 'COMPLETED',
};
const priorityToDb = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  urgent: 'URGENT',
};
const dbToStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  DONE: 'done',
  CANCELLED: 'cancelled',
};
const dbToPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};
const dbToProjectStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
};
const taskForApi = (task) =>
  task && {
    ...task,
    status: dbToStatus[task.status] || task.status,
    priority: dbToPriority[task.priority] || task.priority,
  };
const projectForApi = (project) =>
  project && {
    ...project,
    status: dbToProjectStatus[project.status] || project.status,
  };
function pagination(req) {
  const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(req.query.limit || '20', 10)),
  );
  return { page, limit, skip: (page - 1) * limit };
}
function event(type, userId, ids, metadata) {
  return { type, userId, ...ids, metadata };
}

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

  app.get('/api/user', async (req, res, next) => {
    try {
      const [user, completedTasks, projectsCompleted, weeklyActivityEvents] =
        await Promise.all([
          db.user.findUnique({
            where: { id: req.user.id },
            include: { profile: true },
          }),
          db.task.count({ where: { userId: req.user.id, status: 'DONE' } }),
          db.project.count({
            where: { ownerId: req.user.id, archivedAt: { not: null } },
          }),
          db.activityEvent.count({
            where: {
              userId: req.user.id,
              occurredAt: { gte: new Date(Date.now() - 7 * 86400000) },
            },
          }),
        ]);
      if (!user)
        return res
          .status(404)
          .json(errorResponse(req, 'USER_NOT_FOUND', 'User not found'));
      return res.json({
        ...user,
        metrics: { completedTasks, projectsCompleted, weeklyActivityEvents },
      });
    } catch (err) {
      return next(err);
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
        db.project.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { tasks: true } } },
        }),
        db.project.count({ where }),
      ]);
      return res.json({
        items: items.map(projectForApi),
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      });
    } catch (err) {
      return next(err);
    }
  });
  app.post('/api/projects', async (req, res, next) => {
    try {
      const data = parse(projectCreate, req.body);
      const project = await db.$transaction(async (tx) => {
        const created = await tx.project.create({
          data: {
            ...data,
            status: projectStatusToDb[data.status],
            ownerId: req.user.id,
          },
        });
        await tx.activityEvent.create({
          data: event(
            'project.created',
            req.user.id,
            { projectId: created.id },
            { name: created.name },
          ),
        });
        return created;
      });
      return res.status(201).json(projectForApi(project));
    } catch (err) {
      return next(err);
    }
  });
  app.get('/api/projects/:projectId', async (req, res, next) => {
    try {
      const project = await db.project.findFirst({
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
          .json(errorResponse(req, 'PROJECT_NOT_FOUND', 'Project not found'));
      return res.json({
        ...projectForApi(project),
        tasks: project.tasks.map(taskForApi),
      });
    } catch (err) {
      return next(err);
    }
  });
  app.patch('/api/projects/:projectId', async (req, res, next) => {
    try {
      const projectId = parse(id, req.params.projectId);
      const data = parse(projectUpdate, req.body);
      const project = await db.$transaction(async (tx) => {
        const current = await tx.project.findFirst({
          where: { id: projectId, ownerId: req.user.id, archivedAt: null },
        });
        if (!current) return null;
        const updated = await tx.project.update({
          where: { id: projectId },
          data: {
            ...data,
            ...(data.status ? { status: projectStatusToDb[data.status] } : {}),
          },
        });
        await tx.activityEvent.create({
          data: event(
            'project.updated',
            req.user.id,
            { projectId },
            { fields: Object.keys(data) },
          ),
        });
        return updated;
      });
      if (!project)
        return res
          .status(404)
          .json(errorResponse(req, 'PROJECT_NOT_FOUND', 'Project not found'));
      return res.json(projectForApi(project));
    } catch (err) {
      return next(err);
    }
  });
  app.delete('/api/projects/:projectId', async (req, res, next) => {
    try {
      const projectId = parse(id, req.params.projectId);
      const result = await db.$transaction(async (tx) => {
        const project = await tx.project.findFirst({
          where: { id: projectId, ownerId: req.user.id, archivedAt: null },
        });
        if (!project) return false;
        await tx.project.update({
          where: { id: projectId },
          data: { archivedAt: new Date() },
        });
        await tx.activityEvent.create({
          data: event('project.archived', req.user.id, { projectId }),
        });
        return true;
      });
      if (!result)
        return res
          .status(404)
          .json(errorResponse(req, 'PROJECT_NOT_FOUND', 'Project not found'));
      return res.status(204).end();
    } catch (err) {
      return next(err);
    }
  });

  app.get('/api/tasks', async (req, res, next) => {
    try {
      const { page, limit, skip } = pagination(req);
      const where = {
        userId: req.user.id,
        ...(req.query.status
          ? {
              status:
                statusToDb[parse(taskCreate.shape.status, req.query.status)],
            }
          : {}),
        ...(req.query.projectId
          ? { projectId: parse(id, req.query.projectId) }
          : {}),
      };
      const [items, total] = await Promise.all([
        db.task.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        db.task.count({ where }),
      ]);
      return res.json({
        items: items.map(taskForApi),
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      });
    } catch (err) {
      return next(err);
    }
  });
  app.get('/api/tasks/:taskId', async (req, res, next) => {
    try {
      const task = await db.task.findFirst({
        where: { id: parse(id, req.params.taskId), userId: req.user.id },
        include: { project: true },
      });
      if (!task)
        return res
          .status(404)
          .json(errorResponse(req, 'TASK_NOT_FOUND', 'Task not found'));
      return res.json(taskForApi(task));
    } catch (err) {
      return next(err);
    }
  });
  app.post('/api/tasks', async (req, res, next) => {
    try {
      const input = parse(taskCreate, req.body);
      const data = {
        ...input,
        status: statusToDb[input.status],
        priority: priorityToDb[input.priority],
        completedAt: input.status === 'done' ? new Date() : null,
      };
      const task = await db.$transaction(async (tx) => {
        if (
          data.projectId &&
          !(await tx.project.findFirst({
            where: {
              id: data.projectId,
              ownerId: req.user.id,
              archivedAt: null,
            },
          }))
        ) {
          const error = new Error('Project not found');
          error.statusCode = 404;
          error.code = 'PROJECT_NOT_FOUND';
          throw error;
        }
        const created = await tx.task.create({
          data: { ...data, userId: req.user.id },
        });
        await tx.activityEvent.create({
          data: event('task.created', req.user.id, {
            taskId: created.id,
            projectId: created.projectId,
          }),
        });
        return created;
      });
      return res.status(201).json(taskForApi(task));
    } catch (err) {
      return next(err);
    }
  });
  app.patch('/api/tasks/:taskId', async (req, res, next) => {
    try {
      const taskId = parse(id, req.params.taskId);
      const input = parse(taskUpdate, req.body);
      const data = { ...input };
      if (input.status) data.status = statusToDb[input.status];
      if (input.priority) data.priority = priorityToDb[input.priority];
      if (input.status === 'done') data.completedAt = new Date();
      if (input.status && input.status !== 'done') data.completedAt = null;
      const task = await db.$transaction(async (tx) => {
        const current = await tx.task.findFirst({
          where: { id: taskId, userId: req.user.id },
        });
        if (!current) return null;
        if (
          data.projectId &&
          !(await tx.project.findFirst({
            where: {
              id: data.projectId,
              ownerId: req.user.id,
              archivedAt: null,
            },
          }))
        ) {
          const error = new Error('Project not found');
          error.statusCode = 404;
          error.code = 'PROJECT_NOT_FOUND';
          throw error;
        }
        const updated = await tx.task.update({ where: { id: taskId }, data });
        await tx.activityEvent.create({
          data: event(
            'task.updated',
            req.user.id,
            { taskId, projectId: updated.projectId },
            { fields: Object.keys(input) },
          ),
        });
        return updated;
      });
      if (!task)
        return res
          .status(404)
          .json(errorResponse(req, 'TASK_NOT_FOUND', 'Task not found'));
      return res.json(taskForApi(task));
    } catch (err) {
      return next(err);
    }
  });
  app.delete('/api/tasks/:taskId', async (req, res, next) => {
    try {
      const taskId = parse(id, req.params.taskId);
      const removed = await db.$transaction(async (tx) => {
        const task = await tx.task.findFirst({
          where: { id: taskId, userId: req.user.id },
        });
        if (!task) return false;
        await tx.activityEvent.create({
          data: event('task.deleted', req.user.id, {
            taskId,
            projectId: task.projectId,
          }),
        });
        await tx.task.delete({ where: { id: taskId } });
        return true;
      });
      if (!removed)
        return res
          .status(404)
          .json(errorResponse(req, 'TASK_NOT_FOUND', 'Task not found'));
      return res.status(204).end();
    } catch (err) {
      return next(err);
    }
  });
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
