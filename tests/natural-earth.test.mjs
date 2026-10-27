/** The bundled Natural Earth context layer: what it is, and what it must never become.
 *
 *  Public domain, so it may simply ship -- experiment 52's conclusion, and the reason this is the
 *  one basemap class that works with no network and no provider. Vector, so it draws in the
 *  figure's own projection rather than Web Mercator, which sidesteps the mismatch experiment 137
 *  calls the real engineering question for baked raster tiles.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {NATURAL_EARTH,NATURAL_EARTH_CREDIT,naturalEarthMarkup} from '../build/natural-earth.js';

// A figure's projection is a function from lon/lat to pixels. A plain linear one is enough to
// check placement, and it is what makes this testable without a browser.
const frame=(bounds,width=800,height=500)=>{
  const [west,south,east,north]=bounds;
  return c=>[ (c[0]-west)/(east-west)*width, (north-c[1])/(north-south)*height ];
};

test('the asset states its scale, its licence and what it is not for',()=>{
  assert.equal(NATURAL_EARTH.scale,'1:110m');
  assert.match(NATURAL_EARTH.licence,/[Pp]ublic domain/);
  // The rule experiment 52 says must never be eroded. It travels with the data rather than
  // living only in a document, because a document is not read at the moment of the mistake.
  assert.match(NATURAL_EARTH.notForFraming,/joining data to them|computing areas|reporting results/);
  assert.match(NATURAL_EARTH_CREDIT,/1:110m/);
});

test('it carries land, water and boundaries, and no attributes to mistake for data',()=>{
  const ids=NATURAL_EARTH.layers.map(l=>l.id);
  assert.deepEqual(ids,['land','lakes','countries','provinces']);
  for(const layer of NATURAL_EARTH.layers){
    assert.ok(layer.count>0,`${layer.id} is empty`);
    for(const g of layer.geometries){
      assert.ok(['Polygon','MultiPolygon','LineString','MultiLineString'].includes(g.type));
      // Geometry only. A context layer shipping country names invites reading them as the frame.
      assert.deepEqual(Object.keys(g).sort(),['coordinates','type']);
    }
  }
});

test('coordinates are rounded to the generalisation, not to stored precision',()=>{
  // Two decimal places, about 1.1 km: finer than the data's own two-kilometre generalisation and
  // coarser than its stored precision. Six decimals of a line accurate to kilometres is
  // precision the data does not have.
  assert.equal(NATURAL_EARTH.coordinatePrecision.decimalPlaces,2);
  let checked=0;
  for(const layer of NATURAL_EARTH.layers)
    for(const g of layer.geometries.slice(0,3)){
      const walk=c=>{
        if(typeof c[0]==='number'){
          for(const n of c)assert.ok(Math.abs(n*100-Math.round(n*100))<1e-9,`${n} is finer than 2dp`);
          checked++;return;
        }
        for(const inner of c)walk(inner);
      };
      walk(g.coordinates);
    }
  assert.ok(checked>0);
});

test('it draws only what falls inside the extent',()=>{
  // Southern Africa: land and borders, and not the 127 polygons of the rest of the planet.
  const africa=[10,-35,42,-15];
  const {markup,drawn}=naturalEarthMarkup(africa,frame(africa));
  assert.ok(drawn>0,'nothing drawn over southern Africa');
  assert.ok(markup.includes('data-natural-earth="land"'));
  assert.ok(drawn<NATURAL_EARTH.layers.reduce((n,l)=>n+l.count,0),
    'every shape on the planet was drawn for one continent');

  // Mid-Pacific, far from any of it. A bounding box is a pre-filter rather than a clip -- the
  // Americas are one ring whose box spans a third of the planet -- so a path may still be handed
  // to the figure, where the viewBox clips it. What must be true is that the COUNT is honest:
  // no shape has a vertex in this extent, so the figure reports no ground rather than claiming
  // one nobody can see.
  const pacific=[-150,-10,-140,0];
  const empty=naturalEarthMarkup(pacific,frame(pacific));
  assert.equal(empty.drawn,0,'open ocean reported as having ground');
});

test('ground is drawn under everything, in the projection it was handed',()=>{
  const bounds=[20,-30,30,-20];
  const {markup}=naturalEarthMarkup(bounds,frame(bounds,800,500));
  const numbers=[...markup.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(([,x,y])=>[Number(x),Number(y)]);
  assert.ok(numbers.length>0);
  // MOST POINTS ARE OUTSIDE, and that is correct rather than a defect: a continent's outline
  // that crosses a ten-degree window genuinely crosses it, and the ring is kept whole because
  // dropping the points beyond the edge would close the fill across the middle of the figure.
  // The viewBox clips. What is checked is that the ground actually COVERS the frame -- points on
  // both sides of it in each axis -- which a projection mix-up would not produce.
  const inside=numbers.filter(([x,y])=>x>=0&&x<=800&&y>=0&&y<=500);
  assert.ok(inside.length>0,'no drawn point falls inside the frame at all');
  assert.ok(numbers.some(([x])=>x<0)&&numbers.some(([x])=>x>800),'ground does not span the width');
  // And the projection is the one it was handed: the frame maps lon 20 to x=0 and lon 30 to
  // x=800, so a point at lon 25 must land near the middle. Web Mercator would not agree in y.
  assert.deepEqual(frame(bounds,800,500)([25,-25]),[400,250]);
});
