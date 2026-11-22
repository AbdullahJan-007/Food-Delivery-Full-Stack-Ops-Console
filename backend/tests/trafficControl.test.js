import './helpers/env.js';
import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, disconnectTestDB, clearTestDB } from './helpers/db.js';
import { createTestUser } from './helpers/auth.js';
import { resetTrafficState } from '../src/middleware/trafficControl.middleware.js';

before(connectTestDB);
after(disconnectTestDB);
beforeEach(async () => {
  await clearTestDB();
  resetTrafficState();
});
afterEach(() => {
  delete process.env.ENABLE_TRAFFIC_SHIELD_IN_TEST;
});

describe('Traffic Control & Anti-Abuse Defense', () => {
  test('blocks automated scanner probes (/.env, /wp-admin, ../) and auto-quarantines repeat offenders', async () => {
    const attackerIp = '203.0.113.50';

    const probe1 = await request(app).get('/.env').set('X-Forwarded-For', attackerIp);
    assert.equal(probe1.status, 403);

    // Second scanner probe pushes threat score to 10 -> auto-quarantine
    const probe2 = await request(app).get('/wp-admin').set('X-Forwarded-For', attackerIp);
    assert.equal(probe2.status, 403);

    // Subsequent normal request from quarantined IP is immediately blocked with 429 + Retry-After
    const blocked = await request(app).get('/health').set('X-Forwarded-For', attackerIp);
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers['retry-after']);
  });

  test('detects and blocks rapid burst request floods with 429', async () => {
    process.env.ENABLE_TRAFFIC_SHIELD_IN_TEST = 'true';
    const floodIp = '203.0.113.77';

    let hit429 = false;
    for (let i = 0; i < 33; i += 1) {
      const res = await request(app).get('/health').set('X-Forwarded-For', floodIp);
      if (res.status === 429) {
        hit429 = true;
        break;
      }
    }
    assert.equal(hit429, true);
  });

  test('admin can monitor traffic, manually block an IP, and unblock it; staff gets 403', async () => {
    const { token: staffToken } = await createTestUser({ role: 'staff' });
    const { token: adminToken } = await createTestUser({ role: 'admin' });

    const staffRes = await request(app)
      .get('/api/security/traffic')
      .set('Authorization', `Bearer ${staffToken}`);
    assert.equal(staffRes.status, 403);

    const blockRes = await request(app)
      .post('/api/security/block-ip')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ip: '198.51.100.25', reason: 'Manual test block', durationMinutes: 30 });
    assert.equal(blockRes.status, 201);

    // Blocked IP is rejected
    const denied = await request(app).get('/health').set('X-Forwarded-For', '198.51.100.25');
    assert.equal(denied.status, 429);

    // Monitor shows blocked IP and metrics
    const statsRes = await request(app)
      .get('/api/security/traffic')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(statsRes.status, 200);
    assert.equal(statsRes.body.data.metrics.activeBlockedIps, 1);

    // Admin unblocks IP -> allowed again
    const unblockRes = await request(app)
      .delete('/api/security/block-ip/198.51.100.25')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(unblockRes.status, 200);

    const allowed = await request(app).get('/health').set('X-Forwarded-For', '198.51.100.25');
    assert.equal(allowed.status, 200);
  });
});
