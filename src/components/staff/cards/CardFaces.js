import React from 'react';

/**
 * The four card faces, drawn in millimetres so the print preview is the printed size.
 * ID card 85 x 54 mm; visiting card 90 x 55 mm. The visiting card reuses the band and the
 * back, as the PRD asks. Nothing here takes a salary or bonus prop: a card is built from the
 * profile, the company block and a QR of the employee code only.
 */

export const CARD_SIZES = {
  ID: { w: 85, h: 54 },
  VISITING: { w: 90, h: 55 },
};

const BRAND = '#0f3d5e';
const INK = '#1f2937';
const MUTED = '#6b7280';

const face = (type) => ({
  width: `${CARD_SIZES[type].w}mm`,
  height: `${CARD_SIZES[type].h}mm`,
  position: 'relative',
  overflow: 'hidden',
  background: '#fff',
  color: INK,
  fontFamily: 'Helvetica, Arial, sans-serif',
  boxSizing: 'border-box',
});

function Band({ company }) {
  return (
    <div style={{ height: '11mm', background: BRAND, color: '#fff', display: 'flex', alignItems: 'center', padding: '0 4mm', boxSizing: 'border-box' }}>
      <span style={{ fontSize: '8.5pt', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {company.companyName}
      </span>
    </div>
  );
}

export function IdFront({ profile, company, photoUrl, onPhotoLoad }) {
  return (
    <div style={face('ID')} className="card-face">
      <Band company={company} />
      <div style={{ display: 'flex', gap: '4mm', padding: '3mm 3mm 0 4mm' }}>
        <div style={{ width: '24mm', height: '24mm', flexShrink: 0, background: '#e5e7eb' }}>
          {photoUrl && (
            <img src={photoUrl} alt="" onLoad={onPhotoLoad} onError={onPhotoLoad}
              style={{ width: '24mm', height: '24mm', objectFit: 'cover', display: 'block' }} />
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '10.5pt', fontWeight: 700, lineHeight: 1.2, overflowWrap: 'anywhere', maxHeight: '10mm', overflow: 'hidden' }}>{profile.fullName}</div>
          <div style={{ fontSize: '7.5pt', color: BRAND, marginTop: '1mm' }}>{profile.designationName || ''}</div>
          <div style={{ fontSize: '7pt', color: MUTED, marginTop: '2.5mm' }}>ID&nbsp; {profile.employeeCode}</div>
          <div style={{ fontSize: '7pt', color: MUTED, marginTop: '1mm' }}>Mob&nbsp; {profile.mobile || '—'}</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: '4mm', bottom: '3mm', fontSize: '6.5pt', color: MUTED }}>
        Valid until {profile.cardValidUntil ? formatDate(profile.cardValidUntil) : '—'}
      </div>
    </div>
  );
}

export function CardBack({ type, profile, company, qrUrl }) {
  return (
    <div style={face(type)} className="card-face">
      <Band company={company} />
      <div style={{ display: 'flex', gap: '3mm', padding: '3mm 4mm 0 4mm' }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: '7.5pt', lineHeight: 1.35 }}>
          <div style={{ overflowWrap: 'anywhere' }}>{company.address}</div>
          <div style={{ marginTop: '2mm' }}>Support&nbsp; {company.supportPhone}</div>
          <div style={{ marginTop: '1mm', fontSize: '7pt', color: MUTED, overflowWrap: 'anywhere' }}>{company.email}</div>
          <div style={{ fontSize: '7pt', color: MUTED }}>{company.website}</div>
        </div>
        <div style={{ width: '22mm', flexShrink: 0, textAlign: 'center' }}>
          {qrUrl && <img src={qrUrl} alt="" style={{ width: '22mm', height: '22mm', display: 'block' }} />}
          <div style={{ fontSize: '6.5pt', color: MUTED, marginTop: '0.8mm' }}>{profile.employeeCode}</div>
        </div>
      </div>
    </div>
  );
}

export function VisitingFront({ profile, company }) {
  return (
    <div style={face('VISITING')} className="card-face">
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3mm', background: BRAND }} />
      <div style={{ padding: '9mm 5mm 0 9mm' }}>
        <div style={{ fontSize: '13pt', fontWeight: 700, lineHeight: 1.2, overflowWrap: 'anywhere' }}>{profile.fullName}</div>
        <div style={{ fontSize: '8.5pt', color: BRAND, marginTop: '1mm' }}>{profile.designationName || ''}</div>
      </div>
      <div style={{ position: 'absolute', left: '9mm', right: '5mm', bottom: '8mm', fontSize: '8pt', lineHeight: 1.7 }}>
        <div>Mob&nbsp; {profile.mobile || '—'}</div>
        <div style={{ overflowWrap: 'anywhere' }}>{company.email}</div>
        <div>{company.website}</div>
      </div>
    </div>
  );
}

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
