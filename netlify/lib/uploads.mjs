import { getStore } from '@netlify/blobs';
import { UPLOAD_TTL, sha256, InputError } from './upload-core.mjs';
export const uploadStore = () => getStore({name:'taeyang-city-files',consistency:'strong'});
export const currentFileIds = state => new Set([...(state.personnel || []).flatMap(p=>[p.portraitFileId,p.recordFileId]),...(state.documents || []).map(d=>d.fileId)].filter(Boolean));
export async function loadStagedFile(store, fileId, targetId, slot, state) {
  if(typeof fileId!=='string' || !/^[0-9a-f-]{36}$/.test(fileId)) throw new InputError('첨부 파일을 다시 선택하세요.');
  const manifest=await store.get('meta/'+fileId,{type:'json'});
  if(!manifest || manifest.cancelled || manifest.slot!==slot || (manifest.targetId && manifest.targetId!==targetId) || Date.now()>Date.parse(manifest.createdAt)+UPLOAD_TTL) throw new InputError('첨부 미리보기의 유효기간 또는 대상을 확인하세요. 파일을 다시 선택하세요.');
  if(currentFileIds(state).has(fileId)) throw new InputError('이미 저장한 첨부 파일입니다. 다시 선택하세요.');
  const bytes=await store.get('body/'+fileId,{type:'arrayBuffer'});
  if(!bytes || sha256(Buffer.from(bytes))!==manifest.sha256) throw new InputError('첨부 원본 확인에 실패했습니다. 다시 선택하세요.');
  return manifest;
}
export async function discardUpload(store, id, state) {
  if(currentFileIds(state).has(id)) return false;
  await store.delete('body/'+id); await store.delete('meta/'+id); return true;
}
