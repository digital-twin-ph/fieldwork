import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TYPES} from '../build/core.js';

// The port-type union is a closed contract, and a closed contract with a member nothing uses
// claims a port type the application does not have. `samples` sat in it and nowhere else until
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
// Raised from 6 to 7 on 2026-10-21, deliberately, and this is the reason. `coverage-check` had a
// producer and a consumer: the coverage check made one and a map drew it. The widget was retired,
// the map's port went with it, and the type is now produced by an archived definition and consumed
// by nothing -- which is what a stud is. It is not a new coupling; it is an old one losing its far
// end. It falls back to 6 when the archived definition is dropped, which this project does not do
// while a saved workflow may still name the type.
// Raised from 7 to 8 on 2026-10-27 for `ground`, deliberately, and the reason is a genuine
// tension between two admission criteria rather than an oversight.
//
// D4 asks whether a wrong producer needs a HARD STOP, and here it does: a georeferenced plate must
// not reach clip_raster or sample_raster, because sampling a printed map returns the colour of a
// line and sample_raster requires an author to state what a sampled value MEASURES. A separate
// port type makes that connection impossible instead of reporting it afterwards.
//
// D4a says a port type fitting only one other block is two things glued together. `ground` has one
// producer and one consumer today, so it is a stud by this file's own measure, and recording it
// honestly matters more than arguing it away.
//
// What would resolve it rather than excuse it: a SECOND PRODUCER. Natural Earth is currently a
// value in the basemap enumeration and is the same kind of thing -- a context layer drawn under
// the workflow -- so moving it to produce `ground` would shrink that enumeration and give the type
// a second end. If that does not happen, the honest conclusion is that `ground` never earned its
// own type and belongs folded back, which is the resolution this comment exists to make reachable.
// RAISED TO 9 ON 2026-10-31, for `design`. Deliberate, and the reason is the one D4a asks for:
// `study_design` is the sole producer and the epi widgets it governs mostly find it by WALKING
// upstream rather than by an edge, so the port has few consumers by construction rather than by
// accident. It is not two things glued together -- a design is not derivable from a table, which
// is exactly why it cannot ride on the `table` port. If step 3 wires the gate through edges
// instead of walks this gains consumers; if it does not, the honest conclusion is that the port
// never earned its own type and the walk is the whole mechanism. Experiment 154.
// AND BACK TO 8 THE SAME DAY, which is the ratchet working rather than against it. `design` was
// a stud for as long as `two_by_two` was its only consumer; `rate_ratio` gained the same optional
// port an hour later -- a rate ratio is a comparison, and what a comparison may be read as
// depends on the design that produced it -- so the port now fits two blocks and is not a stud.
// The 9 above stood for part of one afternoon and is left recorded rather than erased: a count
// that only ever goes down tells you nothing about which way it moved.
// THE COUNT IS RETIRED, 2026-11-05, AND EACH STUD STANDS ON ITS OWN REASON. The practitioner, asked whether this cap
// should go the way of the naming ledger's ceiling ("If that's another cap then it's a false one"): "Yes to custom
// studs but adjust as evidence emerges." A count of studs is a shared total: a needed port then has to be paid for by
// collapsing an unrelated one. What D4a actually asks is per port -- does a wrong producer need a hard stop, and what
// would resolve it -- so every stud is listed with that answer, and the list changes as evidence does: a stud that
// gains a second end is no longer one and must leave, and one whose reason stops holding is folded back. The history
// above is kept; the last count was 9.
const CUSTOM_STUDS={
  'alert':'Retired with its widgets; a retired producer still declares it, and it carries nothing live.',
  'facilities':'An archived definition still declares it; no live widget produces it.',
  'gradedFacilities':'Retired 2026-10-12 with xpert; kept so archived definitions resolve.',
  'access':'Retired 2026-10-12 with the access widget; kept so archived definitions resolve.',
  'coverage-check':'Produced by the retired coverage check and consumed by nothing live.',
  'ground':'A printed map must not reach clip_raster or sample_raster: sampling it returns the colour of a line. Resolved by a second producer (Natural Earth as ground), or folded back.',
  'mean-center':'The mean of point coordinates is not a polygon centroid; compare_point_sets is its consumer.',
  'point-comparison':'A two-set comparison drawn only by its own map.',
  'satellite-product':'A catalog search without a chosen product searches nothing (experiment 179, D4). One producer, find_satellite_products; one consumer, search_satellite_catalog.',
  // 'satellite-files' left this list 2026-11-11: Sample a raster reads it, and so does the archived definition of the
  // satellite sampler retired into it (experiment 205). Counted as two ends, one of them archived; one live reader.
};

// Old Naledi's archived definitions live in TYPES since it retired, 2026-11-11.
const definitions={...TYPES};
const union=[...new Set(readFileSync(new URL('../src/types.ts',import.meta.url),'utf8')
  .match(/export type PortType = ([^;]+);/)[1].match(/'([^']+)'/g).map(s=>s.slice(1,-1)))];

const producers={},consumers={};
for(const portType of union){producers[portType]=[];consumers[portType]=[];}
for(const [node,definition] of Object.entries(definitions)){
  if(definition.output&&producers[definition.output])producers[definition.output].push(node);
  for(const [,portType] of definition.inputs)if(consumers[portType])consumers[portType].push(node);
}
// `mean-center` is consumed only through nodeInputs' dynamic branch, when compare_point_sets
// declares centers, so the static declarations understate it by one.
consumers['mean-center']?.push('compare_point_sets (conditional)');

test('every port type in the union is produced by something',()=>{
  const dead=union.filter(c=>!producers[c].length&&!consumers[c].length);
  assert.deepEqual(dead,[],`dead port types in a closed union: ${dead.join(', ')}`);
});

test('every portType is either produced or consumed, and says which',()=>{
  for(const portType of union)
    assert.ok(producers[portType].length||consumers[portType].length,
      `${portType} is in PortType and nothing touches it`);
});

test('every custom stud states its own reason, and the list follows the evidence',()=>{
  const studs=union.filter(c=>producers[c].length<=1&&consumers[c].length<=1);
  const unexplained=studs.filter(c=>!CUSTOM_STUDS[c]?.trim());
  assert.deepEqual(unexplained,[],`${unexplained.join(', ')} fit${unexplained.length===1?'s':''} only one other block and `
    +`state${unexplained.length===1?'s':''} no reason. D4a: say why a wrong producer needs a hard stop here, and what would `
    +`resolve it, in CUSTOM_STUDS.`);
  // A port that gained a second end is no longer a stud: its entry must go, so the list says what is true today.
  const stale=Object.keys(CUSTOM_STUDS).filter(c=>!studs.includes(c));
  assert.deepEqual(stale,[],`${stale.join(', ')} ${stale.length===1?'is':'are'} no longer a custom stud: remove from CUSTOM_STUDS.`);
});

test('the six general port types carry most of the traffic',()=>{
  // The shape this project is converging on: a few port types used by many widgets, rather than a
  // port type per widget. Asserted so that a drift back toward per-widget port types shows up here.
  const general=['points','polygons','area','table','raster','network'];
  for(const portType of general)
    assert.ok(producers[portType].length+consumers[portType].length>=4,
      `${portType} is meant to be general and has ${producers[portType].length} producers and `
      +`${consumers[portType].length} consumers`);
  const generalTraffic=general.reduce((n,c)=>n+producers[c].length+consumers[c].length,0);
  const allTraffic=union.reduce((n,c)=>n+producers[c].length+consumers[c].length,0);
  // 79% as measured on 2026-10-12. The threshold is below it so that a small drift does not fail
  // the build, and far enough below the per-widget-portType shape that a real regression would.
  assert.ok(generalTraffic/allTraffic>0.75,
    `the general port types handle ${(generalTraffic/allTraffic*100).toFixed(0)}% of connections`);
});
