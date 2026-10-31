/** A georeferenced plate drawn as ground: where it goes, and what it refuses.
 *
 *  The refusals are the interesting half. A plate that is drawn in the wrong place looks exactly
 *  like a plate drawn in the right one, so the cases that must fail are the ones worth writing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readWorldFile,boundsFromWorldFile,groundResolution,mapImage,mapImageMarkup,
  mapImageCredit,withGroundUnder,DEFAULT_OPACITY} from '../build/map-image.js';

// geo/map2.jgw from the South London example, byte for byte.
const JGW='0.000227723765\n0.0\n0.0\n-0.000142057361\n-0.2389834422\n51.5181208251\n';
const PIXELS={width:1002,height:788};

test('a world file reads as six coefficients in the order ESRI writes them',()=>{
  const w=readWorldFile(JGW);
  assert.equal(w.xScale,0.000227723765);
  assert.equal(w.ySkew,0);assert.equal(w.xSkew,0);
  assert.equal(w.yScale,-0.000142057361);
  assert.equal(w.xOrigin,-0.2389834422);assert.equal(w.yOrigin,51.5181208251);
});

test('it refuses anything that is not six numbers',()=>{
  assert.throws(()=>readWorldFile('1 2 3'),/six numbers/);
  assert.throws(()=>readWorldFile('1 2 3 4 5 six'),/six numbers/);
});

test('the extent runs half a pixel beyond the origin, which is a pixel CENTRE',()=>{
  const w=readWorldFile(JGW);
  const [west,south,east,north]=boundsFromWorldFile(w,PIXELS.width,PIXELS.height);
  assert.ok(west<east&&south<north);
  // Half a pixel out on each side, not from the centre of the corner pixel.
  assert.ok(Math.abs(west-(w.xOrigin-w.xScale/2))<1e-12);
  assert.ok(Math.abs(north-(w.yOrigin-w.yScale/2))<1e-12);
  // South London: about 0.228 degrees of longitude, a shade over 15 km.
  assert.ok(Math.abs((east-west)-w.xScale*PIXELS.width)<1e-12);
  assert.ok(east<0.1&&west>-0.3&&south>51.4&&north<51.6,`${[west,south,east,north]}`);
});

test('a rotated world file is refused rather than drawn as an upright box',()=>{
  // The failure this prevents is a map in the wrong place that looks entirely correct.
  assert.throws(()=>boundsFromWorldFile({...readWorldFile(JGW),xSkew:0.0001},1002,788),
    /at an angle|wrong place/);
  assert.throws(()=>boundsFromWorldFile({...readWorldFile(JGW),ySkew:0.0001},1002,788),
    /at an angle|wrong place/);
});

test('a flipped or degenerate image is refused by name',()=>{
  const w=readWorldFile(JGW);
  assert.throws(()=>boundsFromWorldFile({...w,yScale:0.0001},1002,788),/negative for a north-up/);
  assert.throws(()=>boundsFromWorldFile({...w,xScale:-0.0001},1002,788),/must be positive/);
  assert.throws(()=>boundsFromWorldFile(w,0,788),/width and a height/);
});

test('ground resolution says what the plate can and cannot show',()=>{
  const bounds=boundsFromWorldFile(readWorldFile(JGW),PIXELS.width,PIXELS.height);
  const m=groundResolution(bounds,PIXELS.width,PIXELS.height);
  // About 16 m per pixel: enough for the river and the parish outlines, not for a street.
  assert.ok(m>10&&m<25,`${m} m per pixel`);
});

const node=(params={})=>({id:'plate',type:'map_image_input',x:0,y:0,params:{
  label:"Snow's Map 2",data:'data:image/jpeg;base64,/9j/AAAA',
  image:{width:1002,height:788,bytes:260535,sha256:'a3131c5fc9ad7605ae1c9b79d58ad3f54baab1cda26bfa176b9a2cfa2cc297f0',filename:'map2.jpg'},
  bounds:boundsFromWorldFile(readWorldFile(JGW),1002,788),
  source:{title:"John Snow, Map 2, 1855",licence:'Public domain'},...params}});

test('a plate carries its resolution, its credit and a default opacity',()=>{
  const image=mapImage(node());
  assert.equal(image.kind,'map-image');
  assert.equal(image.opacity,DEFAULT_OPACITY);
  assert.ok(image.groundResolutionM>10&&image.groundResolutionM<25);
  assert.match(mapImageCredit(image),/John Snow/);
  // A credit names the work, never the provenance vocabulary's internal words. `none-applies`
  // says no terms attach, which is not a thing to print on a map.
  assert.ok(!/none-applies|unstated/.test(mapImageCredit({...image,
    source:{title:'John Snow, Map 2, 1855',licence:'none-applies'}})));
  assert.match(mapImageCredit({...image,source:{title:'Zones',licence:'ODbL-1.0'}}),/ODbL-1\.0/);
});

test('a plate with no image, crossed corners or corners off the world is refused',()=>{
  assert.throws(()=>mapImage(node({data:undefined})),/no image yet/);
  assert.throws(()=>mapImage(node({bounds:[1,51,0,52]})),/corners cross/);
  assert.throws(()=>mapImage(node({bounds:[0,51,1,50]})),/corners cross/);
  // A projected georeference, read as degrees, lands outside the world.
  assert.throws(()=>mapImage(node({bounds:[500000,5700000,510000,5710000]})),/outside the world/);
});

test('it is placed through the projection it is handed, not through Web Mercator',()=>{
  const image=mapImage(node());
  const [west,south,east,north]=image.bounds;
  const project=c=>[(c[0]-west)/(east-west)*800,(north-c[1])/(north-south)*500];
  const markup=mapImageMarkup(image,project);
  // The plate fills the frame it was projected into, to the pixel.
  assert.match(markup,/x="0\.0"/);assert.match(markup,/y="0\.0"/);
  assert.match(markup,/width="800\.0"/);assert.match(markup,/height="500\.0"/);
  assert.match(markup,/opacity="0\.85"/);
  assert.ok(markup.includes('href="data:image/jpeg'));
  // A projection that sends it nowhere finite draws nothing rather than NaN.
  assert.equal(mapImageMarkup(image,()=>[NaN,NaN]),'');
});

/** GROUND UNDER A FIGURE COMPOSED AS A STRING.
 *
 *  The write-up's figure never becomes an element before it is published, so it cannot be
 *  composited the way the live map's SVG is. Measured in the application on 2026-10-30: the same
 *  map carried Snow's plate on the screen and not in the write-up, and nothing asserted either
 *  way. These are the assertions that were missing.
 */
const CONTENT='<rect width="850" height="295" fill="#f0f3e9"/>'
  +'<text x="18" y="22">STUDY AREA</text>'
  +'<path data-fill-role="context" d="M1,2L3,4Z" fill="#dbe8d6" stroke="#668870" fill-rule="evenodd"/>';
const GROUND='<image data-map-image="abc" href="data:image/jpeg;base64,AAAA"/>';

test('the ground goes above the background and below everything drawn',()=>{
  const out=withGroundUnder(CONTENT,GROUND);
  const rect=out.indexOf('<rect'),image=out.indexOf('<image'),area=out.indexOf('<path');
  assert.ok(rect<image,'the plate is under the background, where no reader can see it');
  assert.ok(image<area,'the plate is over the study area, which is what it is ground for');
});

test('A WASH THAT ENCODES NOTHING IS WITHDRAWN, so the ink shows through',()=>{
  // The same rule `drawStaticBasemap` applies in the DOM: a boundary says WHERE the study area
  // is and measures nothing, so its pale fill is spending a visual variable on hiding the plate.
  const out=withGroundUnder(CONTENT,GROUND);
  assert.match(out,/data-fill-role="context"[^>]*fill="none"/);
  assert.ok(!out.includes('fill="#dbe8d6"'));
  // And only the fill: the stroke is what still says where the boundary runs, and `fill-rule`
  // is a different attribute that happens to start with the same five letters.
  assert.ok(out.includes('stroke="#668870"'));
  assert.ok(out.includes('fill-rule="evenodd"'));
});

test('no plate leaves the figure exactly as it was',()=>{
  // A figure with nothing wired to ground, a plate with no image chosen yet, and a projection
  // that puts one nowhere finite all arrive here as an empty string, and none of them is a
  // reason to touch the fills.
  assert.equal(withGroundUnder(CONTENT,''),CONTENT);
  assert.equal(withGroundUnder(CONTENT,'   '),CONTENT);
});

test('content with no background rect still gets its ground, underneath',()=>{
  // `polygonSvg` returns a bare `<text>` when there is nothing to draw. A plate under that is
  // odd but it is not wrong, and guessing at an insertion point would be.
  const bare='<text x="30" y="40">No intersecting polygons</text>';
  assert.equal(withGroundUnder(bare,GROUND),GROUND+bare);
});
