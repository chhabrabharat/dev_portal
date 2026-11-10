import React, { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import { COLORS } from '../../styles/js/styleConstants';
import { addBonus, addSalary, errorMessage, fetchCompensation } from '../../services/api';
import { dateOnly, today } from '../../utils/format';
import { moneyFromPaise, rupeesToPaise } from '../../utils/staff';

/**
 * Salary and bonuses. Rendered only for PLATFORM_ADMIN, and the server enforces the same rule:
 * this panel is never mounted for SUPPORT, because a 403 from this client logs the operator out.
 * Amounts are stored as whole paise. Nothing here is computed from lead counts.
 */
export default function PayPanel({ staffId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [salary, setSalary] = useState({ amount: '', from: today() });
  const [bonus, setBonus] = useState({ amount: '', date: today(), reason: '' });

  const load = useCallback(async () => {
    try { setData(await fetchCompensation(staffId)); setError(null); }
    catch (e) { setError(errorMessage(e, 'Could not load pay')); }
  }, [staffId]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try { await fn(); await load(); } catch (e) { setError(errorMessage(e, 'That did not save')); } finally { setBusy(false); }
  };

  const salaryPaise = rupeesToPaise(salary.amount);
  const bonusPaise = rupeesToPaise(bonus.amount);
  const current = data?.salaries?.[0];

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Visible to PLATFORM_ADMIN only. Pay never appears on an ID card, a visiting card or the lead credit report.
      </Alert>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Typography variant="overline" sx={{ color: COLORS.textMuted }}>Monthly salary</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>{current ? moneyFromPaise(current.monthlyPaise) : 'Not set'}</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <TextField size="small" label="New monthly salary (₹)" value={salary.amount} onChange={(e) => setSalary((s) => ({ ...s, amount: e.target.value }))} />
        <TextField size="small" type="date" label="Effective from" InputLabelProps={{ shrink: true }} value={salary.from}
          onChange={(e) => setSalary((s) => ({ ...s, from: e.target.value }))} />
        <Button variant="contained" size="small" disabled={busy || salaryPaise === null}
          onClick={() => run(async () => { await addSalary(staffId, { monthlyPaise: salaryPaise, effectiveFrom: salary.from }); setSalary((s) => ({ ...s, amount: '' })); })}>
          Set salary
        </Button>
      </Box>
      <TableContainer sx={{ mb: 3 }}>
        <Table size="small" sx={{ minWidth: 420 }}>
          <TableHead><TableRow>{['From', 'Monthly', 'Set by'].map((h) => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {(data?.salaries || []).map((s) => (
              <TableRow key={s.id}><TableCell>{dateOnly(s.effectiveFrom)}</TableCell><TableCell>{moneyFromPaise(s.monthlyPaise)}</TableCell><TableCell>{s.setBy}</TableCell></TableRow>
            ))}
            {data && data.salaries.length === 0 && <TableRow><TableCell colSpan={3} sx={{ color: COLORS.textMuted }}>No salary history.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="overline" sx={{ color: COLORS.textMuted }}>Bonuses</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', my: 1 }}>
        <TextField size="small" label="Amount (₹)" value={bonus.amount} onChange={(e) => setBonus((b) => ({ ...b, amount: e.target.value }))} />
        <TextField size="small" type="date" label="Date" InputLabelProps={{ shrink: true }} value={bonus.date} onChange={(e) => setBonus((b) => ({ ...b, date: e.target.value }))} />
        <TextField size="small" label="Reason" value={bonus.reason} onChange={(e) => setBonus((b) => ({ ...b, reason: e.target.value }))} sx={{ flex: '1 1 200px' }} />
        <Button variant="contained" size="small" disabled={busy || bonusPaise === null}
          onClick={() => run(async () => { await addBonus(staffId, { amountPaise: bonusPaise, bonusDate: bonus.date, reason: bonus.reason }); setBonus((b) => ({ ...b, amount: '', reason: '' })); })}>
          Record bonus
        </Button>
      </Box>
      <TableContainer>
        <Table size="small" sx={{ minWidth: 520 }}>
          <TableHead><TableRow>{['Date', 'Amount', 'Reason', 'Entered by'].map((h) => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {(data?.bonuses || []).map((b) => (
              <TableRow key={b.id}><TableCell>{dateOnly(b.bonusDate)}</TableCell><TableCell>{moneyFromPaise(b.amountPaise)}</TableCell><TableCell>{b.reason || '—'}</TableCell><TableCell>{b.setBy}</TableCell></TableRow>
            ))}
            {data && data.bonuses.length === 0 && <TableRow><TableCell colSpan={4} sx={{ color: COLORS.textMuted }}>No bonuses recorded.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
