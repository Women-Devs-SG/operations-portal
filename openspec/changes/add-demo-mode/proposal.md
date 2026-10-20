## Why

The repository is public, but nobody outside the team can run it. Both functions
need `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` before they will answer at all,
and those credentials carry Editor rights on the real operations Sheet, the real
Drive folder, and the volunteer Telegram chat. There is no version of "let a
contributor try it" that involves handing those out.

So the first-run experience for an outside contributor is a `503`, and the only way
to see the portal work is to read the code and imagine it. That is the difference
between a repository that is merely visible and one that is genuinely open source.

This also gives the team a safe place to demonstrate the portal — at a meetup, in a
recruitment pitch, in a README screenshot — without a real event, a real volunteer
name, or a real Drive link on screen.

## What Changes

- Add a demo mode that serves a fixed set of fictional tasks from a committed
  fixture file and, in local development, persists new ones to a scratch file
  shared by the separate `create-task` and `tasks` functions. Deployed demos are
  read-only, and demo mode makes no Google or Telegram calls whatsoever.
- Activate it only from an explicit `DEMO_MODE` environment variable and only in
  permitted runtimes: local `netlify dev`, or a Deploy Preview with
  `DEMO_MODE_PREVIEW=1` scoped to Functions for Deploy Previews and Netlify's
  platform-provided runtime deploy context equal to `deploy-preview`.
- Refuse demo requests in explicit production context, for invalid configuration,
  or when no permitted runtime authorization is present. Do not rely on `CONTEXT`
  being available in a Function invocation.
- Skip the shared-password check while demo mode is active — there is nothing behind
  it to protect — and keep validation, method handling, and response shapes
  identical to the real thing, so what a contributor exercises is the real contract.
- Log a warning on every demo-mode request, so a maintainer who leaves `DEMO_MODE=1`
  in a local `.env` alongside real credentials sees immediately why the dashboard
  looks unfamiliar.
- Ship `.env.example` with demo mode already enabled and the credential fields
  blank, so `cp .env.example .env && npm run dev` is a working portal.

## Capabilities

### New Capabilities

- `demo-mode`: the activation rules, the production interlock, and the fixture-backed
  behaviour of both endpoints while it is active.

## Impact

- **Added**: `lib/demo.mjs`, `fixtures/tasks.demo.json`.
- **Changed**: `netlify/functions/create-task.mjs` and `netlify/functions/tasks.mjs`
  gain a demo branch ahead of the password check; `.env.example` documents
  `DEMO_MODE`; `README.md` gains a no-credentials quick start.
- **Configuration**: `DEMO_MODE` is optional. `DEMO_MODE_PREVIEW` is an explicit
  server-side permission scoped to Functions in Deploy Preview contexts only;
  Netlify's runtime deploy context independently prevents production activation.
- **Changed**: the frontend uses the task-list response as the authoritative demo
  state and authorized demos load without prompting for a password.
