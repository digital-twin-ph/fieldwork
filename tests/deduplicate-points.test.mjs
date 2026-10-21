import test from 'node:test';
import assert from 'node:assert/strict';
import {deduplicatePoints,jaroWinkler,normaliseName,pairSignature,candidateKey} from '../build/deduplicate-points.js';

const layer=(sourceNodeId,records)=>({sourceNodeId,label:sourceNodeId,type:'FeatureCollection',
  features:records.map(([id,name,x,y])=>({type:'Feature',id,properties:{name},
    geometry:x===null?null:{type:'Point',coordinates:[x,y]}}))});
const params={nameField:'name',nameMatch:'fuzzy',fuzzyThreshold:0.88,
  blockDistanceM:500,nearDistanceM:50,matchThreshold:2,reviewThreshold:1};
// 0.0001 degrees of longitude at the equator is about 11 m; 0.002 is about 222 m.
const near=(x)=>x+0.0003, far=(x)=>x+0.002;

test('Jaro-Winkler is the standard one, with its parameters',()=>{
  assert.equal(jaroWinkler('martha','martha'),1);
  assert.equal(jaroWinkler('','anything'),0);
  // The textbook values for the Winkler adjustment.
  assert.ok(Math.abs(jaroWinkler('martha','marhta')-0.961)<0.001);
  assert.ok(Math.abs(jaroWinkler('dwayne','duane')-0.840)<0.001);
  // The prefix bonus applies only above 0.7, so distant strings are not lifted by sharing a start.
  assert.ok(jaroWinkler('abcdefgh','abzzzzzz')<0.75);
});

test('normalising is what the comparison is made on, and says which',()=>{
  assert.equal(normaliseName('  Hôpital  Général ','exact'),'hôpital  général');
  // Fuzzy additionally makes punctuation and spacing stop being a disagreement.
  assert.equal(normaliseName('Hôpital-Général (HGR)','fuzzy'),'hôpital général hgr');
  assert.equal(normaliseName(null,'fuzzy'),'');
});

test('a pair that agrees on both tests merges, and says what it came from',()=>{
  const result=deduplicatePoints([
    layer('osm',[['a','Centre de Santé Ndosho',29.2,-1.65]]),
    layer('hdx',[['b','Centre de Sante Ndosho',near(29.2),-1.65]]),
  ],params);
  assert.equal(result.candidates.length,1);
  const [pair]=result.candidates;
  assert.equal(pair.nameAgrees,true);
  assert.equal(pair.nearAgrees,true);
  assert.equal(pair.score,2);
  assert.equal(pair.classification,'match');
  assert.equal(result.merged,1);
  assert.equal(result.collection.features.length,1,'two records became one');
  assert.match(String(result.collection.features[0].properties.mergedFrom),/osm:a/);
  assert.match(String(result.collection.features[0].properties.mergedFrom),/hdx:b/);
});

test('agreeing on one test asks a person, and does not merge until answered',()=>{
  const layers=[
    layer('osm',[['a','Centre de Santé Ndosho',29.2,-1.65]]),
    layer('hdx',[['b','Centre de Santé Ndosho',far(29.2),-1.65]]),
  ];
  const result=deduplicatePoints(layers,params);
  const [pair]=result.candidates;
  assert.equal(pair.nameAgrees,true);
  assert.equal(pair.nearAgrees,false,'222 m apart is inside the block and outside the near distance');
  assert.equal(pair.classification,'review');
  assert.equal(result.merged,0,'the gate is on the merge');
  assert.equal(result.awaiting,1);
  assert.equal(result.collection.features.length,2);

  // A person answers, with a reason, pinned to what they were looking at.
  const decided=deduplicatePoints(layers,params,
    [{key:pair.key,decision:'match',reason:'Same compound, two surveys',signature:pairSignature(pair)}]);
  assert.equal(decided.merged,1);
  assert.equal(decided.awaiting,0);
  assert.equal(decided.collection.features.length,1);

  // And editing a record lapses the decision rather than letting it ride on changed data.
  const edited=structuredClone(layers);
  edited[1].features[0].properties.name='Centre de Santé Ndosho II';
  const lapsed=deduplicatePoints(edited,params,
    [{key:pair.key,decision:'match',reason:'Same compound, two surveys',signature:pairSignature(pair)}]);
  assert.equal(lapsed.merged,0,'the judgement was about the record as it was');
});

test('missing never agrees with missing',()=>{
  const result=deduplicatePoints([
    layer('osm',[['a',null,29.2,-1.65]]),
    layer('hdx',[['b',null,near(29.2),-1.65]]),
  ],params);
  const [pair]=result.candidates;
  assert.equal(pair.nameSimilarity,null,'there was nothing to compare');
  assert.equal(pair.nameAgrees,false);
  assert.equal(pair.score,1,'proximity alone');
  assert.equal(pair.classification,'review','two unnamed records in one place are a question, not an answer');
  assert.equal(result.merged,0);
});

test('blocking withholds pairs from comparison, and the count says how many',()=>{
  const result=deduplicatePoints([
    layer('osm',[['a','Clinic',29.2,-1.65]]),
    layer('hdx',[['b','Clinic',29.3,-1.65]]),
  ],params);
  assert.equal(result.candidates.length,0);
  assert.equal(result.compared,0);
  assert.equal(result.blocked,1,'11 km apart, never compared however well the names agree');
  assert.equal(result.collection.features.length,2);
});

test('a source is not deduplicated against itself, and a cluster holds one record per source',()=>{
  const result=deduplicatePoints([
    layer('osm',[['a','Clinic',29.2,-1.65],['a2','Clinic',near(29.2),-1.65]]),
    layer('hdx',[['b','Clinic',near(29.2),-1.65]]),
  ],params);
  // The two OSM records are never compared with each other.
  assert.equal(result.candidates.every(c=>c.a.sourceNodeId!==c.b.sourceNodeId),true);
  // Both OSM records match the HDX one, but a cluster may hold only one record from each source,
  // so the second edge is rejected rather than silently replacing the first.
  assert.equal(result.merged,1);
  assert.equal(result.collection.features.length,2);
});

test('a record with no usable location is carried through, never compared',()=>{
  const result=deduplicatePoints([
    layer('osm',[['a','Clinic',29.2,-1.65],['nowhere','Clinic',null,null]]),
    layer('hdx',[['b','Clinic',near(29.2),-1.65]]),
  ],params);
  assert.equal(result.compared,1);
  assert.equal(result.collection.features.length,2,'the merged pair, and the unplaceable record');
  assert.equal(result.collection.features.some(f=>f.id==='nowhere'),true);
});

test('a pair is named by its records, whichever way round they arrive',()=>{
  const forward=candidateKey({sourceNodeId:'osm',id:'a'},{sourceNodeId:'hdx',id:'b'});
  const backward=candidateKey({sourceNodeId:'hdx',id:'b'},{sourceNodeId:'osm',id:'a'});
  assert.equal(forward,backward);
});
