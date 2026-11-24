/** WALKING TIME OVER A FRICTION SURFACE, from the nearest origin, answered at places.
 *
 *  Fieldwork routes over street networks: an isochrone follows streets, and so do the reachable junctions and the
 *  corridor. That is the right model where the streets are the way people move and the network is published. It is
 *  the wrong one for a campaign microplan in a place where most of the walk is not on a mapped road, and in Nigeria
 *  it is also the expensive one: GRID3's roads are CC BY-SA, so everything derived from them carries share-alike,
 *  while the Malaria Atlas Project's walking friction surface is CC BY 4.0.
 *
 *  WHY POINTS AND NOT A RASTER. `RasterGrid` carries the `asset` of the file it came from -- its sha256, its bytes,
 *  its filename -- and `clipRaster` passes that asset through unchanged because a clip is still those bytes, read
 *  over a smaller window. A computed surface has no file. Returning one would mean carrying the friction raster's
 *  digest while the values are no longer what those bytes produce: a claim in the evidence that does not hold. So
 *  this answers at the places asked about, and those places compose with everything that takes points.
 *
 *  WHAT THE NUMBER MEANS. The friction surface gives the cost of crossing one metre of each cell. The accumulated
 *  cost of a path is the sum over the metres walked, so stepping between cell centres costs the distance between
 *  them times the mean of the two cells' friction. It is a model of walking over ground, not a route: nobody walks
 *  this line, and the minutes are what the surface says the ground costs. */
import type {PointCollection,PointFeature,Position,WorkflowNode} from './types.js';
import type {RasterGrid} from './raster.js';
import type {Receipt} from './results.js';
import {defaultSpatialReference} from './spatial-reference.js';

/** HOW MANY CELLS ONE PASS WILL CROSS, measured rather than chosen (2026-11-24, Chromium on the practitioner's
 *  laptop, grid sizes from 10,000 to 4,000,000 cells, 12 origins).
 *
 *  The cost is linear in the cells and there is no cliff in it: about 0.25 microseconds a cell, so 4 million cells
 *  take a second and 16 million take four. What binds first is not patience but memory — the walk keeps one 8-byte
 *  minute per cell beside the raster's own values, so 16 million cells is 128 MB of minutes in one browser tab, and
 *  36 million would be 288 MB. The figure below is where that becomes the constraint, which is why it is this number
 *  and not a rounder one.
 *
 *  For scale: the Malaria Atlas Project's friction surface is about 1 km at the equator, so a Nigerian LGA is a few
 *  thousand cells, all of Nigeria about 924,000, and the whole of sub-Saharan Africa about 24 million — past this.
 *  An earlier reading of this limit was four times lower, because it was taken with a sorted-insert queue in which
 *  the search for the next cell was 94% of the time. That measured the queue, not the ground. The cap is said when
 *  it is met and never worked around. */
export const MAX_FRICTION_CELLS=16_000_000;

export type Unreachable='outside the raster'|'no usable friction where it stands'|'no path within the surface';

/** THE CHEAPEST CELL NOT YET SETTLED, in two typed arrays rather than a list of objects.
 *
 *  Dijkstra's cost is dominated by how the next-cheapest cell is found. Scanning a list for it is O(n) per step and
 *  the whole pass becomes quadratic: on a 250,000-cell grid that scan alone was 94% of the time, which would have
 *  made any cell limit measured against it a limit on the queue rather than on the ground. This is an ordinary binary
 *  heap, so the limit recorded in the manual is a limit of the method and not of a convenience in it. */
class CellQueue {
  private cell=new Int32Array(1024);
  private at=new Float64Array(1024);
  size=0;
  private grow(){
    if(this.size<this.cell.length)return;
    const cell=new Int32Array(this.cell.length*2),at=new Float64Array(this.at.length*2);
    cell.set(this.cell);at.set(this.at);this.cell=cell;this.at=at;
  }
  push(index:number,cost:number){
    this.grow();
    let i=this.size++;this.cell[i]=index;this.at[i]=cost;
    while(i>0){const parent=(i-1)>>1;
      if(this.at[parent]!<=this.at[i]!)break;
      this.swap(parent,i);i=parent;}
  }
  take():{index:number;at:number}|undefined{
    if(!this.size)return undefined;
    const top={index:this.cell[0]!,at:this.at[0]!};
    this.size--;
    if(this.size){
      this.cell[0]=this.cell[this.size]!;this.at[0]=this.at[this.size]!;
      let i=0;
      for(;;){const left=i*2+1,right=left+1;let small=i;
        if(left<this.size&&this.at[left]!<this.at[small]!)small=left;
        if(right<this.size&&this.at[right]!<this.at[small]!)small=right;
        if(small===i)break;
        this.swap(small,i);i=small;}
    }
    return top;
  }
  private swap(a:number,b:number){
    const cell=this.cell[a]!;this.cell[a]=this.cell[b]!;this.cell[b]=cell;
    const at=this.at[a]!;this.at[a]=this.at[b]!;this.at[b]=at;
  }
}

export interface TravelAnswer {
  /** The places asked about, each carrying `minutes` where a walk reaches it. */
  places:PointCollection;
  reached:number;
  /** One entry per place the walk did not reach, and why. A place with no answer is a finding, not a gap. */
  unreached:{id:string;name:string;why:Unreachable}[];
  /** How many origins stood on usable ground; an origin outside the raster cannot start a walk. */
  originsUsed:number;
  originsSkipped:{id:string;name:string;why:Unreachable}[];
  cells:number;
}

const metresPerDegree=111_320;

/** The cell a position falls in, or null where it falls outside the grid. */
export function cellAt(grid:RasterGrid,[x,y]:Position):{column:number;row:number;index:number}|null{
  const {origin,resolution,width,height}=grid.metadata;
  const column=Math.floor((x-origin[0])/resolution[0]);
  // A north-up grid's rows run south as the row index grows, which is what a negative y resolution says.
  const row=Math.floor((y-origin[1])/resolution[1]);
  if(!Number.isFinite(column)||!Number.isFinite(row))return null;
  if(column<0||row<0||column>=width||row>=height)return null;
  return {column,row,index:row*width+column};
}

/** WALKING TIME FROM EVERY ORIGIN AT ONCE. One pass over the grid with all origins seeded at zero, so the value a
 *  cell settles at is the time from the NEAREST of them and "nearest" costs nothing extra to ask.
 *
 *  Dijkstra rather than a breadth-first flood, because the cost of a step depends on the ground it crosses: a cell
 *  reached cheaply by a long way round is reached cheaply, and a flood would fix it at the first arrival. */
export function travelMinutes(grid:RasterGrid,origins:PointCollection,
  options:{maxMinutes?:number}={}):{minutes:Float64Array;originsUsed:number;
    originsSkipped:{id:string;name:string;why:Unreachable}[];cells:number}{
  const {width,height,resolution}=grid.metadata;
  const cells=width*height;
  if(cells>MAX_FRICTION_CELLS)
    throw new Error(`This friction surface has ${cells.toLocaleString('en')} cells and one pass crosses at most `
      +`${MAX_FRICTION_CELLS.toLocaleString('en')}. Clip it to the area you are asking about, or read a coarser one.`);
  const minutes=new Float64Array(cells).fill(Infinity);
  const values=grid.values as ArrayLike<number>;
  const friction=(index:number):number|null=>{
    const v=values[index];
    return typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
  };
  // A degree of longitude shortens with latitude; a degree of latitude does not. The grid is EPSG:4326 by the
  // raster contract, so the metres a step crosses are computed per row rather than assumed square.
  const latitudeOf=(row:number):number=>grid.metadata.origin[1]+(row+0.5)*resolution[1];
  const metresY=Math.abs(resolution[1])*metresPerDegree;
  const metresXAt=(row:number):number=>
    Math.abs(resolution[0])*metresPerDegree*Math.cos(latitudeOf(row)*Math.PI/180);

  const originsSkipped:{id:string;name:string;why:Unreachable}[]=[];
  const queue=new CellQueue();
  let originsUsed=0;
  for(const feature of origins.features??[]){
    const name=String(feature.properties?.name??feature.id??'');
    if(!feature.geometry){originsSkipped.push({id:String(feature.id),name,why:'outside the raster'});continue;}
    const cell=cellAt(grid,feature.geometry.coordinates as Position);
    if(!cell){originsSkipped.push({id:String(feature.id),name,why:'outside the raster'});continue;}
    if(friction(cell.index)===null){
      originsSkipped.push({id:String(feature.id),name,why:'no usable friction where it stands'});continue;}
    if(minutes[cell.index]!==0){minutes[cell.index]=0;queue.push(cell.index,0);}
    originsUsed++;
  }
  if(!originsUsed)return {minutes,originsUsed,originsSkipped,cells};

  const ceiling=options.maxMinutes&&options.maxMinutes>0?options.maxMinutes:Infinity;
  while(queue.size){
    const here=queue.take()!;
    if(here.at>minutes[here.index]!)continue;
    if(here.at>ceiling)continue;
    const row=(here.index/width)|0,column=here.index%width;
    const hereFriction=friction(here.index);
    if(hereFriction===null)continue;
    const dx=metresXAt(row);
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      if(!dr&&!dc)continue;
      const r=row+dr,c=column+dc;
      if(r<0||c<0||r>=height||c>=width)continue;
      const index=r*width+c;
      const there=friction(index);
      if(there===null)continue;
      // The metres between the two cell centres, and the mean cost of a metre across the pair.
      const across=Math.hypot(dc*dx,dr*metresY);
      const cost=here.at+across*((hereFriction+there)/2);
      if(cost<minutes[index]!&&cost<=ceiling){minutes[index]=cost;queue.push(index,cost);}
    }
  }
  return {minutes,originsUsed,originsSkipped,cells};
}

/** The places asked about, each with the minutes to the nearest origin, and one entry for every place the walk did
 *  not reach with the reason it did not. */
export function travelToPlaces(grid:RasterGrid,origins:PointCollection,places:PointCollection,
  options:{maxMinutes?:number;attribute?:string}={}):TravelAnswer{
  const {minutes,originsUsed,originsSkipped,cells}=travelMinutes(grid,origins,options);
  const attribute=options.attribute?.trim()||'minutes';
  const unreached:{id:string;name:string;why:Unreachable}[]=[];
  let reached=0;
  const features:PointFeature[]=(places.features??[]).map(feature=>{
    const name=String(feature.properties?.name??feature.id??'');
    const cell=feature.geometry?cellAt(grid,feature.geometry.coordinates as Position):null;
    const why:Unreachable|null=!cell?'outside the raster'
      :!Number.isFinite(minutes[cell.index]!)?'no path within the surface':null;
    if(why){unreached.push({id:String(feature.id),name,why});
      // CARRIED, NOT DROPPED. A settlement nobody can walk to is the finding a microplan is looking for, so it
      // stays in the layer with the reason beside it and no number pretending to be an answer.
      return {...feature,properties:{...feature.properties,[attribute]:null,[`${attribute}_why`]:why}};}
    reached++;
    return {...feature,properties:{...feature.properties,
      [attribute]:Number(minutes[cell!.index]!.toFixed(2))}};
  });
  return {places:{...places,features},reached,unreached,originsUsed,originsSkipped,cells};
}

/** THE WIDGET'S VALUE AND RECEIPT. What the result says of itself is the part a microplan is read from: which
 *  settlements the walk reached, which it did not and why, and what the number is not — a route. */
export function travelValue(
  friction:RasterGrid, origins:PointCollection, places:PointCollection,
  node:WorkflowNode<'travel_over_ground'>, runId:string, sourceNodeId:string,
):{value:PointCollection&{sourceNodeId:string};receipt:Receipt}{
  const attribute=node.params.attribute?.trim()||'minutes';
  const ceiling=node.params.maxMinutes;
  if(!origins?.features?.length)
    throw new Error('A travel time needs somewhere to start from. Connect the facilities, or whatever the walk begins at, to Start from.');
  if(!places?.features?.length)
    throw new Error('A travel time needs places to answer for. Connect the settlements, or whatever the walk ends at, to Places.');
  const answer=travelToPlaces(friction,origins,places,
    {...(ceiling&&ceiling>0?{maxMinutes:ceiling}:{}),attribute});
  const {reached,unreached,originsUsed,originsSkipped,cells}=answer;
  const asset=friction.asset;
  const metadata=friction.metadata;
  const metres=Math.round(Math.abs(metadata.resolution[0])*111_320);
  const notes=[
    `${attribute} is the time to the nearest of ${originsUsed} origin${originsUsed===1?'':'s'}, accumulated cell by cell across the friction surface, `
      +`written onto ${places.features.length} place${places.features.length===1?'':'s'}. ${reached} of them ${reached===1?'was':'were'} reached.`,
    'THE NUMBER IS NOT A ROUTE. Nobody walks the line this grid implies: the walk steps between cell centres, eight ways, '
      +'and each step costs the metres between those centres times the mean of the two cells’ friction. It is a model of '
      +'crossing ground, and the minutes are what the surface says the ground costs.',
    `The surface states the cost of crossing one metre of each cell, and every minute reported here comes from those values. `
      +`If the surface is wrong about the ground — a road built since, a river in flood, a season — every number above is wrong with it, `
      +`and nothing in this step can tell.`,
    `Cells ${cells.toLocaleString('en')}, each about ${metres.toLocaleString('en')} m across at the equator. A cell is the finest distinction this answer can make: `
      +'two places in the same cell have the same answer, however far apart they stand in it.',
    'Metres across a cell are computed per row from its latitude, because a degree of longitude shortens away from the equator and a degree of latitude does not.',
  ];
  // CARRIED, NOT DROPPED, and said here as well as on the feature: a place the walk cannot reach is what a
  // microplan is looking for, so it is in the notes rather than only in a null the reader has to notice.
  if(unreached.length)notes.unshift(`${unreached.length} place${unreached.length===1?'':'s'} ${unreached.length===1?'was':'were'} NOT reached (`
    +unreached.slice(0,6).map(u=>`${u.name}: ${u.why}`).join('; ')+(unreached.length>6?`, and ${unreached.length-6} more`:'')
    +`). ${unreached.length===1?'It carries':'They carry'} ${attribute} as nothing at all, with ${attribute}_why beside it, and ${unreached.length===1?'is':'are'} still in the layer. `
    +'A place nobody can reach is a finding, not a gap in the result.');
  if(originsSkipped.length)notes.unshift(`${originsSkipped.length} origin${originsSkipped.length===1?'':'s'} could not start a walk (`
    +originsSkipped.slice(0,6).map(o=>`${o.name}: ${o.why}`).join('; ')+(originsSkipped.length>6?`, and ${originsSkipped.length-6} more`:'')
    +`), so every time above is to the nearest of the ${originsUsed} that could.`);
  if(ceiling&&ceiling>0)notes.push(`The walk stopped at ${ceiling} minutes. A place past that is unreached here, which is not the same as unreachable.`);
  if(asset?.source?.filename)notes.push(`The surface is ${asset.source.filename}, read as supplied and not re-projected here.`);
  const activity=`<urn:fieldwork:run:${runId}:${node.id}:ground-travel>`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`${activity} a fw:GroundTravelTime, prov:Activity; `
    +`fw:originCount ${originsUsed}; `
    +`fw:reachedPlaceCount ${reached}; `
    +`fw:unreachedPlaceCount ${unreached.length}; `
    +(unreached.length?`fw:unreachedPlaces ${JSON.stringify(JSON.stringify(unreached))}; `:'')
    +(originsSkipped.length?`fw:skippedOriginCount ${originsSkipped.length}; fw:skippedOrigins ${JSON.stringify(JSON.stringify(originsSkipped))}; `:'')
    +`fw:frictionCellCount ${cells}; `
    +`fw:travelTimeAttribute ${JSON.stringify(attribute)}; `
    +(ceiling&&ceiling>0?`fw:travelCeilingMinutes ${ceiling}; `:'')
    +(asset?.source?.filename?`fw:sourceFile ${JSON.stringify(asset.source.filename)}; `:'')
    +(asset?.sha256?`fw:sourceDigest ${JSON.stringify(asset.sha256)}; `:'')
    +`prov:used <urn:fieldwork:run:${runId}:${sourceNodeId}>.\n`;
  return {value:{...answer.places,sourceNodeId:node.id,
    sourceKind:'input-points',spatialReference:defaultSpatialReference(),
    sourceInfo:{format:'ground-travel-time',notes}} as unknown as PointCollection&{sourceNodeId:string},
    receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
      method:`Cheapest path over a friction surface from ${originsUsed} origin${originsUsed===1?'':'s'} at once, eight-neighbour, `
        +`each step costing the metres between cell centres times the mean friction of the pair. ${notes.join(' ')}`}};
}
