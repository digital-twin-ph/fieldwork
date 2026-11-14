/** TOTAL WITHIN GROUPS, IN THE STANDARD DIALOG (experiments 186 and 191). The Inspector says in one sentence what the
 *  step totals; the columns kept, the aggregate, empty cells and shares are here, with the table the draft would make,
 *  and nothing reaches the workflow until Apply. The controls keep the ids they had in the Inspector, so a manual names
 *  the same control in its new place. */
import type {DataTable} from './data-table.js';
import type {ParamsByType,Escape} from './types.js';
import {openConfigDialog} from './config-dialog.js';
import {dataTableMarkup,wireTablePages} from './data-table-ui.js';
import {AGGREGATES,groupTable,type Aggregate} from './group-table.js';

type GroupParams=ParamsByType['group_table'];
export interface GroupDraft {by:string[]; aggregate:Aggregate; excludeMissing:boolean; share:boolean; within:string[]; total:string}

export function groupDraftOf(p:GroupParams):GroupDraft{
  return {by:[...p.by],aggregate:p.aggregate??'sum',excludeMissing:!!p.excludeMissing,share:!!p.share,within:[...(p.share?.within??[])],total:p.total??''};
}
export function applyGroupDraft(p:GroupParams,draft:GroupDraft):void{
  p.by=[...draft.by];
  if(draft.aggregate==='sum')delete p.aggregate;else p.aggregate=draft.aggregate;
  if(draft.excludeMissing&&draft.aggregate!=='count')p.excludeMissing=true;else delete p.excludeMissing;
  if(draft.share&&(draft.aggregate==='sum'||draft.aggregate==='count'))p.share={within:draft.within.filter(w=>draft.by.includes(w))};
  else delete p.share;
  if(draft.total&&draft.aggregate!=='count'&&!draft.by.includes(draft.total))p.total=draft.total;else delete p.total;
}

const AGGREGATE_WORDS:Record<Aggregate,string>={sum:'Sum',minimum:'Minimum',maximum:'Maximum',count:'Count rows',mean:'Mean',median:'Median'};

/** THE INSPECTOR'S ONE SENTENCE. */
export function groupSentence(p:GroupParams):string{
  if(!p.by.length)return 'Choose the key columns to keep, in Configure…';
  const verb:Record<Aggregate,string>={sum:'Adds up',minimum:'Takes the minimum of',maximum:'Takes the maximum of',
    count:'Counts',mean:'Takes the mean of',median:'Takes the median of'};
  const agg=p.aggregate??'sum';
  const how=agg==='count'?'Counts the rows':p.total?`${verb[agg]} ${p.total} over the rows`:`${verb[agg]} the rows`;
  return `${how} that agree on ${p.by.join(' and ')}${p.excludeMissing&&p.aggregate!=='count'?', excluding empty cells':''}`
    +(p.share?`, with each group's share ${p.share.within.length?`within ${p.share.within.join(' and ')}`:'of the whole table'}, %`:'')+'.';
}

export interface GroupConfigView {
  step:string;
  sourceLabel:string;
  /** The key columns of the table coming in. */
  columns:string[];
  /** The table's value column, summarised unless another is chosen. */
  valueField?:string|undefined;
  table?:DataTable;
  initial:GroupDraft;
  apply:(draft:GroupDraft)=>void;
}

export function openGroupConfig(view:GroupConfigView,esc:Escape):void{
  let shown:DataTable|undefined;
  openConfigDialog<GroupDraft>({
    id:'group-config',widget:'Total within groups',step:view.step,draft:view.initial,
    sections:draft=>{
      const adds=draft.aggregate==='sum'||draft.aggregate==='count';
      let settings=`<p class="description">Turns the rows of <strong>${esc(view.sourceLabel)}</strong> that agree on the `
        +'columns you keep into one row each. The columns you do not keep are gone from the result.</p>'
        +(view.columns.length
          ?`<fieldset id="group-keep" class="field"><legend class="field-label">Key columns to keep</legend>`
            +view.columns.map(c=>`<label class="check"><input type="checkbox" value="${esc(c)}" data-group-by="${esc(c)}"${draft.by.includes(c)?' checked':''}> ${esc(c)}</label>`).join('')
            +'</fieldset>'
          :`<div class="field"><label class="field-label" for="group-by">Key columns to keep, one per line</label>`
            +`<textarea id="group-by" rows="3">${esc(draft.by.join('\n'))}</textarea></div>`)
        +''
        +`<div class="field"><label class="field-label" for="group-aggregate">Aggregate</label><select id="group-aggregate">`
        +AGGREGATES.map(a=>`<option value="${a}"${draft.aggregate===a?' selected':''}>${AGGREGATE_WORDS[a]}</option>`).join('')+'</select>'
        +`${draft.aggregate==='count'?'<p class="muted">Counts rows, not people.</p>':''}</div>`
        +(draft.aggregate==='count'?''
          :`<div class="field"><label class="field-label" for="group-total">Column to total</label><select id="group-total">`
            +`<option value=""${draft.total?'':' selected'}>${esc(view.valueField||'The value column')}</option>`
            +view.columns.filter(c=>!draft.by.includes(c)).map(c=>`<option value="${esc(c)}"${draft.total===c?' selected':''}>${esc(c)}</option>`).join('')
            +'</select></div>')
        +(draft.aggregate==='count'?''
          :`<label class="check"><input type="checkbox" id="group-exclude-missing"${draft.excludeMissing?' checked':''}> Total what is present, excluding empty cells</label>`)
        +(adds
          ?`<label class="check"><input type="checkbox" id="group-share"${draft.share?' checked':''}> Add each group's share, %</label>`
            +(draft.share&&draft.by.length
              ?`<fieldset id="group-within" class="field"><legend class="field-label">Share within (none ticked: of the whole table)</legend>`
                +draft.by.map(c=>`<label class="check"><input type="checkbox" value="${esc(c)}" data-group-within="${esc(c)}"${draft.within.includes(c)?' checked':''}> ${esc(c)}</label>`).join('')
                +'<p class="muted">The groups within each value of a ticked column total 100%. Held to one decimal place.</p></fieldset>':'')
          :'<p class="muted">A share is offered with Sum and Count rows: a minimum, maximum, mean or median does not add up to a total.</p>');
      shown=undefined;
      if(!draft.by.length)return {settings,preview:'<p class="muted">Choose the key columns to keep.</p>'};
      if(!view.table)return {settings,preview:'<p class="muted">Run the workflow once the table is connected, and the table these '
        +'settings make is shown here before they are applied.</p>'};
      try{
        const result=groupTable(view.table,{by:draft.by,aggregate:draft.aggregate,
          ...(draft.total&&!draft.by.includes(draft.total)?{total:draft.total}:{}),...(draft.excludeMissing&&draft.aggregate!=='count'?{excludeMissing:true}:{}),
          ...(draft.share&&adds?{share:{within:draft.within.filter(w=>draft.by.includes(w))}}:{})});
        shown=result.table;
        // BEFORE AND AFTER, as Apply ruleset's and Select rows' dialogs show them (2026-11-14: "the two total within
        // groups have no before and after preview"): the rows coming in, then the table these settings make.
        const preview=`<h4>Before: ${esc(view.sourceLabel)}, ${view.table.rows.length.toLocaleString()} rows</h4>`
          +`<div class="group-before">${dataTableMarkup(view.table,esc,{pageSize:6})}</div>`
          +`<h4>After</h4><p class="select-preview-count">${result.collapsedFrom.toLocaleString()} rows into <strong>${result.groups.toLocaleString()}</strong> groups`
          +`${result.shares?`, each with its ${esc(result.shares.name)}`:''}.</p>`
          +`<div class="group-preview">${dataTableMarkup(result.table,esc,{pageSize:12})}</div>`;
        const decisions=result.gaps.length&&!result.excluded
          ?`<p>${result.gaps.length} group${result.gaps.length===1?' holds':'s hold'} an empty cell and total${result.gaps.length===1?'s':''} to nothing known: `
            +result.gaps.slice(0,8).map(g=>`<strong>${esc(g.group)}</strong>`).join(', ')+(result.gaps.length>8?` and ${result.gaps.length-8} more`:'')
            +'. Tick “Total what is present” to total what was recorded, and say so.</p>':undefined;
        return {settings,preview,...(decisions?{decisions}:{})};
      }catch(error){return {settings,message:{tone:'refusal',text:error instanceof Error?error.message:String(error)},blocked:true};}
    },
    wire:(root,draft,redraw)=>{
      if(shown)wireTablePages(root.querySelector<HTMLElement>('.group-preview'),shown,esc,{pageSize:12});
      if(shown&&view.table)wireTablePages(root.querySelector<HTMLElement>('.group-before'),view.table,esc,{pageSize:6});
      // THE KEPT COLUMNS ARE A LIST IN ORDER, and EVERY BOX IS READ ON ANY CHANGE, so several ticked at once -- as a
      // manual's step does -- are all kept: the order already kept, then any newly ticked in the order shown.
      const ticked=(attr:string)=>[...root.querySelectorAll<HTMLInputElement>(`[${attr}]`)].filter(b=>b.checked).map(b=>b.value);
      const ordered=(held:string[],now:string[])=>[...held.filter(c=>now.includes(c)),...now.filter(c=>!held.includes(c))];
      root.querySelectorAll<HTMLInputElement>('[data-group-by]').forEach(el=>el.addEventListener('change',()=>{
        draft.by=ordered(draft.by,ticked('data-group-by'));
        draft.within=draft.within.filter(w=>draft.by.includes(w));redraw();}));
      root.querySelector<HTMLTextAreaElement>('#group-by')?.addEventListener('change',e=>{
        draft.by=(e.target as HTMLTextAreaElement).value.split('\n').map(l=>l.trim()).filter(Boolean);redraw();});
      root.querySelector<HTMLSelectElement>('#group-aggregate')?.addEventListener('change',e=>{
        draft.aggregate=(e.target as HTMLSelectElement).value as Aggregate;redraw();});
      root.querySelector<HTMLSelectElement>('#group-total')?.addEventListener('change',e=>{
        draft.total=(e.target as HTMLSelectElement).value;redraw();});
      root.querySelector<HTMLInputElement>('#group-exclude-missing')?.addEventListener('change',e=>{
        draft.excludeMissing=(e.target as HTMLInputElement).checked;redraw();});
      root.querySelector<HTMLInputElement>('#group-share')?.addEventListener('change',e=>{
        draft.share=(e.target as HTMLInputElement).checked;redraw();});
      root.querySelectorAll<HTMLInputElement>('[data-group-within]').forEach(el=>el.addEventListener('change',()=>{
        draft.within=ordered(draft.within,ticked('data-group-within'));redraw();}));
    },
    apply:view.apply,
  },esc);
}

