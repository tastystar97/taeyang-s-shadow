import test from 'node:test';
import assert from 'node:assert/strict';
import {FORM_TEMPLATES,formTemplate,renderFormFieldsHTML,renderFormDocument} from '../public/form-templates.js';
test('all five templates share read-only labels and preserve long, multiline and retired fields',()=>{
 for(const template of Object.values(FORM_TEMPLATES)){
 const values=Object.fromEntries(template.fields.map(f=>[f.id,'첫 줄\n둘째 줄 '+ '긴 본문 '.repeat(80)]));values.retired='옛 항목';const original=structuredClone(values),html=renderFormFieldsHTML(template,values,true);
 for(const field of template.fields)assert.ok(html.includes(field.label));assert.ok(html.includes('첫 줄\n둘째 줄'));assert.ok(html.includes('추가 항목 · retired'));assert.deepEqual(values,original);assert.doesNotMatch(html,/<(?:input|textarea|select|button)\b/);
 }
});
test('document viewer escapes stored data and shows unknown templates without omitting fields',()=>{
 const html=renderFormDocument({id:'x',title:'<script>bad()</script>',template:'old-type',content:{legacy:'<img src=x onerror=bad()>'},signature:'someone',status:'RETURNED',comment:'사유\n추가 사유'});
 assert.doesNotMatch(html,/<script|onerror=bad\(\)>/);assert.ok(html.includes('&lt;img'));assert.ok(html.includes('legacy'));assert.ok(html.includes('사유\n추가 사유'));assert.equal(formTemplate('old').fields.length,0);
});
test('editing uses shared controls and preserves retired select values',()=>{
 const template=FORM_TEMPLATES['operation-order'];const html=renderFormFieldsHTML(template,{priority:'이전 선택값'});assert.ok(html.includes('<option selected>이전 선택값</option>'));assert.ok(html.includes('data-field="orders"'));assert.ok(html.includes('required'));
});
