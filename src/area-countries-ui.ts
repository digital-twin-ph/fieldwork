/** THE STUDY AREA'S COUNTRIES, CONFIGURED (experiment 204): named, or found from where the shape falls and confirmed.
 *
 *  Find the countries PROPOSES: Natural Earth's outlines suggest candidates, each candidate's national outline from
 *  geoBoundaries measures the share of the area in it, and the person ticks what to keep. Nothing is applied until
 *  Apply, and a share is of the area as drawn, never of the people in it. */
import type {Escape} from './types.js';
import {openConfigDialog} from './config-dialog.js';
import {candidateCountries,nationalOutlineUrl,outlineOf,shareOfArea,NATURAL_EARTH_COUNTRIES} from './area-countries.js';
import {COUNTRIES,countryName,levelUrl} from './boundary-source.js';

interface Found {iso:string; name:string; share:number|null; note?:string; ticked:boolean}
interface Draft {countries:string[]; found?:Found[]; finding?:boolean; error?:string}

export function openCountriesConfig(o:{step:string;countries:string[];geometry:{type:string;coordinates:unknown}|null;esc:Escape;
  apply:(countries:string[])=>void;fetcher?:typeof fetch}):void{
  const {esc}=o,fetcher=o.fetcher??fetch;
  openConfigDialog<Draft>({
    id:'area-countries-config',widget:'Study area',step:o.step,draft:{countries:[...o.countries]},
    sections:d=>{
      const listed=d.countries.length
        ?`<ul class="area-countries" id="area-countries-list">`+d.countries.map(c=>`<li><span>${esc(countryName(c))} (${esc(c)})</span> `
          +`<button type="button" class="button small" data-remove-country="${esc(c)}" aria-label="Remove ${esc(countryName(c))}">Remove</button></li>`).join('')+`</ul>`
        :`<p class="muted" id="area-countries-list">None stated yet.</p>`;
      const found=d.finding?`<p id="area-countries-found" role="status">Finding the countries and measuring the shares…</p>`
        :d.error?`<p id="area-countries-found" role="alert">${esc(d.error)}</p>`
        :d.found?(d.found.length
          ?`<div id="area-countries-found"><p>Proposed, from where the area falls. Tick the countries to keep, then press `
            +`<strong>Use the ticked countries</strong>. A share is of the area as drawn, not of the people in it.</p>`
            +`<table class="area-countries-shares"><thead><tr><th>Keep</th><th>Country</th><th>Share of the area</th></tr></thead><tbody>`
            +d.found.map((f,i)=>`<tr><td><input type="checkbox" data-found="${i}" ${f.ticked?'checked':''} aria-label="Keep ${esc(f.name)}"></td>`
              +`<td>${esc(f.name)} (${esc(f.iso)})</td><td>${f.share===null?esc(f.note??'Not measured'):`${(f.share*100).toFixed(f.share<0.01&&f.share>0?1:0)}%`
              +(f.share===0?' · none of the area':'')}</td></tr>`).join('')+`</tbody></table>`
            +`<button type="button" class="button" id="area-countries-use">Use the ticked countries</button></div>`
          :`<p id="area-countries-found">No country's outline comes within 10 km of this area.</p>`):'';
      const settings=``
        +`<div class="field"><span class="field-label">Countries of this study area</span>${listed}</div>`
        +`<div class="field"><label class="field-label" for="area-country-add">Add a country</label>`
          +`<select id="area-country-add"><option value="">Choose a country…</option>`
          +COUNTRIES.filter(c=>!d.countries.includes(c.iso)).map(c=>`<option value="${c.iso}">${esc(c.name)} (${c.iso})</option>`).join('')+`</select></div>`
        +`<div class="field"><span class="field-label">Or find them from the area</span>`
          +`<p><button type="button" class="button" id="area-countries-find" ${o.geometry&&!d.finding?'':'disabled'}>Find the countries</button></p>`
          +`<p class="muted">${o.geometry?`Candidates from Natural Earth's outlines (${esc(NATURAL_EARTH_COUNTRIES.licence.split('.')[0]!)}, about 10 km), `
            +`then each candidate's national outline from geoBoundaries to measure the share. Fetches one outline per candidate.`
            :'Draw the area first.'}</p>${found}</div>`;
      return {settings,blocked:false};
    },
    wire:(root,d,redraw)=>{
      root.querySelectorAll<HTMLButtonElement>('[data-remove-country]').forEach(b=>b.addEventListener('click',()=>{
        d.countries=d.countries.filter(c=>c!==b.dataset.removeCountry);redraw();}));
      root.querySelector<HTMLSelectElement>('#area-country-add')?.addEventListener('change',e=>{
        const iso=(e.target as HTMLSelectElement).value;if(iso&&!d.countries.includes(iso))d.countries.push(iso);redraw();});
      root.querySelectorAll<HTMLInputElement>('[data-found]').forEach(b=>b.addEventListener('change',()=>{d.found![Number(b.dataset.found)]!.ticked=b.checked;}));
      root.querySelector('#area-countries-use')?.addEventListener('click',()=>{
        d.countries=d.found!.filter(f=>f.ticked).map(f=>f.iso);d.found=undefined;redraw();});
      root.querySelector('#area-countries-find')?.addEventListener('click',()=>{
        d.finding=true;d.error=undefined;d.found=undefined;redraw();
        void find(o.geometry!,fetcher).then(found=>{d.found=found;},error=>{d.error=error instanceof Error?error.message:String(error);})
          .finally(()=>{d.finding=false;redraw();});
      });
    },
    apply:d=>o.apply(d.countries),
  },esc);
}

/** Candidates, then each one's share from its national outline. A candidate without a published outline is listed, not
 *  measured, and left unticked. */
async function find(geometry:{type:string;coordinates:unknown},fetcher:typeof fetch):Promise<Found[]>{
  const candidates=candidateCountries(geometry);
  const found=await Promise.all(candidates.map(async c=>{
    const name=COUNTRIES.find(x=>x.iso===c.iso)?.name??c.name;
    try{
      const meta=await fetcher(levelUrl(c.iso,'ADM0'));
      const url=meta.ok?nationalOutlineUrl(await meta.json()):null;
      if(!url)return {iso:c.iso,name,share:null,note:'geoBoundaries publishes no national outline: not measured',ticked:false};
      const file=await fetcher(url);
      if(!file.ok)throw new Error(String(file.status));
      const outline=outlineOf(await file.json());
      if(!outline)return {iso:c.iso,name,share:null,note:'The national outline could not be read: not measured',ticked:false};
      const share=shareOfArea(geometry,outline);
      return {iso:c.iso,name,share,ticked:share>0};
    }catch(error){
      return {iso:c.iso,name,share:null,note:`The national outline could not be fetched (${error instanceof Error?error.message:String(error)}): not measured`,ticked:false};
    }
  }));
  // Largest share first; equal shares by name, so the order never depends on which outline arrived first.
  return found.sort((a,b)=>(b.share??-1)-(a.share??-1)||a.name.localeCompare(b.name));
}
