/** TIDE GAUGES, A SOURCE OF TABULAR DATA (2026-11-20). The practitioner: *"Perhaps in the tabular input config dialog we
 *  can add tabs, with one for census tables, tide gauges"*, then *"For the tide gauges tab can we have an overview map of
 *  where tide gauges are?"* The tab lists the countries in digital-twin-ph/coastal-sea-level, pinned at a commit: each
 *  country's index of its gauges, one row per station, with the shared data dictionary. An index, not the records: the
 *  archives' records are fetched from the archives. The overview map is drawn from the pinned positions over the bundled
 *  Natural Earth ground, so it needs no network and no tile provider. */
import catalogue from '../examples/coastal-sea-level/catalogue.json';
import {naturalEarthMarkup,NATURAL_EARTH_CREDIT} from './natural-earth.js';
import countriesAsset from '../assets/natural-earth-110m-countries.json';
import type {Position} from './types.js';

export interface PinnedFile {path:string;bytes:number;sha256:string}
export interface GaugeCountry {iso3:string;country:string;stations:number;withTrend:number;rlr:number;lastYear:number;
  reviewed:{last:string;nextDue:string};table:PinnedFile;gauges:[number,number,string,boolean][]}
export const GAUGES=catalogue as unknown as {repository:string;commit:string;raw:string;columns:PinnedFile;countries:GaugeCountry[]};
export const GAUGES_RAW='https://raw.githubusercontent.com/digital-twin-ph/coastal-sea-level/';

/** Every pinned gauge over the land, equirectangular: filled where PSMSL computes a trend, hollow where it has the record
 *  only. Each country with gauges is drawn as its own shape to choose it by (2026-11-20, the practitioner: "we can make the
 *  map interactive and we can pick the coastal country polygon ... Not the long list"); a country too small to have an
 *  outline at 1:110m (Cabo Verde, Mauritius, São Tomé and Príncipe, Seychelles) is chosen by its gauges. The list beside
 *  the map holds every country too, for the keyboard and a screen reader. */
const OUTLINES=new Map((countriesAsset as unknown as {countries:{iso:string;polygons:Position[][][]}[]}).countries.map(c=>[c.iso,c.polygons]));
const count=(c:GaugeCountry)=>`${c.stations.toLocaleString('en')} ${c.stations===1?'gauge':'gauges'}`;
export function gaugesMap(esc:(s:string)=>string):string{
  const all=GAUGES.countries.flatMap(c=>c.gauges);
  if(!all.length)return '';
  const pad=8,lons=all.map(g=>g[0]),lats=all.map(g=>g[1]);
  const west=Math.max(-180,Math.min(...lons)-pad),east=Math.min(180,Math.max(...lons)+pad);
  const south=Math.max(-85,Math.min(...lats)-pad),north=Math.min(85,Math.max(...lats)+pad);
  const width=640,scale=width/(east-west),height=Math.round((north-south)*scale);
  const project=(c:Position):[number,number]=>[(c[0]-west)*scale,(north-c[1])*scale];
  const ground=naturalEarthMarkup([west,south,east,north],project).markup;
  const ring=(r:Position[])=>'M'+r.map(p=>project(p).map(v=>v.toFixed(1)).join(',')).join('L')+'Z';
  const shapes=GAUGES.countries.filter(c=>OUTLINES.has(c.iso3)).map(c=>
    `<path class="gauge-country" data-gauge-country="${esc(c.iso3)}" d="${OUTLINES.get(c.iso3)!.map(poly=>poly.map(ring).join('')).join('')}" fill-rule="evenodd">`
    +`<title>${esc(`${c.country} · ${count(c)}`)}</title></path>`).join('');
  const dots=GAUGES.countries.flatMap(c=>c.gauges.map(([lon,lat,name,trend])=>{const [x,y]=project([lon,lat]);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" class="gauge-dot${trend?' gauge-dot-trend':''}" data-gauge-country="${esc(c.iso3)}"><title>${esc(`${name}, ${c.country}`)}</title></circle>`;})).join('');
  const withTrend=all.filter(g=>g[3]).length;
  return `<figure class="gauges-map"><svg viewBox="0 0 ${width} ${height}" data-whole="0 0 ${width} ${height}" role="img" aria-label="${esc(`${all.length} tide gauges in ${GAUGES.countries.length} countries; ${withTrend} with a trend PSMSL computes. Choose a country on the map or from the list.`)}">`
    +`<rect width="${width}" height="${height}" class="gauges-sea"/>${ground}${shapes}${dots}</svg>`
    +`<figcaption>Choose a country on the map, or from the list. Filled: PSMSL computes a long-term trend (${withTrend}). Hollow: the record only (${all.length-withTrend}). ${esc(NATURAL_EARTH_CREDIT)}.</figcaption></figure>`;
}

/** The tab's contents: what it holds, the country chooser, the map, and the country chosen. */
export function gaugeChoices(esc:(s:string)=>string):string{
  return '<p class="muted">From <a href="'+esc(GAUGES.repository)+'" target="_blank" rel="noopener">coastal-sea-level</a>, at commit '
    +esc(GAUGES.commit.slice(0,7))+'. <strong>An index of each country’s tide gauges, not their records:</strong> one row per station, '
    +'with its span, how complete it is, the trend PSMSL computes where it computes one, and the land’s movement nearby where it is measured. '
    +'Each comes with its data dictionary.</p>'
    +'<div class="field gauge-pick"><label class="field-label" for="gauge-country">Country</label><select id="gauge-country">'
    +'<option value="">Choose a country…</option>'
    +[...GAUGES.countries].sort((a,b)=>a.country.localeCompare(b.country,'en')).map(c=>`<option value="${esc(c.iso3)}">${esc(`${c.country} · ${count(c)}`)}</option>`).join('')
    +'</select><button type="button" class="button small" id="gauge-whole" hidden>The whole map</button></div>'
    +gaugesMap(esc)
    +'<div id="gauge-chosen" aria-live="polite"></div>';
}

/** CHOOSING: from the list, a country's shape or one of its gauges. The map closes in on the country, which is marked; the
 *  line beneath says what its index holds and offers to read it. */
export function wireGauges(root:ParentNode,esc:(s:string)=>string,read:(c:GaugeCountry)=>void):void{
  const svg=root.querySelector<SVGSVGElement>('.gauges-map svg'),pick=root.querySelector<HTMLSelectElement>('#gauge-country');
  const chosen=root.querySelector<HTMLElement>('#gauge-chosen'),whole=root.querySelector<HTMLButtonElement>('#gauge-whole');
  if(!svg||!pick||!chosen||!whole)return;
  const today=new Date().toISOString().slice(0,10);
  const choose=(iso:string)=>{
    const c=GAUGES.countries.find(x=>x.iso3===iso);
    pick.value=c?iso:'';whole.hidden=!c;
    for(const el of svg.querySelectorAll<SVGElement>('[data-gauge-country]'))el.classList.toggle('gauge-chosen',el.dataset.gaugeCountry===iso);
    const size=(share:number)=>{for(const dot of svg.querySelectorAll<SVGCircleElement>('circle.gauge-dot'))dot.setAttribute('r',(3.2*share).toFixed(2));};
    if(!c){svg.setAttribute('viewBox',svg.dataset.whole!);size(1);chosen.innerHTML='';return;}
    // Close in on the country and its gauges, with room around them, never narrower than a sixth of the whole map.
    const marks=[...svg.querySelectorAll<SVGGraphicsElement>(`[data-gauge-country="${iso}"]`)].map(el=>el.getBBox());
    const [,,W,H]=svg.dataset.whole!.split(' ').map(Number) as [number,number,number,number];
    let x0=Math.min(...marks.map(b=>b.x)),y0=Math.min(...marks.map(b=>b.y)),x1=Math.max(...marks.map(b=>b.x+b.width)),y1=Math.max(...marks.map(b=>b.y+b.height));
    const w=Math.max(x1-x0,W/6)*1.3,h=Math.max(y1-y0,H/6)*1.3,cx=(x0+x1)/2,cy=(y0+y1)/2;
    const aspect=W/H,vw=Math.max(w,h*aspect),vh=vw/aspect;
    svg.setAttribute('viewBox',`${(cx-vw/2).toFixed(1)} ${(cy-vh/2).toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`);
    // The same size on screen at any closeness: a dot of the whole map's size, not six times it.
    size(vw/W);
    chosen.innerHTML=`<p><strong>${esc(c.country)}</strong>: ${esc(count(c))} · ${c.withTrend} with a PSMSL trend · latest year ${c.lastYear}. `
      +`<span class="muted">${c.reviewed.nextDue&&c.reviewed.nextDue<today?'Review overdue since '+esc(c.reviewed.nextDue):'Next review '+esc(c.reviewed.nextDue)}.</span></p>`
      +`<p><button type="button" class="button" data-gauges="${esc(c.iso3)}">Read ${esc(c.country)}’s tide gauges</button></p>`;
    chosen.querySelector<HTMLButtonElement>('[data-gauges]')!.onclick=()=>read(c);
  };
  pick.onchange=()=>choose(pick.value);
  whole.onclick=()=>choose('');
  svg.addEventListener('click',e=>{const iso=(e.target as Element).closest<SVGElement>('[data-gauge-country]')?.dataset.gaugeCountry;if(iso)choose(iso);});
}
