import React from 'react';
import Chip from '@mui/material/Chip';
import { categoryToken, scoreBand, SCORE_BANDS } from '../../styles/js/adminTokens';

export function CategoryChip({ category }) {
  const t = categoryToken(category);
  return <Chip size="small" label={t.label} sx={{ color: t.fg, backgroundColor: t.bg, fontWeight: 700 }} />;
}

export function ScoreChip({ score, status }) {
  const band = SCORE_BANDS[scoreBand(score, status)];
  const label = score === null || score === undefined ? band.label : String(score);
  return <Chip size="small" label={label} sx={{ color: band.fg, backgroundColor: band.bg, fontWeight: 700, minWidth: 44 }} />;
}
