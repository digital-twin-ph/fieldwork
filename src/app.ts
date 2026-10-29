import {diveDeeperPanel,learnBlock} from './dive-deeper.js';
import {recordRun,runsFor} from './widget-usage.js';
import {buildOrder,revealedTypes,revealReason} from './reveal-playback.js';
import {manualButton,openManual,hasManual} from './manual.js';
﻿import widgetRegistry from '../widgets/registry.json';
import {canvasN3} from './canvas-semantics.js';
import appPackage from '../package.json';
import {networkDownloadStatus} from './network-throttle.js';
import {importNetwork} from './street-network.js';
import {downloadOSMInTiles} from './network-tiles.js';
import {johnSnowExample,snowExtentExample} from './john-snow.js';
import {geoprivacyExample} from './geoprivacy-example.js';
import {pointComparisonMarkup} from './point-comparison-ui.js';
import {CATCHMENT_TYPES,defaultTravelMode} from './catchments.js';
import {catchmentInspector} from './catchment-ui.js';
import {mountCatchmentMap,basemapOptions,BASEMAP_OPTIONS} from './catchment-map.js';
import {catchmentPlot,polygonSvg,catchmentFrame,polygonFrame} from './catchment-output.js';
import {mapPresentation,standaloneMapSvg} from './map-communication.js';
import {metresPerPixel} from './presentation.js';
import {RATE_TABLE_KEYS} from './rate.js';
import {SERIES_TABLE_KEYS} from './case-series.js';
import {SITE_ASSIGNMENT_TABLE_KEYS} from './sea-level.js';
import {installCredentials} from './credentials-ui.js';
import type {CredentialAccess} from './credentials-ui.js';
import {addableTypes,PALETTE_GROUPS,ADDABLE_VIA_COMPOSITION,ADDABLE_VIA_RULESET} from './palette.js';
import {MARK_RADIUS_MIN,MARK_RADIUS_MAX} from './presentation.js';
import {compositionEntry,explodeMicroWorkflow,detectDrift} from './compositions.js';
import {tidyLayout,alreadyTidy} from './layout.js';
import {bundledCompositions,resolveComposition} from './composition-registry.js';
import {OVERTURE_DEFAULT_CONFIDENCE} from './overture-places.js';
import {seaLevelExample} from './sea-level-example.js';
import {rulesetExample} from './ruleset-example.js';
import {hagellochExample} from './hagelloch-example.js';
import {openRuleEditor} from './rule-editor.js';
import {openTableViewer,tableViewOf} from './table-viewer.js';
import {openRelateJoin} from './relate-ui.js';
import {relateShape} from './relate-table.js';
import {wideDataTable} from './data-table.js';
import {castColumn,applyRepairs} from './column-profile.js';
import {openDataQuality} from './data-quality-ui.js';
import {settingNamed} from './authored-rules.js';
import {FACILITY_SOURCES,FACILITY_SOURCE_KEYS,FACILITY_KINDS,downloadFacilities,requireRunnableFindHealthFacilities} from './health-facilities.js';

import {evidenceInspector,openEvidenceEditor} from './evidence-ui.js';
import {workflowDocument,importWorkflowDocument,exportEvidenceFiles} from './evidence-storage.js';
import {curatedExamples,exampleById,verifiedFile,type CatalogExample} from './example-catalog.js';
import {saveRefusalMessage} from './save-refusal.js';
import {MAX_BUNDLE_BYTES} from './evidence.js';
import type {Workflow,WorkflowNode,NodeType,NodeSpec,Boundary,Position,SpatialRelation,ParamsByType,ColumnRepair,BasemapChoice} from './types.js';
import type {WorkflowRun,Receipt,Output,MapRow,PointRow,CoverageRow,CoverageValue,TableValue} from './results.js';
import type {CanvasAPI,NodeDescription} from './canvas.js';
import type {Connection,Edge} from '@xyflow/react';
import type {ReasonerQuad,ReasoningRequest,ReasoningResponse} from './worker-types.js';
import {element as $,optionalElement,control} from './dom.js';
import {errorMessage,isRecord,required} from './guards.js';
import {resolveRuleset,bundledRulesets,supersession} from './rulesets.js';
import type {Ruleset} from './rulesets.js';
import {OPERATORS} from './derive-value.js';
import {pinnedRuleset} from './rule-application.js';
function getNode<K extends NodeType>(w:Workflow,id:string,type:K):WorkflowNode<K>{const node=required(w.nodes.find(n=>n.id===id));if(node.type!==type)throw new Error('Node type changed while editing');return node as WorkflowNode<K>;}
function updateParam(w:Workflow,id:string,key:string,value:unknown){Object.assign(required(w.nodes.find(n=>n.id===id)).params,{[key]:value});}
function replaceWorkflow(w:Workflow,next:Workflow){for(const key of Object.keys(w))Reflect.deleteProperty(w,key);Object.assign(w,next);}
import {TYPES,exampleWorkflow,validateWorkflow,validateGeoJSON,executionPlan,executeWorkflow,nodeInputs,outputOf,shownMode,portSourceName,IncompleteWorkflow} from './core.js';
import {suggestUTM,utmScaleFactor,workflowPositions} from './utm.js';
import {mountCanvas} from './canvas.js';
import {DATASET,OLD_TYPES,oldNalediWorkflow,tierLabel} from './old-naledi.js';
import {oldInspector,oldEvidence,resultTable,oldMap,mapFrame,distanceText} from './old-naledi-ui.js';
import {mapLayerList,membersOfPolygons,LAYER_LABEL_LIMIT,type MapLayer} from './map-layer-list.js';
import {openPolygonReview} from './polygon-review.js';

/** A polygon layer's chosen file, waiting for Apply. Keyed by node, outside the DOM, because the
 *  Inspector re-renders on every setting change. */
const pendingPolygonFiles=new Map<string,File>();
import {LAYER_SHAPES,resolveLayerSymbol,markPath,type LayerShape} from './presentation.js';
import {isPointPort} from './point-layers.js';
import {EXAMPLE_TEMPLATES,hasExampleTemplate,EXAMPLE_KEYS,WORKED_EXAMPLE_KEYS} from './example-templates.js';
import {templateFrom} from './workflow-template.js';
import {pairSignature} from './deduplicate-points.js';
import {openDeduplicateReview} from './deduplicate-ui.js';
import {blankWorkflow,newStudyArea,studyAreaN3,quadToN3,areaSvg,validateDrawnGeometry,geometryBounds,storageRefusal,STORAGE_QUOTA_BYTES} from './study-area.js';
import {loadPayloads,putPayload,dropPayload,cachedPayload,cachedPayloads,payloadStoreKind,payloadBytes,onStoreDegraded} from './payload-store.js';
import {openStudyAreaEditor} from './study-area-map.js';
import {newAreaMeasurement,areaUnitOptions,formatArea,AREA_UNITS} from './area-measurement.js';
import {newObservations,relationLabel} from './spatial-coverage.js';
import {openInputDataEditor} from './input-data-ui.js';
import {boundary as oldNalediBoundary} from '../examples/old-naledi/data.js';
import {chartMarkup} from './chart-output.js';
import {chartOrientation,chartRenderer} from './chart-vega.js';
import {standaloneChartSvg} from './chart-figure.js';
import {networkPreviewSvg,networkCoverage,networkPreviewCaption} from './network-preview.js';
import {chartVegaSpec,renderVegaChart,disposeVegaChart} from './chart-vega.js';
import {openRasterEditor,rasterSvg,rasterFrame,downloadRaster} from './raster-ui.js';
import {TILE_PROVIDERS,basemapImages,fetchTileAsDataURI,useTileStore} from './basemap-tiles.js';
import {rasteriseFigure,FIGURE_PIXEL_SCALE} from './figure-export.js';
import {COUNTRIES,countryName,iso3Of,countryOfArea} from './boundary-source.js';
import {populationRastersForCountry,WORLDPOP_LICENCE,WORLDPOP_TAKEN,WORLDPOP_BYTES_PER_SECOND,downloadWait} from './worldpop-catalogue.js';
import type {BoundaryProvenance} from './types.js';
import {basemapAvailable,extentSpanKm,NATURAL_EARTH_MIN_SPAN_KM} from './basemaps.js';
import {naturalEarthMarkup,NATURAL_EARTH,NATURAL_EARTH_CREDIT} from './natural-earth.js';
import {mapImage,mapImageMarkup,mapImageCredit,type MapImage} from './map-image.js';
import {mapImageInspector} from './map-image-ui.js';
import {readWorldFile,boundsFromWorldFile} from './map-image.js';

/** A georeferenced plate's chosen files, waiting for Apply. Same reason as the polygon layer's:
 *  the Inspector re-renders on every setting change and a file input cannot carry a selection
 *  across that. */
const pendingPlateFiles=new Map<string,{image?:File;world?:File}>();
import {openTableEditor,dataTableMarkup} from './data-table-ui.js';
import {openCatalogDialog,identityMarkup} from './catalog-ui.js';
import {initTheme,applyTheme,saveThemePreference,isThemePreference} from './theme.js';
import {previewArea,prepareRasterPreview,rasterOfNode} from './raster-preview.js';
import {polygonInputInspector} from './polygon-input-ui.js';
import {areasInWorker,retrievalProvenance,readBox,AREA_KINDS,type AreaKind} from './osm-areas.js';
import {readPolygonFeatures} from './polygon-layer.js';
import {contentHash} from './project-files.js';
import {projectDocument,readProjectDocument,unbundledReferences,PROJECT_DOCUMENT_SCHEMA} from './project-document.js';
import {rasterExample} from './raster-example.js';
import {openPackageDialog} from './package-ui.js';
import {syncProjectManifest} from './project-manifest.js';
import {BUILT_IN_PROJECTS,WORKFLOW_LABELS,projectOfWorkflow,newProject,validateProject,siblingInputs,payloadDigest,dehydrateWorkflow,hydrateWorkflow,projectSafety,unexportedWork,exportPredatesWork,type Project,type ProjectWork} from './project.js';
import {mountPanelLayout} from './panel-layout.js';
import {newMapOutput,mapEvidence} from './map-output.js';
import {newTableOutput,pointTableMarkup,pointTableEvidence} from './table-output.js';
import {pointPort,MAX_POINT_LAYERS} from './point-layers.js';
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function chartControls(n:WorkflowNode<'chart_output'>,options:{omitOrientation?:boolean}={}){
  const p=n.params;
  return `<div class="field"><label class="field-label" for="chart-renderer">Chart enhancement</label><select id="chart-renderer"><option value="html" ${chartRenderer(p)!=='vega-lite'?'selected':''}>Classic bars</option><option value="vega-lite" ${p.renderer==='vega-lite'?'selected':''}>Vega-Lite (experimental)</option></select></div>`+
    (chartRenderer(p)==='vega-lite'?`<label class="field-label" for="chart-mark">Mark</label><select id="chart-mark"><option value="bar" ${p.mark!=='point'?'selected':''}>Bars</option><option value="point" ${p.mark==='point'?'selected':''}>Dots</option></select>
    ${options.omitOrientation?'':`<label class="field-label" for="chart-orientation">Orientation</label><select id="chart-orientation"><option value="horizontal" ${p.orientation!=='vertical'?'selected':''}>Horizontal</option><option value="vertical" ${p.orientation==='vertical'?'selected':''}>Vertical</option></select>`}
    <label class="field-label" for="chart-title">Chart title</label><input id="chart-title" maxlength="120" value="${esc(p.chartTitle||'')}" placeholder="Default: result caption">
    <label class="field-label" for="chart-subtitle">Subtitle / context</label><input id="chart-subtitle" maxlength="280" value="${esc(p.subtitle||'')}" placeholder="Optional context or limitation">
    <label class="field-label" for="chart-x-axis">Horizontal axis label</label><input id="chart-x-axis" maxlength="80" value="${esc(p.xAxisTitle||'')}" placeholder="Default from data">
    <label class="field-label" for="chart-y-axis">Vertical axis label</label><input id="chart-y-axis" maxlength="80" value="${esc(p.yAxisTitle||'')}" placeholder="Default from data">
    <label><input id="chart-legend" type="checkbox" ${p.colorByCategory?'checked':''}> Color categories and show legend</label>
    <label class="field-label" for="chart-source-note">Source / method note</label><textarea id="chart-source-note" maxlength="500" rows="2" placeholder="Default: connected result and run">${esc(p.sourceNote||'')}</textarea>
    <p class="description">The title, note, axes and legend travel with the SVG. Both renderers use the same recorded values. Add a Method reference for supporting research.</p>`:'');
}
function mapControls(n:WorkflowNode<'map_output'>){
  const p=n.params;
  return `<div class="source-card" data-map-communication><span class="inspector-section">Standalone map</span>
    <label class="field-label" for="map-title">Map title</label><input id="map-title" maxlength="120" value="${esc(p.mapTitle||'')}" placeholder="Default: results tab name">
    <label class="field-label" for="map-subtitle">Subtitle / context</label><input id="map-subtitle" maxlength="280" value="${esc(p.mapSubtitle||'')}" placeholder="Optional scope or limitation">
    <label><input id="map-legend-toggle" type="checkbox" ${p.showLegend!==false?'checked':''}> Show map key</label>
    <label><input id="map-halo-toggle" type="checkbox" ${p.markHalo!==false?'checked':''}> Dark outline on point symbols</label>
    <label class="field-label" for="map-source-note">Source / method note</label><textarea id="map-source-note" maxlength="500" rows="3" placeholder="Default: connected source labels and method">${esc(p.mapSourceNote||'')}</textarea>
    <label class="field-label" for="map-basemap">Basemap</label><select id="map-basemap">${basemapOptions(p.basemap,p.presentation==='interactive'?'interactive':'plot',workflowSpanKm())}</select>
    <p class="description">A basemap is layer 0, under everything the workflow produced.${p.presentation==='interactive'?'':' OpenStreetMap and OpenTopoMap are drawn into the figure itself. The OpenFreeMap styles are vector, so they move this map to the interactive presentation.'}</p>
    <p class="description">Title, key and note appear with the map and in its local SVG export. Interactive maps export connected data as a static plot; online basemap tiles are excluded. Selecting an online basemap sends the viewed area to its provider.</p></div>`;
}
const KEY='fieldwork-workflow-v1';
$('#app-version').textContent=`v${appPackage.version}`;

/** `?reset-cache=1` — throw away every cached copy of this application and reload.
 *
 *  A service worker that has cached a build serves it until something replaces it, and the
 *  remedies for that are all developer tools: a hard reload, unregistering the worker, clearing
 *  site data. A practitioner reading this page in an embedded browser -- VS Code's Simple
 *  Browser, a preview pane, a kiosk -- has none of those, and no way to tell that what they are
 *  looking at is a build from last week. The practitioner, 2026-10-15, on exactly that: "This is
 *  the in-VSCode Browser viewing local static page and still shows 0.7.0", with the files on disk
 *  at 0.8.1.
 *
 *  So the escape hatch is a URL. It unregisters every worker for this origin, deletes every cache
 *  it owns, and reloads with a one-time cache-busting parameter so the HTTP cache cannot answer
 *  either. The saved workspaces are in localStorage and are deliberately untouched: this clears
 *  the APPLICATION, not the practitioner's work.
 *
 *  One exception, added 2026-10-19: the OSM response cache (`fieldwork-osm-v1`) is a cache and
 *  goes with the rest. Losing it costs a request, not a result -- the saved graph lives in the
 *  workflow, not here -- so it is re-fetchable by definition. Named because it is the one thing
 *  cleared here that a practitioner paid a public service for.
 */
/** A WAY BACK IN WHEN WHAT IS STORED IS WHAT BREAKS IT.
 *
 *  The practitioner, 2026-10-22, after downloading a province: *"I need to clean up Chrome
 *  because it won't allow me to load FW. Is there a way to load it with a cleanup URL?"* There
 *  was not. `reset-cache` unregisters the service worker and clears the HTTP caches, which is a
 *  different problem: the graph that will not load is in IndexedDB, and clearing it meant going
 *  to Chrome's own settings and deleting everything this application had ever saved.
 *
 *  Both run before anything is restored, so a workflow too large to open cannot stop the thing
 *  that would let go of it.
 *
 *  `?forget-datasets` drops the payload store -- the networks and rasters -- and keeps the
 *  projects and workflows, which then read "0 nodes" and can be downloaded again. That is almost
 *  always the one wanted: the workflow is the work, and the graph can be fetched twice.
 *
 *  `?forget-everything` clears this application's localStorage as well, which is every project,
 *  workflow and setting on this device. It says so and asks first, because nothing here is
 *  recoverable and an export is the only copy. */
const forgetting=new URLSearchParams(location.search);
if(forgetting.has('forget-datasets')||forgetting.has('forget-everything')){
  const everything=forgetting.has('forget-everything');
  (async()=>{
    if(everything&&!confirm('Delete every project, workflow and setting saved on this device? '
      +'This cannot be undone, and an exported file is the only copy. '
      +'To keep your workflows and drop only the downloaded data, use ?forget-datasets instead.')){
      location.replace(location.pathname);return;
    }
    try{
      await new Promise(resolve=>{
        const request=indexedDB.deleteDatabase('fieldwork');
        request.onsuccess=request.onerror=request.onblocked=()=>resolve(null);
      });
      localStorage.removeItem('fieldwork-datasets-v1');
      if(everything)for(const key of Object.keys(localStorage))
        if(key.startsWith('fieldwork'))localStorage.removeItem(key);
    }catch{/* a store that refuses to be opened cannot hold the reload below */}
    location.replace(location.pathname);
  })();
}else if(new URLSearchParams(location.search).has('reset-cache')){
  (async()=>{
    try{
      const registrations=await navigator.serviceWorker?.getRegistrations?.()??[];
      await Promise.all(registrations.map(registration=>registration.unregister()));
      const keys=await caches?.keys?.()??[];
      await Promise.all(keys.map(key=>caches.delete(key)));
    }catch{/* a browser that refuses either one still gets the reload below */}
    const url=new URL(location.href);
    url.searchParams.delete('reset-cache');
    url.searchParams.set('cache-bust',String(Date.now()));
    location.replace(url.toString());
  })();
}
// Keep keyboard and scroll-to-element navigation clear of the floating controls.
new ResizeObserver(([entry])=>document.documentElement.style.setProperty('--project-bar-height',`${entry.target.getBoundingClientRect().height+12}px`)).observe($('.project-bar'));
const WORKSPACES='fieldwork-examples-v1';
/** Projects a practitioner created, beside the seven built in. Stored separately from the
 *  workflows themselves: a project names an investigation and lists the workflows in it, and a
 *  workflow is bytes. Losing the list should not lose the work, so they fail independently. */
const PROJECTS='fieldwork-projects-v1';
/** Payloads a project's workflows share, held once and addressed by digest.
 *
 *  Content-addressed storage, project-scoped VISIBILITY. Identical bytes are stored once wherever
 *  they came from -- that is just what a digest does -- but a workflow is only ever OFFERED the
 *  inputs of its own project's other workflows. Sharing storage is a byte fact; sharing visibility
 *  is a claim about which investigation data belongs to, and only the second is scoped. */
const readDatasets=():Record<string,unknown>=>cachedPayloads();
/** Keep a payload where it will fit, and report whether it is kept rather than assuming it.
 *
 *  Both callers are already async -- a download and an import both await something -- so this
 *  awaits the durable write BEFORE the workflow records a reference to it. The alternative, a
 *  reference written now and a payload written later, is a workflow that reloads into a refusal. */
async function keepDataset(digest:string,payload:unknown):Promise<boolean>{
  const where=await putPayload(digest,payload);
  forgetSavedWorkflows();
  if(!where)$('#save-status').textContent='Storage unavailable — export to keep';
  return where!==null;
}
/** Every saved workflow, with shared payloads put back.
 *
 *  One reader for the three callers that need saved workflows -- loading one, listing them in the
 *  picker, and offering a sibling's inputs -- so hydration cannot be remembered in two of them and
 *  forgotten in the third. Payloads are shared BY REFERENCE here, which is safe because these
 *  copies are read and never edited; the workflow being edited is cloned, below. */
/** Cached, because `renderLibrary` runs on every keystroke in the node search and this parses the
 *  whole workspace map. Every write to that map goes through `save()` or `assignCurrentWorkflow`,
 *  so the cache is cleared there and nowhere else needs to know it exists. */
let savedWorkflowCache:Record<string,unknown>|null=null;
const forgetSavedWorkflows=()=>{savedWorkflowCache=null;};
function readSavedWorkflows():Record<string,unknown>{
  if(savedWorkflowCache)return savedWorkflowCache;
  let saved:Record<string,unknown>={};
  try{const raw=JSON.parse(localStorage.getItem(WORKSPACES)||'{}');if(isRecord(raw))saved=raw;}catch{return {};}
  const datasets=readDatasets();
  const hydrated:Record<string,unknown>={};
  for(const [key,value] of Object.entries(saved)){
    try{hydrated[key]=hydrateWorkflow(value,datasets);}
    catch{/* a workflow whose shared data is gone is left as stored; opening it reports why */}
  }
  savedWorkflowCache=hydrated;
  return hydrated;
}
function readProjects():Project[]{
  try{const raw=JSON.parse(localStorage.getItem(PROJECTS)||'[]');return Array.isArray(raw)?raw.flatMap(entry=>{try{return [validateProject(entry)];}catch{return [];}}):[];}
  catch{return [];}
}
const allProjects=():Project[]=>[...BUILT_IN_PROJECTS,...readProjects()];
function writeProjects(projects:Project[]):boolean{
  try{localStorage.setItem(PROJECTS,JSON.stringify(projects));return true;}
  catch{$('#save-status').textContent='Storage unavailable — export to keep';return false;}
}
// Named workspaces first, then the fallback. The fallback treats any workflow holding a study
// area as Old Naledi, which is why a new example must be listed here: the Manila sea-level
// example has an area node and was silently labelled, described and noted as Old Naledi until
// it was added. This is the "examples are the default world" problem in TODO.md, in the one
// place it is least visible.
const NAMED_WORKSPACES=['blank','coverage','raster','sea-level','rulesets','hagelloch'];
// A workflow a practitioner created is NOT an example, and the study-area fallback below would
// label it Old Naledi -- the "examples are the default world" problem, reached at last by a real
// workflow rather than by a new example. `projectId` is the discriminator: it is set only on a
// workflow that belongs to a practitioner's project, and never on a worked example.
const exampleKey=(w:Workflow):string=>w.projectId?'blank':w.exampleId?.startsWith('snow-')?w.exampleId:NAMED_WORKSPACES.includes(w.exampleId as string)?w.exampleId as string:w.exampleId==='old-naledi'||w.nodes.some(n=>n.type==='study_area')?'old-naledi':'heat';
/** Where a workflow is SAVED, as against which worked example's chrome it shows. They are the
 *  same string for all twelve examples and differ for everything a practitioner makes, whose key
 *  is minted per workflow because the example vocabulary is closed and compiled in. */
const storageKey=(w:Workflow):string=>w.workflowKey||exampleKey(w);
const template=(key:string)=>(EXAMPLE_TEMPLATES[key]||exampleWorkflow)();
const canAutoRun=(w:Workflow)=>w.nodes.length>0&&!w.nodes.some(n=>n.type==='raster_input'&&!n.params.asset||n.type==='network_input'&&!n.params.data.nodes.length||n.type==='table_input'&&!n.params.data.rows.length);
/** Why the last OSM download failed, kept until one succeeds.
 *
 *  The status line under the button reported only throttle state -- in progress, next available
 *  in N seconds, ready -- while the REASON went to a toast that clears after five seconds. So a
 *  failed download left the Inspector saying "Next OSM download available in 60 seconds", which
 *  reads as working. The practitioner, 2026-10-19, with every Overpass instance returning 502:
 *  *"OSM download did not work"* -- and nothing on screen said why, or that the service was down
 *  rather than the application. A failure that scrolls away is a failure nobody can act on. */
let networkDownloadError:string|null=null;
/** What a download is waiting on right now, so a pause the service asked for reads as a pause
 *  rather than as nothing happening. */
let networkDownloadPhase:string|null=null;
/** The last endpoint check, kept so the panel survives an Inspector redraw. Not fetched on render:
 *  a status read is a request to a free public service, and rendering is not a reason to make one. */
let endpointStatuses:import('./street-network.js').OverpassStatus[]|null=null;
let endpointsCheckedAt:string|null=null;
let credentials:CredentialAccess|null=null;
let workflow=exampleWorkflow(),selected:string|null|undefined='criteria',result:WorkflowRun|null=null,runWorkflow:Workflow|null=null,busy=false,dirty=true,runFailed=false,runIncomplete=false,statuses:Record<string,string>={},history:Workflow[]=[],future:Workflow[]=[],flow:CanvasAPI|null=null,worker:Worker|null=null,seq=0,lastNodeCount=0,importNode:string|null=null;
let toastTimer:ReturnType<typeof setTimeout>|undefined,activeOutputId:string|null=null,tablePage=0,tableAttributePage=0;
let tableSort:import('./table-output.js').TableSort|undefined;
/** The run whose comparison result may expand the results pane, consumed the first time it does. */
let lastRunMs:number|null=null;
/** Nodes that finished within the last moment, so the canvas can show it happening.
 *  A run is otherwise silent until it ends, and on a slow step there is nothing to say
 *  which widget is waiting on which. Held outside `statuses` because finishing is an
 *  event and `done` is a state: the glow is cleared on a timer, the status is not. */
const justFinished=new Set<string>();
/** Progressive reveal, played back over the example already on the canvas.
 *
 *  Null when off, otherwise how many widgets of the build order have been placed. It is a VIEW:
 *  the workflow is not edited, nothing is saved, and leaving restores the canvas as it was. The
 *  palette dims what the rule would not yet offer rather than hiding it, because a hidden widget
 *  can make a practitioner conclude the application cannot do something it can -- the asymmetry
 *  experiment 112 recorded before any of this was built. */
let playbackStep:number|null=null;
const playbackOrder=()=>buildOrder(workflow).order;
const playbackPlaced=()=>playbackStep===null?workflow.nodes:playbackOrder().slice(0,playbackStep);
/** The canvas as the playback wants it: the nodes placed so far and the edges between them.
 *
 *  Every path that draws the canvas has to go through this, not only `render`. A run's status
 *  callback used to call `flow.update(workflow, ...)` with the whole workflow on every node it
 *  finished, so a worked example that auto-runs redrew all nine nodes underneath a playback
 *  showing one. Locally the run finished before anyone clicked; in CI it did not, and the
 *  playback test failed there and nowhere else. */
const playbackView=():Workflow=>{
  if(playbackStep===null)return workflow;
  const placed=new Set(playbackPlaced().map(n=>n.id));
  return {...workflow,nodes:workflow.nodes.filter(n=>placed.has(n.id)),
    edges:workflow.edges.filter(e=>placed.has(e.from)&&placed.has(e.to))};
};
function renderPlayback(){
  $('#playback-bar').hidden=playbackStep===null;
  document.body.classList.toggle('playing-back',playbackStep!==null);
  if(playbackStep===null)return;
  const order=playbackOrder(),placed=order.slice(0,playbackStep);
  const {type,unlocked}=revealReason(placed);
  $('#playback-step').textContent=`Step ${playbackStep} of ${order.length}`;
  $('#playback-reason').textContent=!placed.length
    ?'An empty canvas offers only the widgets that need no input.'
    :unlocked.length
      ?`${placed.at(-1)!.params.label||placed.at(-1)!.type} emits ${type}, which reveals ${unlocked.length}: ${unlocked.slice(0,4).join(', ')}${unlocked.length>4?'…':''}`
      :`${placed.at(-1)!.params.label||placed.at(-1)!.type} emits ${type||'nothing'}, which reveals nothing new.`;
  ($('#playback-back') as HTMLButtonElement).disabled=playbackStep===0;
  ($('#playback-next') as HTMLButtonElement).disabled=playbackStep>=order.length;
}
function setPlayback(step:number|null){
  playbackStep=step;
  renderPlayback();renderLibrary($('#node-search').value);render();
}
const FINISH_GLOW_MS=900;
/** Durations as a practitioner reads them, not as a profiler does. */
const elapsedText=(ms:number)=>ms<1000?`${Math.round(ms)} ms`:`${(ms/1000).toFixed(ms<10000?1:0)} s`;

const activeOutput=()=>result?.outputs.find(o=>o.nodeId===activeOutputId)||result?.outputs[0];
/** The result tabs a node produced. Coverage checks make two, suffixed -table and -map, so a node
 *  can own more than one tab. */
const outputsOf=(nodeId:string|null|undefined)=>nodeId
  ?(result?.outputs??[]).filter(o=>o.nodeId===nodeId||o.nodeId.startsWith(nodeId+'-')):[];
/** Selecting an output node shows its result, so the canvas and the Results panel agree about what
 *  is being looked at. A node owning the tab already open keeps that tab rather than jumping. */
/** Marks the tabs the selected node produced. Separate from rendering the results, because
 *  selecting a node that produced none must still clear the previous marks. */
function markLinkedTabs(){
  const owned=new Set(outputsOf(selected).map(o=>o.nodeId));
  $('#result-tabs').querySelectorAll<HTMLButtonElement>('[data-output]').forEach(tab=>{
    const linked=owned.has(required(tab.dataset.output));
    tab.classList.toggle('linked-to-selection',linked);
    if(linked){tab.dataset.linked='true';tab.title='This result comes from the selected node';}
    else{delete tab.dataset.linked;tab.removeAttribute('title');}
  });
}
function revealResultFor(nodeId:string|null|undefined){
  const owned=outputsOf(nodeId);
  if(!owned.length)return false;
  if(!owned.some(o=>o.nodeId===activeOutputId))activeOutputId=owned[0].nodeId;
  return true;
}
const hiddenMapLayers=new Map<string,Set<string>>();
/** The one-line message at the foot of the screen.
 *
 *  Until 2026-10-15 every one of these looked the same. "Complete in 2.1s" and "Workflow
 *  stopped: … cannot run" arrived in the identical success green, and both faded after five
 *  seconds whether or not anybody had finished reading. The practitioner, looking at a stopped
 *  run: *"I cannot make sense of the green error dialog."* Of course not -- it was telling them
 *  the colour of a success and the words of a failure.
 *
 *  A failure is red, and it STAYS until it is closed. A message you are given five seconds to
 *  read is a message somebody decided you did not need. */
function toast(message:string,options?:{action?:{label:string;run:()=>void};tone?:'failure'|'warning'|'notice'}){
  const element=$('#toast');element.textContent=message;element.classList.add('visible');clearTimeout(toastTimer);
  element.classList.toggle('failure',options?.tone==='failure');
  element.classList.toggle('warning',options?.tone==='warning');
  // A third tone: nothing failed and nothing needs attention, but something CHANGED and the
  // message says what and how to undo it. Reporting a change to 63 records and taking the
  // message away after five seconds is the same mistake as the green failure dialog, in the
  // other direction. 2026-10-16, experiment 117.
  element.classList.toggle('notice',options?.tone==='notice');
  if(options?.tone){
    // An action BESIDE the close, not instead of it. The first version returned here, so a
    // toned message could not offer anything to do about itself -- and the messages most worth
    // acting on are exactly the ones that are not plain successes. 2026-10-16.
    if(options.action){
      const act=document.createElement('button');
      act.className='button small';act.textContent=options.action.label;
      act.style.marginLeft='12px';act.onclick=options.action.run;
      element.append(act);
    }
    const close=document.createElement('button');
    close.className='button small';close.textContent='×';
    close.setAttribute('aria-label','Close this message');
    close.style.marginLeft=options.action?'6px':'12px';
    close.onclick=()=>element.classList.remove('visible');
    element.append(close);
    return;
  }
  if(options?.action){
    const button=document.createElement('button');button.className='button small';button.textContent=options.action.label;
    button.style.marginLeft='10px';button.onclick=options.action.run;element.append(button);
    const dismiss=document.createElement('button');dismiss.className='button small';dismiss.textContent='Later';
    dismiss.style.marginLeft='6px';dismiss.onclick=()=>element.classList.remove('visible');element.append(dismiss);
    return;
  }
  toastTimer=setTimeout(()=>element.classList.remove('visible'),5000);
}
// Before anything is hydrated: a reference whose payload is missing is a refusal, so the payloads
// have to be read out of IndexedDB first. Top-level await, in an ES module bundle that already
// uses it, rather than a render that shows a workflow with its inputs missing.
//
// The handler is registered FIRST so that a store which degrades during the load -- the migration
// is the first thing that writes -- is reported rather than discovered later. One toast, failure
// tone, because a silent fallback is the hazard: it turns a 10 GB ceiling back into a 5 MB one
// while the application goes on saying "Saved on this device".
onStoreDegraded((_kind,why)=>toast(`${why} Large street networks will be refused until it is. Export anything you need to keep.`,{tone:'failure'}));
await loadPayloads();
// Basemap tiles are downloaded assets like any other, so they go to the store that survives a
// reload and is counted in the storage figures. The practitioner, 2026-10-25, on what the offline
// promise means: *"It's a flow from online to offline. Online download the assets, offline use
// the cached assets."* A session-only cache gave the opposite -- ground on the first visit and
// none on the one that mattered.
useTileStore({read:key=>cachedPayload(key),write:(key,value)=>putPayload(key,value)});
try{const saved=localStorage.getItem(KEY);if(saved)workflow=validateWorkflow(hydrateWorkflow(JSON.parse(saved),readDatasets(),true));}catch(error){toast(errorMessage(error).startsWith('Shared input data is missing')?errorMessage(error):'Saved workflow could not be loaded. The example is ready.');}
if(!workflow.nodes.some(n=>n.id===selected))selected=exampleKey(workflow)==='raster'?'raster-input':exampleKey(workflow)==='old-naledi'?'access':workflow.nodes[0]?.id;
/** What the last refused save knew, so a caller can say something a practitioner can act on. */
let lastSaveFailure:{name:string;bytes:number}|null=null;
/** The refusal in words, decided in `save-refusal.ts` so it can be tested without racing a
 *  browser against its own auto-run. This passes the three facts and formats nothing itself. */
function saveFailureMessage(fallback:string):string{
  return saveRefusalMessage(fallback,busy,lastSaveFailure,storageRefusal);
}
/** The moment a project's work last changed, and the moment a copy of it last left this device.
 *
 *  Neither was recorded until 2026-10-23, which is why "backed up" could not be said of anything.
 *  Written where the thing actually happens -- a save, and an export that COMPLETED -- so the
 *  state is a fact about what was done rather than about what was attempted. */
function touchProject(id:string|undefined,field:'changedAt'|'exportedAt'):void{
  if(!id)return;
  const stored=readProjects();
  const project=stored.find(p=>p.id===id);
  if(!project)return;   // a worked example is not stored, and has nothing to back up
  project[field]=new Date().toISOString();
  writeProjects(stored);
}

function save(){
  syncProjectManifest(workflow);
  const previous=new Map<string,string|null>();
  try{for(const key of [KEY,WORKSPACES])previous.set(key,localStorage.getItem(key));const workspaces=JSON.parse(previous.get(WORKSPACES)||'{}');// A payload that arrived with an imported workflow is written to the store on the way past, so
    // the reference it carries resolves on the next load rather than refusing.
    //
    // The snapshot of what the store holds is taken AFTER this loop, not before. Taken before, a
    // payload written here was not yet in it, so the workflow was dehydrated as though the
    // reference were unbacked -- which keeps the data INLINE and sends an eight-megabyte workflow
    // into a five-megabyte store. The save then failed and an imported project could not be kept
    // at all. Found 2026-10-20 by the large-project round trip, in the fix for the round trip.
    for(const node of workflow.nodes){
      const params=node.params as unknown as Record<string,unknown>;
      if(typeof params.dataRef==='string'&&params.data!==undefined&&!Object.hasOwn(cachedPayloads(),params.dataRef))
        void putPayload(params.dataRef,params.data);
    }
    const kept=cachedPayloads();
    const stored=dehydrateWorkflow(workflow,digest=>Object.hasOwn(kept,digest));workspaces[storageKey(workflow)]=stored;localStorage.setItem(KEY,JSON.stringify(stored));localStorage.setItem(WORKSPACES,JSON.stringify(workspaces));forgetSavedWorkflows();
    // WHICH store, when it is not the large one. A practitioner whose payloads are back under the
    // 5 MB cap needs to know before a download, not after it is refused.
    lastSaveFailure=null;
    // The project's work changed, which is what makes it unbacked until an export completes.
    touchProject(workflow.projectId??projectOfWorkflow(storageKey(workflow),allProjects())?.id,'changedAt');
    renderProjectSafety();return true;}
  catch(error){
    // WHY IT FAILED, KEPT. This caught and rolled back and returned false, and every caller could
    // then say only "could not be saved. Retry Apply." -- which is useless advice when the cause
    // is a full store, because retrying fails identically. Reported 2026-10-21 on an Ituri study
    // area of 7,759 vertices, applied into a device already holding North Kivu's 16,547.
    lastSaveFailure={name:(error as Error)?.name||'Error',
      bytes:(()=>{try{return JSON.stringify(dehydrateWorkflow(workflow,()=>true)).length;}catch{return 0;}})()};
    forgetSavedWorkflows();for(const [key,value] of previous){try{if(localStorage.getItem(key)!==value){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}}catch{/* Storage may be unavailable even for rollback. Keep the editor draft open. */}}$('#save-status').textContent='Storage unavailable — export to keep';return false;}
}
/** Which published version of a worked example a saved workspace came from.
 *
 *  A saved workspace WINS over the template -- it must, or a practitioner's edits would vanish
 *  on every visit. The cost is that republishing a worked example reaches nobody who has already
 *  opened it: the rulesets example was rebuilt on John Snow's data on 2026-10-16 and the
 *  practitioner, looking at the canvas, said *"I don't see the John Snow data sets"*. Their
 *  browser was holding the version from before, exactly as designed, and nothing in the
 *  application mentioned that a newer one existed. They found it by reloading the example, which
 *  is the one thing a reader has no reason to try.
 *
 *  So the version a workspace came from is recorded beside it, and a mismatch is SAID. Nothing
 *  is replaced: the edits stay until the practitioner asks for the published version, because
 *  discarding somebody's work to deliver news is not an improvement on withholding the news. */
const REVISIONS='fieldwork-example-revisions-v1';
/** Stable over a template's shape: the nodes it has and how they are wired. A label or a
 *  coordinate changing is not worth interrupting anybody for; a workflow gaining two halves is. */
function exampleRevision(w:Workflow){
  const shape=w.nodes.map(n=>`${n.id}:${n.type}`).sort().join(',')
    +'|'+w.edges.map(e=>`${e.from}>${e.to}:${e.port}`).sort().join(',');
  let hash=5381;
  for(let i=0;i<shape.length;i++)hash=((hash*33)^shape.charCodeAt(i))>>>0;
  return hash.toString(36);
}
function readRevisions():Record<string,string>{
  try{return JSON.parse(localStorage.getItem(REVISIONS)||'{}');}catch{return {};}
}
/** HAS THIS CANVAS STOPPED BEING THE EXAMPLE IT STARTED AS?
 *
 *  The practitioner, 2026-10-23, twice, looking at a canvas holding a study area, a WorldPop
 *  raster, a clipped raster, a street network, health facilities and a map, under a caption
 *  telling them to draw and run a rule: *"The text 'Experiment 01 · draw → inspect facts → run the
 *  rule' before the Reset Layout button seems to be stale content."* ... *"And I am still seeing
 *  this text."*
 *
 *  It was. Four captions -- the example note, the canvas eyebrow, the project description and the
 *  footer context -- were set from the example KEY and never from the content, and `exampleKey`
 *  returns `blank` for any workflow carrying a projectId, so building anything at all left the
 *  instructions for Experiment 01 sitting over it. The one workspace designed to be built in was
 *  the one that went on describing itself as a scripted exercise.
 *
 *  `exampleRevision` already hashes the node and edge shape, for the republished-example notice,
 *  so the comparison is a hash against a hash. The template is built once per key and kept,
 *  because `render` runs often and some of these carry data. */
const publishedShape=new Map<string,number|string>();
function divergedFromExample(key:string):boolean{
  if(!workflow.nodes.length)return false;
  if(!publishedShape.has(key)){
    try{publishedShape.set(key,exampleRevision(template(key)));}
    catch{return false;}   // no template to compare against, so nothing is claimed
  }
  return publishedShape.get(key)!==exampleRevision(workflow);
}
function recordRevision(key:string){
  try{localStorage.setItem(REVISIONS,JSON.stringify({...readRevisions(),[key]:exampleRevision(template(key))}));}
  catch{/* storage refused; the notice simply reappears next time, which is harmless */}
}
/** Says so when the published example has moved on, and offers to load it. */
function noticeIfRepublished(key:string){
  if(key==='blank')return;
  const held=readRevisions()[key];
  if(held===exampleRevision(template(key)))return;
  toast('This worked example has been republished since you last opened it. Your copy is unchanged '
    +'and still has your edits; the published version is a separate click.',
    {tone:'warning',action:{label:'Load the published version',run:()=>{
      const replaced=change(w=>{replaceWorkflow(w,template(key));selected=null;});
      if(replaced===false)return;
      recordRevision(key);
      result=null;runWorkflow=null;activeOutputId=null;history=[];future=[];statuses={};
      renderResults();renderLibrary($('#node-search').value);render();
      setTimeout(()=>flow?.fit(),80);
      $('#toast').classList.remove('visible');
      if(canAutoRun(workflow))run();
    }}});
}

/** A key that no worked example owns. `template()` falls through to the heat example for an
 *  unknown key and `exampleRevision` would then compare a practitioner's workflow against heat's
 *  shape and announce that their example had been republished. Neither is a hazard a worked
 *  example could reach -- the twelve keys are compiled in -- and both arrive the moment a
 *  practitioner's project mints a key of its own. */
const isExampleKey=(key:string):boolean=>!key.includes('/');
function loadExample(key:string){if(busy)return;
  // A KEY WITH NOTHING UNDER IT is not a workflow, and this used to leave the canvas exactly where
  // it was and say nothing -- the row looked selectable and did nothing. Reported 2026-10-21:
  // *"test-project/w*, and *-template workflows I find in the list do not load at all on canvas"*.
  if(!isExampleKey(key)&&!Object.hasOwn(readSavedWorkflows(),key)){
    const removed=pruneGhostWorkflows();
    renderProjectOptions();render();
    toast(removed?'That row was a workflow registered in this project and never saved, so there is nothing to open. It has been removed from the list.'
      :'There is nothing saved under that workflow, so there is nothing to open.',{tone:'warning'});
    return;
  }
  // A SAVED WORKFLOW THE APPLICATION REFUSES TO OPEN is a row that did nothing when chosen, which
  // is how one became unreachable AND undeletable. It now says what is wrong with it and offers
  // the one action left.
  if(!isExampleKey(key)){
    try{validateWorkflow(structuredClone(readSavedWorkflows()[key]));}
    catch(error){
      const why=errorMessage(error);
      renderProjectOptions();render();
      toast(why.startsWith('Shared input data is missing')?why:`That workflow could not be opened: ${why}`,
        {tone:'failure',action:{label:'Delete it',run:()=>deleteWorkflow(key)}});
      return;
    }
  }
  save();let fromTemplate=true;try{const saved=readSavedWorkflows()[key];fromTemplate=!saved;workflow=saved?validateWorkflow(structuredClone(saved)):isExampleKey(key)?template(key):workflow;}catch(error){if(errorMessage(error).startsWith('Shared input data is missing')){toast(errorMessage(error),{tone:'failure'});return;}if(isExampleKey(key))workflow=template(key);}if(!isExampleKey(key)){/* nothing published to compare against */}else if(fromTemplate)recordRevision(key);else setTimeout(()=>noticeIfRepublished(key),400);selected=key==='snow-geoprivacy'?'move':key.startsWith('snow-')?'catchments':key==='raster'?'raster-input':key==='old-naledi'?'access':'criteria';result=null;runWorkflow=null;activeOutputId=null;history=[];future=[];statuses={};dirty=true;save();renderLibrary();renderResults();render();switchView('workflow');setTimeout(()=>flow?.fit(),80);if(canAutoRun(workflow)&&key!=='blank')run();}
/** Drop focus before the panel holding the focused control is rewritten.
 *
 *  Removing a focused input fires blur, and the blur handler re-renders underneath the removal
 *  in progress; Chromium refuses the innerHTML assignment with "the node to be removed is no
 *  longer a child of this node". Fixed in the ROLLBACK path on 2026-10-17 and found the same day,
 *  hours later, on the path where the edit SUCCEEDS -- by a test that types a UTM zone into the
 *  reachability step. A fix applied to one of two paths through the same hazard is the shape this
 *  repository keeps rediscovering; both are covered now.
 *
 *  Safe to call from inside an `onchange`: the element has already fired its change, so blurring
 *  it cannot fire another one. */
const dropFocus=()=>{(document.activeElement as HTMLElement|null)?.blur();};
// THE COLUMNS ON A TABLE DO NOT ALL COME FROM A TABLE INPUT. A rate or a case series emits a
// table of its own, and its key columns are declared by the widget that emits it rather than by
// anything in the workflow -- a run would show them, but a practitioner picks the column BEFORE
// the run. Offering only a table_input's keys is what left the area join's column control saying
// "Connect a table first" with a table plainly connected (South London choropleth, 2026-10-25).
function tableKeyColumns(node:WorkflowNode|undefined,seen=new Set<string>()):readonly string[]{
  if(!node||seen.has(node.id))return [];
  seen.add(node.id);
  switch(node.type){
    case 'table_input':return node.params.data.keys;
    case 'rate':return RATE_TABLE_KEYS;
    case 'case_series':return SERIES_TABLE_KEYS;
    case 'slr_site_assignment':return SITE_ASSIGNMENT_TABLE_KEYS;
    // A pass-through: the extract hands on the table it was given, keys and all, so the columns
    // are the ones further up and not something this node names.
    case 'slr_extract_import':{
      const up=workflow.edges.find(e=>e.to===node.id&&e.port==='projections');
      return tableKeyColumns(up?workflow.nodes.find(m=>m.id===up.from):undefined,seen);}
    default:return [];
  }
}

// THE GROUP NAMES ARE DATA, NOT SCHEMA. `tableKeyColumns` can name a table's key COLUMNS without
// a run, because a widget declares those. The VALUES in a grouping column are whatever the file
// holds, so they can only be offered when the rate's own source is a table this canvas carries --
// which is the common case, since a denominator usually arrives as an imported table. When the
// rate reads points, or the chain does not end in an imported table, the field stays typed and
// the Inspector says nothing it cannot support.
function rateGroupsFor(node:WorkflowNode):string[]{
  const rateEdge=workflow.edges.find(e=>e.to===node.id&&e.port==='rates');
  const rate=rateEdge?workflow.nodes.find(n=>n.id===rateEdge.from):undefined;
  if(rate?.type!=='rate')return [];
  const groupBy=rate.params.groupBy;
  if(!groupBy)return [];
  const sourceEdge=workflow.edges.find(e=>e.to===rate.id&&e.port==='records');
  const source=sourceEdge?workflow.nodes.find(n=>n.id===sourceEdge.from):undefined;
  if(source?.type!=='table_input')return [];
  // The rate pivots a long table into one row per subject, keyed by every key column except the
  // one holding measure names. The grouping column is one of those, so its distinct values are
  // the groups the rate will produce.
  if(!source.params.data.keys.includes(groupBy))return [];
  const seen=new Set<string>();
  for(const row of source.params.data.rows){
    const value=row.key[groupBy];
    if(value!==undefined&&value!==null&&String(value).trim())seen.add(String(value));
  }
  return [...seen].sort((a,b)=>a.localeCompare(b));
}

/** The distinct values of each key column of the table reaching this node, where they are
 *  knowable without a run.
 *
 *  Same honesty as `rateGroupsFor`: a widget DECLARES its key columns, so those can always be
 *  named, but the VALUES in a column are whatever the file holds. They can be offered when the
 *  chain ends in an imported table this canvas carries, and the chain is walked rather than
 *  stopped at the first step, because deriving a value and then keeping rows is the ordinary
 *  pair -- the step that keeps rows needs to offer the value the step before it derived, and
 *  that value exists nowhere but on that step's own parameters until a run happens.
 */
/** The unit of the table reaching an output, where it can be known without a run.
 *
 *  A table that states one is already saying its values count the same thing, so asserting it
 *  again at the output would be a second control for a claim the table has already made.
 *  Deriving a value and selecting rows both pass the unit through unchanged, so the walk goes
 *  up the chain to whatever imported the table. */
function tableUnitFor(output:WorkflowNode):string|undefined{
  const walk=(node:WorkflowNode|undefined,port:string,seen:Set<string>):string|undefined=>{
    const edge=workflow.edges.find(e=>e.to===node?.id&&e.port===port);
    const up=edge?workflow.nodes.find(m=>m.id===edge.from):undefined;
    if(!up||seen.has(up.id))return undefined;
    seen.add(up.id);
    if(up.type==='table_input')return up.params.data.unit?.trim()||undefined;
    // relate_table and group_table pass the unit through too: relating adds a key column and
    // totalling adds up values already in the unit, so neither changes what the numbers count.
    if(up.type==='select_rows'||up.type==='derive_value'||up.type==='relate_table'
      ||up.type==='group_table'||up.type==='two_by_two')return walk(up,'records',seen);
    return undefined;
  };
  return walk(output,'table',new Set());
}

/** `port` so a widget with TWO table inputs can ask about either one: `relate_table` needs the
 *  columns of the table being read from as well as the table being added to, and they are
 *  different questions with different answers. */
function upstreamKeyValues(node:WorkflowNode,seen=new Set<string>(),
  port='records'):Record<string,string[]>|undefined{
  const edge=workflow.edges.find(e=>e.to===node.id&&e.port===port);
  const up=edge?workflow.nodes.find(m=>m.id===edge.from):undefined;
  if(!up||seen.has(up.id))return undefined;
  seen.add(up.id);
  if(up.type==='table_input'){
    const table=up.params.data;
    return Object.fromEntries(table.keys.map(key=>
      [key,[...new Set(table.rows.map(row=>String(row.key[key])))]]));
  }
  if(up.type==='select_rows'){
    const below=upstreamKeyValues(up,seen);
    if(!below)return undefined;
    const kept=up.params.values.filter(value=>value.trim());
    return kept.length?{...below,[up.params.keyColumn]:kept}:below;
  }
  if(up.type==='derive_value'){
    const below=upstreamKeyValues(up,seen);
    if(!below)return undefined;
    const name=up.params.name.trim();
    return name?{...below,[up.params.keyColumn]:[...(below[up.params.keyColumn]??[]),name]}:below;
  }
  // RELATING ADDS A COLUMN, and the values it will hold are the ones the second table holds --
  // read from THAT table rather than guessed, which is the same discipline as reading the
  // operands of a derived value off the column they come from.
  if(up.type==='relate_table'){
    const below=upstreamKeyValues(up,seen);
    if(!below)return undefined;
    const brought=up.params.bring.trim();
    if(!brought)return below;
    const other=upstreamKeyValues(up,new Set(seen),'related');
    return {...below,[brought]:other?.[brought]??[]};
  }
  // Totalling DROPS the columns not kept, so offering them downstream would offer a column that
  // is no longer there.
  if(up.type==='group_table'){
    const below=upstreamKeyValues(up,seen);
    if(!below)return undefined;
    const kept=up.params.by.filter(name=>name.trim());
    return kept.length?Object.fromEntries(kept.filter(name=>name in below)
      .map(name=>[name,below[name]])):below;
  }
  return undefined;
}

function change(fn:(w:Workflow)=>void,{spatial=true,requirePersistence=false}={}){if(busy)return false;const previous=structuredClone(workflow);try{fn(workflow);syncProjectManifest(workflow,true);workflow=validateWorkflow(workflow);const persisted=save();if(requirePersistence&&!persisted){const bytes=JSON.stringify(workflow).length;workflow=previous;dropFocus();render();toast(storageRefusal(bytes),{tone:'failure'});return false;}history.push(previous);if(history.length>40)history.shift();future=[];if(spatial){dirty=true;runFailed=false;statuses={};}dropFocus();render();return persisted;}catch(e){
  // The edit is rolled back and the panel is rewritten -- WHILE the control that made the edit
  // still holds focus. Chromium throws "The node to be removed is no longer a child of this
  // node. Perhaps it was moved in a 'blur' event handler?" from the innerHTML assignment,
  // because removing the focused input fires blur, and the blur handler re-renders underneath
  // the removal in progress. Found on 2026-10-17 by a test that clears a setting the workflow
  // requires: any refused edit typed into a field could raise it. Dropping focus first makes
  // the blur run to completion before anything is replaced.
  // IN THE FAILURE TONE, because this is always a failure. A refused edit announced itself in the
  // same green as "saved on this device": the practitioner read *"I got a GREEN toast that says
  // Invalid or oversized network or provenance"*, 2026-10-21, and green is what the application
  // says when something worked.
  workflow=previous;dropFocus();toast(errorMessage(e),{tone:'failure'});render();return false;}}
/** Which declared port a layer dropped on a map's "add a layer" port should bind to.
 *
 *  The map's one configurable port is type-free: the practitioner drops a result on it and this
 *  reads what that result EMITS to choose the port. Point layers take the first free slot, so a
 *  second point source lands on points_2 rather than replacing the first -- which is what
 *  pointInputCount has always created and what nothing let a practitioner reach by dragging. */
function layerPortFor(w:Workflow,source:WorkflowNode,target:WorkflowNode<'map_output'>):string|undefined{
  const type=outputOf(source);
  if(!type)return undefined;
  const taken=(port:string)=>w.edges.some(e=>e.to===target.id&&e.port===port);
  // `context` is points-typed and is not a point layer: it means "points drawn beside polygons".
  // Binding a second point source there because it happened to be free would quietly give the
  // layer a role the practitioner did not choose, and the role is what the renderer takes its
  // emphasis from. It stays available in its own picker and out of automatic binding.
  const declared=nodeInputs(target).filter(([port,portType])=>portType===type&&port!=='context').map(([port])=>port);
  const free=declared.find(port=>!taken(port));
  if(free)return free;
  // Every slot of that type is in use. Point layers can grow: pointInputCount creates them.
  if(type==='points'){
    const next=(target.params.pointInputCount??1)+1;
    if(next<=8){target.params.pointInputCount=next;return pointPort(next-1);}
  }
  return declared[0];
}

function setConnection(w:Workflow,from:string|null,to:string,port:string){
  const target=w.nodes.find(n=>n.id===to),map=['map_output','table_output'].includes(target?.type||'');
  // The map's single "add a layer" port binds to a declared one by what the source emits.
  if(from&&port==='layer'&&target?.type==='map_output'){
    const source=w.nodes.find(n=>n.id===from);
    const bound=source&&layerPortFor(w,source,target as WorkflowNode<'map_output'>);
    if(!bound)return;
    port=bound;
  }
  // Connecting a raster used to set the map's mode AND drop every other connection, because a
  // raster map could show nothing else. A raster is a layer: it arrives and the others stay. The
  // renderer still draws one picture at a time -- see drawnMode -- so a raster wins the drawing
  // while the other layers remain wired and recorded. That limit is the drawing code's, and it is
  // no longer paid for by silently discarding a practitioner's connections.
  w.edges=w.edges.filter(e=>e.to!==to||(e.port!==port&&(!from||!map||(port!=='coverage'&&e.port!=='coverage'))));
  // WHAT THE UNION YIELDS follows what it is given, and the node records it so every reader of a
  // port type -- the connection offers, the canvas, the layer binding -- agrees without consulting
  // the edges. Set when an area is wired in, cleared when the last one goes.
  if(target?.type==='summarize_combined_area'){
    const areas=w.edges.some(e=>e.to===to&&(e.port==='area'||e.port==='area2'))
      ||(!!from&&(port==='area'||port==='area2'));
    const node=target as WorkflowNode<'summarize_combined_area'>;
    if(areas)node.params.yields='area';else delete node.params.yields;
  }
  if(from)w.edges.push({id:`e-${Date.now()}`,from,to,port});
  if(from&&port==='area'&&target?.type==='clip_raster'&&!target.params.cutline){
    try{const {boundary,node}=previewArea(w,to),geometry=boundary.type==='MultiPolygon'&&boundary.coordinates.length===1?{type:'Polygon' as const,coordinates:boundary.coordinates[0]}:boundary;target.params.cutline={geometry:structuredClone(validateDrawnGeometry(geometry)),selectionMode:node.params.source==='drawn'?node.params.selectionMode:'polygon'};}catch{/* An unfinished or complex boundary remains linked until a supported cutline is applied. */}
  }
}
/** Sites a widget could not connect, from the last completed run.
 *
 *  Read here rather than pushed at run time so the alert survives re-renders and stays attached to
 *  the widget that found it. A run that found nothing clears it, because `result` is replaced. */
function nodeAlert(id:string){return result?.alerts?.find(a=>a.nodeId===id);}
/** Canvas badges the practitioner has closed, keyed by the run that raised them.
 *
 *  A badge that cannot be dismissed covers the node it is about, and once it has been read it is
 *  in the way. Keyed by runId so the NEXT run raises it again: a finding that stays dismissed
 *  across runs would make the canvas quieter and less true, and the thing it is about may well
 *  have changed. The Inspector keeps the full alert either way, so closing the badge loses
 *  nothing -- which is what makes it safe to allow. */
const dismissedAlerts=new Set<string>();
const alertKey=(id:string)=>`${result?.runId??'none'}:${id}`;
const badgeFor=(id:string)=>dismissedAlerts.has(alertKey(id))?undefined:nodeAlert(id);
/** The two findings read differently, so they are said separately: one is an omission from the
 *  counts, the other an assumption inside them. Both are acted on the same way -- by looking at
 *  where the streets stop -- which is why they share one alert. */
/** One line naming every step whose records it could not read, or nothing when all was read.
 *
 *  Names the STEPS, because the practitioner's next action is to open one. The detail lives in
 *  the Inspector, where there is room for it and where the records themselves are a click away. */
function dataIssueNotice(run:WorkflowRun){
  const found=run.alerts.filter(a=>a.dataIssues?.length);
  if(!found.length)return '';
  const records=found.reduce((n,a)=>n+(a.dataIssues??[]).reduce((m,i)=>m+i.count,0),0);
  const named=found.map(a=>{
    const node=run.outputs.find(o=>o.nodeId===a.nodeId);
    return node?.label||workflow.nodes.find(n=>n.id===a.nodeId)?.params.label||a.nodeId;
  });
  return `${records} record${records===1?'':'s'} could not be read as declared: `
    +`${named.join(', ')}. Those records were classified as if the value were not recorded. `
    +`Open the step to see which column, and how many.`;
}

function alertText(alert:NonNullable<ReturnType<typeof nodeAlert>>){
  const said=[];
  // Said first, because it changes how every number below it should be read: these records were
  // classified on the basis that a value was not there.
  if(alert.dataIssues?.length)said.push(
    `This step applied its rules to records whose values it could not read, and told the rules `
    +`they were not recorded. The result is complete and the conclusions for those records are `
    +`conclusions about an absence, which is not the same as a conclusion about a number.`);
  // Declaration gaps read differently from the catchment findings: nothing is wrong with the
  // numbers, and what is missing is what a reader would need to trust them. Said first and
  // separately, and never as a reason the result is unusable -- the practitioner's decision of
  // 2026-10-15 was that provenance is an alert and not a blocker.
  if(alert.gaps?.length)said.push(
    `${alert.gaps.length} thing${alert.gaps.length===1?' this step has'
      :'s this step has'} not declared. Every number here is computed and usable; what is missing is `
    +`what a reader would need in order to check where it came from. Fill the fields below, or `
    +`publish as it is and say that the source is undeclared.`);
  if(alert.unconnected.length)said.push(
    `${alert.unconnected.length} site${alert.unconnected.length===1?'':'s'} got no result at all: the leg to the nearest street alone spends the whole travel budget. Every count and area from this widget is over the sites that reached something.`);
  if(alert.offNetwork.length)said.push(
    `${alert.offNetwork.length} site${alert.offNetwork.length===1?'':'s'} started further from the network than the snap limit allows, and ${alert.offNetwork.length===1?'its route was':'their routes were'} charged a straight line to reach it. A straight line assumes ground that can be crossed at the declared speed, so ${alert.offNetwork.length===1?'that result reaches':'those results reach'} further here than on the ground.`);
  // Catchment advice, for catchment findings. It was pushed onto EVERY alert, so a step whose
  // only finding was an undeclared field was told to extend the street network -- and from
  // 2026-10-16 so was a step that could not read a column. Advice that does not fit what was
  // found teaches a reader to stop reading the advice.
  if(alert.unconnected.length||alert.offNetwork.length)
    said.push('Raise the snap limit or the travel time on this widget, extend the street network where it stops short, or accept what is listed and say so in what you publish.');
  if(alert.dataIssues?.length)
    said.push('Correct the column at its source, bind it to a kind the values actually are, or accept the count below and say in what you publish how many records it covers.');
  return said.join(' ');
}
/** Site, what happened to it, and the distance that decided it. One table, because a practitioner
 *  reading it is asking the same question of every row: where does the road data stop? */
function alertRows(alert:NonNullable<ReturnType<typeof nodeAlert>>){
  return [
    ...(alert.dataIssues??[]).map(issue=>({name:issue.field,
      outcome:issue.why==='missing'?'No value':'Not a number',detail:issue.says})),
    ...(alert.gaps??[]).map(gap=>({name:gap.field,outcome:'Not declared',detail:gap.says})),
    ...alert.unconnected.map(u=>({name:u.name,outcome:'No result',
      detail:`${Math.round(u.distanceM)} m to the nearest street, from a ${Math.round(u.budgetM)} m budget`})),
    ...alert.offNetwork.map(u=>({name:u.name,outcome:'Routed off-network',
      detail:`${Math.round(u.distanceM)} m charged as a straight line, past a ${u.limitM} m limit`})),
  ];
}
function alertHeadline(alert:NonNullable<ReturnType<typeof nodeAlert>>){
  const parts=[];
  // Counted in RECORDS, not in issues: "1 field had a problem" is not what a reader needs to
  // know, and "37 records the rules could not read" is.
  const records=(alert.dataIssues??[]).reduce((n,issue)=>n+issue.count,0);
  if(records)parts.push(`${records} record${records===1?'':'s'} the rules could not read`);
  if(alert.gaps?.length)parts.push(`${alert.gaps.length} undeclared`);
  if(alert.unconnected.length)parts.push(`${alert.unconnected.length} with no result`);
  if(alert.offNetwork.length)parts.push(`${alert.offNetwork.length} routed off-network`);
  return parts.join(' · ');
}
/** HOW MANY VERTICES A BOUNDARY HOLDS, for either geometry it may be.
 *
 *  This read `coordinates[0].length-1`, which counts a Polygon's outer ring and, on a
 *  MultiPolygon, counts the RINGS of its first part. South London's study area is 33 parts and
 *  2,182 vertices, and its node card read "Polygon \u00b7 0 vertices" -- one ring, minus the
 *  closing point. A count that is wrong by three orders of magnitude on the project's own worked
 *  example is worse than no count, because a practitioner reads it as a study area that failed
 *  to load.
 */
function geometryVertices(geometry:{type:string;coordinates:unknown}|undefined):number{
  if(!geometry)return 0;
  const rings=(geometry.type==='MultiPolygon'
    ?(geometry.coordinates as number[][][][]).flat()
    :geometry.coordinates as number[][][])||[];
  // The closing point repeats the first, so each ring counts one fewer.
  return rings.reduce((total,ring)=>total+Math.max(0,ring.length-1),0);
}
function describe(n:WorkflowNode,status?:string):NodeDescription{let subtitle=TYPES[n.type].description,detail='Ready';if((n.type==='places'||n.type==='centers')){subtitle=`${n.params.data.features.length} local locations`;detail='GeoJSON · CRS84';}if(n.type==='raster_input'){detail=n.params.asset?`${n.params.asset.metadata.width} x ${n.params.asset.metadata.height} retained cells`:'Prepare a local GeoTIFF';}if(n.type==='clip_raster'){subtitle='Raster + polygon -> masked raster';detail=n.params.method+' / margin '+(n.params.marginPixels||0)+' px';}if(n.type==='policy'){subtitle=`Heat alert + distance > ${n.params.thresholdKm} km`;detail='Evidence → decision';}if(n.type==='alert'){subtitle=n.params.active===null?'Alert status unknown':n.params.active?'Heat alert is active':'No active heat alert';detail=n.params.date;}if(n.type==='measure_distance'){detail='Kilometers · straight-line';}if(n.type==='output'){subtitle={table:'Table with supporting evidence',bars:'Grouped result counts',map:'Map of results and locations'}[n.params.view];detail='Creates a Results tab';}if(n.type==='study_area'){const p=n.params;subtitle=p.source==='drawn'?(p.geometry?`Drawn ${p.selectionMode==='bbox'?'box':'polygon'}`:'No boundary selected yet'):(p.dataset||'Source dataset');detail=p.source==='drawn'&&!p.geometry?'Select it on the map':'CRS84';}if(n.type==='point_grid'){subtitle=`Regular grid · ${n.params.spacingM} m`;detail='Demonstration points';}if(n.type==='facilities'){subtitle=`Search within ${n.params.radiusKm} km`;detail='Historical registry · 214 points';}if(n.type==='xpert'){subtitle='Named evidence → facility type';detail='NB06 hierarchy · N3';}if(n.type==='access'){subtitle=`${n.params.minimumEvidence} evidence · ${n.params.service==='onsite'?'onsite':'incl. referral'}`;detail=`Straight-line proxy · ${n.params.speedMPerMin} m/min`;}if(n.type==='access_policy'){subtitle=`Review proxy time > ${n.params.thresholdMin} min`;detail='N3 · missing stays unknown';}if(n.type==='facility_audit'){subtitle='Service, evidence, and references';detail='All candidate facilities';}const alert=badgeFor(n.id);return {flagged:!!nodeAlert(n.id),definition:{...TYPES[n.type],inputs:nodeInputs(n),output:outputOf(n)},
    connectedPorts:workflow.edges.filter(e=>e.to===n.id).map(e=>e.port),
    availablePorts:nodeInputs(n).filter(([,type])=>workflow.nodes.some(x=>x.id!==n.id&&outputOf(x)===type)).map(([port])=>port),
    type:n.type,label:n.params.label||TYPES[n.type].title,subtitle,detail,status,glow:justFinished.has(n.id),alert:alert?alertHeadline(alert):undefined};}
function render(){
  const url=new URL(location.href);url.searchParams.set('example',exampleKey(workflow));window.history.replaceState(null,'',url);
  renderLibrary($('#node-search').value);
  const old=exampleKey(workflow)==='old-naledi';
  renderProjectOptions();renderProjectDetails();renderStorageStatus();renderProjectSafety();
  // THE TAB REDRAWS WITH EVERYTHING ELSE. Three bugs today were the same bug: a derived fact
  // was written and the surface showing it was not told -- the header after an export, the
  // Project view after an export, the view again after a project was renamed. Scattering a
  // call at each site is how the fourth one happens, so it renders where every other surface
  // renders and the individual calls are no longer load-bearing.
  if(currentView==='project')renderProjectView();$('#project-title').textContent=workflow.name||'Untitled workflow';$('#project-description').textContent=old?'Explore diagnostic access, evidence strength, and the assumptions connecting them.':'Connect geography to evidence. Make every decision explainable.';$('#example-note').textContent=old?'Source boundary + historical facilities · generated sample locations · straight-line access proxy':'Synthetic neighborhoods and cooling centers · illustrative screening rule';$('#canvas-example').textContent=old?'OLD NALEDI · WORKED EXAMPLE 02':'HEAT OUTREACH · DEMO 01';$('#footer-context').textContent=old?'Source snapshot 7f183843 · synthetic sample locations':'CRS84 coordinates · geodesic approximation · synthetic data';
  // SAID ONLY WHILE IT IS STILL TRUE. The four captions below are set from the example key; the
  // block after them withdraws the two that describe a RECIPE once the canvas no longer matches
  // the published example. The project description and the footer stay: they describe the kind of
  // work, not the steps, and remain true of a canvas built on top of one.
  if(exampleKey(workflow)==='blank'){$('#project-description').textContent='Developmental evaluation · define a study area and inspect its semantic representation.';$('#example-note').textContent='Experiment 01 · draw → inspect facts → run the rule';$('#canvas-example').textContent='STUDY AREA · EXPERIMENT 01';$('#footer-context').textContent='User-defined study area · CRS84 · local reasoning';}
  if(exampleKey(workflow)==='coverage'){$('#project-description').textContent='Developmental evaluation · inspect spatial exceptions, exclude with a reason, or revise the boundary.';$('#example-note').textContent='Synthetic points and illustrative boundary · no patient data';$('#canvas-example').textContent='SPATIAL COVERAGE · EXPERIMENT';$('#footer-context').textContent='Synthetic coverage exercise · CRS84 · boundary included';}
  if(exampleKey(workflow)==='rulesets'){$('#project-description').textContent='How a rule is put together, four times over: two workflows band Snow\u2019s data as he recorded it \u2014 Table 1 by the deaths on each date, the mapped locations by the deaths at each address \u2014 and two run the identical rules over damaged copies of the same data.';$('#example-note').textContent='Four workflows on one canvas. A and B use Snow\u2019s data as recorded; C and D are SIMULATED damage, and say so on the input: three dates with no count, and a quarter of the counts written as text. C and D apply the same rules as A and B, so everything that differs is the data \u2014 and the step says what it could not read rather than banding those records Unrecorded in silence.';$('#canvas-example').textContent='RULESETS \u00b7 HOW A RULE IS PUT TOGETHER';$('#footer-context').textContent='Authored rules \u00b7 compiled to N3 \u00b7 declared field bindings';}
  if(exampleKey(workflow)==='raster'){$('#project-description').textContent='Prepare a local raster, preview and adjust the clipping boundary, then run and inspect the clipped result.';$('#example-note').textContent='1 Prepare raster / 2 Preview and adjust / 3 Run workflow';$('#canvas-example').textContent='OLD NALEDI / RASTER CLIPPING';$('#footer-context').textContent='Native raster cells / adjustable polygon mask / local file and source citation';}
  if(exampleKey(workflow)==='sea-level'){$('#project-description').textContent='Published AR6 sea-level projections against real Manila health facilities: which gauge, how far away.';$('#example-note').textContent='Projections are IPCC AR6, CC BY 4.0, in millimetres against the 1995\u20132014 baseline. Facilities are OpenStreetMap, ODbL. No elevation is supplied, so nothing here is compared against one \u2014 and none of it is an inundation model.';}
  if(exampleKey(workflow).startsWith('snow-')){$('#project-description').textContent='Historical pump and death-location tables; explicit metric catchment computations and source evidence.';$('#example-note').textContent='250 locations / 489 deaths; network is a modern OSM snapshot, not 1854 streets';$('#canvas-example').textContent='JOHN SNOW / CATCHMENT WORKED EXAMPLE';$('#footer-context').textContent='CRS84 inputs and outputs / UTM computation / method parameters in evidence';}
  if(exampleKey(workflow)==='snow-geoprivacy'){$('#project-description').textContent='Compare private source points with moved points and H3 cell aggregates.';$('#example-note').textContent='Before views and workflow exports contain source coordinates; after views are educational transformations, not privacy guarantees';$('#canvas-example').textContent='JOHN SNOW / GEOPRIVACY EXPERIMENT';$('#footer-context').textContent='CRS84 · seeded donut · H3 aggregation · hide and map encryption remain TODO';}
  // The practitioner met this twice before it was fixed, which is why it is withdrawn here rather
  // than corrected in eight branches: one place that can be read, instead of a rule repeated.
  if(divergedFromExample(exampleKey(workflow))){
    $('#example-note').textContent=`Built on ${workflowTitle(exampleKey(workflow))} and changed since.`;
    $('#canvas-example').textContent=(workflow.name||'This workflow').toUpperCase();
  }
  $('#blank-canvas').hidden=workflow.nodes.length!==0||exampleKey(workflow)!=='blank';
  // The bar is refreshed here rather than only when a control is used, because the workflow can
  // change underneath it -- loading an example being the case that caught this: the playback had
  // been set up against the default canvas and went on reporting its length.
  renderPlayback();
  // During a playback the canvas shows the nodes placed so far, and the edges between them.
  const shown=playbackView();
  flow?.update(shown,selected,statuses);$('#node-count').textContent=String(shown.nodes.length);$('#undo-button').disabled=!history.length||busy;$('#redo-button').disabled=!future.length||busy;
  // A failed run outranks "Changed · rerun to update". Both of the places that set 'Run failed'
  // were immediately overwritten from `dirty` by the render in the run's own finally block, so
  // the canvas invited the practitioner to press the button that had just refused and the only
  // trace of the refusal was in the console. The flag clears when the next run starts, or when
  // they change something -- at which point rerunning IS the next thing to do.
  $('#workflow-state').textContent=busy?'Running locally…':runFailed?'Run failed'
    :runIncomplete?'Not ready to run'
    :dirty?(result?'Changed · rerun to update':'Ready to run'):'✓ Run complete';
  $('#run-button').disabled=busy;$('#run-button').innerHTML=busy?'◌ Running…':'<span>▶</span> Run workflow';
  $('#run-summary').textContent=result?(dirty?'Previous run · settings have changed':`${result.outputs.length} outputs · ${lastRunMs===null?'':`ran in ${elapsedText(lastRunMs)} · `}${Math.round(result.trace.reduce((a,t)=>a+t.milliseconds,0))} ms computing`):'Run the workflow to see results';
  if(exampleKey(workflow)==='snow-geoprivacy')$('#run-summary').textContent=result?'Private project and run evidence contain original coordinates. Derived tabs are educational; review before sharing.':'Private source coordinates are included in this workflow.';
  ($('#project-select') as HTMLSelectElement).disabled=busy;($('#workflow-select') as HTMLSelectElement).disabled=busy;document.body.classList.toggle('busy',busy);flow?.setBusy(busy);renderInspector();
  $('#run-button').disabled=busy||!workflow.nodes.length;$('#new-workflow').disabled=busy;($('#add-workflow') as HTMLButtonElement).disabled=busy;$('#reset-example').disabled=busy||!workflow.nodes.length;$('#tidy-button').disabled=busy||workflow.nodes.length<2;
  // EVERY CONTROL WHOSE HANDLER OPENS WITH `if(busy)return` BELONGS ON THIS LINE, and the three
  // that open the project dialog did not. A guard that returns silently is invisible: the click
  // lands, nothing happens, no message appears, and the run that swallowed it is in a different
  // part of the screen from the button that stopped working. Found 2026-10-24 in a Linux WebKit
  // container, where a heavy example is still running when the practitioner reaches New project;
  // on a faster machine the run finishes first and the control looks fine. The defect is older
  // than the test that caught it -- experiment 135.
  //
  // Disabled rather than queued, at the practitioner's decision: a control that greys out says the
  // application is busy, where one that remembers a click acts on an intention formed before the
  // run finished.
  for(const id of ['#new-project','#project-new','#blank-project','#backup-button'])
    ($(id) as HTMLButtonElement).disabled=busy;
  if(!workflow.nodes.length)$('#workflow-state').textContent='Add Study area to begin';
  renderN3();
}
function describeNode(n:WorkflowNode,status?:string):NodeDescription{const d=describe(n,status);if(n.type==='isochrone'){d.subtitle=(n.params.thresholds?.length?n.params.thresholds.join(', '):n.params.minutes)+' min / '+n.params.speedMPerMin+' m per min';d.detail=n.params.direction+' / '+n.params.bufferM+' m corridor';}if(n.type==='mean_center'){d.subtitle='Unweighted center of point locations';d.detail='UTM zone '+n.params.zone+(n.params.hemisphere==='north'?'N':'S')+' → CRS84';}if(n.type==='compare_point_sets'){d.subtitle='Original + moved + two centers + pumps';d.detail=`UTM zone ${n.params.zone}${n.params.hemisphere==='north'?'N':'S'} · metres`;}if(n.type==='comparison_map'){d.subtitle='Side-by-side maps · shared extent';d.detail='Private evaluation view';}if(n.type==='buffer_area')d.detail=n.params.distanceM+' m acquisition buffer';if(['map_output','table_output','chart_output'].includes(n.type)&&'inputMode' in n.params&&n.params.inputMode==='polygons'){d.subtitle='Display polygon geometry and existing summaries';d.detail='Creates a Results tab';}if(n.type==='map_output'&&n.params.inputMode==='raster'){d.subtitle='Native raster cells and clipping boundary';d.detail='GeoTIFF download';}if(n.type==='table_input'){d.subtitle=n.params.keys.length?`${n.params.keys.length} key columns -> ${n.params.valueField}`:'Choose key and value columns';d.detail=n.params.data.rows.length?`${n.params.data.rowCount} rows`:'Import a long-format CSV';}if(n.type==='reproject'){d.subtitle=`CRS84 degrees \u2192 EPSG:${n.params.hemisphere==='south'?32700+n.params.zone:32600+n.params.zone} metres`;d.detail='Projects connected points';}if(n.type==='raster_input')d.detail=n.params.asset?`${n.params.asset.metadata.width} x ${n.params.asset.metadata.height} retained cells`:'Prepare GeoTIFF input';if(n.type==='study_area'&&n.params.source==='drawn'){d.subtitle=n.params.geometry?`${n.params.selectionMode==='bbox'?'Bounding box':'Polygon'} · ${geometryVertices(n.params.geometry)} vertices`:'Choose a boundary on the map';d.detail=n.params.geometry?'GeoJSON → N3 · CRS84':'Not configured';}if(n.type==='measure_area'){d.subtitle='Study area → study area + area';d.detail=`${AREA_UNITS[n.params.unit].symbol} · spherical calculation`;}return d;}
function runEvidenceText(){return result?result.receipts.map(receiptText).join('\n\n')+(result.provenanceN3?'\n\n# WORKFLOW, WIDGET AND REFERENCE PROVENANCE (recorded metadata, not rule premises)\n'+result.provenanceN3:''):'';}
function receiptText(r:Receipt){return r.kind==='presentation'?`# PRESENTATION NODE: ${r.nodeId}\n# SOURCE FACTS AND VIEW PROVENANCE (no new inference)\n${r.input}`:r.kind==='computation'?`# COMPUTATION NODE: ${r.nodeId}\n# COMPUTED FACTS (not inferred)\n${r.input}`:`# RULE NODE: ${r.nodeId}\n${r.input}\n# DERIVED CONCLUSIONS\n${r.conclusions.map(quadToN3).join('\n')}`;}
function renderN3(){
  const drawn=workflow.nodes.filter((n):n is WorkflowNode<'study_area'> & {params:Extract<import('./types.js').AreaParams,{source:'drawn'}>}=>n.type==='study_area'&&n.params.source==='drawn');
  const area=drawn.find(n=>n.params.geometry);$('#area-semantic-graph').hidden=!area;
  const evaluated=area&&!dirty&&result?.receipts.some(r=>r.nodeId===area.id&&r.conclusions.some(q=>q.predicate==='urn:fieldwork:readyForSpatialAnalysis'&&q.object==='true'));
  if(area)$('#area-semantic-graph').innerHTML=`<div>${esc(area.params.label)}<small>Study area · ${esc(area.id)}</small></div><span>geo:hasGeometry →</span><div>${area.params.selectionMode==='bbox'?'Bounding box polygon':'Polygon'}<small>geo:asWKT · CRS84</small></div><span>validated geometry → rule</span><div>${evaluated?'Ready for spatial analysis':'Not evaluated'}<small>${evaluated?'EYE conclusion from widget checks':'Draft facts'}</small></div>`;
  if(dirty||!result){$('#n3-preview').textContent='# CURRENT CANVAS PLANS — not executed evidence\n\n'+canvasN3(workflow)+'\n'+drawn.map(n=>{try{return studyAreaN3(n).input;}catch{return '# Select a valid study area before running.';}}).join('\n\n');}
  else if(result)$('#n3-preview').textContent=runEvidenceText();
  else $('#n3-preview').textContent='Add a Study area and draw a boundary to generate facts, or run a worked example.';
}
/** The CURRENT version of each ruleset identity, not every bundled one. Older versions are
 *  carried so a saved workflow that pinned one still replays -- a rule change changes results,
 *  which is why the pin exists -- and offering them would let a practitioner start new work on a
 *  superseded rule. Seven bundled documents, four identities, four choices. */
/** Choosing a ruleset on the node: pin it, take its declared defaults, and name the step after
 *  what it does unless the practitioner has already named it themselves. The ports change with
 *  the ruleset, so whatever was wired to this node is disconnected -- the same bargain the output
 *  widgets make when their input mode changes, and Undo restores it. */
/** The columns a connected layer actually has, as candidate field bindings.
 *
 *  Read from the records themselves rather than guessed from a name: the kind comes from the
 *  values, and a numeric column gets no unit, because this cannot know one and a number without
 *  a unit is not a measurement. The practitioner states it before the rules will run. */
/** The rules of a step, drawn as rules rather than described in prose.
 *
 *  Written for a step carrying authored rules and reachable only from one, which meant the
 *  published ruleset a worked example applies could not be SEEN -- the Inspector gave its title,
 *  version, description, settings and obligations, and never what it actually decides. The
 *  practitioner, 2026-10-26: "how do we demonstrate the use of a ruleset widget when we cannot
 *  even provide the view of how it's used? Defeats the purpose of a worked example."
 *
 *  Every bundled ruleset already carries its rules in this shape -- the `authored` form they were
 *  built from, which is what makes them reproducible by hand -- so showing them needs no new data,
 *  only this renderer reached from both branches. */
type ShownRule={any:{all:{field:string;comparator:string;
  value:import('./authored-rules.js').AuthoredValue}[]}[];
  then:{predicate:string;value:import('./authored-rules.js').AuthoredValue}[]};
function rulesList(rules:ShownRule[],
  fields:{attribute?:string;predicate:string}[],
  readable:(value:import('./authored-rules.js').AuthoredValue)=>string,
  esc:(text:string)=>string):string{
  const comparator=(c:string)=>({equals:'is',greaterThan:'is more than',notGreaterThan:'is at most',
    lessThan:'is less than',notLessThan:'is at least'}[c]??c);
  // The column, as the file spells it. Not a label somebody wrote over it: a reader checking
  // this rule against their data is looking for the column, and a rule that names something
  // the file does not contain makes them translate. 2026-10-16.
  const named=(predicate:string)=>{
    const field=fields.find(f=>f.predicate===predicate||`${f.predicate}Known`===predicate);
    return field?.attribute??predicate.slice(predicate.indexOf(':')+1);
  };
  const presenceOf=(predicate:string)=>fields.some(f=>`${f.predicate}Known`===predicate);
  return ''
    +`<div class="authored-rules">`
    +rules.map((rule,index)=>`<div class="authored-rule">`
      +`<span class="rule-number">${index+1}</span>`
      +rule.any.map((group,g)=>`<div class="rule-when">`
        +`<span class="rule-keyword">${g?'OR':'IF'}</span><div class="rule-conditions">`
        +group.all.map((condition,c)=>`<div class="rule-row">`
          +(c?`<span class="rule-and">and</span>`:`<span class="rule-and"></span>`)
          +`<span class="rule-field">${esc(named(condition.field))}</span>`
          // A condition about whether a value was there reads as one phrase, with nothing
          // to compare against: "DEATHS is not recorded", not "whether DEATHS is recorded
          // is false", which is a double negative wrapped around a question.
          +(presenceOf(condition.field)
      ?`<span class="rule-op">${condition.value===true?'is recorded':'is not recorded'}</span><span class="rule-value"></span>`
      :`<span class="rule-op">${esc(comparator(condition.comparator))}</span>`
       +`<span class="rule-value">${esc(readable(condition.value))}</span>`)
          +`</div>`).join('')
        +`</div></div>`).join('')
      +`<div class="rule-then"><span class="rule-keyword">THEN</span><div class="rule-conditions">`
      +rule.then.map((conclusion,t)=>`<div class="rule-row">`
        +(t?`<span class="rule-and">and</span>`:`<span class="rule-and"></span>`)
        +`<span class="rule-field">${esc(conclusion.predicate.slice(conclusion.predicate.indexOf(':')+1))}</span>`
        +`<span class="rule-op">is</span>`
        +`<span class="rule-value">${esc(readable(conclusion.value))}</span>`
        +`</div>`).join('')
      +`</div></div></div>`).join('')
    +`</div>`;
}

function candidateFields(workflow:Workflow,nodeId:string){
  // Any incoming edge, not only one on a port called `subjects`. A step converted from a
  // declared ruleset keeps that ruleset's port names -- `polygons` for extent-review -- and
  // looking only for `subjects` found nothing, so the editor opened with no columns to read.
  const edge=workflow.edges.find(e=>e.to===nodeId&&e.port==='subjects')
    ??workflow.edges.find(e=>e.to===nodeId);
  const source=edge&&workflow.nodes.find(n=>n.id===edge.from);
  const data=(source?.params as {data?:{kind?:string; features?:{properties?:Record<string,unknown>}[];
    keys?:string[]; valueField?:string; rows?:{key:Record<string,unknown>; value:unknown}[]}}|undefined)?.data;
  // A TABLE IS RECORDS TOO. The run has said so since 2026-10-16 -- "points or a table, the rules
  // do not know the difference" -- but this offered columns only from a point layer's properties,
  // so a step fed by a table was told to connect the records it already had and no rule could be
  // written on it at all. The attributes of a row are its key columns plus the declared value
  // field, which is `authoredSubjects` read the same way round. Found 2026-10-26 on the Manila
  // extract step.
  const records=data?.kind==='data-table'
    ?(data.rows??[]).slice(0,200).map(row=>({...row.key,...(data.valueField?{[data.valueField]:row.value}:{})}))
    :(data?.features??[]).slice(0,200).map(feature=>feature.properties??{});
  const seen=new Map<string,Set<string>>();
  for(const properties of records)
    for(const [key,value] of Object.entries(properties)){
      if(key==='name'||value===null||value===undefined||value==='')continue;
      (seen.get(key)??seen.set(key,new Set()).get(key)!).add(typeof value);
    }
  return [...seen].map(([attribute,types])=>({attribute,
    predicate:`fwa:${attribute.replace(/[^A-Za-z0-9]+(.)/g,(_,c:string)=>c.toUpperCase()).replace(/[^A-Za-z0-9]/g,'')}`,
    kind:types.has('number')&&types.size===1?'number' as const
      :types.has('boolean')&&types.size===1?'boolean' as const:'term' as const,
    label:attribute}));
}

/** Turn a step into one whose rules are written here.
 *
 *  The practitioner, 2026-10-15: *"Why can't I just get a ruleset editor?"* They could not,
 *  from example 09 or from any step holding a published ruleset, because this conversion was an
 *  option inside a dropdown labelled Ruleset -- and it threw away every edge on the node on the
 *  way, so the step then had nothing to read and no columns to offer.
 *
 *  It keeps the PORT SHAPE of whatever was pinned, when something was. That is what lets the
 *  wiring survive: the step still takes what it took and gives back what it gave, and only the
 *  rules inside it change. A step with nothing pinned starts from points, which is the shape
 *  most records arrive in.
 *
 *  What it does NOT do is edit the published ruleset. That one is pinned, versioned and carries
 *  a basis; a step that writes its own rules has forked away from it, and the Inspector says so
 *  rather than letting a practitioner believe they changed something published. */
/** Units a practitioner can type, and the IRI the unit check compares.
 *
 *  A word this does not recognise gets the label and no IRI -- so the check then refuses the
 *  rules for want of a unit, which is the honest outcome rather than a guess at what they meant.
 *  Millimetres were added 2026-10-26 when a seeded binding declared `mm` and nothing could
 *  resolve it. */
const UNIT_IRIS:Record<string,string>={minutes:'MIN',minute:'MIN',min:'MIN',hours:'HR',hour:'HR',hr:'HR',seconds:'SEC',second:'SEC',days:'DAY',day:'DAY',metres:'M',meters:'M',m:'M',kilometres:'KiloM',kilometers:'KiloM',km:'KiloM',millimetres:'MilliM',millimeters:'MilliM',millimetre:'MilliM',millimeter:'MilliM',mm:'MilliM',percent:'PERCENT'};
const unitIriFor=(label?:string)=>{
  const code=UNIT_IRIS[(label??'').trim().toLowerCase()];
  return code?`http://qudt.org/vocab/unit/${code}`:undefined;
};

function authorRulesOn(nodeId:string,label:string){
  change(w=>{
    const target=getNode(w,nodeId,'apply_ruleset');
    const held=target.params.ruleset;
    const pin=pinnedRuleset('urn:fieldwork:ruleset:outreach-criteria','1.0.0');
    target.params.ruleset={id:pin!.id,version:pin!.version,title:'Rules written in this workflow',
      inputs:held?.inputs??[['subjects','points']],output:held?.output??'points'};
    target.params.parameters={};
    // A RULESET THAT READS COLUMNS CARRIES OVER; one that works its facts out for itself does
    // not. The refusal to copy was right for the four bespoke fact generators -- the rules would
    // read the same and be fed something different -- but `extract-contract` declares
    // `fieldFrom` and names `authoredFacts` as its generator, which is the very function rules
    // written here go through. Fed by the same function from the same bindings, a copy is fed
    // identically, so the objection does not reach it.
    //
    // The practitioner, 2026-10-26: "how do we demonstrate the use of a ruleset widget when we
    // cannot even provide the view of how it's used? Defeats the purpose of a worked example."
    // A worked example is a teaching artifact and a regression fixture at once, and a step whose
    // rules open blank teaches nothing about the step. Resetting the example puts it back.
    const source=held&&resolveRuleset(held.id,held.version);
    const bindings=source?.inputContract.fieldFrom;
    const seeded=bindings?.length?source:undefined;
    target.params.authored={title:label||'Rules for this step',
      mustNotBeReadAs:seeded?.mustNotBeReadAs??'',
      // The columns the connected records carry, declared for them. Nothing is guessed from a
      // name -- the kinds come from the values -- and an empty list is the honest result when
      // nothing is connected yet, which the Inspector already says plainly. A seeded fork
      // declares the bindings the ruleset declared, resolving each stated unit to the IRI the
      // unit check compares; a label nothing recognises stays a label and the run says so.
      fields:(seeded&&bindings
        ?bindings.map(b=>({...b,unit:unitIriFor(b.unitLabel)}))
        :candidateFields(w,nodeId)) as never,
      parameters:(seeded?.parameters??[]).map(parameter=>({name:parameter.name,
        meaning:parameter.meaning,min:parameter.min,max:parameter.max,
        unitLabel:parameter.unitLabel})) as never,
      rules:(seeded?.authored?structuredClone(seeded.authored.rules):[]) as never};
  });
}

/** The button that gets you an editor, from any ruleset step, in one press.
 *
 *  Converting and then opening is one gesture rather than two: a practitioner who asked to write
 *  rules wants to be writing them, not looking at an empty section that says they may. */
/** What every ruleset downstream of this input has declared its columns to be.
 *
 *  Read from the bindings rather than from the data, because a declaration is the only thing
 *  that makes a value WRONG: `"3"` in a column nobody typed is a string, and in a column
 *  declared numeric it is a problem. Experiment 117.
 *
 *  Several steps may bind the same column. They agree in every workflow this project ships, and
 *  if they ever disagreed the first declaration wins here -- the profile is a reading aid, and
 *  the run is what adjudicates. */
function declaredKinds(workflow:Workflow,inputId:string):Record<string,'number'|'boolean'|'term'>{
  const kinds:Record<string,'number'|'boolean'|'term'>={};
  const reachable=new Set([inputId]);
  // Follow the edges forward: a ruleset two steps away still reads these columns.
  let grew=true;
  while(grew){
    grew=false;
    for(const edge of workflow.edges)
      if(reachable.has(edge.from)&&!reachable.has(edge.to)){reachable.add(edge.to);grew=true;}
  }
  for(const node of workflow.nodes){
    if(node.type!=='apply_ruleset'||!reachable.has(node.id))continue;
    for(const field of node.params.authored?.fields??[])
      if(!(field.attribute in kinds))kinds[field.attribute]=field.kind;
  }
  return kinds;
}

/** Read a column's values as the kind a ruleset declared, once a practitioner has asked.
 *
 *  Never automatic, and never a write to the file: an ordinary change to the workflow, which
 *  Undo reverses and the saved workflow carries. It reports both sides -- what it cast and what
 *  it could not read -- because a repair that only mentions its successes is how 2 of 63 records
 *  quietly stay broken. Experiment 117. */
function repairColumn(nodeId:string,column:string,to:'number'|'boolean'|'term'){
  const node=workflow.nodes.find(x=>x.id===nodeId);
  const params=node?.params as {data?:{features?:{properties?:Record<string,unknown>}[]};repairs?:ColumnRepair[]}|undefined;
  if(!params?.data?.features?.length)return;
  // Measured against the records as they will be READ -- repairs already declared included --
  // so asking twice for the same column does nothing rather than reporting it twice.
  const seen=applyRepairs(params.data.features,params.repairs??[]);
  const {outcome}=castColumn(seen.map(f=>f.properties?.[column]),to);
  if(!outcome.cast&&!outcome.unreadable.length)return;
  // DECLARED, not applied to what the node holds. The records this node imported stay byte for
  // byte what the file contained; the repair is applied to a copy on the way out, so removing
  // the declaration brings the original back without an Undo and without a re-import.
  change(w=>{
    const target=w.nodes.find(x=>x.id===nodeId);
    const params=target?.params as {repairs?:ColumnRepair[]}|undefined;
    if(params)params.repairs=[...(params.repairs??[]),
      {column,to,cast:outcome.cast,unreadable:outcome.unreadable,at:new Date().toISOString()}];
  });
  toast(`${column}: ${outcome.cast} value${outcome.cast===1?'':'s'} now read as ${to}s.`
    +(outcome.unreadable.length
      ?` ${outcome.unreadable.length} could not be read and ${outcome.unreadable.length===1?'was':'were'} left as ${outcome.unreadable.map(v=>`"${v}"`).slice(0,3).join(', ')}. Those records stay unrecorded.`
      :' Nothing was left unreadable.')
    +' Undo reverses this; the file itself is untouched.',
    {tone:outcome.unreadable.length?'warning':'notice'});
}

/** Take a declared repair back. The originals were never overwritten, so removing the
 *  declaration is the whole of it -- no re-import, no Undo, nothing to reconstruct. */
function removeRepair(nodeId:string,index:number){
  const node=workflow.nodes.find(x=>x.id===nodeId);
  const repair=(node?.params as {repairs?:ColumnRepair[]}|undefined)?.repairs?.[index];
  if(!repair)return;
  change(w=>{
    const params=w.nodes.find(x=>x.id===nodeId)?.params as {repairs?:ColumnRepair[]}|undefined;
    if(params?.repairs)params.repairs=params.repairs.filter((_,i)=>i!==index);
  });
  toast(`${repair.column} is read as the file holds it again. `
    +`The ${repair.cast} value${repair.cast===1?'':'s'} that ${repair.cast===1?'was':'were'} cast `
    +`${repair.cast===1?'is':'are'} back as ${repair.cast===1?'it':'they'} ${repair.cast===1?'was':'were'} imported.`,
    {tone:'notice'});
}

/** Everything the quality dialog needs about one input, in the shape it reads. */
function qualityViewFor(n:WorkflowNode){
  const held=n.params as {data?:{features?:{properties?:Record<string,unknown>}[]};repairs?:ColumnRepair[]};
  const repairs=held.repairs??[];
  const features=applyRepairs(held.data?.features??[],repairs);
  const columns=[...new Set(features.flatMap(f=>Object.keys(f.properties??{})))];
  return {title:`${n.params.label||TYPES[n.type].title} · data quality`,columns,
    rows:features.map(f=>({...f.properties})),
    declared:declaredKinds(workflow,n.id),repairs,
    onRepair:(column:string,to:'number'|'boolean'|'term')=>repairColumn(n.id,column,to),
    onRemoveRepair:(index:number)=>removeRepair(n.id,index)};
}

/** A published ruleset's source, shaped for the editor to display.
 *
 *  The editor reads `fields` to name a predicate and to decide which comparators fit it. A
 *  published ruleset declares its vocabulary as N3 rather than as field bindings, so the fields
 *  are reconstructed from the rules themselves: every predicate a condition reads, its kind from
 *  how it is compared, and its unit from the parameter it is compared against when there is one.
 *
 *  A `…Known` predicate is the editor's own companion to a field, so it is folded back into the
 *  field it belongs to rather than listed as one of its own. */
function reviewAuthored(ruleset:Ruleset):NonNullable<import('./types.js').ParamsByType['apply_ruleset']['authored']>{
  const kinds=new Map<string,'number'|'boolean'|'term'>();
  // The unit IRI as well as its label. The label is what a reader sees; the IRI is what the unit
  // check compares, and a field carrying only a label is refused for stating no unit -- which is
  // exactly what a fork of extent-review did, naming a defect that was in this reconstruction
  // rather than in the published ruleset.
  const units=new Map<string,{unit?:string;unitLabel?:string}>();
  const parameters=new Map(ruleset.parameters.map(p=>[p.name,p]));
  for(const rule of ruleset.authored?.rules??[])
    for(const group of rule.any)
      for(const condition of group.all){
        const base=condition.field.replace(/Known$/,'');
        const isKnown=base!==condition.field;
        const kind=isKnown?undefined
          :condition.comparator!=='equals'?'number' as const
          :typeof condition.value==='boolean'?'boolean' as const:'term' as const;
        if(kind&&kinds.get(base)!=='number')kinds.set(base,kind);
        else if(!kinds.has(base))kinds.set(base,'term');
        const setting=typeof condition.value==='object'&&condition.value
          ?parameters.get((condition.value as {setting:string}).setting):undefined;
        if(setting?.unit)units.set(base,{unit:setting.unit,unitLabel:setting.unitLabel});
      }
  return {title:`${ruleset.title} ${ruleset.version}`,mustNotBeReadAs:ruleset.mustNotBeReadAs,
    fields:[...kinds].map(([predicate,kind])=>({attribute:predicate.slice(predicate.indexOf(':')+1),
      predicate,kind,label:predicate.slice(predicate.indexOf(':')+1),...units.get(predicate)})),
    parameters:ruleset.parameters.map(p=>({name:p.name,meaning:p.meaning,unit:p.unit,
      unitLabel:p.unitLabel,min:p.min,max:p.max})),
    rules:(ruleset.authored?.rules??[]) as never} as never;
}

function wireAuthorRules(node:WorkflowNode){
  optionalElement('#review-rules')?.addEventListener('click',async()=>{
    const pinned=getNode(workflow,node.id,'apply_ruleset').params.ruleset;
    if(!pinned)return;
    const ruleset=resolveRuleset(pinned.id,pinned.version);
    await openRuleEditor(reviewAuthored(ruleset),esc,{
      settingValues:getNode(workflow,node.id,'apply_ruleset').params.parameters,
      note:`These are the rules ${ruleset.title} ${ruleset.version} applies, laid out the way rules you write are laid out. `
        +`Nothing here can be changed: this ruleset is published and pinned, and the run evidence names it by version.`});
  });
  optionalElement('#author-rules')?.addEventListener('click',async()=>{
    authorRulesOn(node.id,node.params.label??'');
    const authored=getNode(workflow,node.id,'apply_ruleset').params.authored;
    if(!authored)return;
    const edited=await openRuleEditor(authored,esc,{settingValues:getNode(workflow,node.id,'apply_ruleset').params.parameters});
    if(edited)change(w=>{getNode(w,node.id,'apply_ruleset').params.authored!.rules=edited.rules as never;});
  });
}

function wireRulesetChoice(node:WorkflowNode){
  optionalElement('#ruleset-choice')?.addEventListener('change',event=>{
    const value=control(event).value;
    // Writing rules, rather than choosing somebody else's. Until 2026-10-15 the only way to
    // reach the editor was to open a workflow that already carried authored rules, which meant
    // the one worked example they were written for: an editor with no entry point.
    if(value==='authored'){authorRulesOn(node.id,node.params.label??'');return;}
    const [id,version]=value.split('@');
    const chosen=id?bundledRulesets().find((r:Ruleset)=>r.id===id&&r.version===version):undefined;
    change(w=>{
      const target=getNode(w,node.id,'apply_ruleset');
      const generic=!target.params.label||target.params.label===TYPES.apply_ruleset.title
        ||currentRulesets().some(r=>r.title===target.params.label);
      if(!chosen){delete (target.params as {ruleset?:unknown}).ruleset;target.params.parameters={};}
      else{
        target.params.ruleset=pinnedRuleset(chosen.id,chosen.version);
        target.params.parameters=Object.fromEntries(chosen.parameters
          .filter(p=>p.default!==undefined).map(p=>[p.name,p.default as number]));
        if(generic)target.params.label=chosen.title;
      }
      w.edges=w.edges.filter(edge=>edge.to!==node.id&&edge.from!==node.id);
    });
  });
}
function currentRulesets():Ruleset[]{
  const current=new Map<string,Ruleset>();
  for(const r of bundledRulesets() as Ruleset[]){
    const held=current.get(r.id);
    if(!held||held.version.localeCompare(r.version,undefined,{numeric:true})<0)current.set(r.id,r);
  }
  return [...current.values()];
}
function renderLibrary(search=''){
  const allowed=addableTypes({workflowTypes:workflow.nodes.map(n=>n.type)});
  // What progressive reveal would offer at this step. Dimmed rather than removed: a hidden
  // widget can make a practitioner conclude the application cannot do something it can.
  const revealed=playbackStep===null?null:revealedTypes(playbackPlaced());
  let group='';const entries=Object.entries(TYPES).filter(([k,t])=>allowed.has(k)&&!ADDABLE_VIA_COMPOSITION.includes(k as typeof ADDABLE_VIA_COMPOSITION[number])&&!ADDABLE_VIA_RULESET.includes(k as typeof ADDABLE_VIA_RULESET[number])&&(t.title+' '+t.description).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>PALETTE_GROUPS.indexOf(a[1].group as typeof PALETTE_GROUPS[number])-PALETTE_GROUPS.indexOf(b[1].group as typeof PALETTE_GROUPS[number]));$('#library-count').textContent=revealed?`${entries.filter(([k])=>revealed.has(k as NodeType)).length} of ${allowed.size}`:String(allowed.size);$('#node-library').innerHTML=entries.map(([k,t])=>{const heading=t.group!==group?`<div class="library-group">${t.group}</div>`:'';group=t.group;return `${heading}<button class="palette-node ${t.color} ${workflow.nodes.find(n=>n.id===selected)?.type===k?'primitive-selected':''} ${revealed&&!revealed.has(k as NodeType)?'unrevealed':''}" ${revealed&&!revealed.has(k as NodeType)?'title="Nothing on the canvas emits what this takes, at this step"':''} aria-current="${workflow.nodes.find(n=>n.id===selected)?.type===k?'true':'false'}" data-add="${k}"><span class="palette-icon">${t.icon}</span><strong>${t.title}</strong><span>+</span></button>`;}).join('');
  // One entry per bundled composition, under Micro-workflows, with its governance status
  // where a practitioner sees it. An unreviewed composition is offered and says so, because
  // a rule that stops one being tried stops the learning it was written to protect.
  const compositions=bundledCompositions()
    .filter(c=>(c.title+' '+c.description).toLowerCase().includes(search.toLowerCase()));
  if(compositions.length){
    $('#node-library').insertAdjacentHTML('beforeend',`<div class="library-group">Micro-workflows</div>`
      +compositions.map(c=>{const entry=compositionEntry(c);
        const mark=entry.status==='admitted'?'':`<span class="pill warn">${esc(entry.status)}, unreviewed</span>`;
        return `<button class="palette-node indigo" data-composition="${esc(entry.key)}" `
          +`title="${esc(c.mustNotBeReadAs)}"><span class="palette-icon">⧈</span>`
          +`<span class="palette-label">${esc(entry.title)} ${mark}</span>`
          +`<span class="palette-note">${esc(c.members.length+' steps · '+entry.stage)}</span></button>`;
      }).join(''));
    if(!revealed)$('#library-count').textContent=String(allowed.size+compositions.length);
  }
  // One entry per bundled ruleset, each adding a node with that ruleset already pinned. The
  // generic "Apply ruleset" entry that stood here until 2026-10-14 added a node with no ruleset,
  // which has no ports and cannot run -- exactly what src/palette.ts said must not happen, while
  // the palette did it. Four rulesets were bundled and none could be chosen: the widget rule
  // "a widget nobody can add is invisible", one layer down.
  //
  // The basis status is shown where a practitioner decides, not buried in the Inspector. An
  // illustrative ruleset is offered and says so, for the same reason an unreviewed composition is.
  // Input widgets already in the OTHER workflows of this project. The practitioner, 2026-10-19:
  // *"I create a second workflow and I should then be able to see input widget from other
  // workflows IN the same project."* And, sharpening it: *"if there are no other workflows there
  // will be nothing on that list."*
  //
  // So the group is ABSENT rather than empty. It has nothing to show for a workflow in no project,
  // for the first workflow of a new project, or for a project whose other workflows hold no
  // acquired input -- all three ordinary states -- and a control that is empty until a second
  // workflow exists would advertise sharing before there is anything to share.
  const siblings=siblingInputs(storageKey(workflow),allProjects(),readSavedWorkflows())
    .filter(input=>(input.label+' '+input.workflowName).toLowerCase().includes(search.toLowerCase()));
  if(siblings.length){
    $('#node-library').insertAdjacentHTML('beforeend',`<div class="library-group">From this project</div>`
      +siblings.map((input,index)=>`<button class="palette-node" data-sibling="${index}" `
        +`title="${esc(`From "${input.workflowName}". One copy of the data is kept for the project; this node gets its own label and position.`)}">`
        +`<span class="palette-icon">⇥</span><span class="palette-label">${esc(input.label)}</span>`
        +`<span class="palette-note">${esc(input.workflowName+(input.records===null?'':` · ${input.records} records`))}</span></button>`).join(''));
  }
  $('#node-library').querySelectorAll<HTMLButtonElement>('[data-sibling]').forEach(b=>b.onclick=async()=>{
    const input=siblings[Number(b.dataset.sibling)];
    if(!input||busy)return;
    const source=readSavedWorkflows()[input.workflowKey];
    const node=isRecord(source)&&Array.isArray(source.nodes)
      ? source.nodes.find(n=>isRecord(n)&&String(n.id)===input.nodeId) : undefined;
    if(!isRecord(node)||!isRecord(node.params)||node.params.data===undefined){
      toast('That input could not be read from the other workflow.',{tone:'failure'});return;}
    const payload=node.params.data;
    const digest=typeof node.params.dataRef==='string'?node.params.dataRef:await payloadDigest(payload);
    if(!await keepDataset(digest,payload))return;
    // The sibling keeps its inline copy until its own next save, when dehydration finds the digest
    // already in the store. Nothing reaches into a workflow that is not being edited.
    const id=`${input.type}-${Date.now()}`;
    const copied=structuredClone(node) as Record<string,unknown>;
    const didAdd=change(w=>{w.nodes.push({...copied,id,
      x:180+(w.nodes.length%4)*80,y:90+(w.nodes.length%3)*80,
      params:{...(copied.params as Record<string,unknown>),dataRef:digest}} as unknown as WorkflowNode);selected=id;});
    if(didAdd===false)return;
    flow?.fit();
    toast(`"${input.label}" added from "${input.workflowName}". The project holds one copy of its data; rename this node freely.`);
  });
  $('#node-library').querySelectorAll<HTMLButtonElement>('[data-composition]').forEach(b=>b.onclick=()=>{
    const found=bundledCompositions().find(c=>`${c.id}@${c.version}`===b.dataset.composition);
    if(!found)return;
    let entry;try{entry=compositionEntry(found);}catch(error){alert((error as Error).message);return;}
    const id=`${found.nodeType}-${Date.now()}`;
    const didAdd=change(w=>{w.nodes.push({id,type:'micro_workflow',
      x:180+(w.nodes.length%4)*80,y:90+(w.nodes.length%3)*80,params:entry!.params} as WorkflowNode);
      selected=id;});
    if(didAdd===false)return;
    flow?.fit();
    toast(`${entry.title} added as one step. Connect its ports; it expands into ${found.members.length} primitives when it runs.`);
  });
  $('#node-library').querySelectorAll<HTMLButtonElement>('[data-add]').forEach(b=>b.onclick=()=>{
    // Four widgets reached the palette on 2026-10-19 when `addableTypes` stopped consulting a
    // curated list, and none of them had a draft: the fallback at the end of this chain reads the
    // OPEN example's template, so a widget absent from it could not be constructed. They were
    // addable only where a template already contained one, which is why nobody had noticed --
    // the same shape as the defect that hid them from the palette in the first place.
    const type=b.dataset.add as NodeType,sample=structuredClone(type==='alert'?{type:'alert' as const,params:{active:null,date:new Date().toISOString().slice(0,10)}}
      :type==='measure_distance'?{type:'measure_distance' as const,params:{unit:'kilometres' as const}}
      :type==='facilities'?{type:'facilities' as const,params:{dataset:DATASET,radiusKm:5,sourceMode:'connected' as const}}
      :type==='facility_audit'?{type:'facility_audit' as const,params:{} as Record<string,never>}
      :type==='apply_ruleset'?{type:'apply_ruleset' as const,params:{label:'Apply ruleset',parameters:{}}}:type==='rate_ratio'?{type:'rate_ratio' as const,params:{label:'Rate ratio',compared:'',reference:'',level:95 as const,method:'log-normal' as const}}
      :type==='travel_time'?{type:'travel_time' as const,params:{label:'Travel time from distance',speedMPerMin:70}}:type==='point_grid'?{type:'point_grid' as const,params:{spacingM:250}}:type==='mean_center'?{type:'mean_center' as const,params:{label:'Mean center',zone:30,hemisphere:'north' as const}}:type==='compare_point_sets'?{type:'compare_point_sets' as const,params:{label:'Compare point sets',zone:30,hemisphere:'north' as const}}:type==='comparison_map'?{type:'comparison_map' as const,params:{label:'Point comparison map'}}:type==='donut_geomask'?{type:'donut_geomask' as const,params:{label:'Donut geomasking',innerM:50,outerM:125,seed:42}}:type==='aggregate_points_to_h3_cell'?{type:'aggregate_points_to_h3_cell' as const,params:{label:'H3 cell aggregation',resolution:9,minOccupancy:2}}:type==='buffer_area'?{type:'buffer_area' as const,params:{label:'Buffered study area',distanceM:500}}:type==='network_input'?{type:'network_input' as const,params:{label:'Street network',data:{nodes:[],edges:[],source:'Not prepared'},inputMethod:'file' as const,marginM:250}}:Object.hasOwn(CATCHMENT_TYPES,type)?[...johnSnowExample('snow-voronoi').nodes,...johnSnowExample('snow-isochrone').nodes].find(n=>n.type===type):type==='join_table_to_area'?{type:'join_table_to_area' as const,params:{label:'Values on the study area',keyField:'',normalisation:'fuzzy' as const}}:type==='derive_value'?{type:'derive_value' as const,params:{label:'Derive a value',keyColumn:'measure',left:'',operator:'minus' as const,right:'',name:''}}:type==='select_rows'?{type:'select_rows' as const,params:{label:'Select rows by value',keyColumn:'measure',values:[]}}:type==='relate_table'?{type:'relate_table' as const,params:{label:'Relate a column from another table',on:'',bring:''}}:type==='group_table'?{type:'group_table' as const,params:{label:'Total within groups',by:[]}}:type==='two_by_two'?{type:'two_by_two' as const,params:{label:'Two-by-two table',exposureColumn:'',exposed:'',unexposed:'',outcomeColumn:'',caseValue:'',nonCaseValue:'',level:95 as const}}:type==='rate'?{type:'rate' as const,params:{label:'Rate with a denominator',numeratorField:'',denominatorField:'',denominatorUnit:'people' as const,rateKind:'proportion' as const,multiplier:100,minimumDenominator:20,numeratorPeriod:'',denominatorVintage:''}}:type==='case_series'?{type:'case_series' as const,params:{label:'Cases by period',dateField:'',dateKind:'onset' as const,period:'week' as const}}:type==='slr_extract_import'?{type:'slr_extract_import' as const,params:{label:'Sea-level projection extract',datasetIRI:'',datasetVersion:'',baselinePeriod:'',citations:['','',''],basisKind:'' as const,familyValues:{withVerticalLandMotion:'',withoutVerticalLandMotion:''}}}:type==='slr_site_assignment'?{type:'slr_site_assignment' as const,params:{label:'Assign projection site'}}:type==='slr_threshold_comparison'?{type:'slr_threshold_comparison' as const,params:{label:'Compare level to elevation',scenario:'',basis:'',family:'',year:'',quantile:'',elevationField:'',verticalDatum:'',elevationReference:'' as const}}:type==='polygon_input'?{type:'polygon_input' as const,params:{label:'Polygon layer',data:{features:[]}}}:type==='map_image_input'?{type:'map_image_input' as const,params:{label:'Georeferenced map image',image:{width:0,height:0,bytes:0,sha256:''},bounds:[0,0,0,0] as [number,number,number,number],opacity:0.85}}:type==='table_input'?{type:'table_input' as const,params:{label:'Tabular data',keys:[],valueField:'',data:{kind:'data-table' as const,keys:[],valueField:'',rows:[],rowCount:0,missingValueCount:0}}}:type==='deduplicate_points'?{type:'deduplicate_points' as const,params:{label:'Deduplicated records',pointInputCount:2,nameField:'name',nameMatch:'fuzzy' as const,fuzzyThreshold:0.88,blockDistanceM:500,nearDistanceM:50,matchThreshold:2,reviewThreshold:1,decisions:[]}}:type==='clip_points_to_area'?{type:'clip_points_to_area' as const,params:{label:'Points inside the area',keepBoundary:true,showExcluded:true}}:type==='reproject'?{type:'reproject' as const,params:{label:'Reproject points',zone:35,hemisphere:'south' as const}}:type==='raster_input'?{type:'raster_input' as const,params:{label:'Raster input'}}:type==='fill_interior_gaps'?{type:'fill_interior_gaps' as const,params:{label:'Filled gaps'}}:type==='stack_polygons'?{type:'stack_polygons' as const,params:{label:'Collected polygon layers'}}:type==='travel_time_band'?{type:'travel_time_band' as const,params:{label:'Travel time band',minutes:5}}:type==='reachable_corridor'?{type:'reachable_corridor' as const,params:{label:'Reachable corridor',bufferM:25,zone:30,hemisphere:'north' as const}}:type==='reachable_nodes'?{type:'reachable_nodes' as const,params:{label:'Reachable junctions',minutes:10,speedMPerMin:80,direction:'outbound' as const,travelMode:'walking' as const}}:type==='snap_to_network'?{type:'snap_to_network' as const,params:{label:'Snap sites to the network',zone:30,hemisphere:'north' as const,maxSnapM:150}}:type==='summarize_combined_area'?{type:'summarize_combined_area' as const,params:{label:'Combined area',zone:30,hemisphere:'north' as const}}:type==='summarize_hull'?{type:'summarize_hull' as const,params:{label:'Convex hull',zone:30,hemisphere:'north' as const}}:type==='find_health_facilities'?{type:'find_health_facilities' as const,params:{label:'Find health facilities',source:'openstreetmap-live' as const,kinds:['hospital','clinic'],requireName:true,country:'PHL',minConfidence:0.7,data:null,retrieved:null}}:type==='buffer_point'?{type:'buffer_point' as const,params:{label:'Area around a point',pointId:'',distanceM:5000}}:type==='sample_raster'?{type:'sample_raster' as const,params:{label:'Sample raster at points',attribute:'',valueUnit:''}}:type==='clip_raster'?{type:'clip_raster' as const,params:{label:'Clipped raster',method:'all-touched' as const,marginPixels:0}}:type==='chart_output'?{type:'chart_output' as const,params:{label:'Chart'}}:type==='table_output'?newTableOutput():type==='map_output'?newMapOutput():type==='point_input'?newObservations():type==='measure_area'?newAreaMeasurement():['blank','coverage'].includes(exampleKey(workflow))&&type==='study_area'?newStudyArea():template(exampleKey(workflow)).nodes.find(n=>n.type===type));
    // Every zone-taking widget was defaulted to Soho's 30/north in the branches above, which is
    // wrong anywhere else and said nothing about it. Suggest the zone the workflow's own data is
    // in, from the mean longitude of every coordinate already configured. The parameter stays: a
    // study area straddling a boundary has no single right answer, and the Inspector says so
    // when it happens. Experiment 100.
    if(sample&&'params' in sample){
      const configured=sample.params as Record<string,unknown>;
      if(typeof configured.zone==='number'&&typeof configured.hemisphere==='string'){
        const suggested=suggestUTM(workflow);
        if(suggested){configured.zone=suggested.choice.zone;configured.hemisphere=suggested.choice.hemisphere;}
      }
    }
    const id=`${type}-${Date.now()}`;
    const didAdd=change(w=>{const source=['measure_area','raster_input','buffer_area'].includes(type)?w.nodes.find(n=>n.type==='study_area'):type==='clip_raster'?w.nodes.find(n=>n.type==='raster_input'):null;const added={...required(sample),id,x:source?source.x+310:180+(w.nodes.length%4)*80,y:source?source.y:90+(w.nodes.length%3)*80};if(added.type==='output')added.params={view:'bars',label:`Bar chart ${w.nodes.filter(n=>n.type==='output').length+1}`};w.nodes.push(added);if(added.type==='raster_input'||added.type==='clip_raster'||added.type==='buffer_area'){const area=w.nodes.find(n=>n.type==='study_area');if(area)setConnection(w,area.id,id,'area');}selected=id;});if(didAdd===false)return;flow?.fit();toast(type==='study_area'?'Study area added. Select its boundary in the Inspector.':`${TYPES[type].title} added. Connect its ports to the workflow.`);
  });
}
function title(n:WorkflowNode){const t=TYPES[n.type];return `<div class="inspector-title ${t.color}"><span class="node-icon">${t.icon}</span><div><h2>${esc(n.params.label||t.title)}</h2><p>${esc(t.group)} / ${esc(n.id)}</p></div></div>`;}
/** How a practitioner is looking at one input's records, per node and per session.
 *
 *  Deliberately NOT part of the workflow. Which view somebody prefers and how many rows they
 *  want in front of them is about reading, not about what the workflow computes, so it does not
 *  travel in the file and does not make the workflow dirty. */
const dataViews=new Map<string,{mode:'table'|'json';rows:number}>();
const ROW_CHOICES=[10,25,50,200];

/** The records themselves, as columns and rows or as the JSON they really are.
 *
 *  The practitioner, 2026-10-15, on a step whose rules would not compile: *"I cannot make sense
 *  of the green error dialog because I cannot see the columns against which rules are made."*
 *  This panel used to list twelve record NAMES and nothing else -- not a column, not a value --
 *  while the Inspector next door asked which column meant which field and the rule editor asked
 *  what to compare. Every one of those questions is about the columns, and the columns were the
 *  one thing never shown.
 *
 *  As a table because that is the shape the questions are in: a row is a record, a column is a
 *  field a rule can read, and the two line up with the bindings underneath. As JSON because a
 *  rule reads what is actually there -- a null, a number written as text, a key nobody expected
 *  -- and a table quietly tidies all three away. */
function recordsPanel(nodeId:string,data:{features:{id?:string|number;properties?:Record<string,unknown>;geometry?:unknown}[]}){
  const view=dataViews.get(nodeId)??{mode:'table' as const,rows:10};
  const features=data.features??[];
  const shown=features.slice(0,view.rows);
  const columns=[...new Set(shown.flatMap(f=>Object.keys(f.properties??{})))];
  const cell=(value:unknown)=>value===null||value===undefined||value===''
    // A missing value is shown AS missing rather than as an empty cell, because "no waiting time
    // recorded" is a case the rules have to handle and an empty cell reads like a tidy zero.
    ?`<em class="record-missing">not recorded</em>`:esc(String(value));
  const body=view.mode==='json'
    ?`<pre class="record-json">${esc(JSON.stringify(shown,null,2))}</pre>`
    :columns.length
      ?`<div class="record-table"><table><thead><tr><th>#</th>`
        +columns.map(c=>`<th>${esc(c)}</th>`).join('')+`</tr></thead><tbody>`
        +shown.map((f,i)=>`<tr><td>${i+1}</td>`
          +columns.map(c=>`<td>${cell(f.properties?.[c])}</td>`).join('')+`</tr>`).join('')
        +`</tbody></table></div>`
      :`<div class="notice">These records carry no columns beyond their location, so a rule reading a column has nothing to read.</div>`;
  return `<span class="inspector-section">The records</span>`
    +`<div class="record-controls">`
    +`<div class="result-switch" role="group" aria-label="How to view the records">`
    +(['table','json'] as const).map(mode=>`<button data-records-view="${mode}" class="${mode===view.mode?'active':''}">`
      +`${mode==='table'?'Table':'JSON'}</button>`).join('')
    +`</div>`
    +`<button class="button small" data-records-quicklook>⤢ Quick look</button>`
    +`<button class="button small" data-records-quality>◳ Data quality</button>`
    +`<label class="records-rows">Showing <select data-records-rows>`
    // Every choice up to and including the first one that covers the whole set, so a set of 13
    // offers 10 and 25 rather than only 10 -- "show me all of them" has to be reachable.
    +ROW_CHOICES.filter((n,i)=>n<features.length||i===0||ROW_CHOICES[i-1]<features.length)
      .map(n=>`<option value="${n}" ${n===view.rows?'selected':''}>${n}</option>`).join('')
    +`</select> of ${features.length}</label></div>`
    +body;
}

/** The node label, as a form with an Apply button.
 *
 *  The practitioner, 2026-10-20: *"The Find Health Facilities widget label cannot be changed like
 *  Study Area, Street Network and Map. Let's move to standardize the labeling with 'Apply Label'
 *  button."* Three different controls existed -- a study-area form, the catchment inspector's
 *  shared field, and a plain `source-label` input on the input widgets -- and a fourth widget had
 *  none at all. One shape now, so a practitioner learns the gesture once. */
/** THE TABLE ON A PORT, resolved without a successful run where that is possible.
 *
 *  The join dialog has to draw the thing being decided, and from 0.3.0 the run REFUSES while the
 *  decision is unmade -- so there is no run result to read, which is exactly when the practitioner
 *  needs the dialog. A `table_input` carries its table in its own params, melting its source file
 *  the way the run would so the dialog sees what the run will see. Anything further upstream needs
 *  a run that got that far, and null says so rather than drawing an empty frame.
 */
function tableOnPort(w:Workflow,nodeId:string,port:string):import('./data-table.js').DataTable|null{
  const edge=w.edges.find(e=>e.to===nodeId&&e.port===port);
  const from=edge&&w.nodes.find(x=>x.id===edge.from);
  if(!from)return null;
  if(from.type==='table_input'){
    const p=from.params;
    if(p.convertOnRun&&p.sourceTable&&p.wide)
      return wideDataTable(p.sourceTable,
        {...p.wide,valueField:p.valueField,...(p.unit?{unit:p.unit}:{})});
    return p.data.rows.length?p.data:null;
  }
  return result?.tables?.[from.id]??null;
}
function labelForm(id:string,caption:string,value:string,maxLength=60):string{
  return `<form class="field" data-label-form="${id}"><label class="field-label" for="${id}">${caption}</label>`
    +`<input id="${id}" maxlength="${maxLength}" value="${esc(value)}">`
    +`<button type="submit" class="button small">Apply label</button></form>`;
}
/** HOW BROAD THIS WORKFLOW'S STUDY AREA IS, in kilometres, or undefined when nothing says.
 *
 *  Decides which basemaps are worth offering: the practitioner's rule of 2026-10-27, *"the
 *  breadth of the study area should dictate the type of basemap used"*. Measured from the
 *  coordinates the workflow actually carries -- `workflowPositions` is the same derivation the
 *  UTM advice uses, so the two cannot disagree about where the work is.
 *
 *  Undefined rather than zero when there are no coordinates yet: a canvas being built has no
 *  breadth, and withholding a choice because nothing has been measured is guessing in the other
 *  direction. */
function workflowSpanKm():number|undefined{
  const positions=workflowPositions(workflow);
  if(!positions.length)return undefined;
  let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
  for(const [lon,lat] of positions){
    if(!Number.isFinite(lon)||!Number.isFinite(lat))continue;
    west=Math.min(west,lon);east=Math.max(east,lon);
    south=Math.min(south,lat);north=Math.max(north,lat);
  }
  if(!Number.isFinite(west)||!Number.isFinite(south))return undefined;
  return extentSpanKm([west,south,east,north]);
}

function renderInspector(){
  if(selected?.startsWith('result:')){renderEvidence(selected.slice(7));return;}
  if(exampleKey(workflow)==='blank'&&!workflow.nodes.some(n=>n.id===selected)){$('#inspector-content').innerHTML='<div class="inspector-body"><span class="inspector-section">Developmental evaluation · step 1</span><h2>Define the study area</h2><p class="description">Add Study area, then select the node to draw a bounding box or polygon on an online map.</p><div class="rule-preview">Predict what the selection will produce, inspect the N3 facts, then run the readiness rule.</div><p class="muted">Your other worked examples remain saved separately.</p></div>';return;}
  const n=workflow.nodes.find(n=>n.id===selected);if(!n){$('#inspector-content').innerHTML=`<div class="inspector-body"><h2>Your analysis, connected.</h2><p class="description">Choose a node to inspect its settings, or select a result to inspect its evidence.</p><div class="notice">${exampleKey(workflow).startsWith('snow-')?'Historical case-study locations; modeled catchments. Inspect a processing node to compare its assumptions.':exampleKey(workflow)==='old-naledi'?'Real source boundary and historical facilities; generated sample locations. Select Facility access to explore the assumptions.':'The heat example uses synthetic neighborhoods and illustrative screening criteria.'}</div></div>`;return;}
  // ONE SHAPE FOR EVERY PANEL: title, one line of what it does, the way in for a learner, then the
  // controls. The two links used to sit after whatever alerts a run had raised, so their position
  // moved with the state of the workflow and their size said they were an afterthought.
  let content=title(n)+`<p class="description">${esc(n.type==='map_output'&&n.params.inputMode==='raster'?'Display native raster cells and the clipping boundary':TYPES[n.type].description)}. ${n.type==='policy'?'Turn computed spatial evidence into explicit, inspectable conclusions.':''}</p>`
    +learnBlock(n.type,esc,hasManual(n.type)?n.type:'');
  const alert=nodeAlert(n.id);
  // The heading names what was found. It read "Out of bounds" for every alert, which is right for
  // a site the streets could not reach and wrong for a field nobody filled in: a declaration gap
  // is not a geometry problem and the columns are not distances. 2026-10-15.
  const gapsOnly=!!alert&&!!alert.gaps?.length&&!alert.unconnected.length&&!alert.offNetwork.length;
  // A third heading, because a value the rules could not read is neither a geometry problem nor
  // something nobody declared: the data is there and this step could not use it.
  const issuesOnly=!!alert&&!!alert.dataIssues?.length&&!alert.gaps?.length
    &&!alert.unconnected.length&&!alert.offNetwork.length;
  if(alert)content+=`<div class="inspector-alert" role="alert"><strong>${issuesOnly?'Read as not recorded':gapsOnly?'Not declared':'Out of bounds'} · ${esc(alertHeadline(alert))}</strong><p>${esc(alertText(alert))}</p><table><thead><tr><th>${gapsOnly?'Field':'Site'}</th><th>What happened</th><th>${gapsOnly?'What is missing':'Distance'}</th></tr></thead><tbody>${alertRows(alert).map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.outcome)}</td><td>${esc(r.detail)}</td></tr>`).join('')}</tbody></table>${dirty?'<p class="muted">From the previous run — rerun after changes.</p>':''}</div>`;
  content+=diveDeeperPanel(n.type,esc);
  if(n.type==='micro_workflow'){
    const pin=n.params.composition;
    const found=bundledCompositions().find(c=>c.id===pin.id&&c.version===pin.version);
    const drift=found?detectDrift(found,widgetRegistry).filter(d=>d.state!=='unchanged'):[];
    content+=`<div class="notice">${esc(found?found.description:'')}</div>`
      +`<dl class="facts"><dt>Composition</dt><dd><code>${esc(pin.nodeType)}</code> ${esc(pin.version)}</dd>`
      +`<dt>Stage</dt><dd>${esc(pin.stage)}</dd>`
      +`<dt>Governance</dt><dd>${esc(found?found.governance.status:'unknown')}`
      +`${found&&found.governance.status!=='admitted'?' · not reviewed by a human':''}</dd>`
      +`<dt>Steps</dt><dd>${found?found.members.map(m=>esc(m.type)).join(' → '):'unavailable in this build'}</dd></dl>`
      +(found?'':`<div class="notice warn">This build does not carry ${esc(pin.id)} ${esc(pin.version)}, so this step cannot run or be exploded.</div>`)
      +(drift.length?`<div class="notice warn">${drift.map(d=>esc(d.detail)).join(' ')}</div>`:'')
      +(found?found.parameters.map(parameter=>{
        const value=n.params.parameters[parameter.name];
        const member=parameter.members.map(m=>m.node).join(', ');
        return `<label class="field-label" for="micro-${esc(parameter.name)}">${esc(parameter.title)}`
          +`<small> · ${esc(member)}</small></label>`
          +(typeof parameter.default==='number'
            ?`<input id="micro-${esc(parameter.name)}" type="number" data-micro-param="${esc(parameter.name)}" value="${esc(String(value))}">`
            :`<input id="micro-${esc(parameter.name)}" data-micro-param="${esc(parameter.name)}" value="${esc(String(value))}">`);
      }).join(''):'')
      +(found?`<button class="button" id="micro-explode">Explode into ${found.members.length} steps</button>`
        +`<p class="muted">Exploding replaces this node with its primitives so each can be inspected and changed. It cannot be reassembled; Undo is the way back, because once a member's parameter changes the nodes are no longer this composition at this version.</p>`:'');
  }
  if(n.type==='mean_center'){
    content+=`<div class="notice">${n.params.weightField?.trim()?`Weighted by <strong>${esc(n.params.weightField.trim())}</strong>: each point counts in proportion to that attribute, and the receipt asserts the field and the weight total beside the point count.`:'Unweighted mean of projected point locations. Name an attribute below to weight each point by it \u2014 250 addresses carrying 489 deaths have two different centres.'} The computation uses UTM internally and emits one CRS84 center; it does not create a projected point dataset. Keep source and result private when locations are sensitive.</div><div class="field"><label class="field-label" for="mean-center-weight">Weight each point by this attribute (optional)</label><input id="mean-center-weight" data-slr="weightField" maxlength="60" value="${esc(n.params.weightField||'')}" placeholder="DEATHS"><p class="description">Leave empty for one point, one vote. A missing, non-numeric or negative weight is refused and counted; zero is kept, because a house where nobody died contributes no deaths.</p></div><label class="field-label" for="mean-center-zone">WGS84 UTM zone</label><input id="mean-center-zone" type="number" min="1" max="60" value="${n.params.zone}"><label class="field-label" for="mean-center-hemisphere">Hemisphere</label><select id="mean-center-hemisphere"><option value="north" ${n.params.hemisphere==='north'?'selected':''}>North</option><option value="south" ${n.params.hemisphere==='south'?'selected':''}>South</option></select><label class="field-label" for="mean-center-points">Point input</label><select id="mean-center-points" data-map-port="points"><option value="">Select input</option>${workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)==='points').map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port==='points'&&e.from===x.id)?'selected':''}>${esc(x.params.label||x.id)}</option>`).join('')}</select>`;
  }else if(n.type==='compare_point_sets'||n.type==='comparison_map'){
    if(n.type==='compare_point_sets')content+=`<div class="notice">Connect a Mean center widget to each branch. Both centers must use this UTM CRS and have matching source counts. Original and moved locations stay private.</div><label class="field-label" for="comparison-zone">WGS84 UTM zone</label><input id="comparison-zone" type="number" min="1" max="60" value="${n.params.zone}"><label class="field-label" for="comparison-hemisphere">Hemisphere</label><select id="comparison-hemisphere"><option value="north" ${n.params.hemisphere==='north'?'selected':''}>North</option><option value="south" ${n.params.hemisphere==='south'?'selected':''}>South</option></select><p class="description">Distances to the nearest pump and between centers are measured in metres. Pump locations are geographic context.</p>`;
    else content+='<div class="notice">Private evaluation map: both panels share one extent and scale. This view displays existing comparison results and includes original coordinates.</div>';
    content+=nodeInputs(n).map(([port,type])=>`<label class="field-label" for="comparison-port-${port}">${({original:'Original points',moved:'Moved points',pumps:'Reference pumps',originalCenter:'Original mean center',movedCenter:'Moved mean center',comparison:'Comparison result'} as Record<string,string>)[port]}</label><select id="comparison-port-${port}" data-map-port="${port}"><option value="">Select input</option>${workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)===type).map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port===port&&e.from===x.id)?'selected':''}>${esc(x.params.label||x.id)}</option>`).join('')}</select>`).join('');
  }else if(n.type==='donut_geomask'||n.type==='aggregate_points_to_h3_cell'){
    content+=`<div class="notice">Educational transformation only. The private source remains in the project and run evidence. No anonymity claim.</div>`;
    content+='<details><summary>How does this geoprivacy method work? (?)</summary><p>Map encryption and its calibration are planned, not executable here. See the <a href="https://git.cdc.gov/jupyterlite/2026-Map-Encryption-Library" target="_blank" rel="noopener noreferrer">geoprivacy notebooks</a>.</p></details>';
    if(n.type==='donut_geomask')content+=`<label class="field-label" for="privacy-innerM">Inner radius (m)</label><input id="privacy-innerM" type="number" min="0" max="5000" value="${n.params.innerM}"><label class="field-label" for="privacy-outerM">Outer radius (m)</label><input id="privacy-outerM" type="number" min="1" max="5000" value="${n.params.outerM}"><label class="field-label" for="privacy-seed">Demonstration seed</label><input id="privacy-seed" type="number" min="0" max="4294967295" value="${n.params.seed}"><p class="description">Output names and IDs are generated afresh; original attributes are not copied. The seeded generator is predictable and unsuitable as a production privacy control.</p>`;
    else content+=`<label class="field-label" for="privacy-resolution">H3 resolution</label><input id="privacy-resolution" type="number" min="0" max="15" value="${n.params.resolution}"><label class="field-label" for="privacy-minOccupancy">Minimum locations per released cell</label><input id="privacy-minOccupancy" type="number" min="2" max="100" value="${n.params.minOccupancy}"><p class="description">Counts locations, not deaths. Sparse cells are omitted; occupancy alone does not establish anonymity.</p>`;
    content+=`<label class="field-label" for="privacy-point-source">Point input</label><select id="privacy-point-source" data-map-port="points"><option value="">Select input</option>${workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)==='points').map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port==='points'&&e.from===x.id)?'selected':''}>${esc(x.params.label||x.id)}</option>`).join('')}</select>`;
  }else if(Object.hasOwn(CATCHMENT_TYPES,n.type)||n.type==='buffer_area'||n.type==='reachable_nodes'){
    if(n.type==='buffer_area')content+='<label class="field-label" for="catchment-distanceM">Buffer distance (metres)</label><input type="number" id="catchment-distanceM" data-catchment-param="distanceM" min="0" max="5000" value="'+n.params.distanceM+'"><p class="notice">Connect this expanded boundary to Street network. Keep the original Study area for reporting and polygon clipping. A buffer reduces edge effects but does not guarantee complete access coverage.</p>';
    // The study area is handed to the Inspector so a downloaded network can be seen against the
    // ground it was asked for. previewArea throws when nothing is connected, which is a legitimate
    // state: the caption then says coverage is unknown rather than implying it is complete.
    let previewBoundary,previewBoundaryID;
    try{
      const area=n.type==='network_input'?previewArea(workflow,n.id):undefined;
      previewBoundary=area?.boundary;
      // The LEVEL of the connected area, which is what decides the travel mode a province needs.
      previewBoundaryID=area?.node.params.source==='drawn'?area.node.params.boundary?.boundaryID:undefined;
    }catch{previewBoundary=undefined;previewBoundaryID=undefined;}
    content+=catchmentInspector(n,esc,previewBoundary,previewBoundaryID)+nodeInputs(n).map(([port,type])=>`<div class="field"><label class="field-label" for="catchment-port-${port}">${esc(port)}</label><select id="catchment-port-${port}" data-map-port="${port}"><option value="">Select input</option>${workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)===type).map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port===port&&e.from===x.id)?'selected':''}>${esc(x.params.label||TYPES[x.type].title)}</option>`).join('')}</select></div>`).join('');
  }else if(n.type==='map_output'){
    // No Input mode. A map draws the layers it is given, and the practitioner wires what they
    // have: one source picker per layer port, every port always present. The selector this
    // replaces asked a question about shape before the practitioner had the shape, and it decided
    // which ports existed, whether a presentation could be chosen, and whether a basemap was on
    // offer -- which is why removing it answers four separate reports at once.
    //
    // The practitioner's direction, 2026-10-14: "there is no such thing as mode, only layers."
    // Written into docs/widget-specs/map_output.md that day and into the code on 2026-10-15, after
    // "I thought we got rid of mode!"
    const wiredPorts=nodeInputs(n).filter(([port])=>workflow.edges.some(e=>e.to===n.id&&e.port===port));
    content+=`<span class="inspector-section">Layers</span>`
      +`<p class="description">Connect what you want drawn. ${wiredPorts.length?`${wiredPorts.length} layer source${wiredPorts.length===1?'':'s'} connected; the map draws what it is given, ground first.`:'Nothing is connected yet, so this map has nothing to draw.'}</p>`
      // One picker per layer the map draws, and one more to add another -- rather than a control
      // for every port the contract declares. The practitioner's direction, 2026-10-15.
      +nodeInputs(n).map(([port,type])=>{
        if(!workflow.edges.some(e=>e.to===n.id&&e.port===port))return '';
        const sources=workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)===type);
        return `<div class="field"><label class="field-label" for="map-${port}">${esc(port)}</label>`
          +`<select id="map-${port}" data-map-port="${port}"><option value="">Remove this layer</option>`
          +sources.map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port===port&&e.from===x.id)?'selected':''}>${esc(x.params.label||TYPES[x.type].title)}</option>`).join('')
          +`</select></div>`;
      }).join('')
      +(()=>{
        // The configurable one. It lists every result on the canvas this map could draw, whatever
        // type it is, and binds to the right port when chosen -- the Inspector half of the one
        // port on the node.
        const drawable=new Set(nodeInputs(n).map(([,type])=>type));
        const candidates=workflow.nodes.filter(x=>x.id!==n.id&&drawable.has(outputOf(x) as never));
        if(!candidates.length)return '';
        return `<div class="field"><label class="field-label" for="map-add-layer">Add a layer</label>`
          +`<select id="map-add-layer"><option value="">Choose a result to draw…</option>`
          +candidates.map(x=>`<option value="${esc(x.id)}">${esc(x.params.label||TYPES[x.type].title)} · ${esc(String(outputOf(x)))}</option>`).join('')
          +`</select><small>Any result this map can draw. The layer is connected to the port its type belongs to; a second point layer gets a slot of its own.</small></div>`;
      })()
      // A SYMBOL PER LAYER, chosen or left to the default. The practitioner, 2026-10-20: "So each
      // potential point layer in the map gets a configurable/selectable symbol." Only the point
      // layers actually wired are offered, because a control for a layer that does not exist is
      // a setting nobody can check against the picture.
      +`<span class="inspector-section">Layers</span>`
      +`<p class="muted">Ports receive; layers are displayed. Order them, name them as a reader should see them, and group the ones that belong together.</p>`
      +`<button class="button" data-manage-layers="${esc(n.id)}">Manage layers</button>`
      +(()=>{
        const sources=workflow.edges.filter(edge=>edge.to===n.id&&isPointPort(edge.port))
          .map(edge=>workflow.nodes.find(node=>node.id===edge.from)).filter(Boolean) as WorkflowNode[];
        if(!sources.length)return '';
        const chosen=n.params.layerSymbols||{};
        return `<span class="inspector-section">Layer symbols</span>`
          +`<p class="muted">Hue and mark say which source a point came from; whether it is filled says whether it is inside the study area. Marks are named as OGC Symbology Encoding names them.</p>`
          +sources.map((source,index)=>{
            const held=chosen[source.id],resolved=resolveLayerSymbol(index,held);
            return `<div class="field"><label class="field-label" for="layer-mark-${esc(source.id)}">${esc(source.params.label||TYPES[source.type].title)}</label>`
              +`<select id="layer-mark-${esc(source.id)}" data-layer-mark="${esc(source.id)}">`
              +`<option value="">Default \u00b7 ${esc(resolved.shape)}</option>`
              +LAYER_SHAPES.map(shape=>`<option value="${shape}" ${held?.mark===shape?'selected':''}>${shape}</option>`).join('')
              +`</select>`
              // SIZE BESIDE THE MARK IT SIZES. Density is a property of the data: eight pumps
              // across a borough want a mark a reader can find, and 250 addresses in four streets
              // want one small enough to leave gaps between them. One default cannot serve both,
              // and this figure holds both.
              +`<label class="field-label" for="layer-size-${esc(source.id)}">Mark radius</label>`
              +`<input id="layer-size-${esc(source.id)}" data-layer-size="${esc(source.id)}" type="range"`
              +` min="${MARK_RADIUS_MIN}" max="${MARK_RADIUS_MAX}" step="0.5" value="${resolved.size}">`
              +`<small>${resolved.size} units${held?.size===undefined?' (default)':''}. Smaller separates dense points; larger finds sparse ones.</small>`
              +`</div>`;
          }).join('');
      })()
      +`<div class="field"><label class="field-label" for="polygon-presentation">Presentation</label><select id="polygon-presentation" data-catchment-param="presentation"><option value="plot" ${n.params.presentation!=='interactive'?'selected':''}>Static plot (SVG)</option><option value="interactive" ${n.params.presentation==='interactive'?'selected':''}>Interactive map</option></select></div>`
      +`<div class="field"><label class="field-label" for="map-label">Results tab name</label><input id="map-label" maxlength="60" value="${esc(n.params.label)}"></div>`
      // Shown when decisions are wired, as before: a reasoning result reads as a map, a table or
      // a chart, and this switches which. It used to be gated on the map being in decisions MODE.
      +(workflow.edges.some(e=>e.to===n.id&&e.port==='decisions')
        ?`<div class="field"><label class="field-label" for="output-view">Display as</label><select id="output-view"><option value="map" selected>Map</option><option value="table">Table</option><option value="bars">Chart</option></select></div>`
        :'');
    content+=mapControls(n);
  }else if(['table_output','chart_output'].includes(n.type)&&'inputMode' in n.params&&n.params.inputMode==='polygons'){
    content+=`<label class="field-label" for="catchment-output-mode">Input mode</label><select id="catchment-output-mode"><option value="polygons">Catchment polygons / summaries</option><option value="${n.type==='chart_output'?'decisions':'spatial'}">${n.type==='chart_output'?'Reasoning results':'Point layers'}</option></select><label class="field-label" for="polygon-source">Polygon input</label><select id="polygon-source" data-map-port="polygons"><option value="">Select input</option>${workflow.nodes.filter(x=>outputOf(x)==='polygons').map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.from===x.id)?'selected':''}>${esc(x.params.label||TYPES[x.type].title)}</option>`).join('')}</select><label class="field-label" for="polygon-output-label">Results tab name</label><input id="polygon-output-label" maxlength="60" value="${esc(n.params.label||'')}"><p class="notice">Connect a polygon operation. Charts require Summarize points in polygons. Display only; processing parameters belong to upstream nodes.</p>`;
    // map_output has its own branch above and is no longer reached here.
    if(n.type==='chart_output')content+=chartControls(n);
    // nor here: a map's communication controls are in its own branch.
  }else if(n.type==='table_output'){

    // WHAT IS WIRED, NOT WHAT IT WAS TOLD. The selector that used to sit here asked the
    // practitioner the shape of a thing before they had it, and cleared their connections when
    // they answered. `a-map-has-layers-not-modes` removed it from the map on 2026-10-15 and left
    // it here, where it refused a Relate-a-column connection on 2026-10-27.
    const mode=shownMode(n,workflow.edges);
    const outputType='table',reasoning=mode==='decisions',raster=false,tabular=mode==='table';
    content+=`<p class="description">Every port a table can show is offered. What you connect `
      +`decides how it is shown: a keyed table, catchment polygons, reasoning results, or point `
      +`layers. Nothing to set first, and connecting removes nothing.</p>`;
    if(reasoning)content+=`<div class="field"><label class="field-label" for="output-view">Display as</label><select id="output-view"><option value="map">Map</option><option value="table" selected>Table</option><option value="bars">Chart</option></select></div>`;
    content+=`<div class="field"><label class="field-label" for="${outputType}-label">Results tab name</label><input id="${outputType}-label" maxlength="60" value="${esc(n.params.label)}"></div><p class="description">${tabular?'Showing a keyed table.':reasoning?'Showing reasoning results.':mode==='polygons'?'Showing polygon layers and their summaries.':'Nothing connected yet \u2014 connect whatever you have.'}</p>`;
    content+=nodeInputs(n).map(([port,type])=>{const edge=workflow.edges.find(e=>e.to===n.id&&e.port===port);return `<div class="field"><label class="field-label" for="${outputType}-${port}">${({area:'Study area',coverage:'Or: spatial coverage check',decisions:'Reasoning result',table:'Tabular data',raster:raster?'Raster':'Or: Raster',network:'Street network'}[port]||'Point data '+(port==='points'?1:port.split('_')[1]))}</label><select id="${outputType}-${port}" data-map-port="${port}"><option value="">Select input</option>${workflow.nodes.filter(x=>outputOf(x)===type).map(x=>`<option value="${esc(x.id)}" ${edge?.from===x.id?'selected':''}>${esc(x.params.label||TYPES[x.type].title)} · ${esc(x.id)}</option>`).join('')}</select></div>`;}).join('');
    // THE MARGINS AN EPIDEMIOLOGIST READS FIRST, and the claim that earns them. A grid totals
    // where the table states a unit, which Snow's Table IX correctly does not: as imported it
    // holds houses beside deaths. Selecting two measures that both count houses makes the cells
    // addable and nothing in the table records it, so the claim is made here, by the person
    // composing the figure. Offered only for a tabular output, and only where the table does not
    // already say it. 2026-10-26.
    if(tabular&&!tableUnitFor(n))
      content+=`<label class="check"><input type="checkbox" id="output-totals" `
        +`${n.params.totalsAsserted?'checked':''}> Show totals: these values count the same thing</label>`
        +`<p class="description">A 2&times;2 is read with its margins. Tick this only where every `
        +`cell counts the same thing — deaths beside houses without a death both count houses, `
        +`deaths beside population do not. The figure says that you asserted it, because nothing `
        +`here can check it.</p>`;
    content+=tabular?'<div class="notice">Rows are shown as imported, with absent values displayed as unknown and an unstated unit named as unstated. Search covers every key column and the value. Works offline.</div>':raster?'<div class="notice">Colors show relative cell values; gray cells are NoData. Download GeoTIFF preserves native values and georeferencing.</div>':reasoning?'<div class="notice">This is a presentation of existing results, with no new inference or exclusion.</div>':outputType==='table'?'<div class="notice">Rows include coordinates and all point attributes. Missing coordinates and excluded records remain visible. Search covers all rows and attributes; large tables use row and attribute pages. Works offline.</div>':'<div class="notice">The map fits the polygon and every located point, including outside records. Missing coordinates appear in a selectable list. This local map works offline.</div>';
    // map_output has its own branch above; this one is table_output alone.
  }else if(n.type==='polygon_input'){
    // The connected study area, which scopes an acquisition. `previewArea` throws when nothing is
    // connected, and that is a legitimate state: a layer read from a file needs no area at all,
    // which is why the port is optional. The panel then says the box cannot be worked out,
    // instead of implying a read would cover something.
    let areaBoundary;
    try{areaBoundary=previewArea(workflow,n.id).boundary;}catch{areaBoundary=undefined;}
    content+=polygonInputInspector(n,esc,areaBoundary,
      workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)==='area')
        .map(x=>({id:x.id,label:x.params.label||TYPES[x.type].title})),
      workflow.edges.find(e=>e.to===n.id&&e.port==='area')?.from);
  }else if(n.type==='map_image_input'){
    content+=mapImageInspector(n,esc);
  }else if(n.type==='table_input'){
    const p=n.params;
    content+='<section class="source-card"><span class="inspector-section">Table contract</span>'
      +`<div class="detail-row"><span>Key columns</span><strong>${p.keys.length?esc(p.keys.join(', ')):'none chosen'}</strong></div>`
      +`<div class="detail-row"><span>Value column</span><strong>${p.valueField?esc(p.valueField):'none chosen'}</strong></div>`
      +`<div class="detail-row"><span>Unit</span><strong>${p.unit?esc(p.unit):'unstated'}</strong></div>`
      +'<div class="detail-row"><span>Geometry</span><strong>None; a table is not a point set</strong></div>'
      +'</section><button id="open-table" class="button primary">Import tabular data</button>'
      +(p.data.rows.length&&!workflow.edges.some(e=>e.from===n.id)?'<div class="inspector-actions"><button id="add-table-view" class="button small">＋ Display as table</button></div>':'')
      // CONVERT ON RUN, offered only where there is a source and a selection to convert with.
      //
      // The practitioner, 2026-10-27, on the worked examples: can the conversion be "a check box
      // and wide table conversion happens during the workflow run". It can, and the reason to
      // want it is not the checkbox -- it is that a melt done once in a dialog leaves nothing
      // behind, while a melt done by the run is a step with a receipt naming every column taken.
      // The example that prompted it ships 52,619 bytes of melted tables whose source CSVs are
      // 3,972, and could not say which columns made them.
      +(p.sourceTable?`<label class="field"><input id="table-convert-on-run" type="checkbox" `
        +`${p.convertOnRun?'checked':''}> Convert the source table on each run</label>`
        +`<p class="description">The file is kept as published -- ${p.sourceTable.rows.length} `
        +`row${p.sourceTable.rows.length===1?'':'s'} of ${p.sourceTable.headers.length} columns -- `
        +`and melted when the workflow runs, so the run's receipt names the columns it took. `
        +`Unchecked, the table stored at import is used and the source is kept only as provenance.</p>`:'')
      +'<p class="description">Reads a long-format CSV: one row per observation, with the key columns you choose and one value column. Every key tuple must be unique, so a wide table or a missing key column is refused rather than silently collapsed.</p>';
    // The table itself, at a width it can be read at. The Inspector is 292px wide and this
    // offered a description of the table's shape inside it -- everything about the table except
    // the table. The practitioner's call, 2026-10-16.
    if(p.data.rows.length)content+=`<div class="inspector-actions"><button id="quick-look" class="button">Quick look at the table</button>`
      +`<button id="table-quality" class="button">Data quality</button></div>`
      +`<p>${esc(p.source?.filename||'Imported file')}<br>${p.data.rowCount} rows, ${p.data.missingValueCount} values absent and kept as unknown.</p><details><summary>Table shape</summary><pre>${esc(JSON.stringify({keys:p.data.keys,valueField:p.data.valueField,unit:p.data.unit||'(unstated)',rows:p.data.rowCount,source:p.source},null,2))}</pre></details>`;
    else content+='<p class="description">No table imported yet. This node cannot run until a table is imported.</p>';
    content+='<div class="notice">A unit is recorded as you state it and never inferred. An absent value is kept as unknown, never read as zero. Connect a Table output to display it.</div>';
  }else if(n.type==='join_table_to_area'){
    // THE KEY COLUMN IS OFFERED, NOT TYPED. The columns are on the connected table, so a
    // practitioner picks one rather than spelling it and discovering the mismatch at the run.
    const upstream=workflow.edges.find(edge=>edge.to===n.id&&edge.port==='records');
    const source=upstream?workflow.nodes.find(node=>node.id===upstream.from):undefined;
    const columns=tableKeyColumns(source);
    content+=labelForm('join-label','Node label',n.params.label||'Values on the study area')
      +`<label class="field-label" for="join-key">Column naming each part</label>`
      +`<select id="join-key"${columns.length?'':' disabled'}>`
      +`<option value="">${columns.length?'Choose a column…':'Connect a table first'}</option>`
      +columns.map(column=>`<option value="${esc(column)}" ${n.params.keyField===column?'selected':''}>${esc(column)}</option>`).join('')
      +`</select>`
      +`<label class="field-label" for="join-normalisation">Match names</label>`
      +`<select id="join-normalisation">`
      +`<option value="fuzzy" ${n.params.normalisation==='fuzzy'?'selected':''}>Ignoring punctuation and spacing</option>`
      +`<option value="exact" ${n.params.normalisation==='exact'?'selected':''}>Exactly as written</option>`
      +`</select>`
      +`<p class="description">Names are compared for equality, never for resemblance. Ignoring punctuation is what matches "St. George, Camberwell" to "St. George  Camberwell"; it will not match an abbreviation to a full name, and says so rather than guessing.</p>`
      +`<div class="notice">A part no row names is drawn and left empty. Two parts sharing a name both take the value, which is true of a rate and is not true of a count.</div>`;
  }else if(n.type==='derive_value'){
    const p=n.params,shape=upstreamKeyValues(n),columns=Object.keys(shape??{});
    const held=shape?.[p.keyColumn]??[];
    const picker=(id:string,key:'left'|'right',label:string)=>
      `<div class="field"><label class="field-label" for="${id}">${label}</label>`
      +(held.length
        ?`<select id="${id}" data-slr="${key}"><option value="">Choose a value…</option>`
          +held.map(value=>`<option value="${esc(value)}" ${p[key]===value?'selected':''}>${esc(value)}</option>`).join('')
          +`</select>`
        :`<input id="${id}" data-slr="${key}" maxlength="80" value="${esc(p[key])}" placeholder="houses">`)
      +`</div>`;
    content+='<p class="description">Computes a new value from two values already in the table, once for each group of rows that share the other key columns. A table here is long — one value per row — so the two numbers it combines are two rows, not two columns.</p>'
      +labelForm('derive-label','Node label',p.label||'Derive a value')
      +`<div class="field"><label class="field-label" for="derive-key">Key column holding the values</label>`
      +`<select id="derive-key" data-slr="keyColumn"${columns.length?'':' disabled'}>`
      +(columns.length?'':`<option value="${esc(p.keyColumn)}">Connect a table first</option>`)
      +columns.map(column=>`<option value="${esc(column)}" ${p.keyColumn===column?'selected':''}>${esc(column)}</option>`).join('')
      +`</select></div>`
      +picker('derive-left','left','First value')
      +`<div class="field"><label class="field-label" for="derive-operator">Operation</label>`
      +`<select id="derive-operator" data-slr="operator">`
      +Object.entries(OPERATORS).map(([key,op])=>`<option value="${key}" ${p.operator===key?'selected':''}>${esc(op.label)}</option>`).join('')
      +`</select></div>`
      +picker('derive-right','right','Second value')
      +`<div class="field"><label class="field-label" for="derive-name">Name for the derived value</label>`
      +`<input id="derive-name" data-slr="name" maxlength="80" value="${esc(p.name)}" placeholder="houses without a death"></div>`
      +'<div class="notice">A group missing either value gets no derived row and is named in the evidence, because a group whose first value nobody recorded has an unknown result, not a zero. A name the column already uses is refused, since two rows would then share a key. Dividing by zero is unknown rather than infinite.</div>';
  }else if(n.type==='select_rows'){
    const p=n.params,shape=upstreamKeyValues(n),columns=Object.keys(shape??{});
    const held=shape?.[p.keyColumn]??[];
    content+='<p class="description">Keeps only the rows whose chosen column holds one of the values you name, in the order you name them. What a figure should show is often less than what a table carries.</p>'
      +labelForm('select-label','Node label',p.label||'Select rows by value')
      +`<div class="field"><label class="field-label" for="select-key">Key column to choose by</label>`
      +`<select id="select-key" data-slr="keyColumn"${columns.length?'':' disabled'}>`
      +(columns.length?'':`<option value="${esc(p.keyColumn)}">Connect a table first</option>`)
      +columns.map(column=>`<option value="${esc(column)}" ${p.keyColumn===column?'selected':''}>${esc(column)}</option>`).join('')
      +`</select></div>`
      +(held.length
        ?`<span class="inspector-section">Values to keep</span>`
          +held.map(value=>`<label class="check"><input type="checkbox" data-select-value="${esc(value)}" `
            +`${p.values.includes(value)?'checked':''}> ${esc(value)}</label>`).join('')
        :`<div class="field"><label class="field-label" for="select-values">Values to keep, one per line</label>`
          +`<textarea id="select-values" data-select-text rows="3">${esc(p.values.join('\n'))}</textarea></div>`)
      +'<div class="notice">A value this table does not hold is reported rather than ignored, because asking for a row that is not there is usually a typo or a changed table upstream. Keeping nothing the table holds is refused instead of returning an empty table.</div>';
  }else if(n.type==='relate_table'){
    const p=n.params,here=upstreamKeyValues(n)??{},there=upstreamKeyValues(n,new Set(),'related')??{};
    const shared=Object.keys(here).filter(column=>column in there);
    const bringable=Object.keys(there).filter(column=>column!==p.on&&!(column in here));
    const picker=(id:string,key:'on'|'bring',label:string,options:string[],empty:string)=>
      `<div class="field"><label class="field-label" for="${id}">${label}</label>`
      +`<select id="${id}" data-slr="${key}"${options.length?'':' disabled'}>`
      +(options.length?`<option value="">Choose a column…</option>`:`<option value="${esc(p[key])}">${esc(empty)}</option>`)
      +options.map(column=>`<option value="${esc(column)}" ${p[key]===column?'selected':''}>${esc(column)}</option>`).join('')
      +`</select></div>`;
    content+='<p class="description">Brings a category from a second table onto these rows, matched on a column both tables carry. A table here is long, so a category can only be a key column — it lands on every row and the row count does not change.</p>'
      +labelForm('relate-label','Node label',p.label||'Relate a column from another table')
      +nodeInputs(n).map(([port,type])=>`<div class="field"><label class="field-label" for="relate-${port}">`
        +`${port==='records'?'Table being added to':'Table read from'}</label>`
        +`<select id="relate-${port}" data-map-port="${port}"><option value="">Select input</option>`
        +workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)===type).map(x=>`<option value="${esc(x.id)}" `
          +`${workflow.edges.some(e=>e.to===n.id&&e.port===port&&e.from===x.id)?'selected':''}>`
          +`${esc(x.params.label||TYPES[x.type].title)}</option>`).join('')+`</select></div>`).join('')
      // ONLY THE SHARED COLUMNS are offered to match on, and only the second table's own columns
      // to bring across. A column the first table already has is excluded here rather than
      // refused on the run, because the refusal is correct and arrives three steps from the choice.
      +picker('relate-on','on','Matched on',shared,'Connect both tables first')
      +picker('relate-bring','bring','Bring across',bringable,'Connect both tables first')
      +(Object.keys(there).length&&!shared.length
        ?'<div class="notice notice-warning">These two tables share no key column, so there is nothing to match on. Check that both carry the same kind of key.</div>':'')
      +'<div class="notice">A second table giving one key two different values is refused rather than resolved, because choosing between them would produce a grouping that is wrong in a way no total reveals. A key the second table does not carry is named in the evidence and those rows are dropped, since an invented “unknown” would put a stratum in your table that nobody measured. The match is on the exact text: this is Epi Info’s RELATE and not its MATCH.</div>';
    // THE JOIN AS A DECISION, with the shape of it on the node and the deciding in a dialog.
    //
    // The band here is the glance -- the Inspector is 292px and a bar with three numbers fits it.
    // The decision does not fit, and from 2026-10-21 this project has a standing answer for that:
    // *"this really needs to be a modal dialog so the view is not limited by the inspector
    // panel."* So the band says what the shape is and whether a decision is outstanding, and the
    // dialog is where the preview and the choice live.
    const joinLeft=tableOnPort(workflow,n.id,'records');
    const joinRight=tableOnPort(workflow,n.id,'related');
    if(joinLeft&&joinRight&&p.on&&p.bring){
      const request={on:p.on,bring:p.bring,
        ...(p.normalisation?{normalisation:p.normalisation}:{}),
        ...(p.measureKey?{measureKey:p.measureKey}:{})};
      let planned:ReturnType<typeof relateShape>|{refusal:string};
      try{planned=relateShape(joinLeft,joinRight,request);}
      catch(error){planned={refusal:errorMessage(error)};}
      content+='<div class="inspector-divider"></div><span class="inspector-section">The join</span>';
      if('refusal' in planned){
        content+=`<div class="notice notice-warning">${esc(planned.refusal)}</div>`;
      }else{
        const {leftOnly,matched,rightOnly}=planned.overlap;
        const total=leftOnly+matched+rightOnly||1;
        const seg=(count:number,kind:string)=>count
          ?`<div class="overlap-seg overlap-${kind}" style="flex:0 0 ${Math.max(count/total*100,7)}%">`
            +`<strong>${count.toLocaleString()}</strong></div>`:'';
        const decided=p.unmatched&&p.unmatched.signature===planned.signature?p.unmatched:undefined;
        content+=`<div class="overlap-bar">${seg(leftOnly,'left')}${seg(matched,'both')}`
          +`${seg(rightOnly,'right')}</div>`
          +`<p class="muted">${matched.toLocaleString()} ${esc(p.on)}`
          +`${matched===1?'':'s'} in both`
          +(leftOnly?`, ${leftOnly.toLocaleString()} only in ${esc(portSourceName(workflow,n.id,'records','the first table'))}`:'')
          +(rightOnly?`, ${rightOnly.toLocaleString()} only in ${esc(portSourceName(workflow,n.id,'related','the second table'))}`:'')
          +`. Keys compared ${planned.normalisation==='fuzzy'?'with punctuation folded':'exactly'}.</p>`
          +(!planned.overlap.gaps.length
            ?'<div class="rule-preview">Nothing was left out, so there is no decision to make.</div>'
            :decided
              ?`<div class="rule-preview">Decided: `
                +(decided.decision==='drop'
                  ?`drop the unmatched rows`
                  :`keep them as \u201c${esc(decided.label??'')}\u201d`)
                +(decided.reason?` \u2014 ${esc(decided.reason)}`:'')+'.</div>'
              :`<div class="notice notice-warning">This join needs a decision before it can run: `
                +`${planned.overlap.gaps.length} key`
                +`${planned.overlap.gaps.length===1?'':'s'} in the first table `
                +`${planned.overlap.gaps.length===1?'has':'have'} no row in the second, and `
                +`dropping them gives different totals from keeping them.</div>`)
          +'<div class="inspector-actions"><button id="relate-open-join" class="button primary">'
          +'\u2922 Open the join</button></div>';
      }
    }else if(p.on&&p.bring){
      content+='<div class="inspector-divider"></div><span class="inspector-section">The join</span>'
        +'<p class="description">Run the workflow to look at the shape of this join. The tables '
        +'above this step are computed by a run, so there is nothing to measure yet.</p>';
    }
    // WHAT THE JOIN DID, before the table it produced.
    //
    // The four numbers were computed from the first commit of `relate-table.ts` and shown
    // nowhere: they went into the N3 receipt, which this project has already settled nobody
    // opens for this purpose. So a relate missing a third of its keys produced a table that
    // looked finished -- `rowCount` agreed with itself, the totals were internally consistent,
    // and the rows that left had left quietly.
    //
    // THE ORDER IS THE POINT. A pandas left join keeps the unmatched row and writes NaN, so the
    // reader meets the gap in the data. This application drops the row, which is the better
    // default for a stratification -- an invented "unknown" stratum is worse than a smaller
    // table -- and the worse one for anybody who only looks at the result. So the count comes
    // first and the data second, and the gap keys are named rather than totalled: "three keys
    // did not match" is a number, and `Rotherhithe` is something a practitioner can go and fix.
    const relation=result?.relations?.[n.id];
    if(relation){
      const left=portSourceName(workflow,n.id,'records','the first table');
      const right=portSourceName(workflow,n.id,'related','the second table');
      const row=(label:string,count:number,{emphasis=false}={})=>
        `<tr${emphasis?' class="emphasis"':''}><th scope="row">${esc(label)}</th>`
        +`<td>${count.toLocaleString()}</td>`
        +`<td>${relation.offered?`${(count/relation.offered*100).toFixed(count/relation.offered<0.01&&count?2:0)}%`:'\u2014'}</td></tr>`;
      content+=`<div class="inspector-divider"></div><span class="inspector-section">This run</span>`
        +`<table class="dedup-summary"><thead><tr><th>Rows</th><th>Count</th>`
        +`<th title="Of the rows the first table offered">% offered</th></tr></thead><tbody>`
        +row('Offered',relation.offered)
        +row('Related',relation.related,{emphasis:true})
        +row('Dropped',relation.dropped,{emphasis:!!relation.dropped})
        +`</tbody></table>`
        +(relation.dropped
          ?`<div class="notice notice-warning">${relation.dropped.toLocaleString()} row`
            +`${relation.dropped===1?'':'s'} left the table because `
            +`${esc(right)} carries no ${esc(relation.on)} of `
            +relation.gaps.map(g=>`<strong>${esc(g.key)}</strong>`).join(', ')
            +`. They are not in the result and nothing downstream counts them — a total over `
            +`this table is a total over ${relation.related.toLocaleString()} of `
            +`${relation.offered.toLocaleString()} rows.</div>`
          :`<div class="rule-preview">Every ${esc(relation.on)} in ${esc(left)} was found in `
            +`${esc(right)}. No row was dropped, so a total over this table is a total over the `
            +`whole of ${esc(left)}.</div>`)
        // THE NOTE THE RUN MACHINED, where the run made one. The dialog shows the note a
        // prospective choice would produce; this is the one that actually went into the evidence.
        +((result?.machined?.[n.id]??[]).length
          ?'<span class="inspector-section">Methods note</span>'
            +'<div class="machined-note">'
            +(result?.machined?.[n.id]??[]).map(note=>`<p>${esc(note.text)}</p>`).join('')
            +'</div>'
          :'')
        +`<span class="inspector-section">Columns</span>`
        +`<p class="muted">From ${esc(left)}: ${esc(relation.carried.join(', '))}. `
        +`Brought from ${esc(right)}: <strong>${esc(relation.bring)}</strong>`
        +(relation.values.length?`, holding ${relation.values.map(v=>esc(v)).join(', ')}`:'')
        +`.</p>`;
    }
  }else if(n.type==='group_table'){
    const p=n.params,shape=upstreamKeyValues(n),columns=Object.keys(shape??{});
    content+='<p class="description">Adds up the values of the rows that agree on the key columns you keep. The columns you do not keep are gone from the result.</p>'
      +labelForm('group-label','Node label',p.label||'Total within groups')
      +(columns.length
        ?`<span class="inspector-section">Key columns to keep</span>`
          +columns.map(column=>`<label class="check"><input type="checkbox" data-group-by="${esc(column)}" `
            +`${p.by.includes(column)?'checked':''}> ${esc(column)}</label>`).join('')
          +(p.by.length&&p.by.length===columns.length
            ?'<div class="notice notice-warning">Keeping every column means every row is already its own group, so nothing would be totalled. Leave out the column whose rows should be added up.</div>'
            :p.by.length?`<div class="notice">Dropping ${esc(columns.filter(c=>!p.by.includes(c)).join(', '))}.</div>`:'')
        :`<div class="field"><label class="field-label" for="group-by">Key columns to keep, one per line</label>`
          +`<textarea id="group-by" data-group-text rows="3">${esc(p.by.join('\n'))}</textarea></div>`)
      // Why KEPT and not dropped, said where the choice is made rather than only in the manual.
      +'<div class="notice">You name what is kept, not what is dropped, because files change: a column added later is simply dropped and you keep the same groups, where naming the dropped columns would let a new one silently become a grouping key. Only addition is offered — adding counts gives a count, while adding rates gives a number with no referent. A group holding any empty value totals to nothing known and is named in the evidence, because an unrecorded population should come out unknown rather than small.</div>';
  }else if(n.type==='two_by_two'){
    const p=n.params,shape=upstreamKeyValues(n),columns=Object.keys(shape??{});
    const valuesOf=(column:string)=>shape?.[column]??[];
    const column=(id:string,key:'exposureColumn'|'outcomeColumn',label:string)=>
      `<div class="field"><label class="field-label" for="${id}">${label}</label>`
      +`<select id="${id}" data-slr="${key}"${columns.length?'':' disabled'}>`
      +(columns.length?`<option value="">Choose a column…</option>`:`<option value="${esc(p[key])}">Connect a table first</option>`)
      +columns.map(name=>`<option value="${esc(name)}" ${p[key]===name?'selected':''}>${esc(name)}</option>`).join('')
      +`</select></div>`;
    const value=(id:string,key:'exposed'|'unexposed'|'caseValue'|'nonCaseValue',label:string,from:string,placeholder:string)=>{
      const held=valuesOf(from);
      return `<div class="field"><label class="field-label" for="${id}">${label}</label>`
        +(held.length
          ?`<select id="${id}" data-slr="${key}"><option value="">Choose a value…</option>`
            +held.map(v=>`<option value="${esc(v)}" ${p[key]===v?'selected':''}>${esc(v)}</option>`).join('')+`</select>`
          :`<input id="${id}" data-slr="${key}" maxlength="120" value="${esc(p[key])}" placeholder="${esc(placeholder)}">`)
        +`</div>`;
    };
    const unnamed=p.exposureColumn?valuesOf(p.exposureColumn)
      .filter(v=>v!==p.exposed&&v!==p.unexposed):[];
    content+='<p class="description">Risk in each group, the risk ratio, the odds ratio and the risk difference, each naming the method that produced it. The table must already be totalled: one row per combination of the exposure and the outcome.</p>'
      +labelForm('twobytwo-label','Node label',p.label||'Two-by-two table')
      +column('twobytwo-exposure','exposureColumn','Exposure column')
      +value('twobytwo-exposed','exposed','Exposed',p.exposureColumn,'the group a claim is being made about')
      +value('twobytwo-unexposed','unexposed','Unexposed',p.exposureColumn,'the group it is compared with')
      +column('twobytwo-outcome','outcomeColumn','Outcome column')
      +value('twobytwo-case','caseValue','Case',p.outcomeColumn,'died')
      +value('twobytwo-noncase','nonCaseValue','Non-case',p.outcomeColumn,'survived')
      +`<div class="field"><label class="field-label" for="twobytwo-level">Interval level</label>`
      +`<select id="twobytwo-level">`
      +[90,95,99].map(level=>`<option value="${level}" ${p.level===level?'selected':''}>${level}%</option>`).join('')
      +`</select></div>`
      // THE STRATUM LEFT OUT, said in the Inspector and not only on the result. Snow's
      // people-denominated table has three supply categories because 16 of 32 sub-districts were
      // supplied by both companies, and a practitioner choosing two of three should be told at
      // the moment they choose.
      +(unnamed.length
        ?`<div class="notice notice-warning">This table also holds ${esc(unnamed.join(', '))} in `
          +`${esc(p.exposureColumn)}. Those subjects are in neither group: they are excluded from `
          +`this comparison, not controlled for, and the totals will be of the two groups you chose `
          +`rather than of the table.</div>`:'')
      +'<div class="notice">Each estimate names its interval method — Katz log for the risk ratio, Wald log for the odds ratio, unpooled Wald for the risk difference — and none claims agreement with Epi Info, whose displayed labels for these quantities nobody here has verified. An empty cell is unknown rather than zero and is refused. A group with no cases has no risk ratio, and adding half a case to make one is an assumption rather than a measurement, so the estimate reports why it has no value while the ones that are still defined stand. The tests — chi-square, Mantel-Haenszel, Yates, Fisher, mid-P — are not built.</div>';
  }else if(n.type==='rate'){
    const p=n.params;
    const field=(id:string,label:string,key:string,value:string,placeholder='')=>`<div class="field"><label class="field-label" for="${id}">${label}</label><input id="${id}" data-slr="${key}" maxlength="80" value="${esc(value)}" placeholder="${esc(placeholder)}"></div>`;
    content+='<p class="description">Divides counted events by a declared population at risk. What the denominator counts is part of the result.</p>'
      // A denominator usually arrives as a table, not as points: Snow's two water companies are
      // rows, not places. The kind of input is stated here because it decides what the records
      // port will accept. Experiment 134.
      +`<div class="field"><label class="field-label" for="rate-source">Records arrive as</label><select id="rate-source" data-rate-source>${[['points','points, one per subject'],['table','a table, one row per measure']].map(([value,text])=>`<option value="${value}" ${(p.source||'points')===value?'selected':''}>${text}</option>`).join('')}</select></div>`
      +(p.source==='table'?field('rate-measure','Key column holding the measure names','measureKey',p.measureKey||'','measure'):'')
      +nodeInputs(n).map(([port,type])=>`<div class="field"><label class="field-label" for="rate-${port}">Records input</label><select id="rate-${port}" data-map-port="${port}"><option value="">Select input</option>${workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)===type).map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port===port&&e.from===x.id)?'selected':''}>${esc(x.params.label||TYPES[x.type].title)}</option>`).join('')}</select></div>`).join('')
      +field('rate-numerator','Numerator attribute (what is counted)','numeratorField',p.numeratorField,'deaths')
      +field('rate-denominator','Denominator attribute (units at risk)','denominatorField',p.denominatorField,'population')
      +`<div class="field"><label class="field-label" for="rate-unit">The denominator counts</label><select id="rate-unit" data-slr="denominatorUnit">${['people','houses','households','person-time','other'].map(u=>`<option value="${u}" ${p.denominatorUnit===u?'selected':''}>${u}</option>`).join('')}</select></div>`
      +`<div class="field"><label class="field-label" for="rate-kind">Kind</label><select id="rate-kind" data-slr="rateKind">${['proportion','ratio'].map(k=>`<option value="${k}" ${p.rateKind===k?'selected':''}>${k==='proportion'?'proportion — numerator is part of the denominator':'ratio — events per unit, may exceed one'}</option>`).join('')}</select></div>`
      +`<div class="field"><label class="field-label" for="rate-multiplier">Per</label><select id="rate-multiplier" data-rate-number="multiplier">${[1,100,1000,10000,100000].map(m=>`<option value="${m}" ${p.multiplier===m?'selected':''}>${m.toLocaleString()}</option>`).join('')}</select></div>`
      +field('rate-group','Group by attribute (optional)','groupBy',p.groupBy||'','distance_m')
      +`<div class="field"><label class="field-label" for="rate-band">Band width for a numeric grouping (optional)</label><input id="rate-band" type="number" min="0" data-rate-number="bandWidth" value="${p.bandWidth??''}"></div>`
      +`<div class="field"><label class="field-label" for="rate-minimum">Smallest denominator that gets a rate</label><input id="rate-minimum" type="number" min="0" data-rate-number="minimumDenominator" value="${p.minimumDenominator}"></div>`
      +field('rate-period','Period the numerator covers','numeratorPeriod',p.numeratorPeriod,'1854 outbreak')
      +field('rate-vintage','Vintage of the denominator','denominatorVintage',p.denominatorVintage,'1855 map')
      +'<div class="notice">A rate whose denominator is unstated cannot be compared with any other rate: deaths per house is not a mortality rate. A proportion cannot exceed one and is refused if it does; a ratio of events per unit can. Groups below the stated minimum report their counts and no rate, because a rate from a handful of units is unstable rather than precise. The two vintages are recorded and compared, since a numerator and a denominator measured at different times describe different populations.'
      +(p.source==='table'?' A table is read as one row per measure per subject: the key column named above holds the measure names, and the other key columns name the subject. Changing the kind of input disconnects what was wired, because points and a table are not the same shape.':'')+'</div>';
  }else if(n.type==='rate_ratio'){
    const p=n.params;
    // THE GROUPS ARE OFFERED WHERE THEY CAN BE, not typed. Same lesson the area join taught on
    // 2026-10-25: a control that makes you spell a value you cannot see is a control that
    // discovers its mismatch at the run. The group NAMES are data rather than schema -- they are
    // whatever is in the grouping column -- so they can only be offered when the rate's own
    // source is a table this canvas is holding. When it is not, the field stays typed and says so.
    const groups=rateGroupsFor(n);
    const pick=(id:string,key:'compared'|'reference',label:string,hint:string)=>
      `<div class="field"><label class="field-label" for="${id}">${label}</label>`
      +(groups.length
        ?`<select id="${id}" data-slr="${key}"><option value="">Choose a group…</option>`
          +groups.map(g=>`<option value="${esc(g)}" ${p[key]===g?'selected':''}>${esc(g)}</option>`).join('')
          +'</select>'
        :`<input id="${id}" data-slr="${key}" maxlength="120" value="${esc(p[key]||'')}" placeholder="${esc(hint)}">`)
      +'</div>';
    content+='<p class="description">Divides one group\'s rate by another\'s and reports an interval with the counts behind it. Two rates side by side are not a comparison until something divides them.</p>'
      +nodeInputs(n).map(([port,type])=>`<div class="field"><label class="field-label" for="ratio-${port}">Rate input</label><select id="ratio-${port}" data-map-port="${port}"><option value="">Select input</option>${workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)===type).map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port===port&&e.from===x.id)?'selected':''}>${esc(x.params.label||TYPES[x.type].title)}</option>`).join('')}</select></div>`).join('')
      +pick('ratio-compared','compared','Group compared','Southwark and Vauxhall Company')
      +pick('ratio-reference','reference','Compared with (reference)','Lambeth Company')
      // WHICH WAY ROUND IT READS, shown before the run rather than discovered after it. A ratio
      // and its reciprocal are the same finding and not the same sentence, and the only way to
      // see which one you have asked for is to read it as a sentence.
      +(p.compared&&p.reference
        ?`<p class="description">Reads as: <strong>${esc(p.compared)}</strong> against <strong>${esc(p.reference)}</strong> — how many times the rate in ${esc(p.compared)} is the rate in ${esc(p.reference)}.</p>`
          +'<div class="inspector-actions"><button id="ratio-swap" class="button small">⇄ Swap the two</button></div>'
        :'<p class="description">Choose both groups to see which way round the comparison will read.</p>')
      +`<div class="field"><label class="field-label" for="ratio-level">Interval level</label><select id="ratio-level" data-ratio-level>${[90,95,99].map(l=>`<option value="${l}" ${(p.level||95)===l?'selected':''}>${l}%</option>`).join('')}</select></div>`
      // THE METHOD IS STATED, NOT SELECTED. A dropdown holding one option offers a choice that
      // does not exist. It is named because a reader must never have to guess which interval they
      // are looking at, and it becomes a control when there is a second method to choose.
      +'<div class="detail-row"><span>Interval method</span><strong>Log-normal approximation</strong></div>'
      +'<div class="notice">A rate ratio is dimensionless: the rate\'s multiplier cancels, so changing it to per 100,000 moves neither the ratio nor its bounds, and there is nowhere here to state a unit. Both rates come from one Rate node, so they are per the same thing by construction. A group with no events has no ratio and no interval, and is refused rather than given one by adding half an event. A count below five is reported with a warning naming it, because such an interval is wide for a reason a reader should see. An interval is not a p-value, and a ratio is a contrast between two populations rather than a measured effect.</div>';
  }else if(n.type==='case_series'){
    const p=n.params;
    content+='<p class="description">Counts cases per period from a declared date attribute. The kind of date travels with the series.</p>'
      +`<div class="field"><label class="field-label" for="series-date">Event date attribute</label><input id="series-date" data-slr="dateField" maxlength="60" value="${esc(p.dateField)}" placeholder="onset_date"></div>`
      +`<div class="field"><label class="field-label" for="series-kind">Which date is it?</label><select id="series-kind" data-slr="dateKind">${['onset','report','death','specimen-collection','other'].map(kind=>`<option value="${kind}" ${p.dateKind===kind?'selected':''}>${kind}</option>`).join('')}</select></div>`
      +`<div class="field"><label class="field-label" for="series-period">Period</label><select id="series-period" data-slr="period">${['day','week','month'].map(period=>`<option value="${period}" ${p.period===period?'selected':''}>${period}</option>`).join('')}</select></div>`
      +`<div class="field"><label class="field-label" for="series-weight">Cases per record (attribute, optional)</label><input id="series-weight" data-slr="weightField" maxlength="60" value="${esc(p.weightField||'')}" placeholder="leave empty when one row is one case"></div>`
      +(workflow.edges.some(e=>e.from===n.id)?'':'<div class="inspector-actions"><button id="add-series-chart" class="button small">＋ Add epidemic curve</button></div>')
      +'<div class="notice">A curve by date of death is not a curve by date of onset, so the kind is required and is stated on the chart. Periods with no cases are kept, because a gap is a fact about the outbreak. Records whose date is not an ISO 8601 date are excluded and counted, never guessed at: this widget does not choose between day-first and month-first ordering. Leaving the weight empty asserts that one row is one case.</div>';
  }else if(n.type==='chart_output'&&n.params.inputMode==='series'){
    content+=`<div class="field"><label class="field-label" for="series-source">Case series</label><select id="series-source" data-map-port="series"><option value="">Select input</option>${workflow.nodes.filter(x=>x.type==='case_series').map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.from===x.id)?'selected':''}>${esc(x.params.label||'Cases by period')}</option>`).join('')}</select></div>`
      +`<div class="field"><label class="field-label" for="chart-label">Results tab name</label><input id="chart-label" maxlength="60" value="${esc(n.params.label)}"></div>`
      +`<div class="field"><label class="field-label" for="series-orientation">Bars</label>`
      +`<select id="series-orientation"><option value="vertical" ${chartOrientation(n.params)==='vertical'?'selected':''}>Vertical · periods along the bottom</option>`
      +`<option value="horizontal" ${chartOrientation(n.params)==='horizontal'?'selected':''}>Horizontal · periods down the side</option></select></div>`
      +'<div class="notice">An epidemic curve: cases per period, in order, labelled with the kind of date the series was built from. A presentation of the series, with no smoothing, no interpolation and no new inference. Vertical by default, because that is how an outbreak report draws one.</div>';
    content+=chartControls(n,{omitOrientation:true});
  }else if(n.type==='slr_extract_import'){
    const p=n.params;
    content+='<p class="description">Declares an imported long-format table as a bounded extract of published AR6 projections. It imports and declares; it acquires nothing and produces no projection.</p>'
      +`<div class="field"><label class="field-label" for="slr-dataset">Published dataset (IRI or DOI)</label><input id="slr-dataset" data-slr="datasetIRI" maxlength="300" value="${esc(p.datasetIRI)}" placeholder="https://doi.org/..."></div>`
      +`<div class="field"><label class="field-label" for="slr-version">Dataset version</label><input id="slr-version" data-slr="datasetVersion" maxlength="60" value="${esc(p.datasetVersion)}" placeholder="20210809"></div>`
      // Where the file came from, in the practitioner's own words. The IRI field above offers
      // nothing to somebody who was emailed a CSV, and the alert now asks rather than refuses, so
      // there has to be somewhere to answer. A note is not a citation and the alert says so.
      +`<div class="field"><label class="field-label" for="slr-source-note">Where did this file come from?</label><input id="slr-source-note" data-slr="sourceNote" maxlength="300" value="${esc(p.sourceNote??'')}" placeholder="Downloaded from the NASA sea level portal, 2026-10-02"><small>Free text, for a source with no IRI. It does not satisfy the licence, and it is better than nothing.</small></div>`
      +`<div class="field"><label class="field-label" for="slr-baseline">Baseline period the change is measured against</label><input id="slr-baseline" data-slr="baselinePeriod" maxlength="60" value="${esc(p.baselinePeriod)}" placeholder="1995-2014"></div>`
      +`<div class="field"><label class="field-label" for="slr-basis-kind">What the basis column names</label><select id="slr-basis-kind" data-slr="basisKind">`
      +`<option value=""${p.basisKind?'':' selected'}>Not stated</option>`
      +`<option value="workflow"${p.basisKind==='workflow'?' selected':''}>A single published workflow, such as wf_1e</option>`
      +`<option value="confidence-pbox"${p.basisKind==='confidence-pbox'?' selected':''}>A confidence level, whose file is a p-box over several workflows</option>`
      +'</select></div>'
      +`<div class="field"><label class="field-label" for="slr-family-with">Family value that <strong>includes</strong> vertical land motion</label><input id="slr-family-with" data-slr-family="withVerticalLandMotion" maxlength="80" value="${esc(p.familyValues.withVerticalLandMotion)}"></div>`
      +`<div class="field"><label class="field-label" for="slr-family-without">Family value that <strong>excludes</strong> it</label><input id="slr-family-without" data-slr-family="withoutVerticalLandMotion" maxlength="80" value="${esc(p.familyValues.withoutVerticalLandMotion)}"></div>`
      +[0,1,2].map(i=>`<div class="field"><label class="field-label" for="slr-citation-${i}">Required citation ${i+1}</label><textarea id="slr-citation-${i}" data-slr-citation="${i}" rows="2" maxlength="400">${esc(p.citations[i]||'')}</textarea></div>`).join('')
      +'<div class="notice">The licence makes three citations obligatory: the chapter, the FACTS model-description paper and the dataset at its version. Values from families that include and exclude vertical land motion are not comparable, and values from different workflows are not interchangeable.</div>';
  }else if(n.type==='slr_site_assignment'){
    content+='<p class="description">Assigns each point its nearest published projection site and records the straight-line distance.</p>'
      +'<div class="notice">The distance is part of the result, not a detail: a projection at a site is not a value for an arbitrary point. Connect the points of interest, the published site list as a point layer, and the projection extract. Points without coordinates are kept and reported as unassigned.</div>';
  }else if(n.type==='slr_threshold_comparison'){
    const p=n.params;
    content+='<p class="description">Compares one projected change against an elevation you supply, on a datum you state.</p>'
      +(['scenario','basis','family','year','quantile'] as const).map(key=>`<div class="field"><label class="field-label" for="slr-${key}">${key[0].toUpperCase()+key.slice(1)}</label><input id="slr-${key}" data-slr="${key}" maxlength="60" value="${esc(p[key])}"></div>`).join('')
      +`<div class="field"><label class="field-label" for="slr-elevation">Point attribute holding the supplied elevation (m)</label><input id="slr-elevation" data-slr="elevationField" maxlength="60" value="${esc(p.elevationField)}"></div>`
      +`<div class="field"><label class="field-label" for="slr-datum">Vertical datum of those elevations</label><input id="slr-datum" data-slr="verticalDatum" maxlength="80" value="${esc(p.verticalDatum)}" placeholder="MSL 1995-2014, or a named datum"></div>`
      +`<div class="field"><label class="field-label" for="slr-reference">Those elevations are measured from</label><select id="slr-reference" data-slr="elevationReference">`
      +`<option value=""${p.elevationReference?'':' selected'}>Not stated</option>`
      +`<option value="baseline-sea-surface"${p.elevationReference==='baseline-sea-surface'?' selected':''}>The dataset's baseline sea surface</option>`
      +`<option value="other-datum"${p.elevationReference==='other-datum'?' selected':''}>Another datum (geodetic, or a local benchmark)</option>`
      +'</select></div>'
      +'<div class="notice">A comparison of two numbers. It represents no hydrodynamics, defences, drainage or wave action, and must never be presented as a flood extent. It will not run without a stated datum and a named elevation attribute, and a projected change equal to the elevation counts as reaching it.</div>';
  }else if(n.type==='reproject'){
    const p=n.params,crs=`EPSG:${p.hemisphere==='south'?32700+p.zone:32600+p.zone}`;
    content+='<section class="source-card"><span class="inspector-section">Processing parameters</span>'
      +'<div class="detail-row"><span>Source CRS</span><strong>OGC:CRS84 degrees</strong></div>'
      +`<div class="detail-row"><span>Target CRS</span><strong>${crs}</strong></div>`
      +'<div class="detail-row"><span>Target axis order</span><strong>easting/northing, metres</strong></div>'
      +'<div class="detail-row"><span>Datum shift</span><strong>None (WGS84 only)</strong></div>'
      +'</section>'
      +'<p class="description">Projects connected longitude/latitude points into this UTM zone, in metres. The result is a projected dataset: it can be shown in a table and exported, and it is refused by the steps that measure, because those project for themselves.</p>';
    content+=nodeInputs(n).map(([port])=>`<div class="field"><label class="field-label" for="reproject-port-${port}">Points input</label><select id="reproject-port-${port}" data-map-port="${port}"><option value="">Select input</option>${workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)==='points').map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port===port&&e.from===x.id)?'selected':''}>${esc(x.params.label||x.id)}</option>`).join('')}</select></div>`).join('');
  }else if(n.type==='clip_points_to_area'){
    content+=labelForm('clip-points-label','Node label',n.params.label||'Points inside the area')
      +`<p class="description">Keeps the points that fall inside the connected study area. The test is the one the map uses, so a point counted inside here is inside there.</p>`
      +`<label class="field-option"><input type="checkbox" data-param="keepBoundary"${n.params.keepBoundary!==false?' checked':''}> Keep points that sit exactly on the outline</label>`
      +`<p class="muted">A point on the border is in that jurisdiction's edge. Unticked, only points strictly within are kept \u2014 which is what GeoSPARQL's sfWithin means, and it gives a different count on the data where it matters.</p>`
      +`<label class="field-option"><input type="checkbox" data-param="showExcluded"${n.params.showExcluded!==false?' checked':''}> Show the excluded points on a connected map</label>`
      +`<p class="muted">They are drawn in the colour the map already uses for outside, and are not passed to anything downstream. A count tells you how many were set aside; seeing them tells you whether setting them aside was right.</p>`;
  }else if(n.type==='deduplicate_points'){
    const p=n.params,linkage=result?.linkages?.[n.id];
    content+=labelForm('dedup-label','Node label',p.label||'Deduplicated records')
      +`<p class="description">Finds records in two or more sources that are the same place. A pair must pass BOTH tests to merge on its own; passing one asks you.</p>`
      +`<label class="field-label" for="dedup-name-field">Name attribute</label>`
      +`<input id="dedup-name-field" data-dedup="nameField" maxlength="60" value="${esc(p.nameField)}">`
      +`<label class="field-label" for="dedup-name-match">Name comparison</label>`
      +`<select id="dedup-name-match" data-dedup="nameMatch">`
      +`<option value="fuzzy" ${p.nameMatch==='fuzzy'?'selected':''}>Jaro-Winkler similarity</option>`
      +`<option value="exact" ${p.nameMatch==='exact'?'selected':''}>Exact, after normalising</option>`
      +`</select>`
      +(p.nameMatch==='fuzzy'?`<label class="field-label" for="dedup-fuzzy">Similarity at or above</label>`
        +`<input id="dedup-fuzzy" data-dedup="fuzzyThreshold" type="number" min="0.5" max="1" step="0.01" value="${p.fuzzyThreshold}">`:'')
      +`<label class="field-label" for="dedup-block">Compare pairs within (m)</label>`
      +`<input id="dedup-block" data-dedup="blockDistanceM" type="number" min="1" max="50000" step="10" value="${p.blockDistanceM}">`
      +`<p class="muted">Pairs further apart than this are never compared. It is the blocking rule, and the receipt says how many pairs it withheld.</p>`
      +`<label class="field-label" for="dedup-near">Count as the same place within (m)</label>`
      +`<input id="dedup-near" data-dedup="nearDistanceM" type="number" min="1" max="50000" step="5" value="${p.nearDistanceM}">`
      +`<p class="muted">Two sources digitise a building, a compound and a signpost differently, so this is a measurement on your data rather than a default worth trusting.</p>`
      +`<label class="field-label" for="dedup-match">Merge automatically at a score of</label>`
      +`<input id="dedup-match" data-dedup="matchThreshold" type="number" min="1" max="2" step="1" value="${p.matchThreshold}">`
      +`<label class="field-label" for="dedup-review">Ask me at a score of</label>`
      +`<input id="dedup-review" data-dedup="reviewThreshold" type="number" min="0" max="2" step="1" value="${p.reviewThreshold}">`
      +`<p class="muted">A pair scores one point for the name and one for the distance. Two means both agreed; one means they disagree about something and the answer is yours.</p>`;
    if(linkage){
      const waiting=linkage.candidates.filter(c=>c.classification==='review'&&!c.decided);
      const review=linkage.candidates.filter(c=>c.classification==='review').length;
      const considered=linkage.compared+linkage.blocked;
      // EVERY OUTCOME IN ONE TABLE, each against the two denominators that mean something: how
      // much of the whole comparison it was, and how much of what was actually compared. The
      // practitioner, 2026-10-21, with 48 pairs waiting outside the summary that reported the run:
      // *"the 48 review pairs should be included in the THIS RUN summary ... as a table with
      // percentage over total and percentage over pairs compared."* 379 matched reads differently
      // at 69% of what was compared than at 0.3% of what was considered, and both are true.
      // Two decimals only where one would read as zero: 0.29% of 132,317 pairs is a real
      // quantity and "0.3%" hides how small it is, while a plain zero is a zero.
      const share=(n:number,of:number)=>!of?'—':!n?'0%':`${(n/of*100).toFixed(n/of<0.01?2:1)}%`;
      const row=(label:string,count:number,{compared=true,emphasis=false}={})=>
        `<tr${emphasis?' class="emphasis"':''}><th scope="row">${label}</th><td>${count.toLocaleString()}</td>`
        +`<td>${share(count,considered)}</td><td>${compared?share(count,linkage.compared):'—'}</td></tr>`;
      content+=`<div class="inspector-divider"></div><span class="inspector-section">This run</span>`
        +`<table class="dedup-summary"><thead><tr><th>Pairs</th><th>Count</th><th title="Of every pair considered">% all</th><th title="Of the pairs actually compared">% compared</th></tr></thead><tbody>`
        +row('Considered',considered,{compared:false})
        +row('Never compared',linkage.blocked,{compared:false})
        +row('Compared',linkage.compared)
        +row('Matched',linkage.matched,{emphasis:true})
        +row('In review',review)
        +row('Awaiting you',waiting.length,{emphasis:!!waiting.length})
        +row('Not a match',linkage.compared-linkage.matched-review)
        +`</tbody></table>`
        +`<table class="dedup-summary"><thead><tr><th>Records</th><th>Count</th><th title="Of the records that came in">% all</th><th></th></tr></thead><tbody>`
        +`<tr><th scope="row">Came in</th><td>${linkage.inputCount.toLocaleString()}</td><td>100%</td><td></td></tr>`
        +`<tr class="emphasis"><th scope="row">Merged away</th><td>${linkage.merged.toLocaleString()}</td><td>${share(linkage.merged,linkage.inputCount)}</td><td></td></tr>`
        +`<tr><th scope="row">Came out</th><td>${(linkage.inputCount-linkage.merged).toLocaleString()}</td><td>${share(linkage.inputCount-linkage.merged,linkage.inputCount)}</td><td></td></tr>`
        +`</tbody></table>`;
      if(waiting.length)content+=`<button id="dedup-review-open" class="button primary">Review ${waiting.length} ${waiting.length===1?'pair':'pairs'}</button>`
        +`<p class="muted">Each stays two records until it is decided. The dialog shows both records side by side with every attribute each one carries, which is what the decision actually rests on.</p>`;
      if(p.decisions.length)content+=`<p class="muted">${p.decisions.length} ${p.decisions.length===1?'decision':'decisions'} recorded. Editing either record lapses the one made about it.</p>`;
    }
    }else if(n.type==='find_health_facilities'){
    const p=n.params,descriptor=FACILITY_SOURCES[p.source];
    // THIS WIDGET HAD NO LABEL CONTROL AT ALL, which is how the practitioner found the
    // inconsistency: "The Find Health Facilities widget label cannot be changed like Study Area,
    // Street Network and Map."
    content+=labelForm('hf-label','Node label',p.label||'Find health facilities')
      +'<p class="description">Health facilities inside the study area, from a source this application can actually reach. Both sources are OpenStreetMap-derived and both are under the Open Database License.</p>'
      +`<div class="field"><label class="field-label" for="hf-source">Source</label><select id="hf-source" data-hf="source">`
      +FACILITY_SOURCE_KEYS.map(key=>`<option value="${key}"${p.source===key?' selected':''}>${esc(FACILITY_SOURCES[key].label)}</option>`).join('')
      +'</select></div>'
      +`<div class="notice">${esc(descriptor.detail)}</div>`
      +(descriptor.needsCountry
        ?(()=>{
          // THE STUDY AREA ALREADY SAYS WHICH COUNTRY, and a person should not retype what the
          // application knows. The practitioner, 2026-10-23: *"In find health facilities, I
          // should not have to type 3 letter ISO code because the study area should already pass
          // on that information. And we should not make the user type 3 letter ISO codes, this
          // should be a drop down."* A boundary acquired from geoBoundaries carries BWA-ADM1-...;
          // a polygon drawn by hand carries nothing, and then the list is simply unset.
          const areaNode=workflow.nodes.find(x=>x.id===workflow.edges.find(e=>e.to===n.id&&e.port==='area')?.from);
          const stated=countryOfArea(areaNode?.params as {country?:string;boundary?:{provenance?:{boundaryID?:string}}});
          const chosen=p.country||stated||'';
          return `<div class="field"><label class="field-label" for="hf-country">Country</label>`
            +`<select id="hf-country" data-hf="country">`
            +`<option value="" ${chosen?'':'selected'}>Choose a country…</option>`
            +COUNTRIES.map(c=>`<option value="${c.iso}" ${c.iso===chosen?'selected':''}>${esc(c.name)} (${c.iso})</option>`).join('')
            +`</select>`
            +(stated&&!p.country
              ?`<small>From the study area.</small>`
              :stated&&p.country&&p.country!==stated
                ?`<p class="notice">Study area is ${esc(stated)}; this asks ${esc(p.country)}. The export follows this choice.</p>`
                :'')
            +`</div>`;
        })()
        :'')
      +(descriptor.confidence
        ?`<div class="field"><label class="field-label" for="hf-confidence">Least confidence to accept (0 to 1)</label><input id="hf-confidence" data-hf-number="minConfidence" type="number" min="0" max="1" step="0.05" value="${p.minConfidence??OVERTURE_DEFAULT_CONFIDENCE}"></div>`
          +`<p class="muted">Overture states a confidence for each place. Measured in a Manila study area: 1,120 health places unfiltered, 572 at 0.70. Below about 0.70 the list fills with individual practitioners and wellness businesses.</p>`
        :'')
      +`<div class="field"><label class="field-label" for="hf-kinds">Facility kinds</label><input id="hf-kinds" data-hf-list="kinds" maxlength="200" value="${esc((p.kinds||[]).join(', '))}" placeholder="hospital, clinic"></div>`
      +`<p class="muted">Known kinds: ${FACILITY_KINDS.join(', ')}. Others can be typed in; OpenStreetMap tagging is open.</p>`
      +`<label class="field-option"><input type="checkbox" data-hf-flag="requireName"${p.requireName?' checked':''}> Keep only facilities that carry a name</label>`
      +`<button id="hf-retrieve" class="button primary">Retrieve facilities</button>`
      +`<p id="hf-status" role="status" class="muted"></p>`
      +(p.retrieved
        ?`<div class="notice"><strong>${p.retrieved.kept} facilities</strong> from ${esc(p.retrieved.sourceLabel)}, retrieved ${esc(p.retrieved.at.slice(0,10))}.`
          +`<br>Scope: ${esc(p.retrieved.scope)}.`
          +(p.retrieved.belowConfidence!==undefined
            ?`<br>${p.retrieved.belowConfidence} below the confidence threshold; ${p.retrieved.unmappedCategory??0} of a health category not mapped to a facility kind.`
            :'')
          +((d=>d.kind+d.coordinates+d.name?`<br>Dropped ${d.kind} of an unrequested kind, ${d.coordinates} outside the area or without coordinates, ${d.name} without a name.`:'<br>No records dropped.')(p.retrieved.dropped))
          +`<br><small>${esc(p.retrieved.attribution)}</small>`
          +` Retrieving again replaces this layer.</div>`
        :'<div class="notice">Holds no facilities until you retrieve them. Connect a study area first: the area is the scope of the query, not a filter applied afterwards.</div>')
      +`<ul class="licence-links">${descriptor.links.map(l=>`<li><a href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.label)} \u2197</a></li>`).join('')}</ul>`
      +'<div class="notice">These are the facilities the source records, not the facilities that exist. OpenStreetMap coverage is uneven and states no completeness, so an absence here is not evidence of absence on the ground.</div>';
  }else if(n.type==='buffer_point'){
    const p=n.params;
    content+='<p class="description">Everything within a stated distance of one named point.</p>'
      +`<div class="field"><label class="field-label" for="bp-point">Point that defines the area</label><input id="bp-point" data-bp="pointId" maxlength="80" value="${esc(p.pointId)}" placeholder="MANILA"></div>`
      +`<div class="field"><label class="field-label" for="bp-distance">Radius in metres</label><input id="bp-distance" data-bp-number="distanceM" type="number" min="0" max="5000" step="100" value="${p.distanceM}"></div>`
      +'<div class="notice">A derived scope, not a surveyed boundary: its edge is a decision and its radius an assumption of the question, so state why you chose it. One named point only \u2014 several distant points would make a raster window too coarse to sample. Local areas up to 5,000 m.</div>';
  }else if(n.type==='sample_raster'){
    const p=n.params;
    content+='<p class="description">Writes the value of the raster cell containing each point onto that point.</p>'
      +`<div class="field"><label class="field-label" for="sample-attribute">Attribute to write</label><input id="sample-attribute" data-sample="attribute" maxlength="60" value="${esc(p.attribute)}" placeholder="elevation_m"></div>`
      +`<div class="field"><label class="field-label" for="sample-unit">What those values measure</label><input id="sample-unit" data-sample="valueUnit" maxlength="60" value="${esc(p.valueUnit)}" placeholder="metres above the stated datum"></div>`
      +'<div class="notice">A cell value is not a measurement at the point: it is the value of the containing cell, at the raster\u2019s resolution, with no interpolation. No-data cells, points outside the raster and points without coordinates carry no value and are counted; none is treated as zero. An attribute already on the layer is never overwritten.</div>';
    // THE ARTEFACT IS DOWNLOADED WHERE IT IS MADE, not where it happens to be displayed.
    // `#raster-download` sits in the Results heading and offers whatever raster the output tab
    // on screen carries, so with a prepared window and a clipped grid in one workflow the full
    // window was unreachable while the clipped map was displayed -- the one case where two
    // rasters exist is the one case it could not serve. The filenames already told them apart,
    // and neither needs a run: both come from the stored input, through the resolver the clip
    // preview uses. The two descriptions are separate literals rather than one ternary, because
    // the prose check reads this source and scored the ternary as a single 328-character
    // explanation attached to the control above it.
  }else if(n.type==='raster_input'||n.type==='clip_raster'){
    // ONE SHAPE, AND THIS WIDGET WAS STILL OUTSIDE IT. The practitioner, 2026-10-23: *"Note that
    // raster widget still does not have custom node label field."* labelForm exists precisely so
    // the gesture is learned once -- its own comment records a fourth widget that had none at
    // all when it was written -- and these two were not given it. Two nodes of the same kind on
    // one canvas could not be told apart except by their ports.
    content+=labelForm(n.type==='raster_input'?'raster-label':'clip-raster-label','Node label',
      n.params.label||(n.type==='raster_input'?'Raster input':'Clip raster'));
    content+=nodeInputs(n).map(([port,type])=>`<div class="field"><label class="field-label" for="raster-${port}">${port==='area'?'Study area':'Raster input'}</label><select id="raster-${port}" data-map-port="${port}"><option value="">Select input</option>${workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)===type).map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port===port&&e.from===x.id)?'selected':''}>${esc(x.params.label||TYPES[x.type].title)}</option>`).join('')}</select></div>`).join('');
    // WHICH POPULATION RASTER COVERS THIS STUDY AREA, before asking for a file nobody has yet.
    // The same shape as the street network widget's published extracts: this application works
    // out the file and the browser fetches it, because data.worldpop.org sends no CORS header
    // and ignores a Range request. Offered only where the study area STATES its country --
    // a boundary acquired from geoBoundaries carries COD-ADM2-... -- because a population
    // denominator attributed to the wrong country is worse than no denominator, and a province
    // on a border is exactly where a guess from coordinates would be wrong and invisible.
    if(n.type==='raster_input'){
      const area=workflow.nodes.find(x=>x.id===workflow.edges.find(e=>e.to===n.id&&e.port==='area')?.from);
      const stated=countryOfArea(area?.params as {country?:string;boundary?:{provenance?:{boundaryID?:string}}});
      // A STUDY AREA SOMEBODY DREW STATES NO COUNTRY, and WorldPop is keyed by country. Offering
      // nothing in that case was correct and useless: the practitioner, 2026-10-23, looking at a
      // drawn Gaborone area, *"Can we make raster input read from Worldpop?"* It already did, for
      // an acquired boundary only. So the country is asked for here as it is in Find health
      // facilities -- defaulted from the area where the area states one, chosen from a list where
      // it does not. Two widgets that need a country now behave the same way.
      const country=n.params.populationCountry||stated||'';
      const rasters=populationRastersForCountry(country||null);
      content+=`<label class="field-label" for="population-country">Country for population data</label>`
        +`<select id="population-country" data-raster-param="populationCountry">`
        +`<option value="" ${country?'':'selected'}>Choose a country…</option>`
        +COUNTRIES.map(c=>`<option value="${c.iso}" ${c.iso===country?'selected':''}>${esc(c.name)} (${c.iso})</option>`).join('')
        +`</select>`
        +(stated&&!n.params.populationCountry?`<small>From the study area.</small>`:'');
      if(rasters.length){
        const chosen=rasters.find(r=>r.year===(n.params.populationYear??rasters[0].year))??rasters[0];
        content+=`<label class="field-label" for="population-year">Population raster (WorldPop)</label>`
          +`<select id="population-year" data-raster-param="populationYear">`
          +rasters.map(r=>`<option value="${r.year}" ${r.year===chosen.year?'selected':''}>${r.year}</option>`).join('')
          +`</select>`
          +`<div class="extract-links"><a class="button" href="${esc(chosen.url)}" download target="_blank" rel="noopener noreferrer">`
          +`\u2193 ${esc(chosen.iso3)} \u00b7 ${esc(chosen.year)}${chosen.bytes?` \u00b7 ${(chosen.bytes/1e6).toFixed(0)} MB`:''}</a></div>`
          // SAID BESIDE THE BUTTON, BECAUSE THAT IS WHERE THE HOUR IS COMMITTED TO. There is no
          // resume: the host advertises Accept-Ranges and ignores a Range request, confirmed again
          // 2026-10-23, so a reboot or a sleep does not cost the remainder of the download, it
          // costs all of it.
          +(chosen.bytes
            ?`<p class="notice">About ${esc(downloadWait(chosen.bytes))} at the one speed measured `
              +`here, ${(WORLDPOP_BYTES_PER_SECOND/1e3).toFixed(0)} kB/s. Keep the laptop awake: this `
              +`host ignores resume requests, so an interrupted download starts again from zero.</p>`
            :`<p class="notice">Keep the laptop awake until this finishes. The host ignores resume `
              +`requests, so an interrupted download starts again from zero.</p>`)
          +`<small>Your browser downloads it from data.worldpop.org; this application cannot fetch `
          +`it for you, as that host sends no CORS header. Unconstrained population, 100 m. `
          +`${esc(WORLDPOP_LICENCE)} Catalogue of ${esc(WORLDPOP_TAKEN)}.`
          +`${chosen.bytes?'':' Size unread at snapshot time, so unstated rather than guessed.'}`
          +`</small>`;
      }
      content+='<button id="prepare-raster" class="button primary">Prepare GeoTIFF input</button><p class="description">Acquire a rectangular window and enter source metadata/citation. Reopen to edit metadata without re-uploading. Use Clip raster to apply the polygon mask.</p>';if(n.params.asset)content+=`<p>${esc(n.params.asset.source.filename)}<br>${n.params.asset.source.metadata.width} x ${n.params.asset.source.metadata.height} source cells; retained ${n.params.asset.metadata.width} x ${n.params.asset.metadata.height}.</p><details><summary>GeoTIFF metadata and source</summary><pre>${esc(JSON.stringify(n.params.asset,null,2))}</pre></details>`;content+='<button id="download-node-raster" class="button">Download GeoTIFF</button><p class="description">The retained window at native resolution, with its georeferencing and source metadata.</p>';}else content+='<section class="source-card" data-clip-parameters><span class="inspector-section">Processing parameters</span><div class="detail-row"><span>Cutline</span><strong>Separate clip boundary</strong></div><div class="detail-row"><span>Inclusion rule</span><strong>Configured below</strong></div><div class="detail-row"><span>Resolution</span><strong>Native pixels</strong></div><div class="detail-row"><span>Outside polygon</span><strong>NoData</strong></div><p>Start with a copy of Study area, then save adjustments on this operation. Study area remains unchanged. Map displays the result.</p></section><button id="preview-raster-clip" class="button primary">Preview and adjust</button><button id="add-raster-map" class="button">Add raster map</button>';
    if(n.type==='clip_raster'){content+='<div class="field"><label class="field-label" for="clip-method">Pixel inclusion</label><select id="clip-method"><option value="all-touched" '+(n.params.method==='all-touched'?'selected':'')+'>All touched</option><option value="cell-center" '+(n.params.method==='cell-center'?'selected':'')+'>Cell center inside</option></select><label class="field-label" for="clip-margin">Outer margin (native pixels, 0-1)</label><input id="clip-margin" type="number" min="0" max="1" step="0.25" value="'+(n.params.marginPixels||0)+'"><small>All touched includes a cell when the boundary covers part of its area or crosses it, so a boundary running exactly along a cell border does not pull in the cell outside it. This matches GDAL except where a boundary vertex lies exactly on a cell border. For an outward margin, prepare the GeoTIFF with one pixel of extra source coverage; a margin is a grid distance with no GDAL equivalent. NoData is never filled.</small></div>';content+='<p class="description">'+(n.params.cutline?'Saved clip boundary; independent of Study area edits.':'Boundary will be initialized from the connected Study area.')+'</p><button id="reset-clip-boundary" class="button small" '+(!n.params.cutline?'disabled':'')+'>Use Study area boundary</button>';if(n.params.cutline)content+='<div class="source-card"><span class="inspector-section">Clip extent (degrees)</span>'+geometryBounds(n.params.cutline.geometry).map((value,i)=>'<div class="detail-row"><span>'+['West','South','East','North'][i]+'</span><strong>'+value.toFixed(6)+'</strong></div>').join('')+'</div>';content+='<button id="download-node-raster" class="button">Download GeoTIFF</button><p class="description">The masked grid at native resolution. Cells outside the boundary are NoData, not absent.</p>';}
  }else if(n.type==='study_area'){
    // THE COUNTRY, SAID ONCE, HERE. Every widget that needs one -- the population raster, the
    // facilities export -- reads it from the area rather than asking again. An acquired boundary
    // states it in its own identifier, so this shows that and need not be touched; a polygon
    // somebody drew states nothing, and this is where it is said.
    {
      // PICKED ONCE, AND ONLY WHERE IT WAS NEVER PICKED. The practitioner, 2026-10-23: *"State
      // it once is best for manually derived study areas like bounding box, circle, hand drawn
      // polygons. But for administrative boundaries from geoBoundaries, it could actually be
      // derived from the country selection so pick country once. Not twice."*
      //
      // An acquired boundary was chosen BY country -- the picker asks for one before it can
      // offer a level or a unit -- and carries it in its own identifier, BWA-ADM1-... Offering a
      // list there asks a question already answered, and a list implies the answer is in doubt.
      // So it is stated, not asked. A bounding box, a circle or a drawn polygon was never picked
      // by country and has none to derive, and that is where the list belongs.
      const acquired=iso3Of((n.params as {boundary?:{provenance?:BoundaryProvenance}}).boundary?.provenance);
      content+=acquired
        ?`<div class="field"><span class="field-label">Country</span>`
          +`<p class="muted">${esc(countryName(acquired))} (${esc(acquired)}), from the boundary this area was acquired as.</p></div>`
        :`<div class="field"><label class="field-label" for="area-country">Country</label>`
          +`<select id="area-country" data-area-country>`
          +`<option value="" ${n.params.country?'':'selected'}>Not stated</option>`
          +COUNTRIES.map(c=>`<option value="${c.iso}" ${c.iso===n.params.country?'selected':''}>${esc(c.name)} (${c.iso})</option>`).join('')
          +`</select><small>Read by the widgets that need a country.</small></div>`;
    }
    content+=`<form id="study-area-label-form" class="field"><label class="field-label" for="study-area-label">Study area label</label><input id="study-area-label" maxlength="100" required value="${esc(n.params.label||'My study area')}"><button type="submit" class="button small">Apply label</button></form>`;
    content+=n.params.source==='drawn'?`<div class="source-card"><span class="inspector-section">${n.params.geometry?'Selected geometry':'No geometry yet'}</span><h3>${esc(n.params.label)}</h3><p>${n.params.geometry?`${n.params.selectionMode==='bbox'?'Bounding box':'Polygon'} · ${geometryVertices(n.params.geometry)} vertices`:'Draw a bounding box or polygon on the online map.'}</p></div><p class="description">The shape is stored in longitude, latitude order. Applying it generates N3 facts; Run workflow evaluates the readiness rule.</p>`:oldInspector(n);
    // Every extent this area has had, newest first, each restorable. The practitioner,
    // 2026-10-17: *"so investigators can go back to previous assumptions"*. An outbreak that
    // crossed a border widens the area; finding it did not after all should be able to narrow it
    // back WITHOUT losing the record that it was once wider -- which is why restoring appends
    // rather than truncates.
    if(n.params.source==='drawn'&&(n.params.revisions?.length??0)>1){
      const history=n.params.revisions!;
      content+=`<div class="inspector-divider"></div><span class="inspector-section">Extent history</span>`
        +`<p class="muted">${history.length} extents kept. Restoring one records a new extent carrying the old shape; nothing is removed.</p>`
        +`<ul class="record-list">`+history.map((r,i)=>{
          const current=i===history.length-1;
          const vertices=r.geometry?.coordinates?.[0]?.length;
          return `<li><span>v${i+1} · ${esc(new Date(r.at).toLocaleString())}`
            +`${r.restoredFrom?` · restored v${r.restoredFrom}`:''}`
            +`${vertices?` · ${vertices-1} vertices`:''}</span>`
            +(current?'<strong>current</strong>'
              :`<button class="text-button" data-restore-extent="${i}">Restore this extent</button>`)+`</li>`;
        }).join('')+`</ul>`;
    }
    content+=`<button id="edit-study-area" class="button primary">${n.params.geometry?'Edit area on map':'Select area on map'}</button>${n.params.geometry?'<button id="area-view-n3" class="text-button">Inspect N3 facts and rule ↗</button>':''}<div class="notice">Evaluation prompt: what should the next workflow node receive from this selection?</div>`;
  }else if(n.type==='point_input'){
    if(n.sourceMigration)content+=`<p class="notice">${n.sourceMigration.fromType==='output'
      ?`Replaced the retired <strong>Visual output</strong> widget; name and connections retained.`
      :`Now uses the shared Input data editor; label, records and connections retained.`}</p>`;
    content+=labelForm('source-label','Source label',n.params.label||'Input data')+`<div class="source-card"><h3>${n.params.data.features.length} point records</h3><p>${esc(n.params.sourceInfo?.format||'Local input')} · ${n.params.data.features.filter(f=>!f.geometry).length} missing locations</p></div><button id="edit-input-data" class="button primary">Prepare input data</button>${recordsPanel(n.id,n.params.data)}<p class="description">Generate synthetic points, import CSV / GeoPackage / GeoJSON, or place pushpins with forms. Connect to Check spatial coverage before deciding how to handle outside records.</p>`;
  }else if(n.type==='measure_area'){
    const input=workflow.edges.find(e=>e.to===n.id&&e.port==='area'),output=result?.outputs.find(o=>o.nodeId===n.id);
    content+=`<div class="field"><label class="field-label" for="measure-area-source">Boundary input</label><select id="measure-area-source"><option value="">Select a Study area</option>${workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)==='area').map(x=>`<option value="${esc(x.id)}" ${input?.from===x.id?'selected':''}>${esc(x.params.label||TYPES[x.type].title)} · ${esc(x.id)}</option>`).join('')}</select><small>Selecting an area adds its connector to the canvas.</small><label class="field-label" for="area-unit">Area unit</label><select id="area-unit" data-param="unit">${areaUnitOptions(n.params.unit)}</select></div><div class="source-card"><span class="inspector-section">${dirty?'Run to calculate or update':'Calculated area'}</span><h3>${!dirty&&output?.measurement?esc(formatArea(output.measurement)):'—'}</h3><p>Approximate surface area on a sphere.</p></div><p class="description">Outputs the same study area with its calculated area attached. Connect it to a Study area input, such as Check spatial coverage. Square metres are retained as the canonical value; the selected unit controls display.</p><div class="notice">This calculation uses the polygon itself, including its shape, rather than its bounding box. It does not measure terrain surface area.</div>`;
  }else if(Object.hasOwn(OLD_TYPES,n.type)){content+=oldInspector(n);
  }else if(n.type==='apply_ruleset'){
    // Generated from the ruleset's declaration rather than hardcoded, which is what the declared
    // parameters are for: each one carries its unit, its range and what it means, so the control,
    // the label and the hint all come from the ruleset instead of being written per widget. This
    // is the UI that three widgets used to have three copies of.
    // The ruleset is chosen HERE rather than in the palette. One widget is offered and the
    // practitioner says what it should do, because a palette entry per ruleset grew with every
    // ruleset and again with every version of one. Their decision, 2026-10-14.
    // Rules written in this workflow. The Inspector described the PINNED artefact here until
    // 2026-10-15, so a step applying authored rules showed somebody else's title, description,
    // threshold and basis -- found by the ruleset worked example, which is what a worked example
    // about a widget is for. The pin gives such a node its ports and nothing else.
    const authored=n.params.authored;
    if(authored){
      const comparator=(c:string)=>({equals:'is',greaterThan:'is more than',notGreaterThan:'is at most',
        lessThan:'is less than',notLessThan:'is at least'}[c]??c);
      const readable=(value:import('./authored-rules.js').AuthoredValue)=>{
        const setting=settingNamed(value);
        if(setting){
          const held=n.params.parameters?.[setting],declared=(authored.parameters??[]).find(p=>p.name===setting);
          return held===undefined||held===null
            ?`${setting} · not set`
            :`${setting} · ${held}${declared?.unitLabel?' '+declared.unitLabel:''}`;
        }
        return typeof value==='string'&&value.includes(':')?value.slice(value.indexOf(':')+1):String(value);
      };
      // The column, as the file spells it. Not a label somebody wrote over it: a reader checking
      // this rule against their data is looking for the column, and a rule that names something
      // the file does not contain makes them translate. 2026-10-16.
      const named=(predicate:string)=>{
        const field=authored.fields.find(f=>f.predicate===predicate||`${f.predicate}Known`===predicate);
        return field?field.attribute:predicate.slice(predicate.indexOf(':')+1);
      };
      const presenceOf=(predicate:string)=>
        authored.fields.some(f=>`${f.predicate}Known`===predicate);
      content+=`<span class="inspector-section">What this step applies</span>`
        +`<div class="detail-row"><span>${esc(authored.title)}</span><strong>written here</strong></div>`
        +`<p class="description">These rules are part of this workflow rather than a published ruleset chosen from a list. They travel with the file, and the run evidence carries them in full.</p>`
        +`<div class="notice">${esc(authored.mustNotBeReadAs)}</div>`
        +`<span class="inspector-section">The rules, in order</span>`
        // Laid out as rules rather than written as sentences about rules. The practitioner read
        // the first version -- "If whether Wait is recorded is false, then band is Unrecorded" --
        // and called it a description of rules, which it was: prose reads as something somebody
        // wrote ABOUT the rules, and a rule should look like a thing with parts. So each
        // condition is a row of three cells, the connectives are labels in the margin, and the
        // conclusion is separated by a line.
        +rulesList(authored.rules,authored.fields,readable,esc)
        +`<p class="description">Every rule is checked against every record, so rules must not disagree: no record may match two rules reaching different conclusions. A record matching none keeps no conclusion; the evidence counts those.</p>`
        +`<span class="inspector-section">Which column means what</span>`;
      if(authored.fields.length){
        content+=`<table class="inspector-table"><thead><tr><th>Column</th><th>Read as</th><th>Kind</th><th>Unit</th></tr></thead><tbody>`
          +authored.fields.map((field,index)=>`<tr><td>${esc(field.attribute)}</td><td>${esc(field.label||field.attribute)}</td><td>${esc(field.kind)}</td>`
            +`<td>${field.kind==='number'
              ?`<input data-field-unit="${index}" value="${esc(field.unitLabel??'')}" placeholder="minutes" aria-label="Unit for ${esc(field.attribute)}">`
              :'—'}</td></tr>`).join('')
          +`</tbody></table>`
          +`<p class="description">Nothing is guessed from a column name. <strong>A numeric column needs its unit</strong>: the rules will not run until every one has it.</p>`;
      }else{
        // Where a practitioner writing their first ruleset gets stuck: the rules cannot read
        // anything until the columns are declared, and the columns can only be offered once
        // something is connected. Both states are said plainly rather than left as an empty
        // section.
        const candidates=candidateFields(workflow,n.id);
        content+=candidates.length
          ?`<p class="description">These are the columns the connected records carry.</p>`
            +`<table class="inspector-table"><thead><tr><th>Column</th><th>Reads as</th></tr></thead><tbody>`
            +candidates.map(field=>`<tr><td>${esc(field.attribute)}</td><td>${esc(field.kind)}</td></tr>`).join('')
            +`</tbody></table>`
            +`<div class="inspector-actions"><button id="use-columns" class="button">Use these ${candidates.length} column${candidates.length===1?'':'s'}</button></div>`
          :`<div class="notice">Connect the records this step should classify, and the columns they carry will be offered here. Rules read columns, and nothing is guessed from a name.</div>`;
      }
      for(const parameter of authored.parameters??[])
        content+=`<div class="field"><label class="field-label" for="ruleset-${esc(parameter.name)}">${esc(parameter.meaning)}</label>`
          +`<input id="ruleset-${esc(parameter.name)}" type="number" data-ruleset-parameter="${esc(parameter.name)}" `
          +`value="${esc(String(n.params.parameters?.[parameter.name]??''))}" ${parameter.min!==undefined?`min="${parameter.min}"`:''} ${parameter.max!==undefined?`max="${parameter.max}"`:''}>`
          +`${parameter.unitLabel?`<small>${esc(parameter.unitLabel)}</small>`:''}</div>`;
      content+=`<div class="inspector-actions"><button id="edit-rules" class="button">Edit these rules</button></div>`
        +manualButton(n.type,esc)+identityMarkup(n.type,esc);
      $('#inspector-content').innerHTML=`<div class="inspector-body">${content}</div>`;
      // In a dialog, because the conditions nest and this panel is 320 px wide. The
      // practitioner's call, 2026-10-15: "Perhaps the rule editor should be a modal dialog so
      // there is enough space."
      optionalElement('#use-columns')?.addEventListener('click',()=>change(w=>{
        getNode(w,n.id,'apply_ruleset').params.authored!.fields=candidateFields(workflow,n.id) as never;}));
      // A unit the practitioner types. The label is what the editor shows beside a value box; the
      // IRI is what the unit check compares, and a word this does not recognise gets the label
      // and no IRI -- so the check then refuses the rules for want of a unit, which is the
      // honest outcome rather than a guess at what they meant.
      document.querySelectorAll<HTMLInputElement>('[data-field-unit]').forEach(el=>
        el.addEventListener('change',()=>change(w=>{
          const field=getNode(w,n.id,'apply_ruleset').params.authored!.fields[Number(el.dataset.fieldUnit)];
          const typed=el.value.trim();
          field.unitLabel=typed||undefined;
          const code=UNIT_IRIS[typed.toLowerCase()];
          field.unit=code?`http://qudt.org/vocab/unit/${code}`:undefined;
        })));
      optionalElement('#edit-rules')?.addEventListener('click',async()=>{
        const edited=await openRuleEditor(authored,esc,{settingValues:n.params.parameters});
        if(edited)change(w=>{getNode(w,n.id,'apply_ruleset').params.authored!.rules=edited.rules as never;});
      });
      // An EMPTY box is an unset setting, not zero. `Number('')` is 0, so clearing this field
      // used to band the rules against zero: `busy` declares min 1 and the run refuses it, which
      // is why it was never seen, but a setting declaring no minimum would have run on a figure
      // nobody typed. Clearing it now removes it, and the run says it needs a value.
      document.querySelectorAll<HTMLInputElement>('[data-ruleset-parameter]').forEach(el=>
        el.addEventListener('change',()=>change(w=>{
          const held=getNode(w,n.id,'apply_ruleset').params.parameters,name=required(el.dataset.rulesetParameter);
          if(el.value.trim()==='')delete held[name];else held[name]=Number(el.value);})));
      return;
    }
    content+=`<span class="inspector-section">What this step applies</span>`
      +`<div class="field"><label class="field-label" for="ruleset-choice">Ruleset</label>`
      +`<select id="ruleset-choice"><option value="">Choose a ruleset…</option>`
      +`<option value="authored">Write rules for this step…</option>`
      +currentRulesets().map(r=>`<option value="${esc(r.id+'@'+r.version)}" ${n.params.ruleset?.id===r.id?'selected':''}>`
        +`${esc(r.title)} ${esc(r.version)} · ${esc(r.inputContract.ports.inputs.map(([,t])=>t).join(', '))} → ${esc(r.inputContract.ports.output)}</option>`).join('')
      +`</select><small>The ruleset decides what this step classifies, which inputs it takes and what it gives back. Changing it disconnects what is wired here, because the ports change with it; Undo restores them.</small></div>`;
    if(!n.params.ruleset){
      content+=`<div class="notice">This step has nothing to apply yet. It can sit on the canvas unconfigured — the run refuses it by name until a ruleset is chosen.</div>`
        +`<div class="inspector-actions"><button id="author-rules" class="button">Write rules for this step</button></div>`;
      $('#inspector-content').innerHTML=`<div class="inspector-body">${content}</div>`;
      wireRulesetChoice(n);
      wireAuthorRules(n);
      return;
    }
    const pinned=n.params.ruleset,ruleset=resolveRuleset(pinned.id,pinned.version);
    const basis={published:'Published basis',"practitioner-agreed":'Practitioner-agreed basis',
      illustrative:'Illustrative — no source',proxy:'Proxy — no source'}[ruleset.basis.status]||ruleset.basis.status;
    content+=`<span class="inspector-section">Ruleset</span><div class="detail-row"><span>${esc(ruleset.title)}</span><strong>${esc(ruleset.version)}</strong></div>`
      +`<p class="description">${esc(ruleset.description)}</p>`;
    // A pinned version keeps running, deliberately -- a rule change changes results, so a saved
    // workflow replays the rules it was built on. What was missing until 2026-10-15 is that
    // nobody was told a newer one exists. The practitioner's instruction: alert on the newer
    // version, explain what changed, warn of deprecated or incompatible functionality.
    //
    // Styled as a danger when a change declares an incompatibility, because then the choice is
    // not "update when convenient" but "rewire or stay", and the two read differently.
    const newer=supersession(pinned.id,pinned.version);
    if(newer){
      const said=newer.changes.map(c=>`<p>${esc(c.description)}</p>`
        +(c.incompatibility?`<p><strong>Incompatible:</strong> ${esc(c.incompatibility)}</p>`:'')
        +(c.deprecates?`<p><strong>No longer supported:</strong> ${esc(c.deprecates)}</p>`:'')).join('');
      content+=newer.incompatible
        ?`<div class="inspector-alert" role="alert"><strong>Pinned to ${esc(pinned.version)} · ${esc(newer.version)} is available and is not a drop-in</strong>`
          +`${said}<p>This step keeps running on ${esc(pinned.version)}, which is what reproduces the results it was built on. Choose the newer version above only when you are ready to re-wire; Undo restores what this disconnects.</p></div>`
        :`<div class="notice"><strong>${esc(newer.version)} is available.</strong> This step is pinned to ${esc(pinned.version)} and keeps running on it, because a rule change changes results.${said}</div>`;
    }
    if(ruleset.parameters.length){
      content+='<span class="inspector-section">Rule settings</span>';
      for(const parameter of ruleset.parameters)
        content+=`<div class="field"><label class="field-label" for="ruleset-${esc(parameter.name)}">${esc(parameter.meaning.split('.')[0])}</label>`
          +`<div class="input-unit"><input id="ruleset-${esc(parameter.name)}" type="number" min="${parameter.min}" max="${parameter.max}" step="0.5" value="${n.params.parameters[parameter.name]}">`
          +`<span>${esc(parameter.unitLabel||'')}</span></div><small>${esc(parameter.meaning)}</small></div>`;
    }
    // WHAT APPLYING THIS COMMITS YOU TO, where a practitioner meets it rather than where they
    // meet the error. Experiment 140: whoever shares a ruleset that requires provenance
    // transmission owes its users the instructions for fulfilling it. This is the middle link of
    // a chain nothing enforced -- the dataset's authors oblige the user, and until now nothing
    // told the user how to meet that obligation in this application.
    const obligation=(ruleset as unknown as {obligation?:{summary:string;whatYouTakeOn:string;
      howToAcknowledge:string;ifYouDoNot:string}}).obligation;
    if(obligation)
      content+=`<div class="inspector-divider"></div>`
        +`<span class="inspector-section">What this obliges you to</span>`
        +`<div class="inspector-alert" role="note"><strong>${esc(obligation.summary)}</strong></div>`
        +`<p class="description">${esc(obligation.whatYouTakeOn)}</p>`
        +`<p class="description"><strong>How to acknowledge it.</strong> ${esc(obligation.howToAcknowledge)}</p>`
        +`<p class="description"><strong>If you do not.</strong> ${esc(obligation.ifYouDoNot)}</p>`;
    content+=`<div class="inspector-divider"></div><span class="inspector-section">Basis</span>`
      +`<div class="detail-row"><span>${esc(basis)}</span><strong>${ruleset.basis.evidence.length} reference${ruleset.basis.evidence.length===1?'':'s'}</strong></div>`;
    if(ruleset.basis.unresolvedCitations.length)
      content+=`<p class="description">Cites ${ruleset.basis.unresolvedCitations.map(c=>esc(c.citation)).join(', ')}, which this build cannot resolve to anything you can open.</p>`;
    content+=`<span class="inspector-section">Execution engine</span><div class="engine-card"><span class="engine-mark">⋈</span><div><strong>EYE-JS · Notation3</strong><small>WebAssembly · runs on this device</small></div></div>`
      +`<div class="notice">${esc(ruleset.mustNotBeReadAs)}</div>`
      // "Why can't I just get a ruleset editor?" -- the practitioner, 2026-10-15, on example 09.
      // Because the only way to one was an option inside the dropdown above, and nothing said it
      // was there. A published ruleset is not edited in place: it is pinned and versioned, and a
      // reader of this workflow has to be able to tell which rules ran. So this FORKS -- the step
      // stops applying the published ruleset and starts applying rules of your own, keeping what
      // is wired to it, and this says so before you press it rather than after.
      +`<span class="inspector-section">The rules</span>`
      // SHOWN, not only offered behind a button. A worked example teaches the step it is built
      // around, and a reader who has to press something to find out what a step decides has
      // already been told it is somebody else's business. Drawn by the renderer the authored
      // branch uses, from the `authored` form every bundled ruleset carries. 2026-10-26.
      +(ruleset.authored
        ?rulesList(ruleset.authored.rules,ruleset.inputContract.fieldFrom??[],
          value=>{
            const setting=settingNamed(value);
            if(!setting)return typeof value==='string'&&value.includes(':')?value.slice(value.indexOf(':')+1):String(value);
            const held=n.params.parameters?.[setting],declared=ruleset.parameters.find(q=>q.name===setting);
            return held===undefined||held===null?`${setting} · not set`
              :`${setting} · ${held}${declared?.unitLabel?' '+declared.unitLabel:''}`;
          },esc)
        :'')
      +(ruleset.authored&&ruleset.inputContract.fieldFrom?.length
        // Copyable, because this ruleset reads columns off the records exactly as rules written
        // here do -- it names `authoredFacts` as its generator, which is that same function. The
        // notice below is true of the bespoke four and false of this one.
        ?`<p class="description">${esc(ruleset.title)} ${esc(ruleset.version)} is published and pinned, so these rules are not edited in place. A <strong>copy</strong> can be, on this step.</p>`
          +`<div class="notice">A copy is fed exactly what these rules are fed: ${esc(ruleset.title)} reads the columns you connect, through the same bindings, so rules copied onto this step compare the same values. The step stops applying the published ruleset and starts applying your copy, keeping what is wired to it. Resetting the example puts it back.</div>`
          +`<div class="inspector-actions"><button id="review-rules" class="button">Review these rules</button>`
          +`<button id="author-rules" class="button">Edit a copy on this step</button></div>`
        :ruleset.authored
        ?`<p class="description">${esc(ruleset.title)} ${esc(ruleset.version)} is published and pinned, so its rules are not edited here. They can be <strong>read</strong> in the same editor.</p>`
          // Read, not copied. Each published ruleset computes its own facts -- this one from
          // ${esc(ruleset.inputContract.factGenerator)} -- and a step applying rules written
          // here reads columns off records instead. The rules would look the same and be fed
          // something different, which is the one outcome worth preventing outright.
          +`<div class="notice">These rules can be read, not copied. ${esc(ruleset.title)} works out what it is classifying for itself — ${esc(ruleset.inputContract.factGenerator.split('#').pop()||'its own fact generator')} derives the values the rules compare — while rules written for a step read columns off the records you connect. A copy would read the same and be fed something different.</div>`
          +`<div class="inspector-actions"><button id="review-rules" class="button">Review these rules</button>`
          +`<button id="author-rules" class="button">Write rules for this step instead</button></div>`
        // A ruleset shipped without a structured source. None do today, and the gate says so on
        // every build; this is what the Inspector says honestly if one ever does, rather than
        // offering a button that would open an empty editor.
        :`<p class="description">${esc(ruleset.title)} ${esc(ruleset.version)} is published and pinned, and this build carries no structured form of its rules. This step can apply rules you write instead; Undo puts it back.</p>`
          +`<div class="inspector-actions"><button id="author-rules" class="button">Write rules for this step instead</button></div>`);
  }else if(n.type==='policy'){
    content+=`<span class="inspector-section">Rule settings</span><div class="field"><label class="field-label" for="threshold">Distance threshold</label><div class="input-unit"><input id="threshold" type="number" min="0" max="1000" step="0.5" value="${n.params.thresholdKm}"><span>km</span></div><small>Flag distances strictly greater than this value.</small></div><div class="rule-preview">When the heat alert is <b>active</b><br>and the nearest center is <b>more than ${n.params.thresholdKm} km away</b>,<br>flag the neighborhood for review.</div><span class="inspector-section">Missing evidence</span><p class="description">Missing coordinates, missing centers, or an unknown alert produce “Insufficient data”.</p><div class="inspector-divider"></div><span class="inspector-section">Execution engine</span><div class="engine-card"><span class="engine-mark">⋈</span><div><strong>EYE-JS · Notation3</strong><small>WebAssembly · runs on this device</small></div></div><div class="notice">Illustrative screening criteria. A flag is a reason to review evidence, not a risk estimate or an intervention order.</div>`;
  }else if(n.type==='alert'){
    content+=`<div class="field"><label class="field-label" for="alert-state">Heat alert status</label><select id="alert-state"><option value="true" ${n.params.active===true?'selected':''}>Active</option><option value="false" ${n.params.active===false?'selected':''}>Inactive</option><option value="null" ${n.params.active===null?'selected':''}>Unknown</option></select><label class="field-label" for="assessment-date">Assessment date</label><input id="assessment-date" type="date" value="${n.params.date}"><small>This example supplies a single alert status for all locations on the assessment date. No external alert feed is queried.</small></div>`;
  }else if((n.type==='places'||n.type==='centers')){
    content+=labelForm('source-label','Source label',n.params.label)+`<div class="detail-row"><span>Records</span><strong>${n.params.data.features.length}</strong></div><div class="detail-row"><span>Coordinates</span><strong>Longitude, latitude · CRS84</strong></div><button id="replace-data" class="button small">↑ Replace with local GeoJSON</button>${recordsPanel(n.id,n.params.data)}<small class="muted">Point FeatureCollections only, up to 2,000 records. Files stay in this browser.</small>`;
  }else if(n.type==='measure_distance'){
    // A structured editor for the candidate filter, which is what `access`'s two selects became.
    // The comparator is a select. The FIELD and the VALUES are typed, and that is a limitation
    // stated rather than hidden: a candidate layer computed upstream -- the graded facilities,
    // here -- publishes no vocabulary a UI can read, and intermediate node values are not in the
    // run's outputs. Offering a value list would mean inventing one. Experiment 61's declared
    // field schema is what would turn these into selects; until then the practitioner states the
    // set, and the receipt records exactly what was matched against what.
    const conditions=n.params.candidateFilter??[];
    content+='<span class="inspector-section">Eligible candidates</span>';
    content+=conditions.length
      ?'<p class="description">An attribute name, then the values to match, separated by commas. Matched exactly against the candidate\u2019s own attribute; a candidate without that attribute does not match.</p>'
      :'<p class="description">Every candidate is eligible. Add a condition to narrow the search by the candidates\u2019 own attributes.</p>';
    conditions.forEach((condition,index)=>{
      content+=`<div class="field"><label class="field-label" for="filter-field-${index}">Condition ${index+1}</label>`
        +`<input id="filter-field-${index}" type="text" value="${esc(condition.field)}">`
        +`<select id="filter-comparator-${index}"><option value="in"${condition.comparator==='in'?' selected':''}>is one of</option>`
        +`<option value="notIn"${condition.comparator==='notIn'?' selected':''}>is not one of</option></select>`
        +`<input id="filter-values-${index}" type="text" value="${esc(condition.values.map(String).join(', '))}">`
        +`<button id="filter-remove-${index}" class="button small">Remove condition</button></div>`;
    });
    content+='<button id="filter-add" class="button small">Add a condition</button>';
    content+=`<span class="inspector-section">Spatial operation</span><div class="detail-row"><span>Method</span><strong>Haversine</strong></div><div class="detail-row"><span>Earth model</span><strong>Sphere · 6,371.0088 km</strong></div><div class="detail-row"><span>Units</span><strong>Kilometers</strong></div><div class="rule-preview">For each neighborhood, find the cooling center with the <b>shortest great-circle distance</b>.</div><p class="description">Computed in JavaScript before N3 inference. Source coordinates are longitude and latitude. Full precision is used for classification; the map and table round for display.</p><div class="notice">This is not road distance, travel time, facility availability, or evidence of service access.</div>`;
  }else if(n.type==='chart_output'||n.type==='output'){
    // ONE PICKER PER PORT, no mode. The question "what shape is this?" was asked before the
    // practitioner had the shape, and it decided which ports existed -- so a table of rates met a
    // node with a single "Reasoning result" port and nothing to aim at. The practitioner,
    // 2026-10-28: *"If the table's role is to represent decisions, it's still a table and if it
    // has categories with numeric values, it can be presented as a chart."* So the chart draws
    // what it is given, and what is connected decides.
    if(n.type==='chart_output'){
      const port=(id:string,label:string,type:string,hint:string)=>{
        const sources=workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)===type);
        if(!sources.length)return '';
        return `<div class="field"><label class="field-label" for="chart-${id}">${label}</label>`
          +`<select id="chart-${id}" data-map-port="${id}"><option value="">Not connected</option>`
          +sources.map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port===id&&e.from===x.id)?'selected':''}>${esc(x.params.label||TYPES[x.type].title)}</option>`).join('')
          +`</select><small>${hint}</small></div>`;
      };
      content+=port('records','Table','table',
        'A bar per row: the category column against the number. A rate, a total within groups, a '
        +'derived value or a case series \u2014 whatever the table was made for.')
        +port('decisions','Reasoning result','decisions',
          'Counts every input record once by decision, access zone or evidence tier.')
        +port('polygons','Polygon summaries','polygons',
          'Counts or totals by polygon, from a summarised layer.');
      // WHICH COLUMN, only where there is a choice to make. A rate keys on `group` alone, so
      // asking would be asking a question with one answer.
      const table=workflow.edges.find(e=>e.to===n.id&&e.port==='records');
      const columns=table?tableKeyColumns(workflow.nodes.find(x=>x.id===table.from)):[];
      if(columns.length>1)
        content+=`<div class="field"><label class="field-label" for="chart-key-column">Category column</label>`
          +`<select id="chart-key-column"><option value="">First column \u00b7 ${esc(columns[0])}</option>`
          +columns.map(name=>`<option value="${esc(name)}" ${n.params.keyColumn===name?'selected':''}>${esc(name)}</option>`).join('')
          +`</select><small>This table keys on ${esc(columns.join(', '))}. One bar per row either way; the column chosen is the one the bars are labelled by.</small></div>`;
      // WHAT THE READER CALLS IT, and how it is shown. Both were in the markup this branch
      // replaced and both are still the practitioner's to set; only the question about shape is
      // gone.
      content+=`<div class="field"><label class="field-label" for="output-label">Results tab name</label>`
        +`<input id="output-label" maxlength="60" value="${esc(n.params.label||'')}"></div>`
        // DISPLAY AS is not the mode that was removed. It chooses which OUTPUT WIDGET this is --
        // a map, a table or a chart -- and the node becomes that widget. The question that went
        // was the one asked INSIDE a chart about the shape of its own input.
        +`<div class="field"><label class="field-label" for="output-view">Display as</label>`
        +`<select id="output-view"><option value="map">Map</option>`
        +`<option value="table">Table</option><option value="bars" selected>Bar chart</option>`
        +`</select></div>`
        +`<div class="rule-preview">Each output node creates a named tab in Results. Connect it `
        +`to the results you want to display, then run the workflow.</div>`;
    }else content+=`<div class="field"><label class="field-label" for="chart-decisions">Reasoning result</label><select id="chart-decisions" data-map-port="decisions"><option value="">Select input</option>${workflow.nodes.filter(x=>outputOf(x)==='decisions').map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port==='decisions'&&e.from===x.id)?'selected':''}>${esc(x.params.label||TYPES[x.type].title)} · ${esc(x.id)}</option>`).join('')}</select></div>`;
    if(n.type==='chart_output')content+=chartControls(n);
  }
  if(['study_area','point_input','places','centers','measure_area','coverage_check','map_output','table_output'].includes(n.type))content+='<div class="source-card" data-spatial-reference><span class="inspector-section">Coordinate reference system</span><h3>WGS84 · EPSG:4326</h3><p>Stored coordinates: longitude, latitude in degrees (OGC:CRS84). A source reads degrees or a UTM zone and converts on import; Reproject points projects mid-workflow.</p></div>';
  // A map can always take another point layer: there is no mode in which it cannot draw points.
  if(n.type==='map_output'||(n.type==='table_output'&&(!n.params.inputMode||n.params.inputMode==='spatial')))content+=`<div class="inspector-actions"><button id="add-point-input" class="button small" ${(n.params.pointInputCount??1)>=MAX_POINT_LAYERS?'disabled':''}>＋ Add point input</button><button id="remove-point-input" class="button small" ${(n.params.pointInputCount??1)<=1?'disabled':''}>Remove last input</button></div><p class="muted">${n.type==='table_output'?'No boundary required for point inputs':'One study boundary'} · up to 8 point layers and 2,000 records combined. Each added port needs a source.</p>`;
  if(exampleKey(workflow)==='raster'&&(n.type==='raster_input'||n.type==='clip_raster'))content+='<div class="source-card"><span class="inspector-section">Raster workflow steps</span><p>Prepare your GeoTIFF and citation, preview the clip, then Run workflow to populate the map.</p><div class="inspector-actions">'+(['raster_input','clip_raster','map_output'] as NodeType[]).map((type,i)=>{const target=workflow.nodes.find(x=>x.type===type);return '<button class="button small" data-raster-step="'+esc(target?.id||'')+'" '+(!target?'disabled':'')+'>'+[ '1. Raster input','2. Clip parameters','3. Map'][i]+'</button>';}).join('')+'</div></div>';
  content+=evidenceInspector(n);
  content+=identityMarkup(n.type,esc);
  const incoming=workflow.edges.filter(e=>e.to===n.id);content+=`<div class="inspector-divider"></div><span class="inspector-section">Connections</span>${incoming.map(e=>`<div class="detail-row"><span>${esc(e.port)}</span><strong>${esc(workflow.nodes.find(x=>x.id===e.from)?.params.label||TYPES[workflow.nodes.find(x=>x.id===e.from)!.type].title)}</strong></div>`).join('')||'<p class="muted">Source node · no incoming connections</p>'}<div class="inspector-actions"><button id="duplicate-node" class="button small">Duplicate</button><button id="delete-node" class="button small danger">Remove node</button></div>`;
  // One note for all nine zone-taking widgets, appended here rather than written into each of
  // the five places a zone field is rendered. It reports; it does not refuse. `metric()` already
  // refuses a coordinate more than 6 degrees from the central meridian -- which is a zone too
  // wide, so an off-by-one zone passes and costs +0.17% at London's latitude, +0.47% at 15N.
  // A study area has no zone of its own and is where the zone is DECIDED: everything measured
  // afterwards inherits whatever the first measuring widget was given. The practitioner,
  // 2026-10-15: "selecting the study area should automatically suggest the UTM zone and the pros
  // and cons for selecting a particular one if there is more than one possible choice."
  //
  // So the advice appears here too, before any measuring widget exists to carry it, and when the
  // area spans more than one zone it names each candidate with what that choice costs rather
  // than only saying that no answer is right.
  if(n.type==='study_area'&&(n.params as {geometry?:unknown}).geometry){
    const advice=suggestUTM(workflow);
    if(advice){
      const positions=workflowPositions(workflow);
      const name=(c:{zone:number;hemisphere:string})=>`${c.zone}${c.hemisphere==='north'?'N':'S'}`;
      const costOf=(zone:number)=>{
        const choice={zone,hemisphere:advice.choice.hemisphere};
        const worst=positions.reduce((most,position)=>Math.max(most,utmScaleFactor(position,choice)),0);
        return (worst-1)*100;
      };
      const candidates=(advice.straddles.length?advice.straddles:[advice.choice.zone])
        .map(zone=>({zone,cost:costOf(zone)})).sort((a,b)=>a.cost-b.cost);
      content+=`<div class="${advice.straddles.length?'notice':'rule-preview'}" data-zone-advice>`
        +`<strong>Measuring in metres will use UTM zone ${esc(name(advice.choice))}.</strong> `
        +`Suggested from ${advice.positions} coordinate${advice.positions===1?'':'s'} already on this canvas. `
        +`Nothing is set here — the first widget that measures carries the zone, and this is what it will be offered.`
        +(advice.straddles.length
          ?`<p>This area spans ${advice.straddles.length} zones, so <strong>no single zone is right</strong> `
            +`and the choice is which side to keep whole. What each costs, as the most any coordinate `
            +`here would be stretched:</p><table class="inspector-table"><thead><tr><th>Zone</th>`
            +`<th>Worst stretch</th><th></th></tr></thead><tbody>`
            +candidates.map(c=>`<tr><td>${esc(name({zone:c.zone,hemisphere:advice.choice.hemisphere}))}</td>`
              +`<td>${c.cost.toFixed(3)}%</td><td>${c.zone===advice.choice.zone?'holds most of the area':''}</td></tr>`).join('')
            +`</tbody></table>`
            +`<p class="muted">A stretch applies to every length measured afterwards, so it is systematic rather than random: an area, a catchment and a distance are all wrong in the same direction by about this much.</p>`
          :` Measured over this area, it stretches ground distance by at most <strong>${candidates[0].cost.toFixed(3)}%</strong>.`)
        +`</div>`;
    }
  }
  const zoned=n.params as Record<string,unknown>;
  if(typeof zoned.zone==='number'&&typeof zoned.hemisphere==='string'){
    const advice=suggestUTM(workflow);
    if(advice){
      const chosen={zone:zoned.zone as number,hemisphere:zoned.hemisphere as 'north'|'south'};
      const matches=advice.choice.zone===chosen.zone&&advice.choice.hemisphere===chosen.hemisphere;
      const worst=workflowPositions(workflow).reduce((most,position)=>Math.max(most,utmScaleFactor(position,chosen)),0);
      const name=(c:{zone:number;hemisphere:string})=>`${c.zone}${c.hemisphere==='north'?'N':'S'}`;
      content+=`<div class="${matches?'rule-preview':'notice'}" data-utm-advice>`
        +(matches?`UTM zone ${name(chosen)} matches this workflow's data.`
          :`<strong>This workflow's data is in UTM zone ${name(advice.choice)}</strong>, not ${name(chosen)}.`)
        +` Measured over ${advice.positions} configured coordinate${advice.positions===1?'':'s'}, this zone stretches ground distance by up to <strong>${((worst-1)*100).toFixed(3)}%</strong>.`
        +(advice.straddles.length?` The data spans zones ${advice.straddles.join(' and ')}, so no single zone is right and this is a choice about which side to keep whole.`:'')
        +(matches?'':` <button class="text-button" data-use-suggested-zone="${advice.choice.zone}:${advice.choice.hemisphere}">Use zone ${name(advice.choice)}</button>`)
        +`</div>`;
    }
  }
  $('#inspector-content').innerHTML=`<div class="inspector-body">${content}</div>`;
  // QUICK LOOK AT WHAT THIS STEP PRODUCED, for every widget that emits a table.
  //
  // The practitioner, 2026-10-27: *"Any widget that works on a table and outputs a table should
  // enable Quick Look at the output table."* There were two Quick Looks and neither was this
  // one: `table_input` offered a look at the table it IMPORTED, and the records panel offered
  // one for point records. A step in the middle of a chain -- relate, group, derive, select rows,
  // two-by-two -- produced a table a practitioner could only read by switching to the Results
  // tab and finding the right one among several.
  //
  // DERIVED FROM THE PORT CONTRACT rather than listed per widget: `TYPES[type].output==='table'`
  // is the same declaration the canvas uses to decide what may connect to what. A table-emitting
  // widget added later gets this without anybody remembering, which is the failure this file has
  // recorded twice already -- the Inspector's hand-written basemap list, and the catalogue's
  // hand-written group list that left a widget out entirely.
  //
  // The INSPECTED node's own output, not the active result tab: the practitioner is looking at
  // this step, and the panel on the right is showing whichever tab was last chosen.
  if(TYPES[n.type].output==='table'&&n.type!=='table_input'){
    const produced=result?.tables?.[n.id];
    const anchor=$('#inspector-content').querySelector('.inspector-body');
    if(anchor){
      const block=document.createElement('div');
      if(produced){
        block.innerHTML='<div class="inspector-actions">'
          +'<button id="output-quick-look" class="button">\u2922 Quick look at the output table</button></div>';
      }else{
        // Said rather than hidden. A missing button reads as "this widget cannot do that"; the
        // truth is that there is nothing to look at yet, which is a different thing and is
        // fixed by pressing Run.
        block.innerHTML=`<p class="description">This step emits a table. Run the workflow to `
          +'look at what it produces.</p>';
      }
      anchor.append(block);
    }
  }
  optionalElement('#output-quick-look')?.addEventListener('click',()=>{
    const produced=result?.tables?.[n.id];
    if(!produced)return;
    const view=tableViewOf(produced,`${n.params.label||TYPES[n.type].title} \u00b7 output`);
    // WHICH HALF OF THE ROW CAME FROM WHICH TABLE, for a related table only.
    //
    // The practitioner, 2026-10-27: *"pandas also gives you the original keys so you know which
    // half of the row came from which table."* Here exactly one column crosses over, so the
    // annotation is a sentence rather than an `_x`/`_y` suffix -- and a note above the column
    // beats a suffix in the name, because a renamed column is a different column to everything
    // downstream and a note is not.
    const relation=result?.relations?.[n.id];
    if(relation){
      const left=portSourceName(workflow,n.id,'records','the first table');
      const right=portSourceName(workflow,n.id,'related','the second table');
      // Over the columns the VIEW shows, not the stored keys. Quick Look draws a frame, so the
      // left table's `measure` column is gone and its values are the headings -- and those
      // headings are the numbers a reader is here to check. Naming only the stored keys would
      // have left every number column unattributed, which is the half of the row the question
      // was about.
      view.origins=Object.fromEntries(view.columns.map(column=>
        [column,column===relation.bring?`brought from ${right}, matched on ${relation.on}`
          :`from ${left}`]));
      view.note=`${view.note??''} ${relation.related.toLocaleString()} of `
        +`${relation.offered.toLocaleString()} offered rows related`
        +(relation.dropped?`; ${relation.dropped.toLocaleString()} dropped for `
          +`${relation.on} ${relation.gaps.map(g=>g.key).join(', ')}, which are not shown here `
          +`because they are not in this table`:' and none dropped')+'.';
    }
    openTableViewer(view,esc);
  });
  // DECIDING THE JOIN. The dialog is given the two tables and a way to re-plan, so changing the
  // comparison or the category name inside it redraws the consequence without touching the
  // workflow. Only Finalize writes, and what it writes is the practitioner's choice together with
  // a signature of the gap it was made about.
  optionalElement('#relate-open-join')?.addEventListener('click',()=>{
    const node=workflow.nodes.find(x=>x.id===n.id);
    if(node?.type!=='relate_table')return;
    const p=node.params;
    const left=tableOnPort(workflow,n.id,'records'),right=tableOnPort(workflow,n.id,'related');
    if(!left||!right)return;
    openRelateJoin({
      title:`${p.label||TYPES[n.type].title} \u00b7 the join`,
      leftLabel:portSourceName(workflow,n.id,'records','the first table'),
      rightLabel:portSourceName(workflow,n.id,'related','the second table'),
      on:p.on,bring:p.bring,
      normalisation:p.normalisation??'fuzzy',
      ...(p.unmatched?{settled:p.unmatched}:{}),
      shapeFor:(normalisation,label)=>{
        try{
          return relateShape(left,right,{on:p.on,bring:p.bring,normalisation,
            ...(p.measureKey?{measureKey:p.measureKey}:{}),
            ...(label!==undefined?{unmatched:{decision:'keep' as const,label,signature:''}}:{})});
        }catch(error){return {refusal:errorMessage(error)};}
      },
      onFinalize:choice=>{change(w=>{
        const target=getNode(w,n.id,'relate_table');
        target.params.normalisation=choice.normalisation;
        if(choice.unmatched)target.params.unmatched=choice.unmatched;
        else delete target.params.unmatched;
      },{requirePersistence:true});},
    },esc);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-raster-step]').forEach(button=>button.onclick=()=>{selected=button.dataset.rasterStep;render();});
  optionalElement('#manage-references')?.addEventListener('click',()=>{let baseline=JSON.stringify(n.references||[]);openEvidenceEditor(n,refs=>{const current=workflow.nodes.find(x=>x.id===n.id);if(!current||JSON.stringify(current.references||[])!==baseline)throw new Error('The node changed while editing. Close and reopen its references.');const saved=change(w=>{required(w.nodes.find(x=>x.id===n.id)).references=structuredClone(refs);},{requirePersistence:true});if(saved)baseline=JSON.stringify(refs);return saved;});});
  optionalElement('#add-point-input')?.addEventListener('click',()=>change(w=>{const node=required(w.nodes.find(x=>x.id===n.id)) as WorkflowNode<'map_output'|'table_output'>;node.params.pointInputCount=(node.params.pointInputCount??1)+1;w.edges=w.edges.filter(e=>!(e.to===n.id&&e.port==='coverage'));}));
  optionalElement('#remove-point-input')?.addEventListener('click',()=>change(w=>{const node=required(w.nodes.find(x=>x.id===n.id)) as WorkflowNode<'map_output'|'table_output'>,count=node.params.pointInputCount??1;if(count>1){w.edges=w.edges.filter(e=>!(e.to===n.id&&e.port===pointPort(count-1)));node.params.pointInputCount=count-1;}}));
  document.querySelectorAll<HTMLInputElement>('#map-label,#table-label').forEach(el=>el.addEventListener('change',e=>change(w=>required(w.nodes.find(x=>x.id===n.id)).params.label=control(e).value.trim()||TYPES[n.type].title)));
  const contextToggle=document.querySelector<HTMLInputElement>('#polygon-context-toggle');if(contextToggle)contextToggle.onchange=()=>change(w=>{const target=w.nodes.find(x=>x.id===n.id);if(target?.type==='map_output'){target.params.contextPoints=contextToggle.checked;if(!contextToggle.checked)w.edges=w.edges.filter(e=>e.to!==n.id||e.port!=='context');}});
  document.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-catchment-param]').forEach(el=>el.onchange=()=>change(w=>{const target=required(w.nodes.find(x=>x.id===n.id));const params=target.params as unknown as Record<string,unknown>;
      // An emptied OPTIONAL field means unset, not NaN and not zero. The same shape as the
      // ruleset setting box fixed earlier today: `Number('')` is 0 and an empty number input
      // otherwise lands here as NaN, and both are figures nobody typed.
      if(el.dataset.optional==='true'&&el.value.trim()===''){delete params[el.dataset.catchmentParam!];return;}
      params[el.dataset.catchmentParam!]=el.dataset.catchmentParam==='thresholds'?(el.value.trim()?el.value.split(',').map(v=>Number(v.trim())):[]):el instanceof HTMLInputElement&&el.type==='checkbox'?el.checked:el instanceof HTMLInputElement&&el.type==='number'?(el.value===''?NaN:Number(el.value)):el.value;}));
  // CHANGING THE MAP TYPE CAN STRAND THE BASEMAP, and the select would then disagree with what is
  // stored: the list drops a vector style on the way to a static figure, the held value stays
  // `ofm-liberty`, and the control shows `None` while the node says otherwise. So the param is
  // moved too, and the practitioner is told -- a presentation change is theirs, and quietly
  // discarding a choice they made inside it is not.
  //
  // Added with the per-presentation list on 2026-10-27. The listener is separate from the generic
  // `data-catchment-param` writer above so that one keeps its single job; it runs after it,
  // because that one is assigned as `onchange` and this is added as a listener.
  optionalElement('#polygon-presentation')?.addEventListener('change',e=>{
    if(n.type!=='map_output')return;
    const presentation=control(e).value==='interactive'?'interactive':'plot';
    const held=(workflow.nodes.find(x=>x.id===n.id) as WorkflowNode<'map_output'>|undefined)?.params.basemap;
    if(!held||held==='none'||basemapAvailable(held,presentation))return;
    const name=BASEMAP_OPTIONS.find(o=>o.value===held)?.label||held;
    change(w=>{getNode(w,n.id,'map_output').params.basemap='none';});
    toast(`${name} is drawn from vector tiles, which a static figure cannot bake in, so this map `
      +'now has no basemap. OpenStreetMap and OpenTopoMap are fetched once and drawn into the '
      +'figure, and are offered here; the vector styles are offered on the interactive map.',
      {tone:'notice'});
    renderInspector();renderResults();
  });
  for(const key of ['innerM','outerM','seed','resolution','minOccupancy'])optionalElement(`#privacy-${key}`)?.addEventListener('change',e=>change(w=>{(required(w.nodes.find(x=>x.id===n.id)).params as unknown as Record<string,unknown>)[key]=control(e).value===''?NaN:Number(control(e).value);}));
  optionalElement('#comparison-zone')?.addEventListener('change',e=>change(w=>getNode(w,n.id,'compare_point_sets').params.zone=control(e).value===''?NaN:Number(control(e).value)));
  optionalElement('#comparison-hemisphere')?.addEventListener('change',e=>change(w=>getNode(w,n.id,'compare_point_sets').params.hemisphere=control(e).value as 'north'|'south'));
  document.querySelectorAll<HTMLInputElement>('[data-micro-param]').forEach(el=>el.onchange=()=>change(w=>{
    const target=getNode(w,n.id,'micro_workflow');
    const name=required(el.dataset.microParam);
    const found=bundledCompositions().find(c=>c.id===target.params.composition.id
      &&c.version===target.params.composition.version);
    const declared=found?.parameters.find(p=>p.name===name);
    target.params.parameters[name]=typeof declared?.default==='number'
      ?(el.value===''?NaN:Number(el.value)):el.value;
  }));
  optionalElement('#micro-explode')?.addEventListener('click',()=>{
    const exploded=change(w=>{
      const next=explodeMicroWorkflow(w,n.id,resolveComposition);
      w.nodes=next.nodes;w.edges=next.edges;selected=next.nodes.find(x=>x.id.startsWith(`${n.id}-`))?.id??selected;
    });
    if(exploded===false)return;
    flow?.fit();
    toast('Exploded into its primitives. Undo to put it back as one step.');
  });
  optionalElement('#chart-key-column')?.addEventListener('change',e=>change(w=>{
    const target=getNode(w,n.id,'chart_output'),raw=control(e).value.trim();
    if(raw==='')delete target.params.keyColumn;else target.params.keyColumn=raw;
  }));
  optionalElement('#series-orientation')?.addEventListener('change',e=>change(w=>{
    getNode(w,n.id,'chart_output').params.orientation=control(e).value as 'horizontal'|'vertical';
  },{spatial:false}));
  optionalElement('#mean-center-zone')?.addEventListener('change',e=>change(w=>getNode(w,n.id,'mean_center').params.zone=control(e).value===''?NaN:Number(control(e).value)));
  optionalElement('#mean-center-hemisphere')?.addEventListener('change',e=>change(w=>getNode(w,n.id,'mean_center').params.hemisphere=control(e).value as 'north'|'south'));
  optionalElement('#catchment-output-mode')?.addEventListener('change',e=>change(w=>{const target=required(w.nodes.find(x=>x.id===n.id));(target.params as unknown as Record<string,unknown>).inputMode=control(e).value;w.edges=w.edges.filter(edge=>edge.to!==n.id);}));
  optionalElement('#polygon-output-label')?.addEventListener('change',e=>change(w=>{required(w.nodes.find(x=>x.id===n.id)).params.label=control(e).value;}));
  optionalElement('#save-network')?.addEventListener('click',()=>{try{const text=(document.querySelector('#network-json') as HTMLTextAreaElement).value;if(text.length>2000000)throw new Error('Network JSON exceeds 2 MB.');const data=JSON.parse(text);change(w=>{getNode(w,n.id,'network_input').params.data=data;},{requirePersistence:true});}catch(e){toast(errorMessage(e),{tone:'failure'});}});
  for(const selector of ['#network-file','#network-upload'])document.querySelector<HTMLInputElement>(selector)?.addEventListener('change',async e=>{const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;const baseline=JSON.stringify(workflow);try{const data=await importNetwork(file,getNode(workflow,n.id,'network_input').params.maxNodes);if(JSON.stringify(workflow)!==baseline)throw new Error('Workflow changed; import again.');const digest=await payloadDigest(data);if(!await keepDataset(digest,data))throw new Error(`This ${(payloadBytes(data)/1e6).toFixed(1)} MB street network could not be kept on this device, so it was not saved. Export the workflow to a file to keep it.`);if(!change(w=>{const target=getNode(w,n.id,'network_input');target.params.data=data;target.params.dataRef=digest;},{requirePersistence:true}))await dropPayload(digest);}catch(e){toast(errorMessage(e),{tone:'failure'});}});
  // The status panel. Rendered from the LAST check, so it survives the Inspector being redrawn,
  // and asked for only on click: every check is a request to a donated service.
  const paintEndpoints=()=>{
    const box=optionalElement('#endpoint-status');if(!box)return;
    if(!endpointStatuses){box.innerHTML='';return;}
    box.innerHTML=endpointStatuses.map(s=>{
      const host=s.url.replace(/^https?:\/\//,'').replace(/\/api.*$/,'');
      const state=!s.reachable?`not answering \u2014 ${esc(s.error||'no reply')}`
        :s.slotsAvailable===undefined?'answering; it did not say how busy it is'
        :s.slotsAvailable>0?`${s.slotsAvailable} of ${s.rateLimit??s.slotsAvailable} slots free now`
        :`busy${typeof s.waitSeconds==='number'?`, next slot in ${s.waitSeconds} s`:''}`;
      const running=s.runningQueries?`, ${s.runningQueries} running`:'';
      return `<p><strong>${esc(s.operator)}</strong> \u00b7 ${esc(state)}${esc(running)}`
        +`<br><span class="muted">${esc(host)}</span></p>`;
    }).join('')+`<p class="muted">Checked ${esc(endpointsCheckedAt??'')}. Each answer is that instance's own.</p>`;
  };
  optionalElement('#check-endpoints')?.addEventListener('click',async e=>{
    const button=e.currentTarget as HTMLButtonElement;
    button.disabled=true;button.textContent='Asking each instance\u2026';
    try{
      const {overpassStatuses}=await import('./street-network.js');
      endpointStatuses=await overpassStatuses();
      endpointsCheckedAt=new Date().toLocaleTimeString();
    }catch(error){toast(errorMessage(error),{tone:'failure'});}
    finally{button.disabled=false;button.textContent='Check endpoint status';paintEndpoints();}
  });
  paintEndpoints();
  // AN EXTRACT ON THIS DEVICE. The file is never copied into either store: it is
  // read where it sits, clipped to the study area as it is decoded, and only the
  // network it yields is kept. See docs/experiments/129.
  optionalElement('#network-extract')?.addEventListener('change',async event=>{
    const input=event.target as HTMLInputElement;
    const file=input.files?.[0];
    if(!file)return;
    const status=document.querySelector<HTMLElement>('#network-extract-status');
    const say=(message:string)=>{if(status)status.textContent=message;};
    const baseline=JSON.stringify(workflow);
    try{
      const {boundary,node:areaNode}=previewArea(workflow,n.id);
      const node=getNode(workflow,n.id,'network_input');
      const mode=node.params.travelMode??defaultTravelMode(
        areaNode.params.source==='drawn'?areaNode.params.boundary?.boundaryID:undefined);
      const {networkInWorker}=await import('./street-engine.js');
      const bytes=new Uint8Array(await file.arrayBuffer());
      // In a worker: the page stays answerable while a province is read, which is what stops the
      // browser offering to kill it.
      const network=await networkInWorker(bytes,{boundary,mode,marginM:node.params.marginM??250,
        walkSpeedMPerMin:75,onPhase:say});
      if(JSON.stringify(workflow)!==baseline)throw new Error('The workflow changed while the extract was read. Choose the file again.');
      say('Keeping it on this device\u2026');
      const digest=await payloadDigest(network);
      if(!await keepDataset(digest,network))
        throw new Error(`This ${(payloadBytes(network)/1e6).toFixed(1)} MB street network could not be kept on this device, so it was not saved.`);
      if(change(w=>{const target=getNode(w,n.id,'network_input');target.params.data=network;target.params.dataRef=digest;},{requirePersistence:true})){
        say('');
        toast(`${network.nodes.length.toLocaleString('en')} junctions read from the extract and saved on this device. Run the workflow to update results.`);
      }else await dropPayload(digest);
    }catch(error){say('');toast(errorMessage(error),{tone:'failure'});}
    finally{input.value='';}
  });
  // A POLYGON LAYER, read from a file or acquired from an extract.
  //
  // The two paths put the same thing in the same place and differ in where it came from, so they
  // share the keeping: features go to the payload store and the workflow keeps a reference.
  // Measured 2026-10-28, South London's water at 45 vertices minimum: 186 features, 32,999
  // vertices, 788 kB of params against a 5,226,496-byte store written twice per save. A layer
  // that an example SHIPS stays inline, because there the workflow file is the publication.
  optionalElement('#polygon-input-method')?.addEventListener('change',e=>change(w=>{
    const target=getNode(w,n.id,'polygon_input');
    target.params.inputMethod=control(e).value==='extract'?'extract':'file';
  }));
  document.querySelectorAll<HTMLInputElement>('[data-area-kind]').forEach(el=>el.onchange=()=>change(w=>{
    const target=getNode(w,n.id,'polygon_input');
    const kind=required(el.dataset.areaKind) as AreaKind;
    const held=new Set(target.params.kinds??[]);
    if(el.checked)held.add(kind);else held.delete(kind);
    target.params.kinds=AREA_KINDS.filter(k=>held.has(k));
  }));
  // UNSET IS A VALUE HERE, not zero: unset reads every area of the chosen kinds, and the refusal
  // that follows names the threshold that would fit. A blank box that became 0 would read the
  // same way and say it was asked for.
  optionalElement('#polygon-min-vertices')?.addEventListener('change',e=>change(w=>{
    const target=getNode(w,n.id,'polygon_input'),raw=control(e).value.trim();
    if(raw==='')delete target.params.minVertices;else target.params.minVertices=Number(raw);
  }));
  optionalElement('#polygon-margin')?.addEventListener('change',e=>change(w=>{
    const target=getNode(w,n.id,'polygon_input'),raw=control(e).value.trim();
    target.params.marginM=raw===''?0:Number(raw);
  }));
  optionalElement('#polygon-name-field')?.addEventListener('change',e=>change(w=>{
    const target=getNode(w,n.id,'polygon_input'),raw=control(e).value.trim();
    if(raw==='')delete target.params.nameField;else target.params.nameField=raw;
  }));
  optionalElement('#polygon-layer-name')?.addEventListener('change',e=>change(w=>{
    const target=getNode(w,n.id,'polygon_input'),raw=control(e).value.trim();
    if(raw==='')delete target.params.layerName;else target.params.layerName=raw;
  }));
  // THE FILE IS HELD, NOT READ. Choosing one used to start the read on the spot, so every
  // setting above it had to be right BEFORE the file was picked: change a kind afterwards and the
  // layer still held what the old kinds matched, with nothing saying so.
  // HELD OUTSIDE THE DOM, because the panel re-renders on every setting change and a file input
  // cannot carry a selection across that. Choose the extract, then change a kind, and the input
  // is new and empty -- so the file lived for exactly as long as you changed nothing, which is
  // the opposite of what Apply is for.
  const held=()=>pendingPolygonFiles.get(n.id);
  const remember=(event:Event)=>{
    const file=(event.target as HTMLInputElement).files?.[0];
    if(file)pendingPolygonFiles.set(n.id,file);else pendingPolygonFiles.delete(n.id);
    announce();
  };
  const announce=()=>{
    const file=held();
    const apply=optionalElement('#polygon-apply') as HTMLButtonElement|null;
    const note=optionalElement('#polygon-apply-note'),pending=optionalElement('#polygon-pending');
    if(pending)pending.textContent=file?`Chosen: ${file.name}`:'';
    if(!apply||!note)return;
    const node=getNode(workflow,n.id,'polygon_input');
    // ONE THING AT A TIME, named. A disabled button that does not say why is a dead end.
    const missing=node.params.inputMethod==='extract'
      ?(!workflow.edges.some(e=>e.to===n.id&&e.port==='area')?'Connect a study area in step 2.'
        :!(node.params.kinds??[]).length?'Choose at least one kind in step 3.'
        :!file?'Choose an extract file in step 4.':'')
      :(!file?'Choose a file in step 2.':'');
    apply.disabled=!!missing;
    note.textContent=missing||'Ready. Nothing is read until you choose this.';
  };
  for(const id of ['#polygon-file','#polygon-extract'] as const)
    optionalElement(id)?.addEventListener('change',remember);
  announce();

  const readPolygonFile=async(file:File)=>{
    const baseline=JSON.stringify(workflow);
    try{
      const node=getNode(workflow,n.id,'polygon_input');
      const bytes=new Uint8Array(await file.arrayBuffer());
      const features=readPolygonFeatures(JSON.parse(new TextDecoder().decode(bytes)),
        {nameField:node.params.nameField,layerName:node.params.layerName});
      if(JSON.stringify(workflow)!==baseline)
        throw new Error('The workflow changed while the file was read. Choose it again.');
      const data={features};
      const digest=await payloadDigest(data);
      if(!await keepDataset(digest,data))
        throw new Error(`This layer could not be kept on this device, so it was not saved. Export `
          +`the workflow to a file to keep it.`);
      const sha256=await contentHash(bytes);
      if(change(w=>{
        const target=getNode(w,n.id,'polygon_input');
        target.params.data=data;target.params.dataRef=digest;
        target.params.source={filename:file.name,bytes:bytes.length,sha256,features:features.length};
        // A FILE LAYER HAS NO RETRIEVAL, and leaving the previous one behind would leave the run's
        // staleness check comparing this file against a box it was never read for.
        delete target.params.retrieval;
      },{requirePersistence:true}))
        toast(`${features.length.toLocaleString('en')} polygon feature`
          +`${features.length===1?'':'s'} read. Run the workflow to use them.`);
      else await dropPayload(digest);
    }catch(error){toast(errorMessage(error),{tone:'failure'});}
  };
  // AN EXTRACT ON THIS DEVICE, on the arrangement `#network-extract` already uses: Geofabrik
  // sends no CORS header, so the file is the browser's own download and is read where it sits.
  // Nothing of the 124 MB is kept -- the filename and its digest are the whole trace of which
  // build was read, which matters because `-latest` redirects to a dated file that changes.
  const readPolygonExtract=async(file:File)=>{
    const status=document.querySelector<HTMLElement>('#polygon-extract-status');
    const say=(message:string)=>{if(status)status.textContent=message;};
    const baseline=JSON.stringify(workflow);
    try{
      const node=getNode(workflow,n.id,'polygon_input');
      const kinds=node.params.kinds??[];
      if(!kinds.length)throw new Error('Choose at least one kind of area to read.');
      // THE SCOPE IS THE STUDY AREA'S, which is why the port exists. previewArea refuses when
      // nothing is connected, and that refusal is the right one: a read with no box is a read of
      // whatever the file happens to hold.
      const {boundary}=previewArea(workflow,n.id);
      const bounds=geometryBounds(boundary);
      const bbox=readBox([bounds[0],bounds[1],bounds[2],bounds[3]],node.params.marginM??0);
      const bytes=new Uint8Array(await file.arrayBuffer());
      const {features,retrieval}=await areasInWorker(bytes,{kinds,bbox,
        nameTag:node.params.nameField,minVertices:node.params.minVertices},say);
      if(JSON.stringify(workflow)!==baseline)
        throw new Error('The workflow changed while the extract was read. Choose the file again.');
      say('Keeping the areas on this device…');
      const sha256=await contentHash(bytes);
      const read={...retrieval,filename:file.name,sha256,bytes:bytes.length};
      const data={features};
      const digest=await payloadDigest(data);
      if(!await keepDataset(digest,data))
        throw new Error(`These ${features.length.toLocaleString('en')} features could not be kept `
          +`on this device, so they were not saved. A higher vertex threshold reads fewer of them.`);
      if(change(w=>{
        const target=getNode(w,n.id,'polygon_input');
        target.params.data=data;target.params.dataRef=digest;target.params.retrieval=read;
        target.params.provenance=retrievalProvenance(read,{filename:file.name,sha256});
        target.params.source={filename:file.name,bytes:bytes.length,sha256,features:features.length};
      },{requirePersistence:true})){
        say('');
        toast(`${features.length.toLocaleString('en')} ${kinds.join(' and ')} feature`
          +`${features.length===1?'':'s'} read from the extract and saved on this device. `
          +`Run the workflow to use them.`);
      }else await dropPayload(digest);
    }catch(error){say('');toast(errorMessage(error),{tone:'failure'});}
  };
  // APPLY IS THE READ. Nothing happens until the practitioner says so, which is what lets every
  // setting above be changed in any order before it runs.
  optionalElement('#polygon-apply')?.addEventListener('click',async event=>{
    const button=event.currentTarget as HTMLButtonElement;
    const file=held();
    if(!file)return;
    button.disabled=true;const was=button.textContent;button.textContent='Reading\u2026';
    try{
      if(getNode(workflow,n.id,'polygon_input').params.inputMethod==='extract')
        await readPolygonExtract(file);
      else await readPolygonFile(file);
    }finally{button.textContent=was;pendingPolygonFiles.delete(n.id);announce();}
  });
  // THE GEOREFERENCED PLATE'S OWN CONTROLS, which did not exist until 2026-10-29. The widget was
  // addable, its parameters declared, the map drew what it carried, and `mapImage` refused with
  // "This step has no image yet. Choose a map image and its world file" -- naming two controls
  // that were nowhere. Same shape as the polygon layer's: both files are held, Apply reads them,
  // and the button says what it is still waiting for.
  const plateFiles=()=>pendingPlateFiles.get(n.id)||{};
  const platePending=()=>{
    const {image,world}=plateFiles();
    const apply=optionalElement('#map-image-apply') as HTMLButtonElement|null;
    const note=optionalElement('#map-image-apply-note');
    const one=optionalElement('#map-image-pending'),two=optionalElement('#map-image-world-pending');
    if(one)one.textContent=image?`Chosen: ${image.name}`:'';
    if(two)two.textContent=world?`Chosen: ${world.name}`:'';
    if(!apply||!note)return;
    const missing=!image?'Choose a map image in step 1.'
      :!world?'Choose its world file in step 2.':'';
    apply.disabled=!!missing;
    note.textContent=missing||'Ready. Nothing is placed until you choose this.';
  };
  optionalElement('#map-image-label')?.addEventListener('change',event=>change(w=>{
    getNode(w,n.id,'map_image_input').params.label=(event.target as HTMLInputElement).value;}));
  optionalElement('#map-image-file')?.addEventListener('change',event=>{
    pendingPlateFiles.set(n.id,{...plateFiles(),
      image:(event.target as HTMLInputElement).files?.[0]});platePending();});
  optionalElement('#map-image-world')?.addEventListener('change',event=>{
    pendingPlateFiles.set(n.id,{...plateFiles(),
      world:(event.target as HTMLInputElement).files?.[0]});platePending();});
  optionalElement('#map-image-opacity')?.addEventListener('input',event=>{
    const shown=optionalElement('#map-image-opacity-value');
    if(shown)shown.textContent=`${Math.round(Number((event.target as HTMLInputElement).value)*100)}%`;});
  optionalElement('#map-image-opacity')?.addEventListener('change',event=>change(w=>{
    getNode(w,n.id,'map_image_input').params.opacity=
      Number((event.target as HTMLInputElement).value);}));
  platePending();
  optionalElement('#map-image-apply')?.addEventListener('click',async event=>{
    const button=event.currentTarget as HTMLButtonElement;
    const {image,world}=plateFiles();
    if(!image||!world)return;
    button.disabled=true;const was=button.textContent;button.textContent='Placing\u2026';
    try{
      const bytes=new Uint8Array(await image.arrayBuffer());
      // THE IMAGE'S OWN PIXEL SIZE, read from the image rather than asked for: a world file says
      // what ONE pixel covers, so the extent needs the count of them and nobody should type it.
      const bitmap=await createImageBitmap(image);
      const {width,height}=bitmap;bitmap.close();
      const data=await new Promise<string>((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result));
        reader.onerror=()=>reject(new Error('That image could not be read.'));
        reader.readAsDataURL(image);
      });
      const bounds=boundsFromWorldFile(readWorldFile(await world.text()),width,height);
      const sha256=await contentHash(bytes);
      const digest=await payloadDigest(data);
      if(!await keepDataset(digest,data))
        throw new Error('This image could not be kept on this device, so it was not placed. A '
          +'smaller export of the same plate will fit.');
      if(change(w=>{
        const target=getNode(w,n.id,'map_image_input');
        target.params.data=data;target.params.dataRef=digest;
        target.params.image={width,height,bytes:bytes.length,sha256,filename:image.name};
        target.params.bounds=bounds;
      },{requirePersistence:true})){
        pendingPlateFiles.delete(n.id);
        toast(`Placed ${width.toLocaleString('en')} \u00d7 ${height.toLocaleString('en')} pixels `
          +'as ground. Run the workflow to draw it.');
      }else await dropPayload(digest);
    }catch(error){toast(errorMessage(error),{tone:'failure'});}
    finally{button.textContent=was;platePending();}
  });
  optionalElement('#download-network')?.addEventListener('click',async e=>{const button=e.currentTarget as HTMLButtonElement,baseline=JSON.stringify(workflow);button.disabled=true;button.textContent='Downloading bounded OSM network...';
    // WHO ENDS AN ARRIVING DOWNLOAD. The practitioner, 2026-10-22: *"If nothing ever arrives, that
    // means there is no download. But there is an ongoing download -- this is where we are
    // applying that wrong cap."* No clock ends one now, so this does: the decision belongs to the
    // person watching the megabytes climb, not to a number borrowed from another library.
    const stop=new AbortController();
    const stopButton=document.querySelector<HTMLButtonElement>('#stop-network-download');
    if(stopButton){stopButton.hidden=false;stopButton.onclick=()=>{stopButton.disabled=true;
      stopButton.textContent='Stopping\u2026';stop.abort();};}
    try{const {boundary,node:areaNode}=previewArea(workflow,n.id);const node=getNode(workflow,n.id,'network_input');const data=await downloadOSMInTiles(boundary,node.params.marginM??250,node.params.maxNodes,(node.params.pauseSeconds??60)*1000,!!node.params.data?.nodes?.length,(phase,fraction)=>{networkDownloadPhase=phase;const line=document.querySelector<HTMLElement>('#network-download-status');if(line)line.textContent=phase;const bar=document.querySelector<HTMLButtonElement>('#download-network');if(bar){bar.textContent=phase;bar.style.backgroundImage=fraction===undefined?'':`linear-gradient(to right, var(--accent) ${Math.round(Math.min(1,fraction)*100)}%, transparent ${Math.round(Math.min(1,fraction)*100)}%)`;}},node.params.travelMode??defaultTravelMode(areaNode.params.source==='drawn'?areaNode.params.boundary?.boundaryID:undefined),stop.signal);if(JSON.stringify(workflow)!==baseline)throw new Error('Workflow changed during download; retry with the current boundary.');
    // The graph goes to the payload store and the workflow keeps a reference, so what localStorage
    // holds is a workflow and not a street network. Bunia is an estimated 14.2 MB against a
    // 5,226,496-byte store written twice per save; see docs/experiments/121.
    const digest=await payloadDigest(data);
    if(!await keepDataset(digest,data))throw new Error(`This ${(payloadBytes(data)/1e6).toFixed(1)} MB street network could not be kept on this device, so it was not saved. Export the workflow to a file to keep it, or cover a smaller area.`);
    // AND IF THE WORKFLOW WILL NOT TAKE IT, the payload goes back out. It was written to the store
    // before the workflow was asked, so a refusal left the bytes behind with nothing referring to
    // them: a device on 2026-10-21 showed "data 416.2 MB" beside this widget reading "0 nodes, 0
    // directed edges", and nothing in the application could reach them.
    if(change(w=>{const target=getNode(w,n.id,'network_input');target.params.data=data;target.params.dataRef=digest;},{requirePersistence:true})){networkDownloadError=null;toast('OSM network saved on this device. Run the workflow to update results.');}
    else await dropPayload(digest);}catch(e){networkDownloadError=errorMessage(e);toast(errorMessage(e),{tone:'failure'});}finally{button.disabled=false;button.textContent='Download and save OSM network';button.style.backgroundImage='';networkDownloadPhase=null;
      if(stopButton){stopButton.hidden=true;stopButton.disabled=false;stopButton.textContent='Stop';stopButton.onclick=null;}}});
  document.querySelectorAll<HTMLSelectElement>('[data-map-port]').forEach(el=>el.onchange=()=>change(w=>setConnection(w,el.value,n.id,el.dataset.mapPort!)));
  // Applying the suggested zone, so the advice is actionable rather than only stated. It sets
  // both the zone and the hemisphere together: a zone number without its hemisphere is half an
  // answer, and the two defaults were wrong together.
  document.querySelectorAll<HTMLButtonElement>('[data-use-suggested-zone]').forEach(el=>el.onclick=()=>{
    const [zone,hemisphere]=required(el.dataset.useSuggestedZone).split(':');
    change(w=>{const node=required(w.nodes.find(x=>x.id===n.id)).params as Record<string,unknown>;
      node.zone=Number(zone);node.hemisphere=hemisphere;});
  });
  // Switching the kind of input changes what the records port accepts, so anything wired into it
  // is disconnected rather than left in place carrying the wrong shape.
  const rateSource=document.querySelector<HTMLSelectElement>('[data-rate-source]');
  if(rateSource)rateSource.addEventListener('change',()=>change(w=>{
    const node=getNode(w,n.id,'rate');node.params.source=rateSource.value as 'points'|'table';
    w.edges=w.edges.filter(e=>e.to!==node.id);}));
  document.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-rate-number]').forEach(el=>el.addEventListener('change',()=>change(w=>{
    const node=required(w.nodes.find(x=>x.id===n.id));const key=required(el.dataset.rateNumber);
    (node.params as unknown as Record<string,number|undefined>)[key]=el.value===''?undefined:Number(el.value);})));
  const retrieve=document.querySelector<HTMLButtonElement>('#hf-retrieve');
  if(retrieve)retrieve.onclick=async e=>{
    const button=e.currentTarget as HTMLButtonElement;
    const node=workflow.nodes.find(x=>x.id===n.id);
    if(!node||node.type!=='find_health_facilities')return;
    const status=optionalElement('#hf-status');
    const baseline=JSON.stringify(workflow);
    button.disabled=true;button.textContent='Retrieving\u2026';
    try{
      // A country the study area stated and nobody touched is still the country. Written onto the
      // node before the request, so the receipt says what was asked for rather than leaving it to
      // be inferred from an area the workflow may later be rewired away from.
      if(!node.params.country){
        const areaNode=workflow.nodes.find(x=>x.id===workflow.edges.find(e=>e.to===n.id&&e.port==='area')?.from);
        const stated=countryOfArea(areaNode?.params as {country?:string;boundary?:{provenance?:{boundaryID?:string}}});
        if(stated)change(w=>{const target=getNode(w,n.id,'find_health_facilities');target.params.country=stated;});
      }
      requireRunnableFindHealthFacilities(node);
      // The area comes from the upstream node, resolved the same way the raster editor resolves
      // it, so the query is bounded by the study area rather than by a country guess.
      const {boundary}=previewArea(workflow,n.id);
      if(status)status.textContent=`Querying ${FACILITY_SOURCES[node.params.source].label}\u2026`;
      const {parsed,retrieval}=await downloadFacilities(node,boundary,undefined,
        message=>{if(status)status.textContent=message;});
      if(JSON.stringify(workflow)!==baseline)throw new Error('The workflow changed during retrieval. Press Retrieve again with the current area.');
      if(change(w=>{const target=getNode(w,n.id,'find_health_facilities');
        target.params.data=parsed.collection;target.params.retrieved=retrieval;},{requirePersistence:true}))
        toast(`${parsed.kept} facilities retrieved. Run the workflow to use them.`);
    }catch(error){const message=errorMessage(error);if(status)status.textContent=message;toast(message);}
    finally{button.disabled=false;button.textContent='Retrieve facilities';}
  };
  document.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-hf]').forEach(el=>el.addEventListener('change',()=>change(w=>{
    const node=required(w.nodes.find(x=>x.id===n.id));(node.params as unknown as Record<string,string>)[required(el.dataset.hf)]=el.value.trim();})));
  document.querySelectorAll<HTMLInputElement>('[data-hf-number]').forEach(el=>el.addEventListener('change',()=>change(w=>{
    const node=required(w.nodes.find(x=>x.id===n.id));(node.params as unknown as Record<string,number>)[required(el.dataset.hfNumber)]=Number(el.value);})));
  document.querySelectorAll<HTMLInputElement>('[data-hf-flag]').forEach(el=>el.addEventListener('change',()=>change(w=>{
    const node=required(w.nodes.find(x=>x.id===n.id));(node.params as unknown as Record<string,boolean>)[required(el.dataset.hfFlag)]=el.checked;})));
  document.querySelectorAll<HTMLInputElement>('[data-hf-list]').forEach(el=>el.addEventListener('change',()=>change(w=>{
    const node=required(w.nodes.find(x=>x.id===n.id));(node.params as unknown as Record<string,string[]>)[required(el.dataset.hfList)]=el.value.split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);})));
  document.querySelectorAll<HTMLInputElement>('[data-bp]').forEach(el=>el.addEventListener('change',()=>change(w=>{
    const node=required(w.nodes.find(x=>x.id===n.id));(node.params as unknown as Record<string,string>)[required(el.dataset.bp)]=el.value.trim();})));
  document.querySelectorAll<HTMLInputElement>('[data-bp-number]').forEach(el=>el.addEventListener('change',()=>change(w=>{
    const node=required(w.nodes.find(x=>x.id===n.id));(node.params as unknown as Record<string,number>)[required(el.dataset.bpNumber)]=Number(el.value);})));
  document.querySelectorAll<HTMLInputElement>('[data-sample]').forEach(el=>el.addEventListener('change',()=>change(w=>{
    const node=required(w.nodes.find(x=>x.id===n.id));(node.params as unknown as Record<string,string>)[required(el.dataset.sample)]=el.value.trim();})));
  // The kept values are a LIST and their ORDER is the order a figure reads in, so a checkbox
  // appends rather than rebuilding the list from the DOM: unticking and re-ticking a value moves
  // it to the end, which is how a practitioner reorders without a second control.
  document.querySelectorAll<HTMLInputElement>('#output-totals').forEach(el=>
    el.addEventListener('change',()=>change(w=>{
      getNode(w,n.id,'table_output').params.totalsAsserted=el.checked||undefined;})));
  document.querySelectorAll<HTMLInputElement>('[data-select-value]').forEach(el=>
    el.addEventListener('change',()=>change(w=>{
      const node=getNode(w,n.id,'select_rows'),value=required(el.dataset.selectValue);
      node.params.values=el.checked
        ?[...node.params.values.filter(held=>held!==value),value]
        :node.params.values.filter(held=>held!==value);})));
  document.querySelectorAll<HTMLTextAreaElement>('[data-select-text]').forEach(el=>
    el.addEventListener('change',()=>change(w=>{
      getNode(w,n.id,'select_rows').params.values=el.value.split('\n')
        .map(line=>line.trim()).filter(Boolean);})));
  document.querySelectorAll<HTMLInputElement>('[data-group-by]').forEach(el=>
    el.addEventListener('change',()=>change(w=>{
      const node=getNode(w,n.id,'group_table'),column=required(el.dataset.groupBy);
      node.params.by=el.checked
        ?[...node.params.by.filter(held=>held!==column),column]
        :node.params.by.filter(held=>held!==column);})));
  document.querySelectorAll<HTMLTextAreaElement>('[data-group-text]').forEach(el=>
    el.addEventListener('change',()=>change(w=>{
      getNode(w,n.id,'group_table').params.by=el.value.split('\n')
        .map(line=>line.trim()).filter(Boolean);})));
  // A number, and `data-slr` writes strings -- the same reason #ratio-level has its own handler.
  optionalElement('#twobytwo-level')?.addEventListener('change',e=>change(w=>{
    getNode(w,n.id,'two_by_two').params.level=
      Number((e.target as HTMLSelectElement).value) as 90|95|99;}));
  document.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('[data-slr]').forEach(el=>el.addEventListener('change',()=>change(w=>{
    const node=required(w.nodes.find(x=>x.id===n.id));(node.params as unknown as Record<string,string>)[required(el.dataset.slr)]=el.value.trim();})));
  document.querySelectorAll<HTMLInputElement>('[data-slr-family]').forEach(el=>el.addEventListener('change',()=>change(w=>{
    const node=getNode(w,n.id,'slr_extract_import');node.params.familyValues={...node.params.familyValues,[required(el.dataset.slrFamily)]:el.value.trim()};})));
  document.querySelectorAll<HTMLTextAreaElement>('[data-slr-citation]').forEach(el=>el.addEventListener('change',()=>change(w=>{
    const node=getNode(w,n.id,'slr_extract_import');const citations=[...node.params.citations];citations[Number(el.dataset.slrCitation)]=el.value.trim();node.params.citations=citations;})));
  // The level is a number, and `data-slr` writes strings. A '95' where 95 is expected reaches the
  // module as a key that is not in its table and is refused there, which is a correct refusal
  // arriving two layers from the control that caused it.
  optionalElement('#ratio-level')?.addEventListener('change',e=>change(w=>{
    getNode(w,n.id,'rate_ratio').params.level=Number((e.target as HTMLSelectElement).value) as 90|95|99;}));
  // SWAPPING IS A REAL EDIT, not a display toggle: it changes which finding the node states.
  optionalElement('#ratio-swap')?.addEventListener('click',()=>change(w=>{
    const node=getNode(w,n.id,'rate_ratio');
    const {compared,reference}=node.params;
    node.params.compared=reference;node.params.reference=compared;}));
  optionalElement('#add-series-chart')?.addEventListener('click',()=>change(w=>{const id=`curve-${Date.now()}`;w.nodes.push({id,type:'chart_output',x:n.x+270,y:n.y,params:{label:'Epidemic curve',inputMode:'series'}});w.edges.push({id:`e-${Date.now()}`,from:n.id,to:id,port:'series'});selected=id;}));
  document.querySelectorAll<HTMLInputElement>('#chart-label').forEach(el=>el.addEventListener('change',()=>change(w=>{required(w.nodes.find(x=>x.id===n.id)).params.label=el.value.trim()||'Epidemic curve';})));
  // Reading, not editing: it opens a dialog and touches nothing that is saved.
  optionalElement('#table-convert-on-run')?.addEventListener('change',e=>{
    const on=(e.currentTarget as HTMLInputElement).checked;
    change(w=>{getNode(w,n.id,'table_input').params.convertOnRun=on;});
    renderInspector();
  });
  optionalElement('#quick-look')?.addEventListener('click',()=>{
    const table=getNode(workflow,n.id,'table_input').params;
    openTableViewer(tableViewOf(table.data,n.params.label||'Tabular data'),esc);
  });
  // A table's columns are its keys plus its one value field, which is the contract the widget
  // already declares. A ruleset reads them by those names, so the profile speaks of them too.
  optionalElement('#table-quality')?.addEventListener('click',()=>{
    const table=getNode(workflow,n.id,'table_input').params;
    openDataQuality({title:`${n.params.label||'Tabular data'} · data quality`,
      columns:[...table.data.keys,table.data.valueField],
      rows:table.data.rows.map(row=>({...row.key,[table.data.valueField]:row.value})),
      declared:declaredKinds(workflow,n.id),repairs:[],
      // A tabular import casts its value column at import and refuses a non-numeric cell by row
      // number, so a repair here would have nothing to repair: the file never got in. 117.
      onRepair:()=>{},onRemoveRepair:()=>{}},esc);
  });
  optionalElement('#add-table-view')?.addEventListener('click',()=>change(w=>{const id=`table-view-${Date.now()}`;w.nodes.push({id,type:'table_output',x:n.x+270,y:n.y,params:{label:'Imported table'}});w.edges.push({id:`e-${Date.now()}`,from:n.id,to:id,port:'table'});selected=id;}));
  optionalElement('#open-table')?.addEventListener('click',()=>{
    const baseline=JSON.stringify(workflow),current=getNode(workflow,n.id,'table_input').params;
    openTableEditor(result=>{
      if(JSON.stringify(workflow)!==baseline)throw new Error('The workflow changed. Reopen Import tabular data.');
      return change(w=>{const node=getNode(w,n.id,'table_input');node.params.data=result.data;node.params.keys=result.keys;node.params.valueField=result.valueField;node.params.unit=result.unit;node.params.source=result.source;
        // The shape the FILE was in, so the editor reopens in it and the receipt can cite the
        // columns taken. Deleted rather than set undefined when a table is re-read as long: a
        // stored `wide` block that no longer describes the table is a claim, and core.ts refuses
        // one that disagrees with the keys.
        if(result.wide)node.params.wide=result.wide;else delete node.params.wide;
        // The file as published, kept whenever it was read as wide, so `convertOnRun` has
        // something to convert and the node can say what it was made from either way.
        if(result.source_table)node.params.sourceTable=result.source_table;
        else{delete node.params.sourceTable;delete node.params.convertOnRun;}},{requirePersistence:true});
    },current.keys.length?{keys:current.keys,valueField:current.valueField,unit:current.unit,
      ...(current.wide?{wide:current.wide}:{})}:undefined);
  });
  optionalElement('#open-manual')?.addEventListener('click',()=>openManual(n.type,TYPES[n.type].title,esc));
  // The year chooses which link the button carries, so the panel redraws to carry it.
  optionalElement('#population-year')?.addEventListener('change',event=>change(w=>{
    const target=getNode(w,n.id,'raster_input');
    target.params.populationYear=(event.target as HTMLSelectElement).value;
  }));
  optionalElement('#area-country')?.addEventListener('change',event=>change(w=>{
    const target=getNode(w,n.id,'study_area');
    target.params.country=(event.target as HTMLSelectElement).value||undefined;
  }));
  optionalElement('#population-country')?.addEventListener('change',event=>change(w=>{
    const target=getNode(w,n.id,'raster_input');
    target.params.populationCountry=(event.target as HTMLSelectElement).value;
  }));
  optionalElement('#join-key')?.addEventListener('change',e=>
    change(w=>{getNode(w,n.id,'join_table_to_area').params.keyField=control(e).value;}));
  optionalElement('#join-normalisation')?.addEventListener('change',e=>
    change(w=>{getNode(w,n.id,'join_table_to_area').params.normalisation=control(e).value as 'exact'|'fuzzy';}));
  optionalElement('#prepare-raster')?.addEventListener('click',()=>{
    let source=workflow.nodes.find(x=>x.id===workflow.edges.find(e=>e.to===n.id&&e.port==='area')?.from);const visited=new Set<string>();
    while(source?.type==='measure_area'&&!visited.has(source.id)){visited.add(source.id);source=workflow.nodes.find(x=>x.id===workflow.edges.find(e=>e.to===source!.id&&e.port==='area')?.from);}
    let boundary:Boundary;try{boundary=previewArea(workflow,n.id).boundary;}catch(e){toast(errorMessage(e),{tone:'failure'});return;}
    const baseline=JSON.stringify(workflow);openRasterEditor(boundary,asset=>{if(JSON.stringify(workflow)!==baseline)throw new Error('The workflow changed. Reopen Prepare GeoTIFF input.');return change(w=>{getNode(w,n.id,'raster_input').params.asset=asset;},{requirePersistence:true});},getNode(workflow,n.id,'raster_input').params.asset);
  });
  optionalElement('#add-raster-map')?.addEventListener('click',()=>change(w=>{const id=`map-${Date.now()}`;w.nodes.push({id,type:'map_output',x:n.x+270,y:n.y,params:{label:'Clipped raster',inputMode:'raster',pointInputCount:1}});w.edges.push({id:`e-${Date.now()}`,from:n.id,to:id,port:'raster'});selected=id;}));
  optionalElement('#download-node-raster')?.addEventListener('click',async e=>{
    const button=e.currentTarget as HTMLButtonElement,label=button.textContent||'Download GeoTIFF';
    button.disabled=true;button.textContent='Preparing\u2026';
    try{downloadRaster(await rasterOfNode(workflow,n.id));}
    catch(error){toast(errorMessage(error),{tone:'failure'});}
    finally{button.disabled=false;button.textContent=label;}
  });
  optionalElement('#preview-raster-clip')?.addEventListener('click',async e=>{
    const button=e.currentTarget as HTMLButtonElement,baseline=JSON.stringify(workflow);button.disabled=true;button.textContent='Loading raster preview…';
    try{
      const clip=getNode(workflow,n.id,'clip_raster'),{boundary:studyBoundary}=previewArea(workflow,n.id),boundary=clip.params.cutline?.geometry||studyBoundary;
      const polygon=boundary.type==='MultiPolygon'&&boundary.coordinates.length===1?{type:'Polygon' as const,coordinates:boundary.coordinates[0]}:boundary;
      if(polygon.type!=='Polygon'||polygon.coordinates.length!==1)throw new Error('Preview adjustment currently supports a simple polygon. Holes and multiple polygons are retained but cannot be edited here.');
      const raster=await prepareRasterPreview(workflow,n.id);
      if(JSON.stringify(workflow)!==baseline)throw new Error('The workflow changed. Reopen the preview.');
      const draft:WorkflowNode<'study_area'>={id:clip.id,type:'study_area',x:clip.x,y:clip.y,params:{source:'drawn',label:clip.params.label,geometry:structuredClone(polygon),selectionMode:clip.params.cutline?.selectionMode||'polygon'}};
      openStudyAreaEditor(draft,(params,options={})=>{
        if(JSON.stringify(workflow)!==baseline)throw new Error('The workflow changed. Reopen the preview.');
        if(clip.params.cutline&&options.method===clip.params.method&&(options.marginPixels||0)===(clip.params.marginPixels||0)&&params.label===draft.params.label&&params.selectionMode===draft.params.selectionMode&&JSON.stringify(params.geometry)===JSON.stringify(draft.params.geometry))return true;
        if(!params.geometry)throw new Error('Define a clipping boundary.');
        return change(w=>{const target=getNode(w,n.id,'clip_raster');target.params.cutline={geometry:params.geometry!,selectionMode:params.selectionMode};target.params.label=params.label;target.params.method=options.method||clip.params.method;target.params.marginPixels=options.marginPixels||0;},{requirePersistence:true});
      },{raster,clip:true,clipOptions:clip.params,refusal:saveFailureMessage});
    }catch(error){toast(errorMessage(error),{tone:'failure'});}finally{button.disabled=false;button.textContent='Preview and adjust';}
  });
  document.querySelector<HTMLSelectElement>('#clip-method')?.addEventListener('change',e=>change(w=>{getNode(w,n.id,'clip_raster').params.method=control(e).value as 'cell-center'|'all-touched';},{requirePersistence:true}));
  document.querySelector<HTMLInputElement>('#clip-margin')?.addEventListener('change',e=>change(w=>{getNode(w,n.id,'clip_raster').params.marginPixels=control(e).value===''?NaN:Number(control(e).value);},{requirePersistence:true}));
  optionalElement('#reset-clip-boundary')?.addEventListener('click',()=>change(w=>{delete getNode(w,n.id,'clip_raster').params.cutline;},{requirePersistence:true}));
  optionalElement('#study-area-label-form')?.addEventListener('submit',e=>{e.preventDefault();const input=$('#study-area-label'),label=input.value.trim();if(!label){input.setCustomValidity('Enter a label for the study area.');input.reportValidity();return;}change(w=>required(w.nodes.find(x=>x.id===n.id)).params.label=label);});
  optionalElement('#study-area-label')?.addEventListener('input',e=>control(e).setCustomValidity(''));
  // The same gesture for every other widget. The field already saves on change, so this is the
  // affordance rather than the mechanism: pressing it confirms, and an empty label is refused
  // here rather than silently writing one nobody can read on the canvas.
  optionalElement('#catchment-label-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const input=$('#catchment-label') as HTMLInputElement,label=input.value.trim();
    if(!label){input.setCustomValidity('Enter a label for this widget.');input.reportValidity();return;}
    input.setCustomValidity('');
    change(w=>{(required(w.nodes.find(x=>x.id===n.id)).params as unknown as Record<string,unknown>).label=label;});
  });
  optionalElement('#catchment-label')?.addEventListener('input',e=>control(e).setCustomValidity(''));
  optionalElement('#edit-input-data')?.addEventListener('click',()=>openInputDataEditor(getNode(workflow,n.id,'point_input'),workflow.nodes.filter((x):x is WorkflowNode<'study_area'>=>x.type==='study_area'&&(!!x.params.geometry||x.params.source!=='drawn')).map(x=>({id:x.id,label:x.params.label||'Old Naledi',geometry:x.params.geometry||oldNalediBoundary as Boundary})),data=>validateGeoJSON(data,{attributes:true}),params=>{const persisted=change(w=>getNode(w,n.id,'point_input').params=params,{requirePersistence:true});if(persisted)toast('Input edits saved on this device. Rerun the workflow to update results.');return persisted;}));
  document.querySelectorAll<HTMLSelectElement>('[data-coverage-port]').forEach(el=>el.onchange=()=>{const from=el.value,port=el.dataset.coveragePort!;change(w=>{w.edges=w.edges.filter(e=>!(e.to===n.id&&e.port===port));if(from)w.edges.push({id:`e-${Date.now()}`,from,to:n.id,port});});});
  optionalElement('#measure-area-source')?.addEventListener('change',e=>{const from=control(e).value;change(w=>{w.edges=w.edges.filter(x=>!(x.to===n.id&&x.port==='area'));if(from)w.edges.push({id:`e-${Date.now()}`,from,to:n.id,port:'area'});});});
  // A committed geometry is stamped, so the receipt can say WHEN the area was revised. Only a
  // changed shape counts: renaming the area or switching its selection mode is not a revision of
  // the ground it covers, and stamping those would make the history say the extent moved when it
  // did not. Experiment 01 calls this step "Correct, save, and revisit"; until 2026-10-17 it left
  // no trace at all, because the study area's IRI is node-scoped while every other area in this
  // application mints per run.
  document.querySelectorAll<HTMLButtonElement>('[data-restore-extent]').forEach(b=>b.onclick=()=>change(w=>{
    const target=getNode(w,n.id,'study_area');
    if(target.params.source!=='drawn')return;
    const history=target.params.revisions??[],chosen=history[Number(b.dataset.restoreExtent)];
    if(!chosen)return;
    target.params.geometry=structuredClone(chosen.geometry);
    target.params.selectionMode=chosen.selectionMode;
    // Appended, never truncated: the chain has to be able to say the area was once wider.
    target.params.revisions=[...history,{at:new Date().toISOString(),
      geometry:structuredClone(chosen.geometry),selectionMode:chosen.selectionMode,
      restoredFrom:Number(b.dataset.restoreExtent)+1}];
  }));
  optionalElement('#edit-study-area')?.addEventListener('click',()=>openStudyAreaEditor(getNode(workflow,n.id,'study_area'),params=>change(w=>{
    const target=getNode(w,n.id,'study_area'),before=target.params;
    const shape=(x:{source?:string;geometry?:unknown})=>x.source==='drawn'&&x.geometry?JSON.stringify(x.geometry):'';
    const changed=shape(params)!==shape(before);
    const kept=before.source==='drawn'?before.revisions??[]:[];
    target.params=params;
    if(params.source==='drawn'&&params.geometry)
      target.params.revisions=changed||!kept.length
        ?[...kept,{at:new Date().toISOString(),geometry:structuredClone(params.geometry),selectionMode:params.selectionMode}]
        :kept;
    // SAY IT LANDED. The practitioner, 2026-10-20, after acquiring North Kivu: *"What's missing
    // is the feedback that the download completed."* The dialog had one -- "Applied in 0.7 s" --
    // written into a panel that closes in the same breath, so nobody ever read it. Confirmation
    // belongs where the practitioner is afterwards, which is the canvas, and it names what landed
    // rather than saying "done": the unit, its size, and that it is the published outline.
    const area=params.source==='drawn'?params:undefined;
    const ring=area?.geometry?.type==='Polygon'
      ?(area.geometry.coordinates as number[][][])[0]?.length??0
      :(area?.geometry?.coordinates as number[][][][]|undefined)?.reduce((n,part)=>n+(part[0]?.length??0),0)??0;
    if(area?.boundary)
      toast(`${area.boundary.unitName||'Boundary'} applied as published \u00b7 ${ring.toLocaleString()} vertices \u00b7 `
        +`${area.boundary.licence||'see the evidence panel for terms'}`);
    else if(ring)toast(`Study area applied \u00b7 ${ring.toLocaleString()} vertices.`);
  },{requirePersistence:true}),{refusal:saveFailureMessage}));
  optionalElement('#area-view-n3')?.addEventListener('click',()=>{renderN3();switchView('rules');});
  // The knobs, and the decisions the review band asks for. A decision is stored WITH a signature
  // of the pair it was made about, so editing either record lapses it rather than letting a stale
  // judgement ride on changed data -- the device the retired coverage check used, in the place
  // where a judgement is genuinely required.
  $('#inspector-content').querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-dedup]').forEach(el=>
    el.addEventListener('change',()=>change(w=>{
      const node=getNode(w,n.id,'deduplicate_points');
      const key=required(el.dataset.dedup) as 'nameField';
      const value=(el as HTMLInputElement).type==='number'?Number(el.value):el.value;
      (node.params as unknown as Record<string,unknown>)[key]=value;
    })));
  optionalElement('#dedup-review-open')?.addEventListener('click',()=>{
    const linkage=result?.linkages?.[n.id];
    if(!linkage)return;
    const node=workflow.nodes.find(x=>x.id===n.id);
    if(node?.type!=='deduplicate_points')return;
    const waiting=linkage.candidates.filter(c=>c.classification==='review');
    const decided=new Map(node.params.decisions.map(d=>[d.key,{decision:d.decision,reason:d.reason}]));
    openDeduplicateReview({
      title:node.params.label,candidates:waiting,decided,
      onDecide:(key,decision,reason)=>{
        const candidate=waiting.find(c=>c.key===key);
        if(!candidate)return;
        change(w=>{
          const target=getNode(w,n.id,'deduplicate_points');
          target.params.decisions=[...target.params.decisions.filter(d=>d.key!==key),
            {key,decision,reason,signature:pairSignature(candidate)}];
        });
      },
      onClear:key=>change(w=>{
        const target=getNode(w,n.id,'deduplicate_points');
        target.params.decisions=target.params.decisions.filter(d=>d.key!==key);
      }),
    },esc);
  });
  $('#inspector-content').querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLButtonElement>('[data-param]').forEach(el=>el.addEventListener('change',()=>change(w=>updateParam(w,n.id,required(el.dataset.param),el.type==='number'?(el.value===''?NaN:Number(el.value)):el.value))));
  // Reading, not editing: these redraw the Inspector and touch nothing that is saved, so they
  // go through renderInspector rather than change().
  $('#inspector-content').querySelectorAll<HTMLButtonElement>('[data-records-view]').forEach(el=>
    el.addEventListener('click',()=>{
      const held=dataViews.get(n.id)??{mode:'table' as const,rows:10};
      dataViews.set(n.id,{...held,mode:el.dataset.recordsView as 'table'|'json'});
      renderInspector();
    }));
  // The same table, at a width it can be read at. The panel's own view is a glance; this is the
  // look. Point records get it for the same reason tabular ones do -- the Inspector is 292px.
  $('#inspector-content').querySelectorAll<HTMLButtonElement>('[data-records-quicklook]').forEach(el=>
    el.addEventListener('click',()=>{
      const held=(n.params as {data?:{features?:{properties?:Record<string,unknown>}[]};repairs?:ColumnRepair[]});
      const repairs=held.repairs??[];
      const features=applyRepairs(held.data?.features??[],repairs);
      const columns=[...new Set(features.flatMap(f=>Object.keys(f.properties??{})))];
      openTableViewer({title:n.params.label||TYPES[n.type].title,columns,
        rows:features.map(f=>({...f.properties})),
        // What any ruleset downstream has declared these columns to be. A column is not wrong
        // for being untyped -- it is undeclared -- so this says nothing where nothing was said.
        declared:declaredKinds(workflow,n.id),
        onRepair:(column,to)=>repairColumn(n.id,column,to),
        note:`${features.length} records, ${columns.length} column${columns.length===1?'':'s'}. `
          +`These are the columns a rule can read; nothing is guessed from a name.`
          +(repairs.length?` ${repairs.length} declared repair${repairs.length===1?'':'s'} `
            +`(${repairs.map(r=>`${r.column} as ${r.to}s`).join(', ')}) are applied to what you see here. `
            +`The records this step holds are unchanged — removing the declaration restores them.`:'')},esc);
    }));
  $('#inspector-content').querySelectorAll<HTMLButtonElement>('[data-records-quality]').forEach(el=>
    el.addEventListener('click',()=>openDataQuality(qualityViewFor(n),esc)));
  $('#inspector-content').querySelectorAll<HTMLSelectElement>('[data-records-rows]').forEach(el=>
    el.addEventListener('change',()=>{
      const held=dataViews.get(n.id)??{mode:'table' as const,rows:10};
      dataViews.set(n.id,{...held,rows:Number(el.value)});
      renderInspector();
    }));
  if(n.type==='apply_ruleset'){
    wireRulesetChoice(n);
    wireAuthorRules(n);
    for(const parameter of (n.params.ruleset?resolveRuleset(n.params.ruleset.id,n.params.ruleset.version).parameters:[]))
      optionalElement(`#ruleset-${parameter.name}`)?.addEventListener('change',e=>{
        const value=control(e).value===''?NaN:Number(control(e).value);
        change(w=>{getNode(w,n.id,'apply_ruleset').params.parameters[parameter.name]=value;});
      });
  }
  if(n.type==='measure_distance'){
    const current=()=>structuredClone(getNode(workflow,n.id,'measure_distance').params.candidateFilter??[]);
    optionalElement('#filter-add')?.addEventListener('click',()=>change(w=>{
      const node=getNode(w,n.id,'measure_distance');
      node.params.candidateFilter=[...(node.params.candidateFilter??[]),{field:'',comparator:'in',values:[]}];
    }));
    current().forEach((_condition,index)=>{
      optionalElement(`#filter-remove-${index}`)?.addEventListener('click',()=>change(w=>{
        const node=getNode(w,n.id,'measure_distance');
        node.params.candidateFilter=(node.params.candidateFilter??[]).filter((__,i)=>i!==index);
      }));
      optionalElement(`#filter-field-${index}`)?.addEventListener('change',e=>{
        const field=control(e).value.trim();
        change(w=>{const list=getNode(w,n.id,'measure_distance').params.candidateFilter!;list[index]={...list[index],field};});
      });
      optionalElement(`#filter-comparator-${index}`)?.addEventListener('change',e=>{
        const comparator=control(e).value as 'in'|'notIn';
        change(w=>{const list=getNode(w,n.id,'measure_distance').params.candidateFilter!;list[index]={...list[index],comparator};});
      });
      optionalElement(`#filter-values-${index}`)?.addEventListener('change',e=>{
        const values=control(e).value.split(',').map(v=>v.trim()).filter(Boolean);
        change(w=>{const list=getNode(w,n.id,'measure_distance').params.candidateFilter!;list[index]={...list[index],values};});
      });
    });
  }
  optionalElement('#threshold')?.addEventListener('change',e=>{const value=control(e).value===''?NaN:Number(control(e).value);change(w=>getNode(w,n.id,'policy').params.thresholdKm=value);});
  optionalElement('#alert-state')?.addEventListener('change',e=>change(w=>getNode(w,n.id,'alert').params.active=JSON.parse(control(e).value)));
  optionalElement('#assessment-date')?.addEventListener('change',e=>change(w=>getNode(w,n.id,'alert').params.date=control(e).value));
  optionalElement('#source-label')?.addEventListener('change',e=>change(w=>required(w.nodes.find(x=>x.id===n.id)).params.label=control(e).value.trim()||TYPES[n.type].title));
  optionalElement('#replace-data')?.addEventListener('click',()=>{importNode=n.id;$('#geojson-file').click();});
  optionalElement('#output-label')?.addEventListener('change',e=>change(w=>required(w.nodes.find(x=>x.id===n.id)).params.label=control(e).value.trim()));
  // Every label form, one handler. Saving on change stays -- nothing typed is lost by not
  // pressing the button -- and an empty label is refused rather than written onto the canvas.
  document.querySelectorAll<HTMLFormElement>('[data-label-form]').forEach(form=>{
    const input=form.querySelector('input')!;
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const label=input.value.trim();
      if(!label){input.setCustomValidity('Enter a label for this widget.');input.reportValidity();return;}
      input.setCustomValidity('');
      change(w=>{(required(w.nodes.find(x=>x.id===n.id)).params as unknown as Record<string,unknown>).label=label;});
    });
    input.addEventListener('input',()=>input.setCustomValidity(''));
    input.addEventListener('change',()=>{
      const label=input.value.trim();
      if(label)change(w=>{(required(w.nodes.find(x=>x.id===n.id)).params as unknown as Record<string,unknown>).label=label;});
    });
  });
  // Switching back to the classic bars drops to a mark that renderer can draw, and touches nothing
  // else. It used to force orientation to horizontal as well, which was already wrong for a case
  // series -- it left the shipped Snow curve with no columns -- and became wrong for every chart
  // once vertical was made the default: a reset that overrides the default is not a reset.
  optionalElement('#chart-renderer')?.addEventListener('change',e=>change(w=>{const params=getNode(w,n.id,'chart_output').params;params.renderer=control(e).value as 'html'|'vega-lite';if(params.renderer==='html')params.mark='bar';}));
  optionalElement('#chart-mark')?.addEventListener('change',e=>change(w=>getNode(w,n.id,'chart_output').params.mark=control(e).value as 'bar'|'point'));
  optionalElement('#chart-orientation')?.addEventListener('change',e=>change(w=>getNode(w,n.id,'chart_output').params.orientation=control(e).value as 'horizontal'|'vertical'));
  for(const [selector,key] of [['#chart-title','chartTitle'],['#chart-subtitle','subtitle'],['#chart-x-axis','xAxisTitle'],['#chart-y-axis','yAxisTitle'],['#chart-source-note','sourceNote']] as const)
    document.querySelector<HTMLInputElement|HTMLTextAreaElement>(selector)?.addEventListener('change',e=>change(w=>{getNode(w,n.id,'chart_output').params[key]=control(e).value.trim();}));
  document.querySelector<HTMLInputElement>('#chart-legend')?.addEventListener('change',e=>change(w=>getNode(w,n.id,'chart_output').params.colorByCategory=(e.currentTarget as HTMLInputElement).checked));
  for(const [selector,key] of [['#map-title','mapTitle'],['#map-subtitle','mapSubtitle'],['#map-source-note','mapSourceNote']] as const)
    document.querySelector<HTMLInputElement|HTMLTextAreaElement>(selector)?.addEventListener('change',e=>change(w=>{getNode(w,n.id,'map_output').params[key]=control(e).value.trim();}));
  document.querySelector<HTMLInputElement>('#map-legend-toggle')?.addEventListener('change',e=>change(w=>getNode(w,n.id,'map_output').params.showLegend=(e.currentTarget as HTMLInputElement).checked));
  document.querySelector<HTMLInputElement>('#map-halo-toggle')?.addEventListener('change',e=>change(w=>getNode(w,n.id,'map_output').params.markHalo=(e.currentTarget as HTMLInputElement).checked));
  // Picking a basemap switches the presentation when it has to. The control used to appear only
  // AFTER the practitioner had found the Presentation selector and set it to interactive, so a
  // basemap was two steps behind a combination nothing announced -- and the practitioner reported,
  // 2026-10-15, looking at a shipped map and finding no basemap at all. Five of the ten maps in
  // the worked examples were two clicks away; the clicks were the defect.
  optionalElement('#map-add-layer')?.addEventListener('change',e=>{
    const chosen=control(e).value;
    if(chosen)change(w=>setConnection(w,chosen,n.id,'layer'));
  });
  document.querySelectorAll<HTMLInputElement>('[data-layer-size]').forEach(input=>{
    input.addEventListener('change',e=>{
      const source=(e.currentTarget as HTMLInputElement).dataset.layerSize!;
      const size=Number((e.currentTarget as HTMLInputElement).value);
      change(w=>{
        const target=getNode(w,n.id,'map_output'),held={...(target.params.layerSymbols||{})};
        held[source]={...held[source],size};
        target.params.layerSymbols=held;
      },{spatial:false});
      // A size is presentation, like a basemap: the figure redraws and the run is not stale.
      renderResults();
    });
  });
  document.querySelectorAll<HTMLSelectElement>('[data-layer-mark]').forEach(select=>{
    select.addEventListener('change',()=>{
      const source=select.dataset.layerMark!,mark=select.value as LayerShape|'';
      change(w=>{
        const target=getNode(w,n.id,'map_output'),held={...(target.params.layerSymbols||{})};
        // An empty choice REMOVES the entry rather than storing a blank: the receipt distinguishes
        // a mark somebody chose from one the layer's position gave it, and an empty string stored
        // as a choice would make that distinction lie.
        if(mark)held[source]={...held[source],mark};else{const {[source]:_dropped,...rest}=held;target.params.layerSymbols=rest;return;}
        target.params.layerSymbols=held;
      });
    });
  });
  optionalElement('#map-basemap')?.addEventListener('change',e=>{
    const choice=control(e).value as BasemapChoice;
    change(w=>{
      const target=getNode(w,n.id,'map_output');
      target.params.basemap=choice;
      // CHOOSING A BASEMAP NO LONGER MOVES THE MAP, retired 2026-10-27.
      //
      // It used to: a style the static plot could not draw switched the presentation to
      // interactive, on the reasoning that a control which appeared to do nothing would read as
      // broken. That was the right fix while the Inspector offered all six styles to both
      // presentations. It is the wrong one now the list is filtered -- the practitioner chooses
      // the map type and is then offered what that type can draw, which is their rule of
      // 2026-10-27, and a basemap that silently changed the map type would invert it.
      //
      // IT HAD ALSO JUST BECOME A DEFECT. The condition was "not none, osm or topo", written when
      // those were the only three a figure could bake. `natural-earth-110m` is none of them and
      // is bundled FOR a static figure, so choosing it would have moved the map to the one
      // presentation that cannot draw it. Caught the same day by reading this line rather than by
      // a test, because no test could reach the state any more.
    },{spatial:false});
    // AND THE FIGURE REDRAWS. `change` calls `render`, which redraws the library, the project
    // bar and the Inspector and NOT the map -- so choosing a basemap did nothing visible until
    // something else happened to re-render the results. The practitioner met it twice on
    // 2026-10-25: on a John Snow map with six output tabs it appeared as soon as they clicked
    // between tabs, and on South London, which has ONE output and nothing to click, it never
    // appeared at all. Two reports, one cause.
    //
    // `{spatial:false}` above for the same reason in reverse: a basemap changes nothing the run
    // computed, so marking the workflow stale and clearing the statuses was telling the
    // practitioner to rerun for a choice that cannot alter a single number.
    renderResults();
  });
  optionalElement('#output-view')?.addEventListener('change',e=>change(w=>{const index=w.nodes.findIndex(x=>x.id===n.id);w.nodes[index]={...w.nodes[index],type:'output',params:{label:n.params.label,view:control(e).value as 'map'|'table'|'bars'}};}));
  optionalElement('#output-input-mode')?.addEventListener('change',e=>change(w=>{const node=required(w.nodes.find(x=>x.id===n.id)) as WorkflowNode<'map_output'>;(node.params as unknown as Record<string,string>).inputMode=control(e).value;w.edges=w.edges.filter(edge=>edge.to!==n.id);}));
  $('#delete-node').onclick=()=>removeNodes([n.id]);
  $('#duplicate-node').onclick=()=>change(w=>{const copy=structuredClone(n);copy.id=`${n.type}-${Date.now()}`;copy.x+=40;copy.y+=90;w.nodes.push(copy);selected=copy.id;});
  if(busy)$('#inspector-content').querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|HTMLButtonElement>('input,select,textarea,button').forEach(el=>el.disabled=true);
}
function removeNodes(ids:string[]){
  change(w=>{w.nodes=w.nodes.filter(n=>!ids.includes(n.id));w.edges=w.edges.filter(e=>!ids.includes(e.from)&&!ids.includes(e.to));if(ids.includes(w.outputId||''))w.outputId=w.nodes.find(n=>n.type==='output')?.id;if(ids.includes(selected||''))selected=null;});
  // A RESULT OUTLIVES THE NODE THAT MADE IT, and it should not. The practitioner, 2026-10-20:
  // *"when I deleted the Map, Street Network and Study Area, Result Map was still there."* It
  // was: the canvas read "Workflow 0" and the Results panel went on drawing a map of a study
  // area that no longer existed anywhere.
  //
  // This is NOT the same as keeping results while a parameter changes, which is deliberate --
  // "Previous run · settings have changed" lets a practitioner compare before and after. There
  // the node is still there to rerun. Here the thing that produced the result is gone, so the
  // result is an orphan, and an orphan on screen is a claim about a workflow that cannot be
  // rerun to check it.
  if(!result)return;
  const live=new Set(workflow.nodes.map(node=>node.id));
  // AN OUTPUT IS KEYED BY THE NODE THAT PRODUCED IT, so that is what is checked. This stripped a
  // trailing `-map` or `-table` from the id first, and nothing in the application produces an id
  // that needs it: every output sets `nodeId:node.id`. What it did instead was silently orphan
  // any node whose AUTHORED id happens to end that way. `geoprivacy-example` has seven of them --
  // before-map, before-table, after-move-map, after-move-table, comparison-map, after-group-map,
  // after-group-table -- and not one of the stems it strips to exists as a node, so deleting any
  // node in that workspace would have dropped every one of those outputs, and the line below
  // would then have discarded the whole run for having nothing left.
  //
  // Found 2026-10-25 by adding a node called `spot-map` to the John Snow example: deleting the
  // map output took Snow's own map with it, and only because of how it had been named.
  const outputs=result.outputs.filter(output=>live.has(output.nodeId));
  if(!outputs.length){result=null;runWorkflow=null;activeOutputId=null;}
  else if(outputs.length!==result.outputs.length){
    result={...result,outputs};
    if(activeOutputId&&!outputs.some(output=>output.nodeId===activeOutputId))activeOutputId=outputs[0].nodeId;
  }
  renderResults();render();
}
function renderEvidence(id:string){
  const result=activeOutput(),row=result?.rows.find(r=>r.id===id);if(!result||!row){selected=null;renderInspector();return;}
  if(result.kind==='point-table'){$('#inspector-content').innerHTML=pointTableEvidence(row as PointRow,dirty,esc);return;}
  if(result.kind==='spatial-map'){$('#inspector-content').innerHTML=mapEvidence(row as MapRow,dirty,esc);return;}
  if(result.kind){$('#inspector-content').innerHTML=`<div class="inspector-body"><span class="inspector-section">Run evidence ${dirty?'· previous run':''}</span>${oldEvidence(result,row,esc)}</div>`;$('#inspect-rules').onclick=()=>switchView('rules');return;}
  const label=statusLabel(row.status);
  $('#inspector-content').innerHTML=`<div class="inspector-body"><span class="inspector-section">Decision evidence ${dirty?'· previous run':''}</span><h2>${esc(row.name)}</h2><span class="status-pill ${row.status}">${label}</span><p class="description">${esc(row.explanation)}</p><div class="inspector-divider"></div><span class="inspector-section">Inputs used in this run</span><div class="detail-row"><span>Nearest center</span><strong>${esc(row.center?.name||'Unknown')}</strong></div><div class="detail-row"><span>Distance</span><strong>${distanceText(row)}</strong></div><div class="detail-row"><span>Threshold</span><strong>${result.threshold} km</strong></div><div class="detail-row"><span>Heat alert</span><strong>${result.alert!.active===null?'Unknown':result.alert!.active?'Active':'Inactive'}</strong></div><div class="detail-row"><span>Assessment date</span><strong>${result.alert!.date}</strong></div><div class="rule-preview">${row.status==='Review'?'The N3 rule matched an active alert and a distance above the threshold.':row.status==='Unknown'?'An explicit missing-evidence rule matched. This result is not a negative finding.':'The N3 rule matched an inactive alert or a distance at or below the threshold, with required evidence present.'}</div><span class="inspector-section">Derived assertion</span><pre>&lt;urn:fieldwork:place:${esc(row.id)}&gt;\n  fw:decision fw:${row.status}.</pre><small class="muted">This explanation is assembled from the run inputs and returned assertion. It is not an EYE proof certificate.</small><div class="inspector-actions"><button id="inspect-rules" class="button small">View N3 & evidence ↗</button></div></div>`;
  $('#inspect-rules').onclick=()=>switchView('rules');
}
function statusLabel(status:string|undefined){return ({Review:'Review',NoFlag:'No flag',Unknown:'Insufficient data'} as Record<string,string>)[status||'Unknown'];}
function renderResults(){
  // RESULTS BELONG TO THE WORKFLOW THAT PRODUCED THEM.
  //
  // The practitioner, 2026-10-24, having fetched South London from the catalog: *"Loaded South
  // London successfully, but it not clear the results panel. The Geoprivacy results are still
  // there."* And then the rule, which is better than the fix that prompted it: *"Default should
  // be result panel should bear outputs of current workflow not another's."*
  //
  // Clearing at each transition is how this keeps coming back. Opening a new empty canvas
  // cleared; loading an example cleared; the two import paths did not, and `importProjectDocument`
  // still did not after both were fixed -- a third door found only by looking. `runWorkflow` is
  // the snapshot that produced `result`, so the question has an answer here and does not depend
  // on anyone remembering: results from another workflow are not this workflow's results, and are
  // discarded rather than shown under its name.
  if(result&&runWorkflow&&storageKey(runWorkflow)!==storageKey(workflow)){
    result=null;runWorkflow=null;activeOutputId=null;
  }
  disposeVegaChart();
  const output=activeOutput();$('.results-panel').classList.toggle('catchment-results',!!output?.polygons);$('.results-panel').classList.toggle('comparison-results',!!output?.comparison);activeOutputId=output?.nodeId||null;
  // A comparison used to take over the lower half of the split for one run. A tab needs no such
  // exception: the whole panel is the result when the practitioner asks for it, and nothing else
  // is competing for the height.
  // What the Results tab says it holds, derived rather than announced.
  const outputs=result?.outputs.length||0;
  $('#result-count').textContent=outputs?String(outputs):'';
  $('#release-download').hidden=!(exampleKey(workflow)==='snow-geoprivacy'&&!!output&&output.nodeId.startsWith('after-'));
  $('.results-panel').classList.toggle('spatial-results',['spatial-map','spatial-coverage'].includes(output?.kind||''));
  const ownedTabs=new Set(outputsOf(selected).map(o=>o.nodeId));
  $('#result-tabs').innerHTML=(result?.outputs||[]).map(o=>`<button id="result-tab-${esc(o.nodeId)}" role="tab" aria-selected="${o.nodeId===activeOutputId}" tabindex="${o.nodeId===activeOutputId?0:-1}" aria-controls="${o.view}-panel" class="${o.nodeId===activeOutputId?'active':''}${ownedTabs.has(o.nodeId)?' linked-to-selection':''}" ${ownedTabs.has(o.nodeId)?'data-linked="true" title="This result comes from the selected node"':''} data-output="${esc(o.nodeId)}">${o.view==='table'?'☷':o.view==='bars'?'▥':'◈'} ${esc(o.label)}</button>`).join('');
  const tabs=[...$('#result-tabs').querySelectorAll<HTMLButtonElement>('[data-output]')];
  tabs.forEach((b,i)=>{b.onclick=()=>{activeOutputId=b.dataset.output!;if(selected?.startsWith('result:'))selected=null;renderResults();render();$(`#result-tab-${activeOutputId}`).focus();};b.onkeydown=e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();tabs[next].click();}};});
  $('#map-panel').hidden=!output||output.view!=='map';$('#table-panel').hidden=!output||output.view!=='table';$('#bars-panel').hidden=!output||output.view!=='bars';
  if(output)$(`#${output.view}-panel`).setAttribute('aria-labelledby',`result-tab-${output.nodeId}`);
  $('#results-empty').hidden=!!output;
  const rows=output?.rows||[];$('#result-metrics').innerHTML=output?`<span class="metric review"><b>${rows.filter(r=>r.status==='Review').length}</b> flagged for review</span><span class="metric"><b>${rows.filter(r=>r.status==='NoFlag').length}</b> no flag</span><span class="metric unknown"><b>${rows.filter(r=>r.status==='Unknown').length}</b> insufficient data</span>`:'';
  if(output?.kind==='facility-evidence')$('#result-metrics').innerHTML=['Direct','Contextual','Inferential','None'].map(t=>`<span class="metric"><b>${rows.filter(r=>r.tier===t).length}</b> ${tierLabel(t)}</span>`).join('');
  if(output?.kind==='access')$('#result-metrics').innerHTML+=`<span class="metric">${output.eligibleCount} eligible facilities · ${rows.length} ${output.locationSource?.kind==='input-points'?'input locations':'grid samples'}</span>`;
  if(output?.kind==='study-area')$('#result-metrics').innerHTML=`<span class="metric"><b>1</b> stored geometry</span><span class="metric">CRS84 · longitude, latitude</span><span class="metric">${output.ready?'N3: ready for spatial analysis':'Source preview'}</span>`;
  if(output?.kind==='study-area'&&output.measurement)$('#result-metrics').innerHTML=`<span class="metric"><b>${esc(formatArea(output.measurement))}</b> enclosed area</span><span class="metric">Approximate · spherical calculation</span>`;
  if(output?.kind==='spatial-coverage')$('#result-metrics').innerHTML=`<span class="metric"><b>${rows.filter(r=>r.decision==='Accept').length}</b> included</span><span class="metric review"><b>${output.reviewCount}</b> need review</span><span class="metric"><b>${output.excludedCount}</b> explicitly excluded</span>`;
  // THE SUMMARY A TABLE WAS COMPUTED FOR, beside the table. A rate ratio emits the four counts
  // it divided, which is what a reader checks -- and the ratio itself then had nowhere to appear,
  // so the headline number vanished from the screen entirely. The practitioner, 2026-10-26: "I do
  // not see rate ratio". A result that carries a stated finding says it here; one that does not
  // is unaffected.
  const stated=(output as unknown as {sentence?:string})?.sentence;
  $('#result-statement').innerHTML=stated?`<p class="result-statement">${esc(stated)}</p>`:'';
  $('#result-statement').hidden=!stated;
  if(output?.kind==='data-table'){const t=output as unknown as import('./data-table.js').DataTable;$('#result-metrics').innerHTML=`<span class="metric"><b>${t.rowCount}</b> rows</span><span class="metric unknown"><b>${t.missingValueCount}</b> values absent</span><span class="metric">${t.keys.length} key columns · value in ${esc(t.unit||'an unstated unit')}</span>`;}
  if(output?.kind==='point-table')$('#result-metrics').innerHTML=`<span class="metric"><b>${rows.length}</b> records</span><span class="metric"><b>${rows.filter(r=>!r.coordinates).length}</b> missing coordinates</span><span class="metric">CRS84 · longitude, latitude</span>`;
  if(output?.comparison)$('#result-metrics').innerHTML=`<span class="metric"><b>${output.comparison.original.features.length}</b> locations in each set</span><span class="metric"><b>${output.comparison.pumps.features.length}</b> reference pumps</span><span class="metric"><b>${output.comparison.centerShiftM.toFixed(1)} m</b> mean-center shift</span>`;
  const table=output?.pointTable?{head:'',body:''}:output?.kind==='spatial-map'?{head:'<th>Record</th><th>Spatial relation</th>',body:rows.map(r=>`<tr data-place="${esc(r.id)}"><td>${esc(r.name)}</td><td>${esc(relationLabel(r.relation!))}</td></tr>`).join('')}:resultTable(output,esc,statusLabel);$('#result-head').innerHTML=table.head;$('#result-rows').innerHTML=table.body;
  $('#result-search').value='';tablePage=0;tableAttributePage=0;tableSort=undefined;
  $('#result-search').placeholder=output?.pointTable?'Search all records and attributes…':'Name, evidence, or service…';
  $('#point-table-controls').hidden=!output?.pointTable;
  $('#table-panel').classList.toggle('point-table',!!output?.pointTable);
  if(output?.pointTable)renderPointTable();
  const chartNode=runWorkflow?.nodes.find(n=>n.id===output?.nodeId&&n.type==='chart_output') as WorkflowNode<'chart_output'>|undefined;
  if(output?.chart&&chartNode&&chartRenderer(chartNode.params)==='vega-lite'){
    const chartSourceId=runWorkflow?.edges.find(e=>e.to===output.nodeId)?.from;
    // The upstream node's own label, so the figure names the thing a reader recognises rather
    // than the identifier the canvas uses for it.
    const chartContext={sourceId:chartSourceId,runId:result?.runId,
      sourceLabel:runWorkflow?.nodes.find(n=>n.id===chartSourceId)?.params.label};
    const spec=chartVegaSpec(output.chart,chartNode.params,chartContext);
    $('#bars-panel').innerHTML=`<p class="muted">${esc(output.chart.caption)} · ${output.chart.total} input records · grouping: ${esc(output.chart.field)}</p>${output.chart.field==='total'?'<p class="notice">The chart source does not declare a physical unit for this numeric total. Check the source and method before interpreting it.</p>':''}<div id="vega-chart" role="img" aria-label="${esc(output.chart.caption)}"></div><details><summary>Underlying chart values</summary><table><thead><tr><th>Category</th><th>Value</th></tr></thead><tbody>${output.chart.bins.map(b=>`<tr><td>${esc(b.label)}</td><td>${b.count}</td></tr>`).join('')}</tbody></table></details><details><summary>Vega-Lite specification</summary><pre>${esc(JSON.stringify(spec,null,2))}</pre></details>`;
    const host=$('#vega-chart');void renderVegaChart(host,output.chart,chartNode.params,chartContext).catch(e=>{if(host.isConnected)host.textContent=`Chart could not render: ${errorMessage(e)}. Underlying values remain available below.`;});
  }else $('#bars-panel').innerHTML=output?.chart?chartMarkup(output.chart,esc,chartOrientation(chartNode?.params??{})):'';
  // The figure is drawn from the bins, not scraped from the panel, so it is the same file whichever
  // renderer is on screen -- and it exists at all for the classic bars, which are divs and have no
  // SVG to take.
  const exportable=!!output?.chart&&!!chartNode;
  $('#chart-communication').hidden=!exportable;
  // Rendering the stored specification is asynchronous, because the renderer is loaded on demand:
  // an export is rare and the compiler should not sit in the first paint.
  if(exportable)$('#chart-download-svg').onclick=async()=>{
    const button=$('#chart-download-svg');
    button.disabled=true;
    try{
      const svg=await standaloneChartSvg(output!.chart!,chartNode!.params,
        {sourceId:runWorkflow?.edges.find(e=>e.to===output!.nodeId)?.from,runId:result?.runId});
      download(`${output!.nodeId}-chart.svg`,svg,'image/svg+xml');
    }catch(error){toast(errorMessage(error),{tone:'failure'});}
    finally{button.disabled=false;}
  };
  $('#facility-legend').textContent=output?.kind?'Qualifying facility':'Cooling center';$('#map-note').textContent=output?.kind==='facility-evidence'?'Historical facilities · evidence tiers':output?.kind==='access'?`${output.locationSource?.kind==='input-points'?'Input locations':'Generated samples'} \u00b7 source boundary`:'Local locations · no external map tiles';
  $('#review-legend').textContent=output?.kind==='facility-evidence'?'Contextual / inferential':'Review';$('#clear-legend').textContent=output?.kind==='facility-evidence'?'Direct':'No flag';$('#unknown-legend').textContent=output?.kind==='facility-evidence'?'No evidence':'Unknown';$('#facility-legend').parentElement!.hidden=output?.kind==='facility-evidence';
  $('.map-legend').hidden=output?.kind==='study-area';
  if(output?.kind==='spatial-coverage'){$('#review-legend').textContent='Needs review';$('#clear-legend').textContent='Inside / boundary';$('#unknown-legend').textContent='Excluded';$('#facility-legend').parentElement!.hidden=true;$('#map-note').textContent='Missing coordinates appear in the review table';}
  if(output?.kind==='spatial-map'){
    $('#result-metrics').innerHTML=['Inside','Boundary','Outside','MissingLocation'].map(relation=>`<span class="metric"><b>${rows.filter(r=>r.relation===relation).length}</b> ${esc(relationLabel(relation as SpatialRelation))}</span>`).join('');
    $('#review-legend').textContent='Outside boundary';$('#clear-legend').textContent='Inside / on boundary';$('#unknown-legend').textContent='Missing coordinates (not plotted)';$('#facility-legend').parentElement!.hidden=true;$('#map-note').textContent='Local map · all located points remain visible';
  }
  const spatial=['spatial-map','spatial-coverage'].includes(output?.kind||''),missing=spatial?rows.filter(r=>!r.coordinates):[],outside=output?.kind==='spatial-map'?rows.filter(r=>r.relation==='Outside').length:0;
  // The amber sentence went on 2026-10-21. It named a colour the map stopped using when hue was
  // given to the source layer, and it repeated counts that now sit above the map in
  // `#result-metrics` -- *"both probably stale ... and also above the map ... and incorrect (there
  // are no amber points)"*. What is left is the part the counts do not carry: a record with no
  // coordinates is not on the map at all, so the reader is told where it went instead.
  $('#map-spatial-notice').hidden=output?.view!=='map'||!missing.length;
  $('#map-spatial-notice').textContent=missing.length
    ?`${missing.length} ${missing.length===1?'record has':'records have'} no usable location and ${missing.length===1?'is':'are'} listed below rather than plotted.`
    :'';
  $('#map-missing-records').innerHTML=missing.map(r=>`<button class="button small" data-map-record="${esc(r.id)}">${esc(r.name)} · missing coordinates</button>`).join('');
  $('#map-missing-records').hidden=output?.view!=='map';
  $('#map-missing-records').querySelectorAll<HTMLButtonElement>('[data-map-record]').forEach(el=>el.onclick=()=>selectResult(el.dataset.mapRecord!));
  // ONLY WHERE IT WORKS. These checkboxes hide layers by setting `display:none` on the SVG plot's
  // marks, which an interactive map does not have -- it has Leaflet's own layer control, in the
  // corner of the map. Shown on an interactive map they were three checkboxes that did nothing.
  // Reported 2026-10-21: *"those three checkboxes at the bottom of the map about the facilities
  // do not seem to perform any role."*
  // Hidden by default and turned on by `renderMap`, which is the only place that knows which
  // renderer drew: reading the DOM here asked before the map was built.
  $('#map-layer-list').hidden=true;
  // THE PLATE IS A LAYER HERE TOO, with the same checkbox the point layers get.
  //
  // The practitioner, 2026-10-27: *"I meant for the water supply map to be a layer, so checkbox
  // can show and hide it."* On the interactive map Leaflet's own control does it; a static figure
  // has this list instead, and the plate belongs in it for the same reason -- flipping 1855 on
  // and off under a modern result IS the comparison, and a backdrop nobody can remove is a
  // picture rather than evidence.
  //
  // It is listed FIRST because it is drawn first, so the list reads in the order the figure
  // stacks. Keyed by the plate node's own id, which is what `hiddenMapLayers` already stores.
  const listedPlate=groundImageFor(output?.nodeId);
  const plateEntry=listedPlate&&output
    ?`<label><input type="checkbox" data-map-layer="${esc(listedPlate.sourceNodeId)}" `
      +`${hiddenMapLayers.get(output.nodeId)?.has(listedPlate.sourceNodeId)?'':'checked'}> `
      +`${esc(mapImageCredit(listedPlate))} (backdrop)</label>`
    :'';
  $('#map-layer-list').innerHTML=plateEntry+(output?.pointLayers||[]).map(layer=>`<label><input type="checkbox" data-map-layer="${esc(layer.sourceNodeId)}" ${hiddenMapLayers.get(output!.nodeId)?.has(layer.sourceNodeId)?'':'checked'}> ${esc(layer.label)} (${layer.count})</label>`).join('');
  $('#map-layer-list').querySelectorAll<HTMLInputElement>('[data-map-layer]').forEach(el=>el.onchange=()=>{const hidden=hiddenMapLayers.get(output!.nodeId)||new Set();if(el.checked)hidden.delete(el.dataset.mapLayer!);else hidden.add(el.dataset.mapLayer!);hiddenMapLayers.set(output!.nodeId,hidden);renderMap();});
  // THE SAME CHECK AN INPUT GETS, over the table a practitioner actually reads. An output table
  // is the last point before a figure or a count leaves this application, and OSM is known for
  // fields that are mostly absent -- the practitioner, 2026-10-21, asking for the input tables'
  // data-quality check here too. As a REPORT: you repair an input, not a result, so the dialog
  // opens with the profiles, the missingness and the shapes, and nothing to press.
  const quality=$('#result-quality');
  const shown=activeOutput() as (import('./results.js').Output&{pointTable?:boolean;rows?:{attributes?:Record<string,unknown>}[];sourceNodeId?:string|null})|undefined;
  const tabular=!!shown?.pointTable&&(shown.rows?.length||0)>0;
  quality.hidden=!tabular;
  quality.onclick=()=>{
    const rows=(shown?.rows||[]).map(row=>({...row.attributes}));
    const columns=[...new Set(rows.flatMap(row=>Object.keys(row)))];
    if(!columns.length){toast('This table has no attributes to profile.');return;}
    openDataQuality({title:`${shown?.label||'Results'} · data quality`,columns,rows,
      declared:runWorkflow&&shown?declaredKinds(runWorkflow,shown.sourceNodeId||shown.nodeId):{}},esc);
  };
  $('#result-rows').querySelectorAll<HTMLElement & SVGElement>('[data-place]').forEach(el=>{el.onclick=()=>selectResult(el.dataset.place!);el.onkeydown=e=>{if(e.key==='Enter')selectResult(el.dataset.place!);};});
  const raster=output?.raster;$('#raster-download').hidden=!raster;$('#raster-download').onclick=()=>{if(raster)try{downloadRaster(raster);}catch(e){toast(errorMessage(e),{tone:'failure'});}};if(raster){$('#result-metrics').textContent=`${raster.metadata.width} x ${raster.metadata.height} cells | ${raster.values.filter(v=>v!==null).length} valid | ${raster.mask?(raster.mask.method==='all-touched'?'All-touched polygon mask':'Cell-center polygon mask')+' / margin '+(raster.mask.marginPixels||0)+' px':'Unmasked input window'} | Source-reported units: ${raster.asset.provenance?.units||'Not supplied'}`;$('.map-legend').hidden=true;}else $('.map-legend').hidden=false;
  if(output?.polygons){const p=output.polygons;$('.map-legend').hidden=true;$('#map-note').textContent=p.method;$('#result-metrics').textContent=p.kind==='hexbin'?`${p.features.length} released H3 cells / ${p.summary?.matched} locations represented / ${p.summary?.unmatched} locations in omitted sparse cells`:p.summary?`${p.summary.records} locations / ${p.summary.matched} matched / ${p.summary.unmatched} outside / ${p.summary.missingLocation} missing location / ${p.summary.multiple} multiple memberships`:p.features.length+' polygon'+(p.features.length===1?'':'s');$('#map-note').textContent=p.method+' / '+p.notes.join(' ');}
  if(exampleKey(workflow)==='snow-geoprivacy'&&output)$('#map-note').textContent=(output.nodeId.startsWith('before-')?'PRIVATE SOURCE · original coordinates. ':'DERIVED DISPLAY · educational transformation; no anonymity guarantee. ')+$('#map-note').textContent;
  if(output?.comparison){$('#map-note').textContent='PRIVATE EVALUATION · original and moved coordinates, mean centers and pumps';$('.map-legend').hidden=true;}
  renderMap();
  if(result){$('#n3-preview').textContent=result.receipts.map(receiptText).join('\n\n');}
}
function renderPointTable(){
  const active=required(activeOutput()) as {kind?:string};
  const dataView=$('#data-table-view');
  if(active.kind==='data-table'){
    // Rendered in its own container: the point-table grid and its controls stay in the DOM,
    // because a later point-table tab reads #result-head and #result-rows directly.
    dataView.hidden=false;$('#point-table-grid').hidden=true;$('#point-table-controls').hidden=true;
    // The assertion belongs to the OUTPUT NODE, not to the table: it is a claim about a figure
    // somebody is composing, and the same table may be totalled in one figure and not another.
    const owner=workflow.nodes.find(n=>n.id===activeOutputId);
    const asserted=owner?.type==='table_output'&&owner.params.totalsAsserted===true;
    dataView.innerHTML=dataTableMarkup(active as unknown as import('./data-table.js').DataTable,esc,{query:$('#result-search').value,page:tablePage,assertTotals:asserted});
    dataView.querySelectorAll<HTMLButtonElement>('[data-table-page]').forEach(b=>b.onclick=()=>{tablePage=Number(b.dataset.tablePage);renderPointTable();});
    return;
  }
  dataView.hidden=true;dataView.innerHTML='';$('#point-table-grid').hidden=false;
  const table=pointTableMarkup(required(activeOutput()) as unknown as TableValue|CoverageValue,esc,{query:$('#result-search').value,page:tablePage,attributePage:tableAttributePage,sort:tableSort});
  $('#result-head').innerHTML=table.head;$('#result-rows').innerHTML=table.body;$('#point-table-controls').innerHTML=table.controls;
  $('#point-table-controls').querySelectorAll<HTMLButtonElement>('[data-table-page]').forEach(b=>b.onclick=()=>{tablePage=Number(b.dataset.tablePage);renderPointTable();});
  $('#point-table-controls').querySelectorAll<HTMLButtonElement>('[data-table-fields]').forEach(b=>b.onclick=()=>{tableAttributePage=Number(b.dataset.tableFields);renderPointTable();});
  // Re-ordering returns to the first page: the point of ranking is to see the extreme, and
  // keeping the offset would sort the table and then show the middle of it.
  $('#result-head').querySelectorAll<HTMLButtonElement>('[data-table-sort]').forEach(b=>b.onclick=()=>{
    tableSort={column:b.dataset.tableSort!,direction:b.dataset.tableDirection as import('./table-output.js').SortDirection};
    tablePage=0;renderPointTable();
  });
  // THE SAME CHECK AN INPUT GETS, over the table a practitioner actually reads. An output table
  // is the last point before a figure or a count leaves this application, and OSM is known for
  // fields that are mostly absent -- the practitioner, 2026-10-21, asking for the input tables'
  // data-quality check here too. As a REPORT: you repair an input, not a result, so the dialog
  // opens with the profiles, the missingness and the shapes, and nothing to press.
  const quality=$('#result-quality');
  const shown=activeOutput() as (import('./results.js').Output&{pointTable?:boolean;rows?:{attributes?:Record<string,unknown>}[];sourceNodeId?:string|null})|undefined;
  const tabular=!!shown?.pointTable&&(shown.rows?.length||0)>0;
  quality.hidden=!tabular;
  quality.onclick=()=>{
    const rows=(shown?.rows||[]).map(row=>({...row.attributes}));
    const columns=[...new Set(rows.flatMap(row=>Object.keys(row)))];
    if(!columns.length){toast('This table has no attributes to profile.');return;}
    openDataQuality({title:`${shown?.label||'Results'} · data quality`,columns,rows,
      declared:runWorkflow&&shown?declaredKinds(runWorkflow,shown.sourceNodeId||shown.nodeId):{}},esc);
  };
  $('#result-rows').querySelectorAll<HTMLElement & SVGElement>('[data-place]').forEach(row=>{row.onclick=()=>selectResult(row.dataset.place!);row.onkeydown=e=>{if(e.key==='Enter')selectResult(row.dataset.place!);};});
}
function selectResult(id:string){selected=`result:${id}`;renderLibrary($('#node-search').value);flow?.update(playbackView(),null,statuses);renderInspector();renderMap();}
let disposeCatchmentMap:(()=>void)|undefined;
/** A MAP IS NOT BUILT INTO A HIDDEN PANEL. With the results as a tab, rendering while the canvas
 *  is on screen mounts Leaflet into a container of zero size, and its scale control computes
 *  `containerPointToLatLng` on that -- "Invalid LatLng object: (NaN, NaN)", which the run's catch
 *  reported as the WORKFLOW stopping. Reported 2026-10-21 on a map of three facility sources, and
 *  reproduced on the measles example the same day. The map is drawn when its tab is the one being
 *  shown, and `switchView` renders on arrival. */
function resultsOnScreen(){return $('.work-area').classList.contains('showing-results');}
/** Fetch and place a raster basemap under a static figure, if this map asked for one.
 *
 *  Refuses the vector providers by name. OpenFreeMap serves vector tiles rendered by MapLibre,
 *  and baking those needs a GL canvas rasterised first; saying so is better than drawing nothing
 *  and letting a practitioner conclude the control is broken. */
/** THE PLATE CONNECTED TO THIS MAP, read at render time rather than carried through the run.
 *
 *  Ground is layer 0 and is not a MODE. `map_output` is single-mode -- the mode that wins drops
 *  every other layer from the value before a renderer sees it -- and that has produced the same
 *  defect three times in this file, reported on 2026-10-20 and twice after. A basemap avoids it
 *  by being read from the node at render time instead of travelling in the value, and a plate is
 *  the same kind of thing. So it is read the same way.
 *
 *  Undefined where nothing is connected, where the connected node has no image yet, or where its
 *  georeference does not survive `mapImage` -- a figure without ground rather than a broken one. */
function groundImageFor(mapNodeId:string|undefined):(MapImage&{sourceNodeId:string})|undefined{
  if(!mapNodeId)return undefined;
  const edge=workflow.edges.find(e=>e.to===mapNodeId&&e.port==='ground');
  if(!edge)return undefined;
  const node=workflow.nodes.find((n):n is WorkflowNode<'map_image_input'>=>
    n.id===edge.from&&n.type==='map_image_input');
  if(!node)return undefined;
  // The node id travels with it: the layer list keys a checkbox by the SOURCE node, the way it
  // does for every point layer, so hiding one plate does not hide another.
  try{return {...mapImage(node),sourceNodeId:node.id};}catch{return undefined;}
}

async function drawStaticBasemap(result:Output,svg:SVGSVGElement,
  frame:{bounds:[number,number,number,number];project:(c:Position)=>[number,number]}):Promise<void>{
  // READ FROM THE LIVE WORKFLOW, not from the snapshot as run. A basemap is presentation: it
  // changes nothing the run computed, so it must appear the moment it is chosen. Reading
  // `runWorkflow` here meant choosing one did nothing at all until the workflow was run again,
  // which is the second way this control could look broken on the same day.
  const node=(workflow.nodes.find((n):n is WorkflowNode<'map_output'>=>n.id===result.nodeId&&n.type==='map_output')
    ??runWorkflow?.nodes.find((n):n is WorkflowNode<'map_output'>=>n.id===result.nodeId&&n.type==='map_output'));
  // THE PLATE FIRST, and ABOVE the guard below: a figure may carry a historical plate and no
  // basemap at all, and that guard returns early for `none`. It is the more specific ground --
  // a basemap says where this is and a plate says what was there -- so it sits over the tiles
  // and under everything the workflow produced.
  const plate=groundImageFor(node?.id);
  // Unchecked in the layer list means not drawn. The same per-output set the point layers use.
  const plateHidden=!!plate&&!!result.nodeId
    &&!!hiddenMapLayers.get(result.nodeId)?.has(plate.sourceNodeId);
  if(plate&&!plateHidden){
    const markup=mapImageMarkup(plate,frame.project as (c:[number,number])=>[number,number]);
    const background=[...svg.children].find(child=>child.tagName.toLowerCase()==='rect');
    if(markup){
      if(background)background.insertAdjacentHTML('afterend',markup);
      else svg.insertAdjacentHTML('afterbegin',markup);
      for(const shape of svg.querySelectorAll('[data-fill-role="context"]'))shape.setAttribute('fill','none');
    }
    const plateNote=$('#map-panel').querySelector('#map-note');
    if(plateNote)plateNote.textContent=`${mapImageCredit(plate)} \u00b7 drawn as ground at about `
      +`${plate.groundResolutionM.toFixed(0)} m per pixel. Context: a plate is ink, not measurement.`;
  }
  const choice=node?.params.basemap;
  if(!node||!choice||choice==='none')return;
  const note=$('#map-panel').querySelector('#map-note');
  // THE BUNDLED OUTLINE, which needs no network and no provider. Drawn in the figure's own
  // projection: a coastline is lon/lat points and goes through `project` like every other layer,
  // which is why it sidesteps the Mercator mismatch a raster tile forces.
  if(choice==='natural-earth-110m'){
    const {markup,drawn}=naturalEarthMarkup(frame.bounds,frame.project);
    const background=[...svg.children].find(child=>child.tagName.toLowerCase()==='rect');
    if(markup){
      if(background)background.insertAdjacentHTML('afterend',markup);
      else svg.insertAdjacentHTML('afterbegin',markup);
      for(const shape of svg.querySelectorAll('[data-fill-role="context"]'))shape.setAttribute('fill','none');
    }
    if(note)note.textContent=drawn
      ?`${NATURAL_EARTH_CREDIT} \u00b7 ${drawn} shapes drawn into this figure. Context only: these `
        +'lines are generalised to kilometres and are not a frame to measure or report by.'
      :`${NATURAL_EARTH_CREDIT} covers no land inside this extent, so this figure has no ground `
        +'under it.';
    return;
  }
  const provider=choice==='osm'||choice==='topo'?TILE_PROVIDERS[choice]:undefined;
  if(!provider){
    if(note)note.textContent=`${BASEMAP_OPTIONS.find(o=>o.value===choice)?.label||choice} is drawn from vector tiles, which this `
      +'static plot cannot bake in. Choose OpenStreetMap or OpenTopoMap here, or the interactive presentation for that style.';
    return;
  }
  const stamp=svg.dataset.renderStamp=String(Date.now());
  // GROUND THAT CANNOT BE FETCHED IS A FIGURE WITHOUT GROUND, not a broken application. Both
  // call sites float this promise, so a rejecting tile request reached the page as an unhandled
  // error -- WebKit reports it as a bare "Load failed", which says nothing about tiles and
  // appears on a figure that otherwise drew correctly. Offline is the ordinary case for this
  // application, and the one it is built for.
  let images;
  try{images=await basemapImages(frame.bounds,frame.project,provider,fetchTileAsDataURI);}
  catch{
    if(svg.dataset.renderStamp!==stamp||!svg.isConnected)return;
    const name=BASEMAP_OPTIONS.find(o=>o.value===choice)?.label||choice;
    if(note)note.textContent=`${name} tiles could not be fetched, so this figure is drawn `
      +'without its ground. The plot above is unaffected: a basemap is layer 0 and carries none of '
      +'what the workflow computed.';
    return;
  }
  const {markup,drawn,requested,zoom}=images;
  // The figure may have been replaced while the tiles were in flight.
  if(svg.dataset.renderStamp!==stamp||!svg.isConnected)return;
  // AFTER THE BACKGROUND, NOT BEFORE IT. `oldMap` opens by painting an opaque rect across the
  // whole frame, so inserting the tiles at `afterbegin` drew the ground and then covered it --
  // the practitioner saw a sliver of basemap above the plot and nothing within it: *"look at the
  // top of that map, I think the basemap is hidden in the back"*. Ground belongs above the blank
  // background and below everything the workflow produced, which is what layer 0 means.
  if(markup){
    // AFTER THE BACKGROUND RECT, found by what it is rather than where it sits. Every static
    // renderer opens by painting an opaque rect across its frame, but not all of them open WITH
    // it: the walking-time plot emits a `<desc>` first, so "after the first child" put the ground
    // back underneath the paint it was meant to sit on. Ground belongs above the blank background
    // and below everything the workflow produced, which is what layer 0 means.
    const background=[...svg.children].find(child=>child.tagName.toLowerCase()==='rect');
    if(background)background.insertAdjacentHTML('afterend',markup);
    else svg.insertAdjacentHTML('afterbegin',markup);
    // A FILL THAT ENCODES NOTHING MUST NOT HIDE WHAT IS UNDER IT. The practitioner, 2026-10-25:
    // *"If the shade carries value, then make the shade translucent but discernible. If not, e.g.,
    // just a boundary, it should be transparent, only the border shows."*
    //
    // Withdrawn here rather than never drawn, because the two cases are genuinely different: on a
    // blank page a pale wash separates figure from ground and earns its place, and over a basemap
    // the ground is already there and the wash only covers it. The polygons that DO carry a value
    // -- catchments, travel-time bands, hex counts -- are already translucent at about a fifth
    // and are left alone, which is the other half of the same rule.
    for(const shape of svg.querySelectorAll('[data-fill-role="context"]'))shape.setAttribute('fill','none');
  }
  if(note)note.textContent=drawn
    ?`${provider.attribution} · ${drawn} of ${requested} tiles at zoom ${zoom}, drawn into this figure.`
    :`No basemap tiles could be fetched, so this figure has no ground under it. ${provider.attribution}`;
}
function renderMap(){
  if(!resultsOnScreen())return;
  disposeCatchmentMap?.();disposeCatchmentMap=undefined;document.querySelector('#catchment-map-host')?.remove();document.querySelector('#catchment-plot-download')?.remove();document.querySelector('#comparison-map-host')?.remove();
  const result=activeOutput(),svg=$('#map'), rows=result?.rows||[], centers=result?.centers||[], points=[...rows.filter(r=>r.coordinates).map(r=>r.coordinates!),...centers.filter(c=>c.geometry).map(c=>c.geometry!.coordinates)];
  // PRESENTATION IS LIVE, NOT BAKED INTO THE RUN. The node is read from the current workflow and
  // not from the snapshot as run, because a title, a key, a basemap and a mark's size change
  // nothing the run computed -- so they must show the moment they are chosen, and demanding a
  // rerun for them would be asking a practitioner to recompute a figure to resize a dot.
  const mapNode=workflow.nodes.find((n):n is WorkflowNode<'map_output'>=>n.id===result?.nodeId&&n.type==='map_output')
    ??runWorkflow?.nodes.find((n):n is WorkflowNode<'map_output'>=>n.id===result?.nodeId&&n.type==='map_output');
  // The symbols the run resolved are the run's, so they carry the sizes that were current then.
  // Re-resolved here against the live node, in the layer order the run recorded, so the marks and
  // the key cannot disagree about what a layer looks like.
  if(result?.pointLayers?.length&&mapNode){
    const live=Object.fromEntries(result.pointLayers.map((layer,index)=>
      [layer.sourceNodeId,resolveLayerSymbol(index,mapNode.params.layerSymbols?.[layer.sourceNodeId])]));
    (result as {layerSymbols?:unknown}).layerSymbols=live;
  }
  const spec=result&&mapNode&&runWorkflow?mapPresentation(mapNode,result,runWorkflow):undefined;
  $('#map-panel').classList.toggle('has-communication',!!spec);
  $('#map-communication').hidden=!spec;$('#map-communication-key').hidden=!spec?.legend;$('#map-communication-source').hidden=!spec;
  if(spec){
    $('#map-communication-title').textContent=spec.title;$('#map-communication-subtitle').textContent=spec.subtitle;
    $('#map-communication-source').textContent=spec.sourceNote;$('#map-communication-header-source').textContent=spec.sourceNote;
    // The key draws the same mark the map draws. A coloured <i> could only ever be a circle or a
    // square, so a triangle or a star on the map had no legend entry that matched it.
    const key=spec.legend?spec.items.map(item=>`<span><svg class="map-key-mark" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">`
      +`<path d="${markPath(item.shape||'circle',7,7,5)}" fill="${item.hollow?'none':item.color}" stroke="${item.color}" stroke-width="1.5"/></svg>${esc(item.label)}</span>`).join(''):'';
    $('#map-communication-key').innerHTML=key;$('#map-communication-header-key').innerHTML=key;
    $('#map-download-svg').onclick=()=>{const content=result?.polygons&&result.polygonPresentation==='interactive'?(result.polygons.features.some(f=>f.minutes!==undefined)?catchmentPlot(result.polygons,esc,result.contextPoints):polygonSvg(result.polygons,esc)):svg.innerHTML;
      const viewBox=result?.polygons&&result.polygons.features.some(f=>f.minutes!==undefined)?'0 0 850 650':svg.getAttribute('viewBox')||'0 0 850 295';
      // The scale bar is derived from the plot's own frame, and only for the catchment plot, whose
      // vertical axis is latitude. A decision table or a basemap-backed view has no single ground
      // scale, so none is offered rather than guessed.
      const plotted=result?.polygons&&result.polygons.features.some(f=>f.minutes!==undefined)
        ?catchmentFrame(result.polygons,result.contextPoints):null;
      const frame=plotted?{metresPerPixel:metresPerPixel(plotted.pixelsPerDegreeLatitude)}:undefined;
      download(`${result!.nodeId}-map.svg`,standaloneMapSvg(content,viewBox,spec,frame),'image/svg+xml');};
    // THE SAME FIGURE, FOR THE PLACES THAT WILL NOT TAKE AN SVG. The practitioner, 2026-10-25,
    // on putting one into a slide: *"Why not export as PNG?"* Built from the identical markup, so
    // the two files cannot say different things -- a PNG assembled separately would be a second
    // figure that happened to look like the first.
    $('#map-download-png').onclick=async()=>{
      const button=$('#map-download-png');
      const label=button.textContent||'Download map (PNG)';
      button.disabled=true;button.textContent='Rendering\u2026';
      try{
        const content=result?.polygons&&result.polygonPresentation==='interactive'
          ?(result.polygons.features.some(f=>f.minutes!==undefined)?catchmentPlot(result.polygons,esc,result.contextPoints):polygonSvg(result.polygons,esc))
          :svg.innerHTML;
        const viewBox=result?.polygons&&result.polygons.features.some(f=>f.minutes!==undefined)?'0 0 850 650':svg.getAttribute('viewBox')||'0 0 850 295';
        const plotted=result?.polygons&&result.polygons.features.some(f=>f.minutes!==undefined)
          ?catchmentFrame(result.polygons,result.contextPoints):null;
        const frame=plotted?{metresPerPixel:metresPerPixel(plotted.pixelsPerDegreeLatitude)}:undefined;
        const raster=await rasteriseFigure(standaloneMapSvg(content,viewBox,spec,frame));
        if(!raster){toast('This figure could not be drawn as a PNG. The SVG download carries the same figure.',{tone:'failure'});return;}
        const url=URL.createObjectURL(raster.blob);
        const link=document.createElement('a');link.href=url;link.download=`${result!.nodeId}-map.png`;link.click();
        setTimeout(()=>URL.revokeObjectURL(url),2000);
        // The size is stated rather than left to be discovered at a printer.
        toast(`${raster.width} \u00d7 ${raster.height} px, ${FIGURE_PIXEL_SCALE}\u00d7 the figure \u2014 300 dpi at 8.5 inches.`);
      }catch(error){toast(errorMessage(error),{tone:'failure'});}
      finally{button.disabled=false;button.textContent=label;}
    };
  }
  // A network is drawn as itself: the streets, at the size of the panel, with nothing inferred.
  //
  // UNLESS the map was set to be interactive, in which case this `return` is what stopped it. The
  // practitioner, 2026-10-20: *"Map widget settings (e.g., interactive and basemap) not being
  // implemented ... That looks like a regression."* It is the FIFTH time this exact shape has been
  // found in this function -- see the note below, where a fix was written and then fenced off by a
  // guard above it. Here the guard is an early return: interactive maps were made to work on "any
  // map" on 2026-10-17, below a branch added on 2026-10-13 that returns first. The behaviour never
  // regressed; the CLAIM did, which is worse, because it is the claim a practitioner acts on.
  // ... and only where the streets are the whole of what was wired. With point layers on it too,
  // this early return drew the streets and dropped the points, which is the defect it was asked
  // to fix wearing the other hat. The static plot draws the points; the streets are a frame of a
  // different size, so the note says where they are rather than letting them go missing quietly.
  if(result?.network&&!result.pointLayers?.length&&mapNode?.params.presentation!=='interactive'){
    const coverage=networkCoverage(result.network);
    $('#map-panel').querySelector('#map-note')!.textContent=networkPreviewCaption(coverage);
    svg.style.display='';svg.setAttribute('viewBox','0 0 252 168');
    // The area goes in the same frame as the streets, as the Inspector's preview has always done.
    svg.innerHTML=networkPreviewSvg(result.network,result.boundary as never).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
    return;
  }
  svg.style.display='';svg.setAttribute('viewBox','0 0 850 295');
  if(result?.network&&result.pointLayers?.length)
    $('#map-panel').querySelector('#map-note')!.textContent=
      `${networkPreviewCaption(networkCoverage(result.network))} The streets are drawn with the `
      +`points on this map's interactive presentation; this plot shows the points.`;
  // The static plot is what those checkboxes act on: they set display:none on its marks.
  $('#map-layer-list').hidden=!activeOutput()?.pointLayers?.length
    &&!groundImageFor(activeOutput()?.nodeId);
  if(result?.comparison){svg.style.display='none';const host=document.createElement('div');host.id='comparison-map-host';host.innerHTML=pointComparisonMarkup(result.comparison,esc);$('#map-panel').append(host);return;}
  // INTERACTIVE IS FOR ANY MAP, and until 2026-10-17 it was unreachable without polygons.
  //
  // The inner condition was widened on 2026-10-15 with a comment saying so -- "a study area with
  // points on it is a map like any other ... Reported three times before the cause turned out to
  // be here" -- and the ENCLOSING `if(result?.polygons)` was left in place, so the branch stayed
  // unreachable for a points-only result. The fix was written and then fenced off by the guard
  // above it. Reported a fourth time, on worked example 11, which is points and a study area and
  // no polygons at all.
  //
  // Hoisted out, because only the interactive presentation can draw tiles: leaving it inside the
  // polygon branch means a basemap is reachable only on a catchment.
  if(mapNode?.params.presentation==='interactive'&&result?.view==='map'){
    if(result.network)$('#map-panel').querySelector('#map-note')!.textContent=networkPreviewCaption(networkCoverage(result.network));
    const host=document.createElement('div');host.id='catchment-map-host';
    $('#map-panel').insertBefore(host,$('#map-communication-key'));
    svg.style.display='none';$('#map-layer-list').hidden=true;
    // THE PLATE TRAVELS WITH THE LAYERS, so the map can give it a checkbox. Read from the node
    // like the basemap is, because `map_output` is single-mode and the mode that wins drops
    // every other layer from the value before a renderer sees it -- the defect that took the
    // study area on 2026-10-20, the facilities on 2026-10-22 and the raster on 2026-10-23.
    const livePlate=groundImageFor(mapNode?.id);
    const withPlate=livePlate
      ?{...result,plate:{data:livePlate.data,bounds:livePlate.bounds,opacity:livePlate.opacity,
          label:mapImageCredit(livePlate)}}
      :result;
    disposeCatchmentMap=mountCatchmentMap(host,withPlate.polygons?{...withPlate,polygons:withPlate.polygons}:withPlate,
      result.contextPoints,esc,mapNode?.params.basemap||'none',
      choice=>{if(mapNode)change(w=>getNode(w,mapNode.id,'map_output').params.basemap=choice);},
      // The node is the view's identity. Without it every presentation change -- and Mark radius
      // is one -- remounted the map and refitted it, throwing away the pan and zoom the
      // practitioner had chosen in order to judge the change they were making.
      mapNode?.id);
    if(result.polygons){
      const method=document.createElement('p');method.className='muted';
      method.textContent=result.polygons.method+' / '+result.polygons.notes.join(' ');
      $('#map-panel').insertBefore(method,$('#map-communication-key'));
    }
    return;
  }
  if(result?.polygons){
    const note=document.createElement('div');note.id='catchment-map-host';$('#map-panel').insertBefore(note,$('#map-communication-key'));
    // Interactive for ANY map, not only one that has polygons. The renderer draws the layers it is
    // given, so a study area with points on it is a map like any other -- and since only the
    // interactive presentation can draw tiles, this is what makes a basemap reachable on a map
    // that is not a catchment. Reported three times before the cause turned out to be here.
    // GROUND HERE TOO. The basemap was wired into the renderer that draws a study area with
    // points and into no other, so a catchment, isochrone or extent map -- most of the maps in
    // the worked examples -- could not have one. Found 2026-10-25 by a test that reached for a
    // basemap on `snow-extent` and got nothing: the comment above says the renderer draws the
    // layers it is given, and ground was the layer it was not being given.
    //
    // Each plot carries its own frame, because each projects its own extent: the walking-time
    // plot is 850x650 and the rest are 850x295, and a basemap computed from the wrong one is a
    // basemap in the wrong place.
    const banded=result.polygons.features.some(f=>f.minutes!==undefined);
    if(banded){svg.setAttribute('viewBox','0 0 850 650');svg.innerHTML=catchmentPlot(result.polygons,esc,result.contextPoints);}
    else svg.innerHTML=polygonSvg(result.polygons,esc);
    const polygonGround=banded?catchmentFrame(result.polygons,result.contextPoints):polygonFrame(result.polygons);
    if(polygonGround)void drawStaticBasemap(result,svg,
      {bounds:polygonGround.bounds,project:c=>polygonGround.project(c) as [number,number]});
    const method=document.createElement('p');method.className='muted';method.textContent=result.polygons.method+' / '+result.polygons.notes.join(' ');note.append(method);return;
  }
  // THE RASTER IS GROUND, NOT A MODE. Fourth instance of one defect, and the comments in
  // core.ts name the first three: the study area was dropped on 2026-10-20, the facilities on
  // 2026-10-22, the raster itself on 2026-10-23, each because the winning mode threw away every
  // other wired layer. The value reaching here already carried the rows -- the layer list under
  // the map counted seventeen facilities -- and this line drew the cells and returned, so the
  // control offered a toggle for marks that were never drawn. Reported 2026-10-25 against a
  // Gaborone map with a study area, a clipped raster, facilities and a street network wired,
  // where only the raster appeared.
  if(result?.raster){
    const frame=rasterFrame(result.raster);
    // Typed from markPath's own parameter, so a shape the renderer cannot draw is a build error
    // rather than a mark that silently falls back to a circle.
    const symbols=(result as {layerSymbols?:Record<string,{colour:string;shape:Parameters<typeof markPath>[0];size?:number}>}).layerSymbols||{};
    const hidden=hiddenMapLayers.get(result.nodeId)||new Set<string>();
    const focus=rows.find(r=>`result:${r.id}`===selected);
    const marks=rows.filter(r=>r.coordinates).map(r=>{
      const [x,y]=frame.project(r.coordinates!);
      const symbol=symbols[r.sourceNodeId||'']||{colour:'#699178',shape:'circle' as const};
      const label=r.excluded?'Excluded':r.relation||statusLabel(r.status);
      const radius=(symbol.size??4)+(focus?.id===r.id?2:0);
      return `<g class="location" role="button" tabindex="0" data-place="${esc(r.id)}"`
        +` data-layer="${esc(r.sourceNodeId||'')}"`
        +` style="display:${hidden.has(r.sourceNodeId||'')?'none':''}"`
        +` aria-label="${esc(r.name)}, ${esc(label)}${r.layerLabel?', '+esc(r.layerLabel):''}">`
        +`<title>${esc(r.name)} · ${esc(label)}${r.layerLabel?' · '+esc(r.layerLabel):''}</title>`
        +`<path d="${markPath(symbol.shape||'circle',x,y,radius)}" fill="${symbol.colour}" stroke="white" stroke-width="1.2"/></g>`;
    }).join('');
    svg.innerHTML=rasterSvg(result.raster,marks);
    svg.querySelectorAll<HTMLElement & SVGElement>('[data-place]').forEach(el=>{
      el.onclick=()=>selectResult(el.dataset.place!);
      el.onkeydown=e=>{if(e.key==='Enter')selectResult(el.dataset.place!);};
    });
    return;
  }
  if(result?.pointTable){svg.innerHTML='';return;}
  if(result?.kind==='study-area'){svg.innerHTML=areaSvg(required(result.boundary),result.label);return;}
  if(result?.boundary){svg.innerHTML=oldMap(result,selected,esc,statusLabel);
    // GROUND UNDER A STATIC FIGURE. Experiment 137. Choosing a basemap used to switch the map to
    // the interactive presentation, "the only one that draws tiles", so the figure this project
    // most wants to publish was the one that could never have any context under it. The tiles are
    // baked in, which makes the exported SVG MORE self-contained than the interactive map rather
    // than less: a reader holding the file holds the ground too.
    //
    // Drawn after the fact and inserted underneath, because fetching is asynchronous and the map
    // must appear immediately. If the view has moved on by the time the tiles arrive they are
    // dropped: a late basemap under the wrong figure is worse than none.
    void drawStaticBasemap(result,svg,mapFrame(result));svg.querySelectorAll<HTMLElement & SVGElement>('[data-place]').forEach(el=>{el.style.display=hiddenMapLayers.get(result.nodeId)?.has(el.dataset.layer!)?'none':'';el.onclick=()=>selectResult(el.dataset.place!);el.onkeydown=e=>{if(e.key==='Enter')selectResult(el.dataset.place!);};});return;}
  if(!points.length){svg.innerHTML='<text x="425" y="140" text-anchor="middle">Run the workflow to map its local results.</text>';return;}
  let minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
  const midY=(minY+maxY)/2,cos=Math.max(.05,Math.cos(midY*Math.PI/180)),width=Math.max((maxX-minX)*cos,.01),height=Math.max(maxY-minY,.01),scale=Math.min(660/width,210/height);
  const midX=(minX+maxX)/2,proj=(c:Position)=>[425+(c[0]-midX)*cos*scale,142-(c[1]-midY)*scale];
  const grid=Array.from({length:12},(_,i)=>`<path class="gridline" d="M${i*80} 0V295"/>`).join('')+Array.from({length:5},(_,i)=>`<path class="gridline" d="M0 ${i*65}H850"/>`).join('');
  const focus=rows.find(r=>`result:${r.id}`===selected);
  let content=`<rect width="850" height="295" fill="#f0f3e9"/>${grid}<path d="M15 252 C110 140 158 268 261 142 S432 34 536 155 S710 244 844 67" fill="none" stroke="#e0e8d5" stroke-width="60" opacity=".5"/><path d="M15 252 C110 140 158 268 261 142 S432 34 536 155 S710 244 844 67" fill="none" stroke="#e6eddc" stroke-width="30"/><text x="20" y="24" style="letter-spacing:1.5px;font-size:9px">LOCAL SPATIAL PREVIEW</text><text x="815" y="30" text-anchor="middle">N</text><path d="M815 37l-4 13 4-3 4 3z" fill="#86987b"/>`;
  if(focus?.coordinates&&focus.center){const a=proj(focus.coordinates),b=proj(focus.center.coordinates);content+=`<path d="M${a.join(' ')}L${b.join(' ')}" stroke="#698b78" stroke-dasharray="4 4" stroke-width="1.5"/>`;}
  for(const c of centers){if(!c.geometry)continue;const [x,y]=proj(c.geometry!.coordinates),radius=result!.threshold!/111.195*scale;content+=`<circle cx="${x}" cy="${y}" r="${radius}" fill="#abc2a0" opacity=".10"/><circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="#a0b596" stroke-dasharray="3 5" opacity=".6"/><rect x="${x-6}" y="${y-6}" width="12" height="12" rx="2" fill="#3e6860" stroke="white" stroke-width="2"/><text x="${x+11}" y="${y+17}" style="font-size:9px">${esc(c.properties.name)}</text>`;}
  for(const r of rows){if(!r.coordinates)continue;const [x,y]=proj(r.coordinates),color={Review:'#c18b4f',NoFlag:'#699178',Unknown:'#a89b87'}[r.status!];content+=`<g class="location" data-place="${esc(r.id)}" tabindex="0" role="button" aria-label="${esc(r.name)}, ${statusLabel(r.status)}"><title>${esc(r.name)} · ${statusLabel(r.status)} · ${distanceText(r)}</title>${focus?.id===r.id?`<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="${color}" opacity=".7"/>`:''}<circle cx="${x}" cy="${y}" r="6" fill="${color}" stroke="white" stroke-width="2"/><text class="location-label" x="${x+10}" y="${y-8}">${esc(r.name)}</text></g>`;}
  content+=`<text x="20" y="276" style="font-size:9px">${minX.toFixed(3)}° to ${maxX.toFixed(3)}° longitude · circles show ${result!.threshold} km (approx.)</text>`;
  const missing=rows.filter(r=>!r.coordinates).length;if(missing)content+=`<text x="830" y="276" text-anchor="end" style="font-size:9px">${missing} unmapped · see table</text>`;
  svg.innerHTML=content;svg.querySelectorAll<HTMLElement & SVGElement>('[data-place]').forEach(el=>{el.onclick=()=>selectResult(el.dataset.place!);el.onkeydown=e=>{if(e.key==='Enter')selectResult(el.dataset.place!);};});
}
function reason(input:string):Promise<ReasonerQuad[]>{return new Promise<ReasonerQuad[]>((resolve,reject)=>{
  if(!worker)worker=new Worker('./build/reasoning-worker.js');const id=++seq;
  const timeout=setTimeout(()=>{worker?.terminate();worker=null;reject(new Error('Reasoning exceeded 45 seconds. Reduce the dataset and try again.'));},45000);
  worker.onmessage=({data}:MessageEvent<ReasoningResponse>)=>{if(data.id!==id)return;clearTimeout(timeout);if('error' in data)reject(new Error(data.error));else resolve(data.quads);};
  worker.onerror=e=>{clearTimeout(timeout);worker?.terminate();worker=null;reject(new Error(`Reasoning worker failed: ${errorMessage(e)}`));};worker.postMessage({id,input} satisfies ReasoningRequest);
});}
/** Named after a run: every ruleset this workflow pinned that a newer version supersedes.
 *
 *  The practitioner's instruction of 2026-10-14: "when new versions appear, and a workflow is run
 *  that requires an old version, we have to alert the user that there is a newer version." Said
 *  at the run because that is the moment a result is produced by rules the practitioner may not
 *  know are superseded; what CHANGED is in the Inspector, where there is room for it, and in the
 *  widget manual. An incompatible supersession is named as such here, because it decides whether
 *  the practitioner is looking at a convenience or at a rewiring job.
 *
 *  Reads the run's own snapshot, not the live workflow, so it describes the run that just
 *  finished rather than an edit made since. */
function supersessionNotice(ran:Workflow):string{
  const hosts=ran.nodes.filter((n):n is WorkflowNode<'apply_ruleset'>=>n.type==='apply_ruleset');
  const stale=hosts.flatMap(node=>{
    const pinned=node.params.ruleset;if(!pinned)return [];
    // A NODE CARRYING ITS OWN RULES IS NOT SUPERSEDED BY THE ARTEFACT IT BORROWED PORTS FROM.
    // `authoredPin` pins a ruleset purely for its port shape and titles the pin "Rules written in
    // this workflow"; what such a node computes is the practitioner's authored rules, so a newer
    // version of the pinned artefact changes nothing about it. Publishing outreach-criteria 1.1.0
    // on 2026-10-26 told four authored nodes their ruleset was superseded and not a drop-in,
    // which was false of every one of them. `core.ts` already states the principle where it binds
    // parameters: "the pin gives this node its ports; it does not describe rules the practitioner
    // wrote."
    if(node.params.authored)return [];
    const found=supersession(pinned.id,pinned.version);
    return found?[{node,pinned,found}]:[];
  });
  if(!stale.length)return '';
  const named=stale.map(({node,pinned,found})=>`${node.params.label||node.id} is pinned to `
    +`${pinned.version}, and ${found.version} is available`
    +`${found.incompatible?' and is not a drop-in':''}`);
  return ` Note: ${named.join('; ')}. The run used the pinned version${stale.length===1?'':'s'}, `
    +`which is what reproduces these results; the Inspector says what changed.`;
}
async function run(){if(busy)return;
  // A refusal BEFORE the run starts is still a refused run, and the canvas has to say so. It
  // returned early here without touching the state, so the workflow went on reading "Changed ·
  // rerun to update" -- an invitation to press the button that had just refused -- while the
  // only sign of what happened was a line in the browser console. Caught by its own test,
  // 2026-10-15, after the practitioner could not make sense of the message that did appear.
  runFailed=false;runIncomplete=false;
  // An unfinished workflow is told apart from a broken one. A canvas with no output yet is the
  // ordinary middle of building something, so it gets the plain notice tone, no console trace and
  // a state line that says what is true -- not "Run failed", which claims something went wrong.
  try{executionPlan(workflow);}catch(e){
    if(e instanceof IncompleteWorkflow){runIncomplete=true;toast(errorMessage(e),{tone:'notice'});render();return;}
    toast(errorMessage(e),{tone:'failure'});runFailed=true;render();console.error(e);return;}busy=true;statuses={};justFinished.clear();lastRunMs=null;render();const snapshot=structuredClone(workflow);const started=performance.now();try{const next=await executeWorkflow(snapshot,reason,(id,state)=>{statuses[id]=state;if(state==='done'){justFinished.add(id);setTimeout(()=>{justFinished.delete(id);if(!busy||statuses[id]==='done')flow?.update(playbackView(),selected,statuses);},FINISH_GLOW_MS);}flow?.update(playbackView(),selected,statuses);},(ref,provider,origin)=>{if(!credentials)throw new Error('Credentials are not available.');return credentials.resolve(ref,provider,origin);});lastRunMs=performance.now()-started;
    // THE CANVAS CAN MOVE WHILE A RUN IS IN FLIGHT, and this run is then nobody's results.
    //
    // `renderResults` discards a result whose workflow is no longer the open one -- the rule
    // above it, *"results belong to the workflow that produced them"*. Nothing stopped the
    // workflow changing during the await: `loadExample` is behind `busy`, but the import paths
    // are not, and a catalog fetch resolves on its own schedule. So the run below finished, had
    // its result correctly discarded, and then read it anyway.
    //
    // Found 2026-10-27 on the DEPLOYED instance, which is the only place it had ever been done
    // in that order: fetching South London from the catalog while the first example's run was
    // still going threw `Cannot read properties of null (reading 'outputs')`, and the run
    // reported nothing at all. Every local test either waits for the run or imports from a file
    // input, which lands between runs rather than inside one.
    const stillOurs=storageKey(snapshot)===storageKey(workflow);
    // `dirty` says the open canvas has changes this run has not covered. For a canvas this run
    // never touched that is true, and clearing it here marked a freshly adopted workflow as
    // already run.
    result=next;runWorkflow=snapshot;if(stillOurs)dirty=false;
    // A use instance is a widget connected and RUN, so it is counted here and nowhere else:
    // placing one on a canvas is not using it. Local to this browser, never sent.
    recordRun(next.trace);
    renderResults();const issues=dataIssueNotice(next);
  // "we must surface the issue on the widget as a toast message that I can then read and close"
  // -- the practitioner, 2026-10-16. A run that quietly bands a third of its records Unrecorded
  // has answered the question and hidden the thing worth knowing.
  //
  // ADDED to what a successful run already says, not substituted for it. The first version
  // replaced the line, so a run with a data issue no longer reported that it had finished or
  // how long it took -- taking something away from the practitioner in the act of telling them
  // something. The run succeeded; it is amber rather than red for that reason, and it stays
  // until it is closed.
  //
  // READ FROM `next`, NOT FROM `result`. `next` is this run; `result` is whatever the application
  // is holding by the time this line runs, which after a mid-run canvas change is null. And when
  // the result was discarded, do not announce tabs that are not there: say what happened, in the
  // plain notice tone, because nothing went wrong -- the practitioner moved on, and the work they
  // moved to is untouched.
  toast(stillOurs
    ?`Complete in ${elapsedText(lastRunMs)}: ${next.outputs.length} output tabs updated.`
      +supersessionNotice(snapshot)+(issues?` ${issues}`:'')
    :`A run of ${snapshot.name||'another workflow'} finished in ${elapsedText(lastRunMs)}, after this `
      +`canvas had already moved on. Its results belong to that workflow, so they were not kept. `
      +`Open it again and run it to see them.`,
    stillOurs?(issues?{tone:'warning'}:undefined):{tone:'notice'});}catch(e){toast(`Workflow stopped: ${errorMessage(e)}`,{tone:'failure'});runFailed=true;console.error(e);}
  finally{
    busy=false;
    // A FINISHED RUN DOES NOT MOVE THE PRACTITIONER. The first version of the tab switched to
    // Results when a run completed, on the reasoning that the split had always shown them. It
    // reads differently in use: someone adding a node, running, and adjusting it is thrown off
    // the canvas every time, and being moved is the opposite of choosing which view you are in.
    // The run summary and the count on the Results tab say that there is something to look at.
    render();
  }}
/** A PROJECT GOES OUT COMPRESSED, AND COMES BACK EITHER WAY.
 *
 *  The practitioner, after a 20 MB import limit refused the backup they had just taken to rescue
 *  their work: *"Why don't we zip it as an export and unzip it upon import?"* A project document
 *  is JSON holding a street graph -- millions of repeated OSM ids and coordinate strings -- which
 *  is about as compressible as text gets. The browser does this itself: CompressionStream has
 *  been in every engine this application supports since 2023, and the street engine already
 *  leans on its DecompressionStream counterpart to read a .osm.pbf.
 *
 *  Gzip rather than zip: one stream in, one stream out, no archive format to describe, and the
 *  file is readable by anything. The encrypted ZIP stays what it is -- a different artefact, for
 *  sharing a bundle under a passphrase rather than for moving one's own work between browsers.
 *
 *  What this does NOT fix is the ceiling underneath: the text still becomes one JavaScript string
 *  to be parsed, and V8 refuses past about 512 MB with "Invalid string length". Compression moves
 *  what a practitioner can CARRY, not what a tab can hold. */
export async function gzipText(text:string):Promise<Blob>{
  const stream=new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
}
/** Gzip announces itself: 1f 8b. A file that does not is read as the plain JSON it used to be,
 *  so every export ever taken still imports. */
export async function readMaybeGzipped(file:Blob):Promise<string>{
  const head=new Uint8Array(await file.slice(0,2).arrayBuffer());
  if(head[0]!==0x1f||head[1]!==0x8b)return file.text();
  const stream=file.stream().pipeThrough(new DecompressionStream('gzip'));
  const text=await new Response(stream).text();
  // BOUNDED ON WHAT IT BECAME, not on what arrived. The file-size check upstream sees the
  // COMPRESSED bytes, and a street graph gzips about 25 to 1 -- so a file inside the limit can
  // expand far past it, which is the oldest trick an archive plays. The encrypted package has
  // bounded its expansion since it learned to compress; this path had not.
  if(text.length>MAX_BUNDLE_BYTES)
    throw new Error(`This file expands to ${(text.length/1e6).toFixed(1)} MB, more than the `
      +`${MAX_BUNDLE_BYTES/1e6} MB that may be read back in.`);
  return text;
}
function downloadBlob(name:string,blob:Blob){
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),10_000);
}
function download(name:string,text:string,type='application/json'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
$('#release-download').onclick=()=>{const output=activeOutput();if(!output||exampleKey(workflow)!=='snow-geoprivacy'||!output.nodeId.startsWith('after-'))return;
  const features=output.polygons?.kind==='hexbin'?output.polygons.features.map(f=>({type:'Feature',id:f.id,properties:{count:f.count},geometry:f.geometry})):output.rows.map(r=>({type:'Feature',id:r.id,properties:{name:r.name},geometry:r.coordinates?{type:'Point',coordinates:r.coordinates}:null}));
  download(`${output.nodeId}-derived.geojson`,JSON.stringify({type:'FeatureCollection',features},null,2),'application/geo+json');
};
function wireThemeControl(){
  const select=document.querySelector<HTMLSelectElement>('#theme-select');
  const preference=initTheme();
  if(!select)return;
  select.value=preference;
  select.addEventListener('change',()=>{
    const chosen=select.value;
    if(!isThemePreference(chosen))return;
    applyTheme(chosen);
    if(!saveThemePreference(chosen))toast('This device would not store the theme; it applies until reload.');
  });
}
/** RESULTS IS A TAB, not the lower half of a split. The practitioner, 2026-10-21: *"can we make
 *  the Results Panel a tab alongside Workflow ... It would be easier to see the whole workflow or
 *  the whole Result panel than to see half of each."* The split had a divider, a remembered
 *  height and an Expand button that toggled which half won; all three existed to manage a
 *  compromise that a tab removes. The order is the order of the work: build it, read it, then
 *  inspect how it was derived. */
let currentView='workflow';
function switchView(view:string){
  // SELECTING THE TAB YOU ARE ON CHANGES NOTHING. Rebuilding the results on every click threw
  // away the map and everything it held -- the vector basemap just chosen, and the pan and zoom
  // the practitioner had set. Found 2026-10-21 when a redundant click erased a MapLibre canvas.
  if(view===currentView)return;
  currentView=view;
  const work=$('.work-area');
  work.classList.toggle('showing-results',view==='results');
  $('#workflow-view').hidden=view!=='workflow';
  $('#rules-view').hidden=view!=='rules';
  $('#project-view').hidden=view!=='project';
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>{
    const active=b.dataset.view===view;
    b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));
  });
  if(fullScreen)setFullScreen(true);
  // Built on arrival, because it could not be built while the panel was hidden. SYNCHRONOUSLY:
  // the class above has already made the panel visible, and Leaflet reads clientWidth, which
  // forces the layout it needs. Deferred to a frame, anything that looked at the map in the
  // same turn as the tab click found no map -- a race in the application, not only in a test.
  if(view==='project')renderProjectView();
  if(view==='results')renderMap();
  if(view==='workflow')requestAnimationFrame(()=>flow?.fit());
}
function validConnection(c:Connection|Edge){const a=workflow.nodes.find(n=>n.id===c.source),b=workflow.nodes.find(n=>n.id===c.target);if(!a||!b||a.id===b.id||!outputOf(a))return false;
  // The map's one configurable port accepts anything the map can draw; which declared port it
  // becomes is decided on connection, by what the source emits. Without this the drop is refused
  // before setConnection ever sees it, because `layer` is not a declared port.
  if(c.targetHandle==='layer'&&b.type==='map_output')
    return nodeInputs(b).some(([,type])=>type===outputOf(a));
  return nodeInputs(b).find(([p])=>p===c.targetHandle)?.[1]===outputOf(a);}
mountCanvas($('#canvas'),{describe:describeNode,ready(api){flow=api;render();setTimeout(()=>flow!.fit(),80);},select(id){selected=id;$('#node-search').value='';if(revealResultFor(id))renderResults();markLinkedTabs();render();$('#node-library [aria-current="true"]')?.scrollIntoView({block:'nearest',behavior:'smooth'});},clear(){selected=null;markLinkedTabs();render();},move(id,p){change(w=>Object.assign(required(w.nodes.find(n=>n.id===id)),{x:p.x,y:p.y}),{spatial:false});},connect(c){change(w=>setConnection(w,c.source,c.target,required(c.targetHandle)));},valid:validConnection,remove:removeNodes,removeEdges(ids){change(w=>w.edges=w.edges.filter(e=>!ids.includes(e.id)));},zoom(z){$('#zoom-value').textContent=`${Math.round(z*100)}%`;}});
// Delegated, because the canvas redraws its nodes whenever anything changes and a listener bound
// to a button would go with them.
$('#canvas').addEventListener('click',event=>{
  const button=(event.target as HTMLElement).closest<HTMLElement>('[data-dismiss-alert]');
  if(!button)return;
  event.stopPropagation();
  dismissedAlerts.add(alertKey(button.dataset.dismissAlert!));
  render();
});
$('#run-button').onclick=run;$('#node-search').oninput=e=>renderLibrary(control(e).value);$('#zoom-in').onclick=()=>flow?.zoomIn();$('#zoom-out').onclick=()=>flow?.zoomOut();$('#fit-button').onclick=()=>flow?.fit();
// Columns in the order the work happens. Offered rather than applied: a canvas somebody has
// arranged is theirs, and exploding a micro-workflow is the moment it stops being readable.
$('#tidy-button').onclick=()=>{
  if(busy)return;
  if(alreadyTidy(workflow)){toast('Already laid out in order.');return;}
  const moved=change(w=>{const at=tidyLayout(w);for(const node of w.nodes){
    const position=at.get(node.id);if(position){node.x=position.x;node.y=position.y;}}},{spatial:false});
  if(moved===false)return;
  flow?.fit();
  toast('Laid out in columns, left to right in the order the work happens. Undo to put it back.');
};
// A worked example is published work, and editing it should not mean losing it. The saved
/** Reload ONE imported workflow from the document it was read from, IN PLACE.
 *
 *  Asked which it should be, the practitioner, 2026-10-24: *"Yes reset the currently open
 *  workflow"* -- not the project. So the project membership and the minted key survive, because
 *  they are what make the workflow theirs; only the content is the publisher's again. A second
 *  import would have left them with two copies and renamed neither.
 *
 *  THE CACHE IS CHECKED BEFORE THE NETWORK, and the cache is keyed by the digest the catalog
 *  pins, so a hit is the same bytes that were verified at import rather than a second fetch
 *  trusted because the first one worked. An offline device resets; a device whose cache has been
 *  cleared re-fetches and verifies again.
 *
 *  Nothing is replaced until the published workflow has been read and validated: a refusal leaves
 *  the edited workflow exactly as it was and says why. */
async function resetFromOrigin(origin:ExampleOrigin):Promise<void>{
  const example=exampleById(origin.exampleId);
  if(!example){
    toast('This example is no longer in the catalog, so there is nothing to reload it from.',{tone:'failure'});
    return;
  }
  try{
    let payload=cachedPayload(origin.sha256);
    if(payload===undefined){
      toast('Fetching the published document again\u2026');
      const bytes=await verifiedFile(example,origin.path);
      payload=JSON.parse(await readMaybeGzipped(new Blob([bytes as BlobPart]))) as unknown;
      await putPayload(origin.sha256,payload);
    }
    const entry=readProjectDocument(payload).workflows[origin.index];
    if(!entry)throw new Error('The published document no longer carries this workflow, so there is nothing to reload.');
    const published=await importWorkflowDocument(entry.document,validateWorkflow);
    const identity={projectId:workflow.projectId,workflowKey:workflow.workflowKey,exampleId:undefined};
    const replaced=change(w=>{replaceWorkflow(w,{...published,...identity});selected=null;});
    if(replaced===false)return;
    result=null;runWorkflow=null;activeOutputId=null;history=[];future=[];statuses={};
    renderResults();renderLibrary($('#node-search').value);render();
    setTimeout(()=>flow?.fit(),80);
    toast('Reloaded as published.');
  }catch(error){
    toast(errorMessage(error),{tone:'failure'});
  }
}
// workspace is kept when the dropdown is used, so this is the way back to the published one.
$('#reset-example').onclick=async()=>{
  if(busy)return;
  const origin=originOf(storageKey(workflow));
  if(!confirm('Discard your edits to this workspace and reload it as published? This cannot be undone.'))return;
  if(origin){await resetFromOrigin(origin);return;}
  const key=exampleKey(workflow);
  // Not loadExample: that saves the workspace you are leaving before loading, which would
  // write the edited version straight back over the one being discarded. Replacing in place
  // lets the ordinary save put the published template where the edit was.
  const replaced=change(w=>{replaceWorkflow(w,template(key));selected=null;});
  if(replaced===false)return;
  result=null;runWorkflow=null;activeOutputId=null;history=[];future=[];statuses={};
  renderResults();renderLibrary($('#node-search').value);render();
  setTimeout(()=>flow?.fit(),80);
  recordRevision(key);
  toast('Reloaded as published.');
};
$('#undo-button').onclick=()=>{if(busy||!history.length)return;future.push(structuredClone(workflow));workflow=history.pop()!;dirty=true;statuses={};save();render();};
$('#redo-button').onclick=()=>{if(busy||!future.length)return;history.push(structuredClone(workflow));workflow=future.pop()!;dirty=true;statuses={};save();render();};
$('#reset-button').onclick=()=>{change(w=>{const key=exampleKey(w);replaceWorkflow(w,template(key));selected=key.startsWith('snow-')?'catchments':key==='raster'?'raster-input':key==='old-naledi'?'access':'criteria';});renderLibrary();flow?.fit();};
$('#workflow-select').onchange=e=>loadExample(control(e).value);
/** Switching project opens one of its workflows, because a project is not a thing you can look at
 *  on the canvas -- the canvas holds a question, and a project holds the questions. The first one
 *  that exists is opened; a project whose workflows have all been deleted opens an empty canvas
 *  belonging to it rather than refusing. */
$('#project-select').onchange=e=>{
  const id=control(e).value,project=allProjects().find(p=>p.id===id);
  if(!project){loadExample('blank');return;}
  const saved=readSavedWorkflows();
  const first=project.workflows.find(key=>saved[key])||project.workflows[0];
  if(first)loadExample(first);
  else addWorkflowToProject(project.id);
};
$('#blank-add').onclick=()=>$('#node-library [data-add="study_area"]')?.click();
/** The eyebrow above the workflow's name: the investigation it belongs to, and how many
 *  workflows that investigation holds. Said rather than implied, because the whole finding behind
 *  experiment 122 is that four workflows about one outbreak looked like four unrelated workspaces. */
/** WHERE YOU ARE, AND THE WAY BACK UP. Experiment 131 asked for a breadcrumb --
 *  `Facilities and Networks > Health Facilities Ituri` -- as the shift between the two places the
 *  practitioner works, and noted it would be the first thing in the application to say that a
 *  workflow is INSIDE a project.
 *
 *  This read `PROJECT NAME / 1 workflow` until 2026-10-23. Two things were wrong with it. A count
 *  is not a crumb: it told you how many workflows the project held and never which one you had
 *  open, so the second half of the trail was missing. And neither half went anywhere, which is
 *  the discoverability problem this experiment is about -- the project level was reachable only
 *  by recognising a storage readout as a button.
 *
 *  The count now lives where it is useful, in the Project view and in the project's own details,
 *  rather than in the one line that should answer "where am I". */

/** Create a project, then give it its first workflow.
 *
 *  The practitioner, 2026-10-19: *"the first step is not even study area - it's create a project."*
 *  So this runs BEFORE any geography: it names the investigation, then opens one empty canvas
 *  belonging to it. The study area is step two, inside that workflow, where it always was. */
function openProjectDialog(){
  if(busy)return;
  $('#project-name-input').value='';$('#project-subject-input').value='';
  // WHAT HAPPENS TO THE CANVAS YOU HAVE OPEN, said before it happens. This created the project and
  // then replaced the canvas with an empty workflow named "<project> · first question", which is
  // right when starting an investigation from nothing -- the practitioner's own 2026-10-19 request,
  // *"the first step is not even study area - it's create a project"* -- and wrong when the reason
  // for making the project is the work already on screen. One control served the first intent and
  // silently did the second thing.
  const key=storageKey(workflow);
  const filed=allProjects().some(p=>p.workflows.includes(key));
  const adopt=$('#project-adopt-current');
  const name=workflow.name||WORKFLOW_LABELS[key]||key;
  adopt.checked=!filed&&workflow.nodes.length>0;
  adopt.disabled=filed;
  $('#project-adopt-label').textContent=filed
    ?`"${name}" is already filed under a project, so a new one starts with an empty workflow.`
    :`Put "${name}" in it, instead of starting with an empty workflow.`;
  $('#project-dialog').showModal();$('#project-name-input').focus();
}
function createProjectFromDialog(){
  const name=$('#project-name-input').value.trim();
  if(!name){$('#project-name-input').focus();toast('A project needs a name: what are you investigating?');return;}
  const stored=readProjects(),project=newProject(name,$('#project-subject-input').value,allProjects());
  const key=`${project.id}/w1`;
  project.workflows=[key];
  if(!writeProjects([...stored,project])){$('#project-dialog').close();return;}
  $('#project-dialog').close();
  save();
  // ADOPTING THE OPEN CANVAS takes the path that already files a workflow, rather than a second
  // implementation of the same act: the project is written with no workflows and
  // `assignCurrentWorkflow` gives this one its key and puts it in.
  if($('#project-adopt-current').checked&&!$('#project-adopt-current').disabled){
    project.workflows=[];
    if(!writeProjects([...stored,project])){return;}
    assignCurrentWorkflow(project.id);
    renderProjectOptions();render();
    toast(`"${workflow.name||'This workflow'}" is now in "${project.name}". `
      +'Add a workflow for each further question you want to ask about it.');
    return;
  }
  workflow={...blankWorkflow(),name:`${project.name} · first question`,projectId:project.id,workflowKey:key,exampleId:undefined};
  selected=null;result=null;runWorkflow=null;activeOutputId=null;history=[];future=[];statuses={};dirty=true;
  save();renderProjectOptions();renderLibrary();renderResults();render();switchView('workflow');
  toast(`Project "${project.name}" created with one empty workflow. Add a workflow for each question you want to ask about it.`);
}
/** Stored projects in the picker, grouped exactly as the built-in seven are in index.html.
 *  Without this a created project persists and becomes unreachable, which is worse than refusing
 *  to create one. Rebuilt wholesale rather than patched: there are at most a few dozen. */
function renderProjectOptions(){
  // TWO selects, because they are two questions. The practitioner, 2026-10-20: *"I can only view
  // the workflows through the worked example dropdown which seems to be the wrong place to locate
  // projects."* It was: one control listed every shipped example and every created project's
  // workflows together, so a project existed only as an optgroup label and could not be chosen,
  // renamed or looked at. Now the first select chooses the investigation and the second chooses
  // the question, and the worked examples appear as what they already are -- seven built-in
  // projects holding eleven workflows, listed beside yours and marked.
  const projects=$('#project-select') as HTMLSelectElement,workflows=$('#workflow-select') as HTMLSelectElement;
  const saved=readSavedWorkflows(),stored=readProjects();
  const key=storageKey(workflow);
  const current=workflow.projectId?allProjects().find(p=>p.id===workflow.projectId):projectOfWorkflow(key,allProjects());
  const unfiled=Object.keys(saved).filter(k=>!allProjects().some(p=>p.workflows.includes(k)));

  const optionFor=(value:string,label:string,workflowKeys?:readonly string[])=>
    `<option value="${esc(value)}"${workflowKeys?` data-workflows="${esc(workflowKeys.join(' '))}"`:''}>${esc(label)}</option>`;
  const group=(label:string,body:string)=>body?`<optgroup label="${esc(label)}">${body}</optgroup>`:'';
  const count=(project:Project)=>project.workflows.length===1?'1 workflow':`${project.workflows.length} workflows`;
  // "No project" is ALWAYS offered, not only while the open canvas is in none. Without it a
  // workflow belonging to no investigation -- the blank canvas among them -- became unreachable
  // the moment a project was selected, which is a navigation trap rather than a tidy list.
  projects.innerHTML=
    group('Your projects',stored.map(p=>optionFor(p.id,`${p.name} · ${count(p)}`,p.workflows)).join(''))
    +group('Built in',BUILT_IN_PROJECTS.map(p=>optionFor(p.id,`${p.name} · ${count(p)}`,p.workflows)).join(''))
    +optionFor('','— No project —',['blank',...unfiled]);
  projects.value=current?current.id:'';

  // The workflows of the chosen project, plus -- only when the open canvas belongs to none --
  // the unfiled ones, so a workflow can never become unreachable by having no project.
  const keys=current?current.workflows:[...new Set(['blank',...unfiled])];
  workflows.innerHTML=keys.map(k=>optionFor(k,(saved[k] as {name?:string}|undefined)?.name||workflowTitle(k))).join('')
    +(keys.includes(key)?'':optionFor(key,workflow.name||'This canvas'));

  // THE TEMPLATE PICKER lists every workflow on this device that has something to copy, because a
  // method is worth reusing across projects as well as inside one -- the next province is a new
  // question, and sometimes a new investigation. A workflow with no widgets is not offered: there
  // would be nothing to fill.
  const template=$('#workflow-template');
  const candidates=Object.entries(saved)
    .filter(([k,w])=>k!==key&&((w as {nodes?:unknown[]}).nodes?.length||0)>0)
    .map(([k,w])=>[k,(w as {name?:string}).name||workflowTitle(k)] as const);
  template.innerHTML=`<option value="">＋ From a template…</option>`
    +candidates.map(([k,label])=>optionFor(k,label)).join('');
  template.hidden=!candidates.length;
  template.disabled=busy;

  // DELETE is offered for a workflow a practitioner made and refused for a worked example, which
  // ships with the application: the control says which, rather than being absent and leaving the
  // question of where workflows go to be asked again.
  const remove=$('#delete-workflow') as HTMLButtonElement;
  // SHIPPING WITH THE APPLICATION IS A FACT ABOUT THE LIST, NOT ABOUT THE KEY'S SHAPE.
  //
  // This was `isExampleKey(key)` -- `!key.includes('/')` -- so ANY workflow whose key had no
  // slash was refused deletion as a worked example, including one imported from a repository.
  // The practitioner, 2026-10-24, on the South London example fetched from the catalog: *"Any
  // imported project we should be able to delete, including repo-based projects like South
  // London."*
  //
  // The line below already knew better: Reset example reads the compiled-in list and correctly
  // hid itself for an imported workflow. So the refusal told the practitioner to use a control
  // that the next statement had removed from the bar -- it refused the action they wanted and
  // recommended one that was not there.
  //
  // THE TWO CONTROLS ASK DIFFERENT QUESTIONS, which is how the first fix for this broke the blank
  // canvas. Delete asks "does this ship with the application", and the blank canvas does, so it is
  // EXAMPLE_KEYS. Reset example asks "is there published work to reload", and a blank canvas has
  // none, so it is WORKED_EXAMPLE_KEYS -- the same list with `blank` removed. Sharing one
  // predicate is what made `isExampleKey` look right: wrong for an imported workflow and right by
  // accident for the blank one. `workflow-housekeeping` caught the replacement in both engines.
  const published=EXAMPLE_KEYS.includes(key);
  // RESET EXAMPLE is about published work, so it is in the bar only while published work is open.
  // On everything else it was a control for a thing that does not exist -- there is nothing to
  // reload a practitioner's own workflow to -- taking a slot beside the controls that do apply.
  // The blank canvas is not a worked example either: "New empty canvas" is its gesture.
  // An imported example has no template, but it has an origin, and that is published work too.
  $('#reset-example').hidden=!WORKED_EXAMPLE_KEYS.includes(key)&&!originOf(key);
  remove.disabled=busy||published;
  remove.title=published
    ?'A worked example ships with the application and stays. "Reset example" discards your edits to it.'
    :`Remove "${workflow.name||workflowTitle(key)}" from this device. This cannot be undone.`;

  workflows.value=key;
}
/** What a workflow is called before it has been opened and saved under its own name. Built-in
 *  workflows carry the example's own title; a created one carries whatever it was named. */
function workflowTitle(key:string):string{
  const labels=WORKFLOW_LABELS as Record<string,string|undefined>;
  return labels[key]||key;
}
/** The investigation this workflow is in, and the way to change it.
 *
 *  The practitioner, 2026-10-19: *"users can create workflows and can import them into projects.
 *  Maybe make that optional?"* So it is optional in both directions -- a workflow may belong to no
 *  project, and one that does can be moved out again. The seven built-in projects are the worked
 *  examples and are compiled in, so they are shown but cannot be edited: adding your workflow to
 *  "John Snow, Soho, 1854" would change a published example, and that is the one case where a
 *  practitioner's work and the project's own records would disagree about what an example is. */
/** Click the name, type the name. The practitioner chose "edit in place" and then reported, on
 *  what I built: *"There is still no way to edit project (e.g., title) or workflow (e.g., title)
 *  metadata."* It was there -- behind a collapsed disclosure at the bottom of the bar, which is
 *  somewhere to PUT a control rather than somewhere a practitioner looks. A title you can click
 *  is the gesture the choice implied, and the disclosure keeps the things that are not a title:
 *  the subject, the workflow list, the id, and the two destructive actions.
 *
 *  Escape abandons, Enter and blur apply. An empty name is abandoned rather than written, because
 *  a project called "" is unfindable in the very selector this was built for. */
function editInPlace(element:HTMLElement,current:string,apply:(value:string)=>void,refuse?:string){
  if(refuse){toast(refuse,{tone:'warning'});return;}
  if(busy||element.querySelector('input'))return;
  const input=document.createElement('input');
  input.className='inline-rename';input.value=current;input.maxLength=80;
  input.setAttribute('aria-label',element.dataset.renameLabel||'Rename');
  const previous=element.textContent||'';
  element.textContent='';element.append(input);input.focus();input.select();
  let done=false;
  const finish=(write:boolean)=>{
    if(done)return;done=true;
    const value=input.value.trim();
    element.textContent=previous;
    if(write&&value&&value!==current)apply(value);else render();
  };
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();finish(true);}
    if(event.key==='Escape'){event.preventDefault();finish(false);}
  });
  input.addEventListener('blur',()=>finish(true));
}
/** Rename the investigation this canvas belongs to, from the eyebrow that names it. */
function renameProjectInPlace(){
  const key=storageKey(workflow);
  const project=workflow.projectId?readProjects().find(p=>p.id===workflow.projectId):projectOfWorkflow(key,readProjects());
  const builtIn=projectOfWorkflow(key,BUILT_IN_PROJECTS)||(workflow.projectId?BUILT_IN_PROJECTS.find(p=>p.id===workflow.projectId):undefined);
  editInPlace($('#project-name'),project?project.name:'',value=>{
    if(!writeProjects(readProjects().map(p=>p.id===project!.id?{...p,name:value}:p)))return;
    forgetSavedWorkflows();render();toast(`Project renamed to "${value}".`);
  },project?undefined:builtIn
    ?'This project ships with the application, so its name is fixed. Create a project of your own to name it.'
    :'This canvas belongs to no investigation yet. Create a project, or choose one under Project details.');
}
/** Rename the question this canvas answers, from the heading that states it. */
function renameWorkflowInPlace(){
  editInPlace($('#project-title'),workflow.name||'',value=>{
    change(w=>{w.name=value;},{spatial:false});toast(`Workflow renamed to "${value}".`);
  });
}
/** The project's own fields, and the one place they can be changed.
 *
 *  Until 2026-10-20 a project could be created and never edited: no rename, no subject change, no
 *  deletion, and the subject was visible only as a tooltip on the eyebrow. The practitioner:
 *  *"Right now I have no way of editing Project Title nor viewing Project metadata."* */
function renderProjectDetails(){
  const key=storageKey(workflow);
  const project=workflow.projectId?allProjects().find(p=>p.id===workflow.projectId):projectOfWorkflow(key,allProjects());
  const builtIn=!!project&&BUILT_IN_PROJECTS.some(p=>p.id===project.id);
  const saved=readSavedWorkflows();
  ($('#project-name-edit') as HTMLInputElement).value=project?project.name:'';
  ($('#project-subject-edit') as HTMLInputElement).value=project?project.subject:'';
  ($('#workflow-name-edit') as HTMLInputElement).value=workflow.name||'';
  for(const id of ['#project-name-edit','#project-subject-edit'])
    ($(id) as HTMLInputElement).disabled=!project||builtIn;
  ($('#project-delete') as HTMLButtonElement).disabled=!project||builtIn;
  $('#project-readonly').hidden=!builtIn;
  const held=project?project.workflows:[];
  const named=held.map(k=>(saved[k] as {name?:string}|undefined)?.name||workflowTitle(k));
  $('#project-stats').textContent=project
    ?`${held.length===1?'1 workflow':`${held.length} workflows`}: ${named.join(' · ')}. Project id ${project.id}.`
    :'This canvas belongs to no investigation. Choose one below, or create a project to group the questions you are asking.';
}
function applyProjectDetails(){
  const key=storageKey(workflow);
  const project=workflow.projectId?readProjects().find(p=>p.id===workflow.projectId):projectOfWorkflow(key,readProjects());
  const name=($('#project-name-edit') as HTMLInputElement).value.trim();
  const subject=($('#project-subject-edit') as HTMLInputElement).value.trim();
  const workflowName=($('#workflow-name-edit') as HTMLInputElement).value.trim();
  if(workflowName&&workflowName!==workflow.name)change(w=>{w.name=workflowName;},{spatial:false});
  if(project){
    if(!name){toast('A project needs a name: what are you investigating?',{tone:'warning'});return;}
    const next=readProjects().map(p=>p.id===project.id?{...p,name,subject}:p);
    if(!writeProjects(next))return;
  }
  forgetSavedWorkflows();render();renderResults();
  toast(project?`Project "${name}" updated.`:'Workflow renamed.');
}
/** Deleting a project does NOT delete its workflows. They become unfiled and stay openable, which
 *  is the conservative reading of "delete": a practitioner removing a grouping has not asked to
 *  lose the work inside it. */
function deleteCurrentProject(){
  const key=storageKey(workflow);
  const open=workflow.projectId?readProjects().find(p=>p.id===workflow.projectId):projectOfWorkflow(key,readProjects());
  if(open)deleteProject(open.id);
}
/** DELETING A PROJECT DELETES WHAT IS IN IT.
 *
 *  The practitioner, 2026-10-23: *"I deleted a project but it's workflow did not get deleted. I
 *  expect to have all workflows under that project deleted as well."*
 *
 *  It did not, deliberately, and said so twice -- the confirmation promised the workflows would
 *  stay and the toast said where they were. The reasoning was that a project is a grouping and
 *  deleting a grouping should not destroy what somebody made. The practitioner's expectation is
 *  the other reading, and it is theirs to settle: a project is the investigation, its workflows
 *  are the questions asked inside it, and deleting the investigation without its questions leaves
 *  a practitioner tidying twice and finding the second half in a list called "In no project".
 *
 *  So it now deletes them, and the confirmation says exactly what will go: how many workflows,
 *  what they weigh, and -- because this application can finally answer it -- whether a copy exists
 *  anywhere else. Deleting an unbacked-up project is destroying the only copy, and that sentence
 *  belongs in front of the decision rather than in a toast after it.
 *
 *  A worked example's workflow is never destroyed: it ships with the application, and Reset
 *  example is how its edits are discarded. */
function deleteProject(id:string){
  const project=readProjects().find(p=>p.id===id);
  if(!project)return;
  const saved=readSavedWorkflows();
  const raw=(()=>{try{return JSON.parse(localStorage.getItem(WORKSPACES)||'{}') as Record<string,unknown>;}
    catch{return {} as Record<string,unknown>;}})();
  const keys=project.workflows.filter(k=>!isExampleKey(k));
  const kept=project.workflows.filter(isExampleKey);
  const bytes=keys.reduce((n,k)=>{try{return n+JSON.stringify(raw[k]??'').length;}catch{return n;}},0);
  const held=keys.length;
  const safe=projectSafety(project)==='backed up'&&!exportPredatesWork(project);
  const sizeText=bytes>=1e6?`${(bytes/1e6).toFixed(1)} MB`
    :`${Math.max(1,Math.round(bytes/1024)).toLocaleString('en')} KB`;
  if(!confirm(`Delete the project "${project.name}" and `
    +`${held===1?'its 1 workflow':`all ${held} of its workflows`}?\n\n`
    +(held?`Their widgets, settings and anything saved with them -- ${sizeText} -- are removed from `
      +'this device, and this cannot be undone.':'It holds no workflows of its own.')
    +(kept.length?`\n\n${kept.length===1?'1 worked example stays':`${kept.length} worked examples stay`}`
      +': they ship with the application.':'')
    +(held&&!safe?'\n\nThis project is NOT BACKED UP, so this is the only copy. "Back up" writes one '
      +'first.':'')))return;
  for(const key of keys){
    try{delete raw[key];}catch{/* already gone */}
  }
  try{localStorage.setItem(WORKSPACES,JSON.stringify(raw));forgetSavedWorkflows();}
  catch{/* the project record is removed below either way, so nothing is left half-deleted */}
  forgetOrigins(keys);
  if(!writeProjects(readProjects().filter(p=>p.id!==project.id)))return;
  const openWasInIt=project.workflows.includes(storageKey(workflow));
  if(openWasInIt){
    workflow=blankWorkflow();
    selected=null;result=null;runWorkflow=null;activeOutputId=null;history=[];future=[];statuses={};
    dirty=true;save();renderLibrary();renderResults();
  }else if(workflow.projectId===project.id)change(w=>{delete w.projectId;},{spatial:false});
  renderProjectOptions();render();
  toast(`Project "${project.name}" deleted`
    +(held?` with ${held===1?'its workflow':`all ${held} workflows`}.`:'.')
    +(kept.length?' Its worked examples stay.':''));
}
/** A key no project holds and nothing is saved under.
 *
 *  It was `workflows.length + 1`, which mints a key the project ALREADY HOLDS as soon as one
 *  workflow has been removed -- w1, w2, w3 with w2 gone mints w3 again, and the new canvas
 *  overwrites the old one on its first save. */
function mintWorkflowKey(projectId:string,projects:readonly Project[]):string{
  const taken=new Set<string>([...projects.flatMap(p=>p.workflows),...Object.keys(readSavedWorkflows())]);
  for(let n=1;;n++){const key=`${projectId}/w${n}`;if(!taken.has(key))return key;}
}
/** A project key with no workflow saved under it.
 *
 *  Registering the key and saving the workflow are two writes, and the second one can be refused
 *  -- by a full store, which is exactly the device that reported this. The switcher then shows a
 *  row for a workflow that does not exist, labelled with the raw key because there is no name to
 *  read, and selecting it does nothing: `loadExample` finds nothing saved, the key is not an
 *  example, so the canvas stays where it was. Reported 2026-10-21: *"I also see some
 *  test-project/w* workflows in the list."* */
function ghostWorkflowKeys(projects:readonly Project[]=readProjects()):string[]{
  const saved=readSavedWorkflows(),open=storageKey(workflow);
  return [...new Set(projects.flatMap(p=>p.workflows))].filter(key=>key!==open&&!Object.hasOwn(saved,key));
}
/** Drop those rows, loudly. Nothing is lost: a key with nothing saved under it holds no work, and
 *  leaving it makes a project claim more workflows than it has. */
function pruneGhostWorkflows():number{
  const projects=readProjects(),ghosts=new Set(ghostWorkflowKeys(projects));
  if(!ghosts.size)return 0;
  if(!writeProjects(projects.map(p=>({...p,workflows:p.workflows.filter(k=>!ghosts.has(k))}))))return 0;
  return ghosts.size;
}
/** Open a newly minted workflow, and keep the project's registration only if the save is kept.
 *
 *  The registration used to stand whatever the save did, which is how a key with no workflow
 *  under it gets into a project in the first place. */
function adoptNewWorkflow(next:Workflow,key:string,projectId:string,refusal:string):boolean{
  const previous={workflow,selected,result,runWorkflow,activeOutputId,history,future,statuses};
  workflow=next;selected=null;result=null;runWorkflow=null;activeOutputId=null;history=[];future=[];statuses={};dirty=true;
  if(save()){renderProjectOptions();renderLibrary();renderResults();render();switchView('workflow');return true;}
  ({workflow,selected,result,runWorkflow,activeOutputId,history,future,statuses}=previous);
  writeProjects(readProjects().map(p=>p.id===projectId?{...p,workflows:p.workflows.filter(k=>k!==key)}:p));
  renderProjectOptions();render();
  toast(saveFailureMessage(refusal),{tone:'failure'});
  return false;
}
/** A new canvas inside this investigation, which is the gesture the model implies and the one
 *  nothing offered: adding a second question meant creating an unrelated canvas and then
 *  assigning it. */
function addWorkflowToProject(projectId?:string){
  if(busy)return;
  const id=projectId??(workflow.projectId||projectOfWorkflow(storageKey(workflow),readProjects())?.id);
  const project=id?readProjects().find(p=>p.id===id):undefined;
  if(!project){
    toast(BUILT_IN_PROJECTS.some(p=>p.id===id)
      ?'Built-in projects ship with the application. Create a project of your own to add workflows to it.'
      :'This canvas belongs to no project yet. Create one, or choose one under Project details.',{tone:'warning'});
    return;
  }
  save();
  const key=mintWorkflowKey(project.id,readProjects());
  const index=project.workflows.length+1;
  if(!writeProjects(readProjects().map(p=>p.id===project.id?{...p,workflows:[...p.workflows,key]}:p)))return;
  if(!adoptNewWorkflow({...blankWorkflow(),name:`${project.name} · question ${index}`,projectId:project.id,workflowKey:key,exampleId:undefined},
    key,project.id,'The new workflow could not be saved, so it was not created.'))return;
  toast(`A new workflow in "${project.name}". Name it for the question it answers.`);
}

/** THE METHOD, WITHOUT THE MATERIAL. The practitioner, 2026-10-21, with North Kivu built and Ituri
 *  to build: *"can the workflow be imported as a template to be filled up?"* Not exported and
 *  re-imported, which carries the records, the geometry, the decisions and the storage key of the
 *  workflow it came from -- the shape of the investigation, ready to be filled with another
 *  place's data. */
function addWorkflowFromTemplate(sourceKey:string){
  if(busy)return;
  const projects=readProjects();
  const id=workflow.projectId||projectOfWorkflow(storageKey(workflow),projects)?.id;
  const project=id?projects.find(p=>p.id===id):undefined;
  if(!project){toast('A template becomes a workflow in a project. Create one first.',{tone:'warning'});return;}
  const saved=readSavedWorkflows()[sourceKey];
  if(!saved){toast('That workflow could not be read from this device.',{tone:'failure'});return;}
  const sourceName=(saved as {name?:string}).name||'that workflow';
  save();
  // INTO THIS ONE, when this one is empty. The ask was *"can I import the North Kivu workflow
  // into this blank one?"* -- said while sitting on a blank canvas named for the next province.
  // Always minting a workflow answered a question nobody asked: it left that canvas untouched and
  // empty beside a third workflow carrying the source's name, which is how a project ends up
  // holding rows its owner did not want and cannot remove. Reported 2026-10-21.
  const fillOpen=!workflow.nodes.length&&!!storageKey(workflow)&&!isExampleKey(storageKey(workflow));
  const key=fillOpen?storageKey(workflow):mintWorkflowKey(project.id,readProjects());
  const name=fillOpen?workflow.name||sourceName:`${sourceName} · template`;
  if(!fillOpen&&!writeProjects(readProjects().map(p=>p.id===project.id?{...p,workflows:[...p.workflows,key]}:p)))return;
  let report;
  // The RESULT is validated, not only the source. It was the source alone, so a template whose
  // clearing left a workflow the application refuses to open was saved all the same, and the row
  // it created could not be loaded -- or, because deleting needed loading, removed.
  try{
    report=templateFrom(validateWorkflow(structuredClone(saved)),{name,projectId:project.id,workflowKey:key});
    report={...report,workflow:validateWorkflow(report.workflow)};
  }
  catch(error){toast(`A template of "${sourceName}" could not be made: ${errorMessage(error)}`,{tone:'failure'});return;}
  if(fillOpen){
    const previous=structuredClone(workflow);
    workflow=report.workflow;
    selected=null;result=null;runWorkflow=null;activeOutputId=null;history=[previous];future=[];statuses={};dirty=true;
    if(!save()){workflow=previous;history=[];render();toast(saveFailureMessage('The template could not be saved, so this canvas is unchanged.'),{tone:'failure'});return;}
    renderProjectOptions();renderLibrary();renderResults();render();switchView('workflow');
  }
  else if(!adoptNewWorkflow(report.workflow,key,project.id,'The template could not be saved, so no workflow was created.'))return;
  const cleared=report.cleared.reduce((n,c)=>n+c.keys.length,0);
  // What it cleared, counted, because a template that silently emptied something is worse than
  // one that says so: the practitioner is about to fill exactly these.
  toast(`${fillOpen?`This canvas now holds the method of "${sourceName}"`:`A template of "${sourceName}"`}: the widgets and their `
    +`settings, with ${cleared} acquired ${cleared===1?'input':'inputs'} cleared across `
    +`${report.cleared.length} ${report.cleared.length===1?'widget':'widgets'}. `
    +`The study area is chosen again; the sources are already set.`,{tone:'notice'});
}
/** Remove this workflow from this device.
 *
 *  Reported 2026-10-21: *"Now I have a bunch of workflows I do not need. We do not have a way to
 *  delete workflows."* A project could be deleted and a workflow could not, so the only way to
 *  lose one was to delete the investigation around it -- which keeps every workflow and removes
 *  only the grouping, the opposite of what was wanted.
 *
 *  A worked example is not deletable: it ships with the application and Reset example is the
 *  control for it. Everything else goes with its saved entry and its project registration, and
 *  the next workflow of the same project is opened, or an empty canvas when there is none. */
function deleteCurrentWorkflow(){deleteWorkflow(storageKey(workflow));}
/** Deleting takes a KEY, not the open canvas, because the workflow most worth deleting is the one
 *  that will not open: *"The Health Facilities North Kivu · template workflow won't load so can't
 *  be deleted"*, 2026-10-21. A delete that works only on what is loaded cannot reach it. */
function deleteWorkflow(key:string){
  if(busy)return;
  // A SHAPE TEST STANDING IN FOR A MEMBERSHIP TEST, which is the third time this pair of controls
  // has disagreed about what "example" means. `isExampleKey` asks whether a key has no slash --
  // true of EVERY unfiled workflow -- where the question is whether this is one of the examples
  // that ship. `renderProjectOptions` already decides the row's button with EXAMPLE_KEYS.includes(key),
  // so the two disagreed: the Delete button rendered live and this refused the click.
  //
  // The practitioner, 2026-10-25, on an unfiled "Snow · South London, deaths per 1,000 people"
  // carrying three widgets: *"I still could not delete the South London example"*. Its key is
  // `snow-south-london-1854`, from a bundle published before that exampleId was removed, and
  // `exampleKey` passes through anything beginning `snow-`. Slash-less, so the shape test called
  // it shipped; absent from EXAMPLE_KEYS, so it never was.
  if(EXAMPLE_KEYS.includes(key)){
    toast('A worked example ships with the application and stays. Use "Reset example" to discard your edits to it.',{tone:'warning'});
    return;
  }
  const open=key===storageKey(workflow);
  const name=(open?workflow.name:(readSavedWorkflows()[key] as {name?:string}|undefined)?.name)||workflowTitle(key);
  if(!confirm(`Delete the workflow "${name}"? Its widgets, settings and anything saved with it are removed from this device, and this cannot be undone. Export it first if you want to keep it.`))return;
  const projects=readProjects(),owner=projects.find(p=>p.workflows.includes(key));
  if(owner&&!writeProjects(projects.map(p=>p.id===owner.id?{...p,workflows:p.workflows.filter(k=>k!==key)}:p)))return;
  try{
    const store=JSON.parse(localStorage.getItem(WORKSPACES)||'{}');
    delete store[key];
    localStorage.setItem(WORKSPACES,JSON.stringify(store));
    forgetSavedWorkflows();
  }catch{/* the registration is already gone, so the row is gone; a stale entry is unreachable */}
  // The key is minted per device and never reissued, so an origin left behind would refer to a
  // workflow that cannot come back.
  forgetOrigins([key]);
  // Deleting a row that is not the open canvas leaves the canvas alone: the practitioner is
  // tidying a list, not navigating.
  if(!open){renderProjectOptions();render();toast(`Workflow "${name}" deleted.`);return;}
  // Not loadExample for the fallback: that saves the canvas it is leaving, which would write this
  // workflow straight back under the key just deleted.
  const saved=readSavedWorkflows();
  const next=owner?.workflows.find(k=>k!==key&&Object.hasOwn(saved,k));
  if(next){workflow=blankWorkflow();loadExample(next);}
  else{
    workflow={...blankWorkflow(),...(owner?{name:`${owner.name} · first question`,projectId:owner.id,workflowKey:mintWorkflowKey(owner.id,readProjects())}:{})};
    if(owner)writeProjects(readProjects().map(p=>p.id===owner.id?{...p,workflows:[...p.workflows,storageKey(workflow)]}:p));
    selected=null;result=null;runWorkflow=null;activeOutputId=null;history=[];future=[];statuses={};dirty=true;
    save();renderProjectOptions();renderLibrary();renderResults();render();switchView('workflow');
  }
  toast(`Workflow "${name}" deleted.`);
}
/** HOW FULL THE STORE IS, before a save is refused rather than after.
 *
 *  The practitioner, 2026-10-21, having just been refused a study area: *"I think we need a storage
 *  status indicator to also tell us to off load projects from the browser (export) if needed."*
 *  Everything a workflow holds sits in `localStorage`, which this device accepts 5.2 MB of, and
 *  nothing said how much was left -- so the first news of the ceiling was work that would not
 *  save. See experiment 121 for why the ceiling is this one and what would move it. */
function storageUsedBytes():number{
  let total=0;
  try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key===null)continue;total+=key.length+(localStorage.getItem(key)?.length??0);}}
  catch{return 0;}
  return total;
}
const STORAGE_TIGHT=0.75,STORAGE_FULL=0.9;
/** THE OTHER STORE. The workspace store is the one that refuses a save, and it is not where the
 *  bytes are: a node's `data` is kept by digest in IndexedDB, which this device offers by the
 *  gigabyte, so a figure covering only `localStorage` can read "1.2 of 5.2 MB" beside 400 MB of
 *  street networks. Asked by the practitioner on 2026-10-21 -- *"That's for local storage, what
 *  about IndexedDB?"* -- of an indicator that had just been built measuring one store.
 *
 *  Two different quantities, reported as two:
 *  - what the PAYLOADS this session holds come to, which is this application's own data;
 *  - what the BROWSER says this site occupies and may occupy, from `navigator.storage.estimate()`.
 *    That figure is the whole origin -- IndexedDB, the Cache Storage holding the offline
 *    application, and `localStorage` -- so it is labelled as the site's total and never as the
 *    payload store alone. The estimate is also just that: browsers pad and round it. */
const payloadStoreBytes=():number=>{
  let total=0;
  for(const payload of Object.values(cachedPayloads()))total+=payloadBytes(payload);
  return total;
};
const payloadCount=():number=>Object.keys(cachedPayloads()).length;
/** FILING A WORKFLOW IS AN ACT, NOT A SIDE EFFECT OF A DROPDOWN.
 *
 *  The practitioner, 2026-10-23, having tried it: *"if I select the project-less workflow and
 *  select the project from the project drop down, it does nothing, only loads an empty workflow.
 *  That assign workflow to a project should be explicit."* And then: *"That assign to project
 *  inside the project dropdown is as good as it does not exist as it's not easily located."*
 *
 *  Both are right, and the second is the diagnosis. There were two selects that looked alike and
 *  did opposite things: the visible **Project** dropdown NAVIGATES -- it loads that project's
 *  first workflow and replaces the canvas -- and `#assign-project`, labelled "Belongs to" inside
 *  a collapsed `Project details` disclosure, is the one that files. A practitioner who wants to
 *  file their work presses the visible one and is moved off it. That is worse than a capability
 *  with no door, which is what the backup was this morning: it is two doors side by side where
 *  the visible one discards what you were doing.
 *
 *  So the act is named, and it is where 131 put creation and deletion -- the Project view -- with
 *  the workflow's name in it, so there is no doubt about what is being filed. `#assign-project`
 *  stays where it is: it still works, and removing a control a practitioner may have learned is a
 *  separate decision from adding the one they looked for. */
function renderUnfiled():void{
  const panel=$('#project-unfiled');
  const key=storageKey(workflow);
  const stored=readProjects();
  const filed=stored.some(p=>p.workflows.includes(key))
    ||BUILT_IN_PROJECTS.some(p=>p.workflows.includes(key));
  // A worked example is already filed under the project it ships in, so it is not offered. An
  // empty canvas still is: this tab is where filing lives, and a practitioner who opens it with
  // nothing selected needs the way forward, not a blank panel. The first version also hid it
  // when there were no projects AND no widgets, which is every fresh canvas -- the one case where
  // somebody is most likely to be looking for how to start.
  panel.hidden=filed;
  if(panel.hidden)return;
  $('#project-unfiled-name').textContent=workflow.name||WORKFLOW_LABELS[key]||key;
  const select=$('#project-file-under');
  select.innerHTML=stored.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  select.disabled=!stored.length;
  $('#project-file').disabled=!stored.length;
  if(!stored.length)select.innerHTML='<option value="">No projects yet</option>';
}
// IMPORT LANDS HERE, because the Project tab is where a project is managed and importing one is
// the other half of exporting it. It reuses the same file control the header's Import uses: a
// project document and a workflow document arrive through one input, so a practitioner handed a
// file does not have to know which of two buttons made it.
$('#project-import').onclick=()=>$('#workflow-file').click();
$('#project-new').onclick=openProjectDialog;
$('#project-file').onclick=()=>{
  const id=$('#project-file-under').value;
  if(!id)return;
  assignCurrentWorkflow(id);
  renderProjectView();
};
$('#project-file-new').onclick=()=>{
  // The same dialog, arriving with the question already answered: this workflow is what the
  // project is being made for.
  openProjectDialog();
  $('#project-adopt-current').checked=true;
};

/** THE PROJECT VIEW: one project and the workflows filed under it.
 *
 *  Experiment 131, after a day the practitioner spent unable to find their own backup: *"Our UI
 *  has become confusing to navigate... how should the UI represent project and workflow
 *  lifecycles."* Asked what they work in, the answer was both, at different times -- setting up
 *  and reviewing is project work, analysis is workflow work -- so there are two places and this
 *  is the first one.
 *
 *  A ROUTE, NOT A DIALOG, which the experiment made a precondition: the project level lived
 *  behind a storage readout that had to be recognised as a button, and that is why the backup
 *  could not be found. A dialog here would inherit the problem it exists to end.
 *
 *  NO PROGRESS COLUMN. Draft, Run and Stale are known for the workflow that is OPEN and for no
 *  other: a saved document carries its name, nodes, edges and manifest, and nothing records that
 *  it ran. The practitioner, asked to choose: *"Project does not ship with a project column, only
 *  workflow and widget count."* So this counts what is there and claims nothing about what was
 *  done to it -- the same refusal as the timestamps that reordered this plan, where a column
 *  would have been a label over facts the application does not keep.
 */
/** WHAT THIS DEVICE IS HOLDING, in the tab that asks what a project holds.
 *
 *  Recovered on 2026-10-23 from inside `renderProjectsList`, which was deleted with the dialog it
 *  rendered. Deleting the door deleted the room: the meter kept its element and lost the code that
 *  filled it, and the tab showed an empty section rather than an error. Found by a test asserting
 *  it was visible, which an empty div is not.
 *
 *  TWO STORES, TWO LINES. The workspace store is small and fills with workflows; the large store
 *  is where a download's records are kept by digest, and the two are not interchangeable. */
function renderProjectStorage():void{
  const used=storageUsedBytes(),share=used/STORAGE_QUOTA_BYTES;
  const tone=share>=STORAGE_FULL?'full':share>=STORAGE_TIGHT?'tight':'';
  const mb=(value:number)=>(value/1e6).toFixed(1);
  const size=(value:number)=>value<1e6?`${Math.max(1,Math.round(value/1024)).toLocaleString('en')} KB`:`${mb(value)} MB`;
  const held=payloadStoreBytes(),payloads=payloadCount();
  const large=payloadStoreKind()==='indexeddb';
  $('#storage-meter').innerHTML=
    `<h3>Workspace store · workflows and their settings</h3>`
    +`<div class="storage-bar ${tone}"><i style="width:${Math.round(share*100)}%"></i></div>`
    +`<p class="muted">${size(used)} of ${mb(STORAGE_QUOTA_BYTES)} MB used, each workflow written twice per save.${
      share>=STORAGE_TIGHT?' <strong>Export what you want to keep and delete the rest.</strong>':''}</p>`
    +`<h3>Data store · what a download brought back</h3>`
    +`<p class="muted">${payloads?`${payloads.toLocaleString('en')} ${payloads===1?'payload':'payloads'}, ${size(held)}`:'Nothing held'}, `
    +`in ${large?'IndexedDB':'the small store — a download will be refused'}.</p>`
    +(()=>{const loose=unreferencedPayloads();
      return loose.digests.length
        ?`<p class="notice">${loose.digests.length.toLocaleString('en')}, ${size(loose.bytes)}, referred to by no workflow. `
          +`<button class="button small" id="drop-unreferenced">Remove ${size(loose.bytes)}</button></p>`
        :'';})()
    +(siteEstimate
      ?`<p class="muted">The browser reports this site using ${size(siteEstimate.usage)} of about `
        +`${(siteEstimate.quota/1e9).toFixed(1)} GB it may use — its own rounded accounting, which need `
        +`not agree with the figures above.</p>`
      :`<p class="muted">This browser does not report a storage estimate, so how much room remains for the data store is unknown here.</p>`)
    +`<p class="muted">${esc(persistenceNote())}</p>`;
}

/** WORKFLOWS THAT BELONG TO NO INVESTIGATION, which is where a deleted project leaves its own.
 *
 *  The practitioner, 2026-10-23: *"I deleted Raster Project but the workflow persisted."* It did,
 *  by design and announced twice -- the confirmation says the workflows stay and can still be
 *  opened, and the toast says they are here, in no project. Keeping work that somebody made is
 *  the right default; a project is a grouping, not a container whose deletion destroys its
 *  contents.
 *
 *  What was wrong is that the consolidation an hour earlier deleted the only place they were
 *  visible. The projects dialog had an "In no project" block; removing the dialog removed it, so
 *  a workflow survived its project into an interface with nowhere to show it. The announcement
 *  was true and unverifiable, which is worse than either.
 */
function renderUnfiledList(saved:Record<string,unknown>,current:string):void{
  const section=$('#project-unfiled-list');
  const filed=new Set(allProjects().flatMap(p=>p.workflows));
  const unfiled=Object.keys(saved).filter(k=>!filed.has(k));
  section.hidden=!unfiled.length;
  if(section.hidden)return;
  const rows=$('#project-unfiled-rows');
  rows.innerHTML='';
  for(const key of unfiled){
    const row=document.createElement('div');row.className='project-view-row';
    const name=document.createElement('span');
    name.textContent=((saved[key] as {name?:string})?.name||workflowTitle(key))
      +(key===current?' \u00b7 open':'');
    const count=document.createElement('span');count.className='muted';
    const nodes=((saved[key] as {nodes?:unknown[]})?.nodes??[]).length;
    count.textContent=nodes===1?'1 widget':`${nodes} widgets`;
    const open=document.createElement('button');
    open.className='button small';open.dataset.openWorkflow=key;open.textContent='Open';
    open.disabled=key===current;
    const remove=document.createElement('button');
    remove.className='button small danger';remove.dataset.deleteWorkflow=key;remove.textContent='Delete';
    row.append(name,count,open,remove);rows.append(row);
  }
}

/** THE CATALOG OF WORKED EXAMPLES, which `widgets/examples.json` has described since 2026-10-23
 *  with nothing reading it. The practitioner, 2026-10-24, asked how to load South London and
 *  whether it was in a manifest: it was pinned -- commit, per-file digests, licence -- and
 *  `src/example-catalog.ts` was imported by nothing, so it was not built and its three tests
 *  skipped saying exactly that. A trust root with nothing standing on it.
 *
 *  It lives in the PROJECT TAB because opening a worked example is importing a project, and this
 *  tab is where the practitioner consolidated projects: *"I need one location to select
 *  projects... view project info, manage a project and its workflows, and to import projects,
 *  export projects, this is the Projects tab."* The header's Catalog button is the WIDGET
 *  catalog; putting examples there would overload one word across two different things.
 *
 *  FETCHABLE IS NOT AVAILABLE, and the governance in the catalog requires the interface to say
 *  which: an example not yet fetched is a repository on somebody else's server, and one fetched
 *  is a workflow on this device that opens offline. */
const FETCHED_EXAMPLES='fieldwork-fetched-examples-v1';
const fetchedExamples=():string[]=>{
  try{const raw=localStorage.getItem(FETCHED_EXAMPLES);return raw?JSON.parse(raw) as string[]:[];}
  catch{return [];}
};
const rememberFetched=(id:string)=>{
  try{const all=new Set(fetchedExamples());all.add(id);
    localStorage.setItem(FETCHED_EXAMPLES,JSON.stringify([...all]));}catch{/* a refusal here costs the badge, not the example */}
};
/** WHERE AN IMPORTED WORKFLOW CAME FROM, so that RESET EXAMPLE means something for it.
 *
 *  The practitioner, 2026-10-24: *"Imported examples should also be resettable."* They were not.
 *  Reset reloaded `template(key)` -- a workflow compiled into the application -- and an imported
 *  example has no template, so the control hid itself and an edit had no way back.
 *
 *  The import MINTS A FRESH KEY, and that is the whole difficulty: minting is what makes the
 *  workflow the practitioner's own and deletable, and it is also what severs it from the document
 *  it was read from. So record the severed end. The digest is the catalog's pinned one, which is
 *  also the payload-store key the verified bytes are kept under, so a reset reads the same bytes
 *  that were verified at import and goes back to the network only if the cache has lost them. */
interface ExampleOrigin {exampleId:string; path:string; sha256:string; index:number}
const EXAMPLE_ORIGINS='fieldwork-example-origins-v1';
const exampleOrigins=():Record<string,ExampleOrigin>=>{
  try{const raw=localStorage.getItem(EXAMPLE_ORIGINS);return raw?JSON.parse(raw) as Record<string,ExampleOrigin>:{};}
  catch{return {};}
};
const originOf=(key:string):ExampleOrigin|undefined=>exampleOrigins()[key];
const rememberOrigins=(added:Record<string,ExampleOrigin>):void=>{
  try{localStorage.setItem(EXAMPLE_ORIGINS,JSON.stringify({...exampleOrigins(),...added}));}
  catch{/* a refusal here costs the reset, not the import */}
};
/** Forget the keys a delete has removed, so the map does not grow for the life of the device. */
const forgetOrigins=(keys:string[]):void=>{
  const all=exampleOrigins();
  const kept=Object.fromEntries(Object.entries(all).filter(([key])=>!keys.includes(key)));
  if(Object.keys(kept).length===Object.keys(all).length)return;
  try{localStorage.setItem(EXAMPLE_ORIGINS,JSON.stringify(kept));}catch{/* as above */}
};
/** What the example carries, in the practitioner's terms rather than the schema's. */
const carriedBy=(e:CatalogExample):string=>{
  const has=[e.carries.workflow&&'a workflow',e.carries.data&&'data',e.carries.geography&&'geography']
    .filter(Boolean) as string[];
  return has.length?has.join(', '):'nothing yet';
};
function renderExampleCatalog():void{
  const host=optionalElement('#project-examples-list');
  if(!host)return;
  const fetched=new Set(fetchedExamples());
  const examples=curatedExamples();
  host.innerHTML=examples.map(e=>{
    const bytes=e.files.reduce((n,f)=>n+f.bytes,0);
    const state=fetched.has(e.id)
      ?'<span class="pill">Fetched on this device</span>'
      :'<span class="pill muted">Not fetched yet</span>';
    return `<article class="project-row"><h4>${esc(e.title)} ${state}</h4>`
      +`<p class="muted">${esc(e.description)}</p>`
      +`<p class="muted">Carries ${esc(carriedBy(e))} \u00b7 ${e.files.length} files, `
      +`${(bytes/1024).toFixed(0)} KB \u00b7 ${esc(e.licence.data)}</p>`
      +(e.notYet?`<p class="muted">Not yet: ${esc(e.notYet)}</p>`:'')
      +`<p class="muted">${esc(e.repository)} at ${esc(e.commit.slice(0,10))}</p>`
      +`<div class="inspector-actions">`
      +(e.carries.workflow
        ?`<button class="button small" data-open-example="${esc(e.id)}">${fetched.has(e.id)?'Fetch again and open':'Fetch and open'}</button>`
        :`<span class="muted">No workflow to open yet.</span>`)
      +`</div><p class="muted" data-example-status="${esc(e.id)}"></p></article>`;
  }).join('')||'<p class="muted">No worked examples are curated yet.</p>';
  host.querySelectorAll<HTMLButtonElement>('[data-open-example]').forEach(button=>{
    button.onclick=()=>void openCuratedExample(required(button.dataset.openExample),button);
  });
}
/** Fetched only on this click, verified before it is used, and refused rather than half-loaded.
 *
 *  `verifiedFile` does the refusing: a path the catalog does not pin is never requested, a size
 *  that disagrees is refused before hashing, and a digest mismatch discards the bytes. Nothing
 *  here softens any of that into a warning. */
async function openCuratedExample(id:string,button:HTMLButtonElement):Promise<void>{
  const example=curatedExamples().find(e=>e.id===id);
  if(!example)return;
  // RE-QUERIED EVERY TIME, never held. Importing a workflow re-renders the project view, which
  // replaces this paragraph -- a reference captured before the import is writing to a node that
  // is no longer on the page, so the message the practitioner most needs (the digest matched, or
  // did not) is the one that silently goes nowhere.
  const say=(message:string)=>{
    const at=optionalElement(`[data-example-status="${CSS.escape(id)}"]`);
    if(at)at.textContent=message;
  };
  const label=button.textContent||'Fetch and open';
  button.disabled=true;button.textContent='Fetching\u2026';
  try{
    // A PROJECT FIRST, A LONE WORKFLOW ONLY IF THERE IS NO PROJECT.
    //
    // The practitioner, 2026-10-24: *"when we import South London, we import a project and its
    // workflows. Right now it just one workflow."* It was, and it landed under "-- No project --"
    // because that is what the file said it was. An investigation is a project, its questions are
    // its workflows, and the import control already knew how to read one.
    const projectFile=example.files.find(f=>/fieldwork-project.*\.json(\.gz)?$/.test(f.path));
    const workflowFile=projectFile
      ??example.files.find(f=>/fieldwork-workflow.*\.json(\.gz)?$/.test(f.path));
    if(!workflowFile)throw new Error('This example pins no project or workflow document, so there is nothing to open.');
    say(`Fetching ${workflowFile.path} from ${example.repository}\u2026`);
    const bytes=await verifiedFile(example,workflowFile.path);
    say('Verified against the pinned digest \u00b7 reading\u2026');
    const text=await readMaybeGzipped(new Blob([bytes as BlobPart]));
    const parsed=JSON.parse(text) as {schema?:string};
    let opened:string;
    if(parsed?.schema===PROJECT_DOCUMENT_SCHEMA){
      const keys=await importProjectDocument(parsed);
      // Written AFTER the import, because an import that refuses leaves nothing to reset to.
      await putPayload(workflowFile.sha256,parsed);
      rememberOrigins(Object.fromEntries(keys.map((key,index)=>
        [key,{exampleId:example.id,path:workflowFile.path,sha256:workflowFile.sha256,index}])));
      // The import opens the workflow and draws the bar BEFORE the origin exists, so the bar was
      // drawn for a workflow with no way back and RESET EXAMPLE stayed hidden until something
      // else happened to redraw it. Draw it again now that the origin is recorded.
      renderProjectOptions();
      opened=example.title;
    }
    else {const next=validateWorkflow(parsed);applyImportedWorkflow(next);opened=next.name;}
    rememberFetched(example.id);
    toast(`${example.title} opened. It is on this device now and opens offline.`);
    // The badge first, then the message, because re-rendering replaces the paragraph.
    renderExampleCatalog();
    say(`Opened ${opened} \u00b7 ${workflowFile.bytes.toLocaleString()} bytes, digest matched`);
  }catch(error){
    // The example stays unfetched rather than partly loaded, and the reason is the one the
    // verification gave -- a digest mismatch says so, rather than becoming "could not load".
    say(errorMessage(error));
    toast(errorMessage(error),{tone:'failure'});
  }finally{button.disabled=false;button.textContent=label;}
}
function renderProjectView():void{
  renderUnfiled();
  renderExampleCatalog();
  // The storage figures moved here from the dialog behind the pill: this is where a practitioner
  // asks what a project holds, so it is where the answer belongs.
  renderProjectStorage();
  void refreshSiteEstimate().then(()=>{if(currentView==='project')renderProjectStorage();});
  void requestPersistence().then(()=>{if(currentView==='project')renderProjectStorage();});
  renderUnfiledList(readSavedWorkflows(),storageKey(workflow));
  const list=$('#project-view-list');
  // EVERY PROJECT, NOT ONLY THE STORED ONES. The first version listed `readProjects()`, which is
  // the stored ones, because the header's safety state is said only for those -- a built-in has no
  // stored record, so `exportedAt` can never be written for it. That reasoning is right about the
  // STATE and was wrong about the VIEW. The practitioner, on the Project tab of a canvas whose
  // own breadcrumb read "1854 Cholera Outbreak in London" and whose selector read "4 workflows":
  // *"This is the Projects tab, really nothing to see."* It said "No projects yet" over a project
  // the rest of the interface was naming, which is worse than empty.
  //
  // So the view answers "what do I have", for which a worked example counts, and claims a backup
  // state only where there is one to claim. Two different questions, and only the second is about
  // storage.
  // THE PROJECT THAT IS SELECTED, not every project on the device. The practitioner, 2026-10-23:
  // *"In the project tab, I should only see the workflows for project that's selected from top
  // left drop down for projects."* The first version listed all eight, which is the projects
  // DIALOG rendered in a tab -- the same contents in a new place, which is how twelve surfaces
  // happened. One dropdown selects, this tab shows what was selected.
  const stored=readProjects();
  const storedIds=new Set(stored.map(p=>p.id));
  const key=storageKey(workflow);
  const selectedProject=allProjects().find(p=>p.id===(workflow.projectId
    ??projectOfWorkflow(key,allProjects())?.id));
  const projects=selectedProject?[selectedProject]:[];
  const saved=readSavedWorkflows();
  const current=storageKey(workflow);
  // ZERO IS NOT THE SAME AS NOT YET OPENED. This counted `saved[key]`, which is what is stored on
  // this device, so every worked example nobody has opened read "0 widgets" -- "4 workflows · 0
  // widgets" against the John Snow project, whose four workflows are full of them. The count was
  // true about storage and false about the project, which is the worse kind of true.
  //
  // Counting the published template instead would be accurate and would build up to a dozen
  // example workflows on a tab switch, some of them data-bearing, so the honest cheap answer is
  // to say which question is being answered rather than to answer the wrong one with a number.
  // WHAT EACH WORKFLOW COSTS, which is the other half of what the practitioner asked this tab to
  // answer: *"This could be also where I view assets in storage per workflow in that project."*
  // Recovered from the dialog, where it was the only place a per-workflow size was ever shown.
  const raw=(()=>{try{return JSON.parse(localStorage.getItem(WORKSPACES)||'{}') as Record<string,unknown>;}
    catch{return {} as Record<string,unknown>;}})();
  const storedBytes=(k:string)=>{try{return JSON.stringify(raw[k]??'').length;}catch{return 0;}};
  const kb=(value:number)=>value>=1e6?`${(value/1e6).toFixed(1)} MB`
    :`${Math.max(1,Math.round(value/1024)).toLocaleString('en')} KB`;
  const held=(key:string):number|null=>key===current?workflow.nodes.length
    :key in saved?((saved[key] as {nodes?:unknown[]})?.nodes??[]).length:null;
  const widgetText=(count:number|null):string=>count===null?'not opened on this device'
    :count===1?'1 widget':`${count} widgets`;
  $('#project-view-title').textContent=selectedProject?selectedProject.name:'No project selected';
  $('#project-view-subtitle').textContent=selectedProject
    ?'What this project holds, and whether a copy of it exists anywhere else.'
    :'Choose one from the Project list at the top left, or file the workflow you have open under a new one.';
  $('#project-view-count').textContent=selectedProject
    ?String(selectedProject.workflows.length):'';
  if(!projects.length){list.innerHTML='';return;}
  list.innerHTML='';
  for(const project of projects){
    const tracked=storedIds.has(project.id);
    const safe=projectSafety(project)==='backed up'&&!exportPredatesWork(project);
    const section=document.createElement('section');
    section.className='project-view-block';
    section.dataset.project=project.id;
    const heading=document.createElement('h3');heading.textContent=project.name;
    const state=document.createElement('span');
    state.className='project-view-state';
    // A worked example ships with the application and is restored by Reset example, so "Not backed
    // up" would be a warning no action could clear -- the same trap the header fell into first.
    state.dataset.safety=!tracked?'built-in':safe?'backed-up':'at-risk';
    state.textContent=!tracked?'Ships with the application'
      :safe?'Backed up':exportPredatesWork(project)?'Backed up \u00b7 changed since':'Not backed up';
    heading.append(' ',state);
    const counts=document.createElement('p');counts.className='muted';
    const counted=project.workflows.map(held).filter((n):n is number=>n!==null);
    const nodes=counted.reduce((n,x)=>n+x,0);
    const unopened=project.workflows.length-counted.length;
    counts.textContent=`${esc(project.subject||'No subject.')} \u00b7 `
      +`${project.workflows.length===1?'1 workflow':`${project.workflows.length} workflows`} \u00b7 `
      +(counted.length?`${nodes===1?'1 widget':`${nodes} widgets`}`:'none opened on this device')
      +(counted.length&&unopened?` \u00b7 ${unopened} not opened yet`:'');
    section.append(heading,counts);
    const actions=document.createElement('p');actions.className='project-view-actions';
    if(tracked){
      const backup=document.createElement('button');
      // Same class: exportProject opens with the same guard, and this button is rebuilt by
      // render() on every state change, so it carries the state rather than being set once.
      backup.className='button small';backup.dataset.exportProject=project.id;backup.disabled=busy;
      backup.textContent='\u2193 Back up';
      const remove=document.createElement('button');
      remove.className='button small danger';remove.dataset.deleteProject=project.id;
      remove.textContent='Delete project';
      actions.append(backup,remove);
    }else{
      // Its workflows can still be backed up one at a time; the PROJECT cannot, because the
      // dialog's project export renders only for a project that can be deleted.
      const note=document.createElement('span');note.className='muted';
      note.textContent='A worked example. Back up any of its workflows from Back up, or file your '
        +'own copies under a new project.';
      actions.append(note);
    }
    section.append(actions);
    for(const key of project.workflows){
      const row=document.createElement('div');row.className='project-view-row';
      const name=document.createElement('span');
      // THE WORKFLOW'S NAME, not its storage key. These rows read "kivu/w1" until 2026-10-23: the
      // dialog they replaced took the name off the saved document and fell back to a title, and
      // the replacement used the key as its fallback for a project workflow, which has no entry
      // in WORKFLOW_LABELS -- so every workflow a practitioner made was listed by an identifier
      // they never chose.
      name.textContent=((saved[key] as {name?:string}|undefined)?.name
        ||(key===current?workflow.name:'')||workflowTitle(key))
        +(key===current?' \u00b7 open':'');
      const count=document.createElement('span');count.className='muted';
      // THE PRACTITIONER'S OWN QUESTION, 2026-10-23: *"And I want to know if the data are stored
      // with the project."* `exportProject` already knew -- it says so in a toast after the file
      // is written, which is the moment it is least useful -- and `unbundledReferences` is the
      // measure it uses: a node holding a `dataRef` and no inline `data` is a download kept on
      // this device by reference, so whoever opens the export downloads it again.
      const document_=key===current?workflow:saved[key] as Workflow|undefined;
      const byReference=document_?unbundledReferences([document_]):0;
      const inStore=key in raw;
      count.textContent=widgetText(held(key))
        +(inStore?` \u00b7 ${kb(storedBytes(key))}`:'')
        +(byReference?` \u00b7 ${byReference} ${byReference===1?'dataset':'datasets'} by reference, not in an export`:'');
      const open=document.createElement('button');
      open.className='button small';open.dataset.openWorkflow=key;open.textContent='Open';
      open.disabled=key===current;
      const remove=document.createElement('button');
      remove.className='button small danger';remove.dataset.deleteWorkflow=key;
      remove.textContent='Delete';
      remove.disabled=!(key in raw);   // nothing saved under it, so there is nothing to delete
      row.append(name,count,open,remove);section.append(row);
    }
    list.append(section);
  }
}

/** WHAT THIS PROJECT HOLDS RIGHT NOW, so `unexportedWork` can say what a lost browser would cost.
 *
 *  Counted from the saved workflows the project lists plus the open canvas, which may not be
 *  saved yet and is the work most likely to be lost. Bytes are the payloads those workflows
 *  refer to -- the street networks and raster windows -- which is where the weight of a project
 *  actually is: a canvas of forty widgets is kilobytes beside one downloaded province. */
function projectWork(project:Project):ProjectWork{
  const saved=readSavedWorkflows();
  const current=storageKey(workflow);
  const referenced=new Set<string>();
  let nodes=0;
  const walk=(w:unknown)=>{
    for(const node of ((w as {nodes?:unknown[]})?.nodes??[])){
      nodes++;
      const ref=(node as {params?:{dataRef?:unknown}})?.params?.dataRef;
      if(typeof ref==='string')referenced.add(ref);
    }
  };
  for(const key of project.workflows){
    // The OPEN canvas rather than its saved copy, where they are the same workflow: unsaved work
    // is the work most likely to be lost, so counting the stored version would understate it.
    if(key===current){walk(workflow);continue;}
    const document=saved[key];
    if(document)walk(document);
  }
  const held=cachedPayloads();
  let bytes=0;
  for(const digest of referenced)if(held[digest])bytes+=payloadBytes(held[digest]);
  return {workflows:project.workflows.length,nodes,bytes};
}

/** THE STATE THE PRACTITIONER COULD NOT FIND, said where they already look.
 *
 *  `#save-status` has said "Saved on this device" on every successful save since this application
 *  had one. It is true and it answers the wrong question: it is about this browser, and the
 *  practitioner who could not find their backup was asking whether a copy existed anywhere else.
 *  The same string is the one this file already warns about elsewhere -- a degraded store "turns
 *  a 10 GB ceiling back into a 5 MB one while the application goes on saying Saved on this
 *  device".
 *
 *  So it now says both: where the work is, and whether a copy of it exists. And it is a control
 *  rather than a label, because experiment 131's test is not whether the state can be displayed
 *  but whether the backup can be REACHED from a cold start without being told where it is.
 *  A capability behind a door nobody can see is the failure this whole experiment is about. */
function renderProjectSafety():void{
  const element=$('#save-status');
  const store=payloadStoreKind()==='indexeddb'?'Saved on this device':'Saved on this device \u2014 small store only';
  // STORED PROJECTS ONLY, and the reason is that the state must be satisfiable. A built-in
  // worked example has no stored record, so `touchProject` returns early and `exportedAt` can
  // never be written for it; the dialog has no project export for it either, because that
  // control renders only for a project that can be deleted. Saying "Not backed up" there would
  // be a warning no action could clear -- the door opening onto a room without the capability,
  // which is the same failure as the capability without a door that this experiment began with.
  // Found by writing the test: the status rendered on the Old Naledi example and its own route
  // offered workflow exports only, none of which marks a project as backed up.
  const stored=readProjects();
  const project=stored.find(p=>p.id===(workflow.projectId
    ??projectOfWorkflow(storageKey(workflow),stored)?.id));
  if(!project||!project.workflows.length){element.textContent=store;return;}
  const risk=unexportedWork(project,projectWork(project));
  const safety=projectSafety(project)==='backed up'&&!exportPredatesWork(project)
    ?'Backed up'
    :risk?.kind==='never'?'Not backed up'
    :risk?'Backed up \u00b7 changed since':'Backed up';
  element.innerHTML='';
  element.append(store+' \u00b7 ');
  const control=document.createElement('button');
  control.type='button';
  control.id='project-safety';
  control.className='link-button';
  control.textContent=safety;
  control.title=safety==='Backed up'
    ?'A copy of this project exists outside this browser. Open the Workspace to make another.'
    :'No copy of this project exists outside this browser. Open the Workspace to make one.';
  control.dataset.safety=safety==='Backed up'?'backed-up':'at-risk';
  control.onclick=()=>switchView('project');
  element.append(control);
}

/** Payloads no workflow on this device refers to.
 *
 *  They are made by any refusal that happens after the payload is written: the fix above stops the
 *  download path making more, and does nothing about the ones already there. A practitioner whose
 *  store reads 416.2 MB against a widget holding nothing needs to be able to get those bytes
 *  back. A reference is a `dataRef` on any node of any saved workflow, plus the open canvas, which
 *  may not be saved yet. */
function unreferencedPayloads():{digests:string[];bytes:number}{
  const referenced=new Set<string>();
  const collect=(w:unknown)=>{
    for(const node of ((w as {nodes?:unknown[]})?.nodes??[])){
      const ref=(node as {params?:{dataRef?:unknown}})?.params?.dataRef;
      if(typeof ref==='string')referenced.add(ref);
    }
  };
  for(const saved of Object.values(readSavedWorkflows()))collect(saved);
  collect(workflow);
  const held=cachedPayloads();
  const digests=Object.keys(held).filter(digest=>!referenced.has(digest));
  return {digests,bytes:digests.reduce((sum,digest)=>sum+payloadBytes(held[digest]),0)};
}
/** BEST-EFFORT STORAGE IS EVICTABLE, AND THIS APPLICATION'S DATA IS NOT CHEAP TO REPLACE.
 *
 *  Without a granted persistence request, everything this site keeps -- IndexedDB payloads, the
 *  Cache Storage holding the offline application, localStorage -- is "best-effort" and the browser
 *  may evict it under storage pressure. That is survivable for a cached stylesheet and not for a
 *  WorldPop raster: the national extracts measured on 2026-10-24 are 293 MB and 1.18 GB, and at
 *  the 80 kB/s that download sustained, the larger one is about four hours. Losing it to eviction
 *  in the field is a worse failure than any slow save.
 *
 *  The request is asked once, on load, and the ANSWER IS RECORDED RATHER THAN ASSUMED. Browsers
 *  decide it differently -- some grant it silently to an installed application, some to a site
 *  with engagement, some refuse -- so this never reports data as safe. It reports what the browser
 *  said. A refusal is not an error and is not surfaced as one: the application works either way,
 *  and the practitioner is told which they have when they ask about storage. */
let persistence:'persisted'|'best-effort'|'unsupported'|'unknown'='unknown';
async function requestPersistence():Promise<void>{
  try{
    if(!navigator.storage?.persist){persistence='unsupported';return;}
    persistence=await navigator.storage.persisted?.()||await navigator.storage.persist()
      ?'persisted':'best-effort';
  }catch{persistence='unknown';}
}
const persistenceNote=():string=>({
  persisted:'The browser has granted persistent storage, so this site\u2019s data is not evicted to reclaim space.',
  'best-effort':'Storage here is best-effort: the browser may evict this site\u2019s data under storage pressure. Downloads that took hours are not guaranteed to survive. Installing the application, or using it more, usually earns persistence.',
  unsupported:'This browser does not offer persistent storage, so its data may be evicted under storage pressure.',
  unknown:'Whether this browser will keep this site\u2019s data under storage pressure is not known.',
}[persistence]);
let siteEstimate:{usage:number;quota:number}|null=null;
async function refreshSiteEstimate():Promise<void>{
  try{
    const estimate=await navigator.storage?.estimate?.();
    if(estimate&&typeof estimate.usage==='number'&&typeof estimate.quota==='number')
      siteEstimate={usage:estimate.usage,quota:estimate.quota};
  }catch{/* a browser that will not estimate is reported as not estimating */}
}
function renderStorageStatus(){
  const used=storageUsedBytes(),share=used/STORAGE_QUOTA_BYTES;
  const pill=$('#storage-status');
  const mb=(value:number)=>(value/1e6).toFixed(1);
  // KILOBYTES UNDER A MEGABYTE: "Storage 0.0 / 5.2 MB" reads as nothing stored at all, and the
  // store is never empty.
  //
  // TWO LABELS, because the header has no room to spare: the full figure, and a percentage for a
  // phone. Added as one element with two spans on 2026-10-21 after the long label pushed the
  // header 13 px past a 390 px viewport and twelve tests that check the page does not scroll
  // sideways caught it.
  const full=used<1e6?`Storage ${Math.max(1,Math.round(used/1024)).toLocaleString('en')} KB / ${mb(STORAGE_QUOTA_BYTES)} MB`
    :`Storage ${mb(used)} / ${mb(STORAGE_QUOTA_BYTES)} MB`;
  pill.innerHTML=`<span class="storage-long"></span><span class="storage-short"></span>`;
  pill.querySelector<HTMLElement>('.storage-long')!.textContent=full;
  pill.querySelector<HTMLElement>('.storage-short')!.textContent=`${Math.min(999,Math.round(share*100))}%`;
  pill.classList.toggle('tight',share>=STORAGE_TIGHT&&share<STORAGE_FULL);
  pill.classList.toggle('full',share>=STORAGE_FULL);
  const bytes=payloadStoreBytes();
  // The large store is shown beside the workspace one rather than folded into it: they fill for
  // different reasons and only one of them refuses a save.
  if(bytes)pill.querySelector<HTMLElement>('.storage-long')!.textContent
    =`${full} · data ${bytes<1e6?`${Math.round(bytes/1024).toLocaleString('en')} KB`:`${mb(bytes)} MB`}`;
  pill.title=share>=STORAGE_FULL
    ?'This browser\'s workspace store is nearly full. Export what you want to keep and delete what you do not: the next save may be refused.'
    :share>=STORAGE_TIGHT
      ?'This browser\'s workspace store is filling up. Export what you want to keep, and delete workflows you have finished with.'
      :'How much of this browser\'s workspace store is in use. Everything is held on this device; export to keep it anywhere else.';
  if(payloadStoreKind()!=='indexeddb')pill.title+=' Downloaded data is in the small store on this device, not the large one.';
  else if(bytes)pill.title+=` Downloaded data (${payloadCount()} ${payloadCount()===1?'payload':'payloads'}) is kept separately in the large store, which is not what refuses a save.`;
}
/** Every project and workflow on this device, with what each costs and what can be done with it.
 *
 *  *"I am not sure we have a clear FW projects button"* -- there was a picker and a details
 *  disclosure, and no one place that answers "what is on this device, how big is it, and how do I
 *  get it off". */


/** A PROJECT AS ONE FILE. *"Where is the export project button?"* -- 2026-10-21. There was none:
 *  Export and Encrypted ZIP are both workflow-scoped, so four workflows about one province moved
 *  as four unrelated files with nothing recording that they belonged together. */
async function exportProject(id:string){
  if(busy)return;
  const project=readProjects().find(p=>p.id===id);
  if(!project)return;
  try{
    save();
    const saved=readSavedWorkflows();
    const held=project.workflows.filter(key=>Object.hasOwn(saved,key));
    if(!held.length)throw new Error('That project has no saved workflow to export.');
    const workflows:{key:string;document:unknown}[]=[];
    const validated:Workflow[]=[];
    for(const key of held){
      // The OPEN canvas is exported as it stands, not as it was last written: the practitioner
      // sees it in front of them and would not expect an older copy in the file.
      const source=key===storageKey(workflow)?workflow:validateWorkflow(structuredClone(saved[key]));
      validated.push(source);
      workflows.push({key,document:await workflowDocument(source)});
    }
    const document=projectDocument({...project,workflows:held},workflows);
    const loose=unbundledReferences(validated);
    // WRITTEN COMPACT, because indentation is paid in the one resource that binds. Measured
    // 2026-10-23 on a million-junction document: 194 MB compact, 517 MB at indent 2 -- 2.66
    // times, and within four per cent of the 536,870,888 characters V8 will hold. The
    // practitioner's own workflow is 472 MB of JSON, which indented would not serialise at all,
    // so the file they most need to back up would be the one they could not write.
    //
    // Gzip removes whitespace from the FILE either way; it cannot remove it from the string that
    // has to exist first. `gunzip | jq .` gives the readability back on demand.
    const text=JSON.stringify(document);
    const name=`${project.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-project.json.gz`;
    const blob=await gzipText(text);
    downloadBlob(name,blob);
    // Recorded here, where the file has been written -- not where the export was asked for.
    touchProject(id,'exportedAt');
    // AND SAID, which is a separate act from recording it. Found by the test: the state was
    // written correctly and the header went on reading "Not backed up" until the next save or
    // render, so a practitioner who backed up and looked would have been told it had not worked.
    //
    // Both surfaces, because the second one repeated the first one's mistake: the Project view
    // was added, the state was recorded on export, and the view went on saying Not backed up
    // while the header beside it had already corrected itself. Every place that states a derived
    // fact has to be told when the fact changes, and there are now two.
    renderProjectSafety();
    if(currentView==='project')renderProjectView();
    toast(`${name} — ${(text.length/1e6).toFixed(1)} MB of project, ${(blob.size/1e6).toFixed(1)} MB written.`);
    toast(`"${project.name}" exported: ${held.length} ${held.length===1?'workflow':'workflows'}.`
      +(loose?` ${loose} downloaded ${loose===1?'dataset is':'datasets are'} kept on this device by reference and `
        +`${loose===1?'is':'are'} not in the file; whoever opens it downloads ${loose===1?'it':'them'} again.`:''),
      {tone:loose?'warning':undefined});
  }catch(error){toast(errorMessage(error),{tone:'failure'});}
}
/** Open one. The project is recreated with a key of its own for every workflow, so importing a
 *  project twice makes two projects rather than overwriting the first. */
async function importProjectDocument(raw:unknown):Promise<string[]>{
  const document=readProjectDocument(raw);
  const existing=readProjects();
  const project=newProject(document.project.name,document.project.subject,allProjects());
  const keys:string[]=[];
  const workflows:Workflow[]=[];
  for(const entry of document.workflows){
    const next=await importWorkflowDocument(entry.document,validateWorkflow);
    const key=mintWorkflowKey(project.id,[...existing,{...project,workflows:keys}]);
    keys.push(key);
    workflows.push({...next,projectId:project.id,workflowKey:key,exampleId:undefined});
  }
  project.workflows=keys;
  if(!writeProjects([...existing,project]))throw new Error('The project could not be recorded on this device.');
  // Every workflow is written before any is opened, so a refusal half way through does not leave a
  // project claiming workflows that were never saved.
  // THE DATA GOES WHERE DATA GOES, which is not the workspace store. This dehydrated against
  // `()=>false` -- "no digest is held" -- so nothing was stripped and every downloaded network and
  // raster window was written inline into localStorage, whose ceiling is about 5 MB. A project
  // carrying any real data therefore could not be imported at all, however empty the store was:
  // the practitioner's refusal read "the workspace store is full" over a store holding 419 KB of
  // 5.2 MB, because the write that failed was oversized rather than the room being short.
  //
  // `save()` has always done this correctly -- payloads to the payload store by digest, references
  // in the workspace store -- and the import simply never did. Keeping them first also means a
  // reload rehydrates them, which is the defect the encrypted-project round trip found when an
  // imported project's reference pointed at nothing.
  const kept=new Set<string>();
  for(const next of workflows)
    for(const node of next.nodes){
      const params=node.params as unknown as {dataRef?:unknown;data?:unknown};
      if(typeof params.dataRef!=='string'||params.data===undefined)continue;
      if(await keepDataset(params.dataRef,params.data))kept.add(params.dataRef);
    }
  try{
    const store=JSON.parse(localStorage.getItem(WORKSPACES)||'{}');
    for(const next of workflows)store[storageKey(next)]=dehydrateWorkflow(next,digest=>kept.has(digest));
    localStorage.setItem(WORKSPACES,JSON.stringify(store));
    forgetSavedWorkflows();
  }catch(error){
    writeProjects(readProjects().filter(p=>p.id!==project.id));
    // WHY, FROM THE ERROR IN HAND. This read `saveFailureMessage(...)`, which reports the last
    // refusal recorded by `save()` -- and this write does not go through `save()`, so there was
    // never one to report and the sentence arrived bare. The practitioner, 2026-10-23, importing
    // a project: the toast said it could not be saved and nothing about what stopped it.
    // SAY THE NUMBERS. "The workspace store is full" was said over a store holding 419 KB of
    // 5.2 MB: the room was not short, the write was too big. A refusal that names a cause it has
    // not measured is the fault this project already fixed once, in a storage handler that
    // asserted a full disk and discarded the error it had.
    const name=error instanceof Error?error.name:String(error);
    const quota=/quota|exceed|full/i.test(name);
    const mb=(value:number)=>value<1e6?`${Math.max(1,Math.round(value/1024)).toLocaleString('en')} KB`
      :`${(value/1e6).toFixed(1)} MB`;
    const needed=workflows.reduce((n,w)=>{
      try{return n+JSON.stringify(dehydrateWorkflow(w,digest=>kept.has(digest))).length;}catch{return n;}},0);
    const free=Math.max(0,STORAGE_QUOTA_BYTES-storageUsedBytes());
    throw new Error(`"${project.name}" could not be saved on this device, so it was not imported. `
      +(quota?`It needs about ${mb(needed)} in the workspace store and ${mb(free)} is free of `
        +`${mb(STORAGE_QUOTA_BYTES)}. Back up and delete a workflow or a project you no longer need, `
        +'then import again -- the file is unchanged.'
        :`The device reported ${name}.`));
  }
  workflow=workflows[0];
  selected=null;result=null;runWorkflow=null;activeOutputId=null;history=[];future=[];statuses={};dirty=true;
  save();renderProjectOptions();renderLibrary();renderResults();render();switchView('workflow');
  toast(`"${project.name}" imported with ${keys.length} ${keys.length===1?'workflow':'workflows'}.`);
  return keys;
}

/** Move the current workflow into a project, or out of every project.
 *
 *  Minting a key is what makes membership possible at all: the workspace map was keyed by a closed
 *  vocabulary of example ids, so a workflow saved under `blank` would be overwritten by the next
 *  blank canvas. On joining a project it gets a key of its own, and keeps it on leaving -- the old
 *  `blank` entry is cleared so the two do not both claim to be this workflow. */
function assignCurrentWorkflow(projectId:string){
  if(busy)return;
  const stored=readProjects(),previousKey=storageKey(workflow);
  if(projectId&&!stored.some(p=>p.id===projectId))return;
  for(const project of stored)project.workflows=project.workflows.filter(k=>k!==previousKey);
  let key=workflow.workflowKey;
  if(projectId&&!key){
    const taken=new Set([...stored.flatMap(p=>p.workflows)]);
    for(let n=1;!key||taken.has(key);n++)key=`${projectId}/w${n}`;
  }
  const target=stored.find(p=>p.id===projectId);
  if(target&&key)target.workflows=[...target.workflows,key];
  if(!writeProjects(stored))return;
  if(key&&key!==previousKey&&isExampleKey(previousKey))
    try{const saved=JSON.parse(localStorage.getItem(WORKSPACES)||'{}');delete saved[previousKey];localStorage.setItem(WORKSPACES,JSON.stringify(saved));forgetSavedWorkflows();}
    catch{/* the stale entry is harmless; the minted key is what this workflow is saved under now */}
  workflow.projectId=projectId||undefined;
  workflow.workflowKey=key;
  if(projectId)workflow.exampleId=undefined;
  dirty=true;save();renderProjectOptions();render();
  toast(target?`This workflow is now in "${target.name}".`:'This workflow is in no project.');
}
$('#new-project').onclick=openProjectDialog;
$('#add-workflow').onclick=()=>addWorkflowToProject();
$('#delete-workflow').onclick=deleteCurrentWorkflow;
// TWO WAYS IN, AND ONE OF THEM LOOKS LIKE A BUTTON. The practitioner went looking for the
// project export with Chrome refusing to load the application and their workflows unbacked up,
// and found it behind the storage readout in the header: *"That is where I least expect it."*
// It was the only way in. A readout reads as a status, not as the door to everything saved on
// this device, and the one time it matters most is the time nobody is hunting for it.
// THE PILL IS A READOUT, NOT A DOOR. It opened the projects dialog, which is how the project
// level came to be reachable only by recognising a storage figure as a button -- the fault
// experiment 131 exists to end. What it was a door to is the Project tab, which has its own.
$('#storage-status').onclick=()=>switchView('project');
$('#storage-meter').addEventListener('click',async event=>{
  if((event.target as HTMLElement).id!=='drop-unreferenced')return;
  const loose=unreferencedPayloads();
  if(!loose.digests.length)return;
  if(!confirm(`Remove ${loose.digests.length} payload${loose.digests.length===1?'':'s'} that no workflow refers to, freeing about ${(loose.bytes/1e6).toFixed(1)} MB? This cannot be undone.`))return;
  for(const digest of loose.digests)await dropPayload(digest);
  renderStorageStatus();if(currentView==='project')renderProjectView();
  toast(`${loose.digests.length} unreferenced payload${loose.digests.length===1?'':'s'} removed.`);
});
// One listener on the list, because its rows are rebuilt on every change inside the dialog.
// ONE HANDLER, TWO LISTS. These actions were delegated on the dialog's list alone, so the same
// buttons rendered in the Project view did nothing at all -- found by the test that pressed Back
// up there and waited for a download that never came. A view that offers a control which is not
// wired is worse than one that offers none: it reads as capability.
const projectListAction=async(event:Event)=>{
  const button=(event.target as HTMLElement).closest('button');
  if(!button)return;
  const {openWorkflow,exportWorkflow,deleteWorkflow:removeKey,deleteProject:removeProject}=button.dataset;
  if(openWorkflow){loadExample(openWorkflow);return;}
  if(removeProject){deleteProject(removeProject);return;}
  if(button.dataset.exportProject){await exportProject(button.dataset.exportProject);return;}
  if(removeKey){deleteWorkflow(removeKey);renderStorageStatus();
    if(currentView==='project')renderProjectView();return;}
  if(exportWorkflow){
    try{
      const saved=readSavedWorkflows()[exportWorkflow];
      if(!saved)throw new Error('There is nothing saved under that workflow.');
      const exported=await workflowDocument(validateWorkflow(structuredClone(saved)));
      const name=((saved as {name?:string}).name||exportWorkflow).replace(/[^a-z0-9]+/gi,'-').toLowerCase();
      download(`${name}.json`,JSON.stringify(exported,null,2));
      toast(`"${(saved as {name?:string}).name||exportWorkflow}" exported to a file. A workflow in a file is not at risk from a full store.`);
    }catch(error){toast(errorMessage(error),{tone:'failure'});}
  }
};
$('#project-view-list').addEventListener('click',projectListAction);
// The unfiled rows carry the same data attributes, so they are served by the same handler --
// one act, one implementation, whichever list it was pressed in.
$('#project-unfiled-rows').addEventListener('click',projectListAction);
$('#workflow-template').onchange=e=>{
  const select=control(e) as HTMLSelectElement,source=select.value;
  select.value='';
  if(source)addWorkflowFromTemplate(source);
};
// The two titles are controls, and say so: a pointer, a tooltip, and a keyboard route in.
// The project's name is edited in the Project tab now, so the only in-place rename left is the
// workflow's own title.
for(const [id,label,run] of [['#project-title','Rename this workflow',renameWorkflowInPlace]] as const){
  const element=$(id);
  element.dataset.renameLabel=label;element.title=label+' \u2014 click to edit';
  element.tabIndex=0;element.setAttribute('role','button');
  // Events from the input this opens BUBBLE back to the title. Without this guard, Enter inside
  // the editor reopened the editor: the first Enter applied the name, the render redrew the
  // heading, and the same keystroke arriving here replaced it with a fresh input -- so the title
  // looked empty and the rename appeared not to have happened, although it had been saved.
  const fromEditor=(event:Event)=>(event.target as HTMLElement|null)?.classList.contains('inline-rename');
  element.addEventListener('click',event=>{if(!fromEditor(event))run();});
  element.addEventListener('keydown',event=>{
    if(fromEditor(event))return;
    const key=(event as KeyboardEvent).key;
    if(key==='Enter'||key===' '){event.preventDefault();run();}
  });
}
$('#project-apply').onclick=applyProjectDetails;
$('#project-delete').onclick=deleteCurrentProject;
// Enter in any of the detail fields applies them, which is what Enter means in a form.
for(const id of ['#project-name-edit','#project-subject-edit','#workflow-name-edit'])
  $(id).addEventListener('keydown',event=>{if((event as KeyboardEvent).key==='Enter'){event.preventDefault();applyProjectDetails();}});
$('#blank-project').onclick=openProjectDialog;
$('#project-create').onclick=createProjectFromDialog;
for(const id of ['#project-cancel','#project-dialog-close'] as const)$(id).onclick=()=>$('#project-dialog').close();
$('#new-workflow').onclick=()=>{if(busy)return;loadExample('blank');change(w=>{replaceWorkflow(w,blankWorkflow());selected=null;});result=null;runWorkflow=null;activeOutputId=null;renderResults();render();switchView('workflow');};
$('#result-search').oninput=e=>{if(activeOutput()?.pointTable){tablePage=0;renderPointTable();return;}$('#result-rows').querySelectorAll('tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(control(e).value.toLowerCase()));};
const libraryToggle=$('#toggle-library'),library=$('.library');
library.id='layout-library';
libraryToggle.onclick=()=>{const collapsed=$('.studio').classList.toggle('library-collapsed');libraryToggle.textContent=collapsed?'Show widgets':'Hide widgets';libraryToggle.setAttribute('aria-expanded',String(!collapsed));};
/** ONE FULL-SCREEN CONTROL, because there is one view on screen. There were two -- fill the
 *  screen with the workbench, fill it with the results -- which made sense while both were on
 *  screen at once and the question was which half won. With the tab, the second was a button
 *  beside another button with the same word on it: *"the second screenshot has 2 full screen
 *  buttons but only one is useful"*, 2026-10-21. This one puts whatever the tab is showing into
 *  the screen, and Escape takes it back. */
let fullScreen=false;
function setFullScreen(on:boolean){
  fullScreen=on;
  const showingResults=$('.work-area').classList.contains('showing-results');
  document.body.classList.toggle('focus-workbench',on&&!showingResults);
  document.body.classList.toggle('focus-results',on&&showingResults);
  const button=$('#fullscreen-workbench');
  button.setAttribute('aria-pressed',String(on));
  button.textContent=on?'Exit full screen':'Full screen';
  if(on&&!showingResults)requestAnimationFrame(()=>flow?.fit());
}
$('#fullscreen-workbench').onclick=()=>setFullScreen(!fullScreen);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&fullScreen){setFullScreen(false);event.preventDefault();}});
credentials=installCredentials(document.querySelector<HTMLButtonElement>('#credentials-button')!);
const showCatalog=()=>{try{openCatalogDialog(esc,servingBuild);}catch(error){toast(errorMessage(error),{tone:'failure'});}};
$('#open-catalog').onclick=showCatalog;
$('#header-catalog').onclick=showCatalog;
// Deep link, so the catalog can be pointed at rather than described: ?catalog=1 or #catalog.
if(new URLSearchParams(location.search).get('catalog')==='1'||location.hash==='#catalog')showCatalog();
/** ONE BACK UP, with the scope chosen inside it. Experiment 131's last control row: the header
 *  carried `Export`, `Encrypted ZIP` and, in a dialog elsewhere, `Export project` -- three
 *  controls for one act, named for their FORMAT rather than for what a practitioner is trying to
 *  do, which is to not lose their work.
 *
 *  It also makes a gap visible that three separate buttons hid. The practitioner, 2026-10-22,
 *  having looked for it: *"Where is the export to zip for projects?"* and *"So encrypted zip
 *  description is misleading."* There are three combinations, not four: a project cannot be
 *  backed up encrypted, because the encrypted package takes one workflow. That is said in the
 *  dialog rather than left as an option a practitioner hunts for and does not find. */
function openBackupDialog(){
  if(busy)return;
  const project=readProjects().find(p=>p.id===(workflow.projectId
    ??projectOfWorkflow(storageKey(workflow),readProjects())?.id));
  const scoped=$('#backup-project');
  scoped.disabled=!project;
  $('#backup-project-note').textContent=project
    ?`Compressed JSON of all ${project.workflows.length===1?'1 workflow':`${project.workflows.length} workflows`} filed under "${project.name}".`
    :'This workflow is filed under no project, so there is no project to back up. "New project" files it under one.';
  $('#backup-gap').hidden=!project;
  $('#backup-dialog').showModal();
}
$('#backup-button').onclick=openBackupDialog;
$('#backup-dialog-close').onclick=()=>$('#backup-dialog').close();
$('#backup-project').onclick=async()=>{
  const project=readProjects().find(p=>p.id===(workflow.projectId
    ??projectOfWorkflow(storageKey(workflow),readProjects())?.id));
  if(!project)return;
  $('#backup-dialog').close();
  await exportProject(project.id);
};
$('#encrypted-export').onclick=()=>{try{if($('#backup-dialog').open)$('#backup-dialog').close();
  openPackageDialog(workflow,validateWorkflow,applyImportedWorkflow);}catch(error){toast(errorMessage(error),{tone:'failure'});}};
/** THE PREVIOUS RUN BELONGED TO THE PREVIOUS WORKFLOW.
 *
 *  The practitioner, 2026-10-24, having fetched South London from the catalog: *"Loaded South
 *  London successfully, but it not clear the results panel. The Geoprivacy results are still
 *  there."* They were -- 250 death locations and a private-source map, tabbed under a workflow
 *  about water companies, with the Results tab counting seven of them. A toast saying "Run it to
 *  update results" is not the same as not showing somebody else's answer in the meantime, and the
 *  panel does not say which workflow a result came from because until now it could only have
 *  come from this one.
 *
 *  Opening a new empty canvas already did this. Importing did not, on either path, so a file and
 *  a catalog fetch both inherited it. Cleared here so both do the same thing. */
function discardPreviousRun():void{
  result=null;runWorkflow=null;activeOutputId=null;statuses={};
  runFailed=false;runIncomplete=false;dirty=true;
  renderResults();
}
function applyImportedWorkflow(next:Workflow){const persisted=change(w=>{replaceWorkflow(w,next);selected=next.nodes[0]?.id;},{requirePersistence:true});if(!persisted)throw new Error('Workflow could not be saved. The previous workflow is unchanged.');discardPreviousRun();renderLibrary();flow?.fit();toast('Workflow imported. Run it to update results.');}
$('#export-button').onclick=async()=>{try{if($('#backup-dialog').open)$('#backup-dialog').close();
  const exported=await workflowDocument(workflow);const text=JSON.stringify(exported);
  const name=exported.schema==='fieldwork/bundle/1'?'fieldwork-workflow-bundle.json.gz':'fieldwork-workflow.json.gz';
  downloadBlob(name,await gzipText(text));}catch(error){toast(errorMessage(error),{tone:'failure'});}};$('#import-button').onclick=()=>$('#workflow-file').click();
$('#workflow-file').onchange=async e=>{const file=(control(e) as HTMLInputElement).files?.[0];if(!file)return;try{if(file.size>MAX_BUNDLE_BYTES)throw new Error(`Workflow or bundle exceeds the ${(MAX_BUNDLE_BYTES/1e6).toFixed(0)} MB import limit.`);if(file.name.toLowerCase().endsWith('.zip')){openPackageDialog(workflow,validateWorkflow,applyImportedWorkflow,file);control(e).value='';return;}
  // Gzipped or not, by what the first two bytes say rather than by the name on the file.
  const parsed=JSON.parse(await readMaybeGzipped(file));
  // A PROJECT DOCUMENT comes in through the same control: a practitioner handed a file should not
  // have to know which of two buttons made it.
  if((parsed as {schema?:string})?.schema===PROJECT_DOCUMENT_SCHEMA){await importProjectDocument(parsed);control(e).value='';return;}
  const next=await importWorkflowDocument(parsed,validateWorkflow);const persisted=change(w=>{replaceWorkflow(w,next);selected=next.nodes.find(n=>n.type==='output')?.id;},{requirePersistence:true});if(!persisted)throw new Error('Workflow could not be saved. The previous workflow is unchanged.');discardPreviousRun();renderLibrary();flow?.fit();toast('Workflow imported. Run it to update results.');}catch(err){toast(errorMessage(err),{tone:'failure'});}control(e).value='';};
$('#geojson-file').onchange=async e=>{const file=(control(e) as HTMLInputElement).files?.[0];if(!file)return;try{if(file.size>5e6)throw new Error('GeoJSON file is too large (5 MB maximum).');const data=validateGeoJSON(JSON.parse(await file.text()));change(w=>{const n=w.nodes.find(n=>n.id===importNode);if(!n)throw new Error('Source node no longer exists.');updateParam(w,n.id,'data',data);});toast('Local geographic data loaded. Run to update results.');}catch(err){toast(errorMessage(err),{tone:'failure'});}control(e).value='';};
$('#download-evidence').onclick=async()=>{if(!result||!runWorkflow){toast('Run the workflow first.');return;}const {tables:_held,...reported}=result;
  // The run's retained tables are a reading convenience for the open session, not evidence: the
  // receipt already carries the facts each step asserted, and copying every intermediate table
  // into it would grow an export by the size of the data it describes.
  const snapshot=structuredClone({schema:'fieldwork/run/1',workflow:runWorkflow,...reported});try{const attachments=await exportEvidenceFiles(snapshot.workflow);download('fieldwork-run-receipt.json',JSON.stringify({...snapshot,...(attachments.length?{attachments}:{})},null,2));}catch(error){toast(errorMessage(error),{tone:'failure'});}};
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view!));
/** MANAGE LAYERS. The practitioner, 2026-10-29: *"Map output should have a dialog modal for
 *  layer management (ordering, labeling, grouping). It should honor all the mappable inputs,
 *  refusing only when there are rule violations."*
 *
 *  The list is recomputed from the workflow on every edit rather than held in the dialog, so
 *  what it shows is what the map draws -- including a layer wired while it is open, and the
 *  members inside a collected value, which come from the last run's polygons.
 *
 *  What this does NOT yet replace: `#map-layer-list`, the per-point-layer checkboxes under the
 *  static map, whose state lives in `hiddenMapLayers` -- a Map in memory, lost on reload and
 *  absent from the saved workflow. Two visibility controls for one map is one too many, and the
 *  one that persists should win; that is the next step and is recorded rather than half-done. */
let layerDialogNode:string|null=null;
const layersFor=(node:WorkflowNode<'map_output'>):MapLayer[]=>{
  const out=result?.outputs.find(o=>o.nodeId===node.id);
  return mapLayerList(node,workflow.edges,
    id=>workflow.nodes.find(n=>n.id===id)?.params.label,
    out?.polygons?[{port:'polygons',members:membersOfPolygons(out.polygons)}]:[]);
};
const KIND_WORD:Record<string,string>={AreaLayer:'study area',PointsLayer:'points',
  PolygonsLayer:'polygons',RasterLayer:'raster',NetworkLayer:'street network',BasemapLayer:'basemap'};
function renderLayerDialog(){
  if(!layerDialogNode)return;
  const node=getNode(workflow,layerDialogNode,'map_output'),list=layersFor(node);
  $('#layer-dialog-rows').innerHTML=list.length?list.map((layer,index)=>
    `<div class="layer-row" role="listitem" data-layer-row="${esc(layer.id)}">`
    +`<span class="layer-row-move">`
    +`<button class="icon-button" data-layer-move="${esc(layer.id)}" data-direction="up" aria-label="Draw ${esc(layer.label)} lower" ${index===0?'disabled':''}>↑</button>`
    +`<button class="icon-button" data-layer-move="${esc(layer.id)}" data-direction="down" aria-label="Draw ${esc(layer.label)} higher" ${index===list.length-1?'disabled':''}>↓</button>`
    +`</span>`
    +`<label class="layer-row-visible"><input type="checkbox" data-layer-visible="${esc(layer.id)}" ${layer.drawn?'checked':''}><span class="visually-hidden">Draw ${esc(layer.label)}</span></label>`
    +`<input class="layer-row-label" data-layer-label="${esc(layer.id)}" value="${esc(layer.label)}" maxlength="${LAYER_LABEL_LIMIT}" aria-label="Name for ${esc(layer.label)}">`
    +`<select class="layer-row-group" data-layer-group="${esc(layer.id)}" aria-label="Group for ${esc(layer.label)}">`
      +`<option value="">No group</option>`
      +(node.params.layerGroups||[]).map(group=>
        `<option value="${esc(group.id)}" ${layer.group?.id===group.id?'selected':''}>${esc(group.label)}</option>`).join('')
      +`</select>`
    +`<span class="muted layer-row-kind">${esc(KIND_WORD[layer.kind]||layer.kind)}${layer.parts?` · ${layer.parts} parts`:''}${layer.origin==='within'?' · inside a collection':''}</span>`
    +`</div>`).join('')
    :'<p class="muted">Nothing is connected to this map yet, so it has no layers to manage.</p>';
  // WHAT IS REFUSED IS SAID HERE, and it is never a combination of kinds. A kind decides how a
  // layer is drawn, not whether it may be there.
  const drawn=list.filter(l=>l.drawn);
  $('#layer-dialog-note').textContent=!list.length
    ?'Connect a study area, points, polygons, a raster or a street network.'
    :!drawn.length?'Every layer is switched off, so this map has nothing to draw. Switch one back on.'
    :`Drawn bottom to top: ${drawn.map(l=>l.label).join(' → ')}.`
      +(drawn.length<list.length?` ${list.length-drawn.length} switched off, still connected.`:'');
}
function editLayer(id:string,patch:{label?:string;group?:string;drawn?:boolean}){
  if(!layerDialogNode)return;
  change(w=>{
    const node=getNode(w,layerDialogNode!,'map_output');
    const held={...(node.params.layers||{})},next:Record<string,unknown>={...held[id],...patch};
    // A setting that says nothing is removed rather than stored empty, so a layer the
    // practitioner cleared behaves exactly like one they never touched -- including taking a new
    // default when the node it comes from is renamed.
    for(const key of ['label','group'])if(typeof next[key]==='string'&&!(next[key] as string).trim())delete next[key];
    if(next.drawn===true)delete next.drawn;
    if(Object.keys(next).length)held[id]=next as typeof held[string];else delete held[id];
    node.params.layers=held;
  });
  renderLayerDialog();
}
$('#layer-dialog-rows').addEventListener('input',event=>{
  const target=event.target as HTMLInputElement;
  const forLabel=target.getAttribute('data-layer-label');
  if(forLabel)editLayer(forLabel,{label:target.value});
});
$('#layer-dialog-rows').addEventListener('change',event=>{
  const target=event.target as HTMLInputElement,id=target.getAttribute('data-layer-visible');
  if(id){editLayer(id,{drawn:target.checked});return;}
  const grouped=target.getAttribute('data-layer-group');
  if(grouped)editLayer(grouped,{group:target.value});
});
$('#layer-dialog-rows').addEventListener('click',event=>{
  const button=(event.target as HTMLElement).closest('[data-layer-move]') as HTMLElement|null;
  if(!button||!layerDialogNode)return;
  const id=button.getAttribute('data-layer-move')!,up=button.getAttribute('data-direction')==='up';
  const list=layersFor(getNode(workflow,layerDialogNode,'map_output'));
  const at=list.findIndex(l=>l.id===id),swap=up?at-1:at+1;
  if(at<0||swap<0||swap>=list.length)return;
  // THE WHOLE STACK IS WRITTEN, not the two that moved. A position is relative, so recording
  // only the pair would leave the rest at defaults that no longer sit either side of them.
  const next=[...list];[next[at],next[swap]]=[next[swap],next[at]];
  change(w=>{
    const node=getNode(w,layerDialogNode!,'map_output'),held={...(node.params.layers||{})};
    next.forEach((layer,index)=>{held[layer.id]={...held[layer.id],index};});
    node.params.layers=held;
  });
  renderLayerDialog();
  ($('#layer-dialog-rows').querySelector(`[data-layer-row="${CSS.escape(id)}"] [data-direction="${up?'up':'down'}"]`) as HTMLElement|null)?.focus();
});
$('#layer-dialog-declare').onclick=()=>{
  if(!layerDialogNode)return;
  // DECLARED FIRST, JOINED AFTER. The group exists with a name and a position before any layer is
  // in it, which is what makes it one thing to rename and one block to move.
  const node=getNode(workflow,layerDialogNode,'map_output');
  const held=node.params.layerGroups||[];
  const field=$('#layer-group-name') as HTMLInputElement;
  const label=field.value.trim();
  if(!label){$('#layer-dialog-note').textContent='A group needs a name before layers can be added to it.';field.focus();return;}
  change(w=>{
    const target=getNode(w,layerDialogNode!,'map_output');
    target.params.layerGroups=[...held,
      {id:`group-${Date.now().toString(36)}-${held.length}`,label:label.slice(0,LAYER_LABEL_LIMIT),index:held.length}];
  });
  field.value='';
  renderLayerDialog();
};
$('#layer-dialog-reset').onclick=()=>{
  if(!layerDialogNode)return;
  change(w=>{const node=getNode(w,layerDialogNode!,'map_output');
    delete node.params.layers;delete node.params.layerGroups;});
  renderLayerDialog();
};
for(const id of ['#layer-dialog-close','#layer-dialog-done'] as const)
  $(id).onclick=()=>{($('#layer-dialog') as HTMLDialogElement).close();layerDialogNode=null;};
document.addEventListener('click',event=>{
  const open=(event.target as HTMLElement).closest('[data-manage-layers]') as HTMLElement|null;
  if(!open)return;
  layerDialogNode=open.getAttribute('data-manage-layers');renderLayerDialog();
  ($('#layer-dialog') as HTMLDialogElement).showModal();
});
// THE FEATURE VIEWER, opened from the polygon layer's own panel.
document.addEventListener('click',event=>{
  const open=(event.target as HTMLElement).closest('[data-review-polygons]') as HTMLElement|null;
  if(!open)return;
  const id=open.getAttribute('data-review-polygons')!;
  const node=getNode(workflow,id,'polygon_input');
  // THE FRAME THE READ USED, where there is one. An extract read records its own box; a file
  // layer has none, so the connected study area's bounds stand in and a layer connected to
  // nothing simply has no frame to draw.
  const area=(()=>{try{return previewArea(workflow,id).boundary;}catch{return undefined;}})();
  const bounds=area?geometryBounds(area):undefined;
  const frame=node.params.retrieval?.bbox
    ??(bounds?[bounds[0],bounds[1],bounds[2],bounds[3]] as [number,number,number,number]:undefined);
  openPolygonReview(node,esc,(hidden,clipped)=>{
    change(w=>{
      const target=getNode(w,id,'polygon_input');
      if(hidden.length)target.params.hidden=hidden;else delete target.params.hidden;
      if(clipped)target.params.clipToBox=true;else delete target.params.clipToBox;
    });
    toast(hidden.length
      ?`${hidden.length} feature${hidden.length===1?'':'s'} set aside. Rerun to update results.`
      :'Every feature kept. Rerun to update results.');
  },frame);
});
$('#help-button').onclick=()=>$('#help-dialog').showModal();$('#close-help').onclick=()=>$('#help-dialog').close();
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA','SELECT'].includes((e.target as Element).tagName)){e.preventDefault();$(e.shiftKey?'#redo-button':'#undo-button').click();}});
const requestedExample=new URLSearchParams(location.search).get('example');
if(requestedExample&&hasExampleTemplate(requestedExample)&&requestedExample!==exampleKey(workflow)){save();let openedSaved=false;try{const saved=JSON.parse(localStorage.getItem(WORKSPACES)||'{}')[requestedExample];openedSaved=!!saved;workflow=saved?validateWorkflow(saved):template(requestedExample);}catch{workflow=template(requestedExample);}
  // ?example= is how a worked example is usually reached -- from a link, from the manual -- so
  // the notice has to live here as well as on the picker, or the practitioner who follows a
  // link to a republished example still sees the version they already had.
  if(openedSaved)setTimeout(()=>noticeIfRepublished(requestedExample),900);else recordRevision(requestedExample);selected=requestedExample==='snow-geoprivacy'?'move':requestedExample.startsWith('snow-')?'catchments':requestedExample==='raster'?'raster-input':requestedExample==='old-naledi'?'access':'criteria';}
wireThemeControl();renderLibrary();renderResults();save();render();mountPanelLayout();
// Progressive reveal, played back. Behind ?playback=1 because the rule is not adopted: nothing
// about the normal palette changes, and the control does not appear unless it is asked for.
//
// Started here, after the requested example has been loaded, rather than beside the other
// controls. Starting it earlier rendered the canvas once, which syncs ?example= to the workspace
// being shown -- so the playback overwrote the example it was asked to play. Experiment 112.
$('#playback-next').onclick=()=>setPlayback(Math.min(playbackOrder().length,(playbackStep??0)+1));
$('#playback-back').onclick=()=>setPlayback(Math.max(0,(playbackStep??0)-1));
$('#playback-exit').onclick=()=>setPlayback(null);
// Reachable from the workspace bar, not only by typing ?playback=1. The playback IS the
// refinement instrument for the reveal rule -- it is what produced the three readings and the
// per-step measurements in 112 -- and an instrument nobody can find does not refine anything.
// The practitioner, 2026-10-15, twice: "I still do not see progressive reveal", then "I thought
// we implemented progressive reveal in worked examples."
//
// It still changes nothing about the ordinary palette, because the rule is not adopted. Playing
// it back is a thing you ASK for, and leaving it restores the canvas.
$('#playback-start').onclick=()=>setPlayback(playbackStep===null?0:null);
if(new URLSearchParams(location.search).get('playback')==='1')setPlayback(0);
export let servingBuild='unknown';
if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('message',event=>{
    const data=event.data as {type?:string;build?:string;version?:string}|null;
    if(data?.type==='fieldwork-build'&&data.build){
      servingBuild=data.build;
      // Which VERSION is actually serving this page, in the header, beside the number the page
      // believes it is. The two disagree exactly when a cached build is being served, which is
      // the thing a practitioner cannot otherwise see: reported twice, three days apart, while
      // the repository was a release and a half ahead of the browser.
      const serving=data.version;
      $('#offline-status').title=`Served by build ${data.build}${serving?` (v${serving})`:''}`;
      if(serving&&serving!==appPackage.version){
        $('#app-version').textContent=`v${serving} · cached`;
        $('#app-version').title=`This page is being served from a cached build of v${serving}. `
          +`The files on disk are v${appPackage.version}. Reload to update.`;
        toast(`You are looking at a cached v${serving}; v${appPackage.version} is installed.`,
          {action:{label:'Update now',run:()=>navigator.serviceWorker.getRegistration()
            .then(r=>r?.update()).then(()=>location.reload())}});
      }
      // The catalog renders its markup once, from the value held when it was opened. The
      // handshake with the controlling worker can land after that -- on a first visit the
      // worker claims the page only after it activates -- so the already-rendered row is
      // updated here. Without this the dialog says "unknown" for the rest of the tab's life,
      // which is the opposite of what the row is for: it exists to be trusted when a stale
      // cache is the thing under suspicion.
      const shown=document.getElementById('catalog-build');if(shown)shown.textContent=data.build;
    }
  });
  const askBuild=()=>navigator.serviceWorker.controller?.postMessage({type:'fieldwork-build'});
  navigator.serviceWorker.register('./sw.js').then(async registration=>{
    await navigator.serviceWorker.ready;
    // Check for a newer worker on every start where one is ALREADY in control. The browser's own
    // check is periodic, so a worker installed days ago could go on serving its cache
    // indefinitely, which is what happened. Skipped on a first registration: the worker is
    // installing anyway, and asking it to update mid-install makes it precache everything twice
    // -- which showed up as the browser suite taking 8.9 minutes instead of 3.8.
    if(navigator.serviceWorker.controller)registration.update().catch(()=>{});
    askBuild();
    // A page already running old code keeps running it until it is reloaded, and with
    // content-hashed chunks it can ask for files the new cache no longer holds. So an update is
    // announced rather than left to be discovered.
    registration.addEventListener('updatefound',()=>{
      const installing=registration.installing;
      installing?.addEventListener('statechange',()=>{
        if(installing.state==='installed'&&navigator.serviceWorker.controller)
          toast('A newer version of Fieldwork is ready. Reload to use it.',{action:{label:'Reload',run:()=>location.reload()}});
      });
    });
    const ok=!!(await caches.match('./vendor/eye-21.1.24.js'));
    $('#offline-status').innerHTML=ok?'<i></i> Available offline':'<i></i> Offline setup incomplete';
  }).catch(()=>{$('#offline-status').textContent='Offline cache unavailable';});
  navigator.serviceWorker.addEventListener('controllerchange',askBuild);
}else{$('#offline-status').textContent='Offline cache unsupported';}
// A row for a workflow that was never saved is cleared on arrival, once, and said out loud.
{
  const ghosts=pruneGhostWorkflows();
  if(ghosts){
    renderProjectOptions();render();
    setTimeout(()=>toast(`${ghosts} workflow ${ghosts===1?'row was':'rows were'} listed in a project with nothing saved under `
      +`${ghosts===1?'it':'them'} — a workflow registered and then refused by a full store. `
      +`${ghosts===1?'It has':'They have'} been removed; no work was in ${ghosts===1?'it':'them'}.`,{tone:'notice'}),600);
  }
}
if(canAutoRun(workflow))setTimeout(run,350);

setInterval(()=>{const button=document.querySelector<HTMLButtonElement>('#download-network'),message=document.querySelector<HTMLElement>('#network-download-status');if(!button||!message)return;const state=networkDownloadStatus();button.disabled=busy||state.inFlight||state.waitSeconds>0;message.textContent=state.inFlight?(networkDownloadPhase??'One OSM request is in progress.'):networkDownloadError?networkDownloadError+(state.waitSeconds?' Next attempt available in '+state.waitSeconds+' seconds.':''):state.waitSeconds?'Next OSM download available in '+state.waitSeconds+' seconds. Saved graphs are available offline.':'Ready for one bounded OSM request; no automatic refresh.';},1000);
