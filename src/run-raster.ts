/** WHAT EACH STEP COMPUTES: the raster and satellite steps. Moved out of `executeWorkflow` on 2026-11-25 (code
 *  review), one function per step type, each given the run's context rather than reaching into the executor. The text
 *  of each step is as it stood in the switch; a step that ended there now returns its value. */
import {clipRaster,loadRaster,rasterReceipt} from './raster-workflow.js';
import type {DisplayValue,Receipt} from './results.js';
import {sampleRaster,sampleReceipt} from './sample-raster.js';
import {defaultKept,searchFacts,searchSentence} from './satellite-catalog.js';
import {productFacts,productFor,productSentence,type SatelliteProduct} from './satellite-products.js';
import type {PointInput} from './types.js';
import type {StepContext} from './core.js';
import {rereadOnce,streamedAtPoints,studyUnitAreas} from './core.js';

export async function runSampleRaster(ctx:StepContext<'sample_raster'>):Promise<unknown>{
  const {inputs,node,receipts,runId,workflow}=ctx;
  let value:unknown;
  // SATELLITE FILES (experiment 180), read as the satellite sampler read them, now this sampler's other source (205).
  if(node.params.source==='satellite-files'){
  const files=(inputs as unknown as {files?:{kind?:string;product?:SatelliteProduct;search?:import('./satellite-catalog.js').CatalogSearch}}).files;
  if(files?.kind!=='satellite-files'||!files.product||!files.search)throw new Error('Connect Search a satellite catalog to files: there are no files to read yet.');
  const raw=inputs.points as unknown as PointInput|undefined;
  // AREAS FROM A POLYGON LAYER, OR FROM A STUDY AREA'S UNITS: the 92 municipalities picked from geoBoundaries are
  // read as they are, one part per unit, parts of one unit sharing its id (experiment 180).
  const study=(inputs as unknown as {area?:{units?:{id:string;name:string}[];boundary?:import('./types.js').Boundary}}).area;
  const fromStudy=study?.units?.length&&study.boundary
    ?{features:study.units.map((unit,index)=>({id:unit.id,name:unit.name,geometry:{type:'Polygon' as const,
      coordinates:study.boundary!.type==='MultiPolygon'?study.boundary!.coordinates[index]!:study.boundary!.coordinates} as import('./types.js').Boundary}))}
    // A STUDY AREA DRAWN BY HAND, or with no named parts, is read as one area under its own name (2026-11-13: the
    // practitioner connected a drawn area and a raster and could not see what to do next).
    :study?.boundary?{features:[{id:(study as {label?:string}).label||'Study area',name:(study as {label?:string}).label||'Study area',geometry:study.boundary}]}
    :undefined;
  if(study&&!fromStudy)throw new Error('This study area has no outline yet. Choose it in the study area’s Configure…, or connect a polygon layer to areas.');
  const polygons=(inputs as unknown as {areas?:{features?:{id:string|number;name?:string;geometry?:import('./types.js').Boundary|null}[]}}).areas??fromStudy;
  if([raw,(inputs as {areas?:unknown}).areas,study].filter(Boolean).length>1)
    throw new Error('Connect one kind of place: points, a polygon layer, or a study area. One table holds one kind.');
  // A GRIDDED PRODUCT (MODIS, experiment 180) is read over areas or at points by terrio (experiment 221); a swath (Sentinel-5P) at
  // points by h5wasm. Which reader is the product's, not a setting.
  const grids=await import('./satellite-grid-sample.js');
  const gridReader=grids.gridReaderFor(files.product);
  if(gridReader){
    const features=!raw?[]:'layers' in raw?raw.layers.flatMap(l=>l.features):raw.features;
    const places:import('./satellite-grid-sample.js').Place[]=polygons
      ?grids.areasFrom(polygons.features??[])
      :features.filter(f=>f.geometry?.coordinates).map(f=>({id:String(f.id),name:String(f.properties?.name??f.id),kind:'point' as const,
        lon:(f.geometry!.coordinates as number[])[0]!,lat:(f.geometry!.coordinates as number[])[1]!}));
    if(!places.length)throw new Error(polygons?'The areas connected have no polygons to read over.':'Connect a point layer to points, or polygons to areas: the values are read there.');
    const kind=polygons?'area' as const:'point' as const;
    const layer=grids.layerKeyOf(gridReader,node.params.layer),rule=grids.ruleOf(gridReader,node.params.qualityRule);
    const {openImage}=await import('./terrio.js');
    const tags={files:0,stated:0,saved:0};
    const {deviceReadings}=await import('./satellite-reading-store.js');
    const {runDetail}=await import('./run-progress.js');
    const report=(done:number,of:number)=>runDetail({nodeId:node.id,label:node.params.label||'Sample satellite files',done,of,what:'satellite files'});
    report(0,files.search.items.length);
    const readings=await grids.readGridFiles(files.search.items,gridReader,layer,rule,places,openImage as never,fetch,report,tags,
      {saved:deviceReadings,...(rereadOnce.delete(node.id)?{reread:true}:{})})
      .finally(()=>runDetail(null));
    const column=node.params.placeColumn?.trim()||(kind==='area'?'area':'point_id');
    const unit=node.params.unit;
    const {table,counts}=grids.gridTable(places,readings,gridReader,layer,rule,column,unit);
    counts.files=files.search.items.length;
    const sentence=grids.gridSentence(counts,gridReader,layer,rule,files.product,kind,unit,tags);
    value={...table,sentence} as unknown as DisplayValue;
    const facts=grids.gridFacts(`<urn:fieldwork:run:${runId}:output:${node.id}>`,counts,gridReader,layer,rule,files.product,kind,unit,tags.saved);
    receipts.push({nodeId:node.id,kind:'computation',facts,rules:'',input:facts,conclusions:[],method:sentence} as unknown as Receipt);
    return value;
  }
  const sampling=await import('./satellite-sample.js');
  const reader=sampling.readerFor(files.product);
  if(!reader)throw new Error(`No reader is built yet for ${files.product.route.label}. Sentinel-5P NO₂, MODIS land surface temperature and MODIS vegetation on Planetary Computer have one.`);
  if(polygons)throw new Error(`${files.product.route.label} is read at points only: its files are swaths, and reading one over an area is not built. Connect points.`);
  const features=!raw?[]:'layers' in raw?raw.layers.flatMap(l=>l.features):raw.features;
  if(!features.length)throw new Error('Connect a point layer to points: the values are read at its points.');
  const placed=features.filter(f=>f.geometry?.coordinates).map(f=>({id:String(f.id),name:String(f.properties?.name??f.id),
    lon:(f.geometry!.coordinates as number[])[0]!,lat:(f.geometry!.coordinates as number[])[1]!}));
  const operator=node.params.qaOperator??'>=';
  const {readFiles}=await import('./satellite-sample-reader.js');
  const {runDetail}=await import('./run-progress.js');
  const report=(done:number,of:number)=>runDetail({nodeId:node.id,label:node.params.label||'Sample satellite files',done,of,what:'satellite files'});
  report(0,files.search.items.length);
  const {deviceReadings}=await import('./satellite-reading-store.js');
  const stats={saved:0};
  const readings=await readFiles(files.search.items,reader,placed,report,
    {saved:deviceReadings,stats,...(rereadOnce.delete(node.id)?{reread:true}:{})}).finally(()=>runDetail(null));
  const idColumn=!raw||'layers' in raw?undefined:raw.idColumn;
  const {table,counts}=sampling.sampleTable(placed,readings,files.search.from,files.search.until||files.search.from,reader,operator,features.length-placed.length,idColumn);
  const units=readings.find(r=>r.units)?.units??null;
  const sentence=sampling.sampleSentence(counts,reader,operator,files.product,stats.saved);
  value={...table,sentence} as unknown as DisplayValue;
  const facts=sampling.sampleFacts(`<urn:fieldwork:run:${runId}:output:${node.id}>`,counts,reader,operator,files.product,units,stats.saved);
  receipts.push({nodeId:node.id,kind:'computation',facts,rules:'',input:facts,conclusions:[],method:sentence} as unknown as Receipt);
  return value;}
  if(!inputs.raster)throw new Error('Connect a prepared Raster input or Clip raster to Sample a raster.');
  // OVER AREAS (experiment 205): each area's cells totalled, no data counted apart, the share outside the raster said.
  if(node.params.over==='areas'){
    const {areaTotals,streamedAreaTotals,areaTotalsReceipt}=await import('./raster-areas.js');
    const study=(inputs as unknown as {area?:{units?:{id:string;name:string}[];boundary?:import('./types.js').Boundary}}).area;
    const layer=(inputs as unknown as {areas?:{features?:{id:string|number;name?:string;geometry?:import('./types.js').Boundary|null}[]}}).areas;
    if(study&&layer)throw new Error('Connect a polygon layer or a study area to areas, not both.');
    const fromStudy=study?.units?.length&&study.boundary?studyUnitAreas(study as {units:{id:string;name:string}[];boundary:import('./types.js').Boundary})
      :study?.boundary?[{id:'area',name:'Study area',geometry:study.boundary}]:undefined;
    const features=layer?.features??fromStudy;
    if(!features?.length)throw new Error('Connect a polygon layer or a study area to areas: the raster is totalled over each.');
    // A STREAMED RASTER (2026-11-19) is read from its source in strips, its kept copy being reduced.
    let totals;
    if(inputs.raster.asset?.streamed){
      const {runDetail}=await import('./run-progress.js');
      try{totals=await streamedAreaTotals(features,inputs.raster,node.params,(pass,rows,of)=>runDetail({nodeId:node.id,
        label:node.params.label||'Sample a raster',done:rows,of,what:pass===1?'rows read':`rows read again (pass ${pass}, for the median)`}));}
      finally{runDetail(null);}
    }else totals=areaTotals(features,inputs.raster,node.params);
    value=totals.value as unknown as DisplayValue;
    receipts.push(areaTotalsReceipt(node,totals.counts,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='raster')!.from));
    return value;
  }
  if(!inputs.points)throw new Error('Connect points or areas to Sample a raster: the raster is read at the points or totalled over the areas.');
  const sampled=sampleRaster(inputs.points,inputs.raster.asset?.streamed?await streamedAtPoints(inputs.points,inputs.raster):inputs.raster,node.params);value=sampled.value;
  receipts.push(sampleReceipt(node,inputs.raster,sampled.counts,runId,{
    points:workflow.edges.find(e=>e.to===node.id&&e.port==='points')!.from,
    raster:workflow.edges.find(e=>e.to===node.id&&e.port==='raster')!.from}));return value;
}

export async function runRasterInput(ctx:StepContext<'raster_input'>):Promise<unknown>{
  const {inputs,node,receipts,runId}=ctx;
  let value:unknown;
  if(!node.params.asset)throw new Error('Prepare the raster window before running.');const grid=await loadRaster(node.params.asset,inputs.area);value=grid;receipts.push(rasterReceipt(node,grid,inputs.area,runId));return value;
}

export async function runClipRaster(ctx:StepContext<'clip_raster'>):Promise<unknown>{
  const {inputs,node,receipts,runId,workflow}=ctx;
  let value:unknown;
  if(inputs.raster?.asset?.streamed)throw new Error('This raster is too large to keep whole, so it is streamed, and a clip of it '
    +'would be as large. Connect it to Sample a raster instead, which reads it over areas or at points.');
  const grid=clipRaster(inputs.raster,node.params.cutline?.geometry||inputs.area.boundary,node.params);value=grid;receipts.push(rasterReceipt(node,grid,inputs.area,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='raster')!.from));return value;
}

// A DECLARATION RUNS BY BEING TRUE. There is nothing to compute, so the step emits the
// declaration itself and a receipt saying what was declared -- which is what makes it
// auditable rather than a comment. The value carries the design so a consumer wired by an
// edge reads it from its inputs; a consumer with no edge walks upstream for the node
// instead. Experiment 154.
export async function runFindSatelliteProducts(ctx:StepContext<'find_satellite_products'>):Promise<unknown>{
  const {node,receipts,runId}=ctx;
  let value:unknown;
  const product=node.params.topic&&node.params.route?productFor(node.params.topic,node.params.route):null;
  if(!product)throw new Error('Choose a satellite product: open Find satellite products and choose one.');
  value={kind:'satellite-product',product,sentence:productSentence(product)} as unknown as DisplayValue;
  const facts=productFacts(`<urn:fieldwork:run:${runId}:output:${node.id}>`,product);
  receipts.push({nodeId:node.id,kind:'computation',facts,rules:'',input:facts,conclusions:[],
    method:productSentence(product)} as unknown as Receipt);
  return value;
}

export async function runSearchSatelliteCatalog(ctx:StepContext<'search_satellite_catalog'>):Promise<unknown>{
  const {inputs,node,receipts,runId}=ctx;
  let value:unknown;
  const chosen=(inputs as unknown as {product?:{kind?:string;product?:SatelliteProduct}}).product;
  if(chosen?.kind!=='satellite-product'||!chosen.product)throw new Error('Connect Find satellite products: a search needs a chosen product.');
  const search=node.params.search;
  if(!search)throw new Error('Search the catalog first: open Search a satellite catalog, choose the dates and search.');
  if(search.collection!==chosen.product.route.collection||(search.productType??null)!==(chosen.product.route.productType??null))
    throw new Error('The saved search is for a different product than the one connected. Search again.');
  const kept=new Set(node.params.kept??defaultKept(search.items));
  const items=search.items.filter(i=>kept.has(i.id));
  const sentence=searchSentence(search,chosen.product)+` ${items.length} kept.`;
  value={kind:'satellite-files',product:chosen.product,search:{...search,items},sentence} as unknown as DisplayValue;
  const facts=searchFacts(`<urn:fieldwork:run:${runId}:output:${node.id}>`,search,items.length);
  receipts.push({nodeId:node.id,kind:'computation',facts,rules:'',input:facts,conclusions:[],method:sentence} as unknown as Receipt);
  return value;
}
