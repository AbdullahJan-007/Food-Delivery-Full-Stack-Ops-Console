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
    assert.equal(res.body.data.isAvailable, true);
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

describe('GET & PUT /api/menu-items', () => {
  test('staff can list, filter, and search menu items', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    await request(app).post('/api/menu-items').set('Authorization', `Bearer ${adminToken}`).send({
      name: 'Spicy Zinger',
      description: 'Crispy chicken fillet',
      price: 650,
      category: 'Main Course',
    });
    await request(app).post('/api/menu-items').set('Authorization', `Bearer ${adminToken}`).send({
      name: 'Mint Margarita',
      price: 220,
      category: 'Beverages',
    });

    const { token: staffToken } = await createTestUser({ role: 'staff' });

    const listRes = await request(app)
      .get('/api/menu-items')
      .set('Authorization', `Bearer ${staffToken}`);
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.data.length, 2);

    const catRes = await request(app)
      .get('/api/menu-items?category=Beverages')
      .set('Authorization', `Bearer ${staffToken}`);
    assert.equal(catRes.status, 200);
    assert.equal(catRes.body.data.length, 1);
    assert.equal(catRes.body.data[0].name, 'Mint Margarita');

    const searchRes = await request(app)
      .get('/api/menu-items?search=crispy')
      .set('Authorization', `Bearer ${staffToken}`);
    assert.equal(searchRes.status, 200);
    assert.equal(searchRes.body.data.length, 1);
    assert.equal(searchRes.body.data[0].name, 'Spicy Zinger');
  });

  test('rejects invalid category query parameter with 400', async () => {
    const { token } = await createTestUser({ role: 'staff' });
    const res = await request(app)
      .get('/api/menu-items?category=InvalidCategory')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 400);
  });

  test('admin can update a menu item', async () => {
    const { token } = await createTestUser({ role: 'admin' });
    const created = await request(app)
      .post('/api/menu-items')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fries', price: 250, category: 'Sides' });

    const updated = await request(app)
      .put(`/api/menu-items/${created.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Loaded Fries', price: 399.99, isAvailable: false });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.name, 'Loaded Fries');
    assert.equal(updated.body.data.price, 399.99);
    assert.equal(updated.body.data.isAvailable, false);
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

    const del = await request(app)
      .delete(`/api/menu-items/${id}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(del.status, 200);

    const delAgain = await request(app)
      .delete(`/api/menu-items/${id}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(delAgain.status, 404);
  });
});
