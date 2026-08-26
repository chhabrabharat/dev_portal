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

## Wide tables

The clinics and usage tables set an explicit `minWidth` and let their container scroll
horizontally. Without it, 8 columns compress into the container and clinic names wrap over three
or four lines. If you add a column, check the table at ~960px before considering it done — and
confirm the page *body* still doesn't scroll sideways, only the table container.
