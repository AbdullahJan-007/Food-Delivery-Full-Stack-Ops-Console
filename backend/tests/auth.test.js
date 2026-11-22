import './helpers/env.js';
import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, disconnectTestDB, clearTestDB } from './helpers/db.js';
import { createTestUser } from './helpers/auth.js';

before(connectTestDB);
after(disconnectTestDB);
beforeEach(clearTestDB);

describe('POST /api/auth/register', () => {
  test('creates a staff account and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ali Raza',
      email: 'ali@example.com',
      password: 'secret123',
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, 'staff');
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, 'ali@example.com');
  });

  test('ignores an admin role sent in the body — always creates staff', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Sneaky',
      email: 'sneaky@example.com',
      password: 'secret123',
      role: 'admin',
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, 'staff');
  });

  test('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'First',
      email: 'dup@example.com',
      password: 'secret123',
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Second',
      email: 'dup@example.com',
      password: 'secret123',
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  test('rejects missing fields with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@example.com' });
    assert.equal(res.status, 400);
  });
});

describe('POST /api/auth/login', () => {
  test('logs in with correct credentials', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login Test',
      email: 'login@example.com',
      password: 'secret123',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'secret123',
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);
  });

  test('rejects a wrong password with 401 and a generic message', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login Test',
      email: 'login2@example.com',
      password: 'secret123',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'login2@example.com',
      password: 'wrongpassword',
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Invalid email or password');
  });

  test('rejects a nonexistent email with the same generic message', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'whatever',
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Invalid email or password');
  });

  test('rejects login for a deactivated account with 403', async () => {
    const { user } = await createTestUser({ role: 'staff', isActive: false });
    const res = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: 'secret123',
    });

    assert.equal(res.status, 403);
  });
});

describe('GET /api/auth/me & POST /api/auth/logout', () => {
  test('returns the current user when authenticated', async () => {
    const { token, user } = await createTestUser({ role: 'admin' });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.email, user.email);
    assert.equal(res.body.data.role, 'admin');
  });

  test('logout immediately revokes the active JWT via tokenVersion', async () => {
    const { token } = await createTestUser({ role: 'staff' });

    const beforeLogout = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(beforeLogout.status, 200);

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(logoutRes.status, 200);

    const afterLogout = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(afterLogout.status, 401);
  });

  test('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  test('rejects a malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage');
    assert.equal(res.status, 401);
  });
});
