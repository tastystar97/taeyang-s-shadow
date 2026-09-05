import { ARCHIVE_SCHEMAS } from './archive-schemas.mjs';
import { normalizeArchiveCategory, normalizeEvidenceCategory } from './archive-categories.mjs';
import { PERSONNEL, STATIC_EVIDENCE, CITY_HTML } from './catalog.mjs';

const ROLES = new Set(['director', 'agent', 'gm']);
const TYPES = new Set(['personnel', 'documents', 'evidence', 'cases', 'forms']);
export const PUBLIC_CITY_DOCUMENT_IDS = Object.freeze(['city-locations', 'city-history']);
export const isPublicCityDocument = id => PUBLIC_CITY_DOCUMENT_IDS.includes(id);
const own = (obj, key) => Object.hasOwn(obj, key);
const audience = (item, fallback = ['director']) => own(item, 'audience')
  ? (Array.isArray(item.audience) ? [...new Set(item.audience.filter(r => r === 'director' || r === 'agent'))] : [])
  : [...fallback];
const pick = (item, keys) => Object.fromEntries(keys.filter(k => own(item, k)).map(k => [k, structuredClone(item[k])]));

export function normalizeState(input) {
  const state = structuredClone(input);
  for (const type of TYPES) state[type] = Array.isArray(state[type]) ? state[type] : [];
  for (const [type, seeds] of [['personnel', PERSONNEL], ['evidence', STATIC_EVIDENCE]]) {
    for (const seed of seeds) {
      const existing = state[type].find(item => item.id === seed.id);
      if (existing && type === 'evidence' && existing.sourceKind !== 'static' && existing.src !== seed.src) throw new Error('기본 자료 식별자가 기존 업로드와 충돌합니다.');
      if (!existing) state[type].push({ ...structuredClone(seed), sourceKind: 'static', audience: ['director'] });
    }
  }
  for (const type of TYPES) for (const item of state[type]) item.audience = audience(item, ['forms', 'cases'].includes(type) ? [] : ['director']);
  for (const doc of state.documents) {
    doc.category = normalizeArchiveCategory(doc.category);
    if (isPublicCityDocument(doc.id)) doc.audience = ['director', 'agent'];
  }
  for (const item of state.evidence) item.category = normalizeEvidenceCategory(item.category);
  for (const form of state.forms) {
    form.kind ||= 'director-form';
    form.authorRole = form.kind === 'field-report' ? 'agent' : 'director';
    form.reviewerRole = form.kind === 'field-report' ? 'director' : 'gm';
  }
  state.notices = (state.notices || []).map(n => ({ ...n, audience: audience(n) }));
  state.personnel.sort((a,b)=>Number(a.order)-Number(b.order));
  state.cases.sort((a,b)=>(a.order||0)-(b.order||0));
  state.files ||= {};
  state.archiveEntries ||= {};
  state.checklist ||= {};
  state.activity ||= [];
  state.schemaVersion = Math.max(2, Number(state.schemaVersion) || 0);
  return state;
}

function generalRead(item, role) { return Boolean(item && (role === 'gm' || audience(item, []).includes(role))); }
function workflowRead(form, role) {
  if (role === 'gm') return true;
  if (form.kind === 'field-report') return role === 'agent' || (role === 'director' && ['SUBMITTED', 'APPROVED', 'RETURNED'].includes(form.status));
  return role === 'director' && form.kind === 'director-form';
}
export function canReadResource(input, type, id, role) {
  if (!ROLES.has(role) || !TYPES.has(type)) return false;
  const state = normalizeState(input);
  const item = state[type].find(item => item.id === id);
  return Boolean(item && (type === 'forms' ? workflowRead(item, role) : generalRead(item, role)));
}

const FIELDS = {
  personnel: ['id','name','order','employeeId','position','division','clearance','status','assignment','appointed','duties','qualifications','assessment','note','image','fileName','portraitFileId','recordFileId'],
  documents: ['id','code','category','title','detail','security','status','url','editable','fileId'],
  evidence: ['id','title','category','caseCode','location','capturedAt','description','fileName','contentType','createdAt','updatedAt','src','sourceKind'],
  cases: ['id','caseCode','title','summary','status'],
  forms: ['id','kind','authorRole','reviewerRole','template','title','content','signature','status','comment','createdAt','updatedAt','submittedAt','version','reporter','lastSubmitted','reviewedAt'],
};
export function projectState(input, role) {
  if (!ROLES.has(role)) throw new Error('유효한 역할이 필요합니다.');
  const state = normalizeState(input);
  state.documents.sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0));
  if (role === 'gm') return { ...state, personnel: state.personnel.map(p => personnelView(p,state)), role, cityHtml: CITY_HTML, documents: state.documents.map(doc => ({...documentView(doc,state), editorSchema: ARCHIVE_SCHEMAS[doc.id], editable: false})) };
  const result = {
    revision: state.revision, schemaVersion: state.schemaVersion, role,
    operation: pick(state.operation || {}, ['act','title','phase']),
    checklist: Object.fromEntries(Object.entries(state.checklist).map(([phase, items]) => [phase, items.map(item => pick(item, ['id','title','note','done','source']))])),
    activity: [], archiveEntries: {},
  };
  for (const type of TYPES) {
    result[type] = state[type].filter(item => type === 'forms' ? workflowRead(item, role) : generalRead(item, role)).map(item => {
      // A returned report's working draft is not the director's submitted copy.
      const visible = type === 'forms' && item.kind === 'field-report' && role === 'director' && item.status === 'RETURNED'
        ? { ...item, content: item.lastSubmitted?.content || {}, title: item.lastSubmitted?.title || item.title, signature: item.lastSubmitted?.signature || '', submittedAt: item.lastSubmitted?.submittedAt || item.submittedAt, version: item.lastSubmitted?.version || item.version, reporter: item.lastSubmitted?.content?.reporter || item.reporter } : item;
      const row = pick(visible, FIELDS[type]);
      if (type === 'documents') { Object.assign(row,documentView(row,state)); delete row.fileId; row.editorSchema = ARCHIVE_SCHEMAS[item.id]; row.editable = role === 'director' && Boolean(row.editorSchema); }
      if (type === 'documents' && state.readReceipts?.[role]?.[item.id] && row.status === 'NEW') row.status = 'RELEASED';
      if (type === 'cases') row.links = (item.links || []).filter(link => ['personnel','documents','evidence','forms'].includes(link.type) && canReadResource(state,link.type,link.id,role)).map((link,index) => ({...pick(link, ['type','id']),order:index}));
      return row;
    });
  }
  for (const doc of result.documents) {
    if (state.archiveEntries[doc.id]) result.archiveEntries[doc.id] = pick(state.archiveEntries[doc.id], ['id','content','signatures','updatedAt']);
  }
  const targets = { archive: 'documents', personnel: 'personnel', evidence: 'evidence', cases: 'cases', workflow: 'forms', city: 'documents' };
  result.notices = state.notices.filter(notice => {
    if (!generalRead(notice, role)) return false;
    if (notice.formId) return result.forms.some(f => f.id === notice.formId);
    if (notice.targetId) return result[targets[notice.target]]?.some(item => item.id === notice.targetId) || false;
    return ['command','workflow','archive','personnel','evidence','city','cases'].includes(notice.target);
  }).map(notice => pick(notice, ['id','time','title','body','priority','target','targetId','formId']));
  if (role === 'director') result.directorSignature = { name: '최영호', image: '/media/signatures/choi-youngho-fitted.png' };
  result.cityHtml = result.documents.some(d => d.id === 'city-locations') ? CITY_HTML.replace(/<button[^>]*data-doc="([^"]+)"[^>]*>[\s\S]*?<\/button>/g, (markup, id) => result.documents.some(d => d.id === id) ? markup : '') : '';
  result.personnel = result.personnel.map((p,index) => ({...personnelView(p,state),order:String(index+1).padStart(2,'0')}));
  return result;
}

export function authorizeAction(input, role, action, payload = {}) {
  if (!ROLES.has(role)) return false;
  const state = normalizeState(input);
  if (action === 'toggle-checklist') return role === 'director' || role === 'gm';
  if (action === 'mark-document-read') return role !== 'gm' && canReadResource(state, 'documents', payload.id, role);
  if (action === 'save-archive-document') return role === 'director' && canReadResource(state, 'documents', payload.entry?.id, role);
  if (['save-form','submit-form','delete-form'].includes(action)) {
    const existing = state.forms.find(f => f.id === (payload.form?.id || payload.id));
    return role === 'director' && (!existing || existing.kind === 'director-form') && (!payload.form?.kind || payload.form.kind === 'director-form') && (!payload.form?.template || payload.form.template !== 'field-report');
  }
  if (['save-field-report','submit-field-report','delete-field-report'].includes(action)) {
    const existing = state.forms.find(f => f.id === (payload.form?.id || payload.id));
    return role === 'agent' && (!existing || existing.kind === 'field-report') && (!payload.form || payload.form.template === 'field-report');
  }
  if (['approve-form','return-form'].includes(action)) return role === 'gm' && state.forms.some(f => f.id === payload.id && f.kind === 'director-form');
  if (['approve-field-report','return-field-report'].includes(action)) return role === 'director' && state.forms.some(f => f.id === payload.id && f.kind === 'field-report' && f.status === 'SUBMITTED' && Number(f.version) === Number(payload.version));
  return role === 'gm' && ['delete-form-control','set-phase','add-notice','delete-notice','add-evidence','update-evidence','delete-evidence','reset-state'].includes(action);
}

function personnelView(person,state) {
  const row={...person};
  if(person.portraitFileId)row.image='/api/files?type=personnel&id='+encodeURIComponent(person.id)+'&fileId='+encodeURIComponent(person.portraitFileId);
  const file=state.files?.[person.recordFileId];
  if(file)row.attachment={id:file.id,name:file.name,contentType:file.contentType,bytes:file.bytes,url:'/api/files?type=personnel&id='+encodeURIComponent(person.id)+'&fileId='+encodeURIComponent(file.id)};
  delete row.portraitFileId; delete row.recordFileId;
  return row;
}

function documentView(doc,state) {
  const row={...doc};const file=state.files?.[doc.fileId];
  row.managedTemplate=Boolean(ARCHIVE_SCHEMAS[doc.id]);
  if(file){row.url='/api/files?type=documents&id='+encodeURIComponent(doc.id)+'&fileId='+encodeURIComponent(file.id);row.attachment={name:file.name,contentType:file.contentType,bytes:file.bytes};}
  delete row.fileId;return row;
}
