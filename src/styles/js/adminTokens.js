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
