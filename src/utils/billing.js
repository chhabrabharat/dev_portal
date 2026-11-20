/**
 * Helpers for the company's own quotations and invoices. All money from the API is paise; the
 * form works in rupees and converts at the edge, so nobody types paise.
 */

export const COMPANY = {
  name: 'NRVN INFORMATICS PRIVATE LIMITED',
  tradeName: 'EaseMyOPD',
  address: 'Flat 9151, Tower 9, ATS Homekraft Nobility, Shahberi Road, Noida, Gautam Buddha Nagar, Uttar Pradesh – 201318',
  cin: 'U62099UW2026PTC259385',
  pan: 'AAMCN1565A',
  gstin: '09AAMCN1565A1ZJ',
  stateCode: '09',
  email: 'bharat@nrvninformatics.com',
  website: 'nrvninformatics.com',
  phones: '8588818012 / 9901956000',
};

export const DOC_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'PAID', 'CANCELLED'];

export const STATUS_TOKENS = {
  DRAFT: { fg: '#475569', bg: '#f1f5f9', label: 'Draft' },
  SENT: { fg: '#1e40af', bg: '#dbeafe', label: 'Sent' },
  ACCEPTED: { fg: '#065f46', bg: '#d1fae5', label: 'Accepted' },
  PAID: { fg: '#065f46', bg: '#d1fae5', label: 'Paid' },
  CANCELLED: { fg: '#7f1d1d', bg: '#fee2e2', label: 'Cancelled' },
};

const INR2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

export function paise(p) {
  if (p === null || p === undefined) return '—';
  return INR2.format(p / 100);
}

export const rupeesToPaise = (r) => {
  const n = Number(String(r ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
export const paiseToRupees = (p) => (p === null || p === undefined ? '' : String(p / 100));

/** Percent shown to the operator <-> basis points stored. 18 <-> 1800. */
export const percentToBp = (pct) => {
  const n = Number(pct);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};
export const bpToPercent = (bp) => (bp === null || bp === undefined ? '' : String(bp / 100));

/** Client-side mirror of the server arithmetic so the form can preview totals while typing. */
export function computeTotals({ items, intraState, gstRateBp, advancePercentBp, advanceReceivedPaise }) {
  const subtotal = (items || []).reduce((s, it) => s + (Number(it.amountPaise) || 0), 0);
  const gst = Math.round((subtotal * (gstRateBp || 0)) / 10000);
  const cgst = intraState ? Math.floor(gst / 2) : 0;
  const sgst = intraState ? gst - cgst : 0;
  const igst = intraState ? 0 : gst;
  const total = subtotal + gst;
  const advanceDue = advancePercentBp ? Math.round((total * advancePercentBp) / 10000) : 0;
  const received = Number(advanceReceivedPaise) || 0;
  return { subtotalPaise: subtotal, cgstPaise: cgst, sgstPaise: sgst, igstPaise: igst, gstPaise: gst,
    totalPaise: total, advanceDuePaise: advanceDue, advanceReceivedPaise: received, balanceDuePaise: total - received };
}

/** The client's GSTIN starts with its state code; same as ours means CGST+SGST. */
export function guessIntraState(clientGstin) {
  const g = (clientGstin || '').trim();
  if (g.length < 2) return null;
  return g.slice(0, 2) === COMPANY.stateCode;
}

export function longDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Indian-style amount in words, for the "Amount in words" line a tax invoice usually carries. */
export function amountInWords(paiseAmount) {
  const rupees = Math.floor((paiseAmount || 0) / 100);
  const p = (paiseAmount || 0) % 100;
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
    'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (n) => (n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}`);
  const three = (n) => (n >= 100 ? `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${two(n % 100)}` : ''}` : two(n));
  const words = (n) => {
    if (n === 0) return 'Zero';
    const parts = [];
    const crore = Math.floor(n / 1e7); n %= 1e7;
    const lakh = Math.floor(n / 1e5); n %= 1e5;
    const thousand = Math.floor(n / 1e3); n %= 1e3;
    if (crore) parts.push(`${two(crore)} Crore`);
    if (lakh) parts.push(`${two(lakh)} Lakh`);
    if (thousand) parts.push(`${two(thousand)} Thousand`);
    if (n) parts.push(three(n));
    return parts.join(' ');
  };
  return `Rupees ${words(rupees)}${p ? ` and ${two(p)} Paise` : ''} Only`;
}
