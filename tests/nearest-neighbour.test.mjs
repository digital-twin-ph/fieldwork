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
  const rows=nearestPlaces(
    collection([point('a',[0,0]),point('b',[10,0]),point('nowhere',null)]),
    collection([point('near',[0.1,0]),point('far',[11,0])]));
  assert.equal(rows[0].center.id,'near');
  assert.equal(rows[1].center.id,'far');
  // An unlocated place keeps its null distance and its stated reason, which is what lets the
  // policy rules answer Unknown instead of defaulting.
  assert.equal(rows[2].distanceKm,null);
  assert.ok(rows[2].reason,'an unlocated place says why');
});
