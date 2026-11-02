# Google Business Profile & Local Visibility

**Status:** draft for review — nothing in here is built yet
**Written:** 2026-09-04
**Repos in scope:** `health` (backend), `crm_frontend` (clinic UI + public pages), `dev_portal` (platform operator)
**Not in scope:** `crm_mobile`, `patient_portal` — neither has a role in this feature

---

## 1. The ask, and what it can honestly be

Clinic owners are asking us to "manage our Google listing and rank us higher".

**We will not sell ranking.** Google's local ranking is not purchasable, not contractable and not
predictable, and a "rank higher, guaranteed" claim made to healthcare businesses is an advertising
and consumer-protection liability before it is a technical one. Any clinic that does not move up
would have a straightforward complaint against us.

**What we can sell is the work, and the evidence of it.** Everything below is either (a) a task that
credibly correlates with local visibility, or (b) reporting that shows the clinic what changed. The
product promise is *"we do the things that make you findable, and we show you the numbers"* — never
a position on a results page.

This distinction drives the copy, the plan naming and the dashboard framing throughout, and §12
records the specific wording constraints.

---

## 2. What already exists

More of this is built than it appears. Audited 2026-09-04 against `health` `main` @ `01d24b6` and
`crm_frontend` `master` @ `a9b77f94`.

| Capability | Where | State |
| --- | --- | --- |
| `googlePlaceId` per location | `model/AccountLocation.java:22` | stored, editable via `AccountLocationRequest` |
| Full NAP per location | `AccountLocation` — name, address, city, state, country, postalCode, phone, email, latitude, longitude, formattedAddress | stored |
| "Leave a Google review" deep link | `util/GoogleReviewUtil.java` | working. Plain public `search.google.com/local/writereview?placeid=` URL — **no API, no key, no OAuth** |
| Review request after a visit | `service/ReviewService.java` — `createPendingReview` → token → `/review/:token` → `submit` | working |
| Review link in outbound messages | `WhatsappNotificationService:78`, `EmailNotificationService:33` | working |
| "Ask for a review after a completed visit" | `AccountSettings.autoReviewRequest`, Clinic Preferences UI | shipped |
| First-party review store + stats | `model/Review.java`, `ReviewStatsDto` (average, total) | working |
| `reviews` feature flag | `FeatureKey.REVIEWS` | shipped |
| Public clinic/doctor pages | `/:slug`, `/:slug/book`, `/doctors/:id` | shipped |
| `Physician` / `MedicalClinic` JSON-LD incl. `AggregateRating` | `PublicDoctorProfile.js:385`, `PublicClinicProfile.js:268` | shipped |
| Per-feature entitlement + plan tiers | `FeatureKey` (13 keys), `AccountFeature.isEffectivelyEnabled()`, `AccountSubscription.PlanCode` = TRIAL/STANDARD/PRO | shipped |
| Scheduled background work | `@EnableScheduling` in `DemoApplication`, `AppointmentReminderService`, `AppointmentExpiryScheduler` | shipped — sync jobs fit this pattern |

### Gaps that matter

| Gap | Consequence |
| --- | --- |
| No `sitemap.xml`; no per-slug canonical URLs | Public clinic pages are not reliably discoverable or de-duplicated |
| Public pages are client-rendered (CRA) — JSON-LD and meta tags injected by JS after load | See §11. This is the single largest technical constraint on the whole feature |
| No location-level opening hours | Only per-doctor `ServiceProviderWorkingDay`. Hours sync (§7.6) needs a source of truth |
| No refresh-token storage anywhere in `health` | Per-clinic OAuth is new ground — §10 |
| No encryption helper in the codebase (no `Cipher`, Jasypt, or equivalent) | Token-at-rest encryption must be built, not reused |
| No review reminder cadence | One ask, then silence. Review *velocity* is the lever we are least exploiting |

---

## 3. Google's API surface, verified

Checked against Google's live developer documentation on **2026-09-04**. Recorded here with dates
because this API family has been reorganised repeatedly and a stale assumption would misprice the
whole Tier 2 scope.

### Currently supported

| API | Version | Gives us |
| --- | --- | --- |
| Google My Business API | v4.9 | **Reviews** (`accounts.locations.reviews.list`, `.get`, `.updateReply`, `.deleteReply`, `accounts.locations.batchGetReviews`) and **Local Posts** (`localPosts.create`, `.list`, `.get`) |
| My Business Business Information API | v1 | Read/write core listing info — hours, categories, attributes, address |
| My Business Account Management API | v1.1 | Accounts, admins, location listing |
| Business Profile Performance API | v1 | `locations.fetchMultiDailyMetricsTimeSeries` — impressions, conversations, direction requests, website clicks, call clicks, across Search and Maps, desktop and mobile |
| My Business Notifications API | v1.2 | Pub/Sub push on profile changes — the correct way to learn about a new review |
| My Business Verifications API | v1 | Verification state and flow |
| My Business Place Actions API | v1 | Place action links (e.g. "Book an appointment") |
| My Business Lodging API | v1.2 | Not relevant to clinics |

OAuth scope: `https://www.googleapis.com/auth/business.manage`

### Retired — do not design around these

| Thing | Support ended | Discontinued |
| --- | --- | --- |
| **My Business Q&A API** | 2025-09-15 | 2025-11-03 |
| `getHealthProviderAttributes` / `updateHealthProviderAttributes` | 2024-06-17 | 2024-07-01 |
| `InsuranceNetworks` API | 2024-06-17 | 2024-07-01 |
| `localPosts.reportInsights` | 2022-11-21 | 2023-02-20 |
| `reportInsights` (old Performance) | 2022-11-21 | 2023-03-30 |

Two of these are worth calling out. **Q&A is gone**, so "manage your Google Q&A from the CRM"
cannot be built at all — drop it from any sales conversation. And the two
`HealthProviderAttributes` methods being retired means the healthcare-specific listing fields
(insurance networks in particular) are no longer writable by API, which is exactly the category a
clinic product would have wanted.

### Getting access

Basic API access is an application, not a signup:

1. A Google Cloud project, under an Organization account.
2. Applicant must **manage a Business Profile that has been verified and active for 60+ days**.
3. That profile must have **a website** and be complete and current.
4. Submit the GBP API contact form selecting "Application for Basic API Access", from an email
   listed as owner/manager on the profile.
5. Approval is confirmed by quota: **0 QPM = not approved, 300 QPM = approved**. Google does not
   publish a turnaround time.

**This gates the entire Tier 2 scope on an external approval with no committed date.** §14 sequences
around it rather than betting on it.

---

## 4. Hard constraints that shape the design

These come from Google's API policies and usage limits, and each one kills a design somebody would
otherwise reach for.

| Constraint | What it forbids | Design consequence |
| --- | --- | --- |
| **Cache ≤ 30 calendar days** | Keeping Google-sourced content longer | We cannot build a permanent local mirror of Google reviews. §8 splits storage into *our* reviews (ours forever) and *Google's* (a 30-day expiring cache) |
| **Cached content "cannot be manipulated or aggregated in any way"** | Computing our own metrics over Google data | No "your Google rating over time" chart built from cached reviews. Trend reporting must come from the Performance API's own time series, or from our first-party reviews only |
| **No automated or triggered review replies without the user's prior specific and express consent** | AI auto-replying to Google reviews | Reply drafting is allowed; *sending* requires a human press per reply, or a recorded explicit opt-in. Default is draft-and-approve — §7.4 |
| **Third parties replying to reviews must obtain authorisation first** | Acting on a listing without a recorded grant | The OAuth grant plus an in-product acceptance is the authorisation record. Store who granted it and when |
| **Edits: 10 per minute per profile — non-negotiable** | Bulk-pushing changes | Write operations queue per location with a rate limiter. Never fan out edits across a clinic's locations in a tight loop |
| **300 QPM baseline; Update Location 10,000 QPD** | High-frequency polling | Use the Notifications API (Pub/Sub) for review arrival; poll only as a reconciliation backstop |
| **Quota increases denied below 50% utilisation or on irregular traffic** | Requesting headroom early | Spread sync jobs; do not batch everything at 02:00 |
| **No replicating the Business Profile UI** | Cloning Google's listing editor | Our editor must be our own design language, not a Google look-alike |
| **Attribution must be displayed as provided, unaltered** | Stripping Google branding from surfaced content | Google-sourced reviews render with required attribution |

### And the one that constrains the product, not the code

Google's Business Profile content policy prohibits **discouraging or prohibiting negative reviews,
and selectively soliciting positive reviews**. Merchants also may not pressure users to review while
on the premises, request specific review content, or offer incentives. Enforcement for Fake
Engagement is real and lands on *the clinic*: Google may block the profile from receiving new
reviews, unpublish existing reviews or ratings, and display a warning to consumers.

**So we will not build review gating** — no "only send 4–5★ to Google", no sentiment pre-screen that
decides who sees the Google link. This is the most-requested feature in this category and we are
declining it deliberately. What we build instead (§7.2) asks *everyone*, and uses the response to
route our *follow-up*, which is permitted and is where the operational value actually is.

---

## 5. Scope, in three tiers

Tiers are defined by **what gates them**, not by nice-to-have ordering. Tier 1 ships without asking
Google for anything.

| Tier | Gate | Contents |
| --- | --- | --- |
| **T1 — Visibility foundations** | Nothing. Ship immediately | Review velocity engine, listing-readiness checklist, NAP consistency, sitemap + canonicals, prerendered public pages |
| **T2 — Listing read** | Approved API access + per-clinic OAuth | Live listing health, Performance metrics dashboard, Google reviews inbox (read) |
| **T3 — Listing write** | T2 plus explicit per-action consent | Reply to Google reviews, hours sync, posts, photo upload, booking place-action link |

---

## 6. Tier 1 — no Google approval required

### 6.1 Review velocity engine

Volume, recency and steadiness of reviews are the strongest lever we can pull without touching an
API, and the flow is 70% built. What's missing:

- **Reminder cadence.** One nudge if no review N days after the ask (default 3, clinic-configurable,
  hard cap of one reminder). Reuses `AppointmentReminderService`'s scheduling pattern.
- **Per-doctor Place IDs.** `googlePlaceId` is location-only today. A multi-doctor clinic where each
  doctor has their own practitioner listing cannot route correctly. Add an optional
  `googlePlaceId` on `ServiceProviderSettings`, resolved by the existing ladder
  (doctor → location), so the fallback behaviour is the one the codebase already uses everywhere.
- **Funnel reporting.** `asked → delivered → opened → submitted-to-us → clicked-through-to-Google`.
  We can measure every step except what happens on Google, and we must not claim otherwise: the
  final step is *"we sent them to Google"*, not *"they reviewed you"*.
- **Ask-everyone enforcement.** The Google link is present for every recipient regardless of the
  rating they gave us. Enforced in `ReviewService`, not just in the UI, with a test.

### 6.2 Response routing (the compliant alternative to gating)

Everyone gets asked and everyone gets the Google link. What differs is *our* follow-up:

- 4–5★ → thank-you, Google link featured
- 1–3★ → thank-you, Google link still present, **plus** the response is flagged to the clinic's
  inbox as service recovery with the appointment and doctor attached

This is the operationally useful half of gating without the policy violation: the clinic finds out
fast that someone was unhappy, and can act.

### 6.3 Listing-readiness checklist

A scored checklist built entirely from data we already hold, mirroring what a complete Google
listing wants: description, categories, photos, services with prices, hours, phone, website,
address, appointment link. Each row deep-links to the screen that fixes it. Pre-API, this is
self-reported ("have you added photos to Google?"); once T2 lands, the same rows read live from the
listing and the self-reported answers are dropped.

### 6.4 NAP consistency

Name / address / phone mismatches between what a clinic has in EaseMyOPD and what's on their Google
listing are a known local-SEO problem. Pre-API we can only compare EaseMyOPD's own records for
internal inconsistency (clinic-level vs location-level address and phone) and warn. Post-API we diff
against the live listing, which is the version that matters.

### 6.5 Sitemap and canonicals

- `sitemap.xml` generated from published clinic slugs and public doctor profiles, respecting
  `publicProfileEnabled` — an unpublished profile must never appear.
- One canonical URL per clinic. `/:slug` and `/doctors/:id` can currently both describe the same
  practice; pick the slug as canonical and point the other at it.
- `robots.txt` already disallows the authenticated app. Extend it as new private routes appear, and
  add the sitemap reference.

### 6.6 Prerendering the public pages

See §11 — this is a substantial piece of work and is called out separately because it is the
foundation the rest of the SEO story rests on.

---

## 7. Tier 2 and 3 — with API access

### 7.1 Connect flow

Clinic admin presses **Connect Google Business Profile** in Settings → a standard OAuth consent for
`business.manage` → we list the accounts and locations they administer → they map each EaseMyOPD
location to one Google location. Mapping is explicit and reversible; we never guess.

Recorded at grant time: which user granted it, when, which scopes, which locations. That record is
our authorisation evidence for §4's "third parties must obtain authorisation first".

**Disconnect** revokes our token with Google, deletes the stored refresh token, and purges the
30-day cache for that location.

### 7.2 Listing health (read)

Replaces the self-reported checklist with live data from the Business Information API: hours,
categories, attributes, photo count, verification state. Plus the verification state itself, which
is the single most common reason a listing underperforms and something clinics frequently don't
realise is unresolved.

### 7.3 Performance dashboard (read)

`locations.fetchMultiDailyMetricsTimeSeries` gives impressions, conversations, direction requests,
website clicks and call clicks, split by Search/Maps and desktop/mobile. This is the honest answer
to "are we ranking better" — it shows demand and action, sourced from Google itself, with no
aggregation of our own layered on top (per §4).

Pair it with our own booking numbers for the one join that is genuinely ours: *Google profile
interactions → bookings taken*.

### 7.4 Google reviews inbox and replies (write)

Read Google reviews into a 30-day expiring cache, surfaced alongside our first-party reviews in one
inbox. Replies are **draft-and-approve by default**: we can offer a suggested reply (the codebase
already has LLM providers wired — `GeminiLlmProvider`, plus Anthropic and OpenAI keys in config), but
sending requires a human press per reply. Automatic sending is available only behind a recorded,
explicit per-clinic opt-in, because §4 requires "prior specific and express consent" — and even then
I'd recommend against offering it.

New reviews arrive via the Notifications API over Pub/Sub, with a daily reconciliation poll as a
backstop.

### 7.5 Posts (write)

Compose and publish Local Posts (`localPosts.create`) — offers, new services, health-awareness days.
Scheduling and a per-location queue that respects the 10-edits-per-minute-per-profile limit.

Note there is **no post-level insight data any more** (`localPosts.reportInsights` was discontinued
in 2023), so post performance can only be inferred from the location-level Performance time series.
Don't build a per-post analytics screen; it has no data source.

### 7.6 Hours sync (write)

The best fit in the whole feature, because the clinic already maintains this data with us — and the
one that needs a decision first, since **there is no location-level hours model today**.

Two options:

| Option | Pros | Cons |
| --- | --- | --- |
| **A. Derive from `ServiceProviderWorkingDay`** | No new data entry; already maintained | A clinic's opening hours are not the union of its doctors' shifts. Reception hours differ. Would push wrong hours to Google |
| **B. New `AccountLocationHours` model** | Correct by construction; matches what Google models | New data entry, and a migration concern under `ddl-auto=update` |

**Recommendation: B**, seeded from the union of working days as a first-run suggestion the clinic
confirms before anything is pushed. Never push unconfirmed derived hours to a public listing.

Also in scope: special hours for holidays, which is where clinics most often have stale Google data.

### 7.7 Booking place-action link

Push the clinic's EaseMyOPD booking URL (`/:slug/book`) as a Place Action via the Place Actions API,
so "Book an appointment" appears on the listing and lands in our funnel. Small piece of work,
directly commercially aligned — it routes Google traffic into our booking flow.

---

## 8. Data model

New, in `health`:

| Entity | Purpose | Notes |
| --- | --- | --- |
| `GoogleConnection` | One OAuth grant per account | encrypted refresh token, scopes, granted-by user, granted-at, revoked-at, Google account id |
| `GoogleLocationLink` | Maps `AccountLocation` ↔ Google location | Google location name/id, verification state, last-synced-at |
| `AccountLocationHours` | Location opening hours (§7.6 option B) | regular + special/holiday hours |
| `GoogleReviewCache` | 30-day expiring cache of Google reviews | **hard TTL**, purged by scheduler, never aggregated |
| `GoogleReplyDraft` | Pending replies awaiting human approval | draft body, author, approved-by, sent-at |
| `GooglePost` | Local Posts we've composed/published | scheduled-for, published-at, Google post id |
| `ListingSyncLog` | Every read and write against a listing | for support, and for demonstrating consent-per-action |

Extended:

- `ServiceProviderSettings` — optional `googlePlaceId` (§6.1)
- `AccountSettings` — review reminder delay, reminder enabled
- `FeatureKey` — new `GOOGLE_BUSINESS_PROFILE("googleBusinessProfile")`

**The 30-day TTL is a compliance requirement, not a cache-efficiency choice.** It needs a scheduled
purge job with a test that proves rows older than 30 days are gone, because this is the kind of
thing that silently stops working and nobody notices until an audit.

`ddl-auto=update` with no migration tool means every new column must be nullable and every new
entity additive, and `AccountProvisioningSeeder` needs to backfill the new feature row permissively
for existing accounts — the same approach the settings feature took.

---

## 9. Our API surface

Clinic-facing, under the existing `/api/settings` and a new `/api/google`:

```
GET    /api/google/connection                  connection + mapped locations
POST   /api/google/connection/authorize        begin OAuth (returns consent URL)
POST   /api/google/connection/callback         exchange code, store grant
DELETE /api/google/connection                  revoke, delete token, purge cache
GET    /api/google/locations                   Google locations we administer
PUT    /api/google/locations/{locationId}/link map an AccountLocation to one
GET    /api/google/listing/{locationId}        live listing health
GET    /api/google/performance/{locationId}    metric time series
GET    /api/google/reviews                     merged inbox (ours + cached Google)
POST   /api/google/reviews/{id}/reply          submit an approved reply
GET    /api/google/readiness                   checklist score + rows
GET    /api/settings/review-funnel             T1 funnel stats
```

Every write goes through `assertClinicAdmin()` and the `AccountGuardInterceptor`, so an expired or
grace-period account cannot push to a listing — consistent with how every other write behaves.
`FEATURE_PATHS` gains `/api/google` → `GOOGLE_BUSINESS_PROFILE` so the flag gates the whole surface.

Platform-facing, in `dev_portal`: per-account connection status, last sync, quota consumption, and
whether the account is inside our API approval — an operator needs to answer "why isn't their
listing syncing" without database access.

---

## 10. Security

This introduces the **first per-tenant long-lived credential in `health`**. There is no refresh-token
storage and no encryption helper anywhere in the codebase today — every existing secret
(`meta.whatsapp.access-token`, `gemini.api.key`, …) is platform-level config in
`application.properties`. A per-clinic refresh token is a different shape of thing: row data,
per-tenant, and enough to act on that clinic's public presence.

Requirements:

- Refresh tokens encrypted at rest with a key from environment config, never in the DB alongside
  the ciphertext. Needs an encryption utility built for this — nothing to reuse.
- Access tokens held in memory only.
- Tokens never logged, never returned by any endpoint, never included in a support export.
- Revocation path that actually calls Google's revoke endpoint, not just a local delete.
- `ListingSyncLog` records every write with the acting user, so a disputed change to a clinic's
  public listing can be traced to a person.
- A tenant-isolation test: account A can never resolve a Google connection belonging to account B.
  This is the `resolveAccountId` pattern already used throughout `SettingsService`.

---

## 11. The prerendering problem

`crm_frontend` is Create React App — entirely client-rendered. The public clinic and doctor pages
inject their `<title>`, meta description and JSON-LD from JavaScript after the bundle loads
(`PublicDoctorProfile.js:110-160`, `PublicClinicProfile.js:41-90`).

Googlebot does render JavaScript, so these pages are not invisible. But rendering is a second,
deferred pass with no guaranteed timing, and everything else that reads a page — social scrapers,
other search engines, link preview generators, AI crawlers — mostly does not render at all. For
pages whose entire purpose is to be found and shared, shipping the content in the initial HTML is
the difference between reliable and hopeful.

Options, cheapest first:

| Option | Effort | Notes |
| --- | --- | --- |
| **Prerender at build** | Low | Won't work — clinic pages are dynamic and unbounded; we'd rebuild on every profile edit |
| **Prerender service / crawler-only rendering** | Low–medium | Serve rendered HTML to bots at the edge. Fastest path. Adds a dependency and a divergence between what bots and humans get |
| **SSR the public routes only** | High | Correct. A small Next.js (or similar) app owning `/:slug`, `/:slug/book`, `/doctors/:id`, `sitemap.xml`, with the CRA app keeping the authenticated application |
| **Migrate everything to Next.js** | Very high | Not justified by this feature alone |

**Recommendation:** the third — a separate SSR surface for the public marketing pages, leaving the
authenticated CRA app alone. It is the only option that's both correct and bounded, and those four
routes are a small, well-defined slice. It is also the largest single item in this PRD and should be
costed independently rather than folded into a "Google listing" estimate.

---

## 12. Packaging and commercial

`AccountFeature` and `PlanCode` already do everything needed: add one `FeatureKey`, entitle it
per-account from `dev_portal`, and the clinic sees the menu entry appear. Same pattern as the other
13 flags — the mechanism is not new work.

Recommended shape:

- **T1 for everyone.** Review velocity and the readiness checklist make the core product better and
  cost us nothing external. Do not paywall a clinic's ability to ask for reviews.
- **T2/T3 as a PRO-tier or paid add-on** (`googleBusinessProfile`). Real ongoing cost, real ongoing
  value, and it's the piece owners are asking to pay for.

Copy constraints, from §1 and §4:

- Never "rank higher", "top of Google", "guaranteed #1", or a named position.
- Say: "keep your listing complete and current", "ask every patient for a review", "see how people
  find you on Google and Maps".
- The dashboard reports Google's own metrics as Google's, attributed, unaggregated.
- Sales material must not imply we can influence Google's ranking algorithm.

Also worth deciding before selling: whether we are acting as the clinic's agent on their listing,
and what our T&Cs say about a listing being restricted by Google for something the clinic did. That
is a legal question, not a product one, and it should be answered before the first sale.

---

## 13. Open questions

Blocking, and mostly not answerable by us:

1. **"Third parties must use their own API project"** appears in Google's policy alongside a
   prohibition on automated access *for* third parties. The benign reading is that we may not let
   other vendors piggyback on our project. The hostile reading is that each clinic needs its own
   project, which would make this product unshippable as designed. **This must be clarified with
   Google before Tier 2 is committed to.** Everything in T2/T3 assumes the benign reading.
2. **Do we qualify to apply?** Access requires the applicant to manage a profile verified and active
   60+ days with a website. Whose profile do we apply with — EaseMyOPD's own, or a pilot clinic's?
3. **Approval turnaround is unpublished.** T1 must therefore be independently valuable, which §5 is
   structured to ensure.
4. **Clinics with unverified listings** cannot use reviews or replies at all (the API requires a
   verified location). What does onboarding do for them — walk them through verification?
5. **Hours: option A or B** (§7.6). Recommend B.
6. **Multi-location and multi-practitioner mapping.** A clinic with 3 branches and 6 doctors may have
   anywhere from 1 to 9 Google listings. Confirm the mapping model against a real customer before
   building.
7. **Legal position on acting as agent** for a clinic's public listing (§12).

---

## 14. Sequencing

Ordered so nothing waits on Google.

**Phase 0 — unblock (start now, parallel to everything)**
Submit the API access application. Resolve open questions 1–3. Nothing else depends on it starting.

**Phase 1 — T1 review velocity**
Reminder cadence, per-doctor Place IDs, ask-everyone enforcement, funnel reporting, response
routing. Highest value per unit of work in the whole document, and it needs nothing from Google.

**Phase 2 — T1 discoverability**
Sitemap, canonicals, readiness checklist, NAP warnings.

**Phase 3 — prerendering (costed separately)**
The SSR public surface. Independent of Google approval; can run in parallel with Phase 1–2 if
there's capacity, since it touches different code.

**Phase 4 — T2 read** *(gated on approval)*
OAuth connect, location mapping, listing health, Performance dashboard, reviews inbox read-only.

**Phase 5 — T3 write** *(gated on Phase 4)*
Replies with approval, hours sync, posts, place-action link.

---

## 15. Explicitly not building

Recorded so these don't reappear as assumptions:

| Not building | Why |
| --- | --- |
| Review gating / sentiment pre-screen | Violates Google's content policy; enforcement penalises the clinic (§4) |
| Any ranking guarantee, ranking tracker framed as a promise, or "SEO score" implying position | Cannot be substantiated (§1) |
| Automatic AI review replies as a default | Requires prior specific and express consent (§4). Draft-and-approve instead |
| Google Q&A management | API retired 2025-11-03 (§3) |
| Insurance-network / health-provider attribute sync | API methods retired 2024-07-01 (§3) |
| Per-post analytics | `localPosts.reportInsights` discontinued 2023 — no data source (§7.5) |
| Permanent local mirror of Google reviews | 30-day cache limit, no aggregation permitted (§4) |
| Buying or generating reviews, in any form | Fake Engagement. Existential risk to the clinic and to us |

---

## 16. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| API access denied or indefinitely delayed | High | T1 is independently valuable and ships regardless (§5, §14) |
| Open question 1 resolves badly (per-clinic projects) | Critical | Clarify before committing T2. T1 unaffected |
| Clinic's listing restricted by Google for its own conduct, blamed on us | High | Never build gating; document that we ask everyone; settle the agent question in T&Cs (§12) |
| A 30-day purge job silently stops working | Medium | Test that asserts expiry; alert on cache rows older than the TTL |
| Per-clinic refresh token leak | High | Encryption at rest, no logging, revocation path, tenant-isolation test (§10) |
| Pushing wrong hours to a public listing | Medium | Confirmed hours only; never push derived data unreviewed (§7.6) |
| Edit-quota exhaustion breaking sync for a multi-location clinic | Medium | Per-location queue and rate limiter sized to 10/min/profile (§4) |
| Prerendering scope creep swallowing the feature | Medium | Cost and schedule it separately (§11) |

---

## Sources

Verified 2026-09-04:

- [Basic setup — Business Profile APIs](https://developers.google.com/my-business/content/basic-setup)
- [Prerequisites and access request](https://developers.google.com/my-business/content/prereqs)
- [Deprecation schedule](https://developers.google.com/my-business/content/sunset-dates)
- [API policies](https://developers.google.com/my-business/content/policies)
- [Usage limits](https://developers.google.com/my-business/content/limits)
- [Work with review data](https://developers.google.com/my-business/content/review-data)
- [`accounts.locations.reviews.updateReply`](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/updateReply)
- [`DailyMetric` — Performance API](https://developers.google.com/my-business/reference/performance/rest/v1/DailyMetric)
- [Prohibited & restricted content — Business Profile Help](https://support.google.com/business/answer/7400114)
- [Business Profile restrictions for policy violations](https://support.google.com/business/answer/14114287)
