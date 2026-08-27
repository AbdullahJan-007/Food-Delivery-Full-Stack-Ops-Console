import jwt from 'jsonwebtoken';
import { User } from '../models/User.model.js';
import { AppError } from '../utils/AppError.js';

// Express 5 forwards a thrown/rejected error from an async middleware to the
// error handler automatically, so no try/catch-and-call-next boilerplate here.
export async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Not authorized — no token provided', 401);
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError('Not authorized — invalid or expired token', 401);
  }

  const user = await User.findById(decoded.id);

  if (!user || !user.isActive) {
    throw new AppError('Not authorized — account no longer exists or is inactive', 401);
  }

  req.user = user;
  next();
}

// Usage: router.post('/', authorize('admin'), createMenuItem)
export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError(`Role '${req.user.role}' is not permitted to perform this action`, 403);
    }
    next();
  };
}
