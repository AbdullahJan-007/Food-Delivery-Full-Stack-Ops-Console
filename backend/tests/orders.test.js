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

async function createMenuItem(adminToken, overrides = {}) {
  const res = await request(app)
    .post('/api/menu-items')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Zinger Burger', price: 650, category: 'Main Course', ...overrides });
  assert.equal(res.status, 201);
  return res.body.data;
}

describe('POST /api/orders', () => {
  test('computes totalAmount server-side, ignoring any client-sent price', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const { token: staffToken } = await createTestUser({ role: 'staff' });
    const item = await createMenuItem(adminToken, { price: 500 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customerName: 'Sara Khan',
        customerPhone: '+92 300 1234567',
        deliveryAddress: 'House 1, Abbottabad',
        paymentMethod: 'card',
        notes: 'Ring the bell',
        items: [{ menuItem: item._id, quantity: 3, price: 1 }],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.totalAmount, 1500);
    assert.equal(res.body.data.items[0].name, 'Zinger Burger');
    assert.equal(res.body.data.status, 'pending');
    assert.equal(res.body.data.paymentMethod, 'card');
    assert.equal(res.body.data.statusHistory.length, 1);
    assert.equal(res.body.data.statusHistory[0].status, 'pending');
  });

  test('consolidates duplicate menuItem lines and rounds monetary totals cleanly', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const { token: staffToken } = await createTestUser({ role: 'staff' });
    const item = await createMenuItem(adminToken, { price: 19.99 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customerName: 'Bilal',
        customerPhone: '03001234567',
        deliveryAddress: 'Street 4, Lahore',
        items: [
          { menuItem: item._id, quantity: 1 },
          { menuItem: item._id, quantity: 2 },
        ],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.items.length, 1);
    assert.equal(res.body.data.items[0].quantity, 3);
    assert.equal(res.body.data.totalAmount, 59.97);
  });

  test('rejects an order for an unavailable item', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const { token: staffToken } = await createTestUser({ role: 'staff' });
    const item = await createMenuItem(adminToken);

    await request(app)
      .put(`/api/menu-items/${item._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAvailable: false });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customerName: 'Sara Khan',
        customerPhone: '03001234567',
        deliveryAddress: 'Abbottabad',
        items: [{ menuItem: item._id, quantity: 1 }],
      });

    assert.equal(res.status, 400);
  });

  test('rejects an order with zero items or excessive quantity', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const { token: staffToken } = await createTestUser({ role: 'staff' });
    const item = await createMenuItem(adminToken);

    const zeroRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customerName: 'Sara Khan',
        customerPhone: '03001234567',
        deliveryAddress: 'Abbottabad',
        items: [],
      });
    assert.equal(zeroRes.status, 400);

    const hugeRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customerName: 'Sara Khan',
        customerPhone: '03001234567',
        deliveryAddress: 'Abbottabad',
        items: [{ menuItem: item._id, quantity: 9999 }],
      });
    assert.equal(hugeRes.status, 400);
  });

  test('a past order total is unaffected by a later menu price change', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const { token: staffToken } = await createTestUser({ role: 'staff' });
    const item = await createMenuItem(adminToken, { price: 500 });

    const order = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customerName: 'Sara Khan',
        customerPhone: '03001234567',
        deliveryAddress: 'Abbottabad',
        items: [{ menuItem: item._id, quantity: 2 }],
      });

    await request(app)
      .put(`/api/menu-items/${item._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 900 });

    const fetched = await request(app)
      .get(`/api/orders/${order.body.data._id}`)
      .set('Authorization', `Bearer ${staffToken}`);

    assert.equal(fetched.body.data.totalAmount, 1000);
  });
});

describe('PATCH /api/orders/:id/status & PUT /api/orders/:id', () => {
  async function placeOrder(staffToken, item) {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customerName: 'Sara Khan',
        customerPhone: '03001234567',
        deliveryAddress: 'Abbottabad',
        items: [{ menuItem: item._id, quantity: 1 }],
      });
    return res.body.data;
  }

  test('allows valid forward transition and appends to statusHistory', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const { token: staffToken } = await createTestUser({ role: 'staff' });
    const item = await createMenuItem(adminToken);
    const order = await placeOrder(staffToken, item);

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'confirmed' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'confirmed');
    assert.equal(res.body.data.statusHistory.length, 2);
    assert.equal(res.body.data.statusHistory[1].status, 'confirmed');
  });

  test('rejects skipping a stage (pending -> delivered)', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const { token: staffToken } = await createTestUser({ role: 'staff' });
    const item = await createMenuItem(adminToken);
    const order = await placeOrder(staffToken, item);

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'delivered' });

    assert.equal(res.status, 400);
  });

  test('rejects moving backwards or editing once cancelled (terminal immutability)', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const { token: staffToken } = await createTestUser({ role: 'staff' });
    const item = await createMenuItem(adminToken);
    const order = await placeOrder(staffToken, item);

    await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'cancelled' });

    const moveRes = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'confirmed' });
    assert.equal(moveRes.status, 400);

    const editRes = await request(app)
      .put(`/api/orders/${order._id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ deliveryAddress: 'New Address' });
    assert.equal(editRes.status, 400);
  });
});

describe('GET /api/orders/stats & search & DELETE /api/orders/:id', () => {
  test('returns accurate operational KPIs excluding cancelled orders from revenue', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const item = await createMenuItem(adminToken, { price: 400 });

    const o1 = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Ayesha',
        customerPhone: '03001111111',
        deliveryAddress: 'Islamabad',
        items: [{ menuItem: item._id, quantity: 2 }],
      });

    const o2 = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Usman',
        customerPhone: '03002222222',
        deliveryAddress: 'Rawalpindi',
        items: [{ menuItem: item._id, quantity: 1 }],
      });

    // Cancel o2 so it does not count toward revenue
    await request(app)
      .patch(`/api/orders/${o2.body.data._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled' });

    const statsRes = await request(app)
      .get('/api/orders/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(statsRes.status, 200);
    assert.equal(statsRes.body.data.totalOrders, 2);
    assert.equal(statsRes.body.data.activeOrders, 1);
    assert.equal(statsRes.body.data.cancelledOrders, 1);
    assert.equal(statsRes.body.data.totalRevenue, 800);

    const searchRes = await request(app)
      .get('/api/orders?search=ayesha')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(searchRes.status, 200);
    assert.equal(searchRes.body.data.length, 1);
    assert.equal(searchRes.body.data[0]._id, o1.body.data._id);
  });

  test('staff cannot delete an order — 403; admin can delete', async () => {
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

    const staffDel = await request(app)
      .delete(`/api/orders/${order.body.data._id}`)
      .set('Authorization', `Bearer ${staffToken}`);
    assert.equal(staffDel.status, 403);

    const adminDel = await request(app)
      .delete(`/api/orders/${order.body.data._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminDel.status, 200);
  });
});
