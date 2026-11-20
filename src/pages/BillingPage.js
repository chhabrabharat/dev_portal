import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
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
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import SalesDocumentDialog from '../components/billing/SalesDocumentDialog';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import {
  convertQuotationToInvoice, createSalesDocument, deleteSalesDocument, errorMessage, fetchSalesDocument,
  fetchSalesDocuments, setSalesDocumentStatus, updateSalesDocument,
} from '../services/api';
import { COLORS } from '../styles/js/styleConstants';
import { STATUS_TOKENS, nestRows, paise } from '../utils/billing';
import { dateOnly } from '../utils/format';

function StatusPill({ status }) {
  const t = STATUS_TOKENS[status] || STATUS_TOKENS.DRAFT;
  return <Chip size="small" label={t.label} sx={{ color: t.fg, bgcolor: t.bg, fontWeight: 600 }} />;
}

/**
 * The company's own quotations and invoices - NRVN billing its customers for website, software
 * and SEO work. This is not the clinics' subscription billing (that lives on each account page)
 * and nothing here is ever visible to a clinic.
 */
export default function BillingPage() {
  const { canWrite } = usePlatformAuth();
  const compact = useMediaQuery('(max-width:760px)');
  const [type, setType] = useState('ALL');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [dialog, setDialog] = useState(null); // { doc, docType }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchSalesDocuments(type === 'ALL' ? null : type));
    } catch (e) {
      setError(errorMessage(e, 'Could not load documents'));
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => rows.reduce((acc, r) => {
    if (r.docType === 'INVOICE' && r.status !== 'CANCELLED') {
      acc.invoiced += r.totalPaise;
      acc.outstanding += Math.max(0, r.balanceDuePaise);
    }
    if (r.docType === 'QUOTATION' && (r.status === 'DRAFT' || r.status === 'SENT')) acc.openQuotes += r.totalPaise;
    return acc;
  }, { invoiced: 0, outstanding: 0, openQuotes: 0 }), [rows]);

  const nested = useMemo(() => nestRows(rows), [rows]);

  const markPaid = async (row) => {
    try {
      await setSalesDocumentStatus(row.id, 'PAID');
      await load();
    } catch (e) {
      setError(errorMessage(e, 'Could not mark paid'));
    }
  };

  const openNew = (docType) => setDialog({ doc: null, docType });
  const openEdit = async (id) => {
    try {
      setDialog({ doc: await fetchSalesDocument(id), docType: null });
    } catch (e) {
      setError(errorMessage(e, 'Could not open document'));
    }
  };

  const save = async (payload) => {
    if (dialog?.doc) await updateSalesDocument(dialog.doc.id, payload);
    else await createSalesDocument(payload);
    await load();
  };

  const convert = async (row) => {
    try {
      const inv = await convertQuotationToInvoice(row.id);
      setNotice(`Invoice ${inv.docNumber} created from ${row.docNumber}.`);
      await load();
    } catch (e) {
      setError(errorMessage(e, 'Could not convert'));
    }
  };

  const remove = async (row) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete draft ${row.docNumber}? This cannot be undone.`)) return;
    try {
      await deleteSalesDocument(row.id);
      await load();
    } catch (e) {
      setError(errorMessage(e, 'Could not delete'));
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Billing</Typography>
          <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
            NRVN's own quotations and invoices to its customers. Not the clinics' subscription billing.
          </Typography>
        </Box>
        {canWrite && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={() => openNew('QUOTATION')}>New quotation</Button>
            <Button variant="contained" onClick={() => openNew('INVOICE')}>New invoice</Button>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
        {[
          ['Invoiced', totals.invoiced, 'All invoices except cancelled'],
          ['Outstanding', totals.outstanding, 'Invoice totals less advances received'],
          ['Open quotations', totals.openQuotes, 'Draft or sent, not yet accepted'],
        ].map(([title, value, hint]) => (
          <Card key={title} sx={{ p: 2 }}>
            <Typography variant="overline" sx={{ color: COLORS.textMuted }}>{title}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{paise(value)}</Typography>
            <Typography variant="caption" sx={{ color: COLORS.textMuted }}>{hint}</Typography>
          </Card>
        ))}
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert>}

      <ToggleButtonGroup size="small" exclusive value={type} onChange={(_, v) => v && setType(v)}>
        <ToggleButton value="ALL">All</ToggleButton>
        <ToggleButton value="QUOTATION">Quotations</ToggleButton>
        <ToggleButton value="INVOICE">Invoices</ToggleButton>
      </ToggleButtonGroup>

      <Card>
        {loading && <LinearProgress />}
        {!loading && rows.length === 0 && (
          <Typography sx={{ p: 3, color: COLORS.textMuted }}>
            No documents yet.{canWrite ? ' Create a quotation, then convert it to an invoice once the client accepts.' : ''}
          </Typography>
        )}
        {rows.length > 0 && (compact ? (
          <Box sx={{ display: 'grid', gap: 1, p: 1 }}>
            {nested.map((r) => (
              <Card key={r.id} variant="outlined" sx={{ p: 1.5, display: 'grid', gap: 0.5, ml: r.depth ? 2 : 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Typography component={RouterLink} to={`/billing/${r.id}`} sx={{ fontWeight: 700, color: COLORS.primary, textDecoration: 'none' }}>{r.docNumber}</Typography>
                  <StatusPill status={r.status} />
                </Box>
                <Typography variant="body2">{r.clientName}</Typography>
                <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                  {dateOnly(r.docDate)} · {r.docType === 'INVOICE' ? 'Invoice' : 'Quotation'}{r.installmentNo ? ` · Installment ${r.installmentNo}` : ''}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total {paise(r.totalPaise)}</span>
                  {r.docType === 'INVOICE' && <strong>Due {paise(r.balanceDuePaise)}</strong>}
                </Box>
              </Card>
            ))}
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Number</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>{type === 'INVOICE' ? 'Due' : 'Due / valid until'}</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Balance due</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nested.map((r) => (
                  <TableRow key={r.id} hover sx={r.depth ? { '& td': { bgcolor: '#fafcff' } } : undefined}>
                    <TableCell sx={{ pl: r.depth ? 4 : 2 }}>
                      {r.depth ? <span style={{ color: COLORS.textMuted, marginRight: 6 }}>↳</span> : null}
                      <Typography component={RouterLink} to={`/billing/${r.id}`} sx={{ fontWeight: 600, color: COLORS.primary, textDecoration: 'none' }}>{r.docNumber}</Typography>
                    </TableCell>
                    <TableCell>{r.docType === 'INVOICE' ? (r.installmentNo ? `Installment ${r.installmentNo}` : 'Invoice') : 'Quotation'}</TableCell>
                    <TableCell>
                      {r.accountId
                        ? <Typography component={RouterLink} to={`/clinics/${r.accountId}`} sx={{ color: 'inherit', fontSize: 'inherit' }}>{r.clientName}</Typography>
                        : r.clientName}
                    </TableCell>
                    <TableCell>{dateOnly(r.docDate)}</TableCell>
                    <TableCell>{dateOnly(r.dueDate)}</TableCell>
                    <TableCell><StatusPill status={r.status} /></TableCell>
                    <TableCell align="right">{paise(r.totalPaise)}</TableCell>
                    <TableCell align="right">{r.docType === 'INVOICE' ? paise(r.balanceDuePaise) : '—'}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Button size="small" component={RouterLink} to={`/billing/${r.id}`}>View</Button>
                      {canWrite && <Button size="small" onClick={() => openEdit(r.id)}>Edit</Button>}
                      {r.docType === 'QUOTATION' && r.installmentCount > 0 && (
                          <Button size="small" component={RouterLink} to={`/billing/${r.id}`}>Installments</Button>
                        )}
                        {canWrite && r.docType === 'QUOTATION' && !r.installmentCount && r.status !== 'CANCELLED' && (
                        <Tooltip title="Whole-package invoice. For a quotation with installments, open it and raise per installment instead.">
                          <Button size="small" onClick={() => convert(r)}>To invoice</Button>
                        </Tooltip>
                      )}
                      {canWrite && r.docType === 'INVOICE' && r.status !== 'PAID' && r.status !== 'CANCELLED' && (
                        <Button size="small" color="success" onClick={() => markPaid(r)}>Mark paid</Button>
                      )}
                      {canWrite && r.status === 'DRAFT' && <Button size="small" color="error" onClick={() => remove(r)}>Delete</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ))}
      </Card>

      {dialog && (
        <SalesDocumentDialog open onClose={() => setDialog(null)} onSave={save} doc={dialog.doc} docType={dialog.docType} />
      )}
    </Box>
  );
}
