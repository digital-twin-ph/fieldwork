import test from 'node:test';
import assert from 'node:assert/strict';
import {combinedArea,validateCombinedAreaNode} from '../build/combined-area.js';
import {metric} from '../build/catchments.js';
import {convexHull} from '../build/convex-hull.js';

const node=p=>({id:'u',type:'summarize_combined_area',x:0,y:0,
  params:{label:'Combined area',zone:30,hemisphere:'north',...p}});
const m=metric(30,'north');
// A square of the given side in metres, placed at an easting offset, as longitude/latitude.
const square=(offsetM,sideM)=>{
  const o=m.forward([-0.14,51.51]);
  const ring=[[0,0],[sideM,0],[sideM,sideM],[0,sideM],[0,0]]
    .map(([x,y])=>m.inverse([o[0]+offsetM+x,o[1]+y]));
  return {id:`s-${offsetM}`,siteId:`s-${offsetM}`,name:`Square at ${offsetM}`,
    geometry:{type:'Polygon',coordinates:[ring]}};
};
const polys=(...features)=>({features,sites:[],method:'test',crs:'EPSG:32630',notes:[]});

test('two overlapping areas become one piece, and the overlap is reported',()=>{
  // Two 100 m squares offset by 50 m: 20,000 m² of parts, 15,000 m² combined.
  const got=combinedArea(polys(square(0,100),square(50,100)),node(),'r','src');
  assert.equal(got.value.features.length,1,'one combined feature');
  assert.equal(got.value.features[0].geometry.type,'MultiPolygon');
  assert.equal(got.value.features[0].geometry.coordinates.length,1,'they touch, so one piece');
  const said=got.value.notes.join(' ');
  assert.match(said,/2 areas combined into 1 separate piece/);
  assert.match(got.receipt.facts,/fw:partsAreaSquareMetres 2000\d/);
  assert.match(got.receipt.facts,/fw:combinedAreaSquareMetres 1500\d/);
});

test('areas that do not touch stay separate, and are counted',()=>{
  const got=combinedArea(polys(square(0,100),square(5000,100)),node(),'r','src');
  assert.equal(got.value.features[0].geometry.coordinates.length,2,'two pieces');
  assert.match(got.value.notes.join(' '),/combined into 2 separate pieces/);
  assert.match(got.receipt.facts,/fw:combinedPieceCount 2/);
  // Nothing overlaps, so the parts and the combined area agree.
  const [,parts,combined]=/partsAreaSquareMetres ([\d.]+).*combinedAreaSquareMetres ([\d.]+)/s
    .exec(got.receipt.facts);
  assert.ok(Math.abs(Number(parts)-Number(combined))<1,'no overlap, no difference');
});

test('the result says what combining discarded',()=>{
  const got=combinedArea(polys(square(0,100),square(50,100)),node(),'r','src');
  const said=got.value.notes.join(' ')+got.receipt.method;
  assert.match(said,/whether anywhere is covered, not how well/);
  assert.match(said,/which facility, which site — is discarded/);
  assert.match(said,/covered more than once/);
});

test('one area combines to itself',()=>{
  const got=combinedArea(polys(square(0,100)),node(),'r','src');
  assert.equal(got.value.features[0].geometry.coordinates.length,1);
  assert.match(got.receipt.facts,/fw:partCount 1/);
});

test('it refuses an empty input and a bad zone',()=>{
  assert.throws(()=>combinedArea(polys(),node(),'r','src'),/no areas to combine/);
  assert.throws(()=>validateCombinedAreaNode(node({zone:99})),/UTM zone/);
  assert.throws(()=>validateCombinedAreaNode(node({label:''})),/Name the combined area/);
});

test('hulls combine, which is the order NB03 uses',()=>{
  // NB03 buffers the reached segments, hulls them, then unions: hull emits polygons, this takes them.
  const pts=(...xy)=>({features:xy.map(([x,y],i)=>({id:`p${i}`,siteId:`p${i}`,name:`p${i}`,
    geometry:{type:'Point',coordinates:m.inverse([m.forward([-0.14,51.51])[0]+x,m.forward([-0.14,51.51])[1]+y])}})),
    method:'test',crs:'EPSG:4326',notes:[]});
  const hullNode=p=>({id:'h',type:'summarize_hull',x:0,y:0,
    params:{label:'Hull',zone:30,hemisphere:'north',...p}});
  const a=convexHull(pts([0,0],[300,0],[300,300],[0,300]),hullNode(),'r','src').value;
  const b=convexHull(pts([200,0],[500,0],[500,300],[200,300]),hullNode(),'r','src').value;
  const joined={...a,features:[...a.features,...b.features]};
  const got=combinedArea(joined,node(),'r','hulls');
  assert.equal(got.value.features.length,1,'two overlapping hulls combine to one');
  const area=Number(/fw:combinedAreaSquareMetres ([\d.]+)/.exec(got.receipt.facts)[1]);
  assert.ok(area>90000,`the combination is no smaller than either hull, got ${area}`);
  assert.ok(area<180000,`and smaller than the two added together, got ${area}`);
});
