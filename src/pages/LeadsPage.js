import React, { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
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
import Tooltip from '@mui/material/Tooltip';
import { assignLead, errorMessage, fetchAccounts, fetchLeads } from '../services/api';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import { COLORS } from '../styles/js/styleConstants';
import { dateTime, relativeDays } from '../utils/format';

// Tri-state filter. `undefined` means "don't send the param at all" - see fetchLeads.
const FILTERS = [
  { label: 'Unclaimed', value: 'false', assigned: false },
  { label: 'Assigned', value: 'true', assigned: true },
  { label: 'All', value: 'all', assigned: undefined },
];

// Sentinel for "put this lead back in the unclaimed pool". Can't use '' as the MenuItem value and
// also mean "nothing selected", so unassigning is its own explicit option.
const UNASSIGN = '__unassign__';

export default function LeadsPage() {
  const { canWrite } = usePlatformAuth();
  const [filter, setFilter] = useState('false');
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [dialog, setDialog] = useState({ open: false, lead: null, accountId: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const chosen = FILTERS.find((f) => f.value === filter);
      setLeads(await fetchLeads({ assigned: chosen?.assigned, search }));
    } catch (e) {
      setError(errorMessage(e, 'Could not load leads'));
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    // The clinic list only backs the assign dropdown, so one fetch on mount is enough.
    fetchAccounts().then(setAccounts).catch(() => setAccounts([]));
  }, []);

  const submitAssignment = async () => {
    setSaving(true);
    setError(null);
    try {
      const accountId = dialog.accountId === UNASSIGN ? null : Number(dialog.accountId);
      await assignLead(dialog.lead.id, accountId);
      setNotice(
        accountId === null
          ? `Returned "${dialog.lead.name || 'lead'}" to the unclaimed pool.`
          : `Assigned "${dialog.lead.name || 'lead'}" to ${
              accounts.find((a) => a.id === accountId)?.name || `clinic #${accountId}`
            }.`
      );
      setDialog({ open: false, lead: null, accountId: '' });
      await load();
    } catch (e) {
      setError(errorMessage(e, 'Could not assign this lead'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>
        Leads
      </Typography>
      <Typography variant="body2" sx={{ color: COLORS.textMuted, mb: 2 }}>
        Contact-us submissions from the marketing site. Unclaimed leads are visible here and
        nowhere else — the clinic-facing app only ever shows a clinic its own claimed leads.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Show"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 160 }}
        >
          {FILTERS.map((f) => (
            <MenuItem key={f.value} value={f.value}>
              {f.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Search name, email, phone, subject"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 320 }}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}

      <Card>
        {loading && <LinearProgress />}
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Received</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Message</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Assigned to</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title={dateTime(l.createdAt)}>
                      <span>{relativeDays(l.createdAt)}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {l.name || '—'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block' }}>
                      {[l.email, l.phone].filter(Boolean).join(' · ') || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{l.subject || '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 340 }}>
                    <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                      {l.message || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {l.assignedAccountId ? (
                      <Chip size="small" label={l.assignedAccountName || `#${l.assignedAccountId}`} />
                    ) : (
                      <Chip size="small" label="Unclaimed" sx={{ backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 600 }} />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={canWrite ? '' : 'PLATFORM_SUPPORT is read-only'}>
                      <span>
                        <Button
                          size="small"
                          disabled={!canWrite}
                          onClick={() =>
                            setDialog({
                              open: true,
                              lead: l,
                              accountId: l.assignedAccountId ? String(l.assignedAccountId) : '',
                            })
                          }
                        >
                          {l.assignedAccountId ? 'Reassign' : 'Assign'}
                        </Button>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && leads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5, color: COLORS.textMuted }}>
                    No leads match that filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, lead: null, accountId: '' })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Assign lead</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: COLORS.textMuted, mb: 2 }}>
            {dialog.lead?.name} — {dialog.lead?.email || dialog.lead?.phone}
          </Typography>
          <TextField
            select
            label="Clinic"
            value={dialog.accountId}
            onChange={(e) => setDialog((prev) => ({ ...prev, accountId: e.target.value }))}
            fullWidth
          >
            <MenuItem value={UNASSIGN}>— Return to unclaimed pool —</MenuItem>
            {accounts.map((a) => (
              <MenuItem key={a.id} value={String(a.id)}>
                {a.name || `Clinic #${a.id}`}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, lead: null, accountId: '' })}>Cancel</Button>
          <Button variant="contained" onClick={submitAssignment} disabled={saving || !dialog.accountId}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
