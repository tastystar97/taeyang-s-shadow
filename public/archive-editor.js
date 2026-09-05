const SIGNATURE = { name: '최영호', image: '/media/signatures/choi-youngho-fitted.png' };



const script = document.querySelector('script[data-archive-id]');
const documentId = script?.dataset.archiveId;
SIGNATURE.image = '/api/files?type=documents&id=' + encodeURIComponent(documentId) + '&asset=signature';
let initialState;
try { const response = await fetch('/api/state', {cache:'no-store'}); if (response.ok) initialState = (await response.json()).state; } catch {}
const schema = initialState?.documents.find(doc => doc.id === documentId)?.editorSchema;
if (!schema) document.body.replaceChildren(Object.assign(document.createElement('p'), {textContent:'문서 접근 권한을 확인할 수 없습니다.'}));

if (schema) {
  const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const style = document.createElement('style');
  style.textContent = `
    .ugn-save-state{color:#567080;font:700 .58rem Consolas,monospace;letter-spacing:.04em}
    .ugn-inline-panel{margin:20px 0 14px;padding:16px;border:1px solid #91a7b6;background:rgba(245,249,251,.92);color:#172d3c;font-family:"Pretendard","Noto Sans KR","Malgun Gothic",sans-serif}
    .ugn-inline-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:13px;padding-bottom:9px;border-bottom:2px solid #274d65}.ugn-inline-head b{font-size:.78rem}.ugn-inline-head small{display:block;color:#39728c;font:800 .56rem Consolas,monospace;letter-spacing:.1em}
    .ugn-inline-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ugn-inline-field{display:grid;gap:5px;color:#526878;font:800 .62rem Consolas,monospace}.ugn-inline-field.full{grid-column:1/-1}
    .ugn-inline-field input,.ugn-inline-field textarea,.ugn-inline-field select,.ugn-signature-input{width:100%;border:1px solid #a4b5bf;border-radius:0;padding:9px 10px;color:#142b3a;background:#fff;font:500 .76rem/1.5 "Pretendard","Noto Sans KR","Malgun Gothic",sans-serif;outline:none}.ugn-inline-field textarea{min-height:76px;resize:vertical}.ugn-inline-field :focus,.ugn-signature-input:focus{border-color:#1e718e;box-shadow:0 0 0 2px #1e718e22}
    .ugn-inline-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:12px}.ugn-inline-actions span{margin-right:auto;color:#607887;font-size:.67rem}.ugn-save-button{border:1px solid #174e69!important;padding:8px 14px!important;color:#fff!important;background:#174e69!important;font-weight:800!important;cursor:pointer}.ugn-save-button:disabled{opacity:.55;cursor:wait}
    .ugn-signature-slot{position:relative!important;min-height:108px!important;outline:none}.ugn-signature-control{position:absolute;inset:22px 5px 4px;display:grid;place-items:center;padding:0!important;border:1px dashed #7e98a7;background:rgba(255,255,255,.78);color:#4c6a79;font:700 .62rem/1.35 Consolas,monospace;text-align:center;cursor:pointer;overflow:hidden}.ugn-signature-control:hover{border-color:#137698;background:#eef9fb}.ugn-signature-control img{position:absolute!important;inset:4px 8px 14px!important;display:block!important;width:calc(100% - 16px)!important;height:calc(100% - 18px)!important;max-width:none!important;max-height:none!important;object-fit:contain!important;object-position:center!important;filter:none!important}.ugn-signature-control.signed{border-style:solid;border-color:#567f91;background:#fff}.ugn-signature-control.signed::after{content:'전자서명 · 최영호';position:absolute;right:4px;bottom:2px;color:#406476;background:#ffffffd9;font:700 .48rem Consolas,monospace}
    .ugn-direct-choice,.ugn-direct-check{cursor:pointer;user-select:none;transition:border-color .15s,background .15s}.ugn-direct-choice:hover,.ugn-direct-check:hover{border-color:#2383a3!important}.ugn-direct-choice:focus-visible,.ugn-direct-check:focus-visible{outline:2px solid #2184a5;outline-offset:2px}.ugn-direct-choice.selected,.ugn-direct-check.selected{border-color:#126f91!important;background:#e6f5f9!important;box-shadow:inset 3px 0 #126f91}.ugn-direct-choice.selected .box,.ugn-direct-check.selected .box{position:relative;border-color:#126f91;background:#126f91}.ugn-direct-choice.selected .box::after,.ugn-direct-check.selected .box::after{content:'✓';position:absolute;inset:-3px 0 0;color:#fff;font:bold 11px Arial;text-align:center}
    .ugn-reply-fields{display:grid;grid-template-columns:1fr 190px;gap:10px;margin-top:9px;padding-top:9px;border-top:1px solid #9fb0bc}.ugn-reply-fields label{display:grid;gap:5px;color:#566f7f;font:800 .58rem Consolas,monospace}.ugn-reply-fields textarea{width:100%;min-height:74px;padding:8px;border:1px solid #9eb0bd;background:#fff;color:#172737;font:.7rem/1.5 inherit;resize:vertical}.ugn-reply-signature{position:relative;min-height:92px;padding:0!important;border:1px dashed #8197a5;background:#fff;cursor:pointer;overflow:hidden}.ugn-reply-signature span{position:absolute;inset:0;display:grid;place-items:center;color:#657b88;font:700 .58rem Consolas,monospace}.ugn-reply-signature img{position:absolute!important;inset:4px 8px 14px!important;display:none;width:calc(100% - 16px)!important;height:calc(100% - 18px)!important;max-width:none!important;max-height:none!important;object-fit:contain!important;object-position:center!important}.ugn-reply-signature.signed img{display:block!important}.ugn-reply-signature.signed span{display:none}.ugn-reply-signature.signed::after{content:'최영호 · 전자서명';position:absolute;right:4px;bottom:2px;color:#416678;background:#ffffffd9;font:700 .47rem Consolas,monospace}.ugn-reply-actions{display:flex;align-items:center;gap:10px;margin-top:9px}.ugn-reply-actions .ugn-save-state{margin-right:auto}
    @media(max-width:680px){.ugn-inline-grid,.ugn-reply-fields{grid-template-columns:1fr}.ugn-inline-field.full{grid-column:auto}.ugn-inline-actions{align-items:stretch;flex-direction:column}.ugn-inline-actions span{margin:0}.ugn-save-button{width:100%}}
    @media print{.ugn-save-button,.ugn-save-state{display:none!important}.ugn-inline-panel{break-inside:avoid;background:#fff}.ugn-direct-choice,.ugn-direct-check{transition:none}}
  `;
  document.head.append(style);

  let canEdit = false;
  let loadedRevision = null;
  let currentEntry = { id: documentId, content: {}, signatures: {} };
  let saveTimer = 0;
  let saving = false;
  let saveQueued = false;
  let statusLabel;
  let saveButton;

  async function getSharedState() {
    const response = await fetch('/api/state', { headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || '공유 기록을 불러오지 못했습니다.');
    return data.state;
  }

  async function saveShared(entry) {
    if (!canEdit) throw new Error('읽기 전용 문서입니다.');
    let state = {revision: loadedRevision};
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch('/api/state', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save-archive-document', payload: { entry }, revision: state.revision }) });
      const data = await response.json().catch(() => ({}));
      if (response.ok) { loadedRevision = data.state.revision; return data.state.archiveEntries?.[documentId]; }
      if (response.status === 409) { canEdit = false; clearTimeout(saveTimer); throw new Error('다른 단말에서 기록이 변경되었습니다. 새로 열어 내용을 확인하세요.'); }
      throw new Error(data.error || '공유 기록을 저장하지 못했습니다.');
    }
    throw new Error('다른 단말의 변경과 충돌했습니다. 다시 눌러 줘.');
  }

  const setStatus = (text) => { if (statusLabel) statusLabel.textContent = text; };
  const savedStatus = (entry) => entry?.updatedAt ? `저장됨 · ${new Date(entry.updatedAt).toLocaleString('ko-KR')}` : '새 기록 · 선택 대기';

  async function persist(quiet = false) {
    if (!canEdit) return;
    if (saving) { saveQueued = true; return; }
    clearTimeout(saveTimer); saving = true;
    if (saveButton) saveButton.disabled = true;
    setStatus('공유 기록 저장 중…');
    const entry = collectEntry();
    try {
      const saved = await saveShared(entry);
      currentEntry = saved;
      setStatus(savedStatus(saved));
    } catch (error) { setStatus(error.message); if (!quiet) console.error(error); }
    finally {
      saving = false;
      if (saveButton) saveButton.disabled = !canEdit;
      if (saveQueued) {
        saveQueued = false;
        window.setTimeout(() => persist(true), 50);
      }
    }
  }

  function scheduleSave() {
    if (!canEdit) return;
    setStatus('변경됨 · 자동 저장 대기');
    if (saving) saveQueued = true;
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => persist(true), 650);
  }

  function activate(element, handler) {
    element.tabIndex = 0;
    element.addEventListener('click', event => { if (canEdit) handler(event); });
    element.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (canEdit) handler(); } });
  }

  const signatureHTML = (signed) => signed ? `<img src="${SIGNATURE.image}" alt="${SIGNATURE.name} 전자서명">` : '<span>서명란 클릭<br>전자서명 입력</span>';

  function toggleSignature(id, element) {
    const signed = currentEntry.signatures?.[id] === SIGNATURE.name;
    currentEntry.signatures ||= {};
    currentEntry.signatures[id] = signed ? '' : SIGNATURE.name;
    element.classList.toggle('signed', !signed);
    element.innerHTML = signatureHTML(!signed);
    element.setAttribute('aria-label', !signed ? `${SIGNATURE.name} 전자서명 입력됨. 다시 누르면 삭제` : '서명란 클릭');
    scheduleSave();
  }

  function parseList(value) { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }

  function setupHq() {
    const reply = document.querySelector('.reply');
    const reason = reply?.querySelector('.reason');
    if (!reply || !reason) return;
    const attachmentKeys = ['initialReport', 'peopleRegister', 'p07Consent', 'evidenceSeal', 'capacityPlan', 'iseaStatement'];
    document.querySelectorAll('.attachments > div').forEach((item, index) => {
      item.classList.add('ugn-direct-check'); item.dataset.entryAttachment = attachmentKeys[index]; item.setAttribute('role', 'checkbox');
      activate(item, () => { item.classList.toggle('selected'); item.setAttribute('aria-checked', String(item.classList.contains('selected'))); scheduleSave(); });
    });
    document.querySelectorAll('.choices .choice').forEach((choice) => {
      choice.classList.add('ugn-direct-choice'); choice.dataset.entryDecision = choice.querySelector('b')?.textContent.trim() || ''; choice.setAttribute('role', 'radio');
      activate(choice, () => {
        document.querySelectorAll('.choices .choice').forEach((item) => { const selected = item === choice; item.classList.toggle('selected', selected); item.setAttribute('aria-checked', String(selected)); });
        scheduleSave();
      });
    });
    reason.className = 'ugn-reply-fields';
    reason.innerHTML = `<label>지부장 의견<textarea data-entry-field="opinion" placeholder="회신 의견을 입력"></textarea></label><label>지부장 서명<button class="ugn-reply-signature" type="button" data-entry-signature="branchDirector" aria-label="서명란 클릭">${signatureHTML(false)}</button></label><label style="grid-column:1/-1">후속 조치 및 재검 일정<textarea data-entry-field="nextAction" placeholder="후속 조치나 재검 일정을 입력"></textarea></label>`;
    const signatureButton = reason.querySelector('[data-entry-signature]');
    signatureButton.addEventListener('click', () => toggleSignature('branchDirector', signatureButton));
    reason.querySelectorAll('textarea').forEach((input) => input.addEventListener('input', scheduleSave));
    const actions = document.createElement('div');
    actions.className = 'ugn-reply-actions';
    actions.innerHTML = '<span class="ugn-save-state" data-inline-state></span><button type="button" class="ugn-save-button">기록 저장</button>';
    reply.append(actions); statusLabel = actions.querySelector('[data-inline-state]'); saveButton = actions.querySelector('button');
    saveButton.addEventListener('click', () => persist());
  }

  function fieldControl(field) {
    if (field.type === 'textarea') return `<textarea data-entry-field="${field.id}" placeholder="${escapeHTML(field.placeholder || '')}"></textarea>`;
    if (field.type === 'select') return `<select data-entry-field="${field.id}"><option value="">선택</option>${field.options.map((option) => `<option>${escapeHTML(option)}</option>`).join('')}</select>`;
    return `<input data-entry-field="${field.id}" type="${field.type || 'text'}" placeholder="${escapeHTML(field.placeholder || '')}">`;
  }

  function setupInlineDocument() {
    const mount = document.querySelector(schema.mount);
    if (!mount) return;
    const panel = document.createElement('section');
    panel.className = 'ugn-inline-panel';
    panel.innerHTML = `<div class="ugn-inline-head"><div><small>${escapeHTML(schema.code)} · SHARED RECORD</small><b>${escapeHTML(schema.title)}</b></div><span class="ugn-save-state" data-inline-state>불러오는 중…</span></div><div class="ugn-inline-grid">${schema.fields.map((field) => `<label class="ugn-inline-field ${field.full ? 'full' : ''}">${escapeHTML(field.label)}${fieldControl(field)}</label>`).join('')}</div><div class="ugn-inline-actions"><span>이 문서 안에서 작성한 내용은 모든 플레이어에게 공유돼.</span><button type="button" class="ugn-save-button">기록 저장</button></div>`;
    mount.before(panel); statusLabel = panel.querySelector('[data-inline-state]'); saveButton = panel.querySelector('.ugn-save-button');
    saveButton.addEventListener('click', () => persist()); panel.querySelectorAll('[data-entry-field]').forEach((input) => input.addEventListener('input', scheduleSave));
    for (const signature of schema.signatures) {
      const slot = document.querySelector(signature.target); if (!slot) continue;
      slot.classList.add('ugn-signature-slot');
      const control = document.createElement(signature.asset ? 'button' : 'input');
      if (signature.asset) {
        control.type = 'button'; control.className = 'ugn-signature-control'; control.dataset.entrySignature = signature.id; control.innerHTML = signatureHTML(false);
        control.addEventListener('click', () => toggleSignature(signature.id, control));
      } else {
        control.type = 'text'; control.className = 'ugn-signature-input ugn-signature-control'; control.dataset.entrySignature = signature.id; control.placeholder = `${signature.label} 성명 입력`; control.maxLength = 80;
        control.addEventListener('input', scheduleSave);
      }
      slot.append(control);
    }
  }

  function collectEntry() {
    const content = { ...(currentEntry.content || {}) }; const signatures = { ...(currentEntry.signatures || {}) };
    document.querySelectorAll('[data-entry-field]').forEach((input) => { content[input.dataset.entryField] = input.value.trim(); });
    document.querySelectorAll('input[data-entry-signature]').forEach((input) => { signatures[input.dataset.entrySignature] = input.value.trim(); });
    if (schema.mode === 'hq') {
      content.decision = document.querySelector('.choices .choice.selected')?.dataset.entryDecision || '';
      content.attachments = JSON.stringify([...document.querySelectorAll('[data-entry-attachment].selected')].map((item) => item.dataset.entryAttachment));
      if (!content.responseAt && (content.decision || signatures.branchDirector)) content.responseAt = new Date().toISOString().slice(0, 16);
    }
    return { id: documentId, content, signatures };
  }

  function applyEntry(entry = {}) {
    currentEntry = { id: documentId, content: { ...(entry.content || {}) }, signatures: { ...(entry.signatures || {}) }, updatedAt: entry.updatedAt };
    document.querySelectorAll('[data-entry-field]').forEach((input) => { input.value = currentEntry.content[input.dataset.entryField] || ''; });
    document.querySelectorAll('input[data-entry-signature]').forEach((input) => { input.value = currentEntry.signatures[input.dataset.entrySignature] || ''; });
    document.querySelectorAll('button[data-entry-signature]').forEach((button) => { const signed = currentEntry.signatures[button.dataset.entrySignature] === SIGNATURE.name; button.classList.toggle('signed', signed); button.innerHTML = signatureHTML(signed); });
    if (schema.mode === 'hq') {
      const attachments = new Set(parseList(currentEntry.content.attachments));
      document.querySelectorAll('[data-entry-attachment]').forEach((item) => { const selected = attachments.has(item.dataset.entryAttachment); item.classList.toggle('selected', selected); item.setAttribute('aria-checked', String(selected)); });
      document.querySelectorAll('[data-entry-decision]').forEach((item) => { const selected = item.dataset.entryDecision === currentEntry.content.decision; item.classList.toggle('selected', selected); item.setAttribute('aria-checked', String(selected)); });
    }
    setStatus(savedStatus(entry));
  }

  async function loadEntry() {
    try {
      const state = await getSharedState();
      if (!state.documents.some(doc => doc.id === documentId)) throw new Error('문서 접근 권한이 없습니다.');
      canEdit = state.role === 'director'; loadedRevision = state.revision;
      applyEntry(state.archiveEntries?.[documentId] || {});
      document.querySelectorAll('input,textarea,select,button').forEach(el => { el.disabled = !canEdit; });
      if (!canEdit) setStatus('읽기 전용 · 작성은 지부장 권한이 필요합니다.');
    } catch {
      canEdit = false; clearTimeout(saveTimer);
      document.body.replaceChildren(Object.assign(document.createElement('p'), {textContent:'인증 상태 또는 문서 접근 권한을 확인할 수 없습니다. 창을 닫고 다시 접속하세요.'}));
    }
  }

  if (schema.mode === 'hq') setupHq(); else setupInlineDocument();
  document.querySelectorAll('input,textarea,select,button').forEach(el => { el.disabled = true; });
  loadEntry();
}
