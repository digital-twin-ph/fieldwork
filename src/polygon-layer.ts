import * as polygonClipping from 'polyclip-ts';
import type {Boundary,Scalar} from './types.js';
import type {Polygons} from './catchments.js';

/** A PUBLISHED POLYGON LAYER, read as published.
 *
 *  Seven node types emitted `polygons` before this and every one of them DERIVED them from
 *  something else: points allocated to cells, a table joined to an area, a hull, a corridor, a
 *  stack of other layers. None was a source. So a layer that existed as a file had no way into a
 *  workflow, and South London's `geo/map2-water-supply-zones.geojson` sat in that repository from
 *  2026-10-24 and reached one never -- the three territories Snow drew, of which the purple one,
 *  *"Area in which the pipes of both Companies are intermingled"*, is the zone where attributing
 *  supply by sub-district misclassifies.
 *
 *  READ AS PUBLISHED, which is the one distinction this enforces. Nothing is clipped, simplified or
 *  reprojected. A file whose coordinates are not CRS84 degrees is REFUSED rather than converted,
 *  because converting it silently would hand on a different shape from the one its author
 *  published, under the author's name. Clipping is `clip_polygons`, which is a step a practitioner
 *  chooses and a receipt records.
 *
 *  NOTHING IS GUESSED FROM A PROPERTY NAME. The property that names each feature is chosen by the
 *  practitioner, the same rule the records table states: *"These are the columns a rule can read;
 *  nothing is guessed from a name."* A layer whose features are unnamed is readable -- they are
 *  numbered -- but a name the practitioner asked for and the file does not carry is a refusal.
 */

/** HOW MUCH GEOMETRY, measured in the thing that costs: vertices.
 *
 *  There were two caps here and only one of them counted anything. `MAX_LAYER_FEATURES=500`
 *  refused a layer by how many features it held, on the grounds that "beyond this, a layer is a
 *  basemap rather than a study's own geometry, and the vertex budget the rest of the application
 *  assumes no longer holds". The first half is a definition asserted, not a constraint measured.
 *  The second half names this cap, which is checked separately and on the real total -- so the
 *  feature count guarded nothing that was not already guarded, and refused work that fit.
 *
 *  It had refused twice before it was removed. On 2026-10-28 a `water` read over South London
 *  returned 1,030 features and the first realistic request was refused; the workaround was a
 *  vertex floor. On 2026-10-29 a practitioner with the Greater London extract on their own disk
 *  was refused 606 water features: *"The file is already downloaded and it seems to be now an
 *  import cap which I do not understand what is the rationale."* There was not one that held.
 *
 *  `network-tiles.ts` had already written the rule this breaks: *"nothing here decides in advance
 *  how much a practitioner may have."* Snow's three territories are 367 vertices, which is what
 *  the old comment offered as its evidence -- a vertex figure, for a feature cap, from the
 *  smallest case in the project. */
export const MAX_LAYER_VERTICES=200_000;

/** CUT EACH FEATURE TO A BOX, keeping only what falls inside it.
 *
 *  The practitioner, 2026-10-29, looking at a read of the Thames with a hundred islands and docks
 *  scattered outside the frame: *"can I discard the polygons outside the bounding box, and
 *  essentially clip those that overlap with the bounding box?"* And then: *"So that's a realtime
 *  button clip to bounding box so I can see it."*
 *
 *  One function, used by the viewer's preview and by the run, so what you saw before applying and
 *  what the layer holds afterwards cannot disagree. A feature wholly outside yields nothing and
 *  is dropped; one that straddles the edge is cut at it.
 *
 *  This is NOT `clip_polygons`, and the difference matters. That widget clips to the study AREA --
 *  the polygon a practitioner drew -- and is a step with a receipt of its own. This clips to the
 *  rectangle the read was scoped to, which is the frame the viewer draws. Where the study area IS
 *  a bounding box the two agree; where it is a drawn polygon, clipping to the box is the looser
 *  cut, and `a-study-area-clips-to-its-polygon` is the open direction about that. */
export function clipToBox<T extends {geometry:Boundary}>(features:readonly T[],
  box:readonly [number,number,number,number]):T[]{
  const [west,south,east,north]=box;
  const frame=[[[[west,south],[east,south],[east,north],[west,north],[west,south]]]];
  return features.flatMap(feature=>{
    const parts=feature.geometry.type==='Polygon'
      ?[feature.geometry.coordinates]:feature.geometry.coordinates;
    const cut=polygonClipping.intersection(parts as never,frame as never);
    return cut.length
      ?[{...feature,geometry:{type:'MultiPolygon' as const,coordinates:cut}} as T]:[];
  });
}

export interface PolygonLayerRequest {
  /** The property each feature is named by. Absent numbers them. */
  nameField?:string;
  /** What to call the layer where a reader toggles it. */
  layerName?:string;
}

export interface ParsedFeature {
  id:string; name:string; geometry:Boundary; properties:Record<string,Scalar>;
}

const ringClosed=(ring:number[][]):boolean=>{
  const first=ring[0],last=ring[ring.length-1];
  return !!first&&!!last&&first[0]===last[0]&&first[1]===last[1];
};
/** CRS84 degrees, by the same bounds `catchments.ts` applies to every other geometry this
 *  application holds. A file in metres fails it, which is the point: it is a different shape. */
const inBounds=(ring:number[][]):boolean=>
  ring.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])
    &&Math.abs(p[0])<=180&&Math.abs(p[1])<=90);

const ringsOf=(geometry:Boundary):number[][][]=>
  geometry.type==='Polygon'
    ?geometry.coordinates as unknown as number[][][]
    :(geometry.coordinates as unknown as number[][][][]).flat();

/** Read a parsed GeoJSON FeatureCollection into features, or refuse and say why.
 *
 *  Separate from the value below so the import dialog can show what it found before anything is
 *  stored, which is the device the table import already uses: see the before and the after, then
 *  commit. */
export function readPolygonFeatures(raw:unknown,request:PolygonLayerRequest):ParsedFeature[]{
  const collection=raw as {type?:string;features?:unknown[]}|null;
  if(!collection||collection.type!=='FeatureCollection'||!Array.isArray(collection.features))
    throw new Error('This is not a GeoJSON FeatureCollection. A polygon layer is a file of features, '
      +'each with a geometry and its own attributes.');
  if(!collection.features.length)
    throw new Error('That file holds no features. An empty layer is not a layer, and importing one '
      +'would put a legend on the map with nothing under it.');

  const name=request.nameField?.trim();
  const features:ParsedFeature[]=[];
  let vertices=0;
  collection.features.forEach((entry,index)=>{
    const feature=entry as {geometry?:Boundary;properties?:Record<string,Scalar>;id?:unknown}|null;
    const geometry=feature?.geometry;
    const at=`Feature ${index+1}`;
    if(!geometry||(geometry.type!=='Polygon'&&geometry.type!=='MultiPolygon'))
      throw new Error(`${at} is ${geometry?`a ${(geometry as {type:string}).type}`:'missing its geometry'}. A polygon `
        +'layer carries Polygon or MultiPolygon features; a line or a point is a different kind of '
        +'layer and would be drawn wrongly here.');
    const rings=ringsOf(geometry);
    if(!rings.length)throw new Error(`${at} has no ring.`);
    for(const ring of rings){
      if(ring.length<4)
        throw new Error(`${at} has a ring of ${ring.length} positions. A closed ring needs at least `
          +'four, the last repeating the first.');
      if(!ringClosed(ring))
        throw new Error(`${at} has a ring whose last position does not repeat its first, so it is `
          +'not closed. Nothing here closes it for you: a ring the author left open may be a file '
          +'written wrongly or a shape that is not the one they meant.');
      if(!inBounds(ring))
        throw new Error(`${at} has a position outside longitude ±180 or latitude ±90, so this `
          +'file is not in CRS84 degrees. It is refused rather than converted: reprojecting it here '
          +'would hand on a different shape under its author’s name.');
      vertices+=ring.length;
    }
    if(vertices>MAX_LAYER_VERTICES)
      throw new Error(`That file passes ${MAX_LAYER_VERTICES.toLocaleString()} vertices, which is `
        +'more than the rest of this application assumes a study’s geometry holds.');
    const properties=(feature?.properties??{}) as Record<string,Scalar>;
    if(name&&!(name in properties))
      throw new Error(`${at} carries no "${name}" property. The property that names each feature is `
        +'yours to choose and is never guessed, so a name the file does not hold is a refusal '
        +`rather than a fallback. This feature carries ${Object.keys(properties).length
          ?Object.keys(properties).join(', '):'no properties at all'}.`);
    const label=name?String(properties[name]??''):'';
    features.push({id:typeof feature?.id==='string'&&feature.id?feature.id:`feature-${index+1}`,
      name:label||`Feature ${index+1}`,geometry,properties});
  });
  return features;
}

/** The layer as the value seven widgets already consume.
 *
 *  `sites` is empty and no feature carries a `siteId`, because a polygon read from a file is derived
 *  from nothing. That field became optional for this widget -- and `area-join.ts` had already been
 *  fabricating one, which is how the base contract came to be looked at. */
export function polygonLayer(features:ParsedFeature[],request:PolygonLayerRequest):Polygons{
  const named=request.nameField?.trim();
  return {
    ...(request.layerName?.trim()?{layerName:request.layerName.trim()}:{}),
    features:features.map(feature=>({id:feature.id,name:feature.name,geometry:feature.geometry,
      properties:feature.properties})),
    sites:[],
    method:'Polygon features read from a published file, as published. Nothing clipped, simplified '
      +'or reprojected.',
    crs:'OGC:CRS84',
    notes:[`${features.length} feature${features.length===1?'':'s'} read as published`
      +(named?`, named by ${named}`:', numbered because no naming property was chosen')+'.',
      'Clipping to the study area is a separate step, so that what was cut is a choice with a '
      +'receipt rather than something that happened on the way in.'],
  };
}

/** THE RECEIPT, beside the computation that earned it.
 *
 *  Built here and not in `core.ts` for the reason `relate-table.ts` records: a release declares the
 *  ontology terms its own module asserts, and the gate checks it. Learned twice now -- the first
 *  time the facts were written in `core.ts` and the release was refused for declaring terms its
 *  module did not assert. */
export function polygonLayerFacts(
  features:ParsedFeature[],
  request:PolygonLayerRequest&{source?:{filename:string;sha256:string}},
  context:{runId:string; nodeId:string},
):{facts:string; vertices:number}{
  const quote=(value:string)=>JSON.stringify(value);
  const entity=`<urn:fieldwork:run:${context.runId}:output:${context.nodeId}>`;
  const vertices=features.reduce((total,feature)=>
    total+ringsOf(feature.geometry).reduce((n,ring)=>n+ring.length,0),0);
  const named=request.nameField?.trim();
  return {vertices,
    facts:`@prefix fw: <urn:fieldwork:>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
      +`${entity} a fw:PolygonLayer;\n`
      +`  fw:featureCount "${features.length}"^^xsd:integer;\n`
      +`  fw:vertexCount "${vertices}"^^xsd:integer;\n`
      // Asserted rather than implied: every other producer of this value computed its geometry,
      // and a reader has to be able to tell a read shape from a derived one.
      +`  fw:readAsPublished "true"^^xsd:boolean`
      +(named?`;\n  fw:namedBy ${quote(named)}`:'')
      +(request.source?`;\n  fw:layerFile ${quote(request.source.filename)}`
        +`;\n  fw:layerFileDigest ${quote(request.source.sha256)}`:'')
      +'.\n'};
}
