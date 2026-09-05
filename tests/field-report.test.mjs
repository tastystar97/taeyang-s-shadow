import test from 'node:test';
import assert from 'node:assert/strict';
import { actionRole, applyAction } from '../netlify/lib/state-core.mjs';
import { authorizeAction, normalizeState, projectState } from '../netlify/lib/permissions.mjs';
import { FORM_TEMPLATES, renderFormFieldsHTML } from '../public/form-templates.js';

function state() {
  return normalizeState({
    revision: 1,
    schemaVersion: 2,
    operation: { phase: 1, act: '', title: '' },
    checklist: { 1: [] },
    documents: [], personnel: [], evidence: [], cases: [], forms: [], notices: [], activity: [],
    files: {}, archiveEntries: {}
  });
}

function report(id = 'field-1', overrides = {}) {
  return {
    id,
    kind: 'field-report',
    template: 'field-report',
    title: '남부역 현장 보고',
    status: 'DRAFT',
    signature: '한도윤',
    content: {
      reportTitle: '남부역 현장 보고',
      reporter: '한도윤',
      location: '태양시 남부역',
      observedAt: '2043-09-06T21:30',
      details: '현장 봉쇄선과 잔류 반응을 확인함',
      caseReference: 'TCB-2043-017'
    },
    ...overrides
  };
}

test('field report template exposes the required report fields and datetime control', () => {
  const template = FORM_TEMPLATES['field-report'];
  assert.equal(template.authorRole, 'agent');
  assert.equal(template.reviewerRole, 'director');
  for (const id of ['reportTitle', 'reporter', 'location', 'observedAt', 'details']) {
    assert.equal(template.fields.find(field => field.id === id)?.required, true);
  }
  assert.match(renderFormFieldsHTML(template, { observedAt: '2043-09-06T21:30' }), /type="datetime-local"/);
});

test('agent submission, director return, resubmission and approval preserve submitted versions', () => {
  const shared = state();
  assert.equal(actionRole('submit-field-report'), 'agent');
  assert.equal(authorizeAction(shared, 'agent', 'submit-field-report', { form: report() }), true);
  assert.equal(authorizeAction(shared, 'director', 'submit-field-report', { form: report() }), false);
  assert.throws(() => applyAction(shared, 'submit-field-report', { form: report() }, 'director'), /역할/);

  applyAction(shared, 'submit-field-report', { form: report() }, 'agent');
  const submitted = shared.forms[0];
  assert.equal(submitted.kind, 'field-report');
  assert.equal(submitted.status, 'SUBMITTED');
  assert.equal(submitted.version, 1);
  assert.equal(submitted.signature, '한도윤');
  assert.equal(submitted.lastSubmitted.content.details, '현장 봉쇄선과 잔류 반응을 확인함');
  assert.deepEqual(shared.notices[0].audience, ['director']);
  assert.equal(projectState(shared, 'agent').forms.length, 1);
  assert.equal(projectState(shared, 'director').forms.length, 1);
  assert.equal(authorizeAction(shared, 'gm', 'approve-field-report', { id: submitted.id, version: 1 }), false);
  assert.equal(authorizeAction(shared, 'director', 'return-field-report', { id: submitted.id, version: 1 }), true);

  applyAction(shared, 'return-field-report', { id: submitted.id, version: 1, comment: '위험 구역 좌표 보완' }, 'director');
  assert.equal(submitted.status, 'RETURNED');
  assert.deepEqual(shared.notices[0].audience, ['agent']);

  const revised = report(submitted.id, { title: '남부역 현장 보고 · 보완', content: { ...report().content, reportTitle: '남부역 현장 보고 · 보완', details: '좌표 37.41, 127.11 추가' } });
  applyAction(shared, 'save-field-report', { form: revised }, 'agent');
  assert.equal(projectState(shared, 'agent').forms[0].content.details, '좌표 37.41, 127.11 추가');
  assert.equal(projectState(shared, 'director').forms[0].content.details, '현장 봉쇄선과 잔류 반응을 확인함');
  assert.equal(projectState(shared, 'director').forms[0].version, 1);

  applyAction(shared, 'submit-field-report', { form: revised }, 'agent');
  assert.equal(submitted.version, 2);
  assert.equal(authorizeAction(shared, 'director', 'approve-field-report', { id: submitted.id, version: 1 }), false);
  assert.throws(() => applyAction(shared, 'approve-field-report', { id: submitted.id, version: 1 }, 'director'), /제출 버전/);
  applyAction(shared, 'approve-field-report', { id: submitted.id, version: 2 }, 'director');
  assert.equal(submitted.status, 'APPROVED');
  assert.ok(submitted.reviewedAt);
});

test('field reports remain out of general publication and case notices use the cases destination', () => {
  const shared = state();
  applyAction(shared, 'save-field-report', { form: report() }, 'agent');
  assert.equal(shared.forms[0].audience.length, 0);
  assert.equal(projectState(shared, 'gm').forms[0].status, 'DRAFT');
  assert.equal(authorizeAction(shared, 'agent', 'save-form', { form: report() }), false);
  assert.equal(authorizeAction(shared, 'director', 'save-field-report', { form: report() }), false);
  applyAction(shared, 'add-notice', { title: '사건철 갱신', body: '새 단서를 확인', target: 'cases' }, 'gm');
  assert.equal(shared.notices[0].target, 'cases');
  assert.equal(projectState(shared, 'agent').notices[0].title, '사건철 갱신');
});
