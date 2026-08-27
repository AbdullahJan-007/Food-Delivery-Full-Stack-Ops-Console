const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

export function validateLogin({ email, password }) {
  const errors = {};

  if (!email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address';

  if (!password) errors.password = 'Password is required';
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters';

  return errors;
}

export function validateMenuItem({ name, price, category }) {
  const errors = {};

  if (!name.trim()) errors.name = 'Name is required';
  else if (name.trim().length > 80) errors.name = 'Keep it under 80 characters';

  if (!price) errors.price = 'Price is required';
  else if (Number.isNaN(Number(price)) || Number(price) <= 0) {
    errors.price = 'Enter a price greater than 0';
  }

  if (!category) errors.category = 'Pick a category';

  return errors;
}

export function validateOrder({ customerName, customerPhone, deliveryAddress, items }) {
  const errors = {};

  if (!customerName.trim()) errors.customerName = 'Customer name is required';

  if (!customerPhone.trim()) errors.customerPhone = 'Phone number is required';
  else if (!PHONE_RE.test(customerPhone)) errors.customerPhone = 'Enter a valid phone number';

  if (!deliveryAddress.trim()) errors.deliveryAddress = 'Delivery address is required';

  if (!items || items.length === 0) errors.items = 'Pick at least one item';

  return errors;
}

export const hasErrors = (errors) => Object.keys(errors).length > 0;
