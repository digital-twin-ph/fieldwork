import {test,expect} from './fixtures.mjs';
import assert from 'node:assert/strict';

// AN INSET ON A MAP THAT CARRIES POLYGONS. The practitioner, 2026-11-23: *"Inset does not work"*, and *"But the
// inset never appeared"*, on a map of DRC provinces with bat records and a mine. A polygon figure is drawn by
// polygonSvg and returned before the inset composition ever runs, so the setting was kept, offered in Configure…
// and silently never drawn. Measured before the fix: 85 paths with an inset on a plain map, 43 with a polygon layer.
const ring=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];
const build=inset=>({schema:'fieldwork/workflow/1',id:'i',label:'Inset',exampleId:'blank',nodes:[
  {id:'area',type:'study_area',x:20,y:20,params:{label:'Area',source:'drawn',selectionMode:'polygon',
    geometry:{type:'Polygon',coordinates:[ring(28,2,32,6)]}}},
  {id:'layer',type:'polygon_input',x:20,y:200,params:{label:'Polygon layer',
    data:{features:[{id:'p1',name:'Haut-Uele',geometry:{type:'Polygon',coordinates:[ring(28,2,30,4)]},properties:{}},
      {id:'p2',name:'Ituri',geometry:{type:'Polygon',coordinates:[ring(30,4,32,6)]},properties:{}}]}}},
  {id:'map',type:'map_output',x:400,y:60,params:{label:'Map',...(inset?{inset}:{})}},
],edges:[{id:'e1',from:'area',to:'map',port:'area'},{id:'e2',from:'layer',to:'map',port:'polygons'}]});
const draw=async(page,inset)=>{
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'i.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(build(inset)))});
  await expect(page.locator('#workflow-state')).toContainText(/Run complete|Ready to run|Not ready/,{timeout:60000});
  await page.locator('#run-button').click().catch(()=>{});
  await expect(page.locator('#workflow-state')).toContainText(/Run complete|Run failed/,{timeout:180000});
  await page.locator('[data-view="results"]').click();
  await page.waitForTimeout(2000);
  return page.evaluate(()=>{const s=document.querySelector('#map');
    return {paths:s?s.querySelectorAll('path').length:0,
      keys:s?s.querySelectorAll('[data-plot-key-band]').length:0,
      catchments:s?s.querySelectorAll('[data-catchment]').length:0};});
};

test('a map carrying polygons draws its inset, with one key',async({page})=>{
  const plain=await draw(page,undefined);
  assert.ok(plain.paths>0,'the polygon figure draws');
  assert.equal(plain.keys,1,'one key without an inset');

  // THE SAME LAYERS DRAWN TWICE: each polygon appears in the map and again in the enlarged part.
  const withInset=await draw(page,{arrange:'locator',size:'third',box:[28.2,2.2,29.8,3.8]});
  assert.ok(withInset.catchments>plain.catchments,
    `the polygons are drawn twice: ${withInset.catchments} against ${plain.catchments}`);
  // ONE KEY PER FIGURE: two would invite reading them as two scales.
  assert.equal(withInset.keys,1,`one key with an inset, not ${withInset.keys}`);

  // A FOCUS INSET composes too, and the same way.
  const focus=await draw(page,{arrange:'inset',size:'third',box:[28.2,2.2,29.8,3.8]});
  assert.ok(focus.catchments>plain.catchments,`a focus inset draws the polygons twice: ${focus.catchments}`);
  assert.equal(focus.keys,1);

  // A BOX OUTSIDE THE MAP IS NOT DRAWN, and the figure is what it was.
  const outside=await draw(page,{arrange:'locator',size:'third',box:[100,80,101,81]});
  assert.equal(outside.catchments,plain.catchments,'a box outside the map leaves the figure alone');
});

/** A LOCATOR'S MARKS AND GROUND BELONG TO THE MAIN PLOT (2026-11-24). Reported with the Kibali mine's 50 km buffer,
 *  and seen by two readers: the area was drawn "off and unusually large". It was neither -- the buffer's geometry is
 *  centred on the pin to within a millionth of a degree. The figure drew the AREAS zoomed to the locator's box while
 *  the MARKS and the basemap stayed at the whole extent, so the pin sat on its ground and the circle around it was
 *  drawn about six times too wide and off to one side. Measured before the fix: the main plot's circle 372 px wide
 *  centred at (432.7, 317.3) against the mark it is drawn around at (361.1, 436), 138 px away.
 *
 *  The buffer is what makes this checkable: an area drawn AROUND a point must be drawn CENTRED on that point, in
 *  whatever frame, so one number settles it. The boundary renderer had always chosen the frame this way; only the
 *  polygon one had not, which is why it needs a map carrying a polygon layer AND a point layer to show at all. */
const aroundTheMine=inset=>{
  const w=build(inset);
  w.nodes.push({id:'mine',type:'point_input',x:20,y:380,params:{label:'Mines',fields:[],
    data:{type:'FeatureCollection',features:[{type:'Feature',id:'k1',properties:{name:'Kibali Mining Site'},
      geometry:{type:'Point',coordinates:[29.0,3.0]}}]}}});
  w.nodes.push({id:'buf',type:'buffer_point',x:200,y:380,
    params:{label:'Buffer - Mines',pointId:'Kibali Mining Site',distanceM:50000,yields:'area'}});
  w.edges.push({id:'e3',from:'mine',to:'map',port:'points'});
  w.edges.push({id:'e4',from:'mine',to:'buf',port:'points'});
  // The buffer replaces the drawn study area on the map's area port, so the circle IS the area drawn.
  w.edges=w.edges.filter(e=>!(e.to==='map'&&e.port==='area'));
  w.edges.push({id:'e5',from:'buf',to:'map',port:'area'});
  return w;
};
const placed=async(page,inset)=>{
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'i.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(aroundTheMine(inset)))});
  await expect(page.locator('#workflow-state')).toContainText(/Run complete|Ready to run|Not ready/,{timeout:60000});
  await page.locator('#run-button').click().catch(()=>{});
  await expect(page.locator('#workflow-state')).toContainText(/Run complete|Run failed/,{timeout:180000});
  await page.locator('[data-view="results"]').click();
  await page.waitForTimeout(2000);
  return page.evaluate(()=>{
    const svg=document.querySelector('#map');
    const centre=el=>{const b=el.getBBox();return {w:+b.width.toFixed(1),cx:+(b.x+b.width/2).toFixed(1),cy:+(b.y+b.height/2).toFixed(1)};};
    return {marks:[...svg.querySelectorAll('g.location')].map(centre),
      circles:[...svg.querySelectorAll('[data-fill-role]')].map(centre).sort((a,b)=>b.w-a.w)};
  });
};

test('the area drawn around a point is drawn centred on it, inset or not',async({page})=>{
  for(const inset of [undefined,{arrange:'locator',size:'third',box:[28.2,2.2,29.8,3.8]}]){
    const got=await placed(page,inset);
    assert.ok(got.circles.length>0&&got.marks.length>0,
      `inset=${!!inset}: a circle and a mark are drawn (${JSON.stringify(got)})`);
    // The MAIN plot is the largest circle; its mark must sit at its centre, because that is the point it was
    // drawn around. A few pixels of slack for the mark's own stroke, not for a different frame.
    const main=got.circles[0];
    const off=Math.min(...got.marks.map(m=>Math.hypot(m.cx-main.cx,m.cy-main.cy)));
    assert.ok(off<4,`inset=${!!inset}: the mark is ${off.toFixed(1)} px from the centre of the area drawn around it `
      +`(circle ${JSON.stringify(main)}, marks ${JSON.stringify(got.marks)})`);
  }
});
