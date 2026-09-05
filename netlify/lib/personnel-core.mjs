import { InputError } from './upload-core.mjs';
export const PERSONNEL_FIELDS={name:100,employeeId:80,position:120,division:160,clearance:40,status:40,assignment:240,appointed:40,duties:8000,assessment:8000,note:8000};
const normalizedId = value => String(value || '').normalize('NFKC').trim().toUpperCase();
export function personnelData(input,state,id) {
  if(!input || typeof input!=='object' || Array.isArray(input))throw new InputError('인사정보를 확인하세요.');
  if(Object.keys(input).some(key=>!Object.hasOwn(PERSONNEL_FIELDS,key) && key!=='qualifications'))throw new InputError('지원하지 않는 인사 항목입니다.');
  const result={};
  for(const [key,max] of Object.entries(PERSONNEL_FIELDS)) {
    const value=input[key]??''; if(typeof value!=='string'||value.length>max)throw new InputError('인사정보의 형식이나 글자 수를 확인하세요.');
    result[key]=value.trim();
  }
  if(!result.name||!result.employeeId)throw new InputError('성명과 사번을 입력하세요.');
  if(state.personnel.some(person=>person.id!==id && normalizedId(person.employeeId)===normalizedId(result.employeeId)))throw new InputError('이미 사용 중인 사번입니다. 다른 사번을 입력하세요.',422);
  if(!Array.isArray(input.qualifications)||input.qualifications.length>30||input.qualifications.some(v=>typeof v!=='string'||v.length>240))throw new InputError('자격은 240자 이하로 최대 30개까지 입력하세요.');
  result.qualifications=input.qualifications.map(s=>s.trim()).filter(Boolean);
  return result;
}
export function recordActivity(state, action, person) {
  state.activity.unshift({id:crypto.randomUUID(),action,detail:person.name,at:new Date().toISOString()});
  state.activity=state.activity.slice(0,60);
}
export function singleAudience(body) {
  if(typeof body.id!=='string'||!Array.isArray(body.audience)||body.audience.length>2||new Set(body.audience).size!==body.audience.length||body.audience.some(r=>!['director','agent'].includes(r)))throw new InputError('자료 한 건의 공개 대상만 선택하세요.');
  return [...body.audience];
}
