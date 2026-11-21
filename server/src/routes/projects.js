const { asyncHandler } = require('../middleware/asyncHandler');
const { errorResponse } = require('../middleware/errors');
const { id, projectCreate, projectUpdate, parse } = require('../validation');
const {
  projectStatusToDb,
  projectForApi,
  taskForApi,
} = require('../utils/mappers');
const { pagination } = require('../utils/pagination');
const { event } = require('../utils/events');

function registerProjectRoutes(router, db) {
  router.get(
    '/api/projects',
    asyncHandler(async (req, res) => {
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
      const projectIds = items.map((p) => p.id);
      const doneCounts =
        projectIds.length > 0 && typeof db.task?.groupBy === 'function'
          ? await db.task.groupBy({
              by: ['projectId'],
              where: {
                projectId: { in: projectIds },
                status: 'DONE',
              },
              _count: { id: true },
            })
          : [];
      const doneCountMap = new Map(
        doneCounts.map((c) => [c.projectId, c._count.id]),
      );
      return res.json({
        items: items.map((item) =>
          projectForApi(item, {
            total: item._count?.tasks ?? 0,
            done: doneCountMap.get(item.id) ?? 0,
          }),
        ),
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      });
    }),
  );

  router.post(
    '/api/projects',
    asyncHandler(async (req, res) => {
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
    }),
  );

  router.get(
    '/api/projects/:projectId',
    asyncHandler(async (req, res) => {
      const projectId = parse(id, req.params.projectId);
      const [project, totalTasks, doneTasks] = await Promise.all([
        db.project.findFirst({
          where: {
            id: projectId,
            ownerId: req.user.id,
            archivedAt: null,
          },
          include: {
            tasks: {
              take: 50,
              orderBy: { createdAt: 'desc' },
            },
          },
        }),
        db.task.count({
          where: {
            projectId,
            user: { id: req.user.id },
          },
        }),
        db.task.count({
          where: {
            projectId,
            user: { id: req.user.id },
            status: 'DONE',
          },
        }),
      ]);
      if (!project) {
        return res
          .status(404)
          .json(errorResponse(req, 'PROJECT_NOT_FOUND', 'Project not found'));
      }
      return res.json({
        ...projectForApi(project, { total: totalTasks, done: doneTasks }),
        tasks: (project.tasks || []).map(taskForApi),
      });
    }),
  );

  router.patch(
    '/api/projects/:projectId',
    asyncHandler(async (req, res) => {
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
      if (!project) {
        return res
          .status(404)
          .json(errorResponse(req, 'PROJECT_NOT_FOUND', 'Project not found'));
      }
      return res.json(projectForApi(project));
    }),
  );

  router.delete(
    '/api/projects/:projectId',
    asyncHandler(async (req, res) => {
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
      if (!result) {
        return res
          .status(404)
          .json(errorResponse(req, 'PROJECT_NOT_FOUND', 'Project not found'));
      }
      return res.status(204).end();
    }),
  );
}

module.exports = { registerProjectRoutes };
