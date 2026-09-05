import { requireSession, isSameOriginRequest } from '../lib/auth.mjs';
import { readState, writeState } from '../lib/store.mjs';
import { isPublicCityDocument, normalizeState, projectState } from '../lib/permissions.mjs';
import { InputError } from '../lib/upload-core.mjs';

const TYPES = new Set(['personnel', 'documents', 'evidence', 'cases']);
const ROLES = new Set(['director', 'agent']);

function parseBody(raw) {
  let body;
  try { body = JSON.parse(raw); } catch { throw new InputError('일괄 공개 요청을 확인하세요.'); }
  if (!body || Array.isArray(body) || Object.keys(body).some(key => !['revision', 'type', 'ids', 'audience'].includes(key))) throw new InputError('지원하지 않는 일괄 공개 요청입니다.');
  if (!Number.isInteger(body.revision)) throw new InputError('상태 버전을 확인하세요.');
  if (!TYPES.has(body.type)) throw new InputError('공개 대상을 변경할 자료 종류를 확인하세요.');
  if (!Array.isArray(body.ids) || body.ids.length < 1 || body.ids.length > 150 || body.ids.some(id => typeof id !== 'string' || !id || id.length > 120) || new Set(body.ids).size !== body.ids.length) throw new InputError('서로 다른 자료를 1건 이상 150건 이하로 선택하세요.');
  if (!Array.isArray(body.audience) || body.audience.length > 2 || new Set(body.audience).size !== body.audience.length || body.audience.some(role => !ROLES.has(role))) throw new InputError('공개 대상 역할을 확인하세요.');
  return body;
}

export function createPublicationHandler({ read = readState, write = writeState } = {}) {
  return async request => {
    const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
    const session = requireSession(request);
    if (!session) return json({ error: '인증이 필요합니다.' }, 401);
    if (session.role !== 'gm') return json({ error: '관제 권한이 필요합니다.' }, 403);
    if (request.method !== 'POST') return json({ error: '허용되지 않은 요청입니다.' }, 405);
    if (!isSameOriginRequest(request) || request.headers.has('x-tcb-preview')) return json({ error: '읽기 전용이거나 허용되지 않은 출처입니다.' }, 403);
    try {
      const raw = await request.text();
      if (Buffer.byteLength(raw) > 30000) throw new InputError('일괄 공개 요청이 너무 큽니다.', 413);
      const body = parseBody(raw);
      const original = await read();
      const state = normalizeState(original);
      if (body.revision !== state.revision) return json({ error: '다른 단말에서 변경되었습니다. 최신 상태를 확인하세요.', state: projectState(state, 'gm') }, 409);
      const records = body.ids.map(id => state[body.type].find(record => record.id === id));
      if (records.some(record => !record)) throw new InputError('선택한 자료 중 찾을 수 없는 항목이 있습니다.', 404);
      if (body.type === 'documents' && records.some(record => isPublicCityDocument(record.id))) throw new InputError('CITY NET 문서는 전체 공개 고정이라 변경할 수 없습니다.', 422);
      const now = new Date().toISOString();
      for (const record of records) { record.audience = [...body.audience]; record.updatedAt = now; }
      state.activity.unshift({ id: crypto.randomUUID(), at: now, action: body.audience.length ? 'BULK_AUDIENCE_CHANGED' : 'BULK_UNPUBLISHED', detail: `${body.type} ${records.length}건` });
      state.activity = state.activity.slice(0, 60);
      state.revision += 1;
      if (await write(state, original) === false) return json({ error: '다른 단말에서 변경되었습니다. 최신 상태를 확인하세요.', state: projectState(await read(), 'gm') }, 409);
      return json({ changed: records.length, state: projectState(state, 'gm') });
    } catch (error) {
      return json({ error: error instanceof InputError ? error.message : '일괄 공개 상태를 저장하지 못했습니다.' }, error instanceof InputError ? error.status : 503);
    }
  };
}

export default createPublicationHandler();
