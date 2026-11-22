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

test('E-01 accepted URL and the six rejected inputs', async () => {
  const app = buildTestApp();

  const taskRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Task with URL evidence' });
  assert.equal(taskRes.status, 201);
  const taskId = taskRes.body.id;

  // Accepted valid URL
  const validRes = await request(app)
    .post(`/api/tasks/${taskId}/evidence`)
    .set('Authorization', 'Bearer user-a')
    .send({
      kind: 'url',
      label: 'Pull request link',
      url: 'https://github.com/a/b/pull/12',
    });
  assert.equal(validRes.status, 201);
  assert.equal(validRes.body.kind, 'url');
  assert.equal(validRes.body.url, 'https://github.com/a/b/pull/12');

  // Six rejected inputs
  const rejectedUrls = [
    'javascript:alert(1)',
    'data:text/html,x',
    'ftp://x.y',
    'file:///etc/passwd',
    'github.com/a/b',
    '',
  ];

  for (const badUrl of rejectedUrls) {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/evidence`)
      .set('Authorization', 'Bearer user-a')
      .send({
        kind: 'url',
        label: 'Bad URL',
        url: badUrl,
      });
    assert.equal(
      res.status,
      400,
      `Expected 400 for rejected URL input: "${badUrl}"`,
    );
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  }
});

test('E-02 note rules including kind/field mismatch', async () => {
  const app = buildTestApp();

  const taskRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Task with note' });
  const taskId = taskRes.body.id;

  // Valid note
  const validNote = await request(app)
    .post(`/api/tasks/${taskId}/evidence`)
    .set('Authorization', 'Bearer user-a')
    .send({
      kind: 'note',
      label: 'Design decision',
      body: 'Verified via manual testing on staging.',
    });
  assert.equal(validNote.status, 201);
  assert.equal(validNote.body.kind, 'note');
  assert.equal(validNote.body.body, 'Verified via manual testing on staging.');

  // Note with body > 2000 chars rejected
  const longBody = 'a'.repeat(2001);
  const tooLong = await request(app)
    .post(`/api/tasks/${taskId}/evidence`)
    .set('Authorization', 'Bearer user-a')
    .send({
      kind: 'note',
      label: 'Long note',
      body: longBody,
    });
  assert.equal(tooLong.status, 400);
  assert.equal(tooLong.body.error.code, 'VALIDATION_ERROR');

  // Note with empty body rejected
  const emptyBody = await request(app)
    .post(`/api/tasks/${taskId}/evidence`)
    .set('Authorization', 'Bearer user-a')
    .send({
      kind: 'note',
      label: 'Empty note',
      body: '   ',
    });
  assert.equal(emptyBody.status, 400);

  // Mismatch: kind note with url field
  const noteWithUrl = await request(app)
    .post(`/api/tasks/${taskId}/evidence`)
    .set('Authorization', 'Bearer user-a')
    .send({
      kind: 'note',
      label: 'Mismatch',
      url: 'https://example.com',
    });
  assert.equal(noteWithUrl.status, 400);

  // Mismatch: kind url with body field
  const urlWithBody = await request(app)
    .post(`/api/tasks/${taskId}/evidence`)
    .set('Authorization', 'Bearer user-a')
    .send({
      kind: 'url',
      label: 'Mismatch',
      body: 'Some note text',
    });
  assert.equal(urlWithBody.status, 400);

  // Strict: kind url with extra body field
  const extraField = await request(app)
    .post(`/api/tasks/${taskId}/evidence`)
    .set('Authorization', 'Bearer user-a')
    .send({
      kind: 'url',
      label: 'Extra field',
      url: 'https://example.com',
      body: 'Extra field not allowed',
    });
  assert.equal(extraField.status, 400);
});

test('E-03 list and delete with 404 on foreign task and on evidenceId of another task', async () => {
  const app = buildTestApp();

  // User A creates Task 1 and Evidence 1
  const t1Res = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Task 1' });
  const task1Id = t1Res.body.id;

  const e1Res = await request(app)
    .post(`/api/tasks/${task1Id}/evidence`)
    .set('Authorization', 'Bearer user-a')
    .send({
      kind: 'url',
      label: 'Evidence 1',
      url: 'https://example.com/1',
    });
  assert.equal(e1Res.status, 201);
  const evidence1Id = e1Res.body.id;

  // User A creates Task 2
  const t2Res = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Task 2' });
  const task2Id = t2Res.body.id;

  // User B cannot list Task 1 evidence (404)
  const listB = await request(app)
    .get(`/api/tasks/${task1Id}/evidence`)
    .set('Authorization', 'Bearer user-b');
  assert.equal(listB.status, 404);
  assert.equal(listB.body.error.code, 'TASK_NOT_FOUND');

  // User A cannot delete Evidence 1 using Task 2 path (404)
  const deleteWrongTask = await request(app)
    .delete(`/api/tasks/${task2Id}/evidence/${evidence1Id}`)
    .set('Authorization', 'Bearer user-a');
  assert.equal(deleteWrongTask.status, 404);
  assert.equal(deleteWrongTask.body.error.code, 'EVIDENCE_NOT_FOUND');

  // User B cannot delete Evidence 1 under Task 1 (404 TASK_NOT_FOUND)
  const deleteForeign = await request(app)
    .delete(`/api/tasks/${task1Id}/evidence/${evidence1Id}`)
    .set('Authorization', 'Bearer user-b');
  assert.equal(deleteForeign.status, 404);
  assert.equal(deleteForeign.body.error.code, 'TASK_NOT_FOUND');

  // User A lists Task 1 evidence successfully (R-01 paginated contract)
  const listA = await request(app)
    .get(`/api/tasks/${task1Id}/evidence`)
    .set('Authorization', 'Bearer user-a');
  assert.equal(listA.status, 200);
  assert.equal(Array.isArray(listA.body.items), true);
  assert.equal(listA.body.items.length, 1);
  assert.equal(listA.body.total, 1);
  assert.equal(listA.body.page, 1);
  assert.equal(listA.body.limit, 20);
  assert.equal(listA.body.pages, 1);
  assert.equal(listA.body.items[0].id, evidence1Id);

  // User A deletes Evidence 1 successfully
  const deleteOk = await request(app)
    .delete(`/api/tasks/${task1Id}/evidence/${evidence1Id}`)
    .set('Authorization', 'Bearer user-a');
  assert.equal(deleteOk.status, 204);
});

test('E-04 cap 409 at the 21st', async () => {
  const app = buildTestApp();

  const taskRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Capped task' });
  const taskId = taskRes.body.id;

  // Add 20 evidence items
  for (let i = 1; i <= 20; i++) {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/evidence`)
      .set('Authorization', 'Bearer user-a')
      .send({
        kind: 'note',
        label: `Evidence ${i}`,
        body: `Note item number ${i}`,
      });
    assert.equal(res.status, 201, `Expected 201 for evidence item ${i}`);
  }

  // 21st evidence must return 409
  const capRes = await request(app)
    .post(`/api/tasks/${taskId}/evidence`)
    .set('Authorization', 'Bearer user-a')
    .send({
      kind: 'note',
      label: 'Evidence 21',
      body: 'Should be rejected by cap',
    });
  assert.equal(capRes.status, 409);
  assert.equal(capRes.body.error.code, 'EVIDENCE_LIMIT_REACHED');
});

test('E-07 last-evidence delete flips hasProof and task delete cascades (show a direct SELECT count(*) FROM "Evidence" result)', async () => {
  const app = buildTestApp();

  // Create task: hasProof must be false, proofCount 0
  const tRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Proof toggle task' });
  assert.equal(tRes.status, 201);
  const taskId = tRes.body.id;

  const tGetInitial = await request(app)
    .get(`/api/tasks/${taskId}`)
    .set('Authorization', 'Bearer user-a');
  assert.equal(tGetInitial.body.hasProof, false);
  assert.equal(tGetInitial.body.proofCount, 0);

  // Add evidence: flips hasProof to true, proofCount 1
  const eRes = await request(app)
    .post(`/api/tasks/${taskId}/evidence`)
    .set('Authorization', 'Bearer user-a')
    .send({
      kind: 'url',
      label: 'Proof link',
      url: 'https://example.com/proof',
    });
  assert.equal(eRes.status, 201);
  const evidenceId = eRes.body.id;

  const tGetWithProof = await request(app)
    .get(`/api/tasks/${taskId}`)
    .set('Authorization', 'Bearer user-a');
  assert.equal(tGetWithProof.body.hasProof, true);
  assert.equal(tGetWithProof.body.proofCount, 1);

  // Delete evidence: flips hasProof back to false, proofCount 0
  await request(app)
    .delete(`/api/tasks/${taskId}/evidence/${evidenceId}`)
    .set('Authorization', 'Bearer user-a');

  const tGetAfterDelete = await request(app)
    .get(`/api/tasks/${taskId}`)
    .set('Authorization', 'Bearer user-a');
  assert.equal(tGetAfterDelete.body.hasProof, false);
  assert.equal(tGetAfterDelete.body.proofCount, 0);

  // Re-add evidence
  await request(app)
    .post(`/api/tasks/${taskId}/evidence`)
    .set('Authorization', 'Bearer user-a')
    .send({
      kind: 'note',
      label: 'Persistent note',
      body: 'Testing cascade on task delete',
    });

  // Direct SQL before task delete
  const countBefore = await prisma.$queryRaw`
    SELECT count(*)::int AS count FROM "Evidence" WHERE "taskId" = ${taskId}::uuid;
  `;
  console.log('Direct SQL SELECT count(*) FROM "Evidence" BEFORE task delete:');
  console.log(countBefore);
  assert.equal(countBefore[0].count, 1);

  // Delete task
  const delTask = await request(app)
    .delete(`/api/tasks/${taskId}`)
    .set('Authorization', 'Bearer user-a');
  assert.equal(delTask.status, 204);

  // Direct SQL after task delete: must cascade and show 0
  const countAfter = await prisma.$queryRaw`
    SELECT count(*)::int AS count FROM "Evidence" WHERE "taskId" = ${taskId}::uuid;
  `;
  console.log(
    'Direct SQL SELECT count(*) FROM "Evidence" AFTER task delete (cascade verification):',
  );
  console.log(countAfter);
  assert.equal(countAfter[0].count, 0);
});

test('T-04 filter and its 400', async () => {
  const app = buildTestApp();

  // Task 1 with proof
  const t1 = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Task with proof' });
  const task1Id = t1.body.id;

  await request(app)
    .post(`/api/tasks/${task1Id}/evidence`)
    .set('Authorization', 'Bearer user-a')
    .send({
      kind: 'url',
      label: 'Proof 1',
      url: 'https://example.com/task1',
    });

  // Task 2 without proof
  const t2 = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Task without proof' });
  const task2Id = t2.body.id;

  // Filter hasProof=true
  const resTrue = await request(app)
    .get('/api/tasks?hasProof=true')
    .set('Authorization', 'Bearer user-a');
  assert.equal(resTrue.status, 200);
  assert.equal(resTrue.body.items.length, 1);
  assert.equal(resTrue.body.items[0].id, task1Id);
  assert.equal(resTrue.body.items[0].hasProof, true);

  // Filter hasProof=false
  const resFalse = await request(app)
    .get('/api/tasks?hasProof=false')
    .set('Authorization', 'Bearer user-a');
  assert.equal(resFalse.status, 200);
  assert.equal(resFalse.body.items.length, 1);
  assert.equal(resFalse.body.items[0].id, task2Id);
  assert.equal(resFalse.body.items[0].hasProof, false);

  // Invalid hasProof returns 400
  const resInvalid = await request(app)
    .get('/api/tasks?hasProof=yes')
    .set('Authorization', 'Bearer user-a');
  assert.equal(resInvalid.status, 400);
  assert.equal(resInvalid.body.error.code, 'VALIDATION_ERROR');
});

test('R-01: task with 2 evidence items returns paginated contract with newest first', async () => {
  const app = buildTestApp();

  const taskRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer user-a')
    .send({ title: 'Task with two proofs' });
  const taskId = taskRes.body.id;

  // Evidence 1 (older)
  const ev1 = await request(app)
    .post(`/api/tasks/${taskId}/evidence`)
    .set('Authorization', 'Bearer user-a')
    .send({
      kind: 'note',
      label: 'Proof One',
      body: 'First older proof',
    });
  assert.equal(ev1.status, 201);

  // Evidence 2 (newer)
  const ev2 = await request(app)
    .post(`/api/tasks/${taskId}/evidence`)
    .set('Authorization', 'Bearer user-a')
    .send({
      kind: 'url',
      label: 'Proof Two',
      url: 'https://github.com/MasRizqi07/Proof-Of-Work-OS/pull/1',
    });
  assert.equal(ev2.status, 201);

  // GET /api/tasks/:taskId/evidence
  const listRes = await request(app)
    .get(`/api/tasks/${taskId}/evidence`)
    .set('Authorization', 'Bearer user-a');

  assert.equal(listRes.status, 200);
  assert.deepEqual(
    {
      page: listRes.body.page,
      limit: listRes.body.limit,
      total: listRes.body.total,
      pages: listRes.body.pages,
    },
    { page: 1, limit: 20, total: 2, pages: 1 },
  );
  assert.equal(listRes.body.items.length, 2);
  // Newest first: ev2 should be items[0], ev1 should be items[1]
  assert.equal(listRes.body.items[0].id, ev2.body.id);
  assert.equal(listRes.body.items[1].id, ev1.body.id);
});
