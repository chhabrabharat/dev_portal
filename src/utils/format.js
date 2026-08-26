/**
 * Display formatters. All money in this system is a plain Double rupee amount on the backend
 * (Billing.totalAmount / finalAmount), NOT integer paise - so these format rupees directly.
 */

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function money(amount) {
  if (amount === null || amount === undefined) return '—';
  return INR.format(amount);
}

export function count(n) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-IN').format(n);
}

/** Dates arrive as ISO strings already in IST (the backend pins Jackson's timezone to it). */
export function dateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function dateOnly(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * "Last activity" is the newest appointment slot, which for a busy clinic is in the FUTURE
 * (tomorrow's bookings). So this deliberately reads both directions rather than assuming the
 * past - a clinic whose newest appointment is next week is the healthiest signal there is, and
 * rendering that as "in 6 days" is more informative than an absolute date alone.
 */
export function relativeDays(iso) {
  if (!iso) return 'never';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 'never';
  const days = Math.round((then.getTime() - Date.now()) / 86400000);
  if (days === 0) return 'today';
  if (days > 0) return days === 1 ? 'tomorrow' : `in ${days}d`;
  return days === -1 ? 'yesterday' : `${Math.abs(days)}d ago`;
}

/** ISO yyyy-MM-dd, which is what the backend's @DateTimeFormat(ISO.DATE) params expect. */
export function isoDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

export function today() {
  return isoDate(new Date());
}
