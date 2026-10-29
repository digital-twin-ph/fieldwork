/** POLYGONS FROM AN EXTRACT, against a .osm.pbf this test writes.
 *
 *  There is no .pbf fixture in this repository and `street-engine.browser.mjs` does not decode
 *  one either -- it checks that the wasm entry point exists and tests `extractsFor` separately.
 *  So the file is built here, which is the only way to assert what the reader does with a ring
 *  it cannot close or a feature outside the box, and the only way to pin the granularity
 *  assumption the module records as "checked rather than assumed".
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {areasFromExtract,readBox,AREA_KINDS} from '../build/osm-areas.js';

const varint=n=>{const out=[];let v=n;do{let b=v&0x7f;v=Math.floor(v/128);if(v)b|=0x80;out.push(b);}while(v);return out;};
const zig=n=>n<0?-n*2-1:n*2;
const field=(num,wire)=>varint(num*8+wire);
const bytes=(num,buf)=>[...field(num,2),...varint(buf.length),...buf];
const num=(num_,v)=>[...field(num_,0),...varint(v)];
const packed=(num_,vals)=>bytes(num_,vals.flatMap(varint));

/** A PrimitiveBlock: a stringtable (field 1) and PrimitiveGroups (field 2).
 *
 *  THE NESTING IS THE WHOLE TRICK and this had it wrong first: a Way is field 3 of a
 *  PrimitiveGroup, not of the block. Written at the block's level it is field 3 there, which is
 *  `granularity` -- so the file parsed, every field was read, and no way existed. The reader
 *  returned nothing and was right to. */
const block=(strings,{dense=[],ways=[],relations=[]}={})=>{
  const table=bytes(1,strings.flatMap(s=>bytes(1,[...Buffer.from(s,'utf8')])));
  const groups=[];
  if(dense.length){
    const ids=[],lats=[],lons=[];
    let pid=0,plat=0,plon=0;
    for(const [id,lon,lat] of dense){
      const la=Math.round(lat*1e7),lo=Math.round(lon*1e7);
      ids.push(zig(id-pid));lats.push(zig(la-plat));lons.push(zig(lo-plon));
      pid=id;plat=la;plon=lo;
    }
    groups.push(bytes(2,bytes(2,[...packed(1,ids),...packed(8,lats),...packed(9,lons)])));
  }
  if(ways.length)groups.push(bytes(2,ways.flatMap(w=>{
    const refs=[];let p=0;
    for(const r of w.refs){refs.push(zig(r-p));p=r;}
    return bytes(3,[...num(1,w.id),...packed(2,w.keys),...packed(3,w.values),...packed(8,refs)]);
  })));
  if(relations.length)groups.push(bytes(2,relations.flatMap(r=>{
    const ids=[];let p=0;
    for(const m of r.members){ids.push(zig(m-p));p=m;}
    return bytes(4,[...num(1,r.id),...packed(2,r.keys),...packed(3,r.values),
      ...packed(8,r.roles),...packed(9,ids),...packed(10,r.members.map(()=>1))]);
  })));
  return Buffer.from([...table,...groups.flat()]);
};

/** The blob framing: a four-byte big-endian header length, the BlobHeader, then the Blob. */
const pbf=blocks=>{
  const parts=[];
  for(const body of blocks){
    const z=deflateSync(body);
    const blob=Buffer.from([...num(2,body.length),...bytes(3,[...z])]);
    const header=Buffer.from([...bytes(1,[...Buffer.from('OSMData','utf8')]),...num(3,blob.length)]);
    const len=Buffer.alloc(4);len.writeUInt32BE(header.length);
    parts.push(len,header,blob);
  }
  return new Uint8Array(Buffer.concat(parts));
};

const BOX=[-0.10,51.50,-0.08,51.52];
// 0 natural, 1 water, 2 building, 3 yes, 4 name, 5 The Pond, 6 type, 7 multipolygon, 8 House
const S=['','natural','water','building','yes','name','The Pond','type','multipolygon','House'];

test('a closed way of a requested kind is read, and the other kind is not',async()=>{
  const file=pbf([block(S,{
    dense:[[1,-0.095,51.505],[2,-0.090,51.505],[3,-0.090,51.510],[4,-0.095,51.510]],
    ways:[{id:10,keys:[1,5],values:[2,6],refs:[1,2,3,4,1]},
      {id:11,keys:[3],values:[4],refs:[1,2,3,4,1]}],
  })]);
  const water=await areasFromExtract(file,{kinds:['water'],bbox:BOX,nameTag:'name'});
  assert.equal(water.features.length,1,'only the water way');
  assert.equal(water.features[0].id,'osm-w10');
  assert.equal(water.features[0].name,'The Pond','named by the tag the practitioner chose');
  assert.equal(water.features[0].geometry.type,'Polygon');
  assert.equal(water.retrieval.licence,'ODbL-1.0');
  assert.equal(water.retrieval.kept,1);

  const built=await areasFromExtract(file,{kinds:['building'],bbox:BOX});
  assert.deepEqual(built.features.map(f=>f.id),['osm-w11']);
  assert.equal(built.features[0].name,'Feature 1','numbered when no naming tag is chosen');
});

test('GRANULARITY: coordinates are nanodegree-scaled, which the reader assumes',async()=>{
  const file=pbf([block(S,{
    dense:[[1,-0.095,51.505],[2,-0.0901,51.5052],[3,-0.0902,51.5103],[4,-0.0951,51.5101]],
    ways:[{id:10,keys:[1],values:[2],refs:[1,2,3,4,1]}],
  })]);
  const {features}=await areasFromExtract(file,{kinds:['water'],bbox:BOX});
  const ring=features[0].geometry.coordinates[0];
  assert.deepEqual(ring[1],[-0.0901,51.5052],
    'a block writing the default granularity round-trips to seven decimal places');
});

test('a multipolygon relation is assembled from open fragments, holes and all',async()=>{
  const file=pbf([block(S,{
    dense:[[1,-0.095,51.505],[2,-0.090,51.505],[3,-0.090,51.510],[4,-0.095,51.510],
      [5,-0.094,51.506],[6,-0.093,51.506],[7,-0.093,51.507],[8,-0.094,51.507]],
    // The outer ring arrives as TWO fragments, the second reversed, which is the ordinary case.
    ways:[{id:20,keys:[],values:[],refs:[1,2,3]},{id:21,keys:[],values:[],refs:[1,4,3]},
      {id:22,keys:[],values:[],refs:[5,6,7,8,5]}],
    relations:[{id:30,keys:[6,1],values:[8,2],members:[20,21,22],roles:[0,0,0]}],
  })]);
  const {features}=await areasFromExtract(file,{kinds:['water'],bbox:BOX});
  assert.equal(features.length,1);
  assert.equal(features[0].id,'osm-r30');
  const rings=features[0].geometry.coordinates;
  assert.equal(features[0].geometry.type,'MultiPolygon','two outer rings stitched, so a multipolygon');
  assert.ok(rings.flat().every(r=>r[0].join()===r[r.length-1].join()),'every ring closes');
});

test('a feature outside the box is counted, not returned',async()=>{
  const file=pbf([block(S,{
    dense:[[1,10.0,10.0],[2,10.001,10.0],[3,10.001,10.001],[4,10.0,10.001]],
    ways:[{id:10,keys:[1],values:[2],refs:[1,2,3,4,1]}],
  })]);
  const {features,retrieval}=await areasFromExtract(file,{kinds:['water'],bbox:BOX});
  assert.equal(features.length,0);
  assert.equal(retrieval.dropped.outsideBox,1,'the count is the account for an empty layer');
});

test('a ring that will not close is counted rather than closed for you',async()=>{
  const file=pbf([block(S,{
    dense:[[1,-0.095,51.505],[2,-0.090,51.505],[3,-0.090,51.510],[9,-0.07,51.53]],
    // Two fragments that share no endpoint: nothing joins them, so nothing may assume a ring.
    ways:[{id:20,keys:[],values:[],refs:[1,2]},{id:21,keys:[],values:[],refs:[3,9]}],
    relations:[{id:30,keys:[6,1],values:[8,2],members:[20,21],roles:[0,0]}],
  })]);
  const {features,retrieval}=await areasFromExtract(file,{kinds:['water'],bbox:BOX});
  assert.equal(features.length,0);
  assert.equal(retrieval.dropped.unclosed,2,'both fragments reported, neither silently joined');
});

/** A square is five positions, so these fixtures sit either side of a threshold of five. */
test('a minimum vertex count drops the small features and accounts for them',async()=>{
  const file=pbf([block(S,{
    dense:[[1,-0.095,51.505],[2,-0.090,51.505],[3,-0.090,51.510],[4,-0.095,51.510],
      [5,-0.094,51.506],[6,-0.0935,51.506],[7,-0.0935,51.5065],[8,-0.094,51.5065]],
    ways:[{id:10,keys:[1],values:[2],refs:[1,2,3,4,1]},
      {id:11,keys:[1],values:[2],refs:[5,6,7,8,5]}],
  })]);
  const all=await areasFromExtract(file,{kinds:['water'],bbox:BOX});
  assert.equal(all.features.length,2,'both squares, with no threshold');
  assert.equal(all.retrieval.dropped.belowMinVertices,0);

  const big=await areasFromExtract(file,{kinds:['water'],bbox:BOX,minVertices:6});
  assert.equal(big.features.length,0,'a five-position ring is below six');
  assert.equal(big.retrieval.dropped.belowMinVertices,2,'both counted, so an empty layer has an account');
});

/** The vertex budget is the only thing that refuses a read now. `maxFeatures` went on
 *  2026-10-29: it guarded a resource this already guards, on a measured total rather than on a
 *  count, and it refused a practitioner 606 water features from an extract on their own disk. */
test('the vertex budget states a threshold that would fit, read off what was found',async()=>{
  // Three squares of five positions each: fifteen vertices in all, against a budget of eight.
  const file=pbf([block(S,{
    dense:[[1,-0.095,51.505],[2,-0.090,51.505],[3,-0.090,51.510],[4,-0.095,51.510],
      [5,-0.094,51.506],[6,-0.0935,51.506],[7,-0.0935,51.5065],[8,-0.094,51.5065],
      [11,-0.089,51.506],[12,-0.0885,51.506],[13,-0.0885,51.5065],[14,-0.089,51.5065]],
    ways:[{id:10,keys:[1],values:[2],refs:[1,2,3,4,1]},
      {id:11,keys:[1],values:[2],refs:[5,6,7,8,5]},
      {id:12,keys:[1],values:[2],refs:[11,12,13,14,11]}],
  })]);
  await assert.rejects(()=>areasFromExtract(file,{kinds:['water'],bbox:BOX,maxVertices:8}),
    err=>{
      assert.match(err.message,/carry 15 vertices, past the 8/);
      assert.match(err.message,/minimum of 5 vertices would keep the largest 1/,
        'the number comes from the distribution, not from a guess');
      return true;
    });

  // AND THE COUNT ITSELF REFUSES NOTHING. Three features under the budget import as three.
  const read=await areasFromExtract(file,{kinds:['water'],bbox:BOX});
  assert.equal(read.features.length,3);
});

test('the refusals a caller can rely on',async()=>{
  const file=pbf([block(S,{})]);
  await assert.rejects(()=>areasFromExtract(file,{kinds:[],bbox:BOX}),/at least one kind/);
  await assert.rejects(()=>areasFromExtract(file,{kinds:['water'],bbox:[0,0,0,0]}),/no area/);
  assert.deepEqual([...AREA_KINDS],['water','building']);
});

/** THE BOX THE INSPECTOR OFFERS AND THE BOX THE READ USES ARE THE SAME BOX.
 *
 *  Two computations would be a widget that names Greater London as the extract to download and
 *  then reads outside it. The figures below are the ones measured on 2026-10-28 against the real
 *  study area, so a change to the conversion fails here rather than in a 124 MB read. */
test('the read box widens per axis, and reproduces the measured one',()=>{
  const bounds=[-0.2594,51.4117,-0.0313,51.5086];   // South London's own bounds
  const box=readBox(bounds,5000).map(c=>Number(c.toFixed(4)));
  assert.deepEqual(box,[-0.3316,51.3667,0.0409,51.5536],
    'the box measured at 51.5°N for the 5,000 m South London needs');
  // A DEGREE OF LONGITUDE IS NOT A DEGREE OF LATITUDE anywhere but the equator, and the uniform
  // /111195 the street engine uses would have under-covered east and west by about 2,800 m --
  // more than half the margin, against a lock 4,460 m outside the bounds.
  const [west,south,east,north]=readBox(bounds,5000);
  const dx=bounds[0]-west,dy=bounds[1]-south;
  assert.ok(dx>dy*1.5,`longitude widened by ${dx.toFixed(4)}°, latitude by ${dy.toFixed(4)}°`);
  assert.ok(Math.abs((east-bounds[2])-dx)<1e-12,'both east and west widen by the same amount');
  assert.ok(Math.abs((north-bounds[3])-dy)<1e-12,'both north and south widen by the same amount');
});

test('the margin has no ceiling, and the box stays on the Earth',()=>{
  const bounds=[-0.2594,51.4117,-0.0313,51.5086];
  // 2,000 m is where the Overpass path caps its margin and where the network extract's control
  // stops. South London needs 5,000, so a ceiling here would refuse the study this was built
  // for; 50,000 is not refused either, because the cost of a larger box is a local read.
  for(const margin of [0,2000,5000,50_000]){
    const box=readBox(bounds,margin);
    assert.ok(box[0]<=bounds[0]&&box[2]>=bounds[2],`margin ${margin} covers the bounds`);
  }
  // A margin that would run off the edge of the world is clamped rather than refused: a box with
  // a latitude of 94 is not a box any reader can use.
  const [w,s2,e,nth]=readBox([-179,-89,179,89],500_000);
  assert.deepEqual([w,s2,e,nth],[-180,-90,180,90]);
});

test('a zero margin is the bounds themselves',()=>{
  const bounds=[-0.2594,51.4117,-0.0313,51.5086];
  assert.deepEqual(readBox(bounds,0),bounds,
    'so an unset margin reads exactly the study area’s own box');
});
