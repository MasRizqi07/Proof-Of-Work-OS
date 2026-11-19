const { asyncHandler } = require('../middleware/asyncHandler');
const { errorResponse } = require('../middleware/errors');
const { id, evidenceCreate, parse } = require('../validation');
const { evidenceKindToDb, evidenceForApi } = require('../utils/mappers');
const { event } = require('../utils/events');

function registerEvidenceRoutes(router, db) {
  router.get(
    '/api/tasks/:taskId/evidence',
    asyncHandler(async (req, res) => {
      const taskId = parse(id, req.params.taskId);
      const task = await db.task.findFirst({
        where: { id: taskId, userId: req.user.id },
      });
      if (!task) {
        return res
          .status(404)
          .json(errorResponse(req, 'TASK_NOT_FOUND', 'Task not found'));
      }
      const items = await db.evidence.findMany({
        where: { taskId, userId: req.user.id },
        orderBy: { createdAt: 'asc' },
      });
      return res.json(items.map(evidenceForApi));
    }),
  );

  router.post(
    '/api/tasks/:taskId/evidence',
    asyncHandler(async (req, res) => {
      const taskId = parse(id, req.params.taskId);
      const input = parse(evidenceCreate, req.body);

      const created = await db.$transaction(async (tx) => {
        const task = await tx.task.findFirst({
          where: { id: taskId, userId: req.user.id },
        });
        if (!task) {
          const error = new Error('Task not found');
          error.statusCode = 404;
          error.code = 'TASK_NOT_FOUND';
          throw error;
        }

        // Soft abuse limit of 20 evidence per task; a rare race may exceed it slightly.
        const count = await tx.evidence.count({ where: { taskId } });
        if (count >= 20) {
          const error = new Error('Evidence limit reached');
          error.statusCode = 409;
          error.code = 'EVIDENCE_LIMIT_REACHED';
          throw error;
        }

        const data = {
          userId: req.user.id,
          taskId,
          kind: evidenceKindToDb[input.kind] || input.kind.toUpperCase(),
          label: input.label,
          url: input.kind === 'url' ? input.url : null,
          body: input.kind === 'note' ? input.body : null,
        };

        const item = await tx.evidence.create({ data });

        await tx.activityEvent.create({
          data: event(
            'evidence.added',
            req.user.id,
            { taskId, projectId: task.projectId },
            { kind: input.kind },
          ),
        });

        return item;
      });

      return res.status(201).json(evidenceForApi(created));
    }),
  );

  router.delete(
    '/api/tasks/:taskId/evidence/:evidenceId',
    asyncHandler(async (req, res) => {
      const taskId = parse(id, req.params.taskId);
      const evidenceId = parse(id, req.params.evidenceId);

      await db.$transaction(async (tx) => {
        const task = await tx.task.findFirst({
          where: { id: taskId, userId: req.user.id },
        });
        if (!task) {
          const error = new Error('Task not found');
          error.statusCode = 404;
          error.code = 'TASK_NOT_FOUND';
          throw error;
        }

        const evidence = await tx.evidence.findFirst({
          where: { id: evidenceId, taskId, userId: req.user.id },
        });
        if (!evidence) {
          const error = new Error('Evidence not found');
          error.statusCode = 404;
          error.code = 'EVIDENCE_NOT_FOUND';
          throw error;
        }

        await tx.evidence.delete({ where: { id: evidenceId } });

        await tx.activityEvent.create({
          data: event(
            'evidence.removed',
            req.user.id,
            { taskId, projectId: task.projectId },
            { kind: String(evidence.kind).toLowerCase() },
          ),
        });
      });

      return res.status(204).send();
    }),
  );
}

module.exports = { registerEvidenceRoutes };
