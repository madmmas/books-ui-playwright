import { config } from "./config.js";

/** Routes in the web app. Override with LOGIN_PATH / HOME_PATH when the live app differs. */
export const ROUTES = {
  login: config.loginPath,
  home: config.homePath,
  protected: config.protectedPath,
} as const;

/** API paths the UI calls, used with page.waitForResponse and page.route. */
export const API_PATHS = {
  jwtLogin: "/auth/jwt/login",
} as const;

/**
 * Test hooks the frontend exposes. Assertions target these rather than visible
 * copy, so that a UX wording change does not break the suite.
 */
export const TEST_IDS = {
  loginForm: "login-form",
  loginUsername: "login-username",
  loginPassword: "login-password",
  loginSubmit: "login-submit",
  loginError: "login-error",
  homeRoot: "home-root",
} as const;

/** Error codes the API returns and the page surfaces via data-error-code. */
export const ERROR_CODES = {
  invalidCredentials: "invalid_credentials",
  validationError: "validation_error",
  captchaRequired: "captcha_required",
} as const;

export const TIMEOUTS = {
  /** Proof-of-work in the browser can take a few seconds on a slow runner. */
  captcha: 20_000,
} as const;
