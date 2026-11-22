import { MenuItem } from '../models/MenuItem.model.js';
import { PLAN_LIMITS } from '../models/Organization.model.js';
import { AppError } from '../utils/AppError.js';
import {
  MENU_CATEGORIES,
  parsePagination,
  escapeRegex,
  roundMoney,
  isSafeHttpUrl,
} from '../utils/validators.js';

// GET /api/menu-items — staff, admin. Scoped to caller's organization.
export async function getMenuItems(req, res) {
  const { category, available, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const filter = { organization: req.organization._id };

  if (category !== undefined && category !== '') {
    if (typeof category !== 'string' || !MENU_CATEGORIES.includes(category)) {
      throw new AppError(`Invalid category. Allowed: ${MENU_CATEGORIES.join(', ')}`, 400);
    }
    filter.category = category;
  }

  if (available !== undefined && available !== '') {
    if (available !== 'true' && available !== 'false') {
      throw new AppError("Query parameter 'available' must be 'true' or 'false'", 400);
    }
    filter.isAvailable = available === 'true';
  }

  if (typeof search === 'string' && search.trim()) {
    const safePattern = escapeRegex(search.trim().slice(0, 80));
    filter.$or = [
      { name: { $regex: safePattern, $options: 'i' } },
      { description: { $regex: safePattern, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    MenuItem.find(filter).sort('-createdAt').skip(skip).limit(limit),
    MenuItem.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: 'Menu items fetched',
    data: items,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
  });
}

// GET /api/menu-items/:id — staff, admin.
export async function getMenuItem(req, res) {
  const item = await MenuItem.findOne({ _id: req.params.id, organization: req.organization._id });
  if (!item) throw new AppError('Menu item not found', 404);

  res.status(200).json({ success: true, message: 'Menu item fetched', data: item });
}

// POST /api/menu-items — admin only.
export async function createMenuItem(req, res) {
  const { name, description, price, category, isAvailable, imageUrl } = req.body ?? {};

  if (price !== undefined && (typeof price !== 'number' || !Number.isFinite(price))) {
    throw new AppError('Price must be a valid number', 400);
  }
  if (imageUrl !== undefined && !isSafeHttpUrl(imageUrl)) {
    throw new AppError('Image URL must be a valid http:// or https:// URL', 400);
  }

  const limits = PLAN_LIMITS[req.organization.plan] ?? PLAN_LIMITS.starter;
  const currentCount = await MenuItem.countDocuments({ organization: req.organization._id });
  if (currentCount >= limits.maxMenuItems) {
    throw new AppError(`Workspace has reached its ${req.organization.plan} plan menu item limit`, 403);
  }

  const item = await MenuItem.create({
    organization: req.organization._id,
    name,
    description,
    price: price !== undefined ? roundMoney(price) : undefined,
    category,
    isAvailable,
    imageUrl,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, message: 'Menu item created', data: item });
}

// PUT /api/menu-items/:id — admin only.
export async function updateMenuItem(req, res) {
  const { name, description, price, category, isAvailable, imageUrl } = req.body ?? {};

  if (price !== undefined && (typeof price !== 'number' || !Number.isFinite(price))) {
    throw new AppError('Price must be a valid number', 400);
  }
  if (imageUrl !== undefined && !isSafeHttpUrl(imageUrl)) {
    throw new AppError('Image URL must be a valid http:// or https:// URL', 400);
  }

  const updatePayload = {};
  if (name !== undefined) updatePayload.name = name;
  if (description !== undefined) updatePayload.description = description;
  if (price !== undefined) updatePayload.price = roundMoney(price);
  if (category !== undefined) updatePayload.category = category;
  if (isAvailable !== undefined) updatePayload.isAvailable = Boolean(isAvailable);
  if (imageUrl !== undefined) updatePayload.imageUrl = imageUrl;

  if (Object.keys(updatePayload).length === 0) {
    throw new AppError('At least one updatable field is required', 400);
  }

  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, organization: req.organization._id },
    updatePayload,
    { returnDocument: 'after', runValidators: true }
  );

  if (!item) throw new AppError('Menu item not found', 404);

  res.status(200).json({ success: true, message: 'Menu item updated', data: item });
}

// DELETE /api/menu-items/:id — admin only.
export async function deleteMenuItem(req, res) {
  const item = await MenuItem.findOneAndDelete({
    _id: req.params.id,
    organization: req.organization._id,
  });
  if (!item) throw new AppError('Menu item not found', 404);

  res.status(200).json({ success: true, message: 'Menu item deleted', data: null });
}
