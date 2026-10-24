const { z } = require('zod');
const { asyncHandler } = require('../middleware/asyncHandler');
const { errorResponse } = require('../middleware/errors');
const { id, taskCreate, taskUpdate, parse } = require('../validation');
const { statusToDb, priorityToDb, taskForApi } = require('../utils/mappers');
const { pagination } = require('../utils/pagination');
const { event } = require('../utils/events');

const taskStatusQuery = z.enum(['todo', 'in-progress', 'done', 'cancelled']);

function registerTaskRoutes(router, db) {
  router.get(
    '/api/tasks',
    asyncHandler(async (req, res) => {
      const { page, limit, skip } = pagination(req);
      const where = {
        userId: req.user.id,
        ...(req.query.status
          ? {
              status: statusToDb[parse(taskStatusQuery, req.query.status)],
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
    }),
  );

  router.get(
    '/api/tasks/:taskId',
    asyncHandler(async (req, res) => {
      const task = await db.task.findFirst({
        where: { id: parse(id, req.params.taskId), userId: req.user.id },
        include: { project: true },
      });
      if (!task) {
        return res
          .status(404)
          .json(errorResponse(req, 'TASK_NOT_FOUND', 'Task not found'));
      }
      return res.json(taskForApi(task));
    }),
  );

  router.post(
    '/api/tasks',
    asyncHandler(async (req, res) => {
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
    }),
  );

  router.patch(
    '/api/tasks/:taskId',
    asyncHandler(async (req, res) => {
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
        const lifecycleEvent =
          input.status === 'done' && current.status !== 'DONE'
            ? 'task.completed'
            : input.status === 'in-progress' && current.status === 'TODO'
              ? 'task.started'
              : input.status === 'cancelled' && current.status !== 'CANCELLED'
                ? 'task.cancelled'
                : input.status &&
                    current.status === 'DONE' &&
                    input.status !== 'done'
                  ? 'task.reopened'
                  : 'task.updated';
        await tx.activityEvent.create({
          data: event(
            lifecycleEvent,
            req.user.id,
            { taskId, projectId: updated.projectId },
            { fields: Object.keys(input) },
          ),
        });
        return updated;
      });
      if (!task) {
        return res
          .status(404)
          .json(errorResponse(req, 'TASK_NOT_FOUND', 'Task not found'));
      }
      return res.json(taskForApi(task));
    }),
  );

  router.delete(
    '/api/tasks/:taskId',
    asyncHandler(async (req, res) => {
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
      if (!removed) {
        return res
          .status(404)
          .json(errorResponse(req, 'TASK_NOT_FOUND', 'Task not found'));
      }
      return res.status(204).end();
    }),
  );
}

module.exports = { registerTaskRoutes };
