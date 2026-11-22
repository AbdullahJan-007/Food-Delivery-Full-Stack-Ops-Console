import jwt from 'jsonwebtoken';
import { User } from '../models/User.model.js';
import { Organization } from '../models/Organization.model.js';
import { AppError } from '../utils/AppError.js';
import { JWT_ALGORITHM, JWT_ISSUER, JWT_AUDIENCE } from '../utils/generateToken.js';

export async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Not authorized — no token provided', 401);
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new AppError('Not authorized — no token provided', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch {
    throw new AppError('Not authorized — invalid or expired token', 401);
  }

  const user = await User.findById(decoded.id);

  if (!user || !user.isActive) {
    throw new AppError('Not authorized — account no longer exists or is inactive', 401);
  }

  if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
    throw new AppError('Not authorized — session has been revoked', 401);
  }

  const organization = await Organization.findById(user.organization);
  if (!organization || !organization.isActive) {
    throw new AppError('Not authorized — workspace is inactive or unavailable', 403);
  }

  req.user = user;
  req.organization = organization;
  next();
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(
        `Role '${req.user?.role ?? 'unknown'}' is not permitted to perform this action`,
        403
      );
    }
    next();
  };
}
