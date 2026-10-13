import test from 'node:test';
import assert from 'node:assert/strict';
import {FIGURE_PALETTE,FIGURE_ROLE,FIGURE_TYPE,niceDistance,metresPerPixel,
        METRES_PER_DEGREE_LATITUDE,scaleBarSvg,northArrowSvg} from '../build/presentation.js';
import {catchmentFrame} from '../build/catchment-output.js';
import {mapPresentation,standaloneMapSvg} from '../build/map-communication.js';
import {chartVegaSpec} from '../build/chart-vega.js';
import {johnSnowExample} from '../build/john-snow.js';

test('the palette is the published colour-blind-safe one, and every colour is distinct', ()=>{
  // Okabe--Ito. Asserted literally because the point of choosing a published palette is that it is
  // not quietly replaced by colours that looked right to somebody.
  assert.deepEqual([...FIGURE_PALETTE],
    ['#0072B2','#D55E00','#009E73','#CC79A7','#E69F00','#56B4E9','#F0E442','#000000']);
  assert.equal(new Set(FIGURE_PALETTE).size,FIGURE_PALETTE.length);
  for(const hex of FIGURE_PALETTE)assert.match(hex,/^#[0-9A-F]{6}$/,'uppercase six-digit hex');
});

test('absence of data is not given a hue', ()=>{
  // A grey cannot compete with a category for a reader's attention, and "unknown" is not a value.
  const [r,g,b]=[1,3,5].map(i=>parseInt(FIGURE_ROLE.unknown.slice(i,i+2),16));
  assert.equal(r,g);assert.equal(g,b);
  assert.ok(!FIGURE_PALETTE.includes(FIGURE_ROLE.unknown));
});

test('a scale bar is a round number a reader can measure with a ruler', ()=>{
  for(const [metres,expected] of [[1,1],[9,5],[10,10],[23,20],[49,20],[50,50],[99,50],[100,100],
                                  [1234,1000],[4999,2000],[7500,5000],[23000,20000]])
    assert.equal(niceDistance(metres),expected,`${metres} should round down to ${expected}`);
  for(const bad of [0,-1,NaN,Infinity])assert.equal(niceDistance(bad),0);
});

test('metres per pixel is read off the latitude axis, which is the one that is not foreshortened', ()=>{
  // The plots scale latitude directly and multiply longitude by cos(latitude), so a bar derived
  // from the longitude axis would be wrong by that cosine -- about 37% at Soho's 51.5 degrees.
  assert.equal(metresPerPixel(METRES_PER_DEGREE_LATITUDE),1,'one pixel per metre at this scale');
  assert.equal(Math.round(metresPerPixel(1000)),111);
  for(const bad of [0,-5,NaN])assert.equal(metresPerPixel(bad),0);
});

test('the scale bar is drawn from the plot frame, and is correct for the Snow extent', ()=>{
  // End to end: the shipped isochrone example's own geometry, through the plot's own frame.
  const polygons={features:[{id:'c',name:'5 min',minutes:5,geometry:{type:'Polygon',
    coordinates:[[[-0.1400,51.5120],[-0.1330,51.5120],[-0.1330,51.5160],[-0.1400,51.5160],[-0.1400,51.5120]]]}}],
    sites:[],observations:{features:[]},method:'Dijkstra outbound',notes:[]};
  const frame=catchmentFrame(polygons);
  assert.ok(frame.pixelsPerDegreeLatitude>0);
  const mpp=metresPerPixel(frame.pixelsPerDegreeLatitude);
  const svg=scaleBarSvg({x:110,y:300,metresPerPixel:mpp,maxWidth:150});
  const ground=Number(svg.match(/data-scale-bar="(\d+)"/)[1]);
  const width=Number(svg.match(/width="([\d.]+)" height="5"/)[1]);
  // The bar's drawn width must be the ground distance it claims, at the plot's own scale.
  assert.ok(Math.abs(width*mpp-ground)<1,`bar claims ${ground} m and spans ${(width*mpp).toFixed(1)} m`);
  assert.ok(ground<=mpp*150,'the bar must fit the room it was given');
  assert.equal(niceDistance(mpp*150),ground,'and must be the roundest number that fits');
});

test('no scale bar is drawn when there is no single ground scale', ()=>{
  // A wrong scale bar is worse than none, because a reader measures off it.
  for(const mpp of [0,-1,NaN,undefined])assert.equal(scaleBarSvg({x:0,y:0,metresPerPixel:mpp}),'');
});

test('whatever the scale, the bar never claims a distance it does not span', ()=>{
  // The property that matters, across six orders of magnitude: the label and the geometry agree.
  // An earlier version of this test asserted that an absurd scale produced no bar at all, which was
  // a guess about the code rather than a reading of it -- the bar always fills between a fifth and
  // all of the room it is given, so it stays correct and merely becomes a silly figure.
  for(const mpp of [0.05,0.5,2,17,250,4000]){
    const svg=scaleBarSvg({x:0,y:0,metresPerPixel:mpp,maxWidth:150});
    const ground=Number(svg.match(/data-scale-bar="(\d+)"/)[1]);
    const width=Number(svg.match(/width="([\d.]+)" height="5"/)[1]);
    assert.ok(Math.abs(width*mpp-ground)<=ground*1e-3,`at ${mpp} m/px the label and the bar disagree`);
    assert.ok(width<=150&&width>=150/5-1e-9,`at ${mpp} m/px the bar is ${width}px of 150`);
  }
});

test('a north arrow is drawn, labelled, and hidden from assistive technology', ()=>{
  const svg=northArrowSvg({x:800,y:80});
  assert.match(svg,/data-north-arrow="true"/);
  assert.match(svg,/>N</);
  assert.match(svg,/aria-hidden="true"/,'decorative furniture must not be read out as content');
});

test('the exported map carries title, legend, scale bar, north arrow and attribution', ()=>{
  const workflow=johnSnowExample('snow-isochrone');
  const node=workflow.nodes.find(n=>n.id==='map');
  const output={polygons:{features:[{id:'c',name:'5 min',minutes:5}],sites:[],method:'Dijkstra outbound',notes:['OSM snapshot']}};
  const spec=mapPresentation(node,output,workflow);
  const svg=standaloneMapSvg('<g/>','0 0 850 650',spec,{metresPerPixel:2});
  assert.match(svg,/Five-minute walk from the Broad Street pump/,'the configured title, not the node label');
  assert.match(svg,/data-scale-bar=/);
  assert.match(svg,/data-north-arrow=/);
  assert.match(svg,/OpenStreetMap contributors, ODbL/,'a street network reached this figure under ODbL');
  assert.match(svg,/Robin Wilson/,'the data source is credited');
  assert.match(svg,new RegExp(FIGURE_TYPE.family.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'the shared type stack');
  // Self-contained: nothing fetched when the file is opened somewhere else.
  assert.ok(!/<image|xlink:href|url\(http/.test(svg),'an exported figure must not depend on the network');
});

test('the attribution is derived from the data, not left to be typed', ()=>{
  const workflow=johnSnowExample('snow-voronoi');
  const node=workflow.nodes.find(n=>n.id==='map');
  // Straight-line catchments touch no street network, so there is no ODbL obligation to assert.
  const voronoi={polygons:{features:[{id:'c',name:'Broad Street'}],sites:[],method:'Half-plane intersection',notes:[]}};
  assert.equal(mapPresentation(node,voronoi,workflow).attribution,'');
  // A network-derived region carries one whether or not anybody remembered.
  const network={polygons:{features:[{id:'c',name:'5 min',minutes:5}],sites:[],method:'Dijkstra outbound',notes:[]}};
  assert.match(mapPresentation(node,network,workflow).attribution,/ODbL/);
});

test('the map and the chart beside it agree about colour and type', ()=>{
  const workflow=johnSnowExample('snow-voronoi');
  const mapNode=workflow.nodes.find(n=>n.id==='map');
  const output={polygons:{features:[{id:'c',name:'Broad Street'}],sites:[],method:'Half-plane intersection',notes:[]}};
  const spec=mapPresentation(mapNode,output,workflow);
  // The renderer is chosen by the practitioner, not pinned in the example, so it is supplied here:
  // what this asserts is that the two specifications agree, not which renderer ships.
  const chart=chartVegaSpec({bins:[{key:'a',label:'Broad Street',count:73}],caption:'c',field:'count'},
    {...workflow.nodes.find(n=>n.id==='chart').params,renderer:'vega-lite'},{sourceId:'catchments',runId:'r'});
  assert.equal(chart.mark.color,FIGURE_ROLE.primary);
  assert.equal(spec.items[0].color,FIGURE_ROLE.primary,'the same role is the same hue in both');
  assert.equal(chart.config.font,FIGURE_TYPE.family);
  assert.equal(chart.config.axis.titleFontSize,FIGURE_TYPE.axisTitle);
});

test('the Snow figures ship complete rather than on fallbacks', ()=>{
  for(const key of ['snow-voronoi','snow-isochrone']){
    const workflow=johnSnowExample(key);
    const map=workflow.nodes.find(n=>n.id==='map').params;
    for(const field of ['mapTitle','mapSubtitle','mapSourceNote'])
      assert.ok(map[field]?.trim().length>40,`${key} map needs a real ${field}`);
    for(const id of ['chart','epidemic']){
      const node=workflow.nodes.find(n=>n.id===id);
      if(!node)continue;
      for(const field of ['chartTitle','subtitle','xAxisTitle','yAxisTitle','sourceNote'])
        assert.ok(node.params[field]?.trim(),`${key} ${id} needs a ${field}`);
      assert.ok(node.params.xAxisTitle!==node.params.yAxisTitle);
    }
  }
});

test('an epidemic curve runs time along the bottom', ()=>{
  const workflow=johnSnowExample('snow-epidemic-curve');
  const node=workflow.nodes.find(n=>n.id==='epidemic');
  // Vertical is the default for a series rather than a stored value; stating it explicitly is
  // refused without the Vega renderer, so the example relies on the default.
  assert.equal(node.params.orientation,undefined);
  // The renderer is deliberately not pinned: see the comment in src/john-snow.ts. The text is
  // configured so that choosing the enhanced renderer yields a complete figure at once.
  assert.equal(node.params.renderer,undefined);
  assert.match(node.params.xAxisTitle,/[Dd]ate/);
  // The subtitle has to say which date, because date of death is not date of onset.
  assert.match(node.params.subtitle,/not date of onset/);
});
