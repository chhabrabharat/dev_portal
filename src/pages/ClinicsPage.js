import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Link as RouterLink } from 'react-router-dom';
import { CategoryChip, ScoreChip } from '../components/clinics/Pills';
import CategoryDialog from '../components/clinics/CategoryDialog';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import { errorMessage, fetchClinicCounts, fetchClinics, setClinicCategoryBulk } from '../services/api';
import { COLORS } from '../styles/js/styleConstants';
import { SCORE_BANDS } from '../styles/js/adminTokens';
import { count, dateOnly, relativeDays } from '../utils/format';

const FILTERS = [
  ['ALL', 'All', 'all'], ['DEMO', 'Demo', 'demo'], ['TRIAL', 'Trial', 'trial'],
  ['PAID', 'Paid', 'paid'], ['INACTIVE', 'Inactive', 'inactive'], ['UNCLASSIFIED', 'Unclassified', 'unclassified'],
];
const SORTS = [
  ['', 'Newest'], ['activity', 'Last activity'], ['name', 'Name'], ['category', 'Category'],
  ['doctors', 'Doctors'], ['score', 'Google score'], ['referred', 'Referred by'],
];

export default function ClinicsPage() {
  const navigate = useNavigate();
  const { canWrite } = usePlatformAuth();
  const mobile = useMediaQuery('(max-width:760px)');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState(null);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [band, setBand] = useState('ALL');
  const [sort, setSort] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, c] = await Promise.all([
        fetchClinics({ category, search, scoreBand: band, sort }),
        fetchClinicCounts(),
      ]);
      setRows(list);
      setCounts(c);
      setSelected([]);
    } catch (e) {
      setError(errorMessage(e, 'Could not load clinics'));
    } finally {
      setLoading(false);
    }
  }, [category, search, band, sort]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const allSelected = useMemo(() => rows.length > 0 && selected.length === rows.length, [rows, selected]);
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const open = (id) => navigate(`/clinics/${id}`);

  const lastSeen = (d) => (d ? `${relativeDays(d)}` : 'Never');

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>Clinics</Typography>
        <Button component={RouterLink} to="/clinics/stats" variant="outlined" size="small">Full stats</Button>
      </Box>

      {/* Category chips double as the count summary; horizontally scrollable on a phone. */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto', pb: 0.5 }}>
        {FILTERS.map(([key, label, countKey]) => (
          <Chip
            key={key}
            label={`${label}${counts ? ` · ${count(counts[countKey])}` : ''}`}
            color={category === key ? 'primary' : 'default'}
            variant={category === key ? 'filled' : 'outlined'}
            onClick={() => setCategory(key)}
            sx={{ fontWeight: 600, flexShrink: 0 }}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Search clinic, owner, doctor, city, phone" value={search} size="small"
          onChange={(e) => setSearch(e.target.value)} sx={{ flex: '1 1 260px', minWidth: 220 }}
        />
        <TextField select label="Google score" value={band} size="small" onChange={(e) => setBand(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="ALL">Any</MenuItem>
          {Object.entries(SCORE_BANDS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
        </TextField>
        <TextField select label="Sort" value={sort} size="small" onChange={(e) => setSort(e.target.value)} sx={{ minWidth: 150 }}>
          {SORTS.map(([k, v]) => <MenuItem key={k || 'new'} value={k}>{v}</MenuItem>)}
        </TextField>
      </Box>

      {canWrite && selected.length > 0 && (
        <Alert
          severity="info" sx={{ mb: 2 }}
          action={<Button size="small" onClick={() => setBulkOpen(true)}>Change category</Button>}
        >
          {selected.length} selected
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {mobile ? (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {loading && <LinearProgress />}
          {rows.map((r) => (
            <Card key={r.id} sx={{ p: 1.5, cursor: 'pointer' }} onClick={() => open(r.id)}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }} noWrap>{r.name}</Typography>
                  <Typography variant="body2" sx={{ color: COLORS.textMuted }} noWrap>
                    {[r.owner, r.city].filter(Boolean).join(' · ') || '—'}
                  </Typography>
                </Box>
                <CategoryChip category={r.category} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="body2">{count(r.doctors)} doctors</Typography>
                <Typography variant="body2">{count(r.patients)} patients</Typography>
                <ScoreChip score={r.googleScore} status={r.googleStatus} />
              </Box>
              <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                Last activity: {lastSeen(r.lastActivityAt)}{r.referredBy ? ` · Referred by ${r.referredBy}` : ''}
              </Typography>
            </Card>
          ))}
          {!loading && rows.length === 0 && <Typography sx={{ color: COLORS.textMuted, p: 2 }}>No clinics match.</Typography>}
        </Box>
      ) : (
        <Card>
          {loading && <LinearProgress />}
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 1100 }}>
              <TableHead>
                <TableRow>
                  {canWrite && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small" checked={allSelected}
                        indeterminate={selected.length > 0 && !allSelected}
                        onChange={() => setSelected(allSelected ? [] : rows.map((r) => r.id))}
                      />
                    </TableCell>
                  )}
                  <TableCell>Clinic</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Referred by</TableCell>
                  <TableCell align="right">Branches</TableCell>
                  <TableCell align="right">Doctors</TableCell>
                  <TableCell align="right">Patients</TableCell>
                  <TableCell align="right">WhatsApp 30d</TableCell>
                  <TableCell>Google score</TableCell>
                  <TableCell>Last activity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => open(r.id)}>
                    {canWrite && (
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox size="small" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{r.name}</Typography>
                      <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                        {[r.owner, r.city].filter(Boolean).join(' · ')}
                      </Typography>
                    </TableCell>
                    <TableCell><CategoryChip category={r.category} /></TableCell>
                    <TableCell>{r.referredBy || '—'}</TableCell>
                    <TableCell align="right">{count(r.branches)}</TableCell>
                    <TableCell align="right">{count(r.doctors)}</TableCell>
                    <TableCell align="right">{count(r.patients)}</TableCell>
                    <TableCell align="right">{count(r.whatsappSent30d)}</TableCell>
                    <TableCell><ScoreChip score={r.googleScore} status={r.googleStatus} /></TableCell>
                    <TableCell title={r.lastActivityAt ? dateOnly(r.lastActivityAt) : ''}>{lastSeen(r.lastActivityAt)}</TableCell>
                  </TableRow>
                ))}
                {!loading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={10} sx={{ color: COLORS.textMuted, py: 4, textAlign: 'center' }}>No clinics match.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <CategoryDialog
        bulk open={bulkOpen} onClose={() => setBulkOpen(false)}
        title={`Change category for ${selected.length} clinics`}
        onSave={async (b) => { await setClinicCategoryBulk({ clinicIds: selected, ...b }); await load(); }}
      />
    </Box>
  );
}
