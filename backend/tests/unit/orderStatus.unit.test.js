import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_STATUSES,
  TERMINAL_STATUSES,
  isTerminalStatus,
  getAllowedTransitions,
  isValidStatusTransition,
} from '../../src/utils/orderStatus.js';

describe('orderStatus state machine (unit)', () => {
  test('defines all 6 lifecycle statuses and 2 terminal statuses', () => {
    assert.deepEqual(ORDER_STATUSES, [
      'pending',
      'confirmed',
      'preparing',
      'out_for_delivery',
      'delivered',
      'cancelled',
    ]);
    assert.deepEqual(TERMINAL_STATUSES, ['delivered', 'cancelled']);
  });

  test('allows valid forward and cancel transitions', () => {
    assert.equal(isValidStatusTransition('pending', 'confirmed'), true);
    assert.equal(isValidStatusTransition('pending', 'cancelled'), true);
    assert.equal(isValidStatusTransition('confirmed', 'preparing'), true);
    assert.equal(isValidStatusTransition('preparing', 'out_for_delivery'), true);
    assert.equal(isValidStatusTransition('out_for_delivery', 'delivered'), true);
    assert.equal(isValidStatusTransition('out_for_delivery', 'cancelled'), true);
  });

  test('rejects skipping stages, backwards moves, self-transitions, and non-strings', () => {
    assert.equal(isValidStatusTransition('pending', 'preparing'), false);
    assert.equal(isValidStatusTransition('pending', 'delivered'), false);
    assert.equal(isValidStatusTransition('preparing', 'confirmed'), false);
    assert.equal(isValidStatusTransition('confirmed', 'confirmed'), false);
    assert.equal(isValidStatusTransition('delivered', 'cancelled'), false);
    assert.equal(isValidStatusTransition('cancelled', 'pending'), false);
    assert.equal(isValidStatusTransition('pending', { $ne: 'x' }), false);
    assert.equal(isValidStatusTransition(null, 'confirmed'), false);
  });

  test('identifies terminal statuses accurately', () => {
    assert.equal(isTerminalStatus('delivered'), true);
    assert.equal(isTerminalStatus('cancelled'), true);
    assert.equal(isTerminalStatus('pending'), false);
    assert.deepEqual(getAllowedTransitions('delivered'), []);
    assert.deepEqual(getAllowedTransitions('unknown'), []);
  });
});
