import { playLoginSequence } from '/login-sequence.js';

const app = { state: null };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.error || '요청 실패'); error.status = response.status; throw error; }
  return data;
}

function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2400); }
async function load() { const result = await api('/api/state'); app.state = result.state; render(); }

async function mutate(action, payload = {}) {
  try { const result = await api('/api/state', { method: 'PATCH', body: JSON.stringify({ action, payload, revision: app.state.revision }) }); app.state = result.state; render(); return true; }
  catch (error) { if (error.status === 409) { await load(); toast('최신 상태를 다시 불러왔습니다.'); } else toast(error.message); return false; }
}

async function uploadEvidence(form) {
  const editing = Boolean(form.elements.id.value); const method = editing ? 'PATCH' : 'POST'; const button = form.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = editing ? '수정 저장 중…' : '등록 중…';
  const formData = new FormData(form); formData.set('revision', app.state.revision);
  try {
    let response = await fetch('/api/evidence', { method, body: formData }); let data = await response.json().catch(() => ({}));
    if (response.status === 409 && data.state) { app.state = data.state; formData.set('revision', app.state.revision); response = await fetch('/api/evidence', { method, body: formData }); data = await response.json().catch(() => ({})); }
    if (!response.ok) throw new Error(data.error || (editing ? '증거 사진을 수정하지 못했습니다.' : '증거 사진을 등록하지 못했습니다.'));
    app.state = data.state; render(); resetEvidenceForm(form); toast(editing ? '증거물 정보가 수정되었습니다.' : '증거 사진이 플레이어 보관소에 등록되었습니다.');
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; button.textContent = form.elements.id.value ? '증거물 수정 저장' : '증거 사진 등록'; }
}

function resetEvidenceForm(form = $('#evidence-upload-form')) { form.reset(); form.elements.id.value = ''; form.elements.image.required = true; form.querySelector('button[type="submit"]').textContent = '증거 사진 등록'; $('#evidence-file-help').textContent = 'JPG, PNG, WEBP, GIF · 최대 5MB'; $('#evidence-cancel-button').hidden = true; }

function editEvidence(id) {
  const evidence = (app.state.evidence || []).find((entry) => entry.id === id); if (!evidence) return;
  const form = $('#evidence-upload-form'); form.elements.id.value = evidence.id; form.elements.category.value = evidence.category || '현장사진'; form.elements.caseCode.value = evidence.caseCode || ''; form.elements.title.value = evidence.title || ''; form.elements.location.value = evidence.location || ''; form.elements.capturedAt.value = (evidence.capturedAt || '').slice(0, 16); form.elements.description.value = evidence.description || ''; form.elements.image.value = ''; form.elements.image.required = false; form.querySelector('button[type="submit"]').textContent = '증거물 수정 저장'; $('#evidence-file-help').textContent = `현재 파일: ${evidence.fileName || '원본 이미지'} · 새 사진을 선택하면 교체됩니다.`; $('#evidence-cancel-button').hidden = false; form.scrollIntoView({ behavior: 'smooth', block: 'start' }); form.elements.title.focus({ preventScroll: true });
}

async function deleteEvidence(id) {
  try {
    const request = () => fetch('/api/evidence', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, revision: app.state.revision }) });
    let response = await request(); let data = await response.json().catch(() => ({}));
    if (response.status === 409 && data.state) { app.state = data.state; render(); response = await request(); data = await response.json().catch(() => ({})); }
    if (!response.ok) throw new Error(data.error || '증거 사진을 삭제하지 못했습니다.');
    app.state = data.state; if ($('#evidence-upload-form').elements.id.value === id) resetEvidenceForm(); render(); toast('증거물을 삭제했습니다.');
  } catch (error) { toast(error.message); }
}

function render() {
  const state = app.state;
  $$('[data-phase]').forEach((button) => button.classList.toggle('active', Number(button.dataset.phase) === state.operation.phase));
  const notices = state.notices || []; $('#notice-count').textContent = `${notices.length} ACTIVE`; $('#control-notice-empty').hidden = notices.length > 0;
  $('#control-notice-list').innerHTML = notices.map((notice) => `<article class="control-notice-card"><time>${escapeHTML(notice.time || '--:--')}</time><div><span>${notice.priority ? 'PRIORITY' : 'SIGNAL'}</span><h3>${escapeHTML(notice.title)}</h3><p>${escapeHTML(notice.body)}</p></div><button class="danger-button" type="button" data-delete-notice="${escapeHTML(notice.id)}" aria-label="${escapeHTML(notice.title)} 알림 삭제">삭제</button></article>`).join('');
  const evidence = state.evidence || []; $('#evidence-register-count').textContent = `${evidence.length} REGISTERED`; $('#control-evidence-empty').hidden = evidence.length > 0;
  $('#control-evidence-list').innerHTML = evidence.map((item) => { const version = item.updatedAt || item.createdAt || ''; const source = `/api/evidence?id=${encodeURIComponent(item.id)}&v=${encodeURIComponent(version)}`; return `<article class="control-evidence-card"><img src="${source}" alt="${escapeHTML(item.title)}" loading="lazy"><div><span>${escapeHTML(item.category || '현장사진')} · ${escapeHTML(item.caseCode || 'NO CASE')}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.location || '촬영지 미기록')} · ${escapeHTML(item.fileName || '원본 이미지')}</p></div><div class="approval-actions"><button class="secondary-button" type="button" data-edit-evidence="${escapeHTML(item.id)}">수정</button><button class="danger-button" type="button" data-delete-evidence="${escapeHTML(item.id)}">삭제</button></div></article>`; }).join('');
  const pending = state.forms.filter((form) => form.status === 'SUBMITTED'); $('#pending-count').textContent = `${pending.length} PENDING`; $('#approval-empty').hidden = pending.length > 0;
  $('#approval-list').innerHTML = pending.map((form) => `<article class="approval-card"><span>${escapeHTML(form.template.toUpperCase())}</span><div><h3>${escapeHTML(form.title)}</h3><small>서명 ${escapeHTML(form.signature)} · ${formatDate(form.updatedAt)}</small></div><div class="approval-actions"><button class="secondary-button" data-approve="${form.id}">승인</button><button class="danger-button" data-return="${form.id}">반려</button></div></article>`).join('');
  const forms = [...state.forms].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); $('#document-count').textContent = `${forms.length} RECORDS`; $('#control-document-empty').hidden = forms.length > 0;
  $('#control-document-list').innerHTML = forms.map((form) => `<article class="approval-card"><span>${escapeHTML(form.status)}</span><div><h3>${escapeHTML(form.title)}</h3><small>${escapeHTML(form.template.toUpperCase())} · ${formatDate(form.updatedAt)}${form.comment ? ` · 반려: ${escapeHTML(form.comment)}` : ''}</small></div><div class="approval-actions"><button class="danger-button" data-delete-control="${form.id}">삭제</button></div></article>`).join('');
  $('#control-log').innerHTML = state.activity.slice(0, 8).map((entry) => `<li><time>${formatDate(entry.at)}</time><b>${escapeHTML(entry.action)}</b><span>${escapeHTML(entry.detail)}</span></li>`).join('') || '<li><span>아직 기록된 관제 활동이 없습니다.</span></li>';
}

function formatDate(value) { return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }

async function boot() {
  try { const session = await api('/api/auth'); if (session.authenticated && session.role === 'gm') { $('#control-gate').hidden = true; await Promise.all([load(), playLoginSequence('gm')]); } }
  catch { /* 로그인 화면 유지 */ }
}

$('#control-login').addEventListener('submit', async (event) => { event.preventDefault(); $('#control-error').textContent = ''; const code = $('#control-code').value.trim(); try { await api('/api/auth', { method: 'POST', body: JSON.stringify({ role: 'gm', code }) }); $('#control-code').value = ''; $('#control-gate').hidden = true; await Promise.all([load(), playLoginSequence('gm')]); } catch (error) { $('#control-error').textContent = error.message; $('#control-code').select(); } });
$('#control-phase').addEventListener('click', (event) => { const button = event.target.closest('[data-phase]'); if (button) mutate('set-phase', { phase: Number(button.dataset.phase) }); });
$('#notice-form').addEventListener('submit', (event) => { event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form)); data.priority = form.elements.priority.checked; mutate('add-notice', data).then((saved) => { if (saved) { form.reset(); toast('공용 단말에 알림을 송신했습니다.'); } }); });
$('#control-notice-list').addEventListener('click', (event) => { const button = event.target.closest('[data-delete-notice]'); if (button && confirm('이 알림을 공용 단말에서 삭제할까?')) mutate('delete-notice', { id: button.dataset.deleteNotice }).then((saved) => { if (saved) toast('알림을 삭제했습니다.'); }); });
$('#evidence-upload-form').addEventListener('submit', (event) => { event.preventDefault(); uploadEvidence(event.currentTarget); });
$('#evidence-cancel-button').addEventListener('click', () => resetEvidenceForm());
$('#control-evidence-list').addEventListener('click', (event) => { const edit = event.target.closest('[data-edit-evidence]'); const remove = event.target.closest('[data-delete-evidence]'); if (edit) editEvidence(edit.dataset.editEvidence); if (remove && confirm('이 증거물과 원본 사진을 영구 삭제할까?')) deleteEvidence(remove.dataset.deleteEvidence); });
$('#approval-list').addEventListener('click', (event) => { const approve = event.target.closest('[data-approve]'); const returned = event.target.closest('[data-return]'); if (approve) mutate('approve-form', { id: approve.dataset.approve, comment: '' }).then((saved) => { if (saved) toast('서류를 승인했습니다.'); }); if (returned) { const comment = prompt('반려 사유를 입력하세요.') || ''; mutate('return-form', { id: returned.dataset.return, comment }).then((saved) => { if (saved) toast('서류를 반려하고 플레이어에게 알림을 보냈습니다.'); }); } });
$('#control-document-list').addEventListener('click', (event) => { const button = event.target.closest('[data-delete-control]'); if (button && confirm('이 전자서류를 영구 삭제할까?')) mutate('delete-form-control', { id: button.dataset.deleteControl }).then((saved) => { if (saved) toast('전자서류를 삭제했습니다.'); }); });
boot(); setInterval(() => { if (app.state && document.visibilityState === 'visible') load().catch(() => {}); }, 15_000);
