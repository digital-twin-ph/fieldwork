/** A PUBLISHED POLYGON LAYER, read as published.
 *
 *  The fixture is the layer the widget was built for and not a constructed one: the three
 *  territories traced from the colour wash on Snow's Map 2, which had been in the South London
 *  repository since 2026-10-24 and had reached a workflow never, because seven node types emitted
 *  `polygons` and every one of them derived them from something else.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {readPolygonFeatures,polygonLayer,MAX_LAYER_VERTICES} from '../build/polygon-layer.js';

const ZONES='../example-1855-cholera-south-london/geo/map2-water-supply-zones.geojson';
const skip=existsSync(ZONES)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';
const zones=()=>JSON.parse(readFileSync(ZONES,'utf8'));
const square=[[[0,0],[0,1],[1,1],[1,0],[0,0]]];
const collection=features=>({type:'FeatureCollection',features});
const polygon=(props={},coords=square)=>
  ({type:'Feature',properties:props,geometry:{type:'Polygon',coordinates:coords}});

test('Snow\'s three territories arrive as published',{skip},()=>{
  const features=readPolygonFeatures(zones(),{nameField:'supply'});
  assert.equal(features.length,3);
  assert.deepEqual(features.map(f=>f.name),
    ['Southwark and Vauxhall Company','Lambeth Company',
     'Area in which the pipes of both Companies are intermingled']);
  // EVERY VERTEX, ACROSS EVERY RING, which is the measure of what was not simplified: 153, 128 and
  // 107 as published, matching the table in experiment 145. Counted across all rings and not only
  // the outer one -- the first measurement taken for this test summed the first ring of each part
  // and reported 153/107/107, missing Lambeth's two holes entirely. The record was right and the
  // measurement was wrong.
  const vertices=f=>f.geometry.type==='Polygon'
    ?f.geometry.coordinates.reduce((n,r)=>n+r.length,0)
    :f.geometry.coordinates.reduce((n,p)=>n+p.reduce((m,r)=>m+r.length,0),0);
  assert.deepEqual(features.map(vertices),[153,128,107]);
  assert.ok(features.every(f=>f.geometry.type==='MultiPolygon'),'as the file holds them');

  // AND THE HOLES SURVIVE, which is what makes this layer worth reading as published. Lambeth's
  // territory is one part of three rings -- an outer boundary of 107 positions and two interior
  // rings of 9 and 12 -- so there are enclaves inside the Lambeth zone that Lambeth did not
  // supply. A reader cannot see that from a count of features, and a simplifier would have taken
  // them first.
  const rings=f=>f.geometry.coordinates.map(part=>part.map(ring=>ring.length));
  assert.deepEqual(rings(features[0]),[[97],[56]],'two parts, one ring each');
  assert.deepEqual(rings(features[1]),[[107,9,12]],'one part, an outer ring and two holes');
  assert.deepEqual(rings(features[2]),[[107]]);
  // The attributes travel: the purple wash is the zone where supply by sub-district misclassifies,
  // and a reader cannot see that unless the colour and the note come with the shape.
  assert.equal(features[2].properties.snow_colour,'purple');
});

test('the layer is the value seven widgets already consume, with no site',{skip},()=>{
  const value=polygonLayer(readPolygonFeatures(zones(),{nameField:'supply'}),
    {nameField:'supply',layerName:'Water supply territories'});
  assert.equal(value.layerName,'Water supply territories');
  assert.equal(value.crs,'OGC:CRS84');
  assert.deepEqual(value.sites,[],'a polygon read from a file is derived from nothing');
  assert.ok(value.features.every(f=>f.siteId===undefined),
    'and so carries no siteId, rather than one invented to satisfy the field');
  assert.match(value.method,/as published/);
  assert.ok(value.notes.some(n=>/named by supply/.test(n)));
  assert.ok(value.notes.some(n=>/Clipping to the study area is a separate step/.test(n)));
});

test('a layer with no naming property chosen is numbered, not guessed',()=>{
  const features=readPolygonFeatures(collection([polygon({zone:'north'}),polygon({zone:'south'})]),{});
  assert.deepEqual(features.map(f=>f.name),['Feature 1','Feature 2']);
  assert.deepEqual(features.map(f=>f.properties.zone),['north','south'],'attributes are kept');
});

test('a naming property the file does not carry is refused, not fallen back from',()=>{
  assert.throws(()=>readPolygonFeatures(collection([polygon({zone:'north'})]),{nameField:'supply'}),
    /carries no "supply" property/);
  // And the refusal says what the feature DOES carry, so the practitioner can choose again.
  assert.throws(()=>readPolygonFeatures(collection([polygon({zone:'north'})]),{nameField:'supply'}),
    /This feature carries zone\./);
});

test('coordinates that are not CRS84 degrees are refused rather than converted',()=>{
  // Easting and northing in metres, which is what a shapefile exported from a projected CRS gives.
  const projected=[[[529_000,181_000],[529_100,181_000],[529_100,181_100],[529_000,181_000]]];
  assert.throws(()=>readPolygonFeatures(collection([polygon({},projected)]),{}),
    /not in CRS84 degrees/);
  assert.throws(()=>readPolygonFeatures(collection([polygon({},projected)]),{}),
    /refused rather than converted/);
});

test('an unclosed ring is refused, because nothing here closes it for you',()=>{
  const open=[[[0,0],[0,1],[1,1],[1,0]]];
  assert.throws(()=>readPolygonFeatures(collection([polygon({},open)]),{}),
    /does not repeat its first/);
});

test('a geometry that is not a polygon is refused by name',()=>{
  const line={type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[[0,0],[1,1]]}};
  assert.throws(()=>readPolygonFeatures(collection([line]),{}),/is a LineString/);
  const missing={type:'Feature',properties:{}};
  assert.throws(()=>readPolygonFeatures(collection([missing]),{}),/missing its geometry/);
});

test('an empty file is refused rather than imported as an empty layer',()=>{
  assert.throws(()=>readPolygonFeatures(collection([]),{}),/holds no features/);
  assert.throws(()=>readPolygonFeatures({type:'Feature'},{}),/not a GeoJSON FeatureCollection/);
});

/** HOW MANY FEATURES IS NOT A LIMIT, and this used to assert that it was.
 *
 *  `MAX_LAYER_FEATURES=500` refused a layer by its count on the grounds that past it "a layer is
 *  a basemap rather than a study's own geometry" -- a definition asserted, guarding a resource
 *  the vertex budget below already guards on its measured total. It refused a practitioner
 *  holding the Greater London extract 606 water features on 2026-10-29, and a South London water
 *  read before that. Removed; what remains counts. */
test('a thousand small features import, because how many is not what costs',()=>{
  const many=collection(Array.from({length:1000},()=>polygon()));
  assert.equal(readPolygonFeatures(many,{}).length,1000);
});

test('a layer past the vertex budget is refused on the total it actually carries',()=>{
  // A ring of 1,002 positions is 1,001 vertices; 220 of them pass 200,000.
  const ring=[...Array.from({length:1001},(_,i)=>[-0.1+i*1e-6,51.5]),[-0.1,51.5]];
  const heavy=collection(Array.from({length:220},()=>({type:'Feature',properties:{},
    geometry:{type:'Polygon',coordinates:[ring]}})));
  assert.throws(()=>readPolygonFeatures(heavy,{}),
    new RegExp(`${MAX_LAYER_VERTICES.toLocaleString()} vertices`));
});

/** CLIP TO THE BOX, the one function the viewer's preview and the run both use. */
import {clipToBox} from '../build/polygon-layer.js';
const box=(x,y,d)=>({geometry:{type:'Polygon',
  coordinates:[[[x,y],[x+d,y],[x+d,y+d],[x,y+d],[x,y]]]}});

test('a feature wholly outside the box yields nothing and is dropped',()=>{
  assert.equal(clipToBox([box(10,10,1)],[0,0,1,1]).length,0);
});

test('a feature straddling the edge is cut at it, and keeps its other fields',()=>{
  const [cut]=clipToBox([{...box(.5,.5,1),id:'a',name:'Half in'}],[0,0,1,1]);
  assert.equal(cut.id,'a');
  assert.equal(cut.name,'Half in');
  assert.equal(cut.geometry.type,'MultiPolygon');
  // Every position that survives is inside the box, which is what being cut at the edge means.
  for(const ring of cut.geometry.coordinates.flat())
    for(const [x,y] of ring)assert.ok(x>=0&&x<=1&&y>=0&&y<=1,`${x},${y} is outside`);
});

test('a feature wholly inside the box comes through',()=>{
  assert.equal(clipToBox([box(.2,.2,.3)],[0,0,1,1]).length,1);
});

/** THE THREE REDUCTIONS AND THE NAMING, as the practitioner framed them on 2026-10-29:
 *  *"polygon input enables three forms of reduction: keep/discard, clip and merge selected
 *  adjacents."* Clip is tested above; these are the other two, plus the names that make a map
 *  readable. */
import {applyNames,applyMerges,namedByFile} from '../build/polygon-layer.js';

test('a name given here wins over the name the file gave',()=>{
  const read=[{id:'a',name:'Feature 1'},{id:'b',name:'Feature 2'}];
  const named=applyNames(read,{a:'Thames, tidal'});
  assert.equal(named[0].name,'Thames, tidal');
  assert.equal(named[1].name,'Feature 2','a feature nobody renamed keeps what it had');
  assert.equal(read[0].name,'Feature 1','the read is untouched');
});

test('a blank name is no name, not an empty one',()=>{
  assert.equal(applyNames([{id:'a',name:'Feature 1'}],{a:'   '})[0].name,'Feature 1');
});

test('whether the file named a feature is asked of the property, never of the name',()=>{
  assert.equal(namedByFile({properties:{subdist:'Rotherhithe'}},'subdist'),true);
  assert.equal(namedByFile({properties:{subdist:'  '}},'subdist'),false,'blank is not a name');
  assert.equal(namedByFile({properties:{}},'subdist'),false);
  // With no naming property chosen, nothing was named by the file -- including a feature whose
  // automatic name happens to read like one.
  assert.equal(namedByFile({properties:{name:'Feature 3'}}),false);
});

test('merged features become one, keeping the group’s first name and place',()=>{
  const read=[box(0,0,1),box(1,0,1),box(5,5,1)].map((f,i)=>
    ({...f,id:String.fromCharCode(97+i),name:`Feature ${i+1}`}));
  const merged=applyMerges(read,[['a','b']]);
  assert.equal(merged.length,2);
  assert.equal(merged[0].id,'a');
  assert.equal(merged[0].name,'Feature 1');
  assert.equal(merged[0].geometry.type,'MultiPolygon');
  assert.equal(merged[1].id,'c','the untouched one stays where it was read');
});

test('a merge of one, or of ids that are not there, changes nothing',()=>{
  const read=[{...box(0,0,1),id:'a',name:'A'}];
  assert.equal(applyMerges(read,[['a']]).length,1);
  assert.equal(applyMerges(read,[['a','missing']]).length,1);
});

test('a feature cannot be merged into two groups',()=>{
  const read=[box(0,0,1),box(1,0,1),box(2,0,1)].map((f,i)=>
    ({...f,id:String.fromCharCode(97+i),name:`F${i}`}));
  // The second group would take `b` again; it is already spent, so that group makes nothing.
  const merged=applyMerges(read,[['a','b'],['b','c']]);
  assert.equal(merged.length,2,'a+b merged, c left alone');
  assert.deepEqual(merged.map(f=>f.id),['a','c']);
});
