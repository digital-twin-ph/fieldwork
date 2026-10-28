import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateNames} from '../scripts/validate-names.mjs';
import {fingerprint, rows, markdown} from '../scripts/widget-names.mjs';

const review=JSON.parse(readFileSync(new URL('../widgets/name-review.json',import.meta.url),'utf8'));
const row=(over={})=>{const r={nodeType:'clip_raster',title:'Clip raster',group:'Spatial operations',
  classification:'standard',pack:null,offered:'always',ports:'raster:raster',output:'raster',...over};
  return {...r,fingerprint:fingerprint(r)};};
const entry=(over={})=>({nodeType:'clip_raster',title:'Clip raster',group:'Spatial operations',
  fingerprint:fingerprint({nodeType:'clip_raster',title:'Clip raster',group:'Spatial operations'}),
  verdict:'pending',reviewed:null,reviewedBy:null,...over});
const ledger=(reviews,over={})=>({pendingCeiling:reviews.length,reviews,...over});

test('a widget with no review entry fails the gate', ()=>{
  assert.throws(()=>validateNames({rows:[row()],review:ledger([])}),/has no entry/);
});

test('a review goes stale when the title or the group changes', ()=>{
  // The case this exists for: "Reproject input" survived under Sources because nothing re-read
  // the three together.
  assert.throws(()=>validateNames({rows:[row({title:'Clip raster input'})],review:ledger([entry()])}),
    /review is stale/);
  assert.throws(()=>validateNames({rows:[row({group:'Sources'})],review:ledger([entry()])}),
    /review is stale/);
  assert.doesNotThrow(()=>validateNames({rows:[row()],review:ledger([entry()])}));
});

test('the fingerprint covers exactly the three things a reviewer judges', ()=>{
  const base={nodeType:'a',title:'A',group:'G'};
  assert.equal(fingerprint(base),fingerprint({...base,ports:'anything',offered:'always'}),
    'ports and palette placement are shown for context, not reviewed');
  for(const field of ['nodeType','title','group'])
    assert.notEqual(fingerprint(base),fingerprint({...base,[field]:'changed'}),`${field} must be covered`);
});

test('an acceptance needs a signature, and a flag needs a note', ()=>{
  assert.throws(()=>validateNames({rows:[row()],review:ledger([entry({verdict:'accepted'})])}),
    /without a reviewer and a date/);
  assert.throws(()=>validateNames({rows:[row()],review:ledger([entry({verdict:'flagged'})])}),
    /flagged with no note/);
  assert.doesNotThrow(()=>validateNames({rows:[row()],
    review:ledger([entry({verdict:'accepted',reviewed:'2026-10-13',reviewedBy:'practitioner'})])}));
});

test('an unknown verdict is refused', ()=>{
  assert.throws(()=>validateNames({rows:[row()],review:ledger([entry({verdict:'ok'})])}),
    /not one of/);
});

test('a review of a widget that no longer exists must be removed', ()=>{
  assert.throws(()=>validateNames({rows:[],review:ledger([entry()])}),/not a live widget/);
});

test('the pending ceiling cannot be exceeded', ()=>{
  assert.throws(()=>validateNames({rows:[row()],review:ledger([entry()],{pendingCeiling:0})}),
    /ceiling may be lowered, never raised/);
});

test('a flag is reported rather than swallowed', ()=>{
  const result=validateNames({rows:[row()],
    review:ledger([entry({verdict:'flagged',note:'Names the method, not the operation.'})])});
  assert.deepEqual(result.flagged,[{nodeType:'clip_raster',title:'Clip raster',
    note:'Names the method, not the operation.'}]);
});

test('the shipped ledger passes and covers every live widget', ()=>{
  const classification=JSON.parse(readFileSync(new URL('../widgets/classification.json',import.meta.url),'utf8'));
  const live=classification.widgets.filter(w=>!w.retired).map(w=>w.nodeType).sort();
  assert.deepEqual(review.reviews.map(r=>r.nodeType).sort(),live,
    'every live widget has a review entry and no retired one does');
  // 47 on 2026-10-20, when clip_points_to_area arrived -- the point-in-polygon operation that
  // existed as a predicate in five modules and as a report in two, and as a widget nowhere.
  // 46 on 2026-10-21, when coverage_check was retired into it: a widget that reports a membership
  // and a widget that acts on one were the same question asked twice. 47 the same day, with
  // deduplicate_points: two sources over one area draw the same hospital twice, and nothing could
  // say which records were the same place. 48 on 2026-10-25, with join_table_to_area: a table
  // of rates and a boundary of named parts had no way to meet, so a choropleth could not be
  // drawn from measured values at all. 49 the same day, with rate_ratio: the framework could map
  // Snow's mortality rates and had nothing that compared two of them, so it could state his
  // measure and not his argument. The first addition to raise pendingCeiling, under the rule the
  // practitioner set that day -- a widget may be added if its function did not exist before.
  // 48 on 2026-10-25: alert retired, and a review of a widget that no longer exists must go.
  // The first time this count has fallen because a widget LEFT rather than because one arrived.
  // 47 on 2026-10-26: slr_extract_import retired into apply_ruleset with the extract-contract
  // ruleset, the second removal and the first of the three sea-level widgets.
  // 53 on 2026-10-27, with map_image_input: a georeferenced plate drawn as ground. The South
  // London example had carried map2-georeference.json, two world files and the plate's digests
  // since 2026-10-24 with no widget able to read any of them. The second addition to raise
  // pendingCeiling under the practitioner's rule. Its near miss is raster_input, and what keeps
  // them apart is not the band count -- multi-band is coming for satellite imagery -- but whether
  // an author can state what a sampled value MEASURES, which a printed map never can.
  // 49 on 2026-10-26: derive_value and select_rows, arithmetic over a table and selection of its
  // rows. Both raise pendingCeiling under the same rule -- a widget may be added if its function
  // did not exist before -- and both are PENDING, because a verdict on a name is a practitioner's
  // judgement and not its author's. The count rises on the same day it fell, and the two sea-level
  // widgets that would pay for them are deferred in TODO.md rather than traded here.
  // 52 on 2026-10-26: relate_table, group_table and two_by_two, the epi kernel's first three
  // operations. All three PENDING for the same reason, and pendingCeiling raised by three under
  // the same rule. The practitioner, asked the budget question that afternoon: "I am not worried
  // about increasing the widgets because I see some more widgets to retire" -- so the room is
  // promised from retirements they will name, and this count records the rise rather than a trade
  // that has not happened.
  // 54 on 2026-10-28, with polygon_input: a polygon layer READ rather than derived. Seven node
  // types emitted the polygons port type and every one of them computed its polygons from
  // something else, so a layer that existed as a file had no way in -- and South London's three
  // traced territories had sat in that repository since 2026-10-24 and reached a workflow never.
  // The third addition to raise pendingCeiling under the practitioner's rule, and PENDING for the
  // same reason as the others: a verdict on a name is a practitioner's judgement, not its author's.
  // Its near miss is study_area, and what keeps them apart is frame against layer -- one boundary
  // the workflow is about, against many attributed features inside it. The practitioner settled
  // that by revising the study area to the extent enclosing Snow's Map 2.
  assert.equal(review.reviews.length,54);
});

test('the generated table shows the palette words beside the identifier', ()=>{
  const definitions={clip_raster:{title:'Clip raster',group:'Spatial operations',icon:'x',color:'t',
    description:'d',inputs:[['raster','raster']],output:'raster'}};
  const palette={PALETTE_GROUPS:['Spatial operations'],INPUT_STAGE:new Set(['point_input']),
    ADDABLE_VIA_COMPOSITION:[],ADDABLE_VIA_RULESET:[]};
  const list=rows({definitions,classification:{widgets:[{nodeType:'clip_raster',classification:'standard'}]},palette});
  assert.equal(list[0].offered,'once the canvas holds an input');
  const text=markdown({rows:list,review:{reviews:[]},stampedAt:'2026-10-13'});
  assert.match(text,/\| `clip_raster` \| Clip raster \|/);
  assert.match(text,/never reviewed/);
});

test('a domain widget offered everywhere is visible in the table, not merely recorded', ()=>{
  // The contradiction this table is meant to surface: widgets/classification.json types the three
  // slr_ widgets as domain while src/palette.ts offers them whatever example is loaded. Sharper
  // since 2026-10-19, not resolved: addableTypes stopped consulting a curated list and now offers
  // every live widget once the canvas holds an input, so a domain widget is offered in every
  // workflow by rule rather than by having been listed.
  const classification=JSON.parse(readFileSync(new URL('../widgets/classification.json',import.meta.url),'utf8'));
  const text=readFileSync(new URL('../docs/widget-names.md',import.meta.url),'utf8');
  for(const widget of classification.widgets.filter(w=>w.classification==='domain'&&!w.retired))
    assert.match(text,new RegExp(`\`${widget.nodeType}\`.*domain.*once the canvas holds an input`),
      `${widget.nodeType} should be visible as a domain widget offered in every workflow`);
});
