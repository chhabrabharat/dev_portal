import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import StatCard from '../components/StatCard';
import {
  errorMessage, fetchDaywiseCsv, fetchDaywiseStats, fetchWhatsappStats,
} from '../services/api';
import { COLORS } from '../styles/js/styleConstants';
import { BOOKING_SOURCES, SETTABLE_CATEGORIES, categoryToken } from '../styles/js/adminTokens';
import { count } from '../utils/format';

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const SOURCE_LABEL = Object.fromEntries(BOOKING_SOURCES);

/** Bars for one metric over the range; plain SVG so the page adds no chart dependency. */
function Bars({ days, pick, title }) {
  const max = Math.max(1, ...days.map(pick));
  const w = 600; const h = 90; const bw = w / Math.max(days.length, 1);
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{title}</Typography>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={title} preserveAspectRatio="none">
        {days.map((d, i) => {
          const bh = (pick(d) / max) * (h - 4);
          return <rect key={d.date} x={i * bw + 0.5} y={h - bh} width={Math.max(bw - 1, 1)} height={bh} fill={COLORS.primary}><title>{`${d.date}: ${pick(d)}`}</title></rect>;
        })}
      </svg>
    </Card>
  );
}

export default function ClinicStatsPage() {
  const [params] = useSearchParams();
  const clinicId = params.get('clinicId') || '';
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(iso(new Date()));
  const [category, setCategory] = useState('ALL');
  const [source, setSource] = useState('ALL');
  const [data, setData] = useState(null);
  const [wa, setWa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const query = useMemo(() => ({ from, to, category, source, clinicId }), [from, to, category, source, clinicId]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { source: _s, ...waQuery } = query;
      const [d, w] = await Promise.all([fetchDaywiseStats(query), fetchWhatsappStats(waQuery)]);
      setData(d); setWa(w);
    } catch (e) { setError(errorMessage(e, 'Could not load stats')); } finally { setLoading(false); }
  }, [query]);
  useEffect(() => { if (from && to && from <= to) load(); }, [load, from, to]);

  const exportCsv = async () => {
    try {
      const blob = await fetchDaywiseCsv(query);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `clinic-stats-${from}_${to}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(errorMessage(e, 'Export failed')); }
  };

  const t = data?.totals;
  const days = data?.days || [];
  const rangeBad = from > to;

  return (
    <Box>
      <Button component={RouterLink} to={clinicId ? `/clinics/${clinicId}` : '/clinics'} size="small" sx={{ mb: 1 }}>← Back</Button>
      <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary, mb: 0.5 }}>Clinic stats</Typography>
      <Typography variant="body2" sx={{ color: COLORS.textMuted, mb: 2 }}>
        {clinicId ? `Clinic #${clinicId}` : 'All clinics'} · counts only, no patient data. Prescriptions are issued ones.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <TextField size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        {!clinicId && (
          <TextField select size="small" label="Category" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="ALL">All</MenuItem>
            {SETTABLE_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{categoryToken(c).label}</MenuItem>)}
          </TextField>
        )}
        <TextField select size="small" label="Booking source" value={source} onChange={(e) => setSource(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="ALL">All sources</MenuItem>
          {BOOKING_SOURCES.map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
        </TextField>
        <Button variant="outlined" size="small" onClick={exportCsv} disabled={!data || rangeBad}>Export CSV</Button>
      </Box>

      {rangeBad && <Alert severity="warning" sx={{ mb: 2 }}>"From" is after "To".</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {t && (
        <>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', mb: 2 }}>
            <StatCard label="Prescriptions" value={count(t.prescriptions)} />
            <StatCard label="New patients" value={count(t.newPatients)} hint={`${count(t.totalPatients)} total`} />
            <StatCard label="Bookings" value={count(t.bookings)}
              hint={Object.entries(t.bookingsBySource || {}).map(([k, v]) => `${SOURCE_LABEL[k] || k} ${v}`).join(' · ') || undefined} />
            <StatCard label="WhatsApp sent" value={count(t.whatsappSent)} hint={`${count(t.whatsappFailed)} failed`} />
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', mb: 2 }}>
            <Bars days={days} pick={(d) => d.prescriptions} title="Prescriptions per day" />
            <Bars days={days} pick={(d) => d.newPatients} title="New patients per day" />
            <Bars days={days} pick={(d) => d.bookings} title="Bookings per day" />
          </Box>

          {wa && (
            <Card sx={{ p: 2, mb: 2 }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>WhatsApp messages</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {count(wa.sent)} sent · {wa.deliveryRate}% delivered · {wa.readRate}% read · {count(wa.failed)} failed
              </Typography>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 480 }}>
                  <TableHead><TableRow>
                    <TableCell>Message</TableCell><TableCell align="right">Sent</TableCell><TableCell align="right">Delivered</TableCell>
                    <TableCell align="right">Read</TableCell><TableCell align="right">Failed</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {(wa.byKind || []).map((k) => (
                      <TableRow key={k.kind}>
                        <TableCell>{k.kind}</TableCell>
                        <TableCell align="right">{count(k.sent)}</TableCell><TableCell align="right">{count(k.delivered)}</TableCell>
                        <TableCell align="right">{count(k.read)}</TableCell><TableCell align="right">{count(k.failed)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {Object.keys(wa.failureReasons || {}).length > 0 && (
                <Typography variant="body2" sx={{ mt: 1, color: COLORS.textMuted }}>
                  Failures: {Object.entries(wa.failureReasons).map(([r, n]) => `${r} (${n})`).join(' · ')}
                </Typography>
              )}
            </Card>
          )}

          <Card>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 760 }}>
                <TableHead><TableRow>
                  <TableCell>Date</TableCell><TableCell align="right">Prescriptions</TableCell><TableCell align="right">New patients</TableCell>
                  <TableCell align="right">Total patients</TableCell><TableCell align="right">Bookings</TableCell>
                  <TableCell align="right">WA sent</TableCell><TableCell align="right">WA read</TableCell><TableCell align="right">WA failed</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {[...days].reverse().map((d) => (
                    <TableRow key={d.date} hover>
                      <TableCell>{d.date}</TableCell>
                      <TableCell align="right">{count(d.prescriptions)}</TableCell>
                      <TableCell align="right">{count(d.newPatients)}</TableCell>
                      <TableCell align="right">{count(d.totalPatients)}</TableCell>
                      <TableCell align="right">{count(d.bookings)}</TableCell>
                      <TableCell align="right">{count(d.whatsappSent)}</TableCell>
                      <TableCell align="right">{count(d.whatsappRead)}</TableCell>
                      <TableCell align="right">{count(d.whatsappFailed)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}
    </Box>
  );
}
