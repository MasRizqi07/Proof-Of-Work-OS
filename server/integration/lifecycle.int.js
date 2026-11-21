process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { prisma, USER_A, buildTestApp, cleanDatabase } = require('./helpers');

test.beforeEach(async () => {
  await cleanDatabase();
});

test.after(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

test('completedAt remains identical on repeated done PATCH', async () => {
  const app = buildTestApp();

  const createRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Task to finish', status: 'in-progress', progress: 50 });
  assert.equal(createRes.status, 201);
  const taskId = createRes.body.id;

  // First transition to done
  const done1 = await request(app)
    .patch(`/api/tasks/${taskId}`)
    .set('Authorization', 'Bearer user-a')
    .send({ status: 'done' });
  assert.equal(done1.status, 200);
  assert.equal(done1.body.status, 'done');
  assert.equal(done1.body.progress, 100);
  assert.ok(done1.body.completedAt);
  const completedAt1 = done1.body.completedAt;

  // Short pause to ensure clock advances if a new Date() were created
  await new Promise((r) => setTimeout(r, 50));

  // Second PATCH with status: done
  const done2 = await request(app)
    .patch(`/api/tasks/${taskId}`)
    .set('Authorization', 'Bearer user-a')
    .send({ status: 'done', title: 'Task to finish updated' });
  assert.equal(done2.status, 200);
  assert.equal(done2.body.completedAt, completedAt1);

  // Check in database directly
  const row = await prisma.task.findUnique({ where: { id: taskId } });
  assert.equal(row.completedAt.toISOString(), completedAt1);
});

test('reopening task clears completedAt and records task.reopened event', async () => {
  const app = buildTestApp();

  const createRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Done task', status: 'done' });
  assert.equal(createRes.status, 201);
  assert.ok(createRes.body.completedAt);
  const taskId = createRes.body.id;

  // Reopen task
  const reopenRes = await request(app)
    .patch(`/api/tasks/${taskId}`)
    .set('Authorization', 'Bearer user-a')
    .send({ status: 'in-progress' });
  assert.equal(reopenRes.status, 200);
  assert.equal(reopenRes.body.status, 'in-progress');
  assert.equal(reopenRes.body.completedAt, null);

  // Direct database check
  const row = await prisma.task.findUnique({ where: { id: taskId } });
  assert.equal(row.completedAt, null);

  // Check activity event
  const events = await prisma.activityEvent.findMany({
    where: { taskId },
    orderBy: { occurredAt: 'desc' },
  });
  assert.equal(events[0].type, 'task.reopened');
});

test('CHECK constraint: Task_progress_range_check rejects progress = 150', async () => {
  await prisma.user.upsert({
    where: { id: USER_A },
    update: {},
    create: { id: USER_A, externalAuthId: USER_A, email: 'user-a@example.com' },
  });

  let errorCaught = null;
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Task" ("id", "userId", "title", "status", "priority", "progress", "createdAt", "updatedAt")
      VALUES ('33333333-3333-4333-8333-333333333333'::uuid, '${USER_A}'::uuid, 'Illegal progress', 'todo', 'medium', 150, NOW(), NOW());
    `);
  } catch (err) {
    errorCaught = err;
    console.log('PostgreSQL error text for progress = 150:\n' + err.message);
  }

  assert.ok(errorCaught, 'Expected progress constraint violation');
  assert.match(errorCaught.message, /Task_progress_range_check/);
});

test('CHECK constraint: Task_completedAt_matches_status_check rejects done without completedAt', async () => {
  await prisma.user.upsert({
    where: { id: USER_A },
    update: {},
    create: { id: USER_A, externalAuthId: USER_A, email: 'user-a@example.com' },
  });

  let errorCaught = null;
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Task" ("id", "userId", "title", "status", "priority", "progress", "completedAt", "createdAt", "updatedAt")
      VALUES ('44444444-4444-4444-8444-444444444444'::uuid, '${USER_A}'::uuid, 'Illegal done', 'done', 'medium', 100, NULL, NOW(), NOW());
    `);
  } catch (err) {
    errorCaught = err;
    console.log(
      'PostgreSQL error text for done without completedAt:\n' + err.message,
    );
  }

  assert.ok(
    errorCaught,
    'Expected completedAt matches status constraint violation',
  );
  assert.match(errorCaught.message, /Task_completedAt_matches_status_check/);
});

test('CHECK constraint: Task_completedAt_matches_status_check rejects completedAt when status is todo', async () => {
  await prisma.user.upsert({
    where: { id: USER_A },
    update: {},
    create: { id: USER_A, externalAuthId: USER_A, email: 'user-a@example.com' },
  });

  let errorCaught = null;
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Task" ("id", "userId", "title", "status", "priority", "progress", "completedAt", "createdAt", "updatedAt")
      VALUES ('55555555-5555-4555-8555-555555555555'::uuid, '${USER_A}'::uuid, 'Illegal todo', 'todo', 'medium', 0, NOW(), NOW(), NOW());
    `);
  } catch (err) {
    errorCaught = err;
    console.log(
      'PostgreSQL error text for todo with completedAt:\n' + err.message,
    );
  }

  assert.ok(
    errorCaught,
    'Expected completedAt matches status constraint violation',
  );
  assert.match(errorCaught.message, /Task_completedAt_matches_status_check/);
});

test('P-01: project taskCounts { total, done } is returned and updated, archiving project retains tasks', async () => {
  const app = buildTestApp();

  // Create project
  const projRes = await request(app)
    .post('/api/projects')
    .set('Authorization', 'Bearer user-a')
    .send({ name: 'Alpha Project' });
  assert.equal(projRes.status, 201);
  const projectId = projRes.body.id;
  assert.deepEqual(projRes.body.taskCounts, { total: 0, done: 0 });

  // Create 3 tasks under project (2 done, 1 in-progress)
  const t1 = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Task 1', projectId, status: 'done' });
  assert.equal(t1.status, 201);

  const t2 = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Task 2', projectId, status: 'done' });
  assert.equal(t2.status, 201);

  const t3 = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Task 3', projectId, status: 'in-progress' });
  assert.equal(t3.status, 201);

  // Create 1 unassigned task
  await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Unassigned Task', status: 'done' });

  // GET /api/projects
  const listRes = await request(app)
    .get('/api/projects')
    .set('Authorization', 'Bearer user-a');
  assert.equal(listRes.status, 200);
  const projectItem = listRes.body.items.find((p) => p.id === projectId);
  assert.ok(projectItem);
  assert.deepEqual(projectItem.taskCounts, { total: 3, done: 2 });

  // GET /api/projects/:projectId
  const detailRes = await request(app)
    .get(`/api/projects/${projectId}`)
    .set('Authorization', 'Bearer user-a');
  assert.equal(detailRes.status, 200);
  assert.deepEqual(detailRes.body.taskCounts, { total: 3, done: 2 });

  // Delete one done task
  await request(app)
    .delete(`/api/tasks/${t1.body.id}`)
    .set('Authorization', 'Bearer user-a');

  // Verify updated counts
  const updatedListRes = await request(app)
    .get('/api/projects')
    .set('Authorization', 'Bearer user-a');
  const updatedItem = updatedListRes.body.items.find((p) => p.id === projectId);
  assert.deepEqual(updatedItem.taskCounts, { total: 2, done: 1 });

  // Archive project
  const delProjRes = await request(app)
    .delete(`/api/projects/${projectId}`)
    .set('Authorization', 'Bearer user-a');
  assert.equal(delProjRes.status, 204);

  // Project is omitted from GET /api/projects
  const afterArchiveRes = await request(app)
    .get('/api/projects')
    .set('Authorization', 'Bearer user-a');
  assert.equal(
    afterArchiveRes.body.items.find((p) => p.id === projectId),
    undefined,
  );

  // But tasks still exist
  const task2Db = await prisma.task.findUnique({ where: { id: t2.body.id } });
  assert.ok(task2Db, 'Task must not be deleted when project is archived');
});
