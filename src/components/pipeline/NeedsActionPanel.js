import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import { COLORS } from '../../styles/js/styleConstants';
import { DUE_COLORS } from '../../styles/js/adminTokens';
import { dueLabel, dueState } from '../../utils/pipeline';

/**
 * Every lead with an action due today or overdue, overdue first. Hidden when empty, so on a good
 * morning the board is the first thing on the page. The same list the 08:00 reminder emails.
 */
export default function NeedsActionPanel({ items, today, canWrite, busyId, onDone, onReschedule, onOpen }) {
  if (!items.length) return null;
  const overdue = items.filter((l) => dueState(l, today) === 'overdue').length;
  return (
    <Card sx={{ mb: 2, borderLeft: `4px solid ${COLORS.error}` }} aria-live="polite">
      <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.error }}>
          Needs action: {overdue} overdue, {items.length - overdue} due today
        </Typography>
        {items.map((lead) => {
          const state = dueState(lead, today);
          const color = state === 'overdue' ? DUE_COLORS.overdue : DUE_COLORS.today;
          const busy = busyId === lead.id;
          return (
            <Box
              key={lead.id}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 1,
                py: 1,
                borderTop: `1px solid ${COLORS.borderLight}`,
              }}
            >
              <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: COLORS.textPrimary, overflowWrap: 'anywhere' }}>
                  {lead.name}
                </Typography>
                <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', overflowWrap: 'anywhere' }}>
                  {lead.nextAction || 'No action noted'} · {lead.stageName}
                  {lead.ownerName ? ` · ${lead.ownerName}` : ''}
                </Typography>
              </Box>
              <Chip size="small" label={dueLabel(lead, today)} sx={{ color: color.fg, backgroundColor: color.bg, fontWeight: 600, height: 22 }} />
              <TextField
                type="date"
                size="small"
                value={lead.nextActionDue || ''}
                disabled={!canWrite || busy}
                onChange={(e) => e.target.value && onReschedule(lead.id, e.target.value)}
                inputProps={{ 'aria-label': `Reschedule ${lead.name}` }}
                sx={{ width: 150, '& input': { py: 0.6, fontSize: 13 } }}
              />
              <Button size="small" variant="outlined" disabled={!canWrite || busy} onClick={() => onDone(lead.id)}>
                Done
              </Button>
              <Button size="small" onClick={() => onOpen(lead.id)}>
                Open
              </Button>
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}
