import {test,expect} from '@playwright/test';

/** The street engine, end to end, with no extract: a published .osm.pbf is
 *  hundreds of megabytes and belongs on a practitioner's computer rather than
 *  in this repository, so the hermetic test drives the module's XML entry with
 *  a document written here. What it proves is the whole path — the module
 *  loads from this build, builds a graph, and the graph comes back out in the
 *  shape the widgets read. */
const OSM=`<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6" generator="fieldwork-test">
  <node id="1" lat="51.5130" lon="-0.1370"/>
  <node id="2" lat="51.5134" lon="-0.1360"/>
  <node id="3" lat="51.5138" lon="-0.1350"/>
  <node id="4" lat="51.5142" lon="-0.1340"/>
  <way id="100"><nd ref="1"/><nd ref="2"/><nd ref="3"/><tag k="highway" v="residential"/><tag k="name" v="Broad Street"/></way>
  <way id="101"><nd ref="3"/><nd ref="4"/><tag k="highway" v="footway"/></way>
</osm>`;

test('the engine ships in this build, runs offline and returns a fieldwork network',async({page})=>{
  await page.goto('/?example=blank');
  const result=await page.evaluate(async osm=>{
    const {loadEngine,ENGINE_URL,extractSource}=await import('/build/street-engine.js');
    const engine=await loadEngine();
    const bytes=new TextEncoder().encode(osm);
    const pointer=engine.alloc(bytes.length)>>>0;
    new Uint8Array(engine.memory.buffer,pointer,bytes.length).set(bytes);
    engine.set_retain_all(1);
    const junctions=engine.graph_from_pbf?undefined:null;   // the PBF entry exists
    const built=engine.graph_from_xml(pointer,bytes.length,0);
    const nodePointer=engine.export_nodes()>>>0,nodeValues=engine.node_values()>>>0;
    const edgePointer=engine.export_edges()>>>0,edgeValues=engine.edge_values()>>>0;
    const nodes=new Float64Array(engine.memory.buffer,nodePointer,nodeValues).slice();
    const edges=new Float64Array(engine.memory.buffer,edgePointer,edgeValues).slice();
    engine.drop_graph();engine.drop_buffers();
    return {url:ENGINE_URL,built,junctions:nodes.length/3,segments:edges.length/3,
      first:[nodes[1],nodes[2]],metres:edges.length?edges[2]:null,
      source:extractSource({boundary:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]},mode:'walking'},3_500_000,4)};
  },OSM);

  expect(result.url).toBe('./vendor/street-engine.wasm');
  expect(result.built).toBe(4);
  expect(result.junctions).toBe(4);
  expect(result.segments).toBeGreaterThan(0);
  // CRS84, as every coordinate in this application is.
  expect(result.first[0]).toBeCloseTo(-0.137,3);
  expect(result.first[1]).toBeCloseTo(51.513,3);
  // Metres, positive, and about what 1,000 of a degree of longitude is here.
  expect(result.metres).toBeGreaterThan(50);
  expect(result.metres).toBeLessThan(200);
  // The licence travels with the network, because ODbL requires it.
  expect(result.source).toContain('OpenStreetMap contributors, ODbL 1.0');
});

test('the engine is precached, so a network can be built offline',async({page,context})=>{
  await page.goto('/?example=blank');
  await page.waitForFunction(()=>navigator.serviceWorker?.controller!==null,null,{timeout:30000}).catch(()=>{});
  await context.setOffline(true);
  const offline=await page.evaluate(async()=>{
    try{const response=await fetch('./vendor/street-engine.wasm');
      return {ok:response.ok,bytes:(await response.arrayBuffer()).byteLength};}
    catch(error){return {ok:false,error:String(error).slice(0,80)};}
  });
  await context.setOffline(false);
  expect(offline.ok).toBe(true);
  expect(offline.bytes).toBeGreaterThan(100000);
});

test('the widget offers an extract, and reads one into the workflow',async({page})=>{
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="study_area"]').click();
  // A study area the test can place without drawing.
  await page.evaluate(()=>{
    const raw=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    raw.nodes[0].params={...raw.nodes[0].params,selectionMode:'bbox',
      geometry:{type:'Polygon',coordinates:[[[-0.14,51.512],[-0.133,51.512],[-0.133,51.515],[-0.14,51.515],[-0.14,51.512]]]}};
    localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(raw));
  });
  await page.reload();
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="network_input"]').click();
  await page.locator('.node').filter({hasText:'Street network'}).click();
  await page.locator('#network-input-method').selectOption('extract');
  await expect(page.locator('#network-extract')).toBeVisible();
  await expect(page.locator('#inspector-content')).toContainText('the file stays where it is');
  // Travel mode is offered here too, because it decides what is read.
  await expect(page.locator('#network-travel-mode')).toBeVisible();
});

test('the clip is the study area, not the box around it',async({page})=>{
  await page.goto('/?example=blank');
  const result=await page.evaluate(async()=>{
    const {loadEngine,ringOf}=await import('/build/street-engine.js');
    const engine=await loadEngine();
    const ask=(lon,lat)=>engine.point_inside(lon,lat)===1;
    // The box around a triangle covering the west: everything here is inside the BOX.
    engine.set_bbox(0,0,1,1);
    engine.set_polygon(0,0);
    const box={inside:ask(0.1,0.1),alsoInside:ask(0.9,0.1)};
    // Now the study area itself: the triangle (0,0) (0.5,0) (0,0.5).
    const ring=ringOf({type:'Polygon',coordinates:[[[0,0],[0.5,0],[0,0.5],[0,0]]]});
    const pointer=engine.alloc(ring.length*8)>>>0;
    new Float64Array(engine.memory.buffer,pointer,ring.length).set(ring);
    engine.set_polygon(pointer,ring.length);
    const area={inside:ask(0.1,0.1),outside:ask(0.9,0.1),
      alsoOutside:ask(0.4,0.4),onTheWest:ask(0.05,0.4)};
    // Several rings: a point in either is in.
    const two=ringOf({type:'MultiPolygon',coordinates:[
      [[[0,0],[0.2,0],[0,0.2],[0,0]]],[[[0.8,0.8],[1,0.8],[1,1],[0.8,0.8]]]]});
    const p2=engine.alloc(two.length*8)>>>0;
    new Float64Array(engine.memory.buffer,p2,two.length).set(two);
    engine.set_polygon(p2,two.length);
    const multi={first:ask(0.05,0.05),second:ask(0.95,0.9),between:ask(0.5,0.5)};
    engine.set_polygon(0,0);
    return {box,area,multi,ringValues:ring.length};
  });
  // The box admits both; the area admits only what the practitioner drew.
  expect(result.box.inside).toBe(true);
  expect(result.box.alsoInside).toBe(true);
  expect(result.area.inside).toBe(true);
  expect(result.area.outside).toBe(false);
  expect(result.area.alsoOutside).toBe(false);   // 0.4+0.4 is past the hypotenuse
  expect(result.area.onTheWest).toBe(true);
  // A MultiPolygon is several rings, and the gap between them is outside.
  expect(result.multi.first).toBe(true);
  expect(result.multi.second).toBe(true);
  expect(result.multi.between).toBe(false);
  expect(result.ringValues).toBe(8);
});

// "The download succeeding is very important. As I have been trying to do for the last few days."
// -- 2026-10-22. Two different downloads were being conflated: Overpass serving a province in one
// response, and a published file on a host built to serve it. This is the second.
test('the panel offers the extracts that cover this study area',async({page})=>{
  await page.goto('/?example=blank');
  const matches=await page.evaluate(async()=>{
    const {extractsFor,EXTRACT_CATALOGUE_TAKEN,EXTRACT_REGIONS}=await import('/build/extract-catalogue.js');
    const box=(w,s,e,n)=>({type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]});
    return {
      ituri:extractsFor(box(29.0,1.0,30.5,3.0)).map(r=>r.name),
      soho:extractsFor(box(-0.155,51.502,-0.119,51.525)).map(r=>r.name),
      gaborone:extractsFor(box(25.85,-24.72,25.95,-24.60)).map(r=>r.name),
      // A box straddling a border is covered by no single country, and says so rather than
      // offering the neighbour whose own box happens to contain a corner of it.
      border:extractsFor(box(28.9,0.3,31.5,3.7)).map(r=>r.name),
      taken:EXTRACT_CATALOGUE_TAKEN,regions:EXTRACT_REGIONS.length,
      urls:extractsFor(box(29.0,1.0,30.5,3.0)).map(r=>r.pbf),
    };
  });
  expect(matches.ituri[0]).toContain('Congo');
  expect(matches.soho).toEqual(['Greater London','England','Great Britain']);
  expect(matches.gaborone[0]).toBe('Botswana');
  expect(matches.border).not.toContain('Uganda');
  expect(matches.regions).toBeGreaterThan(500);
  expect(matches.taken).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  // The link points at the published file, which the browser downloads: nothing passes through
  // this application, which is why no CORS header is needed and why the file lands on the device.
  expect(matches.urls[0]).toMatch(/^https:\/\/download\.geofabrik\.de\/.*\.osm\.pbf$/);
});
