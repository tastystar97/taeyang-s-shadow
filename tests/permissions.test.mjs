import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile, access } from 'node:fs/promises';
import { freshState } from '../netlify/lib/default-state.mjs';
import { normalizeState, projectState, canReadResource, authorizeAction } from '../netlify/lib/permissions.mjs';
import { resolveFile, STATIC_FILES, readProtectedFile } from '../netlify/lib/file-access.mjs';
import { createStateHandler } from '../netlify/functions/state.mjs';
import { createFilesHandler } from '../netlify/functions/files.mjs';
import { createPreviewHandler } from '../netlify/functions/preview.mjs';
import auth from '../netlify/functions/auth.mjs';
import { createSession, getSession } from '../netlify/lib/auth.mjs';
process.env.SESSION_SECRET = 'local-test-signing-secret-only';
process.env.BRANCH_ACCESS_CODE = 'test-director';
process.env.FIELD_ACCESS_CODE = 'test-field';
process.env.CONTROL_ACCESS_CODE = 'test-control';
const request = (role, path = '/api/state', method = 'GET', body, extra = {}) => new Request('https://branch.test' + path, {
  method, headers: { ...(role ? {cookie:'tcb_session='+createSession(role)} : {}), ...(body ? {'Content-Type':'application/json'} : {}), ...extra },
  ...(body ? {body:JSON.stringify(body)} : {})
});
const fixture = () => {
  const state = normalizeState(freshState());
  state.documents[0].audience = ['agent'];
  state.documents[1].audience = [];
  state.documents[1].title = 'HIDDEN_TITLE';
  state.documents[0].gmMemo = 'SECRET_MEMO';
  state.forms = [
    {id:'director-doc',kind:'director-form',template:'hq-report',title:'DIRECTOR_DRAFT',status:'DRAFT',content:{text:'PRIVATE_BODY'},audience:[]},
    {id:'field-draft',kind:'field-report',title:'FIELD_DRAFT',status:'DRAFT',content:{text:'FIELD_BODY'},audience:[]}
  ];
  state.archiveEntries['medical-isea'] = {content:{text:'HIDDEN_ENTRY'},signatures:{}};
  state.activity = [{action:'PRIVATE_LOG',detail:'HIDDEN_TITLE'}];
  state.notices = [{id:'hidden-notice',audience:['agent','director'],target:'archive',targetId:'medical-isea',title:'HIDDEN_TITLE',body:'HIDDEN_BODY'}];
  state.cases = [{id:'case-1',audience:['agent'],title:'Visible case',gmMemo:'SECRET_MEMO',links:[{type:'documents',id:'medical-isea'},{type:'documents',id:'hq-urgent'},{type:'forms',id:'field-draft'}]}];
  return state;
};
test('migration preserves explicit private audience, source contents, and does not mutate input', () => {
  const old = freshState(); old.documents[0].audience=[]; const before=structuredClone(old);
  const state=normalizeState(old);
  assert.deepEqual(old,before); assert.deepEqual(state.documents[0].audience,[]);
  assert.equal(state.personnel.length,5); assert.equal(state.evidence.length,9);
  assert.deepEqual(normalizeState(state),state);
  assert.deepEqual(state.documents[1].audience,['director']);
});
test('legacy seeds never overwrite colliding uploads', () => {
  const old=freshState(); old.evidence=[{id:'static-audit-eve',title:'Uploaded'}];
  assert.throws(()=>normalizeState(old),/충돌/);
});
test('agent projection excludes private metadata, archive entries, forms, notices and case links', () => {
  const result=projectState(fixture(),'agent');
  const text=JSON.stringify(result);
  for(const secret of ['HIDDEN_TITLE','HIDDEN_ENTRY','PRIVATE_LOG','DIRECTOR_DRAFT','PRIVATE_BODY','SECRET_MEMO','medical-isea']) assert.ok(!text.includes(secret),secret);
  assert.equal(result.documents.length,3);
  assert.deepEqual(result.cases[0].links,[{type:'documents',id:'hq-urgent',order:0},{type:'forms',id:'field-draft',order:1}]);
  assert.deepEqual(result.personnel,[]); assert.equal(result.forms[0].id,'field-draft');
  assert.match(result.cityHtml,/city-locations/); assert.match(result.cityHtml,/city-history/);
});
test('GM sees full records; director cannot read agent drafts', () => {
  assert.equal(projectState(fixture(),'gm').activity[0].action,'PRIVATE_LOG');
  const result=projectState(fixture(),'director');
  assert.ok(result.forms.some(f=>f.id==='director-doc'));
  assert.ok(!result.forms.some(f=>f.id==='field-draft'));
  assert.ok(!result.documents.some(d=>d.id==='medical-isea'));
});
test('role action matrix rejects author impersonation and field-report approval through legacy actions', () => {
  const state=fixture();
  for(const action of ['save-form','submit-form','delete-form','save-archive-document','toggle-checklist','set-phase','add-evidence','reset-state']) assert.equal(authorizeAction(state,'agent',action,{}),false,action);
  assert.equal(authorizeAction(state,'gm','save-form',{}),false);
  assert.equal(authorizeAction(state,'director','save-form',{form:{id:'field-draft'}}),false);
  assert.equal(authorizeAction(state,'gm','approve-form',{id:'field-draft'}),false);
  assert.equal(authorizeAction(state,'director','save-archive-document',{entry:{id:'medical-isea'}}),false);
  assert.equal(authorizeAction(state,'director','save-form',{form:{id:'new'}}),true);
});
test('file aliases enforce audience, reject path traversal and cannot be broadened by viewerRole', async () => {
  const state=fixture();
  for(const file of STATIC_FILES.filter(f=>f.type!=='support')) {
    if(['hq-urgent','city-locations','city-history'].includes(file.id)) continue;
    assert.equal(resolveFile(state,'agent',{path:file.path}),null,file.path);
  }
  assert.ok(resolveFile(state,'agent',{id:'hq-urgent'}));
  for(const path of ['/archive/../netlify/lib/auth.mjs','/archive/%2e%2e/auth.mjs','/unknown','//archive/hq-urgent.html']) assert.equal(resolveFile(state,'gm',{path}),null);
  let reads=0;
  const handler=createFilesHandler({read:async()=>state,readFile:async()=>{reads++;return {data:'private file',contentType:'text/html'};}});
  assert.equal((await handler(request(null,'/api/files?id=hq-urgent'))).status,401);
  assert.equal((await handler(request('agent','/api/files?id=medical-isea&viewerRole=gm'))).status,404);
  assert.equal(reads,0);
  const visible=await handler(request('agent','/api/files?id=hq-urgent'));
  assert.equal(visible.status,200); assert.equal(await visible.text(),'private file'); assert.match(visible.headers.get('cache-control'),/no-store/);
});
test('all legacy originals remain readable from the protected server catalog', async () => {
  for(const file of STATIC_FILES) {
    const record=resolveFile(freshState(),'gm',{path:file.path});
    const result=await readProtectedFile(record);
    assert.ok(result.data.byteLength>0,file.path);
  }
});
test('API applies role filter to GET, successful writes, and revision conflicts', async () => {
  let state=fixture(); let writes=0;
  const handler=createStateHandler({read:async()=>structuredClone(state),write:async value=>{state=value;writes++;return value;}});
  const get=await handler(request('agent','/api/state?viewerRole=gm'));
  assert.equal(get.status,200); assert.equal((await get.json()).state.role,'agent');
  const denied=await handler(request('agent','/api/state','PATCH',{revision:1,action:'save-form',payload:{form:{id:'x'}}}));
  assert.equal(denied.status,403);assert.equal(writes,0);
  const conflict=await handler(request('agent','/api/state','PATCH',{revision:-1,action:'mark-document-read',payload:{id:'hq-urgent'}}));
  assert.equal(conflict.status,409);assert.ok(!(await conflict.text()).includes('HIDDEN_TITLE'));assert.equal(writes,0);
  const success=await handler(request('agent','/api/state','PATCH',{revision:state.revision,action:'mark-document-read',payload:{id:'hq-urgent'}}));
  assert.equal(success.status,200);assert.ok(!(await success.text()).includes('PRIVATE_BODY'));assert.equal(writes,1);
});
test('ETag conflict does not report success or expose unfiltered latest state', async () => {
  const handler=createStateHandler({read:async()=>fixture(),write:async()=>false});
  const res=await handler(request('agent','/api/state','PATCH',{revision:1,action:'mark-document-read',payload:{id:'hq-urgent'}}));
  assert.equal(res.status,409);assert.ok(!(await res.text()).includes('HIDDEN_TITLE'));
});
test('preview is GM-only, filters as selected role and forbids all writes', async () => {
  const handler=createPreviewHandler({read:async()=>fixture()});
  assert.equal((await handler(request('agent','/api/preview?role=director'))).status,403);
  for(const method of ['POST','PATCH','DELETE']) assert.equal((await handler(request('gm','/api/preview?role=agent',method))).status,405);
  const res=await handler(request('gm','/api/preview?role=agent'));
  assert.equal(res.status,200); const data=await res.json(); assert.equal(data.state.role,'agent');assert.ok(!JSON.stringify(data).includes('PRIVATE_BODY'));
  const files=createFilesHandler({preview:true,read:async()=>fixture(),readFile:async()=>({data:'html',contentType:'text/html'})});
  assert.equal((await files(request('gm','/api/preview-files?role=agent&id=medical-isea'))).status,404);
  const file=await files(request('gm','/api/preview-files?role=agent&id=hq-urgent'));
  assert.match(file.headers.get('content-security-policy'),/^sandbox;/);
});
test('login role is inferred from player code, GM entry is isolated, cookies are protected', async () => {
  let res=await auth(request(null,'/api/auth','POST',{role:'director',code:'test-field'}));
  assert.equal((await res.json()).role,'agent');
  assert.match(res.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
  res=await auth(request(null,'/api/auth','POST',{role:'gm',code:'test-field'}));assert.equal(res.status,401);
  res=await auth(request(null,'/api/auth','POST',{role:'player',code:'test-control'}));assert.equal(res.status,401);
  res=await auth(request(null,'/api/auth','DELETE'));assert.match(res.headers.get('set-cookie'),/Max-Age=0/);
});
test('cross-origin login and writes are rejected', async () => {
  const headers={origin:'https://other.test'};
  assert.equal((await auth(request(null,'/api/auth','POST',{code:'test-field'},headers))).status,403);
  const handler=createStateHandler({read:async()=>fixture()});
  assert.equal((await handler(request('gm','/api/state','PATCH',{action:'set-phase'},headers))).status,403);
});
test('session schema version and finite expiry are required even for signed payloads', () => {
  const good=JSON.parse(Buffer.from(createSession('director').split('.')[0],'base64url').toString());
  for(const update of [{i:0},{exp:Date.now()-1},{exp:null}]) {
    const payload=Buffer.from(JSON.stringify({...good,...update})).toString('base64url');
    const signature=createHmac('sha256',process.env.SESSION_SECRET).update(payload).digest('base64url');
    assert.equal(getSession(new Request('https://branch.test',{headers:{cookie:'tcb_session='+payload+'.'+signature}})),null);
  }
});
test('public app bundles contain no personnel records or automatic offline data fallback', async () => {
  for(const name of ['app.js','archive-editor.js']) {
    const source=await readFile('public/'+name,'utf8');
    assert.ok(!source.includes("mode = 'local'"));assert.ok(!source.includes('localStorage.setItem'));
  }
  const source=await readFile('public/app.js','utf8');
  for(const text of ['2043-K-001','const STATIC_EVIDENCE = [','const PERSONNEL = [','이세아 귀환 후 의료기록']) assert.ok(!source.includes(text),text);
});

test('a shared signed document exposes its signature only through that authorized document', () => {
  const state=fixture();
  assert.equal(resolveFile(state,'agent',{id:'hq-urgent',type:'documents',asset:'signature'}),null);
  state.archiveEntries['hq-urgent']={signatures:{branchDirector:'최영호'}};
  assert.ok(resolveFile(state,'agent',{id:'hq-urgent',type:'documents',asset:'signature'}));
  assert.equal(resolveFile(state,'agent',{id:'medical-isea',type:'documents',asset:'signature'}),null);
  assert.equal(resolveFile(state,'agent',{path:'/media/signatures/choi-youngho-fitted.png'}),null);
});
test('read status is separated by role and CITY NET always exposes both public documents', async () => {
  let state=fixture();
  const handler=createStateHandler({read:async()=>structuredClone(state),write:async next=>{state=next;return next;}});
  await handler(request('agent','/api/state','PATCH',{revision:state.revision,action:'mark-document-read',payload:{id:'hq-urgent'}}));
  assert.equal(state.documents[0].status,'NEW');
  assert.equal(projectState(state,'agent').documents[0].status,'RELEASED');
  state.documents[0].audience.push('director');
  assert.equal(projectState(state,'director').documents.find(d=>d.id==='hq-urgent').status,'NEW');
  state.documents.find(d=>d.id==='city-locations').audience=[];
  state.documents.find(d=>d.id==='city-history').audience=[];
  const view=projectState(state,'agent'),text=JSON.stringify(view);
  assert.ok(text.includes('city-locations')); assert.ok(text.includes('city-history'));
  assert.deepEqual(normalizeState(state).documents.filter(d=>d.id.startsWith('city-')).map(d=>d.audience),[['director','agent'],['director','agent']]);
});
