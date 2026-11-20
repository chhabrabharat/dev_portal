import { money } from './format';

export const DOC_TYPES = {
  ID_PROOF: 'ID proof',
  ADDRESS_PROOF: 'Address proof',
  CERTIFICATE: 'Certificate',
  OFFER_LETTER: 'Offer letter',
  OTHER: 'Other',
};

export const GENDERS = ['Female', 'Male', 'Other'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const STAFF_STATUS = { ACTIVE: 'Active', RELEASED: 'Released' };

/** 5 MB, matching the server. The server is the real check; this just saves a round trip. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const UPLOAD_ACCEPT = 'application/pdf,image/jpeg,image/png';

/** Staff pay is stored as whole paise (new money in this system is integer paise). */
export function moneyFromPaise(paise) {
  if (paise === null || paise === undefined) return '—';
  return money(paise / 100);
}

/** '45,000' or '45000.50' -> paise, or null if it is not a non-negative amount. */
export function rupeesToPaise(text) {
  const n = Number(String(text ?? '').replace(/,/g, '').trim());
  if (!Number.isFinite(n) || n < 0 || String(text ?? '').trim() === '') return null;
  return Math.round(n * 100);
}

/** Hands a Blob to the browser as a file download. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** The reason an upload can be refused before it is sent, or null. */
export function uploadProblem(file) {
  if (!file) return 'Choose a file';
  if (file.size > MAX_UPLOAD_BYTES) return 'Files must be 5 MB or smaller';
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) return 'Only PDF, JPG or PNG files are accepted';
  return null;
}
