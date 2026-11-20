import React, { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { errorMessage } from '../../services/api';
import { COLORS } from '../../styles/js/styleConstants';
import {
  DEFAULT_INSTALLMENT_TERMS, DOC_STATUSES, STATUS_TOKENS, bpToPercent, computeTotals, guessIntraState, paise,
  paiseToRupees, percentToBp, rupeesToPaise, splitEqually,
} from '../../utils/billing';

const SAMPLE_ITEMS = [
  { description: 'Website', detail: 'Design and development of a responsive business website', amount: '' },
  { description: 'Software', detail: 'Application development as per agreed scope', amount: '' },
  { description: 'SEO', detail: 'On-page SEO setup and optimisation', amount: '' },
];

const emptyItem = () => ({ description: '', detail: '', amount: '' });
const emptyInstallment = () => ({ label: '', amount: '', unlocks: '' });

function toForm(doc, docType, prefill) {
  if (!doc) {
    const p = prefill || {};
    const guessed = guessIntraState(p.clientGstin);
    return {
      docType,
      docDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      clientName: p.clientName || '',
      clientAddress: p.clientAddress || '',
      clientGstin: (p.clientGstin || '').toUpperCase(),
      clientEmail: p.clientEmail || '',
      clientPhone: p.clientPhone || '',
      intraState: guessed === null ? true : guessed,
      gstRate: '18',
      advancePercent: '50',
      advanceReceived: '',
      status: 'DRAFT',
      notes: docType === 'QUOTATION'
        ? 'Work begins once the advance is received. Balance payable on delivery. Changes beyond the agreed scope are quoted separately.'
        : 'Payment by bank transfer or UPI to the account below. Balance payable within 7 days of invoice.',
      items: SAMPLE_ITEMS.map((i) => ({ ...i })),
      installments: [],
    };
  }
  return {
    docType: doc.docType,
    docDate: doc.docDate || '',
    dueDate: doc.dueDate || '',
    clientName: doc.clientName || '',
    clientAddress: doc.clientAddress || '',
    clientGstin: doc.clientGstin || '',
    clientEmail: doc.clientEmail || '',
    clientPhone: doc.clientPhone || '',
    intraState: doc.intraState,
    gstRate: bpToPercent(doc.gstRateBp),
    advancePercent: bpToPercent(doc.advancePercentBp),
    advanceReceived: doc.totals?.advanceReceivedPaise ? paiseToRupees(doc.totals.advanceReceivedPaise) : '',
    status: doc.status,
    notes: doc.notes || '',
    items: (doc.items || []).map((i) => ({ description: i.description || '', detail: i.detail || '', amount: paiseToRupees(i.amountPaise) })),
    installments: (doc.installments || []).map((i) => ({ label: i.label || '', amount: paiseToRupees(i.amountPaise), unlocks: i.unlocks || '', locked: !!i.invoiceId })),
  };
}

/**
 * Create or edit one quotation or invoice. Amounts are typed in rupees; the totals strip at the
 * bottom mirrors the server arithmetic so the operator sees GST and balance before saving. The
 * server recomputes everything on save - this preview is a convenience, not the record.
 */
export default function SalesDocumentDialog({ open, onClose, onSave, doc, docType, prefill, accountId }) {
  const [form, setForm] = useState(() => toForm(doc, docType, prefill));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(toForm(doc, docType, prefill));
      setError(null);
    }
  }, [open, doc, docType, prefill]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setItem = (idx, key) => (e) => setForm((f) => {
    const items = f.items.map((it, i) => (i === idx ? { ...it, [key]: e.target.value } : it));
    return { ...f, items };
  });
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const setInst = (idx, key) => (e) => setForm((f) => ({
    ...f, installments: f.installments.map((it, i) => (i === idx ? { ...it, [key]: e.target.value } : it)),
  }));
  const addInst = () => setForm((f) => ({ ...f, installments: [...f.installments, emptyInstallment()] }));
  const removeInst = (idx) => setForm((f) => ({ ...f, installments: f.installments.filter((_, i) => i !== idx) }));
  const useInstallments = form.docType === 'QUOTATION' && form.installments.length > 0;
  const anyLocked = form.installments.some((i) => i.locked);
  const startInstallments = (n) => setForm((f) => {
    const subtotal = f.items.reduce((sum, it) => sum + rupeesToPaise(it.amount), 0);
    const parts = splitEqually(subtotal, n);
    const labels = n === 2 ? ['On signing', 'On delivery'] : ['On signing', 'On delivery', 'After go-live'];
    const notes = f.notes && f.notes.includes('installment') ? f.notes : DEFAULT_INSTALLMENT_TERMS;
    return {
      ...f,
      advancePercent: '',
      notes,
      installments: parts.map((p, i) => ({ label: labels[i] || `Installment ${i + 1}`, amount: paiseToRupees(p), unlocks: '' })),
    };
  });
  const clearInstallments = () => setForm((f) => ({ ...f, installments: [], advancePercent: '50' }));

  const onGstin = (e) => {
    const v = e.target.value.toUpperCase();
    const guess = guessIntraState(v);
    setForm((f) => ({ ...f, clientGstin: v, intraState: guess === null ? f.intraState : guess }));
  };

  const payload = useMemo(() => ({
    docType: form.docType,
    docDate: form.docDate || null,
    dueDate: form.dueDate || null,
    clientName: form.clientName,
    clientAddress: form.clientAddress || null,
    clientGstin: form.clientGstin || null,
    clientEmail: form.clientEmail || null,
    clientPhone: form.clientPhone || null,
    intraState: form.intraState,
    gstRateBp: percentToBp(form.gstRate) ?? 0,
    advancePercentBp: form.advancePercent === '' ? null : percentToBp(form.advancePercent),
    advanceReceivedPaise: rupeesToPaise(form.advanceReceived),
    status: form.status,
    notes: form.notes || null,
    accountId: doc ? doc.accountId ?? null : accountId ?? null,
    items: form.items.map((i) => ({ description: i.description, detail: i.detail || null, amountPaise: rupeesToPaise(i.amount) })),
    installments: form.docType === 'QUOTATION'
      ? form.installments.map((i, idx) => ({ n: idx + 1, label: i.label || null, amountPaise: rupeesToPaise(i.amount), unlocks: i.unlocks || null }))
      : null,
  }), [form, doc, accountId]);

  const installmentSum = useMemo(() => form.installments.reduce((sum, i) => sum + rupeesToPaise(i.amount), 0), [form.installments]);

  const totals = useMemo(() => computeTotals(payload), [payload]);
  const isInvoice = form.docType === 'INVOICE';

  const submit = async () => {
    if (!form.clientName.trim()) {
      setError('Client name is required.');
      return;
    }
    if (useInstallments && installmentSum !== totals.subtotalPaise) {
      setError(`Installments add up to ${paise(installmentSum)} but the package is ${paise(totals.subtotalPaise)}.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(payload);
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  const title = `${doc ? 'Edit' : 'New'} ${isInvoice ? 'invoice' : 'quotation'}${doc ? ` ${doc.docNumber}` : ''}`;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        {!doc && prefill && (
          <Alert severity="info">Pre-filled from the clinic's own record. Check the address and GSTIN before creating.</Alert>
        )}

        <Typography variant="overline" sx={{ color: COLORS.textMuted }}>Client</Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField size="small" label="Client / business name" value={form.clientName} onChange={set('clientName')} required />
          <TextField size="small" label="Client GSTIN (optional)" value={form.clientGstin} onChange={onGstin} inputProps={{ maxLength: 15 }} />
          <TextField size="small" label="Address" value={form.clientAddress} onChange={set('clientAddress')} multiline minRows={2} sx={{ gridColumn: { sm: '1 / -1' } }} />
          <TextField size="small" label="Email" value={form.clientEmail} onChange={set('clientEmail')} />
          <TextField size="small" label="Phone" value={form.clientPhone} onChange={set('clientPhone')} />
        </Box>

        <Typography variant="overline" sx={{ color: COLORS.textMuted }}>Document</Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' } }}>
          <TextField size="small" type="date" label="Date" value={form.docDate} onChange={set('docDate')} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label={isInvoice ? 'Due date' : 'Valid until'} value={form.dueDate} onChange={set('dueDate')} InputLabelProps={{ shrink: true }} />
          <TextField select size="small" label="Status" value={form.status} onChange={set('status')}>
            {DOC_STATUSES.map((s) => <MenuItem key={s} value={s}>{STATUS_TOKENS[s].label}</MenuItem>)}
          </TextField>
          <TextField size="small" type="number" label="GST %" value={form.gstRate} onChange={set('gstRate')} inputProps={{ min: 0, max: 28, step: 0.5 }} />
        </Box>
        <FormControlLabel
          control={<Switch checked={form.intraState} onChange={(e) => setForm((f) => ({ ...f, intraState: e.target.checked }))} />}
          label={form.intraState ? 'Client in Uttar Pradesh — GST split as CGST + SGST' : 'Client outside Uttar Pradesh — GST charged as IGST'}
        />

        <Typography variant="overline" sx={{ color: COLORS.textMuted }}>Line items (₹, before GST)</Typography>
        {form.items.map((it, idx) => (
          <Box key={idx} sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr 1fr auto', sm: '2fr 3fr 1.2fr auto' }, alignItems: 'start' }}>
            <TextField size="small" label="Item" value={it.description} onChange={setItem(idx, 'description')} />
            <TextField size="small" label="Description" value={it.detail} onChange={setItem(idx, 'detail')} sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }} />
            <TextField size="small" type="number" label="Amount ₹" value={it.amount} onChange={setItem(idx, 'amount')} inputProps={{ min: 0, step: 1 }} />
            <IconButton aria-label="Remove item" onClick={() => removeItem(idx)} disabled={form.items.length === 1}><DeleteOutlineIcon /></IconButton>
          </Box>
        ))}
        <Button startIcon={<AddIcon />} onClick={addItem} sx={{ justifySelf: 'start' }}>Add line item</Button>

        <Typography variant="overline" sx={{ color: COLORS.textMuted }}>Payment schedule</Typography>
        {form.docType === 'QUOTATION' && !useInstallments && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ color: COLORS.textMuted }}>Paid in installments?</Typography>
            <Button size="small" variant="outlined" onClick={() => startInstallments(2)}>Split in 2</Button>
            <Button size="small" variant="outlined" onClick={() => startInstallments(3)}>Split in 3</Button>
            <Typography variant="caption" sx={{ color: COLORS.textMuted, flexBasis: '100%' }}>
              With installments, an invoice is raised per installment when it is paid - never for the whole package - so GST is
              owed only on money received. If a later installment never comes, nothing was invoiced for it.
            </Typography>
          </Box>
        )}
        {useInstallments && (
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Alert severity="info" sx={{ py: 0 }}>
              Amounts are before GST and must add up to the package ({paise(totals.subtotalPaise)}).
              {anyLocked ? ' Installments that already have an invoice are locked.' : ''}
            </Alert>
            {form.installments.map((it, idx) => (
              <Box key={idx} sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr 1fr auto', sm: 'auto 2fr 1.2fr 3fr auto' }, alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, px: 0.5, display: { xs: 'none', sm: 'block' } }}>{idx + 1}</Typography>
                <TextField size="small" label="When" placeholder="On signing" value={it.label} onChange={setInst(idx, 'label')} disabled={it.locked} />
                <TextField size="small" type="number" label="Amount ₹" value={it.amount} onChange={setInst(idx, 'amount')} inputProps={{ min: 0 }} disabled={it.locked} />
                <TextField size="small" label="Unlocks (delivered on payment)" placeholder="Website goes live" value={it.unlocks} onChange={setInst(idx, 'unlocks')} disabled={it.locked} sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }} />
                <IconButton aria-label="Remove installment" onClick={() => removeInst(idx)} disabled={it.locked}><DeleteOutlineIcon /></IconButton>
              </Box>
            ))}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button size="small" startIcon={<AddIcon />} onClick={addInst} disabled={form.installments.length >= 12}>Add installment</Button>
              {!anyLocked && <Button size="small" color="inherit" onClick={clearInstallments}>No installments</Button>}
              <Typography variant="body2" sx={{ ml: 'auto', color: installmentSum === totals.subtotalPaise ? COLORS.textMuted : '#b91c1c' }}>
                {paise(installmentSum)} of {paise(totals.subtotalPaise)}
              </Typography>
            </Box>
          </Box>
        )}
        {!useInstallments && (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField size="small" type="number" label="Advance % (blank = none)" value={form.advancePercent} onChange={set('advancePercent')} inputProps={{ min: 0, max: 100 }} />
            <TextField size="small" type="number" label="Advance received so far ₹" value={form.advanceReceived} onChange={set('advanceReceived')} inputProps={{ min: 0 }} />
          </Box>
        )}
        <TextField size="small" label="Terms / notes" value={form.notes} onChange={set('notes')} multiline minRows={2} />

        <Divider />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 3, rowGap: 0.5, justifyContent: 'end', fontSize: 14 }}>
          <span>Subtotal</span><strong style={{ textAlign: 'right' }}>{paise(totals.subtotalPaise)}</strong>
          {form.intraState ? (
            <>
              <span>CGST {Number(form.gstRate || 0) / 2}%</span><span style={{ textAlign: 'right' }}>{paise(totals.cgstPaise)}</span>
              <span>SGST {Number(form.gstRate || 0) / 2}%</span><span style={{ textAlign: 'right' }}>{paise(totals.sgstPaise)}</span>
            </>
          ) : (
            <><span>IGST {form.gstRate || 0}%</span><span style={{ textAlign: 'right' }}>{paise(totals.igstPaise)}</span></>
          )}
          <span>Total</span><strong style={{ textAlign: 'right' }}>{paise(totals.totalPaise)}</strong>
          {!useInstallments && totals.advanceDuePaise > 0 && <><span>Advance due ({form.advancePercent}%)</span><span style={{ textAlign: 'right' }}>{paise(totals.advanceDuePaise)}</span></>}
          {totals.advanceReceivedPaise > 0 && <><span>Less received</span><span style={{ textAlign: 'right' }}>−{paise(totals.advanceReceivedPaise)}</span></>}
          <span>Balance due</span><strong style={{ textAlign: 'right' }}>{paise(totals.balanceDuePaise)}</strong>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>{doc ? 'Save' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}
