const SCHEMAS = {
  'hq-urgent': {
    code: 'HQ RESPONSE / DIRECTOR', title: '지부장 회신 기록',
    fields: [
      { id: 'decision', label: '회신 결정', type: 'select', options: ['본부 인계 협의', '지부 보호 지속', 'P-07 인계 유예'] },
      { id: 'responseAt', label: '회신 일시', type: 'datetime-local' },
      { id: 'opinion', label: '지부장 의견', type: 'textarea', full: true },
      { id: 'nextAction', label: '후속 조치 및 재검 일정', type: 'textarea', full: true }
    ], signatures: [{ id: 'branchDirector', label: '지부장 서명' }]
  },
  'medical-isea': {
    code: 'MEDICAL FOLLOW-UP', title: '추가 의료 경과 기록',
    fields: [
      { id: 'observedAt', label: '관찰 일시', type: 'datetime-local' },
      { id: 'condition', label: '현재 판정', type: 'select', options: ['의무 관찰', '안정', '현장 투입 보류', '추가 검사 필요', '격리 관찰'] },
      { id: 'vitals', label: '활력·침식 수치', placeholder: '활력, 침식률, 특이 변화' },
      { id: 'observations', label: '추가 관찰 소견', type: 'textarea', full: true },
      { id: 'treatment', label: '처치 및 투입 제한', type: 'textarea', full: true }
    ], signatures: [{ id: 'medicalOfficer', label: '의무 담당자 서명' }, { id: 'branchDirector', label: '지부장 확인' }]
  },
  'sera-profile': {
    code: 'PROTECTION DECISION', title: '임시 보호 결정 기록',
    fields: [
      { id: 'placement', label: '처우 선택', type: 'select', options: ['지부 숙소 보호', 'UGN 본부 인계', '외부 협력처 보호', '임시 은폐'] },
      { id: 'resources', label: '시설·자원 배정', type: 'textarea', full: true },
      { id: 'reason', label: '결정 사유', type: 'textarea', full: true }
    ], signatures: [{ id: 'protectionOfficer', label: '보호 담당자 서명' }, { id: 'medicalOfficer', label: '의무 담당자 서명' }, { id: 'branchDirector', label: '지부장 결정·서명' }]
  },
  'suhwan-card': {
    code: 'TEMPORARY ID ISSUE', title: '임시 신원 카드 발급 기록',
    fields: [
      { id: 'issuedAt', label: '발급 일자', type: 'date' },
      { id: 'housing', label: '현재 보호처' },
      { id: 'medicalNote', label: '의료 확인 내용', type: 'textarea', full: true },
      { id: 'issueNote', label: '발급 및 보호 메모', type: 'textarea', full: true }
    ], signatures: [{ id: 'protectionOfficer', label: '보호 담당자 서명' }, { id: 'medicalOfficer', label: '의료 확인 서명' }, { id: 'branchDirector', label: '지부장 승인 서명' }]
  },
  handover: {
    code: 'HANDOVER ACCEPTANCE', title: '인수 확인 기록',
    fields: [
      { id: 'acceptedAt', label: '인수 일시', type: 'datetime-local' },
      { id: 'exceptions', label: '인수 제외·유보 사항', type: 'textarea', full: true },
      { id: 'notes', label: '추가 인수 메모', type: 'textarea', full: true }
    ], signatures: [{ id: 'incomingDirector', label: '인수자 서명' }]
  }
};

const script = document.querySelector('script[data-archive-id]');
const documentId = script?.dataset.archiveId;
const schema = SCHEMAS[documentId];

if (schema) {
  const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const style = document.createElement('style');
  style.textContent = `
    .ugn-entry-sheet{width:min(1120px,calc(100% - 32px));margin:28px auto 48px;padding:28px;color:#182a38;background:#f8fafb;border:2px solid #496a7b;box-shadow:0 18px 50px #0005;font-family:"Pretendard","Noto Sans KR","Malgun Gothic",sans-serif}
    .ugn-entry-head{display:flex;justify-content:space-between;gap:20px;align-items:end;padding-bottom:14px;border-bottom:3px solid #102e43}.ugn-entry-head small{display:block;color:#236a88;font:800 .62rem Consolas,monospace;letter-spacing:.13em}.ugn-entry-head h2{margin:5px 0 0;color:#142c3d;font-size:1.35rem}.ugn-entry-state{color:#567080;font:700 .62rem Consolas,monospace;text-align:right}
    .ugn-entry-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:20px}.ugn-entry-field{display:grid;gap:7px;color:#526878;font:800 .67rem Consolas,monospace;letter-spacing:.04em}.ugn-entry-field.full{grid-column:1/-1}.ugn-entry-field input,.ugn-entry-field textarea,.ugn-entry-field select{width:100%;border:1px solid #a9bac4;border-radius:0;padding:11px 12px;color:#142b3a;background:#fff;font:500 .82rem/1.55 "Pretendard","Noto Sans KR","Malgun Gothic",sans-serif;outline:none}.ugn-entry-field textarea{min-height:105px;resize:vertical}.ugn-entry-field input:focus,.ugn-entry-field textarea:focus,.ugn-entry-field select:focus{border-color:#1e718e;box-shadow:0 0 0 2px #1e718e22}
    .ugn-signatures{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:20px;padding-top:18px;border-top:1px solid #aebbc3}.ugn-signatures input{font-family:"Nanum Pen Script","Malgun Gothic",sans-serif;font-size:1.05rem}
    .ugn-entry-actions{display:flex;align-items:center;justify-content:flex-end;gap:12px;margin-top:20px}.ugn-entry-actions span{margin-right:auto;color:#607887;font-size:.7rem}.ugn-entry-actions button{border:1px solid #174e69;padding:10px 18px;color:#fff;background:#174e69;font-weight:800;cursor:pointer}.ugn-entry-actions button:disabled{opacity:.55;cursor:wait}.ugn-entry-actions button:hover:not(:disabled){background:#226d8d}.ugn-entry-note{margin:12px 0 0;color:#657887;font-size:.68rem;line-height:1.5}
    @media(max-width:680px){.ugn-entry-sheet{width:min(100% - 18px,1120px);padding:20px 16px}.ugn-entry-head{display:block}.ugn-entry-state{text-align:left;margin-top:8px}.ugn-entry-grid{grid-template-columns:1fr}.ugn-entry-field.full{grid-column:auto}.ugn-entry-actions{align-items:stretch;flex-direction:column}.ugn-entry-actions span{margin:0}.ugn-entry-actions button{width:100%}}
    @media print{.ugn-entry-sheet{width:100%;margin:8mm 0 0;padding:8mm;box-shadow:none;break-inside:avoid}.ugn-entry-actions button,.ugn-entry-note{display:none}}
  `;
  document.head.append(style);

  const fieldControl = (field) => {
    if (field.type === 'textarea') return `<textarea data-entry-field="${field.id}" placeholder="${escapeHTML(field.placeholder || '')}"></textarea>`;
    if (field.type === 'select') return `<select data-entry-field="${field.id}"><option value="">선택</option>${field.options.map((option) => `<option>${escapeHTML(option)}</option>`).join('')}</select>`;
    return `<input data-entry-field="${field.id}" type="${field.type || 'text'}" placeholder="${escapeHTML(field.placeholder || '')}">`;
  };

  const section = document.createElement('section');
  section.className = 'ugn-entry-sheet';
  section.innerHTML = `<div class="ugn-entry-head"><div><small>${escapeHTML(schema.code)} · SHARED RECORD</small><h2>${escapeHTML(schema.title)}</h2></div><div class="ugn-entry-state" data-entry-state>공유 기록 불러오는 중…</div></div><form data-entry-form><div class="ugn-entry-grid">${schema.fields.map((field) => `<label class="ugn-entry-field ${field.full ? 'full' : ''}">${escapeHTML(field.label)}${fieldControl(field)}</label>`).join('')}</div><div class="ugn-signatures">${schema.signatures.map((signature) => `<label class="ugn-entry-field">${escapeHTML(signature.label)}<input data-entry-signature="${signature.id}" maxlength="80" placeholder="성명 입력"></label>`).join('')}</div><div class="ugn-entry-actions"><span data-entry-message aria-live="polite">내용과 서명은 모든 플레이어에게 공유됩니다.</span><button type="submit">기록 저장</button></div><p class="ugn-entry-note">저장 버튼을 누르면 현재 문서의 작성 내용이 Netlify 공유 저장소에 반영됩니다. 인쇄 또는 PDF 저장 시 작성 내용도 함께 출력됩니다.</p></form>`;
  document.body.append(section);

  const form = section.querySelector('[data-entry-form]');
  const stateLabel = section.querySelector('[data-entry-state]');
  const message = section.querySelector('[data-entry-message]');
  const saveButton = form.querySelector('button[type="submit"]');
  let mode = 'server';

  function applyEntry(entry = {}) {
    for (const input of form.querySelectorAll('[data-entry-field]')) input.value = entry.content?.[input.dataset.entryField] || '';
    for (const input of form.querySelectorAll('[data-entry-signature]')) input.value = entry.signatures?.[input.dataset.entrySignature] || '';
    stateLabel.textContent = entry.updatedAt ? `LAST SAVED · ${new Date(entry.updatedAt).toLocaleString('ko-KR')}` : 'NEW · 작성 대기';
  }

  function collectEntry() {
    const content = {}; const signatures = {};
    for (const input of form.querySelectorAll('[data-entry-field]')) content[input.dataset.entryField] = input.value.trim();
    for (const input of form.querySelectorAll('[data-entry-signature]')) signatures[input.dataset.entrySignature] = input.value.trim();
    return { id: documentId, content, signatures };
  }

  async function getSharedState() {
    const response = await fetch('/api/state', { headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || '공유 기록을 불러오지 못했습니다.');
    return data.state;
  }

  async function saveShared(entry) {
    let state = await getSharedState();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch('/api/state', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save-archive-document', payload: { entry }, revision: state.revision }) });
      const data = await response.json().catch(() => ({}));
      if (response.ok) return data.state.archiveEntries?.[documentId];
      if (response.status === 409 && data.state) { state = data.state; continue; }
      throw new Error(data.error || '공유 기록을 저장하지 못했습니다.');
    }
    throw new Error('다른 단말의 변경과 충돌했습니다. 다시 저장해 주세요.');
  }

  async function loadEntry() {
    try {
      const state = await getSharedState();
      applyEntry(state.archiveEntries?.[documentId]);
    } catch {
      mode = 'local';
      const saved = localStorage.getItem(`tcb-archive-entry-${documentId}`);
      applyEntry(saved ? JSON.parse(saved) : {});
      message.textContent = '로컬 미리보기: 이 기기에만 저장됩니다.';
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault(); saveButton.disabled = true; message.textContent = '저장 중…';
    const entry = collectEntry();
    try {
      let saved;
      if (mode === 'server') saved = await saveShared(entry);
      else { saved = { ...entry, updatedAt: new Date().toISOString() }; localStorage.setItem(`tcb-archive-entry-${documentId}`, JSON.stringify(saved)); }
      applyEntry(saved); message.textContent = mode === 'server' ? '공유 기록에 저장되었습니다.' : '이 기기에 저장되었습니다.';
    } catch (error) { message.textContent = error.message; }
    finally { saveButton.disabled = false; }
  });

  loadEntry();
}
