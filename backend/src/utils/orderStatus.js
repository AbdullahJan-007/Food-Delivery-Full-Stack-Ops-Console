export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

// Each status can only move to the ones listed here. This stops an update
// from jumping the lifecycle backwards (e.g. "delivered" -> "pending") or
// sideways into a nonsensical state — a real kitchen/dispatch workflow only
// ever moves forward or gets cancelled.
const ALLOWED_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function isValidStatusTransition(from, to) {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
