const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, token, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await res.json();

  // The backend always replies { success, message, data } even on failure —
  // that's what lets every caller surface body.message directly to the user.
  if (!res.ok || !body.success) {
    throw new Error(body.message || 'Something went wrong');
  }

  return body;
}

export function login(email, password) {
  return request('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getMenuItems(token) {
  return request('/menu-items?limit=100', token);
}

export function createMenuItem(token, payload) {
  return request('/menu-items', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateMenuItem(token, id, payload) {
  return request(`/menu-items/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteMenuItem(token, id) {
  return request(`/menu-items/${id}`, token, { method: 'DELETE' });
}

export function getOrders(token, status) {
  const query = status ? `?status=${status}&limit=100` : '?limit=100';
  return request(`/orders${query}`, token);
}

export function createOrder(token, payload) {
  return request('/orders', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateOrderStatus(token, id, status) {
  return request(`/orders/${id}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
