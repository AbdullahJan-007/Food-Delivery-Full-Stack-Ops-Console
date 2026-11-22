export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const DEFAULT_TIMEOUT_MS = 15_000;

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(message, status, requestId = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
  }
}

async function request(path, token, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: options.signal ?? controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    let body = null;

    if (isJson) {
      try {
        body = await res.json();
      } catch {
        body = null;
      }
    }

    if (!res.ok || (body && body.success === false)) {
      if (res.status === 401 && token && typeof onUnauthorized === 'function') {
        onUnauthorized();
      }
      const message = body?.message || `Request failed (${res.status})`;
      throw new ApiError(message, res.status, body?.requestId ?? res.headers.get('x-request-id'));
    }

    return body ?? { success: true, data: null };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err?.name === 'AbortError') {
      throw new ApiError('Request timed out — please check your connection', 408);
    }
    throw new ApiError(err?.message || 'Network error — could not reach API', 0);
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildQuery(params) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      sp.set(key, String(value));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

// Auth
export function login(email, password) {
  return request('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(name, email, password, organizationSlug) {
  return request('/auth/register', null, {
    method: 'POST',
    body: JSON.stringify({
      name,
      email,
      password,
      ...(organizationSlug ? { organizationSlug } : {}),
    }),
  });
}

export function registerOrg(payload) {
  return request('/auth/register-org', null, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getOrganization(token) {
  return request('/organization', token);
}

export function updateOrganization(token, payload) {
  return request('/organization', token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getMe(token) {
  return request('/auth/me', token);
}

export function logout(token) {
  return request('/auth/logout', token, { method: 'POST' });
}

// Menu Items
export function getMenuItems(
  token,
  { category = undefined, available = undefined, search = undefined, limit = 100 } = {}
) {
  const query = buildQuery({ category, available, search, limit });
  return request(`/menu-items${query}`, token);
}

export function createMenuItem(token, payload) {
  return request('/menu-items', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateMenuItem(token, id, payload) {
  return request(`/menu-items/${encodeURIComponent(id)}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteMenuItem(token, id) {
  return request(`/menu-items/${encodeURIComponent(id)}`, token, { method: 'DELETE' });
}

// Orders
export function getOrderStats(token) {
  return request('/orders/stats', token);
}

export function getOrders(token, { status = undefined, search = undefined, limit = 100 } = {}) {
  const query = buildQuery({ status, search, limit });
  return request(`/orders${query}`, token);
}

export function createOrder(token, payload) {
  return request('/orders', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateOrder(token, id, payload) {
  return request(`/orders/${encodeURIComponent(id)}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function updateOrderStatus(token, id, status) {
  return request(`/orders/${encodeURIComponent(id)}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function deleteOrder(token, id) {
  return request(`/orders/${encodeURIComponent(id)}`, token, { method: 'DELETE' });
}

// Users (Admin)
export function getUsers(token) {
  return request('/users?limit=100', token);
}

export function updateUser(token, id, payload) {
  return request(`/users/${encodeURIComponent(id)}`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// Security & Traffic Control (Admin)
export function getTrafficMonitor(token) {
  return request('/security/traffic', token);
}

export function blockIp(token, payload) {
  return request('/security/block-ip', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function unblockIp(token, ip) {
  return request(`/security/block-ip/${encodeURIComponent(ip)}`, token, {
    method: 'DELETE',
  });
}

// Public Customer Storefront
export function getStorefront({ slug = undefined, category = undefined, search = undefined } = {}) {
  const query = buildQuery({ slug, category, search });
  return request(`/storefront${query}`, null);
}

export function placeCustomerOrder(payload) {
  return request('/storefront/orders', null, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function trackCustomerOrder(id) {
  return request(`/storefront/orders/${encodeURIComponent(id)}`, null);
}

export function getAdminRealtimeUrl(token) {
  return `${API_URL}/realtime/admin?token=${encodeURIComponent(token)}`;
}

export function getOrderRealtimeUrl(orderId) {
  return `${API_URL}/realtime/order/${encodeURIComponent(orderId)}`;
}
