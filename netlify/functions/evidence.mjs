import { getStore } from '@netlify/blobs';
import { requireSession, isSameOriginRequest } from '../lib/auth.mjs';
import { applyAction } from '../lib/state-core.mjs';
import { normalizeState, projectState } from '../lib/permissions.mjs';
import { readState, writeState } from '../lib/store.mjs';
import { createFilesHandler } from './files.mjs';
const ALLOWED_TYPES = new Set(['image/jpeg','image/png','image/webp','image/gif']);
const MAX_BYTES = 4 * 1024 * 1024;
const evidenceStore = () => getStore({ name: 'taeyang-city-evidence', consistency: 'strong' });
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
const getFile = createFilesHandler();
export default async function handler(request) {
  const session = requireSession(request);
  if (!session) return json({ error: '접근 인증이 필요합니다.' }, 401);
  if (request.method === 'GET' || request.method === 'HEAD') {
    const url = new URL(request.url); url.searchParams.set('type','evidence'); url.searchParams.delete('path');
    return getFile(new Request(url, request));
  }
  if (!['POST','PATCH','DELETE'].includes(request.method)) return json({ error: '허용되지 않은 요청입니다.' }, 405);
  if (session.role !== 'gm' || !isSameOriginRequest(request)) return json({ error: '관제 권한이 필요합니다.' }, 403);
  try {
    const original = await readState();
    const state = normalizeState(original);
    let body, image, hasImage;
    if (request.method === 'DELETE') body = await request.json().catch(() => ({}));
    else {
      const form = await request.formData().catch(() => null);
      if (!form) return json({ error: '등록 데이터를 읽을 수 없습니다.' }, 400);
      body = Object.fromEntries(form);
      image = form.get('image');
      hasImage = Boolean(image && typeof image.arrayBuffer === 'function' && image.size > 0);
      if (request.method === 'POST' && !hasImage) return json({ error: '사진 파일을 선택하세요.' }, 400);
      if (hasImage && (!ALLOWED_TYPES.has(image.type) || image.size > MAX_BYTES)) return json({ error: 'JPG, PNG, WEBP, GIF 파일을 4MiB 이하로 등록하세요.' }, 400);
      if (!String(body.title || '').trim()) return json({ error: '기록 제목이 필요합니다.' }, 400);
    }
    if (Number(body.revision) !== Number(state.revision)) return json({ error: '다른 단말에서 상태가 변경되었습니다.', state: projectState(state, 'gm') }, 409);
    const id = request.method === 'POST' ? crypto.randomUUID() : String(body.id || '').slice(0,80);
    const existing = state.evidence.find(r => r.id === id);
    if (request.method !== 'POST' && (!existing || existing.sourceKind === 'static')) return json({ error: '수정할 업로드 기록을 찾을 수 없습니다.' }, 404);
    if (request.method === 'DELETE') applyAction(state, 'delete-evidence', { id });
    else {
      const key = hasImage ? `image/${id}/${crypto.randomUUID()}` : existing.fileKey;
      if (hasImage) await evidenceStore().set(key, await image.arrayBuffer(), { metadata: { contentType: image.type } });
      applyAction(state, request.method === 'POST' ? 'add-evidence' : 'update-evidence', { evidence: {
        ...body, id, fileName: hasImage ? image.name : existing.fileName,
        contentType: hasImage ? image.type : existing.contentType, createdAt: existing?.createdAt
      } });
      const record = state.evidence.find(r => r.id === id);
      if (key) record.fileKey = key;
      if (!existing) record.audience = [];
    }
    if (await writeState(state, original) === false) return json({ error: '다른 단말에서 상태가 변경되었습니다.', state: projectState(await readState(), 'gm') }, 409);
    // Old blobs remain for recovery; deleting first could break the currently published reference.
    return json({ state: projectState(state, 'gm') });
  } catch { return json({ error: '증거 기록을 저장하지 못했습니다. 다시 시도하세요.' }, 503); }
}
