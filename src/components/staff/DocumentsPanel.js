import React, { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import { COLORS } from '../../styles/js/styleConstants';
import {
  deleteStaffDocument, errorMessage, fetchStaffDocuments, staffDocumentUrl, uploadStaffDocument,
} from '../../services/api';
import { dateTime } from '../../utils/format';
import { DOC_TYPES, UPLOAD_ACCEPT, uploadProblem } from '../../utils/staff';

/**
 * Staff documents. Both roles can list and view; only ADMIN can upload or remove. A file is never
 * linked directly: "View" asks the server for a signed URL that lasts minutes, at click time.
 * Files are stored as uploaded and are never read for an ID number.
 */
export default function DocumentsPanel({ staffId, canWrite }) {
  const [docs, setDocs] = useState([]);
  const [type, setType] = useState('ID_PROOF');
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(null);
  const input = useRef(null);

  const load = useCallback(async () => {
    try { setDocs(await fetchStaffDocuments(staffId)); } catch (e) { setError(errorMessage(e, 'Could not load documents')); }
  }, [staffId]);

  useEffect(() => { load(); }, [load]);

  const upload = async () => {
    const problem = uploadProblem(file);
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError(null);
    try {
      await uploadStaffDocument(staffId, type, file);
      setFile(null);
      if (input.current) input.current.value = '';
      await load();
    } catch (e) {
      setError(errorMessage(e, 'Could not upload'));
    } finally {
      setBusy(false);
    }
  };

  const view = async (id) => {
    setError(null);
    try {
      const { url } = await staffDocumentUrl(staffId, id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(errorMessage(e, 'Could not open the document'));
    }
  };

  const remove = async (id) => {
    if (armed !== id) { setArmed(id); return; }
    setBusy(true);
    try { await deleteStaffDocument(staffId, id); setArmed(null); await load(); }
    catch (e) { setError(errorMessage(e, 'Could not remove')); }
    finally { setBusy(false); }
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {canWrite && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
          <TextField select size="small" label="Type" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 160 }}>
            {Object.entries(DOC_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <Button component="label" size="small" variant="outlined">
            {file ? file.name : 'Choose file'}
            <input ref={input} hidden type="file" accept={UPLOAD_ACCEPT} onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Button>
          <Button size="small" variant="contained" onClick={upload} disabled={busy || !file}>{busy ? 'Working…' : 'Upload'}</Button>
          <Typography variant="caption" sx={{ color: COLORS.textMuted }}>PDF, JPG or PNG, up to 5 MB.</Typography>
        </Box>
      )}
      <TableContainer>
        <Table size="small" sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow>{['Type', 'File', 'Size', 'Uploaded', ''].map((h) => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow>
          </TableHead>
          <TableBody>
            {docs.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{DOC_TYPES[d.type] || d.type}</TableCell>
                <TableCell sx={{ overflowWrap: 'anywhere' }}>{d.fileName}</TableCell>
                <TableCell>{Math.max(1, Math.round((d.sizeBytes || 0) / 1024))} KB</TableCell>
                <TableCell>{dateTime(d.uploadedAt)} · {d.uploadedBy}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Button size="small" onClick={() => view(d.id)}>View</Button>
                  {canWrite && (
                    <Button size="small" color="error" disabled={busy} onClick={() => remove(d.id)}>
                      {armed === d.id ? 'Click again' : 'Remove'}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {docs.length === 0 && (
              <TableRow><TableCell colSpan={5} sx={{ color: COLORS.textMuted, textAlign: 'center', py: 3 }}>No documents.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
