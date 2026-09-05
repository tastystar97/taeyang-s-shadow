import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../netlify/lib/default-state.mjs';
import { normalizeState, projectState } from '../netlify/lib/permissions.mjs';
import { createSession } from '../netlify/lib/auth.mjs';
import { createPublicationHandler } from '../netlify/functions/publication.mjs';

process.env.SESSION_SECRET = 'publication-test-secret';
process.env.BRANCH_ACCESS_CODE = 'publication-director';
process.env.FIELD_ACCESS_CODE = 'publication-agent';
process.env.CONTROL_ACCESS_CODE = 'publication-gm';

const request = (role, body, headers = {}, method = 'POST') => new Request('https://branch.test/api/publication', {
  method,
  headers: { ...(role ? { cookie: 'tcb_session=' + createSession(role) } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
  ...(body ? { body: JSON.stringify(body) } : {})
});

function harness() {
  let state = normalizeState(freshState()), writes = 0, reject = false;
  state.cases = [
    { id: 'case-a', caseCode: 'CASE-A', title: '사건 A', audience: [], links: [] },
    { id: 'case-b', caseCode: 'CASE-B', title: '사건 B', audience: ['director'], links: [] }
  ];
  const read = async () => structuredClone(state);
  const write = async (next, previous) => {
    if (reject || previous.revision !== state.revision) return false;
    state = next; writes += 1; return next;
  };
  return {
    get state() { return state; },
    get writes() { return writes; },
    reject() { reject = true; },
    handler: createPublicationHandler({ read, write })
  };
}

test('bulk publication is GM-only, same-origin and unavailable in preview', async () => {
  const h = harness(), body = { revision: h.state.revision, type: 'cases', ids: ['case-a'], audience: ['agent'] };
  assert.equal((await h.handler(request(null, body))).status, 401);
  for (const role of ['agent', 'director']) assert.equal((await h.handler(request(role, body))).status, 403);
  assert.equal((await h.handler(request('gm', body, { origin: 'https://evil.test' }))).status, 403);
  assert.equal((await h.handler(request('gm', body, { 'X-TCB-Preview': '1' }))).status, 403);
  assert.equal((await h.handler(request('gm', null, {}, 'GET'))).status, 405);
  assert.equal(h.writes, 0);
});

test('selected records change atomically while adjacent records keep their audience', async () => {
  const h = harness(), beforeRevision = h.state.revision;
  const selected = h.state.personnel.slice(0, 2).map(person => person.id), adjacent = h.state.personnel[2];
  let response = await h.handler(request('gm', { revision: beforeRevision, type: 'personnel', ids: selected, audience: ['agent'] }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.changed, 2); assert.equal(h.writes, 1); assert.equal(h.state.revision, beforeRevision + 1);
  assert.deepEqual(selected.map(id => h.state.personnel.find(person => person.id === id).audience), [['agent'], ['agent']]);
  assert.deepEqual(h.state.personnel.find(person => person.id === adjacent.id).audience, ['director']);
  assert.deepEqual(projectState(h.state, 'agent').personnel.map(person => person.id), selected);

  response = await h.handler(request('gm', { revision: h.state.revision, type: 'personnel', ids: selected, audience: [] }));
  assert.equal(response.status, 200); assert.equal(h.writes, 2);
  assert.equal(projectState(h.state, 'agent').personnel.length, 0);
});

test('invalid, duplicate or missing selections do not partially update state', async () => {
  const h = harness(), original = structuredClone(h.state);
  const invalid = [
    { revision: h.state.revision, type: 'cases', ids: [], audience: ['agent'] },
    { revision: h.state.revision, type: 'cases', ids: ['case-a', 'case-a'], audience: ['agent'] },
    { revision: h.state.revision, type: 'cases', ids: ['case-a', 'missing'], audience: ['agent'] },
    { revision: h.state.revision, type: 'forms', ids: ['case-a'], audience: ['agent'] },
    { revision: h.state.revision, type: 'cases', ids: ['case-a'], audience: ['gm'] }
  ];
  for (const body of invalid) assert.ok((await h.handler(request('gm', body))).status >= 400);
  assert.equal(h.writes, 0); assert.deepEqual(h.state, original);
});

test('CITY NET remains visible to both player roles and cannot be hidden in bulk', async () => {
  const h = harness();
  for (const id of ['city-locations', 'city-history']) h.state.documents.find(doc => doc.id === id).audience = [];
  for (const role of ['director', 'agent']) {
    const view = projectState(h.state, role);
    assert.deepEqual(view.documents.filter(doc => doc.id.startsWith('city-')).map(doc => doc.id), ['city-locations', 'city-history']);
    assert.ok(view.cityHtml.includes('city-locations')); assert.ok(view.cityHtml.includes('city-history'));
  }
  const response = await h.handler(request('gm', { revision: h.state.revision, type: 'documents', ids: ['city-locations'], audience: [] }));
  assert.equal(response.status, 422); assert.match((await response.json()).error, /전체 공개 고정/); assert.equal(h.writes, 0);
});

test('revision conflicts and CAS failures return current GM state without claiming success', async () => {
  const h = harness();
  let response = await h.handler(request('gm', { revision: -1, type: 'cases', ids: ['case-a'], audience: ['agent'] }));
  assert.equal(response.status, 409); assert.equal((await response.json()).state.role, 'gm'); assert.equal(h.writes, 0);
  h.reject();
  response = await h.handler(request('gm', { revision: h.state.revision, type: 'cases', ids: ['case-a'], audience: ['agent'] }));
  assert.equal(response.status, 409); assert.equal(h.writes, 0);
});

test('control UI exposes four selected-publication toolbars and locks CITY NET rows', async () => {
  const { readFile } = await import('node:fs/promises');
  const [html, control, archive] = await Promise.all([
    readFile('public/control.html', 'utf8'),
    readFile('public/control.js', 'utf8'),
    readFile('public/archive-control.js', 'utf8')
  ]);
  for (const type of ['cases', 'personnel', 'documents', 'evidence']) assert.match(html, new RegExp('data-bulk-toolbar="' + type + '"'));
  assert.equal((html.match(/data-bulk-select-all/g) || []).length, 4);
  assert.match(control, /\/api\/publication/); assert.match(control, /data-bulk-item/);
  assert.match(archive, /CITY NET 전체 공개/); assert.match(archive, /disabled title="CITY NET 전체 공개 고정"/);
});


test('player and read-only preview expose one archive and continuous 01-06 navigation', async () => {
  const { readFile } = await import('node:fs/promises');
  const [html, app, control] = await Promise.all([readFile('public/index.html', 'utf8'), readFile('public/app.js', 'utf8'), readFile('public/control.html', 'utf8')]);
  assert.match(html, /data-view="archive"><span>04<\/span>ARCHIVE<\/button>\s*<button[^>]+data-view="workflow"><span>05<\/span>WORKFLOW<\/button>\s*<button[^>]+data-view="cases"><span>06<\/span>CASE FILES/);
  assert.doesNotMatch(html, /data-view="evidence"|id="view-evidence"/);
  assert.match(html, /data-archive-tab="documents"/); assert.match(html, /data-archive-tab="evidence"/);
  assert.match(control, /data-control-archive-tab="documents"/); assert.match(control, /data-control-archive-tab="evidence"/);
  assert.doesNotMatch(control, /data-control-view="evidence"/);
  assert.match(app, /\[data-view="workflow"\], \[data-go="workflow"\][^\n]+hidden=!player;/);
  assert.match(app, /#new-form-button, #new-form-button-secondary[^\n]+hidden=!player\|\|IS_PREVIEW;/);
});

test('legacy archive and evidence categories normalize into the combined taxonomy', () => {
  const original = freshState();
  original.documents[0].category = '신원서류';
  original.evidence = [{ id: 'legacy-evidence', title: '구형 기록', category: '증거물', audience: ['director'] }];
  const state = normalizeState(original);
  assert.equal(state.documents[0].category, '인물 관련');
  assert.equal(state.evidence.find(item => item.id === 'legacy-evidence').category, '증거품');
  assert.equal(original.documents[0].category, '신원서류');
  assert.equal(original.evidence[0].category, '증거물');
  assert.deepEqual(normalizeState(state), state);
});
