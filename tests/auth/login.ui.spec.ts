import { config } from "../../src/config.js";
import { ERROR_CODES, ROUTES } from "../../src/constants.js";
import { expect, test } from "../fixtures.js";

/**
 * Browser journeys for JWT login.
 *
 * The API suite (books-api-tests) owns the rules. These tests answer a narrower
 * question: does the page do the right thing with what the API returns?
 */
test.describe("Login UI", () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test(
    "UI-AUTH-01 valid credentials sign the user in",
    { tag: ["@smoke"] },
    async ({ loginPage, homePage }) => {
      // Act
      const response = await loginPage.login(config.buyer.username, config.buyer.password);

      // Assert: both layers -- what the API answered, and what the user sees.
      expect(response.status()).toBe(200);
      await homePage.expectLoaded();
    },
  );

  test(
    "UI-AUTH-02 wrong password shows a generic error",
    { tag: ["@smoke", "@security"] },
    async ({ page, loginPage }) => {
      // Act
      const response = await loginPage.login(config.buyer.username, "definitely-not-it");

      // Assert
      expect(response.status()).toBe(401);
      await expect(loginPage.error).toBeVisible();
      expect(await loginPage.errorCode()).toBe(ERROR_CODES.invalidCredentials);
      await expect(page).toHaveURL(new RegExp(ROUTES.login));
    },
  );

  test(
    "UI-AUTH-03 the error never reveals whether the account exists",
    {
      tag: ["@security"],
    },
    async ({ loginPage }) => {
      // Arrange
      const unknown = `ghost-${crypto.randomUUID()}@example.test`;

      // Act
      await loginPage.login(config.buyer.username, "definitely-not-it");
      const realUserMessage = (await loginPage.error.innerText()).trim();

      await loginPage.goto();
      await loginPage.login(unknown, "definitely-not-it");
      const unknownUserMessage = (await loginPage.error.innerText()).trim();

      // Assert
      expect(unknownUserMessage).toBe(realUserMessage);
    },
  );

  test(
    "UI-AUTH-04 the error never hints at remaining attempts",
    {
      tag: ["@security"],
    },
    async ({ loginPage }) => {
      // Act
      await loginPage.login(config.buyer.username, "definitely-not-it");

      // Assert
      await expect(loginPage.error).not.toHaveText(/attempt|remaining|tries|left/i);
    },
  );

  test(
    "UI-AUTH-05 no tokens are stored after a failed login",
    {
      tag: ["@security"],
    },
    async ({ loginPage }) => {
      // Act
      await loginPage.login(config.buyer.username, "definitely-not-it");

      // Assert
      await expect(loginPage.error).toBeVisible();
      expect(await loginPage.storedTokens()).not.toMatch(/accessToken|refreshToken/);
    },
  );

  test(
    "UI-AUTH-06 the password is never sent in the URL",
    {
      tag: ["@security"],
    },
    async ({ loginPage }) => {
      // Act
      const response = await loginPage.login(config.buyer.username, config.buyer.password);

      // Assert: a GET form or a query-string password would leak into logs,
      // history and referrer headers.
      expect(response.request().method()).toBe("POST");
      expect(response.url()).not.toContain(config.buyer.password);
    },
  );

  test("UI-AUTH-07 empty fields are rejected without a request", async ({ page, loginPage }) => {
    // Arrange: fail the test if the page sends a request it should have blocked.
    let requestSent = false;
    page.on("request", (req) => {
      if (req.url().includes("/auth/jwt/login")) requestSent = true;
    });

    // Act
    await loginPage.waitForCaptcha();
    await loginPage.submit.click();

    // Assert: client-side validation keeps the user on the form.
    await expect(loginPage.form).toBeVisible();
    expect(requestSent).toBe(false);
  });

  test("UI-AUTH-08 a second attempt after a failure can succeed", async ({
    loginPage,
    homePage,
  }) => {
    // Arrange: a stale captcha must not block the retry.
    await loginPage.login(config.buyer.username, "definitely-not-it");
    await expect(loginPage.error).toBeVisible();

    // Act
    const response = await loginPage.login(config.buyer.username, config.buyer.password);

    // Assert
    expect(response.status()).toBe(200);
    await homePage.expectLoaded();
  });
});
