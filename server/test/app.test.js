process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createAuthMiddleware } = require('../src/middleware/auth');

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const TASK = '33333333-3333-4333-8333-333333333333';

function auth(userId = USER) {
  return createAuthMiddleware({
    verifyToken: async (token) => {
      if (token !== 'valid') throw new Error('invalid');
      return { sub: userId, role: 'authenticated' };
    },
    provisionUser: async (payload) => ({ id: payload.sub }),
  });
}

function fakeDb() {
  const tasks = [];
  const activities = [];
  const db = {
    user: { findUnique: async () => ({ id: USER, profile: null }) },
    project: {
      findMany: async () => [],
      count: async () => 0,
      findFirst: async () => null,
      create: async () => null,
      update: async () => null,
    },
    task: {
      findMany: async ({ where }) =>
        tasks.filter((t) => t.userId === where.userId),
      count: async ({ where }) =>
        tasks.filter((t) => t.userId === where.userId).length,
      findFirst: async ({ where }) =>
        tasks.find((t) => t.id === where.id && t.userId === where.userId) ||
        null,
      create: async ({ data }) => {
        const task = {
          id: TASK,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        tasks.push(task);
        return task;
      },
      update: async ({ data }) => Object.assign(tasks[0], data),
      delete: async () => {
        tasks.splice(0, 1);
      },
    },
    activityEvent: {
      count: async () => 0,
      create: async ({ data }) => activities.push(data),
    },
    $transaction: async (callback) => callback(db),
  };
  return { db, tasks, activities };
}

test('ping returns a request id', async () => {
  const response = await request(createApp()).get('/api/ping');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.match(response.headers['x-request-id'], /^[0-9a-f-]{36}$/);
});

test('authentication errors are structured and invalid tokens never call Supabase', async () => {
  const app = createApp({ authMiddleware: auth() });
  const missing = await request(app).get('/api/tasks');
  assert.deepEqual(missing.body.error, {
    code: 'AUTH_REQUIRED',
    message: 'Authentication required',
  });
  const invalid = await request(app)
    .get('/api/tasks')
    .set('Authorization', 'Bearer nope');
  assert.deepEqual(invalid.body.error, {
    code: 'AUTH_INVALID',
    message: 'Invalid access token',
  });
});

test('task DTOs reject unknown fields and mutations create activity events transactionally', async () => {
  const { db, activities } = fakeDb();
  const app = createApp({ db, authMiddleware: auth() });
  const invalid = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer valid')
    .send({ title: 'x', unexpected: true });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
  const created = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer valid')
    .send({ title: 'Ship it', status: 'todo' });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'todo');
  assert.equal(activities[0].type, 'task.created');
});

test('task detail is ownership-isolated', async () => {
  const { db } = fakeDb();
  const app = createApp({ db, authMiddleware: auth() });
  await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer valid')
    .send({ title: 'Private task' });
  const found = await request(app)
    .get(`/api/tasks/${TASK}`)
    .set('Authorization', 'Bearer valid');
  assert.equal(found.status, 200);
  const otherApp = createApp({ db, authMiddleware: auth(OTHER) });
  const hidden = await request(otherApp)
    .get(`/api/tasks/${TASK}`)
    .set('Authorization', 'Bearer valid');
  assert.equal(hidden.status, 404);
  assert.equal(hidden.body.error.code, 'TASK_NOT_FOUND');
});
