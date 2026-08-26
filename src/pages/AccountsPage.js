import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import StatusChip from '../components/StatusChip';
import StatCard from '../components/StatCard';
import { errorMessage, fetchAccounts } from '../services/api';
import { COLORS } from '../styles/js/styleConstants';
import { SETTABLE_STATUSES } from '../styles/js/adminTokens';
import { count, dateOnly, relativeDays } from '../utils/format';

const COLUMNS = [
  { key: 'name', label: 'Clinic', numeric: false },
  { key: 'status', label: 'Status', numeric: false, sortable: false },
  { key: 'locations', label: 'Locations', numeric: true },
  { key: 'doctors', label: 'Doctors', numeric: true },
  { key: 'patients', label: 'Patients', numeric: true },
  { key: 'staffUsers', label: 'Logins', numeric: true },
  { key: 'appointments', label: 'Appointments', numeric: true },
  { key: 'lastActivityAt', label: 'Last activity', numeric: false },
];

export default function AccountsPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState({ key: 'appointments', dir: 'desc' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAccounts(await fetchAccounts({ search, status }));
    } catch (e) {
      setError(errorMessage(e, 'Could not load clinics'));
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    // Debounced so typing in the search box doesn't fire a request per keystroke. The status
    // select is in the same effect deliberately - it changes rarely, and paying 300ms for it is
    // cheaper than maintaining two code paths.
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const sorted = useMemo(() => {
    const rows = [...accounts];
    const { key, dir } = sort;
    rows.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      // Nulls always last regardless of direction - a clinic with no activity at all shouldn't
      // jump to the top of a descending sort just because null compares low.
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return dir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [accounts, sort]);

  const totals = useMemo(
    () => ({
      clinics: accounts.length,
      dormant: accounts.filter((a) => !a.lastActivityAt).length,
      blocked: accounts.filter((a) => a.status === 'ON_HOLD' || a.status === 'INACTIVE').length,
      unset: accounts.filter((a) => !a.status).length,
    }),
    [accounts]
  );

  const toggleSort = (key) =>
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }));

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary, mb: 2 }}>
        Clinics
      </Typography>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', mb: 3 }}>
        <StatCard label="Clinics" value={count(totals.clinics)} />
        <StatCard label="Never used" value={count(totals.dormant)} hint="no appointment ever booked" />
        <StatCard label="Locked out" value={count(totals.blocked)} hint="on hold or inactive" />
        <StatCard label="No status set" value={count(totals.unset)} hint="signed up, never triaged" />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Search name, owner, city, email, phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 320 }}
        />
        <TextField
          select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          size="small"
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="ALL">All</MenuItem>
          {SETTABLE_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        {loading && <LinearProgress />}
        {/* Wide table scrolls inside its own container so the page body never scrolls sideways. */}
        <TableContainer sx={{ overflowX: 'auto' }}>
          {/* minWidth over-rides the container squeeze: without it, 8 columns compress into
              the available width and the clinic name wraps to 3-4 lines. The container's
              overflow-x already handles the resulting scroll. */}
          <Table size="small" sx={{ minWidth: 1080 }}>
            <TableHead>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableCell
                    key={col.key}
                    align={col.numeric ? 'right' : 'left'}
                    sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    {col.sortable === false ? (
                      col.label
                    ) : (
                      <TableSortLabel
                        active={sort.key === col.key}
                        direction={sort.key === col.key ? sort.dir : 'desc'}
                        onClick={() => toggleSort(col.key)}
                      >
                        {col.label}
                      </TableSortLabel>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((a) => (
                <TableRow
                  key={a.id}
                  hover
                  onClick={() => navigate(`/accounts/${a.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ minWidth: 220 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {a.name || `Clinic #${a.id}`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                      {[a.owner, a.city].filter(Boolean).join(' · ') || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={a.status} />
                  </TableCell>
                  <TableCell align="right">{count(a.locations)}</TableCell>
                  <TableCell align="right">{count(a.doctors)}</TableCell>
                  <TableCell align="right">{count(a.patients)}</TableCell>
                  <TableCell align="right">{count(a.staffUsers)}</TableCell>
                  <TableCell align="right">{count(a.appointments)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {a.lastActivityAt ? (
                      <Tooltip title={dateOnly(a.lastActivityAt)}>
                        <span>{relativeDays(a.lastActivityAt)}</span>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" sx={{ color: COLORS.error, fontWeight: 600 }}>
                        never
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 5, color: COLORS.textMuted }}>
                    No clinics match that filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
