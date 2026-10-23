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
  for(const value of values)if(value!==null){min=Math.min(min,value);max=Math.max(max,value);}for(let i=0;i<values.length;i++){const value=values[i];if(value===null)continue;const t=max===min?0.5:(value-min)/(max-min);pixels.data.set([Math.round(245-215*t),Math.round(250-145*t),Math.round(220-135*t),255],i*4);}context.putImageData(pixels,0,0);
  return canvas.toDataURL();
}
