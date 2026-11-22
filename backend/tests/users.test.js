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

describe('Admin Team Management (/api/users)', () => {
  test('staff cannot access /api/users — 403', async () => {
    const { token: staffToken } = await createTestUser({ role: 'staff' });
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${staffToken}`);
    assert.equal(res.status, 403);
  });

  test('admin can list users and promote/deactivate staff, revoking their old token', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const { user: staffUser, token: staffToken } = await createTestUser({ role: 'staff' });

    const listRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.data.length, 2);

    const promoteRes = await request(app)
      .patch(`/api/users/${staffUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });
    assert.equal(promoteRes.status, 200);
    assert.equal(promoteRes.body.data.role, 'admin');

    // Old staff token must now be invalidated due to tokenVersion increment
    const oldTokenRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${staffToken}`);
    assert.equal(oldTokenRes.status, 401);
  });

  test('admin cannot demote or deactivate themselves', async () => {
    const { user: adminUser, token: adminToken } = await createTestUser({ role: 'admin' });

    const demoteSelf = await request(app)
      .patch(`/api/users/${adminUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'staff' });
    assert.equal(demoteSelf.status, 400);

    const deactivateSelf = await request(app)
      .patch(`/api/users/${adminUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    assert.equal(deactivateSelf.status, 400);
  });
});
