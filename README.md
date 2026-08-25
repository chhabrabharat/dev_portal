# Dev Portal

Internal **company-side** admin console for the clinic CRM. This is the surface the company uses
to oversee every clinic on the platform — it is *not* a clinic-facing app and not a superset of
`crm_frontend`.

The four sibling repos:

| Repo | Audience | Stack |
| --- | --- | --- |
| `health` | — (the API all of these talk to) | Java 17 + Spring Boot + MySQL |
| `crm_frontend` | clinic staff | React (CRA) + MUI |
| `crm_mobile` | clinic staff, on phones | React Native (Expo) |
| `patient_portal` | patients | Vite + React |
| **`dev_portal`** | **company operators** | **React (CRA) + MUI** |

## What it does

- **Clinics** — every account on the platform with locations / doctors / patients / logins /
  appointment counts and a "last activity" column, filterable by status and free text. Drill into
  one for its locations, staff logins, doctors, and registration details.
- **Lifecycle** — set an account to `NEW` / `ACTIVE` / `ON_HOLD` / `INACTIVE`. `ON_HOLD` and
  `INACTIVE` **block login for every user at that clinic**, so the UI warns before applying one.
- **Usage** — cross-clinic appointments / consultations / prescriptions / invoices / amount billed
  and settled over a date range. Rows that booked and billed nothing in the window are tinted:
  those are the finding, not the noise.
- **Leads** — every contact-us submission from the marketing site, *including the unclaimed pool*.
  Those are visible here and nowhere else: the clinic-facing app only ever shows a clinic its own
  already-claimed leads, so before this portal an unassigned lead was read by nobody.

## Run locally

Needs `health` running on `:8080` first (see that repo's CLAUDE.md — and note its default
properties point at a non-local database, so always pass explicit overrides).

```bash
npm install
npm start        # http://localhost:3002
```

Ports are deconflicted across the family: `crm_frontend` 3000, `patient_portal` 3001, this 3002.

### You need a platform operator login

There is none by default, and that's deliberate — see `PlatformDevDataSeeder` in `health`. Boot the
backend once with the seeder switched on:

```bash
java -Dspring.datasource.url=jdbc:mysql://127.0.0.1:3306/crm \
     -Dspring.datasource.username=root -Dspring.datasource.password= \
     -Dspring.profiles.active= -Dtwilio.enabled=false \
     -Dapp.platform.seed.enabled=true -Dapp.platform.seed.password=devadmin123 \
     -jar target/healthcare-0.0.1-SNAPSHOT.jar
```

That creates `devadmin` / `devadmin123` as a `PLATFORM_ADMIN`. It is created once and never
overwritten on later boots, so rotating the password later won't be undone by a restart.

## Configuration

`REACT_APP_API_BASE_URL` — public backend URL **including** the `/api` suffix. Same variable name
as `crm_frontend` and `patient_portal`. CRA bakes it in at *build* time, so changing it needs a
rebuild, not just a dev-server restart. Unset, the app uses a relative `/api` and leans on the
`proxy` field in `package.json` (dev server only).

## Architecture notes

- **Two roles.** `PLATFORM_ADMIN` may change clinic status and assign leads; `PLATFORM_SUPPORT` is
  read-only. The UI disables write controls for SUPPORT with a tooltip, but the real enforcement is
  server-side in `CurrentPlatformUserService.assertCanWrite()` — the client-side check is a
  courtesy, not a control.
- **Separate auth realm.** Platform tokens are signed with a different key than clinic and patient
  tokens, so they aren't interchangeable in either direction. `AuthContext` here is much thinner
  than `crm_frontend`'s: no account, no location, no `selectedLocationId`, because a company
  operator isn't scoped to a tenant. The whole class of bug that context guards against — a fetch
  firing before the location id is set and returning another clinic's data — can't arise here,
  since every endpoint is cross-tenant by design.
- **localStorage keys are `platform*`-prefixed**, deliberately different from `crm_frontend`'s
  plain `token`/`user`. If the two apps are ever served from one origin they share localStorage;
  identical keys would let a clinic login clobber this session, and worse, hand this portal a
  clinic token to send at `/api/platform/**`.
- **Design tokens** in `src/styles/js/styleConstants.js` are a *verbatim* copy of
  `crm_frontend`'s, so diffing the two files stays a meaningful drift check. Portal-only additions
  go in `src/styles/js/adminTokens.js`. There is no dark mode here, and none of `crm_frontend`'s
  broad-selector `global.css` background override — don't add global element selectors.
- **A null `Account.status` is a real state**, not a legacy quirk: self-serve signup never sets
  one. It renders as its own "No status set" chip rather than being coerced to `NEW`, and is
  counted on the clinics page, because "signed up and never triaged" is worth seeing.

## What this portal deliberately cannot do

- Reset or set a clinic user's password. Staff logins are listed read-only; a company-side password
  reset is not something that should fall out of an admin table.
- Read patient clinical data. The oversight API returns counts and aggregates, never a patient
  record, prescription, or consultation note.
- Reassign a lead *as a clinic*. Reassignment and unassignment exist here because triage is the
  company's job; a clinic can never do it (it could steal or dump another clinic's lead).
