import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import { errorMessage, fetchDesignations, fetchPipelineBoard, fetchStaff } from '../services/api';
import { COLORS } from '../styles/js/styleConstants';
import { dateOnly } from '../utils/format';
import { STAFF_STATUS } from '../utils/staff';
import StaffFormDialog from '../components/staff/StaffFormDialog';
import DesignationsDialog from '../components/staff/DesignationsDialog';

export default function StaffPage() {
  const navigate = useNavigate();
  const { canWrite } = usePlatformAuth();
  const [staff, setStaff] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [operators, setOperators] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [desigOpen, setDesigOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([fetchStaff(), fetchDesignations()]);
      setStaff(s);
      setDesignations(d);
      setError(null);
    } catch (e) {
      setError(errorMessage(e, 'Could not load staff'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // The console-login picker reuses the pipeline board's operator list. Only admins add people.
  useEffect(() => {
    if (canWrite) fetchPipelineBoard().then((b) => setOperators(b.owners || [])).catch(() => setOperators([]));
  }, [canWrite]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((p) => {
      if (status !== 'ALL' && p.status !== status) return false;
      if (!q) return true;
      return [p.fullName, p.employeeCode, p.designationName, p.mobile, p.department]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [staff, search, status]);

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>Staff</Typography>
          <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
            The company's own people: profiles, documents, and who generated or closed which sales lead.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button component={RouterLink} to="/lead-credit" variant="outlined" size="small">Lead credit</Button>
          <Tooltip title={canWrite ? '' : 'PLATFORM_SUPPORT is read-only'}>
            <span><Button variant="outlined" size="small" disabled={!canWrite} onClick={() => setDesigOpen(true)}>Designations</Button></span>
          </Tooltip>
          <Tooltip title={canWrite ? '' : 'PLATFORM_SUPPORT is read-only'}>
            <span><Button variant="contained" size="small" disabled={!canWrite} onClick={() => setFormOpen(true)}>+ Add staff</Button></span>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <TextField size="small" label="Search name, code, designation, mobile" value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ flex: '1 1 260px', maxWidth: 380 }} />
        <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="ALL">All</MenuItem>
          {Object.entries(STAFF_STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </TextField>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Card>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                {['Code', 'Name', 'Designation', 'Mobile', 'Joined', 'Status'].map((h) => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/staff/${p.id}`)}>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{p.employeeCode}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{p.fullName}</TableCell>
                  <TableCell>{p.designationName || '—'}</TableCell>
                  <TableCell>{p.mobile || '—'}</TableCell>
                  <TableCell>{dateOnly(p.joinedOn)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={STAFF_STATUS[p.status] || p.status}
                      sx={{ fontWeight: 600, color: p.status === 'ACTIVE' ? '#065f46' : COLORS.textMuted, backgroundColor: p.status === 'ACTIVE' ? '#d1fae5' : '#f1f5f9' }} />
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', color: COLORS.textMuted, py: 4 }}>
                  {staff.length === 0 ? 'No staff yet.' : 'No one matches.'}
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <StaffFormDialog open={formOpen} profile={null} designations={designations} staff={staff} operators={operators}
        onClose={() => setFormOpen(false)} onSaved={(p) => navigate(`/staff/${p.id}`)} />
      <DesignationsDialog open={desigOpen} onClose={() => setDesigOpen(false)} onChanged={() => fetchDesignations().then(setDesignations)} />
    </Box>
  );
}
