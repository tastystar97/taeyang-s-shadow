import { requireSession, isSameOriginRequest } from '../lib/auth.mjs';
import { readState, writeState } from '../lib/store.mjs';
import { isPublicCityDocument, normalizeState, projectState } from '../lib/permissions.mjs';
import { singleAudience } from '../lib/personnel-core.mjs';
import { ARCHIVE_SCHEMAS } from '../lib/archive-schemas.mjs';
import { normalizeArchiveCategory } from '../lib/archive-categories.mjs';
import { uploadStore, loadStagedFile } from '../lib/uploads.mjs';
import { InputError } from '../lib/upload-core.mjs';
const limits={title:160,code:100,category:80,detail:2000,security:40};
function metadata(data,state,id){
  if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(k=>!Object.hasOwn(limits,k)))throw new InputError('문서 정보를 확인하세요.');
  const result={};
  for(const [key,max] of Object.entries(limits)){
    if(typeof data[key]!=='string'||data[key].trim().length>max)throw new InputError('문서 정보의 형식과 길이를 확인하세요.');
    result[key]=data[key].trim();
  }
  result.category=normalizeArchiveCategory(result.category);
  if(!result.title||!result.code||!result.category)throw new InputError('문서명, 문서번호, 분류를 입력하세요.',422);
  const key=s=>s.normalize('NFKC').trim().toUpperCase();
  if(state.documents.some(d=>d.id!==id&&key(d.code)===key(result.code)))throw new InputError('이미 사용 중인 문서번호입니다.',422);
  return result;
}
export function createArchiveHandler({read=readState,write=writeState,store=uploadStore}={}){
  return async request=>{
    const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store',Vary:'Cookie'}});
    const session=requireSession(request);
    if(!session)return json({error:'접근 인증이 필요합니다.'},401);
    if(session.role!=='gm')return json({error:'관제 권한이 필요합니다.'},403);
    if(request.method!=='POST')return json({error:'허용되지 않은 요청입니다.'},405);
    if(!isSameOriginRequest(request))return json({error:'허용되지 않은 요청 출처입니다.'},403);
    try{
      if(Number(request.headers.get('content-length'))>20000)throw new InputError('문서 정보가 너무 큽니다.',413);
      const raw=await request.text();if(Buffer.byteLength(raw)>20000)throw new InputError('문서 정보가 너무 큽니다.',413);
      let body;try{body=JSON.parse(raw)}catch{throw new InputError('저장 요청을 읽을 수 없습니다.')}
      const actions={save:['action','revision','id','data','fileId'],audience:['action','revision','id','audience']};
      if(!body||Array.isArray(body)||!Object.hasOwn(actions,body.action)||Object.keys(body).some(k=>!actions[body.action].includes(k)))throw new InputError('문서 한 건의 작업만 요청하세요.');
      if(body.id!=null&&(typeof body.id!=='string'||!body.id||body.id.length>80))throw new InputError('문서 식별자를 확인하세요.');
      const original=await read();const state=normalizeState(original);
      if(!Number.isInteger(body.revision)||body.revision!==state.revision)return json({error:'다른 단말에서 기록이 변경되었습니다. 최신 기록을 확인하세요.',state:projectState(state,'gm')},409);
      const existing=state.documents.find(d=>d.id===body.id);
      if(body.id&&!existing)throw new InputError('문서를 찾을 수 없습니다.',404);
      let doc=existing;
      if(body.action==='save'){
        const id=existing?.id||crypto.randomUUID();const data=metadata(body.data,state,id);
        doc={...(existing||{id,audience:[],status:'NEW',createdAt:new Date().toISOString()}),...data};
        if(ARCHIVE_SCHEMAS[id]&&Object.hasOwn(body,'fileId'))throw new InputError('앱 관리 서식은 원본을 유지합니다. 별도 문서로 등록하세요.',422);
        if(!existing&&!body.fileId)throw new InputError('원본 파일을 선택하고 미리보기를 확인하세요.',422);
        if(Object.hasOwn(body,'fileId')){
          const file=await loadStagedFile(store(),body.fileId,existing?.id||'','archive',state);
          const old=doc.fileId;doc.fileId=file.id;doc.sourceKind='upload';doc.editable=false;
          doc.url='/api/files?type=documents&id='+id+'&fileId='+file.id;
          state.files[file.id]={...file,ownerType:'documents',ownerId:id};
          if(old&&old!==file.id)delete state.files[old];
        }
        if(existing)state.documents[state.documents.indexOf(existing)]=doc;else state.documents.push(doc);
      }else{
        if(!doc)throw new InputError('문서를 선택하세요.');
        if(isPublicCityDocument(doc.id))throw new InputError('CITY NET 문서는 전체 공개 고정이라 변경할 수 없습니다.',422);
        doc.audience=singleAudience(body);
      }
      doc.updatedAt=new Date().toISOString();
      state.activity.unshift({id:crypto.randomUUID(),at:doc.updatedAt,action:body.action==='audience'?'ARCHIVE_AUDIENCE_CHANGED':'ARCHIVE_SAVED',detail:doc.title});state.activity=state.activity.slice(0,60);
      state.revision++;
      if(await write(state,original)===false)return json({error:'다른 단말에서 기록이 변경되었습니다. 최신 기록을 확인하세요.',state:projectState(await read(),'gm')},409);
      return json({id:doc.id,state:projectState(state,'gm')});
    }catch(error){return json({error:error instanceof InputError?error.message:'문서를 저장하지 못했습니다. 작성 내용을 유지한 채 다시 시도하세요.'},error instanceof InputError?error.status:503);}
  };
}
export default createArchiveHandler();
