import React, { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import {
  errorMessage,
  fetchClinicToggles,
  fetchEntitlements,
  fetchFeatureKeys,
  fetchSubscription,
  setEntitlement,
  updateSubscription,
} from '../services/api';
import { FEATURE_LABELS, PLAN_CODES, SUBSCRIPTION_STATE_LABELS } from '../styles/js/adminTokens';
import { COLORS } from '../styles/js/styleConstants';

/** An empty form field means "no value", which the API expects as an explicit null. */
const emptyToNull = (value) => (value === '' || value === undefined ? null : value);
const numberOrNull = (value) => (value === '' || value === null ? null : Number(value));
const toInputDate = (value) => (value ? String(value).slice(0, 10) : '');

/**
 * A clinic's commercial terms and the modules it is sold.
 *
 * Two halves that behave differently on purpose. The subscription is a draft an operator reviews
 * and saves deliberately, because moving an expiry date decides whether a clinic can work
 * tomorrow. The entitlement switches apply immediately, because that is what gets reached for
 * mid-support-call and making someone press Save afterwards invites forgetting.
 */
export default function SubscriptionPanel({ accountId, canWrite }) {
  const [subscription, setSubscription] = useState(null);
  const [entitlements, setEntitlements] = useState({});
  const [clinicToggles, setClinicToggles] = useState({});
  const [featureKeys, setFeatureKeys] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyFeature, setBusyFeature] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const hydrate = useCallback((sub) => {
    setSubscription(sub);
    setForm({
      planCode: sub.planCode || 'STANDARD',
      trialDays: sub.trialDays ?? '',
      trialStartedAt: toInputDate(sub.trialStartedAt),
      expiresAt: toInputDate(sub.expiresAt),
      gracePeriodDays: sub.gracePeriodDays ?? '',
      maxLocations: sub.maxLocations ?? '',
      maxUsers: sub.maxUsers ?? '',
      maxProviders: sub.maxProviders ?? '',
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sub, ent, toggles, keys] = await Promise.all([
        fetchSubscription(accountId),
        fetchEntitlements(accountId),
        fetchClinicToggles(accountId),
        fetchFeatureKeys(),
      ]);
      hydrate(sub);
      setEntitlements(ent);
      setClinicToggles(toggles);
      setFeatureKeys(keys);
    } catch (e) {
      setError(errorMessage(e, 'Could not load this clinic’s plan'));
    } finally {
      setLoading(false);
    }
  }, [accountId, hydrate]);

  useEffect(() => { load(); }, [load]);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await updateSubscription(accountId, {
        planCode: form.planCode,
        trialDays: numberOrNull(form.trialDays),
        trialStartedAt: emptyToNull(form.trialStartedAt),
        expiresAt: emptyToNull(form.expiresAt),
        gracePeriodDays: numberOrNull(form.gracePeriodDays),
        maxLocations: numberOrNull(form.maxLocations),
        maxUsers: numberOrNull(form.maxUsers),
        maxProviders: numberOrNull(form.maxProviders),
      });
      // Re-read rather than trusting the response: the state and days-remaining are derived
      // server-side, and showing a stale "Active" next to a date in the past is worse than one
      // extra request.
      hydrate(await fetchSubscription(accountId));
      setNotice('Subscription updated.');
    } catch (e) {
      setError(errorMessage(e, 'Could not save the subscription'));
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = async (feature, enabled) => {
    setBusyFeature(feature);
    setError(null);
    setNotice(null);
    try {
      setEntitlements(await setEntitlement(accountId, feature, enabled));
      setNotice(`${FEATURE_LABELS[feature] || feature} ${enabled ? 'granted' : 'revoked'}.`);
    } catch (e) {
      setError(errorMessage(e, 'Could not change that module'));
    } finally {
      setBusyFeature(null);
    }
  };

  if (loading) return <LinearProgress sx={{ mb: 3 }} />;
  if (!form || !subscription) {
    return error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null;
  }

  const state = SUBSCRIPTION_STATE_LABELS[subscription.state]
    || { label: subscription.state || 'Unknown', color: 'default' };
  const keys = featureKeys.length ? featureKeys : Object.keys(FEATURE_LABELS);
  const readOnlyHint = canWrite ? '' : 'PLATFORM_SUPPORT is read-only';

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Subscription</Typography>
            <Chip size="small" color={state.color} label={state.label} />
            {typeof subscription.daysRemaining === 'number' && (
              <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                {subscription.daysRemaining >= 0
                  ? `${subscription.daysRemaining} day(s) remaining`
                  : `${Math.abs(subscription.daysRemaining)} day(s) past expiry`}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <TextField
              select label="Plan" size="small"
              value={form.planCode} onChange={set('planCode')} disabled={!canWrite}
            >
              {PLAN_CODES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
            <TextField
              label="Trial length (days)" type="number" size="small"
              value={form.trialDays} onChange={set('trialDays')} disabled={!canWrite}
              helperText="Re-dates the expiry from the trial start, unless a date is set"
            />
            <TextField
              label="Trial started" type="date" size="small" InputLabelProps={{ shrink: true }}
              value={form.trialStartedAt} onChange={set('trialStartedAt')} disabled={!canWrite}
            />
            <TextField
              label="Access until" type="date" size="small" InputLabelProps={{ shrink: true }}
              value={form.expiresAt} onChange={set('expiresAt')} disabled={!canWrite}
              helperText="Blank means open-ended — no expiry"
            />
            <TextField
              label="Grace period (days)" type="number" size="small"
              value={form.gracePeriodDays} onChange={set('gracePeriodDays')} disabled={!canWrite}
              helperText="Read-only access for this long after expiry, then blocked"
            />
          </Box>

          <Divider sx={{ my: 2.5 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Limits</Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <TextField
              label="Max locations" type="number" size="small" placeholder="Unlimited"
              value={form.maxLocations} onChange={set('maxLocations')} disabled={!canWrite}
            />
            <TextField
              label="Max staff users" type="number" size="small" placeholder="Unlimited"
              value={form.maxUsers} onChange={set('maxUsers')} disabled={!canWrite}
            />
            <TextField
              label="Max doctors" type="number" size="small" placeholder="Unlimited"
              value={form.maxProviders} onChange={set('maxProviders')} disabled={!canWrite}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2.5 }}>
            <Tooltip title={readOnlyHint}>
              <span>
                <Button variant="contained" onClick={save} disabled={!canWrite || saving}>
                  {saving ? 'Saving…' : 'Save subscription'}
                </Button>
              </span>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Modules</Typography>
          <Typography variant="body2" sx={{ color: COLORS.textMuted, mb: 1.5 }}>
            What this clinic is sold. Takes effect immediately. A clinic can hide a module it has,
            but cannot grant itself one it does not — where a clinic has hidden something, it is
            noted here.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {keys.map((key) => {
              const granted = entitlements[key] !== false;
              const hiddenByClinic = granted && clinicToggles[key] === false;
              return (
                <Tooltip key={key} title={readOnlyHint}>
                  <FormControlLabel
                    sx={{ mr: 0 }}
                    control={(
                      <Switch
                        checked={granted}
                        disabled={!canWrite || busyFeature === key}
                        onChange={(e) => toggleFeature(key, e.target.checked)}
                      />
                    )}
                    label={(
                      <Box component="span">
                        {FEATURE_LABELS[key] || key}
                        {hiddenByClinic && (
                          <Typography component="span" variant="caption" sx={{ color: COLORS.textMuted }}>
                            {' · hidden by the clinic'}
                          </Typography>
                        )}
                      </Box>
                    )}
                  />
                </Tooltip>
              );
            })}
          </Box>
        </CardContent>
      </Card>
    </>
  );
}
