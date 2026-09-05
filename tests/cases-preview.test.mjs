import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../netlify/lib/default-state.mjs';
import {normalizeState,projectState} from '../netlify/lib/permissions.mjs';
import {createSession,isSameOriginRequest} from '../netlify/lib/auth.mjs';
import {createCasesHandler} from '../netlify/functions/cases.mjs';
import {createPreviewHandler} from '../netlify/functions/preview.mjs';
import {createFilesHandler} from '../netlify/functions/files.mjs';

process.env.SESSION_SECRET='m5-test-secret';
process.env.BRANCH_ACCESS_CODE='m5-director';
process.env.FIELD_ACCESS_CODE='m5-agent';
process.env.CONTROL_ACCESS_CODE='m5-gm';

const request=(role,path,method='GET',body,headers={})=>new Request('https://branch.test'+path,{method,headers:{...(role?{cookie:'tcb_session='+createSession(role)}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
const caseData=(code='CASE-M5-001')=>({caseCode:code,title:'폐쇄 병동 사건',summary:'공개 요약',status:'조사 중',gmNote:'GM_SECRET_NOTE'});

function harness(){
  let state=normalizeState(freshState()),writes=0,reject=false;
  state.forms=[{id:'director-form',kind:'director-form',authorRole:'director',reviewerRole:'gm',template:'operation-order',title:'지부장 작전 명령',content:{caseName:'병동'},signature:'최영호',status:'SUBMITTED',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}];
  const read=async()=>structuredClone(state);
  const write=async(next,previous)=>{if(reject||previous.revision!==state.revision)return false;state=next;writes++;return next;};
  return {get state(){return state},get writes(){return writes},reject(){reject=true},cases:createCasesHandler({read,write}),preview:createPreviewHandler({read}),files:createFilesHandler({read}),read};
}
async function save(h,extra={}){return h.cases(request('gm','/api/cases','POST',{action:'save',revision:h.state.revision,data:caseData(),links:[],...extra}));}
async function audience(h,type,id,aud){return h.cases(request('gm','/api/cases','POST',{action:'audience',revision:h.state.revision,type,id,audience:aud}));}

test('preview marker is rejected by the shared same-origin write guard',()=>{assert.equal(isSameOriginRequest(new Request('https://branch.test/api/state',{headers:{'X-TCB-Preview':'1'}})),false);});

test('case creation is private and rejects player, cross-origin, preview and bulk writes',async()=>{
  const h=harness();
  for(const role of ['agent','director',null])assert.equal((await h.cases(request(role,'/api/cases','POST',{}))).status,role?403:401);
  assert.equal((await h.cases(request('gm','/api/cases','POST',{}, {origin:'https://evil.test'}))).status,403);
  assert.equal((await h.cases(request('gm','/api/cases','POST',{}, {'X-TCB-Preview':'1'}))).status,403);
  assert.equal((await save(h,{ids:['a','b']})).status,400);
  const result=await save(h);assert.equal(result.status,200);const {id}=await result.json();assert.equal(h.state.cases.find(c=>c.id===id).audience.length,0);assert.equal(projectState(h.state,'agent').cases.length,0);
});

test('case and resources require independent one-item publication with no hidden counts or metadata',async()=>{
  const h=harness();const links=[{type:'documents',id:'hq-urgent'},{type:'documents',id:'medical-isea'},{type:'personnel',id:'choi-youngho'},{type:'forms',id:'director-form'}];
  const {id}=await(await save(h,{links})).json();await audience(h,'cases',id,['agent']);
  let view=projectState(h.state,'agent');assert.equal(view.cases.length,1);assert.deepEqual(view.cases[0].links,[]);assert.ok(!JSON.stringify(view).includes('GM_SECRET_NOTE'));assert.ok(!JSON.stringify(view).includes('medical-isea'));
  await audience(h,'documents','hq-urgent',['agent']);view=projectState(h.state,'agent');assert.deepEqual(view.cases[0].links,[{type:'documents',id:'hq-urgent',order:0}]);assert.ok(!JSON.stringify(view.cases[0]).includes('director-form'));
  await audience(h,'documents','medical-isea',['agent']);view=projectState(h.state,'agent');assert.deepEqual(view.cases[0].links.map(l=>l.id),['hq-urgent','medical-isea']);
  await audience(h,'documents','hq-urgent',[]);assert.deepEqual(projectState(h.state,'agent').cases[0].links.map(l=>l.id),['medical-isea']);
});

test('director-only workflow links never leak to agents and case deletion preserves originals',async()=>{
  const h=harness();const {id}=await(await save(h,{links:[{type:'forms',id:'director-form'},{type:'documents',id:'hq-urgent'}]})).json();await audience(h,'cases',id,['director','agent']);await audience(h,'documents','hq-urgent',['director','agent']);const before={documents:structuredClone(h.state.documents),personnel:structuredClone(h.state.personnel),forms:structuredClone(h.state.forms)};
  assert.deepEqual(projectState(h.state,'agent').cases[0].links.map(l=>l.type),['documents']);assert.deepEqual(projectState(h.state,'director').cases[0].links.map(l=>l.type),['forms','documents']);
  const deleted=await h.cases(request('gm','/api/cases','POST',{action:'delete',revision:h.state.revision,id}));assert.equal(deleted.status,200);assert.deepEqual(h.state.documents,before.documents);assert.deepEqual(h.state.personnel,before.personnel);assert.deepEqual(h.state.forms,before.forms);
});

test('link changes and ordering preserve every resource audience',async()=>{
  const h=harness();const first=(await(await save(h,{data:caseData('CASE-1'),links:[{type:'documents',id:'hq-urgent'}]})).json()).id;const second=(await(await save(h,{data:caseData('CASE-2'),links:[]})).json()).id;
  const audiences=Object.fromEntries(['documents','personnel','evidence'].flatMap(type=>h.state[type].map(r=>[type+':'+r.id,structuredClone(r.audience)])));
  let response=await h.cases(request('gm','/api/cases','POST',{action:'save',revision:h.state.revision,id:first,data:caseData('CASE-1'),links:[]}));assert.equal(response.status,200);
  response=await h.cases(request('gm','/api/cases','POST',{action:'move',revision:h.state.revision,id:second,direction:'up'}));assert.equal(response.status,200);assert.equal(h.state.cases[0].id,second);
  for(const type of ['documents','personnel','evidence'])for(const r of h.state[type])assert.deepEqual(r.audience,audiences[type+':'+r.id]);
});

test('case validation rejects duplicate IDs, broken links, stale writes and duplicate case numbers',async()=>{
  const h=harness();const saved=await(await save(h)).json();const revision=h.state.revision;
  assert.equal((await save(h,{data:caseData(' ＣＡＳＥ-Ｍ５-００１ ')})).status,422);
  assert.equal((await save(h,{data:caseData('CASE-BROKEN'),links:[{type:'documents',id:'missing'}]})).status,404);
  assert.equal((await save(h,{data:caseData('CASE-DUP-LINK'),links:[{type:'documents',id:'hq-urgent'},{type:'documents',id:'hq-urgent'}]})).status,400);
  assert.equal((await h.cases(request('gm','/api/cases','POST',{action:'audience',revision:0,type:'cases',id:saved.id,audience:['agent']}))).status,409);assert.equal(h.state.revision,revision);
});

test('preview endpoint matches role projection, rewrites protected URLs and is GM GET-only',async()=>{
  const h=harness();h.state.documents[0].audience=['agent'];h.state.personnel[0].audience=['agent'];h.state.evidence[0].audience=['agent'];
  assert.equal((await h.preview(request('agent','/api/preview?role=agent'))).status,403);assert.equal((await h.preview(request('gm','/api/preview?role=gm'))).status,400);assert.equal((await h.preview(request('gm','/api/preview?role=agent','POST'))).status,405);
  const response=await h.preview(request('gm','/api/preview?role=agent'));assert.equal(response.status,200);const {state,preview}=await response.json();assert.equal(preview,true);assert.equal(state.role,'agent');assert.equal(state.documents.length,1);assert.match(state.documents[0].url,/^\/api\/preview-files\?/);assert.match(state.personnel[0].image,/^\/api\/preview-files\?/);assert.match(state.evidence[0].src,/^\/api\/preview-files\?/);assert.equal(state.activity.length,0);
});

test('preview files enforce the selected role and render managed archive fields without editor scripts',async()=>{
  const h=harness();h.state.documents[0].audience=['agent'];h.state.archiveEntries['hq-urgent']={id:'hq-urgent',content:{opinion:'저장된 의견'},signatures:{director:'최영호'}};
  const normal=createFilesHandler({read:h.read,preview:true});const forbidden=await normal(request('gm','/api/preview-files?role=agent&type=documents&id=medical-isea'));assert.equal(forbidden.status,404);const response=await normal(request('gm','/api/preview-files?role=agent&type=documents&id=hq-urgent'));assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes('저장된 의견'));assert.ok(html.includes('최영호'));assert.doesNotMatch(html,/<script\b|data-entry-field|archive-editor\.js/);assert.match(response.headers.get('content-security-policy'),/sandbox/);
  assert.equal((await normal(request('agent','/api/preview-files?role=agent&type=documents&id=hq-urgent'))).status,403);assert.equal((await normal(request('gm','/api/preview-files?role=agent&type=documents&id=hq-urgent','POST'))).status,405);
});
