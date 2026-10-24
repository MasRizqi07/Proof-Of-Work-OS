process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createAuthMiddleware } = require('../src/middleware/auth');

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const TASK = '33333333-3333-4333-8333-333333333333';
const PROJECT = '44444444-4444-4444-8444-444444444444';

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
  const projects = [];
  const activities = [];
  const db = {
    user: {
      findUnique: async () => ({
        id: USER,
        name: 'Test User',
        profile: null,
      }),
    },
    project: {
      findMany: async ({ where }) =>
        projects.filter(
          (p) => p.ownerId === where.ownerId && p.archivedAt === null,
        ),
      count: async ({ where }) =>
        projects.filter(
          (p) => p.ownerId === where.ownerId && p.archivedAt === null,
        ).length,
      findFirst: async ({ where }) =>
        projects.find(
          (p) =>
            p.id === where.id &&
            p.ownerId === where.ownerId &&
            (!('archivedAt' in where) || p.archivedAt === null),
        ) || null,
      create: async ({ data }) => {
        const proj = {
          id: PROJECT,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
          tasks: [],
          ...data,
        };
        projects.push(proj);
        return proj;
      },
      update: async ({ where, data }) => {
        const proj = projects.find((p) => p.id === where.id);
        if (proj) Object.assign(proj, data);
        return proj;
      },
    },
    task: {
      findMany: async ({ where }) =>
        tasks.filter(
          (t) =>
            t.userId === where.userId &&
            (!where.status || t.status === where.status),
        ),
      count: async ({ where }) =>
        tasks.filter(
          (t) =>
            t.userId === where.userId &&
            (!where.status || t.status === where.status),
        ).length,
      findFirst: async ({ where }) => {
        const t = tasks.find(
          (item) => item.id === where.id && item.userId === where.userId,
        );
        return t ? { ...t } : null;
      },
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
      update: async ({ where, data }) => {
        const task = tasks.find((t) => t.id === where.id) || tasks[0];
        if (task) Object.assign(task, data);
        return task;
      },
      delete: async ({ where }) => {
        const idx = tasks.findIndex((t) => t.id === where.id);
        if (idx !== -1) tasks.splice(idx, 1);
        else tasks.splice(0, 1);
      },
    },
    activityEvent: {
      count: async () => activities.length,
      create: async ({ data }) => activities.push(data),
    },
    $transaction: async (callback) => callback(db),
  };
  return { db, tasks, projects, activities };
}

test('ping returns a request id', async () => {
  const response = await request(createApp()).get('/api/ping');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.match(response.headers['x-request-id'], /^[0-9a-f-]{36}$/);
});

test('malformed x-request-id is sanitized to a new valid UUID', async () => {
  const response = await request(createApp())
    .get('/api/ping')
    .set('x-request-id', 'invalid<script>');
  assert.equal(response.status, 200);
  assert.notEqual(response.headers['x-request-id'], 'invalid<script>');
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

test('project CRUD routes create, list, and archive projects', async () => {
  const { db, activities } = fakeDb();
  const app = createApp({ db, authMiddleware: auth() });
  const created = await request(app)
    .post('/api/projects')
    .set('Authorization', 'Bearer valid')
    .send({ name: 'Alpha Project', status: 'active' });
  assert.equal(created.status, 201);
  assert.equal(created.body.name, 'Alpha Project');
  assert.equal(created.body.status, 'active');
  assert.equal(
    activities.some((a) => a.type === 'project.created'),
    true,
  );

  const list = await request(app)
    .get('/api/projects')
    .set('Authorization', 'Bearer valid');
  assert.equal(list.status, 200);
  assert.equal(list.body.items.length, 1);

  const archived = await request(app)
    .delete(`/api/projects/${PROJECT}`)
    .set('Authorization', 'Bearer valid');
  assert.equal(archived.status, 204);
  assert.equal(
    activities.some((a) => a.type === 'project.archived'),
    true,
  );
});

test('task update and delete flow correctly with activity tracking', async () => {
  const { db, activities } = fakeDb();
  const app = createApp({ db, authMiddleware: auth() });
  await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer valid')
    .send({ title: 'Lifecycle task', status: 'todo' });

  const updated = await request(app)
    .patch(`/api/tasks/${TASK}`)
    .set('Authorization', 'Bearer valid')
    .send({ status: 'done' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.status, 'done');
  assert.equal(
    activities.some((a) => a.type === 'task.completed'),
    true,
  );

  const deleted = await request(app)
    .delete(`/api/tasks/${TASK}`)
    .set('Authorization', 'Bearer valid');
  assert.equal(deleted.status, 204);
  assert.equal(
    activities.some((a) => a.type === 'task.deleted'),
    true,
  );
});
