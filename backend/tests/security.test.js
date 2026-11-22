import './helpers/env.js';
import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, disconnectTestDB, clearTestDB } from './helpers/db.js';
import { createTestUser } from './helpers/auth.js';

before(connectTestDB);
after(disconnectTestDB);
beforeEach(clearTestDB);

describe('Security Regression Suite', () => {
  test('blocks NoSQL operator injection in login body', async () => {
    await createTestUser({ role: 'admin' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $ne: null }, password: { $ne: null } });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('blocks NoSQL operator injection in query filters', async () => {
    const { token } = await createTestUser({ role: 'staff' });

    const menuRes = await request(app)
      .get('/api/menu-items?category[$ne]=Sides')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(menuRes.status, 400);

    const orderRes = await request(app)
      .get('/api/orders?status[$ne]=cancelled')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(orderRes.status, 400);
  });

  test('rejects dangerous javascript: URL in MenuItem.imageUrl', async () => {
    const { token } = await createTestUser({ role: 'admin' });

    const res = await request(app)
      .post('/api/menu-items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'XSS Burger',
        price: 500,
        category: 'Main Course',
        imageUrl: 'javascript:alert(1)',
      });

    assert.equal(res.status, 400);
  });

  test('rejects JWT signed with wrong issuer/audience or wrong algorithm', async () => {
    const { user } = await createTestUser({ role: 'admin' });

    const wrongClaimsToken = jwt.sign(
      { id: user._id.toString(), role: 'admin', tokenVersion: 0 },
      process.env.JWT_SECRET,
      { algorithm: 'HS384', expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${wrongClaimsToken}`);

    assert.equal(res.status, 401);
  });

  test('returns 400 on malformed JSON instead of 500', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "broken');

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('returns 413 when payload exceeds 10kb limit', async () => {
    const { token } = await createTestUser({ role: 'admin' });
    const huge = 'a'.repeat(15_000);

    const res = await request(app)
      .post('/api/menu-items')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Big', description: huge, price: 100 });

    assert.equal(res.status, 413);
  });

  test('sets security headers, X-Request-Id, and healthy DB readiness on /health', async () => {
    const res = await request(app).get('/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.database, 'connected');
    assert.ok(res.headers['x-request-id']);
    assert.equal(res.headers['x-powered-by'], undefined);
    assert.ok(res.headers['x-content-type-options']);
  });
});
