# Architecture — Dev Portal

Company-side admin console. React (CRA) + MUI, talking to the `/api/platform/**` realm in the
`health` backend. See [PRD.md](PRD.md) for what it is for and what it deliberately cannot do.

---

## The security boundary this rests on

Everything else here is ordinary React. This part is not, and it is the reason the console can be
allowed to exist at all.

The backend has **three auth realms**:

| Realm | Table | Signed with | Guards |
| --- | --- | --- | --- |
| Clinic staff | `app_user` | clinic key | everything not listed below |
| Patient | `client` | clinic key + `typ=PATIENT` claim | `/api/patient-portal/**` |
| **Platform operator** | `platform_user` | **its own key** | `/api/platform/**` |

Four properties hold this together. Each one is load-bearing; removing any one of them collapses
the boundary into "one forgotten check away from a breach":

1. **A platform operator has no account link.** Not an `AppUser` with an elevated role — a
   separate table with no tenant column. There is no role value on a clinic user that any platform
   route accepts.
2. **A different signing key.** A clinic token presented to a platform route fails *signature
   verification*, not a claim check. If the keys were shared, every "is this caller platform
   staff?" decision would reduce to trusting a claim inside a token the clinic app also knows how
   to mint.
3. **Mutually exclusive filters.** `JwtFilter` and `PlatformJwtFilter` each `shouldNotFilter()`
   every path the other owns. Without this, a valid clinic token would populate the security
   context on a platform route, and the route would be exactly as safe as its own authority check.
4. **Authority, not authentication.** `/api/platform/**` requires
   `hasAnyAuthority("PLATFORM_ADMIN", "PLATFORM_SUPPORT")`. `authenticated()` would be satisfied
   by any clinic token in the system.

`PlatformRealmIsolationTest` in `health` covers the cross-realm rejections. Keep it passing.

The role is also re-read from the database on **every** request rather than trusted from the
token, so deactivating an operator or demoting them takes effect immediately rather than whenever
their 8-hour token happens to expire.

## Why this app is thinner than `crm_frontend`

`crm_frontend`'s `AuthContext` carries `user`, `account`, and `selectedLocationId`, and its single
largest class of bug is a fetch firing before `selectedLocationId` is populated and returning
another clinic's data.

**None of that applies here.** A company operator is not scoped to a tenant, so this
`PlatformAuthContext` holds only the operator and their role. Every endpoint is cross-tenant by
design. The guard that context exists to provide is unnecessary, and imitating it would be
cargo-culting.

## localStorage keys are namespaced on purpose

Keys are `platform`-prefixed (`platformToken`, `platformUser`), deliberately unlike
`crm_frontend`'s plain `token` / `user`.

If the two apps are ever served from the same origin they share a localStorage. Identical keys
would let a clinic login clobber this session — and worse, hand this console a *clinic* token to
send at `/api/platform/**`.

## Layout

```
src/
  index.js            entry
  App.js              routes; everything except /login is auth-gated
  context/
    PlatformAuthContext.js   operator + role; no tenant state
  services/
    api.js            axios instance, platform token interceptor, 401 -> /login
  components/
    AppShell.js       nav, role chip, sign-out
    StatCard.js       the stat tiles
    StatusChip.js     account lifecycle status, including the null case
  pages/
    LoginPage.js
    AccountsPage.js       R1 — clinics list
    AccountDetailPage.js  R2/R3 — detail + status dialog
    UsagePage.js          R4 — cross-clinic usage
    LeadsPage.js          R5 — lead inbox
  styles/js/
    styleConstants.js  VERBATIM copy of crm_frontend's tokens
    adminTokens.js     portal-only additions
    muiTheme.js
  utils/format.js      dates, relative time, INR
```

## Design system

`styleConstants.js` is a **verbatim** copy of `crm_frontend`'s, not a trimmed one, so diffing the
two files stays a meaningful drift check. Portal-only tokens go in `adminTokens.js` rather than
being added to the copy.

Two deliberate departures from `crm_frontend`:

- **No dark mode.** Not worth the surface area for an internal tool.
- **No global element selectors** in `index.css`. `crm_frontend`'s `global.css` has a broad-selector
  rule that forces every element's flat `background-color` in dark mode, which has historically
  painted over decorative nodes. Nothing like it exists here; don't add one.

## Data shape notes

- **Aggregates are one `GROUP BY` per metric across all accounts**, stitched by account id in
  memory — not one query per clinic, which would be hundreds of round trips to render one table.
- **Appointment counts are scoped through `client.accountLocation`**, not
  `serviceProvider.locations`. A `Client` belongs to exactly one location and `Appointment.client`
  is non-null, so that path can neither drop a row nor double-count. The pre-existing
  `countByAccountId` walks the provider path with a plain `COUNT` and *does* double-count an
  appointment whose provider staffs two locations of the same account — not a path to copy.
- **Revenue falls back per row**: `SUM(COALESCE(finalAmount, totalAmount))`. `finalAmount` was
  added after the first invoices existed, so a plain `SUM(finalAmount)` silently under-reports
  older clinics.
- **The usage window's `to` date is inclusive in the API, exclusive in the query.** A naive
  `<= to` against a timestamp column drops everything after midnight on the final day.

## Configuration

`REACT_APP_API_BASE_URL` — backend URL including the `/api` suffix. Same variable as the sibling
apps. CRA bakes it in at **build** time; changing it needs a rebuild, not a restart. Unset, the app
uses a relative `/api` and relies on the `proxy` field in `package.json` (dev server only).

Port 3002, keeping it clear of `crm_frontend` (3000) and `patient_portal` (3001).

## Getting an operator account

There is no default one, deliberately — see `PlatformDevDataSeeder` in `health`. Unlike the demo
clinic seeder, which runs on every boot, this one is off unless explicitly enabled *and* given a
password. A known-password account that can read every clinic's patient data is a different risk
class from a demo dentist login.

Locally, boot `health` with `APP_PLATFORM_SEED_ENABLED=true` and `APP_PLATFORM_SEED_PASSWORD=...`.
In a deployed environment, insert the row by hand and set `JWT_PLATFORM_SECRET` — the default
platform signing key is a literal in committed source and is dev-only.
