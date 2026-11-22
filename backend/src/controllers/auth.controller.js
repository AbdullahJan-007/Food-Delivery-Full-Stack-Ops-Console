import bcrypt from 'bcryptjs';
import { User } from '../models/User.model.js';
import {
  Organization,
  PLAN_LIMITS,
  SUPPORTED_CURRENCIES,
  slugifyOrgName,
} from '../models/Organization.model.js';
import { AppError } from '../utils/AppError.js';
import { generateToken } from '../utils/generateToken.js';
import { isNonEmptyString } from '../utils/validators.js';
import {
  getClientIp,
  recordAuthFailure,
  clearAuthFailures,
} from '../middleware/trafficControl.middleware.js';

const DUMMY_PASSWORD_HASH =
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8l1u5E9cL2Q2lZ3wV8pT3K4xY9wW2.';

export const DEFAULT_ORG_SLUG = 'default-kitchen';

export function toSafeOrg(org) {
  return {
    id: org._id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    currency: org.currency,
    limits: PLAN_LIMITS[org.plan] ?? PLAN_LIMITS.starter,
  };
}

function toSafeUser(user, org = null) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    organizationId: user.organization,
    ...(org ? { organization: toSafeOrg(org) } : {}),
  };
}

async function resolveOrCreateDefaultOrg() {
  let org = await Organization.findOne({ slug: DEFAULT_ORG_SLUG });
  if (!org) {
    org = await Organization.create({
      name: 'Food Delivery Ops',
      slug: DEFAULT_ORG_SLUG,
      plan: 'starter',
      currency: 'PKR',
    });
  }
  return org;
}

// POST /api/auth/register-org — public SaaS tenant onboarding.
// Creates a new Organization and its first Admin owner in one step.
export async function registerOrg(req, res) {
  const { organizationName, currency, name, email, password } = req.body ?? {};

  if (
    !isNonEmptyString(organizationName) ||
    !isNonEmptyString(name) ||
    !isNonEmptyString(email) ||
    !isNonEmptyString(password)
  ) {
    throw new AppError('Organization name, admin name, email and password are required', 400);
  }

  if (currency !== undefined && !SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError(`Invalid currency. Allowed: ${SUPPORTED_CURRENCIES.join(', ')}`, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  const baseSlug = slugifyOrgName(organizationName) || 'workspace';
  let slug = baseSlug;
  let suffix = 1;
  while (await Organization.exists({ slug })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const organization = await Organization.create({
    name: organizationName.trim(),
    slug,
    plan: 'starter',
    currency: currency || 'PKR',
  });

  try {
    const user = await User.create({
      organization: organization._id,
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'admin',
    });

    const token = generateToken(user._id, user.role, user.tokenVersion);

    res.status(201).json({
      success: true,
      message: 'Workspace and admin account created successfully',
      data: {
        user: toSafeUser(user, organization),
        organization: toSafeOrg(organization),
        token,
      },
    });
  } catch (err) {
    // Roll back orphan organization if user creation fails validation
    await Organization.findByIdAndDelete(organization._id);
    throw err;
  }
}

// POST /api/auth/register — public staff registration.
// Always assigns role 'staff', scoped to the target organizationSlug (or default workspace).
export async function register(req, res) {
  const { name, email, password, organizationSlug } = req.body ?? {};

  if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
    throw new AppError('Name, email and password are required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  let organization;
  if (isNonEmptyString(organizationSlug)) {
    organization = await Organization.findOne({
      slug: organizationSlug.trim().toLowerCase(),
      isActive: true,
    });
    if (!organization) {
      throw new AppError('Workspace not found for the provided organization slug', 404);
    }
  } else {
    organization = await resolveOrCreateDefaultOrg();
  }

  const limits = PLAN_LIMITS[organization.plan] ?? PLAN_LIMITS.starter;
  const staffCount = await User.countDocuments({ organization: organization._id });
  if (staffCount >= limits.maxStaff) {
    throw new AppError(`Workspace has reached its ${organization.plan} plan team limit`, 403);
  }

  const user = await User.create({
    organization: organization._id,
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: 'staff',
  });

  const token = generateToken(user._id, user.role, user.tokenVersion);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      user: toSafeUser(user, organization),
      organization: toSafeOrg(organization),
      token,
    },
  });
}

// POST /api/auth/login — public.
export async function login(req, res) {
  const { email, password } = req.body ?? {};

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    throw new AppError('Email and password are required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  const clientIp = getClientIp(req);

  if (!user) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    recordAuthFailure(clientIp, req.originalUrl);
    throw new AppError('Invalid email or password', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    recordAuthFailure(clientIp, req.originalUrl);
    throw new AppError('Invalid email or password', 401);
  }

  clearAuthFailures(clientIp);

  if (!user.isActive) {
    throw new AppError('This account has been deactivated', 403);
  }

  const organization = await Organization.findById(user.organization);
  if (!organization || !organization.isActive) {
    throw new AppError('This workspace has been deactivated', 403);
  }

  const token = generateToken(user._id, user.role, user.tokenVersion);

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: {
      user: toSafeUser(user, organization),
      organization: toSafeOrg(organization),
      token,
    },
  });
}

// GET /api/auth/me — private.
export async function getMe(req, res) {
  res.status(200).json({
    success: true,
    message: 'Current user fetched',
    data: toSafeUser(req.user, req.organization),
  });
}

// POST /api/auth/logout — private.
export async function logout(req, res) {
  await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
    data: null,
  });
}
