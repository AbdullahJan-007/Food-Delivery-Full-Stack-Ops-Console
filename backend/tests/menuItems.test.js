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

describe('POST /api/menu-items', () => {
  test('admin can create a menu item', async () => {
    const { token } = await createTestUser({ role: 'admin' });

    const res = await request(app)
      .post('/api/menu-items')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Zinger Burger', price: 650, category: 'Main Course' });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.name, 'Zinger Burger');
    assert.equal(res.body.data.isAvailable, true); // schema default
  });

  test('staff cannot create a menu item — 403', async () => {
    const { token } = await createTestUser({ role: 'staff' });

    const res = await request(app)
      .post('/api/menu-items')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Zinger Burger', price: 650, category: 'Main Course' });

    assert.equal(res.status, 403);
  });

  test('rejects a negative price', async () => {
    const { token } = await createTestUser({ role: 'admin' });

    const res = await request(app)
      .post('/api/menu-items')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Broken Item', price: -5, category: 'Sides' });

    assert.equal(res.status, 400);
  });
});

describe('GET /api/menu-items', () => {
  test('staff can list menu items (read is not admin-only)', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    await request(app)
      .post('/api/menu-items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Fries', price: 250, category: 'Sides' });

    const { token: staffToken } = await createTestUser({ role: 'staff' });
    const res = await request(app).get('/api/menu-items').set('Authorization', `Bearer ${staffToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.ok(res.body.pagination);
  });

  test('filters by category', async () => {
    const { token } = await createTestUser({ role: 'admin' });
    await request(app).post('/api/menu-items').set('Authorization', `Bearer ${token}`).send({
      name: 'Coke', price: 150, category: 'Beverages',
    });
    await request(app).post('/api/menu-items').set('Authorization', `Bearer ${token}`).send({
      name: 'Fries', price: 250, category: 'Sides',
    });

    const res = await request(app)
      .get('/api/menu-items?category=Beverages')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].name, 'Coke');
  });
});

describe('DELETE /api/menu-items/:id', () => {
  test('admin can delete, 404 on a second attempt', async () => {
    const { token } = await createTestUser({ role: 'admin' });
    const created = await request(app)
      .post('/api/menu-items')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Temp Item', price: 100, category: 'Sides' });

    const id = created.body.data._id;

    const del = await request(app).delete(`/api/menu-items/${id}`).set('Authorization', `Bearer ${token}`);
    assert.equal(del.status, 200);

    const delAgain = await request(app).delete(`/api/menu-items/${id}`).set('Authorization', `Bearer ${token}`);
    assert.equal(delAgain.status, 404);
  });
});
