import React from 'react';

/**
 * The card faces, from the "EaseMyOPD Cards" design file. Drawn in CSS pixels at the sizes the
 * design uses (visiting 340 x 208 = 90 x 55 mm, ID 324 x 204 = 85.7 x 54 mm at 96 dpi), so the
 * print preview is the printed size. Nothing here takes a salary or bonus prop: a card is built
 * from the profile, the company block and a QR of the employee code only.
 */

export const CARD_SIZES = {
  ID: { w: 324, h: 204 },
  VISITING: { w: 340, h: 208 },
};

export const VISITING_DESIGNS = [
  { key: 1, label: 'Dark teal, offerings list' },
  { key: 2, label: 'White, chips' },
  { key: 3, label: 'Amber, bold' },
  { key: 4, label: 'Split panel' },
  { key: 5, label: 'Circular hub' },
];

const TEAL = '#0B4A48';
const AMBER = '#F3B04E';
const MINT = '#E7F1EF';
const INK = '#0B2E30';
const SOFT = '#1F3B3D';
const MUTED = '#4A6366';
const RULE = '#C9DED9';
const PALE = '#CDEBE9';
const SITE = 'easemyopd.com';

const font = 'Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

const box = (type, extra) => ({
  width: CARD_SIZES[type].w,
  height: CARD_SIZES[type].h,
  boxSizing: 'border-box',
  overflow: 'hidden',
  fontFamily: font,
  position: 'relative',
  ...extra,
});

/** The EaseMyOPD mark. `tile` is the rounded square, `glyph` the speech bubble and cross. */
function Mark({ size, tile = '#fff', glyph = TEAL }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect width="48" height="48" rx="12" fill={tile} />
      <rect x="11" y="10" width="26" height="22" rx="8" fill={glyph} />
      <path d="M17 30 L17 38 L26 30 Z" fill={glyph} />
      <rect x="22" y="15" width="4" height="12" rx="2" fill={tile} />
      <rect x="18" y="19" width="12" height="4" rx="2" fill={tile} />
    </svg>
  );
}

const OFFERS = ['Clinic software', 'Website', 'Google profile', 'SEO and GEO', 'WhatsApp booking', 'Patient campaigns'];

export function phoneText(n) {
  const d = String(n || '').replace(/\D/g, '');
  if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return n || '';
}

function phones(profile, company) {
  const seen = new Set();
  return [profile.mobile, company.supportPhone]
    .map(phoneText)
    .filter((p) => p && !seen.has(p.replace(/\D/g, '')) && seen.add(p.replace(/\D/g, '')));
}

const brandLine = (company) => `A product of ${company.companyName}`;

function V1({ company }) {
  return (
    <div style={box('VISITING', { background: TEAL, color: '#fff', display: 'flex', flexDirection: 'column' })}>
      <div style={{ padding: '14px 20px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Mark size={34} />
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.1 }}>EaseMyOPD</div>
          <div style={{ fontSize: 10, color: PALE, marginTop: 2 }}>Clinic software, made simple</div>
        </div>
      </div>
      <div style={{ flex: 1, margin: '0 14px', background: '#fff', borderRadius: 12, padding: '10px 14px', boxSizing: 'border-box', color: INK, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, color: '#0E7C7A' }}>WHAT WE OFFER</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 10px', fontSize: 11, fontWeight: 600 }}>
          {OFFERS.map((o) => (
            <div key={o} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: AMBER, flexShrink: 0 }} />{o}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '10px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: AMBER }}>{SITE}</span>
        <span style={{ fontSize: 8, color: '#fff' }}>{brandLine(company)}</span>
      </div>
    </div>
  );
}

function V2({ company }) {
  const chips = ['Clinic software', 'Website', 'Google profile', 'SEO and GEO', 'WhatsApp', 'Campaigns'];
  return (
    <div style={box('VISITING', { padding: '20px 22px', background: '#fff', color: INK, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Mark size={36} tile={TEAL} glyph="#fff" />
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4, color: TEAL }}>EaseMyOPD</div>
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>Clinic software, made simple</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {chips.map((c) => (
            <span key={c} style={{ padding: '4px 10px', borderRadius: 999, background: MINT, fontSize: 10, fontWeight: 700, color: TEAL }}>{c}</span>
          ))}
        </div>
      </div>
      <div style={{ borderTop: `3px solid ${AMBER}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: TEAL }}>{SITE}</span>
        <span style={{ fontSize: 8, color: MUTED }}>{company.companyName}</span>
      </div>
    </div>
  );
}

function V3({ company }) {
  return (
    <div style={box('VISITING', { padding: '20px 22px', background: AMBER, color: INK, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' })}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4 }}>EaseMyOPD</span>
        <Mark size={30} tile={TEAL} glyph="#fff" />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, letterSpacing: -0.6 }}>
          You manage patients.<br />We manage your clinic.
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#3B2A05', marginTop: 8 }}>
          Software · Website · Google · SEO and GEO · WhatsApp · Campaigns
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#3B2A05' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: INK }}>{SITE}</span>
        <span>{company.companyName}</span>
      </div>
    </div>
  );
}

function V4({ company }) {
  const points = ['Clinic software and prescriptions', 'Website for your clinic', 'Google profile, SEO and GEO', 'WhatsApp booking and campaigns'];
  return (
    <div style={box('VISITING', { display: 'flex', background: '#fff', color: INK })}>
      <div style={{ width: 118, boxSizing: 'border-box', background: TEAL, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#fff' }}>
        <Mark size={52} />
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.2 }}>EaseMyOPD</div>
      </div>
      <div style={{ flex: 1, boxSizing: 'border-box', padding: '14px 18px 12px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>Clinic software for a smoother OPD</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 7, fontSize: 10.5, fontWeight: 600, lineHeight: 1.25 }}>
            {points.map((p) => <div key={p}>✓ {p}</div>)}
          </div>
        </div>
        <div style={{ borderTop: '1px solid #D5E6E3', paddingTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: TEAL }}>{SITE}</div>
          <div style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>{brandLine(company)}</div>
        </div>
      </div>
    </div>
  );
}

function V5() {
  const hub = { x: 170, y: 104 };
  const spokes = [
    { x: 170, y: 40, l: 124, t: 29, label: 'Clinic software' },
    { x: 278, y: 73, l: 232, t: 62, label: 'Website' },
    { x: 278, y: 135, l: 232, t: 124, label: 'Google profile' },
    { x: 170, y: 166, l: 124, t: 155, label: 'SEO and GEO' },
    { x: 62, y: 135, l: 16, t: 124, label: 'WhatsApp' },
    { x: 62, y: 73, l: 16, t: 62, label: 'Campaigns' },
  ];
  return (
    <div style={box('VISITING', { background: '#F3F8F7', color: INK })}>
      <svg width="340" height="208" viewBox="0 0 340 208" aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0 }}>
        <g stroke={TEAL} strokeWidth="1.4" strokeOpacity="0.45" fill="none">
          {spokes.map((s) => <line key={s.label} x1={hub.x} y1={hub.y} x2={s.x} y2={s.y} />)}
        </g>
        <g fill={TEAL}>{spokes.map((s) => <circle key={s.label} cx={s.x} cy={s.y} r="3" />)}</g>
      </svg>
      <div style={{ position: 'absolute', left: 126, top: 60, width: 88, height: 88, boxSizing: 'border-box', borderRadius: '50%', background: TEAL, border: `4px solid ${AMBER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#fff' }}>
        <Mark size={24} />
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: -0.2 }}>EaseMyOPD</div>
      </div>
      {spokes.map((s) => (
        <div key={s.label} style={{ position: 'absolute', left: s.l, top: s.t, width: 92, height: 22, boxSizing: 'border-box', borderRadius: 999, background: '#fff', border: '1px solid #B9D9D4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700, color: TEAL }}>
          {s.label}
        </div>
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, textAlign: 'center', fontSize: 9, fontWeight: 800, color: TEAL }}>{SITE}</div>
    </div>
  );
}

/** Front of the visiting card; `design` 1-5 picks one of the five options. */
export function VisitingFront({ design = 1, company }) {
  switch (Number(design)) {
    case 2: return <V2 company={company} />;
    case 3: return <V3 company={company} />;
    case 4: return <V4 company={company} />;
    case 5: return <V5 company={company} />;
    default: return <V1 company={company} />;
  }
}

/** Back of the visiting card: the person's details. Shared by all five fronts. */
export function VisitingBack({ profile, company }) {
  return (
    <div style={box('VISITING', { padding: '18px 20px', background: MINT, color: INK, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' })}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3, overflowWrap: 'anywhere' }}>{profile.fullName}</div>
        {profile.designationName && (
          <span style={{ display: 'inline-block', marginTop: 6, padding: '3px 10px', borderRadius: 999, background: TEAL, color: '#fff', fontSize: 10, fontWeight: 700 }}>
            {profile.designationName}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.7, color: SOFT }}>
        <div>{phones(profile, company).join(' · ')}</div>
        <div>{company.email}</div>
        <div>{SITE}</div>
        <div>{company.address}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${RULE}`, paddingTop: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: TEAL }}>EaseMyOPD</span>
        <span style={{ fontSize: 8, color: MUTED }}>{brandLine(company)}</span>
      </div>
    </div>
  );
}

function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

export function IdFront({ profile, company, photoUrl, onPhotoLoad }) {
  const row = (k, v) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
      <span style={{ color: MUTED }}>{k}</span><span style={{ textAlign: 'right' }}>{v}</span>
    </div>
  );
  return (
    <div style={box('ID', { background: '#fff', color: INK, display: 'flex', flexDirection: 'column' })}>
      <div style={{ height: 50, boxSizing: 'border-box', padding: '0 16px', background: TEAL, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3 }}>EaseMyOPD</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, color: AMBER }}>STAFF ID</span>
      </div>
      <div style={{ flex: 1, boxSizing: 'border-box', padding: '14px 16px', display: 'flex', gap: 14 }}>
        {photoUrl ? (
          <img src={photoUrl} alt="" onLoad={onPhotoLoad} onError={onPhotoLoad}
            style={{ width: 76, height: 92, objectFit: 'cover', borderRadius: 8, flexShrink: 0, display: 'block' }} />
        ) : (
          <div style={{ width: 76, height: 92, boxSizing: 'border-box', border: '1.5px dashed #7FA9AB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: MUTED, flexShrink: 0, borderRadius: 8 }}>Photo</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.15, overflowWrap: 'anywhere', maxHeight: 38, overflow: 'hidden' }}>{profile.fullName}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, marginTop: 2 }}>{profile.designationName || ''}</div>
          </div>
          <div style={{ fontSize: 10, color: SOFT, lineHeight: 1.6 }}>
            {row('ID No.', profile.employeeCode)}
            {row('Valid till', formatDate(profile.cardValidUntil))}
            {row('Mobile', phoneText(profile.mobile) || '—')}
          </div>
        </div>
      </div>
      <div style={{ boxSizing: 'border-box', padding: '7px 16px', borderTop: `1px solid ${RULE}`, fontSize: 9, color: MUTED }}>{company.companyName}</div>
    </div>
  );
}

export function IdBack({ profile, company, qrUrl }) {
  const line = { fontSize: 10, lineHeight: 1.6, color: '#fff' };
  return (
    <div style={box('ID', { padding: '18px 20px', background: TEAL, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' })}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, letterSpacing: 1, color: PALE, textTransform: 'uppercase' }}>If found, please return to</div>
          <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>{company.companyName}</div>
          <div style={{ ...line, marginTop: 2 }}>{company.address}</div>
          <div style={{ ...line, overflowWrap: 'anywhere' }}>{company.email} · {SITE}</div>
          <div style={line}>{phoneText(company.supportPhone)}</div>
        </div>
        {qrUrl && (
          <div style={{ width: 52, flexShrink: 0, textAlign: 'center' }}>
            <img src={qrUrl} alt="" style={{ width: 52, height: 52, display: 'block', background: '#fff', padding: 3, boxSizing: 'border-box', borderRadius: 4 }} />
            <div style={{ fontSize: 7, color: PALE, marginTop: 2 }}>{profile.employeeCode}</div>
          </div>
        )}
      </div>
      <div style={{ fontSize: 9, lineHeight: 1.5, color: PALE }}>
        This card remains the property of the company and must be carried while on duty. Report a lost card to the office at once.
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <span style={{ fontSize: 10, color: PALE }}>Authorised signatory</span>
        <span style={{ width: 120, borderTop: `1px solid ${AMBER}` }} />
      </div>
    </div>
  );
}
