import './helpers/env.js';
import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, disconnectTestDB, clearTestDB } from './helpers/db.js';
import { createTestOrganization, createTestUser } from './helpers/auth.js';

before(connectTestDB);
after(disconnectTestDB);
beforeEach(clearTestDB);

describe('SaaS Multi-Tenant Onboarding & Isolation', () => {
  test('POST /api/auth/register-org creates a new tenant workspace and admin owner', async () => {
    const res = await request(app).post('/api/auth/register-org').send({
      organizationName: 'Karachi Grill House',
      currency: 'USD',
      name: 'Zainab Tariq',
      email: 'zainab@karachigrill.com',
      password: 'password123',
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, 'admin');
    assert.equal(res.body.data.organization.slug, 'karachi-grill-house');
    assert.equal(res.body.data.organization.currency, 'USD');
    assert.ok(res.body.data.token);

    // Fetch workspace usage & plan info
    const orgRes = await request(app)
      .get('/api/organization')
      .set('Authorization', `Bearer ${res.body.data.token}`);
    assert.equal(orgRes.status, 200);
    assert.equal(orgRes.body.data.usage.staff, 1);
    assert.equal(orgRes.body.data.usage.menuItems, 0);

    // Admin can upgrade plan and update currency
    const patchRes = await request(app)
      .patch('/api/organization')
      .set('Authorization', `Bearer ${res.body.data.token}`)
      .send({ plan: 'growth', currency: 'PKR' });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.data.plan, 'growth');
    assert.equal(patchRes.body.data.currency, 'PKR');
  });

  test('strict tenant isolation: Tenant A cannot read, order, update, or delete Tenant B data', async () => {
    const orgA = await createTestOrganization({ name: 'Tenant Alpha', slug: 'tenant-alpha' });
    const orgB = await createTestOrganization({ name: 'Tenant Beta', slug: 'tenant-beta' });

    const { token: adminA } = await createTestUser({ role: 'admin', organization: orgA });
    const { token: adminB, user: userB } = await createTestUser({ role: 'admin', organization: orgB });

    // Tenant B creates a menu item and an order
    const itemB = await request(app)
      .post('/api/menu-items')
      .set('Authorization', `Bearer ${adminB}`)
      .send({ name: 'Secret Beta Pizza', price: 1200, category: 'Main Course' });
    assert.equal(itemB.status, 201);

    const orderB = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminB}`)
      .send({
        customerName: 'Beta Customer',
        customerPhone: '03009998888',
        deliveryAddress: 'Beta St 9',
        items: [{ menuItem: itemB.body.data._id, quantity: 1 }],
      });
    assert.equal(orderB.status, 201);

    // Tenant A lists menu items -> must NOT see Tenant B's item
    const menuA = await request(app)
      .get('/api/menu-items')
      .set('Authorization', `Bearer ${adminA}`);
    assert.equal(menuA.status, 200);
    assert.equal(menuA.body.data.length, 0);

    // Tenant A tries to fetch/update/delete Tenant B's menu item by ID -> 404
    const getItemB = await request(app)
      .get(`/api/menu-items/${itemB.body.data._id}`)
      .set('Authorization', `Bearer ${adminA}`);
    assert.equal(getItemB.status, 404);

    // Tenant A tries to place an order using Tenant B's menu item ID -> 400
    const crossOrder = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminA}`)
      .send({
        customerName: 'Sneaky',
        customerPhone: '03001112222',
        deliveryAddress: 'Alpha St 1',
        items: [{ menuItem: itemB.body.data._id, quantity: 1 }],
      });
    assert.equal(crossOrder.status, 400);

    // Tenant A tries to read/advance/delete Tenant B's order -> 404
    const getOrderB = await request(app)
      .get(`/api/orders/${orderB.body.data._id}`)
      .set('Authorization', `Bearer ${adminA}`);
    assert.equal(getOrderB.status, 404);

    const patchOrderB = await request(app)
      .patch(`/api/orders/${orderB.body.data._id}/status`)
      .set('Authorization', `Bearer ${adminA}`)
      .send({ status: 'confirmed' });
    assert.equal(patchOrderB.status, 404);

    // Tenant A stats must show 0 orders and 0 revenue
    const statsA = await request(app)
      .get('/api/orders/stats')
      .set('Authorization', `Bearer ${adminA}`);
    assert.equal(statsA.status, 200);
    assert.equal(statsA.body.data.totalOrders, 0);
    assert.equal(statsA.body.data.totalRevenue, 0);

    // Tenant A tries to list or modify Tenant B's users -> isolated
    const usersA = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminA}`);
    assert.equal(usersA.status, 200);
    assert.equal(usersA.body.data.length, 1);

    const modUserB = await request(app)
      .patch(`/api/users/${userB._id}`)
      .set('Authorization', `Bearer ${adminA}`)
      .send({ isActive: false });
    assert.equal(modUserB.status, 404);
  });
});
