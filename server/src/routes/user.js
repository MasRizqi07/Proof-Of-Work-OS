const { asyncHandler } = require('../middleware/asyncHandler');
const { errorResponse } = require('../middleware/errors');
const { profileUpdate, parse } = require('../validation');
const { event } = require('../utils/events');

function registerUserRoutes(router, db) {
  router.get(
    '/api/user',
    asyncHandler(async (req, res) => {
      const [user, completedTasks, projectsCompleted, weeklyActivityEvents] =
        await Promise.all([
          db.user.findUnique({
            where: { id: req.user.id },
            include: { profile: true },
          }),
          db.task.count({ where: { userId: req.user.id, status: 'DONE' } }),
          db.project.count({
            where: { ownerId: req.user.id, status: 'COMPLETED' },
          }),
          db.activityEvent.count({
            where: {
              userId: req.user.id,
              occurredAt: { gte: new Date(Date.now() - 7 * 86400000) },
            },
          }),
        ]);

      if (!user) {
        return res
          .status(404)
          .json(errorResponse(req, 'USER_NOT_FOUND', 'User not found'));
      }

      return res.json({
        ...user,
        metrics: { completedTasks, projectsCompleted, weeklyActivityEvents },
      });
    }),
  );

  router.patch(
    '/api/user/profile',
    asyncHandler(async (req, res) => {
      const input = parse(profileUpdate, req.body);

      const user = await db.user.findUnique({ where: { id: req.user.id } });
      if (!user) {
        return res
          .status(404)
          .json(errorResponse(req, 'USER_NOT_FOUND', 'User not found'));
      }

      const { name, ...profileData } = input;

      const result = await db.$transaction(async (tx) => {
        if (name) {
          await tx.user.update({
            where: { id: req.user.id },
            data: { name },
          });
        }

        if (Object.keys(profileData).length > 0) {
          await tx.profile.upsert({
            where: { userId: req.user.id },
            update: profileData,
            create: { userId: req.user.id, ...profileData },
          });
        }

        await tx.activityEvent.create({
          data: event('profile.updated', req.user.id, {}, {
            fields: Object.keys(input),
          }),
        });

        return tx.user.findUnique({
          where: { id: req.user.id },
          include: { profile: true },
        });
      });

      return res.json(result);
    }),
  );

  router.get(
    '/api/activities',
    asyncHandler(async (req, res) => {
      const page = Math.max(
        1,
        Number.parseInt(req.query.page || '1', 10),
      );
      const limit = Math.min(
        50,
        Math.max(1, Number.parseInt(req.query.limit || '20', 10)),
      );
      const skip = (page - 1) * limit;

      const where = { userId: req.user.id };

      const [items, total] = await Promise.all([
        db.activityEvent.findMany({
          where,
          skip,
          take: limit,
          orderBy: { occurredAt: 'desc' },
        }),
        db.activityEvent.count({ where }),
      ]);

      return res.json({
        items,
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      });
    }),
  );
}

module.exports = { registerUserRoutes };
