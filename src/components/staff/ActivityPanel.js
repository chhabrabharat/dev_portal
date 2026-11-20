import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import { COLORS } from '../../styles/js/styleConstants';
import { errorMessage, fetchAudit } from '../../services/api';
import { dateTime } from '../../utils/format';

/** The audit trail for one person (ADMIN only; the log holds old and new pay values). */
export default function ActivityPanel({ staffId }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAudit(500)
      .then((all) => setRows(all.filter((a) => a.entity === 'staff' && a.entityId === String(staffId))))
      .catch((e) => setError(errorMessage(e, 'Could not load the audit log')));
  }, [staffId]);

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', mb: 1 }}>
        Newest first, from the most recent 500 entries. The log is append-only.
      </Typography>
      <TableContainer>
        <Table size="small" sx={{ minWidth: 560 }}>
          <TableHead><TableRow>{['When', 'Who', 'What', 'Change'].map((h) => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {(rows || []).map((a) => (
              <TableRow key={a.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateTime(a.at)}</TableCell>
                <TableCell>{a.actor}</TableCell>
                <TableCell>{a.action.replace(/_/g, ' ').toLowerCase()}</TableCell>
                <TableCell sx={{ overflowWrap: 'anywhere' }}>{[a.oldValue, a.newValue].filter(Boolean).join('  →  ') || '—'}</TableCell>
              </TableRow>
            ))}
            {rows && rows.length === 0 && <TableRow><TableCell colSpan={4} sx={{ color: COLORS.textMuted, textAlign: 'center', py: 3 }}>Nothing recorded yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
