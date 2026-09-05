import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "tcb_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const env = name => globalThis.Netlify?.env?.get(name) ?? process.env[name];
const SESSION_ROLES = ["director", "agent", "gm"];

function secret() {
  return env('SESSION_SECRET') || "";
}

function sign(value, signingSecret) {
  return createHmac("sha256", signingSecret).update(value).digest("base64url");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function normalizeAccessCode(value) {
  let normalized = String(value ?? "").normalize("NFKC").trim();
  const quoted =
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"));
  if (quoted && normalized.length >= 2) {
    normalized = normalized.slice(1, -1).trim();
  }
  return normalized;
}

function currentAuthConfig() {
  const configSecret = env('SESSION_SECRET') ?? "";
  const codes = {
    director: normalizeAccessCode(env('BRANCH_ACCESS_CODE')),
    agent: normalizeAccessCode(env('FIELD_ACCESS_CODE')),
    gm: normalizeAccessCode(env('CONTROL_ACCESS_CODE')),
  };
  const missing = Object.entries(codes).filter(([, value]) => !value).map(([role]) => role);
  const normalizedValues = Object.values(codes).filter(Boolean);
  const hasDuplicate = new Set(normalizedValues).size !== normalizedValues.length;
  const ok = Boolean(configSecret) && !missing.length && !hasDuplicate;
  const versions =
    ok
      ? Object.fromEntries(
          SESSION_ROLES.map((role) => [
            role,
            sign(`${role}:${codes[role]}`, configSecret),
          ]),
        )
      : null;
  return {
    ok,
    codes,
    versions,
    missing,
    hasDuplicate,
    secret: configSecret,
  };
}

function isSessionRole(value) {
  return SESSION_ROLES.includes(value);
}

function parseSessionToken(token) {
  const normalized = String(token ?? "").trim();
  const [payload, signature, ...rest] = normalized.split(".");
  if (!payload || !signature || rest.length) return null;
  return { payload, signature };
}

function parseCookies(request) {
  const raw = request.headers.get("cookie") || "";
  const map = new Map();
  for (const chunk of raw.split(";")) {
    const part = chunk.trim();
    if (!part) continue;
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    const value = part.slice(index + 1);
    try {
      map.set(name, decodeURIComponent(value));
    } catch {
      map.set(name, value);
    }
  }
  return Object.fromEntries(map);
}

export function authConfigured() {
  return currentAuthConfig().ok;
}

export function resolvePlayerRole(code) {
  if (!currentAuthConfig().ok) return null;
  const matchesDirector = validateCode("director", code);
  const matchesAgent = validateCode("agent", code);
  if (!matchesDirector && !matchesAgent) return null;
  return matchesDirector ? "director" : "agent";
}

function getSessionVersion(role) {
  const config = currentAuthConfig();
  if (!config.ok) return null;
  return config.versions?.[role] || null;
}

export function validateCode(role, code) {
  const config = currentAuthConfig();
  if (!config.ok) return false;
  if (!SESSION_ROLES.includes(role)) return false;
  return safeEqual(config.codes[role], normalizeAccessCode(code));
}

export function createSession(role) {
  if (!SESSION_ROLES.includes(role)) return null;
  const config = currentAuthConfig();
  if (!config.ok) return null;
  const version = getSessionVersion(role);
  if (!version) return null;
  const payload = Buffer.from(
    JSON.stringify({
      role,
      exp: Date.now() + SESSION_TTL_MS,
      v: version,
      i: 1,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload, config.secret)}`;
}

export function sessionCookie(token, request) {
  const url = new URL(request.url);
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

export function clearSessionCookie(request) {
  const url = new URL(request.url);
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=0`;
}

export function getSession(request) {
  const config = currentAuthConfig();
  if (!config.ok) return null;
  const parsed = parseSessionToken(parseCookies(request)[COOKIE_NAME]);
  if (!parsed) return null;
  if (!safeEqual(sign(parsed.payload, config.secret), parsed.signature)) return null;
  try {
    const data = JSON.parse(Buffer.from(parsed.payload, "base64url").toString("utf8"));
    if (typeof data?.exp !== "number" || !Number.isFinite(data.exp) || data.exp <= Date.now() || data.i !== 1) return null;
    if (!isSessionRole(data.role)) return null;
    if (data.v !== getSessionVersion(data.role)) return null;
    return data;
  } catch {
    return null;
  }
}

export function requireSession(request, role = null) {
  const session = getSession(request);
  if (!session) return null;
  if (!role) return session;
  const roleList = Array.isArray(role) ? role : [role];
  if (!roleList.every((item) => typeof item === "string")) return null;
  return roleList.includes(session.role) ? session : null;
}
export function playerAccessRequired() { return true; }
export function isSameOriginRequest(request) {
  if (request.headers.has('x-tcb-preview')) return false;
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
