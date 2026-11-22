const PLACEHOLDER_SECRETS = new Set([
  'replace_with_a_long_random_secret',
  'secret',
  'changeme',
  'jwt_secret',
]);

export function parseCorsOrigins(rawOrigin, nodeEnv = process.env.NODE_ENV) {
  if (!rawOrigin || !rawOrigin.trim()) {
    if (nodeEnv === 'production') {
      throw new Error('CORS_ORIGIN must be explicitly set in production');
    }
    return ['http://localhost:5173', 'http://localhost:3000'];
  }

  const origins = rawOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (nodeEnv === 'production' && (origins.length === 0 || origins.includes('*'))) {
    throw new Error('CORS_ORIGIN cannot be empty or wildcard (*) in production');
  }

  return origins;
}

export function validateEnv(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const errors = [];

  if (!env.JWT_SECRET || typeof env.JWT_SECRET !== 'string' || !env.JWT_SECRET.trim()) {
    errors.push('JWT_SECRET is required');
  } else if (nodeEnv === 'production') {
    if (env.JWT_SECRET.trim().length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production');
    }
    if (PLACEHOLDER_SECRETS.has(env.JWT_SECRET.trim().toLowerCase())) {
      errors.push('JWT_SECRET cannot use a placeholder value in production');
    }
  }

  if (nodeEnv !== 'test' && (!env.MONGODB_URI || !env.MONGODB_URI.trim())) {
    errors.push('MONGODB_URI is required');
  }

  try {
    parseCorsOrigins(env.CORS_ORIGIN, nodeEnv);
  } catch (err) {
    errors.push(err.message);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }

  return {
    nodeEnv,
    port: Number(env.PORT) || 5000,
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN || '7d',
    corsOrigins: parseCorsOrigins(env.CORS_ORIGIN, nodeEnv),
  };
}
