# dev_portal

Operator console for the clinic CRM platform. This is the only place an account's plan, trial
length, expiry date, limits and feature entitlements can be changed — clinic-facing screens show
those as read-only on purpose.

Paired with the `health` backend (`/api/admin/accounts/**`, `SUPER_ADMIN` only) and specified in
[docs/prd/clinic-doctor-settings.md](docs/prd/clinic-doctor-settings.md).

## Running

```bash
npm install
npm run dev          # http://localhost:3002
npm run build        # production build -> dist/
```

`REACT_APP_API_BASE_URL` points at the backend and must include `/api` (see `.env.example`). Vite
bakes it in at build time, so changing it means rebuilding, not just restarting.

## Access

Sign in with a platform user holding the `SUPER_ADMIN` role. A clinic login will authenticate but
is refused at the door — every `/api/admin/**` endpoint checks the role server-side, so the console
would be an empty shell anyway.

There is no self-service sign-up. Grant `SUPER_ADMIN` to a user directly in the database.

## What it can change

| Area | Effect |
|---|---|
| Plan, trial length, expiry, grace period | Drives the clinic's access state — active, expiring, read-only during grace, then blocked |
| Limits | Locations, staff users and doctors an account may create; blank means unlimited |
| Feature entitlements | What the account is sold. A clinic can hide a module it has, but cannot grant itself one it does not |
| Account status | `ON_HOLD` / `INACTIVE` stops an account immediately, regardless of its dates |

Changing the trial length re-dates the expiry from the trial start, unless an explicit expiry date
is set in the same save — that pins it.
