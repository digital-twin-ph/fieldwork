/** TIDE GAUGES, A SOURCE OF TABULAR DATA (2026-11-20). The practitioner: *"Perhaps in the tabular input config dialog we
 *  can add tabs, with one for census tables, tide gauges"*, then *"For the tide gauges tab can we have an overview map of
 *  where tide gauges are?"* The tab lists the countries in digital-twin-ph/coastal-sea-level, pinned at a commit: each
 *  country's index of its gauges, one row per station, with the shared data dictionary. An index, not the records: the
 *  archives' records are fetched from the archives. The overview map is drawn from the pinned positions over the bundled
 *  Natural Earth ground, so it needs no network and no tile provider. */
import catalogue from '../examples/coastal-sea-level/catalogue.json';
import {naturalEarthMarkup,NATURAL_EARTH_CREDIT} from './natural-earth.js';
import type {Position} from './types.js';

export interface PinnedFile {path:string;bytes:number;sha256:string}
export interface GaugeCountry {iso3:string;country:string;stations:number;withTrend:number;rlr:number;lastYear:number;
  reviewed:{last:string;nextDue:string};table:PinnedFile;gauges:[number,number,string,boolean][]}
export const GAUGES=catalogue as unknown as {repository:string;commit:string;raw:string;columns:PinnedFile;countries:GaugeCountry[]};
export const GAUGES_RAW='https://raw.githubusercontent.com/digital-twin-ph/coastal-sea-level/';

/** Every pinned gauge over the land, equirectangular: filled where PSMSL computes a trend, hollow where it has the record
 *  only. Countries are told apart by the list beside it, which is also what a screen reader reads. */
export function gaugesMap(esc:(s:string)=>string):string{
  const all=GAUGES.countries.flatMap(c=>c.gauges);
  if(!all.length)return '';
  const pad=8,lons=all.map(g=>g[0]),lats=all.map(g=>g[1]);
  const west=Math.max(-180,Math.min(...lons)-pad),east=Math.min(180,Math.max(...lons)+pad);
  const south=Math.max(-85,Math.min(...lats)-pad),north=Math.min(85,Math.max(...lats)+pad);
  const width=640,scale=width/(east-west),height=Math.round((north-south)*scale);
  const project=(c:Position):[number,number]=>[(c[0]-west)*scale,(north-c[1])*scale];
  const ground=naturalEarthMarkup([west,south,east,north],project).markup;
  const dots=all.map(([lon,lat,name,trend])=>{const [x,y]=project([lon,lat]);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" class="gauge-dot${trend?' gauge-dot-trend':''}"><title>${esc(name)}</title></circle>`;}).join('');
  const withTrend=all.filter(g=>g[3]).length;
  return `<figure class="gauges-map"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(`${all.length} tide gauges in ${GAUGES.countries.length} countries; ${withTrend} with a trend PSMSL computes`)}">`
    +`<rect width="${width}" height="${height}" class="gauges-sea"/>${ground}${dots}</svg>`
    +`<figcaption>Filled: PSMSL computes a long-term trend (${withTrend}). Hollow: the record only (${all.length-withTrend}). ${esc(NATURAL_EARTH_CREDIT)}.</figcaption></figure>`;
}

/** The tab's contents: what it holds, the map, and one line per country. */
export function gaugeChoices(esc:(s:string)=>string):string{
  const today=new Date().toISOString().slice(0,10);
  return '<p class="muted">From <a href="'+esc(GAUGES.repository)+'" target="_blank" rel="noopener">coastal-sea-level</a>, at commit '
    +esc(GAUGES.commit.slice(0,7))+'. <strong>An index of each country’s tide gauges, not their records:</strong> one row per station, '
    +'with its span, how complete it is, the trend PSMSL computes where it computes one, and the land’s movement nearby where it is measured. '
    +'Each comes with its data dictionary.</p>'
    +gaugesMap(esc)
    +'<ul class="census-choices gauge-choices">'
    +GAUGES.countries.map(c=>'<li><button type="button" class="button" data-gauges="'+esc(c.iso3)+'">'+esc(c.country)+'</button>'
      +`<p>${c.stations.toLocaleString('en')} ${c.stations===1?'gauge':'gauges'} · ${c.withTrend} with a PSMSL trend · latest year ${c.lastYear}</p>`
      +'<p class="muted">'+(c.reviewed.nextDue&&c.reviewed.nextDue<today?'Review overdue since '+esc(c.reviewed.nextDue):'Next review '+esc(c.reviewed.nextDue))+'</p></li>').join('')
    +'</ul>';
}
