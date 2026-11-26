process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeStreaks,
  weekStartForDate,
  localDateForTimestamp,
  utcAddDays,
  buildWeeklyRange,
  buildDayRange,
  previousWeek,
  isConsecutiveWeek,
} = require('../src/services/metrics');
const {
  heatmapWeeksQuery,
  reportDaysQuery,
  parse,
} = require('../src/validation');

// ───────────────────────────────────────────────────────────────
// weekStartForDate
// ───────────────────────────────────────────────────────────────

test('weekStartForDate: UTC timestamp maps to correct Monday in Asia/Jakarta', () => {
  // 2026-11-15T16:59:59Z = 2026-11-15T23:59:59 WIB (Sunday) → week of 2026-11-09
  const sundayLateUtc = new Date('2026-11-15T16:59:59Z');
  assert.equal(
    weekStartForDate(sundayLateUtc, 'Asia/Jakarta'),
    '2026-11-09',
    '16:59:59Z should still be Sunday in WIB, so week starts 2026-11-09',
  );

  // 2026-11-15T17:30:00Z = 2026-11-16T00:30:00 WIB (Monday) → week of 2026-11-16
  const mondayEarlyUtc = new Date('2026-11-15T17:30:00Z');
  assert.equal(
    weekStartForDate(mondayEarlyUtc, 'Asia/Jakarta'),
    '2026-11-16',
    '17:30:00Z should be Monday in WIB, so week starts 2026-11-16',
  );
});

test('weekStartForDate: a Wednesday maps to Monday of the same week', () => {
  // 2026-11-18 is a Wednesday in any timezone
  const wed = new Date('2026-11-18T10:00:00Z');
  assert.equal(weekStartForDate(wed, 'UTC'), '2026-11-16');
});

test('weekStartForDate: a Monday maps to itself', () => {
  const mon = new Date('2026-11-16T05:00:00Z');
  assert.equal(weekStartForDate(mon, 'UTC'), '2026-11-16');
});

test('weekStartForDate: a Sunday maps to the Monday before it', () => {
  // 2026-11-15 is a Sunday
  const sun = new Date('2026-11-15T12:00:00Z');
  assert.equal(weekStartForDate(sun, 'UTC'), '2026-11-09');
});

// ───────────────────────────────────────────────────────────────
// previousWeek
// ───────────────────────────────────────────────────────────────

test('previousWeek returns the Monday 7 days earlier', () => {
  assert.equal(previousWeek('2026-11-16'), '2026-11-09');
  assert.equal(previousWeek('2026-11-09'), '2026-11-02');
  assert.equal(previousWeek('2026-01-05'), '2025-12-29');
});

// ───────────────────────────────────────────────────────────────
// isConsecutiveWeek
// ───────────────────────────────────────────────────────────────

test('isConsecutiveWeek: 7 days apart returns true', () => {
  assert.equal(isConsecutiveWeek('2026-11-09', '2026-11-16'), true);
});

test('isConsecutiveWeek: 14 days apart returns false', () => {
  assert.equal(isConsecutiveWeek('2026-11-02', '2026-11-16'), false);
});

// ───────────────────────────────────────────────────────────────
// buildWeeklyRange
// ───────────────────────────────────────────────────────────────

test('buildWeeklyRange returns 8 weeks ending with the current week', () => {
  const range = buildWeeklyRange('2026-11-16');
  assert.equal(range.length, 8);
  assert.equal(range[7], '2026-11-16'); // last = current
  assert.equal(range[0], '2026-09-28'); // 7 weeks before
});

// ───────────────────────────────────────────────────────────────
// computeStreaks — PRD section 6.4 test vectors
// Today = Monday 2026-11-16, so currentWeekStart = "2026-11-16"
// ───────────────────────────────────────────────────────────────

const CURRENT_WEEK = '2026-11-16';

test('PRD vector 1: empty set → current 0, longest 0', () => {
  const result = computeStreaks(new Set(), CURRENT_WEEK);
  assert.deepEqual(result, { currentWeeks: 0, longestWeeks: 0 });
});

test('PRD vector 2: weeks 11-09, 11-16 → current 2, longest 2', () => {
  const result = computeStreaks(
    new Set(['2026-11-09', '2026-11-16']),
    CURRENT_WEEK,
  );
  assert.deepEqual(result, { currentWeeks: 2, longestWeeks: 2 });
});

test('PRD vector 3: weeks 11-02, 11-09 → current 2, longest 2', () => {
  // Current week (11-16) has no proof, but that does not break the streak
  // because the current week is still in progress.
  const result = computeStreaks(
    new Set(['2026-11-02', '2026-11-09']),
    CURRENT_WEEK,
  );
  assert.deepEqual(result, { currentWeeks: 2, longestWeeks: 2 });
});

test('PRD vector 4: weeks 10-26, 11-09 → current 1, longest 1', () => {
  // Gap between 10-26 and 11-09 (missing 11-02) breaks the streak
  const result = computeStreaks(
    new Set(['2026-10-26', '2026-11-09']),
    CURRENT_WEEK,
  );
  assert.deepEqual(result, { currentWeeks: 1, longestWeeks: 1 });
});

test('PRD vector 5: weeks 10-19, 10-26, 11-02 → current 0, longest 3', () => {
  // All three are consecutive (10-19, 10-26, 11-02) but the last proved week
  // is 11-02, which is NOT consecutive with the week before current (11-09),
  // so current streak is 0.
  const result = computeStreaks(
    new Set(['2026-10-19', '2026-10-26', '2026-11-02']),
    CURRENT_WEEK,
  );
  assert.deepEqual(result, { currentWeeks: 0, longestWeeks: 3 });
});

// ───────────────────────────────────────────────────────────────
// R-04: DST Resilience across timezones
// ───────────────────────────────────────────────────────────────

test('R-04: DST resilience across US DST start (America/New_York)', () => {
  const origTz = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    // 2026-03-02, 2026-03-09, 2026-03-16 crosses US DST start (Sunday, March 8, 2026)
    const result = computeStreaks(
      new Set(['2026-03-02', '2026-03-09', '2026-03-16']),
      '2026-03-16',
    );
    assert.equal(result.longestWeeks, 3);
    assert.equal(result.currentWeeks, 3);
  } finally {
    process.env.TZ = origTz;
  }
});

test('R-04: DST resilience across US DST end (America/New_York)', () => {
  const origTz = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    // 2026-10-26, 2026-11-02 crosses US DST end (Sunday, Nov 1, 2026)
    const result = computeStreaks(
      new Set(['2026-10-26', '2026-11-02']),
      '2026-11-02',
    );
    assert.equal(result.longestWeeks, 2);
    assert.equal(result.currentWeeks, 2);
  } finally {
    process.env.TZ = origTz;
  }
});

test('R-04: DST resilience in southern hemisphere (Pacific/Auckland)', () => {
  const origTz = process.env.TZ;
  try {
    process.env.TZ = 'Pacific/Auckland';
    // NZ DST ends first Sunday in April (April 5, 2026)
    const result = computeStreaks(
      new Set(['2026-03-30', '2026-04-06', '2026-04-13']),
      '2026-04-13',
    );
    assert.equal(result.longestWeeks, 3);
    assert.equal(result.currentWeeks, 3);
  } finally {
    process.env.TZ = origTz;
  }
});

// ───────────────────────────────────────────────────────────────
// H-01 & RP-01 unit helpers and validation
// ───────────────────────────────────────────────────────────────

test('H-01: localDateForTimestamp distinguishes 16:59:59Z and 17:30:00Z in Asia/Jakarta', () => {
  assert.equal(
    localDateForTimestamp(new Date('2026-11-15T16:59:59Z'), 'Asia/Jakarta'),
    '2026-11-15',
  );
  assert.equal(
    localDateForTimestamp(new Date('2026-11-15T17:30:00Z'), 'Asia/Jakarta'),
    '2026-11-16',
  );
  assert.equal(
    localDateForTimestamp(new Date('2026-11-15T17:30:00Z'), 'UTC'),
    '2026-11-15',
  );
});

test('H-01: utcAddDays and buildDayRange produce exact weeks * 7 continuous ISO dates', () => {
  assert.equal(utcAddDays('2026-11-16', -1), '2026-11-15');
  assert.equal(utcAddDays('2026-03-01', -1), '2026-02-28');

  const days26 = buildDayRange('2026-06-01', 26 * 7);
  assert.equal(days26.length, 182);
  assert.equal(days26[0], '2026-06-01');
  assert.equal(days26[181], '2026-11-29');

  const days52 = buildDayRange('2025-12-01', 52 * 7);
  assert.equal(days52.length, 364);
});

test('H-01 & RP-01: query schema validation rejects invalid weeks and days', () => {
  assert.equal(parse(heatmapWeeksQuery, '4'), 4);
  assert.equal(parse(heatmapWeeksQuery, '26'), 26);
  assert.equal(parse(heatmapWeeksQuery, '52'), 52);

  for (const badWeek of ['3', '53', 'abc', '', { a: '1' }, '26.5']) {
    assert.throws(() => parse(heatmapWeeksQuery, badWeek), {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  assert.equal(parse(reportDaysQuery, '30'), 30);
  assert.equal(parse(reportDaysQuery, '90'), 90);
  assert.equal(parse(reportDaysQuery, '365'), 365);

  for (const badDay of ['7', '180', 'abc', '', { a: '30' }]) {
    assert.throws(() => parse(reportDaysQuery, badDay), {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }
});
