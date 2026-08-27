import { User } from '../../src/models/User.model.js';
import { generateToken } from '../../src/utils/generateToken.js';

let counter = 0;

export async function createTestUser({ role = 'staff' } = {}) {
  counter += 1;
  const user = await User.create({
    name: `Test ${role}`,
    email: `${role}-${counter}@example.com`,
    password: 'secret123',
    role,
  });

  const token = generateToken(user._id, user.role);
  return { user, token };
}
