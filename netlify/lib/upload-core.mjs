import { createHash } from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const UPLOAD_TTL = 24 * 60 * 60 * 1000;
export const sha256 = data => createHash('sha256').update(data).digest('hex');
export class InputError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export function uploadedHeaders(type) {
  const headers = { 'Content-Type': type, 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'SAMEORIGIN' };
  if (type.startsWith('text/html')) headers['Content-Security-Policy'] = "sandbox; default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";
  return headers;
}
export async function limitedForm(request) {
  const limit = MAX_FILE_BYTES + 65536;
  if (Number(request.headers.get('content-length')) > limit) throw new InputError('파일은 4MiB 이하여야 합니다.', 413);
  const reader = request.body?.getReader(); if (!reader) throw new InputError('파일을 선택하세요.');
  const chunks = []; let size = 0; let oversized = false;
  while (true) { const {done,value}=await reader.read(); if(done)break; size+=value.byteLength; if(size>limit){oversized=true;chunks.length=0;} if(!oversized)chunks.push(value); }
  if(oversized)throw new InputError('파일은 4MiB 이하여야 합니다.',413);
  try { return await new Response(Buffer.concat(chunks), {headers:{'Content-Type':request.headers.get('content-type') || ''}}).formData(); }
  catch { throw new InputError('업로드 요청을 읽을 수 없습니다.'); }
}
export function inspectUpload(bytes, filename, slot) {
  const data = Buffer.from(bytes);
  if (!data.length || data.length > MAX_FILE_BYTES) throw new InputError('빈 파일 또는 4MiB를 넘는 파일은 등록할 수 없습니다.', 413);
  if (!['portrait','record','archive'].includes(slot)) throw new InputError('첨부 구분을 확인하세요.');
  const name = String(filename || '').split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,180);
  const ext = name.toLowerCase().split('.').pop();
  let type;
  if (data.length >= 24 && data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && data.toString('ascii',12,16)==='IHDR') type='image/png';
  else if (data.length>=4 && data[0]===255 && data[1]===216 && data[2]===255 && data.at(-2)===255 && data.at(-1)===217) type='image/jpeg';
  else if (data.length>=14 && ['GIF87a','GIF89a'].includes(data.toString('ascii',0,6))) type='image/gif';
  else if(data.length>=16 && data.toString('ascii',0,4)==='RIFF' && data.toString('ascii',8,12)==='WEBP') type='image/webp';
  else if(data.toString('ascii',0,5)==='%PDF-' && data.subarray(-1024).toString('ascii').includes('%%EOF')) type='application/pdf';
  const extensions = {'image/png':['png'],'image/jpeg':['jpg','jpeg'],'image/gif':['gif'],'image/webp':['webp'],'application/pdf':['pdf']};
  if (type) {
    if (!extensions[type].includes(ext)) throw new InputError('확장자와 실제 파일 형식이 다릅니다.');
    if (slot==='portrait' && !type.startsWith('image/')) throw new InputError('사원증에는 이미지 파일을 선택하세요.');
    return {data, name, contentType:type, bytes:data.length, sha256:sha256(data), sourceSha256:sha256(data), warnings:[]};
  }
  if (slot==='portrait' || !['html','htm'].includes(ext)) throw new InputError('HTML, PDF, JPG, PNG, WEBP, GIF 파일만 등록할 수 있습니다.');
  let html;
  try { html=new TextDecoder('utf-8',{fatal:true}).decode(data); } catch { throw new InputError('HTML을 UTF-8 인코딩으로 저장한 뒤 다시 선택하세요.'); }
  if (html.includes('\0') || !/<(?:!doctype\s+html|html|head|body|div|p|h[1-6]|table|article|section)\b/i.test(html)) throw new InputError('HTML 문서 형식을 확인하세요.');
  let dependencies=false;
  const cleaned=sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags,'html','head','body','title','style','img'],
    allowedAttributes: {'*':['class','id','style','title','lang','dir'],img:['src','alt','width','height'],td:['colspan','rowspan'],th:['colspan','rowspan','scope'],col:['span','width']},
    allowedSchemes:['data'], allowedSchemesByTag:{img:['data']}, allowProtocolRelative:false,
    allowVulnerableTags:true,
    nonTextTags:['script','textarea','option','iframe','object','embed','svg','math','template'],
    onOpenTag(tag,attrs) {
      if ((tag==='img' && attrs.src && !/^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(attrs.src)) || (tag==='img' && attrs.srcset) || (tag==='link' && attrs.href)) dependencies=true;
    },
    transformTags: { img(tag,attrs) { return {tagName:tag,attribs:{...attrs,src:/^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(attrs.src||'') ? attrs.src : ''}}; } }
  });
  if (dependencies || /@import\b|url\s*\(/i.test(cleaned)) throw new InputError('HTML의 외부·상대경로 이미지나 CSS를 포함할 수 없습니다. 이미지를 문서에 내장하고 외부 스타일 연결을 제거하세요.');
  const safe=Buffer.from('<!doctype html><meta charset="utf-8">'+cleaned);
  if (safe.length>MAX_FILE_BYTES) throw new InputError('변환한 HTML이 4MiB를 넘습니다.',413);
  return {data:safe,name,contentType:'text/html; charset=utf-8',bytes:safe.length,sha256:sha256(safe),sourceSha256:sha256(data),warnings:['HTML은 스크립트·입력폼·외부 연결을 제거한 읽기 전용 문서로 저장됩니다. 미리보기를 확인하세요.']};
}
