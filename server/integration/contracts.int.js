process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { prisma, buildTestApp, cleanDatabase } = require('./helpers');

const app = buildTestApp();

function extractSchema(data) {
  if (data === null) return 'null';
  if (Array.isArray(data)) {
    if (data.length === 0) return ['empty_array'];
    return [extractSchema(data[0])];
  }
  if (typeof data === 'object') {
    const shape = {};
    for (const key of Object.keys(data).sort()) {
      shape[key] = extractSchema(data[key]);
    }
    return shape;
  }
  return typeof data;
}

function verifyOrUpdateContract(contractName, actualBody) {
  const schema = extractSchema(actualBody);
  const contractDir = path.join(__dirname, 'contracts');
  const contractPath = path.join(contractDir, `${contractName}.json`);
  const isUpdating = process.env.CONTRACT_UPDATE === '1';

  if (!fs.existsSync(contractPath) || isUpdating) {
    fs.mkdirSync(contractDir, { recursive: true });
    fs.writeFileSync(
      contractPath,
      JSON.stringify(schema, null, 2) + '\n',
      'utf8',
    );
  }

  const expected = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  assert.deepEqual(
    schema,
    expected,
    `Contract mismatch for ${contractName}. If intentional, re-run with CONTRACT_UPDATE=1`,
  );
}

test('R-11: cross-boundary contracts for all client-consumed endpoints', async () => {
  await cleanDatabase();

  // Provision user
  await request(app).get('/api/user').set('Authorization', 'Bearer user-a');

  // Create project
  const projRes = await request(app)
    .post('/api/projects')
    .set('Authorization', 'Bearer user-a')
    .send({
      name: 'Contract Test Project',
      description: 'Testing API contract',
    });
  assert.equal(projRes.status, 201);
  const projectId = projRes.body.id;

  // Create task with all fields
  const taskRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({
      title: 'Contract Task',
      description: 'Verifying task schema',
      status: 'done',
      priority: 'high',
      progress: 100,
      dueDate: '2026-12-31T23:59:59.000Z',
      projectId,
    });
  assert.equal(taskRes.status, 201);
  const taskId = taskRes.body.id;

  // Create evidence
  const evRes = await request(app)
    .post(`/api/tasks/${taskId}/evidence`)
    .set('Authorization', 'Bearer user-a')
    .send({
      kind: 'url',
      label: 'PR Link',
      url: 'https://github.com/MasRizqi07/Proof-Of-Work-OS/pull/42',
    });
  assert.equal(evRes.status, 201);

  // 1. GET /api/tasks
  const tasksGet = await request(app)
    .get('/api/tasks')
    .set('Authorization', 'Bearer user-a');
  assert.equal(tasksGet.status, 200);
  assert.equal(tasksGet.body.items.length > 0, true);
  verifyOrUpdateContract('tasks', tasksGet.body);

  // 2. GET /api/tasks/:taskId/evidence
  const evGet = await request(app)
    .get(`/api/tasks/${taskId}/evidence`)
    .set('Authorization', 'Bearer user-a');
  assert.equal(evGet.status, 200);
  assert.equal(evGet.body.items.length > 0, true);
  verifyOrUpdateContract('evidence', evGet.body);

  // 3. GET /api/metrics/summary
  const metricsGet = await request(app)
    .get('/api/metrics/summary')
    .set('Authorization', 'Bearer user-a');
  assert.equal(metricsGet.status, 200);
  assert.equal(metricsGet.body.weekly.length > 0, true);
  verifyOrUpdateContract('metrics-summary', metricsGet.body);

  // 4. GET /api/projects
  const projectsGet = await request(app)
    .get('/api/projects')
    .set('Authorization', 'Bearer user-a');
  assert.equal(projectsGet.status, 200);
  assert.equal(projectsGet.body.items.length > 0, true);
  verifyOrUpdateContract('projects', projectsGet.body);
});

test.after(async () => {
  await prisma.$disconnect();
});
