import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import StatePill from '../components/StatePill.jsx';
import {
  getAccount,
  getUsage,
  listFeatureKeys,
  setEntitlement,
  updateSubscription,
} from '../api.js';

const PLANS = ['TRIAL', 'STANDARD', 'PRO'];
const STATUSES = ['NEW', 'ACTIVE', 'ON_HOLD', 'INACTIVE'];

/** Labels for the feature keys, so the toggles read as products rather than identifiers. */
const FEATURE_LABELS = {
  prescriptions: 'Prescriptions',
  invoices: 'Invoices',
  medicines: 'Medicines',
  diagnosticTests: 'Diagnostic tests',
  consultations: 'Consultations',
  reports: 'Reports',
  reviews: 'Reviews',
  patientDocuments: 'Patient documents',
  publicDoctorProfiles: 'Public doctor profiles',
  patientPortal: 'Patient portal',
  whatsappNotifications: 'WhatsApp notifications',
  aiAssistant: 'AI assistant',
  multiLocation: 'Multiple locations',
};

const toInputDate = (value) => (value ? String(value).slice(0, 10) : '');

const formatUsage = (used, max) => {
  if (used == null) return '—';
  if (max == null) return String(used);
  return `${used} / ${max}`;
};

/**
 * One clinic's commercial terms and entitlements.
 *
 * Two panels rather than one form, because they behave differently: the subscription is a draft the
 * operator saves deliberately, while a feature toggle takes effect immediately - that is the one an
 * operator reaches for mid-support-call, and making them press Save afterwards invites forgetting.
 */
export default function AccountDetail() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [usage, setUsage] = useState(null);
  const [featureKeys, setFeatureKeys] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyFeature, setBusyFeature] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const hydrate = useCallback((data) => {
    setAccount(data);
    setForm({
      planCode: data.subscription?.planCode || 'STANDARD',
      trialDays: data.subscription?.trialDays ?? '',
      trialStartedAt: toInputDate(data.subscription?.trialStartedAt),
      expiresAt: toInputDate(data.subscription?.expiresAt),
      gracePeriodDays: data.subscription?.gracePeriodDays ?? '',
      maxLocations: data.subscription?.maxLocations ?? '',
      maxUsers: data.subscription?.maxUsers ?? '',
      maxProviders: data.subscription?.maxProviders ?? '',
      status: data.status || 'ACTIVE',
    });
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getAccount(id), getUsage(id), listFeatureKeys()])
      .then(([accountData, usageData, keys]) => {
        if (!active) return;
        hydrate(accountData);
        setUsage(usageData);
        setFeatureKeys(keys);
      })
      .catch((e) => { if (active) setError(e.message || 'Could not load this account'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, hydrate]);

  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  // An empty field means "no limit" / "not set", which the API expects as a real null rather than
  // an empty string - sending "" would be stored as zero and quietly forbid everything.
  const numberOrNull = (value) => (value === '' || value === null ? null : Number(value));

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateSubscription(id, {
        planCode: form.planCode,
        trialDays: numberOrNull(form.trialDays),
        trialStartedAt: form.trialStartedAt || null,
        expiresAt: form.expiresAt || null,
        gracePeriodDays: numberOrNull(form.gracePeriodDays),
        maxLocations: numberOrNull(form.maxLocations),
        maxUsers: numberOrNull(form.maxUsers),
        maxProviders: numberOrNull(form.maxProviders),
        status: form.status,
      });
      // Re-read rather than trusting the patch response: the derived state and days-remaining are
      // computed server-side, and showing a stale "Active" next to a date in the past is worse than
      // one extra request.
      const fresh = await getAccount(id);
      hydrate(fresh);
      setMessage('Subscription updated.');
    } catch (e) {
      setError(e.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = async (feature, enabled) => {
    setBusyFeature(feature);
    setError('');
    setMessage('');
    try {
      const entitlements = await setEntitlement(id, feature, enabled);
      setAccount((current) => ({ ...current, entitlements }));
      setMessage(`${FEATURE_LABELS[feature] || feature} ${enabled ? 'granted' : 'revoked'}.`);
    } catch (e) {
      setError(e.message || 'Could not change that entitlement');
    } finally {
      setBusyFeature(null);
    }
  };

  if (loading) {
    return <p className="subtle">Loading account…</p>;
  }

  if (!account || !form) {
    return (
      <>
        {error && <div className="banner error">{error}</div>}
        <Link to="/accounts">Back to accounts</Link>
      </>
    );
  }

  const entitlements = account.entitlements || {};
  const clinicToggles = account.clinicToggles || {};
  const keys = featureKeys.length > 0 ? featureKeys : Object.keys(FEATURE_LABELS);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="subtle" style={{ marginBottom: 6 }}>
            <Link to="/accounts">← All accounts</Link>
          </p>
          <h1>{account.name || `Account ${account.id}`}</h1>
          <p className="subtle">
            {[account.owner, account.city, account.primaryEmail].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        <StatePill state={account.subscription?.state} />
      </div>

      {error && <div className="banner error">{error}</div>}
      {message && <div className="banner ok">{message}</div>}

      <section className="card">
        <h2>Usage</h2>
        <div className="usage">
          <div className="usage-item">
            <div className="usage-value">{formatUsage(usage?.locations, form.maxLocations || null)}</div>
            <div className="usage-label">Locations</div>
          </div>
          <div className="usage-item">
            <div className="usage-value">{formatUsage(usage?.users, form.maxUsers || null)}</div>
            <div className="usage-label">Staff users</div>
          </div>
          <div className="usage-item">
            <div className="usage-value">{formatUsage(usage?.providers, form.maxProviders || null)}</div>
            <div className="usage-label">Doctors</div>
          </div>
          <div className="usage-item">
            <div className="usage-value">
              {typeof account.subscription?.daysRemaining === 'number'
                ? account.subscription.daysRemaining
                : '∞'}
            </div>
            <div className="usage-label">Days remaining</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Subscription</h2>
        <div className="field-grid">
          <div>
            <label htmlFor="plan">Plan</label>
            <select id="plan" value={form.planCode} onChange={set('planCode')}>
              {PLANS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="status">Account status</label>
            <select id="status" value={form.status} onChange={set('status')}>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <p className="field-note">On hold or inactive stops the account regardless of dates.</p>
          </div>
          <div>
            <label htmlFor="trialDays">Trial length (days)</label>
            <input id="trialDays" type="number" min="1" value={form.trialDays} onChange={set('trialDays')} />
            <p className="field-note">Re-dates the expiry from the trial start, unless a date is set below.</p>
          </div>
          <div>
            <label htmlFor="trialStartedAt">Trial started</label>
            <input id="trialStartedAt" type="date" value={form.trialStartedAt} onChange={set('trialStartedAt')} />
          </div>
          <div>
            <label htmlFor="expiresAt">Access until</label>
            <input id="expiresAt" type="date" value={form.expiresAt} onChange={set('expiresAt')} />
            <p className="field-note">Blank means open-ended — no expiry.</p>
          </div>
          <div>
            <label htmlFor="gracePeriodDays">Grace period (days)</label>
            <input id="gracePeriodDays" type="number" min="0" value={form.gracePeriodDays} onChange={set('gracePeriodDays')} />
            <p className="field-note">Read-only access for this long after expiry, then blocked.</p>
          </div>
        </div>

        <h2 style={{ marginTop: 26 }}>Limits</h2>
        <div className="field-grid">
          <div>
            <label htmlFor="maxLocations">Max locations</label>
            <input id="maxLocations" type="number" min="1" value={form.maxLocations} onChange={set('maxLocations')} placeholder="Unlimited" />
          </div>
          <div>
            <label htmlFor="maxUsers">Max staff users</label>
            <input id="maxUsers" type="number" min="1" value={form.maxUsers} onChange={set('maxUsers')} placeholder="Unlimited" />
          </div>
          <div>
            <label htmlFor="maxProviders">Max doctors</label>
            <input id="maxProviders" type="number" min="1" value={form.maxProviders} onChange={set('maxProviders')} placeholder="Unlimited" />
          </div>
        </div>

        <div className="row end" style={{ marginTop: 22 }}>
          <button type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save subscription'}
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Entitlements</h2>
        <p className="subtle" style={{ marginBottom: 14 }}>
          What this account is sold. Takes effect immediately. A clinic can hide a module it has, but
          cannot grant itself one it does not — where a clinic has hidden something, it is noted here.
        </p>
        <div className="toggles">
          {keys.map((key) => {
            const granted = entitlements[key] !== false;
            const hiddenByClinic = granted && clinicToggles[key] === false;
            return (
              <label className="toggle" key={key} htmlFor={`feature-${key}`}>
                <input
                  id={`feature-${key}`}
                  type="checkbox"
                  checked={granted}
                  disabled={busyFeature === key}
                  onChange={(e) => toggleFeature(key, e.target.checked)}
                />
                <span className="toggle-label">
                  {FEATURE_LABELS[key] || key}
                  {hiddenByClinic && <span className="toggle-hint"> · hidden by the clinic</span>}
                </span>
              </label>
            );
          })}
        </div>
      </section>
    </>
  );
}
