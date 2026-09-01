const DEFAULT_STATE = {
  revision: 1,
  operation: { act: 'ACT II', title: '배신', phase: 1 },
  stats: { morale: 3, alert: 2, intel: 1, funds: 6, trust: '표준' },
  notices: [
    { id: 'notice-1', time: '21:40', title: '본부 공문 수신', body: '루미나스 병원 확보 인원', priority: true },
    { id: 'notice-2', time: '20:18', title: '기록 복구 완료', body: '이강준 수첩 · 003 페이지' },
    { id: 'notice-3', time: '18:03', title: '의료기록 갱신', body: '이세아 귀환 후 경과' }
  ],
  checklist: {
    1: [
      { id: 'briefing', title: '신규 공문 확인', note: '본부 및 지부 내부 수신함', done: true, source: 'SYSTEM' },
      { id: 'branch-review', title: '현재 지부 상태 확인', note: '자금·사기·경계도·정보력', done: true, source: 'SYSTEM' },
      { id: 'assignment', title: '대원 배치 확정', note: '내정 및 현장 슬롯 배치', done: false, source: 'COMMAND' },
      { id: 'operation-order', title: '작전 명령서 제출', note: '전자서명 후 관제 제출', done: false, source: 'E-DOC' },
      { id: 'protected-review', title: '보호대상 재평가', note: 'P-07 기한 및 본인 의사 확인', done: false, source: 'P-07' }
    ],
    2: [
      { id: 'field-brief', title: '현장 브리핑 완료', note: '목표·철수 조건·연락망 확인', done: false, source: 'COMMAND' },
      { id: 'resources', title: '지원 리소스 지급', note: '작전실·의무실 보정 확인', done: false, source: 'BRANCH' },
      { id: 'parallel-front', title: '동시 전선 처리', note: '비투입 대원의 경량 판정', done: false, source: 'FIELD' },
      { id: 'casualty-log', title: '침식·부상 임시 기록', note: '현장 종료 전 누락 확인', done: false, source: 'MEDICAL' }
    ],
    3: [
      { id: 'result-record', title: '사건 결과 기록', note: '성공도와 미결 사항', done: false, source: 'E-DOC' },
      { id: 'condition-update', title: '침식·부상 갱신', note: '회복 및 상실 판정 반영', done: false, source: 'MEDICAL' },
      { id: 'payroll', title: '대원 임금 지급', note: '현재 고정 임금 3 UNIT', done: false, source: 'FINANCE' },
      { id: 'maintenance', title: '시설 유지비 정산', note: '유료 시설 유지비 확인', done: false, source: 'FINANCE' },
      { id: 'indicators', title: '지부 지표 갱신', note: '사기·경계도·정보력·자금', done: false, source: 'BRANCH' },
      { id: 'hq-report', title: '본부 정기 보고서 제출', note: '보고 내용과 누락 항목 최종 확인', done: false, source: 'E-DOC' }
    ]
  },
  roster: [
    { name: '하은채', grade: 'A', role: '부지부장 대행', syndrome: '노이만', tags: ['행정', '탐문'], erosion: 0, wound: 0 },
    { name: '진태호', grade: 'B', role: '현장 요원', syndrome: '키마이라', tags: ['전투'], erosion: 0, wound: 0 }
  ],
  facilities: [
    { name: '의무실', level: 1, active: true, effect: '부상 회복 및 침식 케어. 기본 응급 리소스 제공.' },
    { name: '휴게실', level: 1, active: true, effect: '대원 사기 유지. 파산 상태에서도 기본 기능 가동.' },
    { name: '훈련장', level: 0, active: false, effect: '미설치. 대원 육성과 태그 훈련에 사용.' },
    { name: '작전실', level: 0, active: false, effect: '미설치. 정보력과 현장 진입 준비를 보조.' },
    { name: '숙소', level: 0, active: false, effect: '미설치. 보호대상과 추가 인원을 수용.' }
  ],
  documents: [
    { id: 'hq-urgent', code: 'HQ-KR/URG-2043-17', category: '본부 공문', title: '루미나스 병원 확보 인원', detail: '본부 긴급 공문', security: 'CONFIDENTIAL', status: 'NEW', url: '/archive/hq-urgent.html' },
    { id: 'medical-isea', code: 'TCB/MED-002', category: '의료기록', title: '이세아 귀환 후 의료기록', detail: 'POST-OP 기록', security: 'MEDICAL', status: 'NEW', url: '/archive/medical-isea.html' },
    { id: 'sera-profile', code: 'TCB/ID-004', category: '신원서류', title: '정세라 임시 신원 및 보호 서류', detail: 'CASE 004 · ADULT', security: 'CONFIDENTIAL', status: 'RELEASED', url: '/archive/sera-profile.html' },
    { id: 'suhwan-card', code: 'TCB/ID-003', category: '신원서류', title: '수환 임시 신원 카드', detail: 'CODE-003', security: 'CONFIDENTIAL', status: 'RELEASED', url: '/archive/suhwan-card.html' },
    { id: 'kangjun-note', code: 'RECOVERED/NOTE-003', category: '개인 기록', title: '이강준 수첩 · 003 페이지', detail: '복구된 비공식 기록', security: 'RESTRICTED', status: 'NEW', url: '/archive/kangjun-note-003.html' },
    { id: 'former-chief-note', code: 'TCB/FORMER-01', category: '개인 기록', title: '전임 지부장 개인 수첩', detail: '공식 사건철 미포함', security: 'RESTRICTED', status: 'RELEASED', url: '/archive/former-chief-note.html' },
    { id: 'handover', code: 'TCB/ADMIN-HO1', category: '지부 행정', title: '지부장 인수인계서', detail: '신임 지부장 부임 기록', security: 'INTERNAL', status: 'RELEASED', url: '/archive/branch-handover.html' },
    { id: 'p07', code: 'HQ-PD/P-07', category: '본부 규정', title: '보호대상 안정화 및 인계 규정', detail: 'REVISION 01', security: 'INTERNAL', status: 'RELEASED', url: '/archive/regulation-p07.html' },
    { id: 'branch-summary', code: 'TCB/OPS-SUM', category: '지부 행정', title: '지부 운영 시스템 서머리', detail: '신임 지부장 업무 참조', security: 'INTERNAL', status: 'RELEASED', url: '/archive/branch-operations.html' },
    { id: 'facilities', code: 'TCB/FAC-REF', category: '지부 행정', title: '지부 시설 목록 및 효과', detail: 'HOUSING REFERENCE', security: 'INTERNAL', status: 'RELEASED', url: '/archive/facilities.html' },
    { id: 'city-locations', code: 'CITY/LOC-01', category: '도시 정보', title: '태양시 로케이션', detail: '신도심·구도심·도시 근교·대학가', security: 'INTERNAL', status: 'RELEASED', url: '/archive/city-locations.html' },
    { id: 'city-history', code: 'CITY/HST-01', category: '도시 정보', title: '태양시 역사와 주요 조직', detail: '1973—2043 CHRONOLOGY', security: 'INTERNAL', status: 'RELEASED', url: '/archive/city-history.html' }
  ],
  forms: [], activity: []
};

const PHASE_NAMES = { 1: 'PHASE 01 · 내정', 2: 'PHASE 02 · 현장', 3: 'PHASE 03 · 정산' };
const FORM_TEMPLATES = {
  'operation-order': { code: 'TCB-OPS/01', label: '작전 인원 배치 명령서', checklist: ['assignment', 'operation-order'], fields: [
    { id: 'caseName', label: '사건명', required: true }, { id: 'priority', label: '작전 우선순위', type: 'select', options: ['인명 구조', '정보 확보', '위협 무력화', '은폐 및 수습'], required: true },
    { id: 'agents', label: '투입 대원', placeholder: '성명 및 역할', required: true }, { id: 'support', label: '지급 장비 및 지원', placeholder: '시설 보정, 물자, 백업 계획' },
    { id: 'orders', label: '세부 명령 및 철수 조건', type: 'textarea', full: true, required: true }
  ] },
  'hq-report': { code: 'TCB-HQ/02', label: '본부 정기 보고서', checklist: ['hq-report'], fields: [
    { id: 'subject', label: '보고 제목', required: true }, { id: 'result', label: '사건 결과', type: 'select', options: ['성공', '부분 성공', '실패', '진행 중'], required: true },
    { id: 'secured', label: '확보 인원 및 물품', placeholder: '해당 없음' }, { id: 'external', label: '외부 세력 접촉', placeholder: 'H.E.L.I.O.S., NOX 등' },
    { id: 'summary', label: '상세 보고', type: 'textarea', full: true, required: true }, { id: 'omission', label: '비공개·완화 보고 항목', type: 'textarea', full: true, placeholder: '본부 보고에서 제외할 내용이 있다면 기록' }
  ] },
  'protection-record': { code: 'TCB-P07/03', label: '보호대상 안정화·인계 기록', checklist: ['protected-review'], fields: [
    { id: 'subjectName', label: '대상자 / 사건번호', required: true }, { id: 'condition', label: '현재 상태', type: 'select', options: ['안정', '의료 불안정', '인지 평가 중', '보안 위험', '인계 가능'], required: true },
    { id: 'will', label: '본인 의사', placeholder: '인계 동의·거부·판단 유예', required: true }, { id: 'deferReason', label: '인계 유예 사유', placeholder: '의료 / 인지 / 보안 / 시설' },
    { id: 'reevaluation', label: '다음 재평가', placeholder: '일시 및 담당자', required: true }, { id: 'plan', label: '보호계획 및 설명 내용', type: 'textarea', full: true, required: true }
  ] },
  'settlement-report': { code: 'TCB-FIN/04', label: '사건 종결 및 정산 보고서', checklist: ['result-record', 'condition-update', 'payroll', 'maintenance', 'indicators'], fields: [
    { id: 'caseName', label: '사건명', required: true }, { id: 'reward', label: '사건 보수', placeholder: '예: +3 UNIT' }, { id: 'payroll', label: '임금 및 유지비', placeholder: '예: -3 UNIT', required: true },
    { id: 'damage', label: '대원 침식·부상 변화', placeholder: '성명 / 변경값' }, { id: 'indicators', label: '지표 변경 예정값', placeholder: '사기, 경계도, 정보력, 자금' },
    { id: 'followup', label: '미결 사항 및 후속 조치', type: 'textarea', full: true }
  ] }
};

const app = { state: structuredClone(DEFAULT_STATE), mode: 'connecting', archiveFilter: '전체', formId: null, autosaveTimer: null };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.error || '요청을 처리하지 못했습니다.'); error.status = response.status; error.data = data; throw error; }
  return data;
}

function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600); }

async function boot() {
  try {
    const session = await api('/api/auth');
    if (!session.authenticated && session.required) { $('#access-gate').hidden = false; return; }
    app.mode = session.demo ? 'server-open' : 'server'; await loadState();
  } catch {
    app.mode = 'local'; const saved = localStorage.getItem('tcb-offline-state');
    if (saved) { try { app.state = JSON.parse(saved); } catch { app.state = structuredClone(DEFAULT_STATE); } }
    renderAll(); $('#sync-label').textContent = 'LOCAL PREVIEW · DEVICE STORAGE';
  }
}

async function loadState() { const result = await api('/api/state'); app.state = result.state; renderAll(); $('#sync-label').textContent = `LAST SYNC · ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`; }

function applyLocal(action, payload) {
  const state = app.state;
  if (action === 'toggle-checklist') { const item = (state.checklist[state.operation.phase] || []).find((entry) => entry.id === payload.id); if (item) item.done = Boolean(payload.done); }
  if (action === 'save-form' || action === 'submit-form') {
    const index = state.forms.findIndex((form) => form.id === payload.form.id); const next = { ...payload.form, status: action === 'submit-form' ? 'SUBMITTED' : (payload.form.status === 'RETURNED' ? 'RETURNED' : 'DRAFT'), updatedAt: new Date().toISOString() };
    if (index >= 0) state.forms[index] = next; else state.forms.unshift({ ...next, createdAt: next.updatedAt }); if (action === 'submit-form') completeTemplateChecklist(next.template);
  }
  if (action === 'mark-document-read') { const doc = state.documents.find((entry) => entry.id === payload.id); if (doc?.status === 'NEW') doc.status = 'RELEASED'; }
  state.revision += 1; localStorage.setItem('tcb-offline-state', JSON.stringify(state));
}

async function mutate(action, payload) {
  if (app.mode === 'local') { applyLocal(action, payload); renderAll(); return; }
  try { const result = await api('/api/state', { method: 'PATCH', body: JSON.stringify({ action, payload, revision: app.state.revision }) }); app.state = result.state; renderAll(); $('#sync-label').textContent = 'SYNCED · SECURE STORE'; }
  catch (error) { if (error.status === 409) { await loadState(); showToast('다른 단말의 변경사항을 불러왔습니다. 다시 시도하세요.'); return; } throw error; }
}

function completeTemplateChecklist(templateId) { const template = FORM_TEMPLATES[templateId]; const items = app.state.checklist[app.state.operation.phase] || []; template?.checklist.forEach((id) => { const item = items.find((entry) => entry.id === id); if (item) item.done = true; }); }
function renderAll() { renderCommand(); renderBranch(); renderArchive(); renderWorkflow(); }
function metricHTML(label, value) { return `<div><span>${label}</span><b>${value}<small>/10</small></b><meter min="0" max="10" value="${value}"></meter></div>`; }

function renderCommand() {
  const { operation, stats, notices } = app.state;
  $('#operation-act').textContent = operation.act; $('#operation-title').textContent = operation.title; $('#phase-label').textContent = PHASE_NAMES[operation.phase];
  $$('#phase-track i').forEach((node, index) => node.classList.toggle('done', index < operation.phase));
  $('#priority-message').textContent = notices.find((notice) => notice.priority)?.body || '현재 긴급 수신 내용이 없습니다.';
  $('#signal-list').innerHTML = notices.slice(0, 4).map((notice, index) => `<li><time>${escapeHTML(notice.time || '--:--')}</time><span><b>${escapeHTML(notice.title)}</b>${escapeHTML(notice.body)}</span>${index === 0 ? '<em>NEW</em>' : ''}</li>`).join('');
  $('#command-metrics').innerHTML = metricHTML('사기', stats.morale) + metricHTML('경계도', stats.alert) + metricHTML('정보력', stats.intel); $('#fund-value').textContent = `${stats.funds} UNIT`; $('#trust-value').textContent = `본부 신뢰 · ${stats.trust}`;
  const items = app.state.checklist[operation.phase] || []; $('#command-checklist').innerHTML = items.slice(0, 5).map((item) => `<label><input data-check-id="${item.id}" type="checkbox" ${item.done ? 'checked' : ''}><span>${escapeHTML(item.title)}</span></label>`).join('');
  const done = items.filter((item) => item.done).length; const percent = items.length ? Math.round(done / items.length * 100) : 0; $('#command-completion').textContent = `${done} / ${items.length} COMPLETE`; $('#command-progress').style.width = `${percent}%`;
}

function renderBranch() {
  const { stats, roster, facilities } = app.state; $('#branch-metrics').innerHTML = metricHTML('사기', stats.morale) + metricHTML('경계도', stats.alert) + metricHTML('정보력', stats.intel) + `<div><span>가용 자금</span><b>${stats.funds}<small> UNIT</small></b><small>본부 신뢰 · ${escapeHTML(stats.trust)}</small></div>`;
  $('#branch-condition').textContent = stats.alert >= 8 ? '감사 위험' : stats.morale <= 3 ? '주의' : '정상';
  $('#roster-list').innerHTML = roster.map((agent) => `<article class="roster-item"><header><h3>${escapeHTML(agent.name)} · ${escapeHTML(agent.role)}</h3><span>${escapeHTML(agent.grade)} CLASS</span></header><p>${escapeHTML(agent.syndrome)} · 침식 ${'●'.repeat(agent.erosion)}${'○'.repeat(3-agent.erosion)} · 부상 ${'●'.repeat(agent.wound)}${'○'.repeat(3-agent.wound)}</p><div class="roster-tags">${agent.tags.map((tag) => `<i>${escapeHTML(tag)}</i>`).join('')}</div></article>`).join('');
  $('#facility-grid').innerHTML = facilities.map((facility) => `<article class="facility-card ${facility.active ? 'active' : ''}"><span>${facility.active ? 'OPERATIONAL' : 'NOT INSTALLED'}</span><h3>${escapeHTML(facility.name)}</h3><b>LEVEL ${facility.level}</b><p>${escapeHTML(facility.effect)}</p></article>`).join('');
}

function renderArchive() {
  const categories = ['전체', ...new Set(app.state.documents.map((doc) => doc.category))]; $('#archive-filters').innerHTML = categories.map((category) => `<button class="${app.archiveFilter === category ? 'active' : ''}" data-archive-filter="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join('');
  const term = $('#archive-search').value.trim().toLowerCase(); const docs = app.state.documents.filter((doc) => (app.archiveFilter === '전체' || doc.category === app.archiveFilter) && `${doc.title} ${doc.category} ${doc.detail}`.toLowerCase().includes(term));
  $('#archive-count').textContent = `${app.state.documents.length} RECORDS RELEASED`; $('#archive-rows').innerHTML = docs.length ? docs.map((doc) => `<tr><td class="doc-code">${escapeHTML(doc.code)}</td><td class="doc-name"><b>${escapeHTML(doc.title)}</b><small>${escapeHTML(doc.category)} · ${escapeHTML(doc.detail)}</small></td><td><span class="security-chip">${escapeHTML(doc.security)}</span></td><td><span class="status-chip ${doc.status.toLowerCase()}">${escapeHTML(doc.status)}</span></td><td><button class="open-doc-button" data-doc="${doc.id}">열람 →</button></td></tr>`).join('') : '<tr><td colspan="5">검색 조건에 맞는 문서가 없습니다.</td></tr>';
}

function renderWorkflow() {
  const items = app.state.checklist[app.state.operation.phase] || []; const done = items.filter((item) => item.done).length; const percent = items.length ? Math.round(done / items.length * 100) : 0;
  $('#workflow-phase').textContent = PHASE_NAMES[app.state.operation.phase]; $('#workflow-progress-label').textContent = `${done} / ${items.length}`; $('#workflow-progress-bar').style.width = `${percent}%`;
  $('#workflow-checklist-items').innerHTML = items.map((item) => `<label class="work-item ${item.done ? 'done' : ''}"><input data-check-id="${item.id}" type="checkbox" ${item.done ? 'checked' : ''}><span><b>${escapeHTML(item.title)}</b><small>${escapeHTML(item.note)}</small></span><em>${escapeHTML(item.source)}</em></label>`).join('');
  const forms = [...app.state.forms].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); $('#form-badge').textContent = forms.length; $('#forms-empty').hidden = forms.length > 0;
  $('#document-list').innerHTML = forms.map((form) => { const template = FORM_TEMPLATES[form.template] || { code: 'TCB/DOC', label: form.title }; const editable = ['DRAFT', 'RETURNED'].includes(form.status); return `<article class="document-item"><span class="doc-type">${template.code}</span><div><h3>${escapeHTML(form.title || template.label)}</h3><small>${escapeHTML(template.label)} · ${formatDate(form.updatedAt)}</small></div><span class="status-chip ${form.status.toLowerCase()}">${escapeHTML(form.status)}</span><button class="secondary-button" data-edit-form="${form.id}">${editable ? '계속 작성' : '내용 확인'}</button></article>`; }).join('');
}

function formatDate(value) { if (!value) return '저장 전'; return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function openView(name) { const targetName = $(`#view-${name}`) ? name : 'command'; $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === targetName)); $$('.view').forEach((view) => view.classList.toggle('active', view.id === `view-${targetName}`)); $('#main').focus({ preventScroll: true }); history.replaceState(null, '', `#${targetName}`); }

function openDocument(id) { const doc = app.state.documents.find((entry) => entry.id === id); if (!doc) return; $('#document-dialog-title').textContent = doc.title; $('#document-classification').textContent = doc.security; $('#document-frame').src = doc.url; $('#document-new-tab').href = doc.url; $('#document-dialog').showModal(); if (doc.status === 'NEW') mutate('mark-document-read', { id }).catch((error) => showToast(error.message)); }

function openForm(templateId = 'operation-order', formId = null) {
  app.formId = formId; const existing = formId ? app.state.forms.find((form) => form.id === formId) : null; const templateSelect = $('#form-template'); templateSelect.innerHTML = Object.entries(FORM_TEMPLATES).map(([id, template]) => `<option value="${id}">${template.label}</option>`).join('');
  templateSelect.value = existing?.template || templateId; templateSelect.disabled = Boolean(existing); $('#form-signature').value = existing?.signature || ''; $('#form-dialog-title').textContent = existing ? (existing.title || FORM_TEMPLATES[existing.template].label) : '신규 전자서류 작성'; renderFormFields(existing?.content || {});
  const editable = !existing || ['DRAFT', 'RETURNED'].includes(existing.status); $$('#document-form input, #document-form textarea, #document-form select').forEach((field) => { if (field.id !== 'form-template') field.disabled = !editable; }); $('#save-draft-button').hidden = !editable; $('#submit-form-button').hidden = !editable; $('#autosave-label').textContent = editable ? '변경사항 없음' : `${existing.status} · 읽기 전용`; $('#form-dialog').showModal();
}

function renderFormFields(values = {}) {
  const template = FORM_TEMPLATES[$('#form-template').value]; $('#form-classification').textContent = `${template.code} · BRANCH INTERNAL`;
  $('#dynamic-fields').innerHTML = template.fields.map((field) => { const attrs = `name="${field.id}" data-field="${field.id}" ${field.required ? 'required' : ''}`; let control; if (field.type === 'textarea') control = `<textarea ${attrs} placeholder="${escapeHTML(field.placeholder || '')}">${escapeHTML(values[field.id] || '')}</textarea>`; else if (field.type === 'select') control = `<select ${attrs}>${field.options.map((option) => `<option ${values[field.id] === option ? 'selected' : ''}>${escapeHTML(option)}</option>`).join('')}</select>`; else control = `<input ${attrs} value="${escapeHTML(values[field.id] || '')}" placeholder="${escapeHTML(field.placeholder || '')}">`; return `<div class="field-group ${field.full ? 'full' : ''}"><label>${escapeHTML(field.label)}${control}</label></div>`; }).join('');
}

function collectForm() { const templateId = $('#form-template').value; const template = FORM_TEMPLATES[templateId]; const content = {}; $$('[data-field]', $('#document-form')).forEach((field) => { content[field.dataset.field] = field.value.trim(); }); const firstField = template.fields[0]?.id; return { id: app.formId || crypto.randomUUID(), template: templateId, title: content[firstField] || template.label, content, signature: $('#form-signature').value.trim(), status: app.state.forms.find((form) => form.id === app.formId)?.status || 'DRAFT' }; }

async function saveForm(submit = false, quiet = false) {
  const formElement = $('#document-form'); const documentData = collectForm(); if (submit && !formElement.reportValidity()) return; $('#autosave-label').textContent = submit ? '제출 중…' : '저장 중…';
  try { await mutate(submit ? 'submit-form' : 'save-form', { form: documentData }); app.formId = documentData.id; $('#autosave-label').textContent = submit ? '제출 완료' : '자동저장 완료'; if (submit) { $('#form-dialog').close(); showToast('서류가 전자서명되어 관제로 제출되었습니다.'); } else if (!quiet) showToast('초안이 저장되었습니다.'); }
  catch (error) { $('#form-error').textContent = error.message; $('#autosave-label').textContent = '저장 실패'; }
}

function scheduleAutosave() { if (!$('#form-dialog').open || $('#save-draft-button').hidden) return; $('#autosave-label').textContent = '저장 대기 중…'; clearTimeout(app.autosaveTimer); app.autosaveTimer = setTimeout(() => saveForm(false, true), 900); }

document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-view]'); if (nav) openView(nav.dataset.view); const go = event.target.closest('[data-go]'); if (go) openView(go.dataset.go); const doc = event.target.closest('[data-doc]'); if (doc) openDocument(doc.dataset.doc);
  const filter = event.target.closest('[data-archive-filter]'); if (filter) { app.archiveFilter = filter.dataset.archiveFilter; renderArchive(); } const template = event.target.closest('[data-template]'); if (template) openForm(template.dataset.template); const edit = event.target.closest('[data-edit-form]'); if (edit) openForm(undefined, edit.dataset.editForm);
  const tab = event.target.closest('[data-workflow-tab]'); if (tab) { $$('[data-workflow-tab]').forEach((button) => button.classList.toggle('active', button === tab)); $$('.workflow-pane').forEach((pane) => pane.classList.toggle('active', pane.id === `workflow-${tab.dataset.workflowTab}`)); }
  if (event.target.closest('[data-close-document]')) { $('#document-dialog').close(); $('#document-frame').src = 'about:blank'; }
});

document.addEventListener('change', (event) => { if (event.target.matches('[data-check-id]')) mutate('toggle-checklist', { id: event.target.dataset.checkId, done: event.target.checked }).catch((error) => showToast(error.message)); if (event.target.id === 'form-template') renderFormFields(); });
$('#archive-search').addEventListener('input', renderArchive); $('#new-form-button').addEventListener('click', () => openForm()); $('#new-form-button-secondary').addEventListener('click', () => openForm()); $('#save-draft-button').addEventListener('click', () => saveForm(false)); $('#submit-form-button').addEventListener('click', () => saveForm(true)); $('#document-form').addEventListener('input', scheduleAutosave); $('#document-dialog').addEventListener('close', () => { $('#document-frame').src = 'about:blank'; });
$('#access-form').addEventListener('submit', async (event) => { event.preventDefault(); $('#access-error').textContent = ''; try { await api('/api/auth', { method: 'POST', body: JSON.stringify({ code: $('#access-code').value, role: 'player' }) }); $('#access-gate').hidden = true; app.mode = 'server'; await loadState(); } catch (error) { $('#access-error').textContent = error.message; } });
function updateClock() { const now = new Date(); const date = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); const time = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(now); $('#system-clock').textContent = `${date} · ${time} KST`; }
updateClock(); setInterval(updateClock, 30_000); openView(location.hash.slice(1) || 'command'); boot(); setInterval(() => { if (app.mode.startsWith('server') && document.visibilityState === 'visible') loadState().catch(() => {}); }, 15_000);
