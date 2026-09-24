/** Environment configuration, validated once at import time. */

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

type TestEnv = "local" | "ci" | "staging" | "prod";

const TEST_ENVS: readonly TestEnv[] = ["local", "ci", "staging", "prod"];

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function asTestEnv(value: string): TestEnv {
  if (!TEST_ENVS.includes(value as TestEnv)) {
    throw new Error(`TEST_ENV must be one of ${TEST_ENVS.join(", ")} (got "${value}")`);
  }
  return value as TestEnv;
}

const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

export const config = {
  webBaseUrl: stripTrailingSlash(required("WEB_BASE_URL", "http://localhost:3000")),
  apiBaseUrl: stripTrailingSlash(required("API_BASE_URL", "http://localhost:3000")),
  env: asTestEnv(required("TEST_ENV", "local")),

  /** Paths in the web app. The demo app uses /login and /home; the live app uses /signin and /. */
  loginPath: required("LOGIN_PATH", "/login"),
  homePath: required("HOME_PATH", "/"),
  /** A signed-in-only page. Used to prove the guest redirect. Live app: /orders. */
  protectedPath: required("PROTECTED_PATH", "/orders"),

  /** Seeded account for the happy path. READ-ONLY: never mutate it in a test. */
  buyer: {
    username: required("BUYER_USERNAME", "buyer@example.com"),
    password: required("BUYER_PASSWORD", "Password123!"),
  },
} as const;
