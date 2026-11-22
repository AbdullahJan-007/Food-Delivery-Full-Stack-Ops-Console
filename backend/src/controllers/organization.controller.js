import {
  Organization,
  SAAS_PLANS,
  SUPPORTED_CURRENCIES,
  PLAN_LIMITS,
} from '../models/Organization.model.js';
import { MenuItem } from '../models/MenuItem.model.js';
import { User } from '../models/User.model.js';
import { Order } from '../models/Order.model.js';
import { AppError } from '../utils/AppError.js';
import { isNonEmptyString } from '../utils/validators.js';
import { toSafeOrg } from './auth.controller.js';

// GET /api/organization — staff, admin.
export async function getOrganization(req, res) {
  const orgId = req.organization._id;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [menuItemsCount, staffCount, monthlyOrdersCount] = await Promise.all([
    MenuItem.countDocuments({ organization: orgId }),
    User.countDocuments({ organization: orgId }),
    Order.countDocuments({ organization: orgId, createdAt: { $gte: startOfMonth } }),
  ]);

  const limits = PLAN_LIMITS[req.organization.plan] ?? PLAN_LIMITS.starter;

  res.status(200).json({
    success: true,
    message: 'Organization fetched',
    data: {
      ...toSafeOrg(req.organization),
      usage: {
        menuItems: menuItemsCount,
        staff: staffCount,
        monthlyOrders: monthlyOrdersCount,
      },
      limits,
    },
  });
}

// PATCH /api/organization — admin only.
export async function updateOrganization(req, res) {
  const { name, currency, plan } = req.body ?? {};
  const update = {};

  if (name !== undefined) {
    if (!isNonEmptyString(name)) {
      throw new AppError('Organization name must be a non-empty string', 400);
    }
    update.name = name.trim();
  }

  if (currency !== undefined) {
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      throw new AppError(`Invalid currency. Allowed: ${SUPPORTED_CURRENCIES.join(', ')}`, 400);
    }
    update.currency = currency;
  }

  if (plan !== undefined) {
    if (!SAAS_PLANS.includes(plan)) {
      throw new AppError(`Invalid plan. Allowed: ${SAAS_PLANS.join(', ')}`, 400);
    }
    update.plan = plan;
  }

  if (Object.keys(update).length === 0) {
    throw new AppError('Provide name, currency, or plan to update', 400);
  }

  const updated = await Organization.findByIdAndUpdate(req.organization._id, update, {
    returnDocument: 'after',
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'Organization updated',
    data: toSafeOrg(updated),
  });
}
