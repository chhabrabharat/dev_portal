import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import {
  errorMessage, fetchCardConfig, fetchStaffProfile, logCardPrint, staffPhotoUrl,
} from '../services/api';
import { COLORS } from '../styles/js/styleConstants';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import {
  CARD_SIZES, IdBack, IdFront, VISITING_DESIGNS, VisitingBack, VisitingFront,
} from '../components/staff/cards/CardFaces';

/**
 * Print view for the ID card and the visiting card (front and back).
 *
 * Rendered outside the app shell on purpose: the printed page then holds only the cards. Printing
 * is ADMIN-only and is reported to the server first; if the server refuses to log it, nothing
 * prints. The PDF comes from the server, which logs that print itself.
 */
export default function StaffCardPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { canWrite } = usePlatformAuth();
  const type = params.get('type') === 'VISITING' ? 'VISITING' : 'ID';
  const design = Math.min(5, Math.max(1, Number(params.get('design')) || 1));
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [qrUrl, setQrUrl] = useState(null);
  const [photoReady, setPhotoReady] = useState(type !== 'ID');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([fetchStaffProfile(id), fetchCardConfig()]);
      setProfile(p);
      setCompany(c);
      setQrUrl(await QRCode.toDataURL(p.employeeCode, { margin: 0, width: 256, errorCorrectionLevel: 'M' }));
      if (type === 'ID' && p.photoPath) {
        setPhotoUrl((await staffPhotoUrl(p.id)).url);
      } else {
        setPhotoReady(true);
      }
    } catch (e) {
      setError(errorMessage(e, 'Could not load the card'));
    }
  }, [id, type]);

  useEffect(() => { if (canWrite) load(); }, [canWrite, load]);

  const size = CARD_SIZES[type];
  const printCss = useMemo(() => `
    @page { size: ${size.w}px ${size.h}px; margin: 0; }
    @media print {
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .sheet { display: block !important; padding: 0 !important; gap: 0 !important; }
      .card-wrap { margin: 0 !important; box-shadow: none !important; border: none !important; break-after: page; page-break-after: always; }
      .card-wrap:last-child { break-after: auto; page-break-after: auto; }
    }
  `, [size.w, size.h]);

  const print = async () => {
    setBusy(true);
    setError(null);
    try {
      await logCardPrint(id, type, 'HTML');   // recorded before the dialog opens
      window.print();
    } catch (e) {
      setError(errorMessage(e, 'The print could not be recorded, so it was not started'));
    } finally {
      setBusy(false);
    }
  };

  if (!canWrite) {
    return (
      <Box sx={{ p: 3, maxWidth: 560 }}>
        <Alert severity="info">Printing ID and visiting cards is limited to PLATFORM_ADMIN.</Alert>
        <Button component={RouterLink} to={`/staff/${id}`} sx={{ mt: 2 }}>Back to the profile</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: COLORS.backgroundPrimary }}>
      <style>{printCss}</style>
      <Box className="no-print" sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button component={RouterLink} to={`/staff/${id}`} size="small">← Profile</Button>
        <Typography variant="h6" sx={{ fontWeight: 800, mr: 'auto' }}>
          {type === 'ID' ? 'ID card' : 'Visiting card'}{profile ? ` · ${profile.fullName}` : ''}
        </Typography>
        <Button component={RouterLink} to={`/staff/${id}/card?type=${type === 'ID' ? 'VISITING' : 'ID'}`} size="small" variant="text">
          Switch to {type === 'ID' ? 'visiting' : 'ID'} card
        </Button>
        <Button variant="contained" size="small" onClick={print} disabled={!profile || busy || !photoReady}>Print / Save as PDF</Button>
      </Box>
      {type === 'VISITING' && (
        <Box className="no-print" sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ color: COLORS.textMuted }}>Front design</Typography>
          <ToggleButtonGroup
            exclusive size="small" value={design}
            onChange={(_, v) => { if (v) setParams({ type: 'VISITING', design: String(v) }, { replace: true }); }}
          >
            {VISITING_DESIGNS.map((d) => (
              <ToggleButton key={d.key} value={d.key} sx={{ textTransform: 'none' }}>{d.key} · {d.label}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}
      {error && <Alert className="no-print" severity="error" sx={{ mx: 2, mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {!profile && !error && <LinearProgress className="no-print" />}
      {profile && !profile.photoPath && type === 'ID' && (
        <Alert className="no-print" severity="info" sx={{ mx: 2, mb: 2 }}>This profile has no photo yet, so the photo box prints blank.</Alert>
      )}

      {profile && company && (
        <Box className="sheet" sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, p: 2, alignItems: 'flex-start' }}>
          {[
            ['Front', type === 'ID'
              ? <IdFront profile={profile} company={company} photoUrl={photoUrl} onPhotoLoad={() => setPhotoReady(true)} />
              : <VisitingFront design={design} company={company} />],
            ['Back', type === 'ID'
              ? <IdBack profile={profile} company={company} qrUrl={qrUrl} />
              : <VisitingBack profile={profile} company={company} />],
          ].map(([label, face]) => (
            <Box key={label}>
              <Typography className="no-print" variant="caption" sx={{ color: COLORS.textMuted, display: 'block', mb: 0.5 }}>{label}</Typography>
              <div className="card-wrap" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.25)' }}>{face}</div>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
