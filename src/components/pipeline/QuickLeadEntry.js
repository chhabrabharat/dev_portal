import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { COLORS } from '../../styles/js/styleConstants';

/**
 * Parse lines like "Bullet Contact Person: Front Desk Staff" into a {fieldLabel: value} map.
 * Multi-line values are supported: continuation lines (no "Bullet" prefix) append to the last key.
 */
function parseBulletText(text) {
  const fields = {};
  let lastKey = null;
  let accumulator = [];

  const flush = () => {
    if (lastKey != null) fields[lastKey] = accumulator.join('\n').trim();
  };

  for (const raw of text.split('\n')) {
    const m = raw.match(/^bullet\s+([^:]+):\s*(.*)/i);
    if (m) {
      flush();
      lastKey = m[1].trim().toLowerCase();
      accumulator = [m[2].trim()];
    } else if (lastKey != null) {
      accumulator.push(raw.trim());
    }
  }
  flush();
  return fields;
}

/** Map parsed field labels to LeadDialog form keys. */
const FIELD_MAP = {
  'doctor': 'name',
  'clinic': 'name',
  'hospital': 'name',
  'contact person': 'contactPerson',
  'contact': 'contactPerson',
  'phone': 'phone',
  'mobile': 'phone',
  'notes': 'notes',
  'note': 'notes',
  'address': 'address',
  'type': 'type',
  'source': 'source',
  'referred by': 'referredBy',
  'referral': 'referredBy',
};

export function parseQuickEntry(text) {
  const raw = parseBulletText(text);
  const lead = {};
  for (const [key, val] of Object.entries(raw)) {
    const mapped = FIELD_MAP[key];
    if (mapped && val) lead[mapped] = val;
  }
  return lead;
}

const PLACEHOLDER = `Bullet Doctor: Dr. Numa Akhtar
Bullet Contact Person: Front Desk Staff
Bullet Phone: 9999999999
Bullet Notes: Interested in the product. Asked about pricing.`;

export default function QuickLeadEntry({ onSubmit, disabled }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  const handleOpen = () => setOpen((o) => !o);

  const handleSubmit = () => {
    const parsed = parseQuickEntry(text);
    onSubmit(parsed);
    setText('');
    setOpen(false);
  };

  return (
    <Box sx={{ mb: 1.5 }}>
      <Button
        size="small"
        onClick={handleOpen}
        sx={{
          color: open ? COLORS.primary : COLORS.textMuted,
          textTransform: 'none',
          fontSize: 12,
          fontWeight: 500,
          p: 0,
          minWidth: 0,
          '&:hover': { background: 'none', color: COLORS.primary },
        }}
        disableRipple
      >
        {open ? '▲ Hide quick entry' : '⚡ Quick entry from call notes'}
      </Button>

      <Collapse in={open}>
        <Paper
          variant="outlined"
          sx={{ p: 1.5, mt: 0.75, borderColor: 'divider', borderRadius: 1 }}
        >
          <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', mb: 1 }}>
            Paste call notes — one "Bullet Field: Value" line per field. Multi-line values are supported.
          </Typography>
          <TextField
            multiline
            minRows={4}
            maxRows={12}
            fullWidth
            size="small"
            placeholder={PLACEHOLDER}
            value={text}
            onChange={(e) => setText(e.target.value)}
            sx={{ fontFamily: 'monospace', fontSize: 13 }}
            inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button
              variant="outlined"
              size="small"
              disabled={disabled || !text.trim()}
              onClick={handleSubmit}
            >
              Open as lead →
            </Button>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
}
