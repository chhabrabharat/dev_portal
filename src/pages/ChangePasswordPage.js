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
import { changeOwnPassword, errorMessage } from '../services/api';
import { COLORS } from '../styles/js/styleConstants';

export const MIN_PASSWORD = 12;

/**
 * Set your own password. For the seeded `admin` this is the first and only screen the server will
 * answer for until it is done (the one-time password), so it stands alone with no navigation.
 */
export default function ChangePasswordPage() {
  const { operator, loading, canWrite, applyOperator, logout } = usePlatformAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!loading && !operator) return <Navigate to="/login" replace />;
  const forced = Boolean(operator?.mustChangePassword);

  const mismatch = confirm !== '' && next !== confirm;
  const tooShort = next !== '' && next.length < MIN_PASSWORD;
  const ready = current && next.length >= MIN_PASSWORD && next === confirm && next !== current;

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await changeOwnPassword(current, next);
      applyOperator({ ...operator, ...updated, token: undefined });
      navigate('/accounts', { replace: true });
    } catch (e) {
      setError(errorMessage(e, 'Could not change the password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, backgroundColor: COLORS.backgroundPrimary }}>
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>
            {forced ? 'Choose your own password' : 'Change password'}
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.textMuted, mt: 0.5, mb: 2 }}>
            {forced
              ? 'This account was created with a one-time password. Until you replace it, nothing else in the console will open.'
              : `Signed in as ${operator?.username}.`}
          </Typography>
          {!canWrite && !forced && <Alert severity="info" sx={{ mb: 2 }}>Only PLATFORM_ADMIN accounts can change a password here.</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={submit} sx={{ display: 'grid', gap: 2 }}>
            <TextField label={forced ? 'One-time password' : 'Current password'} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" autoFocus required fullWidth />
            <TextField label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required fullWidth
              error={tooShort} helperText={tooShort ? `Use at least ${MIN_PASSWORD} characters` : `At least ${MIN_PASSWORD} characters. Not "admin", not your username.`} />
            <TextField label="Repeat new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required fullWidth
              error={mismatch} helperText={mismatch ? 'The two do not match' : ' '} />
            <Button type="submit" variant="contained" size="large" disabled={saving || !ready || (!canWrite && !forced)}>
              {saving ? 'Saving…' : 'Save password'}
            </Button>
            <Button size="small" onClick={() => { logout(); navigate('/login', { replace: true }); }}>Sign out</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
