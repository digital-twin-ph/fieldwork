/** SAMPLE A RASTER, OUT OF APP.TS (2026-11-20: touched when its declared unit began to reach the table it makes). Its
 *  Inspector -- name, inputs, one sentence and Configure…, what the last run read -- and its dialog for points and areas.
 *  Reading satellite files keeps its sentence and dialog in app.ts, with the readers and caches they use; the kit opens
 *  them. */
import type {Workflow,WorkflowNode} from './types.js';
import type {RasterAsset} from './raster.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import {openConfigDialog} from './config-dialog.js';
import {rasterUnitsOf} from './raster-units.js';
import {openWalkthrough} from './table-walkthrough.js';
import {sampleRasterWalkthrough} from './spatial-walkthroughs.js';

export interface SampleKit extends StepKit {
  /** The facts of the step's last receipt. */
  facts:(nodeId:string)=>string|undefined;
  /** Whether the workflow has been run at all. */
  ran:()=>boolean;
  /** What the last satellite reading said it did. */
  said:(nodeId:string)=>string|undefined;
  /** One connection made, replacing what was on that port. */
  connect:(w:Workflow,from:string,to:string,port:string)=>void;
  /** Satellite files: the sentence and the dialog, kept with their readers. */
  satelliteSentence:(n:WorkflowNode<'sample_raster'>)=>string;
  openSatellite:(nodeId:string)=>void;
}

export function sampleSentence(n:WorkflowNode<'sample_raster'>):string{
  const p=n.params,name=p.attribute?.trim();
  // OVER AREAS (experiment 205): each area's cells totalled.
  if(p.over==='areas')return `Totals ${name||'total'}${p.valueUnit?.trim()?`, ${p.valueUnit.trim()},`:''} over each area: the cells whose `
    +'centre is inside or on it, each counted whole; cells with no data add nothing and are counted apart.'
    +(p.cellStatistics?' Also each area\u2019s cell mean, median, standard deviation, smallest and largest, cells populated, and the total per km\u00b2.':'');
  if(!name)return 'Writes a raster\u2019s value onto each point. Name the attribute in Configure\u2026';
  return `Writes ${name}${p.valueUnit?.trim()?`, ${p.valueUnit.trim()},`:''} onto each point: `
    +(p.method==='bilinear'?'interpolated between the four nearest cells.':'the value of the cell containing it.');
}

/** THE RASTER ARRIVING AT A STEP: the asset a Raster input holds, found by following raster inputs up the canvas. */
function rasterArriving(workflow:Workflow,nodeId:string):RasterAsset|undefined{
  const seen=new Set<string>();let at=nodeId;
  for(;;){const edge=workflow.edges.find(e=>e.to===at&&e.port==='raster');if(!edge||seen.has(edge.from))return undefined;seen.add(edge.from);
    const from=workflow.nodes.find(n=>n.id===edge.from);const asset=(from?.params as {asset?:RasterAsset}|undefined)?.asset;
    if(asset)return asset;at=edge.from;}
}
/** WHAT THE RASTER SAYS ITS VALUES ARE, where it says: the source record's units, else the file's own band tag. */
function rasterUnits(asset:RasterAsset):{units:string;from:string;name?:string}|undefined{
  const found=rasterUnitsOf(asset);if(!found)return undefined;
  const population=/people|person|population/i.test(found.units)||found.from!=='its source record'&&found.from!=='the file\u2019s band tag';
  return {...found,...(population?{name:'population'}:{})};
}
/** WHAT ARRIVED, said first (2026-11-13). The practitioner, with a raster connected and nothing to read it at: "Shouldn't
 *  sample a raster be able to detect what data the raster offers after retrieval ... I feel lost what to do next". */
function sampleArrivals(kit:SampleKit,nodeId:string):{html:string;nothing:boolean;areas:WorkflowNode<'study_area'>[]}{
  const workflow=kit.workflow(),esc=kit.esc,asset=rasterArriving(workflow,nodeId),into=(port:string)=>workflow.edges.filter(e=>e.to===nodeId&&e.port===port)
    .map(e=>workflow.nodes.find(n=>n.id===e.from)).filter((n):n is WorkflowNode=>!!n);
  const named=(n:WorkflowNode)=>n.params.label||kit.title(n.type);
  const at=[...into('points').map(n=>`points from ${named(n)}`),...into('areas').map(n=>`areas from ${named(n)}`),
    ...into('area').map(n=>`the study area ${named(n)}`),...into('files').map(n=>`satellite files from ${named(n)}`)];
  let raster='No raster is connected to Raster yet.';
  if(asset){
    const m=asset.source.metadata,deg=Math.abs(m.resolution[0]),metres=Math.round(deg*111320);
    const units=rasterUnits(asset),title=asset.provenance?.title?.trim()||asset.source.filename;
    const description=m.description&&!m.description.trim().startsWith('{')?m.description.trim().slice(0,240):'';
    raster=`<strong>${esc(title)}</strong>: ${asset.metadata.width.toLocaleString('en')} by ${asset.metadata.height.toLocaleString('en')} cells kept, each `
      +`${deg.toPrecision(3)}° across (about ${metres.toLocaleString('en')} m at the equator). `
      +(units?`Its values are in <strong>${esc(units.units)}</strong>, as ${units.from} states.`:'The file does not state what its values measure.')
      // WHAT A CELL HOLDS, AND WHAT A TOTAL IS, in words, where the units are people.
      +(units&&/people|person/i.test(units.units)?` <strong>Each cell holds an estimated number of people living in it</strong>, so a point takes the people in its cell, and an area\u2019s total is the estimated number of people living there.`:'')
      +(m.noData!==null?` No data is written as ${esc(String(m.noData))}.`:'')
      +(description?` The file describes itself: “${esc(description)}”`:'');
  }
  const areas=workflow.nodes.filter((n):n is WorkflowNode<'study_area'>=>n.type==='study_area'&&!!(n.params as {geometry?:unknown}).geometry);
  return {nothing:!at.length,areas,html:`<div class="standard-arrivals" data-sample-arrivals><p>${raster}</p>`
    +`<p>${at.length?`Read at: ${esc(at.join('; '))}.`:'<strong>Nothing to read it at yet.</strong> Connect points to Points (each takes its cell’s value), polygons to Areas, or a study area to Study area (a total for each named part, or for the whole area).'}</p>`
    +(!at.length&&areas.length?`<div class="inspector-actions">${areas.map(a=>`<button type="button" class="button" data-sample-over-area="${esc(a.id)}">Read it over ${esc(a.params.label||'the study area')}</button>`).join('')}</div>`:'')
    +'</div>'};
}

/** SAMPLE RASTER'S CONFIGURATION DIALOG (experiment 186): the attribute, what it measures, and how a value is read. */
function openSampleConfig(kit:SampleKit,nodeId:string){
  const workflow=kit.workflow(),esc=kit.esc,node=workflow.nodes.find(x=>x.id===nodeId);
  if(node?.type!=='sample_raster')return;
  type Draft=WorkflowNode<'sample_raster'>['params'];
  // THE SOURCE'S OWN WORDS FILL WHAT IS EMPTY, said as theirs: the units a raster states (2026-11-13).
  const asset=rasterArriving(workflow,nodeId),stated=asset?rasterUnits(asset):undefined;
  const start=structuredClone(node.params);
  if(!start.valueUnit?.trim()&&stated)start.valueUnit=stated.units;
  if(!start.attribute?.trim()&&stated?.name)start.attribute=stated.name;
  openConfigDialog<Draft>({
    id:'sample-config',widget:'Sample a raster at points or over areas',step:node.params.label||kit.title('sample_raster'),draft:start,
    sections:draft=>({...(sampleArrivals(kit,nodeId).nothing?{message:{tone:'warning' as const,text:'Nothing is connected to read the raster at, so a run has nothing to write to. Connect points, areas or a study area, or use the button above.'}}:{}),
      settings:sampleArrivals(kit,nodeId).html
      +`<p class="description">${draft.over==='areas'?'Reading over areas: each area\u2019s cells are totalled.':'Reading at points: each point takes its cell\u2019s value.'}</p>`
      +`<div class="field"><label class="field-label" for="sample-attribute">${draft.over==='areas'?'Name of the total':'Attribute to write'}</label><input id="sample-attribute" maxlength="60" value="${esc(draft.attribute)}" ></div>`
      +`<div class="field"><label class="field-label" for="sample-unit">What those values measure</label><input id="sample-unit" maxlength="60" value="${esc(draft.valueUnit)}">`
      +(stated&&draft.valueUnit===stated.units?`<small data-sample-unit-from>As ${esc(stated.from)} states. Change it if it says otherwise.</small>`:'')+'</div>'
      +(draft.over==='areas'?`<div class="field"><label class="check"><input type="checkbox" id="sample-cell-statistics"${draft.cellStatistics?' checked':''}> Also give each area\u2019s zonal statistics: its cells\u2019 mean, median, standard deviation, smallest and largest, how many are populated, and people per km\u00b2</label></div>`:'')
      +(draft.over==='areas'?'':`<div class="field"><label class="field-label" for="sample-method">Read each value as</label><select id="sample-method">`
      +`<option value="cell"${draft.method!=='bilinear'?' selected':''}>the cell containing the point</option>`
      +`<option value="bilinear"${draft.method==='bilinear'?' selected':''}>between the four nearest cells (bilinear)</option></select></div>`
      +''),
      // SHOW ME HOW (TODO 6, 2026-11-22): the chosen reading on a made-up grid of 12 cells, at points or over an area.
      preview:`<p class="muted">${esc(sampleSentence({...node,params:draft}))}</p>`
        +'<p><button type="button" class="button" data-show-me>Show me how it works</button></p>'}),
    wire:(root,draft,redraw)=>{
      root.querySelector<HTMLButtonElement>('[data-show-me]')?.addEventListener('click',event=>
        openWalkthrough(sampleRasterWalkthrough(draft.over==='areas'?'areas':'points',draft.method==='bilinear'?'bilinear':'cell'),esc,event.currentTarget as HTMLElement));
      root.querySelector<HTMLInputElement>('#sample-attribute')?.addEventListener('change',e=>{draft.attribute=(e.target as HTMLInputElement).value.trim();redraw();});
      root.querySelector<HTMLInputElement>('#sample-unit')?.addEventListener('change',e=>{draft.valueUnit=(e.target as HTMLInputElement).value.trim();redraw();});
      root.querySelector<HTMLSelectElement>('#sample-method')?.addEventListener('change',e=>{const v=(e.target as HTMLSelectElement).value;
        if(v==='bilinear')draft.method='bilinear';else delete draft.method;redraw();});
      // READ IT OVER A STUDY AREA: connect it, read over areas, and move a Map's or Table's points input to its polygons input.
      root.querySelectorAll<HTMLButtonElement>('[data-sample-over-area]').forEach(button=>button.addEventListener('click',()=>{
        const area=button.dataset.sampleOverArea!;
        kit.change(w=>{kit.connect(w,area,nodeId,'at');
          for(const e of w.edges)if(e.from===nodeId&&e.port==='points'&&['map_output','table_output'].includes(w.nodes.find(n=>n.id===e.to)?.type??''))e.port='polygons';});
        draft.over='areas';redraw();}));
      root.querySelector<HTMLInputElement>('#sample-cell-statistics')?.addEventListener('change',e=>{
        if((e.target as HTMLInputElement).checked)draft.cellStatistics=true;else delete draft.cellStatistics;redraw();});
    },
    apply:draft=>kit.change(w=>{const t=w.nodes.find(x=>x.id===nodeId);if(t?.type==='sample_raster')t.params=draft;}),
  },esc);
}

export const sampleInspector:OwnInspector<'sample_raster'>={
  markup:(n,kit)=>{const k=kit as SampleKit,p=n.params,esc=kit.esc,why=k.unfinished(n.id);
    if(p.source==='satellite-files'){
      // THE STANDARD INSPECTOR (experiment 186), touched 2026-11-09 when it learned to keep what it reads on this device:
      // the name; its inputs; one sentence and Configure…, where the layer, quality rule, unit and place column are set and
      // saved readings are read again or forgotten; and what the last run read. The controls' ids are kept, in the dialog.
      const said=k.said(n.id);
      return kit.section('Name',kit.name('satellite-sample-label',p.label||'Sample a raster'))
        +kit.section('Inputs',kit.inputs(n,{files:'Satellite files',points:'Points',areas:'Areas, a polygon layer',area:'Or: a study area’s named parts'}))
        +kit.section('Settings',`<p class="standard-sentence">${esc(k.satelliteSentence(n))}</p>`
          +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure…</button></div>')
        +kit.section('Result',`<p class="standard-result${why?' standard-result-warning':''}">${esc(why?`The last run could not compute this step: ${why}`
          :said??'Run the workflow to read the files. A file read before on this device, the same way at the same places, is not read again.')}</p>`);
    }
    // THE STANDARD INSPECTOR (experiments 186, 198): touched to read between the four nearest cells, as a geoid is read.
    // THE COUNTS AS THE RECEIPT STATES THEM: the run keeps the receipt, not the point layer.
    const facts=k.facts(n.id)??'';
    const count=(name:string)=>{const m=new RegExp(`fw:${name} "(\\d+)"`).exec(facts);return m?Number(m[1]):undefined;};
    const counts=count('sampledCount')===undefined?undefined
      :{sampled:count('sampledCount')!,noData:count('noDataCount')!,outside:count('outsideRasterCount')!,unlocated:count('unlocatedCount')!};
    // Over areas (experiment 205) the receipt's method is the sentence: the areas, the cells, and what was left out.
    const areaSentence=/fw:RasterAreaTotal/.test(facts)?k.method(n.id):undefined;
    return kit.section('Name',`<div class="field"><label class="field-label" for="sample-label">Name</label><input id="sample-label" data-sample="label" maxlength="60" value="${esc(p.label||k.title('sample_raster'))}"></div>`)
      +kit.section('Inputs',kit.inputs(n))
      +kit.section('Settings',`<p class="standard-sentence">${esc(sampleSentence(n))}</p>`
        +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure…</button></div>')
      +kit.section('Result',`<p class="standard-result${why?' standard-result-warning':''}">${esc(why?`The last run could not compute this step: ${why}`
        :areaSentence?areaSentence
        :counts?`${counts.sampled} point${counts.sampled===1?'':'s'} given a value; ${counts.noData} on no data, ${counts.outside} outside the raster, ${counts.unlocated} without a location. None is set to zero.`
        :k.ran()?(p.over==='areas'?'Run to total the raster over the areas.':'Run to read the raster at the points.'):'Not run yet.')}</p>`);},
  wire:(n,kit,root)=>{const k=kit as SampleKit;
    root.querySelector('#configure-step')?.addEventListener('click',()=>n.params.source==='satellite-files'?k.openSatellite(n.id):openSampleConfig(k,n.id));
  },
};
