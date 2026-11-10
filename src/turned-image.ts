import L from 'leaflet';

/** A TURNED IMAGE ON THE MAP (experiment 201). Leaflet draws an image overlay upright, between two corners; a plan placed
 *  by matched points may be turned and sheared. So the image is placed in the overlay pane through a CSS matrix made
 *  from three of its corners in the map's own pixels, and placed again whenever the view changes. */
export class TurnedImage extends L.Layer{
  private img?:HTMLImageElement;
  constructor(private data:string,private corners:[number,number][],private width:number,private height:number,private opacity:number){super();}
  onAdd(map:L.Map){
    const img=this.img=document.createElement('img');
    img.src=this.data;img.className='map-plate-image leaflet-zoom-hide';img.alt='';
    Object.assign(img.style,{position:'absolute',left:'0',top:'0',width:`${this.width}px`,height:`${this.height}px`,
      transformOrigin:'0 0',opacity:String(this.opacity),pointerEvents:'none',maxWidth:'none'});
    map.getPanes().overlayPane.prepend(img);
    map.on('zoomend viewreset moveend',this.place,this);this.place();return this;
  }
  onRemove(map:L.Map){map.off('zoomend viewreset moveend',this.place,this);this.img?.remove();this.img=undefined;return this;}
  setOpacity(opacity:number){this.opacity=opacity;if(this.img)this.img.style.opacity=String(opacity);return this;}
  bringToBack(){const img=this.img;img?.parentElement?.prepend(img);return this;}
  private place(){
    const map=(this as unknown as {_map?:L.Map})._map;
    if(!map||!this.img)return;
    const [tl,tr,,bl]=this.corners.map(([lon,lat])=>map.latLngToLayerPoint([lat,lon]));
    const w=this.width,h=this.height;
    this.img.style.transform=`matrix(${(tr!.x-tl!.x)/w},${(tr!.y-tl!.y)/w},${(bl!.x-tl!.x)/h},${(bl!.y-tl!.y)/h},${tl!.x},${tl!.y})`;
  }
}
