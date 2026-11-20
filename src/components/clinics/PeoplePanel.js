import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { usePlatformAuth } from '../../context/PlatformAuthContext';
import {
  errorMessage, fetchClinicBranches, fetchClinicDoctors, revealDoctorContact, revealUserContact,
} from '../../services/api';
import { COLORS } from '../../styles/js/styleConstants';
import PrescriptionSettingsDialog from './PrescriptionSettingsDialog';
import { count, dateOnly } from '../../utils/format';

const GROUPS = [['OWNER', 'Owner'], ['DOCTOR', 'Doctors'], ['STAFF', 'Staff']];

/** Shows a masked value; admins can reveal the real one, which the server audits. */
function Contact({ masked, canReveal, load }) {
  const [shown, setShown] = useState(null);
  const [err, setErr] = useState(null);
  if (shown) return <span>{[shown.phone, shown.email].filter(Boolean).join(' · ') || '—'}</span>;
  return (
    <span>
      {masked || '—'}
      {canReveal && (
        <Button
          size="small" sx={{ ml: 0.5, minWidth: 0, py: 0 }}
          onClick={async () => {
            try { setShown(await load()); } catch (e) { setErr(errorMessage(e, 'Could not reveal')); }
          }}
        >
          Reveal
        </Button>
      )}
      {err && <Typography variant="caption" color="error"> {err}</Typography>}
    </span>
  );
}

export function BranchesPanel({ clinicId }) {
  const { canWrite } = usePlatformAuth();
  const [branches, setBranches] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchClinicBranches(clinicId).then(setBranches).catch((e) => setError(errorMessage(e, 'Could not load branches')));
  }, [clinicId]);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!branches) return <LinearProgress />;
  if (branches.length === 0) return <Typography sx={{ color: COLORS.textMuted }}>No branches.</Typography>;
  return (
    <Box>
      {branches.map((b, i) => (
        <Accordion key={b.id} defaultExpanded={i === 0} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{b.name}{b.city ? ` · ${b.city}` : ''}</Typography>
              <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                {b.owners} owner · {b.doctors} doctors · {b.staff} staff · {count(b.patients)} patients
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ display: 'grid', gap: 2 }}>
            {GROUPS.map(([key, label]) => {
              const users = b.users.filter((u) => u.group === key);
              if (users.length === 0) return null;
              return (
                <Box key={key}>
                  <Typography variant="overline" sx={{ color: COLORS.textMuted }}>{label}</Typography>
                  {users.map((u) => (
                    <Box key={u.id} sx={{ py: 0.75, borderTop: '1px solid #e2e8f0' }}>
                      <Typography sx={{ fontWeight: 600 }}>
                        {u.name || u.username}
                        <Chip size="small" label={(u.roles || []).join(', ')} sx={{ ml: 1 }} />
                      </Typography>
                      <Typography variant="body2" sx={{ color: COLORS.textMuted, wordBreak: 'break-word' }}>
                        <Contact
                          masked={[u.phoneMasked, u.emailMasked].filter(Boolean).join(' · ')}
                          canReveal={canWrite}
                          load={() => revealUserContact(clinicId, u.id)}
                        />
                      </Typography>
                    </Box>
                  ))}
                </Box>
              );
            })}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

export function DoctorsPanel({ clinicId }) {
  const { canWrite } = usePlatformAuth();
  const [doctors, setDoctors] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchClinicDoctors(clinicId).then(setDoctors).catch((e) => setError(errorMessage(e, 'Could not load doctors')));
  }, [clinicId]);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!doctors) return <LinearProgress />;
  if (doctors.length === 0) return <Typography sx={{ color: COLORS.textMuted }}>No doctors.</Typography>;
  return (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
      {doctors.map((d) => (
        <Card key={d.id} sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>{d.name}</Typography>
          <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
            {[d.specialization, d.qualification].filter(Boolean).join(' · ') || '—'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Reg. {d.registrationNumber || '—'}{d.registrationCouncil ? ` (${d.registrationCouncil})` : ''}
          </Typography>
          <Typography variant="body2">Branches: {(d.branches || []).join(', ') || '—'}</Typography>
          <Typography variant="body2">
            {count(d.prescriptions)} prescriptions · {count(d.bookings)} bookings · last {dateOnly(d.lastActivityAt)}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, wordBreak: 'break-word' }}>
            <Contact
              masked={[d.phoneMasked, d.emailMasked].filter(Boolean).join(' · ')}
              canReveal={canWrite}
              load={() => revealDoctorContact(clinicId, d.id)}
            />
          </Typography>
          <Button size="small" variant="outlined" sx={{ mt: 1.5 }} onClick={() => setEditing(d)}>Prescription settings</Button>
        </Card>
      ))}
      <PrescriptionSettingsDialog open={!!editing} doctor={editing} clinicId={clinicId} onClose={() => setEditing(null)} />
    </Box>
  );
}
