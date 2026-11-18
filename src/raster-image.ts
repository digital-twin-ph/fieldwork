import {RAMPS,classOfDensity,type DrawnDensity,type PanelScale,type RampName} from './raster-panels.js';
import type {RasterGrid} from './raster.js';

/** A raster window as a PNG data URL, for anything that draws one.
 *
 *  A LEAF ON PURPOSE. This lived in raster-ui.ts, beside the preparation dialog, and on
 *  2026-10-23 the results map began importing it to draw a raster under a street network --
 *  which dragged GeoTIFF decoding, IndexedDB storage and the provenance vocabulary into every
 *  results map, including the ones with no raster at all. It needs a canvas and a grid and
 *  nothing else, so it sits where that is true.
 */
/** AT MOST `MAX_IMAGE_SIDE` PIXELS ON A SIDE (2026-11-17). JLT ran the Botswana WorldPop workflow in Chrome on Windows on
 *  0.133.0 and the tab died, "Out of Memory". The window is about 11,000 x 11,000 cells, and it was drawn one pixel a
 *  cell: an image buffer, a canvas, a PNG and the browser's decoded copy of it, each about half a gigabyte or more, for a
 *  map 850 pixels wide. A larger window is now drawn with each pixel the mean of the cells with data in its block; the
 *  cells themselves, and everything computed from them, are unchanged. */
export const MAX_IMAGE_SIDE=2048;
/** How many cells on a side one drawn pixel covers: 1 when the window fits. */
export const rasterImageFactor=(m:{width:number;height:number},maxSide=MAX_IMAGE_SIDE)=>Math.max(1,Math.ceil(Math.max(m.width,m.height)/maxSide));
export function rasterImage(grid:Pick<RasterGrid,'metadata'|'values'>,maxSide=MAX_IMAGE_SIDE,
    scale?:Pick<PanelScale,'mode'|'breaks'|'ramp'>):string{
  if(scale)return shadedRasterImage(grid,maxSide,scale);
  const {metadata:m,values}=grid,factor=rasterImageFactor(m,maxSide),width=Math.ceil(m.width/factor),height=Math.ceil(m.height/factor);
  let min=Infinity,max=-Infinity;
  for(let i=0;i<values.length;i++){const value=values[i]!;if(Number.isFinite(value)){if(value<min)min=value;if(value>max)max=value;}}
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d')!,pixels=context.createImageData(width,height),data=pixels.data;
  const paint=(at:number,value:number)=>{const t=max===min?0.5:(value-min)/(max-min);
    data[at]=Math.round(245-215*t);data[at+1]=Math.round(250-145*t);data[at+2]=Math.round(220-135*t);data[at+3]=255;};
  if(factor===1){for(let i=0;i<values.length;i++){const value=values[i]!;if(Number.isFinite(value))paint(i*4,value);}}
  else{const sum=new Float64Array(width),count=new Uint32Array(width);
    for(let y=0;y<height;y++){sum.fill(0);count.fill(0);
      for(let row=y*factor;row<Math.min(m.height,(y+1)*factor);row++){const base=row*m.width;
        for(let col=0;col<m.width;col++){const value=values[base+col]!;if(Number.isFinite(value)){const x=(col/factor)|0;sum[x]+=value;count[x]++;}}}
      for(let x=0;x<width;x++)if(count[x])paint((y*width+x)*4,sum[x]!/count[x]!);}}
  context.putImageData(pixels,0,0);
  return canvas.toDataURL();
}

const R_KM=6371.0088;
/** A RASTER SHADED BY ITS SCALE (2026-11-17): each drawn pixel the count per km² of the cells under it, or their mean
 *  value, in the scale's classes and colours; clear where there is nothing to shade. At the raster's own resolution
 *  where it fits, as before. */
function shadedRasterImage(grid:Pick<RasterGrid,'metadata'|'values'>,maxSide:number,scale:Pick<PanelScale,'mode'|'breaks'|'ramp'>):string{
  const {metadata:m,values}=grid,factor=rasterImageFactor(m,maxSide),width=Math.ceil(m.width/factor),height=Math.ceil(m.height/factor);
  const noData=typeof m.noData==='number'?m.noData:undefined,[,oy]=m.origin as [number,number],[rx,ry]=m.resolution as [number,number];
  const colours=rampFor(scale.breaks,scale.ramp).map(hex=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d')!,pixels=context.createImageData(width,height),data=pixels.data;
  const sum=new Float64Array(width),weight=new Float64Array(width);
  for(let y=0;y<height;y++){sum.fill(0);weight.fill(0);
    for(let row=y*factor;row<Math.min(m.height,(y+1)*factor);row++){
      const north=oy+row*ry,south=north+ry;
      const area=scale.mode==='density'?R_KM*R_KM*Math.abs(rx*Math.PI/180)*Math.abs(Math.sin(north*Math.PI/180)-Math.sin(south*Math.PI/180)):1;
      const base=row*m.width;
      for(let col=0;col<m.width;col++){const v=values[base+col] as number|null|undefined;
        if(v===null||v===undefined||!Number.isFinite(v)||v===noData||(scale.mode==='density'&&v<0))continue;
        const x=(col/factor)|0;sum[x]+=v;weight[x]+=area;}}
    for(let x=0;x<width;x++){if(!weight[x])continue;
      const k=classOfDensity(sum[x]!/weight[x]!,scale.breaks,scale.mode);if(k<0)continue;
      data.set([...colours[k]!,255],(y*width+x)*4);}}
  context.putImageData(pixels,0,0);
  return canvas.toDataURL();
}
/** THE KEY OF ONE SCALE, as SVG, from `top`: its classes, their edges, and two lines saying what is shaded. */
export function scaleKeySvg(scale:PanelScale,top:number,words:{shade:string;classes:string},esc:(v:unknown)=>string):string{
  const width=90,colours=rampFor(scale.breaks,scale.ramp);
  return `<g data-scale-key="0">`+colours.map((c,i)=>`<rect x="${40+i*width}" y="${top}" width="${width}" height="10" fill="${c}" stroke="#4d4d4d" stroke-width=".4"/>`).join('')
    +scale.breaks.map((b,i)=>`<text x="${40+(i+1)*width}" y="${top+23}" font-size="14" text-anchor="middle" fill="#4d4d4d">${roundDensity(b)}</text>`).join('')
    +`<text x="20" y="${top+44}" font-size="14">${esc(words.shade)}</text><text x="20" y="${top+62}" font-size="14">${esc(words.classes)}</text></g>`;
}
/** A panel's drawn cells in its scale's classes (Map's manual, History: panels): clear where there is nothing to shade. */
export function densityImage(panel:DrawnDensity,scale:Pick<PanelScale,'breaks'|'ramp'|'mode'>):string{
  const canvas=document.createElement('canvas');canvas.width=panel.width;canvas.height=panel.height;
  const context=canvas.getContext('2d')!,pixels=context.createImageData(panel.width,panel.height);
  const colours=rampFor(scale.breaks,scale.ramp).map(hex=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]);
  for(let i=0;i<panel.density.length;i++){const k=classOfDensity(panel.density[i]!,scale.breaks,scale.mode);if(k<0)continue;pixels.data.set([...colours[k]!,255],i*4);}
  context.putImageData(pixels,0,0);
  return canvas.toDataURL();
}
/** The ramp's colours for as many classes as the breaks make, spread end to end. */
export const rampFor=(breaks:readonly number[],ramp:RampName='YlOrRd'):string[]=>{
  const n=breaks.length+1,colours=RAMPS[ramp];
  return Array.from({length:n},(_,k)=>colours[n===1?colours.length-1:Math.round(k*(colours.length-1)/(n-1))]!);
};
/** WHAT A SCALE'S KEY SAYS, in words: the shade, its classes and what is clear. One people scale reads as it always has. */
export function scaleWords(scale:PanelScale,only:boolean|'single'):{shade:string;classes:string}{
  const counted=scale.mode==='density',n=scale.breaks.length+1,how=scale.classes==='equal'?'equal steps':'quantile classes';
  return {shade:only==='single'?`Cell shade: ${scale.label}`:`Cell shade: ${scale.label}${only?', one scale for every panel':` (${scale.layers.join(', ')})`}; side by side, not a difference`,
    classes:counted?`${n} ${how} of the cells with ${scale.noun||'a count'}; clear: ${scale.noun==='people'?'no one modelled':'none counted'}`
      :`${n} ${how} of the cells with a value; clear: no value`};
}
export function drawnWords(scales:readonly PanelScale[],metres:number):string{
  const counted=scales.find(x=>x.mode==='density'),valued=scales.some(x=>x.mode==='value');
  return `Drawn cells about ${Math.round(metres).toLocaleString('en')} m across, each `
    +[counted?`the ${counted.noun||'count'} in the cells under it over their area`:'',valued?'the mean of the cells under it':''].filter(Boolean).join(', or ');
}
const roundDensity=(v:number)=>{const a=Math.abs(v);return Number(a>=100?v.toFixed(0):a>=10?v.toFixed(1):v.toFixed(2)).toLocaleString('en');};
/** THE STATIC FIGURE: one frame for every panel, so a place sits in the same spot in each; a title over each; one key. */
export function rasterPanelsSvg(panels:readonly DrawnDensity[],scales:readonly PanelScale[],grid:'row'|'grid'|'column',
    titles:Record<string,string|undefined>,esc:(v:unknown)=>string):string{
  if(!panels.length)return '<text x="30" y="40">No raster to put in a panel</text>';
  const west=Math.min(...panels.map(p=>p.bounds[0])),south=Math.min(...panels.map(p=>p.bounds[1]));
  const east=Math.max(...panels.map(p=>p.bounds[2])),north=Math.max(...panels.map(p=>p.bounds[3]));
  const columns=grid==='column'?1:grid==='row'?panels.length:Math.min(2,panels.length),rows=Math.ceil(panels.length/columns);
  const gap=16,left=20,title=22,cellWidth=(850-2*left-gap*(columns-1))/columns;
  const cos=Math.cos((south+north)/2*Math.PI/180),w=(east-west)*cos,h=north-south;
  const frameHeight=Math.round(Math.min(cellWidth*h/w,rows===1?520:300)),scale=Math.min(cellWidth/w,frameHeight/h);
  // ONE KEY PER SCALE, stacked: a single scale takes the room it always took.
  const block=72,keyRoom=104+(scales.length-1)*block,height=Math.max(295,rows*(frameHeight+title)+(rows-1)*gap+keyRoom+10);
  const cells=panels.map((p,i)=>{
    const x0=left+(i%columns)*(cellWidth+gap),y0=10+Math.floor(i/columns)*(frameHeight+title+gap);
    const cx=x0+cellWidth/2,cy=y0+title+frameHeight/2;
    const x=cx+(p.bounds[0]-(east+west)/2)*cos*scale,y=cy-(p.bounds[3]-(north+south)/2)*scale;
    const wPx=(p.bounds[2]-p.bounds[0])*cos*scale,hPx=(p.bounds[3]-p.bounds[1])*scale;
    return `<g data-map-panel="${esc(p.layer)}"><rect x="${x0}" y="${y0+title}" width="${cellWidth}" height="${frameHeight}" fill="#f7faf8" stroke="#4d4d4d" stroke-width=".4"/>`
      +`<text x="${x0}" y="${y0+15}" font-size="14" font-weight="600">${esc(titles[p.layer]?.trim()||p.layer)}</text>`
      +`<image href="${densityImage(p,scales[p.scale]??scales[0]!)}" x="${x}" y="${y}" width="${wPx}" height="${hPx}" preserveAspectRatio="none" style="image-rendering:pixelated"/>`
      // THE STUDY AREA, over the cells, so a panel says where its edge is (the practitioner, 2026-11-13).
      +(p.outline?.length?`<path data-panel-outline d="${p.outline.map(ring=>'M'+ring.map(([lon,lat])=>`${(cx+(lon!-(east+west)/2)*cos*scale).toFixed(1)},${(cy-(lat!-(north+south)/2)*scale).toFixed(1)}`).join('L')+'Z').join('')}" fill="none" stroke="#1f2a24" stroke-width=".7" stroke-opacity=".8"/>`:'')
      +`</g>`;
  }).join('');
  const top0=height-94-(scales.length-1)*block,width=90;
  const keys=scales.map((x,j)=>{const top=top0+j*block,colours=rampFor(x.breaks,x.ramp),words=scaleWords(x,scales.length===1);
    return `<g data-scale-key="${j}">`+colours.map((c,i)=>`<rect x="${40+i*width}" y="${top}" width="${width}" height="10" fill="${c}" stroke="#4d4d4d" stroke-width=".4"/>`).join('')
      +x.breaks.map((b,i)=>`<text x="${40+(i+1)*width}" y="${top+23}" font-size="14" text-anchor="middle" fill="#4d4d4d">${roundDensity(b)}</text>`).join('')
      +`<text x="20" y="${top+44}" font-size="14">${esc(words.shade)}</text><text x="20" y="${top+62}" font-size="14">${esc(words.classes)}</text></g>`;}).join('');
  const drawn=Math.max(...panels.map(p=>p.drawnCellM)),last=top0+(scales.length-1)*block;
  return `<rect width="850" height="${height}" fill="#ffffff"/>${cells}${keys}<text x="20" y="${last+80}" font-size="14">${esc(drawnWords(scales,drawn))}</text>`;
}
