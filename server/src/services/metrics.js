const { Prisma } = require('@prisma/client');

/**
 * Returns the Monday 00:00:00 (local time, as a Date in UTC) for a given
 * UTC timestamp, interpreted in the given timezone.
 *
 * @param {Date} utcDate - a Date whose .getTime() is in UTC
 * @param {string} timezone - IANA timezone string
 * @returns {string} ISO date string "YYYY-MM-DD" of the Monday of that week
 */
function weekStartForDate(utcDate, timezone) {
  // Convert UTC timestamp to local date string in target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const localDateStr = formatter.format(utcDate); // "YYYY-MM-DD"

  // Parse as UTC date to prevent local Node runtime DST from skewing day math
  const [y, m, d] = localDateStr.split('-').map(Number);
  const jsDate = new Date(Date.UTC(y, m - 1, d));
  const dow = jsDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const isoDayOffset = dow === 0 ? 6 : dow - 1; // Mon=0, Tue=1, ..., Sun=6

  const mondayUtc = Date.UTC(y, m - 1, d) - isoDayOffset * 24 * 60 * 60 * 1000;
  return new Date(mondayUtc).toISOString().slice(0, 10);
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

  // Sort all proof weeks chronologically
  const sorted = [...proofWeeks].sort();

  // Compute longest streak
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

  // Compute current streak: walk backwards from currentWeekStart or the week before
  let checkWeek = currentWeekStart;
  // If the current week is not in the set, start from the previous week
  // (the current week is still "in progress" and doesn't break the streak)
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
  const [y, m, d] = weekStr.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d) - 7 * 24 * 60 * 60 * 1000;
  return new Date(utc).toISOString().slice(0, 10);
}

/**
 * Returns true if weekB is exactly 7 calendar days after weekA.
 * Both are "YYYY-MM-DD" strings representing Mondays.
 * Computed in UTC to guarantee immunity to local DST transitions.
 */
function isConsecutiveWeek(weekA, weekB) {
  const [ay, am, ad] = weekA.split('-').map(Number);
  const [by, bm, bd] = weekB.split('-').map(Number);
  const diffMs = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return diffMs === 7 * 24 * 60 * 60 * 1000;
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
 * Query the database and compute the full metrics summary using SQL aggregation.
 *
 * @param {import('@prisma/client').PrismaClient} db
 * @param {string} userId
 * @param {string} timezone - IANA timezone
 * @returns {Promise<object>}
 */
async function fetchMetricsSummary(db, userId, timezone) {
  const now = new Date();
  const currentWeekStart = weekStartForDate(now, timezone);
  const weekRange = buildWeeklyRange(currentWeekStart);

  // 1. Overall completed task count and proof count (aggregated directly in SQL)
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

  // 2. Overdue open tasks (aggregated directly in SQL)
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

  // 3. Weekly aggregation directly in SQL across completed tasks
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

module.exports = {
  computeStreaks,
  weekStartForDate,
  buildWeeklyRange,
  previousWeek,
  isConsecutiveWeek,
  fetchMetricsSummary,
};
