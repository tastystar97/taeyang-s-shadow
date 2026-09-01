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
  assert.equal(actionRole("save-form"), "player");
});
