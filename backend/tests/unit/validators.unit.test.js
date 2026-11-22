import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePagination,
  isNonEmptyString,
  isSafeHttpUrl,
  escapeRegex,
  roundMoney,
  sanitizeInPlace,
} from '../../src/utils/validators.js';

describe('validators & sanitizers (unit)', () => {
  test('parsePagination clamps negative, zero, NaN, and oversized limits', () => {
    assert.deepEqual(parsePagination({}), { page: 1, limit: 20, skip: 0 });
    assert.deepEqual(parsePagination({ page: '3', limit: '10' }), { page: 3, limit: 10, skip: 20 });
    assert.deepEqual(parsePagination({ page: '-5', limit: '500' }), { page: 1, limit: 100, skip: 0 });
    assert.deepEqual(parsePagination({ page: 'abc', limit: '0' }), { page: 1, limit: 20, skip: 0 });
  });

  test('isNonEmptyString rejects non-strings and whitespace-only strings', () => {
    assert.equal(isNonEmptyString('hello'), true);
    assert.equal(isNonEmptyString('   '), false);
    assert.equal(isNonEmptyString({ $ne: null }), false);
    assert.equal(isNonEmptyString(123), false);
    assert.equal(isNonEmptyString(null), false);
  });

  test('isSafeHttpUrl permits empty, http, and https only — rejects javascript/data', () => {
    assert.equal(isSafeHttpUrl(''), true);
    assert.equal(isSafeHttpUrl(undefined), true);
    assert.equal(isSafeHttpUrl('https://cdn.example.com/burger.png'), true);
    assert.equal(isSafeHttpUrl('http://localhost:5000/img.jpg'), true);
    assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
    assert.equal(isSafeHttpUrl('data:text/html,<script>alert(1)</script>'), false);
    assert.equal(isSafeHttpUrl('ftp://example.com/file'), false);
    assert.equal(isSafeHttpUrl('not-a-url'), false);
  });

  test('roundMoney avoids floating-point drift', () => {
    assert.equal(roundMoney(0.1 + 0.2), 0.3);
    assert.equal(roundMoney(19.99 * 3), 59.97);
    assert.equal(roundMoney(100.005), 100.01);
  });

  test('escapeRegex neutralizes regex metacharacters', () => {
    assert.equal(escapeRegex('a.*+?^${}()|[]\\b'), 'a\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\b');
  });

  test('sanitizeInPlace strips $ operators, dotted keys, and prototype keys recursively', () => {
    const payload = {
      email: { $ne: null },
      'user.role': 'admin',
      nested: {
        ok: 'value',
        $gt: 0,
        items: [{ $where: '1==1', name: 'Burger' }],
      },
    };
    sanitizeInPlace(payload);
    assert.deepEqual(payload, {
      email: {},
      nested: {
        ok: 'value',
        items: [{ name: 'Burger' }],
      },
    });
  });
});
