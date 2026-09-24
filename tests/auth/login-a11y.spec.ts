import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import { config } from "../../src/config.js";
import { expect, test } from "../fixtures.js";

/** The live page has header links before the form. Tab until `target` is the active element. */
async function tabUntilFocused(page: Page, target: Locator, maxTabs = 16): Promise<void> {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  await expect(target).toBeFocused();
}

/**
 * Accessibility of the login form and its error state.
 *
 * The role="alert" check matters most: without it a screen-reader user submits
 * the form, the login fails, and they hear nothing at all.
 */
test.describe("Login accessibility", () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  // Frontpage: the "or" divider (text-slate-400 on white) fails WCAG 1.4.3 contrast.
  test.fixme(
    "UI-A11Y-01 login page has no WCAG A or AA violations",
    { tag: ["@a11y"] },
    async ({ page, loginPage }) => {
      // Arrange
      await loginPage.waitForCaptcha();

      // Act
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

      // Assert
      expect(
        results.violations,
        results.violations.map((v) => `${v.id}: ${v.help}`).join("\n"),
      ).toEqual([]);
    },
  );

  // Frontpage: the error is a plain <p>. Screen readers need role="alert".
  test.fixme(
    "UI-A11Y-02 the login error is announced to screen readers",
    { tag: ["@a11y"] },
    async ({ page, loginPage }) => {
      // Act
      await loginPage.login(config.buyer.username, "definitely-not-it");

      // Assert
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("alert")).toHaveText(/invalid/i);
    },
  );

  // Frontpage: error has neither data-testid="login-error" nor role="alert".
  test.fixme(
    "UI-A11Y-03 the error state has no accessibility violations",
    { tag: ["@a11y"] },
    async ({ page, loginPage }) => {
      // Arrange
      await loginPage.login(config.buyer.username, "definitely-not-it");
      await expect(loginPage.error).toBeVisible();

      // Act
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

      // Assert
      expect(
        results.violations,
        results.violations.map((v) => `${v.id}: ${v.help}`).join("\n"),
      ).toEqual([]);
    },
  );

  test(
    "UI-A11Y-04 the form is usable with the keyboard alone",
    { tag: ["@a11y"] },
    async ({ page, loginPage }) => {
      // Act: tab through the header chrome, then through the form.
      await tabUntilFocused(page, loginPage.username);
      await expect(loginPage.username).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(loginPage.password).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(loginPage.submit).toBeFocused();
    },
  );
});
