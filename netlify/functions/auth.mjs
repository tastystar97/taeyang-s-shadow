import {
  clearSessionCookie,
  isSameOriginRequest,
  createSession,
  getSession,
  authConfigured,
  resolvePlayerRole,
  sessionCookie,
  validateCode,
} from "../lib/auth.mjs";

const json = (data, init = {}) =>
  Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });

const isConfigError = () => !authConfigured();

export default async function handler(request) {
  if (['POST','DELETE'].includes(request.method) && !isSameOriginRequest(request)) return json({ error: '허용되지 않은 요청 출처입니다.' }, { status: 403 });
  if (request.method === "GET") {
    const session = getSession(request);
    return json({
      authenticated: Boolean(session),
      role: session?.role || null,
      required: true,
      demo: false,
      configured: authConfigured(),
    });
  }

  if (request.method === "DELETE") {
    return json({ ok: true, configured: authConfigured() }, { headers: { "Set-Cookie": clearSessionCookie(request) } });
  }

  if (request.method !== "POST") {
    return json({ error: "허용되지 않은 요청입니다." }, { status: 405 });
  }

  if (isConfigError()) {
    return json({ error: "인증 설정이 유효하지 않습니다." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const code = body?.code;
  const requestedRole = body?.role === "gm" ? "gm" : "player";

  let role = null;
  if (requestedRole === "gm") {
    if (!validateCode("gm", code)) {
      return json({ error: "접근 코드가 올바르지 않습니다." }, { status: 401 });
    }
    role = "gm";
  } else {
    role = resolvePlayerRole(code);
    if (!role) {
      return json({ error: "접근 코드가 올바르지 않습니다." }, { status: 401 });
    }
  }

  const session = createSession(role);
  if (!session) {
    return json({ error: "인증 세션을 만들지 못했습니다." }, { status: 503 });
  }

  return json({ authenticated: true, role }, { headers: { "Set-Cookie": sessionCookie(session, request) } });
}