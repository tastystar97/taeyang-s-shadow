import test from 'node:test';
import assert from 'node:assert/strict';
import {documentNumber,caseNumber} from '../public/number-templates.js';
test('document templates use category prefixes and continue existing serial numbers',()=>{
 assert.equal(documentNumber('인물 관련',[{code:'TCB/ID-004'},{code:'tcb/id-008'},{code:'TCB/MED-099'}]),'TCB/ID-009');
 assert.equal(documentNumber('기타 문서',[]),'TCB/DOC-001');
 assert.equal(documentNumber('증거품',[]),'TCB/EVD-001');
});
test('case template includes chosen fictional year and avoids existing case and evidence numbers',()=>{
 const state={cases:[{caseCode:'TCB-2043-017'},{caseCode:'TCB-2042-999'}],evidence:[{caseCode:'TCB-2043-021'}]};
 assert.equal(caseNumber('2043',state),'TCB-2043-022');
 assert.equal(caseNumber('2044',state),'TCB-2044-001');
 assert.throws(()=>caseNumber('',state),/네 자리/);
});