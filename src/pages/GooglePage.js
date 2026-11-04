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
import { errorMessage, fetchGoogleOverview } from '../services/api';
import { COLORS } from '../styles/js/styleConstants';
import { GOOGLE_STATE_ORDER, googleStateToken } from '../styles/js/adminTokens';
import { ago, count, dateTime } from '../utils/format';

function StateChip({ state }) {
  const token = googleStateToken(state);
  return (
    <Chip
      size="small"
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

/**
 * Which clinics have linked their Google Business Profile, and whether it is working.
 *
 * Every branch is listed, including those that never connected, because a clinic with no link is
 * the one worth a call. Read-only: it shows counts and timestamps from GET /platform/google/overview
 * and never a credential or a review's text. The state is decided by the backend, not here.
 */
export default function GooglePage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await fetchGoogleOverview());
    } catch (e) {
      setError(errorMessage(e, 'Could not load the Google overview'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    if (!overview) return [];
    const q = search.trim().toLowerCase();
    return overview.branches.filter((r) => {
      if (filter !== 'ALL' && r.connectionState !== filter) return false;
      if (!q) return true;
      return [r.accountName, r.branchName, r.city, r.listingTitle, r.googleEmail]
        .some((v) => v && v.toLowerCase().includes(q));
    });
  }, [overview, filter, search]);

  const needAttention = overview
    ? overview.byState.STALE + overview.byState.ERROR + overview.byState.NEEDS_LISTING
    : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, flexWrap: 'wrap', mb: 0.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>
          Google
        </Typography>
        <Button size="small" onClick={load} disabled={loading}>Refresh</Button>
      </Box>
      <Typography variant="body2" sx={{ color: COLORS.textMuted, mb: 2 }}>
        Which clinics have linked their Google Business Profile, and whether it is syncing.
        Counts and times only - no reviews or credentials.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {overview && (
        <>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', mb: 3 }}>
            <StatCard
              label="Connected & syncing"
              value={`${count(overview.byState.OK)} / ${count(overview.totalBranches)}`}
              hint="branches"
            />
            <StatCard
              label="Need attention"
              value={count(needAttention)}
              hint="error, not syncing, or no listing picked"
            />
            <StatCard label="Not connected" value={count(overview.byState.NOT_CONNECTED)} />
            <StatCard
              label="Review link ready"
              value={`${count(overview.reviewLinkReady)} / ${count(overview.totalBranches)}`}
              hint={`${count(overview.placeIdMissing)} have no Place ID`}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
            <Chip
              label={`All ${count(overview.totalBranches)}`}
              clickable
              color={filter === 'ALL' ? 'primary' : 'default'}
              onClick={() => setFilter('ALL')}
            />
            {GOOGLE_STATE_ORDER.map((s) => (
              <Chip
                key={s}
                label={`${googleStateToken(s).label} ${count(overview.byState[s])}`}
                clickable
                color={filter === s ? 'primary' : 'default'}
                onClick={() => setFilter(s)}
              />
            ))}
            <TextField
              size="small"
              placeholder="Search clinic, branch, listing, email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 280, ml: { md: 'auto' } }}
            />
          </Box>

          <Card>
            {loading && <LinearProgress />}
            {/* Explicit minWidth so the container scrolls, not the page body (see CLAUDE.md, Wide tables). */}
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 1180 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Clinic</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Google</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Listing</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Last review sync</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Reviews</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Review link</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Auto</TableCell>
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
                      <TableCell>
                        {r.lastError ? (
                          <Tooltip title={r.lastError}>
                            <span><StateChip state={r.connectionState} /></span>
                          </Tooltip>
                        ) : (
                          <StateChip state={r.connectionState} />
                        )}
                      </TableCell>
                      <TableCell>
                        {r.listingTitle || r.googleEmail ? (
                          <>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {r.listingTitle || 'No listing picked'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                              {[r.googleEmail, r.provider].filter(Boolean).join(' · ')}
                            </Typography>
                          </>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {r.lastReviewSyncAt ? (
                          <Tooltip title={dateTime(r.lastReviewSyncAt)}>
                            <span>{ago(r.lastReviewSyncAt)}</span>
                          </Tooltip>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell align="right">{count(r.reviewCount)}</TableCell>
                      <TableCell>
                        {r.reviewLinkReady ? (
                          <Chip size="small" label="Ready" sx={{ color: '#065f46', backgroundColor: '#d1fae5', fontWeight: 600 }} />
                        ) : (
                          <Tooltip title={r.placeIdSet ? 'A Place ID is stored but is not a valid one' : 'No Place ID on this branch'}>
                            <Chip size="small" label={r.placeIdSet ? 'Invalid ID' : 'No Place ID'} sx={{ color: '#92400e', backgroundColor: '#fef3c7', fontWeight: 600 }} />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {r.autoReplyReviews && <Chip size="small" variant="outlined" label="Replies" />}
                          {r.autoPostWeekly && <Chip size="small" variant="outlined" label="Weekly post" />}
                          {r.autoPostOffers && <Chip size="small" variant="outlined" label="Offers" />}
                          {!r.autoReplyReviews && !r.autoPostWeekly && !r.autoPostOffers && '—'}
                        </Box>
                      </TableCell>
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
