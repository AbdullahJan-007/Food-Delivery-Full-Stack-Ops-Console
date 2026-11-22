import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSafeRedirectPath,
  isSafeHttpUrl,
  validateLogin,
  validateRegister,
  validateMenuItem,
  validateOrder,
  hasErrors,
} from '../src/lib/validation.js';

describe('frontend validation utilities (unit)', () => {
  test('isSafeRedirectPath blocks protocol-relative and external URLs', () => {
    assert.equal(isSafeRedirectPath('/orders'), true);
    assert.equal(isSafeRedirectPath('/menu'), true);
    assert.equal(isSafeRedirectPath('//evil.com'), false);
    assert.equal(isSafeRedirectPath('https://evil.com'), false);
    assert.equal(isSafeRedirectPath(null), false);
  });

  test('isSafeHttpUrl rejects javascript: and data: URIs', () => {
    assert.equal(isSafeHttpUrl(''), true);
    assert.equal(isSafeHttpUrl('https://cdn.example.com/item.jpg'), true);
    assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
    assert.equal(isSafeHttpUrl('data:text/html,hi'), false);
  });

  test('validateLogin and validateRegister catch missing/invalid fields', () => {
    assert.equal(hasErrors(validateLogin({ email: 'a@b.com', password: 'secret123' })), false);
    assert.ok(validateLogin({ email: 'bad', password: '123' }).email);
    assert.ok(validateLogin({ email: 'bad', password: '123' }).password);

    assert.equal(
      hasErrors(validateRegister({ name: 'Ali', email: 'ali@b.com', password: 'secret123' })),
      false
    );
    assert.ok(validateRegister({ name: '  ', email: 'ali@b.com', password: 'secret123' }).name);
  });

  test('validateMenuItem allows price 0 and validates imageUrl', () => {
    assert.equal(
      hasErrors(validateMenuItem({ name: 'Free Sauce', price: '0', category: 'Sides' })),
      false
    );
    assert.ok(
      validateMenuItem({ name: 'Bad', price: '-10', category: 'Sides' }).price
    );
    assert.ok(
      validateMenuItem({
        name: 'XSS',
        price: '100',
        category: 'Sides',
        imageUrl: 'javascript:alert(1)',
      }).imageUrl
    );
  });

  test('validateOrder requires customer info, valid phone, and at least one item', () => {
    const valid = validateOrder({
      customerName: 'Sara',
      customerPhone: '+92 300 1234567',
      deliveryAddress: 'House 12, Islamabad',
      items: [{ menuItem: '1', quantity: 2 }],
    });
    assert.equal(hasErrors(valid), false);

    const invalid = validateOrder({
      customerName: '',
      customerPhone: 'abc',
      deliveryAddress: '',
      items: [],
    });
    assert.ok(invalid.customerName);
    assert.ok(invalid.customerPhone);
    assert.ok(invalid.deliveryAddress);
    assert.ok(invalid.items);
  });
});
