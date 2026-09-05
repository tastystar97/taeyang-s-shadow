import {createCasesUI} from '/cases-ui.js';
const PREVIEW_ROLE=new URLSearchParams(location.search).get('preview');
const IS_PREVIEW=['director','agent'].includes(PREVIEW_ROLE);
import {FORM_TEMPLATES,formTemplate,renderFormFieldsHTML} from '/form-templates.js';
import { playLoginSequence } from '/login-sequence.js';

const DEFAULT_STATE = { revision: 0, role: null, operation: {phase:1,act:'',title:''}, notices:[], checklist:{}, documents:[], personnel:[], evidence:[], forms:[], cases:[], archiveEntries:{}, activity:[] };

const PHASE_NAMES = { 1: 'PHASE 01 · 내정', 2: 'PHASE 02 · 현장', 3: 'PHASE 03 · 정산' };
const NOTICE_DESTINATIONS = {
  command: { label: '지부 공용 단말', button: '공용 단말 보기' },
  workflow: { label: '전자서류 · 체크리스트', button: '관련 서류 열기' },
  archive: { label: '문서 보관소', button: '관련 문서 열기' },
  evidence: { label: '증거품 · 현장사진', button: '증거품 보기' },
  cases: { label: '사건철', button: '사건철 보기' },
  personnel: { label: '인사기록부', button: '인사기록 보기' },
  city: { label: '태양시 정보', button: '도시 정보 보기' }
};
const LEGACY_NOTICE_DESTINATIONS = {};
const DIRECTOR_SIGNATURE = {};
const ARCHIVE_CATEGORIES = ['본부 공문','의료기록','인물 관련','개인 기록','지부 행정','본부 규정','도시 정보','사건 자료','증거품','기타 문서'];

const app = { epoch: 0, state: structuredClone(DEFAULT_STATE), mode: 'connecting', archiveTab: 'documents', archiveFilter: '전체', evidenceFilter: '전체', formId: null, autosaveTimer: null };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

async function api(path, options = {}) {
  if(IS_PREVIEW){if(options.method && options.method!=='GET')throw new Error('미리보기는 읽기 전용입니다.');if(path==='/api/state')path='/api/preview?role='+PREVIEW_ROLE;}
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(IS_PREVIEW ? {'X-TCB-Preview':'1'} : {}), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { if (response.status === 401 && path !== '/api/auth') clearSessionView('세션이 만료되었습니다. 다시 접속하세요.'); const error = new Error(data.error || '요청을 처리하지 못했습니다.'); error.status = response.status; error.data = data; throw error; }
  return data;
}

function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600); }

async function boot() {
  clearSessionView();
  try {
    if(IS_PREVIEW){await loadState();return;}
    const session = await api('/api/auth');
    if (session.role === 'gm') { location.replace('/control.html'); return; }
    if (!session.authenticated) { $('#access-error').textContent = session.configured === false ? '서버 인증 설정을 확인해야 합니다.' : ''; return; }
    await loadState(); await playLoginSequence('player');
  } catch (error) { clearSessionView(error.message || '서버에 연결하지 못했습니다.'); }
}

async function loadState() { const epoch = app.epoch; const result = await api('/api/state'); if (epoch !== app.epoch) return; if (!['director','agent'].includes(result.state.role)) { clearSessionView(); location.replace('/control.html'); return; } if (app.state.role && app.state.role !== result.state.role) clearSessionView(); app.state = result.state; app.mode = 'server'; renderAll(); $('.app-shell').hidden = false; $('#access-gate').hidden = true; $('#sync-label').textContent = `LAST SYNC · ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`; }

async function mutate(action, payload) {
  const epoch = app.epoch;
  if (IS_PREVIEW)throw new Error('미리보기는 읽기 전용입니다.');
  const agentActions = new Set(['save-field-report','submit-field-report','delete-field-report','mark-document-read']);
  if (app.mode !== 'server' || (app.state.role !== 'director' && !(app.state.role === 'agent' && agentActions.has(action)) && action !== 'mark-document-read')) throw new Error('이 역할에서는 변경할 수 없습니다.');
  try { const result = await api('/api/state', { method: 'PATCH', body: JSON.stringify({ action, payload, revision: app.state.revision }) }); if (epoch !== app.epoch) throw new Error('접속 상태가 변경되었습니다.'); app.state = result.state; renderAll(); $('#sync-label').textContent = 'SYNCED · SECURE STORE'; }
  catch (error) { if (error.status === 409) { await loadState(); showToast('다른 단말의 변경사항을 불러왔습니다. 다시 시도하세요.'); throw error; } throw error; }
}

function completeTemplateChecklist(templateId) { const template = FORM_TEMPLATES[templateId]; const items = app.state.checklist[app.state.operation.phase] || []; template?.checklist.forEach((id) => { const item = items.find((entry) => entry.id === id); if (item) item.done = true; }); }
function renderAll() { if(app.documentId && $('#document-dialog').open){const doc=app.state.documents.find(d=>d.id===app.documentId);if(!doc){$('#document-dialog').close();}else{if($('#document-new-tab').getAttribute('href')!==doc.url)$('#document-frame').src=doc.url;$('#document-new-tab').href=doc.url;$('#document-dialog-title').textContent=doc.title;$('#document-classification').textContent=doc.security;}} renderCommand(); renderPersonnel(); renderArchive(); renderEvidence(); renderWorkflow(); casesUI.render(); renderRole(); }

function noticeDestination(notice) {
  if (notice.formId) return { target: 'workflow', targetId: notice.formId, label: '반려된 전자서류', button: '반려 서류 열기' };
  const legacy = LEGACY_NOTICE_DESTINATIONS[notice.title];
  const target = NOTICE_DESTINATIONS[notice.target] ? notice.target : (legacy?.target || 'command');
  const destination = NOTICE_DESTINATIONS[target];
  return { target, targetId: notice.targetId || legacy?.targetId || '', label: destination.label, button: legacy?.button || destination.button };
}

function openNotice(id) {
  const notice = (app.state.notices || []).find((entry) => entry.id === id); if (!notice) return;
  const destination = noticeDestination(notice); openView(destination.target);
  if (notice.formId) { openForm(undefined, notice.formId); return; }
  if (destination.target === 'archive' && destination.targetId) openDocument(destination.targetId);
  if (destination.target === 'evidence' && destination.targetId) openEvidence(destination.targetId);
  if (destination.target === 'personnel' && destination.targetId) openPersonnel(destination.targetId);
  if (destination.target === 'cases' && destination.targetId) casesUI.open(destination.targetId);
}

function renderCommand() {
  const { operation, notices } = app.state;
  $('#operation-act').textContent = operation.act; $('#operation-title').textContent = operation.title; $('#phase-label').textContent = PHASE_NAMES[operation.phase];
  $$('#phase-track i').forEach((node, index) => node.classList.toggle('done', index < operation.phase));
  const priority = notices.find((notice) => notice.priority); const priorityButton = $('#priority-open');
  $('#priority-message').textContent = priority ? `${priority.title} · ${priority.body}` : '현재 긴급 수신 내용이 없습니다.';
  priorityButton.hidden = !priority; priorityButton.dataset.noticeId = priority?.id || ''; priorityButton.textContent = priority ? noticeDestination(priority).button : '열기';
  const recentSignals = notices.filter((notice) => !notice.priority).slice(0, 4);
  $('#signal-list').innerHTML = recentSignals.length ? recentSignals.map((notice, index) => { const destination = noticeDestination(notice); return `<li><button class="signal-entry" type="button" data-notice-id="${escapeHTML(notice.id)}" aria-label="${escapeHTML(notice.title)}: ${escapeHTML(destination.label)} 열기"><time>${escapeHTML(notice.time || '--:--')}</time><span><b>${escapeHTML(notice.title)}</b>${escapeHTML(notice.body)}</span><em>${index === 0 ? 'NEW · ' : ''}${escapeHTML(destination.label)} →</em></button></li>`; }).join('') : '<li class="signal-empty">현재 수신된 일반 알림이 없습니다.</li>';
  const items = app.state.checklist[operation.phase] || []; $('#command-checklist').innerHTML = items.slice(0, 5).map((item) => `<label><input data-check-id="${item.id}" type="checkbox" ${item.done ? 'checked' : ''}><span>${escapeHTML(item.title)}</span></label>`).join('');
  const done = items.filter((item) => item.done).length; const percent = items.length ? Math.round(done / items.length * 100) : 0; $('#command-completion').textContent = `${done} / ${items.length} COMPLETE`; $('#command-progress').style.width = `${percent}%`;
}

function updateArchiveTotal() { $('#archive-total-count').textContent = `${app.state.documents.length + app.state.evidence.length} RECORDS RELEASED`; }
function selectArchiveTab(name) {
  app.archiveTab = name === 'evidence' ? 'evidence' : 'documents';
  document.querySelectorAll('[data-archive-tab]').forEach(button => { const active=button.dataset.archiveTab===app.archiveTab; button.classList.toggle('active',active); button.setAttribute('aria-selected',String(active)); });
  $('#archive-documents-pane').hidden=app.archiveTab!=='documents'; $('#archive-evidence-pane').hidden=app.archiveTab!=='evidence';
}
function renderArchive() {
  const categories = ['전체', ...new Set([...ARCHIVE_CATEGORIES, ...app.state.documents.map((doc) => doc.category)])]; $('#archive-filters').innerHTML = categories.map((category) => `<button class="${app.archiveFilter === category ? 'active' : ''}" data-archive-filter="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join('');
  const term = $('#archive-search').value.trim().toLowerCase(); const docs = app.state.documents.filter((doc) => (app.archiveFilter === '전체' || doc.category === app.archiveFilter) && `${doc.title} ${doc.code} ${doc.category} ${doc.detail}`.toLowerCase().includes(term));
  $('#archive-count').textContent = app.state.documents.length; updateArchiveTotal(); $('#archive-rows').innerHTML = docs.length ? docs.map((doc) => { const editable = app.state.role === 'director' && doc.editable; return `<tr class="archive-row-link" data-doc="${escapeHTML(doc.id)}" tabindex="0" role="link" aria-label="${escapeHTML(doc.title)} 문서 열기"><td class="doc-code">${escapeHTML(doc.code)}</td><td class="doc-name"><b>${escapeHTML(doc.title)}</b><small>${escapeHTML(doc.category)} · ${escapeHTML(doc.detail)}${editable ? ' · 직접 작성 가능' : ''}</small></td><td><span class="security-chip">${escapeHTML(doc.security)}</span></td><td><span class="status-chip ${doc.status.toLowerCase()}">${escapeHTML(doc.status)}</span></td><td><span class="open-doc-button">문서 열기 →</span></td></tr>`; }).join('') : '<tr><td colspan="5">검색 조건에 맞는 문서가 없습니다.</td></tr>';
  selectArchiveTab(app.archiveTab);
}

function renderPersonnel() {
  $('#personnel-grid').innerHTML = (app.state.personnel || []).map((person) => `<button class="personnel-card" data-personnel-id="${person.id}"><span class="personnel-photo">${person.image ? `<img src="${escapeHTML(person.image)}" alt="${escapeHTML(person.name)} 사원증" loading="lazy">` : '<span class="personnel-no-image">UGN · 사진 미등록</span>'}<i>${person.order}</i></span><span><small>UGN HR FILE ${person.order} · ${escapeHTML(person.employeeId)}</small><b>${escapeHTML(person.name)}</b><strong>${escapeHTML(person.position)} · ${escapeHTML(person.clearance)}</strong><em>인사기록 열람 →</em></span></button>`).join('');
}

function renderEvidence() {
  const evidence = (app.state.evidence || []);
  const categories = ['전체', ...new Set(evidence.map((item) => item.category))];
  $('#evidence-filters').innerHTML = categories.map((category) => `<button class="${app.evidenceFilter === category ? 'active' : ''}" data-evidence-filter="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join('');
  const term = $('#evidence-search').value.trim().toLowerCase();
  const items = evidence.filter((item) => (app.evidenceFilter === '전체' || item.category === app.evidenceFilter) && `${item.title} ${item.caseCode} ${item.location} ${item.description}`.toLowerCase().includes(term));
  $('#evidence-count').textContent = evidence.length; updateArchiveTotal();
  $('#evidence-empty').hidden = evidence.length > 0;
  $('#evidence-grid').innerHTML = items.length ? items.map((item) => `<button class="evidence-card" data-evidence-id="${escapeHTML(item.id)}"><span class="evidence-thumb"><img src="${escapeHTML(evidenceSource(item))}" alt="${escapeHTML(item.title)}" loading="lazy"><i>${escapeHTML(item.category)}</i></span><span class="evidence-card-body"><small>${escapeHTML(item.caseCode || 'UNASSIGNED CASE')}</small><b>${escapeHTML(item.title)}</b><em>${escapeHTML(item.location || '촬영지 미기록')} · ${formatEvidenceDate(item.capturedAt)}</em></span></button>`).join('') : (evidence.length ? '<p class="evidence-no-results">검색 조건에 맞는 사진이 없습니다.</p>' : '');
}

function evidenceSource(item) { const version = item.updatedAt || item.createdAt || ''; return item.src || `/api/evidence?id=${encodeURIComponent(item.id)}&v=${encodeURIComponent(version)}`; }

function formatEvidenceDate(value) {
  if (!value) return '촬영시각 미기록';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function openEvidence(id) {
  const item = (app.state.evidence || []).find((entry) => entry.id === id); if (!item) return;
  const source = evidenceSource(item);
  $('#evidence-dialog-classification').textContent = item.category || 'VISUAL EVIDENCE'; $('#evidence-dialog-title').textContent = item.title;
  $('#evidence-case').textContent = item.caseCode || 'UNASSIGNED CASE'; $('#evidence-category').textContent = item.category || '미분류'; $('#evidence-captured').textContent = formatEvidenceDate(item.capturedAt); $('#evidence-location').textContent = item.location || '미기록'; $('#evidence-filename').textContent = item.fileName || '원본 파일'; $('#evidence-description').textContent = item.description || '추가 설명 없음';
  $('#evidence-loading').textContent = 'SECURE IMAGE LOADING…'; $('#evidence-loading').hidden = false; $('#evidence-image').alt = item.title; $('#evidence-image').src = source; $('#evidence-original').href = source; $('#evidence-dialog').showModal();
}

function openPersonnel(id) {
  const person = (app.state.personnel || []).find((entry) => entry.id === id); if (!person) return;
  $('#personnel-dialog-title').textContent = `${person.name} · 인사기록부`; $('#personnel-file-number').textContent = `UGN HR FILE ${person.order} · ${person.employeeId}`; $('#personnel-id-image').alt = `${person.name} 사원증 원본`; $('#personnel-id-image').src = person.image; $('#personnel-original').href = person.image || ''; $('#personnel-original').hidden = !person.image; $('#personnel-id-image').hidden = !person.image;
  $('#personnel-attachment').hidden = !person.attachment; $('#personnel-attachment').href=person.attachment?.url || ''; $('#personnel-attachment').textContent=person.attachment ? '인사 원문 · '+person.attachment.name : '';
  $('#personnel-record-name').textContent = person.name; $('#personnel-record-position').textContent = `${person.position} / ${person.division}`; $('#personnel-record-status').textContent = person.status; $('#personnel-record-id').textContent = person.employeeId; $('#personnel-record-clearance').textContent = person.clearance; $('#personnel-record-division').textContent = person.division; $('#personnel-record-assignment').textContent = person.assignment; $('#personnel-record-appointed').textContent = person.appointed; $('#personnel-record-duties').textContent = person.duties; $('#personnel-record-qualifications').innerHTML = person.qualifications.map((item) => `<li>${escapeHTML(item)}</li>`).join(''); $('#personnel-record-assessment').textContent = person.assessment; $('#personnel-record-note').textContent = person.note; $('#personnel-dialog').showModal();
}

function formIsEditable(form) { return !IS_PREVIEW && ['DRAFT','RETURNED'].includes(form.status) && ((form.kind === 'field-report' && app.state.role === 'agent') || (form.kind !== 'field-report' && app.state.role === 'director')); }
function selectWorkflowTab(name) { document.querySelectorAll('#view-workflow [data-workflow-tab]').forEach(button => { const active=button.dataset.workflowTab===name; button.classList.toggle('active',active); button.setAttribute('aria-selected',String(active)); }); document.querySelectorAll('#view-workflow .workflow-pane').forEach(pane=>pane.classList.toggle('active',pane.id==='workflow-'+name)); }
function renderWorkflow() {
  const items = app.state.checklist[app.state.operation.phase] || []; const done = items.filter((item) => item.done).length; const percent = items.length ? Math.round(done / items.length * 100) : 0;
  $('#workflow-phase').textContent = PHASE_NAMES[app.state.operation.phase]; $('#workflow-progress-label').textContent = `${done} / ${items.length}`; $('#workflow-progress-bar').style.width = `${percent}%`;
  $('#workflow-checklist-items').innerHTML = items.map((item) => `<label class="work-item ${item.done ? 'done' : ''}"><input data-check-id="${item.id}" type="checkbox" ${item.done ? 'checked' : ''}><span><b>${escapeHTML(item.title)}</b><small>${escapeHTML(item.note)}</small></span><em>${escapeHTML(item.source)}</em></label>`).join('');
  const forms = [...app.state.forms].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); $('#form-badge').textContent = forms.length; $('#forms-empty').hidden = forms.length > 0;
  $('#document-list').innerHTML = forms.map((form) => { const template = formTemplate(form.template); const editable=formIsEditable(form); const reviewable=!IS_PREVIEW&&app.state.role==='director'&&form.kind==='field-report'&&form.status==='SUBMITTED'; const detail=form.kind==='field-report'?`보고자 ${escapeHTML(form.reporter||form.content?.reporter||'미기록')} · v${form.version||0}`:escapeHTML(template.label); return `<article class="document-item"><span class="doc-type">${escapeHTML(template.code)}</span><div><h3>${escapeHTML(form.title || template.label)}</h3><small>${detail} · ${formatDate(form.updatedAt)}${form.comment ? ` · 반려 사유: ${escapeHTML(form.comment)}` : ''}</small></div><span class="status-chip ${form.status.toLowerCase()}">${escapeHTML(form.status)}</span><div class="document-actions"><button class="secondary-button" data-edit-form="${escapeHTML(form.id)}">${reviewable ? '결재하기' : editable ? '계속 작성' : '내용 확인'}</button>${editable ? `<button class="danger-button" data-delete-form="${escapeHTML(form.id)}">삭제</button>` : ''}</div></article>`; }).join('');
}

function formatDate(value) { if (!value) return '저장 전'; return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function openView(name) { const archiveTab=name==='evidence'?'evidence':'documents'; const targetName=name==='evidence'?'archive':($(`#view-${name}`)?name:'command'); if(targetName==='archive')selectArchiveTab(archiveTab); if(targetName==='workflow'&&app.state.role==='agent')selectWorkflowTab('forms'); $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === targetName)); $$('.view').forEach((view) => view.classList.toggle('active', view.id === `view-${targetName}`)); $('#main').focus({ preventScroll: true }); history.replaceState(null, '', `#${name==='evidence'?'evidence':targetName}`); }

function openDocument(id) { const doc = app.state.documents.find((entry) => entry.id === id); if (!doc) return; app.documentId=id; $('#document-dialog-title').textContent = doc.title; $('#document-classification').textContent = doc.security; $('#document-frame').src = doc.url; $('#document-new-tab').href = doc.url; $('#document-dialog').showModal(); if (!IS_PREVIEW && doc.status === 'NEW') mutate('mark-document-read', { id }).catch((error) => showToast(error.message)); }

function openForm(templateId, formId = null) {
  if (!['director','agent'].includes(app.state.role)) return;
  app.formId = formId; const existing = formId ? app.state.forms.find((form) => form.id === formId) : null; if(formId&&!existing)return;
  const defaultTemplate=app.state.role==='agent'?'field-report':'operation-order'; const selectedId=existing?.template||templateId||defaultTemplate; const allowed=Object.entries(FORM_TEMPLATES).filter(([,template])=>(template.authorRole||'director')===app.state.role); if(existing&&!allowed.some(([id])=>id===existing.template))allowed.push([existing.template,formTemplate(existing.template)]);
  const templateSelect=$('#form-template'); templateSelect.innerHTML=allowed.map(([id,template])=>`<option value="${escapeHTML(id)}">${escapeHTML(template.label)}</option>`).join(''); templateSelect.value=selectedId; templateSelect.disabled=Boolean(existing)||app.state.role==='agent';
  const template=formTemplate(selectedId),fieldReport=(existing?.kind==='field-report'||selectedId==='field-report'),editable=!existing?!IS_PREVIEW:formIsEditable(existing),reviewable=!IS_PREVIEW&&app.state.role==='director'&&existing?.kind==='field-report'&&existing.status==='SUBMITTED';
  $('#form-signature').value=existing?.signature||''; $('#form-dialog-title').textContent=existing?(existing.title||template.label):(fieldReport?'신규 현장 보고서':'신규 전자서류 작성'); $('#form-paper-status').textContent=existing?.status||'DRAFT'; $('#form-signature-label').textContent=fieldReport?'보고자 확인':'지부장 전자서명'; $('#form-reviewer-label').textContent=fieldReport?'지부장 확인':'관제 확인'; $('#form-reviewer-state').textContent=existing?.status==='APPROVED'?'승인 완료':existing?.status==='RETURNED'?'반려됨':'제출 후 결재';
  renderFormFields(existing?.content||{},!editable); renderFormSignature(Boolean(existing?.signature)); document.querySelectorAll('#document-form input, #document-form textarea, #document-form select').forEach(field=>{if(field.id!=='form-template')field.disabled=!editable;}); $('#form-signature-button').disabled=!editable; $('#save-draft-button').hidden=!editable; $('#submit-form-button').hidden=!editable; $('#submit-form-button').textContent=fieldReport?'보고 확인 후 제출':'서명 후 제출'; $('#autosave-label').textContent=editable?'변경사항 없음':`${existing?.status||'READ ONLY'} · 읽기 전용`;
  $('#player-review-actions').hidden=!reviewable; $('#player-review-comment').disabled=!reviewable; $('#player-review-comment').value=''; $('#player-review-message').textContent=reviewable?`제출본 v${existing.version||0}를 확인하고 결재하세요.`:''; $('#form-dialog').showModal();
}

function renderFormSignature(signed) {
  const button=$('#form-signature-button'),fieldReport=$('#form-template').value==='field-report',value=$('#form-signature').value; button.classList.toggle('signed',signed); button.classList.toggle('field-report',fieldReport); button.setAttribute('aria-pressed',String(signed)); button.setAttribute('aria-label',signed?`${value} 확인 입력됨. 다시 누르면 삭제`:(fieldReport?'보고자 확인':'전자서명 입력')); const image=$('img',button),placeholder=$('.signature-placeholder',button); image.hidden=fieldReport||!signed; placeholder.hidden=signed&&!fieldReport; placeholder.textContent=fieldReport?(signed?`보고자 확인 · ${value}`:'보고자 이름을 입력한 뒤 확인'): '서명란 클릭\n전자서명 입력';
}

function toggleFormSignature() {
  if ($('#form-signature-button').disabled) return; const fieldReport=$('#form-template').value==='field-report'; const signed=Boolean($('#form-signature').value); let name=DIRECTOR_SIGNATURE.name; if(fieldReport){name=$('[data-field="reporter"]')?.value.trim();if(!signed&&!name){$('#form-error').textContent='보고자 이름을 먼저 입력해줘.';$('[data-field="reporter"]')?.focus();return;}} $('#form-signature').value=signed?'':name;renderFormSignature(!signed);$('#form-error').textContent='';scheduleAutosave();
}

function renderFormFields(values = {}, readonly = false) { const template=formTemplate($('#form-template').value); $('#form-classification').textContent=`${template.code} · BRANCH INTERNAL`; $('#form-paper-code').textContent=template.code; $('#form-paper-title').textContent=template.label; $('#dynamic-fields').innerHTML=renderFormFieldsHTML(template,values,readonly); }
function collectForm(){const templateId=$('#form-template').value,template=formTemplate(templateId),existing=app.state.forms.find(f=>f.id===app.formId),content={...(existing?.content||{})};document.querySelectorAll('#document-form [data-field]').forEach(field=>content[field.dataset.field]=field.value.trim());const firstField=template.fields[0]?.id;return{id:app.formId||crypto.randomUUID(),kind:templateId==='field-report'?'field-report':'director-form',template:templateId,title:content[firstField]||template.label,content,signature:$('#form-signature').value.trim(),status:existing?.status||'DRAFT'};}
async function saveForm(submit=false,quiet=false){const fieldReport=$('#form-template').value==='field-report',author=(fieldReport&&app.state.role==='agent')||(!fieldReport&&app.state.role==='director');if(!author||app.mode!=='server')return;clearTimeout(app.autosaveTimer);const formElement=$('#document-form'),documentData=collectForm();$('#form-error').textContent='';if(submit&&!documentData.signature){$('#form-error').textContent=fieldReport?'보고자 확인란을 눌러 제출을 확인해줘.':'지부장 전자서명란을 눌러 서명한 뒤 제출해줘.';$('#form-signature-button').focus();return;}if(submit&&!formElement.reportValidity())return;$('#autosave-label').textContent=submit?'제출 중…':'저장 중…';$('#form-paper-status').textContent=submit?'SUBMITTING':'SAVING';const action=fieldReport?(submit?'submit-field-report':'save-field-report'):(submit?'submit-form':'save-form');try{await mutate(action,{form:documentData});app.formId=documentData.id;$('#autosave-label').textContent=submit?'제출 완료':'자동저장 완료';$('#form-paper-status').textContent=submit?'SUBMITTED':'DRAFT';if(submit){$('#form-dialog').close();showToast(fieldReport?'현장 보고서가 지부장 수신함에 제출되었습니다.':'서류가 전자서명되어 관제로 제출되었습니다.');}else if(!quiet)showToast(fieldReport?'현장 보고서 초안을 저장했습니다.':'초안이 저장되었습니다.');}catch(error){$('#form-error').textContent=error.message;$('#autosave-label').textContent='저장 실패';$('#form-paper-status').textContent='ERROR';}}
async function reviewFieldReport(action){const form=app.state.forms.find(entry=>entry.id===app.formId);if(!form||form.kind!=='field-report'||form.status!=='SUBMITTED')return;const comment=$('#player-review-comment').value.trim();if(action==='return-field-report'&&!comment){$('#player-review-message').textContent='반려 사유를 입력해줘.';$('#player-review-comment').focus();return;}for(const id of ['player-review-return','player-review-approve'])$('#'+id).disabled=true;try{await mutate(action,{id:form.id,version:form.version,comment});$('#form-dialog').close();showToast(action==='approve-field-report'?'현장 보고서를 승인했습니다.':'현장 보고서를 반려했습니다.');}catch(error){$('#player-review-message').textContent=error.status===409?'다른 단말에서 보고서가 변경됐어. 최신 내용을 다시 열어줘.':error.message;}finally{for(const id of ['player-review-return','player-review-approve'])$('#'+id).disabled=false;}}

function scheduleAutosave() { if (!$('#form-dialog').open || $('#save-draft-button').hidden) return; if($('#form-template').value==='field-report'&&$('#form-signature').value&&$('#form-signature').value!==($('[data-field="reporter"]')?.value.trim()||'')){ $('#form-signature').value=''; renderFormSignature(false); } $('#autosave-label').textContent = '저장 대기 중…'; clearTimeout(app.autosaveTimer); app.autosaveTimer = setTimeout(() => saveForm(false, true), 900); }

document.addEventListener('click', (event) => {
  const notice = event.target.closest('[data-notice-id]'); if (notice) openNotice(notice.dataset.noticeId); const nav = event.target.closest('[data-view]'); if (nav) openView(nav.dataset.view); const go = event.target.closest('[data-go]'); if (go) openView(go.dataset.go); const doc = event.target.closest('[data-doc]'); if (doc) openDocument(doc.dataset.doc);
  const filter = event.target.closest('[data-archive-filter]'); if (filter) { app.archiveFilter = filter.dataset.archiveFilter; renderArchive(); } const template = event.target.closest('[data-template]'); if (template) openForm(template.dataset.template); const edit = event.target.closest('[data-edit-form]'); if (edit) openForm(undefined, edit.dataset.editForm);
  const deleteForm = event.target.closest('[data-delete-form]'); if (deleteForm && confirm('이 전자서류를 삭제할까? 삭제한 기록은 복구할 수 없어.')) { const form=app.state.forms.find(entry=>entry.id===deleteForm.dataset.deleteForm); mutate(form?.kind==='field-report'?'delete-field-report':'delete-form', { id: deleteForm.dataset.deleteForm }).then(() => showToast('전자서류를 삭제했습니다.')).catch((error) => showToast(error.message)); }
  const evidenceFilter = event.target.closest('[data-evidence-filter]'); if (evidenceFilter) { app.evidenceFilter = evidenceFilter.dataset.evidenceFilter; renderEvidence(); } const evidence = event.target.closest('[data-evidence-id]'); if (evidence) openEvidence(evidence.dataset.evidenceId);
  const personnel = event.target.closest('[data-personnel-id]'); if (personnel) openPersonnel(personnel.dataset.personnelId);
  const archiveTab = event.target.closest('[data-archive-tab]'); if (archiveTab) { selectArchiveTab(archiveTab.dataset.archiveTab); history.replaceState(null,'','#'+(app.archiveTab==='evidence'?'evidence':'archive')); }
  const tab = event.target.closest('[data-workflow-tab]'); if (tab) selectWorkflowTab(tab.dataset.workflowTab);
  if (event.target.closest('[data-close-document]')) { $('#document-dialog').close(); $('#document-frame').src = 'about:blank'; }
  if (event.target.closest('[data-close-personnel]')) { $('#personnel-dialog').close(); $('#personnel-id-image').src = ''; }
  if (event.target.closest('[data-close-form]')) { clearTimeout(app.autosaveTimer); $('#form-error').textContent = ''; $('#form-dialog').close(); }
  if (event.target.closest('[data-close-evidence]')) { $('#evidence-dialog').close(); $('#evidence-image').src = ''; }
});

document.addEventListener('change', (event) => { if (event.target.matches('[data-check-id]')) mutate('toggle-checklist', { id: event.target.dataset.checkId, done: event.target.checked }).catch((error) => showToast(error.message)); if (event.target.id === 'form-template') renderFormFields(); });
document.addEventListener('keydown', (event) => { const row = event.target.closest('.archive-row-link[data-doc]'); if (row && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openDocument(row.dataset.doc); } });
$('#archive-search').addEventListener('input', renderArchive); $('#evidence-search').addEventListener('input', renderEvidence); $('#evidence-image').addEventListener('load', () => { $('#evidence-loading').hidden = true; }); $('#evidence-image').addEventListener('error', () => { $('#evidence-loading').hidden = false; $('#evidence-loading').textContent = 'IMAGE LOAD FAILED'; }); $('#new-form-button').addEventListener('click', () => openForm()); $('#new-form-button-secondary').addEventListener('click', () => openForm()); $('#save-draft-button').addEventListener('click', () => saveForm(false)); $('#submit-form-button').addEventListener('click', () => saveForm(true)); $('#document-form').addEventListener('input', scheduleAutosave); $('#document-dialog').addEventListener('close', () => { app.documentId=null; $('#document-frame').src = 'about:blank'; $('#document-new-tab').removeAttribute('href'); if (app.mode === 'server') loadState().catch(error => showToast(error.message)); }); $('#evidence-dialog').addEventListener('close', () => { $('#evidence-image').src = ''; });
$('#form-signature-button').addEventListener('click', toggleFormSignature); $('#player-review-approve').addEventListener('click',()=>reviewFieldReport('approve-field-report')); $('#player-review-return').addEventListener('click',()=>reviewFieldReport('return-field-report'));
$('#access-form').addEventListener('submit', async (event) => { event.preventDefault(); $('#access-error').textContent = ''; try { await api('/api/auth', { method: 'POST', body: JSON.stringify({ code: $('#access-code').value, role: 'player' }) }); $('#access-code').value = ''; authChannel?.postMessage('changed'); await loadState(); await playLoginSequence('player'); } catch (error) { $('#access-error').textContent = error.message; } });

function clearSessionView(message = '') {
  app.epoch += 1;
  clearTimeout(app.autosaveTimer);
  app.mode = 'connecting'; app.state = structuredClone(DEFAULT_STATE); app.formId = null;
  app.archiveTab = 'documents'; app.archiveFilter = app.evidenceFilter = '전체'; casesUI.clear();
  try { localStorage.removeItem('tcb-offline-state'); for (const key of Object.keys(localStorage)) if (key.startsWith('tcb-archive-entry-')) localStorage.removeItem(key); } catch {}
  $$('dialog').forEach(dialog => { if (dialog.open) dialog.close(); });
  $$('iframe').forEach(frame => { frame.src = 'about:blank'; });
  $$('img').forEach(img => { if (img.hasAttribute('src')) img.removeAttribute('src'); });
  $$('dialog a[href]').forEach(link => link.removeAttribute('href'));
  $$('form').forEach(form => form.reset());
  ['#personnel-grid','#archive-rows','#evidence-grid','#document-list','#dynamic-fields','#city-content'].forEach(id => { $(id).replaceChildren(); });
  ['#personnel-dialog-title','#personnel-file-number','#personnel-record-name','#personnel-record-position','#personnel-record-status','#personnel-record-id','#personnel-record-clearance','#personnel-record-division','#personnel-record-assignment','#personnel-record-appointed','#personnel-record-duties','#personnel-record-qualifications','#personnel-record-assessment','#personnel-record-note','#evidence-dialog-title','#evidence-case','#evidence-category','#evidence-captured','#evidence-location','#evidence-filename','#evidence-description'].forEach(id => $(id).textContent = '');
  renderAll();
  $('.app-shell').hidden = true; $('#access-gate').hidden = false; $('#access-error').textContent = message;
}
function renderRole() {
  const director=app.state.role==='director',agent=app.state.role==='agent',player=director||agent; Object.assign(DIRECTOR_SIGNATURE,{name:'',image:''},app.state.directorSignature||{}); $('#session-role').textContent=director?'지부장':agent?'현장요원':'접속 대기'; $('#workflow-title').textContent=agent?'현장 보고':'서류 및 체크리스트';
  document.querySelectorAll('[data-view="workflow"], [data-go="workflow"]').forEach(el=>{el.hidden=!player;}); document.querySelectorAll('#new-form-button, #new-form-button-secondary').forEach(el=>{el.hidden=!player||IS_PREVIEW;}); document.querySelectorAll('[data-template]').forEach(el=>{el.hidden=!director||IS_PREVIEW;}); document.querySelectorAll('[data-check-id]').forEach(el=>{el.disabled=!director||IS_PREVIEW;}); $('#view-workflow').hidden=!player; $('#workflow-checklist-tab').hidden=!director; $('#new-form-button').textContent=agent?'+ 새 현장 보고서':'+ 새 서류 작성'; $('#new-form-button-secondary').textContent=agent?'새 현장 보고서':'새 서류'; $('#form-toolbar-copy').textContent=agent?'공용 보고서함입니다. 초안은 함께 보이며 제출 후 지부장이 검토합니다.':'지부장 서류와 제출된 현장 보고서를 한곳에서 확인합니다.';
  if(agent&&$('#view-workflow').classList.contains('active'))selectWorkflowTab('forms'); $('#personnel-count').textContent=app.state.personnel.length+' RECORDS';
  if(IS_PREVIEW){$('#logout-button').hidden=true;$('#preview-banner').hidden=false;$('#preview-role-label').textContent=(PREVIEW_ROLE==='director'?'지부장':'현장요원')+' 미리보기 · 읽기 전용';document.querySelectorAll('[data-check-id],[data-delete-form],#player-review-approve,#player-review-return').forEach(el=>{el.disabled=true;});document.querySelectorAll('#new-form-button,#new-form-button-secondary,[data-template],#player-review-actions').forEach(el=>{el.hidden=true;el.disabled=true;});}
  $('#city-content').innerHTML=app.state.cityHtml||'<p class="empty-state">공개된 도시 자료가 없습니다.</p>'; document.querySelectorAll('[data-doc]').forEach(el=>{el.hidden=!app.state.documents.some(doc=>doc.id===el.dataset.doc);}); if(app.mode==='server'){ $('.operation-visual').src=IS_PREVIEW?'/api/preview-files?role='+PREVIEW_ROLE+'&type=support&id=operation-image':'/media/evidence/taeyang-shadow-main.webp'; if(director)$('#form-signature-button img').src=DIRECTOR_SIGNATURE.image; }
}
const casesUI=createCasesUI({getState:()=>app.state,setState:state=>{app.state=state;renderAll();},toast:showToast,gm:false,openResource:(type,id)=>{if(type==='personnel')openPersonnel(id);else if(type==='documents')openDocument(id);else if(type==='evidence')openEvidence(id);else if(type==='forms')openForm(undefined,id);}});
$('#preview-exit').addEventListener('click',()=>{if(window.parent!==window)window.parent.postMessage({type:'tcb-close-preview'},location.origin);});
$('#logout-button').addEventListener('click', async () => {
  clearSessionView();
  try { await api('/api/auth', {method:'DELETE'}); authChannel?.postMessage('changed'); }
  catch { $('#access-error').textContent = '로그아웃 요청을 완료하지 못했습니다. 다시 시도하세요.'; }
});
const authChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('tcb-auth') : null;
if (authChannel) authChannel.onmessage = () => boot();
window.addEventListener('pageshow', event => { if (event.persisted) boot(); });

function updateClock() { const now = new Date(); const date = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); const time = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(now); $('#system-clock').textContent = `${date} · ${time} KST`; }
updateClock(); setInterval(updateClock, 30_000); openView(location.hash.slice(1) || 'command'); boot(); setInterval(() => { if (app.mode.startsWith('server') && document.visibilityState === 'visible') loadState().catch(() => {}); }, 15_000);
