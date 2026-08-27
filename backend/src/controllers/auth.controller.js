import { User } from '../models/User.model.js';
import { AppError } from '../utils/AppError.js';
import { generateToken } from '../utils/generateToken.js';

function toSafeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

// POST /api/auth/register — public.
// Always creates a 'staff' account, no matter what the request body sends.
// Open self-registration as an admin would be a privilege-escalation hole;
// the first admin is created via `npm run seed`, and admins can be promoted
// afterwards directly in the database or a future admin-only endpoint.
export async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError('Name, email and password are required', 400);
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  const user = await User.create({ name, email, password, role: 'staff' });
  const token = generateToken(user._id, user.role);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: { user: toSafeUser(user), token },
  });
}

// POST /api/auth/login — public.
export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  // Same message whether the email doesn't exist or the password is wrong —
  // this stops the endpoint being used to enumerate which emails are registered.
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('This account has been deactivated', 403);
  }

  const token = generateToken(user._id, user.role);

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: { user: toSafeUser(user), token },
  });
}

// GET /api/auth/me — private.
export async function getMe(req, res) {
  res.status(200).json({
    success: true,
    message: 'Current user fetched',
    data: toSafeUser(req.user),
  });
}
