# PRD — Dev Portal (company admin console)

**Product:** EaseMyOPD
**Surface:** internal company-operator console
**Status:** v1 shipped on `feature/platform-admin-portal`; not yet deployed

---

## Product context

EaseMyOPD is a multi-tenant clinic/OPD management platform sold to clinics in India. It is made of
one backend and four front-ends, each with a different audience:

| Surface | Repo | Audience |
| --- | --- | --- |
| API | `health` | — |
| Clinic web app | `crm_frontend` | clinic staff |
| Clinic mobile app | `crm_mobile` | clinic staff, on phones |
| Patient portal | `patient_portal` | patients |
| **Company admin console** | **`dev_portal`** | **the company that sells the product** |

This document covers the last one.

## Problem

The company selling EaseMyOPD had no way to see its own business. Every screen in the product is
scoped to one clinic by design — that tenant isolation is the platform's central safety property —
which meant nobody at the company could answer:

- How many clinics are on the platform, and what state are they in?
- Which clinics are actually using it, and which signed up and never came back?
- Who do we call when an account looks stalled?
- What happened to the enquiries submitted through the marketing site?

That last one was not merely inconvenient. Contact-us submissions arrive with no clinic attached,
and the clinic-facing API only ever lists a clinic its *own* claimed leads. An unassigned lead was
therefore visible to **nobody** — stored and never read.

Answering any of these previously meant a direct query against the production database.

## Goals

1. One list of every clinic on the platform, with enough signal to spot a dormant one.
2. Drill into a clinic to answer a support question without touching the database.
3. Change a clinic's lifecycle status, and have that mean something.
4. Cross-clinic usage over a date range.
5. A lead inbox that finally makes unclaimed enquiries visible.

## Non-goals — deliberate, not deferred

These are capabilities the console must **not** grow without a specific decision:

- **Reading patient clinical data.** The oversight API returns counts and aggregates. No patient
  record, prescription, consultation note, or document is reachable from this console. Support
  questions get answered with "the clinic has 412 patients", never with a patient's file.
- **Resetting a clinic user's password.** Staff logins are listed read-only. A company-side
  password reset is not something that should fall out of an admin table.
- **Editing clinical or business data on a clinic's behalf.** Status is the only writable field on
  an account.

## Users

| Role | Can | Cannot |
| --- | --- | --- |
| `PLATFORM_ADMIN` | everything below | — |
| `PLATFORM_SUPPORT` | read every screen | change account status, assign leads |

`PLATFORM_SUPPORT` exists because answering a support ticket needs *visibility* into a clinic,
which is a much weaker reason to hand out the ability to suspend that clinic.

## Requirements

### R1 — Clinics list
Every account with status, locations, doctors, patients, staff logins, all-time appointments, and
**last activity**. Filter by status and by free text over name/owner/city/email/phone.

*Last activity is the most useful column:* it separates a clinic genuinely using the product from
one that signed up, was seeded, and stopped. It is derived from the newest appointment slot, which
may be in the **future** for a healthy clinic — "in 17d" is a good sign, not a stale record.

### R2 — Clinic detail
Locations, staff logins with roles, doctors, and registration details for one clinic.

### R3 — Lifecycle status
Set `NEW` / `ACTIVE` / `ON_HOLD` / `INACTIVE`. `ON_HOLD` and `INACTIVE` **block login for every
user at that clinic**, so the UI states that consequence before applying it.

A **null status is a real state**, not a data error: self-serve signup never assigns one. It is
surfaced as its own "No status set" count, because "signed up and never triaged" is exactly the
population the company should be looking at.

### R4 — Usage report
Appointments, consultations, prescriptions, invoices, amount billed and amount settled per clinic
over a date range. Every clinic appears **even with all-zero counts** — a zero row is the finding,
not noise, so it is tinted rather than filtered out.

### R5 — Lead inbox
Every contact-us submission including the unclaimed pool. Assign to a clinic, reassign, or return
to the pool. Reassignment is a company capability only; a clinic could otherwise steal or dump
another clinic's lead.

## Security requirement

This console is the only part of the product that reads across tenants. That makes its auth
boundary the highest-stakes one in the system, and it is specified rather than assumed:

- Company operators live in their own table with **no account link at all**.
- Platform tokens are signed with a **different key** than clinic and patient tokens, so a clinic
  token fails signature verification on a platform route outright rather than depending on a claim
  check.
- The clinic and platform JWT filters are mutual mirror images — neither runs on the other's paths.
- Platform routes require a platform authority, never merely `authenticated()`.

See [ARCHITECTURE.md](ARCHITECTURE.md) for how this is built and why each piece is load-bearing.

## Success criteria

- A support question about a clinic is answerable without a database query.
- No contact-us submission is invisible to everyone.
- A clinic token cannot reach any `/api/platform/**` route, and this is covered by a test.

## Open items

- No audit log. Status changes are attributed via `updated_by` but there is no history of who
  changed what and when. This should exist before the console has more than a couple of operators.
- No pagination anywhere. Fine at tens of clinics; the clinics list and lead inbox both load in
  full and will need paging well before a thousand.
- No rate limit on platform login.
