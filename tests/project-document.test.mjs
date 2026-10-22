import test from 'node:test';
import assert from 'node:assert/strict';
import {projectDocument,readProjectDocument,unbundledReferences,PROJECT_DOCUMENT_SCHEMA}
  from '../build/project-document.js';

// "Where is the export project button?" -- 2026-10-21. There was none: Export and Encrypted ZIP
// are workflow-scoped, so an investigation could not travel as the thing it is.
const project={schema:'fieldwork/project/1',id:'kivu',name:'Facilities and Networks',
  subject:'Health facilities by province',workflows:['kivu/w1','kivu/w2']};

test('a project document carries the project and each workflow as its own export',()=>{
  const doc=projectDocument(project,[{key:'kivu/w1',document:{nodes:[]}},{key:'kivu/w2',document:{schema:'fieldwork/bundle/1'}}]);
  assert.equal(doc.schema,PROJECT_DOCUMENT_SCHEMA);
  assert.equal(doc.workflows.length,2);
  assert.equal(doc.project.name,'Facilities and Networks');
  assert.match(doc.exportedAt,/^\d{4}-\d{2}-\d{2}T/);
  assert.equal(doc.workflows[1].document.schema,'fieldwork/bundle/1');
  doc.project.name='changed';
  assert.equal(project.name,'Facilities and Networks','the document is a copy, not a view');
});

test('a project with nothing saved has nothing to export',()=>{
  assert.throws(()=>projectDocument(project,[]),/nothing to export/);
});

test('reading one back refuses anything that is not one',()=>{
  const doc=projectDocument(project,[{key:'kivu/w1',document:{nodes:[]}}]);
  assert.equal(readProjectDocument(doc).project.id,'kivu');
  assert.throws(()=>readProjectDocument(null),/not a Fieldwork project document/);
  assert.throws(()=>readProjectDocument({schema:'fieldwork/workflow/1'}),/not a Fieldwork project document/);
  assert.throws(()=>readProjectDocument({schema:PROJECT_DOCUMENT_SCHEMA}),/no project record/);
  assert.throws(()=>readProjectDocument({schema:PROJECT_DOCUMENT_SCHEMA,project,workflows:[]}),/no workflows/);
  assert.throws(()=>readProjectDocument({schema:PROJECT_DOCUMENT_SCHEMA,project,workflows:[{key:'k'}]}),
    /needs its key and its document/);
});

// WHAT WILL NOT TRAVEL, counted, so the export says it rather than the import discovering it.
test('a dataset kept by reference is counted, because the file does not carry it',()=>{
  const byReference={nodes:[{id:'net',type:'network_input',params:{label:'Street network',dataRef:'abc'}}]};
  const inline={nodes:[{id:'net',type:'network_input',params:{label:'Street network',dataRef:'abc',data:{nodes:[]}}}]};
  assert.equal(unbundledReferences([byReference]),1);
  assert.equal(unbundledReferences([inline]),0,'a workflow carrying its own data leaves nothing behind');
  assert.equal(unbundledReferences([{nodes:[]}]),0);
});
