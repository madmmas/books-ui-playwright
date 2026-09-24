import AxeBuilder from "@axe-core/playwright";
import { config } from "../../src/config.js";
import { expect, test } from "../fixtures.js";

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

  test(
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

  test(
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

  test(
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
      // Act: tab from the top of the page to each control in turn.
      await page.keyboard.press("Tab");
      await expect(loginPage.username).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(loginPage.password).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(loginPage.submit).toBeFocused();
    },
  );
});
