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

  const logout = useCallback(() => {
    clearSession();
    setOperator(null);
  }, []);

  const canWrite = operator?.role === 'PLATFORM_ADMIN';

  return (
    <PlatformAuthContext.Provider value={{ operator, loading, login, logout, canWrite }}>
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
