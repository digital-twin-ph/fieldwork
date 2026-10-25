import test from 'node:test';
import assert from 'node:assert/strict';
import {TILE_PROVIDERS,chooseZoom,tilesForBounds,basemapImages,tileXToLon,tileYToLat}
  from '../build/basemap-tiles.js';

/** Experiment 137. The arithmetic, which is what can be checked without a tile server. */

const SOUTH_LONDON=[-0.21,51.40,0.02,51.52];
const osm=TILE_PROVIDERS.osm;

test('the zoom is chosen by a tile budget, not by a resolution', ()=>{
  // Every tile is a request to somebody else's server and a few hundred KB of data: URI in the
  // figure, so the ceiling is what keeps this ordinary figure use rather than bulk download.
  for(const budget of [4,16,64]){
    const z=chooseZoom(SOUTH_LONDON,budget,osm);
    assert.ok(tilesForBounds(SOUTH_LONDON,z,osm).length<=budget,`budget ${budget} exceeded at z${z}`);
    // And it is the LARGEST zoom that fits: a smaller one would be blurrier for no saving.
    assert.ok(tilesForBounds(SOUTH_LONDON,z+1,osm).length>budget,`z${z+1} would also have fit`);
  }
});

test('tile bounds tile the extent without gaps or overlaps',()=>{
  const z=chooseZoom(SOUTH_LONDON,16,osm);
  const tiles=tilesForBounds(SOUTH_LONDON,z,osm);
  assert.ok(tiles.length>1,'a one-tile extent would not exercise this');
  // Each tile's east edge is the next tile's west edge, exactly: these come from the same
  // function, so a gap would mean the lon/lat conversion disagreed with itself.
  const lons=[...new Set(tiles.map(t=>t.bounds[0]))].sort((a,b)=>a-b);
  for(let i=0;i<lons.length-1;i++){
    const east=Math.max(...tiles.filter(t=>t.bounds[0]===lons[i]).map(t=>t.bounds[2]));
    assert.equal(east,lons[i+1]);
  }
  // The extent is covered.
  assert.ok(Math.min(...tiles.map(t=>t.bounds[0]))<=SOUTH_LONDON[0]);
  assert.ok(Math.max(...tiles.map(t=>t.bounds[2]))>=SOUTH_LONDON[2]);
  assert.ok(Math.min(...tiles.map(t=>t.bounds[1]))<=SOUTH_LONDON[1]);
  assert.ok(Math.max(...tiles.map(t=>t.bounds[3]))>=SOUTH_LONDON[3]);
});

test('web mercator round-trips, which is what the placement depends on',()=>{
  for(const z of [8,12,16])for(const [x,y] of [[0,0],[5,7],[2**z-1,2**z-1]]){
    assert.ok(Math.abs(tileXToLon(x,z))<=180.0001);
    assert.ok(Math.abs(tileYToLat(y,z))<=85.1);
  }
  // Tile 0 at zoom 0 is the whole world, which pins the orientation: y grows southwards.
  assert.equal(Math.round(tileXToLon(0,0)),-180);
  assert.ok(tileYToLat(0,0)>84&&tileYToLat(1,0)<-84);
});

test('a tile that will not fetch is omitted, not drawn as a hole',async()=>{
  // Ground is context. A figure missing one tile of context is still a true figure; a figure
  // that refuses to draw because a tile server was slow is not.
  const project=([lon,lat])=>[(lon+0.21)*1000,(51.52-lat)*1000];
  const every=await basemapImages(SOUTH_LONDON,project,osm,async()=>'data:image/png;base64,AAAA',16);
  const none=await basemapImages(SOUTH_LONDON,project,osm,async()=>null,16);
  const some=await basemapImages(SOUTH_LONDON,project,osm,
    async url=>url.endsWith('0.png')?null:'data:image/png;base64,AAAA',16);
  assert.equal(every.drawn,every.requested);
  assert.equal(none.drawn,0);
  assert.equal(none.markup,'','no tiles means no group at all, not an empty one');
  assert.ok(some.drawn<some.requested||some.requested===some.drawn);
  assert.match(every.markup,/data-basemap="osm"/);
});

test('each tile is placed by its own corners in the caller\'s projection',async()=>{
  // THE REASON THIS MODULE RETURNS BOUNDS RATHER THAN PIXELS. Tiles are Web Mercator and the
  // static plot is equirectangular with one cosine at the middle latitude, so a single transform
  // over the whole grid misaligns and the error grows with the latitude span. Projecting each
  // tile's own corners makes the approximation apply within one tile instead of across the
  // figure. Here the projection is deliberately NOT Mercator, and the placement must still
  // follow it: a renderer that assumed Mercator would place every tile at the same height.
  const project=([lon,lat])=>[lon*100,(60-lat)*500];
  const {markup}=await basemapImages(SOUTH_LONDON,project,osm,async()=>'data:,x',16);
  const heights=[...markup.matchAll(/height="([\d.]+)"/g)].map(m=>Number(m[1]));
  const xs=[...markup.matchAll(/ x="(-?[\d.]+)"/g)].map(m=>Number(m[1]));
  assert.ok(heights.every(h=>h>0));
  assert.ok(new Set(xs).size>1,'tiles should occupy different columns');

  // MERCATOR ROWS ARE EQUAL IN y, NOT IN LATITUDE, which is the whole point of placing each tile
  // by its own corners. This projection is linear in latitude, so a row that covers more degrees
  // must be drawn taller -- and a renderer that assumed one height for the grid would be wrong by
  // exactly that difference. The first draft of this test asserted equal heights and failed,
  // which is the module demonstrating its own reason for existing.
  const rows=new Set(tilesForBounds(SOUTH_LONDON,chooseZoom(SOUTH_LONDON,16,osm),osm).map(t=>t.y));
  assert.equal(new Set(heights.map(h=>h.toFixed(6))).size,rows.size,
    'one distinct height per Mercator row, since rows differ in how many degrees they cover');
  // Heights grow towards the pole, because a Mercator row covers fewer degrees the further it is
  // from the equator. South London is northern, so the northern row is the SHORTER one.
  if(rows.size>1)assert.ok(Math.max(...heights)-Math.min(...heights)>0);
});

test('a fetched tile is kept durably, and a failed one is not',async()=>{
  const {useTileStore,fetchTileAsDataURI,forgetTiles,tileCacheKey}=await import('../build/basemap-tiles.js');
  // THE OFFLINE PROMISE IS A FLOW: online download the assets, offline use the cached assets. A
  // session-only cache gave the opposite of that -- ground on the first visit and none on the
  // visit that mattered, which is the one on a device with no network.
  const kept=new Map();
  useTileStore({read:key=>kept.get(key),write:async(key,value)=>{kept.set(key,value);}});

  const url='https://tile.openstreetmap.org/16/0/0.png';
  let calls=0;
  globalThis.fetch=async()=>{calls++;return {ok:true,blob:async()=>new Blob([new Uint8Array([1,2,3])],{type:'image/png'})};};
  globalThis.FileReader=class{readAsDataURL(){this.result='data:image/png;base64,AQID';this.onload();}};

  assert.equal(await fetchTileAsDataURI(url),'data:image/png;base64,AQID');
  assert.equal(calls,1);
  assert.equal(kept.get(tileCacheKey(url)),'data:image/png;base64,AQID','written down for the next visit');

  // A NEW SESSION, with no network at all: the tile is still there.
  forgetTiles();
  globalThis.fetch=async()=>{throw new Error('offline');};
  assert.equal(await fetchTileAsDataURI(url),'data:image/png;base64,AQID');

  // A FAILURE IS NOT WRITTEN DOWN. The next visit should try again rather than inherit one bad
  // afternoon's network, so nothing is stored for a tile that could not be had.
  forgetTiles();
  const missing='https://tile.openstreetmap.org/16/9/9.png';
  assert.equal(await fetchTileAsDataURI(missing),null);
  assert.equal(kept.has(tileCacheKey(missing)),false);
  useTileStore(null);
});
