import React, { useCallback, useEffect, useState } from 'react';
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
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import SalesDocumentDialog from '../billing/SalesDocumentDialog';
import { usePlatformAuth } from '../../context/PlatformAuthContext';
import {
  convertQuotationToInvoice, createSalesDocument, errorMessage, fetchSalesDocumentPrefill, fetchSalesDocuments,
} from '../../services/api';
import { COLORS } from '../../styles/js/styleConstants';
import { STATUS_TOKENS, paise } from '../../utils/billing';
import { dateOnly } from '../../utils/format';

/**
 * The quotations and invoices NRVN has raised for this clinic, with New quotation / New invoice
 * pre-filled from the clinic's own record (name, GST number, address, contacts). The full list
 * across all customers is the Billing tab; this is the same data filtered to one clinic.
 */
export default function BillingPanel({ clinicId }) {
  const { canWrite } = usePlatformAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [dialog, setDialog] = useState(null); // { docType, prefill }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchSalesDocuments(null, clinicId));
    } catch (e) {
      setError(errorMessage(e, 'Could not load documents'));
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  const openNew = async (docType) => {
    try {
      const prefill = await fetchSalesDocumentPrefill(clinicId);
      setDialog({ docType, prefill });
    } catch (e) {
      setError(errorMessage(e, 'Could not read the clinic record'));
    }
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

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
          NRVN's quotations and invoices to this clinic for website, software or SEO work. Not its subscription.
        </Typography>
        {canWrite && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" onClick={() => openNew('QUOTATION')}>New quotation</Button>
            <Button variant="contained" size="small" onClick={() => openNew('INVOICE')}>New invoice</Button>
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert>}

      <Card>
        {loading && <LinearProgress />}
        {!loading && rows.length === 0 && (
          <Typography sx={{ p: 3, color: COLORS.textMuted }}>No quotations or invoices for this clinic yet.</Typography>
        )}
        {rows.length > 0 && (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Number</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Balance due</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => {
                  const t = STATUS_TOKENS[r.status] || STATUS_TOKENS.DRAFT;
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        <Typography component={RouterLink} to={`/billing/${r.id}`} sx={{ fontWeight: 600, color: COLORS.primary, textDecoration: 'none' }}>{r.docNumber}</Typography>
                      </TableCell>
                      <TableCell>{r.docType === 'INVOICE' ? 'Invoice' : 'Quotation'}</TableCell>
                      <TableCell>{dateOnly(r.docDate)}</TableCell>
                      <TableCell><Chip size="small" label={t.label} sx={{ color: t.fg, bgcolor: t.bg, fontWeight: 600 }} /></TableCell>
                      <TableCell align="right">{paise(r.totalPaise)}</TableCell>
                      <TableCell align="right">{r.docType === 'INVOICE' ? paise(r.balanceDuePaise) : '—'}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Button size="small" component={RouterLink} to={`/billing/${r.id}`}>View / print</Button>
                        {canWrite && r.docType === 'QUOTATION' && r.status !== 'CANCELLED' && (
                          <Tooltip title="Create an invoice with the same items; the quotation is marked accepted">
                            <Button size="small" onClick={() => convert(r)}>To invoice</Button>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {dialog && (
        <SalesDocumentDialog
          open
          docType={dialog.docType}
          prefill={dialog.prefill}
          accountId={clinicId}
          onClose={() => setDialog(null)}
          onSave={async (payload) => { await createSalesDocument(payload); await load(); }}
        />
      )}
    </Box>
  );
}
