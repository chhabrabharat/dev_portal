/**
 * Date helpers for the sales pipeline. Everything here works on plain `yyyy-MM-dd` strings,
 * which is what the backend sends for LocalDate fields, and compares them as strings - ISO dates
 * sort lexically, so no Date objects and no timezone drift. "Today" is the server's Asia/Kolkata
 * date from the board payload, so an operator abroad sees the same "overdue" the reminder uses.
 */

const SHORT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const LONG = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function parse(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function shortDate(iso) {
  const d = parse(iso);
  return d ? SHORT.format(d) : '';
}

export function longDate(iso) {
  const d = parse(iso);
  return d ? LONG.format(d) : '—';
}

/** Whole days from `from` to `to` (both ISO dates); never negative. */
export function daysBetween(from, to) {
  const a = parse(from);
  const b = parse(to);
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

/** 'overdue' | 'today' | 'later' | null for a lead's next action, as of the server's today. */
export function dueState(lead, today) {
  if (!lead?.nextActionDue || !today) return null;
  if (lead.nextActionDue < today) return 'overdue';
  if (lead.nextActionDue === today) return 'today';
  return 'later';
}

/** Terminal stages (Live, Lost) never have actions "due" - matches SalesLeadRepository.findDue. */
export function isActionDue(lead, today, stagesById) {
  const state = dueState(lead, today);
  if (state !== 'overdue' && state !== 'today') return false;
  const stage = stagesById?.[lead.stageId];
  return !(stage && stage.terminal);
}

export function isColdLead(lead) {
  return lead.source === 'GOOGLE_COLD';
}

export function dueLabel(lead, today) {
  const state = dueState(lead, today);
  if (!state) return '';
  if (state === 'overdue') {
    const n = daysBetween(lead.nextActionDue, today);
    return `${n}d overdue`;
  }
  if (state === 'today') return 'Due today';
  return `Due ${shortDate(lead.nextActionDue)}`;
}
