import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../netlify/lib/default-state.mjs';
import { normalizeState,projectState } from '../netlify/lib/permissions.mjs';
import { createSession } from '../netlify/lib/auth.mjs';
import { inspectUpload,MAX_FILE_BYTES,UPLOAD_TTL } from '../netlify/lib/upload-core.mjs';
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
  const personnel=createPersonnelHandler({read,write,store:()=>storage});
  const upload=createUploadsHandler({read,store:()=>storage});
  const file=createFilesHandler({read,readFile:async entry=>({data:await storage.get(entry.key),contentType:entry.contentType,isUpload:true})});
  return{get state(){return state;},values,storage,personnel,upload,file,get writes(){return writes;},reject(){rejectWrite=true;},
    async save(body,role='gm'){return personnel(req(role,'/api/personnel','POST',{action:'save',revision:state.revision,data:data(),...body}));},
    async stage(bytes=png,name='photo.png',slot='portrait',targetId=''){const form=new FormData();form.set('file',new File([bytes],name));form.set('slot',slot);if(targetId)form.set('targetId',targetId);return upload(req('gm','/api/uploads','POST',form));}
  };
}
test('personnel creation is private and preserves the five seed identities',async()=>{
  const h=harness(),before=h.state.personnel.map(p=>[p.id,p.employeeId,p.order]);
  const result=await h.save({});assert.equal(result.status,200);const saved=await result.json();
  assert.equal(h.state.personnel.length,6);assert.deepEqual(h.state.personnel.slice(0,5).map(p=>[p.id,p.employeeId,p.order]),before);
  assert.deepEqual(h.state.personnel.find(p=>p.id===saved.id).audience,[]);
  assert.equal(projectState(h.state,'agent').personnel.length,0);
  assert.equal(projectState(h.state,'director').personnel.length,5);
});
test('duplicate employee IDs are rejected while duplicate names are allowed',async()=>{
  const h=harness();assert.equal((await h.save({data:data('최영호',' ２０４３-Ｋ-００１ ')})).status,422);
  assert.equal(h.writes,0);assert.equal((await h.save({data:data('최영호','M2-002')})).status,200);
});
test('player roles, role spoofing, CSRF and bulk fields cannot edit or publish personnel',async()=>{
  const h=harness();
  for(const role of ['agent','director',null])assert.equal((await h.save({},role)).status,role?403:401);
  assert.equal((await h.personnel(req('gm','/api/personnel','POST',{action:'save'}, {origin:'https://evil.test'}))).status,403);
  assert.equal((await h.save({audience:['agent']})).status,400);
  assert.equal((await h.personnel(req('gm','/api/personnel','POST',{action:'audience',revision:h.state.revision,id:'choi-youngho',ids:['ha-eunchae'],audience:['agent']}))).status,400);
  assert.equal(h.writes,0);
});
test('single publication and unpublication do not change other records or linked cases',async()=>{
  const h=harness();const saved=await(await h.save({})).json();
  let response=await h.personnel(req('gm','/api/personnel','POST',{action:'audience',id:saved.id,revision:h.state.revision,audience:['agent']}));
  assert.equal(response.status,200);
  let list=projectState(h.state,'agent').personnel;assert.equal(list.length,1);assert.equal(list[0].order,'01');
  const existing=h.state.personnel[0];await h.save({id:saved.id,data:data('수정 이름')});
  assert.deepEqual(h.state.personnel.find(p=>p.id===saved.id).audience,['agent']);assert.deepEqual(existing.audience,['director']);
  response=await h.personnel(req('gm','/api/personnel','POST',{action:'audience',id:saved.id,revision:h.state.revision,audience:[]}));
  assert.equal(response.status,200);assert.equal(projectState(h.state,'agent').personnel.length,0);
});
test('order changes preserve identities and visibility; filtered player order has no gaps',async()=>{
  const h=harness();const id='ha-eunchae';
  const response=await h.personnel(req('gm','/api/personnel','POST',{action:'move',id,revision:h.state.revision,direction:'up'}));
  assert.equal(response.status,200);assert.equal(h.state.personnel[0].id,id);
  assert.equal(h.state.personnel[1].id,'choi-youngho');assert.deepEqual(h.state.personnel[0].audience,['director']);
});
test('file sniffing rejects mismatched, unsupported, empty and oversized uploads',()=>{
  assert.equal(inspectUpload(png,'a.png','portrait').contentType,'image/png');
  const pdf=Buffer.from('%PDF-1.4\n1 0 obj <<>> endobj\n%%EOF');
  assert.equal(inspectUpload(pdf,'a.pdf','record').contentType,'application/pdf');
  for(const [bytes,name,slot] of [[png,'a.pdf','record'],[pdf,'a.pdf','portrait'],[Buffer.from('<svg/>'),'a.svg','record'],[Buffer.alloc(0),'a.png','portrait'],[Buffer.alloc(MAX_FILE_BYTES+1),'a.png','portrait']])assert.throws(()=>inspectUpload(bytes,name,slot));
});
test('HTML is sanitized and external dependencies are rejected before saving',()=>{
  const html=Buffer.from('<html><head><style>body{color:red}</style></head><body><h1>원문</h1><script>parent.stolen=1</script><form action="/api/state"><input name="evil"></form><img onerror="alert(1)" src="data:image/png;base64,'+png.toString('base64')+'"><a href="javascript:alert(1)">링크</a></body></html>');
  const checked=inspectUpload(html,'record.html','record');
  const text=checked.data.toString();
  assert.ok(text.includes('원문'));assert.ok(text.includes('body{color:red}'));assert.ok(!text.includes('<script'));assert.ok(!text.includes('onerror'));assert.ok(!text.includes('<form'));assert.ok(!text.includes('href='));
  for(const source of ['<html><img src="./a.png"></html>','<html><link rel="stylesheet" href="https://external.test/a.css"></html>','<html><style>div{background:url(/secret)}</style></html>'])assert.throws(()=>inspectUpload(Buffer.from(source),'a.html','record'),/외부/);
});
test('staged uploads are GM-only and never appear in player data before commit',async()=>{
  const h=harness();const upload=await(await h.stage()).json();
  assert.ok(upload.upload.id);assert.equal(h.writes,0);
  assert.equal((await h.upload(req('agent','/api/uploads?id='+upload.upload.id))).status,403);
  assert.equal((await h.file(req('gm','/api/files?type=personnel&id=choi-youngho&fileId='+upload.upload.id))).status,404);
  assert.ok(!JSON.stringify(projectState(h.state,'director')).includes(upload.upload.id));
});
test('two attachments commit atomically and original access follows current audience',async()=>{
  const h=harness();
  const portrait=await(await h.stage()).json();
  const html=await(await h.stage(Buffer.from('<html><h1>첨부 인사 원문</h1><script>alert(1)</script></html>'),'record.html','record')).json();
  const result=await(await h.save({uploads:{portrait:portrait.upload.id,record:html.upload.id}})).json();
  const url='/api/files?type=personnel&id='+result.id+'&fileId='+html.upload.id;
  assert.equal((await h.file(req('agent',url))).status,404);
  assert.equal((await h.personnel(req('gm','/api/personnel','POST',{action:'audience',revision:h.state.revision,id:result.id,audience:['agent']}))).status,200);
  const response=await h.file(req('agent',url));assert.equal(response.status,200);assert.match(response.headers.get('content-security-policy'),/^sandbox;/);
  assert.ok(!(await response.text()).includes('session-guard'));
  const row=projectState(h.state,'agent').personnel[0];assert.ok(row.image.includes(portrait.upload.id));assert.equal(row.attachment.name,'record.html');
  assert.ok(!JSON.stringify(row).includes('sha256'));assert.ok(!JSON.stringify(row).includes('ownerId'));
  await h.personnel(req('gm','/api/personnel','POST',{action:'audience',revision:h.state.revision,id:result.id,audience:[]}));
  assert.equal((await h.file(req('agent',url))).status,404);
});
test('failed file verification or CAS leaves old record and originals intact',async()=>{
  const h=harness();const before=structuredClone(h.state);
  const portrait=await(await h.stage(png,'replacement.png','portrait','choi-youngho')).json();
  assert.equal((await h.save({id:'choi-youngho',data:data('변경','2043-K-001'),uploads:{portrait:portrait.upload.id,record:crypto.randomUUID()}})).status,400);
  assert.deepEqual(h.state,before);
  h.reject();
  assert.equal((await h.save({id:'choi-youngho',data:data('변경','2043-K-001'),uploads:{portrait:portrait.upload.id}})).status,409);
  assert.deepEqual(h.state,before);assert.ok(resolveFile(h.state,'director',{path:'/media/personnel/choi-youngho.webp'}));
});
test('replacement disables the old URL and discarded stages cannot be attached',async()=>{
  const h=harness();const replacement=await(await h.stage(png,'replacement.png','portrait','choi-youngho')).json();
  await h.save({id:'choi-youngho',data:data('최영호','2043-K-001'),uploads:{portrait:replacement.upload.id}});
  assert.equal(resolveFile(h.state,'director',{path:'/media/personnel/choi-youngho.webp'}),null);
  assert.ok(resolveFile(h.state,'director',{type:'personnel',id:'choi-youngho',fileId:replacement.upload.id}));
  const cancelled=await(await h.stage()).json();
  await h.upload(req('gm','/api/uploads','DELETE',{id:cancelled.upload.id}));
  assert.equal((await h.save({uploads:{portrait:cancelled.upload.id}})).status,400);
});
test('cleanup deletes old unreferenced uploads while retaining active attachments',async()=>{
  const h=harness();const active=await(await h.stage()).json();await h.save({uploads:{portrait:active.upload.id}});
  const unused=await(await h.stage()).json();
  for(const id of [active.upload.id,unused.upload.id]){const meta=h.values.get('meta/'+id);meta.createdAt=new Date(Date.now()-UPLOAD_TTL-7200000).toISOString();h.values.set('meta/'+id,meta);}
  const response=await h.upload(req('gm','/api/uploads','DELETE',{cleanup:true}));
  assert.equal((await response.json()).removed,1);assert.ok(h.values.has('body/'+active.upload.id));assert.ok(!h.values.has('body/'+unused.upload.id));
});
test('file uploads have a real multipart body limit, including requests without a trusted size header',async()=>{
  const h=harness();const result=await h.stage(Buffer.alloc(MAX_FILE_BYTES+100000),'a.png');
  assert.equal(result.status,413);assert.equal(h.values.size,0);
});
