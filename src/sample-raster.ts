/** Sample a raster at point locations, writing one attribute onto the layer.
 *
 *  A sampled value is the value of the cell containing the point under PixelIsArea, at the
 *  raster's resolution. It is not a measurement at the point, no interpolation is performed and
 *  none is claimed, and sampling creates no data the source lacks. No-data cells and points
 *  outside the raster are counted separately and carry no value: a point outside is a question
 *  about coverage, a no-data cell is a statement by the source.
 *  See docs/experiments/67-sample-raster-at-points.md. */
import type {PointCollection,PointFeature,WorkflowNode} from './types.js';
import type {Receipt} from './results.js';
import type {RasterGrid} from './raster.js';
import {validAttributeKey} from './attribute-schema.js';

export interface SampleCounts {sampled:number; noData:number; outside:number; unlocated:number}
export interface SampleResult {value:PointCollection & {sampleCounts:SampleCounts}; counts:SampleCounts}

const text=(value:unknown)=>typeof value==='string'?value.trim():'';

/** The cell containing a coordinate, or null when it falls outside the grid. */
export function cellAt(metadata:RasterGrid['metadata'],coordinates:[number,number]):[number,number]|null{
  const [x,y]=coordinates,[rx,ry]=metadata.resolution;
  // A negative resolution makes Math.floor return -0 on the origin edge, which indexes
  // correctly but reads back as "-0" wherever a cell index is recorded. Normalise it.
  const zero=(value:number)=>value===0?0:value;
  const column=zero(Math.floor((x-metadata.origin[0])/rx)),row=zero(Math.floor((y-metadata.origin[1])/ry));
  if(!Number.isFinite(column)||!Number.isFinite(row))return null;
  if(column<0||row<0||column>=metadata.width||row>=metadata.height)return null;
  return [column,row];
}

/** Draft validation. An empty attribute name is an unfinished node, not an invalid one; an
 *  unusable one is wrong whenever it is present. */
export function validateSampleNode(node:WorkflowNode<'sample_raster'>):void{
  const name=text(node.params.attribute);
  if(name&&!validAttributeKey(name))throw new Error(`"${name}" is not a usable attribute name. Start with a letter and use letters, digits or underscores.`);
}

/** What must hold to run. */
export function requireRunnableSample(node:WorkflowNode<'sample_raster'>):void{
  validateSampleNode(node);
  if(!text(node.params.attribute))throw new Error('Name the attribute to write for Sample raster.');
}

export function sampleRaster(points:PointCollection,grid:RasterGrid,params:WorkflowNode<'sample_raster'>['params']):SampleResult{
  requireRunnableSample({id:'check',type:'sample_raster',x:0,y:0,params});
  const name=text(params.attribute);
  if(grid.metadata.crs!=='EPSG:4326')throw new Error('Sample raster needs an EPSG:4326 raster; this prototype implements no datum shift.');
  // An existing attribute is never overwritten: a sample must not silently replace survey data.
  const existing=points.features.find(f=>f.properties&&Object.hasOwn(f.properties,name));
  if(existing)throw new Error(`The layer already has an attribute called "${name}". Choose another name; Sample raster does not overwrite an existing attribute.`);
  const noData=grid.metadata.noData;
  const counts:SampleCounts={sampled:0,noData:0,outside:0,unlocated:0};
  const features=points.features.map((f):PointFeature=>{
    const coordinates=f.geometry?.coordinates as [number,number]|undefined;
    if(!coordinates){counts.unlocated++;return structuredClone(f);}
    const cell=cellAt(grid.metadata,coordinates);
    if(!cell){counts.outside++;return structuredClone(f);}
    const raw=grid.values[cell[1]*grid.metadata.width+cell[0]];
    // null already marks a masked or absent cell; a declared no-data value and a non-finite
    // sample are the same answer. None of them is zero.
    if(raw===null||!Number.isFinite(raw)||(typeof noData==='number'&&raw===noData)){counts.noData++;return structuredClone(f);}
    counts.sampled++;
    return {...structuredClone(f),properties:{...f.properties,[name]:raw}};
  });
  return {value:{type:'FeatureCollection',features,sampleCounts:counts},counts};
}

export function sampleReceipt(node:WorkflowNode<'sample_raster'>,grid:RasterGrid,counts:SampleCounts,runId:string,sources:{points:string;raster:string}):Receipt{
  const base=`urn:fieldwork:run:${runId}:`,activity=`<${base}output:${node.id}:activity>`;
  const [rx,ry]=grid.metadata.resolution,unit=text(node.params.valueUnit);
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`${activity} a fw:RasterPointSample, prov:Activity; `
    +`prov:used <${base}output:${sources.points}>, <${base}output:${sources.raster}>; `
    +`fw:sampledAttribute ${JSON.stringify(node.params.attribute.trim())}; `
    +`fw:valueUnitStatus ${JSON.stringify(unit?'stated':'unstated')}; `
    +(unit?`fw:sampledValueUnit ${JSON.stringify(unit)}; `:'')
    +`fw:cellSizeX "${Math.abs(rx)}"^^xsd:decimal; fw:cellSizeY "${Math.abs(ry)}"^^xsd:decimal; `
    +`fw:sampleConvention "containing cell, PixelIsArea; no interpolation"; `
    +`fw:sampledCount "${counts.sampled}"^^xsd:integer; fw:noDataCount "${counts.noData}"^^xsd:integer; `
    +`fw:outsideRasterCount "${counts.outside}"^^xsd:integer; fw:unlocatedCount "${counts.unlocated}"^^xsd:integer.\n`;
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
    method:`Value of the raster cell containing each point, at ${Math.abs(rx)} x ${Math.abs(ry)} degrees, under PixelIsArea. No interpolation is performed. A cell value is not a measurement at the point, and sampling creates no data missing from the source. No-data cells (${counts.noData}), points outside the raster (${counts.outside}) and points without coordinates (${counts.unlocated}) carry no value and are never zero-filled.`};
}
