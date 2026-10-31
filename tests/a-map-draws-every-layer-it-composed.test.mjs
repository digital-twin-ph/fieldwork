/** THE SIXTH TIME A WINNING RENDERER DROPPED A WIRED LAYER.
 *
 *  Found 2026-10-31 by building South London's eighth workflow BY HAND from the palette — a study
 *  area, a cleaned river, 32 sub-districts and four water intakes on one Map. The polygons drew
 *  and the four points did not, while the layer control offered a checkbox for them and the
 *  Sources line named them.
 *
 *  `core.ts` names the first five and fixed each in the COMPOSITION. This one is in the drawing:
 *  the value carried the rows correctly and `polygonSvg` does not read them, which is why
 *  composing correctly did not catch it. One function now draws them for the live map and for
 *  the write-up's figure, so the published figure cannot disagree with the screen.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {markedPoints} from '../build/point-layers.js';
import {markPath} from '../build/presentation.js';

const esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const project=c=>[(c[0]+0.34)*1000,(51.52-c[1])*1000];
const base={esc,markPath};
const row=(over={})=>({id:'r1',name:'Teddington Lock',coordinates:[-0.3237,51.4314],
  sourceNodeId:'intakes',layerLabel:'Water intakes',relation:'Inside',...over});

test('a located record is drawn where the projection puts it',()=>{
  const svg=markedPoints([row()],project,base);
  assert.match(svg,/data-place="r1"/);
  assert.match(svg,/data-layer="intakes"/);
  assert.match(svg,/<title>Teddington Lock · Inside · Water intakes<\/title>/);
});

test('A RECORD WITH NO LOCATION IS NOT DRAWN AT A GUESSED ONE',()=>{
  assert.equal(markedPoints([row({coordinates:null})],project,base),'');
  // Nor one the projection sends nowhere finite: a mark at NaN is an invisible lie, not a mark.
  assert.equal(markedPoints([row()],()=>[NaN,NaN],base),'');
});

test('a layer switched off is not drawn, and the others still are',()=>{
  const rows=[row(),row({id:'r2',sourceNodeId:'other',name:'Battersea'})];
  const svg=markedPoints(rows,project,{...base,hidden:new Set(['intakes'])});
  assert.ok(!svg.includes('data-place="r1"'));
  assert.match(svg,/data-place="r2"/);
});

test('OUTSIDE IS HOLLOW AND SET ASIDE IS NEUTRAL, the two declarations `oldMap` already makes',()=>{
  // One map must not say Outside in two different ways depending on which renderer led.
  assert.match(markedPoints([row({relation:'Outside'})],project,base),/fill="none"/);
  assert.match(markedPoints([row({excluded:true})],project,base),/fill="#a89b87"/);
});

test('the layer symbol decides hue and shape, and a pin class overrides the hue',()=>{
  const symbols={intakes:{colour:'#123456',shape:'square'}};
  const plain=markedPoints([row()],project,{...base,symbols});
  assert.match(plain,/fill="#123456"/);
  const classed=markedPoints([row({pinClass:'Lambeth'})],project,
    {...base,symbols,classes:{intakes:[{value:'Lambeth',colour:'#abcdef'}]}});
  assert.match(classed,/fill="#abcdef"/);
});

test('the focused record is drawn larger, and nothing else changes',()=>{
  const normal=markedPoints([row()],project,base);
  const focused=markedPoints([row()],project,{...base,focusId:'r1'});
  assert.notEqual(normal,focused);
  assert.match(focused,/data-place="r1"/);
});

/** NAMING A MARK ON A PUBLICATION FIGURE.
 *
 *  Map 3 of the South London example wants its four points named — two intakes, the Lambeth
 *  intake after the move, and Teddington Lock — because a reader cannot tell them apart from
 *  marks in a key. No static renderer could print a name beside a mark until 2026-10-31.
 */
import {markLabel,LABEL_CEILING} from '../build/point-layers.js';

const named=(over={})=>({id:'r1',name:'Teddington Lock',coordinates:[-0.3237,51.4314],
  sourceNodeId:'intakes',relation:'Inside',attributes:{name:'Teddington Lock',company:'—'},...over});

test('A MARK IS NAMED FROM THE PROPERTY SOMEBODY NOMINATED, never from one called `name`',()=>{
  assert.equal(markLabel(named(),undefined,10,10,4,esc),'','an unnominated layer was named anyway');
  assert.match(markLabel(named(),'name',10,10,4,esc),/>Teddington Lock</);
  assert.match(markLabel(named(),'company',10,10,4,esc),/>—</);
  // A property the record does not carry names nothing, rather than printing "undefined".
  assert.equal(markLabel(named(),'missing',10,10,4,esc),'');
  assert.equal(markLabel(named({attributes:{name:'   '}}),'name',10,10,4,esc),'','blank became a label');
});

test('the name is drawn clear of the mark and stroked so it reads over a plate',()=>{
  const svg=markLabel(named(),'name',100,50,4,esc);
  assert.match(svg,/x="107\.0"/);           // mark centre + radius + 3
  assert.match(svg,/paint-order="stroke"/); // halo under the ink, like markHalo
});

test('A LAYER OVER THE CEILING IS DRAWN UNNAMED, and the ceiling is on the DRAWN marks',()=>{
  // 250 death locations named would be a black rectangle. The limit is legibility, so it is
  // applied to what is drawn rather than to what the layer holds.
  const many=Array.from({length:LABEL_CEILING+1},(_,i)=>
    named({id:'r'+i,coordinates:[-0.2+i*0.001,51.5],attributes:{name:'Site '+i}}));
  const over=markedPoints(many,project,{...base,labelField:{intakes:'name'}});
  assert.equal((over.match(/<text/g)||[]).length,0);
  const under=markedPoints(many.slice(0,LABEL_CEILING),project,{...base,labelField:{intakes:'name'}});
  assert.equal((under.match(/<text/g)||[]).length,LABEL_CEILING);
});

test('a hidden layer does not spend the ceiling on behalf of a visible one',()=>{
  const bulk=Array.from({length:LABEL_CEILING+5},(_,i)=>
    named({id:'b'+i,sourceNodeId:'deaths',coordinates:[-0.2,51.5],attributes:{name:'d'+i}}));
  const svg=markedPoints([...bulk,named()],project,
    {...base,hidden:new Set(['deaths']),labelField:{intakes:'name',deaths:'name'}});
  assert.match(svg,/>Teddington Lock</);
  assert.equal((svg.match(/<text/g)||[]).length,1);
});
