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

/**
 * Route guard. Purely a UX convenience - every /api/platform/** route independently requires a
 * platform authority server-side (SecurityConfig + PlatformJwtFilter), so bypassing this in the
 * browser reveals nothing but empty screens and 403s.
 */
function RequireOperator({ children }) {
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
  return <AppShell>{children}</AppShell>;
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
        <Route path="/leads" element={<RequireOperator><LeadsPage /></RequireOperator>} />
        {/* Clinics is the landing view: "which of our customers needs attention" is the first
            question this portal exists to answer. */}
        <Route path="*" element={<Navigate to="/accounts" replace />} />
      </Routes>
    </>
  );
}
