import React, { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import { usePlatformAuth } from '../../context/PlatformAuthContext';
import { errorMessage, fetchClinicGoogle, fetchClinicGoogleBranches, fetchClinicGoogleHistory, refreshClinicGoogle } from '../../services/api';
import { ScoreChip } from './Pills';
import StatCard from '../StatCard';
import { COLORS } from '../../styles/js/styleConstants';
import { dateOnly, dateTime } from '../../utils/format';

const PARTS = [['completeness', 'Profile'], ['photos', 'Photos'], ['rating', 'Rating'], ['replies', 'Review replies'], ['posts', 'Posts']];

function Trend({ points }) {
  const pts = (points || []).filter((p) => p.score !== null && p.score !== undefined);
  if (pts.length < 2) return <Typography variant="body2" sx={{ color: COLORS.textMuted }}>Trend appears after a few days of scores.</Typography>;
  const w = 600; const h = 120;
  const x = (i) => (i / (pts.length - 1)) * (w - 20) + 10;
  const y = (v) => h - 10 - (v / 100) * (h - 20);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Google score trend">
      <path d={d} fill="none" stroke={COLORS.primary} strokeWidth="2" />
      <text x="10" y="12" fontSize="10" fill="#64748b">{dateOnly(pts[0].date)} – {dateOnly(pts[pts.length - 1].date)}</text>
    </svg>
  );
}

export default function GooglePanel({ clinicId }) {
  const { canWrite } = usePlatformAuth();
  const [score, setScore] = useState(null);
  const [history, setHistory] = useState([]);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, h, b] = await Promise.all([fetchClinicGoogle(clinicId), fetchClinicGoogleHistory(clinicId), fetchClinicGoogleBranches(clinicId)]);
      setScore(s); setHistory(h); setBranches(b);
    } catch (e) { setError(errorMessage(e, 'Could not load Google score')); }
  }, [clinicId]);
  useEffect(() => { load(); }, [load]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!score) return <LinearProgress />;

  // inputs is the object the scorer stored: facts it used, the per-part maximums and a `missing` list.
  let inputs = {};
  try { inputs = score.inputs ? (typeof score.inputs === 'string' ? JSON.parse(score.inputs) : score.inputs) : {}; } catch (e) { inputs = {}; }
  if (!inputs || typeof inputs !== 'object') inputs = {};
  const missing = Array.isArray(inputs.missing) ? inputs.missing : [];
  const max = inputs.maxPoints || {};
  const facts = [
    ['Connected branches', inputs.connectedBranches],
    ['Reviews', inputs.reviewCount],
    ['Average rating', inputs.averageRating],
    ['Reply rate (90d)', inputs.replyRate === null || inputs.replyRate === undefined ? null : `${inputs.replyRate}%`],
    ['Posts (30d)', inputs.postsLast30Days],
  ].filter(([, v]) => v !== null && v !== undefined);

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {score.status === 'NOT_CONNECTED' && <Alert severity="info">No branch of this clinic has connected Google Business Profile.</Alert>}
      {score.status === 'FAILED' && <Alert severity="warning">Last refresh failed ({score.failureReason || 'unknown'}). Showing the previous score.</Alert>}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <ScoreChip score={score.score} status={score.status} />
        <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
          {score.syncedAt ? `Updated ${dateTime(score.syncedAt)}` : 'Not scored yet'} · clinic score is the average of its branches
        </Typography>
        {canWrite && (
          <Button size="small" variant="outlined" disabled={busy}
            onClick={async () => { setBusy(true); try { setScore(await refreshClinicGoogle(clinicId)); await load(); } catch (e) { setError(errorMessage(e, 'Refresh failed')); } finally { setBusy(false); } }}>
            Refresh now
          </Button>
        )}
      </Box>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        {PARTS.map(([k, label]) => <StatCard key={k} label={label} value={score[k] ?? '—'} hint={max[k] ? `of ${max[k]}` : undefined} />)}
      </Box>
      {facts.length > 0 && (
        <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
          {facts.map(([l, v]) => `${l}: ${v}`).join(' · ')}
        </Typography>
      )}
      {missing.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>What would improve it</Typography>
          {missing.map((t, i) => <Typography key={i} variant="body2">• {String(t)}</Typography>)}
        </Box>
      )}
      {branches.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>By branch (lowest first)</Typography>
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {branches.map((b) => (
              <Box key={b.branchId} sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{b.name}{b.city ? ` · ${b.city}` : ''}</Typography>
                  <ScoreChip score={b.score} status="OK" />
                </Box>
                <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                  Profile {b.completeness} · Photos {b.photos} · Rating {b.rating} · Replies {b.replies} · Posts {b.posts}
                </Typography>
                {(b.missing || []).map((m, i) => <Typography key={i} variant="body2">• {m}</Typography>)}
              </Box>
            ))}
          </Box>
        </Box>
      )}
      <Trend points={history} />
    </Box>
  );
}
