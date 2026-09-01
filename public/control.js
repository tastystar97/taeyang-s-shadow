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
  try { const result = await api('/api/state', { method: 'PATCH', body: JSON.stringify({ action, payload, revision: app.state.revision }) }); app.state = result.state; render(); }
  catch (error) { if (error.status === 409) { await load(); toast('최신 상태를 다시 불러왔습니다.'); } else toast(error.message); }
}

function render() {
  const state = app.state;
  $$('[data-phase]').forEach((button) => button.classList.toggle('active', Number(button.dataset.phase) === state.operation.phase));
  for (const [key, value] of Object.entries(state.stats)) { const field = $(`#stats-form [name="${key}"]`); if (field) field.value = value; }
  const pending = state.forms.filter((form) => form.status === 'SUBMITTED'); $('#pending-count').textContent = `${pending.length} PENDING`; $('#approval-empty').hidden = pending.length > 0;
  $('#approval-list').innerHTML = pending.map((form) => `<article class="approval-card"><span>${escapeHTML(form.template.toUpperCase())}</span><div><h3>${escapeHTML(form.title)}</h3><small>서명 ${escapeHTML(form.signature)} · ${formatDate(form.updatedAt)}</small></div><div class="approval-actions"><button class="secondary-button" data-approve="${form.id}">승인</button><button class="danger-button" data-return="${form.id}">반려</button></div></article>`).join('');
  $('#control-log').innerHTML = state.activity.slice(0, 8).map((entry) => `<li><time>${formatDate(entry.at)}</time><b>${escapeHTML(entry.action)}</b><span>${escapeHTML(entry.detail)}</span></li>`).join('') || '<li><span>아직 기록된 관제 활동이 없습니다.</span></li>';
}

function formatDate(value) { return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }

async function boot() {
  try { const session = await api('/api/auth'); if (session.authenticated && session.role === 'gm') { $('#control-gate').hidden = true; await load(); } }
  catch { /* 로그인 화면 유지 */ }
}

$('#control-login').addEventListener('submit', async (event) => { event.preventDefault(); $('#control-error').textContent = ''; try { await api('/api/auth', { method: 'POST', body: JSON.stringify({ role: 'gm', code: $('#control-code').value }) }); $('#control-gate').hidden = true; await load(); } catch (error) { $('#control-error').textContent = error.message; } });
$('#control-phase').addEventListener('click', (event) => { const button = event.target.closest('[data-phase]'); if (button) mutate('set-phase', { phase: Number(button.dataset.phase) }); });
$('#stats-form').addEventListener('submit', (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); mutate('update-stats', data).then(() => toast('지부 상태가 반영되었습니다.')); });
$('#notice-form').addEventListener('submit', (event) => { event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form)); data.priority = form.elements.priority.checked; mutate('add-notice', data).then(() => { form.reset(); toast('공용 단말에 알림을 송신했습니다.'); }); });
$('#approval-list').addEventListener('click', (event) => { const approve = event.target.closest('[data-approve]'); const returned = event.target.closest('[data-return]'); if (approve) mutate('approve-form', { id: approve.dataset.approve, comment: '' }).then(() => toast('서류를 승인했습니다.')); if (returned) { const comment = prompt('반려 사유를 입력하세요.') || ''; mutate('return-form', { id: returned.dataset.return, comment }).then(() => toast('서류를 반려했습니다.')); } });
boot(); setInterval(() => { if (app.state && document.visibilityState === 'visible') load().catch(() => {}); }, 15_000);
