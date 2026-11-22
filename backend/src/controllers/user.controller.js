import { User } from '../models/User.model.js';
import { AppError } from '../utils/AppError.js';
import { USER_ROLES, parsePagination } from '../utils/validators.js';

// GET /api/users — admin only, scoped to caller's organization.
export async function getUsers(req, res) {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { organization: req.organization._id };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email role isActive createdAt updatedAt')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: 'Users fetched',
    data: users,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
  });
}

// PATCH /api/users/:id — admin only, scoped to caller's organization.
export async function updateUser(req, res) {
  const { role, isActive } = req.body ?? {};

  if (role === undefined && isActive === undefined) {
    throw new AppError('Provide role or isActive to update', 400);
  }

  if (role !== undefined && (typeof role !== 'string' || !USER_ROLES.includes(role))) {
    throw new AppError(`Invalid role. Allowed: ${USER_ROLES.join(', ')}`, 400);
  }

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    throw new AppError('isActive must be a boolean', 400);
  }

  const isSelf = req.params.id === req.user._id.toString();
  if (isSelf) {
    if (role !== undefined && role !== req.user.role) {
      throw new AppError('You cannot change your own role', 400);
    }
    if (isActive === false) {
      throw new AppError('You cannot deactivate your own account', 400);
    }
  }

  const updateDoc = { $set: {} };
  if (role !== undefined) updateDoc.$set.role = role;
  if (isActive !== undefined) updateDoc.$set.isActive = isActive;

  if (role !== undefined || isActive === false) {
    updateDoc.$inc = { tokenVersion: 1 };
  }

  const updated = await User.findOneAndUpdate(
    { _id: req.params.id, organization: req.organization._id },
    updateDoc,
    { returnDocument: 'after', runValidators: true }
  ).select('name email role isActive createdAt updatedAt');

  if (!updated) throw new AppError('User not found', 404);

  res.status(200).json({
    success: true,
    message: 'User updated',
    data: updated,
  });
}
