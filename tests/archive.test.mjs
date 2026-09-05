import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../netlify/lib/default-state.mjs';
import { normalizeState,projectState } from '../netlify/lib/permissions.mjs';
import { createSession } from '../netlify/lib/auth.mjs';
import { inspectUpload,MAX_FILE_BYTES,UPLOAD_TTL } from '../netlify/lib/upload-core.mjs';
import {createArchiveHandler} from '../netlify/functions/archive.mjs';
import {ARCHIVE_SCHEMAS} from '../netlify/lib/archive-schemas.mjs';
import {createStateHandler} from '../netlify/functions/state.mjs';
import { createPersonnelHandler } from '../netlify/functions/personnel.mjs';
import { createUploadsHandler } from '../netlify/functions/uploads.mjs';
import { createFilesHandler } from '../netlify/functions/files.mjs';
import { resolveFile } from '../netlify/lib/file-access.mjs';
process.env.SESSION_SECRET='m2-test-secret';
process.env.BRANCH_ACCESS_CODE='m2-director';
process.env.FIELD_ACCESS_CODE='m2-agent';
process.env.CONTROL_ACCESS_CODE='m2-gm';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64');
const data=(name='테스트 요원',employeeId='M2-001')=>({name,employeeId,position:'현장요원',qualifications:['조사']});
const req=(role,path,method='GET',body,headers={})=>new Request('https://branch.test'+path,{method,headers:{...(role?{cookie:'tcb_session='+createSession(role)}:{}),...(body && !(body instanceof FormData)?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});
function harness() {
  let state=normalizeState(freshState()); const values=new Map();let rejectWrite=false,writes=0;
  const storage={
    async get(key){const v=values.get(key);return v===undefined?null:Buffer.isBuffer(v)?Buffer.from(v):structuredClone(v);},
    async set(key,value){values.set(key,Buffer.from(value));},
    async setJSON(key,value){values.set(key,structuredClone(value));},
    async delete(key){values.delete(key);},
    async list({prefix}){return{blobs:[...values.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key}))};}
  };
  const read=async()=>structuredClone(state);
  const write=async(next,previous)=>{if(rejectWrite||state.revision!==previous.revision)return false;state=next;writes++;return next;};
  const archive=createArchiveHandler({read,write,store:()=>storage});
  const stateHandler=createStateHandler({read,write});
  const personnel=createPersonnelHandler({read,write,store:()=>storage});
  const upload=createUploadsHandler({read,store:()=>storage});
  const file=createFilesHandler({read,readFile:async entry=>({data:await storage.get(entry.key),contentType:entry.contentType,isUpload:true})});
  return{get state(){return state;},values,storage,personnel,archive,stateHandler,upload,file,get writes(){return writes;},reject(){rejectWrite=true;},
    async save(body,role='gm'){return personnel(req(role,'/api/personnel','POST',{action:'save',revision:state.revision,data:data(),...body}));},
    async stage(bytes=png,name='photo.png',slot='portrait',targetId=''){const form=new FormData();form.set('file',new File([bytes],name));form.set('slot',slot);if(targetId)form.set('targetId',targetId);return upload(req('gm','/api/uploads','POST',form));}
  };
}
const docData=(code='M3-001')=>({title:'현장 조사 기록',code,category:'사건 자료',detail:'공개 전 조사 요약',security:'CONFIDENTIAL'});
async function saveDoc(h,body={}){return h.archive(req('gm','/api/archive','POST',{action:'save',revision:h.state.revision,data:docData(),...body}));}
async function uploadDoc(h,targetId=''){const r=await h.stage(Buffer.from('<html><body><h1>조사 기록</h1><script>alert(1)</script></body></html>'),'record.html','archive',targetId);assert.equal(r.status,200);return(await r.json()).upload.id;}
async function audienceDoc(h,id,audience){return h.archive(req('gm','/api/archive','POST',{action:'audience',id,audience,revision:h.state.revision}));}
test('archive upload registers privately, projects safe metadata and retains all twelve originals',async()=>{
  const h=harness(),before=structuredClone(h.state.documents);const fileId=await uploadDoc(h);
  assert.equal(h.state.documents.length,12);assert.equal(resolveFile(h.state,'gm',{type:'documents',fileId,id:'pending'}),null);
  const r=await saveDoc(h,{fileId});assert.equal(r.status,200);const {id,state}=await r.json();
  assert.deepEqual(h.state.documents.slice(0,12),before);assert.equal(h.state.documents.length,13);
  assert.equal(projectState(h.state,'director').documents.length,12);assert.equal(projectState(h.state,'agent').documents.length,0);
  const doc=state.documents.find(d=>d.id===id);assert.equal(doc.attachment.name,'record.html');assert.equal(doc.managedTemplate,false);assert.equal(doc.editable,false);assert.equal(doc.fileId,undefined);
});
test('archive authorization, single-document mutation and duplicate document numbers are enforced',async()=>{
  const h=harness();for(const role of ['agent','director',null])assert.equal((await h.archive(req(role,'/api/archive','POST',{}))).status,role?403:401);
  assert.equal((await h.archive(req('gm','/api/archive','POST',{}, {origin:'https://evil.test'}))).status,403);
  assert.equal((await saveDoc(h,{audience:['agent']})).status,400);
  assert.equal((await saveDoc(h,{fileId:await uploadDoc(h),data:docData(' ＨＱ-ＫＲ/ＵＲＧ-２０４３-１７ ')})).status,422);
  assert.equal((await saveDoc(h)).status,422);
  assert.equal((await h.archive(req('gm','/api/archive','POST',{action:'audience',revision:h.state.revision,id:'p07',ids:['handover'],audience:['agent']}))).status,400);
  assert.equal(h.writes,0);
});
test('archive publication filters notices and case links without publishing adjacent resources',async()=>{
  const h=harness();const saved=await(await saveDoc(h,{fileId:await uploadDoc(h)})).json();const id=saved.id;
  // Local fixture through a validated state writer is not needed: projections accept snapshots.
  const state=structuredClone(h.state);state.cases=[{id:'case',audience:['agent'],links:[{type:'documents',id},{type:'documents',id:'p07'}]}];state.notices.push({id:'n',audience:['agent'],target:'archive',targetId:id,title:'새 단서'});
  assert.equal(projectState(state,'agent').cases[0].links.length,0);assert.equal(projectState(state,'agent').notices.length,0);
  state.documents.find(d=>d.id===id).audience=['agent'];assert.deepEqual(projectState(state,'agent').cases[0].links,[{type:'documents',id,order:0}]);assert.equal(projectState(state,'agent').notices.length,1);
  assert.equal((await audienceDoc(h,id,['agent'])).status,200);
  const projected=projectState(h.state,'agent');assert.equal(projected.documents.length,1);assert.equal(projected.documents[0].fileId,undefined);
  assert.ok(resolveFile(h.state,'agent',{type:'documents',id}));assert.equal(resolveFile(h.state,'director',{type:'documents',id}),null);
  await audienceDoc(h,id,[]);assert.equal(resolveFile(h.state,'agent',{type:'documents',id}),null);
});
test('replacement preserves document identity, metadata links and audience while invalidating previous file URLs',async()=>{
  const h=harness();const old=await uploadDoc(h);const {id}=await(await saveDoc(h,{fileId:old})).json();await audienceDoc(h,id,['agent']);
  const next=await uploadDoc(h,id);assert.equal((await saveDoc(h,{id,fileId:next})).status,200);const doc=h.state.documents.find(d=>d.id===id);assert.deepEqual(doc.audience,['agent']);
  assert.equal(resolveFile(h.state,'gm',{type:'documents',id,fileId:old}),null);assert.ok(resolveFile(h.state,'agent',{type:'documents',id,fileId:next}));
  const r=await h.file(req('agent','/api/files?type=documents&id='+id+'&fileId='+next));assert.equal(r.status,200);assert.match(r.headers.get('content-security-policy'),/sandbox/);assert.doesNotMatch(await r.text(),/<script|session-guard/);
});
test('static general documents can be replaced with IDs and alerts preserved, managed templates cannot',async()=>{
  const h=harness();const notices=structuredClone(h.state.notices);const doc=h.state.documents.find(d=>d.id==='kangjun-note');
  assert.equal((await saveDoc(h,{id:doc.id,data:docData(doc.code),fileId:await uploadDoc(h,doc.id)})).status,200);
  assert.deepEqual(h.state.notices,notices);assert.equal(resolveFile(h.state,'gm',{path:doc.url}),null);
  for(const id of Object.keys(ARCHIVE_SCHEMAS)){
    const original=h.state.documents.find(d=>d.id===id);
    assert.equal((await saveDoc(h,{id,data:docData(original.code),fileId:await uploadDoc(h,id)})).status,422);
    assert.equal(h.state.documents.find(d=>d.id===id).url,original.url);
  }
});
test('all five existing templates retain director editing and GM/agent read-only state after metadata changes',async()=>{
  const h=harness();
  for(const id of Object.keys(ARCHIVE_SCHEMAS)){
    const entry={id,content:{memo:'저장 내용'},signatures:{director:'최영호'}};
    const response=await h.stateHandler(req('director','/api/state','PATCH',{action:'save-archive-document',revision:h.state.revision,payload:{entry}}));assert.equal(response.status,200);
    const before=structuredClone(h.state.archiveEntries[id]),doc=h.state.documents.find(d=>d.id===id);
    assert.equal((await saveDoc(h,{id,data:docData(doc.code)})).status,200);await audienceDoc(h,id,['director','agent']);
    assert.deepEqual(h.state.archiveEntries[id],before);
    for(const role of ['director','agent','gm']){const view=projectState(h.state,role);const d=view.documents.find(d=>d.id===id);assert.equal(d.editable,role==='director');assert.ok(d.editorSchema);assert.deepEqual(view.archiveEntries[id].signatures,{director:'최영호'});}
    assert.equal((await h.stateHandler(req('gm','/api/state','PATCH',{action:'save-archive-document',revision:h.state.revision,payload:{entry}}))).status,403);
  }
});
test('archive failures and stale revisions keep current files and records unchanged',async()=>{
  const h=harness(),fileId=await uploadDoc(h);const saved=await(await saveDoc(h,{fileId})).json();const old=structuredClone(h.state);
  assert.equal((await saveDoc(h,{id:saved.id,fileId:await (async()=>{const id=await uploadDoc(h,saved.id);h.values.set('body/'+id,Buffer.from('broken'));return id;})()})).status,400);
  assert.equal((await saveDoc(h,{id:saved.id,revision:0})).status,409);
  assert.equal((await saveDoc(h,{id:saved.id,fileId:await (await h.stage(png,'p.png','portrait')).json().then(r=>r.upload.id)})).status,400);
  h.reject();assert.equal((await saveDoc(h,{id:saved.id,fileId:await uploadDoc(h,saved.id)})).status,409);assert.deepEqual(h.state,old);
});
test('cleanup protects current archive attachments as well as personnel references',async()=>{
  const h=harness(),fileId=await uploadDoc(h);await saveDoc(h,{fileId});const meta=h.values.get('meta/'+fileId);meta.createdAt=new Date(Date.now()-UPLOAD_TTL-7200000).toISOString();
  await h.upload(req('gm','/api/uploads','DELETE',{cleanup:true}));assert.ok(h.values.has('body/'+fileId));
});
test('archive PDF and raster attachments use the same protected current-file route',async()=>{
  const h=harness();for(const [i,bytes,name,type] of [[1,Buffer.from('%PDF-1.4\n1 0 obj <<>> endobj\n%%EOF'),'record.pdf','application/pdf'],[2,png,'record.png','image/png']]){
    const stage=await h.stage(bytes,name,'archive');assert.equal(stage.status,200);const fileId=(await stage.json()).upload.id;
    const result=await saveDoc(h,{data:docData('FILE-'+i),fileId});assert.equal(result.status,200);const {id}=await result.json();await audienceDoc(h,id,['director']);
    const response=await h.file(req('director','/api/files?type=documents&id='+id+'&fileId='+fileId));assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),type);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
  }
});
test('archive attachment staging is bound to its selected document',async()=>{
  const h=harness();const fileId=await uploadDoc(h,'p07');const before=structuredClone(h.state);assert.equal((await saveDoc(h,{id:'branch-summary',data:docData(),fileId})).status,400);assert.deepEqual(h.state,before);
});
