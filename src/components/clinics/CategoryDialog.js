import React, { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import { SETTABLE_CATEGORIES, categoryToken } from '../../styles/js/adminTokens';
import { errorMessage } from '../../services/api';

/**
 * Sets the soft category (and optionally referred-by) for one clinic or, with `bulk`, many.
 * The label changes nothing for the clinic; the dialog says so because operators often assume
 * "Inactive" locks the clinic out (that is Account status on the other page).
 */
export default function CategoryDialog({ open, onClose, onSave, title, initialCategory, initialReferredBy, bulk }) {
  const [category, setCategory] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setCategory(SETTABLE_CATEGORIES.includes(initialCategory) ? initialCategory : '');
      setReferredBy(initialReferredBy || '');
      setNote('');
      setError(null);
    }
  }, [open, initialCategory, initialReferredBy]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      // null leaves a field alone, "" clears it. In bulk mode an untouched referred-by stays null
      // so one change of category never wipes many clinics' referrers.
      await onSave({
        category: category || null,
        referredBy: bulk && !referredBy ? null : referredBy,
        note: note || null,
      });
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <Alert severity="info">A tracking label for the company only. It does not change the clinic's access or features.</Alert>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField select size="small" label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          {SETTABLE_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{categoryToken(c).label}</MenuItem>)}
        </TextField>
        <TextField
          size="small" label="Referred by" value={referredBy} inputProps={{ maxLength: 160 }}
          onChange={(e) => setReferredBy(e.target.value)}
          helperText={bulk ? 'Leave empty to keep each clinic\'s current value' : 'Empty clears it'}
        />
        <TextField size="small" label="Note (kept in history)" value={note} onChange={(e) => setNote(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving || (!category && !bulk && !referredBy)}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
