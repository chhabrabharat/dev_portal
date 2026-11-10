import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import { COLORS } from '../../styles/js/styleConstants';
import { PIPELINE_KIND_COLORS } from '../../styles/js/adminTokens';
import LeadCard from './LeadCard';

const PAGE = 30;
// On a phone a column is a fixed swipe-width; from md up the columns share the row so the
// whole working board (seven columns) is visible at once on a laptop without scrolling.
const COLUMN_WIDTH = 272;
const COLUMN_MIN = 158;
// ...and a ceiling, so a two-column view (On hold / Lost) doesn't stretch each to half the screen.
const COLUMN_MAX = 360;

/**
 * The columns. Horizontal scroll with snap, so on a phone each swipe lands on a column rather
 * than halfway between two. Each column scrolls its own cards; the page body never scrolls
 * sideways, only this container does.
 *
 * `flow` is the ordered list of stages a lead advances through with the arrow button - every
 * non-terminal stage up to Live, in board order. It comes from `allStages`, not the columns on
 * screen, so the arrow still knows the next stage when the board is showing a subset.
 */
export default function PipelineBoard({ stages, allStages, leadsByStage, today, canWrite, onOpen, onAdd, onMove }) {
  const [dragId, setDragId] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [limits, setLimits] = useState({});

  const flow = (allStages || stages).filter((s) => s.kind === 'OPEN' || s.kind === 'ONBOARDING' || s.kind === 'LIVE');
  const nextOf = (stageId) => {
    const i = flow.findIndex((s) => s.id === stageId);
    return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
  };

  const endDrag = () => {
    setDragId(null);
    setOverStage(null);
  };

  return (
    <Box
      aria-label="Pipeline board"
      sx={{
        display: 'flex',
        gap: { xs: 1.5, md: 1 },
        overflowX: 'auto',
        alignItems: 'flex-start',
        pb: 1.5,
        scrollSnapType: 'x proximity',
        // Negative margin lets the first/last column reach the page edge on a phone while the
        // rest of the page keeps its gutter.
        mx: { xs: -2, md: 0 },
        px: { xs: 2, md: 0 },
      }}
    >
      {stages.map((stage) => {
        const items = leadsByStage[stage.id] || [];
        const limit = limits[stage.id] || PAGE;
        const accent = PIPELINE_KIND_COLORS[stage.kind] || COLORS.primary;
        const isOver = overStage === stage.id && dragId !== null;
        return (
          <Box
            key={stage.id}
            data-stage={stage.id}
            onDragOver={(e) => {
              if (dragId === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (overStage !== stage.id) setOverStage(stage.id);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setOverStage((s) => (s === stage.id ? null : s));
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = dragId ?? Number(e.dataTransfer.getData('text/plain'));
              endDrag();
              if (id) onMove(id, stage.id);
            }}
            sx={{
              flex: { xs: `0 0 ${COLUMN_WIDTH}px`, md: '1 1 0' },
              minWidth: { md: COLUMN_MIN },
              maxWidth: { md: COLUMN_MAX },
              scrollSnapAlign: 'start',
              backgroundColor: COLORS.backgroundSecondary,
              borderRadius: 2.5,
              p: { xs: 1.25, md: 1 },
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 230px)',
              minHeight: 140,
              outline: isOver ? `2px dashed ${COLORS.primary}` : '2px dashed transparent',
              outlineOffset: -2,
              transition: 'outline-color 120ms',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, px: 0.25 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: accent, flexShrink: 0 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.textPrimary, flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {stage.name}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.textMuted, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {items.length}
              </Typography>
              <Tooltip title={canWrite ? `Add a lead to ${stage.name}` : 'PLATFORM_SUPPORT is read-only'}>
                <span>
                  <IconButton size="small" disabled={!canWrite} onClick={() => onAdd(stage.id)} aria-label={`Add lead to ${stage.name}`} sx={{ p: 0.25 }}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto', minHeight: 40, flex: 1, pr: 0.25 }}>
              {items.slice(0, limit).map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  today={today}
                  nextStage={nextOf(stage.id)}
                  canWrite={canWrite}
                  onOpen={onOpen}
                  onAdvance={onMove}
                  onDragStart={setDragId}
                  onDragEnd={endDrag}
                  dragging={dragId === lead.id}
                />
              ))}
              {items.length === 0 && (
                <Typography variant="caption" sx={{ color: COLORS.textMuted, textAlign: 'center', py: 2, border: `1px dashed ${COLORS.borderGreen}`, borderRadius: 2 }}>
                  {canWrite ? 'Drop a lead here' : 'No leads'}
                </Typography>
              )}
              {items.length > limit && (
                <Button size="small" onClick={() => setLimits((l) => ({ ...l, [stage.id]: limit + PAGE }))}>
                  Show {items.length - limit} more
                </Button>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
