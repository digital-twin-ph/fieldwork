import {DENSITY_RAMP,classOfDensity,type DrawnDensity} from './raster-panels.js';
import type {RasterGrid} from './raster.js';

/** A raster window as a PNG data URL, for anything that draws one.
 *
 *  A LEAF ON PURPOSE. This lived in raster-ui.ts, beside the preparation dialog, and on
 *  2026-10-23 the results map began importing it to draw a raster under a street network --
 *  which dragged GeoTIFF decoding, IndexedDB storage and the provenance vocabulary into every
 *  results map, including the ones with no raster at all. It needs a canvas and a grid and
 *  nothing else, so it sits where that is true.
 */
export function rasterImage(grid:RasterGrid):string{
  const {metadata:m,values}=grid,canvas=document.createElement('canvas');canvas.width=m.width;canvas.height=m.height;const context=canvas.getContext('2d')!,pixels=context.createImageData(m.width,m.height);let min=Infinity,max=-Infinity;
  for(const value of values)if(Number.isFinite(value)){min=Math.min(min,value);max=Math.max(max,value);}for(let i=0;i<values.length;i++){const value=values[i]!;if(!Number.isFinite(value))continue;const t=max===min?0.5:(value-min)/(max-min);pixels.data.set([Math.round(245-215*t),Math.round(250-145*t),Math.round(220-135*t),255],i*4);}context.putImageData(pixels,0,0);
  return canvas.toDataURL();
}

/** A panel's drawn cells in the shared classes (experiment 212): YlOrRd, clear where no one is modelled. */
export function densityImage(panel:DrawnDensity,breaks:readonly number[]):string{
  const canvas=document.createElement('canvas');canvas.width=panel.width;canvas.height=panel.height;
  const context=canvas.getContext('2d')!,pixels=context.createImageData(panel.width,panel.height);
  const colours=rampFor(breaks).map(hex=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]);
  for(let i=0;i<panel.density.length;i++){const k=classOfDensity(panel.density[i]!,breaks);if(k<0)continue;pixels.data.set([...colours[k]!,255],i*4);}
  context.putImageData(pixels,0,0);
  return canvas.toDataURL();
}
/** The ramp's colours for as many classes as the breaks make, spread end to end. */
export const rampFor=(breaks:readonly number[]):string[]=>{
  const n=breaks.length+1;
  return Array.from({length:n},(_,k)=>DENSITY_RAMP[n===1?DENSITY_RAMP.length-1:Math.round(k*(DENSITY_RAMP.length-1)/(n-1))]!);
};
const roundDensity=(v:number)=>{const a=Math.abs(v);return Number(a>=100?v.toFixed(0):a>=10?v.toFixed(1):v.toFixed(2)).toLocaleString('en');};
/** THE STATIC FIGURE: one frame for every panel, so a place sits in the same spot in each; a title over each; one key. */
export function rasterPanelsSvg(panels:readonly DrawnDensity[],breaks:readonly number[],grid:'row'|'grid'|'column',
    titles:Record<string,string|undefined>,esc:(v:unknown)=>string):string{
  if(!panels.length)return '<text x="30" y="40">No raster to put in a panel</text>';
  const west=Math.min(...panels.map(p=>p.bounds[0])),south=Math.min(...panels.map(p=>p.bounds[1]));
  const east=Math.max(...panels.map(p=>p.bounds[2])),north=Math.max(...panels.map(p=>p.bounds[3]));
  const columns=grid==='column'?1:grid==='row'?panels.length:Math.min(2,panels.length),rows=Math.ceil(panels.length/columns);
  const gap=16,left=20,title=22,cellWidth=(850-2*left-gap*(columns-1))/columns;
  const cos=Math.cos((south+north)/2*Math.PI/180),w=(east-west)*cos,h=north-south;
  const frameHeight=Math.round(Math.min(cellWidth*h/w,rows===1?520:300)),scale=Math.min(cellWidth/w,frameHeight/h);
  const keyRoom=104,height=Math.max(295,rows*(frameHeight+title)+(rows-1)*gap+keyRoom+10);
  const cells=panels.map((p,i)=>{
    const x0=left+(i%columns)*(cellWidth+gap),y0=10+Math.floor(i/columns)*(frameHeight+title+gap);
    const cx=x0+cellWidth/2,cy=y0+title+frameHeight/2;
    const x=cx+(p.bounds[0]-(east+west)/2)*cos*scale,y=cy-(p.bounds[3]-(north+south)/2)*scale;
    const wPx=(p.bounds[2]-p.bounds[0])*cos*scale,hPx=(p.bounds[3]-p.bounds[1])*scale;
    return `<g data-map-panel="${esc(p.layer)}"><rect x="${x0}" y="${y0+title}" width="${cellWidth}" height="${frameHeight}" fill="#f7faf8" stroke="#4d4d4d" stroke-width=".4"/>`
      +`<text x="${x0}" y="${y0+15}" font-size="14" font-weight="600">${esc(titles[p.layer]?.trim()||p.layer)}</text>`
      +`<image href="${densityImage(p,breaks)}" x="${x}" y="${y}" width="${wPx}" height="${hPx}" preserveAspectRatio="none" style="image-rendering:pixelated"/></g>`;
  }).join('');
  const colours=rampFor(breaks),top=height-94,width=90;
  const swatches=colours.map((c,i)=>`<rect x="${40+i*width}" y="${top}" width="${width}" height="10" fill="${c}" stroke="#4d4d4d" stroke-width=".4"/>`).join('');
  const edges=breaks.map((b,i)=>`<text x="${40+(i+1)*width}" y="${top+23}" font-size="14" text-anchor="middle" fill="#4d4d4d">${roundDensity(b)}</text>`).join('');
  const drawn=Math.max(...panels.map(p=>p.drawnCellM));
  const key=`<text x="20" y="${top+44}" font-size="14">${esc('Cell shade: people per km², one scale for every panel; side by side, not a difference')}</text>`
    +`<text x="20" y="${top+62}" font-size="14">${esc(`${colours.length} quantile classes of the cells with people; clear: no one modelled`)}</text>`
    +`<text x="20" y="${top+80}" font-size="14">${esc(`Drawn cells about ${Math.round(drawn).toLocaleString('en')} m across, each the people in the cells under it over their area`)}</text>`;
  return `<rect width="850" height="${height}" fill="#ffffff"/>${cells}${swatches}${edges}${key}`;
}
