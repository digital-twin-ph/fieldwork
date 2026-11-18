import test from 'node:test';
import assert from 'node:assert/strict';
const {composeInset,boxInside,chooseCorner,niceMetres,outerTangents,focusDiameter}=await import('../build/map-inset.js');
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

test('a locator\'s box is never under 18 px on the page, however small the part is in the whole',()=>{
  const tiny=[126.98,37.56,126.99,37.57];
  const r=composeInset(drawing(),drawing(tiny),{box:tiny,arrange:'locator'},hospitals);
  const inside=r.content.split('<svg data-inset-frame')[1];
  const width=Number(/data-inset-box x="[^"]+" y="[^"]+" width="([\d.]+)"/.exec(inside)[1]);
  assert.ok(width>=18*3-1e-9,`${width} units, a third-wide frame`);
});

test('A LOCATOR NAMES THE WHOLE: the boundary named in its frame, escaped; an inset, whose frame is the part, does not',()=>{
  const box=[-76.42,43.48,-76.36,43.52];
  const locator=composeInset(drawing(),drawing(box),{box,arrange:'locator'},[],{whole:'New York <State>'});
  assert.match(locator.content,/data-inset-name/);
  assert.match(locator.content,/New York &lt;State&gt;/);
  assert.match(locator.content,/font-size="15"/);
  assert.doesNotMatch(composeInset(drawing(),drawing(box),{box},[],{whole:'New York'}).content,/data-inset-name/);
  assert.doesNotMatch(composeInset(drawing(),drawing(box),{box,arrange:'locator'}).content,/data-inset-name/);
});

// SQUARE FOR OVERVIEW, CIRCLE FOR FOCUS (the practitioner, 2026-11-18).
test('the focus inset is a circle: a circle round the part, the part in a circular frame, joined along the outer tangents',()=>{
  const r=composeInset(drawing(),drawing(box),{box},hospitals,{focus:'Gyeonggi'});
  assert.match(r.content,/<circle data-inset-box /);
  assert.match(r.content,/<circle data-inset-circle /);
  assert.match(r.content,/<clipPath id="focus-[^"]+"><circle /);
  assert.equal((r.content.match(/data-inset-line/g)||[]).length,2);
  assert.match(r.content,/data-inset-name[\s\S]*?Gyeonggi/);
  assert.doesNotMatch(composeInset(drawing(),drawing(box),{box},hospitals).content,/data-inset-name/);
  // The overview stays a square: no circle in it.
  assert.doesNotMatch(composeInset(drawing(),drawing(box),{box,arrange:'locator'}).content,/<circle data-inset/);
});

test('the joining lines touch both circles and do not cross between them',()=>{
  const a={x:100,y:300,r:20},b={x:600,y:120,r:150};
  const lines=outerTangents(a,b);
  assert.equal(lines.length,2);
  for(const [x1,y1,x2,y2] of lines){
    assert.ok(Math.abs(Math.hypot(x1-a.x,y1-a.y)-a.r)<1e-6);
    assert.ok(Math.abs(Math.hypot(x2-b.x,y2-b.y)-b.r)<1e-6);
    // Tangent: each line is at right angles to the radius at both ends.
    const dx=x2-x1,dy=y2-y1;
    assert.ok(Math.abs(dx*(x1-a.x)+dy*(y1-a.y))<1e-6*Math.hypot(dx,dy)*a.r+1e-6);
  }
  assert.deepEqual(outerTangents({x:0,y:0,r:50},{x:5,y:0,r:10}),[]);
});

test('a focus circle is the size chosen, but never more than 40% of the map\'s shorter side, and says when held',()=>{
  assert.deepEqual(focusDiameter({},900),{diameter:283,limited:false});
  assert.deepEqual(focusDiameter({size:'half'},900),{diameter:340,limited:true});
  assert.deepEqual(focusDiameter({size:'half'},500),{diameter:200,limited:true});
  const r=composeInset(drawing(),drawing(box),{box,size:'half'},hospitals);
  const d=Number(/<circle data-inset-circle cx="[\d.]+" cy="[\d.]+" r="([\d.]+)"/.exec(r.content)[1])*2;
  assert.ok(d<=0.4*Math.min(850,r.height)+1,`diameter ${d}, height ${r.height}`);
});
