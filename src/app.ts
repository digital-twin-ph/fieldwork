import {diveDeeperPanel} from './dive-deeper.js';
import {buildOrder,revealedTypes,revealReason} from './reveal-playback.js';
import {manualButton,openManual} from './manual.js';
﻿import widgetRegistry from '../widgets/registry.json';
import {canvasN3} from './canvas-semantics.js';
import appPackage from '../package.json';
import {networkDownloadStatus} from './network-throttle.js';
import {downloadOSM,importNetwork} from './street-network.js';
import {johnSnowExample,snowExtentExample} from './john-snow.js';
import {geoprivacyExample} from './geoprivacy-example.js';
import {pointComparisonMarkup} from './point-comparison-ui.js';
import {CATCHMENT_TYPES} from './catchments.js';
import {catchmentInspector} from './catchment-ui.js';
import {mountCatchmentMap} from './catchment-map.js';
import {catchmentPlot,polygonSvg,catchmentFrame} from './catchment-output.js';
import {mapPresentation,standaloneMapSvg} from './map-communication.js';
import {metresPerPixel} from './presentation.js';
import {installCredentials} from './credentials-ui.js';
import type {CredentialAccess} from './credentials-ui.js';
import {addableTypes,PALETTE_GROUPS,ADDABLE_VIA_COMPOSITION,ADDABLE_VIA_RULESET} from './palette.js';
import {compositionEntry,explodeMicroWorkflow,detectDrift} from './compositions.js';
import {tidyLayout,alreadyTidy} from './layout.js';
import {bundledCompositions,resolveComposition} from './composition-registry.js';
import {OVERTURE_DEFAULT_CONFIDENCE} from './overture-places.js';
import {seaLevelExample} from './sea-level-example.js';
import {rulesetExample} from './ruleset-example.js';
import {openRuleEditor} from './rule-editor.js';
import {openTableViewer,tableViewOf} from './table-viewer.js';
import {castColumn,applyRepairs} from './column-profile.js';
import {openDataQuality} from './data-quality-ui.js';
import {settingNamed} from './authored-rules.js';
import {FACILITY_SOURCES,FACILITY_SOURCE_KEYS,FACILITY_KINDS,downloadFacilities,requireRunnableFindHealthFacilities} from './health-facilities.js';

import {evidenceInspector,openEvidenceEditor} from './evidence-ui.js';
import {workflowDocument,importWorkflowDocument,exportEvidenceFiles} from './evidence-storage.js';
import {MAX_BUNDLE_BYTES} from './evidence.js';
import type {Workflow,WorkflowNode,NodeType,NodeSpec,Boundary,Position,SpatialRelation,ParamsByType,ColumnRepair} from './types.js';
import type {WorkflowRun,Receipt,Output,MapRow,PointRow,CoverageRow,CoverageValue,TableValue} from './results.js';
import type {CanvasAPI,NodeDescription} from './canvas.js';
import type {Connection,Edge} from '@xyflow/react';
import type {ReasonerQuad,ReasoningRequest,ReasoningResponse} from './worker-types.js';
import {element as $,optionalElement,control} from './dom.js';
import {errorMessage,required} from './guards.js';
import {resolveRuleset,bundledRulesets,supersession} from './rulesets.js';
import type {Ruleset} from './rulesets.js';
import {pinnedRuleset} from './rule-application.js';
function getNode<K extends NodeType>(w:Workflow,id:string,type:K):WorkflowNode<K>{const node=required(w.nodes.find(n=>n.id===id));if(node.type!==type)throw new Error('Node type changed while editing');return node as WorkflowNode<K>;}
function updateParam(w:Workflow,id:string,key:string,value:unknown){Object.assign(required(w.nodes.find(n=>n.id===id)).params,{[key]:value});}
function replaceWorkflow(w:Workflow,next:Workflow){for(const key of Object.keys(w))Reflect.deleteProperty(w,key);Object.assign(w,next);}
import {TYPES,exampleWorkflow,validateWorkflow,validateGeoJSON,executionPlan,executeWorkflow,nodeInputs,outputOf} from './core.js';
import {suggestUTM,utmScaleFactor,workflowPositions} from './utm.js';
import {mountCanvas} from './canvas.js';
import {OLD_TYPES,oldNalediWorkflow,tierLabel} from './old-naledi.js';
import {oldInspector,oldEvidence,resultTable,oldMap,distanceText} from './old-naledi-ui.js';
import {blankWorkflow,newStudyArea,studyAreaN3,quadToN3,areaSvg,validateDrawnGeometry,geometryBounds} from './study-area.js';
import {openStudyAreaEditor} from './study-area-map.js';
import {newAreaMeasurement,areaUnitOptions,formatArea,AREA_UNITS} from './area-measurement.js';
import {coverageExercise,newObservations,newCoverageCheck,relationLabel} from './spatial-coverage.js';
import {coverageTable,coverageEvidence} from './coverage-ui.js';
import {openInputDataEditor} from './input-data-ui.js';
import {boundary as oldNalediBoundary} from '../examples/old-naledi/data.js';
import {chartMarkup} from './chart-output.js';
import {chartOrientation,chartRenderer} from './chart-vega.js';
import {standaloneChartSvg} from './chart-figure.js';
import {networkPreviewSvg,networkCoverage,networkPreviewCaption} from './network-preview.js';
import {chartVegaSpec,renderVegaChart,disposeVegaChart} from './chart-vega.js';
import {openRasterEditor,rasterSvg,downloadRaster} from './raster-ui.js';
import {openTableEditor,dataTableMarkup} from './data-table-ui.js';
import {openCatalogDialog,identityMarkup} from './catalog-ui.js';
import {initTheme,applyTheme,saveThemePreference,isThemePreference} from './theme.js';
import {previewArea,prepareRasterPreview} from './raster-preview.js';
import {rasterExample} from './raster-example.js';
import {openPackageDialog} from './package-ui.js';
import {syncProjectManifest} from './project-manifest.js';
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
    <label class="field-label" for="map-source-note">Source / method note</label><textarea id="map-source-note" maxlength="500" rows="3" placeholder="Default: connected source labels and method">${esc(p.mapSourceNote||'')}</textarea>
    <label class="field-label" for="map-basemap">Basemap</label><select id="map-basemap"><option value="none" ${!p.basemap||p.basemap==='none'?'selected':''}>None · local geometry, works offline</option><option value="osm" ${p.basemap==='osm'?'selected':''}>OpenStreetMap streets</option><option value="topo" ${p.basemap==='topo'?'selected':''}>OpenTopoMap terrain</option></select>
    <p class="description">A basemap is layer 0, under everything the workflow produced. Choosing one switches this map to the interactive presentation, which is the only one that can draw tiles. ${p.presentation==='interactive'?'':'This map is a static plot today, so picking one will change how it is drawn.'}</p>
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
 */
if(new URLSearchParams(location.search).has('reset-cache')){
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
// Named workspaces first, then the fallback. The fallback treats any workflow holding a study
// area as Old Naledi, which is why a new example must be listed here: the Manila sea-level
// example has an area node and was silently labelled, described and noted as Old Naledi until
// it was added. This is the "examples are the default world" problem in TODO.md, in the one
// place it is least visible.
const NAMED_WORKSPACES=['blank','coverage','raster','sea-level','rulesets'];
const exampleKey=(w:Workflow):string=>w.exampleId?.startsWith('snow-')?w.exampleId:NAMED_WORKSPACES.includes(w.exampleId as string)?w.exampleId as string:w.exampleId==='old-naledi'||w.nodes.some(n=>n.type==='study_area')?'old-naledi':'heat';
const template=(key:string)=>key==='rulesets'?rulesetExample():key==='sea-level'?seaLevelExample():key==='snow-geoprivacy'?geoprivacyExample():key==='snow-extent'?snowExtentExample():key==='snow-voronoi'||key==='snow-isochrone'?johnSnowExample(key):key==='raster'?rasterExample():key==='coverage'?coverageExercise():key==='blank'?blankWorkflow():key==='old-naledi'?oldNalediWorkflow():exampleWorkflow();
const canAutoRun=(w:Workflow)=>w.nodes.length>0&&!w.nodes.some(n=>n.type==='raster_input'&&!n.params.asset||n.type==='network_input'&&!n.params.data.nodes.length||n.type==='table_input'&&!n.params.data.rows.length);
let credentials:CredentialAccess|null=null;
let workflow=exampleWorkflow(),selected:string|null|undefined='criteria',result:WorkflowRun|null=null,runWorkflow:Workflow|null=null,busy=false,dirty=true,runFailed=false,statuses:Record<string,string>={},history:Workflow[]=[],future:Workflow[]=[],flow:CanvasAPI|null=null,worker:Worker|null=null,seq=0,lastNodeCount=0,importNode:string|null=null;
let toastTimer:ReturnType<typeof setTimeout>|undefined,activeOutputId:string|null=null,tablePage=0,tableAttributePage=0;
/** The run whose comparison result may expand the results pane, consumed the first time it does. */
let expandForRun:string|null=null;
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
try{const saved=localStorage.getItem(KEY);if(saved)workflow=validateWorkflow(JSON.parse(saved));}catch{toast('Saved workflow could not be loaded. The example is ready.');}
if(!workflow.nodes.some(n=>n.id===selected))selected=exampleKey(workflow)==='raster'?'raster-input':exampleKey(workflow)==='old-naledi'?'access':workflow.nodes[0]?.id;
function save(){
  syncProjectManifest(workflow);
  const previous=new Map<string,string|null>();
  try{for(const key of [KEY,WORKSPACES])previous.set(key,localStorage.getItem(key));const workspaces=JSON.parse(previous.get(WORKSPACES)||'{}');workspaces[exampleKey(workflow)]=workflow;localStorage.setItem(KEY,JSON.stringify(workflow));localStorage.setItem(WORKSPACES,JSON.stringify(workspaces));$('#save-status').textContent='Saved on this device';return true;}
  catch{for(const [key,value] of previous){try{if(localStorage.getItem(key)!==value){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}}catch{/* Storage may be unavailable even for rollback. Keep the editor draft open. */}}$('#save-status').textContent='Storage unavailable — export to keep';return false;}
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

function loadExample(key:string){if(busy)return;save();let fromTemplate=true;try{const saved=JSON.parse(localStorage.getItem(WORKSPACES)||'{}')[key];fromTemplate=!saved;workflow=saved?validateWorkflow(saved):template(key);}catch{workflow=template(key);}if(fromTemplate)recordRevision(key);else setTimeout(()=>noticeIfRepublished(key),400);selected=key==='snow-geoprivacy'?'move':key.startsWith('snow-')?'catchments':key==='raster'?'raster-input':key==='old-naledi'?'access':'criteria';result=null;runWorkflow=null;activeOutputId=null;history=[];future=[];statuses={};dirty=true;save();renderLibrary();renderResults();render();switchView('workflow');setTimeout(()=>flow?.fit(),80);if(canAutoRun(workflow)&&key!=='blank')run();}
function change(fn:(w:Workflow)=>void,{spatial=true,requirePersistence=false}={}){if(busy)return false;const previous=structuredClone(workflow);try{fn(workflow);syncProjectManifest(workflow,true);workflow=validateWorkflow(workflow);const persisted=save();if(requirePersistence&&!persisted){workflow=previous;render();return false;}history.push(previous);if(history.length>40)history.shift();future=[];if(spatial){dirty=true;runFailed=false;statuses={};}render();return persisted;}catch(e){workflow=previous;toast(errorMessage(e));render();return false;}}
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
    `${alert.unconnected.length} site${alert.unconnected.length===1?'':'s'} got no result at all: the walk to the nearest street alone spends the whole travel budget. Every count and area from this widget is over the sites that reached something.`);
  if(alert.offNetwork.length)said.push(
    `${alert.offNetwork.length} site${alert.offNetwork.length===1?'':'s'} started further from the network than the snap limit allows, and ${alert.offNetwork.length===1?'its route was':'their routes were'} charged a straight line to reach it. A straight line assumes a walk that may not exist, so ${alert.offNetwork.length===1?'that result reaches':'those results reach'} further here than on the ground.`);
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
function describe(n:WorkflowNode,status?:string):NodeDescription{let subtitle=TYPES[n.type].description,detail='Ready';if((n.type==='places'||n.type==='centers')){subtitle=`${n.params.data.features.length} local locations`;detail='GeoJSON · CRS84';}if(n.type==='raster_input'){detail=n.params.asset?`${n.params.asset.metadata.width} x ${n.params.asset.metadata.height} retained cells`:'Prepare a local GeoTIFF';}if(n.type==='clip_raster'){subtitle='Raster + polygon -> masked raster';detail=n.params.method+' / margin '+(n.params.marginPixels||0)+' px';}if(n.type==='policy'){subtitle=`Heat alert + distance > ${n.params.thresholdKm} km`;detail='Evidence → decision';}if(n.type==='alert'){subtitle=n.params.active===null?'Alert status unknown':n.params.active?'Heat alert is active':'No active heat alert';detail=n.params.date;}if(n.type==='measure_distance'){detail='Kilometers · straight-line';}if(n.type==='output'){subtitle={table:'Table with supporting evidence',bars:'Grouped result counts',map:'Map of results and locations'}[n.params.view];detail='Creates a Results tab';}if(n.type==='study_area'){const p=n.params;subtitle=p.source==='drawn'?(p.geometry?`Drawn ${p.selectionMode==='bbox'?'box':'polygon'}`:'No boundary selected yet'):(p.dataset||'Source dataset');detail=p.source==='drawn'&&!p.geometry?'Select it on the map':'CRS84';}if(n.type==='point_grid'){subtitle=`Regular grid · ${n.params.spacingM} m`;detail='Demonstration points';}if(n.type==='facilities'){subtitle=`Search within ${n.params.radiusKm} km`;detail='Historical registry · 214 points';}if(n.type==='xpert'){subtitle='Named evidence → facility type';detail='NB06 hierarchy · N3';}if(n.type==='access'){subtitle=`${n.params.minimumEvidence} evidence · ${n.params.service==='onsite'?'onsite':'incl. referral'}`;detail=`Straight-line proxy · ${n.params.speedMPerMin} m/min`;}if(n.type==='access_policy'){subtitle=`Review proxy time > ${n.params.thresholdMin} min`;detail='N3 · missing stays unknown';}if(n.type==='facility_audit'){subtitle='Service, evidence, and references';detail='All candidate facilities';}const alert=badgeFor(n.id);return {flagged:!!nodeAlert(n.id),definition:{...TYPES[n.type],inputs:nodeInputs(n),output:outputOf(n)},
    connectedPorts:workflow.edges.filter(e=>e.to===n.id).map(e=>e.port),
    availablePorts:nodeInputs(n).filter(([,type])=>workflow.nodes.some(x=>x.id!==n.id&&outputOf(x)===type)).map(([port])=>port),
    type:n.type,label:n.params.label||TYPES[n.type].title,subtitle,detail,status,glow:justFinished.has(n.id),alert:alert?alertHeadline(alert):undefined};}
function render(){
  const url=new URL(location.href);url.searchParams.set('example',exampleKey(workflow));window.history.replaceState(null,'',url);
  renderLibrary($('#node-search').value);
  const old=exampleKey(workflow)==='old-naledi';$('#example-select').value=old?'old-naledi':'heat';$('#project-title').textContent=workflow.name||'Untitled workflow';$('#project-description').textContent=old?'Explore diagnostic access, evidence strength, and the assumptions connecting them.':'Connect geography to evidence. Make every decision explainable.';$('#example-note').textContent=old?'Source boundary + historical facilities · generated sample locations · straight-line access proxy':'Synthetic neighborhoods and cooling centers · illustrative screening rule';$('#canvas-example').textContent=old?'OLD NALEDI · WORKED EXAMPLE 02':'HEAT OUTREACH · DEMO 01';$('#footer-context').textContent=old?'Source snapshot 7f183843 · synthetic sample locations':'CRS84 coordinates · geodesic approximation · synthetic data';
  if(exampleKey(workflow)==='blank'){$('#example-select').value='blank';$('#project-description').textContent='Developmental evaluation · define a study area and inspect its semantic representation.';$('#example-note').textContent='Experiment 01 · draw → inspect facts → run the rule';$('#canvas-example').textContent='STUDY AREA · EXPERIMENT 01';$('#footer-context').textContent='User-defined study area · CRS84 · local reasoning';}
  if(exampleKey(workflow)==='coverage'){$('#example-select').value='coverage';$('#project-description').textContent='Developmental evaluation · inspect spatial exceptions, exclude with a reason, or revise the boundary.';$('#example-note').textContent='Synthetic points and illustrative boundary · no patient data';$('#canvas-example').textContent='SPATIAL COVERAGE · EXPERIMENT';$('#footer-context').textContent='Synthetic coverage exercise · CRS84 · boundary included';}
  if(exampleKey(workflow)==='rulesets'){$('#example-select').value='rulesets';$('#project-description').textContent='How a rule is put together, four times over: two workflows band Snow\u2019s data as he recorded it \u2014 Table 1 by the deaths on each date, the mapped locations by the deaths at each address \u2014 and two run the identical rules over damaged copies of the same data.';$('#example-note').textContent='Four workflows on one canvas. A and B use Snow\u2019s data as recorded; C and D are SIMULATED damage, and say so on the input: three dates with no count, and a quarter of the counts written as text. C and D apply the same rules as A and B, so everything that differs is the data \u2014 and the step says what it could not read rather than banding those records Unrecorded in silence.';$('#canvas-example').textContent='RULESETS \u00b7 HOW A RULE IS PUT TOGETHER';$('#footer-context').textContent='Authored rules \u00b7 compiled to N3 \u00b7 declared field bindings';}
  if(exampleKey(workflow)==='raster'){$('#example-select').value='raster';$('#project-description').textContent='Prepare a local raster, preview and adjust the clipping boundary, then run and inspect the clipped result.';$('#example-note').textContent='1 Prepare raster / 2 Preview and adjust / 3 Run workflow';$('#canvas-example').textContent='OLD NALEDI / RASTER CLIPPING';$('#footer-context').textContent='Native raster cells / adjustable polygon mask / local file and source citation';}
  if(exampleKey(workflow)==='sea-level'){$('#example-select').value='sea-level';$('#project-description').textContent='Published AR6 sea-level projections against real Manila health facilities: which gauge, how far away.';$('#example-note').textContent='Projections are IPCC AR6, CC BY 4.0, in millimetres against the 1995\u20132014 baseline. Facilities are OpenStreetMap, ODbL. No elevation is supplied, so nothing here is compared against one \u2014 and none of it is an inundation model.';}
  if(exampleKey(workflow).startsWith('snow-')){$('#example-select').value=exampleKey(workflow);$('#project-description').textContent='Historical pump and death-location tables; explicit metric catchment computations and source evidence.';$('#example-note').textContent='250 locations / 489 deaths; network is a modern OSM snapshot, not 1854 streets';$('#canvas-example').textContent='JOHN SNOW / CATCHMENT WORKED EXAMPLE';$('#footer-context').textContent='CRS84 inputs and outputs / UTM computation / method parameters in evidence';}
  if(exampleKey(workflow)==='snow-geoprivacy'){$('#project-description').textContent='Compare private source points with moved points and H3 cell aggregates.';$('#example-note').textContent='Before views and workflow exports contain source coordinates; after views are educational transformations, not privacy guarantees';$('#canvas-example').textContent='JOHN SNOW / GEOPRIVACY EXPERIMENT';$('#footer-context').textContent='CRS84 · seeded donut · H3 aggregation · hide and map encryption remain TODO';}
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
    :dirty?(result?'Changed · rerun to update':'Ready to run'):'✓ Run complete';
  $('#run-button').disabled=busy;$('#run-button').innerHTML=busy?'◌ Running…':'<span>▶</span> Run workflow';
  $('#run-summary').textContent=result?(dirty?'Previous run · settings have changed':`${result.outputs.length} outputs · ${lastRunMs===null?'':`ran in ${elapsedText(lastRunMs)} · `}${Math.round(result.trace.reduce((a,t)=>a+t.milliseconds,0))} ms computing`):'Run the workflow to see results';
  if(exampleKey(workflow)==='snow-geoprivacy')$('#run-summary').textContent=result?'Private project and run evidence contain original coordinates. Derived tabs are educational; review before sharing.':'Private source coordinates are included in this workflow.';
  $('#example-select').disabled=busy;document.body.classList.toggle('busy',busy);flow?.setBusy(busy);renderInspector();
  $('#run-button').disabled=busy||!workflow.nodes.length;$('#new-workflow').disabled=busy;$('#reset-example').disabled=busy||!workflow.nodes.length;$('#tidy-button').disabled=busy||workflow.nodes.length<2;
  if(!workflow.nodes.length)$('#workflow-state').textContent='Add Study area to begin';
  renderN3();
  renderCoverageAlert();
}
function describeNode(n:WorkflowNode,status?:string):NodeDescription{const d=describe(n,status);if(n.type==='isochrone'){d.subtitle=(n.params.thresholds?.length?n.params.thresholds.join(', '):n.params.minutes)+' min / '+n.params.speedMPerMin+' m per min';d.detail=n.params.direction+' / '+n.params.bufferM+' m corridor';}if(n.type==='mean_center'){d.subtitle='Unweighted center of point locations';d.detail='UTM zone '+n.params.zone+(n.params.hemisphere==='north'?'N':'S')+' → CRS84';}if(n.type==='compare_point_sets'){d.subtitle='Original + moved + two centers + pumps';d.detail=`UTM zone ${n.params.zone}${n.params.hemisphere==='north'?'N':'S'} · metres`;}if(n.type==='comparison_map'){d.subtitle='Side-by-side maps · shared extent';d.detail='Private evaluation view';}if(n.type==='buffer_area')d.detail=n.params.distanceM+' m acquisition buffer';if(['map_output','table_output','chart_output'].includes(n.type)&&'inputMode' in n.params&&n.params.inputMode==='polygons'){d.subtitle='Display polygon geometry and existing summaries';d.detail='Creates a Results tab';}if(n.type==='map_output'&&n.params.inputMode==='raster'){d.subtitle='Native raster cells and clipping boundary';d.detail='GeoTIFF download';}if(n.type==='table_input'){d.subtitle=n.params.keys.length?`${n.params.keys.length} key columns -> ${n.params.valueField}`:'Choose key and value columns';d.detail=n.params.data.rows.length?`${n.params.data.rowCount} rows`:'Import a long-format CSV';}if(n.type==='reproject'){d.subtitle=`CRS84 degrees \u2192 EPSG:${n.params.hemisphere==='south'?32700+n.params.zone:32600+n.params.zone} metres`;d.detail='Projects connected points';}if(n.type==='raster_input')d.detail=n.params.asset?`${n.params.asset.metadata.width} x ${n.params.asset.metadata.height} retained cells`:'Prepare GeoTIFF input';if(n.type==='study_area'&&n.params.source==='drawn'){d.subtitle=n.params.geometry?`${n.params.selectionMode==='bbox'?'Bounding box':'Polygon'} · ${n.params.geometry.coordinates[0].length-1} vertices`:'Choose a boundary on the map';d.detail=n.params.geometry?'GeoJSON → N3 · CRS84':'Not configured';}if(n.type==='measure_area'){d.subtitle='Study area → study area + area';d.detail=`${AREA_UNITS[n.params.unit].symbol} · spherical calculation`;}return d;}
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
function candidateFields(workflow:Workflow,nodeId:string){
  // Any incoming edge, not only one on a port called `subjects`. A step converted from a
  // declared ruleset keeps that ruleset's port names -- `polygons` for extent-review -- and
  // looking only for `subjects` found nothing, so the editor opened with no columns to read.
  const edge=workflow.edges.find(e=>e.to===nodeId&&e.port==='subjects')
    ??workflow.edges.find(e=>e.to===nodeId);
  const source=edge&&workflow.nodes.find(n=>n.id===edge.from);
  const data=(source?.params as {data?:{features?:{properties?:Record<string,unknown>}[]}}|undefined)?.data;
  const seen=new Map<string,Set<string>>();
  for(const feature of data?.features?.slice(0,200)??[])
    for(const [key,value] of Object.entries(feature.properties??{})){
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
function authorRulesOn(nodeId:string,label:string){
  change(w=>{
    const target=getNode(w,nodeId,'apply_ruleset');
    const held=target.params.ruleset;
    const pin=pinnedRuleset('urn:fieldwork:ruleset:outreach-criteria','1.0.0');
    target.params.ruleset={id:pin!.id,version:pin!.version,title:'Rules written in this workflow',
      inputs:held?.inputs??[['subjects','points']],output:held?.output??'points'};
    target.params.parameters={};
    target.params.authored={title:label||'Rules for this step',mustNotBeReadAs:'',
      // The columns the connected records carry, declared for them. Nothing is guessed from a
      // name -- the kinds come from the values -- and an empty list is the honest result when
      // nothing is connected yet, which the Inspector already says plainly.
      fields:candidateFields(w,nodeId) as never,parameters:[],rules:[]};
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
      note:`These are the rules ${ruleset.title} ${ruleset.version} applies, laid out the way rules you write are laid out. `
        +`Nothing here can be changed: this ruleset is published and pinned, and the run evidence names it by version.`});
  });
  optionalElement('#author-rules')?.addEventListener('click',async()=>{
    authorRulesOn(node.id,node.params.label??'');
    const authored=getNode(workflow,node.id,'apply_ruleset').params.authored;
    if(!authored)return;
    const edited=await openRuleEditor(authored,esc);
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
  const allowed=addableTypes({exampleKey:exampleKey(workflow),
    templateTypes:template(exampleKey(workflow)).nodes.map(n=>n.type),
    workflowTypes:workflow.nodes.map(n=>n.type),catchmentTypes:Object.keys(CATCHMENT_TYPES)});
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
    const type=b.dataset.add as NodeType,sample=structuredClone(type==='apply_ruleset'?{type:'apply_ruleset' as const,params:{label:'Apply ruleset',parameters:{}}}
      :type==='travel_time'?{type:'travel_time' as const,params:{label:'Travel time from distance',speedMPerMin:70}}:type==='point_grid'?{type:'point_grid' as const,params:{spacingM:250}}:type==='mean_center'?{type:'mean_center' as const,params:{label:'Mean center',zone:30,hemisphere:'north' as const}}:type==='compare_point_sets'?{type:'compare_point_sets' as const,params:{label:'Mean-center displacement',zone:30,hemisphere:'north' as const}}:type==='comparison_map'?{type:'comparison_map' as const,params:{label:'Point comparison map'}}:type==='donut_geomask'?{type:'donut_geomask' as const,params:{label:'Donut geomasking',innerM:50,outerM:125,seed:42}}:type==='hex_aggregate'?{type:'hex_aggregate' as const,params:{label:'H3 cell aggregation',resolution:9,minOccupancy:2}}:type==='buffer_area'?{type:'buffer_area' as const,params:{label:'Buffered acquisition area',distanceM:500}}:type==='network_input'?{type:'network_input' as const,params:{label:'Street network',data:{nodes:[],edges:[],source:'Not prepared'},inputMethod:'file' as const,marginM:250}}:Object.hasOwn(CATCHMENT_TYPES,type)?[...johnSnowExample('snow-voronoi').nodes,...johnSnowExample('snow-isochrone').nodes].find(n=>n.type===type):type==='rate'?{type:'rate' as const,params:{label:'Rate with a denominator',numeratorField:'',denominatorField:'',denominatorUnit:'people' as const,rateKind:'proportion' as const,multiplier:100,minimumDenominator:20,numeratorPeriod:'',denominatorVintage:''}}:type==='case_series'?{type:'case_series' as const,params:{label:'Cases by period',dateField:'',dateKind:'onset' as const,period:'week' as const}}:type==='slr_extract_import'?{type:'slr_extract_import' as const,params:{label:'Sea-level projection extract',datasetIRI:'',datasetVersion:'',baselinePeriod:'',citations:['','',''],basisKind:'' as const,familyValues:{withVerticalLandMotion:'',withoutVerticalLandMotion:''}}}:type==='slr_site_assignment'?{type:'slr_site_assignment' as const,params:{label:'Assign projection site'}}:type==='slr_threshold_comparison'?{type:'slr_threshold_comparison' as const,params:{label:'Compare level to elevation',scenario:'',basis:'',family:'',year:'',quantile:'',elevationField:'',verticalDatum:'',elevationReference:'' as const}}:type==='table_input'?{type:'table_input' as const,params:{label:'Tabular data',keys:[],valueField:'',data:{kind:'data-table' as const,keys:[],valueField:'',rows:[],rowCount:0,missingValueCount:0}}}:type==='reproject'?{type:'reproject' as const,params:{label:'Reproject points',zone:35,hemisphere:'south' as const}}:type==='raster_input'?{type:'raster_input' as const,params:{label:'Raster input'}}:type==='fill_interior_gaps'?{type:'fill_interior_gaps' as const,params:{label:'Filled gaps'}}:type==='stack_polygons'?{type:'stack_polygons' as const,params:{label:'Collected bands'}}:type==='travel_time_band'?{type:'travel_time_band' as const,params:{label:'Travel time band',minutes:5}}:type==='reachable_corridor'?{type:'reachable_corridor' as const,params:{label:'Reachable corridor',bufferM:25,zone:30,hemisphere:'north' as const}}:type==='reachable_nodes'?{type:'reachable_nodes' as const,params:{label:'Reachable junctions',minutes:10,speedMPerMin:80,direction:'outbound' as const,travelMode:'walking' as const}}:type==='snap_to_network'?{type:'snap_to_network' as const,params:{label:'Snap sites to the network',zone:30,hemisphere:'north' as const,maxSnapM:150}}:type==='summarize_combined_area'?{type:'summarize_combined_area' as const,params:{label:'Combined area',zone:30,hemisphere:'north' as const}}:type==='summarize_hull'?{type:'summarize_hull' as const,params:{label:'Area the points cover',zone:30,hemisphere:'north' as const}}:type==='find_health_facilities'?{type:'find_health_facilities' as const,params:{label:'Find health facilities',source:'openstreetmap-live' as const,kinds:['hospital','clinic'],requireName:true,country:'PHL',minConfidence:0.7,data:null,retrieved:null}}:type==='buffer_point'?{type:'buffer_point' as const,params:{label:'Area around a point',pointId:'',distanceM:5000}}:type==='sample_raster'?{type:'sample_raster' as const,params:{label:'Sample raster at points',attribute:'',valueUnit:''}}:type==='clip_raster'?{type:'clip_raster' as const,params:{label:'Clipped raster',method:'all-touched' as const,marginPixels:0}}:type==='chart_output'?{type:'chart_output' as const,params:{label:'Chart'}}:type==='table_output'?newTableOutput():type==='map_output'?newMapOutput():type==='point_input'?newObservations():type==='coverage_check'?newCoverageCheck():type==='measure_area'?newAreaMeasurement():['blank','coverage'].includes(exampleKey(workflow))&&type==='study_area'?newStudyArea():template(exampleKey(workflow)).nodes.find(n=>n.type===type));
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

function renderInspector(){
  if(selected?.startsWith('result:')){renderEvidence(selected.slice(7));return;}
  if(exampleKey(workflow)==='blank'&&!workflow.nodes.some(n=>n.id===selected)){$('#inspector-content').innerHTML='<div class="inspector-body"><span class="inspector-section">Developmental evaluation · step 1</span><h2>Define the study area</h2><p class="description">Add Study area, then select the node to draw a bounding box or polygon on an online map.</p><div class="rule-preview">Predict what the selection will produce, inspect the N3 facts, then run the readiness rule.</div><p class="muted">Your other worked examples remain saved separately.</p></div>';return;}
  const n=workflow.nodes.find(n=>n.id===selected);if(!n){$('#inspector-content').innerHTML=`<div class="inspector-body"><h2>Your analysis, connected.</h2><p class="description">Choose a node to inspect its settings, or select a result to inspect its evidence.</p><div class="notice">${exampleKey(workflow).startsWith('snow-')?'Historical case-study locations; modeled catchments. Inspect a processing node to compare its assumptions.':exampleKey(workflow)==='old-naledi'?'Real source boundary and historical facilities; generated sample locations. Select Facility access to explore the assumptions.':'The heat example uses synthetic neighborhoods and illustrative screening criteria.'}</div></div>`;return;}
  let content=title(n)+`<p class="description">${esc(n.type==='map_output'&&n.params.inputMode==='raster'?'Display native raster cells and the clipping boundary':TYPES[n.type].description)}. ${n.type==='policy'?'Turn computed spatial evidence into explicit, inspectable conclusions.':''}</p>`;
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
  content+=manualButton(n.type,esc)+diveDeeperPanel(n.type,esc);
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
    content+=`<div class="notice">Unweighted mean of projected point locations. The computation uses UTM internally and emits one CRS84 center; it does not create a projected point dataset. Keep source and result private when locations are sensitive.</div><label class="field-label" for="mean-center-zone">WGS84 UTM zone</label><input id="mean-center-zone" type="number" min="1" max="60" value="${n.params.zone}"><label class="field-label" for="mean-center-hemisphere">Hemisphere</label><select id="mean-center-hemisphere"><option value="north" ${n.params.hemisphere==='north'?'selected':''}>North</option><option value="south" ${n.params.hemisphere==='south'?'selected':''}>South</option></select><label class="field-label" for="mean-center-points">Point input</label><select id="mean-center-points" data-map-port="points"><option value="">Select input</option>${workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)==='points').map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port==='points'&&e.from===x.id)?'selected':''}>${esc(x.params.label||x.id)}</option>`).join('')}</select>`;
  }else if(n.type==='compare_point_sets'||n.type==='comparison_map'){
    if(n.type==='compare_point_sets')content+=`<div class="notice">Connect a Mean center widget to each branch. Both centers must use this UTM CRS and have matching source counts. Original and moved locations stay private.</div><label class="field-label" for="comparison-zone">WGS84 UTM zone</label><input id="comparison-zone" type="number" min="1" max="60" value="${n.params.zone}"><label class="field-label" for="comparison-hemisphere">Hemisphere</label><select id="comparison-hemisphere"><option value="north" ${n.params.hemisphere==='north'?'selected':''}>North</option><option value="south" ${n.params.hemisphere==='south'?'selected':''}>South</option></select><p class="description">Distances to the nearest pump and between centers are measured in metres. Pump locations are geographic context.</p>`;
    else content+='<div class="notice">Private evaluation map: both panels share one extent and scale. This view displays existing comparison results and includes original coordinates.</div>';
    content+=nodeInputs(n).map(([port,type])=>`<label class="field-label" for="comparison-port-${port}">${({original:'Original points',moved:'Moved points',pumps:'Reference pumps',originalCenter:'Original mean center',movedCenter:'Moved mean center',comparison:'Comparison result'} as Record<string,string>)[port]}</label><select id="comparison-port-${port}" data-map-port="${port}"><option value="">Select input</option>${workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)===type).map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port===port&&e.from===x.id)?'selected':''}>${esc(x.params.label||x.id)}</option>`).join('')}</select>`).join('');
  }else if(n.type==='donut_geomask'||n.type==='hex_aggregate'){
    content+=`<div class="notice">Educational transformation only. The private source remains in the project and run evidence. No anonymity claim.</div>`;
    content+='<details><summary>How does this geoprivacy method work? (?)</summary><p>See the <a href="https://git.cdc.gov/jupyterlite/2026-Map-Encryption-Library" target="_blank" rel="noopener noreferrer">geoprivacy notebooks</a> for worked examples and evaluation. Map encryption and its calibration controls are planned, not executable here.</p></details>';
    if(n.type==='donut_geomask')content+=`<label class="field-label" for="privacy-innerM">Inner radius (m)</label><input id="privacy-innerM" type="number" min="0" max="5000" value="${n.params.innerM}"><label class="field-label" for="privacy-outerM">Outer radius (m)</label><input id="privacy-outerM" type="number" min="1" max="5000" value="${n.params.outerM}"><label class="field-label" for="privacy-seed">Demonstration seed</label><input id="privacy-seed" type="number" min="0" max="4294967295" value="${n.params.seed}"><p class="description">Output names and IDs are generated afresh; original attributes are not copied. The seeded generator is predictable and unsuitable as a production privacy control.</p>`;
    else content+=`<label class="field-label" for="privacy-resolution">H3 resolution</label><input id="privacy-resolution" type="number" min="0" max="15" value="${n.params.resolution}"><label class="field-label" for="privacy-minOccupancy">Minimum locations per released cell</label><input id="privacy-minOccupancy" type="number" min="2" max="100" value="${n.params.minOccupancy}"><p class="description">Counts locations, not deaths. Sparse cells are omitted; occupancy alone does not establish anonymity.</p>`;
    content+=`<label class="field-label" for="privacy-point-source">Point input</label><select id="privacy-point-source" data-map-port="points"><option value="">Select input</option>${workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)==='points').map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port==='points'&&e.from===x.id)?'selected':''}>${esc(x.params.label||x.id)}</option>`).join('')}</select>`;
  }else if(Object.hasOwn(CATCHMENT_TYPES,n.type)||n.type==='buffer_area'){
    if(n.type==='buffer_area')content+='<label class="field-label" for="catchment-distanceM">Buffer distance (metres)</label><input type="number" id="catchment-distanceM" data-catchment-param="distanceM" min="0" max="5000" value="'+n.params.distanceM+'"><p class="notice">Connect this expanded boundary to Street network. Keep the original Study area for reporting and polygon clipping. A buffer reduces edge effects but does not guarantee complete access coverage.</p>';
    // The study area is handed to the Inspector so a downloaded network can be seen against the
    // ground it was asked for. previewArea throws when nothing is connected, which is a legitimate
    // state: the caption then says coverage is unknown rather than implying it is complete.
    let previewBoundary;
    try{previewBoundary=n.type==='network_input'?previewArea(workflow,n.id).boundary:undefined;}catch{previewBoundary=undefined;}
    content+=catchmentInspector(n,esc,previewBoundary)+nodeInputs(n).map(([port,type])=>`<div class="field"><label class="field-label" for="catchment-port-${port}">${esc(port)}</label><select id="catchment-port-${port}" data-map-port="${port}"><option value="">Select input</option>${workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)===type).map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port===port&&e.from===x.id)?'selected':''}>${esc(x.params.label||TYPES[x.type].title)}</option>`).join('')}</select></div>`).join('');
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

    const outputType=n.type==='table_output'?'table':'map',reasoning=n.params.inputMode==='decisions',raster=false,tabular=n.type==='table_output'&&n.params.inputMode==='table';
    content+=`<div class="field"><label class="field-label" for="output-input-mode">Input mode</label><select id="output-input-mode"><option value="spatial" ${!reasoning&&!raster&&!tabular?'selected':''}>Point layers or spatial coverage</option><option value="polygons">Catchment polygons / summaries</option><option value="decisions" ${reasoning?'selected':''}>Reasoning results</option>${n.type==='table_output'?`<option value="table" ${tabular?'selected':''}>Tabular data</option>`:''}</select><small>Changing mode removes existing input connectors; Undo restores them.</small></div>`;
    if(reasoning)content+=`<div class="field"><label class="field-label" for="output-view">Display as</label><select id="output-view"><option value="map" ${outputType==='map'?'selected':''}>Map</option><option value="table" ${outputType==='table'?'selected':''}>Table</option><option value="bars">Chart</option></select></div>`;
    content+=`<div class="field"><label class="field-label" for="${outputType}-label">Results tab name</label><input id="${outputType}-label" maxlength="60" value="${esc(n.params.label)}"></div><p class="description">${tabular?'Connect a Tabular data source. The key columns and the value column are displayed as imported; no geometry is implied and no value is converted.':raster?'Connect Raster input or Clip raster. The native grid is displayed with its clipping boundary.':reasoning?'Connect an existing reasoning result. Decisions, missing evidence and supporting references are retained.':outputType==='table'?'Connect point data directly; no study area is required. Or connect a coverage result to include spatial relations and review decisions.':'Connect a study area and points, or use a coverage check that already contains both.'}${!reasoning&&!raster?' Connecting a coverage result or raster replaces the separate inputs; Undo restores them.':''}</p>`;
    content+=nodeInputs(n).map(([port,type])=>{const edge=workflow.edges.find(e=>e.to===n.id&&e.port===port);return `<div class="field"><label class="field-label" for="${outputType}-${port}">${({area:'Study area',coverage:'Or: spatial coverage check',decisions:'Reasoning result',table:'Tabular data',raster:raster?'Raster':'Or: Raster',network:'Street network'}[port]||'Point data '+(port==='points'?1:port.split('_')[1]))}</label><select id="${outputType}-${port}" data-map-port="${port}"><option value="">Select input</option>${workflow.nodes.filter(x=>outputOf(x)===type).map(x=>`<option value="${esc(x.id)}" ${edge?.from===x.id?'selected':''}>${esc(x.params.label||TYPES[x.type].title)} · ${esc(x.id)}</option>`).join('')}</select></div>`;}).join('');
    content+=tabular?'<div class="notice">Rows are shown as imported, with absent values displayed as unknown and an unstated unit named as unstated. Search covers every key column and the value. Works offline.</div>':raster?'<div class="notice">Colors show relative cell values; gray cells are NoData. Download GeoTIFF preserves native values and georeferencing.</div>':reasoning?'<div class="notice">This is a presentation of existing results, with no new inference or exclusion.</div>':outputType==='table'?'<div class="notice">Rows include coordinates and all point attributes. Missing coordinates and excluded records remain visible. Search covers all rows and attributes; large tables use row and attribute pages. Works offline.</div>':'<div class="notice">The map fits the polygon and every located point, including outside records. Missing coordinates appear in a selectable list. This local map works offline.</div>';
    // map_output has its own branch above; this one is table_output alone.
  }else if(n.type==='table_input'){
    const p=n.params;
    content+='<section class="source-card"><span class="inspector-section">Table contract</span>'
      +`<div class="detail-row"><span>Key columns</span><strong>${p.keys.length?esc(p.keys.join(', ')):'none chosen'}</strong></div>`
      +`<div class="detail-row"><span>Value column</span><strong>${p.valueField?esc(p.valueField):'none chosen'}</strong></div>`
      +`<div class="detail-row"><span>Unit</span><strong>${p.unit?esc(p.unit):'unstated'}</strong></div>`
      +'<div class="detail-row"><span>Geometry</span><strong>None; a table is not a point set</strong></div>'
      +'</section><button id="open-table" class="button primary">Import tabular data</button>'
      +(p.data.rows.length&&!workflow.edges.some(e=>e.from===n.id)?'<div class="inspector-actions"><button id="add-table-view" class="button small">＋ Display as table</button></div>':'')
      +'<p class="description">Reads a long-format CSV: one row per observation, with the key columns you choose and one value column. Every key tuple must be unique, so a wide table or a missing key column is refused rather than silently collapsed.</p>';
    // The table itself, at a width it can be read at. The Inspector is 292px wide and this
    // offered a description of the table's shape inside it -- everything about the table except
    // the table. The practitioner's call, 2026-10-16.
    if(p.data.rows.length)content+=`<div class="inspector-actions"><button id="quick-look" class="button">Quick look at the table</button>`
      +`<button id="table-quality" class="button">Data quality</button></div>`
      +`<p>${esc(p.source?.filename||'Imported file')}<br>${p.data.rowCount} rows, ${p.data.missingValueCount} values absent and kept as unknown.</p><details><summary>Table shape</summary><pre>${esc(JSON.stringify({keys:p.data.keys,valueField:p.data.valueField,unit:p.data.unit||'(unstated)',rows:p.data.rowCount,source:p.source},null,2))}</pre></details>`;
    else content+='<p class="description">No table imported yet. This node cannot run until a table is imported.</p>';
    content+='<div class="notice">A unit is recorded as you state it and never inferred. An absent value is kept as unknown, never read as zero. Connect a Table output to display it.</div>';
  }else if(n.type==='rate'){
    const p=n.params;
    const field=(id:string,label:string,key:string,value:string,placeholder='')=>`<div class="field"><label class="field-label" for="${id}">${label}</label><input id="${id}" data-slr="${key}" maxlength="80" value="${esc(value)}" placeholder="${esc(placeholder)}"></div>`;
    content+='<p class="description">Divides counted events by a declared population at risk. What the denominator counts is part of the result.</p>'
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
      +'<div class="notice">A rate whose denominator is unstated cannot be compared with any other rate: deaths per house is not a mortality rate. A proportion cannot exceed one and is refused if it does; a ratio of events per unit can. Groups below the stated minimum report their counts and no rate, because a rate from a handful of units is unstable rather than precise. The two vintages are recorded and compared, since a numerator and a denominator measured at different times describe different populations.</div>';
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
  }else if(n.type==='find_health_facilities'){
    const p=n.params,descriptor=FACILITY_SOURCES[p.source];
    content+='<p class="description">Health facilities inside the study area, from a source this application can actually reach. Both sources are OpenStreetMap-derived and both are under the Open Database License.</p>'
      +`<div class="field"><label class="field-label" for="hf-source">Source</label><select id="hf-source" data-hf="source">`
      +FACILITY_SOURCE_KEYS.map(key=>`<option value="${key}"${p.source===key?' selected':''}>${esc(FACILITY_SOURCES[key].label)}</option>`).join('')
      +'</select></div>'
      +`<div class="notice">${esc(descriptor.detail)}</div>`
      +(descriptor.needsCountry
        ?`<div class="field"><label class="field-label" for="hf-country">Country (three-letter ISO code)</label><input id="hf-country" data-hf="country" maxlength="3" value="${esc(p.country)}" placeholder="PHL"></div>`
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
  }else if(n.type==='raster_input'||n.type==='clip_raster'){
    content+=nodeInputs(n).map(([port,type])=>`<div class="field"><label class="field-label" for="raster-${port}">${port==='area'?'Study area':'Raster input'}</label><select id="raster-${port}" data-map-port="${port}"><option value="">Select input</option>${workflow.nodes.filter(x=>x.id!==n.id&&outputOf(x)===type).map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port===port&&e.from===x.id)?'selected':''}>${esc(x.params.label||TYPES[x.type].title)}</option>`).join('')}</select></div>`).join('');
    if(n.type==='raster_input'){content+='<button id="prepare-raster" class="button primary">Prepare GeoTIFF input</button><p class="description">Acquire a rectangular window and enter source metadata/citation. Reopen to edit metadata without re-uploading. Use Clip raster to apply the polygon mask.</p>';if(n.params.asset)content+=`<p>${esc(n.params.asset.source.filename)}<br>${n.params.asset.source.metadata.width} x ${n.params.asset.source.metadata.height} source cells; retained ${n.params.asset.metadata.width} x ${n.params.asset.metadata.height}.</p><details><summary>GeoTIFF metadata and source</summary><pre>${esc(JSON.stringify(n.params.asset,null,2))}</pre></details>`;}else content+='<section class="source-card" data-clip-parameters><span class="inspector-section">Processing parameters</span><div class="detail-row"><span>Cutline</span><strong>Separate clip boundary</strong></div><div class="detail-row"><span>Inclusion rule</span><strong>Configured below</strong></div><div class="detail-row"><span>Resolution</span><strong>Native pixels</strong></div><div class="detail-row"><span>Outside polygon</span><strong>NoData</strong></div><p>Start with a copy of Study area, then save adjustments on this operation. Study area remains unchanged. Map displays the result.</p></section><button id="preview-raster-clip" class="button primary">Preview and adjust</button><button id="add-raster-map" class="button">Add raster map</button>';
    if(n.type==='clip_raster'){content+='<div class="field"><label class="field-label" for="clip-method">Pixel inclusion</label><select id="clip-method"><option value="all-touched" '+(n.params.method==='all-touched'?'selected':'')+'>All touched</option><option value="cell-center" '+(n.params.method==='cell-center'?'selected':'')+'>Cell center inside</option></select><label class="field-label" for="clip-margin">Outer margin (native pixels, 0-1)</label><input id="clip-margin" type="number" min="0" max="1" step="0.25" value="'+(n.params.marginPixels||0)+'"><small>All touched includes a cell when the boundary covers part of its area or crosses it, so a boundary running exactly along a cell border does not pull in the cell outside it. This matches GDAL except where a boundary vertex lies exactly on a cell border. For an outward margin, prepare the GeoTIFF with one pixel of extra source coverage; a margin is a grid distance with no GDAL equivalent. NoData is never filled.</small></div>';content+='<p class="description">'+(n.params.cutline?'Saved clip boundary; independent of Study area edits.':'Boundary will be initialized from the connected Study area.')+'</p><button id="reset-clip-boundary" class="button small" '+(!n.params.cutline?'disabled':'')+'>Use Study area boundary</button>';if(n.params.cutline)content+='<div class="source-card"><span class="inspector-section">Clip extent (degrees)</span>'+geometryBounds(n.params.cutline.geometry).map((value,i)=>'<div class="detail-row"><span>'+['West','South','East','North'][i]+'</span><strong>'+value.toFixed(6)+'</strong></div>').join('')+'</div>';}
  }else if(n.type==='study_area'){
    content+=`<form id="study-area-label-form" class="field"><label class="field-label" for="study-area-label">Study area label</label><input id="study-area-label" maxlength="100" required value="${esc(n.params.label||'My study area')}"><button type="submit" class="button small">Apply label</button></form>`;
    content+=n.params.source==='drawn'?`<div class="source-card"><span class="inspector-section">${n.params.geometry?'Selected geometry':'No geometry yet'}</span><h3>${esc(n.params.label)}</h3><p>${n.params.geometry?`${n.params.selectionMode==='bbox'?'Bounding box':'Polygon'} · ${n.params.geometry.coordinates[0].length-1} vertices`:'Draw a bounding box or polygon on the online map.'}</p></div><p class="description">The shape is stored in longitude, latitude order. Applying it generates N3 facts; Run workflow evaluates the readiness rule.</p>`:oldInspector(n);
    content+=`<button id="edit-study-area" class="button primary">${n.params.geometry?'Edit area on map':'Select area on map'}</button>${n.params.geometry?'<button id="area-view-n3" class="text-button">Inspect N3 facts and rule ↗</button>':''}<div class="notice">Evaluation prompt: what should the next workflow node receive from this selection?</div>`;
  }else if(n.type==='point_input'){
    if(n.sourceMigration)content+=`<p class="notice">${n.sourceMigration.fromType==='output'
      ?`The retired <strong>Visual output</strong> widget was replaced by ${TYPES[n.type].title}, chosen from the view this node saved. Its name and connections are retained.`
      :`This saved example source now uses the shared Input data editor. Its label, records and connections are retained.`}</p>`;
    content+=`<div class="field"><label class="field-label" for="source-label">Source label</label><input id="source-label" maxlength="60" value="${esc(n.params.label||'Input data')}"></div><div class="source-card"><h3>${n.params.data.features.length} point records</h3><p>${esc(n.params.sourceInfo?.format||'Local input')} · ${n.params.data.features.filter(f=>!f.geometry).length} missing locations</p></div><button id="edit-input-data" class="button primary">Prepare input data</button>${recordsPanel(n.id,n.params.data)}<p class="description">Generate synthetic points, import CSV / GeoPackage / GeoJSON, or place pushpins with forms. Connect to Check spatial coverage before deciding how to handle outside records.</p>`;
  }else if(n.type==='coverage_check'){
    content+=nodeInputs(n).map(([port])=>{const input=workflow.edges.find(e=>e.to===n.id&&e.port===port);return `<div class="field"><label class="field-label" for="coverage-${port}">${port==='area'?'Study area':'Point data '+(port==='points'?1:port.split('_')[1])}</label><select id="coverage-${port}" data-coverage-port="${port}"><option value="">Select input</option>${workflow.nodes.filter(x=>outputOf(x)===(port==='area'?'area':'points')).map(x=>`<option value="${esc(x.id)}" ${input?.from===x.id?'selected':''}>${esc(x.params.label||TYPES[x.type].title)} · ${esc(x.id)}</option>`).join('')}</select></div>`;}).join('');content+='<div class="notice">Inside and boundary points are included. Outside or missing-location records require review; they are not automatically classified as data errors.</div><p class="description">Run, then select a record in Coverage review or Coverage map. Exclude with a reason or edit the study boundary. Original input records are preserved.</p>';
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
        if(setting)return `the ${setting} setting below`;
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
        +`<div class="authored-rules">`
        +authored.rules.map((rule,index)=>`<div class="authored-rule">`
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
        +`</div>`
        +`<p class="description">Every rule is checked against every record, so the rules must not disagree: no record may match two rules that reach different conclusions about the same thing. A record matching none keeps no conclusion, and the run evidence counts those.</p>`
        +`<span class="inspector-section">Which column means what</span>`;
      if(authored.fields.length){
        content+=`<table class="inspector-table"><thead><tr><th>Column</th><th>Read as</th><th>Kind</th><th>Unit</th></tr></thead><tbody>`
          +authored.fields.map((field,index)=>`<tr><td>${esc(field.attribute)}</td><td>${esc(field.label||field.attribute)}</td><td>${esc(field.kind)}</td>`
            +`<td>${field.kind==='number'
              ?`<input data-field-unit="${index}" value="${esc(field.unitLabel??'')}" placeholder="minutes" aria-label="Unit for ${esc(field.attribute)}">`
              :'—'}</td></tr>`).join('')
          +`</tbody></table>`
          +`<p class="description">Nothing is guessed from a column name. A record missing one of these is recorded as missing, which is why a rule can conclude Unknown instead of concluding nothing. <strong>A numeric column needs its unit</strong> — a number without one is not a measurement, and the rules will not run until every one of them has it.</p>`;
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
      const UNIT_IRIS:Record<string,string>={minutes:'MIN',minute:'MIN',min:'MIN',hours:'HR',hour:'HR',hr:'HR',seconds:'SEC',second:'SEC',days:'DAY',day:'DAY',metres:'M',meters:'M',m:'M',kilometres:'KiloM',kilometers:'KiloM',km:'KiloM',percent:'PERCENT'};
      document.querySelectorAll<HTMLInputElement>('[data-field-unit]').forEach(el=>
        el.addEventListener('change',()=>change(w=>{
          const field=getNode(w,n.id,'apply_ruleset').params.authored!.fields[Number(el.dataset.fieldUnit)];
          const typed=el.value.trim();
          field.unitLabel=typed||undefined;
          const code=UNIT_IRIS[typed.toLowerCase()];
          field.unit=code?`http://qudt.org/vocab/unit/${code}`:undefined;
        })));
      optionalElement('#edit-rules')?.addEventListener('click',async()=>{
        const edited=await openRuleEditor(authored,esc);
        if(edited)change(w=>{getNode(w,n.id,'apply_ruleset').params.authored!.rules=edited.rules as never;});
      });
      document.querySelectorAll<HTMLInputElement>('[data-ruleset-parameter]').forEach(el=>
        el.addEventListener('change',()=>change(w=>{
          getNode(w,n.id,'apply_ruleset').params.parameters[required(el.dataset.rulesetParameter)]=Number(el.value);})));
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
      +(ruleset.authored
        ?`<p class="description">${esc(ruleset.title)} ${esc(ruleset.version)} is published and pinned, so its rules are not edited here — a reader of this workflow has to be able to tell which rules ran. They can be <strong>read</strong> in the same editor you write your own in.</p>`
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
        :`<p class="description">${esc(ruleset.title)} ${esc(ruleset.version)} is published and pinned. This build carries no structured form of its rules, so they cannot be laid out here. This step can stop applying it and apply rules you write instead; what is wired to the step stays wired, and Undo puts the published ruleset back.</p>`
          +`<div class="inspector-actions"><button id="author-rules" class="button">Write rules for this step instead</button></div>`);
  }else if(n.type==='policy'){
    content+=`<span class="inspector-section">Rule settings</span><div class="field"><label class="field-label" for="threshold">Distance threshold</label><div class="input-unit"><input id="threshold" type="number" min="0" max="1000" step="0.5" value="${n.params.thresholdKm}"><span>km</span></div><small>Flag distances strictly greater than this value.</small></div><div class="rule-preview">When the heat alert is <b>active</b><br>and the nearest center is <b>more than ${n.params.thresholdKm} km away</b>,<br>flag the neighborhood for review.</div><span class="inspector-section">Missing evidence</span><p class="description">Missing coordinates, missing centers, or an unknown alert produce “Insufficient data”.</p><div class="inspector-divider"></div><span class="inspector-section">Execution engine</span><div class="engine-card"><span class="engine-mark">⋈</span><div><strong>EYE-JS · Notation3</strong><small>WebAssembly · runs on this device</small></div></div><div class="notice">Illustrative screening criteria. A flag is a reason to review evidence, not a risk estimate or an intervention order.</div>`;
  }else if(n.type==='alert'){
    content+=`<div class="field"><label class="field-label" for="alert-state">Heat alert status</label><select id="alert-state"><option value="true" ${n.params.active===true?'selected':''}>Active</option><option value="false" ${n.params.active===false?'selected':''}>Inactive</option><option value="null" ${n.params.active===null?'selected':''}>Unknown</option></select><label class="field-label" for="assessment-date">Assessment date</label><input id="assessment-date" type="date" value="${n.params.date}"><small>This example supplies a single alert status for all locations on the assessment date. No external alert feed is queried.</small></div>`;
  }else if((n.type==='places'||n.type==='centers')){
    content+=`<div class="field"><label class="field-label" for="source-label">Source label</label><input id="source-label" maxlength="60" value="${esc(n.params.label)}"></div><div class="detail-row"><span>Records</span><strong>${n.params.data.features.length}</strong></div><div class="detail-row"><span>Coordinates</span><strong>Longitude, latitude · CRS84</strong></div><button id="replace-data" class="button small">↑ Replace with local GeoJSON</button>${recordsPanel(n.id,n.params.data)}<small class="muted">Point FeatureCollections only, up to 2,000 records. Files stay in this browser.</small>`;
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
    if(n.type==='chart_output')content+='<label class="field-label" for="catchment-output-mode">Input mode</label><select id="catchment-output-mode"><option value="decisions">Reasoning results</option><option value="polygons">Catchment summaries</option></select>';
    content+=`<div class="field"><label class="field-label" for="chart-decisions">Reasoning result</label><select id="chart-decisions" data-map-port="decisions"><option value="">Select input</option>${workflow.nodes.filter(x=>outputOf(x)==='decisions').map(x=>`<option value="${esc(x.id)}" ${workflow.edges.some(e=>e.to===n.id&&e.port==='decisions'&&e.from===x.id)?'selected':''}>${esc(x.params.label||TYPES[x.type].title)} · ${esc(x.id)}</option>`).join('')}</select></div><p class="description">Counts every input record once by decision, access zone or evidence tier. Unclassified values are shown separately. Counts and source provenance are included in evidence; sample locations are not population estimates.</p><div class="field"><label class="field-label" for="output-label">Results tab name</label><input id="output-label" maxlength="60" value="${esc(n.params.label||'')}"><label class="field-label" for="output-view">Display as</label><select id="output-view"><option value="map" ${n.type==='output'&&n.params.view==='map'?'selected':''}>Map</option><option value="table" ${n.type==='output'&&n.params.view==='table'?'selected':''}>Table</option><option value="bars" ${n.type==='chart_output'||n.params.view==='bars'?'selected':''}>Bar chart</option></select></div><div class="rule-preview">Each output node creates a named tab in Results. Connect it to the results you want to display, then run the workflow.</div><p class="description">All output branches run together. Shared analysis nodes run once. Select a location in the map or table to inspect its evidence.</p>`;
    if(n.type==='chart_output')content+=chartControls(n);
  }
  if(['study_area','point_input','places','centers','measure_area','coverage_check','map_output','table_output'].includes(n.type))content+='<div class="source-card" data-spatial-reference><span class="inspector-section">Coordinate reference system</span><h3>WGS84 · EPSG:4326</h3><p>Stored coordinates: longitude, latitude in degrees (OGC:CRS84). A source reads degrees or a UTM zone and converts on import; Reproject points projects mid-workflow.</p></div>';
  // A map can always take another point layer: there is no mode in which it cannot draw points.
  if(n.type==='coverage_check'||n.type==='map_output'||(n.type==='table_output'&&(!n.params.inputMode||n.params.inputMode==='spatial')))content+=`<div class="inspector-actions"><button id="add-point-input" class="button small" ${(n.params.pointInputCount??1)>=MAX_POINT_LAYERS?'disabled':''}>＋ Add point input</button><button id="remove-point-input" class="button small" ${(n.params.pointInputCount??1)<=1?'disabled':''}>Remove last input</button></div><p class="muted">${n.type==='table_output'?'No boundary required for point inputs':'One study boundary'} · up to 8 point layers and 2,000 records combined. Each added point port needs a source. Removing the last port also removes its connector; Undo restores it. Adding a point input switches a Map or Table from reviewed input to direct layers.</p>`;
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
  document.querySelectorAll<HTMLButtonElement>('[data-raster-step]').forEach(button=>button.onclick=()=>{selected=button.dataset.rasterStep;render();});
  optionalElement('#manage-references')?.addEventListener('click',()=>{let baseline=JSON.stringify(n.references||[]);openEvidenceEditor(n,refs=>{const current=workflow.nodes.find(x=>x.id===n.id);if(!current||JSON.stringify(current.references||[])!==baseline)throw new Error('The node changed while editing. Close and reopen its references.');const saved=change(w=>{required(w.nodes.find(x=>x.id===n.id)).references=structuredClone(refs);},{requirePersistence:true});if(saved)baseline=JSON.stringify(refs);return saved;});});
  optionalElement('#add-point-input')?.addEventListener('click',()=>change(w=>{const node=required(w.nodes.find(x=>x.id===n.id)) as WorkflowNode<'map_output'|'table_output'|'coverage_check'>;node.params.pointInputCount=(node.params.pointInputCount??1)+1;w.edges=w.edges.filter(e=>!(e.to===n.id&&e.port==='coverage'));}));
  optionalElement('#remove-point-input')?.addEventListener('click',()=>change(w=>{const node=required(w.nodes.find(x=>x.id===n.id)) as WorkflowNode<'map_output'|'table_output'|'coverage_check'>,count=node.params.pointInputCount??1;if(count>1){w.edges=w.edges.filter(e=>!(e.to===n.id&&e.port===pointPort(count-1)));node.params.pointInputCount=count-1;}}));
  document.querySelectorAll<HTMLInputElement>('#map-label,#table-label').forEach(el=>el.addEventListener('change',e=>change(w=>required(w.nodes.find(x=>x.id===n.id)).params.label=control(e).value.trim()||TYPES[n.type].title)));
  const contextToggle=document.querySelector<HTMLInputElement>('#polygon-context-toggle');if(contextToggle)contextToggle.onchange=()=>change(w=>{const target=w.nodes.find(x=>x.id===n.id);if(target?.type==='map_output'){target.params.contextPoints=contextToggle.checked;if(!contextToggle.checked)w.edges=w.edges.filter(e=>e.to!==n.id||e.port!=='context');}});
  document.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-catchment-param]').forEach(el=>el.onchange=()=>change(w=>{const target=required(w.nodes.find(x=>x.id===n.id));(target.params as unknown as Record<string,unknown>)[el.dataset.catchmentParam!]=el.dataset.catchmentParam==='thresholds'?(el.value.trim()?el.value.split(',').map(v=>Number(v.trim())):[]):el instanceof HTMLInputElement&&el.type==='checkbox'?el.checked:el instanceof HTMLInputElement&&el.type==='number'?(el.value===''?NaN:Number(el.value)):el.value;}));
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
  optionalElement('#series-orientation')?.addEventListener('change',e=>change(w=>{
    getNode(w,n.id,'chart_output').params.orientation=control(e).value as 'horizontal'|'vertical';
  },{spatial:false}));
  optionalElement('#mean-center-zone')?.addEventListener('change',e=>change(w=>getNode(w,n.id,'mean_center').params.zone=control(e).value===''?NaN:Number(control(e).value)));
  optionalElement('#mean-center-hemisphere')?.addEventListener('change',e=>change(w=>getNode(w,n.id,'mean_center').params.hemisphere=control(e).value as 'north'|'south'));
  optionalElement('#catchment-output-mode')?.addEventListener('change',e=>change(w=>{const target=required(w.nodes.find(x=>x.id===n.id));(target.params as unknown as Record<string,unknown>).inputMode=control(e).value;w.edges=w.edges.filter(edge=>edge.to!==n.id);}));
  optionalElement('#polygon-output-label')?.addEventListener('change',e=>change(w=>{required(w.nodes.find(x=>x.id===n.id)).params.label=control(e).value;}));
  optionalElement('#save-network')?.addEventListener('click',()=>{try{const text=(document.querySelector('#network-json') as HTMLTextAreaElement).value;if(text.length>2000000)throw new Error('Network JSON exceeds 2 MB.');const data=JSON.parse(text);change(w=>{getNode(w,n.id,'network_input').params.data=data;},{requirePersistence:true});}catch(e){toast(errorMessage(e));}});
  for(const selector of ['#network-file','#network-upload'])document.querySelector<HTMLInputElement>(selector)?.addEventListener('change',async e=>{const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;const baseline=JSON.stringify(workflow);try{const data=await importNetwork(file,getNode(workflow,n.id,'network_input').params.maxNodes);if(JSON.stringify(workflow)!==baseline)throw new Error('Workflow changed; import again.');change(w=>{getNode(w,n.id,'network_input').params.data=data;},{requirePersistence:true});}catch(e){toast(errorMessage(e));}});
  optionalElement('#download-network')?.addEventListener('click',async e=>{const button=e.currentTarget as HTMLButtonElement,baseline=JSON.stringify(workflow);button.disabled=true;button.textContent='Downloading bounded OSM network...';try{const {boundary}=previewArea(workflow,n.id);const node=getNode(workflow,n.id,'network_input');const data=await downloadOSM(boundary,node.params.marginM??250,node.params.maxNodes,(node.params.pauseSeconds??60)*1000);if(JSON.stringify(workflow)!==baseline)throw new Error('Workflow changed during download; retry with the current boundary.');if(change(w=>{getNode(w,n.id,'network_input').params.data=data;},{requirePersistence:true}))toast('OSM network saved on this device. Run the workflow to update results.');}catch(e){toast(errorMessage(e));}finally{button.disabled=false;button.textContent='Download and save OSM network';}});
  document.querySelectorAll<HTMLSelectElement>('[data-map-port]').forEach(el=>el.onchange=()=>change(w=>setConnection(w,el.value,n.id,el.dataset.mapPort!)));
  // Applying the suggested zone, so the advice is actionable rather than only stated. It sets
  // both the zone and the hemisphere together: a zone number without its hemisphere is half an
  // answer, and the two defaults were wrong together.
  document.querySelectorAll<HTMLButtonElement>('[data-use-suggested-zone]').forEach(el=>el.onclick=()=>{
    const [zone,hemisphere]=required(el.dataset.useSuggestedZone).split(':');
    change(w=>{const node=required(w.nodes.find(x=>x.id===n.id)).params as Record<string,unknown>;
      node.zone=Number(zone);node.hemisphere=hemisphere;});
  });
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
  document.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('[data-slr]').forEach(el=>el.addEventListener('change',()=>change(w=>{
    const node=required(w.nodes.find(x=>x.id===n.id));(node.params as unknown as Record<string,string>)[required(el.dataset.slr)]=el.value.trim();})));
  document.querySelectorAll<HTMLInputElement>('[data-slr-family]').forEach(el=>el.addEventListener('change',()=>change(w=>{
    const node=getNode(w,n.id,'slr_extract_import');node.params.familyValues={...node.params.familyValues,[required(el.dataset.slrFamily)]:el.value.trim()};})));
  document.querySelectorAll<HTMLTextAreaElement>('[data-slr-citation]').forEach(el=>el.addEventListener('change',()=>change(w=>{
    const node=getNode(w,n.id,'slr_extract_import');const citations=[...node.params.citations];citations[Number(el.dataset.slrCitation)]=el.value.trim();node.params.citations=citations;})));
  optionalElement('#add-series-chart')?.addEventListener('click',()=>change(w=>{const id=`curve-${Date.now()}`;w.nodes.push({id,type:'chart_output',x:n.x+270,y:n.y,params:{label:'Epidemic curve',inputMode:'series'}});w.edges.push({id:`e-${Date.now()}`,from:n.id,to:id,port:'series'});selected=id;}));
  document.querySelectorAll<HTMLInputElement>('#chart-label').forEach(el=>el.addEventListener('change',()=>change(w=>{required(w.nodes.find(x=>x.id===n.id)).params.label=el.value.trim()||'Epidemic curve';})));
  // Reading, not editing: it opens a dialog and touches nothing that is saved.
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
  optionalElement('#add-table-view')?.addEventListener('click',()=>change(w=>{const id=`table-view-${Date.now()}`;w.nodes.push({id,type:'table_output',x:n.x+270,y:n.y,params:{label:'Imported table',inputMode:'table'}});w.edges.push({id:`e-${Date.now()}`,from:n.id,to:id,port:'table'});selected=id;}));
  optionalElement('#open-table')?.addEventListener('click',()=>{
    const baseline=JSON.stringify(workflow),current=getNode(workflow,n.id,'table_input').params;
    openTableEditor(result=>{
      if(JSON.stringify(workflow)!==baseline)throw new Error('The workflow changed. Reopen Import tabular data.');
      return change(w=>{const node=getNode(w,n.id,'table_input');node.params.data=result.data;node.params.keys=result.keys;node.params.valueField=result.valueField;node.params.unit=result.unit;node.params.source=result.source;},{requirePersistence:true});
    },current.keys.length?{keys:current.keys,valueField:current.valueField,unit:current.unit}:undefined);
  });
  optionalElement('#open-manual')?.addEventListener('click',()=>openManual(n.type,TYPES[n.type].title,esc));
  optionalElement('#prepare-raster')?.addEventListener('click',()=>{
    let source=workflow.nodes.find(x=>x.id===workflow.edges.find(e=>e.to===n.id&&e.port==='area')?.from);const visited=new Set<string>();
    while(source?.type==='measure_area'&&!visited.has(source.id)){visited.add(source.id);source=workflow.nodes.find(x=>x.id===workflow.edges.find(e=>e.to===source!.id&&e.port==='area')?.from);}
    let boundary:Boundary;try{boundary=previewArea(workflow,n.id).boundary;}catch(e){toast(errorMessage(e));return;}
    const baseline=JSON.stringify(workflow);openRasterEditor(boundary,asset=>{if(JSON.stringify(workflow)!==baseline)throw new Error('The workflow changed. Reopen Prepare GeoTIFF input.');return change(w=>{getNode(w,n.id,'raster_input').params.asset=asset;},{requirePersistence:true});},getNode(workflow,n.id,'raster_input').params.asset);
  });
  optionalElement('#add-raster-map')?.addEventListener('click',()=>change(w=>{const id=`map-${Date.now()}`;w.nodes.push({id,type:'map_output',x:n.x+270,y:n.y,params:{label:'Clipped raster',inputMode:'raster',pointInputCount:1}});w.edges.push({id:`e-${Date.now()}`,from:n.id,to:id,port:'raster'});selected=id;}));
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
      },{raster,clip:true,clipOptions:clip.params});
    }catch(error){toast(errorMessage(error));}finally{button.disabled=false;button.textContent='Preview and adjust';}
  });
  document.querySelector<HTMLSelectElement>('#clip-method')?.addEventListener('change',e=>change(w=>{getNode(w,n.id,'clip_raster').params.method=control(e).value as 'cell-center'|'all-touched';},{requirePersistence:true}));
  document.querySelector<HTMLInputElement>('#clip-margin')?.addEventListener('change',e=>change(w=>{getNode(w,n.id,'clip_raster').params.marginPixels=control(e).value===''?NaN:Number(control(e).value);},{requirePersistence:true}));
  optionalElement('#reset-clip-boundary')?.addEventListener('click',()=>change(w=>{delete getNode(w,n.id,'clip_raster').params.cutline;},{requirePersistence:true}));
  optionalElement('#study-area-label-form')?.addEventListener('submit',e=>{e.preventDefault();const input=$('#study-area-label'),label=input.value.trim();if(!label){input.setCustomValidity('Enter a label for the study area.');input.reportValidity();return;}change(w=>required(w.nodes.find(x=>x.id===n.id)).params.label=label);});
  optionalElement('#study-area-label')?.addEventListener('input',e=>control(e).setCustomValidity(''));
  optionalElement('#edit-input-data')?.addEventListener('click',()=>openInputDataEditor(getNode(workflow,n.id,'point_input'),workflow.nodes.filter((x):x is WorkflowNode<'study_area'>=>x.type==='study_area'&&(!!x.params.geometry||x.params.source!=='drawn')).map(x=>({id:x.id,label:x.params.label||'Old Naledi',geometry:x.params.geometry||oldNalediBoundary as Boundary})),data=>validateGeoJSON(data,{attributes:true}),params=>{const persisted=change(w=>getNode(w,n.id,'point_input').params=params,{requirePersistence:true});if(persisted)toast('Input edits saved on this device. Rerun the workflow to update results.');return persisted;}));
  document.querySelectorAll<HTMLSelectElement>('[data-coverage-port]').forEach(el=>el.onchange=()=>{const from=el.value,port=el.dataset.coveragePort!;change(w=>{w.edges=w.edges.filter(e=>!(e.to===n.id&&e.port===port));if(from)w.edges.push({id:`e-${Date.now()}`,from,to:n.id,port});});});
  optionalElement('#measure-area-source')?.addEventListener('change',e=>{const from=control(e).value;change(w=>{w.edges=w.edges.filter(x=>!(x.to===n.id&&x.port==='area'));if(from)w.edges.push({id:`e-${Date.now()}`,from,to:n.id,port:'area'});});});
  optionalElement('#edit-study-area')?.addEventListener('click',()=>openStudyAreaEditor(getNode(workflow,n.id,'study_area'),params=>change(w=>getNode(w,n.id,'study_area').params=params)));
  optionalElement('#area-view-n3')?.addEventListener('click',()=>{renderN3();switchView('rules');});
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
  // Picking a basemap switches the presentation when it has to. The control used to appear only
  // AFTER the practitioner had found the Presentation selector and set it to interactive, so a
  // basemap was two steps behind a combination nothing announced -- and the practitioner reported,
  // 2026-10-15, looking at a shipped map and finding no basemap at all. Five of the ten maps in
  // the worked examples were two clicks away; the clicks were the defect.
  optionalElement('#map-add-layer')?.addEventListener('change',e=>{
    const chosen=control(e).value;
    if(chosen)change(w=>setConnection(w,chosen,n.id,'layer'));
  });
  optionalElement('#map-basemap')?.addEventListener('change',e=>{
    const choice=control(e).value as 'none'|'osm'|'topo';
    change(w=>{
      const target=getNode(w,n.id,'map_output');
      target.params.basemap=choice;
      if(choice!=='none')target.params.presentation='interactive';
    });
  });
  optionalElement('#output-view')?.addEventListener('change',e=>change(w=>{const index=w.nodes.findIndex(x=>x.id===n.id);w.nodes[index]={...w.nodes[index],type:'output',params:{label:n.params.label,view:control(e).value as 'map'|'table'|'bars'}};}));
  optionalElement('#output-input-mode')?.addEventListener('change',e=>change(w=>{const node=required(w.nodes.find(x=>x.id===n.id)) as WorkflowNode<'map_output'>;(node.params as unknown as Record<string,string>).inputMode=control(e).value;w.edges=w.edges.filter(edge=>edge.to!==n.id);}));
  $('#delete-node').onclick=()=>removeNodes([n.id]);
  $('#duplicate-node').onclick=()=>change(w=>{const copy=structuredClone(n);copy.id=`${n.type}-${Date.now()}`;copy.x+=40;copy.y+=90;w.nodes.push(copy);selected=copy.id;});
  if(busy)$('#inspector-content').querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|HTMLButtonElement>('input,select,textarea,button').forEach(el=>el.disabled=true);
}
function removeNodes(ids:string[]){change(w=>{w.nodes=w.nodes.filter(n=>!ids.includes(n.id));w.edges=w.edges.filter(e=>!ids.includes(e.from)&&!ids.includes(e.to));if(ids.includes(w.outputId||''))w.outputId=w.nodes.find(n=>n.type==='output')?.id;if(ids.includes(selected||''))selected=null;});}
function renderEvidence(id:string){
  const result=activeOutput(),row=result?.rows.find(r=>r.id===id);if(!result||!row){selected=null;renderInspector();return;}
  if(result.kind==='point-table'){$('#inspector-content').innerHTML=pointTableEvidence(row as PointRow,dirty,esc);return;}
  if(result.kind==='spatial-map'){$('#inspector-content').innerHTML=mapEvidence(row as MapRow,dirty,esc);return;}
  if(result.kind==='spatial-coverage'){
    $('#inspector-content').innerHTML=coverageEvidence(result as unknown as CoverageValue,row as CoverageRow,dirty||busy,esc);
    optionalElement('#coverage-exclude-form')?.addEventListener('submit',e=>{e.preventDefault();if(dirty||busy)return;const reason=$('#exclusion-reason').value.trim();if(!reason)return;change(w=>{const check=getNode(w,required(result.checkNodeId),'coverage_check');check.params.exclusions=check.params.exclusions.filter(x=>!(x.sourceNodeId===row.sourceNodeId&&x.featureId===row.recordId));check.params.exclusions.push({sourceNodeId:required(row.sourceNodeId),featureId:required(row.recordId),signature:required(row.signature),reason});});});
    optionalElement('#coverage-restore')?.addEventListener('click',()=>{if(dirty||busy)return;change(w=>{const check=getNode(w,required(result.checkNodeId),'coverage_check');check.params.exclusions=check.params.exclusions.filter(x=>!(x.sourceNodeId===row.sourceNodeId&&x.featureId===row.recordId));});});
    optionalElement('#coverage-edit-boundary')?.addEventListener('click',()=>{if(dirty||busy)return;const area=workflow.nodes.find(n=>n.id===result.areaNodeId);if(area?.type==='study_area')openStudyAreaEditor(area,params=>change(w=>getNode(w,area.id,'study_area').params=params),{point:row,boundary:result.boundary});});
    return;
  }
  if(result.kind){$('#inspector-content').innerHTML=`<div class="inspector-body"><span class="inspector-section">Run evidence ${dirty?'· previous run':''}</span>${oldEvidence(result,row,esc)}</div>`;$('#inspect-rules').onclick=()=>switchView('rules');return;}
  const label=statusLabel(row.status);
  $('#inspector-content').innerHTML=`<div class="inspector-body"><span class="inspector-section">Decision evidence ${dirty?'· previous run':''}</span><h2>${esc(row.name)}</h2><span class="status-pill ${row.status}">${label}</span><p class="description">${esc(row.explanation)}</p><div class="inspector-divider"></div><span class="inspector-section">Inputs used in this run</span><div class="detail-row"><span>Nearest center</span><strong>${esc(row.center?.name||'Unknown')}</strong></div><div class="detail-row"><span>Distance</span><strong>${distanceText(row)}</strong></div><div class="detail-row"><span>Threshold</span><strong>${result.threshold} km</strong></div><div class="detail-row"><span>Heat alert</span><strong>${result.alert!.active===null?'Unknown':result.alert!.active?'Active':'Inactive'}</strong></div><div class="detail-row"><span>Assessment date</span><strong>${result.alert!.date}</strong></div><div class="rule-preview">${row.status==='Review'?'The N3 rule matched an active alert and a distance above the threshold.':row.status==='Unknown'?'An explicit missing-evidence rule matched. This result is not a negative finding.':'The N3 rule matched an inactive alert or a distance at or below the threshold, with required evidence present.'}</div><span class="inspector-section">Derived assertion</span><pre>&lt;urn:fieldwork:place:${esc(row.id)}&gt;\n  fw:decision fw:${row.status}.</pre><small class="muted">This explanation is assembled from the run inputs and returned assertion. It is not an EYE proof certificate.</small><div class="inspector-actions"><button id="inspect-rules" class="button small">View N3 & evidence ↗</button></div></div>`;
  $('#inspect-rules').onclick=()=>switchView('rules');
}
function statusLabel(status:string|undefined){return ({Review:'Review',NoFlag:'No flag',Unknown:'Insufficient data'} as Record<string,string>)[status||'Unknown'];}
function renderCoverageAlert(){const checks=[...new Map((result?.outputs.filter(o=>o.kind==='spatial-coverage'&&o.view==='table')||[]).map(o=>[o.checkNodeId,o])).values()],count=checks.reduce((sum,o)=>sum+(o.reviewCount||0),0),empty=checks.some(o=>!o.rows.length||o.rows.length===o.excludedCount);$('#coverage-alert').hidden=!count&&!empty;$('#coverage-alert').textContent=(dirty?'Previous run — rerun after changes. ':'')+(count?`${count} records require spatial review. Outside or missing coordinates do not establish a data-quality error. Select a record to exclude with a reason or edit the boundary.`:empty?'Coverage cannot be established: no usable records remain.':'');}
function renderResults(){
  disposeVegaChart();
  const output=activeOutput();$('.results-panel').classList.toggle('catchment-results',!!output?.polygons);$('.results-panel').classList.toggle('comparison-results',!!output?.comparison);activeOutputId=output?.nodeId||null;
  if(output?.comparison&&expandForRun===result?.runId&&!$('.work-area').classList.contains('results-expanded')){
    $('.work-area').classList.add('results-expanded');$('#expand-results').textContent='↙ Split view';$('#expand-results').setAttribute('aria-expanded','true');
  }
  expandForRun=null;
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
  if(output?.kind==='data-table'){const t=output as unknown as import('./data-table.js').DataTable;$('#result-metrics').innerHTML=`<span class="metric"><b>${t.rowCount}</b> rows</span><span class="metric unknown"><b>${t.missingValueCount}</b> values absent</span><span class="metric">${t.keys.length} key columns · value in ${esc(t.unit||'an unstated unit')}</span>`;}
  if(output?.kind==='point-table')$('#result-metrics').innerHTML=`<span class="metric"><b>${rows.length}</b> records</span><span class="metric"><b>${rows.filter(r=>!r.coordinates).length}</b> missing coordinates</span><span class="metric">CRS84 · longitude, latitude</span>`;
  if(output?.comparison)$('#result-metrics').innerHTML=`<span class="metric"><b>${output.comparison.original.features.length}</b> locations in each set</span><span class="metric"><b>${output.comparison.pumps.features.length}</b> reference pumps</span><span class="metric"><b>${output.comparison.centerShiftM.toFixed(1)} m</b> mean-center shift</span>`;
  const table=output?.pointTable?{head:'',body:''}:output?.kind==='spatial-map'?{head:'<th>Record</th><th>Spatial relation</th>',body:rows.map(r=>`<tr data-place="${esc(r.id)}"><td>${esc(r.name)}</td><td>${esc(relationLabel(r.relation!))}</td></tr>`).join('')}:output?.kind==='spatial-coverage'?coverageTable(output as unknown as CoverageValue,esc):resultTable(output,esc,statusLabel);$('#result-head').innerHTML=table.head;$('#result-rows').innerHTML=table.body;
  $('#result-search').value='';tablePage=0;tableAttributePage=0;
  $('#result-search').placeholder=output?.pointTable?'Search all records and attributes…':'Name, evidence, or service…';
  $('#point-table-controls').hidden=!output?.pointTable;
  $('#table-panel').classList.toggle('point-table',!!output?.pointTable);
  if(output?.pointTable)renderPointTable();
  const chartNode=runWorkflow?.nodes.find(n=>n.id===output?.nodeId&&n.type==='chart_output') as WorkflowNode<'chart_output'>|undefined;
  if(output?.chart&&chartNode&&chartRenderer(chartNode.params)==='vega-lite'){
    const chartContext={sourceId:runWorkflow?.edges.find(e=>e.to===output.nodeId)?.from,runId:result?.runId};
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
    }catch(error){toast(errorMessage(error));}
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
  $('#map-spatial-notice').hidden=output?.view!=='map'||(!outside&&!missing.length);
  $('#map-spatial-notice').textContent=`${outside?`${outside} outside ${outside===1?'point':'points'} shown in amber. `:''}${missing.length?`${missing.length} ${missing.length===1?'record has':'records have'} no coordinates and cannot be plotted. `:''}Outside does not establish a data-quality problem.`;
  $('#map-missing-records').innerHTML=missing.map(r=>`<button class="button small" data-map-record="${esc(r.id)}">${esc(r.name)} · missing coordinates</button>`).join('');
  $('#map-missing-records').hidden=output?.view!=='map';
  $('#map-missing-records').querySelectorAll<HTMLButtonElement>('[data-map-record]').forEach(el=>el.onclick=()=>selectResult(el.dataset.mapRecord!));
  $('#map-layer-list').hidden=output?.view!=='map'||!output.pointLayers?.length;
  $('#map-layer-list').innerHTML=(output?.pointLayers||[]).map(layer=>`<label><input type="checkbox" data-map-layer="${esc(layer.sourceNodeId)}" ${hiddenMapLayers.get(output!.nodeId)?.has(layer.sourceNodeId)?'':'checked'}> ${esc(layer.label)} (${layer.count})</label>`).join('');
  $('#map-layer-list').querySelectorAll<HTMLInputElement>('[data-map-layer]').forEach(el=>el.onchange=()=>{const hidden=hiddenMapLayers.get(output!.nodeId)||new Set();if(el.checked)hidden.delete(el.dataset.mapLayer!);else hidden.add(el.dataset.mapLayer!);hiddenMapLayers.set(output!.nodeId,hidden);renderMap();});
  $('#result-rows').querySelectorAll<HTMLElement & SVGElement>('[data-place]').forEach(el=>{el.onclick=()=>selectResult(el.dataset.place!);el.onkeydown=e=>{if(e.key==='Enter')selectResult(el.dataset.place!);};});
  const raster=output?.raster;$('#raster-download').hidden=!raster;$('#raster-download').onclick=()=>{if(raster)try{downloadRaster(raster);}catch(e){toast(errorMessage(e));}};if(raster){$('#result-metrics').textContent=`${raster.metadata.width} x ${raster.metadata.height} cells | ${raster.values.filter(v=>v!==null).length} valid | ${raster.mask?(raster.mask.method==='all-touched'?'All-touched polygon mask':'Cell-center polygon mask')+' / margin '+(raster.mask.marginPixels||0)+' px':'Unmasked input window'} | Source-reported units: ${raster.asset.provenance?.units||'Not supplied'}`;$('.map-legend').hidden=true;}else $('.map-legend').hidden=false;
  if(output?.polygons){const p=output.polygons;$('.map-legend').hidden=true;$('#map-note').textContent=p.method;$('#result-metrics').textContent=p.kind==='hexbin'?`${p.features.length} released H3 cells / ${p.summary?.matched} locations represented / ${p.summary?.unmatched} locations in omitted sparse cells`:p.summary?`${p.summary.records} locations / ${p.summary.matched} matched / ${p.summary.unmatched} outside / ${p.summary.missingLocation} missing location / ${p.summary.multiple} multiple memberships`:p.features.length+' catchments';$('#map-note').textContent=p.method+' / '+p.notes.join(' ');}
  if(exampleKey(workflow)==='snow-geoprivacy'&&output)$('#map-note').textContent=(output.nodeId.startsWith('before-')?'PRIVATE SOURCE · original coordinates. ':'DERIVED DISPLAY · educational transformation; no anonymity guarantee. ')+$('#map-note').textContent;
  if(output?.comparison){$('#map-note').textContent='PRIVATE EVALUATION · original and moved coordinates, mean centers and pumps';$('.map-legend').hidden=true;}
  renderMap();
  renderCoverageAlert();
  if(result){$('#n3-preview').textContent=result.receipts.map(receiptText).join('\n\n');}
}
function renderPointTable(){
  const active=required(activeOutput()) as {kind?:string};
  const dataView=$('#data-table-view');
  if(active.kind==='data-table'){
    // Rendered in its own container: the point-table grid and its controls stay in the DOM,
    // because a later point-table tab reads #result-head and #result-rows directly.
    dataView.hidden=false;$('#point-table-grid').hidden=true;$('#point-table-controls').hidden=true;
    dataView.innerHTML=dataTableMarkup(active as unknown as import('./data-table.js').DataTable,esc,{query:$('#result-search').value,page:tablePage});
    dataView.querySelectorAll<HTMLButtonElement>('[data-table-page]').forEach(b=>b.onclick=()=>{tablePage=Number(b.dataset.tablePage);renderPointTable();});
    return;
  }
  dataView.hidden=true;dataView.innerHTML='';$('#point-table-grid').hidden=false;
  const table=pointTableMarkup(required(activeOutput()) as unknown as TableValue|CoverageValue,esc,{query:$('#result-search').value,page:tablePage,attributePage:tableAttributePage});
  $('#result-head').innerHTML=table.head;$('#result-rows').innerHTML=table.body;$('#point-table-controls').innerHTML=table.controls;
  $('#point-table-controls').querySelectorAll<HTMLButtonElement>('[data-table-page]').forEach(b=>b.onclick=()=>{tablePage=Number(b.dataset.tablePage);renderPointTable();});
  $('#point-table-controls').querySelectorAll<HTMLButtonElement>('[data-table-fields]').forEach(b=>b.onclick=()=>{tableAttributePage=Number(b.dataset.tableFields);renderPointTable();});
  $('#result-rows').querySelectorAll<HTMLElement & SVGElement>('[data-place]').forEach(row=>{row.onclick=()=>selectResult(row.dataset.place!);row.onkeydown=e=>{if(e.key==='Enter')selectResult(row.dataset.place!);};});
}
function selectResult(id:string){selected=`result:${id}`;renderLibrary($('#node-search').value);flow?.update(playbackView(),null,statuses);renderInspector();renderMap();}
let disposeCatchmentMap:(()=>void)|undefined;
function renderMap(){
  disposeCatchmentMap?.();disposeCatchmentMap=undefined;document.querySelector('#catchment-map-host')?.remove();document.querySelector('#catchment-plot-download')?.remove();document.querySelector('#comparison-map-host')?.remove();
  const result=activeOutput(),svg=$('#map'), rows=result?.rows||[], centers=result?.centers||[], points=[...rows.filter(r=>r.coordinates).map(r=>r.coordinates!),...centers.filter(c=>c.geometry).map(c=>c.geometry!.coordinates)];
  const mapNode=runWorkflow?.nodes.find((n):n is WorkflowNode<'map_output'>=>n.id===result?.nodeId&&n.type==='map_output');
  const spec=result&&mapNode&&runWorkflow?mapPresentation(mapNode,result,runWorkflow):undefined;
  $('#map-panel').classList.toggle('has-communication',!!spec);
  $('#map-communication').hidden=!spec;$('#map-communication-key').hidden=!spec?.legend;$('#map-communication-source').hidden=!spec;
  if(spec){
    $('#map-communication-title').textContent=spec.title;$('#map-communication-subtitle').textContent=spec.subtitle;
    $('#map-communication-source').textContent=spec.sourceNote;$('#map-communication-header-source').textContent=spec.sourceNote;
    const key=spec.legend?spec.items.map(item=>`<span><i class="map-key-symbol" style="background:${item.color};border-radius:${item.shape==='square'?'2px':'50%'}"></i>${esc(item.label)}</span>`).join(''):'';
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
  }
  // A network is drawn as itself: the streets, at the size of the panel, with nothing inferred.
  if(result?.network){
    const coverage=networkCoverage(result.network);
    $('#map-panel').querySelector('#map-note')!.textContent=networkPreviewCaption(coverage);
    svg.style.display='';svg.setAttribute('viewBox','0 0 252 168');
    svg.innerHTML=networkPreviewSvg(result.network).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
    return;
  }
  svg.style.display='';svg.setAttribute('viewBox','0 0 850 295');
  if(result?.comparison){svg.style.display='none';const host=document.createElement('div');host.id='comparison-map-host';host.innerHTML=pointComparisonMarkup(result.comparison,esc);$('#map-panel').append(host);return;}
  if(result?.polygons){
    const note=document.createElement('div');note.id='catchment-map-host';$('#map-panel').insertBefore(note,$('#map-communication-key'));
    // Interactive for ANY map, not only one that has polygons. The renderer draws the layers it is
    // given, so a study area with points on it is a map like any other -- and since only the
    // interactive presentation can draw tiles, this is what makes a basemap reachable on a map
    // that is not a catchment. Reported three times before the cause turned out to be here.
    if(mapNode?.params.presentation==='interactive'&&result.view==='map'){svg.style.display='none';disposeCatchmentMap=mountCatchmentMap(note,result.polygons?{...result,polygons:result.polygons}:result,result.contextPoints,esc,mapNode?.params.basemap||'none',choice=>{if(mapNode)change(w=>getNode(w,mapNode.id,'map_output').params.basemap=choice);});}
    else if(result.polygons.features.some(f=>f.minutes!==undefined)){svg.setAttribute('viewBox','0 0 850 650');svg.innerHTML=catchmentPlot(result.polygons,esc,result.contextPoints);}
    else svg.innerHTML=polygonSvg(result.polygons,esc);
    const method=document.createElement('p');method.className='muted';method.textContent=result.polygons.method+' / '+result.polygons.notes.join(' ');note.append(method);return;
  }
  if(result?.raster){svg.innerHTML=rasterSvg(result.raster);return;}
  if(result?.pointTable){svg.innerHTML='';return;}
  if(result?.kind==='study-area'){svg.innerHTML=areaSvg(required(result.boundary),result.label);return;}
  if(result?.boundary){svg.innerHTML=oldMap(result,selected,esc,statusLabel);svg.querySelectorAll<HTMLElement & SVGElement>('[data-place]').forEach(el=>{el.style.display=hiddenMapLayers.get(result.nodeId)?.has(el.dataset.layer!)?'none':'';el.onclick=()=>selectResult(el.dataset.place!);el.onkeydown=e=>{if(e.key==='Enter')selectResult(el.dataset.place!);};});return;}
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
  runFailed=false;
  try{executionPlan(workflow);}catch(e){toast(errorMessage(e),{tone:'failure'});runFailed=true;render();console.error(e);return;}busy=true;statuses={};justFinished.clear();lastRunMs=null;render();const snapshot=structuredClone(workflow);const started=performance.now();try{const next=await executeWorkflow(snapshot,reason,(id,state)=>{statuses[id]=state;if(state==='done'){justFinished.add(id);setTimeout(()=>{justFinished.delete(id);if(!busy||statuses[id]==='done')flow?.update(playbackView(),selected,statuses);},FINISH_GLOW_MS);}flow?.update(playbackView(),selected,statuses);},(ref,provider,origin)=>{if(!credentials)throw new Error('Credentials are not available.');return credentials.resolve(ref,provider,origin);});lastRunMs=performance.now()-started;result=next;runWorkflow=snapshot;dirty=false;expandForRun=next.runId;renderResults();const issues=dataIssueNotice(next);
  // "we must surface the issue on the widget as a toast message that I can then read and close"
  // -- the practitioner, 2026-10-16. A run that quietly bands a third of its records Unrecorded
  // has answered the question and hidden the thing worth knowing.
  //
  // ADDED to what a successful run already says, not substituted for it. The first version
  // replaced the line, so a run with a data issue no longer reported that it had finished or
  // how long it took -- taking something away from the practitioner in the act of telling them
  // something. The run succeeded; it is amber rather than red for that reason, and it stays
  // until it is closed.
  toast(`Complete in ${elapsedText(lastRunMs)}: ${result.outputs.length} output tabs updated.`
    +supersessionNotice(snapshot)+(issues?` ${issues}`:''),issues?{tone:'warning'}:undefined);}catch(e){toast(`Workflow stopped: ${errorMessage(e)}`,{tone:'failure'});runFailed=true;console.error(e);}finally{busy=false;render();}}
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
function switchView(view:string){$('.work-area').classList.remove('results-expanded');$('#expand-results').textContent='⛶ Expand';$('#expand-results').setAttribute('aria-expanded','false');$('#workflow-view').hidden=view!=='workflow';$('#rules-view').hidden=view!=='rules';document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));}
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
// workspace is kept when the dropdown is used, so this is the way back to the published one.
$('#reset-example').onclick=()=>{
  if(busy)return;
  const key=exampleKey(workflow);
  if(!confirm('Discard your edits to this workspace and reload it as published? This cannot be undone.'))return;
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
$('#example-select').onchange=e=>loadExample(control(e).value);
$('#blank-add').onclick=()=>$('#node-library [data-add="study_area"]')?.click();
$('#new-workflow').onclick=()=>{if(busy)return;loadExample('blank');change(w=>{replaceWorkflow(w,blankWorkflow());selected=null;});result=null;runWorkflow=null;activeOutputId=null;renderResults();render();switchView('workflow');};
$('#result-search').oninput=e=>{if(activeOutput()?.pointTable){tablePage=0;renderPointTable();return;}$('#result-rows').querySelectorAll('tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(control(e).value.toLowerCase()));};
$('#expand-results').onclick=()=>{const expanded=$('.work-area').classList.toggle('results-expanded');$('#expand-results').textContent=expanded?'↙ Split view':'⛶ Expand';$('#expand-results').setAttribute('aria-expanded',String(expanded));};
const libraryToggle=$('#toggle-library'),library=$('.library');
library.id='layout-library';
libraryToggle.onclick=()=>{const collapsed=$('.studio').classList.toggle('library-collapsed');libraryToggle.textContent=collapsed?'Show widgets':'Hide widgets';libraryToggle.setAttribute('aria-expanded',String(!collapsed));};
type FocusPanel='workbench'|'results'|null;
let focusPanel:FocusPanel=null;
function setPanelFocus(panel:FocusPanel){
  focusPanel=panel;
  document.body.classList.toggle('focus-workbench',panel==='workbench');
  document.body.classList.toggle('focus-results',panel==='results');
  for(const [id,active] of [['fullscreen-workbench',panel==='workbench'],['fullscreen-results',panel==='results']] as const){const button=$(`#${id}`);button.setAttribute('aria-pressed',String(active));button.textContent=active?'Exit full screen':'Full screen';}
  if(panel==='workbench')requestAnimationFrame(()=>flow?.fit());
}
$('#fullscreen-workbench').onclick=()=>setPanelFocus(focusPanel==='workbench'?null:'workbench');
$('#fullscreen-results').onclick=()=>setPanelFocus(focusPanel==='results'?null:'results');
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&focusPanel){setPanelFocus(null);event.preventDefault();}});
credentials=installCredentials(document.querySelector<HTMLButtonElement>('#credentials-button')!);
const showCatalog=()=>{try{openCatalogDialog(esc,servingBuild);}catch(error){toast(errorMessage(error));}};
$('#open-catalog').onclick=showCatalog;
$('#header-catalog').onclick=showCatalog;
// Deep link, so the catalog can be pointed at rather than described: ?catalog=1 or #catalog.
if(new URLSearchParams(location.search).get('catalog')==='1'||location.hash==='#catalog')showCatalog();
$('#encrypted-export').onclick=()=>{try{openPackageDialog(workflow,validateWorkflow,applyImportedWorkflow);}catch(error){toast(errorMessage(error));}};
function applyImportedWorkflow(next:Workflow){const persisted=change(w=>{replaceWorkflow(w,next);selected=next.nodes[0]?.id;},{requirePersistence:true});if(!persisted)throw new Error('Workflow could not be saved. The previous workflow is unchanged.');renderLibrary();flow?.fit();toast('Workflow imported. Run it to update results.');}
$('#export-button').onclick=async()=>{try{const exported=await workflowDocument(workflow);download(exported.schema==='fieldwork/bundle/1'?'fieldwork-workflow-bundle.json':'fieldwork-workflow.json',JSON.stringify(exported,null,2));}catch(error){toast(errorMessage(error));}};$('#import-button').onclick=()=>$('#workflow-file').click();
$('#workflow-file').onchange=async e=>{const file=(control(e) as HTMLInputElement).files?.[0];if(!file)return;try{if(file.size>MAX_BUNDLE_BYTES)throw new Error('Workflow or bundle exceeds the 20 MB import limit.');if(file.name.toLowerCase().endsWith('.zip')){openPackageDialog(workflow,validateWorkflow,applyImportedWorkflow,file);control(e).value='';return;}const next=await importWorkflowDocument(JSON.parse(await file.text()),validateWorkflow);const persisted=change(w=>{replaceWorkflow(w,next);selected=next.nodes.find(n=>n.type==='output')?.id;},{requirePersistence:true});if(!persisted)throw new Error('Workflow could not be saved. The previous workflow is unchanged.');renderLibrary();flow?.fit();toast('Workflow imported. Run it to update results.');}catch(err){toast(errorMessage(err));}control(e).value='';};
$('#geojson-file').onchange=async e=>{const file=(control(e) as HTMLInputElement).files?.[0];if(!file)return;try{if(file.size>5e6)throw new Error('GeoJSON file is too large (5 MB maximum).');const data=validateGeoJSON(JSON.parse(await file.text()));change(w=>{const n=w.nodes.find(n=>n.id===importNode);if(!n)throw new Error('Source node no longer exists.');updateParam(w,n.id,'data',data);});toast('Local geographic data loaded. Run to update results.');}catch(err){toast(errorMessage(err));}control(e).value='';};
$('#download-evidence').onclick=async()=>{if(!result||!runWorkflow){toast('Run the workflow first.');return;}const snapshot=structuredClone({schema:'fieldwork/run/1',workflow:runWorkflow,...result});try{const attachments=await exportEvidenceFiles(snapshot.workflow);download('fieldwork-run-receipt.json',JSON.stringify({...snapshot,...(attachments.length?{attachments}:{})},null,2));}catch(error){toast(errorMessage(error));}};
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view!));
$('#help-button').onclick=()=>$('#help-dialog').showModal();$('#close-help').onclick=()=>$('#help-dialog').close();
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA','SELECT'].includes((e.target as Element).tagName)){e.preventDefault();$(e.shiftKey?'#redo-button':'#undo-button').click();}});
const requestedExample=new URLSearchParams(location.search).get('example');
if(requestedExample&&['old-naledi','heat','blank','coverage','raster','snow-voronoi','snow-isochrone','snow-geoprivacy','snow-extent','sea-level','rulesets'].includes(requestedExample)&&requestedExample!==exampleKey(workflow)){save();let openedSaved=false;try{const saved=JSON.parse(localStorage.getItem(WORKSPACES)||'{}')[requestedExample];openedSaved=!!saved;workflow=saved?validateWorkflow(saved):template(requestedExample);}catch{workflow=template(requestedExample);}
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
if(canAutoRun(workflow))setTimeout(run,350);

setInterval(()=>{const button=document.querySelector<HTMLButtonElement>('#download-network'),message=document.querySelector<HTMLElement>('#network-download-status');if(!button||!message)return;const state=networkDownloadStatus();button.disabled=busy||state.inFlight||state.waitSeconds>0;message.textContent=state.inFlight?'One OSM request is in progress.':state.waitSeconds?'Next OSM download available in '+state.waitSeconds+' seconds. Saved graphs are available offline.':'Ready for one bounded OSM request; no automatic refresh.';},1000);
