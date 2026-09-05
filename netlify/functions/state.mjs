import { freshState } from '../lib/default-state.mjs';
import { requireSession, isSameOriginRequest } from '../lib/auth.mjs';
import { actionRole, applyAction } from '../lib/state-core.mjs';
import { normalizeState, projectState, authorizeAction } from '../lib/permissions.mjs';
import { readState, writeState } from '../lib/store.mjs';
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
export function createStateHandler({ read = readState, write = writeState } = {}) {
  return async request => {
    const session = requireSession(request);
    if (!session) return json({ error: '접근 인증이 필요합니다.' }, 401);
    if (!['GET','PATCH'].includes(request.method)) return json({ error: '허용되지 않은 요청입니다.' }, 405);
    if (request.method === 'PATCH' && !isSameOriginRequest(request)) return json({ error: '허용되지 않은 요청 출처입니다.' }, 403);
    try {
      const original = await read();
      let state = normalizeState(original);
      if (request.method === 'GET') return json({ state: projectState(state, session.role) });
      const body = await request.json().catch(() => null);
      if (!body || !actionRole(body.action)) return json({ error: '허용되지 않은 작업입니다.' }, 400);
      if (!authorizeAction(state, session.role, body.action, body.payload)) return json({ error: '이 작업에 필요한 권한이 없습니다.' }, 403);
      if (Number(body.revision) !== Number(state.revision)) return json({ error: '상태가 다른 단말에서 변경되었습니다.', state: projectState(state, session.role) }, 409);
      if (body.action === 'reset-state') {
        state = normalizeState(freshState());
        state.revision = Number(original.revision) + 1;
      } else {
        try { applyAction(state, body.action, body.payload, session.role); }
        catch { return json({ error: '요청한 변경을 적용할 수 없습니다. 대상과 상태를 확인하세요.' }, 400); }
      }
      const saved = await write(state, original);
      if (saved === false) return json({ error: '상태가 다른 단말에서 변경되었습니다.', state: projectState(await read(), session.role) }, 409);
      return json({ state: projectState(state, session.role) });
    } catch { return json({ error: '공유 기록을 불러오거나 저장하지 못했습니다. 다시 시도하세요.' }, 503); }
  };
}
export default createStateHandler();
