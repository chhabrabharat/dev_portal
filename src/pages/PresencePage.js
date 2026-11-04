import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import StatusChip from '../components/StatusChip';
import StatCard from '../components/StatCard';
import { errorMessage, fetchPresenceOverview, runPresenceScoring } from '../services/api';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import { COLORS } from '../styles/js/styleConstants';
import { presenceScoreToken } from '../styles/js/adminTokens';
import { count } from '../utils/format';

function Score({ value }) {
  if (value == null) return '—';
  const t = presenceScoreToken(value);
  return (
    <Chip size="small" label={value} sx={{ color: t.fg, backgroundColor: t.bg, fontWeight: 700, minWidth: 44 }} />
  );
}

/**
 * Every branch's online presence score (Google, public page SEO/AEO, other directories), lowest
 * first - those are the clinics worth a call. Scores come from GET /platform/online-presence/overview;
 * "Score all branches" records a fresh score for everyone (admin only, sends no email).
 */
export default function PresencePage() {
  const navigate = useNavigate();
  const { canWrite } = usePlatformAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await fetchPresenceOverview());
    } catch (e) {
      setError(errorMessage(e, 'Could not load online presence'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scoreAll = async () => {
    setRunning(true);
    setError(null);
    setNotice(null);
    try {
      const r = await runPresenceScoring();
      setNotice(`Scored ${count(r.scored)} branches${r.failed ? `, ${count(r.failed)} failed` : ''}.`);
      await load();
    } catch (e) {
      setError(errorMessage(e, 'Could not score the branches'));
    } finally {
      setRunning(false);
    }
  };

  const rows = useMemo(() => {
    if (!overview) return [];
    const q = search.trim().toLowerCase();
    if (!q) return overview.branches;
    return overview.branches.filter((r) =>
      [r.accountName, r.branchName, r.city].some((v) => v && v.toLowerCase().includes(q)));
  }, [overview, search]);

  const low = overview ? overview.branches.filter((r) => r.overall != null && r.overall < 50).length : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, flexWrap: 'wrap', mb: 0.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>
          Online presence
        </Typography>
        <Button size="small" onClick={load} disabled={loading || running}>Refresh</Button>
        <Tooltip title={canWrite ? '' : 'PLATFORM_SUPPORT is read-only'}>
          <span>
            <Button size="small" variant="outlined" onClick={scoreAll} disabled={!canWrite || running || loading}>
              {running ? 'Scoring…' : 'Score all branches'}
            </Button>
          </span>
        </Tooltip>
      </Box>
      <Typography variant="body2" sx={{ color: COLORS.textMuted, mb: 2 }}>
        How findable and trustworthy each branch looks online. Clinics see the same score, with fixes,
        in Settings and get it by email on the 1st of each month. Lowest first.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      {overview && (
        <>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', mb: 3 }}>
            <StatCard
              label="Average score"
              value={overview.averageOverall == null ? '—' : overview.averageOverall}
              hint={`${count(overview.scored)} of ${count(overview.totalBranches)} branches scored`}
            />
            <StatCard label="Below 50" value={count(low)} hint="worth a call" />
            <StatCard label="Not scored yet" value={count(overview.totalBranches - overview.scored)}
              hint="scored when the clinic opens the screen, or on the next run" />
          </Box>

          <TextField
            size="small"
            placeholder="Search clinic, branch, city"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 280, mb: 2 }}
          />

          <Card>
            {loading && <LinearProgress />}
            {/* Explicit minWidth so the container scrolls, not the page body (see CLAUDE.md, Wide tables). */}
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 1100 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Clinic</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Overall</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Google</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Page</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Directories</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Biggest fixes</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Scored</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow
                      key={r.locationId}
                      hover
                      onClick={r.accountId ? () => navigate(`/accounts/${r.accountId}`) : undefined}
                      sx={{ cursor: r.accountId ? 'pointer' : 'default' }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {r.accountName || (r.accountId ? `Clinic #${r.accountId}` : 'No clinic')}
                          {/* Null status is its own state - never coerced to NEW. */}
                          <StatusChip status={r.accountStatus} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {r.branchName || `Branch #${r.locationId}`}
                        {r.city && (
                          <Typography component="span" variant="body2" sx={{ color: COLORS.textMuted }}>
                            {` · ${r.city}`}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell><Score value={r.overall} /></TableCell>
                      <TableCell><Score value={r.google} /></TableCell>
                      <TableCell><Score value={r.page} /></TableCell>
                      <TableCell><Score value={r.directories} /></TableCell>
                      <TableCell sx={{ maxWidth: 340 }}>
                        {r.topFixes && r.topFixes.length > 0 ? (
                          <Typography variant="body2">{r.topFixes.join(' · ')}</Typography>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{r.scoredOn || 'Not yet'}</TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ color: COLORS.textMuted, py: 4 }}>
                        No branches match.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}
      {loading && !overview && <LinearProgress />}
    </Box>
  );
}
