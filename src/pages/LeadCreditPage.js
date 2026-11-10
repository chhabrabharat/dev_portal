import React, { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import LinearProgress from '@mui/material/LinearProgress';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import StatusChip from '../components/StatusChip';
import { errorMessage, fetchLeadCredit, fetchLeadCreditCsv } from '../services/api';
import { COLORS } from '../styles/js/styleConstants';
import { count, dateOnly, daysAgo, today } from '../utils/format';
import { downloadBlob } from '../utils/staff';

const percent = (rate) => (rate === null || rate === undefined ? '—' : `${(rate * 100).toFixed(1)}%`);

function Tile({ label, value, hint }) {
  return (
    <Box sx={{ backgroundColor: COLORS.backgroundCard, border: `1px solid ${COLORS.borderLight}`, borderRadius: 2, px: 1.5, py: 1, minWidth: 130 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{count(value)}</Typography>
      <Typography variant="caption" sx={{ color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>{label}</Typography>
      {hint && <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block' }}>{hint}</Typography>}
    </Box>
  );
}

function PersonRow({ row }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover>
        <TableCell sx={{ width: 40 }}>
          {row.clinicsClosed.length > 0 && (
            <IconButton size="small" aria-label="Show clinics closed" onClick={() => setOpen((o) => !o)}>
              {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>
          <Typography component={RouterLink} to={`/staff/${row.staffId}`} variant="body2" sx={{ fontWeight: 600, color: COLORS.textPrimary, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
            {row.name}
          </Typography>
          <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block' }}>
            {row.employeeCode}{row.status === 'RELEASED' ? ' · released' : ''}
          </Typography>
        </TableCell>
        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{count(row.generated)}</TableCell>
        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{count(row.closed)}</TableCell>
        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{percent(row.conversionRate)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={5} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ py: 1.5, pl: 5, display: 'grid', gap: 0.75 }}>
              {row.clinicsClosed.map((c) => (
                <Box key={c.leadId} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.accountName || c.leadName}</Typography>
                  <Typography variant="caption" sx={{ color: COLORS.textMuted }}>closed {dateOnly(c.closedOn)}</Typography>
                  {/* A linked clinic with no status is its own state; an unlinked lead has no clinic to have one. */}
                  {c.accountLinked
                    ? <StatusChip status={c.accountStatus} />
                    : <Typography variant="caption" sx={{ color: COLORS.textMuted }}>not linked to a clinic account</Typography>}
                </Box>
              ))}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function LeadCreditPage() {
  const [from, setFrom] = useState(daysAgo(89));
  const [to, setTo] = useState(today());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (f, t) => {
    setLoading(true);
    try {
      setReport(await fetchLeadCredit({ from: f, to: t }));
      setError(null);
    } catch (e) {
      setError(errorMessage(e, 'Could not load the report'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(daysAgo(89), today()); }, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      downloadBlob(await fetchLeadCreditCsv({ from, to }), `lead-credit-${from}-to-${to}.csv`);
    } catch (e) {
      setError(errorMessage(e, 'Could not export'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>Lead credit</Typography>
      <Typography variant="body2" sx={{ color: COLORS.textMuted, mb: 2 }}>
        Who found each sales lead and who took it live. Counts only: no salary, bonus or amount is shown here.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
        <Button variant="contained" size="small" onClick={() => load(from, to)} disabled={loading || !from || !to}>Apply</Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" size="small" onClick={exportCsv} disabled={exporting || !report}>{exporting ? 'Exporting…' : 'Export CSV'}</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {report && (
        <>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Tile label="Leads generated" value={report.generatedTotal} />
            <Tile label="Leads closed" value={report.closedTotal} />
            <Tile label="Generated, nobody credited" value={report.unattributedGenerated} />
            <Tile label="Closed, nobody credited" value={report.unattributedClosed} />
          </Box>
          <Card>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 560 }}>
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell sx={{ fontWeight: 700 }}>Person</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Generated</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Closed</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Conversion</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.rows.map((r) => <PersonRow key={r.staffId} row={r} />)}
                  {report.rows.length === 0 && (
                    <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', color: COLORS.textMuted, py: 4 }}>No staff profiles yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
          <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', mt: 1 }}>
            {dateOnly(report.from)} to {dateOnly(report.to)}. Generated counts leads added in the range; closed counts leads that went live in it.
            Conversion is closed ÷ generated for the same range, so it can pass 100% when the range closes leads found earlier.
          </Typography>
        </>
      )}
    </Box>
  );
}
