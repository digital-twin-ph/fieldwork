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
  if(world.xSkew!==0||world.ySkew!==0)
    throw new Error('This world file places the image at an angle, and a rotated plate cannot be '
      +'drawn as an upright rectangle: it would sit in the wrong place while looking correct. '
      +'Georeference it north-up, or supply the corners directly.');
  if(!(width>0)||!(height>0))throw new Error('An image needs a width and a height in pixels.');
  if(world.xScale<=0)throw new Error('A world file\'s x pixel size is the width of one pixel and must be positive.');
  if(world.yScale>=0)throw new Error('A world file\'s y pixel size is negative for a north-up image, '
    +'because rows run south. A positive value means the image is flipped.');
  const west=world.xOrigin-world.xScale/2;
  const north=world.yOrigin-world.yScale/2;
  return [west,north+world.yScale*height,west+world.xScale*width,north];
}

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
    groundResolutionM:groundResolution([west,south,east,north],p.image.width,p.image.height)};
}

/** The SVG for a static figure: one placed image, in the caller's projection.
 *
 *  North-up and unrotated, so the four corners reduce to a rectangle in the figure's own pixels.
 *  Returned as `''` where the projection puts it nowhere finite, which is a figure without
 *  ground rather than a broken one. */
export function mapImageMarkup(image:MapImage,
  project:(c:[number,number])=>[number,number]):string{
  const [west,south,east,north]=image.bounds;
  const [x0,y0]=project([west,north]),[x1,y1]=project([east,south]);
  if(![x0,y0,x1,y1].every(Number.isFinite))return '';
  const w=x1-x0,h=y1-y0;
  if(!(w>0)||!(h>0))return '';
  return `<image data-map-image="${image.sha256.slice(0,12)}" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" `
    +`width="${w.toFixed(1)}" height="${h.toFixed(1)}" opacity="${image.opacity}" `
    +`preserveAspectRatio="none" href="${image.data}"/>`;
}

/** One line of credit, from what the plate declares. Public domain or not, a reader of a figure
 *  is entitled to know which ground it was drawn on and when that ground was made. */
export const mapImageCredit=(image:MapImage):string=>
  [image.source?.title,image.source?.licence].filter(Boolean).join(' · ')
  ||image.filename||'Supplied map image';

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
