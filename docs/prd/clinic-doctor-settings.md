# PRD — Clinic, Doctor & Account Settings

Status: **Draft for review** — no code changes yet.
Repos affected: `crm_frontend`, `health`, `dev_portal`, `crm_mobile`, `patient_portal`.

## 1. Problem

Every behaviour a clinic would reasonably want to control is currently a constant in the
source, and every account gets the same product. Four concrete gaps:

| Ask | Today |
|---|---|
| Appointment slot length (15/30 min) | Backend supports it per doctor per working day, but the frontend hardcodes `30` and sends it as a request parameter that overrides the doctor's setting |
| Show service prices on public pages | Prices and consultation fee always render on `/doctors/:id`; no flag anywhere |
| Account expiry linked to a trial period | Nothing exists — `Account` has only `status` (NEW / ON_HOLD / ACTIVE / INACTIVE), no dates |
| Feature enablement (hide Prescriptions / Invoices) | Nav is a static array; every route is unconditional |

### 1.1 What the code actually says

- `ServiceProviderWorkingDay.slotDurationMinutes` and `ServiceProviderSchedule.slotMinutes`
  already exist. `AppointmentService.getFreeSlots` (health, `AppointmentService.java:150,162`)
  uses the working-day value **only as a fallback** — the caller's `slotMinutes` query param
  wins whenever the working day has none.
- The frontend hardcodes the picker default in three places:
  `BookAppointmentModal.js:27`, `BookAppointmentPage.js:60`, `ManageAppointment.js:68`
  (`useState(30)`), and `AddServiceProvider.js:82,311,439` defaults new working days to 30.
- `EditDoctor.js` has **no working-days editing at all** — a doctor's slot duration can only
  be set when the doctor is created. `DoctorDetails.js:531` shows it read-only.
- `PublicDoctorProfile.js` renders `doctor.consultationFee` (`:458`, `:686`) and every
  `service.price` (`:868`–`:955`) unconditionally.
- `Sidebar.js` builds nav from static `primaryLinks` / `secondaryLinks` arrays;
  `crm_mobile/src/navigation/routes.ts` is the same shape. `PrivateRoute.js` checks only that
  a user object exists.
- Roles already exist (`ADMIN`, `DOCTOR`, `OPERATIONS`, `OWNER`, `SERVICE_PROVIDER` —
  see `AddUser.js:230-246`) but **`LoginResponse` does not return them** and nothing in the
  frontend gates on them. "Who may edit settings" therefore has no enforcement point yet.
- `dev_portal` is an **empty repository** — zero commits. The admin console is greenfield.
- `spring.jpa.hibernate.ddl-auto=update` in every profile: new columns are created
  automatically, but there is no migration tool, so defaults for existing rows need explicit
  backfill SQL.

### 1.2 Two bugs this feature will trip over — fix as part of it

1. **`AuthContext` loses `account` on reload.** `login()` builds `userData` with
   `accountId` / `accountName` but **not** `account`, and persists that to localStorage.
   On refresh the boot effect does `setAccount(userData.account || { name: userData.accountName })`,
   so `account` becomes a name-only stub. Any flag stored on `account` silently disappears
   after F5 — the menu would change shape between login and reload.
2. **localStorage is not a trust boundary.** Flags and expiry read from a persisted user
   object are editable by the user. Entitlements must be enforced server-side; the client copy
   is only for rendering.

Both push to the same fix: a single server-side bootstrap call (§6) on app start rather than
trusting persisted state.

## 2. Goals / non-goals

**Goals**

- One resolved source of truth for settings, served to all four clients (web CRM, mobile,
  patient portal, public profile pages).
- Platform operator (via `dev_portal`) controls what an account *may* use and until when.
- Clinic admin controls how the clinic *works*, within that.
- Disabling a feature removes it from the menu **and** blocks its routes and its API calls.
- Trial and expiry are dates on the account, defaulting to 30 days, editable per account.

**Non-goals (this phase)**

Subscription billing/payment collection; per-user granular permissions (roles are a separate
piece of work, only surfaced here); localisation; audit trail of who changed which setting
(phase 3); self-serve plan upgrade by the clinic.

## 3. Settings model

Four scopes, resolved server-side into one effective value:

```
Platform (dev_portal, super-admin)   entitlements, plan, trial, expiry, hard limits
        │  wins over everything — a clinic can never turn on what it isn't entitled to
        ▼
Account / clinic (clinic admin)      how this clinic works; may only narrow entitlements
        ▼
Location (clinic admin)              per-branch overrides
        ▼
Doctor / provider                    per-doctor overrides
        ▼
Doctor's working day                 most specific — already exists for slot duration
```

Resolution order for any operational value: **working day → provider → location → account →
system default**. First non-null wins. The server resolves this and exposes the resolved value;
clients never re-implement the ladder.

Rule for feature flags specifically: **effective = entitlement AND clinic toggle**. The platform
says what is available; the clinic may hide a module it does not use, but cannot reveal one it
has not been given.

## 4. Settings catalogue

### 4.1 Platform level — `dev_portal` only

| Setting | Key | Type | Default |
|---|---|---|---|
| Plan / tier | `planCode` | TRIAL / STANDARD / PRO | TRIAL |
| Trial length | `trialDays` | int | **30**, editable per account |
| Trial started | `trialStartedAt` | date | account `createDate` |
| Expires on | `expiresAt` | date | `trialStartedAt + trialDays`, editable |
| Grace period after expiry | `gracePeriodDays` | int | 7 |
| Feature entitlements | `features` | flag → bool | §4.5 |
| Limits | `maxLocations`, `maxUsers`, `maxProviders` | int, null = unlimited | null |
| Status | existing `Account.status` | NEW / ON_HOLD / ACTIVE / INACTIVE | unchanged |

### 4.2 Clinic / account level — clinic admin, Settings page

| Setting | Key | Type | Default |
|---|---|---|---|
| Default slot duration | `defaultSlotMinutes` | 10/15/20/30/45/60 | 30 |
| Let staff change slot length while booking | `allowSlotOverrideAtBooking` | bool | **false** |
| Show service prices on public pages | `showServicePricesPublicly` | bool | true |
| Show consultation fee on public pages | `showConsultationFeePublicly` | bool | true |
| Currency | `currencyCode` + symbol | ISO code | INR / ₹ |
| Timezone | `timezone` | IANA | Asia/Kolkata |
| How far ahead bookings are allowed | `bookingWindowDays` | int | 60 (matches today's `maxDays=60`) |
| Minimum notice before a booking | `minBookingNoticeMinutes` | int | 0 |
| Cancel / reschedule cutoff | `cancellationWindowHours` | int | 4 |
| Appointment reminders on | `remindersEnabled` | bool | true |
| Reminder lead time | `reminderLeadHours` | int | 24 (today: hardcoded day-before) |
| Auto-request review after visit | `autoReviewRequest` | bool | false |
| Show GST number on invoices | `showGstOnInvoice` | bool | true |
| Invoice number prefix | `invoicePrefix` | string | account initials |
| Default discount type | `defaultDiscountType` | NONE / FLAT / PERCENT | NONE |
| UPI ID | existing `Account.upiId` | string | unchanged |

Currency is listed because `₹` is hardcoded in `AddInvoice.js`, `ProcedureLineItemBuilder.js`
and `AllDoctor.js`; it can be deferred, but the settings row should exist so those literals
have somewhere to go.

### 4.3 Location level

| Setting | Key | Default |
|---|---|---|
| Slot duration override | `defaultSlotMinutes` | inherit account |
| Default working hours | `openTime` / `closeTime` | inherit account |
| Listed on public pages | `publiclyListed` | true |
| Show this branch's phone/email publicly | `showContactPublicly` | true |
| Timezone override | `timezone` | inherit account |

### 4.4 Doctor / provider level

| Setting | Key | Default | Note |
|---|---|---|---|
| Slot duration per working day | `slotDurationMinutes` | inherit | **exists** — needs an edit UI |
| Provider default slot duration | `defaultSlotMinutes` | inherit location | new |
| Consultation fee | `consultationFee` | — | exists |
| Show fee publicly | `showFeePublicly` | inherit account | new |
| Show services & prices publicly | `showServicesPublicly` | inherit account | new |
| Public profile enabled | `publicProfileEnabled` | true | gates `/doctors/:id` |
| Accepting new patients | `acceptingNewPatients` | true | |
| Buffer between appointments | `bufferMinutes` | 0 | |
| Max appointments per day | `maxAppointmentsPerDay` | null | |
| Booking window override | `bookingWindowDays` | inherit | |

### 4.5 Feature flags → what each one hides

Every flag hides the nav entry, blocks the routes, and is enforced on the API.

| Flag | Nav item | Routes | Also hides |
|---|---|---|---|
| `prescriptions` | Prescriptions | `/all-prescriptions`, `/add-prescription`, `/edit-prescription/:id` | "Complete & write prescription" on `ConsultationScreen`, prescription tab on patient detail, dashboard tile |
| `invoices` | Invoices | `/all-invoices`, `/add-invoice` | invoice actions on patient/appointment pages, patient-portal Invoices |
| `medicines` | Medicines | `/all-medicines`, `/add-medicine` | `MedicineBuilder` autocomplete source |
| `diagnosticTests` | Diagnostic Tests | `/all-diagnostics`, `/add-diagnostic` | `DiagnosticTestBuilder` |
| `consultations` | — | `/consultation/:checkInId` | check-in → consultation action |
| `reports` | Reports | `/reports` and all report pages | dashboard analytics |
| `reviews` | — | `/all-reviews`, `/review/:token` | review CTA on public profile |
| `patientDocuments` | — | — | `PatientDocumentsSection` |
| `publicDoctorProfiles` | — | `/doctors/:id` | public profile links |
| `patientPortal` | — | — | whole `patient_portal` login |
| `whatsappNotifications` | — | `/whatsapp-pin` | reminder sending, WhatsApp settings tab |
| `aiAssistant` | — | — | `ChatGPTChat` |
| `multiLocation` | — | `/add-account-location`, `/all-account-locations` | location switcher (single location = no switcher) |

**Behaviour when a feature is off:** the nav item is absent; a deep link redirects to
`/dashboard` with a toast ("Invoices isn't enabled for this clinic") rather than a 404 — a
bookmarked URL should degrade, not look broken; the API returns `403` with code
`FEATURE_DISABLED`.

## 5. Trial and expiry

Derived state, computed server-side:

| State | Condition | Behaviour |
|---|---|---|
| `TRIAL` | plan TRIAL, `now < expiresAt` | full access; banner showing days left from 7 days out |
| `ACTIVE` | paid plan, `now < expiresAt` | full access |
| `EXPIRING_SOON` | `expiresAt - now <= 7d` | persistent dismissible banner |
| `GRACE` | `expiresAt < now <= expiresAt + gracePeriodDays` | **read-only**: GETs allowed, writes return `402` / `ACCOUNT_EXPIRED`; invoices and prescriptions still downloadable |
| `EXPIRED` | past grace | login blocked with an explanatory screen and a contact route |
| `ON_HOLD` / `INACTIVE` | operator set | same as EXPIRED, different message |

Enforcement lives in a Spring filter/interceptor keyed on the authenticated user's account —
that is the only trustworthy point. The frontend reflects the state (banner, disabled submit
buttons, an `api.js` response interceptor mapping `402 ACCOUNT_EXPIRED` to a global notice) but
is never the gate.

Trial defaults: `trialDays = 30` as a platform-wide default, overridable per account in
`dev_portal`; `trialStartedAt = Account.createDate`; changing `trialDays` recomputes `expiresAt`
unless `expiresAt` was set manually.

## 6. API changes (`health`)

New:

- `GET /me/bootstrap` → `{ user, roles, account, features, limits, subscription, settings }`.
  Called once on app start. Replaces trusting the persisted `user` blob and fixes §1.2.
- `GET /accounts/{id}/settings` — resolved effective settings.
- `PUT /accounts/{id}/settings` — clinic admin; rejects platform-owned keys.
- `GET|PUT /account-locations/{id}/settings`
- `GET|PUT /service-providers/{id}/settings`
- Admin surface, `SUPER_ADMIN` only: `GET /admin/accounts`, `PATCH /admin/accounts/{id}/entitlements`,
  `PATCH /admin/accounts/{id}/subscription`, `GET /admin/accounts/{id}/usage`.

Changed:

- `LoginResponse` gains `roles`, `features`, `subscription` (and `AccountInfoDTO` gains the
  settings block).
- `GET /appointments/service-provider/{id}/free-slots`: `slotMinutes` becomes **optional**.
  When absent the server resolves it from the ladder. When present and
  `allowSlotOverrideAtBooking` is false, the server **ignores it** rather than trusting the
  client. Same for `next-available-slot`.
- Public endpoints (`/service-providers/{id}`, `/service-providers/{id}/services`, profile)
  must **omit price and fee fields server-side** when the flags are off. Hiding them only in
  the React page leaves them in the JSON.
- Feature check on every gated controller, so a disabled module cannot be driven by a
  hand-made request.

Data model: new `AccountSettings`, `AccountLocationSettings`, `ServiceProviderSettings`
(one-to-one, all columns nullable so null = inherit), plus `AccountSubscription`
(`planCode`, `trialDays`, `trialStartedAt`, `expiresAt`, `gracePeriodDays`) and
`AccountFeature` (`account_id`, `featureKey`, `enabledByPlatform`, `enabledByClinic`).
`ddl-auto=update` creates the tables; a seeding step must create default rows for existing
accounts (all features on, plan STANDARD, no expiry) so nothing regresses on deploy.

## 7. Frontend changes (`crm_frontend`)

| Area | Change |
|---|---|
| `context/AuthContext.js` | call `/me/bootstrap` on load; stop reconstructing `account` from localStorage; expose `features`, `settings`, `subscription`, `roles` |
| new `context/SettingsContext.js` | `useFeature(flag)`, `useSetting(key)`, `<FeatureGate flag>` |
| `components/Sidebar.js` | filter `primaryLinks` / `secondaryLinks` through `useFeature` |
| `App.js` | wrap gated routes in `<FeatureRoute flag>` → redirect + toast |
| `pages/Settings.js` | new tabs: **Clinic Preferences**, **Booking Rules**, **Public Profile**, **Plan & Features** (read-only view of entitlements and expiry) |
| `pages/EditDoctor.js` | add the missing working-days editor (day, hours, slot duration) + the new per-doctor toggles |
| `pages/AddServiceProvider.js` | default slot duration from settings instead of literal `30` |
| `BookAppointmentPage.js`, `BookAppointmentModal.js`, `ManageAppointment.js` | initialise `slotMinutes` from resolved settings; hide the picker entirely when `allowSlotOverrideAtBooking` is false |
| `pages/PublicDoctorProfile.js` | render fee/prices only when present in the response (server already stripped them) |
| `components/MainLayout.js` | trial / expiring / grace banner |
| `services/api.js` | response interceptor for `402 ACCOUNT_EXPIRED` and `403 FEATURE_DISABLED`; helpers `fetchSettings`, `updateSettings` |
| `pages/AllAccounts.js`, `AddAccount.js` | show plan and expiry columns (read-only here; edited in dev_portal) |

Consistency: new settings screens use `PageLayout` / `StandardCard` / `StandardButton` and
tokens from `styleConstants.js`, per `CLAUDE.md`. Any new decorative element gets checked in
both themes because of the global dark-mode `background-color` override.

## 8. Other repos

- **`dev_portal`** (empty today): super-admin console — account list with plan/expiry/status,
  an account detail page with feature toggles, trial length, expiry date, limits, and usage
  counts. Needs a `SUPER_ADMIN` role and a separate login. Recommend Vite + React + MUI reusing
  `crm_frontend`'s tokens, so the two look related without sharing a build.
- **`crm_mobile`**: `navigation/routes.ts` and `DrawerContent.tsx` filter on the same flags;
  same expiry read-only handling in `api/client.ts`.
- **`patient_portal`**: Invoices / Prescriptions sections respect the flags; blocked when the
  account is expired.

## 9. Decisions needed before implementation

| # | Question | Recommendation |
|---|---|---|
| 1 | Where does slot duration primarily live? | Location default, provider override, account fallback — clinics with two branches run different rhythms |
| 2 | May staff change slot length at booking time? | Off by default, opt-in per clinic. Today's picker silently overrides the doctor's own configuration |
| 3 | Expired = read-only or hard block? | Read-only for 7 days, then block login. Never lose access to existing records |
| 4 | Can a clinic hide a feature it *is* entitled to? | Yes — two layers, effective = entitlement AND clinic toggle |
| 5 | Price visibility granularity | Account default + per-doctor override now; per-service later |
| 6 | Trial starts from account creation or first login? | Creation date — already stored, no new bookkeeping |
| 7 | Do mobile and patient portal ship flags in v1? | Yes for the mobile drawer (otherwise menus disagree); patient portal in the same phase |
| 8 | Are roles in scope? | No — but `roles` must be added to the login response now, since "clinic admin only" needs something to check |

## 10. Phasing

| Phase | Contents |
|---|---|
| **P0** | Backend: settings entities, `/me/bootstrap`, `roles` + `features` in login, default-row seeding for existing accounts |
| **P1** | Menu + route gating in `crm_frontend`; Settings UI for clinic preferences; slot-duration resolution end-to-end; public price flags with server-side stripping; `EditDoctor` working-days editor |
| **P2** | Trial / expiry states, banners, read-only enforcement; `dev_portal` admin console |
| **P3** | `crm_mobile` + `patient_portal` parity; currency setting replacing the `₹` literals; audit log of setting changes |
