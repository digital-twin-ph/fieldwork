/** TWO-BY-TWO, IN THE STANDARD DIALOG (experiment 186, 2026-11-14; the practitioner: "If we touch 2x2 we have to
 *  standardize"). The Inspector says in one sentence what is compared; the layout, the columns and values that make
 *  a, b, c and d, the exposures and the interval level are here, with the four cells as the preview, and nothing reaches
 *  the workflow until Apply. It replaces the mapping dialog of experiment 153 and the fields that sat in the Inspector
 *  beside it: one place to map the table, which still shows the cells while they are mapped. The controls keep the ids
 *  they had in the Inspector, so a manual names the same control in its new place. */
import type {DataTable} from './data-table.js';
import type {Escape,ParamsByType} from './types.js';
import {openConfigDialog} from './config-dialog.js';
import {cellsMarkup,exposureColumnsOffered} from './two-by-two-mapping.js';

type Params=ParamsByType['two_by_two'];
export interface TwoByTwoDraft {
  layout:'cases'|'rates'; rowsAreSubjects:boolean;
  exposureColumn:string; exposures:string[]; exposed:string; unexposed:string;
  outcomeColumn:string; caseValue:string; nonCaseValue:string; unitsAtRiskValue:string;
  level:90|95|99;
}

export function twoByTwoDraftOf(p:Params):TwoByTwoDraft{
  return {layout:p.unitsAtRiskValue!==undefined?'rates':'cases',rowsAreSubjects:!!p.rowsAreSubjects,
    exposureColumn:p.exposureColumn,exposures:[...(p.exposureColumns??(p.exposureColumn?[p.exposureColumn]:[]))],
    exposed:p.exposed,unexposed:p.unexposed,outcomeColumn:p.outcomeColumn,caseValue:p.caseValue,
    nonCaseValue:p.nonCaseValue,unitsAtRiskValue:p.unitsAtRiskValue??'',level:p.level};
}

export function applyTwoByTwoDraft(p:Params,d:TwoByTwoDraft):void{
  const rates=d.layout==='rates',list=!rates&&d.rowsAreSubjects;
  p.exposureColumn=list?(d.exposures[0]??''):d.exposureColumn;
  if(list&&d.exposures.length>1)p.exposureColumns=[...d.exposures];else delete p.exposureColumns;
  p.exposed=d.exposed;p.unexposed=d.unexposed;p.outcomeColumn=d.outcomeColumn;p.caseValue=d.caseValue;p.level=d.level;
  if(rates){p.unitsAtRiskValue=d.unitsAtRiskValue;delete p.rowsAreSubjects;}
  else{delete p.unitsAtRiskValue;p.nonCaseValue=d.nonCaseValue;if(d.rowsAreSubjects)p.rowsAreSubjects=true;else delete p.rowsAreSubjects;}
}

/** THE INSPECTOR'S ONE SENTENCE. */
export function twoByTwoSettingsSentence(p:Params):string{
  const rates=p.unitsAtRiskValue!==undefined;
  const exposures=p.exposureColumns?.length?p.exposureColumns:[p.exposureColumn].filter(Boolean);
  if(!exposures.length||!p.exposed||!p.unexposed||!p.outcomeColumn||!p.caseValue||!(rates?p.unitsAtRiskValue:p.nonCaseValue))
    return 'Map the table onto the two-by-two, in Configure…';
  const of=exposures.length>1?`${exposures.length} exposures (${exposures.join(', ')})`:exposures[0];
  return rates
    ?`${p.caseValue} per ${p.unitsAtRiskValue} in ${p.outcomeColumn}, ${p.exposed} against ${p.unexposed} in ${of}; ${p.level}% intervals.`
    :`${p.caseValue} against ${p.nonCaseValue} in ${p.outcomeColumn}, ${p.exposed} against ${p.unexposed} in ${of}, `
      +`${p.rowsAreSubjects?'each row one subject':'each row a count'}; ${p.level}% intervals.`;
}

export interface TwoByTwoConfigView {
  step:string; sourceLabel:string;
  /** Each column of the table coming in, with the values it holds. */
  values:Record<string,readonly string[]>;
  /** The columns a line list offers as exposures, for the groups chosen. */
  exposuresOffered:(d:TwoByTwoDraft)=>string[];
  table?:DataTable|undefined;
  initial:TwoByTwoDraft;
  apply:(d:TwoByTwoDraft)=>void;
}

export function openTwoByTwoConfig(view:TwoByTwoConfigView,esc:Escape):void{
  const columns=Object.keys(view.values);
  openConfigDialog<TwoByTwoDraft>({
    id:'two-by-two-config',widget:'Two-by-two table',step:view.step,draft:view.initial,
    sections:d=>{
      const rates=d.layout==='rates',list=!rates&&d.rowsAreSubjects;
      const offered=list?view.exposuresOffered(d):[];
      const exposureColumn=list?(d.exposures[0]??offered[0]??''):d.exposureColumn;
      const column=(id:string,key:'exposureColumn'|'outcomeColumn',label:string)=>
        `<div class="field"><label class="field-label" for="${id}">${label}</label><select id="${id}" data-mapping="${key}">`
        +`<option value="">${columns.length?'Choose a column…':'Connect a table first'}</option>`
        +columns.map(c=>`<option value="${esc(c)}"${d[key]===c?' selected':''}>${esc(c)}</option>`).join('')+'</select></div>';
      const value=(id:string,key:'exposed'|'unexposed'|'caseValue'|'nonCaseValue'|'unitsAtRiskValue',label:string,from:string)=>{
        const held=view.values[from]??[];
        return `<div class="field"><label class="field-label" for="${id}">${label}</label>`
          +(held.length
            ?`<select id="${id}" data-mapping="${key}"><option value="">Choose a value…</option>`
              +held.map(v=>`<option value="${esc(v)}"${d[key]===v?' selected':''}>${esc(v)}</option>`).join('')+'</select>'
            :`<input id="${id}" data-mapping="${key}" maxlength="120" value="${esc(d[key])}">`)+'</div>';
      };
      const settings=`<p class="description">Compares two groups in <strong>${esc(view.sourceLabel)}</strong>. The table must `
        +(rates?'already be totalled: one row per group for the events and one for the units at risk.</p>'
          :d.rowsAreSubjects?'hold one row per subject, as a line list does.</p>'
          :'already be totalled: one row per combination of the exposure and the outcome.</p>')
        +(d.rowsAreSubjects?''
          :`<div class="field"><label class="field-label" for="twobytwo-layout">The outcome column holds</label>`
            +`<select id="twobytwo-layout"><option value="cases"${rates?'':' selected'}>cases and non-cases</option>`
            +`<option value="rates"${rates?' selected':''}>events and units at risk</option></select></div>`)
        +(rates?'':`<label class="check"><input type="checkbox" id="twobytwo-rows"${d.rowsAreSubjects?' checked':''}> Each row is one subject, as in a line list</label>`)
        +'<div class="mapping-grid">'
        +(list?'':column('twobytwo-exposure','exposureColumn','Exposure column'))
        +value('twobytwo-exposed','exposed','Exposed',exposureColumn)
        +value('twobytwo-unexposed','unexposed','Unexposed',exposureColumn)
        +column('twobytwo-outcome','outcomeColumn','Outcome column')
        +(rates?value('twobytwo-case','caseValue','Events',d.outcomeColumn)+value('twobytwo-units','unitsAtRiskValue','Units at risk',d.outcomeColumn)
          :value('twobytwo-case','caseValue','Case',d.outcomeColumn)+value('twobytwo-noncase','nonCaseValue','Non-case',d.outcomeColumn))
        +'</div>'
        +(list
          ?`<fieldset class="field exposure-list"><legend class="field-label">Exposures to compare</legend>`
            +(offered.length?offered.map(c=>`<label class="check"><input type="checkbox" data-twobytwo-exposure="${esc(c)}"${d.exposures.includes(c)?' checked':''}> ${esc(c)}</label>`).join('')
              :'<p class="muted">Choose the outcome column, and the columns holding the exposed and unexposed values are offered.</p>')
            +'</fieldset>':'')
        +`<div class="field"><label class="field-label" for="twobytwo-level">Interval level</label><select id="twobytwo-level">`
        +[90,95,99].map(l=>`<option value="${l}"${d.level===l?' selected':''}>${l}%</option>`).join('')+'</select></div>';
      const request={label:'',exposureColumn,exposed:d.exposed,unexposed:d.unexposed,outcomeColumn:d.outcomeColumn,
        caseValue:d.caseValue,nonCaseValue:d.nonCaseValue,level:d.level,...(rates?{unitsAtRiskValue:d.unitsAtRiskValue}:{}),
        ...(d.rowsAreSubjects&&!rates?{rowsAreSubjects:true}:{})} as Params;
      const preview=(view.table?'':'<p class="muted">Run the workflow once the table is connected, and the cells these settings make are counted here.</p>')
        +cellsMarkup(view.table,request,esc)
        +(list&&d.exposures.length>1?`<p class="muted">The cells of ${esc(d.exposures[0]!)}; each of the ${d.exposures.length} exposures is its own two-by-two.</p>`:'');
      return {settings,preview};
    },
    wire:(root,d,redraw)=>{
      root.querySelector<HTMLSelectElement>('#twobytwo-layout')?.addEventListener('change',e=>{
        d.layout=(e.target as HTMLSelectElement).value==='rates'?'rates':'cases';if(d.layout==='rates')d.rowsAreSubjects=false;redraw();});
      root.querySelector<HTMLInputElement>('#twobytwo-rows')?.addEventListener('change',e=>{
        d.rowsAreSubjects=(e.target as HTMLInputElement).checked;
        if(d.rowsAreSubjects&&!d.exposures.length&&d.exposureColumn)d.exposures=[d.exposureColumn];redraw();});
      root.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-mapping]').forEach(el=>el.addEventListener('change',()=>{
        const key=el.dataset.mapping as 'exposureColumn'|'outcomeColumn'|'exposed'|'unexposed'|'caseValue'|'nonCaseValue'|'unitsAtRiskValue';
        d[key]=el.value.trim();
        // A NEW COLUMN DROPS THE VALUES CHOSEN FROM THE OLD ONE: they name values it may not hold.
        if(key==='exposureColumn'){d.exposed='';d.unexposed='';}
        if(key==='outcomeColumn'){d.caseValue='';d.nonCaseValue='';d.unitsAtRiskValue='';}
        redraw();}));
      // THE EXPOSURES IN THE ORDER TICKED: those already kept, then any newly ticked in the order shown.
      root.querySelectorAll<HTMLInputElement>('[data-twobytwo-exposure]').forEach(el=>el.addEventListener('change',()=>{
        const now=[...root.querySelectorAll<HTMLInputElement>('[data-twobytwo-exposure]')].filter(b=>b.checked).map(b=>b.dataset.twobytwoExposure!);
        d.exposures=[...d.exposures.filter(c=>now.includes(c)),...now.filter(c=>!d.exposures.includes(c))];redraw();}));
      root.querySelector<HTMLSelectElement>('#twobytwo-level')?.addEventListener('change',e=>{
        d.level=Number((e.target as HTMLSelectElement).value) as 90|95|99;redraw();});
    },
    apply:view.apply,
  },esc);
}
