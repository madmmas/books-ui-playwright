import { API_PATHS } from "../../src/constants.js";
import { expect, test } from "../fixtures.js";

/**
 * How the page renders each API outcome.
 *
 * These use page.route to return a fixed response, which makes every case
 * instant and deterministic. Bodies match the live auth service
 * (`error` + optional `captcha`), not the older { code, message } demo contract.
 */
const cases = [
  {
    name: "invalid credentials",
    status: 401,
    body: { error: "Username or password is invalid" },
    expectedText: /username or password is invalid/i,
  },
  {
    name: "captcha required",
    status: 400,
    body: {
      error: "Captcha verification failed",
      code: "captcha_required",
      captcha: "frictionless",
    },
    expectedText: /captcha/i,
  },
  {
    name: "validation error",
    status: 400,
    body: { error: "Username and password are required" },
    expectedText: /username and password are required/i,
  },
];

test.describe("Login error rendering", () => {
  for (const testCase of cases) {
    test(`UI-AUTH-09 ${testCase.name} is shown to the user`, async ({ page, loginPage }) => {
      // Arrange
      await page.route(`**${API_PATHS.jwtLogin}`, (route) =>
        route.fulfill({ status: testCase.status, json: testCase.body }),
      );
      await loginPage.goto();

      // Act
      await loginPage.login("someone@example.test", "some-password");

      // Assert: the live page echoes `error`; it does not expose data-error-code.
      await expect(loginPage.error).toBeVisible();
      await expect(loginPage.error).toHaveText(testCase.expectedText);
    });
  }

  test(
    "UI-AUTH-10 a server error is reported without leaking internals",
    {
      tag: ["@security"],
    },
    async ({ page, loginPage }) => {
      // Arrange
      await page.route(`**${API_PATHS.jwtLogin}`, (route) =>
        route.fulfill({
          status: 500,
          json: {
            code: "internal_error",
            message: 'psql: relation "users" does not exist at /srv/app/db.ts:42',
          },
        }),
      );
      await loginPage.goto();

      // Act
      await loginPage.login("someone@example.test", "some-password");

      // Assert: the user sees something went wrong, not a stack trace.
      await expect(loginPage.error).toBeVisible();
      await expect(loginPage.error).not.toHaveText(/psql|relation|\.ts:/i);
    },
  );

  test("UI-AUTH-11 a network failure does not leave the form stuck", async ({
    page,
    loginPage,
  }) => {
    // Arrange
    await page.route(`**${API_PATHS.jwtLogin}`, (route) => route.abort("failed"));
    await loginPage.goto();

    // Act
    await loginPage.username.fill("someone@example.test");
    await loginPage.password.fill("some-password");
    await loginPage.waitForCaptcha();
    await loginPage.submit.click();

    // Assert: the user can try again rather than staring at a dead button.
    await expect(loginPage.error).toBeVisible();
    await expect(loginPage.submit).toBeEnabled();
  });
});
