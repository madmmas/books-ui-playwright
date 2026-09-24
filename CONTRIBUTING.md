# Contributing

## Before you open a PR

- [ ] `npm run verify` passes (typecheck, lint, format)
- [ ] `npx playwright test --repeat-each=5` passes for any test you added
- [ ] Test title states exactly what is asserted (no "or" in a single test)
- [ ] Test ID follows the convention and is traceable to an acceptance criterion
- [ ] Arrange / Act / Assert are visibly separate
- [ ] No sleeps, no shared mutable state, no `test.only`
- [ ] Security tests carry `@security` and do not rely on retries
- [ ] No new magic values: routes, test IDs and error codes in `src/constants.ts`
- [ ] Locators live in page objects only, and prefer role/label over `data-testid`
- [ ] No `waitForTimeout`; web-first assertions used throughout
- [ ] README updated if setup or environment variables changed

## Test ID convention

`UI-<AREA>-<NN>` — for example `UI-AUTH-04`, `UI-HEALTH-01`, `UI-A11Y-02`.
IDs are stable. When a test is deleted its ID is retired, never reused.

## Commit messages

Conventional commits:

```
test(auth): cover the signed-out redirect from /home
fix(pages): wait for the captcha to re-verify before resubmitting
ci: install only Chromium on pull requests
chore(deps): bump @playwright/test to 1.49.1
```
