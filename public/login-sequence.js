const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function playLoginSequence(role = 'player') {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const control = role === 'gm';
  const overlay = document.createElement('div');
  overlay.className = `login-sequence${control ? ' control' : ''}`;
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML = `
    <div class="login-grid" aria-hidden="true"></div>
    <div class="login-sweep" aria-hidden="true"></div>
    <section class="login-terminal">
      <div class="login-emblem"><span>UGN</span><i></i></div>
      <p class="login-network">UNIVERSAL GUARDIANS NETWORK</p>
      <h1>${control ? 'RESTRICTED CONTROL CHANNEL' : 'TAEYANG CITY BRANCH'}</h1>
      <div class="login-readout">
        <p><span>01</span><b>CREDENTIAL HASH</b><em>VERIFIED</em></p>
        <p><span>02</span><b>CLEARANCE</b><em>${control ? 'CONTROL AUTHORIZED' : 'BRANCH INTERNAL'}</em></p>
        <p><span>03</span><b>SECURE LINK</b><em>ESTABLISHED</em></p>
      </div>
      <div class="login-progress"><i></i></div>
      <strong class="login-granted">ACCESS GRANTED</strong>
      <small>TERMINAL TCB-${control ? 'CONTROL' : 'COMMON'} · SESSION ENCRYPTED</small>
    </section>`;
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));
  await wait(reducedMotion ? 260 : 2050);
  overlay.classList.add('complete');
  await wait(reducedMotion ? 120 : 430);
  overlay.remove();
}
