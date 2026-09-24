import { ROUTES } from "../../src/constants.js";
import { expect, test } from "../fixtures.js";

/**
 * Runs first in CI. If the web app is not serving, this fails in seconds
 * instead of leaving every login test to time out.
 */
test.describe("App health", () => {
  test("UI-HEALTH-01 login page loads", { tag: ["@health", "@smoke"] }, async ({ loginPage }) => {
    // Act
    await loginPage.goto();

    // Assert
    await expect(loginPage.username).toBeVisible();
    await expect(loginPage.password).toBeVisible();
    await expect(loginPage.submit).toBeEnabled();
  });

  test(
    "UI-HEALTH-02 page loads without JavaScript or resource errors",
    {
      tag: ["@health"],
    },
    async ({ page, loginPage }) => {
      // Arrange: start listening BEFORE navigating, or errors during load are missed.
      const jsErrors: string[] = [];
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];

      page.on("pageerror", (err) => jsErrors.push(err.message));
      page.on("console", (msg) => {
        // "Failed to load resource" duplicates what the response listener below
        // reports, with no URL attached. Drop it and judge by the response.
        if (msg.type() === "error" && !/failed to load resource/i.test(msg.text())) {
          consoleErrors.push(msg.text());
        }
      });
      page.on("response", (res) => {
        // A missing favicon is cosmetic and not worth failing a health check on.
        if (res.status() >= 400 && !res.url().endsWith("/favicon.ico")) {
          failedRequests.push(`${res.status()} ${res.url()}`);
        }
      });

      // Act
      await loginPage.goto();
      await loginPage.waitForCaptcha();

      // Assert
      expect(jsErrors, "uncaught JavaScript errors").toEqual([]);
      expect(consoleErrors, "console errors").toEqual([]);
      expect(failedRequests, "requests that failed during load").toEqual([]);
    },
  );

  test(
    "UI-HEALTH-03 unauthenticated visit to a protected page redirects to login",
    {
      tag: ["@security"],
    },
    async ({ page }) => {
      // Act: the catalog home is public; /orders (and /settings) require a session.
      await page.goto(ROUTES.protected);

      // Assert
      await expect(page).toHaveURL(new RegExp(`${ROUTES.login}`));
    },
  );
});
