import React from 'react';
import Box from '@mui/material/Box';
import { COMPANY, amountInWords, longDate, paise } from '../../utils/billing';

const cell = { padding: '6px 8px', borderBottom: '1px solid #e2e8f0', fontSize: 13, verticalAlign: 'top' };
const right = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' };
const label = { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 };

/**
 * The document as the client receives it: A4-ish, black on white, no portal chrome. The
 * /billing/:id/print route renders only this so the browser's own Print → Save as PDF produces
 * the file to send. Everything on it comes from the saved record; nothing is recomputed here.
 */
export default function SalesDocumentPaper({ doc, bank }) {
  const t = doc.totals || {};
  const isInvoice = doc.docType === 'INVOICE';
  const gstPct = (doc.gstRateBp || 0) / 100;
  const installments = doc.installments || [];
  const hasInstallments = !isInvoice && installments.length > 0;
  const hasAdvanceSchedule = !hasInstallments && (t.advanceDuePaise || 0) > 0;
  const gstOn = (p) => Math.round((p * (doc.gstRateBp || 0)) / 10000);

  return (
    <Box
      className="sales-paper"
      sx={{
        width: '100%', maxWidth: 800, mx: 'auto', bgcolor: '#fff', color: '#0f172a', p: { xs: 2.5, sm: 5 },
        fontFamily: 'Inter, Roboto, Arial, sans-serif', boxShadow: { xs: 'none', sm: '0 1px 8px rgba(0,0,0,0.08)' },
        '@media print': { boxShadow: 'none', maxWidth: 'none', p: 0 },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Box>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{COMPANY.name}</div>
          <div style={{ fontSize: 12, color: '#475569' }}>Trade name: {COMPANY.tradeName}</div>
          <div style={{ fontSize: 12, color: '#475569', maxWidth: 380, marginTop: 4 }}>{COMPANY.address}</div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>GSTIN {COMPANY.gstin} · PAN {COMPANY.pan} · CIN {COMPANY.cin}</div>
          <div style={{ fontSize: 12, color: '#475569' }}>{COMPANY.email} · {COMPANY.website} · {COMPANY.phones}</div>
        </Box>
        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1 }}>{isInvoice ? 'TAX INVOICE' : 'QUOTATION'}</div>
          <div style={{ fontSize: 13, marginTop: 6 }}><span style={label}>No. </span><strong>{doc.docNumber}</strong></div>
          <div style={{ fontSize: 13 }}><span style={label}>Date </span>{longDate(doc.docDate)}</div>
          {doc.dueDate && <div style={{ fontSize: 13 }}><span style={label}>{isInvoice ? 'Due ' : 'Valid until '}</span>{longDate(doc.dueDate)}</div>}
          {doc.quotationRef && <div style={{ fontSize: 13 }}><span style={label}>Quotation ref </span>{doc.quotationRef}</div>}
          {isInvoice && doc.installmentNo && (
            <div style={{ fontSize: 13, fontWeight: 700 }}>Installment {doc.installmentNo}{doc.installmentCount ? ` of ${doc.installmentCount}` : ''}</div>
          )}
          {doc.status === 'CANCELLED' && <div style={{ color: '#b91c1c', fontWeight: 700, marginTop: 4 }}>CANCELLED</div>}
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
        <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1.5 }}>
          <div style={label}>{isInvoice ? 'Billed to' : 'Prepared for'}</div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{doc.clientName}</div>
          {doc.clientAddress && <div style={{ fontSize: 13, whiteSpace: 'pre-line' }}>{doc.clientAddress}</div>}
          {doc.clientGstin && <div style={{ fontSize: 13 }}>GSTIN {doc.clientGstin}</div>}
          {(doc.clientEmail || doc.clientPhone) && <div style={{ fontSize: 13 }}>{[doc.clientEmail, doc.clientPhone].filter(Boolean).join(' · ')}</div>}
        </Box>
        <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1.5 }}>
          <div style={label}>Tax</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Place of supply: {doc.intraState ? 'Uttar Pradesh (09)' : 'Other state'}</div>
          <div style={{ fontSize: 13 }}>{doc.intraState ? `CGST ${gstPct / 2}% + SGST ${gstPct / 2}%` : `IGST ${gstPct}%`}</div>
          <div style={{ fontSize: 13 }}>Supply of services · Reverse charge: No</div>
        </Box>
      </Box>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            <th style={{ ...cell, textAlign: 'left', width: 32 }}>#</th>
            <th style={{ ...cell, textAlign: 'left' }}>Item</th>
            <th style={{ ...cell, textAlign: 'left' }}>Description</th>
            <th style={right}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {(doc.items || []).map((it, i) => (
            <tr key={i}>
              <td style={cell}>{i + 1}</td>
              <td style={{ ...cell, fontWeight: 600 }}>{it.description}</td>
              <td style={{ ...cell, color: '#475569' }}>{it.detail || ''}</td>
              <td style={right}>{paise(it.amountPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 300 }}>
          <tbody>
            <tr><td style={cell}>Subtotal (before GST)</td><td style={right}>{paise(t.subtotalPaise)}</td></tr>
            {doc.intraState ? (
              <>
                <tr><td style={cell}>CGST @ {gstPct / 2}%</td><td style={right}>{paise(t.cgstPaise)}</td></tr>
                <tr><td style={cell}>SGST @ {gstPct / 2}%</td><td style={right}>{paise(t.sgstPaise)}</td></tr>
              </>
            ) : (
              <tr><td style={cell}>IGST @ {gstPct}%</td><td style={right}>{paise(t.igstPaise)}</td></tr>
            )}
            <tr style={{ background: '#f8fafc' }}>
              <td style={{ ...cell, fontWeight: 800 }}>{isInvoice ? 'Invoice total' : 'Total'}</td>
              <td style={{ ...right, fontWeight: 800 }}>{paise(t.totalPaise)}</td>
            </tr>
            {hasAdvanceSchedule && !isInvoice && (
              <>
                <tr><td style={cell}>Advance ({(doc.advancePercentBp || 0) / 100}%) before work starts</td><td style={right}>{paise(t.advanceDuePaise)}</td></tr>
                <tr><td style={cell}>Balance on delivery</td><td style={right}>{paise(t.totalPaise - t.advanceDuePaise)}</td></tr>
              </>
            )}
            {isInvoice && (t.advanceReceivedPaise || 0) > 0 && (
              <tr><td style={cell}>Less: advance received</td><td style={right}>− {paise(t.advanceReceivedPaise)}</td></tr>
            )}
            {isInvoice && (
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ ...cell, fontWeight: 800 }}>Balance due</td>
                <td style={{ ...right, fontWeight: 800 }}>{paise(t.balanceDuePaise)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Box>

      <div style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>
        Amount in words: <em>{amountInWords(isInvoice ? t.balanceDuePaise : t.totalPaise)}</em>
      </div>

      {hasInstallments && (
        <Box sx={{ mt: 3 }}>
          <div style={label}>Payment schedule</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ ...cell, textAlign: 'left', width: 32 }}>#</th>
                <th style={{ ...cell, textAlign: 'left' }}>When</th>
                <th style={{ ...cell, textAlign: 'left' }}>Delivered on payment</th>
                <th style={right}>Amount (₹)</th>
                <th style={right}>GST (₹)</th>
                <th style={right}>Payable (₹)</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((i) => (
                <tr key={i.n}>
                  <td style={cell}>{i.n}</td>
                  <td style={{ ...cell, fontWeight: 600 }}>{i.label || `Installment ${i.n}`}</td>
                  <td style={{ ...cell, color: '#475569' }}>{i.unlocks || ''}</td>
                  <td style={right}>{paise(i.amountPaise)}</td>
                  <td style={right}>{paise(gstOn(i.amountPaise))}</td>
                  <td style={{ ...right, fontWeight: 600 }}>{paise(i.amountPaise + gstOn(i.amountPaise))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
            A tax invoice is issued for each installment as it falls due.
          </div>
        </Box>
      )}

      {doc.notes && (
        <Box sx={{ mt: 3 }}>
          <div style={label}>Terms</div>
          <div style={{ fontSize: 13, whiteSpace: 'pre-line', marginTop: 4 }}>{doc.notes}</div>
        </Box>
      )}

      {isInvoice && bank && (
        <Box sx={{ mt: 3 }}>
          <div style={label}>Pay to</div>
          <div style={{ fontSize: 13, whiteSpace: 'pre-line', marginTop: 4 }}>{bank}</div>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 6, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13 }}>
          <div style={{ borderTop: '1px solid #0f172a', width: 220, paddingTop: 6 }}>For {COMPANY.name}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Authorised signatory</div>
        </div>
        {!isInvoice && (
          <div style={{ fontSize: 13 }}>
            <div style={{ borderTop: '1px solid #0f172a', width: 220, paddingTop: 6 }}>Accepted by client</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Name, signature and date</div>
          </div>
        )}
      </Box>
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 24, textAlign: 'center' }}>
        This is a computer-generated document issued by {COMPANY.name}.
      </div>
    </Box>
  );
}
