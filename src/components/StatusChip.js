import React from 'react';
import Chip from '@mui/material/Chip';
import { statusToken } from '../styles/js/adminTokens';

/**
 * Renders an Account.AccountStatus. A null/undefined status is shown as its own "No status set"
 * state rather than being coerced to NEW - see adminTokens.STATUS_COLORS for why that distinction
 * is real in this data.
 */
export default function StatusChip({ status, size = 'small' }) {
  const token = statusToken(status);
  return (
    <Chip
      size={size}
      label={token.label}
      sx={{
        color: token.fg,
        backgroundColor: token.bg,
        fontWeight: 600,
        border: `1px solid ${token.fg}22`,
      }}
    />
  );
}
