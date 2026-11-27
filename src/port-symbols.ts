import type {PortType} from './types.js';

/** ONE SYMBOL PER KIND OF INPUT, chosen by the practitioner on 2026-11-27 from a sheet of mock nodes (the buttons-and-ports
 *  audit, docs/audits/port-symbols/). A connected port shows its kind's symbol and the source's name, where it read
 *  "Points from Health facilities": *"too long ... can we make them recognizable symbols so the name of the type can be
 *  displayed with it?"* Drawn in the text colour, so a symbol has the contrast of the words beside it, and never shown
 *  without them. */
export type PortSymbol='points'|'lines'|'polygons'|'area'|'table'|'raster'|'network'|'ground'|'design';

const SHAPES:Record<PortSymbol,string>={
  points:'<circle cx="4" cy="11" r="2.2" class="f"/><circle cx="8.5" cy="4.5" r="2.2" class="f"/><circle cx="12.5" cy="11.5" r="2.2" class="f"/>',
  lines:'<polyline points="1.5,13 5.5,6 10,10.5 14.5,3" class="s" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  polygons:'<path d="M3 4 9 1.8 14.2 6.5 12 14 3.5 12.5Z" class="f"/>',
  area:'<path d="M3 4 9 1.8 14.2 6.5 12 14 3.5 12.5Z" class="s" stroke-width="2" stroke-linejoin="round"/>',
  table:'<rect x="1.5" y="2.5" width="13" height="11" rx="1.5" class="s" stroke-width="1.8"/><rect x="1.5" y="2.5" width="13" height="3.5" class="f"/><line x1="1.5" y1="9.75" x2="14.5" y2="9.75" class="s" stroke-width="1.5"/>',
  raster:[[1.5,1.5,1],[6,1.5,.45],[10.5,1.5,1],[1.5,6,.45],[6,6,1],[10.5,6,.45],[1.5,10.5,1],[6,10.5,.45],[10.5,10.5,1]]
    .map(([x,y,o])=>`<rect x="${x}" y="${y}" width="4" height="4" class="f"${o<1?` opacity="${o}"`:''}/>`).join(''),
  network:'<path d="M3 12.5 7 4 13 6 11.5 13 3 12.5M7 4 11.5 13" class="s" stroke-width="1.6"/><circle cx="3" cy="12.5" r="2" class="f"/><circle cx="7" cy="4" r="2" class="f"/><circle cx="13" cy="6" r="2" class="f"/><circle cx="11.5" cy="13" r="2" class="f"/>',
  ground:'<path d="M1.5 3.5 5.5 2 10.5 3.5 14.5 2V12.5L10.5 14 5.5 12.5 1.5 14Z" class="s" stroke-width="1.7" stroke-linejoin="round"/><path d="M5.5 2V12.5M10.5 3.5V14" class="s" stroke-width="1.4"/>',
  design:'<rect x="1.5" y="1.5" width="13" height="13" rx="1.5" class="s" stroke-width="1.8"/><line x1="8" y1="1.5" x2="8" y2="14.5" class="s" stroke-width="1.8"/><line x1="1.5" y1="8" x2="14.5" y2="8" class="s" stroke-width="1.8"/>',
};

/** Which symbol a kind takes. The kinds beyond the nine main ones are a familiar shape under a special name. */
export function symbolOf(kind:PortType|string|null|undefined):PortSymbol{
  switch(kind){
    case 'points':case 'mean-center':case 'facilities':case 'gradedFacilities':return 'points';
    case 'lines':return 'lines';
    case 'polygons':return 'polygons';
    case 'area':return 'area';
    case 'raster':case 'satellite-files':case 'satellite-product':return 'raster';
    case 'network':return 'network';
    case 'ground':return 'ground';
    case 'design':return 'design';
    default:return 'table';
  }
}

/** The kind in words, as the symbol's hover text and the Inspector say it. */
export const SYMBOL_WORDS:Record<PortSymbol,string>={points:'Points',lines:'Lines',polygons:'Areas',area:'Study area',
  table:'Table',raster:'Raster',network:'Street network',ground:'Map image',design:'Study design'};

/** The symbol as inline SVG markup, aria-hidden: the words beside it carry the meaning. */
export function symbolMarkup(symbol:PortSymbol,size=16):string{
  return `<svg class="port-symbol" aria-hidden="true" viewBox="0 0 16 16" width="${size}" height="${size}">${SHAPES[symbol]}</svg>`;
}
/** The shapes alone, for a renderer that draws its own <svg>. */
export const symbolShapes=(symbol:PortSymbol):string=>SHAPES[symbol];
/** A SOURCE WIDGET'S ICON IS THE SYMBOL OF WHAT IT SENDS (2026-11-27): Point data and Raster input both drew ▦, and the
 *  node that feeds a port now shows the mark the port shows. Finders (Find health facilities, the satellite searches)
 *  keep their own icons: they do something, where these hold data of one kind. */
const SOURCE_SYMBOL:Record<string,PortSymbol>={point_input:'points',raster_input:'raster',table_input:'table',
  line_input:'lines',polygon_input:'polygons',study_area:'area',network_input:'network',map_image_input:'ground'};
export const sourceSymbol=(type:string):PortSymbol|undefined=>SOURCE_SYMBOL[type];
/** A widget's icon as markup: its kind's symbol for a source, otherwise its own character. */
export function iconMarkup(type:string,character:string,size=17):string{
  const symbol=SOURCE_SYMBOL[type];return symbol?symbolMarkup(symbol,size):character;
}
