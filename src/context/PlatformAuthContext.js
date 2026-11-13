import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { clearSession, fetchMe, getStoredOperator, getToken, platformLogin, storeSession } from '../services/api';

/**
 * Session state for a company operator.
 *
 * Deliberately much thinner than crm_frontend's AuthContext: there is no account, no location,
 * and no selectedLocationId, because a platform operator is not scoped to a tenant at all. The
 * whole class of bug that context guards against - a request firing before selectedLocationId is
 * populated and therefore returning another clinic's data - cannot occur here, since every
 * platform endpoint is cross-tenant by design.
 */
const PlatformAuthContext = createContext(null);

/**
 * Pages a role may open. null = every page (PLATFORM_ADMIN, PLATFORM_SUPPORT).
 * PLATFORM_SALES sees only Usage, Leads and Pipeline. This is navigation, not security: the
 * server refuses every other /api/platform/** route for that role (PlatformJwtFilter /
 * CurrentPlatformUserService), so a typed URL gets an empty page and a 403, nothing more.
 */
const SALES_PATHS = ['/usage', '/leads', '/pipeline'];

function allowedPathsFor(role) {
  return role === 'PLATFORM_SALES' ? SALES_PATHS : null;
}

export function homePathFor(role) {
  return role === 'PLATFORM_SALES' ? '/pipeline' : '/accounts';
}

export function PlatformAuthProvider({ children }) {
  const [operator, setOperator] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    // Render immediately from the cached operator so a reload doesn't flash the login screen...
    setOperator(getStoredOperator());
    // ...but re-fetch from the server before trusting it. The cached copy includes `role`, which
    // decides whether write controls render; a stale cached PLATFORM_ADMIN after a demotion to
    // PLATFORM_SUPPORT would show buttons the API will now reject. (The server is the real
    // authority either way - CurrentPlatformUserService.assertCanWrite() rechecks per request -
    // but showing an operator a button that 403s is a bad way to communicate a role change.)
    fetchMe()
      .then((fresh) => {
        setOperator(fresh);
        storeSession(getToken(), fresh);
      })
      .catch(() => {
        // The api interceptor already cleared the session and redirected on 401/403.
        setOperator(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const response = await platformLogin(username, password);
    const { token, ...rest } = response;
    storeSession(token, rest);
    setOperator(rest);
    return rest;
  }, []);

  /** Replaces the signed-in operator (e.g. once a one-time password has been changed). Keeps the token. */
  const applyOperator = useCallback((next) => {
    const { token, ...rest } = next || {};
    storeSession(getToken(), rest);
    setOperator(rest);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setOperator(null);
  }, []);

  const role = operator?.role;
  const canWrite = role === 'PLATFORM_ADMIN';
  // PLATFORM_SALES works the sales board but changes nothing else. As with canWrite this only
  // decides what renders; the server re-checks the role on every pipeline write.
  const canWritePipeline = canWrite || role === 'PLATFORM_SALES';
  const allowedPaths = allowedPathsFor(role);
  const canAccess = useCallback(
    (path) => allowedPaths === null || allowedPaths.some((p) => path === p || path.startsWith(`${p}/`)),
    [allowedPaths]
  );

  return (
    <PlatformAuthContext.Provider
      value={{ operator, loading, login, logout, canWrite, canWritePipeline, canAccess, homePath: homePathFor(role), applyOperator }}
    >
      {children}
    </PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth() {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) {
    throw new Error('usePlatformAuth must be used inside a PlatformAuthProvider');
  }
  return ctx;
}
