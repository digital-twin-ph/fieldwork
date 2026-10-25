/** A figure as a raster image, for the places that will not take an SVG.
 *
 *  The practitioner, 2026-10-25, on putting a figure into a slide: *"Why not export as PNG?"*
 *  Because an SVG is the better artefact and a worse file. PowerPoint, Word and most slide tools
 *  read a subset of SVG, and this project's figures use three of the constructs that subset is
 *  weakest on -- a nested `<svg>` for the plot area, `<image>` with `href` rather than
 *  `xlink:href` for baked tiles, and a `<mask>` on clipped rasters. A PNG has no subset.
 *
 *  So both, and they answer different questions: SVG for a journal, which usually wants vector
 *  line art and will reject a raster; PNG for a slide, which wants a file that just appears.
 *
 *  THIS IS POSSIBLE ONLY BECAUSE THE TILES ARE BAKED. Drawing an SVG into a canvas taints it if
 *  the SVG references a cross-origin image, and a tainted canvas refuses `toBlob` with a security
 *  error. The basemap's `data:` URIs taint nothing, so the decision that made the file large is
 *  the decision that makes this work at all. */

/** Pixels per figure unit. A figure is 850 units wide, so 3x is 2550 px -- 300 dpi at 8.5 inches,
 *  which clears the usual bar for a raster figure in a journal and downsamples cleanly for a
 *  slide. Chosen rather than offered: a practitioner can scale a large image down and cannot
 *  scale a small one up, and an export that silently picked a small one would be found out at
 *  the printer. */
export const FIGURE_PIXEL_SCALE=3;

export interface RasterisedFigure {blob:Blob; width:number; height:number}

/** Read the size the standalone figure declares, rather than assuming one.
 *
 *  `standaloneMapSvg` sizes itself from its own content -- the title wraps, the legend grows a row
 *  per pair of entries, the note wraps -- so the height is not knowable from the plot's viewBox. */
export function figureSize(markup:string):{width:number;height:number}|null{
  const width=markup.match(/\swidth="(\d+(?:\.\d+)?)"/)?.[1];
  const height=markup.match(/\sheight="(\d+(?:\.\d+)?)"/)?.[1];
  if(!width||!height)return null;
  return {width:Number(width),height:Number(height)};
}

/** Rasterise a self-contained SVG document.
 *
 *  Returns null rather than throwing where the browser cannot do it, so a caller can say what
 *  happened instead of a figure silently not arriving. */
export async function rasteriseFigure(markup:string,scale=FIGURE_PIXEL_SCALE):Promise<RasterisedFigure|null>{
  const size=figureSize(markup);
  if(!size)return null;
  const width=Math.round(size.width*scale),height=Math.round(size.height*scale);
  const url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml;charset=utf-8'}));
  try{
    const image=new Image();
    image.width=size.width;image.height=size.height;
    const loaded=await new Promise<boolean>(resolve=>{
      image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=url;
    });
    if(!loaded)return null;
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');
    if(!context)return null;
    // White, not transparent. A figure dropped on a dark slide with a transparent ground reads as
    // broken, and the SVG it comes from paints a white page of its own.
    context.fillStyle='#FFFFFF';context.fillRect(0,0,width,height);
    context.drawImage(image,0,0,width,height);
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));
    return blob?{blob,width,height}:null;
  }finally{URL.revokeObjectURL(url);}
}
