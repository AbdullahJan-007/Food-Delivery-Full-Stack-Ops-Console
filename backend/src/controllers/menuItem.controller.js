import { MenuItem } from '../models/MenuItem.model.js';
import { AppError } from '../utils/AppError.js';

function parsePagination(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

// GET /api/menu-items — staff, admin. Supports ?category=&available=&page=&limit=
export async function getMenuItems(req, res) {
  const { category, available } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const filter = {};
  if (category) filter.category = category;
  if (available !== undefined) filter.isAvailable = available === 'true';

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
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw new AppError('Menu item not found', 404);

  res.status(200).json({ success: true, message: 'Menu item fetched', data: item });
}

// POST /api/menu-items — admin only.
export async function createMenuItem(req, res) {
  const { name, description, price, category, isAvailable, imageUrl } = req.body;

  const item = await MenuItem.create({
    name,
    description,
    price,
    category,
    isAvailable,
    imageUrl,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, message: 'Menu item created', data: item });
}

// PUT /api/menu-items/:id — admin only.
export async function updateMenuItem(req, res) {
  const { name, description, price, category, isAvailable, imageUrl } = req.body;

  const item = await MenuItem.findByIdAndUpdate(
    req.params.id,
    { name, description, price, category, isAvailable, imageUrl },
    { new: true, runValidators: true, omitUndefined: true }
  );

  if (!item) throw new AppError('Menu item not found', 404);

  res.status(200).json({ success: true, message: 'Menu item updated', data: item });
}

// DELETE /api/menu-items/:id — admin only.
export async function deleteMenuItem(req, res) {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) throw new AppError('Menu item not found', 404);

  res.status(200).json({ success: true, message: 'Menu item deleted', data: null });
}
