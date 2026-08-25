import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { COLORS } from '../styles/js/styleConstants';

/** A single headline number. Used across the usage report and the account detail header. */
export default function StatCard({ label, value, hint }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" sx={{ color: COLORS.textMuted, letterSpacing: '0.08em' }}>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.textPrimary, mt: 0.5 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="body2" sx={{ color: COLORS.textMuted, mt: 0.5 }}>
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
