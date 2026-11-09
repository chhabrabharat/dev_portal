import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import AppShell from './components/AppShell';
import ApiBaseWarning from './components/ApiBaseWarning';
import { usePlatformAuth } from './context/PlatformAuthContext';
import LoginPage from './pages/LoginPage';
import AccountsPage from './pages/AccountsPage';
import AccountDetailPage from './pages/AccountDetailPage';
import UsagePage from './pages/UsagePage';
import TrafficPage from './pages/TrafficPage';
import LeadsPage from './pages/LeadsPage';
import PipelinePage from './pages/PipelinePage';
import GooglePage from './pages/GooglePage';
import PresencePage from './pages/PresencePage';
import TeamPage from './pages/TeamPage';
import { canOpen, homeFor } from './utils/roles';

/**
 * Route guard. Purely a UX convenience - every /api/platform/** route independently requires a
 * platform authority server-side (SecurityConfig + PlatformJwtFilter), so bypassing this in the
 * browser reveals nothing but empty screens and 403s.
 */
function RequireOperator({ children }) {
  const { operator, loading } = usePlatformAuth();
  const location = useLocation();
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!operator) {
    return <Navigate to="/login" replace />;
  }
  // A role outside its routes goes home rather than to a page that would 403 - and a 403 on any
  // platform route logs the operator out (services/api.js), which would read as a broken login.
  if (!canOpen(operator.role, location.pathname)) {
    return <Navigate to={homeFor(operator.role)} replace />;
  }
  return <AppShell>{children}</AppShell>;
}

/** "/" and unknown paths: land where the role is allowed to be. */
function HomeRedirect() {
  const { operator } = usePlatformAuth();
  return <Navigate to={homeFor(operator?.role)} replace />;
}

export default function App() {
  return (
    <>
      {/* Above the router so it survives the redirect to /login - see ApiBaseWarning. */}
      <ApiBaseWarning />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accounts" element={<RequireOperator><AccountsPage /></RequireOperator>} />
        <Route path="/accounts/:id" element={<RequireOperator><AccountDetailPage /></RequireOperator>} />
        <Route path="/usage" element={<RequireOperator><UsagePage /></RequireOperator>} />
        <Route path="/traffic" element={<RequireOperator><TrafficPage /></RequireOperator>} />
        {/* Which clinics have linked Google Business Profile, and whether it is syncing. */}
        <Route path="/google" element={<RequireOperator><GooglePage /></RequireOperator>} />
        {/* How findable and trustworthy each branch looks online, with the fixes that matter most. */}
        <Route path="/presence" element={<RequireOperator><PresencePage /></RequireOperator>} />
        <Route path="/leads" element={<RequireOperator><LeadsPage /></RequireOperator>} />
        {/* Sales pipeline - clinics we sell to. Not the same thing as /leads (contact-us inbox). */}
        <Route path="/pipeline" element={<RequireOperator><PipelinePage /></RequireOperator>} />
        <Route path="/team" element={<RequireOperator><TeamPage /></RequireOperator>} />
        {/* Clinics is the landing view: "which of our customers needs attention" is the first
            question this portal exists to answer. */}
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </>
  );
}
