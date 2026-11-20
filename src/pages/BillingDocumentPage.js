import React, { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import SalesDocumentPaper from '../components/billing/SalesDocumentPaper';
import SalesDocumentDialog from '../components/billing/SalesDocumentDialog';
import InstallmentsCard from '../components/billing/InstallmentsCard';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import { errorMessage, fetchSalesDocument, setSalesDocumentStatus, updateSalesDocument } from '../services/api';
import { COLORS } from '../styles/js/styleConstants';

const BANK_KEY = 'platformBillingBankDetails';

/**
 * One quotation or invoice, laid out as the client will receive it, with Print (the browser's
 * Save as PDF is the export). Bank details are typed once and kept in this browser's storage:
 * they are the company's, not the document's, and the server has no business storing them.
 */
export default function BillingDocumentPage() {
  const { id } = useParams();
  const { canWrite } = usePlatformAuth();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [bank, setBank] = useState(() => {
    try { return window.localStorage.getItem(BANK_KEY) || ''; } catch { return ''; }
  });
  const [bankOpen, setBankOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setDoc(await fetchSalesDocument(id));
    } catch (e) {
      setError(errorMessage(e, 'Could not load document'));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveBank = () => {
    try { window.localStorage.setItem(BANK_KEY, bank); } catch { /* storage unavailable: keep in memory */ }
    setBankOpen(false);
  };

  const print = () => window.print();

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          body { background: #fff !important; }
          main, #root > div { padding: 0 !important; margin: 0 !important; }
          @page { size: A4; margin: 14mm; }
        }
      `}</style>
      <Box className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Button component={RouterLink} to="/billing" size="small">← Billing</Button>
          {doc && <Typography variant="h6" sx={{ fontWeight: 700 }}>{doc.docNumber}</Typography>}
          {doc?.parentId && (
            <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
              Installment {doc.installmentNo}{doc.installmentCount ? ` of ${doc.installmentCount}` : ''} against{' '}
              <Typography component={RouterLink} to={`/billing/${doc.parentId}`} sx={{ color: COLORS.primary, fontSize: 'inherit' }}>{doc.quotationRef}</Typography>
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {doc?.docType === 'INVOICE' && <Button variant="outlined" onClick={() => setBankOpen((v) => !v)}>Bank details</Button>}
          {canWrite && doc?.docType === 'INVOICE' && doc.status !== 'PAID' && doc.status !== 'CANCELLED' && (
            <Button variant="outlined" color="success" onClick={async () => {
              try { await setSalesDocumentStatus(doc.id, 'PAID'); await load(); } catch (e) { setError(errorMessage(e, 'Could not mark paid')); }
            }}>Mark paid</Button>
          )}
          {canWrite && doc && <Button variant="outlined" onClick={() => setEditing(true)}>Edit</Button>}
          <Button variant="contained" onClick={print} disabled={!doc}>Print / Save as PDF</Button>
        </Box>
      </Box>

      {bankOpen && (
        <Box className="no-print" sx={{ display: 'grid', gap: 1, maxWidth: 560 }}>
          <TextField
            multiline minRows={4} size="small" label="Bank details printed on invoices"
            placeholder={'Account name: NRVN Informatics Private Limited\nBank & branch:\nAccount no.:\nIFSC:\nUPI:'}
            value={bank} onChange={(e) => setBank(e.target.value)}
          />
          <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
            Kept in this browser only. Set it once on the computer you print from.
          </Typography>
          <Button size="small" variant="contained" onClick={saveBank} sx={{ justifySelf: 'start' }}>Save</Button>
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}
      {!doc && !error && <LinearProgress />}
      {doc && <InstallmentsCard doc={doc} onChanged={load} />}
      {doc && <SalesDocumentPaper doc={doc} bank={bank} />}

      {editing && doc && (
        <SalesDocumentDialog
          open
          doc={doc}
          onClose={() => setEditing(false)}
          onSave={async (payload) => { await updateSalesDocument(doc.id, payload); await load(); }}
        />
      )}
    </Box>
  );
}
