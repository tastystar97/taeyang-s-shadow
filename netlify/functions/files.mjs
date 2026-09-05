import {previewHTML} from '../lib/preview-view.mjs';
import { requireSession } from '../lib/auth.mjs';
import { uploadedHeaders } from '../lib/upload-core.mjs';
import { readState } from '../lib/store.mjs';
import { resolveFile, readProtectedFile } from '../lib/file-access.mjs';
export function createFilesHandler({ read = readState, readFile = readProtectedFile, preview = false } = {}) {
  return async request => {
    const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'same-origin' };
    const error = (message, status) => Response.json({ error: message }, { status, headers });
    const session = requireSession(request);
    if (!session) return error('접근 인증이 필요합니다.', 401);
    if (request.method !== 'GET' && request.method !== 'HEAD') return error('원본 열람은 읽기 전용입니다.', 405);
    const url = new URL(request.url);
    let role = session.role;
    if (preview) {
      if (role !== 'gm') return error('관제 권한이 필요합니다.', 403);
      role = url.searchParams.get('role');
      if (!['director','agent'].includes(role)) return error('미리보기 역할을 확인하세요.', 400);
    }
    try {
      const path = url.searchParams.get('path') || (url.pathname.startsWith('/archive/') || url.pathname.startsWith('/media/') ? url.pathname : null);
      const state=await read();
      const entry = resolveFile(state, role, { id: url.searchParams.get('id'), type: url.searchParams.get('type'), path, asset: url.searchParams.get('asset'), fileId: url.searchParams.get('fileId') });
      if (!entry) return error('자료를 찾을 수 없습니다.', 404);
      const file = await readFile(entry);
      if (!file) return error('자료를 찾을 수 없습니다.', 404);
      if (file.isUpload) Object.assign(headers,uploadedHeaders(file.contentType));
      if (preview && file.contentType.startsWith('text/html')) {
        // The M5 preview client will render saved fields; never execute editing code here.
        headers['Content-Security-Policy'] = "sandbox; default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:";
      }
      let data = file.data;
      if(preview && !file.isUpload && file.contentType.startsWith('text/html'))data=previewHTML(Buffer.from(data).toString('utf8'),state,entry.id,role);
      if (!preview && !file.isUpload && file.contentType.startsWith('text/html')) data = Buffer.from(file.data).toString('utf8').replace('</body>', '<script type="module" src="/session-guard.js"></script></body>');
      return new Response(request.method === 'HEAD' ? null : data, { headers: { ...headers, 'Content-Type': file.contentType, 'Content-Disposition': 'inline' } });
    } catch { return error('자료 원본을 불러오지 못했습니다.', 503); }
  };
}
export default createFilesHandler();
