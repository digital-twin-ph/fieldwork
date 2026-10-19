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
  assert.equal(review.reviews.length,46);
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
