import React from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

import { apiBaseMisconfigured } from '../services/api';

/**
 * Says so when this build was compiled with a backend address that cannot work from here.
 *
 * <p><b>Rendered above the router, deliberately - not inside {@code AppShell}.</b> That was the
 * first attempt and it never appeared: with a wrong API address the session check fails, so
 * {@code RequireOperator} bounces to /login, and a banner living behind the login wall is hidden
 * by exactly the failure it exists to explain. What an operator actually saw was a sign-in page
 * that silently did nothing - which is the confusing state, not a milder version of it.
 *
 * <p>Renders nothing at all in the normal case, including a dev server talking to a local backend.
 */
export default function ApiBaseWarning() {
  if (!apiBaseMisconfigured) return null;
  return (
    <Alert severity="error" square sx={{ borderRadius: 0 }}>
      <AlertTitle>This build has the wrong backend address</AlertTitle>
      It calls <strong>{apiBaseMisconfigured.apiBaseUrl}</strong>, which is this browser&apos;s own
      machine, but the page is served from <strong>{apiBaseMisconfigured.pageOrigin}</strong>.
      Nothing here can load, including signing in. <code>REACT_APP_API_BASE_URL</code> was not set
      for this deployment - it is baked in when the app is built, so fixing it needs a redeploy,
      not a restart.
    </Alert>
  );
}
