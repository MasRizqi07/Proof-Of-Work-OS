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
const { createAuthMiddleware } = require('../src/middleware/auth');

test.beforeEach(async () => {
  await cleanDatabase();
});

test.after(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

test('two-user isolation: tasks cannot be read, updated, or deleted by another user', async () => {
  const app = buildTestApp();

  // User A creates a task
  const createRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Task of A', status: 'todo' });
  assert.equal(createRes.status, 201);
  const taskId = createRes.body.id;

  // User A can read it
  const readA = await request(app)
    .get(`/api/tasks/${taskId}`)
    .set('Authorization', 'Bearer user-a');
  assert.equal(readA.status, 200);
  assert.equal(readA.body.id, taskId);

  // User B gets 404 on GET
  const readB = await request(app)
    .get(`/api/tasks/${taskId}`)
    .set('Authorization', 'Bearer user-b');
  assert.equal(readB.status, 404);
  assert.equal(readB.body.error.code, 'TASK_NOT_FOUND');

  // User B gets 404 on PATCH
  const patchB = await request(app)
    .patch(`/api/tasks/${taskId}`)
    .set('Authorization', 'Bearer user-b')
    .send({ title: 'Hacked by B' });
  assert.equal(patchB.status, 404);
  assert.equal(patchB.body.error.code, 'TASK_NOT_FOUND');

  // User B gets 404 on DELETE
  const deleteB = await request(app)
    .delete(`/api/tasks/${taskId}`)
    .set('Authorization', 'Bearer user-b');
  assert.equal(deleteB.status, 404);
  assert.equal(deleteB.body.error.code, 'TASK_NOT_FOUND');

  // Task still exists intact for User A
  const readA2 = await request(app)
    .get(`/api/tasks/${taskId}`)
    .set('Authorization', 'Bearer user-a');
  assert.equal(readA2.status, 200);
  assert.equal(readA2.body.title, 'Task of A');
});

test('two-user isolation: projects cannot be read, updated, or archived by another user', async () => {
  const app = buildTestApp();

  // User A creates a project
  const createRes = await request(app)
    .post('/api/projects')
    .set('Authorization', 'Bearer user-a')
    .send({ name: 'Project A' });
  assert.equal(createRes.status, 201);
  const projectId = createRes.body.id;

  // User B gets 404 on GET
  const readB = await request(app)
    .get(`/api/projects/${projectId}`)
    .set('Authorization', 'Bearer user-b');
  assert.equal(readB.status, 404);
  assert.equal(readB.body.error.code, 'PROJECT_NOT_FOUND');

  // User B gets 404 on PATCH
  const patchB = await request(app)
    .patch(`/api/projects/${projectId}`)
    .set('Authorization', 'Bearer user-b')
    .send({ name: 'Renamed by B' });
  assert.equal(patchB.status, 404);

  // User B gets 404 on DELETE
  const deleteB = await request(app)
    .delete(`/api/projects/${projectId}`)
    .set('Authorization', 'Bearer user-b');
  assert.equal(deleteB.status, 404);
});

test('two-user isolation: activities of User A are invisible to User B', async () => {
  const app = buildTestApp();

  // User A creates a task (generates task.created activity)
  await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'A task' });

  // User B creates a task
  await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-b')
    .send({ title: 'B task' });

  // User A activity list
  const actA = await request(app)
    .get('/api/activities')
    .set('Authorization', 'Bearer user-a');
  assert.equal(actA.status, 200);
  assert.equal(actA.body.items.length, 1);
  assert.equal(actA.body.items[0].userId, USER_A);

  // User B activity list
  const actB = await request(app)
    .get('/api/activities')
    .set('Authorization', 'Bearer user-b');
  assert.equal(actB.status, 200);
  assert.equal(actB.body.items.length, 1);
  assert.equal(actB.body.items[0].userId, USER_B);
});

test('pagination 400s on real PostgreSQL routes', async () => {
  const app = buildTestApp();

  for (const query of [
    'page=abc',
    'limit=0',
    'limit=101',
    'page=0',
    'page=1&page=2',
  ]) {
    const res = await request(app)
      .get(`/api/tasks?${query}`)
      .set('Authorization', 'Bearer user-a');
    assert.equal(res.status, 400, `Expected 400 for ${query}`);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  }

  // Valid pagination returns skip = 5
  const validRes = await request(app)
    .get('/api/tasks?page=2&limit=5')
    .set('Authorization', 'Bearer user-a');
  assert.equal(validRes.status, 200);
  assert.equal(validRes.body.page, 2);
  assert.equal(validRes.body.limit, 5);
});

test('ready endpoint on real PostgreSQL returns 200 and 503', async () => {
  const app = buildTestApp();
  const resOk = await request(app).get('/api/ready');
  assert.equal(resOk.status, 200);
  assert.equal(resOk.body.status, 'ready');
  assert.match(resOk.body.requestId, /^[0-9a-f-]{36}$/);

  // Fake database failure
  const brokenDb = Object.create(prisma);
  brokenDb.$queryRaw = async () => {
    throw new Error('connection lost');
  };
  const { createApp } = require('../src/app');
  const brokenApp = createApp({ db: brokenDb });
  const resDown = await request(brokenApp).get('/api/ready');
  assert.equal(resDown.status, 503);
  assert.equal(resDown.body.error.code, 'SERVICE_UNAVAILABLE');
  assert.equal(resDown.body.error.message, 'Database unavailable');
});

test('provisionUser failure returns 503 SERVICE_UNAVAILABLE', async () => {
  const failingAuth = createAuthMiddleware({
    verifyToken: async () => ({
      sub: USER_A,
      email: 'a@example.com',
      role: 'authenticated',
    }),
    provisionUser: async () => {
      throw new Error('DB connection drop during provisioning');
    },
  });
  const { createApp } = require('../src/app');
  const app = createApp({ db: prisma, authMiddleware: failingAuth });
  const res = await request(app)
    .get('/api/tasks')
    .set('Authorization', 'Bearer valid');
  assert.equal(res.status, 503);
  assert.equal(res.body.error.code, 'SERVICE_UNAVAILABLE');
  assert.equal(res.body.error.message, 'Service temporarily unavailable');
});

test('no write to User when nothing changed (spy count)', async () => {
  const app = buildTestApp();

  // First request provisions user
  const firstRes = await request(app)
    .get('/api/tasks')
    .set('Authorization', 'Bearer user-a');
  assert.equal(firstRes.status, 200);

  // Spy on prisma.user.update
  let updateCalls = 0;
  const originalUpdate = prisma.user.update;
  prisma.user.update = async (...args) => {
    updateCalls += 1;
    return originalUpdate.apply(prisma.user, args);
  };

  try {
    // Second request with same user and payload
    const secondRes = await request(app)
      .get('/api/tasks')
      .set('Authorization', 'Bearer user-a');
    assert.equal(secondRes.status, 200);

    // Third request
    const thirdRes = await request(app)
      .get('/api/tasks')
      .set('Authorization', 'Bearer user-a');
    assert.equal(thirdRes.status, 200);

    assert.equal(
      updateCalls,
      0,
      `Expected 0 updates to User when data did not change, got ${updateCalls}`,
    );
  } finally {
    prisma.user.update = originalUpdate;
  }
});
