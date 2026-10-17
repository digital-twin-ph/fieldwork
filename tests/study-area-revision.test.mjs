import test from 'node:test';
import assert from 'node:assert/strict';
import {studyAreaN3} from '../build/study-area.js';

// "Did we revise our study area? When?" -- the practitioner, 2026-10-17, on what the receipt has
// to be able to answer. The study area's IRI is node-scoped where every other area in this
// application mints per run, so a redrawn boundary kept one identifier over two different shapes
// and nothing recorded that it had moved.
const square=(x)=>({type:'Polygon',coordinates:[[[x,0],[x+0.1,0],[x+0.1,0.1],[x,0.1],[x,0]]]});
const at=(s,x,restoredFrom)=>({at:s,geometry:square(x),selectionMode:'polygon',
  ...(restoredFrom?{restoredFrom}:{})});
const node=(revisions,x=0)=>({id:'study',type:'study_area',x:0,y:0,
  params:{source:'drawn',label:'Kivu',selectionMode:'polygon',geometry:square(x),
    ...(revisions?{revisions}:{})}});

test('an unrevised area asserts no revision, and keeps the plain geometry IRI',()=>{
  const {facts}=studyAreaN3(node([at('2026-10-17T09:00:00.000Z',0)]));
  assert.match(facts,/<urn:fieldwork:geometry:study> a geo:Geometry/);
  assert.doesNotMatch(facts,/prov:wasRevisionOf/,'the first geometry is not a revision of anything');
  assert.match(facts,/prov:generatedAtTime "2026-10-17T09:00:00\.000Z"\^\^xsd:dateTime/);
});

test('a revised area says so, and says when',()=>{
  const {facts}=studyAreaN3(node([at('2026-10-17T09:00:00.000Z',0),at('2026-10-17T14:30:00.000Z',5)],5));
  // Did we revise it?
  assert.match(facts,/<urn:fieldwork:geometry:study:r2> a geo:Geometry/);
  assert.match(facts,/prov:wasRevisionOf <urn:fieldwork:geometry:study>/);
  // When?
  assert.match(facts,/prov:generatedAtTime "2026-10-17T14:30:00\.000Z"\^\^xsd:dateTime/);
  // And the study area itself keeps ONE identifier across the revision: same investigation.
  assert.match(facts,/<urn:fieldwork:area:study> a geo:Feature, fw:StudyArea/);
  assert.match(facts,/geo:hasGeometry <urn:fieldwork:geometry:study:r2>/);
});

test('the chain lengthens with each revision',()=>{
  const three=[at('2026-10-15T08:00:00.000Z',0),at('2026-10-16T08:00:00.000Z',5),at('2026-10-17T08:00:00.000Z',9)];
  const {facts}=studyAreaN3(node(three,9));
  assert.match(facts,/<urn:fieldwork:geometry:study:r3> a geo:Geometry/);
  assert.match(facts,/prov:wasRevisionOf <urn:fieldwork:geometry:study:r2>/);
  assert.match(facts,/prov:generatedAtTime "2026-10-17T08:00:00\.000Z"/);
});

test('an area saved before revisions were recorded still emits valid facts',()=>{
  // Every workflow saved before 2026-10-17 has no revisions array. It must read as unrevised
  // rather than as broken, and must not claim a time nobody recorded.
  const {facts}=studyAreaN3(node(undefined));
  assert.match(facts,/<urn:fieldwork:geometry:study> a geo:Geometry/);
  assert.doesNotMatch(facts,/prov:wasRevisionOf/);
  assert.doesNotMatch(facts,/prov:generatedAtTime/,'no timestamp is better than an invented one');
  assert.match(facts,/geo:asWKT/);
});

test('the prefixes the new assertions need are declared',()=>{
  const {facts}=studyAreaN3(node([at('2026-10-17T09:00:00.000Z',0),at('2026-10-17T10:00:00.000Z',5)],5));
  assert.match(facts,/@prefix prov: <http:\/\/www\.w3\.org\/ns\/prov#>\./);
  assert.match(facts,/@prefix xsd: <http:\/\/www\.w3\.org\/2001\/XMLSchema#>\./);
});

test('restoring an earlier extent is both a revision and a derivation',()=>{
  // An investigation that widened its area and then went back. The record must say BOTH that v3
  // replaced v2 and that it brought back v1 -- shortening the chain would erase that the area was
  // once wider, which is the emergent-strategy evidence worth keeping.
  const {facts}=studyAreaN3(node([
    at('2026-10-15T08:00:00.000Z',0),
    at('2026-10-16T08:00:00.000Z',5),
    at('2026-10-17T08:00:00.000Z',0,1)],0));
  assert.match(facts,/<urn:fieldwork:geometry:study:r3> a geo:Geometry/);
  assert.match(facts,/prov:wasRevisionOf <urn:fieldwork:geometry:study:r2>/,'it replaced v2');
  assert.match(facts,/prov:wasDerivedFrom <urn:fieldwork:geometry:study>/,'it brought back v1');
  assert.match(facts,/prov:generatedAtTime "2026-10-17T08:00:00\.000Z"/);
});
