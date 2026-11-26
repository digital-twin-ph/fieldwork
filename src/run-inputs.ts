/** WHAT EACH STEP COMPUTES: the steps that bring data in: points, polygons, lines, tables, map images and the study
 *  area. Moved out of `executeWorkflow` on 2026-11-25 (code review), one function per step type, each given the
 *  run's context rather than reaching into the executor. The text of each step is as it stood in the switch; a step
 *  that ended there now returns its value. */
import {areaParts} from './area-parts-layer.js';
import {applyFeatureEdits,applyTableEdits,editsAt,editsFacts,editsSentence} from './cell-edits.js';
import {metadataFindings,scalesOf} from './column-metadata.js';
import {applyRepairs,profileColumn} from './column-profile.js';
import {issueFacts,tableIssues} from './data-issues.js';
import {declaredWide,tableReceipt,wideDataTable} from './data-table.js';
import {shareAlike} from './input-provenance.js';
import {BORDER_TOLERANCE_M,sharedBorder} from './line-layer.js';
import {mapImage,mapImageReceipt} from './map-image.js';
import {applyMerges,applyNames,clipToBox,polygonLayer,polygonLayerFacts} from './polygon-layer.js';
import type {AreaValue,DisplayValue,Receipt} from './results.js';
import {geometryBounds,studyAreaN3} from './study-area.js';
import {tablePoints,tablePointsFacts,tablePointsSentence} from './table-points.js';
import type {StepContext} from './core.js';
import {NS,nodeInputs} from './core.js';

export async function runPointInput(ctx:StepContext<'point_input'>):Promise<unknown>{
  const {inputs,node,receipts,runId,workflow}=ctx;
  let value:unknown;
  // Repairs are applied to a COPY, here, on the way out. What this node holds is what the
  // file held; what it hands on is what the practitioner declared it should be read as.
  // 2026-10-16: "there is always an option to use a copy, not the original."
  // FROM A TABLE A WORKFLOW COMPUTED, where one is connected: geopandas' points_from_xy, diagnosing rather than
  // refusing a row it cannot place. Experiment 178.
  const table=(inputs as unknown as {records?:import('./data-table.js').DataTable}).records;
  if(table&&table.kind!=='data-table')throw new Error('Connect a table: these points are read from its columns.');
  if(table&&!node.params.fromTable)throw new Error('A table is connected. Choose its x (longitude) and y (latitude) columns.');
  const mapping=table?node.params.fromTable:undefined;
  const read=table&&mapping?tablePoints(table,mapping):null;
  // VALUES EDITED BY HAND, after the repairs, on a copy (experiment 214).
  const editLog=node.params.edits??[],edited=applyFeatureEdits(applyRepairs(read?read.points.features:node.params.data.features??[],node.params.repairs??[]),editsAt(editLog));
  const emitted=edited.features;
  const tableEdge=workflow.edges.find(e=>e.to===node.id&&e.port==='records');
  value={...node.params.data,features:emitted,sourceNodeId:node.id,sourceKind:'input-points',
    sourceInfo:read?{format:'table',from:tableEdge?.from??''}:structuredClone(node.params.sourceInfo),
    spatialReference:structuredClone(node.params.spatialReference),
    ...(read&&mapping?{sentence:tablePointsSentence(read,mapping)}:{}),
    // WHICH COLUMN THE IDS CAME FROM, so a step that writes a table of these points can name its id column as the
    // source table does and be related back to it on that column (2026-11-05, experiment 179).
    ...(read&&mapping?.id?{idColumn:mapping.id}:{})};
  if(read&&mapping&&tableEdge){
    const facts=tablePointsFacts(`<urn:fieldwork:run:${runId}:output:${node.id}>`,
      `<urn:fieldwork:run:${runId}:output:${tableEdge.from}>`,mapping,read);
    receipts.push({nodeId:node.id,kind:'computation',facts,rules:'',input:facts,conclusions:[],
      method:tablePointsSentence(read,mapping)} as unknown as Receipt);
  }
  if(editLog.length){
    const facts=editsFacts(`<urn:fieldwork:run:${runId}:output:${node.id}>`,edited,editLog.length);
    receipts.push({nodeId:node.id,kind:'computation',facts,rules:'',input:facts,conclusions:[],method:editsSentence(edited,editLog.length).trim()} as unknown as Receipt);
  }
  // A repaired column is stated in the evidence. The records this node emits are no longer
  // the records the file held, and a reader has to be able to learn that from the run
  // rather than from having been present when somebody pressed the button. Experiment 117.
  const repairs=node.params.repairs??[];
  if(repairs.length){
    const entity=`<urn:fieldwork:run:${runId}:output:${node.id}>`;
    const quote=(v:string)=>JSON.stringify(v);
    const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
      +`@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
      // prov:qualifiedRevision, because a repair IS a revision: the records handed on are
      // a revision of the records held. DQV has no term for repair, so this is PROV's.
      +repairs.map(r=>`${entity} prov:qualifiedRevision [ a fw:ColumnRepair; `
        +`fw:boundAttribute ${quote(r.column)}; fw:repairedAs ${quote(r.to)}; `
        +`fw:repairedRecordCount "${r.cast}"^^xsd:integer; `
        +`fw:unrepairedRecordCount "${r.unreadable.length}"^^xsd:integer`
        +(r.unreadable.length?`; fw:unrepairedExample ${r.unreadable.slice(0,3).map(quote).join(', ')}`:'')
        +`; fw:repairedAt ${quote(r.at)} ].`).join('\n')+'\n';
    receipts.push({nodeId:node.id,kind:'computation',facts,rules:'',input:facts,conclusions:[],
      method:repairs.map(r=>`${r.column}: ${r.cast} value${r.cast===1?'':'s'} read as ${r.to}s at a practitioner's request`
        +(r.unreadable.length?`, ${r.unreadable.length} left unreadable`:'')+'.').join(' ')
        +' The source file is unchanged; these records are not the records it held.'});
  }
  return value;
}

export async function runPolygonInput(ctx:StepContext<'polygon_input'>):Promise<unknown>{
  const {inputs,node,receipts,runId,workflow}=ctx;
  let value:unknown;
  // READ AS PUBLISHED. The features were parsed and refused at import; this emits them as the
  // `polygons` value the seven existing consumers already accept, which is why the widget
  // needed no new port type.
  // THE CONNECTED STUDY AREAS' PARTS, where that is the source: read from the areas, not from a file.
  const fromAreas=node.params.inputMethod==='areas'?(()=>{
    const ports=nodeInputs(node).map(([port])=>port);
    const connected=ports.flatMap(port=>{const value=(inputs as unknown as Record<string,AreaValue|undefined>)[port];if(!value?.boundary)return [];
      const from=workflow.nodes.find(x=>x.id===workflow.edges.find(e=>e.to===node.id&&e.port===port)?.from);
      const boundaryID=from?.type==='study_area'?from.params.boundary?.boundaryID:undefined;
      return [{value,...(boundaryID?{boundaryID}:{})}];});
    if(!connected.length)throw new Error(`Connect a study area to "${node.params.label||node.id}": its parts are the layer.`);
    return areaParts(connected);})():undefined;
  const imported=fromAreas?fromAreas.features as typeof node.params.data.features:node.params.data.features;
  if(!imported.length)throw new Error('Import a polygon layer before running.');
  // WHAT THE PRACTITIONER SET ASIDE IN THE FEATURE VIEWER. A read of Greater London's water
  // areas returns 606 features where two are wanted, and the way to find those two is to
  // look at them -- so they are hidden by id here rather than filtered by a predicate typed
  // before anything had been seen. The read is untouched and repeatable; this is what the
  // layer carries.
  // NAMED, THEN MERGED, THEN SET ASIDE, THEN CUT -- in that order and for that reason. A
  // name is given to a feature as it was read, so it survives a merge; a merge keeps its
  // group's first name; what is set aside is set aside by the id it was read under; and
  // the cut is last because it changes geometry and nothing after it decides anything.
  const named=applyNames(imported,node.params.names);
  const merged=applyMerges(named,node.params.merges);
  const setAside=new Set(node.params.hidden||[]);
  const features=setAside.size?merged.filter(f=>!setAside.has(String(f.id))):merged;
  if(!features.length)throw new Error(`Every feature in "${node.params.label||node.id}" is `
    +'set aside, so this layer holds nothing. In Configure…, tick at least one.');
  // CUT TO THE FRAME THE READ USED, where the practitioner asked for it. The same
  // `clipToBox` the viewer previews with, so what was on screen before Apply is what the
  // layer carries. Applied here rather than baked into the stored features: the read stays
  // untouched and reversible, and the cut is a choice the receipt records.
  const frame=node.params.clipToBox?node.params.retrieval?.bbox:undefined;
  const shown=frame?clipToBox(features,frame):features;
  if(frame&&!shown.length)throw new Error(`Nothing in "${node.params.label||node.id}" falls `
    +'inside the box it was read for, so clipping to it leaves an empty layer.');
  // A LAYER READ FOR ONE STUDY AREA IS STALE FOR ANOTHER, and this is the one thing the
  // optional `area` port is checked for at run time. Acquisition happens at import, so a
  // study area nudged afterwards leaves a layer that provably holds no features for part of
  // it. Refused rather than noted: the alternative is a map with a hole in it and a receipt
  // that reads as if everything were read.
  const read=node.params.retrieval;
  const scope=inputs.area as {bounds?:[number,number,number,number]}|undefined;
  if(read&&scope?.bounds){
    const [w,s,e,n]=scope.bounds,[rw,rs,re,rn]=read.bbox;
    if(w<rw||s<rs||e>re||n>rn)
      throw new Error('This layer was read for a different study area. Its box covers '
        +`${rw.toFixed(4)}, ${rs.toFixed(4)} to ${re.toFixed(4)}, ${rn.toFixed(4)} and the `
        +`area now reaches ${w.toFixed(4)}, ${s.toFixed(4)} to ${e.toFixed(4)}, `
        +`${n.toFixed(4)}, so part of it has no features because none were read there. `
        +'Read the extract again.');
  }
  // THE LAYER IS CALLED WHAT THE NODE IS CALLED, unless it was given a name of its own.
  // Without this a collected layer reached `stack_polygons` anonymous and came out as
  // "Layer 1" and "Layer 2", so a map carrying the sub-districts and the Thames offered a
  // reader two toggles named after nothing. The words on the canvas are the words the
  // practitioner already chose.
  value=polygonLayer(shown,{...node.params,...(fromAreas?{nameField:'name',fromStudyAreas:true}:{}),
    layerName:node.params.layerName||node.params.label}) as unknown as DisplayValue;
  // AREAS AT DIFFERENT LEVELS, said: a count compares only like units; a rate across the border still does.
  if(fromAreas)(value as unknown as {notes?:string[]}).notes=[
    `${shown.length} part${shown.length===1?'':'s'} of the connected study areas, at ${fromAreas.levels.join(', ')}.`,
    ...(fromAreas.levels.length>1?[`The parts are at different levels: a count compares only units at one level; a rate compares across them.`]:[])];
  const {facts,vertices}=polygonLayerFacts(shown,node.params,{runId,nodeId:node.id});
  // SAID IN THE RECEIPT, because a layer of two drawn from a read of 606 is a choice a
  // reader of the evidence has to be able to see.
  const kept=setAside.size
    ?`<urn:fieldwork:run:${runId}:${node.id}> fw:featuresSetAside ${setAside.size}; `
      +`fw:featuresRead ${imported.length}.\n`
    :'';
  const cutFacts=frame
    ?`<urn:fieldwork:run:${runId}:${node.id}> fw:clippedToReadBox true; `
      +`fw:featuresAfterClip ${shown.length}.\n`
    :'';
  receipts.push({nodeId:node.id,kind:'computation',facts:facts+kept+cutFacts,rules:'',
    input:facts+kept+cutFacts,conclusions:[],
    method:fromAreas
      ? `${features.length} part${features.length===1?'':'s'} of the connected study areas (${fromAreas.levels.join(', ')}), `
        +`${vertices.toLocaleString()} vertices, each with its name, geoBoundaries ID, country and level`
    :read
      ? `${features.length} ${read.kinds.join(' and ')} feature`
        +`${features.length===1?'':'s'} read from ${node.params.source?.filename
          ??'a published OpenStreetMap extract'} within `
        +`${read.bbox.map(c=>c.toFixed(4)).join(', ')}, ${vertices.toLocaleString()} `
        +'vertices, nothing clipped, simplified or reprojected'
        +(read.dropped.belowMinVertices
          ?`; ${read.dropped.belowMinVertices.toLocaleString()} below `
            +`${node.params.minVertices} vertices and `
            +`${read.dropped.outsideBox.toLocaleString()} outside the box were not read`
          :`; ${read.dropped.outsideBox.toLocaleString()} outside the box were not read`)
        +`. ${read.attribution}, ${read.licence}`
        +(shareAlike(node.params.provenance)?' — share-alike: a figure built on this '
          +'carries the same terms.':'.')
      : `${features.length} polygon feature${features.length===1?'':'s'} read from `
        +`${node.params.source?.filename??'a file'} as published, ${vertices.toLocaleString()} `
        +'vertices, nothing clipped, simplified or reprojected'
        +(node.params.nameField?`, named by ${node.params.nameField}`:'')+'.'});
  return value;
}

export async function runLineInput(ctx:StepContext<'line_input'>):Promise<unknown>{
  const {inputs,node}=ctx;
  let value:unknown;
  if(node.params.inputMethod==='border'){
    const a=inputs.area as AreaValue|undefined,b=(inputs as unknown as {area_2?:AreaValue}).area_2;
    if(!a?.boundary||!b?.boundary)throw new Error(`Connect two study areas to "${node.params.label}": its border is where they meet.`);
    const tolerance=node.params.toleranceM??BORDER_TOLERANCE_M,stretches=sharedBorder(a.boundary,b.boundary,tolerance);
    if(!stretches.length)throw new Error(`${a.label} and ${b.label} do not meet: no stretch of ${a.label}'s outline lies within ${tolerance.toLocaleString('en')} m of ${b.label}'s.`);
    value={kind:'lines',source:`The border of ${a.label} and ${b.label}, within ${tolerance.toLocaleString('en')} m`,
      features:stretches.map((coordinates,i)=>({type:'Feature',id:`border-${i+1}`,
        properties:{name:stretches.length===1?`${a.label} and ${b.label}`:`${a.label} and ${b.label}, ${i+1} of ${stretches.length}`},
        geometry:{type:'LineString',coordinates}}))} as unknown as DisplayValue;
  }else{
    // THE REFUSAL MATCHES THE METHOD (2026-11-24). A layer set to be DRAWN was told to read a file, which is
    // advice for a different setting and sends the reader to a control the dialog is not showing them.
    if(!node.params.data?.features?.length)throw new Error(node.params.inputMethod==='drawn'
      ?`Draw at least one route or flow into "${node.params.label}" before running: click the map in Configure…, then Finish the line.`
      :`Read a file of lines into "${node.params.label}" before running: a GPX, KML, KMZ or GeoJSON file, in Configure….`);
    value=structuredClone(node.params.data) as unknown as DisplayValue;
  }
  return value;
}

// THE MELT IS A STEP OF THE RUN when the node carries the file as published.
//
// A table read from a wide file used to be melted once, in the import dialog, and only the
// result was kept. That made the conversion invisible: nothing downstream could say which
// columns had been taken, and a worked example shipped a table nobody could trace to the
// figures it came from -- "prepared outside the application", as the 0.12.0 notes put it
// about this very example. Converting here puts it in the run, where `tableReceipt`
// already asserts what was read and how.
export async function runMapImageInput(ctx:StepContext<'map_image_input'>):Promise<unknown>{
  const {node,receipts,runId}=ctx;
  let value:unknown;
  const image=mapImage(node);
  value=image as unknown as DisplayValue;
  receipts.push(mapImageReceipt(node,image,runId));return value;
}

export async function runTableInput(ctx:StepContext<'table_input'>):Promise<unknown>{
  const {node,receipts,runId}=ctx;
  let value:unknown;
  const p=node.params;
  const unedited=p.convertOnRun&&p.sourceTable&&p.wide
    ?wideDataTable(p.sourceTable,{...p.wide,valueField:p.valueField,primaryKey:p.data.primaryKey,secondaryKeys:p.data.secondaryKeys,...(p.unit?{unit:p.unit}:{})})
    :p.data;
  // VALUES EDITED BY HAND, on a copy (experiment 214).
  const tableLog=p.edits??[],editedTable=applyTableEdits(unedited,editsAt(tableLog)),table=editedTable.table;
  if(!table.rows.length&&p.remote)throw new Error(`This table is fetched from ${p.remote.url} and its rows are not kept `
    +'in the project. Select the node and choose Fetch the table.');
  if(!table.rows.length)throw new Error(p.convertOnRun
    ?'This step converts its source table on each run, and that source is empty.'
    :'Import a table before running.');
  // WHAT THE COLUMNS MEAN TRAVELS WITH THE TABLE, so every step after it can say it; and the receipt records the
  // declarations this run used (experiment 172).
  // A WIDE IMPORT SAYS SO on the table it makes, so rules can read its subjects as the file had them (188).
  const declared=declaredWide(table,p.wide);
  const described=p.columns&&Object.keys(p.columns).length?{...declared,columns:p.columns}:declared;
  const imported=tableReceipt(node,described,runId);
  value={...imported.value,...(described.columns?{columns:described.columns}:{})} as unknown as DisplayValue;
  // WHAT THE DATA QUALITY INSPECTOR SHOWS, IN THE RECEIPT (experiment 207): its findings and each column's profile,
  // as data issues. The kinds a step downstream declares are the inspector's to show; here the table's own.
  const rowsRead=described.rows.map(r=>({...r.key,[described.valueField]:r.value}));
  const kinds=Object.fromEntries([...Object.keys(described.numericKeys??{}),described.valueField].map(c=>[c,'number' as const]));
  const issues=tableIssues([...(described.findings??[]),...metadataFindings(described,p.columns,p.dictionaryCheck,p.wide)],
    [...described.keys,described.valueField],rowsRead,(column,values)=>profileColumn(column,values,kinds[column],scalesOf(p.columns)[column]));
  // About the table this step brought in: its output, which every step after it names, and which is its table.
  const output=`<urn:fieldwork:run:${runId}:output:${node.id}>`;
  const found=`${output} <http://www.w3.org/ns/prov#alternateOf> <urn:fieldwork:run:${runId}:table:${node.id}>.\n`
    +issueFacts(`<urn:fieldwork:run:${runId}:tableinput:${node.id}>`,output,`urn:fieldwork:run:${runId}:tableinput:${node.id}`,issues);
  receipts.push({...imported.receipt,facts:imported.receipt.facts+found,input:imported.receipt.input+found,
    ...(described.columns?{columns:described.columns}:{})} as Receipt);
  if(tableLog.length){
    const facts=editsFacts(output,editedTable,tableLog.length);
    receipts.push({nodeId:node.id,kind:'computation',facts,rules:'',input:facts,conclusions:[],method:editsSentence(editedTable,tableLog.length).trim()} as unknown as Receipt);
  }
  return value;
}

export async function runStudyArea(ctx:StepContext<'study_area'>):Promise<unknown>{
  const {node,reasoner,receipts}=ctx;
  let value:unknown;
  if(node.params.source!=='drawn')throw new Error('This study area names a dataset rather than drawing or acquiring its outline. That form was Old Naledi\'s and retired with it on 2026-11-11; draw the area, or pick administrative units.');
  const n3=studyAreaN3(node),conclusions=await reasoner(n3.input);
  const ready=conclusions.some(q=>q.subject===`urn:fieldwork:area:${node.id}`&&q.predicate===NS+'readyForSpatialAnalysis'&&q.object==='true');
  if(!ready)throw new Error('The reasoner did not confirm the study-area input contract.');
  receipts.push({nodeId:node.id,...n3,conclusions});
  value={kind:'study-area',areaId:`urn:fieldwork:area:${node.id}`,geometryId:`urn:fieldwork:geometry:${node.id}`,boundary:structuredClone(node.params.geometry),...(node.params.countryOutline?{contextOutline:structuredClone(node.params.countryOutline.geometry)}:{}),...(node.params.boundary?.units?.length?{units:structuredClone(node.params.boundary.units)}:{}),bounds:geometryBounds(node.params.geometry!),label:node.params.label,selectionMode:node.params.selectionMode,ready,rows:[],centers:[],source:'User-drawn geometry in CRS84'};return value;
}
