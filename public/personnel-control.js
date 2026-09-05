const escapeHTML=(value='')=>String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fields=['name','employeeId','position','division','clearance','status','assignment','appointed','duties','assessment','note','qualifications'];
const labelAudience=value=>value?.length?value.map(r=>r==='director'?'지부장':'현장요원').join(' · '):'관제 전용';
export function createPersonnelManager({getState,setState,onUnauthorized,toast}) {
  const $=selector=>document.querySelector(selector);
  const panel=$('#control-personnel');
  let cleanupStarted=false;
  let editingId=null,baseRevision=0,dirty=false,pending={},uploading=0,epoch=0,busy=false,publishingId=null;
  const form=$('#personnel-edit-form');
  const dialog=$('#personnel-editor');
  const frame=$('#personnel-upload-preview');
  const external=document.createElement('a');external.className='text-button';external.textContent='첨부 새 탭에서 열기';external.target='_blank';external.rel='noopener noreferrer';external.hidden=true;frame.parentElement.before(external);
  function resetPreview(){frame.src='about:blank';frame.hidden=true;external.hidden=true;external.removeAttribute('href');$('#personnel-preview-empty').hidden=false;}
  const message=text=>{$('#personnel-error').textContent=text;};
  async function request(path,options={}) {
    const response=await fetch(path,options);const result=await response.json().catch(()=>({}));
    if(response.status===401){onUnauthorized();throw new Error('세션이 만료되었습니다.');}
    if(!response.ok){const error=new Error(result.error||'요청을 처리하지 못했습니다.');error.status=response.status;error.state=result.state;throw error;}return result;
  }
  function current(){return getState()?.personnel.find(p=>p.id===editingId);}
  function updateButtons(){ $('#personnel-save').disabled=busy||uploading>0; $('#personnel-save').textContent=busy?'저장 중…':uploading?'첨부 확인 중…':editingId?'인사정보 저장':'비공개로 등록'; }
  function attachments() {
    for(const slot of ['portrait','record']){
      const node=$('#personnel-'+slot+'-current');const staged=pending[slot];
      const person=current();const source=slot==='portrait'?{name:person?.fileName||'사원증 원본',url:person?.image}:person?.attachment;
      const value=staged===null?null:staged?{name:staged.upload.name,url:staged.previewUrl}:source;
      node.replaceChildren();
      if(value?.url){const link=document.createElement('button');link.type='button';link.className='text-button';link.textContent=value.name;link.addEventListener('click',()=>preview(value.url));node.append(link);}
      else node.textContent='첨부 없음';
      $('#personnel-'+slot+'-remove').disabled=!value?.url||busy;
    }
  }
  function preview(url){external.href=url;external.hidden=false;frame.src=url;$('#personnel-preview-empty').hidden=true;frame.hidden=false;}
  function discardPending(){ for(const staged of Object.values(pending))if(staged?.upload)fetch('/api/uploads',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:staged.upload.id})}).catch(()=>{});pending={}; }
  function open(id=null,force=false) {
    if(!force&&dialog.open&&dirty&&!confirm('저장하지 않은 변경사항을 버릴까?'))return;
    discardPending();epoch++;uploading=0;busy=false;
    editingId=id;baseRevision=getState().revision;dirty=false;message('');form.reset();
    const person=current();for(const key of fields)form.elements[key].value=key==='qualifications'?(person?.[key]||[]).join('\n'):person?.[key]||'';
    $('#personnel-editor-title').textContent=person?person.name+' · 인사기록 수정':'새 인사기록';
    $('#personnel-editor-audience').textContent='현재 공개: '+labelAudience(person?.audience);
    $('#personnel-reload').hidden=true;
    resetPreview();
    attachments();updateButtons();if(!dialog.open)dialog.showModal();form.elements.name.focus();
  }
  function close(force=false){
    if(busy)return;
    if(!force&&dirty&&!confirm('저장하지 않은 변경사항을 버릴까?'))return;
    discardPending();epoch++;uploading=0;dirty=false;dialog.close();resetPreview();
  }
  function render() {
    const state=getState();if(!state)return;
    if(!cleanupStarted){cleanupStarted=true;fetch('/api/uploads',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({cleanup:true})}).catch(()=>{});}
    const search=$('#personnel-search').value.trim().toLowerCase();const filter=$('#personnel-audience-filter').value;
    const list=state.personnel.filter(p=>(!search||[p.name,p.employeeId,p.position,p.division].join(' ').toLowerCase().includes(search))&&(filter==='all'||(filter==='private'?!p.audience?.length:p.audience?.includes(filter))));
    $('#personnel-managed-count').textContent=state.personnel.length+'명';
    $('#personnel-manage-rows').innerHTML=list.map(p=>'<tr><td class="bulk-cell"><input type="checkbox" data-bulk-item="personnel" value="'+escapeHTML(p.id)+'" aria-label="'+escapeHTML(p.name)+' 선택"></td><td class="hr-order">'+escapeHTML(p.order)+'</td><td><div class="hr-person">'+(p.image?'<img src="'+escapeHTML(p.image)+'" alt="" loading="lazy">':'<span class="hr-avatar">UGN</span>')+'<div><b>'+escapeHTML(p.name)+'</b><small>'+escapeHTML(p.employeeId)+'</small></div></div></td><td>'+escapeHTML(p.position||'미기록')+'<small class="hr-cell-note">'+escapeHTML(p.division)+'</small></td><td><span class="hr-audience '+(p.audience?.length?'is-public':'')+'">'+labelAudience(p.audience)+'</span></td><td><div class="hr-row-actions"><button class="secondary-button" data-hr-edit="'+escapeHTML(p.id)+'">수정·첨부</button><button class="secondary-button" data-hr-audience="'+escapeHTML(p.id)+'">공개 대상</button><button class="text-button" data-hr-move="'+escapeHTML(p.id)+'" data-direction="up" aria-label="'+escapeHTML(p.name)+' 위로">↑</button><button class="text-button" data-hr-move="'+escapeHTML(p.id)+'" data-direction="down" aria-label="'+escapeHTML(p.name)+' 아래로">↓</button></div></td></tr>').join('')||'<tr><td colspan="6" class="hr-no-records">조건에 맞는 인사기록이 없습니다.</td></tr>';
  }
  async function save(event){
    event.preventDefault();if(busy||uploading)return;
    const version=epoch;message('');
    const data=Object.fromEntries(fields.map(key=>[key,key==='qualifications'?form.elements[key].value.split('\n').map(s=>s.trim()).filter(Boolean):form.elements[key].value.trim()]));
    const uploads=Object.fromEntries(Object.entries(pending).map(([slot,v])=>[slot,v===null?null:v.upload.id]));
    busy=true;updateButtons();
    try{
      const result=await request('/api/personnel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',revision:baseRevision,id:editingId,data,uploads})});
      if(version!==epoch)return;
      pending={};dirty=false;setState(result.state);busy=false;close(true);toast('인사기록을 저장했습니다. 공개 대상은 유지됩니다.');
    }catch(error){if(version!==epoch)return;if(error.state)setState(error.state);message(error.message);$('#personnel-reload').hidden=error.status!==409;}
    finally{if(version===epoch){busy=false;updateButtons();}}
  }
  async function stage(input){
    const file=input.files[0];if(!file)return;const slot=input.dataset.hrUpload;const version=epoch;
    if(file.size>4*1024*1024){message('파일은 4MiB 이하여야 합니다.');input.value='';return;}
    const old=pending[slot];uploading++;dirty=true;updateButtons();message('첨부 파일을 확인하고 있어…');
    input.disabled=true;
    try{
      const data=new FormData();data.set('file',file);data.set('slot',slot);if(editingId)data.set('targetId',editingId);
      const result=await request('/api/uploads',{method:'POST',body:data});
      if(version!==epoch){fetch('/api/uploads',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:result.upload.id})}).catch(()=>{});return;}
      pending[slot]=result;
      if(old?.upload)fetch('/api/uploads',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:old.upload.id})}).catch(()=>{});
      attachments();preview(result.previewUrl);message(result.warnings.join('\n')||'첨부 미리보기를 확인한 뒤 인사정보를 저장하세요.');
    }catch(error){if(version===epoch)message(error.message);}
    finally{input.disabled=false;input.value='';if(version===epoch){uploading--;updateButtons();}}
  }
  function chooseAudience(id){
    publishingId=id;const person=getState().personnel.find(p=>p.id===id);if(!person)return;
    $('#personnel-publish-title').textContent=person.name+' · 공개 대상';
    const publish=$('#personnel-publish-form');publish.dataset.revision=getState().revision;
    publish.elements.director.checked=person.audience.includes('director');publish.elements.agent.checked=person.audience.includes('agent');
    $('#personnel-publish-error').textContent='';$('#personnel-publish-dialog').showModal();
  }
  async function publish(makePrivate=false) {
    const publish=$('#personnel-publish-form');const selected=makePrivate?[]:['director','agent'].filter(r=>publish.elements[r].checked);
    const button=$('#personnel-publish-save');button.disabled=true;$('#personnel-unpublish').disabled=true;const version=epoch;
    try{
      const result=await request('/api/personnel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'audience',revision:Number(publish.dataset.revision),id:publishingId,audience:selected})});
      if(version!==epoch)return;setState(result.state);$('#personnel-publish-dialog').close();toast(selected.length?'선택한 인사기록의 공개 대상을 변경했습니다.':'선택한 인사기록을 비공개로 전환했습니다.');
    }catch(error){if(version!==epoch)return;if(error.state)setState(error.state);$('#personnel-publish-error').textContent=error.message+' 창을 닫고 공개 대상을 다시 확인하세요.';}
    finally{button.disabled=false;$('#personnel-unpublish').disabled=false;}
  }
  panel.addEventListener('click',async event=>{
    const edit=event.target.closest('[data-hr-edit]');if(edit)open(edit.dataset.hrEdit);
    const audience=event.target.closest('[data-hr-audience]');if(audience)chooseAudience(audience.dataset.hrAudience);
    const move=event.target.closest('[data-hr-move]');if(move){move.disabled=true;const version=epoch;try{const result=await request('/api/personnel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'move',revision:getState().revision,id:move.dataset.hrMove,direction:move.dataset.direction})});if(version===epoch)setState(result.state);}catch(error){if(version===epoch){if(error.state)setState(error.state);toast(error.message);}}finally{move.disabled=false;}}
  });
  $('#personnel-add').addEventListener('click',()=>open());
  $('#personnel-search').addEventListener('input',render);$('#personnel-audience-filter').addEventListener('change',render);
  form.addEventListener('input',()=>{dirty=true;});form.addEventListener('submit',save);
  $('#personnel-save').addEventListener('click',()=>form.requestSubmit());
  document.querySelectorAll('[data-hr-upload]').forEach(input=>input.addEventListener('change',()=>stage(input)));
  for(const slot of ['portrait','record'])$('#personnel-'+slot+'-remove').addEventListener('click',()=>{const old=pending[slot];if(old?.upload)fetch('/api/uploads',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:old.upload.id})}).catch(()=>{});pending[slot]=null;dirty=true;attachments();resetPreview();});
  $('#personnel-editor-close').addEventListener('click',()=>close());
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  $('#personnel-reload').addEventListener('click',()=>open(editingId));
  $('#personnel-publish-form').addEventListener('submit',event=>{event.preventDefault();publish();});
  $('#personnel-unpublish').addEventListener('click',()=>publish(true));$('#personnel-publish-close').addEventListener('click',()=>$('#personnel-publish-dialog').close());
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  return {render,open,clear(){cleanupStarted=false;epoch++;busy=false;uploading=0;dirty=false;pending={};editingId=null;publishingId=null;dialog.close();$('#personnel-publish-dialog').close();resetPreview();form.reset();$('#personnel-manage-rows').replaceChildren();message('');}};
}
