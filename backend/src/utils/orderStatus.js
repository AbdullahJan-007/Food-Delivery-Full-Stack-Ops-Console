export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export const TERMINAL_STATUSES = ['delivered', 'cancelled'];

const ALLOWED_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.includes(status);
}

export function getAllowedTransitions(status) {
  return ALLOWED_TRANSITIONS[status] ?? [];
}

export function isValidStatusTransition(from, to) {
  if (typeof from !== 'string' || typeof to !== 'string') return false;
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
