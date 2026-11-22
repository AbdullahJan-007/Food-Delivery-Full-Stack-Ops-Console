import jwt from 'jsonwebtoken';

export const JWT_ALGORITHM = 'HS256';
export const JWT_ISSUER = 'food-delivery-ops-api';
export const JWT_AUDIENCE = 'food-delivery-ops-client';

/**
 * Signs an HS256 JWT carrying user id, role, and tokenVersion.
 * Including tokenVersion enables instant server-side revocation on logout,
 * role change, or account deactivation without external session storage.
 */
export function generateToken(userId, role, tokenVersion = 0) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { id: String(userId), role, tokenVersion },
    process.env.JWT_SECRET,
    {
      algorithm: JWT_ALGORITHM,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
}
