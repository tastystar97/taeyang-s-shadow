export const FORM_TEMPLATES = {
  'field-report': { code: 'TCB-FIELD/01', label: '현장 상황 보고서', authorRole: 'agent', reviewerRole: 'director', checklist: [], fields: [
    { id: 'reportTitle', label: '보고 제목', required: true }, { id: 'reporter', label: '보고자', required: true },
    { id: 'location', label: '현장 위치', required: true }, { id: 'observedAt', label: '확인 일시', type: 'datetime-local', required: true },
    { id: 'details', label: '확인 내용', type: 'textarea', full: true, required: true }, { id: 'caseReference', label: '사건철', placeholder: '사건번호 또는 사건명' },
    { id: 'resourceReferences', label: '관련 자료', type: 'textarea', full: true, placeholder: '열람 가능한 인사·문서·증거 자료' },
    { id: 'riskDamage', label: '위험 및 피해', type: 'textarea', full: true }, { id: 'supportRequest', label: '지원 요청', type: 'textarea', full: true }
  ] },
  'operation-order': { code: 'TCB-OPS/01', label: '작전 인원 배치 명령서', checklist: ['assignment', 'operation-order'], fields: [
    { id: 'caseName', label: '사건명', required: true }, { id: 'priority', label: '작전 우선순위', type: 'select', options: ['인명 구조', '정보 확보', '위협 무력화', '은폐 및 수습'], required: true },
    { id: 'agents', label: '투입 대원', placeholder: '성명 및 역할', required: true }, { id: 'support', label: '지급 장비 및 지원', placeholder: '시설 보정, 물자, 백업 계획' },
    { id: 'orders', label: '세부 명령 및 철수 조건', type: 'textarea', full: true, required: true }
  ] },
  'hq-report': { code: 'TCB-HQ/02', label: '본부 정기 보고서', checklist: ['hq-report'], fields: [
    { id: 'subject', label: '보고 제목', required: true }, { id: 'result', label: '사건 결과', type: 'select', options: ['성공', '부분 성공', '실패', '진행 중'], required: true },
    { id: 'secured', label: '확보 인원 및 물품', placeholder: '해당 없음' }, { id: 'external', label: '외부 세력 접촉', placeholder: 'H.E.L.I.O.S., NOX 등' },
    { id: 'summary', label: '상세 보고', type: 'textarea', full: true, required: true }, { id: 'omission', label: '비공개·완화 보고 항목', type: 'textarea', full: true, placeholder: '본부 보고에서 제외할 내용이 있다면 기록' }
  ] },
  'protection-record': { code: 'TCB-P07/03', label: '보호대상 안정화·인계 기록', checklist: ['protected-review'], fields: [
    { id: 'subjectName', label: '대상자 / 사건번호', required: true }, { id: 'condition', label: '현재 상태', type: 'select', options: ['안정', '의료 불안정', '인지 평가 중', '보안 위험', '인계 가능'], required: true },
    { id: 'will', label: '본인 의사', placeholder: '인계 동의·거부·판단 유예', required: true }, { id: 'deferReason', label: '인계 유예 사유', placeholder: '의료 / 인지 / 보안 / 시설' },
    { id: 'reevaluation', label: '다음 재평가', placeholder: '일시 및 담당자', required: true }, { id: 'plan', label: '보호계획 및 설명 내용', type: 'textarea', full: true, required: true }
  ] },
  'settlement-report': { code: 'TCB-FIN/04', label: '사건 종결 및 정산 보고서', checklist: ['result-record', 'condition-update', 'payroll', 'maintenance'], fields: [
    { id: 'caseName', label: '사건명', required: true }, { id: 'reward', label: '사건 보수', placeholder: '예: +3 UNIT' }, { id: 'payroll', label: '임금 및 유지비', placeholder: '예: -3 UNIT', required: true },
    { id: 'damage', label: '대원 침식·부상 변화', placeholder: '성명 / 변경값' },
    { id: 'followup', label: '미결 사항 및 후속 조치', type: 'textarea', full: true }
  ] }
};
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const formTemplate = id => FORM_TEMPLATES[id] || {code:id||'TCB/DOC',label:'보관 서식',fields:[]};
export function renderFormFieldsHTML(template,values={},readonly=false){
  const fields=[...template.fields];if(readonly)for(const id of Object.keys(values))if(!fields.some(f=>f.id===id))fields.push({id,label:'추가 항목 · '+id,full:true});
  return fields.map(field=>{
    const value=values[field.id]??'';let control;
    if(readonly)control='<div class="form-read-value">'+escape(value===''?'미기록':typeof value==='object'?JSON.stringify(value,null,2):value)+'</div>';
    else{const attrs='name="'+escape(field.id)+'" data-field="'+escape(field.id)+'" '+(field.required?'required':'');
      if(field.type==='textarea')control='<textarea '+attrs+' placeholder="'+escape(field.placeholder||'')+'">'+escape(value)+'</textarea>';
      else if(field.type==='datetime-local')control='<input type="datetime-local" '+attrs+' value="'+escape(value)+'">';
      else if(field.type==='select'){const options=[...field.options];if(value&&!options.includes(value))options.unshift(value);control='<select '+attrs+'>'+options.map(o=>'<option '+(value===o?'selected':'')+'>'+escape(o)+'</option>').join('')+'</select>';}
      else control='<input '+attrs+' value="'+escape(value)+'" placeholder="'+escape(field.placeholder||'')+'">';
    }
    return '<div class="field-group '+(field.full?'full':'')+'"><label><span>'+escape(field.label)+'</span>'+control+'</label></div>';
  }).join('');
}
export function renderFormDocument(form){
 const template=formTemplate(form.template);const date=v=>v&&!Number.isNaN(Date.parse(v))?new Date(v).toLocaleString('ko-KR'):'미기록';
 const meta=[['문서 식별자',form.id],['작성',date(form.createdAt)],['수정',date(form.updatedAt)],['결재 상태',form.status],...(form.kind==='field-report'?[['제출 버전',form.version||0],['제출 시각',date(form.submittedAt)],['검토 시각',date(form.reviewedAt)]]:[])];
 return '<article class="official-form-paper"><div class="official-security">UGN TAEYANG CITY BRANCH · ELECTRONIC RECORD</div><header class="official-masthead"><div class="official-emblem">UGN</div><div class="official-identity"><small>'+escape(template.code)+'</small><h2>'+escape(template.label)+'</h2><p>'+escape(form.title)+'</p></div></header><div class="official-meta-grid">'+meta.map(([k,v])=>'<div><span>'+escape(k)+'</span><b>'+escape(v)+'</b></div>').join('')+'</div><section class="official-form-section"><div class="official-section-title"><b>01</b><span>기안 내용</span></div><div class="dynamic-fields">'+renderFormFieldsHTML(template,form.content,true)+'</div></section><section class="official-form-section"><div class="official-section-title"><b>02</b><span>서명·결재 기록</span></div><p class="form-read-value">서명: '+escape(form.signature||'미서명')+'</p>'+(form.signature==='최영호'?'<img class="review-signature" src="/media/signatures/choi-youngho-fitted.png" alt="최영호 전자서명">':'')+'<div class="form-read-value">반려 사유: '+escape(form.comment||'없음')+'</div></section></article>';
}
