const TEMPLATE_CHECKLIST = {
  "operation-order": ["assignment", "operation-order"],
  "hq-report": ["hq-report"],
  "protection-record": ["protected-review"],
  "settlement-report": ["result-record", "condition-update", "payroll", "maintenance"],
  "field-report": []
};

const EDITABLE_ARCHIVE_DOCUMENTS = new Set(["hq-urgent", "medical-isea", "sera-profile", "suhwan-card", "handover"]);
const PLAYER_ACTIONS = new Set(["toggle-checklist", "save-form", "submit-form", "delete-form", "mark-document-read", "save-archive-document"]);
const FIELD_REPORT_ACTIONS = new Set(["save-field-report", "submit-field-report", "delete-field-report"]);
const DIRECTOR_REVIEW_ACTIONS = new Set(["approve-field-report", "return-field-report"]);
const GM_ACTIONS = new Set(["approve-form", "return-form", "delete-form-control", "set-phase", "add-notice", "delete-notice", "add-evidence", "update-evidence", "delete-evidence", "reset-state"]);
const NOTICE_TARGETS = new Set(["command", "workflow", "archive", "evidence", "personnel", "city", "cases"]);

function text(value, max = 8000) {
  return String(value ?? "").trim().slice(0, max);
}

function sanitizeForm(input) {
  if (!input || typeof input !== "object" || !TEMPLATE_CHECKLIST[input.template]) throw new Error("지원하지 않는 서식입니다.");
  const content = {};
  for (const [key, value] of Object.entries(input.content || {})) content[text(key, 60)] = text(value);
  return { id: text(input.id, 80), template: input.template, title: text(input.title, 160), content, signature: text(input.signature, 40), status: text(input.status, 20) || "DRAFT" };
}

function sanitizeArchiveEntry(input) {
  const id = text(input?.id, 80);
  if (!EDITABLE_ARCHIVE_DOCUMENTS.has(id)) throw new Error("작성할 수 없는 보관 문서입니다.");
  const content = {};
  const signatures = {};
  for (const [key, value] of Object.entries(input?.content || {})) content[text(key, 60)] = text(value, 4000);
  for (const [key, value] of Object.entries(input?.signatures || {})) signatures[text(key, 60)] = text(value, 80);
  return { id, content, signatures };
}

function sanitizeEvidence(input) {
  const id = text(input?.id, 80);
  const title = text(input?.title, 120);
  if (!id || !title) throw new Error("증거 사진의 식별자와 제목이 필요합니다.");
  return {
    id, title, category: text(input.category, 40) || "현장사진", caseCode: text(input.caseCode, 80),
    location: text(input.location, 160), capturedAt: text(input.capturedAt, 40), description: text(input.description, 1200),
    fileName: text(input.fileName, 180), contentType: text(input.contentType, 80), createdAt: text(input.createdAt, 40) || new Date().toISOString()
  };
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
  if (PLAYER_ACTIONS.has(action)) return "director";
  if (FIELD_REPORT_ACTIONS.has(action)) return "agent";
  if (DIRECTOR_REVIEW_ACTIONS.has(action)) return "director";
  if (GM_ACTIONS.has(action)) return "gm";
  return null;
}

export function applyAction(state, action, payload = {}, actorRole = "director") {
  if (!actionRole(action)) throw new Error("허용되지 않은 작업입니다.");
  if (action === "toggle-checklist") {
    const item = (state.checklist[state.operation.phase] || []).find((entry) => entry.id === text(payload.id, 80));
    if (!item) throw new Error("체크 항목을 찾을 수 없습니다.");
    item.done = Boolean(payload.done);
  }
  if (["save-form", "submit-form", "save-field-report", "submit-field-report"].includes(action)) {
    const fieldReport = action.endsWith("field-report");
    if ((fieldReport && actorRole !== "agent") || (!fieldReport && actorRole !== "director")) throw new Error("이 역할은 해당 서류를 작성할 수 없습니다.");
    const form = sanitizeForm(payload.form);
    if (!form.id) throw new Error("서류 식별자가 없습니다.");
    if (fieldReport !== (form.template === "field-report")) throw new Error("역할에 맞지 않는 서식입니다.");
    if (!fieldReport && action === "submit-form" && !form.signature) throw new Error("전자서명이 필요합니다.");
    if (fieldReport && action === "submit-field-report") {
      for (const id of ["reportTitle", "reporter", "location", "observedAt", "details"]) if (!form.content[id]) throw new Error("현장 보고 필수 항목을 모두 입력하세요.");
      form.signature = form.content.reporter;
    }
    const existing = state.forms.find((entry) => entry.id === form.id);
    const expectedKind = fieldReport ? "field-report" : "director-form";
    if (existing && existing.kind !== expectedKind) throw new Error("다른 종류의 서류는 덮어쓸 수 없습니다.");
    if (existing && !["DRAFT", "RETURNED"].includes(existing.status)) throw new Error("제출된 서류는 수정할 수 없습니다.");
    const now = new Date().toISOString();
    const submitted = action === "submit-form" || action === "submit-field-report";
    const version = fieldReport ? Number(existing?.version || 0) + (submitted ? 1 : 0) : undefined;
    const next = { ...form, audience: existing?.audience || [], kind: expectedKind, authorRole: fieldReport ? "agent" : "director", reviewerRole: fieldReport ? "director" : "gm", status: submitted ? "SUBMITTED" : (existing?.status === "RETURNED" ? "RETURNED" : "DRAFT"), createdAt: existing?.createdAt || now, updatedAt: now, comment: submitted ? "" : (existing?.comment || ""), ...(fieldReport ? { reporter: form.content.reporter || "", version } : {}) };
    if (fieldReport && submitted) { next.submittedAt = now; next.lastSubmitted = { title: form.title, content: structuredClone(form.content), signature: form.signature, submittedAt: now, version }; }
    if (existing) Object.assign(existing, next); else state.forms.unshift(next);
    if (submitted) {
      if (!fieldReport) completeChecklist(state, form.template);
      activity(state, fieldReport ? "FIELD_REPORT_SUBMITTED" : "FORM_SUBMITTED", form.title);
      if (fieldReport) { state.notices ||= []; state.notices.unshift({ id: crypto.randomUUID(), time: new Date().toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }), title: "현장 보고서 도착", body: `${form.title} · ${form.content.reporter}`.slice(0, 240), priority: true, target: "workflow", formId: form.id, audience: ["director"] }); state.notices = state.notices.slice(0, 20); }
    }
  }
  if (action === "delete-form" || action === "delete-field-report" || action === "delete-form-control") {
    const index = state.forms.findIndex((entry) => entry.id === text(payload.id, 80));
    if (index < 0) throw new Error("삭제할 서류를 찾을 수 없습니다.");
    const form = state.forms[index];
    if (action === "delete-form" && (actorRole !== "director" || form.kind !== "director-form")) throw new Error("이 서류를 삭제할 수 없습니다.");
    if (action === "delete-field-report" && (actorRole !== "agent" || form.kind !== "field-report")) throw new Error("이 보고서를 삭제할 수 없습니다.");
    if (action !== "delete-form-control" && !["DRAFT", "RETURNED"].includes(form.status)) throw new Error("제출 또는 승인된 서류는 관제실에서만 삭제할 수 있습니다.");
    state.forms.splice(index, 1);
    activity(state, action === "delete-form-control" ? "FORM_DELETED_CONTROL" : "FORM_DELETED", form.title);
  }
  if (action === "mark-document-read") {
    const document = state.documents.find((entry) => entry.id === text(payload.id, 80));
    if (document) { state.readReceipts ||= {}; state.readReceipts[actorRole] ||= {}; state.readReceipts[actorRole][document.id] = new Date().toISOString(); }
  }
  if (action === "save-archive-document") {
    const entry = sanitizeArchiveEntry(payload.entry);
    state.archiveEntries ||= {};
    state.archiveEntries[entry.id] = { ...entry, updatedAt: new Date().toISOString() };
    activity(state, "ARCHIVE_UPDATED", entry.id);
  }
  if (["approve-form", "return-form", "approve-field-report", "return-field-report"].includes(action)) {
    const fieldReport = action.endsWith("field-report");
    if ((fieldReport && actorRole !== "director") || (!fieldReport && actorRole !== "gm")) throw new Error("이 서류의 결재자가 아닙니다.");
    const form = state.forms.find((entry) => entry.id === text(payload.id, 80));
    if (!form || form.status !== "SUBMITTED" || (fieldReport ? form.kind !== "field-report" : form.kind !== "director-form")) throw new Error("승인 대기 중인 서류가 아닙니다.");
    if (fieldReport && Number(payload.version) !== Number(form.version)) throw new Error("제출 버전이 변경되었습니다. 최신 보고서를 다시 확인하세요.");
    const approved = action === "approve-form" || action === "approve-field-report";
    form.status = approved ? "APPROVED" : "RETURNED";
    form.comment = text(payload.comment, 600);
    form.updatedAt = new Date().toISOString();
    form.reviewedAt = form.updatedAt;
    activity(state, fieldReport ? (approved ? "FIELD_REPORT_APPROVED" : "FIELD_REPORT_RETURNED") : (approved ? "FORM_APPROVED" : "FORM_RETURNED"), form.title);
    if (!approved) {
      const reason = form.comment || "반려 사유가 입력되지 않았습니다.";
      state.notices ||= [];
      state.notices.unshift({
        id: crypto.randomUUID(),
        time: new Date().toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }),
        title: fieldReport ? "현장 보고서 반려" : "전자서류 반려",
        body: `${form.title} · ${reason}`.slice(0, 240),
        priority: true,
        target: "workflow",
        formId: form.id,
        audience: [fieldReport ? "agent" : "director"]
      });
      state.notices = state.notices.slice(0, 20);
    }
  }
  if (action === "set-phase") {
    const phase = Number(payload.phase);
    if (![1, 2, 3].includes(phase)) throw new Error("올바르지 않은 페이즈입니다.");
    state.operation.phase = phase;
    activity(state, "PHASE_CHANGED", `PHASE ${phase}`);
  }
  if (action === "add-notice") {
    const title = text(payload.title, 100); const body = text(payload.body, 240); const requestedTarget = text(payload.target, 40); const target = NOTICE_TARGETS.has(requestedTarget) ? requestedTarget : "command"; const targetId = text(payload.targetId, 100);
    if (!title || !body) throw new Error("알림 제목과 내용이 필요합니다.");
    state.notices.unshift({ id: crypto.randomUUID(), time: new Date().toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }), title, body, priority: Boolean(payload.priority), target, audience: ['director','agent'], ...(targetId ? { targetId } : {}) });
    state.notices = state.notices.slice(0, 20);
    activity(state, "NOTICE_SENT", title);
  }
  if (action === "delete-notice") {
    state.notices ||= [];
    const index = state.notices.findIndex((entry) => entry.id === text(payload.id, 80));
    if (index < 0) throw new Error("삭제할 알림을 찾을 수 없습니다.");
    const [notice] = state.notices.splice(index, 1);
    activity(state, "NOTICE_DELETED", notice.title);
  }
  if (action === "add-evidence") {
    const evidence = sanitizeEvidence(payload.evidence);
    state.evidence ||= [];
    if (state.evidence.some((entry) => entry.id === evidence.id)) throw new Error("이미 등록된 증거 사진입니다.");
    state.evidence.unshift({ ...evidence, audience: [] });
    state.evidence = state.evidence.slice(0, 200);
    activity(state, "EVIDENCE_ADDED", evidence.title);
  }
  if (action === "update-evidence") {
    const evidence = sanitizeEvidence(payload.evidence);
    state.evidence ||= [];
    const index = state.evidence.findIndex((entry) => entry.id === evidence.id);
    if (index < 0) throw new Error("수정할 증거 사진을 찾을 수 없습니다.");
    const existing = state.evidence[index];
    state.evidence[index] = { ...existing, ...evidence, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
    activity(state, "EVIDENCE_UPDATED", evidence.title);
  }
  if (action === "delete-evidence") {
    state.evidence ||= [];
    const index = state.evidence.findIndex((entry) => entry.id === text(payload.id, 80));
    if (index < 0) throw new Error("삭제할 증거 사진을 찾을 수 없습니다.");
    const [evidence] = state.evidence.splice(index, 1);
    activity(state, "EVIDENCE_DELETED", evidence.title);
  }
  state.revision = Number(state.revision || 0) + 1;
  return state;
}
