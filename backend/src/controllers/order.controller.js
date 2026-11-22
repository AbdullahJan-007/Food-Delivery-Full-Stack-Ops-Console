import { Order } from '../models/Order.model.js';
import { MenuItem } from '../models/MenuItem.model.js';
import { AppError } from '../utils/AppError.js';
import { eventBus } from '../utils/eventBus.js';
import {
  ORDER_STATUSES,
  isTerminalStatus,
  isValidStatusTransition,
} from '../utils/orderStatus.js';
import {
  MAX_ITEM_QUANTITY,
  MAX_ORDER_ITEMS,
  parsePagination,
  isValidObjectId,
  escapeRegex,
  roundMoney,
} from '../utils/validators.js';

// GET /api/orders/stats — staff, admin. Scoped to caller's organization.
export async function getOrderStats(req, res) {
  const orgId = req.organization._id;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [statusBuckets, todayStats] = await Promise.all([
    Order.aggregate([
      { $match: { organization: orgId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
    ]),
    Order.aggregate([
      { $match: { organization: orgId, createdAt: { $gte: startOfToday } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $ne: ['$status', 'cancelled'] }, '$totalAmount', 0],
            },
          },
        },
      },
    ]),
  ]);

  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  let totalOrders = 0;
  let totalRevenue = 0;

  for (const bucket of statusBuckets) {
    if (bucket._id in byStatus) {
      byStatus[bucket._id] = bucket.count;
    }
    totalOrders += bucket.count;
    if (bucket._id !== 'cancelled') {
      totalRevenue += bucket.revenue;
    }
  }

  const activeOrders =
    byStatus.pending + byStatus.confirmed + byStatus.preparing + byStatus.out_for_delivery;

  res.status(200).json({
    success: true,
    message: 'Order statistics fetched',
    data: {
      totalOrders,
      activeOrders,
      deliveredOrders: byStatus.delivered,
      cancelledOrders: byStatus.cancelled,
      totalRevenue: roundMoney(totalRevenue),
      todayOrders: todayStats[0]?.count ?? 0,
      todayRevenue: roundMoney(todayStats[0]?.revenue ?? 0),
      byStatus,
    },
  });
}

// GET /api/orders — staff, admin. Scoped to caller's organization.
export async function getOrders(req, res) {
  const { status, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const filter = { organization: req.organization._id };

  if (status !== undefined && status !== '') {
    if (typeof status !== 'string' || !ORDER_STATUSES.includes(status)) {
      throw new AppError(`Invalid status. Allowed: ${ORDER_STATUSES.join(', ')}`, 400);
    }
    filter.status = status;
  }

  if (typeof search === 'string' && search.trim()) {
    const safePattern = escapeRegex(search.trim().slice(0, 80));
    filter.$or = [
      { customerName: { $regex: safePattern, $options: 'i' } },
      { customerPhone: { $regex: safePattern, $options: 'i' } },
      { deliveryAddress: { $regex: safePattern, $options: 'i' } },
    ];
  }

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
  const order = await Order.findOne({
    _id: req.params.id,
    organization: req.organization._id,
  }).populate('createdBy', 'name email');
  if (!order) throw new AppError('Order not found', 404);

  res.status(200).json({ success: true, message: 'Order fetched', data: order });
}

// POST /api/orders — staff, admin.
export async function createOrder(req, res) {
  const { customerName, customerPhone, deliveryAddress, items, paymentMethod, notes } =
    req.body ?? {};

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Order must include at least one item', 400);
  }
  if (items.length > MAX_ORDER_ITEMS) {
    throw new AppError(`Order cannot exceed ${MAX_ORDER_ITEMS} line items`, 400);
  }

  const quantityById = new Map();
  for (const entry of items) {
    if (!entry || !isValidObjectId(entry.menuItem)) {
      throw new AppError('Each order item must specify a valid menuItem ID', 400);
    }
    if (!Number.isInteger(entry.quantity) || entry.quantity < 1) {
      throw new AppError('Item quantity must be an integer of at least 1', 400);
    }
    const nextQty = (quantityById.get(entry.menuItem) ?? 0) + entry.quantity;
    if (nextQty > MAX_ITEM_QUANTITY) {
      throw new AppError(`Quantity per item cannot exceed ${MAX_ITEM_QUANTITY}`, 400);
    }
    quantityById.set(entry.menuItem, nextQty);
  }

  const uniqueIds = [...quantityById.keys()];
  const menuItems = await MenuItem.find({
    _id: { $in: uniqueIds },
    organization: req.organization._id,
  });
  const menuById = new Map(menuItems.map((m) => [m._id.toString(), m]));

  const orderItems = uniqueIds.map((id) => {
    const found = menuById.get(id);
    if (!found) throw new AppError(`Menu item ${id} does not exist`, 400);
    if (!found.isAvailable) throw new AppError(`"${found.name}" is currently unavailable`, 400);

    return {
      menuItem: found._id,
      name: found.name,
      price: found.price,
      quantity: quantityById.get(id),
    };
  });

  const totalAmount = roundMoney(
    orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  const order = await Order.create({
    organization: req.organization._id,
    customerName,
    customerPhone,
    deliveryAddress,
    items: orderItems,
    totalAmount,
    paymentMethod,
    notes,
    createdBy: req.user._id,
    statusHistory: [{ status: 'pending', changedBy: req.user._id, changedAt: new Date() }],
  });

  eventBus.emitOrderEvent(req.organization._id, 'order:created', order);

  res.status(201).json({ success: true, message: 'Order placed', data: order });
}

// PUT /api/orders/:id — staff, admin.
export async function updateOrder(req, res) {
  const { customerName, customerPhone, deliveryAddress, notes, paymentMethod } = req.body ?? {};

  const existing = await Order.findOne({
    _id: req.params.id,
    organization: req.organization._id,
  });
  if (!existing) throw new AppError('Order not found', 404);

  if (isTerminalStatus(existing.status)) {
    throw new AppError(`Cannot modify an order that is already '${existing.status}'`, 400);
  }

  const updatePayload = {};
  if (customerName !== undefined) updatePayload.customerName = customerName;
  if (customerPhone !== undefined) updatePayload.customerPhone = customerPhone;
  if (deliveryAddress !== undefined) updatePayload.deliveryAddress = deliveryAddress;
  if (notes !== undefined) updatePayload.notes = notes;
  if (paymentMethod !== undefined) updatePayload.paymentMethod = paymentMethod;

  if (Object.keys(updatePayload).length === 0) {
    throw new AppError('At least one updatable field is required', 400);
  }

  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, organization: req.organization._id },
    updatePayload,
    { returnDocument: 'after', runValidators: true }
  );

  res.status(200).json({ success: true, message: 'Order updated', data: order });
}

// PATCH /api/orders/:id/status — staff, admin.
export async function updateOrderStatus(req, res) {
  const { status } = req.body ?? {};

  if (typeof status !== 'string' || !ORDER_STATUSES.includes(status)) {
    throw new AppError(`Invalid status. Allowed: ${ORDER_STATUSES.join(', ')}`, 400);
  }

  const existing = await Order.findOne({
    _id: req.params.id,
    organization: req.organization._id,
  });
  if (!existing) throw new AppError('Order not found', 404);

  if (!isValidStatusTransition(existing.status, status)) {
    throw new AppError(`Cannot move order from '${existing.status}' to '${status}'`, 400);
  }

  const updated = await Order.findOneAndUpdate(
    { _id: existing._id, organization: req.organization._id, status: existing.status },
    {
      $set: { status },
      $push: {
        statusHistory: {
          status,
          changedBy: req.user._id,
          changedAt: new Date(),
        },
      },
    },
    { returnDocument: 'after', runValidators: true }
  ).populate('createdBy', 'name email');

  if (!updated) {
    throw new AppError('Order status was modified concurrently — please refresh and retry', 409);
  }

  eventBus.emitOrderEvent(req.organization._id, 'order:updated', updated);

  res.status(200).json({ success: true, message: 'Order status updated', data: updated });
}

// DELETE /api/orders/:id — admin only.
export async function deleteOrder(req, res) {
  const order = await Order.findOneAndDelete({
    _id: req.params.id,
    organization: req.organization._id,
  });
  if (!order) throw new AppError('Order not found', 404);

  eventBus.emitOrderEvent(req.organization._id, 'order:deleted', order);

  res.status(200).json({ success: true, message: 'Order deleted', data: null });
}
