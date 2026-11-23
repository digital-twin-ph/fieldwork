/** STREET NETWORK, ON THE STANDARD (experiment 186), 2026-11-23: off the old catchment panel. Name, Inputs, Settings in
 *  one sentence with what acquiring the network needs (a download, an extract, a file) and Configure…, Result with the
 *  network held. Every setting is in the dialog; acquisition stays in Settings, as Find health facilities' Retrieve does. */
import type {Boundary,Workflow,WorkflowNode} from './types.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import {openConfigDialog} from './config-dialog.js';
import {downloadLimits,NETWORK_NODE_LIMIT_MAX,NETWORK_MEASURED_NODES,JSON_EDITOR_ELEMENT_LIMIT,offersJsonEditor,
  defaultTravelMode,validateCatchmentNode,type Network,type NetworkTravelMode} from './catchments.js';
import {networkDownloadStatus} from './network-throttle.js';
import {payloadStoreKind,payloadBytes,dropPayload} from './payload-store.js';
import {extractsFor,EXTRACT_CATALOGUE_TAKEN} from './extract-catalogue.js';
import {networkPreviewSvg,networkPreviewCaption,networkCoverage,PREVIEW_SCALE_NOTE} from './network-preview.js';
import {downloadOSMInTiles} from './network-tiles.js';
import {importNetwork,type OverpassStatus} from './street-network.js';
import {errorMessage} from './guards.js';

type Params=WorkflowNode<'network_input'>['params'];
type Method='file'|'osm'|'extract';

export interface NetworkKit extends StepKit {
  /** The study area connected, and the published boundary it is, where one is. */
  area:(nodeId:string)=>{boundary:Boundary;boundaryID?:string}|undefined;
  /** Keeps a network on this device by its digest; null where it cannot. */
  keepNetwork:(network:Network)=>Promise<string|null>;
  /** A change that must reach storage: false where it was refused. */
  saved:(edit:(w:Workflow)=>void)=>boolean;
  say:(message:string,failure?:boolean)=>void;
}

/** A download in progress, the last failure and the last endpoint check, kept across Inspector redraws. Not fetched on
 *  render: every check is a request to a donated service. */
let downloadError:string|null=null,downloadPhase:string|null=null;
let endpointStatuses:OverpassStatus[]|null=null,endpointsCheckedAt:string|null=null;

const methodOf=(p:Params):Method=>p.inputMethod==='osm'||p.inputMethod==='extract'?p.inputMethod:'file';
const modeOf=(p:Params,boundaryID?:string):NetworkTravelMode=>p.travelMode??defaultTravelMode(boundaryID);
const mb=(bytes:number)=>(bytes/1e6).toFixed(1);
const nodeIn=(w:Workflow,id:string)=>{const n=w.nodes.find(x=>x.id===id);return n?.type==='network_input'?n as WorkflowNode<'network_input'>:undefined;};
const MODE_WORDS:Record<NetworkTravelMode,string>={walking:'walking',driving:'driving'};

export function networkSentence(p:Params,boundaryID?:string):string{
  const m=methodOf(p),margin=(p.marginM??250).toLocaleString('en');
  if(m==='osm')return `A street network for ${MODE_WORDS[modeOf(p,boundaryID)]}, downloaded from OpenStreetMap for the study area and `
    +`${margin} m around it, up to ${(p.maxNodes??50000).toLocaleString('en')} junctions.`;
  if(m==='extract')return `A street network for ${MODE_WORDS[modeOf(p,boundaryID)]}, read from a published OpenStreetMap extract `
    +`and clipped to the study area and ${margin} m around it.`;
  return 'A street network read from a GraphML or JSON file.';
}

/** The picture, its measurement, and the sentence saying the network did not reach the ground asked for, where it did not. */
function preview(data:Network,boundary:Boundary|undefined,esc:(s:string)=>string):string{
  if(!data.nodes.length)return '';
  const coverage=networkCoverage(data,boundary),short=coverage.boundaryCovered!==null&&coverage.boundaryCovered<0.999;
  return `<div class="network-preview-frame">${networkPreviewSvg(data,boundary)}</div>`
    +`<p class="muted">${esc(networkPreviewCaption(coverage))}</p>`
    +(boundary?`<p class="${short?'notice':'muted'}">${esc(PREVIEW_SCALE_NOTE(coverage))}</p>`:'');
}

function acquisition(n:WorkflowNode<'network_input'>,k:NetworkKit,area:ReturnType<NetworkKit['area']>):string{
  const p=n.params,esc=k.esc,limits=downloadLimits(p.maxNodes);
  const m=methodOf(p);
  if(m==='osm')return (payloadStoreKind()==='indexeddb'?'':'<p class="notice" id="network-store-warning">Saved data is in the small store on this device, about 5 MB in all, so a street network will be refused. Export the workflow to keep one.</p>')
    +'<div class="inspector-actions"><button class="button primary" id="download-network">Download and save OSM network</button>'
    +'<button class="button" id="stop-network-download" hidden>Stop</button></div>'
    +'<p id="network-download-status" role="status"></p>'
    +'<p class="muted">Sends the study area\'s bounds to overpass-api.de, which is asked to count first, so too large an area is refused before anything is sent. One request at a time, at least 60 seconds apart.</p>'
    +'<div class="field"><button class="button" id="check-endpoints">Check endpoint status</button><div id="endpoint-status"></div></div>';
  if(m==='extract'){
    const regions=area?extractsFor(area.boundary):[];
    return '<div class="field"><label class="field-label" for="network-extract">Published .osm.pbf extract</label>'
      +'<input id="network-extract" type="file" accept=".pbf,.osm.pbf,application/octet-stream"></div>'
      +'<p id="network-extract-status" class="muted"></p>'
      // THE QUERY IS THE APP'S, THE FETCH IS THE BROWSER'S: Geofabrik sends no CORS header, so the links hand over the URL.
      +(!area?'':!regions.length?'<p class="muted">No catalogued extract covers this area.</p>'
        :'<p class="field-label">No extract yet? Download one covering this area</p><div class="extract-links">'
          +regions.map(r=>`<a class="button" href="${esc(r.pbf)}" download target="_blank" rel="noopener noreferrer">↓ ${esc(r.name)}</a>`).join('')
          +`</div><small>${esc(`Your browser downloads it from ${new URL(regions[0]!.pbf).host}, which this application cannot fetch from. `
            +`Catalogue of ${EXTRACT_CATALOGUE_TAKEN}; ODbL. A country is typically hundreds of megabytes. Choose the file above once it has landed.`)}</small>`);
  }
  return '<div class="field"><label class="field-label" for="network-upload">GraphML or JSON file</label>'
    +'<input id="network-upload" type="file" accept=".json,.graphml,application/json,application/xml">'
    +`<small>${esc(`GraphML (directed, its CRS EPSG:4326), raw Overpass JSON, or a network JSON this application exported, up to ${mb(limits.maxBytes)} MB. A file keeps its own extent.`)}</small></div>`
    +(!p.data.nodes.length?'':!offersJsonEditor(p.data)
      ?`<p class="muted">${esc(`Too large to edit here: ${(p.data.nodes.length+p.data.edges.length).toLocaleString('en')} junctions and streets against ${JSON_EDITOR_ELEMENT_LIMIT.toLocaleString('en')}. Export the workflow to work on the graph.`)}</p>`
      :`<details><summary>Edit the network JSON</summary><label class="field-label" for="network-json">Nodes, edges and source</label>`
        +`<textarea id="network-json" rows="10">${esc(JSON.stringify(p.data,null,2))}</textarea>`
        +'<button class="button" id="save-network">Save network edits</button>'
        +'<p class="muted">Directed edges need from, to and lengthM in metres.</p></details>');
}

function paintEndpoints(root:ParentNode,esc:(s:string)=>string){
  const box=root.querySelector<HTMLElement>('#endpoint-status');if(!box)return;
  if(!endpointStatuses){box.innerHTML='';return;}
  box.innerHTML=endpointStatuses.map(s=>{
    const host=s.url.replace(/^https?:\/\//,'').replace(/\/api.*$/,'');
    const state=!s.reachable?`not answering: ${s.error||'no reply'}`
      :s.slotsAvailable===undefined?'answering; it did not say how busy it is'
      :s.slotsAvailable>0?`${s.slotsAvailable} of ${s.rateLimit??s.slotsAvailable} slots free now`
      :`busy${typeof s.waitSeconds==='number'?`, next slot in ${s.waitSeconds} s`:''}`;
    return `<p><strong>${esc(s.operator)}</strong> · ${esc(state)}${esc(s.runningQueries?`, ${s.runningQueries} running`:'')}`
      +`<br><span class="muted">${esc(host)}</span></p>`;
  }).join('')+`<p class="muted">${esc(`Checked ${endpointsCheckedAt??''}. Each answer is that instance's own.`)}</p>`;
}

/** THE DOWNLOAD BUTTON AND ITS LINE, each second: what the service allows now, and why not where it does not. */
export function networkDownloadTick(busy:boolean,root:ParentNode=document):void{
  const button=root.querySelector<HTMLButtonElement>('#download-network'),line=root.querySelector<HTMLElement>('#network-download-status');
  if(!button||!line)return;
  const state=networkDownloadStatus();
  button.disabled=busy||state.inFlight||state.waitSeconds>0;
  line.textContent=state.inFlight?(downloadPhase??'One OSM request is in progress.')
    :downloadError?downloadError+(state.waitSeconds?` Next attempt available in ${state.waitSeconds} seconds.`:'')
    :state.waitSeconds?`Next OSM download available in ${state.waitSeconds} seconds. Saved graphs are available offline.`
    :'Ready for one bounded OSM request; no automatic refresh.';
}

interface NetworkDraft {inputMethod:Method;travelMode:NetworkTravelMode;marginM:string;pauseSeconds:string;maxNodes:string}

export const networkInspector:OwnInspector<'network_input'>={
  markup:(n,kit)=>{const k=kit as NetworkKit,p=n.params,esc=kit.esc,area=k.area(n.id),why=k.unfinished(n.id);
    const held=p.data.provenance as Record<string,unknown>|undefined;
    return kit.section('Name',kit.name('network-label',p.label||k.title('network_input')))
      +kit.section('Inputs',kit.inputs(n,{area:'Study area'}))
      +kit.section('Settings',`<p class="standard-sentence">${esc(networkSentence(p,area?.boundaryID))}</p>`
        +acquisition(n,k,area)
        +'<div class="inspector-actions"><button id="configure-step" class="button">Configure…</button></div>')
      +kit.section('Result',(why?`<p class="standard-result standard-result-warning">${esc(`The last run could not use this network: ${why}`)}</p>`:'')
        +(p.data.nodes.length
          ?`<p class="standard-result">${esc(`${p.data.nodes.length.toLocaleString('en')} junctions and ${p.data.edges.length.toLocaleString('en')} directed streets, saved on this step${methodOf(p)==='osm'?'. A download replaces it only when it finishes':''}.`)}</p>`
            +preview(p.data,area?.boundary,esc)
            +`<p class="muted">${esc(p.data.source)}</p>`
            +(held?.travelMode?`<p class="muted">${esc(`Downloaded for ${String(held.travelMode)}.`)}</p>`:'')
            +(held?`<p class="muted">${esc(held.fromCache
              ?`Served from this device's cache, first retrieved ${String(held.retrievedAt??'at an unrecorded time')}.`
              :`${String(held.attribution??'OpenStreetMap contributors')}, retrieved ${String(held.retrievedAt??'at an unrecorded time')}.`)}</p>`:'')
          :'<p class="standard-result">No network yet.</p>'));},
  wire:(n,kit,root)=>{const k=kit as NetworkKit;
    const keepOrDrop=async(network:Network,refusal:string)=>{
      const digest=await k.keepNetwork(network);
      if(!digest)throw new Error(`This ${mb(payloadBytes(network))} MB street network could not be kept on this device, so it was not saved. ${refusal}`);
      // AND IF THE WORKFLOW WILL NOT TAKE IT, the payload goes back out: nothing else would refer to it.
      if(k.saved(w=>{const t=nodeIn(w,n.id);if(t){t.params.data=network;t.params.dataRef=digest;}}))return true;
      await dropPayload(digest);return false;
    };
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=nodeIn(kit.workflow(),n.id);if(!node)return;const p=node.params,boundaryID=k.area(n.id)?.boundaryID;
      const fallback=defaultTravelMode(boundaryID);
      openConfigDialog<NetworkDraft>({id:'network-config',widget:'Street network',step:p.label||'',
        draft:{inputMethod:methodOf(p),travelMode:modeOf(p,boundaryID),marginM:String(p.marginM??250),
          pauseSeconds:String(p.pauseSeconds??60),maxNodes:String(p.maxNodes??50000)},
        sections:d=>{const num=(key:'marginM'|'pauseSeconds'|'maxNodes',label:string,min:number,max:number)=>
            `<div class="field"><label class="field-label" for="network-${key}">${label}</label>`
            +`<input id="network-${key}" data-network="${key}" type="number" min="${min}" max="${max}" value="${kit.esc(d[key])}"></div>`;
          const limits=downloadLimits(Number(d.maxNodes));
          const settings='<div class="field"><label class="field-label" for="network-input-method">Where the network comes from</label><select id="network-input-method">'
            +([['file','A GraphML or JSON file'],['osm','Download from OpenStreetMap'],['extract','A published .osm.pbf extract (Geofabrik)']] as const)
              .map(([v,w])=>`<option value="${v}"${d.inputMethod===v?' selected':''}>${w}</option>`).join('')+'</select></div>'
            +(d.inputMethod==='file'?''
              :`<div class="field"><label class="field-label" for="network-travel-mode">Travel mode to ${d.inputMethod==='osm'?'download':'read'} for</label><select id="network-travel-mode">`
                +(['walking','driving'] as const).map(v=>`<option value="${v}"${d.travelMode===v?' selected':''}>${v[0]!.toUpperCase()+v.slice(1)}</option>`).join('')+'</select>'
                +'<small>Walking keeps footways, paths and steps; driving keeps roads and their one-way rules.</small></div>'
                +(p.travelMode===undefined&&d.travelMode===fallback&&fallback==='driving'
                  ?`<p class="muted">Default for a published ${kit.esc(/-(ADM[0-9])-/i.exec(boundaryID??'')?.[1]?.toUpperCase()??'')} unit.</p>`:'')
                +num('marginM',`${d.inputMethod==='osm'?'Download':'Clip'} margin outside the study area (metres)`,0,2000))
            +(d.inputMethod!=='osm'?''
              :num('pauseSeconds','Least pause between OpenStreetMap requests (seconds)',60,900)
                +num('maxNodes','Graph limit (junctions); streets allowed at 2.5 times this',500,NETWORK_NODE_LIMIT_MAX)
                +`<p class="muted">${kit.esc(`Accepts ${mb(limits.maxBytes)} MB and ${limits.maxFeatures.toLocaleString('en')} features.`)}</p>`
                +(Number(d.maxNodes)>NETWORK_MEASURED_NODES?`<p class="notice">${kit.esc(`Past the largest response this project has downloaded: ${NETWORK_MEASURED_NODES.toLocaleString('en')} junctions from 7.4 MB.`)}</p>`:''));
          let refusal:{blocked?:boolean;message?:{tone:'refusal';text:string}}={};
          try{validateCatchmentNode({...node,params:{...p,...paramsOf(d,p,fallback)}});}catch(error){refusal={blocked:true,message:{tone:'refusal',text:errorMessage(error)}};}
          return {settings,...refusal};},
        wire:(r,d,redraw)=>{
          r.querySelector<HTMLSelectElement>('#network-input-method')!.onchange=e=>{d.inputMethod=(e.target as HTMLSelectElement).value as Method;redraw();};
          r.querySelector<HTMLSelectElement>('#network-travel-mode')?.addEventListener('change',e=>{d.travelMode=(e.target as HTMLSelectElement).value as NetworkTravelMode;redraw();});
          r.querySelectorAll<HTMLInputElement>('[data-network]').forEach(el=>el.onchange=()=>{(d as unknown as Record<string,string>)[el.dataset.network!]=el.value;redraw();});},
        apply:d=>kit.change(w=>{const t=nodeIn(w,n.id);if(!t)return;
          const q=paramsOf(d,t.params,fallback);Object.assign(t.params,q);if(q.travelMode===undefined)delete t.params.travelMode;}),
      },kit.esc);
    });
    root.querySelector('#network-upload')?.addEventListener('change',async e=>{
      const input=e.target as HTMLInputElement,file=input.files?.[0];if(!file)return;
      const baseline=JSON.stringify(kit.workflow());
      try{const node=nodeIn(kit.workflow(),n.id);if(!node)return;
        const data=await importNetwork(file,node.params.maxNodes);
        if(JSON.stringify(kit.workflow())!==baseline)throw new Error('The workflow changed while the file was read. Choose the file again.');
        await keepOrDrop(data,'Export the workflow to a file to keep it.');
      }catch(error){k.say(errorMessage(error),true);}
      finally{input.value='';}
    });
    root.querySelector('#save-network')?.addEventListener('click',()=>{
      try{const text=root.querySelector<HTMLTextAreaElement>('#network-json')!.value;
        if(text.length>2000000)throw new Error('Network JSON exceeds 2 MB.');
        const data=JSON.parse(text) as Network;
        k.saved(w=>{const t=nodeIn(w,n.id);if(t)t.params.data=data;});
      }catch(error){k.say(errorMessage(error),true);}
    });
    // AN EXTRACT ON THIS DEVICE: read where it sits, clipped to the study area as it is decoded, in a worker so the page
    // stays answerable; only the network it yields is kept (experiment 129).
    root.querySelector('#network-extract')?.addEventListener('change',async e=>{
      const input=e.target as HTMLInputElement,file=input.files?.[0];if(!file)return;
      const status=root.querySelector<HTMLElement>('#network-extract-status'),say=(m:string)=>{if(status)status.textContent=m;};
      const baseline=JSON.stringify(kit.workflow());
      try{const area=k.area(n.id);if(!area)throw new Error('Connect a study area: the extract is clipped to it.');
        const node=nodeIn(kit.workflow(),n.id);if(!node)return;
        const {networkInWorker}=await import('./street-engine.js');
        const network=await networkInWorker(new Uint8Array(await file.arrayBuffer()),{boundary:area.boundary,
          mode:modeOf(node.params,area.boundaryID),marginM:node.params.marginM??250,walkSpeedMPerMin:75,onPhase:say});
        if(JSON.stringify(kit.workflow())!==baseline)throw new Error('The workflow changed while the extract was read. Choose the file again.');
        say('Keeping it on this device…');
        if(await keepOrDrop(network,'')){say('');
          k.say(`${network.nodes.length.toLocaleString('en')} junctions read from the extract and saved on this device. Run the workflow to update results.`);}
      }catch(error){say('');k.say(errorMessage(error),true);}
      finally{input.value='';}
    });
    root.querySelector<HTMLButtonElement>('#check-endpoints')?.addEventListener('click',async e=>{
      const button=e.currentTarget as HTMLButtonElement;
      button.disabled=true;button.textContent='Asking each instance…';
      try{const {overpassStatuses}=await import('./street-network.js');
        endpointStatuses=await overpassStatuses();endpointsCheckedAt=new Date().toLocaleTimeString();}
      catch(error){k.say(errorMessage(error),true);}
      finally{button.disabled=false;button.textContent='Check endpoint status';paintEndpoints(root,kit.esc);}
    });
    paintEndpoints(root,kit.esc);
    root.querySelector<HTMLButtonElement>('#download-network')?.addEventListener('click',async e=>{
      const button=e.currentTarget as HTMLButtonElement,baseline=JSON.stringify(kit.workflow());
      button.disabled=true;button.textContent='Downloading bounded OSM network…';
      // WHO ENDS AN ARRIVING DOWNLOAD: the person watching the megabytes climb, not a clock.
      const stop=new AbortController(),stopButton=root.querySelector<HTMLButtonElement>('#stop-network-download');
      if(stopButton){stopButton.hidden=false;stopButton.onclick=()=>{stopButton.disabled=true;stopButton.textContent='Stopping…';stop.abort();};}
      try{const area=k.area(n.id);if(!area)throw new Error('Connect a study area: its bounds are what is downloaded.');
        const node=nodeIn(kit.workflow(),n.id);if(!node)return;const p=node.params;
        const data=await downloadOSMInTiles(area.boundary,p.marginM??250,p.maxNodes,(p.pauseSeconds??60)*1000,!!p.data?.nodes?.length,
          (phase,fraction)=>{downloadPhase=phase;
            const line=root.querySelector<HTMLElement>('#network-download-status');if(line)line.textContent=phase;
            const bar=root.querySelector<HTMLButtonElement>('#download-network');
            if(bar){bar.textContent=phase;const pct=Math.round(Math.min(1,fraction??0)*100);
              bar.style.backgroundImage=fraction===undefined?'':`linear-gradient(to right, var(--accent) ${pct}%, transparent ${pct}%)`;}},
          modeOf(p,area.boundaryID),stop.signal);
        if(JSON.stringify(kit.workflow())!==baseline)throw new Error('Workflow changed during download; retry with the current boundary.');
        // The graph goes to the payload store and the workflow keeps a reference (experiment 121).
        if(await keepOrDrop(data,'Export the workflow to a file to keep it, or cover a smaller area.')){downloadError=null;
          k.say('OSM network saved on this device. Run the workflow to update results.');}
      }catch(error){downloadError=errorMessage(error);k.say(downloadError,true);}
      finally{button.disabled=false;button.textContent='Download and save OSM network';button.style.backgroundImage='';downloadPhase=null;
        if(stopButton){stopButton.hidden=true;stopButton.disabled=false;stopButton.textContent='Stop';stopButton.onclick=null;}}
    });
  },
};

/** A travel mode left to the default is not written, so the default can follow the study area until someone chooses. */
function paramsOf(d:NetworkDraft,p:Params,fallback:NetworkTravelMode):Partial<Params>{
  const chosen=p.travelMode!==undefined||d.travelMode!==fallback;
  return {inputMethod:d.inputMethod,...(d.inputMethod!=='file'?{marginM:Number(d.marginM)}:{}),
    ...(d.inputMethod==='osm'?{pauseSeconds:Number(d.pauseSeconds),maxNodes:Number(d.maxNodes)}:{}),
    travelMode:d.inputMethod!=='file'&&chosen?d.travelMode:p.travelMode};
}
