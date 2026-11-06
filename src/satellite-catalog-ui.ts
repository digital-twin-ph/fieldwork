/** THE DIALOG FOR SEARCH A SATELLITE CATALOG, in Fieldwork's dialog style.
 *
 *  Three columns and their wording adapted from JLT's STAC Browser (https://github.com/jltobias/JupyterLite-STAC-Browser,
 *  commit 945d8b3, MIT): *Connect & discover*, *Coverage, in context*, *Inspect & reuse*. The practitioner, 2026-11-05:
 *  *"Let's follow FW style for dialogs."* What Fieldwork changes: the catalog and collection come from the chosen
 *  product and the area from the workflow's study area, so neither is chosen twice; each file says its licence as
 *  read, sign-in, whether a browser can read it, its attribution, and that its completeness is not yet known. The area
 *  is a connected Study area's extent, or four edges typed here, JLT's W/S/E/N field: 0.28.0 required the Study area
 *  and its Search stayed grey without one, *"not enough for the search"* (the practitioner, 2026-11-05).
 *  Experiment 179. */
import type {Escape} from './types.js';
import {SIGN_IN_WORDS,type SatelliteProduct} from './satellite-products.js';
import {citationMarkup} from './satellite-products-ui.js';
import {MAX_ITEMS,defaultKept,searchCatalog,searchSentence,typedBox,type BBox,type CatalogItem,type CatalogSearch} from './satellite-catalog.js';

/** Footprints and the study area, drawn as an outline map in longitude and latitude. Offline: no tiles. */
export function coverageSvg(area:BBox,items:CatalogItem[],selected:string|undefined,esc:Escape):string{
  const boxes=[area,...items.map(i=>i.bbox).filter((b):b is BBox=>!!b)];
  const W=Math.min(...boxes.map(b=>b[0])),S=Math.min(...boxes.map(b=>b[1])),E=Math.max(...boxes.map(b=>b[2])),N=Math.max(...boxes.map(b=>b[3]));
  const w=360,h=240,pad=8,sx=(w-2*pad)/Math.max(E-W,1e-6),sy=(h-2*pad)/Math.max(N-S,1e-6),s=Math.min(sx,sy);
  const x=(lon:number)=>pad+(lon-W)*s,y=(lat:number)=>h-pad-(lat-S)*s;
  const rect=(b:BBox,cls:string,id='')=>`<rect class="${cls}"${id?` data-sat-footprint="${esc(id)}"`:''} x="${x(b[0]).toFixed(1)}" `
    +`y="${y(b[3]).toFixed(1)}" width="${((b[2]-b[0])*s).toFixed(1)}" height="${((b[3]-b[1])*s).toFixed(1)}"/>`;
  return `<svg class="satellite-coverage" viewBox="0 0 ${w} ${h}" role="img" aria-label="Study area and item footprints">`
    +items.filter(i=>i.bbox).map(i=>rect(i.bbox!,`footprint${i.id===selected?' is-selected':''}`,i.id)).join('')
    +rect(area,'study-area')+`</svg>`;
}

/** The streams in words. The codes stay beside them, as the catalog spells them. */
export const STREAM_WORDS:Record<string,string>={NRTI:'near real time (NRTI)',OFFL:'offline (OFFL)',RPRO:'reprocessed (RPRO)'};

/** What one file is, from the product: the column JLT's Inspect & reuse becomes. */
export function inspectMarkup(item:CatalogItem|undefined,product:SatelliteProduct,esc:Escape):string{
  if(!item)return '<p class="muted">Select an item to inspect its files.</p>';
  const f=product.facts,year=item.datetime?.slice(0,4)??'[Year]';
  const row=(label:string,value:string)=>`<div class="detail-row"><span>${esc(label)}</span><strong>${value}</strong></div>`;
  return `<h3>${esc(item.id)}</h3>`
    +row('Time',esc(item.datetime??'not stated'))+row('Platform',esc(item.platform??'not stated'))
    +row('Stream',esc(item.stream?STREAM_WORDS[item.stream]??item.stream:'not stated'))+row('Orbit',esc(item.orbit!=null?String(item.orbit):'not stated'))
    +row('Sign-in',esc(f?SIGN_IN_WORDS[f.signIn]:'not checked'))
    +row('Licence',product.licence?`${product.licence.open?'Open':'Restricted'} <span class="muted">(read ${esc(product.licence.readOn)})</span>`
      :'<span class="muted">not yet read</span>')
    +row('In a browser',esc(f?.browserReadable??'not checked'))
    +row('Completeness','<span class="muted">not known until a reader opens the file</span>')
    +row('Citation',citationMarkup(f?.citation??null,esc))
    +(product.licence?.attribution?`<p class="satellite-note">Attribute as <q>${esc(product.licence.attribution.original.replace('[Year]',year))}</q>; `
      +`once sampled or changed, <q>${esc(product.licence.attribution.modified.replace('[Year]',year))}</q>.</p>`:'')
    +`<h4>Files</h4><ul class="satellite-files">`+item.files.map(file=>
      `<li><strong>${esc(file.key)}</strong> <span class="muted">${esc(file.type??'type not stated')} · ${esc(file.host)}`
      +`${file.roles.length?' · '+esc(file.roles.join(', ')):''}</span></li>`).join('')+`</ul>`
    +`<p class="muted satellite-note">The files are not read here. Reading the pixels at your points is the next step.</p>`;
}

export interface CatalogDialogState {from:string; until:string; box?:BBox; search?:CatalogSearch; kept?:string[]}

export function openSatelliteCatalogDialog(product:SatelliteProduct|null,area:BBox|null,initial:CatalogDialogState,esc:Escape,
  onChange:(next:CatalogDialogState)=>void):void{
  const dialog=document.createElement('dialog');
  dialog.id='satellite-catalog-dialog';dialog.className='wide-dialog satellite-dialog satellite-catalog-dialog';
  dialog.setAttribute('aria-labelledby','satellite-catalog-title');
  let state={...initial},selected=initial.search?.items[0]?.id,busy=false,message='';
  // The edges as typed, kept as text so a half-typed value is not thrown away on re-render.
  const edges=(state.box??['','','','']).map(String);
  const typed=()=>typedBox(edges[0],edges[1],edges[2],edges[3]);
  const searchArea=():BBox|null=>area??('box' in typed()?(typed() as {box:BBox}).box:null);
  const close=()=>{dialog.close();dialog.remove();};
  // COLUMN 02 ALONE, so typing an edge redraws the area without replacing the field being typed into.
  const coverage=():string=>{const search=state.search,kept=new Set(state.kept??(search?defaultKept(search.items):[])),shown=searchArea();
    return search?coverageSvg(search.bbox,search.items,selected,esc)
        +`<p class="satellite-note">${esc(searchSentence(search,product!))}</p>`
        +`<ul class="satellite-items">`+search.items.map(i=>`<li class="${i.id===selected?'is-selected':''}">`
          +`<label class="check"><input type="checkbox" data-cat-keep="${esc(i.id)}" ${kept.has(i.id)?'checked':''}> </label>`
          +`<button class="text-button" data-cat-select="${esc(i.id)}">${esc(i.datetime?.replace('T',' ').slice(0,16)??i.id)}</button>`
          +(i.stream||i.orbit!=null?` <span class="muted">${esc([i.stream?STREAM_WORDS[i.stream]??i.stream:'',i.orbit!=null?`orbit ${i.orbit}`:''].filter(Boolean).join(' · '))}</span>`:'')
          +`</li>`).join('')+`</ul>`
        :shown?coverageSvg(shown,[],undefined,esc)+'<p class="muted">The area to search. No items loaded yet: choose the dates and search.</p>'
        :'<p class="muted">No items loaded. Choose the area and dates, and search.</p>';};
  const render=()=>{
    const search=state.search,check=typed();
    const missing=!product?'Connect Find satellite products and choose a product first.'
      :!area&&'problem' in check?check.problem:'';
    dialog.innerHTML=`<div class="manual-head"><h2 id="satellite-catalog-title">Search a satellite catalog</h2>`
      +`<div><button class="button primary" id="cat-close">Done</button></div></div>`
      +(!product?`<p class="notice">${esc(missing)}</p>`:'')
      +`<div class="satellite-columns">`
      // 01 · Connect & discover
      +`<section><span class="inspector-section">01 · Connect &amp; discover</span>`
      +(product?`<p><strong>${esc(product.route.label)}</strong></p><p class="muted satellite-note">Catalog <code>${esc(product.route.endpoint)}</code>`
        +` · collection <code>${esc(product.route.collection)}</code>${product.route.productType?` · product <code>${esc(product.route.productType)}</code>`:''}</p>`:'')
      +(area?`<p class="muted satellite-note">Study area extent: W ${area[0].toFixed(3)}, S ${area[1].toFixed(3)}, E ${area[2].toFixed(3)}, N ${area[3].toFixed(3)}</p>`
        :`<fieldset class="satellite-box"><legend class="field-label">Area to search, in decimal degrees</legend>`
          +(['West','South','East','North'] as const).map((edge,i)=>`<label>${edge}<input id="cat-${edge.toLowerCase()}" inputmode="decimal" `
            +`value="${esc(edges[i])}" placeholder="${['-74.26','40.49','-73.70','40.92'][i]}"></label>`).join('')
          +`<p class="muted satellite-note">Or connect a Study area to the <strong>area</strong> port, and its extent is used.</p>`
          +`<p class="notice" role="status"${product&&missing?'':' hidden'}>${esc(product?missing:'')}</p></fieldset>`)
      +`<div class="field"><label class="field-label" for="cat-from">From</label><input id="cat-from" type="date" value="${esc(state.from)}"></div>`
      +`<div class="field"><label class="field-label" for="cat-until">Until</label><input id="cat-until" type="date" value="${esc(state.until)}"></div>`
      +`<button class="button primary" id="cat-search"${missing||busy?' disabled':''}>${busy?'Searching…':'Search'}</button>`
      +`<p class="muted satellite-note">A search reads catalog records only, up to ${MAX_ITEMS} items. No data file is downloaded.</p>`
      +(message?`<p class="notice notice-warning" role="alert">${esc(message)}</p>`:'')+`</section>`
      // 02 · Coverage, in context
      +`<section><span class="inspector-section">02 · Coverage, in context</span><div id="cat-coverage">`+coverage()+`</div></section>`
      // 03 · Inspect & reuse
      +`<section><span class="inspector-section">03 · Inspect &amp; reuse</span>`
      +(product&&search?inspectMarkup(search.items.find(i=>i.id===selected),product,esc):'<p class="muted">Select an item to inspect its files.</p>')
      +`</section></div>`
      +`<p class="muted satellite-note">Search and layout adapted from JLT's STAC Browser (MIT), commit 945d8b3.</p>`;
    dialog.querySelector<HTMLButtonElement>('#cat-close')!.onclick=close;
    const read=()=>{state={...state,from:dialog.querySelector<HTMLInputElement>('#cat-from')!.value,
      until:dialog.querySelector<HTMLInputElement>('#cat-until')!.value};};
    dialog.querySelector<HTMLInputElement>('#cat-from')!.onchange=()=>{read();onChange(state);};
    dialog.querySelector<HTMLInputElement>('#cat-until')!.onchange=()=>{read();onChange(state);};
    dialog.querySelector<HTMLButtonElement>('#cat-search')!.onclick=async()=>{
      const bbox=searchArea();
      if(!product||!bbox)return;read();busy=true;message='';render();
      try{const result={...await searchCatalog(product,bbox,state.from,state.until),areaFrom:area?'study area' as const:'typed extent' as const};
        state={...state,search:result,kept:defaultKept(result.items)};selected=result.items[0]?.id;onChange(state);}
      catch(error){message=error instanceof Error?error.message:String(error);}
      finally{busy=false;render();}
    };
    // Typing an edge re-checks the box; the field keeps its focus because only the status and button change.
    (['west','south','east','north'] as const).forEach((edge,i)=>{
      const input=dialog.querySelector<HTMLInputElement>(`#cat-${edge}`);if(!input)return;
      input.oninput=()=>{edges[i]=input.value;const now=typed();
        dialog.querySelector<HTMLButtonElement>('#cat-search')!.disabled=busy||!product||'problem' in now;
        const status=dialog.querySelector('.satellite-box [role="status"]');
        if(status){status.textContent='problem' in now?now.problem:'';(status as HTMLElement).hidden=!('problem' in now);}};
      input.onchange=()=>{const now=typed();if('box' in now){state={...state,box:now.box};onChange(state);}
        // Once searched, column 02 shows the search's own extent and items, wired by render; it is left alone.
        if(!state.search)dialog.querySelector('#cat-coverage')!.innerHTML=coverage();};
    });
    dialog.querySelectorAll<HTMLButtonElement>('[data-cat-select]').forEach(b=>{b.onclick=()=>{selected=b.dataset.catSelect;render();};});
    dialog.querySelectorAll<SVGRectElement>('[data-sat-footprint]').forEach(r=>{r.addEventListener('click',()=>{selected=r.dataset.satFootprint;render();});});
    dialog.querySelectorAll<HTMLInputElement>('[data-cat-keep]').forEach(box=>{box.onchange=()=>{
      const keep=new Set(state.kept??(state.search?defaultKept(state.search.items):[]));if(box.checked)keep.add(box.dataset.catKeep!);else keep.delete(box.dataset.catKeep!);
      state={...state,kept:[...keep]};onChange(state);};});
  };
  render();
  document.body.append(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.showModal();
}
