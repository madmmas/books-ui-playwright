import { test as base, expect } from "@playwright/test";
import { HomePage } from "../src/pages/home.page.js";
import { LoginPage } from "../src/pages/login.page.js";

/**
 * Page-object fixtures.
 *
 * `loginPage` does NOT navigate: hiding a navigation inside a fixture makes the
 * Arrange step invisible in the test. Tests call `goto()` themselves.
 *
 * There is deliberately no "fresh user" fixture yet. Every test here is
 * read-only with respect to account state. The moment a test drives
 * failed-attempt counters or lockout, add a disposable-user fixture backed by a
 * test-only API hook -- see README, "Adding state-changing tests".
 */
interface Fixtures {
  loginPage: LoginPage;
  homePage: HomePage;
}

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
});

export { expect };
