/**
 * Turns a CSV of Google-sourced clinics into the `cold` rows of POST /platform/pipeline/import.
 *
 * Mirrors scripts/import_leads.py so the drawer and the script build the same rows: columns are
 * matched by header keyword (an exact header beats a contains-match), and a row without a Lead ID
 * gets `cold:<slug of name>` as its sourceId, which is what the server matches on. Importing the
 * same file twice therefore updates rows rather than duplicating them, and so does importing a
 * clinic the tracker import already brought in under the same name.
 */

// header keyword(s) -> field, first match wins in this order. Same table as COLD_COLUMNS in the script.
const COLD_COLUMNS = [
  [['lead id', 'id'], 'sourceId'],
  [['name', 'clinic'], 'name'],
  [['category'], 'category'],
  [['type', 'speciality', 'specialty'], 'type'],
  [['phone', 'mobile'], 'phone'],
  [['rating'], 'rating'],
  [['review'], 'reviewCount'],
  [['distance', 'dist', 'km'], 'distanceKm'],
  [['address', 'area'], 'address'],
  [['source'], 'source'],
];

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

export const slug = (name) => norm(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);

/** RFC 4180-ish: quoted cells may hold commas, quotes ("") and line breaks. Semicolon or tab files work too. */
export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  for (const ch of firstLine) if (ch in counts) counts[ch] += 1;
  const delim = Object.keys(counts).reduce((a, b) => (counts[b] > counts[a] ? b : a), ',');

  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delim) {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

function mapHeaders(headers) {
  const mapping = {};
  const used = new Set();
  COLD_COLUMNS.forEach(([keywords, field]) => {
    // Keywords are tried in their listed order, so with both an "Address" and an "Area" column
    // the address wins whichever comes first in the file.
    let found = -1;
    [true, false].some((exact) => keywords.some((k) => {
      found = headers.findIndex((h, i) => {
        const hn = norm(h);
        return !used.has(i) && hn && (exact ? k === hn : hn.includes(k));
      });
      return found >= 0;
    }));
    if (found >= 0) { mapping[found] = field; used.add(found); }
  });
  const ignored = headers.filter((h, i) => !used.has(i) && norm(h));
  return { mapping, ignored };
}

const text = (v) => {
  const s = String(v ?? '').trim();
  return s || null;
};

const num = (v, int = false) => {
  const s = String(v ?? '').replace(/,/g, '').trim();
  if (!s) return null;
  const n = int ? parseInt(s, 10) : parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

/** Header row = the first row that has a name/clinic column (a title row above it is skipped). */
export function buildColdRows(csvText) {
  const rows = parseCsv(csvText);
  const headerAt = rows.findIndex((r) => r.some((c) => ['name', 'clinic'].some((k) => norm(c).includes(k))));
  if (headerAt < 0) {
    return { error: 'No header row with a Name or Clinic column was found.', cold: [], skipped: 0, ignored: [], duplicates: 0 };
  }
  const { mapping, ignored } = mapHeaders(rows[headerAt]);
  if (!Object.values(mapping).includes('name')) {
    return { error: 'No Name or Clinic column was found.', cold: [], skipped: 0, ignored, duplicates: 0 };
  }

  const cold = [];
  const seen = new Set();
  let skipped = 0;
  let duplicates = 0;
  rows.slice(headerAt + 1).forEach((r) => {
    const rec = {};
    Object.entries(mapping).forEach(([i, field]) => { rec[field] = r[Number(i)]; });
    const name = text(rec.name);
    if (!name) { skipped += 1; return; }
    const out = {};
    ['sourceId', 'category', 'type', 'phone', 'address', 'source'].forEach((f) => {
      const v = text(rec[f]);
      if (v != null) out[f] = v;
    });
    out.name = name;
    out.rating = num(rec.rating);
    out.reviewCount = num(rec.reviewCount, true);
    out.distanceKm = num(rec.distanceKm);
    out.sourceId = out.sourceId || `cold:${slug(name)}`;
    // Two rows with one sourceId would be one row on the server; keep the first and say so.
    if (seen.has(out.sourceId)) { duplicates += 1; return; }
    seen.add(out.sourceId);
    cold.push(out);
  });
  return { error: null, cold, skipped, ignored, duplicates };
}
