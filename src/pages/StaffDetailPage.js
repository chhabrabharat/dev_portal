import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import {
  errorMessage, fetchDesignations, fetchPipelineBoard, fetchStaff, fetchStaffProfile, staffPhotoUrl, uploadStaffPhoto,
} from '../services/api';
import { COLORS } from '../styles/js/styleConstants';
import { dateOnly } from '../utils/format';
import { STAFF_STATUS, uploadProblem } from '../utils/staff';
import StaffFormDialog from '../components/staff/StaffFormDialog';
import QualificationsPanel from '../components/staff/QualificationsPanel';
import DocumentsPanel from '../components/staff/DocumentsPanel';
import PayPanel from '../components/staff/PayPanel';
import ActivityPanel from '../components/staff/ActivityPanel';

function Field({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>{label}</Typography>
      <Typography variant="body2" sx={{ color: COLORS.textPrimary, overflowWrap: 'anywhere' }}>{value || '—'}</Typography>
    </Box>
  );
}

export default function StaffDetailPage() {
  const { id } = useParams();
  const { canWrite } = usePlatformAuth();
  const [profile, setProfile] = useState(null);
  const [staff, setStaff] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [operators, setOperators] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [tab, setTab] = useState('profile');
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef(null);

  const loadPhoto = useCallback(async (p) => {
    if (!p?.photoPath) { setPhoto(null); return; }
    try { setPhoto((await staffPhotoUrl(p.id)).url); } catch (e) { setPhoto(null); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, all, d] = await Promise.all([fetchStaffProfile(id), fetchStaff(), fetchDesignations()]);
      setProfile(p);
      setStaff(all);
      setDesignations(d);
      setError(null);
      loadPhoto(p);
    } catch (e) {
      setError(errorMessage(e, 'Could not load this profile'));
    } finally {
      setLoading(false);
    }
  }, [id, loadPhoto]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (canWrite) fetchPipelineBoard().then((b) => setOperators(b.owners || [])).catch(() => setOperators([]));
  }, [canWrite]);

  const changePhoto = async (file) => {
    const problem = uploadProblem(file);
    if (problem || !['image/jpeg', 'image/png'].includes(file.type)) { setError(problem || 'The photo must be a JPG or PNG'); return; }
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadStaffPhoto(profile.id, file);
      setPhoto(url);
      setProfile((p) => ({ ...p, photoPath: 'set' }));
    } catch (e) {
      setError(errorMessage(e, 'Could not upload the photo'));
    } finally {
      setUploading(false);
      if (photoInput.current) photoInput.current.value = '';
    }
  };

  if (loading && !profile) return <LinearProgress />;
  if (!profile) return <Alert severity="error">{error || 'Not found'}</Alert>;

  const manager = staff.find((s) => s.id === profile.managerId);
  const tabs = [['profile', 'Profile'], ['qualifications', 'Qualifications'], ['documents', 'Documents']];
  // These three are ADMIN-only on the server; SUPPORT never even requests them.
  if (canWrite) tabs.push(['pay', 'Salary & bonus'], ['cards', 'Cards'], ['activity', 'Activity']);

  return (
    <Box>
      <Button component={RouterLink} to="/staff" size="small" sx={{ mb: 1 }}>← All staff</Button>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <Avatar src={photo || undefined} alt={profile.fullName} sx={{ width: 72, height: 72, bgcolor: COLORS.primaryDark, fontSize: 28 }}>
          {profile.fullName?.[0]}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 220 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>{profile.fullName}</Typography>
          <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
            {profile.employeeCode} · {profile.designationName || 'No designation'}
          </Typography>
          <Chip size="small" label={STAFF_STATUS[profile.status] || profile.status} sx={{ mt: 0.5, fontWeight: 600 }} />
        </Box>
        {canWrite && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button component="label" size="small" variant="outlined" disabled={uploading}>
              {uploading ? 'Uploading…' : profile.photoPath ? 'Change photo' : 'Add photo'}
              <input ref={photoInput} hidden type="file" accept="image/jpeg,image/png" onChange={(e) => e.target.files?.[0] && changePhoto(e.target.files[0])} />
            </Button>
            <Button size="small" variant="contained" onClick={() => setEditOpen(true)}>Edit</Button>
          </Box>
        )}
      </Box>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        {tabs.map(([k, label]) => <Tab key={k} value={k} label={label} />)}
      </Tabs>

      <Card>
        <CardContent>
          {tab === 'profile' && (
            <Grid container spacing={2}>
              {[
                ['Mobile', profile.mobile], ['Personal email', profile.personalEmail], ['Date of birth', profile.dateOfBirth && dateOnly(profile.dateOfBirth)],
                ['Gender', profile.gender], ['Blood group', profile.bloodGroup], ['Department', profile.department],
                ['Date of joining', profile.joinedOn && dateOnly(profile.joinedOn)], ['Reports to', manager?.fullName],
                ['Card valid until', profile.cardValidUntil && dateOnly(profile.cardValidUntil)],
                ['Emergency contact', [profile.emergencyName, profile.emergencyRelation && `(${profile.emergencyRelation})`, profile.emergencyNumber].filter(Boolean).join(' ')],
                ['Address', profile.address],
              ].map(([label, value]) => (
                <Grid item xs={12} sm={6} md={4} key={label}><Field label={label} value={value} /></Grid>
              ))}
            </Grid>
          )}
          {tab === 'qualifications' && (
            <QualificationsPanel staffId={profile.id} items={profile.qualifications} canWrite={canWrite}
              onSaved={(items) => setProfile((p) => ({ ...p, qualifications: items }))} />
          )}
          {tab === 'documents' && <DocumentsPanel staffId={profile.id} canWrite={canWrite} />}
          {tab === 'pay' && canWrite && <PayPanel staffId={profile.id} />}
          {tab === 'activity' && canWrite && <ActivityPanel staffId={profile.id} />}
          {tab === 'cards' && canWrite && (
            <Box>
              <Typography variant="body2" sx={{ color: COLORS.textSecondary, mb: 2 }}>
                Print from the profile. Each print, on screen or as a PDF, is recorded in the activity log. Salary and bonus never appear on a card.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button component={RouterLink} to={`/staff/${profile.id}/card?type=ID`} variant="contained">ID card</Button>
                <Button component={RouterLink} to={`/staff/${profile.id}/card?type=VISITING`} variant="outlined">Visiting card</Button>
              </Box>
              {!profile.photoPath && (
                <Alert severity="info" sx={{ mt: 2 }}>No profile photo yet, so the ID card will show a blank photo box.</Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <StaffFormDialog open={editOpen} profile={profile} designations={designations} staff={staff} operators={operators}
        onClose={() => setEditOpen(false)} onSaved={(p) => { setProfile(p); load(); }} />
    </Box>
  );
}
