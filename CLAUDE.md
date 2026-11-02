# CLAUDE.md — dev_portal

Working instructions for anyone (human or AI) changing this repo **or** the `health` backend on
its behalf. Read `README.md` first for what the portal is; this file is about how to change it
safely.

## 1. What this repo is

`dev_portal` is the **company-side operator console** for the clinic CRM. It is one of five
sibling repos that all talk to the same `health` API (Java 17 + Spring Boot + MySQL):

| Repo | Audience | Port |
|---|---|---|
| `health` | the API | 8080 |
| `crm_frontend` | clinic staff (React/CRA + MUI) | 3000 |
| `patient_portal` | patients (Vite + React) | 3001 |
| **`dev_portal`** | **company operators (React/CRA + MUI)** | **3002** |
| `crm_mobile` | clinic staff on phones (Expo) | — |

The portal talks **only** to `/api/platform/**` on `health`, authenticated in its own realm
(`PLATFORM_ADMIN` = read/write, `PLATFORM_SUPPORT` = read-only). It is never a superset of
`crm_frontend` and never a clinic-facing app.

## 2. The one rule that overrides everything else

**Work for this portal must not change any behaviour that `crm_frontend`, `crm_mobile` or
`patient_portal` depend on.**

Concretely, on the `health` backend:

### 2.1 Allowed

- **Read** anything from the database through the platform realm — accounts, locations, users,
  doctors, patients (counts/aggregates only), appointments, leads, usage metrics, subscriptions,
  entitlements, clinic toggles, feature keys.
- **Write** only these, and only via `/api/platform/**` endpoints:
  1. **Account settings / lifecycle** — `Account.status` (`NEW` / `ACTIVE` / `ON_HOLD` /
     `INACTIVE`) and other account-level fields the portal owns.
  2. **Plan / subscription** — `AccountSubscription`: `planCode`, `trialDays`,
     `trialStartedAt`, `expiresAt`, `gracePeriodDays`, and limits `maxLocations` /
     `maxUsers` / `maxProviders`.
  3. **Feature enable / disable** — `AccountFeature.enabledByPlatform` for a feature key
     (`prescriptions`, `invoices`, `medicines`, `diagnosticTests`, `consultations`, `reports`,
     `reviews`, `patientDocuments`, `publicDoctorProfiles`, `patientPortal`,
     `whatsappNotifications`, `aiAssistant`, `multiLocation`).
  4. **Lead assignment** — `PUT /platform/leads/{id}/assignment` (already exists; triage is the
     company's job).
- Add **new** read-only platform endpoints, new platform-side columns/tables, and new
  `PlatformXxx` controllers/services/DTOs under the platform package.

### 2.2 Not allowed

- Changing, renaming, or removing any non-platform controller, service, DTO, entity field,
  validation rule, or response shape that `crm_frontend` / `crm_mobile` / `patient_portal` call.
  This includes `/auth/**`, `/me/bootstrap`, `/accounts/**`, `/account-locations/**`,
  `/service-providers/**`, `/appointments/**`, `/patients/**`, `/invoices/**`,
  `/prescriptions/**`, and everything else outside `/api/platform/**`.
- Writing `AccountFeature.enabledByClinic` or any `AccountSettings` /
  `AccountLocationSettings` / `ServiceProviderSettings` row. Those belong to the clinic admin
  (`crm_frontend`). The portal may **display** `clinic-toggles` so "not sold" is distinguishable
  from "clinic hid it", but never flips them.
- Resetting or setting any clinic user's password, or creating clinic users.
- Returning patient clinical data (records, prescriptions, consultation notes) from any platform
  endpoint — counts and aggregates only.
- Touching the clinic/patient JWT realm, `AuthContext`-related login responses, or
  `CurrentUserService`. Platform auth lives in `PlatformJwtFilter` /
  `CurrentPlatformUserService` and stays separate.
- Changing `spring.jpa.hibernate.ddl-auto`, shared `application*.properties` defaults, or
  seeders other than `PlatformDevDataSeeder`.
- Editing `src/styles/js/styleConstants.js` here (it is a verbatim copy of `crm_frontend`'s and
  the diff is the drift check). Portal-only tokens go in `adminTokens.js`.

### 2.3 If a change genuinely needs something outside the allowed list

**Stop and flag it** before writing code. State:

- which file / endpoint / column outside the allowed surface you need to change,
- which of `crm_frontend`, `crm_mobile`, `patient_portal` call it (grep their `services/api.js`
  / `api/client.ts`),
- the backward-compatible alternative (new platform endpoint, new nullable column, additive DTO
  field) if one exists.

Default to the additive alternative. Only proceed with a shared-code change after the user
confirms, and keep it additive (new optional field, new endpoint) — never a rename, removal, or
semantic change of an existing field.

## 3. Backend conventions when adding to the platform realm

- Package: put new code next to the existing `Platform*` classes (`PlatformAccountController`,
  `PlatformLeadController`, `PlatformMetricsController`, `CurrentPlatformUserService`,
  `PlatformJwtFilter`, `PlatformDevDataSeeder`). Follow their naming.
- Every write goes through `CurrentPlatformUserService.assertCanWrite()` so
  `PLATFORM_SUPPORT` stays read-only. The UI disabling a button is a courtesy, not a control.
- New entities/columns must be **nullable with a safe default** so `ddl-auto=update` can create
  them and existing rows don't regress. If existing rows need a value, write the backfill SQL
  and say so in the PR/summary — there is no migration tool.
- Null `Account.status` is a real state ("signed up, never triaged"); do not coerce it to `NEW`.
- Partial updates (`PATCH …/subscription`) change only keys present in the payload; an explicit
  `null` clears a value. Do not change that contract.
- Feature enforcement for clinics stays where it is (`403 FEATURE_DISABLED`,
  `402 ACCOUNT_EXPIRED`). The portal toggles entitlements; it does not reimplement gating.

## 4. Frontend conventions (this repo)

- CRA + MUI v5, React 18, react-router v6, axios. No new state libraries.
- All API calls live in `src/services/api.js`, prefixed `/platform/…`. Add new calls there; pages
  don't call axios directly.
- localStorage keys are `platformToken` / `platformOperator` — never `token` / `user`, and never
  share keys with `crm_frontend`.
- A 401/403 on any non-login platform route clears the session and redirects to `/login`; keep
  that interceptor intact.
- Write controls (status change, subscription edit, entitlement toggle, lead assignment) must be
  disabled with a tooltip for `PLATFORM_SUPPORT`, using the operator role from
  `PlatformAuthContext`.
- Tokens: `styleConstants.js` (do not edit), `adminTokens.js` (portal additions),
  `muiTheme.js`. No dark mode, no global element selectors in CSS.
- Pages: `AccountsPage`, `AccountDetailPage` (with `SubscriptionPanel` for plan/features),
  `UsagePage`, `LeadsPage`, `LoginPage`. New screens follow the same `AppShell` layout.
- `REACT_APP_API_BASE_URL` includes `/api`; it is baked at build time. Unset → `/api` + the
  `proxy` field in `package.json`.

## 5. Running locally

1. Start `health` on `:8080` with explicit datasource overrides (its defaults point at a
   non-local DB — see its `CLAUDE.md`).
2. First boot only: `-Dapp.platform.seed.enabled=true -Dapp.platform.seed.password=…` to create
   the `devadmin` `PLATFORM_ADMIN` operator (created once, never overwritten).
3. `npm install && npm start` → http://localhost:3002.

## 6. Before you finish a task

- [ ] Every backend diff is under the platform package or an additive, nullable change — grep
      the diff for files outside it and justify each one.
- [ ] No endpoint outside `/api/platform/**` changed shape.
- [ ] No write to clinic-owned settings/toggles, passwords, or clinical data.
- [ ] `PLATFORM_SUPPORT` cannot perform the new write (server-side check present).
- [ ] If a shared file had to change, the summary lists it explicitly with the reason and the
      clients affected.

## 7. Specs

- `docs/prd/clinic-doctor-settings.md` — settings model, feature flags, subscription/expiry,
  which keys are platform-owned (§4.1) vs clinic-owned (§4.2–4.4).
- `docs/prd/google-business-profile.md` — GBP integration; the portal shows per-account
  connection status / sync / quota (read-only here).
