import { requireSession, isSameOriginRequest } from '../lib/auth.mjs';
import { readState } from '../lib/store.mjs';
import { normalizeState } from '../lib/permissions.mjs';
import { uploadStore, currentFileIds, discardUpload } from '../lib/uploads.mjs';
import { inspectUpload, limitedForm, uploadedHeaders, InputError, UPLOAD_TTL } from '../lib/upload-core.mjs';
export function createUploadsHandler({read=readState,store=uploadStore}={}) {
  return async request=>{
    const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store',Vary:'Cookie'}});
    const session=requireSession(request);
    if(!session)return json({error:'접근 인증이 필요합니다.'},401);
    if(session.role!=='gm')return json({error:'관제 권한이 필요합니다.'},403);
    if(!['GET','POST','DELETE'].includes(request.method))return json({error:'허용되지 않은 요청입니다.'},405);
    if(request.method!=='GET' && !isSameOriginRequest(request))return json({error:'허용되지 않은 요청 출처입니다.'},403);
    try {
      const storage=store(); const state=normalizeState(await read());
      if(request.method==='POST') {
        const form=await limitedForm(request);
        if([...form.keys()].some(k=>!['file','slot','targetId'].includes(k)) || form.getAll('file').length!==1)throw new InputError('파일은 하나씩 선택하세요.');
        const targetId=String(form.get('targetId')||'');
        const collection=form.get('slot')==='archive'?state.documents:state.personnel;
        if(targetId && !collection.some(p=>p.id===targetId))throw new InputError('자료를 찾을 수 없습니다.',404);
        const file=form.get('file'); if(!file || typeof file.arrayBuffer!=='function')throw new InputError('파일을 선택하세요.');
        const slot=String(form.get('slot')||''); const checked=inspectUpload(await file.arrayBuffer(),file.name,slot);
        const id=crypto.randomUUID(); const createdAt=new Date().toISOString();
        const manifest={id,targetId,slot,name:checked.name,contentType:checked.contentType,bytes:checked.bytes,sha256:checked.sha256,sourceSha256:checked.sourceSha256,createdAt};
        await storage.setJSON('meta/'+id,manifest);
        await storage.set('body/'+id,checked.data);
        return json({upload:manifest,warnings:checked.warnings,previewUrl:'/api/uploads?id='+id});
      }
      if(request.method==='GET') {
        const id=new URL(request.url).searchParams.get('id');
        if(!/^[0-9a-f-]{36}$/.test(id||''))return json({error:'첨부를 찾을 수 없습니다.'},404);
        const meta=await storage.get('meta/'+id,{type:'json'});
        if(!meta)return json({error:'첨부를 찾을 수 없습니다.'},404);
        const data=await storage.get('body/'+id,{type:'arrayBuffer'});
        if(!data)return json({error:'첨부를 찾을 수 없습니다.'},404);
        return new Response(data,{headers:uploadedHeaders(meta.contentType)});
      }
      const body=await request.json().catch(()=>({}));
      if(body.cleanup===true) {
        const {blobs}=await storage.list({prefix:'meta/'}); let removed=0;
        for(const blob of blobs.slice(0,100)) {
          const meta=await storage.get(blob.key,{type:'json'});
          // An expired staging token cannot be attached; a one-hour grace covers in-flight saves.
          if(meta && Date.now()>Date.parse(meta.createdAt)+UPLOAD_TTL+3600000 && !currentFileIds(state).has(meta.id)){
            const latest=normalizeState(await read());
            if(await discardUpload(storage,meta.id,latest))removed++;
          }
        }
        return json({removed});
      }
      // Explicit cancellation retires a token; delayed cleanup avoids racing an in-flight save.
      if(!/^[0-9a-f-]{36}$/.test(body.id||''))throw new InputError('첨부 식별자를 확인하세요.');
      const meta=await storage.get('meta/'+body.id,{type:'json'});
      if(meta && !currentFileIds(state).has(body.id)) await storage.setJSON('meta/'+body.id,{...meta,cancelled:true});
      return json({ok:true});
    }catch(error){return json({error:error instanceof InputError?error.message:'첨부 파일을 처리하지 못했습니다. 다시 시도하세요.'},error instanceof InputError?error.status:503);}
  };
}
export default createUploadsHandler();
