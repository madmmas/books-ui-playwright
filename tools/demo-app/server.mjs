/**
 * Demo app for verifying the UI harness: serves a login page, a home page and
 * a stand-in auth API from one origin.
 *
 * NOT THE PRODUCT. A green run against this app proves the tests, page objects
 * and fixtures work; it proves nothing about the real Books web app. CI points
 * WEB_BASE_URL at a real deployment.
 */
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.DEMO_APP_PORT ?? 3000);
const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), "public");
const HMAC_SECRET = "demo-altcha-secret";

const USERS = new Map([
  [
    (process.env.BUYER_USERNAME ?? "buyer@example.com").toLowerCase(),
    {
      id: "usr_" + randomUUID(),
      password: process.env.BUYER_PASSWORD ?? "Password123!",
      role: "user",
    },
  ],
]);

const usedChallenges = new Set();

const sign = (value) => createHmac("sha256", HMAC_SECRET).update(value).digest("hex");

function makeChallenge() {
  const salt = randomBytes(12).toString("hex");
  const number = Math.floor(Math.random() * 500);
  const challenge = createHash("sha256").update(`${salt}${number}`).digest("hex");
  return { algorithm: "SHA-256", challenge, salt, signature: sign(challenge), maxnumber: 50_000 };
}

function verifyAltcha(encoded) {
  if (typeof encoded !== "string" || encoded.length === 0) return "captcha_required";
  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  } catch {
    return "captcha_invalid";
  }
  const { algorithm, challenge, number, salt, signature } = payload ?? {};
  if (algorithm !== "SHA-256" || typeof challenge !== "string" || typeof salt !== "string") {
    return "captcha_invalid";
  }
  const expected = Buffer.from(sign(challenge));
  const given = Buffer.from(String(signature ?? ""));
  if (expected.length !== given.length || !timingSafeEqual(expected, given))
    return "captcha_invalid";
  if (createHash("sha256").update(`${salt}${number}`).digest("hex") !== challenge) {
    return "captcha_invalid";
  }
  if (usedChallenges.has(challenge)) return "captcha_invalid";
  usedChallenges.add(challenge);
  return null;
}

function jwt(claims) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${header}.${body}.${sign(`${header}.${body}`).slice(0, 43)}`;
}

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

async function sendHtml(res, file) {
  try {
    const html = await readFile(join(PUBLIC_DIR, file), "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(html);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}

function handleLogin(body, res) {
  const { username, password, altcha } = body ?? {};

  const captchaError = verifyAltcha(altcha);
  if (captchaError) {
    return sendJson(res, 400, { code: captchaError, message: "Captcha verification failed" });
  }
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return sendJson(res, 400, {
      code: "validation_error",
      message: "username and password are required",
    });
  }

  const user = USERS.get(username.trim().toLowerCase());
  if (!user || user.password !== password) {
    return sendJson(res, 401, {
      code: "invalid_credentials",
      message: "Invalid username or password",
    });
  }

  const now = Math.floor(Date.now() / 1000);
  return sendJson(res, 200, {
    accessToken: jwt({ sub: user.id, iat: now, exp: now + 900, role: user.role }),
    refreshToken: randomBytes(32).toString("hex"),
    tokenType: "Bearer",
    user: { id: user.id, username: username.trim().toLowerCase(), role: user.role },
  });
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (req.method === "GET") {
    if (url.pathname === "/" || url.pathname === "/login") return void sendHtml(res, "login.html");
    if (url.pathname === "/home") return void sendHtml(res, "home.html");
    if (url.pathname === "/health") return sendJson(res, 200, { status: "ok" });
    if (url.pathname === "/favicon.ico") {
      res.writeHead(204);
      return res.end();
    }
    if (url.pathname === "/auth/altcha/challenge") return sendJson(res, 200, makeChallenge());
  }

  if (req.method === "POST" && url.pathname === "/auth/jwt/login") {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        handleLogin(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"), res);
      } catch {
        sendJson(res, 400, { code: "validation_error", message: "Body is not valid JSON" });
      }
    });
    return;
  }

  return sendJson(res, 404, { code: "not_found", message: "Unknown endpoint" });
});

server.listen(PORT, () => {
  process.stdout.write(`demo Books web app on http://localhost:${PORT}\n`);
});
