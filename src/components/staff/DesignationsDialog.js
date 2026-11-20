import React, { useCallback, useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { COLORS } from '../../styles/js/styleConstants';
import { createDesignation, errorMessage, fetchDesignations, updateDesignation } from '../../services/api';

/**
 * The managed designation list: add, rename, deactivate. Deactivating hides a designation from
 * new profiles only; people who already hold it keep it (the server enforces that too).
 */
export default function DesignationsDialog({ open, onClose, onChanged }) {
  const [items, setItems] = useState([]);
  const [names, setNames] = useState({});
  const [newName, setNewName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await fetchDesignations();
      setItems(rows);
      setNames(Object.fromEntries(rows.map((r) => [r.id, r.name])));
    } catch (e) {
      setError(errorMessage(e, 'Could not load designations'));
    }
  }, []);

  useEffect(() => { if (open) { setError(null); load(); } }, [open, load]);

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      onChanged?.();
    } catch (e) {
      setError(errorMessage(e, 'That did not save'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>Designations</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', mb: 1.5 }}>
          Turning one off hides it from new profiles. People who already have it keep it.
        </Typography>
        {items.map((d) => (
          <Box key={d.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
            <TextField
              size="small"
              fullWidth
              value={names[d.id] ?? ''}
              onChange={(e) => setNames((n) => ({ ...n, [d.id]: e.target.value }))}
              onBlur={() => {
                const next = (names[d.id] || '').trim();
                if (next && next !== d.name) run(() => updateDesignation(d.id, { name: next }));
                else setNames((n) => ({ ...n, [d.id]: d.name }));
              }}
              disabled={busy}
            />
            <FormControlLabel
              sx={{ mr: 0, flexShrink: 0 }}
              control={<Switch size="small" checked={Boolean(d.active)} disabled={busy}
                onChange={(e) => run(() => updateDesignation(d.id, { active: e.target.checked }))} />}
              label={d.active ? 'On' : 'Off'}
            />
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <TextField size="small" fullWidth label="New designation" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={busy} />
          <Button variant="outlined" disabled={busy || !newName.trim()}
            onClick={() => run(async () => { await createDesignation(newName.trim()); setNewName(''); })}>
            Add
          </Button>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={onClose}>Done</Button></DialogActions>
    </Dialog>
  );
}
