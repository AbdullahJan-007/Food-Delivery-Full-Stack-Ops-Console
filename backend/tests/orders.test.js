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

async function createMenuItem(token, overrides = {}) {
  const res = await request(app)
    .post('/api/menu-items')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Zinger Burger', price: 650, category: 'Main Course', ...overrides });
  return res.body.data;
}

describe('POST /api/orders', () => {
  test('computes totalAmount server-side, ignoring any client-sent price', async () => {
    const { token } = await createTestUser({ role: 'staff' });
    const item = await createMenuItem(token, { price: 500 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName: 'Sara Khan',
        customerPhone: '+92 300 1234567',
        deliveryAddress: 'House 1, Abbottabad',
        // A price is deliberately NOT sent — only menuItem + quantity are
        // ever accepted; the controller looks the real price up itself.
        items: [{ menuItem: item._id, quantity: 3 }],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.totalAmount, 1500); // 500 * 3, from the server's own price
    assert.equal(res.body.data.items[0].name, 'Zinger Burger'); // snapshotted, not just a ref
    assert.equal(res.body.data.status, 'pending');
  });

  test('rejects an order for an unavailable item', async () => {
    const { token } = await createTestUser({ role: 'staff' });
    const item = await createMenuItem(token);
    await request(app)
      .put(`/api/menu-items/${item._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isAvailable: false });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName: 'Sara Khan',
        customerPhone: '03001234567',
        deliveryAddress: 'Abbottabad',
        items: [{ menuItem: item._id, quantity: 1 }],
      });

    assert.equal(res.status, 400);
  });

  test('rejects an order with zero items', async () => {
    const { token } = await createTestUser({ role: 'staff' });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName: 'Sara Khan',
        customerPhone: '03001234567',
        deliveryAddress: 'Abbottabad',
        items: [],
      });

    assert.equal(res.status, 400);
  });

  test('a past order total is unaffected by a later menu price change', async () => {
    const { token } = await createTestUser({ role: 'staff' });
    const item = await createMenuItem(token, { price: 500 });

    const order = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName: 'Sara Khan',
        customerPhone: '03001234567',
        deliveryAddress: 'Abbottabad',
        items: [{ menuItem: item._id, quantity: 2 }],
      });

    await request(app)
      .put(`/api/menu-items/${item._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 900 }); // price goes up after the order was placed

    const fetched = await request(app)
      .get(`/api/orders/${order.body.data._id}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(fetched.body.data.totalAmount, 1000); // still 500 * 2, not 900 * 2
  });
});

describe('PATCH /api/orders/:id/status', () => {
  async function placeOrder(token, item) {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName: 'Sara Khan',
        customerPhone: '03001234567',
        deliveryAddress: 'Abbottabad',
        items: [{ menuItem: item._id, quantity: 1 }],
      });
    return res.body.data;
  }

  test('allows a valid forward transition', async () => {
    const { token } = await createTestUser({ role: 'staff' });
    const item = await createMenuItem(token);
    const order = await placeOrder(token, item);

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'confirmed');
  });

  test('rejects skipping a stage (pending -> delivered)', async () => {
    const { token } = await createTestUser({ role: 'staff' });
    const item = await createMenuItem(token);
    const order = await placeOrder(token, item);

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'delivered' });

    assert.equal(res.status, 400);
  });

  test('rejects moving backwards once cancelled', async () => {
    const { token } = await createTestUser({ role: 'staff' });
    const item = await createMenuItem(token);
    const order = await placeOrder(token, item);

    await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled' });

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' });

    assert.equal(res.status, 400);
  });
});

describe('DELETE /api/orders/:id', () => {
  test('staff cannot delete an order — 403', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const item = await createMenuItem(adminToken);

    const { token: staffToken } = await createTestUser({ role: 'staff' });
    const order = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customerName: 'Sara Khan',
        customerPhone: '03001234567',
        deliveryAddress: 'Abbottabad',
        items: [{ menuItem: item._id, quantity: 1 }],
      });

    const res = await request(app)
      .delete(`/api/orders/${order.body.data._id}`)
      .set('Authorization', `Bearer ${staffToken}`);

    assert.equal(res.status, 403);
  });

  test('admin can delete an order', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const item = await createMenuItem(adminToken);
    const order = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Sara Khan',
        customerPhone: '03001234567',
        deliveryAddress: 'Abbottabad',
        items: [{ menuItem: item._id, quantity: 1 }],
      });

    const res = await request(app)
      .delete(`/api/orders/${order.body.data._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
  });
});
