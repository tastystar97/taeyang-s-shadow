import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "tcb_session";

function secret() {
  return process.env.SESSION_SECRET || process.env.CONTROL_ACCESS_CODE || process.env.BRANCH_ACCESS_CODE || "";
}

function sign(value) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.get("cookie") || "").split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
  }));
}

export function playerAccessRequired() {
  return Boolean(process.env.BRANCH_ACCESS_CODE);
}

export function createSession(role) {
  const payload = Buffer.from(JSON.stringify({ role, exp: Date.now() + 1000 * 60 * 60 * 12 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function sessionCookie(token, request) {
  const url = new URL(request.url);
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=43200`;
}

export function clearSessionCookie(request) {
  const url = new URL(request.url);
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=0`;
}

export function validateCode(role, code) {
  const expected = role === "gm" ? process.env.CONTROL_ACCESS_CODE : process.env.BRANCH_ACCESS_CODE;
  if (!expected) return role === "player";
  return safeEqual(expected, code || "");
}

export function getSession(request) {
  if (!secret()) return playerAccessRequired() ? null : { role: "player", demo: true };
  const token = parseCookies(request)[COOKIE_NAME];
  if (!token) return playerAccessRequired() ? null : { role: "player", demo: true };
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.exp < Date.now() || !["player", "gm"].includes(data.role)) return null;
    return data;
  } catch {
    return null;
  }
}

export function requireSession(request, role = "player") {
  const session = getSession(request);
  if (!session || (role === "gm" && session.role !== "gm")) return null;
  return session;
}
