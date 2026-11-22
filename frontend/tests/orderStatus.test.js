import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ORDER_STATUSES, nextStatuses, STATUS_LABELS } from '../src/lib/orderStatus.js';

describe('frontend orderStatus mirror (unit)', () => {
  test('matches backend status lifecycle and labels', () => {
    assert.equal(ORDER_STATUSES.length, 6);
    for (const status of ORDER_STATUSES) {
      assert.ok(STATUS_LABELS[status]);
    }
    assert.deepEqual(nextStatuses('pending'), ['confirmed', 'cancelled']);
    assert.deepEqual(nextStatuses('confirmed'), ['preparing', 'cancelled']);
    assert.deepEqual(nextStatuses('preparing'), ['out_for_delivery', 'cancelled']);
    assert.deepEqual(nextStatuses('out_for_delivery'), ['delivered', 'cancelled']);
    assert.deepEqual(nextStatuses('delivered'), []);
    assert.deepEqual(nextStatuses('cancelled'), []);
  });
});
