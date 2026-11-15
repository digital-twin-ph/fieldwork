import test from 'node:test';
import assert from 'node:assert/strict';
const {composeInset,boxInside,chooseCorner,niceMetres}=await import('../build/map-inset.js');
const {staticBoundaryMap,staticMapFrame}=await import('../build/static-map.js');

// Experiment 213: an enlarged part in a corner of the whole, or the whole small in a corner of the part.
const square=[[[126,34],[130,34],[130,38.5],[126,38.5],[126,34]]];
const hospitals=[[126.98,37.57],[126.99,37.58],[127.0,37.56],[127.01,37.57],[129.07,35.18]];
const output={kind:'spatial-map',boundary:{type:'Polygon',coordinates:square},centers:[],
  rows:hospitals.map((c,i)=>({id:`h${i}`,name:`H${i}`,coordinates:c,status:'NoFlag',sourceNodeId:'hosp'})),
  layerSymbols:{hosp:{colour:'#2b6cb0',shape:'circle',size:5}}};
const box=[126.8,37.4,127.2,37.75];
const drawing=b=>{const f=staticMapFrame(output,b);return {content:staticBoundaryMap(output,null,s=>s,()=>'',{},b),height:f.height,project:f.project,scale:f.scale};};

test('a box inside the map is accepted, one reaching outside it is not',()=>{
  const whole=staticMapFrame(output).bounds;
  assert.equal(boxInside(box,whole),true);
  assert.equal(boxInside([125,37,127,38],whole),false);
  assert.equal(boxInside([127,37,126.5,38],whole),false);
});

test('the inset: the box on the whole, the part in a framed corner, two lines between them, a scale bar',()=>{
  const r=composeInset(drawing(),drawing(box),{box},hospitals);
  assert.equal((r.content.match(/data-inset-box/g)||[]).length,1);
  assert.equal((r.content.match(/data-inset-line/g)||[]).length,2);
  assert.match(r.content,/<svg data-inset-frame [^>]*viewBox="0 0 850 \d+"/);
  assert.match(r.content,/data-inset-scale[\s\S]*?(\d+ km|\d+ m)<\/text>/);
  // The frame never covers the box it enlarges.
  assert.ok(['ne','nw','se','sw'].includes(r.corner));
});

test('marks keep their size, so hospitals that overlap on the whole stand apart in the inset',()=>{
  const whole=drawing(),part=drawing(box);
  const gap=(d)=>{const [a,b]=[d.project(hospitals[0]),d.project(hospitals[1])];return Math.hypot(a[0]-b[0],a[1]-b[1]);};
  assert.ok(gap(whole)<10,`on the whole they are ${gap(whole)} px apart`);
  assert.ok(gap(part)>=10,`in the inset they are ${gap(part)} px apart`);
  // The same mark, measured in both drawings: its width is the same, so the inset enlarges distances, not marks.
  const radius=d=>Number(/data-place="h0"[\s\S]*?<path d="M[^"]*?a([\d.]+),/.exec(d.content)[1]);
  assert.equal(radius(whole),radius(part));assert.equal(radius(part),5);
});

test('the same marks, the same colour, in both frames',()=>{
  const r=composeInset(drawing(),drawing(box),{box},hospitals);
  const [outside,inside]=r.content.split('<svg data-inset-frame');
  assert.ok(outside.includes('#2b6cb0')&&inside.includes('#2b6cb0'));
});

test('the locator: the part is the figure, the whole small in a corner with the box on it, no lines',()=>{
  const part=drawing(box);
  const r=composeInset(drawing(),part,{box,arrange:'locator',corner:'sw'},hospitals);
  assert.equal(r.height,part.height);
  assert.equal(r.corner,'sw');
  const inside=r.content.split('<svg data-inset-frame')[1];
  assert.match(inside,/data-inset-box/);
  assert.equal((r.content.match(/data-inset-line/g)||[]).length,0);
});

test('a corner is chosen where the frame covers fewest points, and never over the box',()=>{
  const points=[[800,20],[790,30],[60,20],[60,270]];
  assert.equal(chooseCorner(points,200,100,295),'se');
  assert.notEqual(chooseCorner([],200,100,295,{x:700,y:10,w:100,h:50}),'ne');
  assert.equal(niceMetres(7300),5000);assert.equal(niceMetres(180),100);
});

test('drawn for a frame a third as wide, the inset\'s marks are drawn three times larger: the same size on the page',async()=>{
  const {insetWidth}=await import('../build/map-inset.js');
  const shrink=850/insetWidth({});
  const radius=content=>Number(/data-place="h0"[\s\S]*?<path d="M[^"]*?a([\d.]+),/.exec(content)[1]);
  const whole=staticBoundaryMap(output,null,s=>s,()=>'',{});
  const part=staticBoundaryMap(output,null,s=>s,()=>'',{},box,shrink);
  assert.ok(Math.abs(radius(part)/shrink-radius(whole))<1e-9);
});
