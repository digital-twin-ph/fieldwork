/** A RASTER TOTALLED OVER AREAS (experiment 205): the second half of "Sample a raster at points or over areas".
 *
 *  Each area's cells are the cells whose centre is inside or on it, by the rule Clip raster and the satellite sampler use
 *  (`rasterCellPredicate`, cell centre), which lab check 02 holds against rasterio. Their values are summed, never
 *  averaged first. A cell the raster marks as no data is counted apart and adds nothing: no data is not zero. A cell of
 *  the area beyond the raster's window is counted as outside, so an area the window does not cover says so instead of
 *  reading as a small total. A cell is counted whole or not at all: not area-weighted, which is said in the receipt. */
import type {Boundary,WorkflowNode} from './types.js';
import type {Receipt} from './results.js';
import type {RasterGrid} from './raster.js';

export interface AreaTotalCounts {areas:number; cells:number; noData:number; outside:number; empty:number}
interface AreaFeature {id:string|number; name?:string; geometry?:Boundary|null}

const boxOf=(b:Boundary)=>{let W=Infinity,S=Infinity,E=-Infinity,N=-Infinity;
  for(const poly of b.type==='Polygon'?[b.coordinates]:b.coordinates)for(const ring of poly)for(const [x,y] of ring as [number,number][]){
    if(x<W)W=x;if(x>E)E=x;if(y<S)S=y;if(y>N)N=y;}
  return {W,S,E,N};};

/** EACH ROW'S RUNS OF CELLS WHOSE CENTRE IS INSIDE OR ON THE AREA, by scanline (2026-11-13). The rule is
 *  `rasterCellPredicate`'s, cell centre, and gives the same cells; it is computed once per row from where the outline
 *  crosses the row's centre line, instead of testing every cell of the area's box against every vertex. That test took
 *  Botswana's ten districts (47,321 vertices) over WorldPop's 123 million cells past ten minutes on the published site,
 *  found walking the practitioner's own workflow by hand. Holes and parts are read even-odd, as rings never cross.
 *  Returns, for each row from `r0`, inclusive column runs [first, last]. */
export function centreRuns(geometry:Boundary,origin:readonly number[],resolution:readonly number[],r0:number,r1:number):[number,number][][]{
  const [ox,oy]=origin as [number,number],[rx,ry]=resolution as [number,number];
  const crossings:number[][]=Array.from({length:Math.max(0,r1-r0)},()=>[]);
  for(const poly of geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates)
    for(const ring of poly as [number,number][][]){
      for(let i=1;i<ring.length;i++){
        const ax=(ring[i-1]![0]-ox)/rx,ay=(ring[i-1]![1]-oy)/ry,bx=(ring[i]![0]-ox)/rx,by=(ring[i]![1]-oy)/ry;
        if(ay===by)continue;
        // Rows whose centre line y = r + 0.5 lies in [low, high): each crossing counted once, at a shared vertex too.
        const low=Math.min(ay,by),high=Math.max(ay,by);
        const first=Math.max(r0,Math.ceil(low-0.5)),last=Math.min(r1-1,Math.ceil(high-0.5)-1);
        for(let r=first;r<=last;r++){const y=r+0.5;crossings[r-r0]!.push(ax+(y-ay)*(bx-ax)/(by-ay));}
      }
    }
  return crossings.map(xs=>{xs.sort((a,b)=>a-b);const runs:[number,number][]=[];
    for(let i=0;i+1<xs.length;i+=2){const c0=Math.ceil(xs[i]!-0.5),c1=Math.floor(xs[i+1]!-0.5);if(c1>=c0)runs.push([c0,c1]);}
    return runs;});
}

/** One area's total: its cells inside the window, those with no data, and those beyond the window. */
export function totalOver(geometry:Boundary,grid:Pick<RasterGrid,'metadata'|'values'>):{total:number;cells:number;noData:number;outside:number;min:number|null;max:number|null}{
  const {origin,resolution,width,height,noData}=grid.metadata,[ox,oy]=origin,[rx,ry]=resolution;
  const {W,S,E,N}=boxOf(geometry);
  // Every cell of the grid's lattice the area's box touches, inside the window or not.
  const c0=Math.floor((W-ox)/rx),c1=Math.ceil((E-ox)/rx),r0=Math.floor((N-oy)/ry),r1=Math.ceil((S-oy)/ry);
  const runs=centreRuns(geometry,origin,resolution,r0,r1);
  let total=0,cells=0,missing=0,outside=0,min=Infinity,max=-Infinity;
  for(let r=r0;r<r1;r++)for(const [a,b] of runs[r-r0]!)for(let c=Math.max(a,c0);c<=Math.min(b,c1-1);c++){
    if(c<0||r<0||c>=width||r>=height){outside++;continue;}
    const v=grid.values[r*width+c];
    if(v===null||v===undefined||!Number.isFinite(v)||(typeof noData==='number'&&v===noData)){missing++;continue;}
    total+=v;cells++;if(v<min)min=v;if(v>max)max=v;
  }
  return {total,cells,noData:missing,outside,min:cells?min:null,max:cells?max:null};
}

/** Every area's total, as polygons carrying it, so they can be mapped and related like any other polygon layer. */
export function areaTotals(features:readonly AreaFeature[],grid:RasterGrid,params:WorkflowNode<'sample_raster'>['params']){
  if(grid.metadata.crs!=='EPSG:4326')throw new Error('Sample a raster needs an EPSG:4326 raster; this prototype implements no datum shift.');
  const column=params.attribute?.trim()||'total';
  const counts:AreaTotalCounts={areas:0,cells:0,noData:0,outside:0,empty:0};
  const out=features.filter(f=>f.geometry).map(f=>{
    const t=totalOver(f.geometry!,grid);
    counts.areas++;counts.cells+=t.cells;counts.noData+=t.noData;counts.outside+=t.outside;if(!t.cells)counts.empty++;
    const total=t.cells?t.total:null;
    return {id:String(f.id),name:f.name??String(f.id),geometry:f.geometry!,
      ...(total!==null?{value:total}:{}),
      properties:{[column]:total,cells:t.cells,cells_no_data:t.noData,cells_outside_raster:t.outside,
        // THE CELLS' OWN STATISTICS, when asked: of the cells with a value, each counted whole. A mean of cells is not a
        // density per square kilometre unless the cells are equal in area, which a latitude-longitude grid's are not.
        ...(params.cellStatistics?{cell_mean:t.cells?t.total/t.cells:null,cell_min:t.min,cell_max:t.max}:{})}};
  });
  const sentence=areaTotalsSentence(counts,column,params.valueUnit,params.cellStatistics);
  return {value:{features:out,sites:[],crs:'EPSG:4326',layerName:params.label||'Raster totals',featuresNamed:true,
    valueName:params.valueUnit?.trim()?`${column}, ${params.valueUnit.trim()}`:column,
    method:sentence,notes:[sentence]},counts,sentence};
}

export function areaTotalsSentence(c:AreaTotalCounts,column:string,unit?:string,cellStatistics?:boolean):string{
  return `${column} totalled over ${c.areas} area${c.areas===1?'':'s'}: ${c.cells.toLocaleString('en-US')} cells whose centre is inside `
    +`or on an area${unit?.trim()?`, in ${unit.trim()}`:''}, each counted whole, not area-weighted.`
    +(cellStatistics?' With each area\u2019s mean, smallest and largest cell value, of the cells with a value.':'')
    +(c.noData?` ${c.noData.toLocaleString('en-US')} cells with no data added nothing; no data is not zero.`:'')
    +(c.outside?` ${c.outside.toLocaleString('en-US')} cells of the areas lie beyond the raster's window and are not in any total.`:'')
    +(c.empty?` ${c.empty} area${c.empty===1?' has':'s have'} no cell with a value, and no total.`:'');
}

export function areaTotalsReceipt(node:WorkflowNode<'sample_raster'>,counts:AreaTotalCounts,runId:string,raster:string):Receipt{
  const base=`urn:fieldwork:run:${runId}:`,activity=`<${base}output:${node.id}:activity>`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`${activity} a fw:RasterAreaTotal, prov:Activity; prov:used <${base}output:${raster}>; `
    +`fw:cellRule "cell centre inside or on the area; counted whole, not area-weighted"; `
    +(node.params.cellStatistics?`fw:cellStatisticsGiven "mean, minimum and maximum of the cells with a value"; `:'')
    +`fw:areaCount "${counts.areas}"^^xsd:nonNegativeInteger; fw:totalledCellCount "${counts.cells}"^^xsd:nonNegativeInteger; `
    +`fw:noDataCellCount "${counts.noData}"^^xsd:nonNegativeInteger; fw:outsideRasterCellCount "${counts.outside}"^^xsd:nonNegativeInteger; `
    +`fw:areasWithoutValueCount "${counts.empty}"^^xsd:nonNegativeInteger.\n`;
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
    method:areaTotalsSentence(counts,node.params.attribute?.trim()||'total',node.params.valueUnit,node.params.cellStatistics)};
}
