import { clearSessionCookie, createSession, getSession, playerAccessRequired, sessionCookie, validateCode } from "../lib/auth.mjs";

const json = (data, init = {}) => Response.json(data, { ...init, headers: { "Cache-Control": "no-store", ...(init.headers || {}) } });

export default async function handler(request) {
  if (request.method === "GET") {
    const session = getSession(request);
    return json({ authenticated: Boolean(session), role: session?.role || null, required: playerAccessRequired(), demo: Boolean(session?.demo) });
  }
  if (request.method === "DELETE") return json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie(request) } });
  if (request.method !== "POST") return json({ error: "허용되지 않은 요청입니다." }, { status: 405 });
  const body = await request.json().catch(() => ({}));
  const role = body.role === "gm" ? "gm" : "player";
  if (role === "gm" && !process.env.CONTROL_ACCESS_CODE) return json({ error: "CONTROL_ACCESS_CODE가 설정되지 않았습니다." }, { status: 503 });
  if (!validateCode(role, body.code)) return json({ error: "접근 코드가 올바르지 않습니다." }, { status: 401 });
  return json({ authenticated: true, role }, { headers: { "Set-Cookie": sessionCookie(createSession(role), request) } });
}
