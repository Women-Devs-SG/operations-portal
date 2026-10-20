## Purpose

Lets anyone run the portal with no credentials by serving fictional tasks from a
committed fixture, so the public repository is contributable and the portal can be
demonstrated without real community data on screen.

## ADDED Requirements

### Requirement: Demo Mode Activation

The system SHALL serve fixture-backed responses only when `DEMO_MODE` is truthy
and the request executes in an explicitly permitted runtime. It SHALL make no
Google or Telegram calls while demo mode is active. Demo mode SHALL be disabled
when its permission is missing, invalid, or ambiguous.

#### Scenario: Local demo mode enabled

- **WHEN** `DEMO_MODE` is set to `1` or `true` and the function runs under
  `netlify dev` with a runtime deploy context of `dev`
- **THEN** both endpoints answer from the fixture-backed store
- **AND** no Sheets, Drive, or Telegram request is issued

#### Scenario: Explicitly permitted Deploy Preview

- **WHEN** `DEMO_MODE` is set to `1` or `true`, the server-side
  `DEMO_MODE_PREVIEW=1` permission is available to the Function and Netlify's
  runtime deploy context is `deploy-preview`
- **THEN** both endpoints answer from the fixture-backed store
- **AND** no Sheets, Drive, or Telegram request is issued
- **AND** the deployed demo is read-only

#### Scenario: Demo mode absent

- **WHEN** `DEMO_MODE` is unset, empty, `0`, or `false`
- **THEN** both endpoints behave exactly as they do today, contacting Google and
  requiring the shared password

#### Scenario: Demo requested without a permitted runtime

- **WHEN** `DEMO_MODE` is truthy and the runtime is not local Netlify Dev
- **AND** either `DEMO_MODE_PREVIEW` is not `1` or Netlify's runtime deploy context
  is not `deploy-preview` (absent or another context)
- **THEN** both endpoints return `503` naming the demo configuration
- **AND** neither endpoint serves fixtures or contacts Google or Telegram

#### Scenario: Invalid demo configuration

- **WHEN** `DEMO_MODE` has an unrecognized non-empty value
- **THEN** both endpoints return `503` naming the demo configuration
- **AND** neither endpoint falls through to the real-data path

#### Scenario: Credentials present alongside demo mode

- **WHEN** `DEMO_MODE` is truthy and real Google credentials are also configured
- **THEN** demo mode still wins and the credentials go unused, so a machine that was
  working before does not start failing

### Requirement: Production Interlock and Fail-Closed Permission

The system SHALL refuse to serve any request when `DEMO_MODE` is truthy in an
explicit production context. Outside local Netlify Dev, it SHALL refuse demo
mode whenever the platform runtime context is unavailable or not `deploy-preview`,
even if `DEMO_MODE_PREVIEW=1` is set. Client-provided headers, query
parameters, or body fields SHALL NOT grant demo permission.

#### Scenario: Demo mode set in production

- **WHEN** `DEMO_MODE` is truthy and the deploy context is `production`
- **THEN** every request receives `503` with a message naming `DEMO_MODE` as the
  misconfiguration
- **AND** the misconfiguration is logged server-side
- **AND** an explicit preview permission does not override production refusal

#### Scenario: Missing runtime marker does not authorize demo mode

- **WHEN** `DEMO_MODE` is truthy and Netlify's runtime deploy context is unavailable
- **AND** the runtime deploy context is not `dev`
- **THEN** every request receives `503`, even if `DEMO_MODE_PREVIEW=1` is set

#### Scenario: Client input cannot enable preview demo mode

- **WHEN** the server-side preview permission is absent
- **AND** a request supplies a demo permission header, query parameter, or body
  field
- **THEN** the request receives `503` and demo mode remains disabled

### Requirement: Demo Mode Needs No Password

The system SHALL skip the shared-password check while demo mode is active, so a
contributor needs no configuration at all, and SHALL NOT weaken that check on any
other path.

#### Scenario: Request without a password header

- **WHEN** demo mode is active and a request carries no `X-Portal-Password` header
- **THEN** the request is served normally

#### Scenario: Unlock screen in demo mode

- **WHEN** the frontend starts without a stored password in authorized demo mode
- **THEN** the listing request succeeds and the portal opens without showing the
  unlock form, because there is nothing behind the gate but fixtures

#### Scenario: Real path is unchanged

- **WHEN** demo mode is not active
- **THEN** the shared-password check applies in full, including its fail-closed
  behaviour for an unset or empty password

### Requirement: Demo Mode Preserves The Real Contract

The system SHALL apply the same method restrictions, body parsing, and field
validation in demo mode as on the real path, and SHALL return the same response
shapes, so what a contributor exercises is the real contract.

#### Scenario: Validation still rejects bad input

- **WHEN** a demo-mode submission violates a validation rule, such as a
  `javascript:` form URL or an over-length task name
- **THEN** the system responds `400` with the same message the real path returns

#### Scenario: Method restrictions still apply

- **WHEN** a demo-mode request uses an unsupported method
- **THEN** the system responds `405` with the same `Allow` header

#### Scenario: Successful demo submission

- **WHEN** a valid demo-mode submission is made
- **THEN** the response carries `status: "success"`, a generated `taskId`,
  `createdAt`, `qrCodeUrl`, and a `driveUrl`, exactly as the real path does
- **AND** the `message` states that the task was stored in demo mode only

### Requirement: Fixture Data Contains Nothing Real

The system SHALL seed demo mode from a committed fixture file holding only
fictional events, with no real volunteer name, event, location, form link, or Drive
URL, so screenshots and demonstrations cannot leak community data.

#### Scenario: Fixture is the seed

- **WHEN** demo mode starts
- **THEN** the task list is seeded from the fixture file, whose entries use the same
  field names `GET /api/tasks` returns

#### Scenario: Drive URLs are visibly fake

- **WHEN** a fixture or demo-created task exposes a `driveUrl`
- **THEN** it is recognisably a placeholder rather than a real Drive link

### Requirement: Demo Writes Are Local Only

The system SHALL store demo-created tasks in a scratch file that both endpoints
read, SHALL do so only where both run on one machine with one temp directory, and
SHALL tell the caller plainly when it cannot rather than accepting a task that will
never appear.

#### Scenario: Task created in a local demo

- **WHEN** a task is submitted in demo mode on a local dev server
- **THEN** it is appended to the scratch file and appears in the next listing,
  after the committed fixtures
- **AND** the response says the task was saved to the local demo only

#### Scenario: Task created in a deployed demo

- **WHEN** a task is submitted in demo mode on a deployed site, such as a branch or
  preview deploy
- **THEN** the response reports that the demo is read-only and the task was not
  added to the list
- **AND** nothing is written anywhere

#### Scenario: The two endpoints are separate functions

- **WHEN** a task is created by one function and listed by the other
- **THEN** both read the same scratch file locally, because process memory is never
  shared between separate function invocations
- **AND** a deployed demo refuses the write instead, because each deployed function
  has its own container and its own temp directory

#### Scenario: Scratch file is missing or corrupt

- **WHEN** the scratch file does not exist, or does not hold a JSON array
- **THEN** the listing falls back to the committed fixtures alone rather than
  failing, and deleting the file resets the local demo

#### Scenario: A reader runs while a write is in progress

- **WHEN** the listing reads the scratch file while a task is being written
- **THEN** it sees either the complete previous contents or the complete new
  contents, never a partially written file

#### Scenario: Scratch file cannot be written

- **WHEN** the filesystem rejects the write
- **THEN** the request still succeeds, the response reports the demo as read-only,
  and the failure is logged

### Requirement: Demo Mode Announces Itself

The system SHALL log a warning on every demo-mode request, so a maintainer who
leaves `DEMO_MODE` enabled beside real credentials can see why the portal is showing
unfamiliar data. Successful task-list responses SHALL include a boolean `demoMode`
field, and the frontend SHALL show demo notices only when that backend-confirmed
field is `true`.

#### Scenario: Demo request is logged

- **WHEN** any request is served in demo mode
- **THEN** a warning naming `DEMO_MODE` is written to the server log

#### Scenario: Frontend uses authoritative demo status

- **WHEN** `GET /api/tasks` succeeds
- **THEN** its response includes `demoMode: true` for an authorized demo and
  `demoMode: false` for the authenticated real-data path
- **AND** the frontend does not infer demo mode from build-time environment values
