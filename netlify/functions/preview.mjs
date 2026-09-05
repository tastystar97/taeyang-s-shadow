import {previewState} from '../lib/preview-view.mjs';
import { requireSession } from '../lib/auth.mjs';
import { projectState } from '../lib/permissions.mjs';
import { readState } from '../lib/store.mjs';
export function createPreviewHandler({ read = readState } = {}) {
  return async request => {
    const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
    const json = (data, status = 200) => Response.json(data, { status, headers });
    const session = requireSession(request);
    if (!session) return json({ error: '접근 인증이 필요합니다.' }, 401);
    if (session.role !== 'gm') return json({ error: '관제 권한이 필요합니다.' }, 403);
    if (request.method !== 'GET') return json({ error: '미리보기는 읽기 전용입니다.' }, 405);
    const role = new URL(request.url).searchParams.get('role');
    if (!['director','agent'].includes(role)) return json({ error: '미리보기 역할을 확인하세요.' }, 400);
    try { return json({ state: previewState(projectState(await read(), role),role), preview: true }); }
    catch { return json({ error: '미리보기 기록을 불러오지 못했습니다.' }, 503); }
  };
}
export default createPreviewHandler();
