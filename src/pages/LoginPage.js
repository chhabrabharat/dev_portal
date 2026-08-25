import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import { errorMessage } from '../services/api';
import { COLORS } from '../styles/js/styleConstants';

export default function LoginPage() {
  const { operator, login, loading } = usePlatformAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && operator) {
    return <Navigate to="/accounts" replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate('/accounts', { replace: true });
    } catch (e) {
      // The API answers every failed login identically on purpose (no such operator / wrong
      // password / deactivated are one response), so there is nothing more specific to show.
      setError(errorMessage(e, 'Invalid credentials'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        // Folded into one element's background-image rather than a separate positioned node -
        // the pattern crm_frontend had to adopt after a sibling decorative node got painted over.
        backgroundImage: `radial-gradient(circle at 20% 15%, ${COLORS.borderLight}66, transparent 45%),
                          radial-gradient(circle at 85% 80%, ${COLORS.primaryLight}33, transparent 40%),
                          linear-gradient(${COLORS.backgroundPrimary}, ${COLORS.backgroundSecondary})`,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>
            Dev Portal
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.textMuted, mt: 0.5, mb: 3 }}>
            Company operators only. This is not the clinic login.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={submit} sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting || !username || !password}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
