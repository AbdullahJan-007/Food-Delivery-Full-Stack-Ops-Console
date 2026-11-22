import { Organization } from '../models/Organization.model.js';
import { MenuItem } from '../models/MenuItem.model.js';
import { Order } from '../models/Order.model.js';
import { AppError } from '../utils/AppError.js';
import { DEFAULT_ORG_SLUG } from './auth.controller.js';
import { eventBus } from '../utils/eventBus.js';
import {
  MENU_CATEGORIES,
  MAX_ITEM_QUANTITY,
  MAX_ORDER_ITEMS,
  isValidObjectId,
  escapeRegex,
  roundMoney,
} from '../utils/validators.js';

async function resolvePublicOrg(slugParam) {
  const slug =
    typeof slugParam === 'string' && slugParam.trim()
      ? slugParam.trim().toLowerCase()
      : DEFAULT_ORG_SLUG;

  let org = await Organization.findOne({ slug, isActive: true });
  if (!org && !slugParam) {
    org = await Organization.findOne({ isActive: true }).sort('createdAt');
  }
  if (!org) {
    throw new AppError('Restaurant storefront not found', 404);
  }
  return org;
}

// GET /api/storefront — public customer menu & restaurant info.
export async function getStorefront(req, res) {
  const { slug, category, search } = req.query;
  const org = await resolvePublicOrg(slug);

  const filter = { organization: org._id, isAvailable: true };

  if (category !== undefined && category !== '' && category !== 'All') {
    if (typeof category !== 'string' || !MENU_CATEGORIES.includes(category)) {
      throw new AppError(`Invalid category. Allowed: ${MENU_CATEGORIES.join(', ')}`, 400);
    }
    filter.category = category;
  }

  if (typeof search === 'string' && search.trim()) {
    const safePattern = escapeRegex(search.trim().slice(0, 80));
    filter.$or = [
      { name: { $regex: safePattern, $options: 'i' } },
      { description: { $regex: safePattern, $options: 'i' } },
    ];
  }

  const menuItems = await MenuItem.find(filter)
    .select('name description price category isAvailable imageUrl')
    .sort('category name')
    .limit(100);

  res.status(200).json({
    success: true,
    message: 'Storefront fetched',
    data: {
      restaurant: {
        name: org.name,
        slug: org.slug,
        currency: org.currency,
      },
      menuItems,
    },
  });
}

// POST /api/storefront/orders — public customer order checkout.
// Server computes and snapshots all prices; emits real-time SSE event to Admin Panel.
export async function placeCustomerOrder(req, res) {
  const {
    organizationSlug,
    customerName,
    customerPhone,
    deliveryAddress,
    items,
    paymentMethod,
    notes,
  } = req.body ?? {};

  const org = await resolvePublicOrg(organizationSlug);

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Your cart must include at least one item', 400);
  }
  if (items.length > MAX_ORDER_ITEMS) {
    throw new AppError(`Order cannot exceed ${MAX_ORDER_ITEMS} line items`, 400);
  }

  const quantityById = new Map();
  for (const entry of items) {
    if (!entry || !isValidObjectId(entry.menuItem)) {
      throw new AppError('Each cart item must reference a valid menu item', 400);
    }
    if (!Number.isInteger(entry.quantity) || entry.quantity < 1) {
      throw new AppError('Quantity must be an integer of at least 1', 400);
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
    organization: org._id,
  });
  const menuById = new Map(menuItems.map((m) => [m._id.toString(), m]));

  const orderItems = uniqueIds.map((id) => {
    const found = menuById.get(id);
    if (!found) throw new AppError('One or more selected menu items do not exist', 400);
    if (!found.isAvailable) throw new AppError(`"${found.name}" is currently sold out`, 400);

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
    organization: org._id,
    source: 'customer',
    customerName,
    customerPhone,
    deliveryAddress,
    items: orderItems,
    totalAmount,
    paymentMethod: paymentMethod || 'cash',
    notes: notes || '',
    statusHistory: [{ status: 'pending', changedAt: new Date() }],
  });

  eventBus.emitOrderEvent(org._id, 'order:created', order);

  res.status(201).json({
    success: true,
    message: 'Order placed successfully',
    data: {
      _id: order._id,
      customerName: order.customerName,
      deliveryAddress: order.deliveryAddress,
      items: order.items,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      notes: order.notes,
      status: order.status,
      statusHistory: order.statusHistory,
      createdAt: order.createdAt,
      currency: org.currency,
    },
  });
}

// GET /api/storefront/orders/:id — public live order status lookup.
export async function trackCustomerOrder(req, res) {
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('Invalid order tracking ID', 400);
  }

  const order = await Order.findById(req.params.id).populate('organization', 'name currency');
  if (!order) throw new AppError('Order not found', 404);

  /** @type {any} */
  const org = order.organization;

  res.status(200).json({
    success: true,
    message: 'Order status fetched',
    data: {
      _id: order._id,
      customerName: order.customerName,
      deliveryAddress: order.deliveryAddress,
      items: order.items,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      notes: order.notes,
      status: order.status,
      statusHistory: order.statusHistory,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      restaurantName: org?.name ?? 'Food Delivery',
      currency: org?.currency ?? 'PKR',
    },
  });
}
