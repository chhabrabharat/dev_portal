import axios from 'axios';

/**
 * Single axios instance for the platform API.
 *
 * Note the storage keys: they are prefixed `platform*` and are deliberately DIFFERENT from
 * crm_frontend's plain `token`/`user` keys. If dev_portal and crm_frontend are ever served from
 * the same origin (both on one domain under different paths, or both on localhost during
 * development), localStorage is shared between them - identical key names would mean logging into
 * one silently clobbers the other's session, and worse, would hand this portal a clinic token it
 * would then send to /api/platform/** on every request.
 */
const TOKEN_KEY = 'platformToken';
const OPERATOR_KEY = 'platformOperator';

// Same env var name as crm_frontend and patient_portal. Falling back to a relative /api (rather
// than a hardcoded localhost:8080) lets the dev server's package.json "proxy" handle it, and
// means a same-origin deployment needs no env var at all.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
});

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    // Restricted storage (private browsing on WebKit has a history of throwing on access, not
    // just on write) shouldn't take the whole app down - the session just won't persist.
    return null;
  }
}

export function getStoredOperator() {
  try {
    return JSON.parse(localStorage.getItem(OPERATOR_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

export function storeSession(token, operator) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(OPERATOR_KEY, JSON.stringify(operator || {}));
  } catch (e) {
    // Best-effort only; the in-memory React state is what the active session runs on.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(OPERATOR_KEY);
  } catch (e) {
    /* ignore */
  }
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    // A 401/403 on any platform route other than login means the token is gone, expired, or the
    // operator was deactivated server-side (PlatformJwtFilter re-reads the row every request).
    // Drop the stale session rather than leaving the UI in a half-authenticated state where
    // every panel shows its own error.
    if ((status === 401 || status === 403) && !url.includes('/auth/login')) {
      clearSession();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

/** Turns an axios error into something worth showing a human. */
export function errorMessage(error, fallback = 'Something went wrong') {
  return error?.response?.data?.error || error?.message || fallback;
}

// ---- Platform endpoints ----

export const platformLogin = async (username, password) => {
  const { data } = await api.post('/platform/auth/login', { username, password });
  return data;
};

export const fetchMe = async () => {
  const { data } = await api.get('/platform/auth/me');
  return data;
};

export const fetchAccounts = async ({ search, status } = {}) => {
  const { data } = await api.get('/platform/accounts', {
    params: { search: search || undefined, status: status && status !== 'ALL' ? status : undefined },
  });
  return data;
};

export const fetchAccount = async (id) => {
  const { data } = await api.get(`/platform/accounts/${id}`);
  return data;
};

export const updateAccountStatus = async (id, status) => {
  const { data } = await api.put(`/platform/accounts/${id}/status`, { status });
  return data;
};

export const fetchUsage = async ({ from, to } = {}) => {
  const { data } = await api.get('/platform/metrics/usage', {
    params: { from: from || undefined, to: to || undefined },
  });
  return data;
};

export const fetchLeads = async ({ assigned, search } = {}) => {
  const { data } = await api.get('/platform/leads', {
    // assigned is a tri-state: undefined = all, false = unclaimed pool, true = already assigned.
    // An explicit `=== undefined` check is required here; a falsy check would drop `false`, which
    // is the most-used filter in this UI.
    params: { assigned: assigned === undefined ? undefined : assigned, search: search || undefined },
  });
  return data;
};

export const assignLead = async (id, accountId) => {
  const { data } = await api.put(`/platform/leads/${id}/assignment`, { accountId });
  return data;
};

export default api;
