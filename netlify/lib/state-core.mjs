const TEMPLATE_CHECKLIST = {
  "operation-order": ["assignment", "operation-order"],
  "hq-report": ["hq-report"],
  "protection-record": ["protected-review"],
  "settlement-report": ["result-record", "condition-update", "payroll", "maintenance", "indicators"]
};

const PLAYER_ACTIONS = new Set(["toggle-checklist", "save-form", "submit-form", "mark-document-read"]);
const GM_ACTIONS = new Set(["approve-form", "return-form", "set-phase", "add-notice", "update-stats", "reset-state"]);

function text(value, max = 8000) {
  return String(value ?? "").trim().slice(0, max);
}

function sanitizeForm(input) {
  if (!input || typeof input !== "object" || !TEMPLATE_CHECKLIST[input.template]) throw new Error("지원하지 않는 서식입니다.");
  const content = {};
  for (const [key, value] of Object.entries(input.content || {})) content[text(key, 60)] = text(value);
  return { id: text(input.id, 80), template: input.template, title: text(input.title, 160), content, signature: text(input.signature, 40), status: text(input.status, 20) || "DRAFT" };
}

function activity(state, action, detail) {
  state.activity.unshift({ id: crypto.randomUUID(), action, detail: text(detail, 240), at: new Date().toISOString() });
  state.activity = state.activity.slice(0, 60);
}

function completeChecklist(state, template) {
  const items = state.checklist[state.operation.phase] || [];
  for (const id of TEMPLATE_CHECKLIST[template] || []) {
    const item = items.find((entry) => entry.id === id);
    if (item) item.done = true;
  }
}

export function actionRole(action) {
  if (PLAYER_ACTIONS.has(action)) return "player";
  if (GM_ACTIONS.has(action)) return "gm";
  return null;
}

export function applyAction(state, action, payload = {}) {
  if (!actionRole(action)) throw new Error("허용되지 않은 작업입니다.");
  if (action === "toggle-checklist") {
    const item = (state.checklist[state.operation.phase] || []).find((entry) => entry.id === text(payload.id, 80));
    if (!item) throw new Error("체크 항목을 찾을 수 없습니다.");
    item.done = Boolean(payload.done);
  }
  if (action === "save-form" || action === "submit-form") {
    const form = sanitizeForm(payload.form);
    if (!form.id) throw new Error("서류 식별자가 없습니다.");
    if (action === "submit-form" && !form.signature) throw new Error("전자서명이 필요합니다.");
    const existing = state.forms.find((entry) => entry.id === form.id);
    if (existing && !["DRAFT", "RETURNED"].includes(existing.status)) throw new Error("제출된 서류는 수정할 수 없습니다.");
    const now = new Date().toISOString();
    const next = { ...form, status: action === "submit-form" ? "SUBMITTED" : (existing?.status === "RETURNED" ? "RETURNED" : "DRAFT"), createdAt: existing?.createdAt || now, updatedAt: now, comment: existing?.comment || "" };
    if (existing) Object.assign(existing, next); else state.forms.unshift(next);
    if (action === "submit-form") { completeChecklist(state, form.template); activity(state, "FORM_SUBMITTED", form.title); }
  }
  if (action === "mark-document-read") {
    const document = state.documents.find((entry) => entry.id === text(payload.id, 80));
    if (document?.status === "NEW") document.status = "RELEASED";
  }
  if (action === "approve-form" || action === "return-form") {
    const form = state.forms.find((entry) => entry.id === text(payload.id, 80));
    if (!form || form.status !== "SUBMITTED") throw new Error("승인 대기 중인 서류가 아닙니다.");
    form.status = action === "approve-form" ? "APPROVED" : "RETURNED";
    form.comment = text(payload.comment, 600);
    form.updatedAt = new Date().toISOString();
    activity(state, action === "approve-form" ? "FORM_APPROVED" : "FORM_RETURNED", form.title);
  }
  if (action === "set-phase") {
    const phase = Number(payload.phase);
    if (![1, 2, 3].includes(phase)) throw new Error("올바르지 않은 페이즈입니다.");
    state.operation.phase = phase;
    activity(state, "PHASE_CHANGED", `PHASE ${phase}`);
  }
  if (action === "add-notice") {
    const title = text(payload.title, 100); const body = text(payload.body, 240);
    if (!title || !body) throw new Error("알림 제목과 내용이 필요합니다.");
    state.notices.unshift({ id: crypto.randomUUID(), time: new Date().toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }), title, body, priority: Boolean(payload.priority) });
    state.notices = state.notices.slice(0, 20);
    activity(state, "NOTICE_SENT", title);
  }
  if (action === "update-stats") {
    for (const key of ["morale", "alert", "intel"]) if (payload[key] !== undefined) state.stats[key] = Math.max(0, Math.min(10, Number(payload[key]) || 0));
    if (payload.funds !== undefined) state.stats.funds = Math.max(0, Number(payload.funds) || 0);
    if (payload.trust !== undefined) state.stats.trust = text(payload.trust, 20);
    activity(state, "STATUS_UPDATED", "지부 지표 갱신");
  }
  state.revision = Number(state.revision || 0) + 1;
  return state;
}
