import test from "node:test";
import assert from "node:assert/strict";
import { freshState } from "../netlify/lib/default-state.mjs";
import { actionRole, applyAction } from "../netlify/lib/state-core.mjs";

test("player checklist action updates the active phase", () => {
  const state = freshState();
  const before = state.revision;
  applyAction(state, "toggle-checklist", { id: "assignment", done: true });
  assert.equal(state.checklist[1].find((item) => item.id === "assignment").done, true);
  assert.equal(state.revision, before + 1);
});

test("submitting a signed operation order completes linked checklist items", () => {
  const state = freshState();
  applyAction(state, "submit-form", { form: { id: "form-1", template: "operation-order", title: "빈방", content: { caseName: "빈방" }, signature: "최영호" } });
  assert.equal(state.forms[0].status, "SUBMITTED");
  assert.equal(state.checklist[1].find((item) => item.id === "assignment").done, true);
  assert.equal(state.checklist[1].find((item) => item.id === "operation-order").done, true);
});

test("submitted forms are locked until control returns them", () => {
  const state = freshState();
  const form = { id: "form-2", template: "hq-report", title: "보고", content: {}, signature: "최영호" };
  applyAction(state, "submit-form", { form });
  assert.throws(() => applyAction(state, "save-form", { form }), /수정할 수 없습니다/);
  applyAction(state, "return-form", { id: "form-2", comment: "보완 필요" }, "gm");
  assert.equal(state.forms[0].status, "RETURNED");
  assert.equal(state.notices[0].title, "전자서류 반려");
  assert.match(state.notices[0].body, /보고.*보완 필요/);
  assert.equal(state.notices[0].priority, true);
  assert.equal(state.notices[0].target, "workflow");
  assert.equal(state.notices[0].formId, "form-2");
});

test("players can delete drafts and returned forms only", () => {
  const state = freshState();
  const draft = { id: "draft-1", template: "hq-report", title: "초안", content: {}, signature: "" };
  applyAction(state, "save-form", { form: draft });
  applyAction(state, "delete-form", { id: "draft-1" });
  assert.equal(state.forms.length, 0);

  const submitted = { ...draft, id: "submitted-1", title: "제출본", signature: "최영호" };
  applyAction(state, "submit-form", { form: submitted });
  assert.throws(() => applyAction(state, "delete-form", { id: "submitted-1" }), /관제실에서만 삭제/);
});

test("control can delete a form in any status", () => {
  const state = freshState();
  applyAction(state, "submit-form", { form: { id: "submitted-2", template: "hq-report", title: "삭제 대상", content: {}, signature: "최영호" } });
  applyAction(state, "delete-form-control", { id: "submitted-2" }, "gm");
  assert.equal(state.forms.length, 0);
  assert.equal(state.activity[0].action, "FORM_DELETED_CONTROL");
});

test("control-only actions require GM role", () => {
  assert.equal(actionRole("set-phase"), "gm");
  assert.equal(actionRole("delete-form-control"), "gm");
  assert.equal(actionRole("delete-notice"), "gm");
  assert.equal(actionRole("update-evidence"), "gm");
  assert.equal(actionRole("delete-evidence"), "gm");
  assert.equal(actionRole("delete-form"), "director");
  assert.equal(actionRole("add-evidence"), "gm");
  assert.equal(actionRole("save-form"), "director");
});

test("control can delete a broadcast notice", () => {
  const state = freshState();
  applyAction(state, "add-notice", { title: "삭제 대상", body: "테스트 알림", priority: true });
  const noticeId = state.notices[0].id;
  applyAction(state, "delete-notice", { id: noticeId });
  assert.equal(state.notices.some((notice) => notice.id === noticeId), false);
  assert.equal(state.activity[0].action, "NOTICE_DELETED");
});

test("broadcast notices keep a safe click destination", () => {
  const state = freshState();
  applyAction(state, "add-notice", { title: "현장 사진", body: "새 증거를 확인", target: "evidence" });
  assert.equal(state.notices[0].target, "evidence");
  applyAction(state, "add-notice", { title: "잘못된 경로", body: "기본 화면으로 이동", target: "external-url" });
  assert.equal(state.notices[0].target, "command");
});

test("signed archive documents can be saved as shared player records", () => {
  const state = freshState();
  applyAction(state, "save-archive-document", { entry: { id: "medical-isea", content: { condition: "의무 관찰", observations: "침식률 안정" }, signatures: { medicalOfficer: "김의무" } } });
  assert.equal(state.archiveEntries["medical-isea"].content.condition, "의무 관찰");
  assert.equal(state.archiveEntries["medical-isea"].signatures.medicalOfficer, "김의무");
  assert.ok(state.archiveEntries["medical-isea"].updatedAt);
});

test("in-document checklist choices and director signature are preserved", () => {
  const state = freshState();
  const attachments = JSON.stringify(["initialReport", "peopleRegister", "p07Consent"]);
  applyAction(state, "save-archive-document", { entry: {
    id: "hq-urgent",
    content: { decision: "지부 보호 지속", opinion: "지부에서 보호한다.", attachments },
    signatures: { branchDirector: "최영호" }
  } });
  assert.equal(state.archiveEntries["hq-urgent"].content.decision, "지부 보호 지속");
  assert.equal(state.archiveEntries["hq-urgent"].content.attachments, attachments);
  assert.equal(state.archiveEntries["hq-urgent"].signatures.branchDirector, "최영호");
});

test("non-editable archive documents reject player edits", () => {
  const state = freshState();
  assert.throws(() => applyAction(state, "save-archive-document", { entry: { id: "city-history", content: {}, signatures: {} } }), /작성할 수 없는/);
});

test("control can register visual evidence metadata", () => {
  const state = freshState();
  applyAction(state, "add-evidence", { evidence: { id: "photo-1", title: "루미나스 병동 4층", category: "현장사진", caseCode: "TCB-2043-017", location: "루미나스 종합병원", contentType: "image/jpeg", fileName: "ward.jpg" } });
  assert.equal(state.evidence.length, 1);
  assert.equal(state.evidence[0].caseCode, "TCB-2043-017");
});

test("control can update and delete visual evidence metadata", () => {
  const state = freshState();
  applyAction(state, "add-evidence", { evidence: { id: "photo-2", title: "수정 전", category: "현장사진", fileName: "before.jpg", contentType: "image/jpeg", createdAt: "2043-01-01T00:00:00.000Z" } });
  applyAction(state, "update-evidence", { evidence: { id: "photo-2", title: "수정 후", category: "증거물", location: "태양시 구도심", fileName: "after.webp", contentType: "image/webp" } });
  assert.equal(state.evidence[0].title, "수정 후");
  assert.equal(state.evidence[0].location, "태양시 구도심");
  assert.equal(state.evidence[0].createdAt, "2043-01-01T00:00:00.000Z");
  assert.ok(state.evidence[0].updatedAt);
  applyAction(state, "delete-evidence", { id: "photo-2" });
  assert.equal(state.evidence.length, 0);
  assert.equal(state.activity[0].action, "EVIDENCE_DELETED");
});
