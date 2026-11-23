/** CHART, ON THE STANDARD (experiment 186), out of app.ts (2026-11-21: touched for the series drawn together, so moved, as
 *  every widget touched is): its sentence, its Inspector, and Configure… with what is drawn and every setting, with the
 *  ids the panels held. What it reads of the application comes through ChartKit. */
import type {WorkflowNode} from './types.js';
import type {StepKit} from './inspector-kit.js';
import type {WorkflowRun} from './results.js';
import type {BarOrder} from './results.js';
import {openConfigDialog} from './config-dialog.js';
import {errorMessage} from './guards.js';
import {wordsHint} from './figure-words.js';
import {chartRenderer,chartOrientation,chartVegaSpec} from './chart-vega.js';
import {tableChart,chartMarkup,orderableBins} from './chart-output.js';
import {proposeChartForms,proposalOrder,type ChartForm,type ChartProposal} from './chart-proposals.js';
import {scalesOf,declaredUpstream} from './column-metadata.js';
import {orderOf} from './select-rows.js';
import {TYPES} from './core.js';

const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export interface ChartKit extends StepKit {
  /** The last run, to read. */ result:()=>WorkflowRun|undefined;
  /** The key columns a step's table carries, read without a run. */ tableKeyColumns:(node:WorkflowNode|undefined)=>string[];
  /** Each key column's values on a step's input, from its source or the last run. */
  upstreamKeyValues:(node:WorkflowNode,seen?:Set<string>,port?:string)=>Record<string,string[]>|undefined;
  /** Where the figure goes in the write-up, and the Name field, as the application draws them for every output. */
  writeUpSelect:(n:WorkflowNode)=>string; labelForm:(id:string,label:string,value:string)=>string;
  standardInputs:(n:WorkflowNode,labels?:Record<string,string>)=>string;
}

function chartControls(kit:ChartKit,n:WorkflowNode<'chart_output'>,options:{omitOrientation?:boolean}={}){
  const p=n.params;
  // AN ESTIMATE WITH ITS INTERVAL is a point and a whisker: no mark or orientation to choose (experiment 181).
  const interval=!!kit.result()?.outputs.find(o=>o.nodeId===n.id)?.chart?.interval;
  return `<div class="field"><label class="field-label" for="chart-renderer">Chart enhancement</label><select id="chart-renderer"><option value="html" ${chartRenderer(p)!=='vega-lite'?'selected':''}>Classic bars</option><option value="vega-lite" ${chartRenderer(p)==='vega-lite'?'selected':''}>Vega-Lite (experimental)</option></select></div>`+
    (chartRenderer(p)==='vega-lite'?`${interval?'':`<label class="field-label" for="chart-mark">Mark</label><select id="chart-mark"><option value="bar" ${!p.mark||p.mark==='bar'?'selected':''}>Bars</option><option value="point" ${p.mark==='point'?'selected':''}>Dots</option><option value="line" ${p.mark==='line'?'selected':''}>Line</option></select>`}
    ${options.omitOrientation||p.panelsBy||interval||p.mark==='line'?'':`<label class="field-label" for="chart-orientation">Orientation</label><select id="chart-orientation"><option value="horizontal" ${p.orientation!=='vertical'?'selected':''}>Horizontal</option><option value="vertical" ${p.orientation==='vertical'?'selected':''}>Vertical</option></select>`}
    ${(()=>{
      // AN ESTIMATE WITH ITS INTERVAL (experiment 181): for a ratio, the log scale and the line at 1 are on unless
      // turned off here. Read off the last run, as the bar order is, since the table's shape arrives with it.
      const drawn=kit.result()?.outputs.find(o=>o.nodeId===n.id)?.chart;
      if(!drawn?.interval)return '';
      return drawn.interval.ratio
        ?`<label class="check"><input type="checkbox" id="chart-log-scale" ${p.ratioScale!=='linear'?'checked':''}> Log scale for the ${esc(drawn.interval.estimate)}</label>`
          +`<label class="check"><input type="checkbox" id="chart-reference-line" ${p.referenceLine!==false?'checked':''}> A dashed line at 1, no association</label>`
          +''
        :'';
    })()}
    ${p.panelsBy||interval?'':(()=>{
      // BAR ORDER, and the control is offered only where it could act. Not with panels (experiment 174): they run
      // along time, which is the order they mean. A chart whose bins carry
      // an `order` is a SEQUENCE -- an epidemic curve's days, a band's thresholds -- and sorting
      // it by size destroys the one thing the figure is for. The last run says which this is,
      // so the control appears when the chart can be re-ordered and says why when it cannot:
      // "a control that cannot act must not look like one".
      const drawn=kit.result()?.outputs.find(o=>o.nodeId===n.id)?.chart;
      const sequence=drawn&&!orderableBins(drawn.bins);
      const option=(value:string,label:string)=>
        `<option value="${esc(value)}" ${(p.barOrder||'category')===value?'selected':''}>${esc(label)}</option>`;
      return `<label class="field-label" for="chart-bar-order">Bar order</label>`
        +`<select id="chart-bar-order"${sequence?' disabled':''}>`
        +option('category','In the table\u2019s order, numbers rising')
        +option('largest','Largest first')
        +option('smallest','Smallest first')
        +`</select>`
        +(sequence
          ?`<p class="description">These categories are a sequence, so they stay in it. Sorting an
             epidemic curve by size would lose the one thing it shows.</p>`
          :'');
    })()}
    <label class="field-label" for="chart-title">Chart title</label><input id="chart-title" maxlength="120" value="${esc(p.chartTitle||'')}" placeholder="Default: result caption">
    <label class="field-label" for="chart-subtitle">Subtitle / context</label><input id="chart-subtitle" maxlength="280" value="${esc(p.subtitle||'')}" placeholder="What this figure shows, in your words">
    ${wordsHint(esc)}
    <label class="field-label" for="chart-x-axis">Horizontal axis label</label><input id="chart-x-axis" maxlength="80" value="${esc(p.xAxisTitle||'')}" placeholder="Default from data">
    ${p.panelsBy?'':`<label class="field-label" for="chart-y-axis">Vertical axis label</label><input id="chart-y-axis" maxlength="80" value="${esc(p.yAxisTitle||'')}" placeholder="Default from data">`}
    <label><input id="chart-legend" type="checkbox" ${p.colorByCategory?'checked':''}> Color categories and show legend</label>
    <label class="field-label" for="chart-source-note">Source / method note</label><textarea spellcheck="true" id="chart-source-note" maxlength="500" rows="2" placeholder="Default: connected result and run">${esc(p.sourceNote||'')}</textarea>
    `:'');
}

/** CHART'S TABLE CONTROLS: which key column the bars run along, and panels with their marks and a shaded period
 *  (experiment 174). Moved into Configure… on 2026-11-09 with the same ids. */
/** THE DATES A CHART'S AXIS RUNS OVER (experiment 210), from its last run's bins where it has run, else whether it will be
 *  dated at all: a case series by day, week or month is; by day of the week or month of the year it is a cycle, not dates. */
function datedRange(kit:ChartKit,nodeId:string):{first:string;last:string}|null|'later'{
  const bins=(kit.result()?.outputs.find(o=>o.nodeId===nodeId) as {chart?:{bins:{key:string}[]}}|undefined)?.chart?.bins;
  if(bins?.length){const keys=bins.map(b=>b.key);if(!keys.every(k=>/^\d{4}-\d{2}(-\d{2})?$/.test(k)))return null;
    const pad=(k:string)=>k.length===7?`${k}-01`:k;return {first:pad(keys[0]!),last:pad(keys.at(-1)!)};}
  const up=kit.workflow().nodes.find(m=>m.id===kit.workflow().edges.find(e=>e.to===nodeId)?.from);
  if(up?.type==='case_series')return ['weekday','month-of-year'].includes(up.params.period)?null:'later';
  return null;
}
function markedDatesControls(kit:ChartKit,nodeId:string,draft:WorkflowNode<'chart_output'>['params']):string{
  const range=datedRange(kit,nodeId);
  if(!range)return '';
  const bounds=range==='later'?'':` min="${esc(range.first)}" max="${esc(range.last)}"`;
  const marks=draft.markedDates??[];
  return `<div class="config-group"><span class="inspector-section">Marked dates</span>`
    +marks.map((m,i)=>`<div class="field"><label class="field-label" for="chart-mark-date-${i}">Date</label>`
      +`<input id="chart-mark-date-${i}" type="date" data-mark-date="${i}" value="${esc(m.date)}"${bounds}>`
      +`<label class="field-label" for="chart-mark-label-${i}">Label, in your words</label>`
      +`<input id="chart-mark-label-${i}" data-mark-label="${i}" maxlength="80" value="${esc(m.label)}" placeholder="for example Pump handle removed">`
      +`<button type="button" class="button small" data-mark-remove="${i}">Remove</button></div>`).join('')
    +`<button type="button" class="button small" id="chart-mark-add">+ Add a date</button>`
    +`<small>A line at each date, with its label, over the chart and in its figure, as the enhanced renderer draws it; the classic bars do not.${range==='later'?' The dates the chart covers are known after a run.':''}</small></div>`;
}
function chartTableControls(kit:ChartKit,n:WorkflowNode<'chart_output'>):string{
  let out='';
      // WHICH COLUMN, only where there is a choice to make. A rate keys on `group` alone, so
      // asking would be asking a question with one answer.
      const table=kit.workflow().edges.find(e=>e.to===n.id&&e.port==='records');
      const columns=table?kit.tableKeyColumns(kit.workflow().nodes.find(x=>x.id===table.from)):[];
      if(columns.length>1)
        out+=`<div class="field"><label class="field-label" for="chart-key-column">Category column</label>`
          +`<select id="chart-key-column"><option value="">First column \u00b7 ${esc(columns[0])}</option>`
          +columns.map(name=>`<option value="${esc(name)}" ${n.params.keyColumn===name?'selected':''}>${esc(name)}</option>`).join('')
          +`</select><small>This table keys on ${esc(columns.join(', '))}. One bar per row either way; the column chosen is the one the bars are labelled by.</small></div>`;
      // PANELS, for variables moving together through time (experiment 174): one per value of another key column,
      // stacked on the shared axis, each on its own scale. A mark per panel, and a period shaded across them all.
      if(columns.length>1){
        const p=n.params,held=kit.upstreamKeyValues(n)??{};
        const axis=p.keyColumn||columns[0]!;
        const panels=p.panelsBy?held[p.panelsBy]??[]:[];
        const dates=held[axis]??[],temporal=orderOf(dates)==='date'&&dates.every(d=>d.length===10);
        const sorted=[...dates].sort();
        const pyramid=p.figure==='pyramid';
        out+=`<div class="field"><label class="field-label" for="chart-panels-by">${pyramid?'Back to back, the two groups of':'One panel per'}</label>`
          +`<select id="chart-panels-by"><option value="">${pyramid?'Choose a column with two values\u2026':'No panels \u00b7 one chart'}</option>`
          +columns.filter(name=>name!==axis).map(name=>`<option value="${esc(name)}" ${p.panelsBy===name?'selected':''}>${esc(name)}</option>`).join('')
          +`</select><small>${pyramid?`Its two values sit left and right of the ${esc(axis)} bands; rows where it is blank are counted and said, not drawn.`
            :`Each value of the column gets its own panel and scale, on one shared ${esc(axis)} axis, so a count and a concentration are never drawn on one scale.`}</small></div>`
          +(panels.length&&!pyramid
            ?panels.map(panel=>`<div class="field"><label class="field-label" for="chart-panel-mark-${esc(panel)}">Mark for ${esc(panel)}</label>`
              +`<select id="chart-panel-mark-${esc(panel)}" data-panel-mark="${esc(panel)}"><option value="">Automatic</option>`
              +`<option value="bar" ${p.panelMarks?.[panel]==='bar'?'selected':''}>Bars</option>`
              +`<option value="line" ${p.panelMarks?.[panel]==='line'?'selected':''}>Line</option></select></div>`).join('')
              +(temporal
                ?`<div class="field"><span class="inspector-section">Shade a period</span>`
                  +`<label class="field-label" for="chart-shade-from">From</label><input id="chart-shade-from" type="date" data-chart-shade="from" min="${esc(sorted[0]??'')}" max="${esc(sorted.at(-1)??'')}" value="${esc(p.shade?.from??'')}">`
                  +`<label class="field-label" for="chart-shade-to">To</label><input id="chart-shade-to" type="date" data-chart-shade="to" min="${esc(sorted[0]??'')}" max="${esc(sorted.at(-1)??'')}" value="${esc(p.shade?.to??'')}">`
                  +`<small>Shaded behind every panel, both days included. Leave both empty for none.</small></div>`
                :'')
            :'')
          // OR ONE PANEL PER COLUMN (2026-11-15): several number columns of the table, each on its own scale along the
          // same axis, and a dashed line at a stated value in any of them (p = 0.05 on a p-value).
          +(!p.panelsBy&&!pyramid?(()=>{
            const numeric=columns.filter(name=>name!==axis&&(held[name]??[]).length>0&&(held[name]??[]).every(v=>v.trim()!==''&&Number.isFinite(Number(v))));
            const chosen=p.panelColumns??[];
            if(!numeric.length&&!chosen.length)return '';
            return `<fieldset class="field"><legend class="field-label">Or one panel per column</legend>`
              +[...new Set([...chosen,...numeric])].map(name=>{const on=chosen.includes(name),line=p.panelLines?.[name];
                return `<label class="check"><input type="checkbox" data-panel-column="${esc(name)}" ${on?'checked':''}> ${esc(name)}</label>`
                  +(on?`<div class="panel-column-settings"><label class="field-label" for="chart-panel-mark-${esc(name)}">Mark for ${esc(name)}</label>`
                    +`<select id="chart-panel-mark-${esc(name)}" data-panel-mark="${esc(name)}"><option value="">Automatic</option>`
                    +`<option value="bar" ${p.panelMarks?.[name]==='bar'?'selected':''}>Bars</option>`
                    +`<option value="line" ${p.panelMarks?.[name]==='line'?'selected':''}>Line</option></select>`
                    +`<label class="field-label" for="chart-panel-line-${esc(name)}">A dashed line at</label>`
                    +`<input id="chart-panel-line-${esc(name)}" type="number" step="any" data-panel-line-value="${esc(name)}" value="${line?esc(String(line.value)):''}" placeholder="None">`
                    +`<label class="field-label" for="chart-panel-line-label-${esc(name)}">Its label</label>`
                    +`<input id="chart-panel-line-label-${esc(name)}" maxlength="60" data-panel-line-label="${esc(name)}" value="${esc(line?.label??'')}" placeholder="The value"></div>`:'');}).join('')
              +`<small>Each column its own panel and scale, on one shared ${esc(axis)} axis. A column with a blank or a word in it is not offered.</small></fieldset>`;
          })():'');
      }
  return out;
}

/** WHAT THIS CHART DRAWS, in one sentence (experiment 186). */
export function chartSentence(kit:ChartKit,n:WorkflowNode<'chart_output'>):string{
  const p=n.params,from=(port:string)=>{const e=kit.workflow().edges.find(x=>x.to===n.id&&x.port===port);const up=e&&kit.workflow().nodes.find(m=>m.id===e.from);
    return up?(up.params.label||TYPES[up.type].title):'';};
  const source=from('records')||from('series')||from('polygons');
  if(!source)return 'Nothing is connected yet, so this chart has nothing to draw.';
  if(p.figure==='tree')return p.tree?.id&&p.tree.parent&&p.tree.date
    ?`Draws who infected whom in ${source} as chains over time: each case at its ${p.tree.date}, joined to the case named in ${p.tree.parent}.`
    :`Draws who infected whom in ${source} as chains over time. Name the case, infector and date columns in Configure\u2026`;
  const marked=p.markedDates?.length?`, marking ${p.markedDates.map(m=>`${m.label||m.date} on ${m.date}`).join('; ')}`:'';
  if(p.figure==='series'){const drawn=Object.entries(p.seriesMarks??{}).filter(([,m])=>m).map(([v,m])=>`${v} as ${m==='bar'?'bars':m==='dashed'?'a dashed line':'a line'}`);
    return `Draws ${source} as series together on one scale${p.panelsBy?`, one per ${p.panelsBy}`:''}${drawn.length?`: ${drawn.join(', ')}`:''}`
      +`${p.signals?.from&&p.signals.on?`, a triangle on ${p.signals.on} where ${p.signals.from} is 1`:''}${p.chartTitle?`, titled \u201c${p.chartTitle}\u201d`:''}.`;}
  if(p.figure==='stacked')return `Draws ${source} as stacked bars, one per period, divided by the values the series is split by${marked}${p.chartTitle?`, titled \u201c${p.chartTitle}\u201d`:''}.`;
  if(p.figure==='pyramid')return p.panelsBy
    ?`Draws ${source} as a population pyramid: ${p.keyColumn||'each band'} up the middle, the two groups of ${p.panelsBy} back to back.`
    :`Draws ${source} as a population pyramid. Name the column whose two groups sit back to back in Configure\u2026`;
  return `Draws ${source} as ${chartRenderer(p)==='vega-lite'&&p.mark==='point'?'dots':chartRenderer(p)==='vega-lite'&&p.mark==='line'?'a line':'bars'}${p.panelsBy?`, one panel per ${p.panelsBy}`:p.panelColumns?.length?`, one panel each for ${p.panelColumns.join(' and ')}`:''}${Object.entries(p.panelLines??{}).map(([c,l])=>`, a dashed line at ${l.value} on ${c}`).join('')}${marked}${p.chartTitle?`, titled \u201c${p.chartTitle}\u201d`:''}.`;
}


/** CHART'S CONFIGURATION DIALOG (experiment 186, 2026-11-09): what is drawn (bars, or a transmission tree), and every
 *  setting the old panels held, with their ids, on a draft written by Apply. */

export function openChartConfig(kit:ChartKit,nodeId:string){
  const node=(kit.workflow().nodes.find(x=>x.id===nodeId) as WorkflowNode<'chart_output'>);
  type Draft=WorkflowNode<'chart_output'>['params']&{view?:'map'|'table'|'bars'};
  const records=kit.workflow().edges.find(e=>e.to===nodeId&&e.port==='records');
  // A CASE SERIES ON TABLE is drawn as a curve by its periods; the bars, pyramid and tree are for other tables.
  const curve=kit.workflow().nodes.find(x=>x.id===records?.from)?.type==='case_series';
  // DRAW, QUESTION FIRST (experiment 210's proposer, 2026-11-13): the forms that suit what arrived at the last run come
  // first, each named by the question it answers, and the reason for the one chosen is said beneath.
  const upstream=kit.workflow().nodes.find(x=>x.id===records?.from);
  const arrivedTable=records?kit.result()?.tables?.[records.from] as import('./data-table.js').DataTable|undefined:undefined;
  // What the sources declared about these columns, followed here by name (experiment 211).
  const declaredScales=scalesOf(declaredUpstream(kit.workflow().nodes,kit.workflow().edges,nodeId));
  const proposals=curve?proposeChartForms({kind:'series',splitBy:(upstream as WorkflowNode<'case_series'>).params.splitBy})
    :arrivedTable?proposeChartForms({kind:'table',table:arrivedTable,scales:declaredScales}):null;
  const formValue=(f:ChartForm)=>curve?(f==='stacked'||f==='series'?f:''):f;
  const drawField=(draft:WorkflowNode<'chart_output'>['params'])=>{
    const chosen:ChartForm=curve?(draft.figure==='stacked'||draft.figure==='series'?draft.figure:'curve'):(draft.figure==='tree'||draft.figure==='pyramid'||draft.figure==='series'?draft.figure:'bars');
    const listed=proposals??proposeChartForms(curve?{kind:'series'}:{kind:'table',table:{keys:[],rows:[]}});
    const option=(p:ChartProposal)=>`<option value="${formValue(p.form)}" ${p.form===chosen?'selected':''}>${esc(p.question)} ${esc(p.name)}</option>`;
    const ordered=proposalOrder(listed),fit=ordered.filter(p=>p.fits),rest=ordered.filter(p=>!p.fits);
    const said=listed.find(p=>p.form===chosen);
    return `<div class="field"><label class="field-label" for="${curve?'chart-series-figure':'chart-figure'}">Draw</label>`
      +`<select id="${curve?'chart-series-figure':'chart-figure'}">`
      +(proposals?`<optgroup label="Suits these data">${fit.map(option).join('')}</optgroup>`
        +(rest.length?`<optgroup label="Needs other data">${rest.map(option).join('')}</optgroup>`:'')
        :listed.map(option).join(''))
      +`</select><small data-draw-because>${proposals&&said?esc(said.fits?`Suits these data: ${said.because}.`:`This ${said.because}.`)
        :'Run the workflow once to see which of these suit the data.'}</small></div>`;
  };
  // ONE PREVIEW AT A TIME: each redraw finalizes the last, which would otherwise keep its listeners.
  let previewView:{finalize:()=>void}|undefined;
  const drawChartPreview=async(host:HTMLElement,draft:WorkflowNode<'chart_output'>['params'])=>{
    previewView?.finalize();previewView=undefined;
    const drawn=kit.result()?.outputs.find(o=>o.nodeId===nodeId) as {chart?:import('./results.js').ChartSummary;tree?:import('./transmission-tree.js').TransmissionTree}|undefined;
    const sourceId=kit.workflow().edges.find(e=>e.to===nodeId)?.from;
    const context={sourceId,runId:kit.result()?.runId,sourceLabel:kit.workflow().nodes.find(n=>n.id===sourceId)?.params.label};
    let spec:object;
    if(draft.figure==='tree'){
      const t=draft.tree;
      if(!t?.id||!t.parent||!t.date||!arrivedTable){host.innerHTML='<p class="muted">Choose the case id, infected-by and date columns to see the tree.</p>';return;}
      const {transmissionTree}=await import('./transmission-tree.js');
      const {treeVegaSpec}=await import('./chart-vega.js');
      spec=treeVegaSpec(transmissionTree(arrivedTable,t),draft,context);
    }else{
      // What a setting changes in the counting itself, the key column or the panels, is recounted from the last run's
      // table; everything else is drawn from the chart the run made.
      let chart=drawn?.chart;
      const recount=!curve&&arrivedTable&&!(arrivedTable as {chart?:unknown}).chart
        &&(draft.keyColumn!==node.params.keyColumn||draft.panelsBy!==node.params.panelsBy
          ||(draft.panelColumns??[]).join('\u0000')!==(node.params.panelColumns??[]).join('\u0000')||!chart);
      if(recount)chart=tableChart(arrivedTable!,draft.keyColumn,draft.panelsBy,declaredScales,draft.panelColumns);
      if(!chart){host.innerHTML='<p class="muted">Run the workflow to preview this chart here.</p>';return;}
      if(draft.barOrder&&draft.barOrder!=='category')chart={...chart,barOrder:draft.barOrder};
      if(chartRenderer(draft)==='html'){host.innerHTML=chartMarkup(chart,esc,chartOrientation(draft));return;}
      spec=chartVegaSpec(chart,draft,context);
    }
    const {default:embed}=await import('vega-embed');
    if(!host.isConnected)return;
    const view=await embed(host,spec as never,{mode:'vega-lite',renderer:'svg',actions:false,tooltip:true});
    if(!host.isConnected){view.finalize();return;}
    previewView=view;
  };
  const columns=records?[...new Set([...kit.tableKeyColumns(kit.workflow().nodes.find(x=>x.id===records.from)),
    ...((kit.result()?.tables?.[records.from] as import('./data-table.js').DataTable|undefined)?.keys??[]),
    ...Object.keys(kit.upstreamKeyValues(node,new Set(),'records')??{})])]:[];
  openConfigDialog<Draft>({
    id:'chart-config',widget:'Chart',step:node.params.label||TYPES.chart_output.title,draft:structuredClone(node.params),
    sections:draft=>{
      const shown={...node,params:draft} as WorkflowNode<'chart_output'>;
      const tree=draft.figure==='tree';
      const pick=(id:string,key:'id'|'parent'|'date',label:string,hint:string)=>
        `<div class="field"><label class="field-label" for="${id}">${label}</label><select id="${id}" data-tree="${key}">`
        +`<option value="">Choose a column\u2026</option>`
        +columns.map(c=>`<option value="${esc(c)}" ${draft.tree?.[key]===c?'selected':''}>${esc(c)}</option>`).join('')
        +`</select><small>${hint}</small></div>`;
      const settings=(records?drawField(draft):'')
        +(tree
          ?(columns.length?'':'<p class="notice">Run the workflow once to list the table\u2019s columns.</p>')
            +pick('chart-tree-id','id','Case id','One row per case.')
            +pick('chart-tree-parent','parent','Infected by','The case id of the infector; empty where none is recorded.')
            +pick('chart-tree-date','date','Date','Year-month-day, such as the date of onset.')
            +`<div class="field"><label class="field-label" for="chart-tree-none">Written where no source is recorded (optional)</label>`
            +`<input id="chart-tree-none" data-tree="none" value="${esc(draft.tree?.none??'')}" placeholder="for example none recorded">`
            +`<small>An empty cell always means none.</small></div>`
            // THE TREE'S TITLE AND SOURCE NOTE, as any chart's (2026-11-12: the tree offered neither, and drew its default).
            +`<div class="field"><label class="field-label" for="chart-title">Chart title</label><input id="chart-title" maxlength="120" value="${esc(draft.chartTitle||'')}" placeholder="Who infected whom"></div>`+wordsHint(esc)
            +`<div class="field"><label class="field-label" for="chart-source-note">Source / method note</label><input id="chart-source-note" maxlength="300" value="${esc(draft.sourceNote||'')}"></div>`
          :(draft.figure==='series'?seriesControls(kit,shown,curve):chartTableControls(kit,shown))+chartControls(kit,shown,{omitOrientation:curve||draft.figure==='series'})
            +(curve?`<div class="field"><label class="field-label" for="series-orientation">Bars</label>`
              +`<select id="series-orientation"><option value="vertical" ${chartOrientation(draft)==='vertical'?'selected':''}>Vertical \u00b7 periods along the bottom</option>`
              +`<option value="horizontal" ${chartOrientation(draft)==='horizontal'?'selected':''}>Horizontal \u00b7 periods down the side</option></select></div>`:'')
            +markedDatesControls(kit,nodeId,draft))
        ;
      // THE CHART ITSELF, AS IT WILL LOOK (the practitioner, 2026-11-13: "The ability to preview the Chart would be extremely
      // useful"). The last run, drawn with the settings being edited, as Map's preview is; nothing is run again.
      const preview=kit.result()?.outputs.some(o=>o.nodeId===nodeId)||arrivedTable
        ?'<div id="chart-config-preview" class="chart-config-preview"></div><p class="muted">The last run, drawn with the settings above. Apply keeps them; nothing is run again.</p>'
        :'<p class="muted">Run the workflow to preview this chart here. It is drawn in Results when the workflow runs.</p>';
      return {settings,preview};
    },
    wire:(root,draft,redraw)=>{
      const on=(selector:string,fn:(el:HTMLInputElement&HTMLSelectElement&HTMLTextAreaElement)=>void)=>
        root.querySelectorAll<HTMLInputElement&HTMLSelectElement&HTMLTextAreaElement>(selector).forEach(el=>el.addEventListener('change',()=>{fn(el);redraw();}));
      on('#chart-series-figure',el=>{if(el.value==='stacked'||el.value==='series'){draft.figure=el.value;draft.renderer='vega-lite';}else delete draft.figure;});
      on('#chart-figure',el=>{if(el.value==='tree'||el.value==='pyramid'||el.value==='series'){draft.figure=el.value;if(el.value!=='tree')draft.renderer='vega-lite';}else delete draft.figure;});
      // SERIES TOGETHER: the column the series come from, a mark for each, and the periods to mark.
      on('#chart-series-by',el=>{if(el.value)draft.panelsBy=el.value;else delete draft.panelsBy;delete draft.seriesMarks;delete draft.signals;});
      on('[data-series-mark]',el=>{const marks={...(draft.seriesMarks??{})},name=el.dataset.seriesMark!;
        if(el.value)marks[name]=el.value as 'bar'|'line'|'dashed';else delete marks[name];
        if(Object.keys(marks).length)draft.seriesMarks=marks;else delete draft.seriesMarks;});
      on('[data-series-signal]',el=>{const signals={from:'',on:'',...draft.signals,[el.dataset.seriesSignal!]:el.value.trim()};
        if(signals.from||signals.on)draft.signals=signals;else delete draft.signals;});
      on('[data-tree]',el=>{draft.tree={id:'',parent:'',date:'',...draft.tree,[el.dataset.tree!]:el.value};});
      on('#chart-renderer',el=>{draft.renderer=el.value as 'html'|'vega-lite';if(draft.renderer==='html')draft.mark='bar';});
      on('#chart-mark',el=>{draft.mark=el.value as 'bar'|'point'|'line';});
      on('#chart-orientation',el=>{draft.orientation=el.value as 'horizontal'|'vertical';});
      on('#series-orientation',el=>{draft.orientation=el.value as 'horizontal'|'vertical';});
      on('#chart-key-column',el=>{if(el.value)draft.keyColumn=el.value;else delete draft.keyColumn;});
      on('#chart-panels-by',el=>{if(el.value)draft.panelsBy=el.value;else{delete draft.panelsBy;delete draft.panelMarks;delete draft.shade;}});
      on('[data-panel-mark]',el=>{const marks={...(draft.panelMarks||{})};if(el.value)marks[el.dataset.panelMark!]=el.value as 'bar'|'line';else delete marks[el.dataset.panelMark!];
        if(Object.keys(marks).length)draft.panelMarks=marks;else delete draft.panelMarks;});
      on('[data-panel-column]',el=>{const name=el.dataset.panelColumn!,held=new Set(draft.panelColumns??[]);
        if((el as HTMLElement as HTMLInputElement).checked)held.add(name);else{held.delete(name);
          if(draft.panelLines){const {[name]:_,...rest}=draft.panelLines;if(Object.keys(rest).length)draft.panelLines=rest;else delete draft.panelLines;}}
        if(held.size)draft.panelColumns=[...held];else delete draft.panelColumns;});
      on('[data-panel-line-value]',el=>{const name=el.dataset.panelLineValue!,raw=el.value.trim(),lines={...(draft.panelLines||{})};
        if(raw===''||!Number.isFinite(Number(raw)))delete lines[name];else lines[name]={value:Number(raw),label:lines[name]?.label??''};
        if(Object.keys(lines).length)draft.panelLines=lines;else delete draft.panelLines;});
      on('[data-panel-line-label]',el=>{const name=el.dataset.panelLineLabel!,at=draft.panelLines?.[name];
        if(at)draft.panelLines={...draft.panelLines,[name]:{...at,label:el.value.trim()}};});
      on('[data-chart-shade]',el=>{const shade={from:'',to:'',...draft.shade,[el.dataset.chartShade!]:el.value};
        if(shade.from||shade.to)draft.shade=shade;else delete draft.shade;});
      on('#chart-log-scale',el=>{if(el.checked)delete draft.ratioScale;else draft.ratioScale='linear';});
      on('#chart-reference-line',el=>{if(el.checked)delete draft.referenceLine;else draft.referenceLine=false;});
      on('#chart-bar-order',el=>{draft.barOrder=el.value as BarOrder;});
      for(const [selector,key] of [['#chart-title','chartTitle'],['#chart-subtitle','subtitle'],['#chart-x-axis','xAxisTitle'],['#chart-y-axis','yAxisTitle'],['#chart-source-note','sourceNote']] as const)
        on(selector,el=>{draft[key]=el.value.trim();});
      on('#chart-legend',el=>{draft.colorByCategory=el.checked;});
      on('#output-view',el=>{draft.view=el.value as Draft['view'];});
      // MARKED DATES (experiment 210): each a day and the practitioner's own label; added and removed here, kept on Apply.
      on('[data-mark-date]',el=>{const at=Number(el.dataset.markDate),list=[...(draft.markedDates??[])];list[at]={...list[at]!,date:el.value};draft.markedDates=list;});
      on('[data-mark-label]',el=>{const at=Number(el.dataset.markLabel),list=[...(draft.markedDates??[])];list[at]={...list[at]!,label:el.value.trim()};draft.markedDates=list;});
      root.querySelectorAll<HTMLButtonElement>('[data-mark-remove]').forEach(b=>b.addEventListener('click',()=>{
        const list=(draft.markedDates??[]).filter((_m,i)=>i!==Number(b.dataset.markRemove));
        if(list.length)draft.markedDates=list;else delete draft.markedDates;redraw();}));
      const previewHost=root.querySelector<HTMLElement>('#chart-config-preview');
      if(previewHost)void drawChartPreview(previewHost,draft).catch(e=>{if(previewHost.isConnected)previewHost.textContent=`The preview could not be drawn: ${errorMessage(e)}`;});
      root.querySelector<HTMLButtonElement>('#chart-mark-add')?.addEventListener('click',()=>{
        const range=datedRange(kit,nodeId);draft.markedDates=[...(draft.markedDates??[]),{date:range&&range!=='later'?range.first:'',label:''}];redraw();});
    },
    apply:draft=>{
      const {view,...params}=draft;
      if(view&&view!=='bars'){kit.change(w=>{const index=w.nodes.findIndex(x=>x.id===nodeId);
        w.nodes[index]={...w.nodes[index]!,type:'output',params:{label:params.label,view}} as never;});return;}
      // A date added and left empty is not kept: a marked date is a day.
      if(params.markedDates){params.markedDates=params.markedDates.filter(m=>/^\d{4}-\d{2}-\d{2}$/.test(m.date));if(!params.markedDates.length)delete params.markedDates;}
      kit.change(w=>{(w.nodes.find(x=>x.id===nodeId) as WorkflowNode<'chart_output'>).params=params;});
    },
  },esc);
}


/** SERIES TOGETHER'S SETTINGS (2026-11-21): the column whose values are the series (a split case series has its own), a
 *  mark for each, bars, a line or a dashed line, or not drawn, and the periods to mark where one series is 1. */
function seriesControls(kit:ChartKit,n:WorkflowNode<'chart_output'>,curve:boolean):string{
  const p=n.params;
  const records=kit.workflow().edges.find(e=>e.to===n.id&&e.port==='records');
  const up=kit.workflow().nodes.find(x=>x.id===records?.from);
  const columns=up?kit.tableKeyColumns(up):[];
  const drawn=(kit.result()?.outputs.find(o=>o.nodeId===n.id) as {chart?:{panels?:string[]}}|undefined)?.chart?.panels;
  const by=curve?(up?.type==='case_series'?up.params.splitBy:undefined):p.panelsBy;
  const values=by?[...new Set([...(drawn??[]),...((kit.upstreamKeyValues(n)??{})[by]??[])])]:[];
  const option=(value:string,label:string,current:string|undefined)=>`<option value="${esc(value)}"${(current??'')===value?' selected':''}>${esc(label)}</option>`;
  let out=curve?(by?`<p class="description">One series for each value of ${esc(by)}, as Cases by period splits it.</p>`
      :'<p class="notice">Split the series by a column in Cases by period to draw several together.</p>')
    :`<div class="field"><label class="field-label" for="chart-series-by">One series per</label><select id="chart-series-by">`
      +option('','Choose a column…',p.panelsBy)+columns.map(c=>option(c,c,p.panelsBy)).join('')+'</select>'
      +'<small>Each value of the column a series, on one scale: draw together only what is measured in the same unit.</small></div>';
  if(!values.length)return out+(by?'<p class="muted">Run the workflow once to list the series.</p>':'');
  out+='<fieldset class="field"><legend class="field-label">How each series is drawn</legend>'
    +values.map(v=>`<label class="field-label" for="chart-series-mark-${esc(v)}">${esc(v)}</label>`
      +`<select id="chart-series-mark-${esc(v)}" data-series-mark="${esc(v)}">`
      +option('',Object.keys(p.seriesMarks??{}).length?'Not drawn':'A line (every series, until one is chosen)',p.seriesMarks?.[v])
      +option('bar','Bars',p.seriesMarks?.[v])+option('line','A line',p.seriesMarks?.[v])+option('dashed','A dashed line',p.seriesMarks?.[v])+'</select>').join('')
    +'</fieldset>'
    +'<fieldset class="field"><legend class="field-label">Mark the periods where a series is 1 (optional)</legend>'
    +'<label class="field-label" for="chart-signal-from">Where this series is 1</label><select id="chart-signal-from" data-series-signal="from">'
    +option('','No marks',p.signals?.from)+values.map(v=>option(v,v,p.signals?.from)).join('')+'</select>'
    +'<label class="field-label" for="chart-signal-on">A triangle on</label><select id="chart-signal-on" data-series-signal="on">'
    +option('','Choose a series…',p.signals?.on)+values.map(v=>option(v,v,p.signals?.on)).join('')+'</select>'
    +`<label class="field-label" for="chart-signal-label">Its label, in your words</label><input id="chart-signal-label" data-series-signal="label" maxlength="40" value="${esc(p.signals?.label??'')}" placeholder="signal">`
    +'<small>A signal from Detect unusual counts is 1 on the days it signals.</small></fieldset>';
  return out;
}
