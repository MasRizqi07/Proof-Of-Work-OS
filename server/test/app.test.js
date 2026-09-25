process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');

test('ping returns a request id', async () => {
  const response = await request(createApp()).get('/api/ping');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.match(response.headers['x-request-id'], /^[0-9a-f-]{36}$/);
});

test('protected resources require a bearer token', async () => {
  const response = await request(createApp()).get('/api/projects');
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'Authentication required');
});
