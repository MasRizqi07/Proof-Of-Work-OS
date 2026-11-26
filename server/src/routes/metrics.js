const { asyncHandler } = require('../middleware/asyncHandler');
const { env } = require('../config/env');
const { heatmapWeeksQuery, reportDaysQuery, parse } = require('../validation');
const {
  fetchMetricsSummary,
  fetchMetricsHeatmap,
  fetchProofReport,
} = require('../services/metrics');

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

  router.get(
    '/api/metrics/heatmap',
    asyncHandler(async (req, res) => {
      const weeks =
        req.query.weeks !== undefined
          ? parse(heatmapWeeksQuery, req.query.weeks)
          : 26;
      const heatmap = await fetchMetricsHeatmap(
        db,
        req.user.id,
        env.APP_TIMEZONE,
        weeks,
      );
      return res.json(heatmap);
    }),
  );

  router.get(
    '/api/report',
    asyncHandler(async (req, res) => {
      const days =
        req.query.days !== undefined
          ? parse(reportDaysQuery, req.query.days)
          : 30;
      const report = await fetchProofReport(
        db,
        req.user.id,
        env.APP_TIMEZONE,
        days,
      );
      return res.json(report);
    }),
  );
}

module.exports = { registerMetricsRoutes };
