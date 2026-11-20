const { asyncHandler } = require('../middleware/asyncHandler');
const { env } = require('../config/env');
const { fetchMetricsSummary } = require('../services/metrics');

function registerMetricsRoutes(router, db) {
  router.get(
    '/api/metrics/summary',
    asyncHandler(async (req, res) => {
      const summary = await fetchMetricsSummary(
        db,
        req.user.id,
        env.APP_TIMEZONE,
      );
      return res.json(summary);
    }),
  );
}

module.exports = { registerMetricsRoutes };
