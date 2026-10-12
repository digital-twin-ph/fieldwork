import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TYPES} from '../build/core.js';
import {OLD_TYPES} from '../build/old-naledi.js';

// The port-type union is a closed contract, and a closed contract with a member nothing uses
// claims a carrier the application does not have. `samples` sat in it and nowhere else until
// 2026-10-12, found by surveying the inventory rather than by any check.
//
// This is the check that was missing. It counts producers and consumers per port type from the
// declarations themselves, and refuses a dead one.
//
// It does NOT refuse a CUSTOM STUD -- D4a's term for a port type that fits only one other block,
// measured here as at most one producer and at most one consumer. Six exist today and removing
// them is the port work in docs/experiments/105-five-directions.md. They are counted so the
// number cannot drift upward unnoticed while that work is pending.
//
// D4a's vocabulary is used deliberately. An earlier version of this file called them "private
// pipes", which named nothing: the canvas has nodes, ports and connectors, and a single-producer
// single-consumer relationship is a property of a port type rather than a new kind of object.
const CUSTOM_STUDS_TODAY=6;

const definitions={...TYPES,...OLD_TYPES};
const union=[...new Set(readFileSync(new URL('../src/types.ts',import.meta.url),'utf8')
  .match(/export type PortType = ([^;]+);/)[1].match(/'([^']+)'/g).map(s=>s.slice(1,-1)))];

const producers={},consumers={};
for(const carrier of union){producers[carrier]=[];consumers[carrier]=[];}
for(const [node,definition] of Object.entries(definitions)){
  if(definition.output&&producers[definition.output])producers[definition.output].push(node);
  for(const [,carrier] of definition.inputs)if(consumers[carrier])consumers[carrier].push(node);
}
// `mean-center` is consumed only through nodeInputs' dynamic branch, when compare_point_sets
// declares centers, so the static declarations understate it by one.
consumers['mean-center']?.push('compare_point_sets (conditional)');

test('every carrier in the union is produced by something',()=>{
  const dead=union.filter(c=>!producers[c].length&&!consumers[c].length);
  assert.deepEqual(dead,[],`dead carriers in a closed union: ${dead.join(', ')}`);
});

test('every carrier is either produced or consumed, and says which',()=>{
  for(const carrier of union)
    assert.ok(producers[carrier].length||consumers[carrier].length,
      `${carrier} is in PortType and nothing touches it`);
});

test('the number of custom studs does not grow unnoticed',()=>{
  const studs=union.filter(c=>producers[c].length<=1&&consumers[c].length<=1);
  assert.ok(studs.length<=CUSTOM_STUDS_TODAY,
    `custom studs rose to ${studs.length} (${studs.join(', ')}). D4a: a block with a connector `
    +`that fits only one other block is not a block, it is two things glued together and shipped `
    +`as one. Collapsing them is what turns the blocked merges into renames. Adding one is `
    +`allowed and must be deliberate: update CUSTOM_STUDS_TODAY and say why in the commit.`);
  if(studs.length<CUSTOM_STUDS_TODAY)
    assert.fail(`custom studs fell to ${studs.length}, which is the direction this is for — `
      +`lower CUSTOM_STUDS_TODAY to ${studs.length} so the number keeps meaning something.`);
});

test('the six general carriers carry most of the traffic',()=>{
  // The shape this project is converging on: a few port types used by many widgets, rather than a
  // port type per widget. Asserted so that a drift back toward per-widget carriers shows up here.
  const general=['points','polygons','area','table','raster','network'];
  for(const carrier of general)
    assert.ok(producers[carrier].length+consumers[carrier].length>=4,
      `${carrier} is meant to be general and has ${producers[carrier].length} producers and `
      +`${consumers[carrier].length} consumers`);
  const generalTraffic=general.reduce((n,c)=>n+producers[c].length+consumers[c].length,0);
  const allTraffic=union.reduce((n,c)=>n+producers[c].length+consumers[c].length,0);
  // 79% as measured on 2026-10-12. The threshold is below it so that a small drift does not fail
  // the build, and far enough below the per-widget-carrier shape that a real regression would.
  assert.ok(generalTraffic/allTraffic>0.75,
    `the general carriers handle ${(generalTraffic/allTraffic*100).toFixed(0)}% of connections`);
});
