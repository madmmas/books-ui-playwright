import { defineConfig, devices } from "@playwright/test";
import { config } from "./src/config.js";

/**
 * The full suite runs on Chromium; only @smoke runs on the other browsers and
 * on mobile. That catches browser-specific rendering without multiplying the
 * run time by four.
 *
 * Projects deliberately have no `dependencies`: a dependent project is SKIPPED
 * when its dependency fails, which would hide whole areas behind one unrelated
 * failure. CI orders the runs instead.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 3 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }], ["junit", { outputFile: "results/junit.xml" }]],
  use: {
    baseURL: config.webBaseUrl,
    testIdAttribute: "data-testid",
    // Playwright is headless unless this is false. Local runs open a window;
    // CI stays headless. Override any time with `--headed` or `--headed=false`.
    headless: !!process.env.CI,
    // Local nginx serves https://localhost with a self-signed cert.
    ignoreHTTPSErrors: !process.env.CI,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // { name: "firefox", use: { ...devices["Desktop Firefox"] }, grep: /@smoke/ },
    // { name: "webkit", use: { ...devices["Desktop Safari"] }, grep: /@smoke/ },
    // { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@smoke/ },
  ],
});
