import React, { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Snackbar from '@mui/material/Snackbar';
import Tooltip from '@mui/material/Tooltip';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import { createOperator, errorMessage, fetchOperators, setOperatorPassword, updateOperator } from '../services/api';
import { COLORS } from '../styles/js/styleConstants';
import { ROLE_LABELS } from '../utils/roles';
import { dateTime } from '../utils/format';

const ROLES = ['PLATFORM_ADMIN', 'PLATFORM_SALES', 'PLATFORM_SUPPORT'];
const EMPTY = { username: '', password: '', firstName: '', lastName: '', email: '', role: 'PLATFORM_SALES' };

/**
 * Company operator logins. Admin-only (the route guard and the server both enforce it).
 *
 * Create a login, change its role, reset its password, deactivate it. There is no delete: a
 * platform_user row is referenced from audit columns, pipeline history and lead ownership, so
 * removing access means `active = false`, and that takes effect on the person's very next
 * request (PlatformJwtFilter re-reads the row every time). The server refuses to let an admin
 * deactivate or demote themselves, and protects the last active admin.
 */
export default function TeamPage() {
  const { operator } = usePlatformAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [pwFor, setPwFor] = useState(null);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchOperators());
      setError(null);
    } catch (e) {
      setError(errorMessage(e, 'Could not load the team'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const replace = (row) => setRows((rs) => rs.map((r) => (r.id === row.id ? row : r)));

  const submitCreate = async () => {
    setBusy(true);
    setDialogError(null);
    try {
      const row = await createOperator({
        username: form.username.trim(),
        password: form.password,
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        email: form.email.trim() || null,
        role: form.role,
      });
      setRows((rs) => [...rs, row]);
      setCreateOpen(false);
      setForm(EMPTY);
      setToast(`Created ${row.username}. Share the username and password with them directly.`);
    } catch (e) {
      setDialogError(errorMessage(e, 'Could not create the login'));
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (row, role) => {
    try {
      replace(await updateOperator(row.id, { role }));
      setToast(`${row.username} is now ${ROLE_LABELS[role]?.label || role}.`);
    } catch (e) {
      setToast(errorMessage(e, 'Could not change the role'));
    }
  };

  const toggleActive = async (row) => {
    try {
      replace(await updateOperator(row.id, { active: !row.active }));
      setToast(row.active ? `${row.username} can no longer sign in.` : `${row.username} can sign in again.`);
    } catch (e) {
      setToast(errorMessage(e, 'Could not change this login'));
    }
  };

  const submitPassword = async () => {
    setBusy(true);
    setDialogError(null);
    try {
      await setOperatorPassword(pwFor.id, pw);
      setToast(`Password changed for ${pwFor.username}.`);
      setPwFor(null);
      setPw('');
    } catch (e) {
      setDialogError(errorMessage(e, 'Could not change the password'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>Team</Typography>
          <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
            Who can sign in to this console, and as what. Sales logins see only the Pipeline and Leads tabs.
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => { setForm(EMPTY); setDialogError(null); setCreateOpen(true); }}>
          + Add login
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Added</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const me = row.id === operator?.userId;
                return (
                  <TableRow key={row.id} sx={{ opacity: row.active ? 1 : 0.55 }}>
                    <TableCell sx={{ fontWeight: 600 }}>{row.username}{me ? ' (you)' : ''}</TableCell>
                    <TableCell>{[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}</TableCell>
                    <TableCell>{row.email || '—'}</TableCell>
                    <TableCell>
                      <Tooltip title={me ? 'Ask another admin to change your role' : ROLE_LABELS[row.role]?.hint || ''}>
                        <TextField
                          select
                          size="small"
                          value={row.role}
                          disabled={me || !row.active}
                          onChange={(e) => changeRole(row, e.target.value)}
                          sx={{ minWidth: 150, '& .MuiSelect-select': { py: 0.5, fontSize: 13 } }}
                        >
                          {ROLES.map((r) => <MenuItem key={r} value={r}>{ROLE_LABELS[r].label}</MenuItem>)}
                        </TextField>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={row.active ? 'Active' : 'Deactivated'}
                        sx={{ fontWeight: 600, color: row.active ? '#065f46' : COLORS.textMuted, backgroundColor: row.active ? '#d1fae5' : '#f1f5f9' }} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', color: COLORS.textMuted }}>{row.createdAt ? dateTime(row.createdAt) : '—'}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Button size="small" onClick={() => { setPwFor(row); setPw(''); setDialogError(null); }}>Set password</Button>
                      <Tooltip title={me ? 'You cannot deactivate yourself' : ''}>
                        <span>
                          <Button size="small" color={row.active ? 'error' : 'primary'} disabled={me} onClick={() => toggleActive(row)}>
                            {row.active ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && rows.length === 0 && (
                <TableRow><TableCell colSpan={7} sx={{ color: COLORS.textMuted, textAlign: 'center', py: 3 }}>No operators.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <Dialog open={createOpen} onClose={() => !busy && setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Add a login</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: '8px !important' }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <TextField size="small" label="Username" required autoFocus value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
            helperText="Letters, digits, dot, dash, underscore. Lower-cased." />
          <TextField size="small" label="Password" required type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            helperText="At least 8 characters. Shown in clear so you can pass it on; they can't change it themselves yet." />
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField size="small" label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} fullWidth />
            <TextField size="small" label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} fullWidth />
          </Box>
          <TextField size="small" label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            helperText="Where the 08:00 pipeline reminder goes for leads they own." />
          <TextField select size="small" label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            helperText={ROLE_LABELS[form.role]?.hint}>
            {ROLES.map((r) => <MenuItem key={r} value={r}>{ROLE_LABELS[r].label}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={submitCreate} disabled={busy || !form.username.trim() || form.password.length < 8}>
            {busy ? 'Creating…' : 'Create login'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!pwFor} onClose={() => !busy && setPwFor(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Set password for {pwFor?.username}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: '8px !important' }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <TextField size="small" label="New password" type="text" autoFocus value={pw} onChange={(e) => setPw(e.target.value)}
            helperText="At least 8 characters. Their current session keeps working until they sign out." />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPwFor(null)} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={submitPassword} disabled={busy || pw.length < 8}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}
