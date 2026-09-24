# books-ui-playwright

Browser UI tests for the **Books Library** web app: the login page and the
signed-in redirect. Written with Playwright.

The API suite (`books-api-tests`) owns the business rules. This suite answers a
narrower question: **does the page do the right thing with what the API
returns?** Keeping it narrow is what keeps it fast and stable.

## Quick start

```bash
nvm use                 # Node 22, per .nvmrc
npm ci
npx playwright install --with-deps chromium
cp .env.example .env    # then edit it
npm run verify          # typecheck + lint + format check
npm test
```

### Trying it without a deployed app

A demo web app ships in `tools/demo-app/`: a login page, a home page and a
stand-in auth API on one origin.

```bash
npm run demo-app &      # http://localhost:3000
npm test
```

**A green run against the demo app proves the harness works and nothing about
the product.** Point `WEB_BASE_URL` at a real deployment for a meaningful run.
CI never uses the demo app.

## What is covered

| Area            | Tests              | Notes                                                             |
| --------------- | ------------------ | ----------------------------------------------------------------- |
| App health      | `UI-HEALTH-01..03` | Page loads, no JS or resource errors, signed-out redirect         |
| Login journeys  | `UI-AUTH-01..08`   | Success, failure, enumeration, token storage, retry after failure |
| Error rendering | `UI-AUTH-09..11`   | Mocked 400/401/500 and network failure                            |
| Accessibility   | `UI-A11Y-01..04`   | axe WCAG A/AA, `role="alert"`, keyboard-only use                  |

Run a slice:

```bash
npm run test:smoke      # @smoke
npm run test:a11y       # @a11y
npm run test:security   # @security, retries disabled
npm run test:repeat     # stability check before merging
```

## Layout

```
src/config.ts            Environment config, validated at import
src/constants.ts         Routes, API paths, test IDs, error codes
src/pages/               Page objects: locators, actions, readiness waits
tests/app/               App health and routing
tests/auth/              Login journeys, error rendering, accessibility
tools/demo-app/          Local stand-in web app (not for real testing)
```

## Design rules this repo follows

- **Page objects hold locators, actions and readiness waits.** Assertions about
  outcomes live in tests, so a test reads as one behaviour.
- **Locator priority:** `getByRole` and `getByLabel` first (what a user
  perceives), `data-testid` where the accessible name is not stable. Never CSS
  classes or XPath.
- **`login()` returns the API response,** so a test asserts on both layers. When
  a UI test fails you can tell immediately whether the backend or the page is
  wrong.
- **Assert on `data-error-code`, not on copy.** Text is checked with a regex so
  a UX wording change does not break the suite.
- **Web-first assertions only.** `waitForTimeout` is banned by ESLint.
- **Mocks match the API contract.** The bodies in `login-messages.ui.spec.ts`
  mirror the schemas the API suite asserts. When the contract changes, both
  repos change together.
- **Projects have no `dependencies`.** A dependent Playwright project is
  _skipped_ when its dependency fails, which would hide whole areas behind one
  unrelated failure. CI orders the runs instead.
- **Security tests never retry** (`npm run test:security` sets `--retries=0`).

## Test hooks this suite needs from the frontend

| Attribute                      | On                     | Why                                   |
| ------------------------------ | ---------------------- | ------------------------------------- |
| `data-testid="login-form"`     | The form               | Stable handle for the page object     |
| `data-testid="login-error"`    | The error element      | Locating the error regardless of copy |
| `data-error-code`              | The error element      | Machine-readable API error code       |
| `role="alert"`                 | The error element      | Screen readers announce the failure   |
| `data-altcha-state="verified"` | The captcha widget     | Knowing when proof-of-work finished   |
| `data-testid="home-root"`      | Signed-in landing page | Confirming the journey completed      |

If any of these are missing, raise it with the frontend team rather than
reaching for a CSS selector: a class-based locator breaks on the next restyle.

## Adding state-changing tests

Everything here is read-only with respect to account state, which is why tests
run in parallel against one shared seeded account (`BUYER_*`).

The **account lockout** feature changes that. Driving five failed logins through
the browser would lock an account that every other test depends on.

Before writing those tests:

1. Get test-only API hooks from backend (disposable user, lockout reset, clock
   advance). They are listed in `books-api-tests/README.md`.
2. Add a `freshUser` fixture to `tests/fixtures.ts` that creates a user in setup
   and resets it in teardown.
3. **Arrange through the API, act and assert through the UI.** Prove the full
   journey through the browser exactly once; every other test should reach the
   locked state with a single API call.
4. Put clock-dependent tests in their own project with `--workers=1`: a server
   clock offset is global, so those tests cannot run beside anything else.
5. Run the UI suite against its **own** environment. Two suites advancing the
   same server clock will break each other.

## Known limitations

- Retry-time wording ("try again in 15 minutes") is not covered yet; when it
  exists, test it with `page.route` rather than a real lock.
- Firefox, WebKit and mobile run `@smoke` only. Widen the `grep` in
  `playwright.config.ts` if a browser-specific bug is found.
- The demo app implements the happy and error paths only. It is not a mock of
  the whole product and must not grow into one.

## Environment variables

See `.env.example`. `WEB_BASE_URL`, `API_BASE_URL`, `BUYER_USERNAME` and
`BUYER_PASSWORD` are required. A missing variable fails fast with a message
naming it.
