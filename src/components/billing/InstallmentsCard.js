import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import { usePlatformAuth } from '../../context/PlatformAuthContext';
import { errorMessage, raiseInstallmentInvoice, setSalesDocumentStatus } from '../../services/api';
import { COLORS } from '../../styles/js/styleConstants';
import { STATUS_TOKENS, paise } from '../../utils/billing';

/**
 * A quotation's payment schedule with the invoice state of each installment and the one action
 * that matters: raise the invoice for an installment once its money is in. No button raises the
 * whole package - that is the point of the schedule.
 */
export default function InstallmentsCard({ doc, onChanged }) {
  const { canWrite } = usePlatformAuth();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const installments = doc.installments || [];
  if (!installments.length) return null;

  const gstOn = (p) => Math.round((p * (doc.gstRateBp || 0)) / 10000);
  const raised = installments.filter((i) => i.invoiceId).length;
  const paid = installments.filter((i) => i.invoiceStatus === 'PAID').length;
  const closed = doc.status === 'CANCELLED';

  const raise = async (n) => {
    setBusy(n);
    setError(null);
    try {
      await raiseInstallmentInvoice(doc.id, n);
      await onChanged();
    } catch (e) {
      setError(errorMessage(e, 'Could not raise the invoice'));
    } finally {
      setBusy(null);
    }
  };

  const markPaid = async (inst) => {
    setBusy(inst.n);
    setError(null);
    try {
      await setSalesDocumentStatus(inst.invoiceId, 'PAID');
      await onChanged();
    } catch (e) {
      setError(errorMessage(e, 'Could not mark paid'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="no-print" sx={{ p: 2, display: 'grid', gap: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography sx={{ fontWeight: 700 }}>Installments</Typography>
        <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
          {paid} of {installments.length} paid · {raised} invoiced
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
        Raise each invoice only when that installment's payment is in. Nothing is ever invoiced for the whole package,
        so if a later installment never comes, no GST is owed on it.
      </Typography>
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {closed && <Alert severity="warning">This quotation is cancelled; no further installments can be invoiced.</Alert>}
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>When</TableCell>
              <TableCell>Delivered on payment</TableCell>
              <TableCell align="right">Payable (incl. GST)</TableCell>
              <TableCell>Invoice</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {installments.map((i) => {
              const t = i.invoiceStatus ? (STATUS_TOKENS[i.invoiceStatus] || STATUS_TOKENS.DRAFT) : null;
              const payable = i.amountPaise + gstOn(i.amountPaise);
              return (
                <TableRow key={i.n} hover>
                  <TableCell>{i.n}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{i.label || `Installment ${i.n}`}</TableCell>
                  <TableCell sx={{ color: COLORS.textMuted }}>{i.unlocks || '—'}</TableCell>
                  <TableCell align="right">{paise(payable)}</TableCell>
                  <TableCell>
                    {i.invoiceId ? (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography component={RouterLink} to={`/billing/${i.invoiceId}`} sx={{ fontWeight: 600, color: COLORS.primary, textDecoration: 'none', fontSize: 14 }}>
                          {i.invoiceNumber}
                        </Typography>
                        <Chip size="small" label={t.label} sx={{ color: t.fg, bgcolor: t.bg, fontWeight: 600 }} />
                      </Box>
                    ) : <Typography variant="body2" sx={{ color: COLORS.textMuted }}>Not yet invoiced</Typography>}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {canWrite && !i.invoiceId && !closed && (
                      <Tooltip title="Creates a single invoice for this installment only, linked to this quotation">
                        <Button size="small" variant="outlined" disabled={busy !== null} onClick={() => raise(i.n)}>
                          {busy === i.n ? 'Raising…' : 'Raise invoice'}
                        </Button>
                      </Tooltip>
                    )}
                    {canWrite && i.invoiceId && i.invoiceStatus !== 'PAID' && i.invoiceStatus !== 'CANCELLED' && (
                      <Button size="small" disabled={busy !== null} onClick={() => markPaid(i)}>Mark paid</Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
