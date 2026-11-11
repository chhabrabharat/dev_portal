import React, { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { COLORS } from '../../styles/js/styleConstants';
import { PIPELINE_CATEGORIES, PIPELINE_SOURCES } from '../../styles/js/adminTokens';
import {
  addPipelineNote, createPipelineLead, deletePipelineLead, errorMessage, fetchPipelineLead, patchPipelineLead,
} from '../../services/api';
import { longDate } from '../../utils/pipeline';
import { dateTime } from '../../utils/format';

const EMPTY = {
  name: '', type: '', category: 'CLINIC', phone: '', address: '', source: 'NETWORK_REFERRAL', referredBy: '',
  contactPerson: '', ownerId: '', interested: '', stageId: '', nextAction: '', nextActionDue: '', notes: '',
};

const FIELDS = ['name', 'type', 'category', 'phone', 'address', 'source', 'referredBy', 'contactPerson', 'ownerId',
  'interested', 'stageId', 'nextAction', 'nextActionDue', 'notes'];

function toForm(lead) {
  const f = { ...EMPTY };
  FIELDS.forEach((k) => {
    const v = lead[k];
    f[k] = v === null || v === undefined ? '' : String(v);
  });
  return f;
}

/** Form value -> wire value. '' becomes null so a cleared field clears on the server. */
function toWire(key, value) {
  if (value === '') return null;
  if (key === 'ownerId' || key === 'stageId') return Number(value);
  return value;
}

/**
 * Create (when `leadId` is null) or edit a lead. Editing saves a PATCH of only the keys that
 * changed, so two operators editing different fields of the same lead don't overwrite each
 * other. The history and milestone dates come from the detail fetch, not the board row.
 */
export default function LeadDialog({ open, leadId, defaultStageId, defaultValues, stages, owners, canWrite, onClose, onSaved, onDeleted }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [armDelete, setArmDelete] = useState(false);
  const [tab, setTab] = useState(0);

  const creating = !leadId;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNote('');
    setArmDelete(false);
    setTab(0);
    if (creating) {
      setDetail(null);
      // defaultValues captured via closure at open time — intentionally not in deps
      setForm({ ...EMPTY, ...(defaultValues || {}), stageId: defaultStageId ? String(defaultStageId) : '' });
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchPipelineLead(leadId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setForm(toForm(d.lead));
      })
      .catch((e) => !cancelled && setError(errorMessage(e, 'Could not load this lead')))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leadId, creating, defaultStageId]);

  const original = useMemo(() => (detail ? toForm(detail.lead) : EMPTY), [detail]);
  const changed = useMemo(() => FIELDS.filter((k) => form[k] !== original[k]), [form, original]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (creating) {
        const payload = {};
        FIELDS.forEach((k) => { payload[k] = toWire(k, form[k]); });
        const lead = await createPipelineLead(payload);
        onSaved(lead);
        onClose();
      } else {
        if (changed.length === 0) { onClose(); return; }
        const payload = {};
        changed.forEach((k) => { payload[k] = toWire(k, form[k]); });
        const lead = await patchPipelineLead(leadId, payload);
        onSaved(lead);
        onClose();
      }
    } catch (e) {
      setError(errorMessage(e, 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  const logNote = async () => {
    if (!note.trim()) { setError('Type a note first'); return; }
    setSaving(true);
    setError(null);
    try {
      const d = await addPipelineNote(leadId, note.trim());
      setDetail(d);
      setNote('');
    } catch (e) {
      setError(errorMessage(e, 'Could not log the note'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!armDelete) { setArmDelete(true); return; }
    setSaving(true);
    try {
      await deletePipelineLead(leadId);
      onDeleted(leadId);
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Could not delete'));
      setSaving(false);
    }
  };

  const lead = detail?.lead;
  const milestones = lead ? [
    ['Added', lead.addedOn], ['Contacted', lead.contactedOn], ['Demo', lead.demoOn],
    ['Onboarding', lead.onboardingOn], ['Training done', lead.trainingDoneOn], ['Went live', lead.goLiveOn],
  ].filter(([, d]) => d) : [];

  const field = (key, label, props = {}) => (
    <TextField
      size="small"
      fullWidth
      label={label}
      value={form[key]}
      onChange={set(key)}
      disabled={!canWrite || loading}
      {...props}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle sx={{ fontWeight: 800, color: COLORS.textPrimary, pb: 1 }}>
        {creating ? 'New lead' : lead?.name || 'Lead'}
      </DialogTitle>
      <DialogContent sx={{ pt: '0 !important', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {error && <Alert severity="error" sx={{ mx: 0, mt: 1, mb: 0 }} onClose={() => setError(null)}>{error}</Alert>}
        {!canWrite && <Alert severity="info" sx={{ mx: 0, mt: 1, mb: 0 }}>PLATFORM_SUPPORT is read-only; fields are shown but cannot be changed.</Alert>}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, mt: 1, flexShrink: 0 }}>
          <Tab label="Details" />
          <Tab label="Notes & History" />
        </Tabs>

        {/* ── Tab 0: lead info fields ── */}
        {tab === 0 && (
          <Box sx={{ overflowY: 'auto', flex: 1 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={12}>{field('name', 'Clinic or hospital name', { required: true, autoFocus: creating })}</Grid>
              <Grid item xs={12} sm={6}>{field('type', 'Type (e.g. Dental clinic)')}</Grid>
              <Grid item xs={12} sm={6}>
                {field('category', 'Category', { select: true, children: [
                  <MenuItem key="" value="">—</MenuItem>,
                  ...Object.entries(PIPELINE_CATEGORIES).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>),
                ] })}
              </Grid>
              <Grid item xs={12} sm={6}>{field('phone', 'Phone')}</Grid>
              <Grid item xs={12} sm={6}>{field('contactPerson', 'Contact person')}</Grid>
              <Grid item xs={12}>{field('address', 'Address')}</Grid>
              <Grid item xs={12} sm={6}>
                {field('source', 'Source', { select: true, children: [
                  <MenuItem key="" value="">—</MenuItem>,
                  ...Object.entries(PIPELINE_SOURCES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>),
                ] })}
              </Grid>
              <Grid item xs={12} sm={6}>{field('referredBy', 'Referred by')}</Grid>
              <Grid item xs={12} sm={6}>
                {field('ownerId', 'Owner', { select: true, children: [
                  <MenuItem key="" value="">— Nobody yet —</MenuItem>,
                  ...owners.map((o) => <MenuItem key={o.id} value={String(o.id)}>{o.name}</MenuItem>),
                ] })}
              </Grid>
              <Grid item xs={12} sm={6}>
                {field('interested', 'Doctor interested?', {
                  select: true,
                  helperText: form.interested === 'NOT_INTERESTED' && original.interested !== 'NOT_INTERESTED' ? 'Saving will move this lead to Lost.' : ' ',
                  children: [
                    <MenuItem key="" value="">—</MenuItem>,
                    <MenuItem key="INTERESTED" value="INTERESTED">Interested</MenuItem>,
                    <MenuItem key="NOT_INTERESTED" value="NOT_INTERESTED">Not Interested</MenuItem>,
                  ],
                })}
              </Grid>
              <Grid item xs={12} sm={6}>
                {field('stageId', 'Stage', { select: true, children: stages.map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>) })}
              </Grid>
              <Grid item xs={12} sm={6}>
                {field('nextActionDue', 'Due date for next action', { type: 'date', InputLabelProps: { shrink: true } })}
              </Grid>
              <Grid item xs={12}>{field('nextAction', 'Next action (what to do)')}</Grid>
            </Grid>
          </Box>
        )}

        {/* ── Tab 1: notes + log + history ── */}
        {tab === 1 && (
          <Box sx={{ overflowY: 'auto', flex: 1 }}>
            {field('notes', 'Notes', { multiline: true, minRows: 4 })}

            {!creating && lead && (
              <>
                <Divider sx={{ my: 2 }} />
                {lead.source === 'GOOGLE_COLD' && lead.rating != null && (
                  <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', mb: 1 }}>
                    Google: ★ {lead.rating} ({lead.reviewCount ?? 0} reviews){lead.distanceKm != null ? ` · ${lead.distanceKm} km` : ''}
                  </Typography>
                )}
                {milestones.length > 0 && (
                  <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', mb: 1.5 }}>
                    {milestones.map(([k, d]) => `${k} ${longDate(d)}`).join('  ·  ')}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1.5, mt: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Log a note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={!canWrite || saving}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); logNote(); } }}
                  />
                  <Button variant="outlined" onClick={logNote} disabled={!canWrite || saving || !note.trim()} sx={{ flexShrink: 0 }}>
                    Log
                  </Button>
                </Box>

                <Typography variant="overline" sx={{ color: COLORS.textMuted, letterSpacing: '0.08em' }}>History</Typography>
                <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                  {detail.history.length === 0 && (
                    <Typography component="li" variant="caption" sx={{ color: COLORS.textMuted }}>No activity yet.</Typography>
                  )}
                  {detail.history.map((h) => (
                    <Typography component="li" key={h.id} variant="caption" sx={{ color: COLORS.textSecondary, display: 'block', py: 0.25, overflowWrap: 'anywhere' }}>
                      <Box component="span" sx={{ color: COLORS.textMuted }}>{dateTime(h.at)} · {h.byUser} · </Box>
                      {h.text}
                    </Typography>
                  ))}
                </Box>
              </>
            )}

            {creating && (
              <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', mt: 1 }}>
                Save the lead first to log notes and see history.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        {!creating && canWrite && (
          <Button color="error" onClick={remove} disabled={saving} sx={{ mr: 'auto' }}>
            {armDelete ? 'Click again to delete' : 'Delete lead'}
          </Button>
        )}
        <Button onClick={onClose} disabled={saving}>{canWrite ? 'Cancel' : 'Close'}</Button>
        {canWrite && (
          <Button variant="contained" onClick={save} disabled={saving || loading || !form.name.trim() || (!creating && changed.length === 0)}>
            {saving ? 'Saving…' : creating ? 'Add lead' : 'Save'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
