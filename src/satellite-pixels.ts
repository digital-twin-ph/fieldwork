/** WHICH SWATH PIXEL A POINT IS READ FROM, for Sample satellite files at points. No imports, so the reading worker can
 *  bundle it.
 *
 *  THE PIXEL WHOSE CENTRE IS NEAREST. The admission review asked for the pixel whose four corners contain the point.
 *  Measured on 2026-11-05 on the 606 MB offline NO₂ orbit file over New York City: the file stores each variable in
 *  compressed chunks of 2,086 × 225 pixels, so one pixel's latitude, longitude, value and quality cost 2.1, 2.1, 3.2 and
 *  2.1 MB, and its corners eight more chunks, roughly doubling a read to 25–30 MB an overpass. The two rules differ only
 *  for a point near a pixel's edge, on pixels about 3.5 × 5.5 km. The practitioner chose the nearest centre. Experiment
 *  179.
 *
 *  A Sentinel-5P swath is not a regular grid, so the pixel is found by distance, not by arithmetic on a cell size as
 *  Sample raster at points does. */

/** Values at or above this are the files' fill value, 9.96921e36: nothing was retrieved there. */
export const FILL=9e36;

/** A block of a swath: the centres of rows r0.. and columns c0.., `rows` × `cols` of them, row-major. */
export interface SwathTile {r0:number; c0:number; rows:number; cols:number; lats:ArrayLike<number>; lons:ArrayLike<number>}

const valid=(lat:number,lon:number)=>Math.abs(lat)<=90&&Math.abs(lon)<=180;

/** The nearest valid centre in a tile, by distance scaled for latitude, in degrees of latitude; null when none is valid. */
export function nearestInTile(lon:number,lat:number,tile:SwathTile):{row:number;col:number;distance:number}|null{
  const k=Math.cos(lat*Math.PI/180);let best=Infinity,at=-1;
  for(let i=0;i<tile.rows*tile.cols;i++){
    const y=tile.lats[i]!,x=tile.lons[i]!;
    if(!valid(y,x))continue;
    const dx=(x-lon)*k,dy=y-lat,d=dx*dx+dy*dy;
    if(d<best){best=d;at=i;}
  }
  return at<0?null:{row:tile.r0+Math.floor(at/tile.cols),col:tile.c0+at%tile.cols,distance:Math.sqrt(best)};
}

/** True when the point lies within a tile's extent, padded by a margin in degrees. */
export function inTileExtent(lon:number,lat:number,tile:SwathTile,margin=0.1):boolean{
  let W=Infinity,S=Infinity,E=-Infinity,N=-Infinity;
  for(let i=0;i<tile.rows*tile.cols;i++){const y=tile.lats[i]!,x=tile.lons[i]!;if(!valid(y,x))continue;
    if(x<W)W=x;if(x>E)E=x;if(y<S)S=y;if(y>N)N=y;}
  return lon>=W-margin&&lon<=E+margin&&lat>=S-margin&&lat<=N+margin;
}

/** The order to read a swath's chunk rows in. A daytime Sentinel-5P orbit runs south to north, so a point in the
 *  northern hemisphere is likelier in the later scanlines. Only the order changes: every row of chunks is still read
 *  if the point is not found sooner. */
export const tileRowOrder=(rowTiles:number,meanLat:number):number[]=>{
  const order=Array.from({length:rowTiles},(_,i)=>i);return meanLat>=0?order.reverse():order;};
