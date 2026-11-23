/** FIND HEALTH FACILITIES, IN THE STANDARD DIALOG (experiments 186 and 190). Two ways in: inside the study area, from a
 *  source as before; or from a list, matching each row's facility name to the registers of a catalogue generated from
 *  the ontology. The preview is the outcomes of matching, counted; the decisions are the names matching could not
 *  settle, each with its candidates. Nothing reaches the step until Apply. */
import type {Boundary,ParamsByType,Escape,PointCollection,Workflow} from './types.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import {openConfigDialog} from './config-dialog.js';
import {FACILITY_SOURCES,FACILITY_SOURCE_KEYS,FACILITY_KINDS,downloadFacilities,fetchHotExport,requireRunnableFindHealthFacilities} from './health-facilities.js';
import {matchFacilityNames,matchCounts,OUTCOME_WORDS,DEFAULT_LIST_SETTINGS,registersFromLayer,fetchRegister,registerLayer,
  type FacilityListSettings,type RegisterEntry,type LoadedRegister} from './facility-matching.js';

type Params=ParamsByType['find_health_facilities'];
export interface FacilitiesDraft {mode:'area'|'list'; source:Params['source']; country:string; kinds:string; requireName:boolean;
  minConfidence:number; list:FacilityListSettings}

/** `stated` is the country the study area says, filled in where the step names none. */
export function facilitiesDraftOf(p:Params,stated=''):FacilitiesDraft{
  return {mode:p.mode??'area',source:p.source,country:p.country||stated,kinds:(p.kinds??[]).join(', '),requireName:p.requireName,
    minConfidence:p.minConfidence,list:{...structuredClone(p.list??DEFAULT_LIST_SETTINGS([])),...(!p.list?.country&&stated?{country:stated}:{})}};
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
    const titles=l.registers.map(id=>{const r=catalogue.find(x=>x.id===id);return !r?id:r.anyCountry?`${r.title} for ${l.country||'a country not chosen'}`:r.title;}).join(', then ');
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
  // The country for a register that covers every country: by default the one the other registers chosen name.
  const countryOfOthers=(ids:readonly string[])=>view.catalogue.find(r=>ids.includes(r.id)&&r.country)?.country??undefined;
  if(!view.initial.list.country){const c=countryOfOthers(view.initial.list.registers);if(c)view.initial.list.country=c;}
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
          +`${esc(r.title)} · ${esc(r.anyCountry?'any country':r.country??'')}${r.nameOnly?' · matched by name only':''}${r.readable?'':' · not readable'}</label>`).join('')
        +'<p class="muted">From the facility registers declared in the ontology. A register is fetched once, under Settings.</p></fieldset>'
        // A REGISTER FOR EVERY COUNTRY needs the one to read: offered first is the country of the other registers chosen.
        +((any=>any?select('hf-list-country',`Country to read ${any.title} for`,view.countries.map(c=>[c.iso,`${c.name} (${c.iso})`]),l.country??'','Choose a country…')
          +'<p class="muted">A register matched by name only has no facility types: a name it matches allowing for spelling is held for you to review.</p>':'')
          (view.catalogue.find(r=>l.registers.includes(r.id)&&r.anyCountry)))
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
        +'</tbody></table>'
        +((h=>h?`<p>${h} name${h===1?' was':'s were'} matched allowing for spelling by a register with no facility types, and ${h===1?'is':'are'} held for review below.</p>`:'')
          ([...matches.values()].filter(m=>m.held).length))
        +'<p class="muted">Rows with a facility become points at the register’s position, not where anyone on the list lived.</p>';
      const open=[...matches].filter(([,m])=>m.outcome==='ambiguous'||m.outcome==='type-differs'||m.held);
      const decisions=open.length
        ?`<p>${open.length} name${open.length===1?'':'s'} matching could not settle. Choose the facility each means, or none.</p>`
          +open.map(([name,m],i)=>`<div class="field"><label class="field-label" for="hf-decide-${i}">${esc(name)} · ${esc(m.held?`${OUTCOME_WORDS[m.outcome]}, by name only`:OUTCOME_WORDS[m.outcome])}</label>`
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
      on('hf-list-country',el=>{if(el.value)draft.list.country=el.value;else delete draft.list.country;});
      on('hf-area-column',el=>{if(el.value)draft.list.areaColumn=el.value;else delete draft.list.areaColumn;});
      on('hf-threshold',el=>{const n=Number(el.value);if(Number.isFinite(n)&&n>=0.5&&n<=1)draft.list.threshold=n;});
      on('hf-area-words',el=>{draft.list.areaMarkers=el.value.split(',').map(w=>w.trim()).filter(Boolean);});
      root.querySelectorAll<HTMLInputElement>('[data-hf-register]').forEach(el=>el.onchange=()=>{
        const id=el.dataset.hfRegister!;
        draft.list.registers=el.checked?[...draft.list.registers.filter(r=>r!==id),id]:draft.list.registers.filter(r=>r!==id);
        if(!draft.list.country){const c=countryOfOthers(draft.list.registers);if(c)draft.list.country=c;}
        redraw();});
      root.querySelectorAll<HTMLSelectElement>('[data-hf-decide]').forEach(el=>el.onchange=()=>{
        const name=el.dataset.hfDecide!;if(el.value)draft.list.decisions[name]=el.value;else delete draft.list.decisions[name];redraw();});
    },
    apply:view.apply,
  },esc);
}

/** WHAT FIND HEALTH FACILITIES' INSPECTOR IS GIVEN BY THE APPLICATION (2026-11-23, the rest of the Inspector move). */
export interface FacilitiesKit extends StepKit {
  catalogue:readonly RegisterEntry[];
  countries:readonly {iso:string;name:string}[];
  /** The one country the study area upstream states, if it states one. */
  stated:(nodeId:string)=>string|null;
  /** The list's columns, and its rows where the list resolves without a run. */
  listOn:(nodeId:string)=>{columns:string[];rows?:{key:Record<string,string>}[]};
  /** The study area that bounds the query. */
  boundary:(nodeId:string)=>Boundary;
  /** Keeps a fetched layer on this device by its digest; refuses where it cannot. */
  keepLayer:(layer:PointCollection)=>Promise<string>;
  /** A change that must reach storage: false where it was refused. */
  saved:(edit:(w:Workflow)=>void)=>boolean;
  say:(message:string,failure?:boolean)=>void;
}

type FacilitiesNode=import('./types.js').WorkflowNode<'find_health_facilities'>;
const nodeIn=(w:Workflow,id:string)=>{const n=w.nodes.find(x=>x.id===id);return n?.type==='find_health_facilities'?n as FacilitiesNode:undefined;};

export const facilitiesInspector:OwnInspector<'find_health_facilities'>={
  markup:(n,kit)=>{const k=kit as FacilitiesKit,esc=kit.esc,p=n.params,descriptor=FACILITY_SOURCES[p.source],list=p.mode==='list';
    const fetched=list?p.registerRetrieved:p.retrieved;
    // STALE when the registers chosen, or the country read for one covering every country, are not what was fetched.
    const stale=list&&!!p.registerRetrieved&&!!p.list&&(p.list.registers.join()!==p.registerRetrieved.registers.map(r=>r.id).join()
      ||p.registerRetrieved.registers.some(r=>r.country&&r.country!==p.list?.country));
    const why=k.unfinished(n.id),ran=k.method(n.id);
    const held=list
      ?(p.registerRetrieved?`Holds ${p.registerRetrieved.registers.map(r=>`${r.title}: ${r.records.toLocaleString('en-US')} facilities`).join('; ')}, fetched ${p.registerRetrieved.at.slice(0,10)}.`:'No register fetched yet.')
      :(p.retrieved?`${p.retrieved.kept} facilities from ${p.retrieved.sourceLabel}, retrieved ${p.retrieved.at.slice(0,10)}. Scope: ${p.retrieved.scope}. `
        +((d=>d.kind+d.coordinates+d.name?`Dropped ${d.kind} of an unrequested kind, ${d.coordinates} outside the area or without coordinates, ${d.name} without a name.`:'No records dropped.')(p.retrieved.dropped))
        +(p.retrieved.belowConfidence!==undefined?` ${p.retrieved.belowConfidence} below the confidence threshold; ${p.retrieved.unmappedCategory??0} of a health category not mapped to a facility kind.`:'')
        :'No facilities retrieved yet. Connect a study area: it is the scope of the query.');
    return kit.section('Name',kit.name('hf-label',p.label||k.title('find_health_facilities')))
      +kit.section('Inputs',kit.inputs(n,{list:'The list',area:'Study area'}))
      +kit.section('Settings',`<p class="standard-sentence">${esc(facilitiesSentence(p,k.catalogue))}</p>`
        +`<div class="inspector-actions">${list
          ?`<button id="hf-fetch-registers" class="button${!fetched||stale?' primary':''}"${p.list?.registers.length?'':' disabled'}>${fetched?'Fetch the registers again':'Fetch the registers'}</button>`
          :`<button id="hf-retrieve" class="button${fetched?'':' primary'}">Retrieve facilities</button>`}`
        +`<button id="configure-step" class="button${fetched&&!stale?' primary':''}">Configure\u2026</button></div>`
        +`<p id="hf-status" role="status" class="description"></p>`
        +(stale?'<p class="notice notice-warning">The registers or the country chosen are not the ones fetched. Fetch them again.</p>':'')
        +(list?'':`<ul class="licence-links">${descriptor.links.map(l=>`<li><a href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.label)} \u2197</a></li>`).join('')}</ul>`))
      +kit.section('Result',`<p class="standard-result${why?' standard-result-warning':''}">${esc(why?`The last run could not compute this step: ${why}`:held)}</p>`
        +(ran&&!why?`<p class="standard-state">${esc(ran.split('. ').slice(0,2).join('. '))}.</p>`:'')
        // THE ATTRIBUTION THE LICENCE REQUIRES, where the facilities are: ODbL asks that it stay with the data.
        +(!list&&p.retrieved?`<p class="description">${esc(p.retrieved.attribution)}</p>`:'')
        +(list&&p.registerRetrieved?.registers.some(r=>r.licence.includes('odbl'))?`<p class="description">${esc(FACILITY_SOURCES['hdx-hot-export'].attribution)}</p>`:'')
        +(list&&p.registerRetrieved?`<p class="description">${esc(p.registerRetrieved.registers.map(r=>`${r.title}, ${r.licence.includes('by/4.0')?'CC BY 4.0':r.licence}`).join('; '))}</p>`:'')
        +'<div data-standard-result></div>');},
  wire:(n,kit,root)=>{const k=kit as FacilitiesKit;
    const status=()=>root.querySelector<HTMLElement>('#hf-status');
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=nodeIn(kit.workflow(),n.id);if(!node)return;
      const {columns,rows}=k.listOn(n.id);
      openFacilitiesConfig({step:node.params.label||k.title('find_health_facilities'),catalogue:k.catalogue,listColumns:columns,
        ...(rows?{listRows:rows}:{}),layer:node.params.mode==='list'?node.params.data:null,countries:[...k.countries],
        // THE STUDY AREA ALREADY SAYS WHICH COUNTRY: filled in, never retyped (the practitioner, 2026-10-23).
        initial:facilitiesDraftOf(node.params,k.stated(n.id)||''),
        apply:draft=>{k.saved(w=>{const target=nodeIn(w,n.id);if(!target)return;const was=target.params.mode??'area';
          applyFacilitiesDraft(target.params,draft);
          // A CHANGE OF WAY IN changes the input: what was connected to the other one is disconnected, and what was
          // fetched for the other one is not this one's.
          if(was!==(draft.mode??'area')){w.edges=w.edges.filter(e=>e.to!==n.id);target.params.data=null;target.params.retrieved=null;
            delete target.params.registerRetrieved;delete (target.params as {dataRef?:string}).dataRef;}});},
      },kit.esc);
    });
    root.querySelector<HTMLButtonElement>('#hf-fetch-registers')?.addEventListener('click',async e=>{
      const button=e.currentTarget as HTMLButtonElement,node=nodeIn(kit.workflow(),n.id);if(!node)return;
      const ids=node.params.list?.registers??[],country=node.params.list?.country;
      button.disabled=true;
      try{
        const loaded:LoadedRegister[]=[];
        for(const id of ids){
          const register=k.catalogue.find(r=>r.id===id);
          if(!register)throw new Error(`${id} is not in the register catalogue.`);
          const s=status();if(s)s.textContent=`Fetching ${register.title}\u2026`;
          const forCountry=register.anyCountry?country:undefined;
          loaded.push({register:forCountry?{...register,title:`${register.title}, ${forCountry}`}:register,
            facilities:await fetchRegister(register,fetch,{...(forCountry?{country:forCountry}:{}),readExport:(iso,f)=>fetchHotExport(iso,f).then(got=>got.payload)})});
        }
        const layer=registerLayer(loaded),digest=await k.keepLayer(layer),at=new Date().toISOString();
        if(k.saved(w=>{const target=nodeIn(w,n.id);if(!target)return;target.params.data=layer;
          (target.params as {dataRef?:string}).dataRef=digest;
          target.params.registerRetrieved={registers:loaded.map(({register,facilities})=>({id:register.id,title:register.title,
            licence:register.licence,records:facilities.length,...(register.anyCountry&&country?{country}:{})})),at};}))
          k.say(`${loaded.map(l=>`${l.facilities.length.toLocaleString('en-US')} facilities from ${l.register.title}`).join('; ')}. Run the workflow to match the list.`);
      }catch(error){const message=error instanceof Error?error.message:String(error);const s=status();if(s)s.textContent=message;k.say(message,true);}
      finally{button.disabled=false;}
    });
    root.querySelector<HTMLButtonElement>('#hf-retrieve')?.addEventListener('click',async e=>{
      const button=e.currentTarget as HTMLButtonElement;
      let node=nodeIn(kit.workflow(),n.id);if(!node)return;
      button.disabled=true;button.textContent='Retrieving\u2026';
      try{
        // A country the study area stated and nobody touched is still the country. Written onto the node before the
        // request, so the receipt says what was asked for rather than leaving it to be inferred from an area the
        // workflow may later be rewired away from.
        if(!node.params.country){const stated=k.stated(n.id);
          if(stated){kit.change(w=>{const t=nodeIn(w,n.id);if(t)t.params.country=stated;});node=nodeIn(kit.workflow(),n.id)??node;}}
        const baseline=JSON.stringify(kit.workflow());
        requireRunnableFindHealthFacilities(node);
        const boundary=k.boundary(n.id),s=status();
        if(s)s.textContent=`Querying ${FACILITY_SOURCES[node.params.source].label}\u2026`;
        const {parsed,retrieval}=await downloadFacilities(node,boundary,undefined,message=>{const t=status();if(t)t.textContent=message;});
        if(JSON.stringify(kit.workflow())!==baseline)throw new Error('The workflow changed during retrieval. Press Retrieve again with the current area.');
        if(k.saved(w=>{const t=nodeIn(w,n.id);if(!t)return;t.params.data=parsed.collection;t.params.retrieved=retrieval;}))
          k.say(`${parsed.kept} facilities retrieved. Run the workflow to use them.`);
      }catch(error){const message=error instanceof Error?error.message:String(error);const s=status();if(s)s.textContent=message;k.say(message);}
      finally{button.disabled=false;button.textContent='Retrieve facilities';}
    });
  },
};
