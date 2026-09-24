import { expect, type Locator, type Page, type Response } from "@playwright/test";
import { API_PATHS, ROUTES, TEST_IDS, TIMEOUTS } from "../constants.js";

/**
 * Login page object.
 *
 * Holds locators, actions and readiness waits. Assertions about outcomes live
 * in the tests, so a test reads as one behaviour rather than being spread
 * across the page object.
 *
 * Locator priority: role and label first (what a user perceives), falling back
 * to data-testid where the accessible name is not stable. Never CSS classes.
 */
export class LoginPage {
  readonly form: Locator;
  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;
  private readonly captchaVerified: Locator;

  constructor(readonly page: Page) {
    this.form = page.locator("form").filter({ has: page.getByLabel("Username") });
    this.username = page.getByLabel("Username");
    this.password = page.getByLabel("Password");
    this.submit = page.getByRole("button", { name: "Sign in" });
    this.error = page.getByTestId(TEST_IDS.loginError).or(page.getByRole("alert"));
    this.captchaVerified = page.locator("[data-altcha-state='verified'], altcha-widget");
  }

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.login);
    await expect(this.username).toBeVisible();
    await expect(this.form).toBeVisible();
  }

  /**
   * Waits for the ALTCHA widget to finish its proof-of-work.
   * No-ops when the live app has captcha disabled (widget not in the DOM).
   */
  async waitForCaptcha(): Promise<void> {
    const widget = this.page.locator("altcha-widget, [data-altcha-state]");
    if ((await widget.count()) === 0) return;
    await expect(this.captchaVerified).toBeAttached({ timeout: TIMEOUTS.captcha });
  }

  /**
   * Fills the form, submits, and returns the login response.
   *
   * Returning the response lets a test assert on BOTH layers: what the API
   * answered and what the user then sees. When a UI test fails, that is the
   * difference between "the backend is wrong" and "the page is wrong".
   */
  async login(username: string, password: string): Promise<Response> {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.waitForCaptcha();

    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes(API_PATHS.jwtLogin) && res.request().method() === "POST",
    );
    await this.submit.click();
    return responsePromise;
  }

  /** The machine-readable error code, which survives copy changes. */
  async errorCode(): Promise<string | null> {
    return this.error.getAttribute("data-error-code");
  }

  /** Tokens the app persisted in web storage, if any. */
  async storedTokens(): Promise<string> {
    return this.page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  }
}
