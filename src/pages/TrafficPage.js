import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import StatCard from '../components/StatCard';
import { errorMessage, fetchTraffic } from '../services/api';
import { COLORS } from '../styles/js/styleConstants';
import { clinicPageUrl } from '../utils/publicSite';
import { count, dateOnly } from '../utils/format';

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
];

/**
 * What the visitor column does and does not mean, in the words an operator needs before quoting
 * it to anybody. It sits next to the number rather than in a footnote, because the whole risk
 * here is somebody reading "unique visitors" and reporting a headcount.
 */
const VISITS_CAVEAT =
  'Counts visits, not people. The visitor hash is salted per clinic and per day on purpose, so '
  + 'somebody who came back on Tuesday counts again and somebody who looked at two clinics counts '
  + 'twice. There is no way to collapse those without building the tracking this was designed not '
  + 'to do.';

/** Height of the daily strip. Tall enough to read a shape, short enough not to own the page. */
const BAR_AREA_PX = 96;

/**
 * Public-page traffic across every clinic.
 *
 * <p>This is the company's view of numbers each clinic already sees for itself on its own
 * dashboard. The reason it belongs here too is the question a clinic cannot ask: which of our
 * customers is actually being looked at, and which has a page nobody has found.
 *
 * <p><b>The marketing site is not in here.</b> Views are recorded in exactly one place - when a
 * public request resolves a clinic by its slug - so easemyopd.com's own pages have never been
 * counted. That is said on the page rather than left for somebody to discover, because a zero
 * would otherwise read as "nobody came to the site".
 */
export default function TrafficPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [traffic, setTraffic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTraffic(await fetchTraffic({ days }));
    } catch (e) {
      setError(errorMessage(e, 'Could not load the traffic report'));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  // Scale the strip to its own busiest day. An absolute scale would flatten every chart on a
  // platform this size into a row of nothing.
  const peak = useMemo(
    () => (traffic ? traffic.days.reduce((max, d) => Math.max(max, d.views), 0) : 0),
    [traffic]
  );

  const busiestDay = useMemo(() => {
    if (!traffic || !peak) return null;
    return traffic.days.find((d) => d.views === peak);
  }, [traffic, peak]);

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary, mb: 0.5 }}>
        Traffic
      </Typography>
      <Typography variant="body2" sx={{ color: COLORS.textMuted, mb: 2 }}>
        Visits to clinics&apos; public pages. The marketing site&apos;s own pages are not counted -
        a view is recorded when a request resolves a clinic by its slug, and nowhere else.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 3 }}>
        <ButtonGroup size="small">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              variant={days === p.days ? 'contained' : 'outlined'}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </ButtonGroup>
        {traffic && (
          <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
            {dateOnly(traffic.from)} to {dateOnly(traffic.to)}, both inclusive
          </Typography>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {traffic && !traffic.visitorSaltConfigured && (
        /* Not an error - counting works without it - but it silently inflates one column, and an
           operator about to quote that column is exactly who needs to be told. */
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>ANALYTICS_VISITOR_SALT</strong> is not set on this deployment, so the visitor
          salt is regenerated whenever the backend restarts. The same person counts again after
          each restart, which inflates <strong>Visits</strong> and the per-clinic visits column.
          Page views are a plain sum and are unaffected. Setting it to any fixed random string
          fixes this from that point on.
        </Alert>
      )}

      {traffic && (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              mb: 3,
            }}
          >
            <StatCard
              label="Page views"
              value={count(traffic.totalViews)}
              hint={busiestDay ? `busiest ${dateOnly(busiestDay.date)}, ${count(peak)}` : 'no views yet'}
            />
            <Tooltip title={VISITS_CAVEAT}>
              {/* Wrapped so the tooltip has something to anchor to, and so the asterisk is
                  hoverable rather than decorative. */}
              <Box>
                <StatCard
                  label="Visits"
                  value={count(traffic.uniqueVisitors)}
                  hint="distinct visitors per clinic per day - not people"
                />
              </Box>
            </Tooltip>
            <StatCard
              label="Clinics looked at"
              value={count(traffic.clinicsWithTraffic)}
              hint="the one number here that means exactly what it says"
            />
          </Box>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="overline" sx={{ color: COLORS.textMuted, letterSpacing: '0.08em' }}>
                Views per day
              </Typography>
              {peak === 0 ? (
                <Typography variant="body2" sx={{ color: COLORS.textMuted, mt: 1 }}>
                  Nobody has opened a clinic page in this window.
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '2px',
                    height: BAR_AREA_PX,
                    mt: 1.5,
                  }}
                >
                  {traffic.days.map((d) => (
                    <Tooltip
                      key={d.date}
                      title={`${dateOnly(d.date)}: ${count(d.views)} views, ${count(d.uniqueVisitors)} visits`}
                    >
                      <Box
                        sx={{
                          flex: 1,
                          // A quiet day keeps a hairline rather than disappearing, so the gap in
                          // the strip reads as "nobody came" and not as a rendering fault.
                          minHeight: 2,
                          height: `${Math.max(2, Math.round((d.views / peak) * BAR_AREA_PX))}px`,
                          backgroundColor: d.views ? COLORS.primary : COLORS.textMuted,
                          opacity: d.views ? 1 : 0.25,
                          borderRadius: '2px 2px 0 0',
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              )}
              {peak > 0 && (
                /* Both ends named, because a strip of bars with no axis leaves the shape
                   readable and the dates guessable - and which week the spike was in is the
                   question somebody looking at a spike asks next. */
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
                  <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                    {dateOnly(traffic.from)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                    {dateOnly(traffic.to)}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          <Card>
            {loading && <LinearProgress />}
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 720 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>Branch</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Clinic</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Views</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      <Tooltip title={VISITS_CAVEAT}><span>Visits</span></Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Page</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {traffic.clinics.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ color: COLORS.textMuted }}>
                        No clinic page was opened in this window.
                      </TableCell>
                    </TableRow>
                  )}
                  {traffic.clinics.map((c) => (
                    <TableRow
                      key={c.accountLocationId}
                      hover={Boolean(c.accountId)}
                      onClick={c.accountId ? () => navigate(`/accounts/${c.accountId}`) : undefined}
                      sx={{ cursor: c.accountId ? 'pointer' : 'default' }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>
                        {/* A branch deleted since its views keeps its row: dropping it would stop
                            this column adding up to the total above, which reads as a bug. */}
                        {c.name || `Branch #${c.accountLocationId} (deleted)`}
                      </TableCell>
                      <TableCell>{c.accountName || '—'}</TableCell>
                      <TableCell align="right">{count(c.views)}</TableCell>
                      <TableCell align="right">{count(c.uniqueVisitors)}</TableCell>
                      <TableCell>
                        {c.slug ? (
                          <Link
                            href={clinicPageUrl(c.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            /{c.slug}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}
      {loading && !traffic && <LinearProgress />}
    </Box>
  );
}
