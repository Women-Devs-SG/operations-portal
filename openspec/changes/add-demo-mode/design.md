## Context

Both functions currently follow the same order: method check, `requirePassword`,
then Google work via `getGoogleClients()`, which throws when credentials are absent.
`lib/auth.mjs` deliberately fails closed — an unset or short `PORTAL_PASSWORD`
returns `503` to everything — so a contributor with no `.env` gets a `503` before
any handler logic runs. Demo mode has to slot in ahead of that check without
weakening it for the real deployment.

The live site is the team's internal tool. Demo mode must not activate just
because `DEMO_MODE` was copied from a local `.env` into a deployed Function.

Netlify documents `CONTEXT` as build metadata and does not expose it to deployed
Functions. Local permission comes from Netlify Dev's `NETLIFY_DEV=true`. A
shareable Deploy Preview therefore requires both `DEMO_MODE_PREVIEW=1` and a
custom `DEMO_DEPLOY_CONTEXT=deploy-preview` marker set through Netlify's UI/API,
scoped to **Functions** and **Deploy Previews only**. Neither variable may be
available to production Functions.

## Goals / Non-Goals

**Goals:**

- `cp .env.example .env && npm run dev` yields a working portal with no credentials.
- Demo mode is disabled by default and structurally unreachable in an explicitly
  marked production context.
- When the runtime marker is unavailable, deployed demo mode never activates;
  missing configuration and missing authorization both fail closed.
- A contributor exercising the demo exercises the real request contract: same
  validation, same status codes, same response shape.
- No fixture resembles a real event, volunteer, or Drive link.

**Non-Goals:**

- Persisting demo tasks across restarts, or between concurrent function instances.
- A public demo deployment. This change makes one possible; it does not create one.
- Faking Drive folder creation or Telegram delivery beyond the response fields.
- Any change to how the real path authenticates.

## Decisions

**Permission is separate from the request to demo.** `DEMO_MODE` requests demo
behavior, but does not authorize it. Local `netlify dev` is permitted by
`NETLIFY_DEV=true`. A deployed demo is permitted only when
`DEMO_MODE_PREVIEW=1` and `DEMO_DEPLOY_CONTEXT=deploy-preview` are available to
the Function from a Netlify Deploy Preview scope. These settings are server-side;
request headers and query parameters cannot grant demo access. They must not be
configured for production.

**Unknown and invalid configurations fail closed.** If `DEMO_MODE` has an
unrecognized value, if the runtime is neither local Netlify Dev nor explicitly
authorized for a preview, or if demo is requested in an explicit production
context, return `503` before authentication or data access. In particular, the
built-in build-time `CONTEXT` variable is never treated as runtime authority.

**A rejected demo request never falls through to the real path.** Returning `503`
for invalid or unauthorized demo configuration avoids both serving fixtures and
accidentally continuing into the Google-backed path with ambiguous configuration.
When `DEMO_MODE` is off, the existing password-protected real path is unchanged.

**Demo mode skips the password rather than shipping a demo password.** There is
nothing behind the gate but fixtures, and a documented shared demo password is worse
than none: it trains contributors to expect a password that works, and it is exactly
the kind of string that gets pasted into a real Netlify variable. The frontend needs
no change — its unlock screen calls `GET /api/tasks`, which succeeds in demo mode,
so any typed password unlocks the portal. The README says so plainly.

**Validation still runs.** Demo mode branches after `readJsonObject` and
`validateTaskInput`, not before. A contributor working on validation, or on the
frontend's error rendering, is exercising the real rules. Only the three side
effects — Sheet, Drive, Telegram — are replaced.

**Fixtures are a committed JSON file, not inline literals.** `fixtures/tasks.demo.json`
holds the same shape `GET /api/tasks` returns, so it doubles as a reference for the
response contract and as a place to add a case (a task with no Drive URL, a long
description) without touching code.

**Demo writes are local only, and say so.** Three attempts converged here. A
module-level array fails because `create-task` and `tasks` are separate functions:
an array populated by one is invisible to the other, so a created task returned
`200` and never appeared. A shared file in the OS temp directory fixes that only
where both functions run on one machine — true under `netlify dev`, false on a
deployed site, where each function has its own container and its own `/tmp`, and
container recycling would lose the file even for a single function. Since
`DEMO_MODE` is explicitly allowed on branch and preview deploys, a file store alone
would have reproduced the original bug exactly where it is hardest to notice.

So `addDemoTask` returns whether it actually stored anything, and the response says
which happened: saved to your local demo, or this shared demo is read-only and the
task was not added. Accepting a write and silently dropping it is the one outcome
worth engineering against. The alternative — a real shared store such as Netlify
Blobs — would make deployed demos writable, at the cost of a production dependency
and an unbounded public write surface, for a feature whose main job is local
onboarding.

`NETLIFY_DEV` is the signal for "local". This was checked rather than assumed:
a function under `netlify dev` sets `AWS_LAMBDA_FUNCTION_NAME` and
`LAMBDA_TASK_ROOT` exactly as a deployed one does, so neither distinguishes them.

Writes go to a temporary path and are renamed into place, so a concurrent listing
sees either the whole old file or the whole new one — never a truncated file that
would parse as empty and then be overwritten. Two simultaneous writers can still
lose one task; for one person clicking a form that does not justify a lock file.

## Risks / Trade-offs

- **A stale `DEMO_MODE=1` cannot authorize a deployed demo.** The request is refused
  unless local Netlify Dev or the separately scoped preview permission is present.
- **Demo mode is unauthenticated by design.** Deploy Preview permission is therefore
  intentionally limited to Netlify Functions in Deploy Preview context. Such
  previews serve fictional fixtures only and remain read-only.
- **Preview safety depends on Netlify variable scope.** A maintainer must verify
  that `DEMO_MODE_PREVIEW` and `DEMO_DEPLOY_CONTEXT` are scoped to Functions and
  Deploy Previews only and absent from production. Until both are verified on a
  real Deploy Preview, preview demo mode must remain disabled.
- **Fixtures drift.** If the Sheet's column layout changes, the fixture file is a
  second place to update. `task-registry`'s spec is the shared reference for both.
- **`portal-access` is not yet in the main specs.** Its requirements live in the
  unarchived `migrate-api-to-netlify-functions` change, so this change states the
  password-skip inside its own capability instead of filing a delta against it.
  When that change is archived, the two should be read together.
