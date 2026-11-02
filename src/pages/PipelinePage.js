import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import {
  completePipelineAction, errorMessage, fetchPipelineBoard, fetchReminderSetting, movePipelineLead,
  setPipelineAction, updateReminderSetting,
} from '../services/api';
import { COLORS } from '../styles/js/styleConstants';
import { count } from '../utils/format';
import { isActionDue, isColdLead } from '../utils/pipeline';
import PipelineBoard from '../components/pipeline/PipelineBoard';
import NeedsActionPanel from '../components/pipeline/NeedsActionPanel';
import ColdPoolDrawer from '../components/pipeline/ColdPoolDrawer';
import LeadDialog from '../components/pipeline/LeadDialog';

// The app has no websocket; a 20s poll of one GET keeps every operator's board current without
// building a push channel for a team of a handful. Paused while the tab is hidden.
const POLL_MS = 20000;

const STAT_KEYS = [
  ['active', 'Active'], ['demos', 'Demos'], ['interested', 'Interested'], ['onboarding', 'Onboarding'],
  ['live', 'Live'], ['actionsDue', 'Actions due'], ['coldPool', 'In cold pool'],
];

export default function PipelinePage() {
  const { canWrite } = usePlatformAuth();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [pool, setPool] = useState('all');
  const [dueOnly, setDueOnly] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialog, setDialog] = useState({ open: false, leadId: null, stageId: null });
  const [busyId, setBusyId] = useState(null);
  const [reminder, setReminder] = useState(null);
  const inFlight = useRef(false);

  const load = useCallback(async ({ silent } = {}) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (!silent) setLoading(true);
    try {
      setBoard(await fetchPipelineBoard());
      setError(null);
    } catch (e) {
      // A failed background poll shouldn't blank a board that was fine a moment ago.
      if (!silent) setError(errorMessage(e, 'Could not load the pipeline'));
    } finally {
      inFlight.current = false;
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') load({ silent: true }); };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [load]);

  useEffect(() => {
    fetchReminderSetting().then(setReminder).catch(() => setReminder(null));
  }, []);

  const stages = useMemo(() => board?.stages || [], [board]);
  const stagesById = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s])), [stages]);
  const today = board?.today;

  const visibleLeads = useMemo(() => {
    if (!board) return [];
    const q = search.trim().toLowerCase();
    return board.leads.filter((l) => {
      if (pool === 'warm' && isColdLead(l)) return false;
      if (pool === 'cold' && !isColdLead(l)) return false;
      if (dueOnly && !isActionDue(l, today, stagesById)) return false;
      if (!q) return true;
      return [l.name, l.type, l.contactPerson, l.ownerName, l.referredBy, l.phone]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [board, search, pool, dueOnly, today, stagesById]);

  const leadsByStage = useMemo(() => {
    const by = {};
    visibleLeads.forEach((l) => { (by[l.stageId] = by[l.stageId] || []).push(l); });
    return by;
  }, [visibleLeads]);

  const dueItems = useMemo(() => {
    if (!board) return [];
    return board.leads
      .filter((l) => isActionDue(l, today, stagesById))
      .sort((a, b) => (a.nextActionDue < b.nextActionDue ? -1 : a.nextActionDue > b.nextActionDue ? 1 : a.name.localeCompare(b.name)));
  }, [board, today, stagesById]);

  // Put a server-returned row into the board immediately; the next poll reconciles the rest.
  const mergeLead = useCallback((lead) => {
    setBoard((b) => {
      if (!b) return b;
      const exists = b.leads.some((l) => l.id === lead.id);
      return { ...b, leads: exists ? b.leads.map((l) => (l.id === lead.id ? lead : l)) : [...b.leads, lead] };
    });
    load({ silent: true });
  }, [load]);

  const act = async (id, fn, successText) => {
    setBusyId(id);
    try {
      mergeLead(await fn());
      if (successText) setToast(successText);
    } catch (e) {
      setToast(errorMessage(e, 'That did not save'));
      load({ silent: true });
    } finally {
      setBusyId(null);
    }
  };

  const move = (id, stageId) => {
    const lead = board?.leads.find((l) => l.id === id);
    if (!lead || lead.stageId === stageId) return;
    // Optimistic: the card jumps now, the server row replaces it when the PUT returns.
    setBoard((b) => ({ ...b, leads: b.leads.map((l) => (l.id === id ? { ...l, stageId, stageName: stagesById[stageId]?.name, stageSince: today } : l)) }));
    act(id, () => movePipelineLead(id, stageId));
  };

  const openLead = (leadId) => setDialog({ open: true, leadId, stageId: null });

  const toggleReminder = async (on) => {
    try {
      setReminder(await updateReminderSetting(on ? 'EMAIL' : 'OFF'));
    } catch (e) {
      setToast(errorMessage(e, 'Could not change the reminder setting'));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>
            Pipeline
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
            Clinics and hospitals we are selling to. Drag a card to a new stage, or use the arrow on the card.
          </Typography>
        </Box>
        {/* One scrolling row on a phone: seven tiles wrapped three-deep pushed the board below the fold. */}
        {board && (
          <Box sx={{ display: 'flex', flexWrap: { xs: 'nowrap', md: 'wrap' }, gap: 1, overflowX: 'auto', maxWidth: '100%', pb: { xs: 0.5, md: 0 } }}>
            {STAT_KEYS.map(([key, label]) => (
              <Box key={key} sx={{ backgroundColor: COLORS.backgroundCard, border: `1px solid ${COLORS.borderLight}`, borderRadius: 2, px: 1.5, py: 0.75, minWidth: 84, flexShrink: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, color: key === 'actionsDue' && board.stats[key] > 0 ? COLORS.error : COLORS.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                  {count(board.stats[key])}
                </Typography>
                <Typography variant="caption" sx={{ color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 2 }}>
        <TextField
          size="small"
          label="Search name, type, contact, referrer, phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: '1 1 240px', maxWidth: 360 }}
        />
        <ToggleButtonGroup size="small" exclusive value={pool} onChange={(e, v) => v && setPool(v)} aria-label="Lead source">
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="warm">Warm</ToggleButton>
          <ToggleButton value="cold">Cold</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButton size="small" value="due" selected={dueOnly} onChange={() => setDueOnly((d) => !d)} aria-label="Only leads with actions due">
          Actions due
        </ToggleButton>
        <Box sx={{ flexGrow: 1 }} />
        {reminder && (
          <Tooltip title={
            !reminder.emailConfigured ? 'Email is not configured on this server, so no reminders go out.'
              : !reminder.email ? 'Your operator account has no email address.'
                : `08:00 IST summary of your due actions to ${reminder.email}`
          }>
            <FormControlLabel
              sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: 13, color: COLORS.textSecondary } }}
              control={<Switch size="small" checked={reminder.channel === 'EMAIL'} onChange={(e) => toggleReminder(e.target.checked)} />}
              label="Daily email"
            />
          </Tooltip>
        )}
        <Button variant="outlined" size="small" onClick={() => setDrawerOpen(true)}>
          Cold pool
        </Button>
        <Tooltip title={canWrite ? '' : 'PLATFORM_SUPPORT is read-only'}>
          <span>
            <Button variant="contained" size="small" disabled={!canWrite} onClick={() => setDialog({ open: true, leadId: null, stageId: stages[0]?.id || null })}>
              + New lead
            </Button>
          </span>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && !board && <LinearProgress sx={{ mb: 2 }} />}

      {board && (
        <>
          <NeedsActionPanel
            items={dueItems}
            today={today}
            canWrite={canWrite}
            busyId={busyId}
            onDone={(id) => act(id, () => completePipelineAction(id), 'Marked done. Open the card to set the next action.')}
            onReschedule={(id, date) => {
              const lead = board.leads.find((l) => l.id === id);
              act(id, () => setPipelineAction(id, lead?.nextAction || null, date));
            }}
            onOpen={openLead}
          />

          <PipelineBoard
            stages={stages}
            leadsByStage={leadsByStage}
            today={today}
            canWrite={canWrite}
            onOpen={openLead}
            onAdd={(stageId) => setDialog({ open: true, leadId: null, stageId })}
            onMove={move}
          />

          {board.leads.length === 0 && (
            <Typography variant="body2" sx={{ color: COLORS.textMuted, textAlign: 'center', py: 4 }}>
              No leads yet. Add one with "+ New lead" or pull one from the cold pool.
            </Typography>
          )}
        </>
      )}

      <ColdPoolDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        canWrite={canWrite}
        onAdded={(lead) => { mergeLead(lead); setToast(`Added "${lead.name}" to New.`); }}
      />

      <LeadDialog
        open={dialog.open}
        leadId={dialog.leadId}
        defaultStageId={dialog.stageId}
        stages={stages}
        owners={board?.owners || []}
        canWrite={canWrite}
        onClose={() => setDialog({ open: false, leadId: null, stageId: null })}
        onSaved={(lead) => mergeLead(lead)}
        onDeleted={(id) => {
          setBoard((b) => (b ? { ...b, leads: b.leads.filter((l) => l.id !== id) } : b));
          setToast('Lead deleted.');
          load({ silent: true });
        }}
      />

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}
