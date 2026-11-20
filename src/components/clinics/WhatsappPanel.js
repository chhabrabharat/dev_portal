import React, { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { usePlatformAuth } from '../../context/PlatformAuthContext';
import {
  deleteWhatsappRule, errorMessage, fetchClinicBranches, fetchClinicDoctors, fetchWhatsappEffective,
  fetchWhatsappRules, fetchWhatsappTemplates, setWhatsappRule,
} from '../../services/api';
import { COLORS } from '../../styles/js/styleConstants';

const pretty = (k) => k.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/**
 * Which template each message uses for this clinic, and who it was picked by. A rule can be
 * scoped to the clinic, a branch or one doctor (doctor beats branch beats clinic). Only approved
 * templates written for the message kind are offered - the server enforces the same.
 */
export default function WhatsappPanel({ clinicId }) {
  const { canWrite } = usePlatformAuth();
  const [effective, setEffective] = useState(null);
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [branches, setBranches] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ scope: 'CLINIC', branchId: '', doctorId: '', kind: '', template: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [e, r, t, b, d] = await Promise.all([
        fetchWhatsappEffective(clinicId), fetchWhatsappRules(clinicId), fetchWhatsappTemplates(),
        fetchClinicBranches(clinicId), fetchClinicDoctors(clinicId),
      ]);
      setEffective(e); setRules(r); setTemplates(t); setBranches(b); setDoctors(d);
    } catch (err) {
      setError(errorMessage(err, 'Could not load WhatsApp settings'));
    }
  }, [clinicId]);
  useEffect(() => { load(); }, [load]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!effective) return <LinearProgress />;

  const kinds = effective.map((r) => r.kind);
  const options = templates.filter((t) => t.status === 'APPROVED' && (!form.kind || t.kind === form.kind));
  const nameOf = (list, id) => list.find((x) => x.id === id)?.name || `#${id}`;
  const scopeLabel = (r) => (r.scope === 'DOCTOR' ? `Doctor · ${nameOf(doctors, r.doctorId)}`
    : r.scope === 'BRANCH' ? `Branch · ${nameOf(branches, r.branchId)}` : 'Whole clinic');

  const save = async () => {
    setSaving(true); setError(null);
    try {
      await setWhatsappRule(clinicId, {
        scope: form.scope,
        branchId: form.scope === 'BRANCH' ? Number(form.branchId) : null,
        doctorId: form.scope === 'DOCTOR' ? Number(form.doctorId) : null,
        kind: form.kind, template: form.template,
      });
      setForm({ ...form, template: '' });
      await load();
    } catch (e) {
      setError(errorMessage(e, 'Could not save rule'));
    } finally { setSaving(false); }
  };

  const valid = form.kind && form.template
    && (form.scope !== 'BRANCH' || form.branchId) && (form.scope !== 'DOCTOR' || form.doctorId);

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Template in use (clinic level)</Typography>
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {effective.map((r) => (
            <Card key={r.kind} sx={{ p: 1.5 }}>
              <Typography variant="body2" sx={{ color: COLORS.textMuted }}>{pretty(r.kind)}</Typography>
              <Typography sx={{ fontWeight: 700, wordBreak: 'break-all' }}>{r.template || '—'}</Typography>
              <Chip size="small" label={r.source === 'DEFAULT' ? 'Default' : pretty(r.source)} sx={{ mt: 0.5 }} />
            </Card>
          ))}
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Rules</Typography>
        {rules.length === 0 && <Typography sx={{ color: COLORS.textMuted }}>No rules - every message uses the default template.</Typography>}
        {rules.map((r) => (
          <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderTop: '1px solid #e2e8f0' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600 }}>{pretty(r.kind)} → {r.template}</Typography>
              <Typography variant="caption" sx={{ color: COLORS.textMuted }}>{scopeLabel(r)}</Typography>
            </Box>
            {canWrite && (
              <IconButton size="small" aria-label="Delete rule" onClick={async () => { await deleteWhatsappRule(clinicId, r.id); await load(); }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        ))}
      </Box>

      {canWrite && (
        <Card sx={{ p: 2, display: 'grid', gap: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>Add or change a rule</Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
            <TextField select size="small" label="Applies to" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
              <MenuItem value="CLINIC">Whole clinic</MenuItem>
              <MenuItem value="BRANCH">One branch</MenuItem>
              <MenuItem value="DOCTOR">One doctor</MenuItem>
            </TextField>
            {form.scope === 'BRANCH' && (
              <TextField select size="small" label="Branch" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            )}
            {form.scope === 'DOCTOR' && (
              <TextField select size="small" label="Doctor" value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}>
                {doctors.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </TextField>
            )}
            <TextField select size="small" label="Message" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, template: '' })}>
              {kinds.map((k) => <MenuItem key={k} value={k}>{pretty(k)}</MenuItem>)}
            </TextField>
            <TextField
              select size="small" label="Template" value={form.template} disabled={!form.kind}
              onChange={(e) => setForm({ ...form, template: e.target.value })}
              helperText={form.kind && options.length === 0 ? 'No approved template for this message' : 'Approved only'}
            >
              {options.map((t) => <MenuItem key={t.id} value={t.name}>{t.name}</MenuItem>)}
            </TextField>
          </Box>
          <Box><Button variant="contained" onClick={save} disabled={!valid || saving}>Save rule</Button></Box>
        </Card>
      )}
    </Box>
  );
}
