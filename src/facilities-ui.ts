/** FIND HEALTH FACILITIES, IN THE STANDARD DIALOG (experiments 186 and 190). Two ways in: inside the study area, from a
 *  source as before; or from a list, matching each row's facility name to the registers of a catalogue generated from
 *  the ontology. The preview is the outcomes of matching, counted; the decisions are the names matching could not
 *  settle, each with its candidates. Nothing reaches the step until Apply. */
import type {ParamsByType,Escape} from './types.js';
import {openConfigDialog} from './config-dialog.js';
import {FACILITY_SOURCES,FACILITY_SOURCE_KEYS,FACILITY_KINDS} from './health-facilities.js';
import {matchFacilityNames,matchCounts,OUTCOME_WORDS,DEFAULT_LIST_SETTINGS,registersFromLayer,
  type FacilityListSettings,type RegisterEntry} from './facility-matching.js';

type Params=ParamsByType['find_health_facilities'];
export interface FacilitiesDraft {mode:'area'|'list'; source:Params['source']; country:string; kinds:string; requireName:boolean;
  minConfidence:number; list:FacilityListSettings}

/** `stated` is the country the study area says, filled in where the step names none. */
export function facilitiesDraftOf(p:Params,stated=''):FacilitiesDraft{
  return {mode:p.mode??'area',source:p.source,country:p.country||stated,kinds:(p.kinds??[]).join(', '),requireName:p.requireName,
    minConfidence:p.minConfidence,list:structuredClone(p.list??DEFAULT_LIST_SETTINGS([]))};
}
export function applyFacilitiesDraft(p:Params,draft:FacilitiesDraft):void{
  p.mode=draft.mode;
  p.source=draft.source;p.country=draft.country;p.requireName=draft.requireName;p.minConfidence=draft.minConfidence;
  p.kinds=draft.kinds.split(',').map(k=>k.trim().toLowerCase()).filter(Boolean);
  p.list=structuredClone(draft.list);
  if(draft.mode==='area')delete p.list;
}

/** THE INSPECTOR'S ONE SENTENCE. */
export function facilitiesSentence(p:Params,catalogue:readonly RegisterEntry[]):string{
  if(p.mode==='list'){
    const l=p.list;
    if(!l?.nameColumn||!l.registers.length)return 'Finds each facility a list names: choose the name column and a register in Configure…';
    const titles=l.registers.map(id=>catalogue.find(r=>r.id===id)?.title??id).join(', then ');
    return `Finds the facility each row of the list names, by ${l.nameColumn}${l.areaColumn?` and ${l.areaColumn}`:''}, in ${titles}; `
      +`spelling allowed to ${l.threshold}${l.areaMarkers.length?`, and names with ${l.areaMarkers.join(' or ')} read as areas`:''}.`;
  }
  return `Finds ${(p.kinds??[]).join(', ')||'health facilities'} inside the study area, from ${FACILITY_SOURCES[p.source].label}`
    +`${p.requireName?', named ones only':''}.`;
}

export interface FacilitiesConfigView {
  step:string;
  catalogue:readonly RegisterEntry[];
  /** The list's columns, and its rows' names and areas where the list resolves without a run. */
  listColumns:string[];
  listRows?:{key:Record<string,string>}[];
  /** The registers kept on the step, as points. */
  layer?:import('./types.js').PointCollection|null;
  countries:{iso:string;name:string}[];
  initial:FacilitiesDraft;
  apply:(draft:FacilitiesDraft)=>void;
}

export function openFacilitiesConfig(view:FacilitiesConfigView,esc:Escape):void{
  const select=(id:string,label:string,options:[string,string][],current:string,empty?:string)=>
    `<div class="field"><label class="field-label" for="${id}">${esc(label)}</label><select id="${id}">`
    +(empty!==undefined?`<option value="">${esc(empty)}</option>`:'')
    +options.map(([v,w])=>`<option value="${esc(v)}"${v===current?' selected':''}>${esc(w)}</option>`).join('')+'</select></div>';
  openConfigDialog<FacilitiesDraft>({
    id:'facilities-config',widget:'Find health facilities',step:view.step,draft:view.initial,
    sections:draft=>{
      let settings=select('hf-mode','Find facilities',[['area','Inside the study area'],['list','From a list']],draft.mode);
      if(draft.mode==='area'){
        const d=FACILITY_SOURCES[draft.source];
        settings+=select('hf-source','Source',FACILITY_SOURCE_KEYS.map(k=>[k,FACILITY_SOURCES[k].label]),draft.source)
          +`<p class="description">${esc(d.detail)}</p>`
          // THE LICENCE BEFORE ANYTHING IS DOWNLOADED, for the source chosen here.
          +`<ul class="licence-links">${d.links.map(l=>`<li><a href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.label)} \u2197</a></li>`).join('')}</ul>`
          +(d.needsCountry?select('hf-country','Country',view.countries.map(c=>[c.iso,`${c.name} (${c.iso})`]),draft.country,'Choose a country…'):'')
          +(d.confidence?`<div class="field"><label class="field-label" for="hf-confidence">Least confidence to accept (0 to 1)</label>`
            +`<input id="hf-confidence" type="number" min="0" max="1" step="0.05" value="${draft.minConfidence}"></div>`:'')
          +`<div class="field"><label class="field-label" for="hf-kinds">Facility kinds</label><input id="hf-kinds" value="${esc(draft.kinds)}" placeholder="hospital, clinic">`
          +`<p class="muted">Known kinds: ${esc(FACILITY_KINDS.join(', '))}.</p></div>`
          +`<label class="check"><input type="checkbox" id="hf-require-name"${draft.requireName?' checked':''}> Keep only facilities that carry a name</label>`;
        return {settings,preview:'<p class="muted">Retrieve under Settings once the study area is connected: the area is the scope of the query.</p>'};
      }
      const l=draft.list,cols=view.listColumns.map(c=>[c,c] as [string,string]);
      settings+=(cols.length?'':'<p class="notice">Connect the list first: a table with a column naming each facility.</p>')
        +select('hf-name-column','Column naming the facility',cols,l.nameColumn,'Choose a column…')
        +select('hf-area-column','Column naming its area (optional)',cols,l.areaColumn??'','Not used')
        +`<fieldset class="field"><legend class="field-label">Registers, matched in this order</legend>`
        +view.catalogue.map(r=>`<label class="check"><input type="checkbox" data-hf-register="${esc(r.id)}"${l.registers.includes(r.id)?' checked':''}${r.readable?'':' disabled'}> `
          +`${esc(r.title)} · ${esc(r.country)}${r.readable?'':' · not readable'}</label>`).join('')
        +'<p class="muted">From the facility registers declared in the ontology. A register is fetched once, under Settings.</p></fieldset>'
        +`<div class="field"><label class="field-label" for="hf-threshold">Spelling allowed: similarity at least (0 to 1)</label>`
        +`<input id="hf-threshold" type="number" min="0.5" max="1" step="0.01" value="${l.threshold}"></div>`
        +`<div class="field"><label class="field-label" for="hf-area-words">Words that mark a name as an area, not a facility</label>`
        +`<input id="hf-area-words" value="${esc(l.areaMarkers.join(', '))}" placeholder="Communities"></div>`;
      if(!l.nameColumn||!l.registers.length)return {settings,preview:'<p class="muted">Choose the name column and a register to see how the names match.</p>'};
      if(!view.layer||!view.listRows)return {settings,preview:'<p class="muted">Fetch the register under Settings, and run the workflow once with the list connected, '
        +'and the matches are shown here before they are applied.</p>'};
      const loaded=registersFromLayer(view.layer,view.catalogue,l.registers);
      if(!loaded.some(r=>r.facilities.length))return {settings,message:{tone:'warning',text:'The registers chosen are not the ones fetched: fetch again under Settings.'}};
      const list=view.listRows.map(r=>({name:String(r.key[l.nameColumn]??'').trim(),area:l.areaColumn?String(r.key[l.areaColumn]??'').trim():''})).filter(r=>r.name);
      const matches=matchFacilityNames(list,loaded,l);
      const counts=matchCounts(list.map(r=>r.name),matches);
      const preview='<table class="relate-shares"><thead><tr><th>Outcome</th><th>Names</th><th>Rows</th></tr></thead><tbody>'
        +counts.map(c=>`<tr><th scope="row">${esc(OUTCOME_WORDS[c.outcome])}</th><td>${c.names}</td><td>${c.rows.toLocaleString('en-US')}</td></tr>`).join('')
        +'</tbody></table><p class="muted">Rows with a facility become points at the register’s position, not where anyone on the list lived.</p>';
      const open=[...matches].filter(([,m])=>m.outcome==='ambiguous'||m.outcome==='type-differs');
      const decisions=open.length
        ?`<p>${open.length} name${open.length===1?'':'s'} matching could not settle. Choose the facility each means, or none.</p>`
          +open.map(([name,m],i)=>`<div class="field"><label class="field-label" for="hf-decide-${i}">${esc(name)} · ${esc(OUTCOME_WORDS[m.outcome])}</label>`
            +`<select id="hf-decide-${i}" data-hf-decide="${esc(name)}"><option value="">Not decided</option><option value="none"${l.decisions[name]==='none'?' selected':''}>None of these</option>`
            +m.candidates.map(c=>`<option value="${esc(c.facility.id)}"${l.decisions[name]===c.facility.id?' selected':''}>`
              +`${esc(c.facility.name)} · ${esc(c.facility.type)} · ${esc(c.facility.area)} · ${c.score.toFixed(2)}</option>`).join('')
            +'</select></div>').join('')
        :undefined;
      return {settings,preview,...(decisions?{decisions}:{})};
    },
    wire:(root,draft,redraw)=>{
      const on=(id:string,fn:(el:HTMLInputElement&HTMLSelectElement)=>void)=>{const el=root.querySelector<HTMLInputElement&HTMLSelectElement>(`#${id}`);
        if(el)el.onchange=()=>{fn(el);redraw();};};
      on('hf-mode',el=>{draft.mode=el.value as 'area'|'list';});
      on('hf-source',el=>{draft.source=el.value as Params['source'];});
      on('hf-country',el=>{draft.country=el.value;});
      on('hf-confidence',el=>{draft.minConfidence=Number(el.value);});
      on('hf-kinds',el=>{draft.kinds=el.value;});
      on('hf-require-name',el=>{draft.requireName=el.checked;});
      on('hf-name-column',el=>{draft.list.nameColumn=el.value;});
      on('hf-area-column',el=>{if(el.value)draft.list.areaColumn=el.value;else delete draft.list.areaColumn;});
      on('hf-threshold',el=>{const n=Number(el.value);if(Number.isFinite(n)&&n>=0.5&&n<=1)draft.list.threshold=n;});
      on('hf-area-words',el=>{draft.list.areaMarkers=el.value.split(',').map(w=>w.trim()).filter(Boolean);});
      root.querySelectorAll<HTMLInputElement>('[data-hf-register]').forEach(el=>el.onchange=()=>{
        const id=el.dataset.hfRegister!;
        draft.list.registers=el.checked?[...draft.list.registers.filter(r=>r!==id),id]:draft.list.registers.filter(r=>r!==id);redraw();});
      root.querySelectorAll<HTMLSelectElement>('[data-hf-decide]').forEach(el=>el.onchange=()=>{
        const name=el.dataset.hfDecide!;if(el.value)draft.list.decisions[name]=el.value;else delete draft.list.decisions[name];redraw();});
    },
    apply:view.apply,
  },esc);
}
