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
  applyAction(state, "return-form", { id: "form-2", comment: "보완 필요" });
  assert.equal(state.forms[0].status, "RETURNED");
});

test("control-only actions require GM role", () => {
  assert.equal(actionRole("set-phase"), "gm");
  assert.equal(actionRole("add-evidence"), "gm");
  assert.equal(actionRole("save-form"), "player");
});

test("signed archive documents can be saved as shared player records", () => {
  const state = freshState();
  applyAction(state, "save-archive-document", { entry: { id: "medical-isea", content: { condition: "의무 관찰", observations: "침식률 안정" }, signatures: { medicalOfficer: "김의무" } } });
  assert.equal(state.archiveEntries["medical-isea"].content.condition, "의무 관찰");
  assert.equal(state.archiveEntries["medical-isea"].signatures.medicalOfficer, "김의무");
  assert.ok(state.archiveEntries["medical-isea"].updatedAt);
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
