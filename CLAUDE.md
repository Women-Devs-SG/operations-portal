# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WDS Operations Portal: a password-gated single-page portal Women Devs SG volunteers use to create an "event task". Creating a task appends a row to a Google Sheet, provisions a Drive folder (copying an intro template into it), and posts to a Telegram channel. The repo is public; the running instance and its data are not.

## Commands

```bash
npm install
cp .env.example .env        # ships with DEMO_MODE=1 — no credentials needed
npm run dev                 # netlify dev → http://localhost:8888 (any password works in demo mode)
npm run audit               # npm audit --omit=dev
node --check <file>.mjs     # syntax check a file you touched
npx @fission-ai/openspec@latest validate --all --strict   # run before opening a PR
```

There is **no test framework and no build step**. `debug-google.mjs`, `test-sheet-write.mjs`, and `test-create-task.mjs` at the root are hand-run diagnostics that need real credentials; the latter two write live data (Sheet row, Drive folder, Telegram message). Don't run them in demo mode or casually.

## Architecture

- **No server.** `public/` is static (vanilla JS + HTML, no framework, no bundler). `netlify/functions/*.mjs` are Fetch-API handlers (`export default async function handler(req)` returning `Response`). `netlify.toml` rewrites `/api/create-task` and `/api/tasks` to the functions (status 200 rewrites, so same-origin) and sets a strict CSP — the frontend can load nothing third-party.
- **`lib/*.mjs`** holds shared logic: `auth` (timing-safe `X-Portal-Password` check), `demo`, `google` (lazy, cached Sheets/Drive clients), `http` (`json()` helper — all responses go through it for `no-store`), `telegram` (plain `fetch`, deliberately no bot library), `validate` (length caps, control-char stripping, http(s)-only URLs, `YYYY-MM-DD` dates).
- **Every handler follows the same order:** method check → `demoStatus()` (return `refusal` if set) → `requirePassword()` unless demo active → parse/validate → demo branch or real branch. Keep that order in new endpoints.
- **Fail closed:** `PORTAL_PASSWORD` unset or < 12 chars → 503 on everything. `DEMO_MODE` set while `CONTEXT=production` → 503 on everything.
- **Failure semantics in create-task:** the Sheet append is the only must-succeed step (502 if it fails). Drive folder creation, template copy, and Telegram are best-effort, logged, and never fail the request. Errors returned to the client are generic; details go to `console.error` only (never log Telegram response bodies — they can echo the token).
- **Sheet layout:** tab `Tasks`, columns A:I = `taskId, taskName, status, driveUrl, qrUrl, createdAt, eventDate, eventLocation, eventOneLiner`. The write in `create-task.mjs` and the read mapping in `tasks.mjs` must stay in sync. Writes use `valueInputOption: 'RAW'` to prevent formula injection — don't change to `USER_ENTERED`. Note the row is appended *before* Drive runs, so column D (`driveUrl`) is written empty.
- **Request fields** are `taskName` (required), `eventDate`, `eventLocation`, `eventOneLiner`, `formUrl`. (The README's API example uses older names `location`/`description`.)
- **Demo mode** (`lib/demo.mjs`): serves `fixtures/tasks.demo.json`, skips auth, calls nothing external. Created tasks persist to `$TMPDIR/wds-portal-demo-tasks.json` — only under `netlify dev` (`NETLIFY_DEV=true`); deployed previews are read-only and say so. Validation and response shapes are identical to production.
- **Frontend:** password kept in `sessionStorage`; `fetchTasks` doubles as the credential check. DOM is built with `createElement`/`textContent`, never `innerHTML`, since task fields are user-supplied.
- `GOOGLE_PRIVATE_KEY` is stored with literal `\n` sequences; `lib/google.mjs` converts them.

## Workflow: OpenSpec

Behaviour is specified in `openspec/specs/<capability>/` (task-intake, task-registry, drive-provisioning, telegram-notifications, portal-ui) and that is the source of truth. Behaviour changes start as a proposal in `openspec/changes/<name>/` (proposal.md, design.md, delta specs, tasks.md) — use `/opsx:propose`, `/opsx:apply`, `/opsx:archive`. Bug fixes, refactors, docs, and tooling need no change folder.

`openspec/config.yaml`'s `context` block is stale (describes Express, `server.js`, `node-telegram-bot-api`); trust the code.

## Conventions

- ESM `import` only; two-space indent, single quotes, semicolons. Comments are sparse and explain *why*.
- All config from env vars (`.env.example` is the authoritative list); never hardcode IDs.
- **Never commit real data**: no real event/volunteer names, locations, or form links in code, fixtures, comments, or commit messages; screenshots only from demo mode.
- `main` is protected; changes go through PRs (template in `.github/pull_request_template.md`).
