import { User } from '../../src/models/User.model.js';
import { Organization } from '../../src/models/Organization.model.js';
import { generateToken } from '../../src/utils/generateToken.js';
import { DEFAULT_ORG_SLUG } from '../../src/controllers/auth.controller.js';

let counter = 0;

export async function createTestOrganization(overrides = {}) {
  counter += 1;
  return Organization.create({
    name: overrides.name ?? `Test Kitchen ${counter}`,
    slug: overrides.slug ?? `test-kitchen-${counter}`,
    plan: overrides.plan ?? 'starter',
    currency: overrides.currency ?? 'PKR',
    isActive: overrides.isActive ?? true,
  });
}

export async function getOrCreateDefaultTestOrg() {
  let org = await Organization.findOne({ slug: DEFAULT_ORG_SLUG });
  if (!org) {
    org = await Organization.create({
      name: 'Default Test Kitchen',
      slug: DEFAULT_ORG_SLUG,
      plan: 'starter',
      currency: 'PKR',
    });
  }
  return org;
}

export async function createTestUser({ role = 'staff', isActive = true, organization = null } = {}) {
  counter += 1;
  const org = organization ?? (await getOrCreateDefaultTestOrg());

  const user = await User.create({
    organization: org._id,
    name: `Test ${role}`,
    email: `${role}-${counter}@example.com`,
    password: 'secret123',
    role,
    isActive,
  });

  const token = generateToken(user._id, user.role, user.tokenVersion);
  return { user, token, organization: org };
}
