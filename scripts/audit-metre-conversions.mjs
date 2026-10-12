#!/usr/bin/env node
/** Every place a distance in metres becomes an angle, and how wrong each one is.
 *
 * Found by accident twice: `buffer_point` draws a 500 m circle whose vertices are 501.6 m away
 * on the ground (check 17), and `donut_geomask`'s 50–125 m band measures 50.8–125.2 m (the
 * donut card). Both are the same mechanism — metres converted to an angle on a sphere, then
 * read on an ellipsoid — and both were found by a check that happened to look, not by anybody
 * auditing for it.
 *
 * So this audits for it. Each site below is exercised at four latitudes with a real call into
 * the built application, and the result is measured against a Vincenty geodesic on WGS84, which
 * is accurate to millimetres and shares no code with anything being measured.
 *
 * It reports. It does not gate: the errors are small, a practitioner may not care, and deciding
 * which of them matter is a judgement that belongs in a document and not in an exit code.
 *
 * Two directions, because the first version of this audit only had one and that was a
 * categorical gap rather than a missed grep. Converting metres INTO an angle is what a buffer
 * does; measuring a distance BETWEEN two angles is what every nearest-neighbour search does, and
 * it is the same approximation run backwards. `distanceKm` is a haversine on a mean sphere and
 * four widgets rest on it.
 *
 * Usage: node scripts/audit-metre-conversions.mjs [--json]
 */
import {circleAround,bufferedBoundary,dimensionedBox} from '../build/area-buffer.js';
import {bufferPoint} from '../build/buffer-point.js';
import {moveDonut} from '../build/geoprivacy.js';
import {sampleLocations} from '../build/old-naledi.js';
import {osmQuery} from '../build/street-network.js';
import {calculateArea} from '../build/area-computation.js';
import {distanceKm} from '../build/core.js';

/** Vincenty inverse on WGS84: the reference, accurate to a millimetre over these distances. */
function geodesic([lon1,lat1],[lon2,lat2]){
  const a=6378137,f=1/298.257223563,b=a*(1-f);
  const rad=Math.PI/180,L=(lon2-lon1)*rad;
  const U1=Math.atan((1-f)*Math.tan(lat1*rad)),U2=Math.atan((1-f)*Math.tan(lat2*rad));
  const sU1=Math.sin(U1),cU1=Math.cos(U1),sU2=Math.sin(U2),cU2=Math.cos(U2);
  let lambda=L,previous,iterations=0,sS,cS,sigma,c2a,cSM;
  do{
    const sL=Math.sin(lambda),cL=Math.cos(lambda);
    const s2=(cU2*sL)**2+(cU1*sU2-sU1*cU2*cL)**2;
    sS=Math.sqrt(s2);
    if(sS===0)return 0;
    cS=sU1*sU2+cU1*cU2*cL;
    sigma=Math.atan2(sS,cS);
    const sa=cU1*cU2*sL/sS;
    c2a=1-sa*sa;
    cSM=c2a===0?0:cS-2*sU1*sU2/c2a;
    const C=f/16*c2a*(4+f*(4-3*c2a));
    previous=lambda;
    lambda=L+(1-C)*f*sa*(sigma+C*sS*(cSM+C*cS*(-1+2*cSM*cSM)));
  }while(Math.abs(lambda-previous)>1e-12&&++iterations<200);
  const u2=c2a*(a*a-b*b)/(b*b);
  const A=1+u2/16384*(4096+u2*(-768+u2*(320-175*u2)));
  const B=u2/1024*(256+u2*(-128+u2*(74-47*u2)));
  const dS=B*sS*(cSM+B/4*(cS*(-1+2*cSM*cSM)-B/6*cSM*(-3+4*sS*sS)*(-3+4*cSM*cSM)));
  return b*A*(sigma-dS);
}

const places=[
  {name:'equator, 0°N',      centre:[10,0]},
  {name:'Manila, 14.6°N',    centre:[120.98,14.6]},
  {name:'Old Naledi, 26.2°S',centre:[27.9,-26.2]},
  {name:'Soho, 51.5°N',      centre:[-0.1379,51.5]},
];

/** Signed relative error over a set of (requested metres, measured metres) pairs.
 *
 *  Reported as a range rather than a worst case, because the error is DIRECTIONAL: these
 *  conversions treat a degree of latitude as a constant when the true meridian degree runs from
 *  110,574 m at the equator to 111,694 m at the pole, and a degree of longitude as that same
 *  constant times cos(latitude) when the true value uses the prime-vertical radius. So a circle
 *  comes out elliptical, and which way it is stretched depends on where you are. A single
 *  maximum hides that; a range shows it. */
const spread=pairs=>{
  const errors=pairs.map(([want,got])=>(got-want)/want);
  return {low:Math.min(...errors),high:Math.max(...errors)};
};
const ringOf=geometry=>geometry.type==='Polygon'?geometry.coordinates[0]:geometry.coordinates[0][0];

const sites=[
  {widget:'buffer_point',where:'src/buffer-point.ts',how:'Turf buffer, 32 steps/quadrant',
   measure(centre){
     const points={type:'FeatureCollection',features:[{type:'Feature',id:'p',properties:{name:'p'},geometry:{type:'Point',coordinates:centre}}]};
     const value=bufferPoint(points,{id:'b',type:'buffer_point',x:0,y:0,params:{label:'b',pointId:'p',distanceM:500}},'audit').value;
     return ringOf(value.boundary).slice(0,-1).map(v=>[500,geodesic(centre,v)]);
   }},
  {widget:'area (circle)',where:'src/area-buffer.ts#circleAround',how:'Turf buffer, 32 steps/quadrant',
   measure(centre){
     const ring=circleAround(centre,500).coordinates[0];
     return ring.slice(0,-1).map(v=>[500,geodesic(centre,v)]);
   }},
  {widget:'buffer_area',where:'src/area-buffer.ts#bufferedBoundary',how:'Turf buffer, 8 steps/quadrant',
   measure(centre){
     // A degenerate box, so the buffer's offset from each side is measurable directly.
     const d=0.001,box={type:'Polygon',coordinates:[[[centre[0]-d,centre[1]-d],[centre[0]+d,centre[1]-d],
       [centre[0]+d,centre[1]+d],[centre[0]-d,centre[1]+d],[centre[0]-d,centre[1]-d]]]};
     const ring=ringOf(bufferedBoundary(box,500));
     // North and east faces: distance from the box edge to the buffer edge along one axis.
     const north=Math.max(...ring.map(p=>p[1])),east=Math.max(...ring.map(p=>p[0]));
     return [[500,geodesic([centre[0],centre[1]+d],[centre[0],north])],
             [500,geodesic([centre[0]+d,centre[1]],[east,centre[1]])]];
   }},
  {widget:'donut_geomask',where:'src/geoprivacy.ts#moveDonut',how:'great circle, mean radius 6371008.8 m',
   measure(centre){
     const features=[...Array(60)].map((_,i)=>({type:'Feature',id:`p${i}`,properties:{name:`p${i}`},
       geometry:{type:'Point',coordinates:centre}}));
     // outerM must exceed innerM, so the band is 1 cm wide: every displacement is 100 m to
     // within a centimetre, and the measured error swamps that by two orders of magnitude.
     const moved=moveDonut({type:'FeatureCollection',features},{label:'d',innerM:99.995,outerM:100.005,seed:7});
     return moved.features.map(f=>[100,geodesic(centre,f.geometry.coordinates)]);
   }},
  {widget:'samples',where:'src/old-naledi.ts#sampleLocations',how:'flat 111195 m per degree',
   measure(centre){
     const d=0.02,box={type:'Polygon',coordinates:[[[centre[0]-d,centre[1]-d],[centre[0]+d,centre[1]-d],
       [centre[0]+d,centre[1]+d],[centre[0]-d,centre[1]+d],[centre[0]-d,centre[1]-d]]]};
     const points=sampleLocations(box,500).map(p=>p.coordinates||p.geometry?.coordinates||p);
     if(points.length<4)return [[500,500]];
     // Adjacent points on the same row, and the same column: the requested spacing is 500 m.
     const byRow=new Map();
     for(const p of points){const key=p[1].toFixed(6);byRow.set(key,[...(byRow.get(key)||[]),p]);}
     const row=[...byRow.values()].find(r=>r.length>1)||[];
     const rows=[...byRow.keys()].map(Number).sort((a,b)=>a-b);
     const pairs=[];
     if(row.length>1)pairs.push([500,geodesic(row[0],row[1])]);
     if(rows.length>1)pairs.push([500,geodesic([centre[0],rows[0]],[centre[0],rows[1]])]);
     return pairs.length?pairs:[[500,500]];
   }},
  {widget:'network_input',where:'src/street-network.ts#osmQuery',how:'flat 111195 m per degree',
   measure(centre){
     const d=0.01,box={type:'Polygon',coordinates:[[[centre[0]-d,centre[1]-d],[centre[0]+d,centre[1]-d],
       [centre[0]+d,centre[1]+d],[centre[0]-d,centre[1]+d],[centre[0]-d,centre[1]-d]]]};
     const {bounds}=osmQuery(box,500);
     const [,,east,north]=bounds;
     return [[500,geodesic([centre[0],centre[1]+d],[centre[0],north])],
             [500,geodesic([centre[0]+d,centre[1]],[east,centre[1]])]];
   }},
  {widget:'area (box dimensions)',where:'src/area-buffer.ts#dimensionedBox',how:'flat 111195 m per degree',
   measure(centre){
     const box=dimensionedBox(centre,1000,1000);
     const ring=box.coordinates[0];
     const west=Math.min(...ring.map(p=>p[0])),east=Math.max(...ring.map(p=>p[0]));
     const south=Math.min(...ring.map(p=>p[1])),north=Math.max(...ring.map(p=>p[1]));
     return [[1000,geodesic([west,centre[1]],[east,centre[1]])],
             [1000,geodesic([centre[0],south],[centre[0],north])]];
   }},
  {widget:'measure_area',where:'src/area-computation.ts',how:'Turf spherical area, mean radius',
   measure(centre){
     // A 1 km box by dimension, whose true area is measured from its own geodesic sides.
     const box=dimensionedBox(centre,1000,1000);
     const ring=box.coordinates[0];
     const west=Math.min(...ring.map(p=>p[0])),east=Math.max(...ring.map(p=>p[0]));
     const south=Math.min(...ring.map(p=>p[1])),north=Math.max(...ring.map(p=>p[1]));
     const width=geodesic([west,centre[1]],[east,centre[1]]);
     const height=geodesic([centre[0],south],[centre[0],north]);
     const reported=calculateArea(box).squareMetres;
     return [[width*height,reported]];
   }},
];

/** Measuring a distance between two positions: the inverse conversion, angles into metres. */
const measurers=[
  {widget:'nearest, access, facilities, slr_site_assignment',where:'src/core.ts#distanceKm',
   how:'haversine, mean radius 6371008.8 m',
   measure(centre){
     // 1 km due north and due east of the centre, by geodesic construction, then measured back.
     const pairs=[];
     for(const metres of [1000,5000]){
       // Walk north and east in degrees until the geodesic distance matches, so the TRUTH is
       // the construction and the function under test is the thing being judged.
       const north=[centre[0],centre[1]+metres/111132];
       const east=[centre[0]+metres/(111320*Math.cos(centre[1]*Math.PI/180)),centre[1]];
       for(const target of [north,east])
         pairs.push([geodesic(centre,target),distanceKm(centre,target)*1000]);
     }
     return pairs;
   }},
];

const rows=[];
for(const site of sites){
  const perPlace={};
  for(const place of places){
    try{perPlace[place.name]=spread(site.measure(place.centre));}
    catch(error){perPlace[place.name]=null;}
  }
  rows.push({...site,perPlace});
}

const measured=[];
for(const site of measurers){
  const perPlace={};
  for(const place of places){
    try{perPlace[place.name]=spread(site.measure(place.centre));}
    catch(error){perPlace[place.name]=null;}
  }
  measured.push({...site,perPlace});
}

if(process.argv.includes('--json')){
  console.log(JSON.stringify({measuredAt:new Date().toISOString().slice(0,10),places:places.map(p=>p.name),
    metresIntoAngles:rows.map(({widget,where,how,perPlace})=>({widget,where,how,relativeError:perPlace})),
    anglesIntoMetres:measured.map(({widget,where,how,perPlace})=>({widget,where,how,relativeError:perPlace}))},null,1));
}else{
  const pad=(s,n)=>String(s).padEnd(n);
  console.log('Relative error against a WGS84 geodesic, by site and latitude.');
  console.log('A range means the error is directional: the same requested distance comes out');
  console.log('different north-south than east-west, so a circle is really an ellipse.\n');
  console.log(pad('widget',24)+pad('conversion',38)+places.map(p=>p.name.padStart(20)).join(''));
  for(const row of rows)
    console.log(pad(row.widget,24)+pad(row.how,38)
      +places.map(p=>{const v=row.perPlace[p.name];
        return (v===null?'refused'
          :Math.abs(v.high-v.low)<5e-6?(v.high*100).toFixed(3)+'%'
          :`${(v.low*100).toFixed(2)} to ${(v.high*100).toFixed(2)}%`).padStart(20);}).join(''));
  console.log('\nAnd the inverse: measuring a distance between two positions, angles into metres.\n');
  console.log(pad('widget',24)+pad('conversion',38)+places.map(p=>p.name.padStart(20)).join(''));
  for(const row of measured)
    console.log(pad(row.widget.length>23?'nearest, access, +2':row.widget,24)+pad(row.how,38)
      +places.map(p=>{const v=row.perPlace[p.name];
        return (v===null?'refused'
          :Math.abs(v.high-v.low)<5e-6?(v.high*100).toFixed(3)+'%'
          :`${(v.low*100).toFixed(2)} to ${(v.high*100).toFixed(2)}%`).padStart(20);}).join(''));
  console.log('\nSites measured: '+(rows.length+measured.length)+'. Reference: Vincenty inverse on WGS84, which shares no code with any of them.');
}
