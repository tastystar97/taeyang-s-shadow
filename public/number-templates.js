const prefixes={'본부 공문':'HQ','의료기록':'MED','인물 관련':'ID','신원서류':'ID','개인 기록':'NOTE','지부 행정':'ADMIN','본부 규정':'REG','도시 정보':'CITY','사건 자료':'CASE','증거품':'EVD','기타 문서':'DOC'};
export function nextNumber(prefix,values){
 const normalized=values.map(v=>String(v||'').normalize('NFKC').trim().toUpperCase());
 let max=0;for(const value of normalized){if(!value.startsWith(prefix))continue;const suffix=value.slice(prefix.length);if(/^[0-9]+$/.test(suffix))max=Math.max(max,Number(suffix));}
 return prefix+String(max+1).padStart(3,'0');
}
export function documentNumber(category,documents){return nextNumber('TCB/'+(prefixes[category]||'DOC')+'-',documents.map(d=>d.code));}
export function caseNumber(year,state){
 if(!/^[0-9]{4}$/.test(year))throw new Error('사건 연도를 네 자리로 입력하세요.');
 return nextNumber('TCB-'+year+'-',[...(state.cases||[]),...(state.evidence||[])].map(c=>c.caseCode));
}
export function setupNumberTemplates(getState,toast){
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-number-template]');if(!button)return;
  const form=button.closest('form'),state=getState();if(!state)return;
  const isDoc=button.dataset.numberTemplate==='document',input=form.elements[isDoc?'code':'caseCode'];
  if(input.value.trim()&&!confirm('입력한 번호를 새 템플릿 번호로 바꿀까?'))return;
  try{input.value=isDoc?documentNumber(form.elements.category.value,state.documents):caseNumber(form.querySelector('[data-number-year]').value,state);input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}
  catch(error){toast(error.message);}
 });
}