import { COLORS } from './styleConstants';

/**
 * Tokens that exist only in this portal, kept out of the verbatim copy of crm_frontend's
 * styleConstants.js so that file stays diffable against its source.
 */

/**
 * Colors for Account.AccountStatus, which the backend enum defines as
 * NEW | ON_HOLD | ACTIVE | INACTIVE.
 *
 * UNSET is not a backend value - it's what this portal shows for a null status, which is a real
 * state in the data: self-serve signup never sets Account.status, so accounts created that way
 * arrive here as null rather than NEW. Rendering those as "NEW" would misreport them as a
 * deliberate lifecycle state, so they get their own visibly-unresolved styling instead.
 */
export const STATUS_COLORS = {
  ACTIVE: { fg: '#065f46', bg: '#d1fae5', label: 'Active' },
  NEW: { fg: '#1e40af', bg: '#dbeafe', label: 'New' },
  ON_HOLD: { fg: '#92400e', bg: '#fef3c7', label: 'On hold' },
  INACTIVE: { fg: '#7f1d1d', bg: '#fee2e2', label: 'Inactive' },
  UNSET: { fg: COLORS.textMuted, bg: '#f1f5f9', label: 'No status set' },
};

export function statusToken(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.UNSET;
}

/** Statuses an operator may set, in lifecycle order. Mirrors Account.AccountStatus exactly. */
export const SETTABLE_STATUSES = ['NEW', 'ACTIVE', 'ON_HOLD', 'INACTIVE'];

/**
 * Which statuses actually prevent a clinic from logging in. Kept in sync with the check in
 * health's AuthService.login - the portal warns before applying one of these, because it locks
 * a paying customer out of their own clinic.
 */
export const LOGIN_BLOCKING_STATUSES = ['ON_HOLD', 'INACTIVE'];

// Module labels for the entitlement toggles. Keys are the backend's FeatureKey wire names - the
// same strings crm_frontend and crm_mobile gate their menus on, so renaming one breaks all three.
export const FEATURE_LABELS = {
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

// Plans and the access states derived from a subscription's dates, for labelling only - the
// backend decides which state an account is actually in.
export const PLAN_CODES = ['TRIAL', 'STANDARD', 'PRO'];

export const SUBSCRIPTION_STATE_LABELS = {
  TRIAL: { label: 'Free trial', color: 'info' },
  ACTIVE: { label: 'Active', color: 'success' },
  EXPIRING_SOON: { label: 'Expiring soon', color: 'warning' },
  GRACE: { label: 'Expired — read only', color: 'error' },
  EXPIRED: { label: 'Expired', color: 'error' },
  ON_HOLD: { label: 'On hold', color: 'error' },
};

// --- sales pipeline ------------------------------------------------------------------------
// Labels for the SalesLead enums. Keys are the backend's wire names.

export const PIPELINE_SOURCES = {
  NETWORK_REFERRAL: { label: 'Network Referral', short: 'Referral' },
  INBOUND_ENQUIRY: { label: 'Inbound Enquiry', short: 'Enquiry' },
  GOOGLE_COLD: { label: 'Google (cold)', short: 'Google' },
  OTHER: { label: 'Other', short: 'Other' },
};

export const PIPELINE_CATEGORIES = {
  CLINIC: 'Clinic',
  HOSPITAL: 'Hospital',
};

export const PIPELINE_INTEREST = {
  INTERESTED: { label: 'Interested', fg: '#065f46', bg: '#d1fae5' },
  NOT_INTERESTED: { label: 'Not Interested', fg: '#7f1d1d', bg: '#fee2e2' },
};

/**
 * Column accent by stage kind, not by stage name - stages are data and can be renamed, but the
 * kind is what the backend keys its rules on, so colouring by it keeps the board honest.
 */
export const PIPELINE_KIND_COLORS = {
  OPEN: COLORS.primary,
  ONBOARDING: '#7c3aed',
  LIVE: COLORS.success,
  ON_HOLD: COLORS.warning,
  LOST: COLORS.textMuted,
};

/** Due-date chips on cards and in the needs-action panel. */
export const DUE_COLORS = {
  overdue: { fg: '#7f1d1d', bg: '#fee2e2' },
  today: { fg: '#92400e', bg: '#fef3c7' },
  later: { fg: COLORS.textSecondary, bg: '#f1f5f9' },
};

/**
 * Where a branch's Google Business Profile link stands. The keys are decided by the backend
 * (PlatformGoogleService.classify), so this only chooses how to show them; ORDER is worst-first
 * because the screen exists to find the clinics that need a call.
 */
export const GOOGLE_STATES = {
  OK: { fg: '#065f46', bg: '#d1fae5', label: 'Connected' },
  STALE: { fg: '#92400e', bg: '#fef3c7', label: 'Not syncing' },
  ERROR: { fg: '#7f1d1d', bg: '#fee2e2', label: 'Error' },
  NEEDS_LISTING: { fg: '#1e40af', bg: '#dbeafe', label: 'Pick a listing' },
  NOT_CONNECTED: { fg: COLORS.textMuted, bg: '#f1f5f9', label: 'Not connected' },
};

export const GOOGLE_STATE_ORDER = ['OK', 'STALE', 'ERROR', 'NEEDS_LISTING', 'NOT_CONNECTED'];

export function googleStateToken(state) {
  return GOOGLE_STATES[state] || GOOGLE_STATES.NOT_CONNECTED;
}

/** Colour band for an online presence score (0-100). Same thresholds the clinic app uses. */
export function presenceScoreToken(score) {
  if (score == null) return { fg: COLORS.textMuted, bg: '#f1f5f9' };
  if (score >= 75) return { fg: '#065f46', bg: '#d1fae5' };
  if (score >= 50) return { fg: '#92400e', bg: '#fef3c7' };
  return { fg: '#7f1d1d', bg: '#fee2e2' };
}

/**
 * Clinics tab. The category is a soft tracking label kept by the company - it changes nothing for
 * the clinic. UNCLASSIFIED is not a stored value: it is what a clinic with no row shows.
 */
export const CATEGORY_COLORS = {
  DEMO: { fg: '#5b21b6', bg: '#ede9fe', label: 'Demo' },
  TRIAL: { fg: '#92400e', bg: '#fef3c7', label: 'Trial' },
  PAID: { fg: '#065f46', bg: '#d1fae5', label: 'Paid' },
  INACTIVE: { fg: '#7f1d1d', bg: '#fee2e2', label: 'Inactive' },
  UNCLASSIFIED: { fg: COLORS.textMuted, bg: '#f1f5f9', label: 'Unclassified' },
};
export const SETTABLE_CATEGORIES = ['DEMO', 'TRIAL', 'PAID', 'INACTIVE'];
export function categoryToken(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.UNCLASSIFIED;
}

/** Google listing score bands; mirrors PlatformClinicTrackingService.bandOf (LOW <50, MEDIUM 50-79, HIGH 80+). */
export const SCORE_BANDS = {
  HIGH: { fg: '#065f46', bg: '#d1fae5', label: 'High' },
  MEDIUM: { fg: '#92400e', bg: '#fef3c7', label: 'Medium' },
  LOW: { fg: '#7f1d1d', bg: '#fee2e2', label: 'Low' },
  NOT_CONNECTED: { fg: COLORS.textMuted, bg: '#f1f5f9', label: 'Not connected' },
};
export function scoreBand(score, status) {
  if (score === null || score === undefined || status === 'NOT_CONNECTED') return 'NOT_CONNECTED';
  if (score >= 80) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}

/** Booking sources, in BookingSource.ORDER on the backend. */
export const BOOKING_SOURCES = [
  ['PUBLIC_PAGE', 'Website'], ['GOOGLE', 'Google'], ['WHATSAPP', 'WhatsApp'],
  ['STAFF', 'Staff'], ['WALK_IN', 'Walk-in'], ['NOT_RECORDED', 'Not recorded'],
];
