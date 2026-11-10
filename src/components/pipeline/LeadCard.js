import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { COLORS, SHADOWS } from '../../styles/js/styleConstants';
import { DUE_COLORS, PIPELINE_CATEGORIES, PIPELINE_INTEREST, PIPELINE_SOURCES } from '../../styles/js/adminTokens';
import { daysBetween, dueLabel, dueState } from '../../utils/pipeline';

const tagSx = (fg, bg) => ({
  height: 20,
  fontSize: 11,
  fontWeight: 600,
  color: fg,
  backgroundColor: bg,
  '& .MuiChip-label': { px: 1 },
});

/**
 * One lead on the board. Draggable on pointer devices; the arrow button is the touch-screen
 * (and keyboard) way to advance a stage, so a phone is never stuck without drag-and-drop.
 */
export default function LeadCard({ lead, today, nextStage, canWrite, onOpen, onAdvance, onDragStart, onDragEnd, dragging }) {
  const due = dueState(lead, today);
  const dueColor = due === 'overdue' ? DUE_COLORS.overdue : due === 'today' ? DUE_COLORS.today : DUE_COLORS.later;
  const meta = [lead.type, lead.category && PIPELINE_CATEGORIES[lead.category]]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(' · ');
  const who = lead.contactPerson || lead.ownerName;
  const days = daysBetween(lead.stageSince || lead.addedOn, today);

  return (
    <Box
      role="button"
      tabIndex={0}
      draggable={canWrite}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(lead.id));
        onDragStart(lead.id);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(lead.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(lead.id);
        }
      }}
      sx={{
        backgroundColor: COLORS.backgroundCard,
        border: `1px solid ${COLORS.borderLight}`,
        borderRadius: 2,
        p: 1.25,
        boxShadow: SHADOWS.sm,
        cursor: canWrite ? 'grab' : 'pointer',
        opacity: dragging ? 0.4 : 1,
        transition: 'box-shadow 120ms',
        '&:hover': { boxShadow: SHADOWS.md },
        '&:focus-visible': { outline: `2px solid ${COLORS.primary}`, outlineOffset: 1 },
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 700, color: COLORS.textPrimary, overflowWrap: 'anywhere', lineHeight: 1.3 }}>
        {lead.name}
      </Typography>
      {meta && (
        <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', overflowWrap: 'anywhere' }}>
          {meta}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
        {lead.source && (
          <Chip size="small" label={PIPELINE_SOURCES[lead.source]?.short || lead.source} sx={tagSx(COLORS.textSecondary, '#f1f5f9')} />
        )}
        {lead.interested && PIPELINE_INTEREST[lead.interested] && (
          <Chip
            size="small"
            label={PIPELINE_INTEREST[lead.interested].label}
            sx={tagSx(PIPELINE_INTEREST[lead.interested].fg, PIPELINE_INTEREST[lead.interested].bg)}
          />
        )}
        {due && <Chip size="small" label={dueLabel(lead, today)} sx={tagSx(dueColor.fg, dueColor.bg)} />}
      </Box>

      {lead.nextAction && (
        <Typography variant="caption" sx={{ color: COLORS.textSecondary, display: 'block', mt: 0.75, overflowWrap: 'anywhere' }}>
          Next: {lead.nextAction}
        </Typography>
      )}
      {(lead.generatedByName || lead.closedByName) && (
        <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', mt: 0.5, overflowWrap: 'anywhere' }}>
          {[lead.generatedByName && `Found by ${lead.generatedByName}`, lead.closedByName && `Closed by ${lead.closedByName}`]
            .filter(Boolean).join(' · ')}
        </Typography>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 1 }}>
        <Typography variant="caption" sx={{ color: COLORS.textMuted, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {who || 'No contact'} · {days}d
        </Typography>
        {nextStage && canWrite && (
          <Tooltip title={`Move to ${nextStage.name}`}>
            <Button
              size="small"
              variant="outlined"
              endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
              onClick={(e) => {
                e.stopPropagation();
                onAdvance(lead.id, nextStage.id);
              }}
              sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: 11, lineHeight: 1.4, flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              {nextStage.name}
            </Button>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
