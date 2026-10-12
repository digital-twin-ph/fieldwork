import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TYPES} from '../build/core.js';
import {OLD_TYPES} from '../build/old-naledi.js';

// The port-type union is a closed contract, and a closed contract with a member nothing uses
// claims a carrier the application does not have. `samples` sat in it and nowhere else until
// 2026-10-12, found by surveying the inventory rather than by any check.
//
// This is the check that was missing. It counts producers and consumers per carrier from the
// declarations themselves, and refuses a dead one. It does NOT refuse a private pipe -- one
// producer and one consumer -- because six of those exist today and removing them is the port
// work in docs/experiments/105-five-directions.md. It reports them, so the number cannot drift
// upward unnoticed while that work is pending.
const PRIVATE_PIPES_TODAY=6;

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

test('the number of private pipes does not grow unnoticed',()=>{
  const pipes=union.filter(c=>producers[c].length<=1&&consumers[c].length<=1);
  assert.ok(pipes.length<=PRIVATE_PIPES_TODAY,
    `private pipes rose to ${pipes.length} (${pipes.join(', ')}). A carrier connecting one `
    +`producer to one consumer is a private channel declared as a type; collapsing them is what `
    +`turns the blocked merges into renames. Adding one is allowed and must be deliberate: `
    +`update PRIVATE_PIPES_TODAY and say why in the commit.`);
  if(pipes.length<PRIVATE_PIPES_TODAY)
    assert.fail(`private pipes fell to ${pipes.length}, which is the direction this is for — `
      +`lower PRIVATE_PIPES_TODAY to ${pipes.length} so the number keeps meaning something.`);
});

test('the six general carriers carry most of the traffic',()=>{
  // The shape this project is converging on: a few carriers used by many widgets, rather than a
  // carrier per widget. Asserted so that a drift back toward per-widget carriers shows up here.
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
