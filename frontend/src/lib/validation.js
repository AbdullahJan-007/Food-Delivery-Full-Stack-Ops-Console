const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

export function isSafeRedirectPath(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
}

export function isSafeHttpUrl(value) {
  if (!value || !String(value).trim()) return true;
  try {
    const parsed = new URL(String(value).trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateLogin({ email, password }) {
  const errors = {};

  if (!email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address';

  if (!password) errors.password = 'Password is required';
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters';

  return errors;
}

export function validateRegister({ name, email, password }) {
  const errors = validateLogin({ email, password });

  if (!name.trim()) errors.name = 'Full name is required';
  else if (name.trim().length > 60) errors.name = 'Keep name under 60 characters';

  return errors;
}

export function validateMenuItem({ name, price, category, imageUrl = '' }) {
  const errors = {};

  if (!name.trim()) errors.name = 'Name is required';
  else if (name.trim().length > 80) errors.name = 'Keep it under 80 characters';

  const priceStr = String(price ?? '').trim();
  const parsedPrice = Number(priceStr);
  if (priceStr === '') errors.price = 'Price is required';
  else if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    errors.price = 'Enter a price of 0 or greater';
  } else if (parsedPrice > 1_000_000) {
    errors.price = 'Price cannot exceed 1,000,000';
  }

  if (!category) errors.category = 'Pick a category';

  if (imageUrl && !isSafeHttpUrl(imageUrl)) {
    errors.imageUrl = 'Use a valid http:// or https:// URL';
  }

  return errors;
}

export function validateOrder({ customerName, customerPhone, deliveryAddress, items, notes = '' }) {
  const errors = {};

  if (!customerName.trim()) errors.customerName = 'Customer name is required';
  else if (customerName.trim().length > 80) errors.customerName = 'Keep under 80 characters';

  if (!customerPhone.trim()) errors.customerPhone = 'Phone number is required';
  else if (!PHONE_RE.test(customerPhone.trim())) errors.customerPhone = 'Enter a valid phone number';

  if (!deliveryAddress.trim()) errors.deliveryAddress = 'Delivery address is required';
  else if (deliveryAddress.trim().length > 240) errors.deliveryAddress = 'Keep under 240 characters';

  if (!items || items.length === 0) errors.items = 'Pick at least one item';

  if (notes && notes.length > 300) errors.notes = 'Notes cannot exceed 300 characters';

  return errors;
}

export const hasErrors = (errors) => Object.keys(errors).length > 0;
