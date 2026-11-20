/** LARGE POINT LAYERS ON THE GRAPHICS CARD (2026-11-19). The practitioner: "How can we make the map draw faster and
 *  bigger". Each mark on the interactive map was a Leaflet marker, its own element on the page: 10,000 drew in 21 s and
 *  50,000 in 155 s. A layer with more than MERGED_MARKS_FROM marks is drawn here instead, by MapLibre GL, as one layer
 *  for the whole map: each mark is an image of its shape, colour, fill and size, made once per combination.
 *
 *  What a marker gave is kept: a click opens the mark's popup, each class has its row in the layer control and can be
 *  turned off, Manage layers' order is the drawing order, and a timeline shows the marks dated up to its day.
 *
 *  MapLibre is fetched only when online (build.mjs, ONLINE_ONLY), and a laptop may have no WebGL. Either way the marks
 *  are drawn as circles on a canvas, in their colour and fill, and the map says so: the shape is the one thing lost. */
import L from 'leaflet';
import {markPath,MARK_HALO,type LayerShape} from './presentation.js';

export interface GlMark {
  lon:number; lat:number;
  shape:LayerShape; radius:number;
  /** Fill colour, or null for a hollow mark. */
  fill:string|null; fillOpacity:number; stroke:string;
  /** The layer-control row this mark belongs to. */
  group:string;
  /** YYYY-MM-DD where the map has a timeline; empty where the mark is always shown. */
  date:string;
  popup:string;
}

/** A row in the layer control for some of the marks: adding or removing it shows or hides them. */
export class GlGroup extends L.Layer {
  constructor(readonly key:string,private readonly owner:GlMarks,private readonly bounds:L.LatLngBounds){super();}
  override onAdd(){this.owner.show(this.key,true);return this;}
  override onRemove(){this.owner.show(this.key,false);return this;}
  getBounds(){return this.bounds;}
}

let workerSet=false;
const ICON_LAYER='fieldwork-marks';

export class GlMarks {
  private marks:GlMark[]=[];
  private visible=new Set<string>();
  private day:string|null=null;
  private gl:import('maplibre-gl').Map|undefined;
  private fallback:Map<string,L.FeatureGroup>|undefined;
  private started=false;
  private disposed=false;
  constructor(private readonly map:L.Map,private readonly options:{halo:boolean;pane:string;say:(text:string)=>void}){}

  /** Hold these marks under one layer-control row. Call before start(). */
  group(key:string,marks:GlMark[]):GlGroup{
    for(const m of marks)this.marks.push({...m,group:key});
    const bounds=L.latLngBounds(marks.map(m=>[m.lat,m.lon] as [number,number]));
    return new GlGroup(key,this,bounds);
  }
  get size(){return this.marks.length;}

  show(key:string,on:boolean){
    if(on)this.visible.add(key);else this.visible.delete(key);
    this.refilter();
  }
  setDay(day:string|null){this.day=day;this.refilter();}

  /** Load the renderer and draw; or draw the circles where it cannot load. */
  start(){
    if(this.started||!this.marks.length)return;this.started=true;
    if(!this.map.getPane(this.options.pane)){const pane=this.map.createPane(this.options.pane);pane.style.zIndex='450';}
    Promise.all([import('maplibre-gl'),import('@maplibre/maplibre-gl-leaflet')]).then(([maplibre])=>{
      if(this.disposed)return;
      if(!workerSet){maplibre.setWorkerUrl(new URL('./maplibre-gl-worker.mjs',import.meta.url).href);workerSet=true;}
      const data={type:'FeatureCollection' as const,features:this.marks.map((m,i)=>({type:'Feature' as const,
        geometry:{type:'Point' as const,coordinates:[m.lon,m.lat]},
        properties:{i,icon:this.iconKey(m),group:m.group,date:m.date}}))};
      const layer=(L as unknown as {maplibreGL:(o:unknown)=>L.Layer&{getMaplibreMap:()=>import('maplibre-gl').Map}}).maplibreGL({
        pane:this.options.pane,interactive:false,
        style:{version:8,sources:{marks:{type:'geojson',data}},layers:[{id:ICON_LAYER,type:'symbol',source:'marks',
          layout:{'icon-image':['get','icon'],'icon-allow-overlap':true,'icon-ignore-placement':true,
            'symbol-sort-key':['get','i'],'symbol-z-order':'source'},filter:this.filter()}]}});
      layer.addTo(this.map);
      const gl=layer.getMaplibreMap();
      if(!gl){layer.remove();this.drawFallback('The graphics renderer could not start');return;}
      this.gl=gl;
      // EACH MARK'S IMAGE MADE WHEN FIRST NEEDED. MapLibre 6 asks a resolver; its `styleimagemissing` event no longer fires.
      const resolve=(id:string)=>{const image=this.icon(id);if(image&&!gl.hasImage(id))gl.addImage(id,image.data,{pixelRatio:image.ratio});};
      gl.setMissingStyleImageResolver(id=>{resolve(id);});
      gl.on('error',()=>{/* a missing image or tile is reported by MapLibre and never stops the other marks */});
      this.map.on('click',this.onClick);
      // DRAWN, said on the map's element once MapLibre has finished its first frame of the marks.
      gl.once('idle',()=>{if(!this.disposed)this.map.getContainer().dataset.marksDrawn='gpu';});
    }).catch(()=>this.drawFallback(navigator.onLine?'The graphics renderer could not load':'The graphics renderer is fetched only when online'));
  }

  dispose(){this.disposed=true;this.map.off('click',this.onClick);}

  private onClick=(e:L.LeafletMouseEvent)=>{
    const gl=this.gl;if(!gl)return;
    const at=this.map.latLngToContainerPoint(e.latlng),pad=this.map.getSize().multiplyBy(0.1);
    const x=at.x+pad.x,y=at.y+pad.y;
    const found=gl.queryRenderedFeatures([[x-6,y-6],[x+6,y+6]],{layers:[ICON_LAYER]});
    const top=found[0];if(!top)return;
    const mark=this.marks[Number(top.properties?.i)];if(!mark)return;
    L.popup().setLatLng([mark.lat,mark.lon]).setContent(mark.popup).openOn(this.map);
  };

  private filter():unknown{
    const groups:unknown=['in',['get','group'],['literal',[...this.visible]]];
    return this.day?['all',groups,['any',['==',['get','date'],''],['<=',['get','date'],this.day]]]:groups;
  }
  private refilter(){
    if(this.gl?.getLayer(ICON_LAYER))this.gl.setFilter(ICON_LAYER,this.filter() as never);
    if(this.fallback)for(const [key,group] of this.fallback){
      const on=this.visible.has(key);
      if(on&&!this.map.hasLayer(group))group.addTo(this.map);
      if(!on&&this.map.hasLayer(group))group.remove();
      if(this.day!==null)group.eachLayer(layer=>{const date=(layer as unknown as {fwDate?:string}).fwDate??'';
        (layer as L.CircleMarker).setStyle({opacity:!date||date<=this.day!?1:0,fillOpacity:!date||date<=this.day!?(layer as unknown as {fwFill:number}).fwFill:0});});
    }
  }

  private iconKey(m:GlMark){return [m.shape,m.radius,m.fill??'none',m.fillOpacity,m.stroke,this.options.halo?1:0].join('|');}
  private icon(key:string):{data:ImageData;ratio:number}|null{
    const [shape,r,fill,opacity,stroke,halo]=key.split('|');
    const radius=Number(r);if(!shape||!Number.isFinite(radius))return null;
    const ratio=Math.max(1,Math.round(window.devicePixelRatio||1));
    const box=Math.ceil(2*(radius+2.5)),centre=box/2;
    const canvas=document.createElement('canvas');canvas.width=box*ratio;canvas.height=box*ratio;
    const ctx=canvas.getContext('2d');if(!ctx)return null;
    ctx.scale(ratio,ratio);ctx.lineJoin='round';
    const path=new Path2D(markPath(shape as LayerShape,centre,centre,radius));
    if(halo==='1'){ctx.strokeStyle=MARK_HALO;ctx.lineWidth=3.4;ctx.stroke(path);}
    if(fill&&fill!=='none'){ctx.globalAlpha=Number(opacity);ctx.fillStyle=fill;ctx.fill(path);ctx.globalAlpha=1;}
    ctx.strokeStyle=stroke!;ctx.lineWidth=1.5;ctx.stroke(path);
    return {data:ctx.getImageData(0,0,canvas.width,canvas.height),ratio};
  }

  private drawFallback(why:string){
    if(this.disposed||this.fallback)return;
    const renderer=L.canvas({pane:this.options.pane});
    this.fallback=new Map();
    for(const m of this.marks){
      let group=this.fallback.get(m.group);if(!group){group=L.featureGroup();this.fallback.set(m.group,group);}
      const marker=L.circleMarker([m.lat,m.lon],{renderer,radius:m.radius,color:m.stroke,weight:1.5,
        fill:!!m.fill,fillColor:m.fill??undefined,fillOpacity:m.fill?m.fillOpacity:0}).bindPopup(m.popup);
      Object.assign(marker,{fwDate:m.date,fwFill:m.fill?m.fillOpacity:0});
      group.addLayer(marker);
    }
    this.refilter();
    this.map.getContainer().dataset.marksDrawn='circles';
    this.options.say(`${why}, so the ${this.marks.length.toLocaleString('en')} marks of the large layers are drawn as circles.`);
  }
}
