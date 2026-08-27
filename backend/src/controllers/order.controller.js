import { Order } from '../models/Order.model.js';
import { MenuItem } from '../models/MenuItem.model.js';
import { AppError } from '../utils/AppError.js';
import { isValidStatusTransition } from '../utils/orderStatus.js';

function parsePagination(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

// GET /api/orders — staff, admin. Supports ?status=&page=&limit=
export async function getOrders(req, res) {
  const { status } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const filter = {};
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('createdBy', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: 'Orders fetched',
    data: orders,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
  });
}

// GET /api/orders/:id — staff, admin.
export async function getOrder(req, res) {
  const order = await Order.findById(req.params.id).populate('createdBy', 'name email');
  if (!order) throw new AppError('Order not found', 404);

  res.status(200).json({ success: true, message: 'Order fetched', data: order });
}

// POST /api/orders — staff, admin.
// Prices are never trusted from the client. Each item's current price and
// name are pulled fresh from the menu and snapshotted onto the order, so
// later menu edits (or deletions) never rewrite what was actually charged.
export async function createOrder(req, res) {
  const { customerName, customerPhone, deliveryAddress, items, paymentMethod, notes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Order must include at least one item', 400);
  }

  const menuItems = await MenuItem.find({ _id: { $in: items.map((i) => i.menuItem) } });

  const orderItems = items.map(({ menuItem, quantity }) => {
    const found = menuItems.find((m) => m._id.toString() === menuItem);

    if (!found) throw new AppError(`Menu item ${menuItem} does not exist`, 400);
    if (!found.isAvailable) throw new AppError(`"${found.name}" is currently unavailable`, 400);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new AppError(`Invalid quantity for "${found.name}"`, 400);
    }

    return { menuItem: found._id, name: found.name, price: found.price, quantity };
  });

  const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const order = await Order.create({
    customerName,
    customerPhone,
    deliveryAddress,
    items: orderItems,
    totalAmount,
    paymentMethod,
    notes,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, message: 'Order placed', data: order });
}

// PUT /api/orders/:id — staff, admin.
// Deliberately does not touch `items` or `status`: items feed directly into
// totalAmount (see createOrder), and status has its own guarded endpoint
// below so a plain field edit can never silently skip the status lifecycle.
export async function updateOrder(req, res) {
  const { customerName, customerPhone, deliveryAddress, notes, paymentMethod } = req.body;

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { customerName, customerPhone, deliveryAddress, notes, paymentMethod },
    { new: true, runValidators: true, omitUndefined: true }
  );

  if (!order) throw new AppError('Order not found', 404);

  res.status(200).json({ success: true, message: 'Order updated', data: order });
}

// PATCH /api/orders/:id/status — staff, admin.
export async function updateOrderStatus(req, res) {
  const { status } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);

  if (!isValidStatusTransition(order.status, status)) {
    throw new AppError(`Cannot move order from '${order.status}' to '${status}'`, 400);
  }

  order.status = status;
  await order.save();

  res.status(200).json({ success: true, message: 'Order status updated', data: order });
}

// DELETE /api/orders/:id — admin only.
export async function deleteOrder(req, res) {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) throw new AppError('Order not found', 404);

  res.status(200).json({ success: true, message: 'Order deleted', data: null });
}
