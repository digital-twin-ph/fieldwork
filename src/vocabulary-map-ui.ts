/** LINK A COLUMN'S TERMS TO WIKIDATA: its Inspector and the dialog where a person decides (experiments 186, 232).
 *
 *  The practitioner, 2026-11-24: *"The Wikidata widget configure dialog can help filter in the right link. That is
 *  for a human to decide."* So this dialog is the whole of the widget's judgement, and the run is arithmetic over
 *  what it recorded. Two things follow, and both are deliberate:
 *
 *  - **Candidates are never ranked into a choice.** They are listed as Wikidata returned them, with what it says
 *    each one is, and the filter box REORDERS rather than removes, so narrowing cannot hide the right entity.
 *  - **"None of these" is a decision**, kept as such, and told apart from a term nobody has looked at. A term the
 *    practitioner judged absent from Wikidata is a finding about the term. */
import type {WorkflowNode} from './types.js';
import type {DataTable} from './data-table.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import {openConfigDialog} from './config-dialog.js';
import {termsOf,outcomeFor,searchWikidata,narrowCandidates,WIKIDATA_ENTITY,WIKIDATA_CANDIDATES,
  type WikidataCandidate,type WikidataDecision} from './vocabulary-map.js';

export interface VocabularyKit extends StepKit {
  /** Now, as an ISO stamp, so a decision records when it was made. Injected so a test is not at the mercy of a clock. */
  now:()=>string;
  /** Read JSON from a URL. The one caller is the dialog; a run never reaches a network. */
  fetchJson:(url:string)=>Promise<unknown>;
}

export function vocabularySentence(n:WorkflowNode<'map_terms_to_vocabulary'>):string{
  const p=n.params,column=p.column?.trim();
  if(!column)return 'Gives each term a Wikidata entity a person chose for it. Choose the column in Configure…';
  const decided=Object.keys(p.decisions??{}).length;
  const linked=Object.values(p.decisions??{}).filter(Boolean).length;
  return `Writes the Wikidata entity chosen for each ${column} into ${p.linkColumn?.trim()||`${column}_wikidata`}. `
    +(decided?`${linked} of ${decided} term${decided===1?'':'s'} looked up ${linked===1?'has':'have'} a link.`
      :'Nothing has been looked up yet.');
}

/** The table on the step's input, where the last run left one: the terms come from it, and without it the dialog
 *  can offer nothing to look up. */
const tableFor=(kit:VocabularyKit,nodeId:string):DataTable|undefined=>kit.tableOn(nodeId,'records');

function openVocabularyConfig(kit:VocabularyKit,nodeId:string){
  const workflow=kit.workflow(),esc=kit.esc,node=workflow.nodes.find(x=>x.id===nodeId);
  if(node?.type!=='map_terms_to_vocabulary')return;
  const table=tableFor(kit,nodeId);
  type Draft=WorkflowNode<'map_terms_to_vocabulary'>['params'];
  const draft=structuredClone(node.params) as Draft;
  draft.decisions={...(draft.decisions??{})};
  // What the dialog holds while it is open, and never writes until Apply.
  let openTerm='';
  let candidates:WikidataCandidate[]|null=null;
  let looking=false,failed='';
  const columns=table?[...table.keys,table.valueField]:[];
  if(!draft.column&&columns.length)draft.column=columns[0]!;

  const terms=()=>table&&draft.column?termsOf(table,draft.column):[];
  const stateOf=(t:string):string=>{
    const o=outcomeFor(t,draft.decisions);
    const d=draft.decisions[t];
    return o==='linked'?`${esc(d!.label)} <span class="muted">${esc(d!.qid)}</span>`
      :o==='none chosen'?'<span class="muted">no entity, decided</span>'
      :'<span class="muted">not looked up</span>';
  };
  const look=async(term:string,redraw:()=>void)=>{
    openTerm=term;candidates=null;failed='';looking=true;redraw();
    try{candidates=await searchWikidata(term,{language:draft.language||'en',limit:WIKIDATA_CANDIDATES,fetchJson:kit.fetchJson});}
    catch(e){failed=e instanceof Error?e.message:String(e);}
    looking=false;redraw();
  };

  openConfigDialog<Draft>({
    id:'vocabulary-config',widget:'Map a column’s terms to a vocabulary',step:node.params.label||kit.title('map_terms_to_vocabulary'),
    draft,
    sections:d=>{
      if(!table)return {message:{tone:'warning' as const,
        text:'Connect a table and run the workflow once, so this step knows which terms it is being asked about.'},settings:''};
      const list=terms();
      const shown=candidates?narrowCandidates(candidates,d.kindFilter??''):[];
      return {
        settings:`<div class="field"><label class="field-label" for="wd-column">Column whose terms are linked</label>`
          +`<select id="wd-column">${columns.map(c=>`<option value="${esc(c)}"${c===d.column?' selected':''}>${esc(c)}</option>`).join('')}</select>`
          +`<p class="description">${list.length.toLocaleString('en')} distinct term${list.length===1?'':'s'} in this column.</p></div>`
          +`<div class="field"><label class="field-label" for="wd-link-column">Column the links go into</label>`
          +`<input id="wd-link-column" maxlength="60" value="${esc(d.linkColumn??'')}" placeholder="${esc(`${d.column||'term'}_wikidata`)}"></div>`
          +`<div class="field"><label class="check"><input type="checkbox" id="wd-also-qid"${d.alsoQid?' checked':''}> Also add the entity identifier</label>`
          +`<label class="check"><input type="checkbox" id="wd-also-label"${d.alsoLabel?' checked':''}> Also add the name Wikidata gives it</label></div>`,
        // THE DECIDING. One term at a time, because that is what a judgement is.
        preview:`<div class="field"><label class="field-label" for="wd-filter">What kind of thing these terms name</label>`
          +`<input id="wd-filter" value="${esc(d.kindFilter??'')}" placeholder="state, district, disease…">`
          +'<p class="description">Words matched against what Wikidata says each entity is. This <strong>reorders</strong> the '
          +'candidates and removes none, so narrowing cannot hide the right one.</p></div>'
          +'<table class="plain"><thead><tr><th>Term</th><th>Linked to</th><th></th></tr></thead><tbody>'
          +list.slice(0,200).map(t=>`<tr${t===openTerm?' class="is-open"':''}><td>${esc(t)}</td><td>${stateOf(t)}</td>`
            +`<td><button type="button" class="button small" data-wd-look="${esc(t)}">Look up</button>`
            +(t in d.decisions?` <button type="button" class="button small" data-wd-clear="${esc(t)}">Forget</button>`:'')
            +'</td></tr>').join('')
          +'</tbody></table>'
          +(list.length>200?`<p class="description">${(list.length-200).toLocaleString('en')} more terms are not shown here.</p>`:'')
          +(openTerm?`<h4>${esc(openTerm)}</h4>`
            +(looking?'<p class="muted">Asking Wikidata…</p>'
              :failed?`<p class="notice">Wikidata could not be reached: ${esc(failed)} Nothing was decided, and the terms already decided are unaffected.</p>`
              :!candidates?.length?'<p class="muted">Wikidata offered nothing for this term.</p>'
              :`<ul class="wd-candidates">${shown.map(c=>`<li><button type="button" class="button small" data-wd-pick="${esc(c.qid)}">Choose</button> `
                +`<strong>${esc(c.label)}</strong> <span class="muted">${esc(c.qid)}</span>`
                +(c.description?`<br><span class="muted">${esc(c.description)}</span>`:'')
                +` <a href="${WIKIDATA_ENTITY}${esc(c.qid)}" target="_blank" rel="noopener noreferrer">open</a></li>`).join('')}</ul>`)
            +`<p><button type="button" class="button small" data-wd-none>None of these name it</button> `
            +'<span class="muted">Kept as a decision, and told apart from a term nobody has looked at.</span></p>'
            :'<p class="muted">Choose <strong>Look up</strong> beside a term to see what Wikidata offers for it.</p>'),
      };
    },
    wire:(root,d,redraw)=>{
      const on=(sel:string,f:(el:HTMLElement)=>void)=>root.querySelectorAll<HTMLElement>(sel).forEach(el=>el.addEventListener('click',()=>f(el)));
      root.querySelector<HTMLSelectElement>('#wd-column')?.addEventListener('change',e=>{
        d.column=(e.target as HTMLSelectElement).value;openTerm='';candidates=null;redraw();});
      root.querySelector<HTMLInputElement>('#wd-link-column')?.addEventListener('change',e=>{
        d.linkColumn=(e.target as HTMLInputElement).value.trim();redraw();});
      root.querySelector<HTMLInputElement>('#wd-also-qid')?.addEventListener('change',e=>{d.alsoQid=(e.target as HTMLInputElement).checked;redraw();});
      root.querySelector<HTMLInputElement>('#wd-also-label')?.addEventListener('change',e=>{d.alsoLabel=(e.target as HTMLInputElement).checked;redraw();});
      root.querySelector<HTMLInputElement>('#wd-filter')?.addEventListener('input',e=>{
        d.kindFilter=(e.target as HTMLInputElement).value;redraw();});
      on('[data-wd-look]',el=>void look(el.dataset.wdLook!,redraw));
      on('[data-wd-clear]',el=>{delete d.decisions[el.dataset.wdClear!];redraw();});
      on('[data-wd-none]',()=>{if(openTerm){d.decisions[openTerm]=null;redraw();}});
      on('[data-wd-pick]',el=>{
        const c=candidates?.find(x=>x.qid===el.dataset.wdPick);
        if(!c||!openTerm)return;
        d.decisions[openTerm]={qid:c.qid,label:c.label,...(c.description?{description:c.description}:{}),
          decidedAt:kit.now(),ofCandidates:candidates!.length} as WikidataDecision;
        redraw();
      });
    },
    apply:d=>kit.change(w=>{
      const params=(w.nodes.find(x=>x.id===nodeId) as WorkflowNode<'map_terms_to_vocabulary'>).params;
      params.column=d.column;
      params.decisions=d.decisions;
      if(d.linkColumn?.trim())params.linkColumn=d.linkColumn.trim();else delete params.linkColumn;
      if(d.kindFilter?.trim())params.kindFilter=d.kindFilter.trim();else delete params.kindFilter;
      params.alsoQid=!!d.alsoQid;params.alsoLabel=!!d.alsoLabel;
    }),
  },esc);
}

export const vocabularyInspector:OwnInspector<'map_terms_to_vocabulary'>={
  markup:(n,kit)=>{
    const k=kit as VocabularyKit,esc=kit.esc,why=k.unfinished(n.id),method=k.method(n.id);
    return kit.section('Name',kit.name('wd-label',n.params.label||k.title('map_terms_to_vocabulary')))
      +kit.section('Inputs',kit.inputs(n,{records:'Table'}))
      +kit.section('Settings',`<p class="standard-sentence">${esc(vocabularySentence(n))}</p>`
        +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure…</button></div>')
      +kit.section('Result',`<p class="standard-result${why?' standard-result-warning':''}">${esc(why
        ?`The last run could not compute this step: ${why}`
        :method??'Run the workflow to write the links. A run asks Wikidata nothing: it writes what was chosen in Configure…')}</p>`);
  },
  wire:(n,kit,root)=>{
    root.querySelector<HTMLButtonElement>('#configure-step')?.addEventListener('click',()=>openVocabularyConfig(kit as VocabularyKit,n.id));
  },
};
