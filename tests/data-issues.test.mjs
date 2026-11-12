import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Parser} from 'n3';
import {ISSUE_LABEL,issueFacts} from '../build/data-issues.js';

/** EXPERIMENT 207: every kind of data issue the code can report is declared in ontology/data-issues.ttl, with the label
 *  the screen shows and the dimension it measures; and the receipt's issues parse. */
const quads=new Parser().parse(readFileSync(new URL('../ontology/data-issues.ttl',import.meta.url),'utf8'));
const FW='urn:fieldwork:',SKOS='http://www.w3.org/2004/02/skos/core#';
const of=(s,p)=>quads.filter(q=>q.subject.value===s&&q.predicate.value===p).map(q=>q.object.value);

test('every kind the code reports is declared, labelled as the screen labels it, and placed in a dimension',()=>{
  for(const [kind,label] of Object.entries(ISSUE_LABEL)){
    assert.deepEqual(of(FW+kind,SKOS+'prefLabel'),[label],`${kind}'s label`);
    assert.equal(of(FW+kind,FW+'inDimension').length,1,`${kind} measures one dimension`);
    assert.ok(of(FW+kind,SKOS+'inScheme').includes(FW+'dataIssueKinds'),`${kind} is in the scheme`);
  }
});

test('an issue in a receipt is a fw:DataIssue with its kind, column, counts and what it means',()=>{
  const n3=issueFacts('<urn:fieldwork:run:r:ruleset:s>',[{kind:'ValueAbsent',column:'dt_onset',count:27,of:162,says:'27 of 162 have no onset.'}]);
  const got=new Parser().parse(n3);
  const issue=got.find(q=>q.predicate.value===FW+'dataIssue').object;
  const about=p=>got.find(q=>q.subject.equals(issue)&&q.predicate.value===p)?.object.value;
  assert.equal(about('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),FW+'DataIssue');
  assert.equal(about(FW+'issueKind'),FW+'ValueAbsent');
  assert.equal(about(FW+'issueColumn'),'dt_onset');
  assert.equal(about(FW+'affectedRecordCount'),'27');
  assert.equal(about(FW+'consideredRecordCount'),'162');
  assert.equal(about('http://www.w3.org/2000/01/rdf-schema#comment'),'27 of 162 have no onset.');
  assert.equal(issueFacts('<x>',[]),'');
});
