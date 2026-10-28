/** WELL-KNOWN BINARY, beyond a point.
 *
 *  GeoPackage and GeoParquet both carry geometry as WKB, so one decoder serves both. Until
 *  2026-10-27 this project read exactly one geometry type -- `decodeGeoPackagePoint` refused
 *  anything whose type word was not 1 -- and that single check is why the GeoPackage importer
 *  filters its layer list to `geometry_type_name='POINT'`. A GeoPackage of administrative
 *  boundaries, which is the most ordinary GIS deliverable there is, could not be opened by a
 *  studio that calls itself a GIS studio.
 *
 *  WHAT IT REFUSES, AND WHY EACH REFUSAL IS BY NAME. A decoder that guesses produces coordinates
 *  that are wrong and look right, which is the failure this project names professional-looking
 *  and wrong. So every shape it cannot read is named rather than skipped:
 *
 *    Z AND M ORDINATES. ISO WKB adds 1000 for Z, 2000 for M, 3000 for both; EWKB sets high bits
 *    on the type word instead. Reading either as 2D would take the Z of one vertex as the X of
 *    the next and draw a shape that is wrong everywhere.
 *    GEOMETRY COLLECTIONS. A heterogeneous bag has no single GeoJSON geometry to become, and
 *    silently taking the first member would discard the rest.
 *    ANY OTHER TYPE WORD. Named with its number, which is what a practitioner can act on.
 *
 *  EVERY NESTED GEOMETRY CARRIES ITS OWN BYTE ORDER. A MultiPolygon is a count followed by whole
 *  WKB geometries, each with its own order byte and type word, and they are permitted to differ
 *  from the outer one. Assuming the outer order throughout is the classic WKB bug: it reads
 *  correctly on every file written by one library and corrupts the next.
 */
export type WkbGeometry=
  |{type:'Point'; coordinates:[number,number]}
  |{type:'LineString'; coordinates:[number,number][]}
  |{type:'Polygon'; coordinates:[number,number][][]}
  |{type:'MultiPoint'; coordinates:[number,number][]}
  |{type:'MultiLineString'; coordinates:[number,number][][]}
  |{type:'MultiPolygon'; coordinates:[number,number][][][]};

const NAMES:Record<number,string>={1:'Point',2:'LineString',3:'Polygon',
  4:'MultiPoint',5:'MultiLineString',6:'MultiPolygon',7:'GeometryCollection'};

/** One geometry and the offset just past it, so a caller reading a sequence can continue. */
export function readWkb(view:DataView,at:number):{geometry:WkbGeometry; next:number}{
  if(at+5>view.byteLength)throw new Error('Truncated WKB: no geometry header.');
  const order=view.getUint8(at);
  if(order>1)throw new Error(`WKB byte order must be 0 or 1, not ${order}.`);
  const little=!!order;
  const raw=view.getUint32(at+1,little);
  // EWKB flags SRID, Z and M in the high bits; ISO WKB adds 1000, 2000 or 3000.
  if(raw&0xffff0000)throw new Error('This geometry is EWKB with Z, M or an embedded SRID. '
    +'Only plain 2D WKB is read, because taking a Z ordinate for an X would draw a shape that is '
    +'wrong everywhere and still looks like a shape.');
  if(raw>1000)throw new Error(`This geometry carries ${raw>3000?'Z and M ordinates':raw>2000?'an M ordinate':'a Z ordinate'}. `
    +'Only plain 2D WKB is read: a third ordinate read as a coordinate moves every vertex.');
  const type=raw;
  let p=at+5;
  const point=():[number,number]=>{
    if(p+16>view.byteLength)throw new Error('Truncated WKB: a coordinate runs past the end.');
    const x=view.getFloat64(p,little),y=view.getFloat64(p+8,little);p+=16;return [x,y];
  };
  const count=():number=>{
    if(p+4>view.byteLength)throw new Error('Truncated WKB: a count runs past the end.');
    const n=view.getUint32(p,little);p+=4;
    // A count is read before anything is allocated for it, so a corrupt one cannot ask for a
    // gigabyte: each element needs at least 16 bytes.
    if(n*16>view.byteLength)throw new Error(`WKB claims ${n.toLocaleString()} elements, more than `
      +'the geometry has bytes for. The file is corrupt or is not WKB.');
    return n;
  };
  const ring=():[number,number][]=>{const n=count();
    return Array.from({length:n},point);};
  const nested=(expected:number,label:string):WkbGeometry[]=>{
    const n=count();
    return Array.from({length:n},()=>{
      // Its own order byte and type word, which may differ from the outer geometry's.
      const inner=readWkb(view,p);p=inner.next;
      if(inner.geometry.type!==NAMES[expected])
        throw new Error(`A ${label} holds ${NAMES[expected]} members; this one holds a `
          +`${inner.geometry.type}.`);
      return inner.geometry;
    });
  };

  switch(type){
    case 1:return {geometry:{type:'Point',coordinates:point()},next:p};
    case 2:return {geometry:{type:'LineString',coordinates:ring()},next:p};
    case 3:{const rings=count();
      return {geometry:{type:'Polygon',coordinates:Array.from({length:rings},ring)},next:p};}
    case 4:return {geometry:{type:'MultiPoint',
      coordinates:nested(1,'MultiPoint').map(g=>(g as {coordinates:[number,number]}).coordinates)},next:p};
    case 5:return {geometry:{type:'MultiLineString',
      coordinates:nested(2,'MultiLineString').map(g=>(g as {coordinates:[number,number][]}).coordinates)},next:p};
    case 6:return {geometry:{type:'MultiPolygon',
      coordinates:nested(3,'MultiPolygon').map(g=>(g as {coordinates:[number,number][][]}).coordinates)},next:p};
    case 7:throw new Error('A geometry collection holds several unrelated shapes and has no single '
      +'geometry to become. Export the layer with one geometry type per feature.');
    default:throw new Error(`WKB geometry type ${type}${NAMES[type]?` (${NAMES[type]})`:''} is not read.`);
  }
}

/** The whole of one buffer as a geometry, refusing trailing bytes rather than ignoring them:
 *  bytes left over mean the reader and the writer disagree about the shape. */
export function decodeWkb(bytes:Uint8Array):WkbGeometry{
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const {geometry,next}=readWkb(view,0);
  if(next!==bytes.byteLength)
    throw new Error(`${bytes.byteLength-next} bytes follow the geometry. Either this is not a `
      +'single WKB geometry or it holds something this reader does not know about.');
  return geometry;
}
