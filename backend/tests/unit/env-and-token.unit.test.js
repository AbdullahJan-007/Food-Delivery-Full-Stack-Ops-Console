import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { validateEnv, parseCorsOrigins } from '../../src/config/env.js';
import {
  generateToken,
  JWT_ALGORITHM,
  JWT_ISSUER,
  JWT_AUDIENCE,
} from '../../src/utils/generateToken.js';

describe('env validation (unit)', () => {
  test('parseCorsOrigins trims whitespace and rejects wildcard in production', () => {
    assert.deepEqual(
      parseCorsOrigins(' https://app.example.com , https://admin.example.com ', 'production'),
      ['https://app.example.com', 'https://admin.example.com']
    );
    assert.throws(() => parseCorsOrigins('*', 'production'), /wildcard/i);
    assert.throws(() => parseCorsOrigins('', 'production'), /explicitly set/i);
  });

  test('validateEnv rejects weak/placeholder secrets in production', () => {
    assert.throws(
      () =>
        validateEnv({
          NODE_ENV: 'production',
          MONGODB_URI: 'mongodb+srv://cluster/db',
          JWT_SECRET: 'short',
          CORS_ORIGIN: 'https://app.example.com',
        }),
      /at least 32 characters/i
    );

    assert.throws(
      () =>
        validateEnv({
          NODE_ENV: 'production',
          MONGODB_URI: 'mongodb+srv://cluster/db',
          JWT_SECRET: 'replace_with_a_long_random_secret',
          CORS_ORIGIN: 'https://app.example.com',
        }),
      /placeholder/i
    );
  });

  test('validateEnv accepts valid production configuration', () => {
    const cfg = validateEnv({
      NODE_ENV: 'production',
      PORT: '8080',
      MONGODB_URI: 'mongodb+srv://cluster/db',
      JWT_SECRET: 'a_very_secure_random_secret_string_at_least_32_chars_long',
      CORS_ORIGIN: 'https://app.example.com',
    });
    assert.equal(cfg.port, 8080);
    assert.deepEqual(cfg.corsOrigins, ['https://app.example.com']);
  });
});

describe('generateToken (unit)', () => {
  test('signs HS256 token with id, role, tokenVersion, issuer, and audience', () => {
    process.env.JWT_SECRET = 'unit_test_secret_value_1234567890';
    const token = generateToken('507f1f77bcf86cd799439011', 'admin', 3);

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    assert.equal(decoded.id, '507f1f77bcf86cd799439011');
    assert.equal(decoded.role, 'admin');
    assert.equal(decoded.tokenVersion, 3);
  });
});
