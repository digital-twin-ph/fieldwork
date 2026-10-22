import test from 'node:test';
import assert from 'node:assert/strict';
import {planTiles,mergeNetworks,elementsPerRequest,junctionsIn,tileMeetsArea,seamDegrees} from '../build/network-tiles.js';

const square=(w,s,e,n)=>({type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]});
const ITURI=square(28.1,0.2,31.5,3.7);
const bounds=b=>{const r=b.coordinates[0];return [r[0][0],r[0][1],r[2][0],r[2][1]];};

// The grid is the service's count divided by what one response carries -- never a chosen tile
// size. A cap decides in advance how much a practitioner may have; this decides how many
// questions to ask for all of it.
test('a sparse area is one tile, and stays an ordinary download',()=>{
  const plan=planTiles(ITURI,5_000,2_000_000);
  assert.equal(plan.side,1);
  assert.equal(plan.tiles.length,1);
  assert.deepEqual(bounds(plan.tiles[0]).map(n=>Number(n.toFixed(4))),[28.1,0.2,31.5,3.7],
    'one tile is the area itself, with no overlap to heal');
});

test('a dense area is split by what the count says, not by a number we picked',()=>{
  const perRequest=2_000_000;
  const plan=planTiles(ITURI,8_000_000,perRequest);
  // Four requests' worth of data needs more than four tiles, because each tile carries a seam
  // and the seam is part of what gets requested. Sizing on the bare tile is what made every
  // tile a fraction over budget.
  assert.ok(plan.tiles.length>4,'the grid is sized on the padded tile');
  for(const tile of plan.tiles){
    const [w,s,e,n]=bounds(tile);
    const share=((e-w)/3.4)*((n-s)/3.5);
    assert.ok(8_000_000*share<=perRequest,'and every tile fits in one request');
  }
  // Twice the data is more tiles, which is the property that matters: the area is never refused
  // for being large, it is only ever divided more finely.
  assert.ok(planTiles(ITURI,36_000_000,perRequest).tiles.length>plan.tiles.length);
});

test('the tiles cover the whole area and overlap their neighbours',()=>{
  const plan=planTiles(ITURI,8_000_000,2_000_000);
  const [west,south,east,north]=[28.1,0.2,31.5,3.7];
  const all=plan.tiles.map(bounds);
  assert.equal(Math.min(...all.map(b=>b[0])),west,'the west edge is covered');
  assert.equal(Math.min(...all.map(b=>b[1])),south,'the south edge is covered');
  assert.equal(Math.max(...all.map(b=>b[2])),east,'the east edge is covered');
  assert.equal(Math.max(...all.map(b=>b[3])),north,'the north edge is covered');
  // Neighbours share a strip, so a way crossing the seam has its nodes in at least one tile.
  const row=all.filter(b=>Math.abs(b[1]-south)<1e-9).sort((a,b)=>a[0]-b[0]);
  assert.ok(row.length>1&&row[0][2]>row[1][0],'adjacent tiles overlap rather than abut');
  // The seam is a DISTANCE: the download margin, in degrees, on each side of the join. It does
  // not grow with the province, which is what let a grid planned for four requests ask for nine.
  assert.ok(Math.abs((row[0][2]-row[1][0])-2*seamDegrees(250))<1e-9,'two margins wide');
});

test('no tile escapes the study area bounds',()=>{
  for(const tile of planTiles(ITURI,8_000_000,2_000_000).tiles){
    const [w,s,e,n]=bounds(tile);
    assert.ok(w>=28.1&&s>=0.2&&e<=31.5&&n<=3.7,'overlap is clipped at the outer edge');
  }
});

// One graph out of many responses, and the seams are the whole difficulty.
const net=(nodes,edges)=>({nodes:nodes.map(id=>({id,coordinates:[0,0]})),
  edges:edges.map(([from,to,geometry])=>({from,to,lengthM:10,...(geometry?{geometry}:{})})),source:'t'});

test('the same junction in two tiles is one junction',()=>{
  const merged=mergeNetworks([net(['a','b'],[['a','b']]),net(['b','c'],[['b','c']])],'tiled');
  assert.deepEqual(merged.nodes.map(n=>n.id).sort(),['a','b','c']);
  assert.equal(merged.edges.length,2);
  assert.equal(merged.droppedEdges,0);
});

test('a one-way street is not merged with its reverse',()=>{
  const merged=mergeNetworks([net(['a','b'],[['a','b'],['b','a']])],'tiled');
  assert.equal(merged.edges.length,2,'direction is part of a segment’s identity');
});

test('an edge whose far end never arrived is dropped, and counted',()=>{
  const merged=mergeNetworks([net(['a'],[['a','ghost']])],'tiled');
  assert.equal(merged.edges.length,0);
  assert.equal(merged.droppedEdges,1,'a seam that failed to heal is reported, not hidden');
});

test('the copy carrying geometry wins over the bare one',()=>{
  const bare=net(['a','b'],[['a','b']]);
  const drawn=net(['a','b'],[['a','b',[[0,0],[1,1]]]]);
  for(const order of [[bare,drawn],[drawn,bare]]){
    const merged=mergeNetworks(order,'tiled');
    assert.equal(merged.edges.length,1);
    assert.ok(merged.edges[0].geometry,'whichever tile carried the shape, the shape survives');
  }
});

test('what one response carries, and what that is in junctions',()=>{
  assert.equal(elementsPerRequest(300_000_000),2_000_000);  // 150 bytes an element
  assert.equal(junctionsIn(2_000_000),500_000);             // 4 elements a junction
});

// A province is not its bounding box. OSMnx subdivides the CONVEX HULL of an oversized polygon,
// which downloads the gaps; these tiles are skipped instead, which is one fewer request against
// a donated service for every tile that holds nothing anyone asked for.
test('a tile that misses the study area entirely is never requested',()=>{
  // An L: the north-east quarter is outside it.
  const L={type:'Polygon',coordinates:[[[0,0],[2,0],[2,1],[1,1],[1,2],[0,2],[0,0]]]};
  const all=planTiles(L,32_000_000,2_000_000);
  assert.ok(all.side>=4,'a grid fine enough to need several tiles a side');
  assert.ok(all.tiles.length<all.side*all.side,'tiles lying in the notch are dropped');
  for(const tile of all.tiles)assert.ok(tileMeetsArea(tile,L),'every tile kept meets the area');
  // The far corner of the notch holds nothing: no tile starts there.
  const corner=all.tiles.map(t=>t.coordinates[0][0]).some(([x,y])=>x>1.4&&y>1.4);
  assert.equal(corner,false,'the tile deepest in the notch was never planned');
  // Roughly a quarter of the box is notch, so roughly a quarter of the tiles go, and no more.
  assert.ok(all.tiles.length>=all.side*all.side*0.6,'only the genuinely empty tiles go');
});

test('a tile wholly inside the area is kept, with no vertex of the outline in it',()=>{
  const big={type:'Polygon',coordinates:[[[0,0],[9,0],[9,9],[0,9],[0,0]]]};
  const middle={type:'Polygon',coordinates:[[[4,4],[5,4],[5,5],[4,5],[4,4]]]};
  assert.equal(tileMeetsArea(middle,big),true,'inside counts, not only touching the outline');
});

test('a single tile is never skipped, whatever the outline does',()=>{
  const L={type:'Polygon',coordinates:[[[0,0],[2,0],[2,1],[1,1],[1,2],[0,2],[0,0]]]};
  assert.equal(planTiles(L,10,2_000_000).tiles.length,1);
});

// ---- The sequence, against a service that answers ----
import {requestOSMInTiles} from '../build/network-tiles.js';

const isStatus=url=>String(url).endsWith('/status');
const isProbe=init=>String(init?.body??'').includes('node%281%29');
const isCount=init=>/out\+count|out%20count/.test(String(init?.body??''));
const statusOk=()=>new Response('Rate limit: 2\n2 slots available now.\n',{status:200});
const probeOk=()=>new Response(JSON.stringify({version:0.6,elements:[]}));
const countOk=elements=>new Response(JSON.stringify({version:0.6,
  elements:[{type:'count',id:0,tags:{ways:String(Math.ceil(elements/4)),total:String(elements)}}]}));

// A tiny grid of streets, offset per tile so each response carries different junctions.
const osmFor=seed=>({version:0.6,elements:[
  {type:'node',id:seed*10+1,lat:0.5+seed*0.01,lon:29+seed*0.01},
  {type:'node',id:seed*10+2,lat:0.5+seed*0.01,lon:29.001+seed*0.01},
  {type:'way',id:seed*100,nodes:[seed*10+1,seed*10+2],tags:{highway:'residential'}}]});

// A COUNT IS OF THE BOX ASKED ABOUT. The first fixture answered every count with the whole
// area's total, including each tile's own, so every tile predicted the whole province and
// refused -- and the failure was the fixture's, not the planner's. A service counts what is
// inside the box it was given, so this one scales by area.
const boxIn=body=>{
  const m=/\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)/.exec(decodeURIComponent(String(body||'')));
  return m?m.slice(1).map(Number):null;   // s,w,n,e
};
const service=({elements,perTile=osmFor,fullArea=(3.7-0.2)*(31.5-28.1)})=>{
  const calls={counts:0,downloads:0,countedBoxes:[]};
  const fetcher=async(url,init)=>{
    if(isStatus(url))return statusOk();
    if(isProbe(init))return probeOk();
    if(isCount(init)){
      calls.counts++;
      const box=boxIn(init?.body);
      const share=box?Math.min(1,((box[2]-box[0])*(box[3]-box[1]))/fullArea):1;
      calls.countedBoxes.push(share);
      return countOk(Math.round(elements*share));
    }
    calls.downloads++;return new Response(JSON.stringify(perTile(calls.downloads)));
  };
  return {fetcher,calls};
};
const ITURI2=square(28.1,0.2,31.5,3.7);

test('a sparse area is one request, as it always was',async()=>{
  const {fetcher,calls}=service({elements:1_000});
  const net=await requestOSMInTiles(ITURI2,250,fetcher,{maxNodes:500_000});
  assert.equal(net.tiles,1,'nothing is split that does not need splitting');
  assert.equal(calls.downloads,1);
  assert.equal(net.nodes.length,2);
});

test('a province is asked for in as many requests as the count implies',async()=>{
  // 500,000 junctions allows 2,000,000 elements a request; 8,000,000 needs four.
  const {fetcher,calls}=service({elements:8_000_000});
  const net=await requestOSMInTiles(ITURI2,250,fetcher,{maxNodes:500_000});
  assert.equal(net.tiles,9,'nine tiles, sized so each fits in one request');
  assert.equal(calls.downloads,9,'one request each, and none refused');
  // The property that matters: ONE count for the whole area, and no tile re-counted because the
  // plan put it over budget.
  assert.equal(calls.counts,9+1,'one count for the area, one inside each tile’s own request');
  assert.equal(net.nodes.length,18,'every tile’s junctions are in the one graph');
  assert.equal(net.countedElements,8_000_000,'the count that decided it is kept');
  assert.equal(net.provenance.gridSide,3);
});

test('the practitioner’s Stop ends the sequence, not just the tile',async()=>{
  const stop=new AbortController();
  const {fetcher}=service({elements:8_000_000,perTile:seed=>{if(seed>=2)stop.abort();return osmFor(seed);}});
  await assert.rejects(
    requestOSMInTiles(ITURI2,250,fetcher,{maxNodes:500_000,stopSignal:stop.signal}),
    /Stopped after \d+ of \d+ tiles/);
});

test('the progress line says which tile of how many',async()=>{
  const {fetcher}=service({elements:8_000_000});
  const said=[];
  await requestOSMInTiles(ITURI2,250,fetcher,{maxNodes:500_000,onPhase:m=>said.push(m)});
  assert.ok(said.some(m=>/^Tile 1 of 9 /.test(m)),'the first tile names itself');
  assert.ok(said.some(m=>/^Tile 9 of 9 /.test(m)),'and so does the last');
  assert.ok(said.some(m=>/how much street data/i.test(m)),'the count is announced too');
});

test('the merged graph says it was downloaded in several requests',async()=>{
  const {fetcher}=service({elements:8_000_000});
  const net=await requestOSMInTiles(ITURI2,250,fetcher,{maxNodes:500_000});
  assert.match(net.source,/downloaded in 9 requests/);
  assert.match(net.source,/OpenStreetMap contributors, ODbL/);
  assert.equal(net.provenance.droppedEdges,0);
});

// ---- A study area clips to its polygon, not to its box ----
import {clipNetworkToArea} from '../build/network-tiles.js';

// A concave outline: the notch is inside the bounding box and outside the area, which is exactly
// what a box-shaped answer gets wrong. Reported 2026-10-22 as "network outside the study area
// bounds" on the Ituri map.
const L={type:'Polygon',coordinates:[[[0,0],[2,0],[2,1],[1,1],[1,2],[0,2],[0,0]]]};
const at=(id,x,y)=>({id,coordinates:[x,y]});

test('junctions in the notch are outside the area, though inside its box',()=>{
  const network={source:'t',
    nodes:[at('in1',0.5,0.5),at('in2',0.5,1.5),at('notch',1.5,1.5),at('out',3,3)],
    edges:[{from:'in1',to:'in2',lengthM:10},{from:'in2',to:'notch',lengthM:10},
           {from:'notch',to:'out',lengthM:10}]};
  const {network:clipped,droppedNodes,droppedEdges}=clipNetworkToArea(network,L);
  assert.deepEqual(clipped.nodes.map(n=>n.id),['in1','in2']);
  assert.equal(droppedNodes,2,'the notch is not in the area, and nor is the far point');
  assert.deepEqual(clipped.edges.map(e=>`${e.from}-${e.to}`),['in1-in2']);
  assert.equal(droppedEdges,2,'a road is cut at the border, not trailed beyond it');
  assert.match(clipped.source,/Clipped to the study area polygon: 2 of 4 junctions kept/);
});

test('the band index agrees with a plain scan, everywhere',()=>{
  // A ring with many vertices at many latitudes is what the index exists for, so it is what the
  // index is checked against: 2,000 junctions on a 400-vertex star, every one tested both ways.
  const ring=[];
  for(let i=0;i<400;i++){
    const angle=i/400*2*Math.PI,radius=i%2?1:0.55;
    ring.push([Math.cos(angle)*radius,Math.sin(angle)*radius]);
  }
  ring.push(ring[0]);
  const star={type:'Polygon',coordinates:[ring]};
  const plain=(x,y)=>{let hit=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const [xi,yi]=ring[i],[xj,yj]=ring[j];
      if(yi>y!==yj>y&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;}
    return hit;};
  const nodes=[];
  for(let i=0;i<2000;i++){
    const x=-1.2+2.4*((i*0.6180339887)%1),y=-1.2+2.4*((i*0.7548776662)%1);
    nodes.push(at(`n${i}`,x,y));
  }
  const kept=new Set(clipNetworkToArea({source:'t',nodes,edges:[]},star).network.nodes.map(n=>n.id));
  let disagreements=0;
  for(const node of nodes)
    if(kept.has(node.id)!==plain(node.coordinates[0],node.coordinates[1]))disagreements++;
  assert.equal(disagreements,0,'the index is an index, not an approximation');
  assert.ok(kept.size>100&&kept.size<nodes.length,'and the star actually divides the points');
});

test('a multipolygon area keeps what is in either part',()=>{
  const two={type:'MultiPolygon',coordinates:[
    [[[0,0],[1,0],[1,1],[0,1],[0,0]]],
    [[[5,5],[6,5],[6,6],[5,6],[5,5]]]]};
  const network={source:'t',nodes:[at('a',0.5,0.5),at('b',5.5,5.5),at('between',3,3)],edges:[]};
  const {network:clipped}=clipNetworkToArea(network,two);
  assert.deepEqual(clipped.nodes.map(n=>n.id).sort(),['a','b']);
});

test('the tiled download returns a polygon-clipped graph and says what it dropped',async()=>{
  const {fetcher}=service({elements:8_000_000});
  const net=await requestOSMInTiles(ITURI2,250,fetcher,{maxNodes:500_000});
  assert.equal(net.provenance.clippedToPolygon,true);
  assert.equal(typeof net.provenance.junctionsOutsideArea,'number');
  assert.match(net.source,/Clipped to the study area polygon/);
});

// The margin is not an oversight. The widget downloads beyond the study bounds on purpose --
// "Download margin outside study bounds (metres)", 250 by default -- so a journey starting near
// the border can leave and come back. Clipping to the bare outline threw that away and made the
// control a lie; it failed eight browser tests, which is how it was found.
test('a junction just outside the outline, inside the margin, is kept',()=>{
  const box={type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1],[0,0]]]};
  const justOutside=1+200/111320;      // 200 m beyond the eastern edge
  const wellOutside=1+900/111320;      // 900 m beyond it
  const network={source:'t',
    nodes:[at('in',0.5,0.5),at('margin',justOutside,0.5),at('far',wellOutside,0.5)],edges:[]};
  const kept=id=>clipNetworkToArea(network,box,250).network.nodes.some(n=>n.id===id);
  assert.equal(kept('in'),true);
  assert.equal(kept('margin'),true,'downloaded on purpose, so kept on purpose');
  assert.equal(kept('far'),false,'past the margin is past the study area');
  // And a margin of zero is the polygon exactly, which is what the direction asked for.
  const bare=clipNetworkToArea(network,box,0).network.nodes.map(n=>n.id);
  assert.deepEqual(bare,['in']);
});
