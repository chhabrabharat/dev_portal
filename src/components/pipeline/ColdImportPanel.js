import React, { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { COLORS } from '../../styles/js/styleConstants';
import { errorMessage, importPipeline } from '../../services/api';
import { buildColdRows } from '../../utils/coldImport';

/**
 * Upload a CSV of Google-sourced clinics into the cold pool, through the same
 * POST /platform/pipeline/import the tracker script uses (cold rows only, warm left empty).
 * The file is read in the browser and previewed before anything is sent; the server matches rows
 * by sourceId, so a re-upload updates rather than duplicates, and it never moves a lead that is
 * already on the board. Write access is enforced by the server; `disabled` is a courtesy.
 */
export default function ColdImportPanel({ disabled, onImported }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const reset = () => {
    setParsed(null);
    setFileName('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    setError(null);
    setResult(null);
    if (!file) return;
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) {
      reset();
      setError('Choose a .csv file. From Google Sheets or Excel, use Download / Save as → CSV.');
      return;
    }
    setFileName(file.name);
    const out = buildColdRows(await file.text());
    if (out.error) {
      setParsed(null);
      setError(out.error);
      return;
    }
    if (!out.cold.length) {
      setParsed(null);
      setError('No clinics found in this file.');
      return;
    }
    setParsed(out);
  };

  const send = async () => {
    if (!parsed) return;
    setSending(true);
    setError(null);
    try {
      const data = await importPipeline({ warm: [], cold: parsed.cold });
      setResult({ count: parsed.cold.length, data });
      reset();
      onImported();
    } catch (e) {
      setError(errorMessage(e, 'Could not import this file'));
    } finally {
      setSending(false);
    }
  };

  // The import response is the server's own summary; show its counts as they come.
  const summary = (data) => {
    if (!data || typeof data !== 'object') return null;
    const parts = [];
    const walk = (obj, prefix) => Object.entries(obj).forEach(([k, v]) => {
      if (typeof v === 'number') parts.push(`${prefix}${k}: ${v}`);
      else if (v && typeof v === 'object' && !Array.isArray(v) && prefix === '') walk(v, `${k} `);
      else if (Array.isArray(v) && v.length && typeof v[0] === 'string') parts.push(`${prefix}${k}: ${v.slice(0, 3).join('; ')}${v.length > 3 ? '…' : ''}`);
    });
    walk(data, '');
    return parts.length ? parts.join(' · ') : null;
  };

  return (
    <Box sx={{ mx: 2, mb: 1, p: 1.25, border: `1px dashed ${COLORS.borderLight}`, borderRadius: 2 }}>
      <Typography variant="body2" sx={{ fontWeight: 700, color: COLORS.textPrimary }}>
        Import clinics into the pool
      </Typography>
      <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', mb: 1 }}>
        CSV with a Name column; Phone, Type, Category, Address, Rating and Reviews are picked up if present.
        Clinics already in the pool are updated, not duplicated.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button size="small" variant="outlined" component="label" disabled={disabled || sending}>
          Choose CSV
          <input ref={inputRef} hidden type="file" accept=".csv,.tsv,.txt,text/csv" onChange={pick} />
        </Button>
        <Typography variant="caption" sx={{ color: COLORS.textMuted, overflowWrap: 'anywhere', flex: 1 }}>
          {fileName || 'No file chosen'}
        </Typography>
      </Box>
      {parsed && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ color: COLORS.textPrimary, display: 'block' }}>
            {parsed.cold.length} clinic{parsed.cold.length === 1 ? '' : 's'} ready
            {parsed.skipped ? ` · ${parsed.skipped} row${parsed.skipped === 1 ? '' : 's'} without a name skipped` : ''}
            {parsed.duplicates ? ` · ${parsed.duplicates} repeated in the file, kept once` : ''}
          </Typography>
          <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block' }}>
            First: {parsed.cold.slice(0, 3).map((r) => r.name).join(', ')}{parsed.cold.length > 3 ? '…' : ''}
          </Typography>
          {parsed.ignored.length > 0 && (
            <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block' }}>
              Ignored columns: {parsed.ignored.join(', ')}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button size="small" variant="contained" disabled={disabled || sending} onClick={send}>
              {sending ? 'Importing…' : `Import ${parsed.cold.length}`}
            </Button>
            <Button size="small" disabled={sending} onClick={reset}>Cancel</Button>
          </Box>
        </Box>
      )}
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      {result && (
        <Alert severity="success" sx={{ mt: 1 }} onClose={() => setResult(null)}>
          Sent {result.count} clinic{result.count === 1 ? '' : 's'} to the pool.
          {summary(result.data) ? ` ${summary(result.data)}` : ''}
        </Alert>
      )}
    </Box>
  );
}
