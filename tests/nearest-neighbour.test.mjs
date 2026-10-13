import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestOf,distanceKm} from '../build/nearest-neighbour.js';
import {nearestPlaces} from '../build/core.js';

const at=(lon,lat)=>({id:`${lon},${lat}`,coordinates:[lon,lat]});
const positionOf=c=>c.coordinates;

test('the nearest candidate wins, and the distance comes back with it',()=>{
  const match=nearestOf([0,0],[at(1,0),at(0.5,0),at(2,0)],positionOf);
  assert.equal(match.candidate.id,'0.5,0');
  assert.ok(Math.abs(match.kilometres-55.6)<0.5,`${match.kilometres} km`);
});

test('nothing to match against returns null rather than throwing',()=>{
  // Every caller has its own thing to say to a practitioner about an unmatched point, and a
  // thrown error would take that away.
  assert.equal(nearestOf([0,0],[],positionOf),null);
  assert.equal(nearestOf([0,0],[{id:'no geometry',coordinates:null}],positionOf),null);
});

test('candidates without a position are skipped, not counted',()=>{
  const match=nearestOf([0,0],[{id:'absent',coordinates:null},at(10,0)],positionOf);
  assert.equal(match.candidate.id,'10,0');
});

test('a tie goes to the first in the given order, which is why order is deliberate',()=>{
  const first=nearestOf([0,0],[at(1,0),at(-1,0)],positionOf);
  const reversed=nearestOf([0,0],[at(-1,0),at(1,0)],positionOf);
  assert.equal(first.candidate.id,'1,0');
  assert.equal(reversed.candidate.id,'-1,0');
  assert.equal(first.kilometres.toFixed(9),reversed.kilometres.toFixed(9));
});

test('a supplied distance function is used instead of the default',()=>{
  const match=nearestOf([0,0],[at(1,0),at(0,1)],positionOf,(a,b)=>Math.abs(b[1]-a[1]));
  // Under a latitude-only metric the point due east is at distance zero.
  assert.equal(match.candidate.id,'1,0');
  assert.equal(match.kilometres,0);
});

test('distanceKm is the haversine the three searches shared before the merge',()=>{
  assert.equal(distanceKm([0,0],[0,0]),0);
  // One degree of latitude at the equator, on a sphere of radius 6371.0088 km.
  assert.ok(Math.abs(distanceKm([0,0],[0,1])-111.195)<0.01,distanceKm([0,0],[0,1]));
  assert.equal(distanceKm([0,0],[0,1]).toFixed(6),distanceKm([0,1],[0,0]).toFixed(6),'symmetric');
});

// The merge must not change what any caller returns. This pins the general one.
test('nearestPlaces is unchanged by the merge: same winner, same distance, same reasons',()=>{
  const collection=features=>({type:'FeatureCollection',features});
  const point=(id,coordinates)=>({type:'Feature',id,properties:{name:id},geometry:coordinates?{type:'Point',coordinates}:null});
  const {rows}=nearestPlaces(
    collection([point('a',[0,0]),point('b',[10,0]),point('nowhere',null)]),
    collection([point('near',[0.1,0]),point('far',[11,0])]));
  assert.equal(rows[0].center.id,'near');
  assert.equal(rows[1].center.id,'far');
  // An unlocated place keeps its null distance and its stated reason, which is what lets the
  // policy rules answer Unknown instead of defaulting.
  assert.equal(rows[2].distance,null);
  assert.ok(rows[2].reason,'an unlocated place says why');
  // And every row states its unit, because a distance without one is not interpretable.
  assert.ok(rows.every(r=>r.unit==='kilometres'),'the default unit is stated on every row');
});

// The unit is a knob, and the knob is why three widgets could become one: `nearest` returned
// kilometres, `slr_site_assignment` metres. Both are the same measurement stated differently.
test('the unit is a parameter, and metres is a thousand times kilometres',()=>{
  const collection=features=>({type:'FeatureCollection',features});
  const point=(id,coordinates)=>({type:'Feature',id,properties:{name:id},geometry:{type:'Point',coordinates}});
  const places=collection([point('a',[0,0])]),centres=collection([point('near',[0.1,0])]);
  const km=nearestPlaces(places,centres,'kilometres').rows[0];
  const m=nearestPlaces(places,centres,'metres').rows[0];
  assert.equal(km.unit,'kilometres');
  assert.equal(m.unit,'metres');
  assert.ok(Math.abs(m.distance-km.distance*1000)<1e-6,`${m.distance} vs ${km.distance}*1000`);
});

/** The candidate filter, which is what `access` added over this widget.
 *
 *  Held as a knob rather than a widget by the test experiment 107 derived: a knob is honest when
 *  the contract does not move with it, and this changes only which candidates are eligible. Its
 *  two counts are the filter's provenance and live in this widget's receipt, where the exclusion
 *  and the search cannot disagree about what was considered.
 */
test('a candidate filter narrows the search by attribute and reports what it excluded',()=>{
  const point=(id,x,y,properties={})=>({type:'Feature',id,properties:{name:id,...properties},
    geometry:{type:'Point',coordinates:[x,y]}});
  const places={type:'FeatureCollection',features:[point('p',0,0)]};
  const candidates={type:'FeatureCollection',features:[
    point('near-but-ineligible',0.01,0,{tier:'None',service:'Unknown'}),
    point('far-but-eligible',1,0,{tier:'Direct',service:'Onsite'}),
  ]};

  const all=nearestPlaces(places,candidates,'kilometres');
  assert.equal(all.rows[0].center.id,'near-but-ineligible','with no filter the nearest wins');
  assert.equal(all.candidateCount,2);assert.equal(all.eligibleCount,2);

  // "evidence at least Contextual" compiles to a SET over the declared vocabulary rather than an
  // ordinal comparator, which is the same move by which OR compiles to one rule per disjunct.
  const filtered=nearestPlaces(places,candidates,'kilometres',
    [{field:'tier',comparator:'in',values:['Direct','Contextual']},
     {field:'service',comparator:'notIn',values:['Unknown']}]);
  assert.equal(filtered.rows[0].center.id,'far-but-eligible','the filter runs before the search');
  assert.equal(filtered.candidateCount,2,'located candidates, before narrowing');
  assert.equal(filtered.eligibleCount,1,'after narrowing');

  // A candidate missing the attribute fails the condition rather than passing it: an unrecorded
  // evidence level has not met a minimum evidence level, and the looser reading would quietly
  // widen the search.
  const unattributed={type:'FeatureCollection',features:[point('no-attributes',0.01,0)]};
  const strict=nearestPlaces(places,unattributed,'kilometres',
    [{field:'tier',comparator:'in',values:['Direct']}]);
  assert.equal(strict.eligibleCount,0);
  assert.equal(strict.rows[0].distance,null);
  assert.match(strict.rows[0].reason,/No candidate point with valid coordinates/);
});
