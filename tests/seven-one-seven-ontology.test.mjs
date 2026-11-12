import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Parser} from 'n3';

/** EVERY TERM 7-1-7 WRITES IS DECLARED (experiments 200 and 207): each date, interval and verdict predicate in
 *  ontology/response-timeliness.ttl, tied to the milestone it dates or the target it measures; each verdict a member of
 *  fw:TargetVerdict. */
const ruleset=JSON.parse(readFileSync(new URL('../rulesets/seven-one-seven/1.0.0.json',import.meta.url),'utf8'));
const quads=new Parser().parse(readFileSync(new URL('../ontology/response-timeliness.ttl',import.meta.url),'utf8'));
const FW='urn:fieldwork:',iri=c=>FW+c.slice(c.indexOf(':')+1);
const has=(s,p)=>quads.some(q=>q.subject.value===s&&q.predicate.value===p);

test('each predicate 7-1-7 reads or writes is declared and tied to a milestone or a target',()=>{
  const read=ruleset.inputContract.fieldFrom.map(b=>b.predicate);
  const written=ruleset.authored.rules.flatMap(r=>r.then.map(t=>t.predicate));
  for(const p of read)assert.ok(has(iri(p),FW+'datesMilestone'),`${p} dates a milestone`);
  for(const p of new Set(written))assert.ok(has(iri(p),FW+'measuresTarget'),`${p} measures a target`);
});

test('each verdict is a declared member of fw:TargetVerdict',()=>{
  const verdicts=[...ruleset.authored.rules.flatMap(r=>r.then.map(t=>t.value)),...ruleset.authored.otherwise.map(o=>o.value)].filter(Boolean);
  for(const v of new Set(verdicts))
    assert.ok(quads.some(q=>q.subject.value===iri(v)&&q.object.value===FW+'TargetVerdict'),`${v} is a TargetVerdict`);
});
