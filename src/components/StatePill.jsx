import React from 'react';

/**
 * The account's access state, in the same words the clinic's own screens use. Colour carries the
 * urgency so a long list can be scanned without reading every row.
 */
const STATES = {
  TRIAL: { label: 'Trial', tone: 'info' },
  ACTIVE: { label: 'Active', tone: 'ok' },
  EXPIRING_SOON: { label: 'Expiring soon', tone: 'warn' },
  GRACE: { label: 'Read only', tone: 'bad' },
  EXPIRED: { label: 'Expired', tone: 'bad' },
  ON_HOLD: { label: 'On hold', tone: 'bad' },
};

export default function StatePill({ state }) {
  if (!state) return <span className="pill info">Unknown</span>;
  const entry = STATES[state] || { label: state, tone: 'info' };
  return <span className={`pill ${entry.tone}`}>{entry.label}</span>;
}
