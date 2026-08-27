import jwt from 'jsonwebtoken';

/**
 * Signs a JWT carrying the user id and role. Role is embedded so
 * role-gated routes don't need an extra DB round trip just to know
 * what the caller is allowed to do (the auth middleware still re-fetches
 * the user to make sure the account still exists and is active).
 */
export function generateToken(userId, role) {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}
