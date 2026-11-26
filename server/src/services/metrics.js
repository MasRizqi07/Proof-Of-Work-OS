const { Prisma } = require('@prisma/client');
const { evidenceForApi, dbToPriority } = require('../utils/mappers');

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcMs(isoDateStr) {
  const [y, m, d] = isoDateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function utcAddDays(isoDateStr, offsetDays) {
  return fromUtcMs(toUtcMs(isoDateStr) + offsetDays * DAY_MS);
}

function localDateForTimestamp(utcDate, timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(utcDate);
}

/**
 * Returns the Monday 00:00:00 (as an ISO date string) for a given
 * UTC timestamp, interpreted in the given timezone.
 *
 * @param {Date} utcDate - a Date whose .getTime() is in UTC
 * @param {string} timezone - IANA timezone string
 * @returns {string} ISO date string "YYYY-MM-DD" of the Monday of that week
 */
function weekStartForDate(utcDate, timezone) {
  const localDateStr = localDateForTimestamp(utcDate, timezone);
  const utcMs = toUtcMs(localDateStr);
  const dow = new Date(utcMs).getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const isoDayOffset = dow === 0 ? 6 : dow - 1; // Mon=0, Tue=1, ..., Sun=6
  return fromUtcMs(utcMs - isoDayOffset * DAY_MS);
}

/**
 * Compute current and longest streak from a set of week-start strings.
 *
 * @param {Set<string>} proofWeeks - Set of "YYYY-MM-DD" Monday dates that have proof
 * @param {string} currentWeekStart - "YYYY-MM-DD" Monday of the current week
 * @returns {{ currentWeeks: number, longestWeeks: number }}
 */
function computeStreaks(proofWeeks, currentWeekStart) {
  if (proofWeeks.size === 0) {
    return { currentWeeks: 0, longestWeeks: 0 };
  }

  const sorted = [...proofWeeks].sort();

  let longestWeeks = 1;
  let runLength = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (isConsecutiveWeek(sorted[i - 1], sorted[i])) {
      runLength++;
      if (runLength > longestWeeks) longestWeeks = runLength;
    } else {
      runLength = 1;
    }
  }

  let checkWeek = currentWeekStart;
  if (!proofWeeks.has(checkWeek)) {
    checkWeek = previousWeek(checkWeek);
  }

  let currentWeeks = 0;
  while (proofWeeks.has(checkWeek)) {
    currentWeeks++;
    checkWeek = previousWeek(checkWeek);
  }

  return { currentWeeks, longestWeeks };
}

/**
 * Returns the Monday 7 days before the given Monday string in UTC.
 * @param {string} weekStr - "YYYY-MM-DD"
 * @returns {string} "YYYY-MM-DD"
 */
function previousWeek(weekStr) {
  return utcAddDays(weekStr, -7);
}

/**
 * Returns true if weekB is exactly 7 calendar days after weekA.
 * Computed in UTC to guarantee immunity to local DST transitions.
 */
function isConsecutiveWeek(weekA, weekB) {
  return toUtcMs(weekB) - toUtcMs(weekA) === 7 * DAY_MS;
}

/**
 * Build an array of 8 weekly buckets ending with the current week.
 *
 * @param {string} currentWeekStart - "YYYY-MM-DD" of this week's Monday
 * @returns {string[]} Array of 8 "YYYY-MM-DD" Monday strings, oldest first
 */
function buildWeeklyRange(currentWeekStart) {
  const weeks = [];
  let w = currentWeekStart;
  for (let i = 0; i < 8; i++) {
    weeks.unshift(w);
    w = previousWeek(w);
  }
  return weeks;
}

/**
 * Build an ordered array of YYYY-MM-DD date strings starting from `fromDate`.
 *
 * @param {string} fromDate - "YYYY-MM-DD"
 * @param {number} totalDays - exact count of days
 * @returns {string[]}
 */
function buildDayRange(fromDate, totalDays) {
  const startMs = toUtcMs(fromDate);
  const days = [];
  for (let i = 0; i < totalDays; i++) {
    days.push(fromUtcMs(startMs + i * DAY_MS));
  }
  return days;
}

/**
 * Query the database and compute the full metrics summary using SQL aggregation.
 */
async function fetchMetricsSummary(db, userId, timezone) {
  const now = new Date();
  const currentWeekStart = weekStartForDate(now, timezone);
  const weekRange = buildWeeklyRange(currentWeekStart);

  const totalsRows = await db.$queryRaw(
    Prisma.sql`
      SELECT
        COUNT(*)::int AS completed,
        COUNT(CASE WHEN COALESCE(e.cnt, 0) > 0 THEN 1 END)::int AS "withProof"
      FROM "Task" t
      LEFT JOIN (
        SELECT "taskId", COUNT(*)::int AS cnt
        FROM "Evidence"
        WHERE "userId" = ${userId}::uuid
        GROUP BY "taskId"
      ) e ON e."taskId" = t.id
      WHERE t."userId" = ${userId}::uuid
        AND t.status = 'done'
        AND t."completedAt" IS NOT NULL
    `,
  );
  const completed = totalsRows[0]?.completed ?? 0;
  const withProof = totalsRows[0]?.withProof ?? 0;

  const overdueRows = await db.$queryRaw(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "Task"
      WHERE "userId" = ${userId}::uuid
        AND status IN ('todo', 'in-progress')
        AND "dueDate" IS NOT NULL
        AND "dueDate" < NOW()
    `,
  );
  const overdueOpen = overdueRows[0]?.count ?? 0;

  const weeklyAggRows = await db.$queryRaw(
    Prisma.sql`
      SELECT
        (date_trunc('week', t."completedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone}))::date::text AS "weekStart",
        COUNT(CASE WHEN COALESCE(e.cnt, 0) > 0 THEN 1 END)::int AS "withProof",
        COUNT(CASE WHEN COALESCE(e.cnt, 0) = 0 THEN 1 END)::int AS "withoutProof"
      FROM "Task" t
      LEFT JOIN (
        SELECT "taskId", COUNT(*)::int AS cnt
        FROM "Evidence"
        WHERE "userId" = ${userId}::uuid
        GROUP BY "taskId"
      ) e ON e."taskId" = t.id
      WHERE t."userId" = ${userId}::uuid
        AND t.status = 'done'
        AND t."completedAt" IS NOT NULL
      GROUP BY 1
    `,
  );

  const proofWeeks = new Set();
  const weeklyMap = new Map();
  for (const row of weeklyAggRows) {
    if (row.withProof > 0) {
      proofWeeks.add(row.weekStart);
    }
    weeklyMap.set(row.weekStart, row);
  }

  const withoutProof = completed - withProof;
  const proofRate = completed > 0 ? withProof / completed : null;
  const streak = computeStreaks(proofWeeks, currentWeekStart);

  const weekly = weekRange.map((ws) => ({
    weekStart: ws,
    withProof: weeklyMap.get(ws)?.withProof ?? 0,
    withoutProof: weeklyMap.get(ws)?.withoutProof ?? 0,
  }));

  return {
    timezone,
    generatedAt: now.toISOString(),
    totals: {
      completed,
      withProof,
      withoutProof,
      proofRate,
      overdueOpen,
    },
    streak,
    weekly,
  };
}

/**
 * Query SQL-aggregated daily proof counts over a Monday-aligned `weeks` window
 * and zero-fill all `weeks * 7` days.
 */
async function fetchMetricsHeatmap(
  db,
  userId,
  timezone,
  weeks = 26,
  now = new Date(),
) {
  const currentWeekStart = weekStartForDate(now, timezone);
  const fromDate = utcAddDays(currentWeekStart, -(weeks - 1) * 7);
  const toDate = utcAddDays(currentWeekStart, 6);

  const rows = await db.$queryRaw(
    Prisma.sql`
      SELECT to_char(((t."completedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timezone}), 'YYYY-MM-DD') AS "date",
             (COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "Evidence" e WHERE e."taskId" = t."id")))::int AS "withProof",
             (COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "Evidence" e WHERE e."taskId" = t."id")))::int AS "withoutProof"
      FROM "Task" t
      WHERE t."userId" = ${userId}::uuid
        AND t."status" = 'done'
        AND t."completedAt" IS NOT NULL
        AND ((t."completedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timezone})::date >= ${fromDate}::date
        AND ((t."completedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timezone})::date <= ${toDate}::date
      GROUP BY 1
      ORDER BY 1
    `,
  );

  const dayMap = new Map();
  for (const row of rows) {
    dayMap.set(row.date, {
      withProof: row.withProof ?? 0,
      withoutProof: row.withoutProof ?? 0,
    });
  }

  const dateKeys = buildDayRange(fromDate, weeks * 7);
  const days = dateKeys.map((date) => ({
    date,
    withProof: dayMap.get(date)?.withProof ?? 0,
    withoutProof: dayMap.get(date)?.withoutProof ?? 0,
  }));

  return {
    timezone,
    from: fromDate,
    to: toDate,
    days,
  };
}

/**
 * Fetch completed tasks within the last `days` calendar days (in `timezone`),
 * grouped by week (newest first), including full evidence items (and user notes).
 */
async function fetchProofReport(
  db,
  userId,
  timezone,
  days = 30,
  now = new Date(),
) {
  const toDate = localDateForTimestamp(now, timezone);
  const fromDate = utcAddDays(toDate, -(days - 1));

  const matchedRows = await db.$queryRaw(
    Prisma.sql`
      SELECT t."id"
      FROM "Task" t
      WHERE t."userId" = ${userId}::uuid
        AND t."status" = 'done'
        AND t."completedAt" IS NOT NULL
        AND ((t."completedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timezone})::date >= ${fromDate}::date
        AND ((t."completedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timezone})::date <= ${toDate}::date
      ORDER BY t."completedAt" DESC, t."createdAt" DESC
    `,
  );

  const taskIds = matchedRows.map((row) => row.id);

  const [userRecord, taskRecords] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    taskIds.length > 0
      ? db.task.findMany({
          where: { id: { in: taskIds }, userId },
          orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            title: true,
            description: true,
            priority: true,
            completedAt: true,
            project: { select: { name: true } },
            evidence: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                taskId: true,
                userId: true,
                kind: true,
                label: true,
                url: true,
                body: true,
                createdAt: true,
              },
            },
          },
        })
      : [],
  ]);

  let withProof = 0;
  let withoutProof = 0;
  const weekGroups = new Map();

  for (const task of taskRecords) {
    const mappedEvidence = (task.evidence || []).map(evidenceForApi);
    const hasProof = mappedEvidence.length > 0;
    if (hasProof) withProof += 1;
    else withoutProof += 1;

    const weekStart = weekStartForDate(new Date(task.completedAt), timezone);
    if (!weekGroups.has(weekStart)) {
      weekGroups.set(weekStart, []);
    }

    weekGroups.get(weekStart).push({
      id: task.id,
      title: task.title,
      description: task.description ?? null,
      priority: dbToPriority[task.priority] || task.priority,
      completedAt: new Date(task.completedAt).toISOString(),
      projectName: task.project?.name ?? null,
      hasProof,
      proofCount: mappedEvidence.length,
      evidence: mappedEvidence,
    });
  }

  const completed = withProof + withoutProof;
  const weeks = Array.from(weekGroups.entries())
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([weekStart, tasks]) => ({ weekStart, tasks }));

  return {
    timezone,
    generatedAt: now.toISOString(),
    days,
    from: fromDate,
    to: toDate,
    displayName: userRecord?.name || userRecord?.email || 'Workspace owner',
    summary: {
      completed,
      withProof,
      withoutProof,
      proofRate: completed > 0 ? withProof / completed : null,
    },
    weeks,
  };
}

module.exports = {
  computeStreaks,
  weekStartForDate,
  localDateForTimestamp,
  utcAddDays,
  buildWeeklyRange,
  buildDayRange,
  previousWeek,
  isConsecutiveWeek,
  fetchMetricsSummary,
  fetchMetricsHeatmap,
  fetchProofReport,
};
