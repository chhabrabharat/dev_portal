import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
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
import StaffPage from './pages/StaffPage';
import StaffDetailPage from './pages/StaffDetailPage';
import StaffCardPage from './pages/StaffCardPage';
import LeadCreditPage from './pages/LeadCreditPage';
import ChangePasswordPage from './pages/ChangePasswordPage';

/**
 * Route guard. Purely a UX convenience - every /api/platform/** route independently requires a
 * platform authority server-side (SecurityConfig + PlatformJwtFilter), so bypassing this in the
 * browser reveals nothing but empty screens and 403s.
 */
function useOperatorGate() {
  const { operator, loading } = usePlatformAuth();
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
  // The seeded admin starts on a one-time password. The server refuses everything else until it
  // is changed; sending the browser to the password screen just saves it a wall of 403s.
  if (operator.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  return null;
}

function RequireOperator({ children }) {
  const blocked = useOperatorGate();
  return blocked || <AppShell>{children}</AppShell>;
}

/** Same guard, no app shell: for the card print view, where the page should hold only the cards. */
function RequireOperatorBare({ children }) {
  const blocked = useOperatorGate();
  return blocked || children;
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
        {/* The company's own people. Pay, cards and the audit log inside are ADMIN-only on the server. */}
        <Route path="/staff" element={<RequireOperator><StaffPage /></RequireOperator>} />
        <Route path="/staff/:id" element={<RequireOperator><StaffDetailPage /></RequireOperator>} />
        <Route path="/staff/:id/card" element={<RequireOperatorBare><StaffCardPage /></RequireOperatorBare>} />
        <Route path="/lead-credit" element={<RequireOperator><LeadCreditPage /></RequireOperator>} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        {/* Clinics is the landing view: "which of our customers needs attention" is the first
            question this portal exists to answer. */}
        <Route path="*" element={<Navigate to="/accounts" replace />} />
      </Routes>
    </>
  );
}
