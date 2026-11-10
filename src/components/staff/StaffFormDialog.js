import React, { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { COLORS } from '../../styles/js/styleConstants';
import { createStaff, errorMessage, updateStaff } from '../../services/api';
import { BLOOD_GROUPS, GENDERS, STAFF_STATUS } from '../../utils/staff';

const TEXT = ['fullName', 'gender', 'mobile', 'personalEmail', 'bloodGroup', 'address', 'emergencyName',
  'emergencyRelation', 'emergencyNumber', 'department', 'status'];
const DATES = ['dateOfBirth', 'joinedOn', 'cardValidUntil'];
const IDS = ['designationId', 'managerId', 'platformUserId'];

const blank = () => Object.fromEntries([...TEXT, ...DATES, ...IDS].map((k) => [k, '']));

function fromProfile(p) {
  const f = blank();
  [...TEXT, ...DATES, ...IDS].forEach((k) => { if (p[k] !== null && p[k] !== undefined) f[k] = String(p[k]); });
  return f;
}

/**
 * Wire shape. The server treats an absent key as "leave it", and "" on a text field as "clear it",
 * so blank dates and ids are simply left out rather than sent as null.
 */
function toWire(f) {
  const out = {};
  TEXT.forEach((k) => { if (k !== 'status' || f.status) out[k] = f[k]; });
  DATES.forEach((k) => { if (f[k]) out[k] = f[k]; });
  IDS.forEach((k) => { if (f[k]) out[k] = Number(f[k]); });
  return out;
}

/** Create (profile = null) or edit a staff profile. No pay fields live here: pay has its own ADMIN-only panel. */
export default function StaffFormDialog({ open, profile, designations, staff, operators, onClose, onSaved }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const creating = !profile;
  const [form, setForm] = useState(blank());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(profile ? fromProfile(profile) : { ...blank(), status: 'ACTIVE' });
  }, [open, profile]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // A designation switched off is still offered on the person who has it, but not to anyone else.
  const designationChoices = useMemo(
    () => designations.filter((d) => d.active || String(d.id) === form.designationId),
    [designations, form.designationId]
  );

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = creating ? await createStaff(toWire(form)) : await updateStaff(profile.id, toWire(form));
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  const text = (k, label, props = {}) => (
    <TextField size="small" fullWidth label={label} value={form[k]} onChange={set(k)} disabled={saving} {...props} />
  );
  const date = (k, label, helperText) => text(k, label, { type: 'date', InputLabelProps: { shrink: true }, helperText: helperText || ' ' });
  const choice = (k, label, options, props = {}) => text(k, label, {
    select: true, children: [<MenuItem key="" value="">—</MenuItem>, ...options], ...props,
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <DialogTitle sx={{ fontWeight: 800 }}>{creating ? 'Add staff member' : `Edit ${profile.fullName}`}</DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        <Typography variant="overline" sx={{ color: COLORS.textMuted }}>Basic</Typography>
        <Grid container spacing={1.5} sx={{ mb: 1 }}>
          <Grid item xs={12} sm={6}>{text('fullName', 'Full name', { required: true, autoFocus: creating })}</Grid>
          <Grid item xs={12} sm={3}>{date('dateOfBirth', 'Date of birth', ' ')}</Grid>
          <Grid item xs={12} sm={3}>{choice('gender', 'Gender', GENDERS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>))}</Grid>
          <Grid item xs={12} sm={4}>{text('mobile', 'Mobile')}</Grid>
          <Grid item xs={12} sm={5}>{text('personalEmail', 'Personal email')}</Grid>
          <Grid item xs={12} sm={3}>{choice('bloodGroup', 'Blood group (optional)', BLOOD_GROUPS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>))}</Grid>
          <Grid item xs={12}>{text('address', 'Address', { multiline: true, minRows: 2 })}</Grid>
          <Grid item xs={12} sm={4}>{text('emergencyName', 'Emergency contact')}</Grid>
          <Grid item xs={12} sm={4}>{text('emergencyRelation', 'Relation')}</Grid>
          <Grid item xs={12} sm={4}>{text('emergencyNumber', 'Emergency number')}</Grid>
        </Grid>

        <Typography variant="overline" sx={{ color: COLORS.textMuted }}>Employment</Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={4}>
            {choice('designationId', 'Designation', designationChoices.map((d) => (
              <MenuItem key={d.id} value={String(d.id)}>{d.name}{d.active ? '' : ' (off)'}</MenuItem>
            )))}
          </Grid>
          <Grid item xs={12} sm={4}>{text('department', 'Department')}</Grid>
          <Grid item xs={12} sm={4}>{date('joinedOn', 'Date of joining')}</Grid>
          <Grid item xs={12} sm={4}>
            {choice('managerId', 'Reports to', staff.filter((s) => !profile || s.id !== profile.id).map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>{s.fullName}</MenuItem>
            )))}
          </Grid>
          <Grid item xs={12} sm={4}>
            {choice('platformUserId', 'Console login', (operators || []).map((o) => (
              <MenuItem key={o.id} value={String(o.id)}>{o.name || o.username} ({o.username})</MenuItem>
            )), { helperText: 'Links this person to their own pipeline work.' })}
          </Grid>
          <Grid item xs={12} sm={4}>
            {text('status', 'Status', {
              select: true,
              helperText: form.status === 'RELEASED' ? 'Their lead credit stays; the profile is kept.' : ' ',
              children: Object.entries(STAFF_STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>),
            })}
          </Grid>
          <Grid item xs={12} sm={4}>{date('cardValidUntil', 'Card valid until', 'Blank means one year from joining.')}</Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving || !form.fullName.trim()}>
          {saving ? 'Saving…' : creating ? 'Add' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
