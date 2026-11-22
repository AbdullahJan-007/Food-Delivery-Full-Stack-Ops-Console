import mongoose from 'mongoose';

export const SAAS_PLANS = ['starter', 'growth', 'enterprise'];
export const SUPPORTED_CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'AED'];

export const PLAN_LIMITS = {
  starter: { maxMenuItems: 50, maxStaff: 10, maxMonthlyOrders: 1000 },
  growth: { maxMenuItems: 250, maxStaff: 50, maxMonthlyOrders: 10000 },
  enterprise: { maxMenuItems: 5000, maxStaff: 500, maxMonthlyOrders: 250000 },
};

export function slugifyOrgName(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [80, 'Organization name cannot exceed 80 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Organization slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'],
      maxlength: [60, 'Slug cannot exceed 60 characters'],
    },
    plan: {
      type: String,
      enum: SAAS_PLANS,
      default: 'starter',
    },
    currency: {
      type: String,
      enum: SUPPORTED_CURRENCIES,
      default: 'PKR',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Organization = mongoose.model('Organization', organizationSchema);
