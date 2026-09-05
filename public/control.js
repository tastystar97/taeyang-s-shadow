import {setupNumberTemplates} from '/number-templates.js';
import {createCasesUI} from '/cases-ui.js';
import {createWorkflowViewer} from '/workflow-control.js';
import {createArchiveManager} from './archive-control.js';
import { createPersonnelManager } from '/personnel-control.js';
import { playLoginSequence } from '/login-sequence.js';

const app = { state: null, epoch: 0 };
setupNumberTemplates(()=>app.state,toast);
const authChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('tcb-auth') : null;
function clearControl(message = '') { app.epoch += 1; app.state = null; personnelManager.clear(); archiveManager.clear(); workflowViewer.clear(); casesUI.clear(); closePlayerPreview(); $('.control-main').hidden = true; $('#control-gate').hidden = false; $('#control-error').textContent = message; $$('form').forEach(f => f.reset()); ['#control-notice-list','#control-evidence-list','#approval-list','#control-document-list','#control-log'].forEach(id => $(id).replaceChildren()); }
if (authChannel) authChannel.onmessage = () => { clearControl(); boot(); };
window.addEventListener('pageshow', e => { if(e.persisted) { clearControl(); boot(); } });
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const NOTICE_TARGET_LABELS = { command: '지부 공용 단말', workflow: '전자서류 · 체크리스트', archive: '문서·증거 아카이브', evidence: '아카이브 · 증거품', cases: '사건철', personnel: '인사기록부', city: '태양시 정보' };

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { if (response.status === 401) clearControl('세션이 만료되었습니다. 다시 접속하세요.'); const error = new Error(data.error || '요청 실패'); error.status = response.status; error.state = data.state; throw error; }
  return data;
}

function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2400); }

const BULK_LABELS = { cases: '사건철', personnel: '인사기록', documents: '문서', evidence: '증거품' };
function syncBulkToolbar(toolbar) {
  const type = toolbar.dataset.bulkToolbar;
  const items = $$('[data-bulk-item="' + type + '"]:not(:disabled)');
  const selected = items.filter(item => item.checked);
  const all = toolbar.querySelector('[data-bulk-select-all]');
  all.checked = items.length > 0 && selected.length === items.length;
  all.indeterminate = selected.length > 0 && selected.length < items.length;
  toolbar.querySelector('[data-bulk-count]').textContent = selected.length + '건 선택';
  toolbar.querySelectorAll('[data-bulk-apply],[data-bulk-private],[data-bulk-delete-documents]').forEach(button => { button.disabled = toolbar.dataset.busy === 'true' || selected.length === 0; });
  const deleteButton=toolbar.querySelector('[data-bulk-delete-documents]');
  if(deleteButton){const protectedSelected=selected.some(item=>{const doc=app.state?.documents.find(entry=>entry.id===item.value);return !doc||doc.sourceKind!=='upload'||!doc.createdAt;});deleteButton.disabled=deleteButton.disabled||protectedSelected;deleteButton.title=protectedSelected?'관제에서 직접 등록한 업로드 문서만 삭제할 수 있습니다.':'';}
}
function syncAllBulkToolbars() { $$('[data-bulk-toolbar]').forEach(syncBulkToolbar); }
async function applyBulkPublication(toolbar, privateOnly) {
  if (toolbar.dataset.busy === 'true') return;
  const type = toolbar.dataset.bulkToolbar;
  const ids = $$('[data-bulk-item="' + type + '"]:checked:not(:disabled)').map(item => item.value);
  if (!ids.length) { toast('변경할 ' + BULK_LABELS[type] + '을 먼저 선택하세요.'); return; }
  const audience = privateOnly ? [] : ['director', 'agent'].filter(role => toolbar.querySelector('[data-bulk-role="' + role + '"]').checked);
  if (!privateOnly && !audience.length) { toast('공개할 역할을 하나 이상 선택하세요.'); return; }
  toolbar.dataset.busy = 'true'; syncBulkToolbar(toolbar);
  try {
    const result = await api('/api/publication', { method: 'POST', body: JSON.stringify({ revision: app.state.revision, type, ids, audience }) });
    app.state = result.state; render();
    toast(BULK_LABELS[type] + ' ' + result.changed + '건을 ' + (privateOnly ? '비공개했습니다.' : '선택한 역할에 공개했습니다.'));
  } catch (error) {
    if (error.state) { app.state = error.state; render(); }
    toast(error.message);
  } finally {
    toolbar.dataset.busy = 'false'; syncBulkToolbar(toolbar);
  }
}
async function deleteBulkDocuments(toolbar) {
  if(toolbar.dataset.busy==='true')return;
  const ids=$$('[data-bulk-item="documents"]:checked:not(:disabled)').map(item=>item.value);
  if(!ids.length){toast('삭제할 문서를 먼저 선택하세요.');return;}
  const docs=ids.map(id=>app.state.documents.find(doc=>doc.id===id));
  if(docs.some(doc=>!doc||doc.sourceKind!=='upload'||!doc.createdAt)){toast('관제에서 직접 등록한 업로드 문서만 삭제할 수 있습니다.');return;}
  if(!confirm('선택한 문서 '+ids.length+'건을 삭제할까? 사건철 연결과 관련 알림도 함께 제거됩니다.'))return;
  toolbar.dataset.busy='true';syncBulkToolbar(toolbar);
  try{const result=await api('/api/archive',{method:'DELETE',body:JSON.stringify({action:'delete',revision:app.state.revision,ids})});app.state=result.state;render();toast('문서 '+result.deleted+'건을 삭제했습니다.');}
  catch(error){if(error.state){app.state=error.state;render();}toast(error.message);}
  finally{toolbar.dataset.busy='false';syncBulkToolbar(toolbar);}
}
async function load() { const epoch=app.epoch; const result = await api('/api/state'); if(epoch!==app.epoch)return; if (result.state.role !== 'gm') { clearControl('관제 코드로 접속하세요.'); return; } app.state = result.state; $('.control-main').hidden = false; $('#control-gate').hidden = true; render(); }

async function mutate(action, payload = {}) {
  const epoch=app.epoch;
  try { const result = await api('/api/state', { method: 'PATCH', body: JSON.stringify({ action, payload, revision: app.state.revision }) }); if(epoch!==app.epoch)return false; app.state = result.state; render(); return true; }
  catch (error) { if (error.status === 409) { await load(); toast('최신 상태를 다시 불러왔습니다.'); } else toast(error.message); return false; }
}

async function uploadEvidence(form) {
  const epoch=app.epoch;
  const editing = Boolean(form.elements.id.value); const method = editing ? 'PATCH' : 'POST'; const button = form.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = editing ? '수정 저장 중…' : '등록 중…';
  const formData = new FormData(form); formData.set('revision', app.state.revision);
  try {
    let response = await fetch('/api/evidence', { method, body: formData }); let data = await response.json().catch(() => ({}));
    if(epoch!==app.epoch)return;
    if (response.status === 409 && data.state) { app.state = data.state; render(); throw new Error('다른 단말의 변경을 확인한 뒤 다시 저장하세요.'); }
    if (response.status === 401) clearControl('세션이 만료되었습니다.');
    if (!response.ok) throw new Error(data.error || (editing ? '증거 사진을 수정하지 못했습니다.' : '증거 사진을 등록하지 못했습니다.'));
    app.state = data.state; render(); resetEvidenceForm(form); toast(editing ? '증거품 정보가 수정되었습니다.' : '증거 사진이 비공개로 저장되었습니다.');
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; button.textContent = form.elements.id.value ? '증거품 수정 저장' : '증거 사진 등록'; }
}

function resetEvidenceForm(form = $('#evidence-upload-form')) { form.reset(); form.elements.id.value = ''; form.elements.image.required = true; form.querySelector('button[type="submit"]').textContent = '증거 사진 등록'; $('#evidence-file-help').textContent = 'JPG, PNG, WEBP, GIF · 최대 4MiB'; $('#evidence-cancel-button').hidden = true; }

function editEvidence(id) {
  const evidence = (app.state.evidence || []).find((entry) => entry.id === id); if (!evidence) return;
  const form = $('#evidence-upload-form'); form.elements.id.value = evidence.id; form.elements.category.value = evidence.category || '현장사진'; form.elements.caseCode.value = evidence.caseCode || ''; form.elements.title.value = evidence.title || ''; form.elements.location.value = evidence.location || ''; form.elements.capturedAt.value = (evidence.capturedAt || '').slice(0, 16); form.elements.description.value = evidence.description || ''; form.elements.image.value = ''; form.elements.image.required = false; form.querySelector('button[type="submit"]').textContent = '증거품 수정 저장'; $('#evidence-file-help').textContent = `현재 파일: ${evidence.fileName || '원본 이미지'} · 새 사진을 선택하면 교체됩니다.`; $('#evidence-cancel-button').hidden = false; form.scrollIntoView({ behavior: 'smooth', block: 'start' }); form.elements.title.focus({ preventScroll: true });
}

async function deleteEvidence(id) {
  const epoch=app.epoch;
  try {
    const request = () => fetch('/api/evidence', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, revision: app.state.revision }) });
    let response = await request(); let data = await response.json().catch(() => ({}));
    if(epoch!==app.epoch)return;
    if (response.status === 409 && data.state) { app.state = data.state; render(); throw new Error('다른 단말의 변경을 확인한 뒤 다시 저장하세요.'); }
    if (response.status === 401) clearControl('세션이 만료되었습니다.');
    if (!response.ok) throw new Error(data.error || '증거 사진을 삭제하지 못했습니다.');
    app.state = data.state; if ($('#evidence-upload-form').elements.id.value === id) resetEvidenceForm(); render(); toast('증거품을 삭제했습니다.');
  } catch (error) { toast(error.message); }
}

function render() {
  personnelManager.render(); archiveManager.render(); casesUI.render(); workflowViewer.render();
  const state = app.state;
  $$('[data-phase]').forEach((button) => button.classList.toggle('active', Number(button.dataset.phase) === state.operation.phase));
  const notices = state.notices || []; $('#notice-count').textContent = `${notices.length} ACTIVE`; $('#control-notice-empty').hidden = notices.length > 0;
  $('#control-notice-list').innerHTML = notices.map((notice) => { const target = notice.formId ? '반려된 전자서류 직접 열기' : (NOTICE_TARGET_LABELS[notice.target] || '지부 공용 단말'); return `<article class="control-notice-card"><time>${escapeHTML(notice.time || '--:--')}</time><div><span>${notice.priority ? 'PRIORITY' : 'SIGNAL'} · → ${escapeHTML(target)}</span><h3>${escapeHTML(notice.title)}</h3><p>${escapeHTML(notice.body)}</p></div><button class="danger-button" type="button" data-delete-notice="${escapeHTML(notice.id)}" aria-label="${escapeHTML(notice.title)} 알림 삭제">삭제</button></article>`; }).join('');
  const evidence = (state.evidence || []).filter(item => item.sourceKind !== 'static'); $('#evidence-register-count').textContent = `${evidence.length} REGISTERED`; $('#control-evidence-empty').hidden = evidence.length > 0;
  $('#control-evidence-list').innerHTML = evidence.map((item) => { const version = item.updatedAt || item.createdAt || ''; const source = `/api/evidence?id=${encodeURIComponent(item.id)}&v=${encodeURIComponent(version)}`; const audience=(item.audience||[]).map(role=>role==='director'?'지부장':'현장요원').join(' · ')||'관제 전용'; return `<article class="control-evidence-card"><label class="bulk-card-check"><input type="checkbox" data-bulk-item="evidence" value="${escapeHTML(item.id)}" aria-label="${escapeHTML(item.title)} 선택"><span class="sr-only">선택</span></label><img src="${source}" alt="${escapeHTML(item.title)}" loading="lazy"><div><span>${escapeHTML(item.category || '현장사진')} · ${escapeHTML(item.caseCode || 'NO CASE')}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.location || '촬영지 미기록')} · ${escapeHTML(item.fileName || '원본 이미지')}</p><small class="hr-audience">${escapeHTML(audience)}</small></div><div class="approval-actions"><button class="secondary-button" type="button" data-publish-evidence="${escapeHTML(item.id)}">공개 대상</button><button class="secondary-button" type="button" data-edit-evidence="${escapeHTML(item.id)}">수정</button><button class="danger-button" type="button" data-delete-evidence="${escapeHTML(item.id)}">삭제</button></div></article>`; }).join('');
  const pending = state.forms.filter((form) => form.kind === 'director-form' && form.status === 'SUBMITTED'); $('#pending-count').textContent = `${pending.length} PENDING`; $('#approval-empty').hidden = pending.length > 0;
  $('#approval-list').innerHTML = pending.map((form) => `<article class="approval-card"><span>${escapeHTML((form.template||'보관 서식').toUpperCase())}</span><div><h3>${escapeHTML(form.title)}</h3><small>서명 ${escapeHTML(form.signature)} · ${formatDate(form.updatedAt)}</small></div><div class="approval-actions"><button class="secondary-button" data-open-workflow="${escapeHTML(form.id)}">서류 열기</button></div></article>`).join('');
  const forms = [...state.forms].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); $('#document-count').textContent = `${forms.length} RECORDS`; $('#control-document-empty').hidden = forms.length > 0;
  $('#control-document-list').innerHTML = forms.map((form) => `<article class="approval-card"><span>${escapeHTML(form.status)}</span><div><h3>${escapeHTML(form.title)}</h3><small>${escapeHTML((form.template||'보관 서식').toUpperCase())} · ${formatDate(form.updatedAt)}${form.comment ? ` · 반려: ${escapeHTML(form.comment)}` : ''}</small></div><div class="approval-actions"><button class="secondary-button" data-open-workflow="${escapeHTML(form.id)}">서류 열기</button><button class="danger-button" data-delete-control="${escapeHTML(form.id)}">삭제</button></div></article>`).join('');
  $('#control-log').innerHTML = state.activity.slice(0, 8).map((entry) => `<li><time>${formatDate(entry.at)}</time><b>${escapeHTML(entry.action)}</b><span>${escapeHTML(entry.detail)}</span></li>`).join('') || '<li><span>아직 기록된 관제 활동이 없습니다.</span></li>';
  syncAllBulkToolbars();
}

function formatDate(value) { if(!value||Number.isNaN(Date.parse(value)))return '미기록'; return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }

async function boot() {
  try { const session = await api('/api/auth'); if (session.authenticated && session.role === 'gm') { $('#control-gate').hidden = true; await Promise.all([load(), playLoginSequence('gm')]); } }
  catch { clearControl('서버에 연결하지 못했습니다. 다시 시도하세요.'); }
}

$('#control-login').addEventListener('submit', async (event) => { event.preventDefault(); $('#control-error').textContent = ''; const code = $('#control-code').value.trim(); try { await api('/api/auth', { method: 'POST', body: JSON.stringify({ role: 'gm', code }) }); $('#control-code').value = ''; authChannel?.postMessage('changed'); $('#control-gate').hidden = true; await Promise.all([load(), playLoginSequence('gm')]); } catch (error) { $('#control-error').textContent = error.message; $('#control-code').select(); } });
$('#control-phase').addEventListener('click', (event) => { const button = event.target.closest('[data-phase]'); if (button) mutate('set-phase', { phase: Number(button.dataset.phase) }); });
$('#notice-form').addEventListener('submit', (event) => { event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form)); data.priority = form.elements.priority.checked; mutate('add-notice', data).then((saved) => { if (saved) { form.reset(); toast('공용 단말에 알림을 송신했습니다.'); } }); });
$('#control-notice-list').addEventListener('click', (event) => { const button = event.target.closest('[data-delete-notice]'); if (button && confirm('이 알림을 공용 단말에서 삭제할까?')) mutate('delete-notice', { id: button.dataset.deleteNotice }).then((saved) => { if (saved) toast('알림을 삭제했습니다.'); }); });
$('#evidence-upload-form').addEventListener('submit', (event) => { event.preventDefault(); uploadEvidence(event.currentTarget); });
$('#evidence-cancel-button').addEventListener('click', () => resetEvidenceForm());
$('#control-evidence-list').addEventListener('click', (event) => { const publish = event.target.closest('[data-publish-evidence]'); const edit = event.target.closest('[data-edit-evidence]'); const remove = event.target.closest('[data-delete-evidence]'); if (publish) casesUI.publish('evidence',publish.dataset.publishEvidence); if (edit) editEvidence(edit.dataset.editEvidence); if (remove && confirm('이 증거품을 목록에서 삭제할까?')) deleteEvidence(remove.dataset.deleteEvidence); });
$('#control-document-list').addEventListener('click', (event) => { const button = event.target.closest('[data-delete-control]'); if (button && confirm('이 전자서류를 영구 삭제할까?')) mutate('delete-form-control', { id: button.dataset.deleteControl }).then((saved) => { if (saved) toast('전자서류를 삭제했습니다.'); }); });
document.addEventListener('change', event => {
  const selectAll = event.target.closest('[data-bulk-select-all]');
  if (selectAll) {
    const toolbar = selectAll.closest('[data-bulk-toolbar]'), type = toolbar.dataset.bulkToolbar;
    $$('[data-bulk-item="' + type + '"]:not(:disabled)').forEach(item => { item.checked = selectAll.checked; });
    syncBulkToolbar(toolbar); return;
  }
  const item = event.target.closest('[data-bulk-item]');
  if (item) { const toolbar = document.querySelector('[data-bulk-toolbar="' + item.dataset.bulkItem + '"]'); if (toolbar) syncBulkToolbar(toolbar); }
});
document.addEventListener('click', event => {
  const deleteDocuments=event.target.closest('[data-bulk-delete-documents]');
  if(deleteDocuments){deleteBulkDocuments(deleteDocuments.closest('[data-bulk-toolbar]'));return;}
  const action = event.target.closest('[data-bulk-apply],[data-bulk-private]');
  if (action) applyBulkPublication(action.closest('[data-bulk-toolbar]'), action.hasAttribute('data-bulk-private'));
});
const BULK_CONTAINERS = { cases: '#cases-list', personnel: '#personnel-manage-rows', documents: '#archive-manage-rows', evidence: '#control-evidence-list' };
for (const [type, selector] of Object.entries(BULK_CONTAINERS)) {
  const toolbar = document.querySelector('[data-bulk-toolbar="' + type + '"]');
  new MutationObserver(() => syncBulkToolbar(toolbar)).observe($(selector), { childList: true });
}
$('#control-logout').addEventListener('click', async () => { clearControl(); try { await api('/api/auth', {method:'DELETE'}); authChannel?.postMessage('changed'); } catch { $('#control-error').textContent = '로그아웃 요청을 완료하지 못했습니다.'; } });
const casesUI=createCasesUI({getState:()=>app.state,setState:state=>{app.state=state;render();},toast,gm:true,openResource:(type,id)=>{if(type==='personnel')personnelManager.open(id);else if(type==='documents')archiveManager.open(id);else if(type==='forms')workflowViewer.open(id);else if(type==='evidence'){const item=app.state.evidence.find(e=>e.id===id);if(item)window.open(item.src||('/api/evidence?id='+encodeURIComponent(id)),'_blank','noopener');}}});
const workflowViewer=createWorkflowViewer({getState:()=>app.state,setState:state=>{app.state=state;render();},api,toast});
const archiveManager=createArchiveManager({getState:()=>app.state,setState:state=>{app.state=state;render();},onUnauthorized:()=>clearControl('세션이 만료되었습니다.'),toast});
const personnelManager=createPersonnelManager({getState:()=>app.state,setState:state=>{app.state=state;render();},onUnauthorized:()=>clearControl('세션이 만료되었습니다.'),toast});
function controlArchiveTab(name,updateHash=false){const tab=name==='evidence'?'evidence':'documents';document.querySelectorAll('[data-control-archive-tab]').forEach(button=>{const active=button.dataset.controlArchiveTab===tab;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});$('#control-archive-documents').hidden=tab!=='documents';$('#control-archive-evidence').hidden=tab!=='evidence';if(updateHash)history.replaceState(null,'','#'+(tab==='evidence'?'evidence':'archive'));}
function controlView(name){const evidence=name==='evidence';name=evidence?'archive':(['operations','cases','personnel','archive','workflow'].includes(name)?name:'operations');for(const view of ['operations','cases','personnel','archive','workflow'])$('#control-'+view).hidden=view!==name;if(name==='archive')controlArchiveTab(evidence?'evidence':'documents');document.querySelectorAll('[data-control-view]').forEach(button=>button.classList.toggle('active',button.dataset.controlView===name));history.replaceState(null,'','#'+(evidence?'evidence':name));}
document.querySelectorAll('[data-control-view]').forEach(button=>button.addEventListener('click',()=>controlView(button.dataset.controlView)));
document.querySelectorAll('[data-control-archive-tab]').forEach(button=>button.addEventListener('click',()=>controlArchiveTab(button.dataset.controlArchiveTab,true)));
function openPlayerPreview(role){const dialog=$('#player-preview-dialog');$('#player-preview-title').textContent=(role==='director'?'지부장':'현장요원')+' 플레이어 미리보기';$('#player-preview-frame').src='/index.html?preview='+role+'#command';dialog.showModal();}
function closePlayerPreview(){$('#player-preview-frame').src='about:blank';if($('#player-preview-dialog').open)$('#player-preview-dialog').close();}
window.addEventListener('message',event=>{if(event.origin===location.origin&&event.data?.type==='tcb-close-preview')closePlayerPreview();});
$('#preview-director').addEventListener('click',()=>openPlayerPreview('director'));$('#preview-agent').addEventListener('click',()=>openPlayerPreview('agent'));$('#player-preview-close').addEventListener('click',closePlayerPreview);$('#player-preview-dialog').addEventListener('cancel',event=>{event.preventDefault();closePlayerPreview();});
controlView(location.hash.slice(1));
boot(); setInterval(() => { if (app.state && document.visibilityState === 'visible') load().catch(() => {}); }, 15_000);
