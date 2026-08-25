import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import { COLORS, LAYOUT, SHADOWS } from '../styles/js/styleConstants';

const NAV = [
  { to: '/accounts', label: 'Clinics' },
  { to: '/usage', label: 'Usage' },
  { to: '/leads', label: 'Leads' },
];

export default function AppShell({ children }) {
  const { operator, logout, canWrite } = usePlatformAuth();
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.backgroundPrimary }}>
      <AppBar position="sticky" sx={{ backgroundColor: COLORS.primaryDark, boxShadow: SHADOWS.sm }}>
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mr: 2 }}>
            Dev Portal
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1 }}>
            {NAV.map((item) => (
              <Button
                key={item.to}
                component={NavLink}
                to={item.to}
                sx={{
                  color: 'rgba(255,255,255,0.75)',
                  '&.active': {
                    color: '#fff',
                    backgroundColor: 'rgba(255,255,255,0.14)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* The role is shown, not hidden, because it changes what the portal will let you do -
              an operator who can't find the suspend button should be able to see why. */}
          <Tooltip
            title={
              canWrite
                ? 'PLATFORM_ADMIN - may change clinic status and assign leads'
                : 'PLATFORM_SUPPORT - read-only; write actions are disabled'
            }
          >
            <Chip
              size="small"
              label={operator?.role || 'unknown role'}
              sx={{
                color: '#fff',
                backgroundColor: canWrite ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.28)',
                fontWeight: 600,
              }}
            />
          </Tooltip>

          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            {operator?.username}
          </Typography>

          <Button
            size="small"
            variant="outlined"
            sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            Sign out
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: LAYOUT.containerMaxWidth, mx: 'auto', px: { xs: 2, md: 3 }, py: 3 }}>
        {children}
      </Box>
    </Box>
  );
}
