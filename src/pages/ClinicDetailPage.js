import React, { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import { CategoryChip, ScoreChip } from '../components/clinics/Pills';
import CategoryDialog from '../components/clinics/CategoryDialog';
import { BranchesPanel, DoctorsPanel } from '../components/clinics/PeoplePanel';
import WhatsappPanel from '../components/clinics/WhatsappPanel';
import GooglePanel from '../components/clinics/GooglePanel';
import StatCard from '../components/StatCard';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import {
  errorMessage, fetchClinic, fetchClinicCategoryHistory, setClinicCategory,
} from '../services/api';
import { COLORS } from '../styles/js/styleConstants';
import { categoryToken } from '../styles/js/adminTokens';
import { count, dateOnly, dateTime, relativeDays } from '../utils/format';

function History({ rows }) {
  if (rows.length === 0) return <Typography sx={{ color: COLORS.textMuted }}>No changes yet.</Typography>;
  const label = (c) => (c ? categoryToken(c).label : 'Unclassified');
  return (
    <Box>
      {rows.map((h) => (
        <Box key={h.id} sx={{ py: 0.75, borderTop: '1px solid #e2e8f0' }}>
          <Typography sx={{ fontWeight: 600 }}>
            {h.oldCategory !== h.newCategory ? `${label(h.oldCategory)} → ${label(h.newCategory)}` : `Referred by: ${h.oldReferredBy || '—'} → ${h.newReferredBy || '—'}`}
          </Typography>
          <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
            {dateTime(h.changedAt)} · {h.changedBy || 'unknown'}{h.note ? ` · ${h.note}` : ''}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function ClinicDetailPage() {
  const { id } = useParams();
  const clinicId = Number(id);
  const { canWrite } = usePlatformAuth();
  const [clinic, setClinic] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, h] = await Promise.all([fetchClinic(clinicId), fetchClinicCategoryHistory(clinicId)]);
      setClinic(c); setHistory(h);
    } catch (e) { setError(errorMessage(e, 'Could not load clinic')); }
  }, [clinicId]);
  useEffect(() => { load(); }, [load]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!clinic) return <LinearProgress />;

  return (
    <Box>
      <Button component={RouterLink} to="/clinics" size="small" sx={{ mb: 1 }}>← All clinics</Button>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>{clinic.name}</Typography>
        <CategoryChip category={clinic.category} />
        <ScoreChip score={clinic.googleScore} status={clinic.googleStatus} />
      </Box>
      <Typography variant="body2" sx={{ color: COLORS.textMuted, mb: 2 }}>
        {[clinic.owner, clinic.city].filter(Boolean).join(' · ')}
        {clinic.referredBy ? ` · Referred by ${clinic.referredBy}` : ''}
      </Typography>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', mb: 2 }}>
        <StatCard label="Branches" value={count(clinic.branches)} />
        <StatCard label="Doctors" value={count(clinic.doctors)} />
        <StatCard label="Patients" value={count(clinic.patients)} />
        <StatCard label="Last activity" value={clinic.lastActivityAt ? relativeDays(clinic.lastActivityAt) : 'Never'}
          hint={clinic.lastActivityAt ? dateOnly(clinic.lastActivityAt) : 'no prescription or new patient'} />
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        <Tab label="Overview" />
        <Tab label="Branches & people" />
        <Tab label="Doctors" />
        <Tab label="WhatsApp" />
        <Tab label="Google listing" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 700 }}>Category</Typography>
              {canWrite && <Button size="small" variant="outlined" onClick={() => setDialog(true)}>Change</Button>}
            </Box>
            <Typography variant="body2" sx={{ color: COLORS.textMuted, mb: 1 }}>
              A tracking label for the company. It does not affect the clinic.
            </Typography>
            <History rows={history} />
          </Card>
          <Button component={RouterLink} to={`/clinics/stats?clinicId=${clinic.id}`} variant="outlined" sx={{ justifySelf: 'start' }}>
            Day-wise stats for this clinic
          </Button>
        </Box>
      )}
      {tab === 1 && <BranchesPanel clinicId={clinicId} />}
      {tab === 2 && <DoctorsPanel clinicId={clinicId} />}
      {tab === 3 && <WhatsappPanel clinicId={clinicId} />}
      {tab === 4 && <GooglePanel clinicId={clinicId} />}

      <CategoryDialog
        open={dialog} onClose={() => setDialog(false)} title="Change category"
        initialCategory={clinic.category} initialReferredBy={clinic.referredBy}
        onSave={async (b) => { await setClinicCategory(clinicId, b); await load(); }}
      />
    </Box>
  );
}
