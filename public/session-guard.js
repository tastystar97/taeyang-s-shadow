
// Revalidate already opened archive tabs when a shared cookie changes.
let sessionRole;
let checking = false;
async function check() {
  if (checking) return;
  checking = true;
  try {
    const response = await fetch('/api/state', {cache:'no-store'});
    if (!response.ok) throw new Error('세션 만료');
    const {state} = await response.json();
    const id = new URL(location.href).searchParams.get('id');
    const allowed = state.documents.some(doc => id ? doc.id === id : doc.url === location.pathname);
    if (!allowed) throw new Error('권한 없음');
    if (sessionRole && sessionRole !== state.role) { location.reload(); return; }
    sessionRole = state.role;
  } catch {
    document.body.replaceChildren(Object.assign(document.createElement('p'), {textContent:'접속 상태가 변경되었습니다. 이 창을 닫고 단말에 다시 접속하세요.'}));
  } finally { checking = false; }
}
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('tcb-auth') : null;
if (channel) channel.onmessage = () => { document.body.replaceChildren(); location.reload(); };
window.addEventListener('pageshow', check);
window.addEventListener('focus', check);
setInterval(check, 15000);
check();
