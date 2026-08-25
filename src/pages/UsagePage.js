import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import StatusChip from '../components/StatusChip';
import StatCard from '../components/StatCard';
import { errorMessage, fetchUsage } from '../services/api';
import { COLORS } from '../styles/js/styleConstants';
import { count, daysAgo, money, today } from '../utils/format';

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
];

export default function UsagePage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await fetchUsage({ from, to }));
    } catch (e) {
      // A from-after-to range is answered by the API with a 400 and a specific message; surface
      // it rather than a generic failure, since it's the operator's input that's wrong.
      setError(errorMessage(e, 'Could not load the usage report'));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const dormant = useMemo(
    () => (report ? report.rows.filter((r) => r.appointments === 0 && r.invoices === 0).length : 0),
    [report]
  );

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary, mb: 2 }}>
        Usage
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 3 }}>
        <ButtonGroup size="small">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              variant={from === daysAgo(p.days) && to === today() ? 'contained' : 'outlined'}
              onClick={() => {
                setFrom(daysAgo(p.days));
                setTo(today());
              }}
            >
              {p.label}
            </Button>
          ))}
        </ButtonGroup>
        <TextField
          label="From"
          type="date"
          size="small"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
          Both dates inclusive
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {report && (
        <>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', mb: 3 }}>
            <StatCard
              label="Clinics with activity"
              value={`${count(report.accountsWithActivity)} / ${count(report.totalAccounts)}`}
              hint={`${count(dormant)} booked and billed nothing`}
            />
            <StatCard label="Appointments" value={count(report.appointments)} />
            <StatCard label="Consultations" value={count(report.consultations)} />
            <StatCard label="Prescriptions" value={count(report.prescriptions)} />
            <StatCard label="Invoices" value={count(report.invoices)} />
            <StatCard
              label="Billed"
              value={money(report.billedAmount)}
              hint={`${money(report.paidAmount)} settled`}
            />
          </Box>

          <Card>
            {loading && <LinearProgress />}
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Clinic</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Appts</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Consults</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Rx</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Invoices</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Billed</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Settled</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.rows.map((r) => {
                    const idle = r.appointments === 0 && r.invoices === 0;
                    return (
                      <TableRow
                        key={r.accountId}
                        hover
                        onClick={() => navigate(`/accounts/${r.accountId}`)}
                        sx={{
                          cursor: 'pointer',
                          // Tint the rows that are the actual finding of this report.
                          backgroundColor: idle ? '#fff7ed' : undefined,
                        }}
                      >
                        <TableCell sx={{ fontWeight: 600 }}>{r.accountName || `Clinic #${r.accountId}`}</TableCell>
                        <TableCell><StatusChip status={r.status} /></TableCell>
                        <TableCell align="right">{count(r.appointments)}</TableCell>
                        <TableCell align="right">{count(r.consultations)}</TableCell>
                        <TableCell align="right">{count(r.prescriptions)}</TableCell>
                        <TableCell align="right">{count(r.invoices)}</TableCell>
                        <TableCell align="right">{money(r.billedAmount)}</TableCell>
                        <TableCell align="right">{money(r.paidAmount)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}
      {loading && !report && <LinearProgress />}
    </Box>
  );
}
