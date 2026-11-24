process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { prisma, buildTestApp, cleanDatabase } = require('./helpers');

test.beforeEach(async () => {
  await cleanDatabase();
});

test.after(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

test('S-01: task search with q parameter (case-insensitive, isolation, wildcards, length)', async () => {
  const app = buildTestApp();

  // Seed tasks for User A
  const taskA1 = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({
      title: 'Architect Secure Authentication',
      description: 'Implement Supabase auth with verified JWT',
    });
  assert.equal(taskA1.status, 201);

  const taskA2 = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({
      title: 'Database Performance Optimization',
      description: 'Add composite index for weekly streak metrics',
    });
  assert.equal(taskA2.status, 201);

  const taskA3 = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({
      title: 'Discount 50% Special Offer',
      description: 'Literal percent sign in title',
    });
  assert.equal(taskA3.status, 201);

  // Seed task for User B
  const taskB1 = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-b')
    .send({
      title: 'Secret User B Architecture Project',
      description: 'Authentication secrets for user b',
    });
  assert.equal(taskB1.status, 201);

  // 1. Search by title keyword (case-insensitive: "SECURE" should match "Architect Secure Authentication")
  const searchTitle = await request(app)
    .get('/api/tasks?q=SECURE')
    .set('Authorization', 'Bearer user-a');
  assert.equal(searchTitle.status, 200);
  assert.equal(searchTitle.body.total, 1);
  assert.equal(searchTitle.body.items[0].id, taskA1.body.id);

  // 2. Search by description keyword (case-insensitive: "streak" should match taskA2)
  const searchDesc = await request(app)
    .get('/api/tasks?q=streak')
    .set('Authorization', 'Bearer user-a');
  assert.equal(searchDesc.status, 200);
  assert.equal(searchDesc.body.total, 1);
  assert.equal(searchDesc.body.items[0].id, taskA2.body.id);

  // 3. Validation: empty q returns 400
  const emptyQ = await request(app)
    .get('/api/tasks?q=')
    .set('Authorization', 'Bearer user-a');
  assert.equal(emptyQ.status, 400);
  assert.equal(emptyQ.body.error.code, 'VALIDATION_ERROR');

  const whitespaceQ = await request(app)
    .get('/api/tasks?q=%20%20')
    .set('Authorization', 'Bearer user-a');
  assert.equal(whitespaceQ.status, 400);
  assert.equal(whitespaceQ.body.error.code, 'VALIDATION_ERROR');

  // 4. Validation: q > 100 characters returns 400
  const longStr = 'a'.repeat(101);
  const tooLongQ = await request(app)
    .get(`/api/tasks?q=${longStr}`)
    .set('Authorization', 'Bearer user-a');
  assert.equal(tooLongQ.status, 400);
  assert.equal(tooLongQ.body.error.code, 'VALIDATION_ERROR');

  // 5. Wildcard test: q=% does NOT match all rows
  // Only taskA3 has literal "%" in title
  const searchPercent = await request(app)
    .get('/api/tasks?q=%25')
    .set('Authorization', 'Bearer user-a');
  assert.equal(searchPercent.status, 200);
  assert.equal(searchPercent.body.total, 1);
  assert.equal(searchPercent.body.items[0].id, taskA3.body.id);

  // Wildcard test: q=_ does NOT match all rows
  const searchUnderscore = await request(app)
    .get('/api/tasks?q=_')
    .set('Authorization', 'Bearer user-a');
  assert.equal(searchUnderscore.status, 200);
  assert.equal(searchUnderscore.body.total, 0);

  // 6. Cross-user isolation: User B searches "Architecture"
  // User B only sees their own task, never User A's task
  const userBSearch = await request(app)
    .get('/api/tasks?q=Architecture')
    .set('Authorization', 'Bearer user-b');
  assert.equal(userBSearch.status, 200);
  assert.equal(userBSearch.body.total, 1);
  assert.equal(userBSearch.body.items[0].id, taskB1.body.id);
});
