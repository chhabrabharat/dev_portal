const TOKEN_KEY = 'operatorToken';
const SESSION_KEY = 'operatorSession';

// Public backend URL including /api - same env var as crm_frontend and patient_portal.
const API_BASE = (import.meta.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '');

function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setSession(token, session) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session || {}));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

/**
 * The session here is a convenience for rendering, not a permission. Every /admin endpoint checks
 * the SUPER_ADMIN role server-side, so editing this in devtools buys nothing but a blank screen.
 */
export async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const response = await fetch(apiUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if ((response.status === 401 || response.status === 403) && !path.includes('/login')) {
    clearSession();
    window.location.assign('/login');
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data;
}

// --- admin surface -----------------------------------------------------------------------------

export const listAccounts = (search) =>
  api(`/admin/accounts${search ? `?search=${encodeURIComponent(search)}` : ''}`);

export const getAccount = (id) => api(`/admin/accounts/${id}`);

export const getUsage = (id) => api(`/admin/accounts/${id}/usage`);

export const listFeatureKeys = () => api('/admin/accounts/feature-keys');

export const updateSubscription = (id, payload) =>
  api(`/admin/accounts/${id}/subscription`, { method: 'PATCH', body: payload });

export const setEntitlement = (id, feature, enabled) =>
  api(`/admin/accounts/${id}/entitlements/${feature}?enabled=${enabled}`, { method: 'PATCH' });

export async function login(username, password) {
  const data = await api('/auth/login', { method: 'POST', body: { username, password } });
  const roles = data.roles || [];
  if (!roles.includes('SUPER_ADMIN')) {
    // Refuse here rather than storing a token that every admin call would reject anyway - a console
    // that loads and then fails on each panel is worse than a clear "wrong account".
    throw new Error('This account does not have platform administrator access.');
  }
  setSession(data.token, { username: data.username, roles });
  return data;
}
