import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import StatusChip from '../components/StatusChip';
import StatCard from '../components/StatCard';
import { errorMessage, fetchAccount, updateAccountStatus } from '../services/api';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import { COLORS } from '../styles/js/styleConstants';
import { LOGIN_BLOCKING_STATUSES, SETTABLE_STATUSES } from '../styles/js/adminTokens';
import { count, dateTime, relativeDays } from '../utils/format';

function Field({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

export default function AccountDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canWrite } = usePlatformAuth();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [statusDialog, setStatusDialog] = useState({ open: false, value: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await fetchAccount(id));
    } catch (e) {
      setError(errorMessage(e, 'Could not load this clinic'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const applyStatus = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAccountStatus(id, statusDialog.value);
      setDetail(updated);
      setNotice(`Status set to ${statusDialog.value}.`);
      setStatusDialog({ open: false, value: '' });
    } catch (e) {
      setError(errorMessage(e, 'Could not change the status'));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !detail) return <LinearProgress />;
  if (error && !detail) return <Alert severity="error">{error}</Alert>;
  if (!detail) return null;

  const s = detail.summary;
  const willLockOut = LOGIN_BLOCKING_STATUSES.includes(statusDialog.value);

  return (
    <Box>
      <Button onClick={() => navigate('/accounts')} sx={{ mb: 1 }}>
        ← All clinics
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>
          {s.name || `Clinic #${s.id}`}
        </Typography>
        <StatusChip status={s.status} size="medium" />
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={canWrite ? '' : 'PLATFORM_SUPPORT is read-only'}>
          <span>
            <Button
              variant="contained"
              disabled={!canWrite}
              onClick={() => setStatusDialog({ open: true, value: s.status || 'ACTIVE' })}
            >
              Change status
            </Button>
          </span>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
      {!s.status && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This clinic has no status set at all — self-serve signup doesn&apos;t assign one. It can
          still log in, but nothing on the company side has triaged it yet.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', mb: 3 }}>
        <StatCard label="Locations" value={count(s.locations)} />
        <StatCard label="Doctors" value={count(s.doctors)} />
        <StatCard label="Patients" value={count(s.patients)} />
        <StatCard label="Logins" value={count(s.staffUsers)} />
        <StatCard label="Appointments" value={count(s.appointments)} />
        <StatCard
          label="Last activity"
          value={s.lastActivityAt ? relativeDays(s.lastActivityAt) : 'never'}
          hint={s.lastActivityAt ? dateTime(s.lastActivityAt) : 'no appointment ever booked'}
        />
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Account
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <Field label="Owner" value={s.owner} />
            <Field label="Signed up" value={dateTime(s.createdAt)} />
            <Field label="Primary email" value={s.primaryEmail} />
            <Field label="Primary phone" value={s.primaryContactNumber} />
            <Field label="Secondary email" value={detail.secondaryEmail} />
            <Field label="Secondary phone" value={detail.secondaryContactNumber} />
            <Field
              label="Address"
              value={[detail.addressLine1, detail.addressLine2, s.city, s.state, detail.postalCode, detail.country]
                .filter(Boolean)
                .join(', ')}
            />
            <Field label="Licence no." value={detail.licenceNumber} />
            <Field label="GST no." value={detail.gstNumber} />
            <Field label="UPI collection ID" value={detail.upiId} />
            <Field label="Description" value={detail.description} />
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Locations ({detail.locationRows.length})
          </Typography>
        </CardContent>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>City</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Doctors</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Patients</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.locationRows.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.name || '—'}</TableCell>
                  <TableCell>{l.city || '—'}</TableCell>
                  <TableCell>{l.phone || '—'}</TableCell>
                  <TableCell align="right">{count(l.doctors)}</TableCell>
                  <TableCell align="right">{count(l.patients)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
        <Card>
          <CardContent sx={{ pb: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Logins ({detail.staffUserRows.length})
            </Typography>
            <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
              Read-only. This portal cannot reset a clinic user&apos;s password.
            </Typography>
          </CardContent>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Username</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Roles</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.staffUserRows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</TableCell>
                    <TableCell>
                      {u.roles.length === 0
                        ? '—'
                        : u.roles.map((r) => <Chip key={r} size="small" label={r} sx={{ mr: 0.5 }} />)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        <Card>
          <CardContent sx={{ pb: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Doctors ({detail.doctorRows.length})
            </Typography>
          </CardContent>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Specialization</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Qualification</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.doctorRows.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.name || '—'}</TableCell>
                    <TableCell>{d.specialization || '—'}</TableCell>
                    <TableCell>{d.qualification || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>

      <Dialog open={statusDialog.open} onClose={() => setStatusDialog({ open: false, value: '' })} fullWidth maxWidth="xs">
        <DialogTitle>Change clinic status</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField
            select
            label="Status"
            value={statusDialog.value}
            onChange={(e) => setStatusDialog((prev) => ({ ...prev, value: e.target.value }))}
            fullWidth
          >
            {SETTABLE_STATUSES.map((s2) => (
              <MenuItem key={s2} value={s2}>
                {s2}
              </MenuItem>
            ))}
          </TextField>
          {/* Naming the consequence explicitly: ON_HOLD/INACTIVE are enforced at clinic login,
              so this is not a label change - it locks every user at this clinic out. */}
          {willLockOut && (
            <Alert severity="warning">
              <strong>{statusDialog.value}</strong> blocks login for all {count(s.staffUsers)} user
              {s.staffUsers === 1 ? '' : 's'} at this clinic. They will be told to contact support.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog({ open: false, value: '' })}>Cancel</Button>
          <Button
            variant="contained"
            color={willLockOut ? 'error' : 'primary'}
            onClick={applyStatus}
            disabled={saving || !statusDialog.value}
          >
            {saving ? 'Saving…' : willLockOut ? 'Lock them out' : 'Apply'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
