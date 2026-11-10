import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fitPlacement,lonLatOf,cornersOf,MIN_POINTS} from '../build/georeference.js';

// PLACING A MAP IMAGE FROM MATCHED POINTS (experiment 201).
const near=(a,b,tol,what)=>assert.ok(Math.abs(a-b)<=tol,`${what}: ${a} against ${b}`);

test('an exact affine placement is recovered from its own points, residuals zero, and a world file at the pixel centre',()=>{
  // A plan turned 20 degrees, 0.5 m a pixel, near Hagelloch.
  const t=20*Math.PI/180,s=0.5/111_320,a=s*Math.cos(t),b=s*Math.sin(t),c=9.06,d=-s*Math.sin(t)*0.66,e=-s*Math.cos(t)*0.66,f=48.543;
  const at=(x,y)=>[a*x+b*y+c,d*x+e*y+f];
  const pts=[[10,20],[2000,40],[1900,2300],[50,2400],[1000,1200]].map(([x,y],i)=>({id:`p${i}`,pixel:[x,y],lonlat:at(x,y)}));
  const p=fitPlacement(pts,'affine');
  for(const [k,v] of Object.entries({a,b,c,d,e,f}))near(p.coefficients[k],v,1e-12,k);
  assert.ok(p.maxM<1e-6,`residuals ${p.maxM}`);
  const [lon,lat]=lonLatOf(p.world,1000,1200);near(lon,at(1000,1200)[0],1e-12,'lon');near(lat,at(1000,1200)[1],1e-12,'lat');
  near(p.world.xOrigin,at(0.5,0.5)[0],1e-12,'origin is the top-left pixel centre');
  assert.equal(cornersOf(p.world,2200,2500).length,4);
});

test('too few points, or points on one line, are refused with what to do',()=>{
  assert.equal(MIN_POINTS.affine,3);
  assert.throws(()=>fitPlacement([{id:'a',pixel:[0,0],lonlat:[9,48]},{id:'b',pixel:[10,10],lonlat:[9.1,48.1]}],'affine'),/at least 3 points/);
  assert.throws(()=>fitPlacement([0,1,2].map(i=>({id:String(i),pixel:[i*10,i*10],lonlat:[9+i*0.01,48+i*0.01]})),'affine'),/one line/);
});

const SL=new URL('../../example-1855-cholera-south-london/geo/',import.meta.url);
test('South London Map 2: the four points placed by hand, refitted north-up',{skip:existsSync(new URL('map2-georeference.json',SL))?false:'the South London example is not checked out beside this repository'},()=>{
  const g=JSON.parse(readFileSync(new URL('map2-georeference.json',SL),'utf8'));
  const jgw=readFileSync(new URL('map2-large.jgw',SL),'utf8').trim().split(/\s+/).map(Number);
  const p=fitPlacement(g.controlPoints.map(c=>({id:c.feature,pixel:[c.pixel.x,c.pixel.y],lonlat:[c.wgs84.lon,c.wgs84.lat]})),'north-up');
  // NORTH-SOUTH AGREES with the hand fit: the scale to 0.002% and the top edge to about a metre.
  near(p.world.yScale,jgw[3],1e-9,'y scale');near(p.world.yOrigin,jgw[5],1e-5,'top edge');
  // EAST-WEST DIFFERS, by the direction of the fit: the hand fit predicted pixels from coordinates, this one coordinates
  // from pixels, as GDAL's does. Where the residuals are large the two lines part: 0.1% of scale, about 10 m of edge.
  near(p.world.xScale/jgw[0],0.999,0.001,'x scale ratio');
  near((p.world.xOrigin-jgw[4])*111_320*Math.cos(51.46*Math.PI/180),10,3,'left edge, metres');
  // The same residuals, on the ground: Kennington Oval 144 m east, as recorded by hand (whose sign is in pixels).
  near(p.residuals[0].eastM,-g.controlPoints[0].residual_m.dx,2,'Kennington Oval');
});
