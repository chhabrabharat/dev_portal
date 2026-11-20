import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { COLORS } from '../../styles/js/styleConstants';
import { errorMessage, saveQualifications } from '../../services/api';

const blank = () => ({ title: '', institution: '', year: '', grade: '' });

/** Degrees and certificates. The whole list is saved together; the server replaces it. */
export default function QualificationsPanel({ staffId, items, canWrite, onSaved }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setRows((items || []).map((q) => ({ title: q.title || '', institution: q.institution || '', year: q.year ?? '', grade: q.grade || '' })));
    setDirty(false);
  }, [items]);

  const edit = (i, k) => (e) => { setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x))); setDirty(true); };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = rows.filter((r) => r.title.trim()).map((r) => ({
        title: r.title.trim(), institution: r.institution.trim() || null,
        year: r.year === '' ? null : Number(r.year), grade: r.grade.trim() || null,
      }));
      onSaved(await saveQualifications(staffId, payload));
    } catch (e) {
      setError(errorMessage(e, 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {rows.length === 0 && <Typography variant="body2" sx={{ color: COLORS.textMuted, mb: 1 }}>No qualifications recorded.</Typography>}
      {rows.map((r, i) => (
        <Box key={i} sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '2fr 2fr 90px 110px auto' }, mb: 1.5, alignItems: 'center' }}>
          <TextField size="small" label="Degree or certificate" value={r.title} onChange={edit(i, 'title')} disabled={!canWrite} />
          <TextField size="small" label="Institution" value={r.institution} onChange={edit(i, 'institution')} disabled={!canWrite} />
          <TextField size="small" label="Year" type="number" value={r.year} onChange={edit(i, 'year')} disabled={!canWrite} />
          <TextField size="small" label="Grade" value={r.grade} onChange={edit(i, 'grade')} disabled={!canWrite} />
          {canWrite && (
            <IconButton aria-label="Remove" onClick={() => { setRows((x) => x.filter((_, j) => j !== i)); setDirty(true); }}>
              <DeleteOutlineIcon />
            </IconButton>
          )}
        </Box>
      ))}
      {canWrite && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={() => { setRows((r) => [...r, blank()]); setDirty(true); }}>+ Add</Button>
          <Button size="small" variant="contained" onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save'}</Button>
        </Box>
      )}
    </Box>
  );
}
