import { playLoginSequence } from '/login-sequence.js';

const DEFAULT_STATE = {
  revision: 1,
  operation: { act: 'ACT II', title: '배신', phase: 1 },
  notices: [
    { id: 'notice-1', time: '21:40', title: '본부 공문 수신', body: '루미나스 병원 확보 인원', priority: true },
    { id: 'notice-2', time: '20:18', title: '기록 복구 완료', body: '이강준 수첩 · 003 페이지' },
    { id: 'notice-3', time: '18:03', title: '의료기록 갱신', body: '이세아 귀환 후 경과' }
  ],
  checklist: {
    1: [
      { id: 'briefing', title: '신규 공문 확인', note: '본부 및 지부 내부 수신함', done: true, source: 'SYSTEM' },
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
      { id: 'hq-report', title: '본부 정기 보고서 제출', note: '보고 내용과 누락 항목 최종 확인', done: false, source: 'E-DOC' }
    ]
  },
  documents: [
    { id: 'hq-urgent', code: 'HQ-KR/URG-2043-17', category: '본부 공문', title: '루미나스 병원 확보 인원', detail: '본부 긴급 공문', security: 'CONFIDENTIAL', status: 'NEW', url: '/archive/hq-urgent.html', editable: true },
    { id: 'medical-isea', code: 'TCB/MED-002', category: '의료기록', title: '이세아 귀환 후 의료기록', detail: 'POST-OP 기록', security: 'MEDICAL', status: 'NEW', url: '/archive/medical-isea.html', editable: true },
    { id: 'sera-profile', code: 'TCB/ID-004', category: '신원서류', title: '정세라 임시 신원 및 보호 서류', detail: 'CASE 004 · ADULT', security: 'CONFIDENTIAL', status: 'RELEASED', url: '/archive/sera-profile.html', editable: true },
    { id: 'suhwan-card', code: 'TCB/ID-003', category: '신원서류', title: '수환 임시 신원 카드', detail: 'CODE-003', security: 'CONFIDENTIAL', status: 'RELEASED', url: '/archive/suhwan-card.html', editable: true },
    { id: 'kangjun-note', code: 'RECOVERED/NOTE-003', category: '개인 기록', title: '이강준 수첩 · 003 페이지', detail: '복구된 비공식 기록', security: 'RESTRICTED', status: 'NEW', url: '/archive/kangjun-note-003.html' },
    { id: 'former-chief-note', code: 'TCB/FORMER-01', category: '개인 기록', title: '전임 지부장 개인 수첩', detail: '공식 사건철 미포함', security: 'RESTRICTED', status: 'RELEASED', url: '/archive/former-chief-note.html' },
    { id: 'handover', code: 'TCB/ADMIN-HO1', category: '지부 행정', title: '지부장 인수인계서', detail: '신임 지부장 부임 기록', security: 'INTERNAL', status: 'RELEASED', url: '/archive/branch-handover.html', editable: true },
    { id: 'p07', code: 'HQ-PD/P-07', category: '본부 규정', title: '보호대상 안정화 및 인계 규정', detail: 'REVISION 01', security: 'INTERNAL', status: 'RELEASED', url: '/archive/regulation-p07.html' },
    { id: 'branch-summary', code: 'TCB/OPS-SUM', category: '지부 행정', title: '지부 운영 시스템 서머리', detail: '신임 지부장 업무 참조', security: 'INTERNAL', status: 'RELEASED', url: '/archive/branch-operations.html' },
    { id: 'facilities', code: 'TCB/FAC-REF', category: '지부 행정', title: '지부 시설 목록 및 효과', detail: 'HOUSING REFERENCE', security: 'INTERNAL', status: 'RELEASED', url: '/archive/facilities.html' },
    { id: 'city-locations', code: 'CITY/LOC-01', category: '도시 정보', title: '태양시 로케이션', detail: '신도심·구도심·도시 근교·대학가', security: 'INTERNAL', status: 'RELEASED', url: '/archive/city-locations.html' },
    { id: 'city-history', code: 'CITY/HST-01', category: '도시 정보', title: '태양시 역사와 주요 조직', detail: '1973—2043 CHRONOLOGY', security: 'INTERNAL', status: 'RELEASED', url: '/archive/city-history.html' }
  ],
  evidence: [],
  forms: [], archiveEntries: {}, activity: []
};

const PHASE_NAMES = { 1: 'PHASE 01 · 내정', 2: 'PHASE 02 · 현장', 3: 'PHASE 03 · 정산' };
const DIRECTOR_SIGNATURE = { name: '최영호', image: '/media/signatures/choi-youngho-fitted.png' };
const EDITABLE_ARCHIVE_DOCUMENTS = new Set(['hq-urgent', 'medical-isea', 'sera-profile', 'suhwan-card', 'handover']);
const STATIC_EVIDENCE = [
  { id: 'static-audit-eve', title: '감사 전야', category: '현장사진', caseCode: 'TCB / FIELD RECORD', location: '촬영지 미기록', description: '태양시 지부 현장 기록. 세부 내용은 원본 이미지를 참조하십시오.', fileName: '감사 전야.webp', src: '/media/evidence/audit-eve.webp' },
  { id: 'static-two-beds', title: '두 개의 침대', category: '현장사진', caseCode: 'EMPTY ROOM', location: '루미나스 관련 현장', description: '현장에서 확보된 시각 기록. 두 개의 침대가 촬영되어 있다.', fileName: '두 개의 침대.webp', src: '/media/evidence/two-beds.webp' },
  { id: 'static-luminous-pharma', title: '루미나스 제약', category: '증거물', caseCode: 'LUMINOUS', location: '태양시', description: '루미나스 제약 관련 증거 이미지.', fileName: '루미나스 제약.webp', src: '/media/evidence/luminous-pharma.webp' },
  { id: 'static-white-noise', title: '벽 속의 백색 소음', category: '현장사진', caseCode: 'TCB / FIELD RECORD', location: '촬영지 미기록', description: '벽 내부 이상 현상과 관련된 현장 기록.', fileName: '벽 속의 백색 소음.webp', src: '/media/evidence/white-noise-in-wall.webp' },
  { id: 'static-incident-record', title: '사고 기록', category: '증거물', caseCode: 'INCIDENT RECORD', location: '기록 출처 미기재', description: '사건 조사 과정에서 확보된 사고 기록 이미지.', fileName: '사고 기록.webp', src: '/media/evidence/incident-record.webp' },
  { id: 'static-suhwan-collar', title: '수환의 초커', category: '증거물', caseCode: 'CODE-003', location: '루미나스 종합병원', description: '보호대상 수환에게서 분리된 초커 관련 증거 이미지.', fileName: '수환의 초커.webp', src: '/media/evidence/suhwan-collar.webp' },
  { id: 'static-ghost-waybill', title: '유령 운송장', category: '증거물', caseCode: 'LOGISTICS RECORD', location: '출처 미기재', description: '운송 경로 조사와 관련된 증거 이미지.', fileName: '유령 운송장.webp', src: '/media/evidence/ghost-waybill.webp' },
  { id: 'static-yunha-report', title: '윤하의 보고서', category: '증거물', caseCode: 'RECOVERED REPORT', location: '기록 출처 미기재', description: '윤하의 보고서 원본 이미지.', fileName: '윤하의 보고서.webp', src: '/media/evidence/yunha-report.webp' },
  { id: 'static-doctor-disappeared', title: '의사가 사라진 밤', category: '현장사진', caseCode: 'LUMINOUS / NIGHT', location: '촬영지 미기록', description: '의사 실종 사건과 관련된 현장 기록.', fileName: '의사가 사라진 밤.webp', src: '/media/evidence/doctor-disappeared.webp' }
];
const PERSONNEL = [
  { id: 'choi-youngho', name: '최영호', order: '01', image: '/media/personnel/choi-youngho.webp', fileName: '최영호.webp' },
  { id: 'ha-eunchae', name: '하은채', order: '02', image: '/media/personnel/ha-eunchae.webp', fileName: '하은채.webp' },
  { id: 'jin-taeho', name: '진태호', order: '03', image: '/media/personnel/jin-taeho.webp', fileName: '진태호.webp' },
  { id: 'lee-sea', name: '이세아', order: '04', image: '/media/personnel/lee-sea.webp', fileName: '이세아.webp' },
  { id: 'lee-taeyang', name: '이태양', order: '05', image: '/media/personnel/lee-taeyang.webp', fileName: '이태양.webp' }
];
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
  'settlement-report': { code: 'TCB-FIN/04', label: '사건 종결 및 정산 보고서', checklist: ['result-record', 'condition-update', 'payroll', 'maintenance'], fields: [
    { id: 'caseName', label: '사건명', required: true }, { id: 'reward', label: '사건 보수', placeholder: '예: +3 UNIT' }, { id: 'payroll', label: '임금 및 유지비', placeholder: '예: -3 UNIT', required: true },
    { id: 'damage', label: '대원 침식·부상 변화', placeholder: '성명 / 변경값' },
    { id: 'followup', label: '미결 사항 및 후속 조치', type: 'textarea', full: true }
  ] }
};

const app = { state: structuredClone(DEFAULT_STATE), mode: 'connecting', archiveFilter: '전체', evidenceFilter: '전체', formId: null, autosaveTimer: null };
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
    app.mode = session.demo ? 'server-open' : 'server'; await Promise.all([loadState(), playLoginSequence('player')]);
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
  if (action === 'delete-form') { const index = state.forms.findIndex((form) => form.id === payload.id); if (index >= 0 && ['DRAFT', 'RETURNED'].includes(state.forms[index].status)) state.forms.splice(index, 1); }
  if (action === 'mark-document-read') { const doc = state.documents.find((entry) => entry.id === payload.id); if (doc?.status === 'NEW') doc.status = 'RELEASED'; }
  if (action === 'save-archive-document') { state.archiveEntries ||= {}; state.archiveEntries[payload.entry.id] = { ...payload.entry, updatedAt: new Date().toISOString() }; }
  state.revision += 1; localStorage.setItem('tcb-offline-state', JSON.stringify(state));
}

async function mutate(action, payload) {
  if (app.mode === 'local') { applyLocal(action, payload); renderAll(); return; }
  try { const result = await api('/api/state', { method: 'PATCH', body: JSON.stringify({ action, payload, revision: app.state.revision }) }); app.state = result.state; renderAll(); $('#sync-label').textContent = 'SYNCED · SECURE STORE'; }
  catch (error) { if (error.status === 409) { await loadState(); showToast('다른 단말의 변경사항을 불러왔습니다. 다시 시도하세요.'); return; } throw error; }
}

function completeTemplateChecklist(templateId) { const template = FORM_TEMPLATES[templateId]; const items = app.state.checklist[app.state.operation.phase] || []; template?.checklist.forEach((id) => { const item = items.find((entry) => entry.id === id); if (item) item.done = true; }); }
function renderAll() { renderCommand(); renderPersonnel(); renderArchive(); renderEvidence(); renderWorkflow(); }

function renderCommand() {
  const { operation, notices } = app.state;
  $('#operation-act').textContent = operation.act; $('#operation-title').textContent = operation.title; $('#phase-label').textContent = PHASE_NAMES[operation.phase];
  $$('#phase-track i').forEach((node, index) => node.classList.toggle('done', index < operation.phase));
  $('#priority-message').textContent = notices.find((notice) => notice.priority)?.body || '현재 긴급 수신 내용이 없습니다.';
  const recentSignals = notices.filter((notice) => !notice.priority).slice(0, 4);
  $('#signal-list').innerHTML = recentSignals.map((notice, index) => `<li><time>${escapeHTML(notice.time || '--:--')}</time><span><b>${escapeHTML(notice.title)}</b>${escapeHTML(notice.body)}</span>${index === 0 ? '<em>NEW</em>' : ''}</li>`).join('');
  const items = app.state.checklist[operation.phase] || []; $('#command-checklist').innerHTML = items.slice(0, 5).map((item) => `<label><input data-check-id="${item.id}" type="checkbox" ${item.done ? 'checked' : ''}><span>${escapeHTML(item.title)}</span></label>`).join('');
  const done = items.filter((item) => item.done).length; const percent = items.length ? Math.round(done / items.length * 100) : 0; $('#command-completion').textContent = `${done} / ${items.length} COMPLETE`; $('#command-progress').style.width = `${percent}%`;
}

function renderArchive() {
  const categories = ['전체', ...new Set(app.state.documents.map((doc) => doc.category))]; $('#archive-filters').innerHTML = categories.map((category) => `<button class="${app.archiveFilter === category ? 'active' : ''}" data-archive-filter="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join('');
  const term = $('#archive-search').value.trim().toLowerCase(); const docs = app.state.documents.filter((doc) => (app.archiveFilter === '전체' || doc.category === app.archiveFilter) && `${doc.title} ${doc.category} ${doc.detail}`.toLowerCase().includes(term));
  $('#archive-count').textContent = `${app.state.documents.length} RECORDS RELEASED`; $('#archive-rows').innerHTML = docs.length ? docs.map((doc) => { const editable = EDITABLE_ARCHIVE_DOCUMENTS.has(doc.id); return `<tr class="archive-row-link" data-doc="${escapeHTML(doc.id)}" tabindex="0" role="link" aria-label="${escapeHTML(doc.title)} 문서 열기"><td class="doc-code">${escapeHTML(doc.code)}</td><td class="doc-name"><b>${escapeHTML(doc.title)}</b><small>${escapeHTML(doc.category)} · ${escapeHTML(doc.detail)}${editable ? ' · 직접 작성 가능' : ''}</small></td><td><span class="security-chip">${escapeHTML(doc.security)}</span></td><td><span class="status-chip ${doc.status.toLowerCase()}">${escapeHTML(doc.status)}</span></td><td><span class="open-doc-button">문서 열기 →</span></td></tr>`; }).join('') : '<tr><td colspan="5">검색 조건에 맞는 문서가 없습니다.</td></tr>';
}

function renderPersonnel() {
  $('#personnel-grid').innerHTML = PERSONNEL.map((person) => `<button class="personnel-card" data-personnel-id="${person.id}"><span class="personnel-photo"><img src="${person.image}" alt="${escapeHTML(person.name)} 사원증" loading="lazy"><i>${person.order}</i></span><span><small>UGN PERSONNEL FILE ${person.order}</small><b>${escapeHTML(person.name)}</b><em>사원증 원본 열람 →</em></span></button>`).join('');
}

function renderEvidence() {
  const evidence = [...STATIC_EVIDENCE, ...(app.state.evidence || [])];
  const categories = ['전체', ...new Set(evidence.map((item) => item.category))];
  $('#evidence-filters').innerHTML = categories.map((category) => `<button class="${app.evidenceFilter === category ? 'active' : ''}" data-evidence-filter="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join('');
  const term = $('#evidence-search').value.trim().toLowerCase();
  const items = evidence.filter((item) => (app.evidenceFilter === '전체' || item.category === app.evidenceFilter) && `${item.title} ${item.caseCode} ${item.location} ${item.description}`.toLowerCase().includes(term));
  $('#evidence-count').textContent = `${evidence.length} FILES RELEASED`;
  $('#evidence-empty').hidden = evidence.length > 0;
  $('#evidence-grid').innerHTML = items.length ? items.map((item) => `<button class="evidence-card" data-evidence-id="${escapeHTML(item.id)}"><span class="evidence-thumb"><img src="${escapeHTML(evidenceSource(item))}" alt="${escapeHTML(item.title)}" loading="lazy"><i>${escapeHTML(item.category)}</i></span><span class="evidence-card-body"><small>${escapeHTML(item.caseCode || 'UNASSIGNED CASE')}</small><b>${escapeHTML(item.title)}</b><em>${escapeHTML(item.location || '촬영지 미기록')} · ${formatEvidenceDate(item.capturedAt)}</em></span></button>`).join('') : (evidence.length ? '<p class="evidence-no-results">검색 조건에 맞는 사진이 없습니다.</p>' : '');
}

function evidenceSource(item) { return item.src || `/api/evidence?id=${encodeURIComponent(item.id)}`; }

function formatEvidenceDate(value) {
  if (!value) return '촬영시각 미기록';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function openEvidence(id) {
  const item = [...STATIC_EVIDENCE, ...(app.state.evidence || [])].find((entry) => entry.id === id); if (!item) return;
  const source = evidenceSource(item);
  $('#evidence-dialog-classification').textContent = item.category || 'VISUAL EVIDENCE'; $('#evidence-dialog-title').textContent = item.title;
  $('#evidence-case').textContent = item.caseCode || 'UNASSIGNED CASE'; $('#evidence-category').textContent = item.category || '미분류'; $('#evidence-captured').textContent = formatEvidenceDate(item.capturedAt); $('#evidence-location').textContent = item.location || '미기록'; $('#evidence-filename').textContent = item.fileName || '원본 파일'; $('#evidence-description').textContent = item.description || '추가 설명 없음';
  $('#evidence-loading').textContent = 'SECURE IMAGE LOADING…'; $('#evidence-loading').hidden = false; $('#evidence-image').alt = item.title; $('#evidence-image').src = source; $('#evidence-original').href = source; $('#evidence-dialog').showModal();
}

function openPersonnel(id) {
  const person = PERSONNEL.find((entry) => entry.id === id); if (!person) return;
  $('#evidence-dialog-classification').textContent = 'PERSONNEL ID'; $('#evidence-dialog-title').textContent = `${person.name} · 사원증`;
  $('#evidence-case').textContent = `UGN PERSONNEL FILE ${person.order}`; $('#evidence-category').textContent = '직원 명부'; $('#evidence-captured').textContent = '발급 정보는 원본 참조'; $('#evidence-location').textContent = 'Taeyang City Branch'; $('#evidence-filename').textContent = person.fileName; $('#evidence-description').textContent = 'UGN 태양시 지부 직원 명부에 등록된 사원증 원본.';
  $('#evidence-loading').textContent = 'SECURE ID LOADING…'; $('#evidence-loading').hidden = false; $('#evidence-image').alt = `${person.name} 사원증`; $('#evidence-image').src = person.image; $('#evidence-original').href = person.image; $('#evidence-dialog').showModal();
}

function renderWorkflow() {
  const items = app.state.checklist[app.state.operation.phase] || []; const done = items.filter((item) => item.done).length; const percent = items.length ? Math.round(done / items.length * 100) : 0;
  $('#workflow-phase').textContent = PHASE_NAMES[app.state.operation.phase]; $('#workflow-progress-label').textContent = `${done} / ${items.length}`; $('#workflow-progress-bar').style.width = `${percent}%`;
  $('#workflow-checklist-items').innerHTML = items.map((item) => `<label class="work-item ${item.done ? 'done' : ''}"><input data-check-id="${item.id}" type="checkbox" ${item.done ? 'checked' : ''}><span><b>${escapeHTML(item.title)}</b><small>${escapeHTML(item.note)}</small></span><em>${escapeHTML(item.source)}</em></label>`).join('');
  const forms = [...app.state.forms].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); $('#form-badge').textContent = forms.length; $('#forms-empty').hidden = forms.length > 0;
  $('#document-list').innerHTML = forms.map((form) => { const template = FORM_TEMPLATES[form.template] || { code: 'TCB/DOC', label: form.title }; const editable = ['DRAFT', 'RETURNED'].includes(form.status); return `<article class="document-item"><span class="doc-type">${template.code}</span><div><h3>${escapeHTML(form.title || template.label)}</h3><small>${escapeHTML(template.label)} · ${formatDate(form.updatedAt)}${form.comment ? ` · 반려 사유: ${escapeHTML(form.comment)}` : ''}</small></div><span class="status-chip ${form.status.toLowerCase()}">${escapeHTML(form.status)}</span><div class="document-actions"><button class="secondary-button" data-edit-form="${form.id}">${editable ? '계속 작성' : '내용 확인'}</button>${editable ? `<button class="danger-button" data-delete-form="${form.id}">삭제</button>` : ''}</div></article>`; }).join('');
}

function formatDate(value) { if (!value) return '저장 전'; return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function openView(name) { const targetName = $(`#view-${name}`) ? name : 'command'; $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === targetName)); $$('.view').forEach((view) => view.classList.toggle('active', view.id === `view-${targetName}`)); $('#main').focus({ preventScroll: true }); history.replaceState(null, '', `#${targetName}`); }

function openDocument(id) { const doc = app.state.documents.find((entry) => entry.id === id); if (!doc) return; $('#document-dialog-title').textContent = doc.title; $('#document-classification').textContent = doc.security; $('#document-frame').src = doc.url; $('#document-new-tab').href = doc.url; $('#document-dialog').showModal(); if (doc.status === 'NEW') mutate('mark-document-read', { id }).catch((error) => showToast(error.message)); }

function openForm(templateId = 'operation-order', formId = null) {
  app.formId = formId; const existing = formId ? app.state.forms.find((form) => form.id === formId) : null; const templateSelect = $('#form-template'); templateSelect.innerHTML = Object.entries(FORM_TEMPLATES).map(([id, template]) => `<option value="${id}">${template.label}</option>`).join('');
  templateSelect.value = existing?.template || templateId; templateSelect.disabled = Boolean(existing); $('#form-signature').value = existing?.signature || ''; renderFormSignature(Boolean(existing?.signature)); $('#form-dialog-title').textContent = existing ? (existing.title || FORM_TEMPLATES[existing.template].label) : '신규 전자서류 작성'; renderFormFields(existing?.content || {});
  const editable = !existing || ['DRAFT', 'RETURNED'].includes(existing.status); $('#form-paper-status').textContent = existing?.status || 'DRAFT'; $$('#document-form input, #document-form textarea, #document-form select').forEach((field) => { if (field.id !== 'form-template') field.disabled = !editable; }); $('#form-signature-button').disabled = !editable; $('#save-draft-button').hidden = !editable; $('#submit-form-button').hidden = !editable; $('#autosave-label').textContent = editable ? '변경사항 없음' : `${existing.status} · 읽기 전용`; $('#form-dialog').showModal();
}

function renderFormSignature(signed) {
  const button = $('#form-signature-button'); button.classList.toggle('signed', signed); button.setAttribute('aria-pressed', String(signed)); button.setAttribute('aria-label', signed ? `${DIRECTOR_SIGNATURE.name} 전자서명 입력됨. 다시 누르면 삭제` : '서명란 클릭'); $('img', button).hidden = !signed; $('.signature-placeholder', button).hidden = signed;
}

function toggleFormSignature() {
  if ($('#form-signature-button').disabled) return; const signed = Boolean($('#form-signature').value); $('#form-signature').value = signed ? '' : DIRECTOR_SIGNATURE.name; renderFormSignature(!signed); $('#form-error').textContent = ''; scheduleAutosave();
}

function renderFormFields(values = {}) {
  const template = FORM_TEMPLATES[$('#form-template').value]; $('#form-classification').textContent = `${template.code} · BRANCH INTERNAL`;
  $('#form-paper-code').textContent = template.code; $('#form-paper-title').textContent = template.label;
  $('#dynamic-fields').innerHTML = template.fields.map((field) => { const attrs = `name="${field.id}" data-field="${field.id}" ${field.required ? 'required' : ''}`; let control; if (field.type === 'textarea') control = `<textarea ${attrs} placeholder="${escapeHTML(field.placeholder || '')}">${escapeHTML(values[field.id] || '')}</textarea>`; else if (field.type === 'select') control = `<select ${attrs}>${field.options.map((option) => `<option ${values[field.id] === option ? 'selected' : ''}>${escapeHTML(option)}</option>`).join('')}</select>`; else control = `<input ${attrs} value="${escapeHTML(values[field.id] || '')}" placeholder="${escapeHTML(field.placeholder || '')}">`; return `<div class="field-group ${field.full ? 'full' : ''}"><label><span>${escapeHTML(field.label)}</span>${control}</label></div>`; }).join('');
}

function collectForm() { const templateId = $('#form-template').value; const template = FORM_TEMPLATES[templateId]; const content = {}; $$('[data-field]', $('#document-form')).forEach((field) => { content[field.dataset.field] = field.value.trim(); }); const firstField = template.fields[0]?.id; return { id: app.formId || crypto.randomUUID(), template: templateId, title: content[firstField] || template.label, content, signature: $('#form-signature').value.trim(), status: app.state.forms.find((form) => form.id === app.formId)?.status || 'DRAFT' }; }

async function saveForm(submit = false, quiet = false) {
  clearTimeout(app.autosaveTimer); const formElement = $('#document-form'); const documentData = collectForm(); $('#form-error').textContent = ''; if (submit && !documentData.signature) { $('#form-error').textContent = '지부장 전자서명란을 눌러 서명한 뒤 제출해줘.'; $('#form-signature-button').focus(); return; } if (submit && !formElement.reportValidity()) return; $('#autosave-label').textContent = submit ? '제출 중…' : '저장 중…'; $('#form-paper-status').textContent = submit ? 'SUBMITTING' : 'SAVING';
  try { await mutate(submit ? 'submit-form' : 'save-form', { form: documentData }); app.formId = documentData.id; $('#autosave-label').textContent = submit ? '제출 완료' : '자동저장 완료'; $('#form-paper-status').textContent = submit ? 'SUBMITTED' : 'DRAFT'; if (submit) { $('#form-dialog').close(); showToast('서류가 전자서명되어 관제로 제출되었습니다.'); } else if (!quiet) showToast('초안이 저장되었습니다.'); }
  catch (error) { $('#form-error').textContent = error.message; $('#autosave-label').textContent = '저장 실패'; $('#form-paper-status').textContent = 'ERROR'; }
}

function scheduleAutosave() { if (!$('#form-dialog').open || $('#save-draft-button').hidden) return; $('#autosave-label').textContent = '저장 대기 중…'; clearTimeout(app.autosaveTimer); app.autosaveTimer = setTimeout(() => saveForm(false, true), 900); }

document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-view]'); if (nav) openView(nav.dataset.view); const go = event.target.closest('[data-go]'); if (go) openView(go.dataset.go); const doc = event.target.closest('[data-doc]'); if (doc) openDocument(doc.dataset.doc);
  const filter = event.target.closest('[data-archive-filter]'); if (filter) { app.archiveFilter = filter.dataset.archiveFilter; renderArchive(); } const template = event.target.closest('[data-template]'); if (template) openForm(template.dataset.template); const edit = event.target.closest('[data-edit-form]'); if (edit) openForm(undefined, edit.dataset.editForm);
  const deleteForm = event.target.closest('[data-delete-form]'); if (deleteForm && confirm('이 전자서류를 삭제할까? 삭제한 기록은 복구할 수 없어.')) mutate('delete-form', { id: deleteForm.dataset.deleteForm }).then(() => showToast('전자서류를 삭제했습니다.')).catch((error) => showToast(error.message));
  const evidenceFilter = event.target.closest('[data-evidence-filter]'); if (evidenceFilter) { app.evidenceFilter = evidenceFilter.dataset.evidenceFilter; renderEvidence(); } const evidence = event.target.closest('[data-evidence-id]'); if (evidence) openEvidence(evidence.dataset.evidenceId);
  const personnel = event.target.closest('[data-personnel-id]'); if (personnel) openPersonnel(personnel.dataset.personnelId);
  const tab = event.target.closest('[data-workflow-tab]'); if (tab) { $$('[data-workflow-tab]').forEach((button) => button.classList.toggle('active', button === tab)); $$('.workflow-pane').forEach((pane) => pane.classList.toggle('active', pane.id === `workflow-${tab.dataset.workflowTab}`)); }
  if (event.target.closest('[data-close-document]')) { $('#document-dialog').close(); $('#document-frame').src = 'about:blank'; }
  if (event.target.closest('[data-close-form]')) { clearTimeout(app.autosaveTimer); $('#form-error').textContent = ''; $('#form-dialog').close(); }
  if (event.target.closest('[data-close-evidence]')) { $('#evidence-dialog').close(); $('#evidence-image').src = ''; }
});

document.addEventListener('change', (event) => { if (event.target.matches('[data-check-id]')) mutate('toggle-checklist', { id: event.target.dataset.checkId, done: event.target.checked }).catch((error) => showToast(error.message)); if (event.target.id === 'form-template') renderFormFields(); });
document.addEventListener('keydown', (event) => { const row = event.target.closest('.archive-row-link[data-doc]'); if (row && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openDocument(row.dataset.doc); } });
$('#archive-search').addEventListener('input', renderArchive); $('#evidence-search').addEventListener('input', renderEvidence); $('#evidence-image').addEventListener('load', () => { $('#evidence-loading').hidden = true; }); $('#evidence-image').addEventListener('error', () => { $('#evidence-loading').hidden = false; $('#evidence-loading').textContent = 'IMAGE LOAD FAILED'; }); $('#new-form-button').addEventListener('click', () => openForm()); $('#new-form-button-secondary').addEventListener('click', () => openForm()); $('#save-draft-button').addEventListener('click', () => saveForm(false)); $('#submit-form-button').addEventListener('click', () => saveForm(true)); $('#document-form').addEventListener('input', scheduleAutosave); $('#document-dialog').addEventListener('close', () => { $('#document-frame').src = 'about:blank'; }); $('#evidence-dialog').addEventListener('close', () => { $('#evidence-image').src = ''; });
$('#form-signature-button').addEventListener('click', toggleFormSignature);
$('#access-form').addEventListener('submit', async (event) => { event.preventDefault(); $('#access-error').textContent = ''; try { await api('/api/auth', { method: 'POST', body: JSON.stringify({ code: $('#access-code').value, role: 'player' }) }); $('#access-gate').hidden = true; app.mode = 'server'; await Promise.all([loadState(), playLoginSequence('player')]); } catch (error) { $('#access-error').textContent = error.message; } });
function updateClock() { const now = new Date(); const date = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); const time = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(now); $('#system-clock').textContent = `${date} · ${time} KST`; }
updateClock(); setInterval(updateClock, 30_000); openView(location.hash.slice(1) || 'command'); boot(); setInterval(() => { if (app.mode.startsWith('server') && document.visibilityState === 'visible') loadState().catch(() => {}); }, 15_000);
