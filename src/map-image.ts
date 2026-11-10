/** A georeferenced map image, placed as ground under a workflow.
 *
 *  The practitioner, 2026-10-27, on Snow's Map 2: *"We still need the original and since it's
 *  georeferenced, it could be overlaid as a layer. It helps learners appreciate something from
 *  the past."*
 *
 *  INK, NOT MEASUREMENT, which is why this is not `raster_input` and why its output carries the
 *  `ground` port type. `raster_input` decodes a GeoTIFF into values and `clip_raster` and
 *  `sample_raster` exist to measure them; a plate's pixels are a printer's ink, and sampling them
 *  returns the colour of a line. The port type makes that connection impossible rather than
 *  reporting it afterwards -- experiment 143, D4.
 *
 *  PLACED BY ITS CORNERS, through the caller's own projection, so the module never learns what
 *  projection a figure is in. The same arrangement `basemap-tiles.ts` uses for a tile, and the
 *  reason a vector or corner-placed layer sidesteps the Mercator mismatch a tile grid forces.
 */
import type {WorkflowNode} from './types.js';
import type {Receipt} from './results.js';

export interface MapImage {
  kind:'map-image';
  data:string;
  width:number; height:number; bytes:number; sha256:string; filename?:string;
  bounds:[number,number,number,number];
  opacity:number;
  source?:{title?:string;url?:string;licence?:string;note?:string};
  /** Metres per pixel at the middle of the extent: what the plate can and cannot show. */
  groundResolutionM:number;
  /** THE FOUR CORNERS, where the placement turns the image (experiment 201): top-left, top-right, bottom-right,
   *  bottom-left, in CRS84. Absent for a north-up placement, which `bounds` says exactly. */
  corners?:[number,number][];
}

export const DEFAULT_OPACITY=0.85;

/** A world file's six coefficients, in the order ESRI writes them. */
export interface WorldFile {xScale:number; ySkew:number; xSkew:number; yScale:number;
  xOrigin:number; yOrigin:number}

/** Reads a `.jgw`/`.pgw`/`.wld` sidecar. Six numbers, one per line, in a fixed order. */
export function readWorldFile(text:string):WorldFile{
  const numbers=text.trim().split(/\s+/).map(Number);
  if(numbers.length!==6||numbers.some(n=>!Number.isFinite(n)))
    throw new Error('A world file is six numbers: pixel size in x, two rotation terms, pixel size '
      +`in y, and the centre of the top-left pixel. This one has ${numbers.length}.`);
  const [xScale,ySkew,xSkew,yScale,xOrigin,yOrigin]=numbers;
  return {xScale,ySkew,xSkew,yScale,xOrigin,yOrigin};
}

/** The extent a world file puts an image of this size at, or a refusal.
 *
 *  ROTATION IS REFUSED RATHER THAN IGNORED. The two skew terms place a rotated image, and drawing
 *  a rotated plate as an axis-aligned box would put the map in the wrong place while looking
 *  entirely correct -- professional-looking and wrong, which is the failure this project names.
 *  A hard stop, not a limitation.
 *
 *  The world file's origin is the CENTRE of the top-left pixel, so the extent runs half a pixel
 *  further out on each side. Half a pixel is 20 metres on Snow's small plate; small enough to
 *  ignore and wrong enough to be worth not ignoring. */
export function boundsFromWorldFile(world:WorldFile,width:number,height:number):[number,number,number,number]{
  // A TURNED IMAGE IS PLACED BY ITS CORNERS since 2026-11-10 (experiment 201), and drawn turned; its bounds are their
  // envelope. Refused until then, because drawing it as an upright box would have put it in the wrong place.
  if(world.xSkew!==0||world.ySkew!==0){
    const corners=turnedCorners(world,width,height),lons=corners.map(c=>c[0]),lats=corners.map(c=>c[1]);
    return [Math.min(...lons),Math.min(...lats),Math.max(...lons),Math.max(...lats)];
  }
  if(!(width>0)||!(height>0))throw new Error('An image needs a width and a height in pixels.');
  if(world.xScale<=0)throw new Error('A world file\'s x pixel size is the width of one pixel and must be positive.');
  if(world.yScale>=0)throw new Error('A world file\'s y pixel size is negative for a north-up image, '
    +'because rows run south. A positive value means the image is flipped.');
  const west=world.xOrigin-world.xScale/2;
  const north=world.yOrigin-world.yScale/2;
  return [west,north+world.yScale*height,west+world.xScale*width,north];
}

/** A world file's four corners of a `width` by `height` image: top-left, top-right, bottom-right, bottom-left. */
export function turnedCorners(world:WorldFile,width:number,height:number):[number,number][]{
  const at=(x:number,y:number):[number,number]=>[world.xScale*(x-0.5)+world.xSkew*(y-0.5)+world.xOrigin,
    world.ySkew*(x-0.5)+world.yScale*(y-0.5)+world.yOrigin];
  return [at(0,0),at(width,0),at(width,height),at(0,height)];
}
export const isTurned=(world:WorldFile|undefined)=>!!world&&(world.xSkew!==0||world.ySkew!==0);

/** Metres on the ground for one pixel, at the middle of the extent. Longitude shrinks with the
 *  cosine of latitude; this is the larger of the two axes, which is what a reader meets. */
export function groundResolution(bounds:[number,number,number,number],width:number,height:number):number{
  const [west,south,east,north]=bounds;
  const mid=(south+north)/2*Math.PI/180;
  return Math.max(Math.abs(east-west)*111_320*Math.cos(mid)/width,
    Math.abs(north-south)*110_570/height);
}

export function mapImage(node:WorkflowNode<'map_image_input'>):MapImage{
  const p=node.params;
  if(typeof p.data!=='string'||!p.data.startsWith('data:'))
    throw new Error('This step has no image yet. Choose a map image and its world file.');
  const [west,south,east,north]=p.bounds??[];
  if(![west,south,east,north].every(Number.isFinite))
    throw new Error('This map image has no georeference, so there is nowhere to draw it.');
  if(!(east>west)||!(north>south))
    throw new Error('A map image\'s extent runs west to east and south to north. These corners cross.');
  if(Math.abs(west)>180||Math.abs(east)>180||Math.abs(south)>90||Math.abs(north)>90)
    throw new Error('A map image is placed in CRS84 degrees. These corners are outside the world, '
      +'which usually means the georeference is in a projected system; convert it first rather '
      +'than reading one datum\'s coordinates as another\'s.');
  const opacity=typeof p.opacity==='number'&&p.opacity>=0&&p.opacity<=1?p.opacity:DEFAULT_OPACITY;
  return {kind:'map-image',data:p.data,
    width:p.image.width,height:p.image.height,bytes:p.image.bytes,sha256:p.image.sha256,
    ...(p.image.filename?{filename:p.image.filename}:{}),
    bounds:[west,south,east,north],opacity,
    ...(p.source?{source:p.source}:{}),
    groundResolutionM:groundResolution([west,south,east,north],p.image.width,p.image.height),
    ...(isTurned(p.world)?{corners:turnedCorners(p.world!,p.image.width,p.image.height)}:{})};
}

/** The SVG for a static figure: one placed image, in the caller's projection.
 *
 *  North-up and unrotated, so the four corners reduce to a rectangle in the figure's own pixels.
 *  Returned as `''` where the projection puts it nowhere finite, which is a figure without
 *  ground rather than a broken one. */
export function mapImageMarkup(image:MapImage,
  project:(c:[number,number])=>[number,number]):string{
  if(image.corners){
    const [tl,tr,,bl]=image.corners.map(c=>project(c as [number,number]));
    if(![...tl!,...tr!,...bl!].every(Number.isFinite))return '';
    const w=image.width,h=image.height;
    const m=[(tr![0]-tl![0])/w,(tr![1]-tl![1])/w,(bl![0]-tl![0])/h,(bl![1]-tl![1])/h,tl![0],tl![1]].map(v=>v.toFixed(6)).join(' ');
    return `<image data-map-image="${image.sha256.slice(0,12)}" width="${w}" height="${h}" opacity="${image.opacity}" `
      +`preserveAspectRatio="none" transform="matrix(${m})" href="${image.data}"/>`;
  }
  const [west,south,east,north]=image.bounds;
  const [x0,y0]=project([west,north]),[x1,y1]=project([east,south]);
  if(![x0,y0,x1,y1].every(Number.isFinite))return '';
  const w=x1-x0,h=y1-y0;
  if(!(w>0)||!(h>0))return '';
  return `<image data-map-image="${image.sha256.slice(0,12)}" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" `
    +`width="${w.toFixed(1)}" height="${h.toFixed(1)}" opacity="${image.opacity}" `
    +`preserveAspectRatio="none" href="${image.data}"/>`;
}

/** PLACE THAT GROUND UNDER A FIGURE'S VECTOR CONTENT, as a string.
 *
 *  `drawStaticBasemap` does this to the live map's SVG element -- insert the image after the
 *  background rect, then withdraw the fill from every shape that encodes nothing so the ground
 *  shows through. The write-up's figure is composed as a string and never becomes an element
 *  before it is published, so it could not call that, and the known consequence was recorded in
 *  `write-up-figures.ts` and read in the application on 2026-10-30: South London's figures
 *  carried the extent and the marks and not Snow's plate underneath, while the same map on the
 *  screen carried all three.
 *
 *  A PLATE AND A TILE ARE NOT THE SAME GAP. Fetching basemap tiles is asynchronous and a figure
 *  that renders and then changes under a reader is worse in a write-up than one that renders
 *  once; a placed plate is `mapImageMarkup` of a data URI the node already holds, which is a
 *  pure function and needs no network. So the plate half closes here and the tile half stays
 *  open, rather than both waiting on the harder one.
 *
 *  The withdrawal is the same rule and for the same reason: `data-fill-role="context"` marks a
 *  shape that says WHERE the study area is and measures nothing, and a pale wash over a plate
 *  hides the ink it was drawn to show.
 *
 *  An empty `markup` returns the content untouched, which is what a figure with no plate wired,
 *  no image chosen yet, or a projection that puts the plate nowhere finite all arrive as. */
export function withGroundUnder(content:string,markup:string):string{
  if(!markup.trim())return content;
  // The background rect, which both static renderers emit first and nothing else emits at all.
  // Inserted after it rather than before, because a figure whose ground sits under its own
  // background is a figure with no ground.
  const background=/^\s*<rect\b[^>]*>/.exec(content);
  const placed=background
    ?content.slice(0,background[0].length)+markup+content.slice(background[0].length)
    :markup+content;
  return placed.replace(/<path\b[^>]*\bdata-fill-role="context"[^>]*>/g,
    tag=>tag.replace(/\bfill="[^"]*"/,'fill="none"'));
}

/** One line of credit, from what the plate declares. Public domain or not, a reader of a figure
 *  is entitled to know which ground it was drawn on and when that ground was made. */
export const mapImageCredit=(image:MapImage):string=>{
  // `none-applies` and `unstated` are the provenance vocabulary's internal words and neither
  // imposes an obligation to display anything, so neither reaches a figure. They were being
  // printed verbatim: the South London plate's credit read "John Snow, Map 2, 1855 ·
  // none-applies" the first time a worked example wired one, on 2026-10-27. A named licence is
  // different -- it is a term a reader can go and check, and an obligation may attach to it.
  const licence=image.source?.licence;
  const named=licence&&licence!=='none-applies'&&licence!=='unstated'?licence:'';
  return [image.source?.title,named].filter(Boolean).join(' · ')
    ||image.filename||'Supplied map image';
};

export function mapImageReceipt(node:WorkflowNode<'map_image_input'>,image:MapImage,
  runId:string):Receipt{
  const entity=`<urn:fieldwork:run:${runId}:ground:${node.id}>`;
  const activity=`<urn:fieldwork:run:${runId}:mapimage:${node.id}>`;
  const q=(value:string)=>JSON.stringify(value);
  const [west,south,east,north]=image.bounds;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`@prefix dcterms: <http://purl.org/dc/terms/>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`${activity} a fw:MapImageInput, prov:Activity; prov:generated ${entity}.\n`
    +`${entity} a fw:MapImage, prov:Entity; prov:wasGeneratedBy ${activity}`
    +`; fw:imageDigest ${q(image.sha256)}; fw:imagePixelWidth "${image.width}"^^xsd:integer`
    +`; fw:imagePixelHeight "${image.height}"^^xsd:integer`
    +`; fw:groundResolutionMetres "${image.groundResolutionM.toFixed(2)}"^^xsd:decimal`
    +`; fw:westBound "${west}"^^xsd:decimal; fw:southBound "${south}"^^xsd:decimal`
    +`; fw:eastBound "${east}"^^xsd:decimal; fw:northBound "${north}"^^xsd:decimal`
    +(image.source?.title?`; dcterms:title ${q(image.source.title)}`:'')
    +(image.source?.url?`; dcterms:source ${q(image.source.url)}`:'')
    +(image.source?.licence?`; dcterms:license ${q(image.source.licence)}`:'')
    // CONTEXT, NEVER MEASURED. Asserted rather than left to the port type alone, so a reader of
    // the receipt meets the limit where they meet the layer.
    +`; fw:layerRole "context".\n`;
  return {nodeId:node.id,kind:'computation',facts,rules:'',input:facts,conclusions:[]};
}
