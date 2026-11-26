process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  prisma,
  USER_A,
  USER_B,
  buildTestApp,
  cleanDatabase,
} = require('./helpers');
const {
  fetchMetricsHeatmap,
  fetchProofReport,
} = require('../src/services/metrics');

const app = buildTestApp();

async function createTaskWithOptionalEvidence({
  userId,
  title,
  status = 'DONE',
  completedAt = null,
  projectId = null,
  evidence = [],
}) {
  const task = await prisma.task.create({
    data: {
      userId,
      projectId,
      title,
      status,
      priority: 'MEDIUM',
      progress: status === 'DONE' ? 100 : 0,
      completedAt: completedAt ? new Date(completedAt) : null,
    },
  });

  for (const item of evidence) {
    await prisma.evidence.create({
      data: {
        userId,
        taskId: task.id,
        kind: item.kind,
        label: item.label,
        url: item.kind === 'URL' ? item.url : null,
        body: item.kind === 'NOTE' ? item.body : null,
      },
    });
  }

  return task;
}

test('H-01: GET /api/metrics/heatmap validates weeks and returns exact weeks * 7 zero-filled days', async () => {
  await cleanDatabase();
  await request(app).get('/api/user').set('Authorization', 'Bearer user-a');

  // Default weeks=26 -> 182 days
  const res26 = await request(app)
    .get('/api/metrics/heatmap')
    .set('Authorization', 'Bearer user-a');
  assert.equal(res26.status, 200);
  assert.equal(res26.body.timezone, 'Asia/Jakarta');
  assert.equal(res26.body.days.length, 26 * 7);
  assert.equal(res26.body.days[0].date, res26.body.from);
  assert.equal(res26.body.days[res26.body.days.length - 1].date, res26.body.to);

  // weeks=4 -> 28 days; weeks=52 -> 364 days
  const res4 = await request(app)
    .get('/api/metrics/heatmap?weeks=4')
    .set('Authorization', 'Bearer user-a');
  assert.equal(res4.status, 200);
  assert.equal(res4.body.days.length, 28);

  const res52 = await request(app)
    .get('/api/metrics/heatmap?weeks=52')
    .set('Authorization', 'Bearer user-a');
  assert.equal(res52.status, 200);
  assert.equal(res52.body.days.length, 364);

  // Invalid weeks -> 400
  for (const qs of [
    'weeks=3',
    'weeks=53',
    'weeks=abc',
    'weeks=',
    'weeks[a]=1',
  ]) {
    const bad = await request(app)
      .get(`/api/metrics/heatmap?${qs}`)
      .set('Authorization', 'Bearer user-a');
    assert.equal(bad.status, 400, `Expected 400 for ${qs}`);
    assert.equal(bad.body.error.code, 'VALIDATION_ERROR');
  }
});

test('H-01: SQL heatmap aggregates by APP_TIMEZONE day boundary (16:59:59Z vs 17:30:00Z) and isolates users', async () => {
  await cleanDatabase();
  await request(app).get('/api/user').set('Authorization', 'Bearer user-a');
  await request(app).get('/api/user').set('Authorization', 'Bearer user-b');

  // Boundary pair around 2026-11-15 midnight UTC+7:
  // 2026-11-15T16:59:59Z = 2026-11-15 23:59:59 WIB (Sunday)
  // 2026-11-15T17:30:00Z = 2026-11-16 00:30:00 WIB (Monday)
  await createTaskWithOptionalEvidence({
    userId: USER_A,
    title: 'Before WIB midnight',
    completedAt: '2026-11-15T16:59:59Z',
    evidence: [
      {
        kind: 'URL',
        label: 'PR #1',
        url: 'https://github.com/org/repo/pull/1',
      },
    ],
  });
  await createTaskWithOptionalEvidence({
    userId: USER_A,
    title: 'After WIB midnight',
    completedAt: '2026-11-15T17:30:00Z',
    evidence: [],
  });
  // Non-done task should never be counted
  await createTaskWithOptionalEvidence({
    userId: USER_A,
    title: 'Still open',
    status: 'TODO',
    completedAt: null,
  });

  // Deterministic reference window anchored around 2026-11-20 for timeless day assertion
  const jakartaMap = await fetchMetricsHeatmap(
    prisma,
    USER_A,
    'Asia/Jakarta',
    4,
    new Date('2026-11-20T12:00:00Z'),
  );
  assert.equal(jakartaMap.days.length, 28);
  const nov15Jkt = jakartaMap.days.find((d) => d.date === '2026-11-15');
  const nov16Jkt = jakartaMap.days.find((d) => d.date === '2026-11-16');
  assert.deepEqual(nov15Jkt, {
    date: '2026-11-15',
    withProof: 1,
    withoutProof: 0,
  });
  assert.deepEqual(nov16Jkt, {
    date: '2026-11-16',
    withProof: 0,
    withoutProof: 1,
  });

  // Same rows interpreted in UTC place both timestamps on 2026-11-15
  const utcMap = await fetchMetricsHeatmap(
    prisma,
    USER_A,
    'UTC',
    4,
    new Date('2026-11-20T12:00:00Z'),
  );
  const nov15Utc = utcMap.days.find((d) => d.date === '2026-11-15');
  const nov16Utc = utcMap.days.find((d) => d.date === '2026-11-16');
  assert.deepEqual(nov15Utc, {
    date: '2026-11-15',
    withProof: 1,
    withoutProof: 1,
  });
  assert.deepEqual(nov16Utc, {
    date: '2026-11-16',
    withProof: 0,
    withoutProof: 0,
  });

  // HTTP endpoint reflects today's window and isolates User B
  const httpResA = await request(app)
    .get('/api/metrics/heatmap?weeks=26')
    .set('Authorization', 'Bearer user-a');
  assert.equal(httpResA.status, 200);
  if (httpResA.body.days.some((d) => d.date === '2026-11-15')) {
    assert.deepEqual(
      httpResA.body.days.find((d) => d.date === '2026-11-15'),
      { date: '2026-11-15', withProof: 1, withoutProof: 0 },
    );
    assert.deepEqual(
      httpResA.body.days.find((d) => d.date === '2026-11-16'),
      { date: '2026-11-16', withProof: 0, withoutProof: 1 },
    );
  }

  const httpResB = await request(app)
    .get('/api/metrics/heatmap?weeks=26')
    .set('Authorization', 'Bearer user-b');
  assert.equal(httpResB.status, 200);
  assert.equal(
    httpResB.body.days.every((d) => d.withProof === 0 && d.withoutProof === 0),
    true,
    'User B heatmap must contain zero counts for User A tasks',
  );
});

test('RP-01: GET /api/report filters by days=30|90|365, returns newest-first weekly groups with full evidence, and isolates users', async () => {
  await cleanDatabase();
  await request(app).get('/api/user').set('Authorization', 'Bearer user-a');
  await request(app).get('/api/user').set('Authorization', 'Bearer user-b');

  // Invalid days values -> 400
  for (const qs of ['days=7', 'days=180', 'days=abc', 'days=', 'days[0]=30']) {
    const bad = await request(app)
      .get(`/api/report?${qs}`)
      .set('Authorization', 'Bearer user-a');
    assert.equal(bad.status, 400, `Expected 400 for ${qs}`);
    assert.equal(bad.body.error.code, 'VALIDATION_ERROR');
  }

  const now = new Date();
  const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const proj = await prisma.project.create({
    data: { ownerId: USER_A, name: 'Core Platform', status: 'ACTIVE' },
  });

  // 2 days ago (in 30, 90, 365) with both link and note body
  await createTaskWithOptionalEvidence({
    userId: USER_A,
    projectId: proj.id,
    title: 'Recent Proved Task',
    completedAt: daysAgo(2).toISOString(),
    evidence: [
      {
        kind: 'URL',
        label: 'PR #12',
        url: 'https://github.com/org/repo/pull/12',
      },
      { kind: 'NOTE', label: 'Test log', body: 'All 56 unit checks passed.' },
    ],
  });

  // 10 days ago (in 30, 90, 365) without proof
  await createTaskWithOptionalEvidence({
    userId: USER_A,
    title: 'Recent Unproved Task',
    completedAt: daysAgo(10).toISOString(),
    evidence: [],
  });

  // 45 days ago (excluded from 30, included in 90 and 365)
  await createTaskWithOptionalEvidence({
    userId: USER_A,
    title: 'Midterm Task',
    completedAt: daysAgo(45).toISOString(),
    evidence: [
      { kind: 'NOTE', label: 'Bench note', body: 'Midterm proof body.' },
    ],
  });

  // 150 days ago (excluded from 30 and 90, included in 365)
  await createTaskWithOptionalEvidence({
    userId: USER_A,
    title: 'Older Annual Task',
    completedAt: daysAgo(150).toISOString(),
    evidence: [],
  });

  // Non-done task should never appear in report
  await createTaskWithOptionalEvidence({
    userId: USER_A,
    title: 'In Progress Ignored',
    status: 'IN_PROGRESS',
    completedAt: null,
  });

  // 30-day HTTP report
  const r30 = await request(app)
    .get('/api/report?days=30')
    .set('Authorization', 'Bearer user-a');
  assert.equal(r30.status, 200);
  assert.equal(r30.body.days, 30);
  assert.equal(r30.body.summary.completed, 2);
  assert.equal(r30.body.summary.withProof, 1);
  assert.equal(r30.body.summary.withoutProof, 1);
  assert.equal(r30.body.summary.proofRate, 0.5);

  const r30Titles = r30.body.weeks.flatMap((w) => w.tasks.map((t) => t.title));
  assert.deepEqual(r30Titles, ['Recent Proved Task', 'Recent Unproved Task']);

  const provedTask = r30.body.weeks
    .flatMap((w) => w.tasks)
    .find((t) => t.title === 'Recent Proved Task');
  assert.equal(provedTask.projectName, 'Core Platform');
  assert.equal(provedTask.proofCount, 2);
  const noteEv = provedTask.evidence.find((e) => e.kind === 'note');
  assert.equal(noteEv.body, 'All 56 unit checks passed.');

  // 90-day HTTP report
  const r90 = await request(app)
    .get('/api/report?days=90')
    .set('Authorization', 'Bearer user-a');
  assert.equal(r90.status, 200);
  assert.equal(r90.body.summary.completed, 3);
  const r90Titles = r90.body.weeks.flatMap((w) => w.tasks.map((t) => t.title));
  assert.equal(r90Titles[0], 'Recent Proved Task');
  assert.equal(r90Titles.includes('Midterm Task'), true);
  assert.equal(r90Titles.includes('Older Annual Task'), false);

  // 365-day HTTP report
  const r365 = await request(app)
    .get('/api/report?days=365')
    .set('Authorization', 'Bearer user-a');
  assert.equal(r365.status, 200);
  assert.equal(r365.body.summary.completed, 4);

  // User B receives empty report
  const rUserB = await request(app)
    .get('/api/report?days=365')
    .set('Authorization', 'Bearer user-b');
  assert.equal(rUserB.status, 200);
  assert.equal(rUserB.body.summary.completed, 0);
  assert.deepEqual(rUserB.body.weeks, []);

  // Deterministic report day boundary check in Asia/Jakarta
  await createTaskWithOptionalEvidence({
    userId: USER_B,
    title: 'Inside Boundary',
    completedAt: '2026-11-15T16:59:59Z', // 2026-11-15 WIB
  });
  await createTaskWithOptionalEvidence({
    userId: USER_B,
    title: 'Outside Boundary',
    completedAt: '2026-11-14T16:59:59Z', // 2026-11-14 WIB
  });
  const boundaryReport = await fetchProofReport(
    prisma,
    USER_B,
    'Asia/Jakarta',
    30,
    new Date('2026-12-14T12:00:00Z'), // from = 2026-11-15
  );
  const boundaryTitles = boundaryReport.weeks.flatMap((w) =>
    w.tasks.map((t) => t.title),
  );
  assert.deepEqual(boundaryTitles, ['Inside Boundary']);
});

test.after(async () => {
  await prisma.$disconnect();
});
