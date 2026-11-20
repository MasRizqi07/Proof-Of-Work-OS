process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeStreaks,
  weekStartForDate,
  buildWeeklyRange,
  previousWeek,
  isConsecutiveWeek,
} = require('../src/services/metrics');

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
