import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getStore } from '@netlify/blobs';
import { PERSONNEL, STATIC_EVIDENCE } from './catalog.mjs';
import { uploadStore } from './uploads.mjs';
import { defaultState } from './default-state.mjs';
import { normalizeState, canReadResource } from './permissions.mjs';
export const STATIC_FILES = [
  ...defaultState.documents.map(r => ({ type: 'documents', id: r.id, path: r.url })),
  ...PERSONNEL.map(r => ({ type: 'personnel', id: r.id, path: r.image })),
  ...STATIC_EVIDENCE.map(r => ({ type: 'evidence', id: r.id, path: r.src })),
  { type: 'support', id: 'operation-image', path: '/media/evidence/taeyang-shadow-main.webp' },
  { type: 'documents', id: 'city-locations', path: '/media/evidence/taeyang-city-view.webp' },
  { type: 'signature', id: 'director-signature', path: '/media/signatures/choi-youngho-fitted.png' }
];
export function resolveFile(input, role, { id, type, path, asset, fileId } = {}) {
  const state = normalizeState(input);
  if (type==='personnel' && !path && !asset) {
    const person=state.personnel.find(p=>p.id===id);
    if(!person || !canReadResource(state,'personnel',id,role))return null;
    const requested=fileId || person.portraitFileId;
    if(requested) {
      if(![person.portraitFileId,person.recordFileId].includes(requested))return null;
      const file=state.files[requested];
      return file && file.ownerType==='personnel' && file.ownerId===id ? {id,type,storage:'upload',key:'body/'+requested,contentType:file.contentType} : null;
    }
  }
  if(type==='documents' && !path && !asset) {
    const doc=state.documents.find(d=>d.id===id);
    if(!doc || !canReadResource(state,'documents',id,role))return null;
    if(doc.fileId) {
      if(fileId && fileId!==doc.fileId)return null;
      const file=state.files[doc.fileId];
      return file && file.ownerType==='documents' && file.ownerId===id ? {id,type,storage:'upload',key:'body/'+doc.fileId,contentType:file.contentType} : null;
    }
  }
  if (fileId) return null;
  if (asset) {
    if (asset !== 'signature' || type !== 'documents' || !canReadResource(state, 'documents', id, role)) return null;
    const signed = Object.values(state.archiveEntries[id]?.signatures || {}).includes('최영호');
    if (role === 'agent' && !signed) return null;
    return {...STATIC_FILES.find(file => file.type === 'signature'), storage:'static'};
  }
  let entry;
  if (path) entry = STATIC_FILES.find(f => f.path === path);
  else entry = STATIC_FILES.find(f => f.id === id && (!type || f.type === type));
  if (entry) {
    if(entry.type==='documents' && entry.path.endsWith('.html') && state.documents.find(d=>d.id===entry.id)?.fileId)return null;
    if(entry.type==='personnel') { const person=state.personnel.find(p=>p.id===entry.id); if(!person || person.portraitFileId || person.image!==entry.path)return null; }
    const allowed = entry.type === 'support' ? ['director','agent','gm'].includes(role)
      : entry.type === 'signature' ? ['director','gm'].includes(role)
      : canReadResource(state, entry.type, entry.id, role);
    return allowed ? { ...entry, storage: 'static' } : null;
  }
  if (!path && (!type || type === 'evidence') && canReadResource(state, 'evidence', id, role)) {
    const record = state.evidence.find(r => r.id === id);
    if (record.sourceKind === 'static') return null;
    return { type: 'evidence', id, storage: 'blob', contentType: record.contentType, key: record.fileKey || `image/${id}` };
  }
  return null;
}
export async function readProtectedFile(entry) {
  if(entry.storage==='upload') { const data=await uploadStore().get(entry.key,{type:'arrayBuffer'}); return data ? {data,contentType:entry.contentType,isUpload:true} : null; }
  if (entry.storage === 'blob') {
    const data = await getStore({ name: 'taeyang-city-evidence', consistency: 'strong' }).get(entry.key, { type: 'arrayBuffer' });
    return data ? { data, contentType: ['image/jpeg','image/png','image/webp','image/gif'].includes(entry.contentType) ? entry.contentType : 'application/octet-stream' } : null;
  }
  // Only the fixed server catalog chooses a disk path. Request input never becomes a path.
  const data = await readFile(resolve('public', '.' + entry.path));
  const contentType = entry.path.endsWith('.html') ? 'text/html; charset=utf-8' : entry.path.endsWith('.png') ? 'image/png' : 'image/webp';
  return { data, contentType };
}
