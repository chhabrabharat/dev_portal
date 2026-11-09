# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## What this is

`dev_portal` is the **company-side** admin console for EaseMyOPD — the surface the company that
sells the product uses to oversee every clinic on the platform. It is not a clinic-facing app and
not a superset of `crm_frontend`.

React (Create React App) + MUI. It talks only to `/api/platform/**` in the `health` backend, which
is not in this repo.

See [PRD.md](PRD.md) for scope and [ARCHITECTURE.md](ARCHITECTURE.md) for the design.

## Commands

```bash
npm start        # dev server, http://localhost:3002
npm run build    # production build -> build/
CI=true npm run build   # what CI runs; ESLint problems become build failures
```

There is no test script and no lint script — ESLint runs inline via `react-scripts`.

Needs `health` running on `:8080`. There is no default platform operator; see the end of
ARCHITECTURE.md for how to create one.

## The backend address is baked in at build time

`REACT_APP_API_BASE_URL` is read by Create React App when the bundle is **built**, not when it is
loaded. A deployment therefore inherits whatever the build environment had, and changing it needs a
redeploy rather than a restart.

**Local defaults live in `.env.development`, never in `.env`.** CRA loads `.env` for builds as well
as for `npm start`; `.env.development` is only ever read by the dev server. That distinction was
learned the expensive way: a committed `.env` held
`REACT_APP_API_BASE_URL=http://localhost:8080/api`, Vercel's Production environment set the
variable and was fine, and Vercel's **Preview** environment did not - so every preview deployment
of this console shipped calling the reviewer's own machine. On the developer's laptop the backend
was there and it worked. To anyone else the same build produced network errors and 500s that read
exactly like a broken backend, and an afternoon went into looking at the backend.

`components/ApiBaseWarning.js` says so on screen now: a loopback API address on a page that is not
itself loopback is always a build mistake and never a choice. Two things about it are load-bearing:

- **It renders above the router, not inside `AppShell`.** That was the first attempt and it never
  appeared - with a wrong API address the session check fails, `RequireOperator` redirects to
  `/login`, and a banner behind the login wall is hidden by exactly the failure it exists to
  explain. What an operator saw was a sign-in page that silently did nothing.
- **The check is narrow on purpose.** Running the dev server against a local backend is the normal
  case and stays silent; verified in a browser both ways, on `localhost` (silent) and on
  `devportal.localhost` (banner plus a console error).

An unset variable falls back to a relative `/api`, which is correct for a same-origin deployment
and wrong everywhere else - it reaches the static site and every request 404s into `index.html`.
That case is deliberately **not** warned about, because it cannot be told apart from the legitimate
same-origin one. Set the variable in every deployed environment, Preview included.

## Hard rules

**Never weaken the realm boundary.** This is the only app in the product that reads across
tenants. Specifically:

- Never send a platform token to a non-platform endpoint, or a clinic token to `/api/platform/**`.
- Never rename the `platform*` localStorage keys to match `crm_frontend`'s. If both apps are ever
  served from one origin they share storage; identical keys would let a clinic login clobber this
  session and hand this console a clinic token.
- Never treat the client-side role check as a control. `PLATFORM_SUPPORT` write-blocking is
  enforced server-side by `CurrentPlatformUserService.assertCanWrite()`; the UI disabling is a
  courtesy so operators don't click something that will 403.

**Three roles, two write gates.** `PLATFORM_ADMIN` does everything. `PLATFORM_SUPPORT` is
read-only everywhere. `PLATFORM_SALES` sees only the Leads and Pipeline tabs and may write there.
The context exposes `canWrite` (ADMIN - clinic status, plans, features, team) and `canWorkLeads`
(ADMIN or SALES - pipeline and enquiry inbox), mirroring `assertCanWrite()` /
`assertCanWorkLeads()` on the server. `utils/roles.js` is the one place that says which routes a
role may open; `AppShell` (nav), `App` (`RequireOperator`) and `LoginPage` (landing) all read it.
The route guard matters more than it looks: `services/api.js` logs the operator out on any 403,
so a sales user who reached an admin page would be signed out rather than shown an error. Server
side, `SecurityConfig` accepts `PLATFORM_SALES` on `/api/platform/{auth,pipeline,leads}/**` only.
Operator logins are managed on the Team page (`/team`, admin-only) via `/api/platform/users`;
there is no delete, only deactivate.

**Don't add tenant-scoping state.** No `selectedLocationId`, no account context. A company
operator isn't scoped to a clinic, and adding that state would imitate a guard `crm_frontend`
needs for reasons that don't exist here.

**Don't add patient data.** If a screen would need a patient record, prescription, consultation
note, or document, that is out of scope by design — see PRD non-goals. Aggregates only.

**A null account status is real data.** Self-serve signup never sets one. Render it as its own
state; never coerce it to `NEW` and never filter those accounts out.

**Keep `styleConstants.js` a verbatim copy** of `crm_frontend`'s. Portal-only tokens go in
`adminTokens.js`. The point is that a diff between the two files means drift.

**Don't add global element selectors to `index.css`.** `crm_frontend` has a broad-selector dark
mode background override that has caused real bugs. This app has no dark mode and no such rule.

## Working on the `health` backend for this portal

**Work for this portal must not change any behaviour that `crm_frontend`, `crm_mobile` or
`patient_portal` depend on.**

Concretely, on the `health` backend:

### Allowed

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
  5. **Sales pipeline** — the `sales_stage` / `sales_lead` / `sales_lead_history` /
     `sales_cold_lead` tables and `PlatformUser.pipelineReminder`, via `/platform/pipeline/**`.
     These are platform-side tables with no account link; nothing clinic-facing reads them.
  6. **Platform operators** — `platform_user` rows (create, role, active, password) via
     `/platform/users/**`, ADMIN only. Never clinic users.
- Add **new** read-only platform endpoints, new platform-side columns/tables, and new
  `PlatformXxx` controllers/services/DTOs under the platform package.

### Not allowed

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

### If a change genuinely needs something outside the allowed list

**Stop and flag it** before writing code. State:

- which file / endpoint / column outside the allowed surface you need to change,
- which of `crm_frontend`, `crm_mobile`, `patient_portal` call it (grep their `services/api.js`
  / `api/client.ts`),
- the backward-compatible alternative (new platform endpoint, new nullable column, additive DTO
  field) if one exists.

Default to the additive alternative. Only proceed with a shared-code change after the user
confirms, and keep it additive (new optional field, new endpoint) — never a rename, removal, or
semantic change of an existing field.

### Backend conventions when adding to the platform realm

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

## Session setup and permissions

- Tool permissions are pre-granted in `.claude/settings.json` (`permissions.allow`): file
  read/edit/write in this repo, `npm`/`npx`/`node`, non-destructive `git` incl. push, Maven/Java
  for running `health`, `curl` to localhost, and web fetches to GitHub / MUI / Spring docs.
  Force-push, hard reset, and reading `.env` are denied. Do not ask for these; just proceed.
- On a new session, clone or attach both repos without asking: `chhabrabharat/dev_portal`
  (this repo; `main` is the integration branch) and the `health` backend
  (`~/Desktop/DocProject/health` on the user's Mac). Commit and push to the current branch
  when a task is done — the user expects it (a stop hook checks for uncommitted work).
- If a sibling repo (`crm_frontend`, `crm_mobile`, `patient_portal`) is needed, it is
  **read-only** for grep/reference. Never commit to it from a dev_portal task.
- Anything not covered by `settings.json` that needs approval (a new domain, a destructive
  command) is a signal to pause and ask, not to find a workaround.

## Before you finish a task

- [ ] Every backend diff is under the platform package or an additive, nullable change — grep
      the diff for files outside it and justify each one.
- [ ] No endpoint outside `/api/platform/**` changed shape.
- [ ] No write to clinic-owned settings/toggles, passwords, or clinical data.
- [ ] `PLATFORM_SUPPORT` cannot perform the new write (server-side check present).
- [ ] If a shared file had to change, the summary lists it explicitly with the reason and the
      clients affected.

## Pipeline

`pages/PipelinePage.js` is the company's sales board - clinics being **sold to** - backed by
`/api/platform/pipeline/**` (`PlatformPipelineController` / `PlatformPipelineService`). It is a
different thing from `pages/LeadsPage.js`, which is the contact-us inbox of patient enquiries
handed to clinics; both happen to be called "leads", which is why the nav says "Pipeline".

Things that are deliberate:

- **Stages are rows, not an enum.** `PlatformPipelineService.seedDefaultStages()` creates the
  nine defaults once on an empty table; rename or reorder in the database and the board follows.
  The rules key on `SalesStage.kind` (OPEN / ONBOARDING / LIVE / ON_HOLD / LOST) and
  `SalesStage.milestone`, never on a stage's name, so a rename cannot break them.
- **Retired stages are switched off, not deleted.** `RETIRED_STAGES` in the service names a
  stage and where its leads go (Negotiation → Demo Done, Training → Onboarding); on boot the
  leads are moved with a `system` history line, stage-since untouched, and the row set inactive.
  To retire another stage, add it to that map. History rows name stages by name, so a retired
  one still reads correctly.
- **On Hold and Lost are a separate tab**, not columns on the working board - the board is seven
  columns so a laptop shows all of them at once (columns share the row from `md` up, fixed-width
  swipes on a phone). The next-stage arrow is computed from *all* active stages, not the visible
  ones. Leads reach On Hold / Lost through the Stage dropdown or the Not-Interested rule.
- **"Not Interested" means Lost**, applied server-side in `patch()`. Setting the flag back does
  not leave Lost. The dialog warns before saving.
- **Dates are the server's Asia/Kolkata `today`** from the board payload, compared as ISO
  strings in `utils/pipeline.js`. The browser's clock is never consulted, so the overdue colouring
  on screen and the 08:00 IST reminder always agree.
- **The board polls `GET /pipeline/board` every 20s** (paused when the tab is hidden) - the app
  has no websocket and a handful of operators does not justify building one. Writes merge the
  returned row in immediately and trigger a silent refetch.
- **Edits save a PATCH of only the changed keys** (`LeadDialog` diffs the form against the
  loaded detail), so two operators editing different fields of one lead don't clobber each other.
  Same absent-vs-null contract as the subscription PATCH.
- **Reminders are email only**, to `PlatformUser.email`, because it is the only channel that can
  address a platform operator (push subscriptions hang off clinic users). A lead with no owner
  goes to every active PLATFORM_SALES user, or to every PLATFORM_ADMIN when there is no sales team. Nothing is sent when nothing is due, or when SMTP is not
  configured - the switch on the page says which. `PlatformPipelineReminderService` runs under
  `SchedulingConfig`, so `APP_SCHEDULING_ENABLED=false` silences it with everything else.
- **A deleted lead that came from the cold pool returns to the pool** - the pool row is kept and
  only `SalesLead.coldLead` (unique) marks it as taken. That is also what makes "add once" hold.
- **The import is re-runnable**: `scripts/import_leads.py` maps the tracker sheet onto
  `POST /pipeline/import`, which matches warm rows by `externalKey` and cold rows by `sourceId`,
  and never moves a lead an operator has since worked.

Backend rules are covered by `PlatformPipelineServiceTest` (H2); keep it passing.

## Wide tables

The clinics and usage tables set an explicit `minWidth` and let their container scroll
horizontally. Without it, 8 columns compress into the container and clinic names wrap over three
or four lines. If you add a column, check the table at ~960px before considering it done — and
confirm the page *body* still doesn't scroll sideways, only the table container.

## Traffic

`pages/TrafficPage.js` aggregates `PageView` across every clinic, from
`GET /api/platform/metrics/traffic`. Three things about it are deliberate and cost nothing to
undo by accident:

**The visitor column counts visits, not people**, and the page says so in the card hint and in a
tooltip on both places the number appears. The hash behind it is salted per clinic *and* per day
on purpose, so somebody who came back on Tuesday counts again and somebody who looked at two
clinics counts twice. There is no way to collapse those without building the tracking the counter
was designed not to do, so the number is labelled for what it measures rather than corrected.
`clinicsWithTraffic` is the one figure here that means exactly what it says.

**The marketing site is not in it.** A view is recorded in exactly one place - when a public
request resolves a clinic by its slug (`AccountLocationController`) - so easemyopd.com's own pages
have never been counted, and `PageView.account_location_id` is `NOT NULL`, so counting them would
need a schema change rather than a call site. The page states this under the title, because a zero
would otherwise read as "nobody came to the site".

**A branch deleted since its views keeps its row**, named `Branch #id (deleted)` and not clickable.
Dropping it would leave the per-clinic column not adding up to the total above it, which reads as a
bug rather than as history.

The info strip about `ANALYTICS_VISITOR_SALT` is not an error: counting works without it, because
`PageViewService` falls back to a random per-boot salt. But that salt changes on every restart, so
one person counts again after each one - which inflates the visitor column and nothing else. An
operator about to quote that column is exactly who needs to be told.
