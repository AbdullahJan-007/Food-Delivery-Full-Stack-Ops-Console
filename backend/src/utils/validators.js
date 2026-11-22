import mongoose from 'mongoose';

export const MENU_CATEGORIES = ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Sides'];
export const PAYMENT_METHODS = ['cash', 'card', 'online'];
export const USER_ROLES = ['staff', 'admin'];
export const MAX_ORDER_ITEMS = 50;
export const MAX_ITEM_QUANTITY = 100;
export const MAX_ITEM_PRICE = 1_000_000;

export function parsePagination(query = {}) {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(Math.floor(rawLimit), 100) : 20;
  return { page, limit, skip: (page - 1) * limit };
}

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidObjectId(value) {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);
}

export function isSafeHttpUrl(value) {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function roundMoney(amount) {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

/**
 * Recursively strips keys starting with `$` or containing `.` to neutralize
 * MongoDB operator injection in nested objects and arrays.
 */
export function sanitizeInPlace(target) {
  if (!target || typeof target !== 'object') return target;

  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i += 1) {
      sanitizeInPlace(target[i]);
    }
    return target;
  }

  for (const key of Object.keys(target)) {
    if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
      delete target[key];
      continue;
    }
    sanitizeInPlace(target[key]);
  }
  return target;
}
