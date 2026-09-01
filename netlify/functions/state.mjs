import { freshState } from "../lib/default-state.mjs";
import { requireSession } from "../lib/auth.mjs";
import { actionRole, applyAction } from "../lib/state-core.mjs";
import { readState, writeState } from "../lib/store.mjs";

const json = (data, init = {}) => Response.json(data, { ...init, headers: { "Cache-Control": "no-store", ...(init.headers || {}) } });

export default async function handler(request) {
  const player = requireSession(request, "player");
  if (!player) return json({ error: "접근 인증이 필요합니다." }, { status: 401 });
  if (request.method === "GET") return json({ state: await readState() });
  if (request.method !== "PATCH") return json({ error: "허용되지 않은 요청입니다." }, { status: 405 });
  const body = await request.json().catch(() => ({}));
  const role = actionRole(body.action);
  if (!role) return json({ error: "허용되지 않은 작업입니다." }, { status: 400 });
  if (role === "gm" && !requireSession(request, "gm")) return json({ error: "관제 권한이 필요합니다." }, { status: 403 });
  let state = await readState();
  if (Number(body.revision) !== Number(state.revision)) return json({ error: "상태가 다른 단말에서 변경되었습니다.", state }, { status: 409 });
  if (body.action === "reset-state") state = freshState();
  else {
    try { applyAction(state, body.action, body.payload); }
    catch (error) { return json({ error: error.message }, { status: 400 }); }
  }
  await writeState(state);
  return json({ state });
}
