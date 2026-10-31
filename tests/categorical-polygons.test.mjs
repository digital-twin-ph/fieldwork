import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyCategories,FIGURE_PALETTE,FIGURE_ROLE} from '../build/presentation.js';
import {polygonSvg} from '../build/catchment-output.js';
import {joinTableToAreas,joinedPolygons} from '../build/area-join.js';

/** SHADING A MAP BY A CLASS THAT HAS NO ORDER.
 *
 *  The practitioner, 2026-10-30, on Snow's natural experiment: *"We can probably also shade the
 *  subdistricts categorically whether they are served by either or both companies."* Which is the
 *  exposure map -- the variable the whole study turns on, and the one thing no figure here could
 *  draw. Experiment 141. */

const esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SV='Southwark and Vauxhall Company only',BOTH='Lambeth Company and Southwark and Vauxhall Company';
const LAM='Lambeth Company only';

const square=(n)=>({type:'Polygon',coordinates:[[[n,0],[n+1,0],[n+1,1],[n,1],[n,0]]]});
const polygons=(categories)=>({
  features:categories.map((category,i)=>({id:`p${i}`,name:`Sub-district ${i}`,
    geometry:square(i),...(category?{category}:{})})),
  sites:[],method:'test',crs:'CRS84',notes:[],featuresNamed:true});

test('classes are the distinct values, in the order they first appear',()=>{
  const c=classifyCategories([BOTH,SV,BOTH,LAM,SV]);
  // NOT ALPHABETISED AND NOT BY FREQUENCY: a reader meets them in the order the data presents
  // them, and sorting by count would reorder the key when one sub-district changed hands.
  assert.deepEqual(c.labels,[BOTH,SV,LAM]);
  assert.equal(c.colours.length,3);
  assert.equal(c.classOf(SV),1);
  assert.equal(c.classOf(`  ${LAM}  `),2);
});

test('UNCLASSIFIED IS NOT A CLASS',()=>{
  // A part nobody has assigned a company to must not be drawn as though it belonged to the
  // first one -- the same rule `classifyValues` keeps for a part with no value.
  const c=classifyCategories([SV,null,undefined,'   ']);
  assert.deepEqual(c.labels,[SV]);
  assert.equal(c.classOf(null),null);
  assert.equal(c.classOf('  '),null);
  assert.equal(c.classOf('Nobody'),null);
  assert.equal(classifyCategories([null,undefined,'']),null);
  assert.equal(classifyCategories([]),null);
});

test('more classes than hues is not a categorical figure',()=>{
  // Inherited from `categoricalSteps` rather than re-decided: repeating a hue asserts a grouping
  // nobody made, and does it invisibly, which is worse than one neutral wash.
  const many=Array.from({length:FIGURE_PALETTE.length},(_,i)=>`class ${i}`);
  assert.ok(classifyCategories(many));
  assert.equal(classifyCategories([...many,'one more']),null);
});

test('A CATEGORICAL FIGURE SHARES ONE HUE PER CLASS, not one per feature',()=>{
  // The whole point: 32 sub-districts, 3 companies, 3 colours. A hue per feature would be 32
  // colours telling a reader nothing about who supplied whom.
  const svg=polygonSvg(polygons([SV,SV,BOTH,BOTH,BOTH,LAM]),esc);
  const fills=[...svg.matchAll(/<path data-catchment[^>]*?fill="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(fills.length,6);
  assert.equal(new Set(fills).size,3);
  assert.equal(fills[0],fills[1]);
  assert.equal(fills[2],fills[4]);
  assert.notEqual(fills[0],fills[2]);
});

test('the key names every class, because a hue has no meaning without its label',()=>{
  // A categorical figure has no ramp to read and no breaks to interpolate, so the key is the
  // only place a reader learns what a colour means.
  const svg=polygonSvg(polygons([SV,BOTH,LAM]),esc);
  for(const label of [SV,BOTH,LAM])assert.ok(svg.includes(esc(label)),`${label} is not in the key`);
  // AND IT SAYS THE SHADE HAS NO ORDER, so a reader does not infer one from the missing breaks.
  assert.match(svg,/the class each part belongs to, which has no order/);
});

test('A CATEGORICAL FIGURE IS NEVER DRAWN ALONG THE RANKED RAMP',()=>{
  // The misreading this is built to prevent, and the one `polygonSvg`'s own comment records a
  // published figure having committed: three water companies drawn in three steps of a
  // lightness sequence assert an order that does not exist.
  const svg=polygonSvg(polygons([SV,BOTH,LAM]),esc);
  const fills=new Set([...svg.matchAll(/<path data-catchment[^>]*?fill="([^"]+)"/g)].map(m=>m[1]));
  for(const fill of fills)
    assert.ok(FIGURE_PALETTE.includes(fill),`${fill} is not a categorical hue`);
  // No quantile breaks printed under a figure that has no quantiles.
  assert.doesNotMatch(svg,/quantile classes/);
});

test('an unclassified part is drawn in the neutral and says so',()=>{
  const svg=polygonSvg(polygons([SV,null,BOTH]),esc);
  assert.ok(svg.includes(FIGURE_ROLE.unknown),'no neutral for the unclassified part');
});

test('the class rides from the table through the join onto the polygon',()=>{
  const table={kind:'data-table',keys:['sub_district','water_supply'],valueField:'deaths 1854',
    unit:'deaths',rowCount:3,missingValueCount:0,rows:[
      {key:{sub_district:'Streatham',water_supply:LAM},value:15},
      {key:{sub_district:'Battersea',water_supply:BOTH},value:171},
      {key:{sub_district:'Rotherhithe',water_supply:SV},value:282}]};
  const units=[{id:'u1',name:'Streatham'},{id:'u2',name:'Battersea'},{id:'u3',name:'Rotherhithe'}];
  const joined=joinTableToAreas(units,table,{keyField:'sub_district',categoryField:'water_supply'});
  assert.deepEqual(joined.parts.map(p=>p.category),[LAM,BOTH,SV]);
  assert.equal(joined.declared.categoryField,'water_supply');
  const boundary={type:'MultiPolygon',coordinates:[square(0).coordinates,square(1).coordinates,
    square(2).coordinates]};
  const shape=joinedPolygons(boundary,joined,'Exposure');
  assert.deepEqual(shape.features.map(f=>f.category),[LAM,BOTH,SV]);
  // The class is a property too, so a popup and a receipt can state it in the table's own words.
  assert.equal(shape.features[0].properties.water_supply,LAM);
});

test('THE DECLARED CLASS DECIDES THE FIGURE, even where a value exists',()=>{
  // Snow's exposure table carries deaths per sub-district AS WELL as the company. The first
  // version let the number win and drew a choropleth of deaths for the one case this feature
  // was built for. A category exists only where somebody asked the join to carry one, so
  // nothing becomes categorical by accident and nothing asked for stays numeric.
  const withBoth=polygons([SV,BOTH,LAM]);
  withBoth.features.forEach((f,i)=>{f.value=[282,171,15][i];});
  const svg=polygonSvg(withBoth,esc);
  assert.ok(svg.includes(esc(SV)),'the class is not in the key');
  assert.doesNotMatch(svg,/quantile classes/);
});

test('a join cannot classify by the column it matched on',()=>{
  const table={kind:'data-table',keys:['sub_district'],valueField:'v',rowCount:1,
    missingValueCount:0,rows:[{key:{sub_district:'Streatham'},value:1}]};
  assert.throws(()=>joinTableToAreas([{id:'u1',name:'Streatham'}],table,
    {keyField:'sub_district',categoryField:'sub_district'}),/every part would be its own class/);
  assert.throws(()=>joinTableToAreas([{id:'u1',name:'Streatham'}],table,
    {keyField:'sub_district',categoryField:'company'}),/no column "company"/);
});
