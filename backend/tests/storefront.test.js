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

describe('Customer Storefront & Real-Time Admin Sync', () => {
  test('customer browses public menu, places order with server-computed price, tracks it live as Admin advances status', async () => {
    const { token: adminToken, organization } = await createTestUser({ role: 'admin' });

    const createdItem = await request(app)
      .post('/api/menu-items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Crispy Zinger',
        description: 'Signature spiced chicken burger',
        price: 650,
        category: 'Main Course',
      });
    assert.equal(createdItem.status, 201);

    // 1. Public customer browses storefront menu (no auth token required)
    const storeRes = await request(app).get(`/api/storefront?slug=${organization.slug}`);
    assert.equal(storeRes.status, 200);
    assert.equal(storeRes.body.data.restaurant.name, organization.name);
    assert.equal(storeRes.body.data.menuItems.length, 1);

    // 2. Customer places order (tampered price ignored; computed server-side)
    const orderRes = await request(app).post('/api/storefront/orders').send({
      organizationSlug: organization.slug,
      customerName: 'Ayesha Siddiqui',
      customerPhone: '+92 300 5554433',
      deliveryAddress: 'House 14, F-7/2, Islamabad',
      paymentMethod: 'cash',
      notes: 'Extra mayo please',
      items: [{ menuItem: createdItem.body.data._id, quantity: 2, price: 1 }],
    });
    assert.equal(orderRes.status, 201);
    assert.equal(orderRes.body.data.totalAmount, 1300);
    assert.equal(orderRes.body.data.status, 'pending');

    const orderId = orderRes.body.data._id;

    // 3. Admin immediately sees the customer order in Admin Orders Panel
    const adminOrdersRes = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminOrdersRes.status, 200);
    assert.equal(adminOrdersRes.body.data.length, 1);
    assert.equal(adminOrdersRes.body.data[0].source, 'customer');
    assert.equal(adminOrdersRes.body.data[0]._id, orderId);

    // 4. Admin confirms order -> Customer live tracker reflects confirmed status
    const confirmRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' });
    assert.equal(confirmRes.status, 200);

    const trackRes = await request(app).get(`/api/storefront/orders/${orderId}`);
    assert.equal(trackRes.status, 200);
    assert.equal(trackRes.body.data.status, 'confirmed');
    assert.equal(trackRes.body.data.statusHistory.length, 2);
  });
});
