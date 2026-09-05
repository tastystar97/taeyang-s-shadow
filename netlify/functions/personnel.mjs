import { requireSession, isSameOriginRequest } from '../lib/auth.mjs';
import { readState, writeState } from '../lib/store.mjs';
import { normalizeState, projectState } from '../lib/permissions.mjs';
import { personnelData, recordActivity, singleAudience } from '../lib/personnel-core.mjs';
import { uploadStore, loadStagedFile } from '../lib/uploads.mjs';
import { InputError } from '../lib/upload-core.mjs';
export function createPersonnelHandler({read=readState,write=writeState,store=uploadStore}={}) {
  return async request=>{
    const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store',Vary:'Cookie'}});
    const session=requireSession(request);
    if(!session)return json({error:'접근 인증이 필요합니다.'},401);
    if(session.role!=='gm')return json({error:'관제 권한이 필요합니다.'},403);
    if(request.method!=='POST')return json({error:'허용되지 않은 요청입니다.'},405);
    if(!isSameOriginRequest(request))return json({error:'허용되지 않은 요청 출처입니다.'},403);
    try {
      if(Number(request.headers.get('content-length'))>100000)throw new InputError('인사정보가 너무 큽니다.',413);
      const raw=await request.text(); if(Buffer.byteLength(raw)>100000)throw new InputError('인사정보가 너무 큽니다.',413);
      let body;try{body=JSON.parse(raw);}catch{throw new InputError('저장 요청을 읽을 수 없습니다.');}
      if(!body||typeof body!=='object'||Array.isArray(body))throw new InputError('저장 요청을 확인하세요.');
      const actions={save:['action','revision','id','data','uploads'],audience:['action','revision','id','audience'],move:['action','revision','id','direction']};
      if(!actions[body.action]||Object.keys(body).some(k=>!actions[body.action].includes(k)))throw new InputError('한 인사기록의 작업만 요청하세요.');
      if(body.id!==undefined&&body.id!==null&&(typeof body.id!=='string'||!body.id||body.id.length>80))throw new InputError('인사기록 식별자를 확인하세요.');
      const original=await read(); const state=normalizeState(original);
      if(!Number.isInteger(body.revision)||body.revision!==state.revision)return json({error:'다른 단말에서 기록이 변경되었습니다. 최신 기록을 확인한 뒤 다시 저장하세요.',state:projectState(state,'gm')},409);
      const existing=state.personnel.find(p=>p.id===body.id);
      if(body.id&&!existing)throw new InputError('인사기록을 찾을 수 없습니다.',404);
      let person=existing;
      if(body.action==='save') {
        const id=existing?.id || crypto.randomUUID();
        const fields=personnelData(body.data,state,id);
        const uploads=body.uploads??{};
        if(!uploads||typeof uploads!=='object'||Array.isArray(uploads)||Object.keys(uploads).some(k=>!['portrait','record'].includes(k)))throw new InputError('첨부 구분을 확인하세요.');
        person={...(existing||{id,order:String(state.personnel.length+1).padStart(2,'0'),audience:[],image:'',createdAt:new Date().toISOString()}),...fields,updatedAt:new Date().toISOString()};
        state.files ||= {};
        for(const slot of ['portrait','record']) {
          if(!Object.hasOwn(uploads,slot))continue;
          const field=slot==='portrait'?'portraitFileId':'recordFileId'; const old=person[field];
          if(uploads[slot]===null){delete person[field];if(slot==='portrait')person.image='';}
          else {
            const meta=await loadStagedFile(store(),uploads[slot],existing?.id||'',slot,state);
            state.files[meta.id]={...meta,ownerType:'personnel',ownerId:id};
            person[field]=meta.id;
            if(slot==='portrait'){person.image='/api/files?type=personnel&id='+id+'&fileId='+meta.id;person.fileName=meta.name;}
          }
          if(old&&old!==person[field])delete state.files[old];
        }
        if(existing)state.personnel[state.personnel.indexOf(existing)]=person;else state.personnel.push(person);
        recordActivity(state,existing?'PERSONNEL_UPDATED':'PERSONNEL_CREATED',person);
      }else {
        if(!person)throw new InputError('인사기록을 선택하세요.');
        if(body.action==='audience') {
          person.audience=singleAudience(body);
          recordActivity(state,'PERSONNEL_AUDIENCE_CHANGED',person);
        }else {
          if(!['up','down'].includes(body.direction))throw new InputError('표시 순서 방향을 확인하세요.');
          const list=[...state.personnel].sort((a,b)=>Number(a.order)-Number(b.order));
          const index=list.findIndex(p=>p.id===person.id);const to=index+(body.direction==='up'?-1:1);
          if(to<0||to>=list.length)throw new InputError('더 이동할 수 없습니다.');
          [list[index],list[to]]=[list[to],list[index]];
          list.forEach((p,i)=>{p.order=String(i+1).padStart(2,'0');});state.personnel=list;
          recordActivity(state,'PERSONNEL_REORDERED',person);
        }
        person.updatedAt=new Date().toISOString();
      }
      state.revision+=1;
      if(await write(state,original)===false)return json({error:'다른 단말에서 기록이 변경되었습니다. 최신 기록을 확인하세요.',state:projectState(await read(),'gm')},409);
      return json({state:projectState(state,'gm'),id:person.id});
    }catch(error){return json({error:error instanceof InputError?error.message:'인사기록을 저장하지 못했습니다. 입력한 내용을 유지한 채 다시 시도하세요.'},error instanceof InputError?error.status:503);}
  };
}
export default createPersonnelHandler();
