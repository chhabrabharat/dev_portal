import React, { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import { usePlatformAuth } from '../../context/PlatformAuthContext';
import { errorMessage, fetchPrescriptionSettings, updatePrescriptionSettings } from '../../services/api';
import { COLORS } from '../../styles/js/styleConstants';

const pretty = (k) => k.replace(/^history_/, 'History: ').replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')
  .replace(/^./, (c) => c.toUpperCase());
const sameList = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort());

/**
 * One doctor's prescription settings, edited on the clinic's behalf. Saving sends only what changed,
 * and the server applies the same rules as the clinic app, so a value it would refuse comes back as
 * an error here. The new layout shows on the doctor's next prescription.
 */
export default function PrescriptionSettingsDialog({ open, onClose, clinicId, doctor }) {
  const { canWrite } = usePlatformAuth();
  const [loaded, setLoaded] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !doctor) return undefined;
    let live = true;
    setLoaded(null); setForm(null); setError(null);
    fetchPrescriptionSettings(clinicId, doctor.id).then((d) => {
      if (!live) return;
      setLoaded(d);
      setForm({
        template: d.template || '', color: d.color || '', consultationScreen: d.consultationScreen || '',
        hiddenSections: d.hiddenSections || [], headerText: d.headerText || '',
        generalInstructions: d.generalInstructions || '', symptomsAsComplaints: !!d.symptomsAsComplaints,
      });
    }).catch((e) => live && setError(errorMessage(e, 'Could not load settings')));
    return () => { live = false; };
  }, [open, clinicId, doctor]);

  const save = async () => {
    const body = {};
    const set = (k, v, was) => { if (v !== was) body[k] = v; };
    set('template', form.template, loaded.template || '');
    set('color', form.color, loaded.color || '');
    set('consultationScreen', form.consultationScreen, loaded.consultationScreen || '');
    if (!sameList(form.hiddenSections, loaded.hiddenSections)) body.hiddenSections = form.hiddenSections.join(',');
    set('headerText', form.headerText, loaded.headerText || '');
    set('generalInstructions', form.generalInstructions, loaded.generalInstructions || '');
    if (form.symptomsAsComplaints !== !!loaded.symptomsAsComplaints) body.symptomsAsComplaints = String(form.symptomsAsComplaints);
    if (Object.keys(body).length === 0) { onClose(); return; }
    setSaving(true); setError(null);
    try {
      await updatePrescriptionSettings(clinicId, doctor.id, body);
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Could not save'));
    } finally { setSaving(false); }
  };

  const opts = loaded?.options || {};
  const toggleSection = (key) => setForm((f) => ({
    ...f,
    hiddenSections: f.hiddenSections.includes(key) ? f.hiddenSections.filter((k) => k !== key) : [...f.hiddenSections, key],
  }));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>Prescription settings{doctor ? ` · ${doctor.name}` : ''}</DialogTitle>
      <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
        {!form && !error && <LinearProgress />}
        {error && <Alert severity="error">{error}</Alert>}
        {form && (
          <>
            <Alert severity="info">
              {canWrite ? 'Changes apply to this doctor\'s next prescription and consultation screen.' : 'Read-only: your role cannot change these.'}
            </Alert>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <TextField select size="small" label="Prescription layout" value={form.template} disabled={!canWrite}
                onChange={(e) => setForm({ ...form, template: e.target.value })}>
                {(opts.templates || []).map((t) => <MenuItem key={t} value={t}>{pretty(t.toLowerCase())}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Consultation screen" value={form.consultationScreen} disabled={!canWrite}
                onChange={(e) => setForm({ ...form, consultationScreen: e.target.value })}>
                {(opts.consultationScreens || []).map((t) => <MenuItem key={t} value={t}>{pretty(t.toLowerCase())}</MenuItem>)}
              </TextField>
              <TextField size="small" label="Accent colour" value={form.color} disabled={!canWrite} placeholder="#0F6A74"
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                error={!!form.color && !/^#[0-9a-fA-F]{6}$/.test(form.color)} helperText="Like #0F6A74" />
            </Box>
            <TextField size="small" label="Header text" value={form.headerText} disabled={!canWrite}
              onChange={(e) => setForm({ ...form, headerText: e.target.value })} />
            <TextField size="small" multiline minRows={3} label="General instructions (start of every prescription)"
              value={form.generalInstructions} disabled={!canWrite}
              onChange={(e) => setForm({ ...form, generalInstructions: e.target.value })} />
            <FormControlLabel disabled={!canWrite}
              control={<Switch checked={form.symptomsAsComplaints} onChange={(e) => setForm({ ...form, symptomsAsComplaints: e.target.checked })} />}
              label="Print symptoms as complaints" />
            <Box>
              <Typography variant="subtitle2">Sections printed on the prescription</Typography>
              <Typography variant="caption" sx={{ color: COLORS.textMuted }}>Medicines always print. Untick to hide a section.</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {(opts.sections || []).map((k) => (
                  <FormControlLabel key={k} disabled={!canWrite}
                    control={<Checkbox size="small" checked={!form.hiddenSections.includes(k)} onChange={() => toggleSection(k)} />}
                    label={pretty(k)} />
                ))}
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle2">Consultation steps (order)</Typography>
              <Typography variant="body2" sx={{ color: COLORS.textMuted }}>{(loaded.consultationSteps || []).map(pretty).join(' → ') || '—'}</Typography>
              <Typography variant="caption" sx={{ color: COLORS.textMuted }}>Reordering steps is done by the doctor in the clinic app.</Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{canWrite ? 'Cancel' : 'Close'}</Button>
        {canWrite && <Button variant="contained" onClick={save} disabled={!form || saving || (!!form.color && !/^#[0-9a-fA-F]{6}$/.test(form.color))}>Save</Button>}
      </DialogActions>
    </Dialog>
  );
}
