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
  // Convert UTC timestamp to local by formatting in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const localDateStr = formatter.format(utcDate); // "YYYY-MM-DD"

  // Parse it as a local date to find the day of week
  const [y, m, d] = localDateStr.split('-').map(Number);
  // JS getDay(): 0=Sun, 1=Mon, ...
  // We need ISO day: Mon=0 offset
  const jsDate = new Date(y, m - 1, d);
  const dow = jsDate.getDay(); // 0=Sun
  const isoDayOffset = dow === 0 ? 6 : dow - 1; // Mon=0, Tue=1, ..., Sun=6

  // Subtract offset to get Monday
  const monday = new Date(y, m - 1, d - isoDayOffset);
  const my = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const md = String(monday.getDate()).padStart(2, '0');
  return `${my}-${mm}-${md}`;
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
 * Returns the Monday 7 days before the given Monday string.
 * @param {string} weekStr - "YYYY-MM-DD"
 * @returns {string} "YYYY-MM-DD"
 */
function previousWeek(weekStr) {
  const [y, m, d] = weekStr.split('-').map(Number);
  const date = new Date(y, m - 1, d - 7);
  const py = date.getFullYear();
  const pm = String(date.getMonth() + 1).padStart(2, '0');
  const pd = String(date.getDate()).padStart(2, '0');
  return `${py}-${pm}-${pd}`;
}

/**
 * Returns true if weekB is exactly 7 days after weekA.
 * Both are "YYYY-MM-DD" strings representing Mondays.
 */
function isConsecutiveWeek(weekA, weekB) {
  const [ay, am, ad] = weekA.split('-').map(Number);
  const [by, bm, bd] = weekB.split('-').map(Number);
  const a = new Date(ay, am - 1, ad);
  const b = new Date(by, bm - 1, bd);
  const diffDays = (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays === 7;
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
 * Query the database and compute the full metrics summary.
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

  // Query completed tasks with evidence counts using bound parameters
  // We need: all completed tasks for this user, to compute totals and streaks
  const completedTaskRows = await db.$queryRaw(
    Prisma.sql`
      SELECT
        t."completedAt",
        COALESCE(e.cnt, 0)::int AS "evidenceCount"
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

  // Count overdue open tasks
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

  // Compute totals
  let completed = 0;
  let withProof = 0;

  // Collect proof weeks (all time) for streak computation
  const proofWeeks = new Set();

  // Collect 8-week data for the weekly array
  const weeklyWithProof = {};
  const weeklyWithoutProof = {};
  for (const w of weekRange) {
    weeklyWithProof[w] = 0;
    weeklyWithoutProof[w] = 0;
  }

  for (const row of completedTaskRows) {
    completed++;
    const hasEvidence = row.evidenceCount > 0;
    if (hasEvidence) withProof++;

    if (row.completedAt) {
      const ws = weekStartForDate(new Date(row.completedAt), timezone);

      // Streak: track all weeks with proof
      if (hasEvidence) {
        proofWeeks.add(ws);
      }

      // Weekly chart: only last 8 weeks
      if (ws in weeklyWithProof) {
        if (hasEvidence) {
          weeklyWithProof[ws]++;
        } else {
          weeklyWithoutProof[ws]++;
        }
      }
    }
  }

  const withoutProof = completed - withProof;
  const proofRate = completed > 0 ? withProof / completed : null;

  const streak = computeStreaks(proofWeeks, currentWeekStart);

  const weekly = weekRange.map((ws) => ({
    weekStart: ws,
    withProof: weeklyWithProof[ws] || 0,
    withoutProof: weeklyWithoutProof[ws] || 0,
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
