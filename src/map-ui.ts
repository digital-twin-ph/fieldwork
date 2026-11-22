import {wordsHint} from './figure-words.js';
/** MAP: ITS INSPECTOR AND ITS CONFIGURE DIALOG, out of app.ts (2026-11-19; the practitioner: "We can be opportunistic
 *  again with app.ts like we did with widgets"). The standard sections (experiment 186) are drawn here from the kit;
 *  the workflow is read through it and changed only through its `change`. The last run is read through `result`. */
import type {Workflow,WorkflowNode,BasemapChoice} from './types.js';
import type {WorkflowRun,Output} from './results.js';
import type {InspectorKit} from './inspector-kit.js';
import {withoutLeftOutAreas,mapStudyAreas} from './map-output.js';
import {TYPES,nodeInputs,outputOf} from './core.js';
import {openConfigDialog} from './config-dialog.js';
import {errorMessage,required} from './guards.js';
import {mountCatchmentMap,basemapOptions,BASEMAP_OPTIONS} from './catchment-map.js';
import {basemapAvailable,basemapOf} from './basemaps.js';
import {FOCUS_LIMIT,type Corner} from './map-inset.js';
import {isRasterPort} from './raster-panels.js';
import {isPointPort,MAX_POINT_LAYERS,LABEL_CEILING} from './point-layers.js';
import {LAYER_SHAPES,resolveLayerSymbol,type LayerShape,FIGURE_PALETTE,MARK_RADIUS_MIN,MARK_RADIUS_MAX} from './presentation.js';
import {TILE_DEFAULT_MAX_ZOOM,TILE_MAX_ZOOMS,TILE_SOURCE,drawnBounds,importTiles} from './tile-extract.js';
import {DEFAULT_FIGURE_SECTIONS,figureSection,type FigureSection} from './notes.js';
import {partsTable} from './map-parts-table.js';

/** What Map is given beyond the kit every widget has. */
export interface MapKit extends InspectorKit {
  /** The last run, to read; null before one. */
  result:()=>WorkflowRun|null;
  /** A change that is presentation only: the run stays current. */
  change:(edit:(w:Workflow)=>void,options?:{spatial?:boolean})=>void;
  /** Redraw the figures in Results. */
  renderResults:()=>void;
  /** Connect `from` to the map on `port`, as every step's input lists do. */
  connect:(w:Workflow,from:string,to:string,port:string)=>void;
  /** The categories an Apply ruleset step gives its points. */
  ruleCategories:(node:WorkflowNode)=>string[];
  /** The view on a Leaflet map as an inset's box, or why not. */
  insetBoxFrom:(map:import('leaflet').Map,shown:Output)=>[number,number,number,number]|string;
  /** How wide the workflow's places are, in km, for which basemaps are offered. */
  spanKm:()=>number|undefined;
  /** Where an output's figure goes in the write-up. */
  writeUpSelect:(n:WorkflowNode<'map_output'>)=>string;
}

let ctx:MapKit;
const esc=(value:unknown)=>ctx.esc(value);
const LAYER_COLOUR_NAMES=['blue','vermillion','bluish green','orange','reddish purple','sky blue'];
const layerDefaultColour=(index:number)=>FIGURE_PALETTE[index%FIGURE_PALETTE.length]!;
function getNode<K extends 'map_output'>(w:Workflow,id:string,type:K):WorkflowNode<K>{
  const node=required(w.nodes.find(n=>n.id===id));if(node.type!==type)throw new Error('Node type changed while editing');return node as WorkflowNode<K>;
}

/** WHICH ATTRIBUTE NAMES A PART, from what the last run drew. Interactive only: the static figure names
 *  no parts. */
function frameCaptionControl(n:WorkflowNode<'map_output'>):string{
  if(n.params.presentation!=='interactive')return '';
  const framed=ctx.result()?.outputs.find(o=>o.nodeId===n.id)?.polygons as {frames?:string[]}|undefined;
  if(!framed?.frames?.length)return '';
  return `<label class="field-label" for="map-frame-caption">What a frame is</label>`
    +`<input id="map-frame-caption" maxlength="60" value="${esc(n.params.frameCaption??'')}" placeholder="e.g. Birth cohort">`
    +`<p class="description">${framed.frames.length} frames, ${esc(framed.frames[0]!)} to ${esc(framed.frames.at(-1)!)}, shown as the data names them.</p>`;
}
function partLabelControl(n:WorkflowNode<'map_output'>):string{
  if(n.params.presentation!=='interactive')return '';
  const features=ctx.result()?.outputs.find(o=>o.nodeId===n.id)?.polygons?.features??[];
  const names=[...new Set(features.flatMap(f=>Object.keys((f as {properties?:object}).properties??{})))];
  if(!names.length)return '';
  return `<label class="field-label" for="map-part-label">Label parts with</label>`
    +`<select id="map-part-label"><option value="">The key they are joined on</option>`
    +names.map(name=>`<option value="${esc(name)}" ${n.params.partLabel===name?'selected':''}>${esc(name)}</option>`).join('')
    +`</select>`;
}
/** THE ONE-TIME IMPORT, on the interactive map only. The boundary is what the map draws, so it needs
 *  a run first. Experiment 163. */
function tileImportControls(p:WorkflowNode<'map_output'>['params']):string{
  if(p.presentation!=='interactive')return '';
  const held=p.tileExtract;
  return `<div data-tile-import><label class="field-label" for="map-tile-zoom">Import tiles up to zoom</label>
    <select id="map-tile-zoom">${TILE_MAX_ZOOMS.map(z=>`<option value="${z}" ${(held?.maxZoom??TILE_DEFAULT_MAX_ZOOM)===z?'selected':''}>${z}</option>`).join('')}</select>
    <button id="map-import-tiles" class="button">Import tiles</button>
    <p id="map-tile-status" class="description">${held?.digest
      ?`${held.tiles} tiles, ${(Number(held.bytes)/1048576).toFixed(1)} MB, from the OpenStreetMap build of ${esc(held.built||'an unstated date')}. The project keeps this description, not the tiles.`
      :'Fetches the tiles under this map once, while connected, and keeps them on this device.'}</p></div>`;
}
/** THE BASEMAP, its own group in Configure… (the practitioner, 2026-11-10: "This left side needs subsections"). */
function mapBasemapControls(n:WorkflowNode<'map_output'>){
  const p=n.params;
  return `<span class="inspector-section">Basemap</span>
    <label class="field-label" for="map-basemap">Basemap</label><select id="map-basemap">${basemapOptions(p.basemap,p.presentation==='interactive'?'interactive':'plot',ctx.spanKm())}</select>
    <p class="description">Layer 0, under everything the workflow produced. ${p.presentation==='interactive'
      ?'Choosing an online basemap sends the area viewed to its provider. An OpenStreetMap extract (PMTiles) is imported once below and kept on this device.'
      :'OpenStreetMap and OpenTopoMap are fetched once and drawn into the figure itself, with their credit; the area viewed is sent to the provider. Vector styles and PMTiles are offered on the interactive map.'}</p>
    ${tileImportControls(p)}`;
}
/** WHAT THE FIGURE SAYS: title, subtitle, key and note. */
function mapTextControls(n:WorkflowNode<'map_output'>){
  const p=n.params;
  return `<span class="inspector-section">Title, key and note</span>
    <label class="field-label" for="map-title">Map title</label><input id="map-title" maxlength="120" value="${esc(p.mapTitle||'')}" placeholder="Default: results tab name">
    <label class="field-label" for="map-subtitle">Subtitle / context</label><input id="map-subtitle" maxlength="280" value="${esc(p.mapSubtitle||'')}" placeholder="What this map shows, in your words">
    ${wordsHint(esc)}
    <label><input id="map-legend-toggle" type="checkbox" ${p.showLegend!==false?'checked':''}> Show map key</label>
    <label><input id="map-halo-toggle" type="checkbox" ${p.markHalo!==false?'checked':''}> Dark outline on point symbols</label>
    <label class="field-label" for="map-source-note">Source / method note</label><textarea spellcheck="true" id="map-source-note" maxlength="500" rows="3" placeholder="Default: connected source labels and method">${esc(p.mapSourceNote||'')}</textarea>
    ${partLabelControl(n)}
    ${frameCaptionControl(n)}
    `;
}
/** One bordered group per heading, so each label is read with the controls it belongs to. */
function groupSections(first:string,html:string):string{
  const parts=html.split('<span class="inspector-section">'),head=parts.shift()!;
  const box=(title:string,body:string)=>`<section class="config-group"><h3 class="config-group-title">${title}</h3>${body}</section>`;
  return (head.trim()?box(first,head):'')+parts.map(part=>{const end=part.indexOf('</span>');return box(part.slice(0,end),part.slice(end+7));}).join('');
}
/** MAP'S CONFIGURATION DIALOG (experiment 186): every setting of the figure on a draft, written by Apply. All of them are
 *  presentation, so Apply leaves the run current and redraws the figure; turning a reasoning map into a table or a chart
 *  changes the step itself, and is applied as an ordinary change. */
export function openMapConfig(nodeId:string){
  const node=getNode(ctx.workflow(),nodeId,'map_output');
  type Draft=WorkflowNode<'map_output'>['params']&{view?:'map'|'table'|'bars'};
  let note='';
  openConfigDialog<Draft>({
    id:'map-config',widget:'Map',step:node.params.label||TYPES.map_output.title,draft:structuredClone(node.params),
    sections:draft=>({settings:mapSettings({...node,params:draft}),
      // THE MAP ITSELF, AS IT WILL LOOK (the practitioner, 2026-11-10: "the Preview is empty. I think it's helpful to be
      // able to preview the map esp if updating mark size and viewing PM Tiles"). The last run, drawn with the draft.
      preview:ctx.result()?.outputs.some(o=>o.nodeId===nodeId)
        ?'<div id="map-config-preview" class="map-config-preview"></div><p class="muted">The last run, drawn with the settings above. Apply keeps them; nothing is run again.</p>'
        :'<p class="muted">Run the workflow to preview this map here. It is drawn in Results when the workflow runs.</p>',
      ...(note?{message:{tone:'warning' as const,text:note}}:{})}),
    wire:(root,draft,redraw)=>{
      const on=(selector:string,fn:(el:HTMLInputElement&HTMLSelectElement&HTMLTextAreaElement)=>void)=>
        root.querySelectorAll<HTMLInputElement&HTMLSelectElement&HTMLTextAreaElement>(selector).forEach(el=>el.addEventListener('change',()=>{note='';fn(el);redraw();}));
      disposePreview?.();disposePreview=undefined;
      const previewHost=root.querySelector<HTMLElement>('#map-config-preview');
      const drawn=ctx.result()?.outputs.find(o=>o.nodeId===nodeId);
      if(previewHost&&drawn){
        // The symbols re-resolved from the DRAFT, as renderMap re-resolves them from the live node.
        const layerSymbols=Object.fromEntries((drawn.pointLayers||[]).map((layer,index)=>
          [layer.sourceNodeId,resolveLayerSymbol(index,draft.layerSymbols?.[layer.sourceNodeId])]));
        const shown=withoutLeftOutAreas({...drawn,layerSymbols,markHalo:draft.markHalo!==false} as typeof drawn,draft.leftOutAreas);
        // One frame later: Leaflet fits the map to its box, and the box has no size until the dialog has laid it out.
        let cancelled=false;
        const frame=requestAnimationFrame(()=>{if(cancelled||!previewHost.isConnected)return;
          try{const dispose=mountCatchmentMap(previewHost,shown.polygons?{...shown,polygons:shown.polygons}:shown,shown.contextPoints,esc,
            basemapOf(draft.basemap),undefined,`preview-${nodeId}`,draft.tileExtract,draft.partLabel,draft.frameCaption,{svgOnly:true,onMap:m=>{previewMap=m;}});
            disposePreview=()=>{cancelled=true;previewMap=undefined;dispose();};}
          catch(error){previewHost.textContent=`The preview could not be drawn: ${errorMessage(error)}`;}});
        disposePreview=()=>{cancelled=true;cancelAnimationFrame(frame);};
      }
      // THE INSET PICKED ON THE PREVIEW (Map's manual, History: the inset), for a map shown as a static figure, which cannot be zoomed.
      root.querySelector('[data-inset-from-preview]')?.addEventListener('click',()=>{
        const drawnNow=ctx.result()?.outputs.find(o=>o.nodeId===nodeId);
        if(!previewMap||!drawnNow?.boundary){note='Run the workflow to preview the map, then zoom the preview to the part.';redraw();return;}
        const picked=ctx.insetBoxFrom(previewMap,drawnNow);
        if(typeof picked==='string')note=picked;else{note='';draft.inset={...(draft.inset??{}),box:picked};}
        redraw();});
      // THE INSET (Map's manual, History: the inset): its box is kept; which frame is large, the corner and the width are chosen here.
      on('[data-map-area]',el=>{const area=el.dataset.mapArea!,out=new Set(draft.leftOutAreas??[]);
        if(el.checked)out.delete(area);else out.add(area);
        const all=mapStudyAreas(ctx.workflow(),nodeId);
        if(all.length&&all.every(a=>out.has(a))){note='Keep at least one study area on the map.';out.delete(area);}
        if(out.size)draft.leftOutAreas=[...out];else delete draft.leftOutAreas;});
      on('#map-inset-arrange',el=>{if(!draft.inset)return;if(!el.value){delete draft.inset;return;}draft.inset={...draft.inset,arrange:el.value as 'inset'|'locator'};});
      on('#map-inset-corner',el=>{if(!draft.inset)return;const next={...draft.inset};if(el.value)next.corner=el.value as Corner;else delete next.corner;draft.inset=next;});
      on('#map-inset-size',el=>{if(!draft.inset)return;draft.inset={...draft.inset,size:el.value as 'third'|'half'};});
      // ARRANGE (Map's manual, History: panels): panels for every layer the last run drew, in that order, until some are left out.
      on('#map-arrange',el=>{
        if(!el.value){delete draft.arrangement;return;}
        const layers=drawnPolygonLayers(nodeId);
        draft.arrangement={grid:el.value as 'row'|'grid'|'column',panels:draft.arrangement?.panels?.length?draft.arrangement.panels:layers.map(layer=>({layer}))};});
      on('[data-panel-include]',el=>{if(!draft.arrangement)return;const layer=el.dataset.panelInclude!;
        const order=[...new Set([...drawnPolygonLayers(nodeId),...draft.arrangement.panels.map(p=>p.layer)])];
        const held=new Map(draft.arrangement.panels.map(p=>[p.layer,p]));
        if(el.checked)held.set(layer,held.get(layer)??{layer});else held.delete(layer);
        const panels=order.filter(l=>held.has(l)).map(l=>held.get(l)!);
        if(panels.length)draft.arrangement={...draft.arrangement,panels};else delete draft.arrangement;});
      on('[data-panel-title]',el=>{const panel=draft.arrangement?.panels.find(p=>p.layer===el.dataset.panelTitle);
        if(panel){const t=el.value.trim();if(t)panel.title=t;else delete panel.title;}});
      const shade=(key:'show'|'ramp'|'classes',value:string)=>{const next={...(draft.rasterShading??{})} as Record<string,string>;
        if(value)next[key]=value;else delete next[key];
        if(Object.keys(next).length)draft.rasterShading=next as NonNullable<Draft['rasterShading']>;else delete draft.rasterShading;};
      on('#raster-show',el=>shade('show',el.value));on('#raster-ramp',el=>shade('ramp',el.value));on('#raster-classes',el=>shade('classes',el.value));
      on('#polygon-presentation',el=>{
        draft.presentation=el.value==='interactive'?'interactive':'plot';
        // A BASEMAP THE NEW PRESENTATION CANNOT DRAW is set to none, and the person told, as the Inspector did.
        const held=draft.basemap;
        if(held&&held!=='none'&&!basemapAvailable(held,draft.presentation)){
          const name=BASEMAP_OPTIONS.find(o=>o.value===held)?.label||held;draft.basemap='none';
          note=`${name} is drawn from vector tiles, which a static figure cannot bake in, so this map now has no basemap. `
            +'OpenStreetMap and OpenTopoMap are fetched once and drawn into the figure, and are offered here; the vector styles are offered on the interactive map.';}});
      on('#output-section',el=>{const chosen=el.value as FigureSection|'none';
        if(chosen===DEFAULT_FIGURE_SECTIONS.map_output)delete draft.section;else draft.section=chosen;});
      on('#output-view',el=>{draft.view=el.value as Draft['view'];});
      const perSource=(key:'pinClassField'|'labelField',source:string,value:string)=>{
        const held={...(draft[key]||{})};if(value)held[source]=value;else delete held[source];
        if(Object.keys(held).length)draft[key]=held;else delete draft[key];};
      on('[data-pin-class]',el=>perSource('pinClassField',el.dataset.pinClass!,el.value));
      on('[data-mark-label]',el=>perSource('labelField',el.dataset.markLabel!,el.value));
      const perLink=(source:string,key:'column'|'matches',value:string)=>{
        const held={...(draft.linkField||{})},entry={column:held[source]?.column??'',matches:held[source]?.matches??'',[key]:value};
        // No column, no lines: the entry goes, whatever "found by" held.
        if(entry.column)held[source]=entry;else delete held[source];
        if(Object.keys(held).length)draft.linkField=held;else delete draft.linkField;};
      on('[data-link-column]',el=>perLink(el.dataset.linkColumn!,'column',el.value));
      on('[data-link-matches]',el=>perLink(el.dataset.linkMatches!,'matches',el.value));
      on('[data-layer-mark]',el=>{const source=el.dataset.layerMark!,mark=el.value as LayerShape|'';
        const held={...(draft.layerSymbols||{})};
        // An empty choice REMOVES the entry: a mark somebody chose and one the layer's position gave it differ.
        if(mark)held[source]={...held[source],mark};else delete held[source];draft.layerSymbols=held;});
      on('[data-layer-colour]',el=>{const source=el.dataset.layerColour!,held={...(draft.layerSymbols||{})};
        // Default REMOVES the choice, as for the mark: a colour chosen and one the layer's position gave differ.
        if(el.value)held[source]={...held[source],colour:el.value};
        else if(held[source]){const {colour:_dropped,...rest}=held[source]!;held[source]=rest;}
        draft.layerSymbols=held;});
      // SIZE OR COLOUR, one at a time: a coloured layer draws every mark one size, so choosing one clears the other.
      on('[data-layer-size-by]',el=>{const source=el.dataset.layerSizeBy!,held={...(draft.layerSymbols||{})};
        if(el.value){const {colourBy:_c,...rest}=held[source]??{};held[source]={...rest,sizeBy:el.value};
          const other=root.querySelector<HTMLSelectElement>(`[data-layer-colour-by="${CSS.escape(source)}"]`);if(other)other.value='';}
        else if(held[source]){const {sizeBy:_dropped,...rest}=held[source]!;held[source]=rest;}
        draft.layerSymbols=held;});
      on('[data-layer-colour-by]',el=>{const source=el.dataset.layerColourBy!,held={...(draft.layerSymbols||{})};
        if(el.value){const {sizeBy:_s,...rest}=held[source]??{};held[source]={...rest,colourBy:el.value};
          const other=root.querySelector<HTMLSelectElement>(`[data-layer-size-by="${CSS.escape(source)}"]`);if(other)other.value='';}
        else if(held[source]){const {colourBy:_dropped,...rest}=held[source]!;held[source]=rest;}
        draft.layerSymbols=held;});
      on('[data-layer-size]',el=>{const source=el.dataset.layerSize!;
        draft.layerSymbols={...(draft.layerSymbols||{}),[source]:{...draft.layerSymbols?.[source],size:Number(el.value)}};});
      for(const [selector,key] of [['#map-title','mapTitle'],['#map-subtitle','mapSubtitle'],['#map-source-note','mapSourceNote']] as const)
        on(selector,el=>{draft[key]=el.value.trim();});
      on('#map-legend-toggle',el=>{draft.showLegend=el.checked;});
      on('#map-halo-toggle',el=>{draft.markHalo=el.checked;});
      on('#map-basemap',el=>{draft.basemap=el.value as BasemapChoice;});
      on('#map-frame-caption',el=>{const v=el.value.trim();if(v)draft.frameCaption=v;else delete draft.frameCaption;});
      on('#map-part-label',el=>{if(el.value)draft.partLabel=el.value;else delete draft.partLabel;});
      // PMTILES, IN CONFIGURE (the practitioner, 2026-11-10: "the PM tiles download is on the Inspector panel. Shouldn't
      // this be on the Configure dialog?"). The tiles are kept on this device as they arrive; what the step holds is
      // their description, which reaches the step on Apply, with the basemap set to them.
      root.querySelector<HTMLButtonElement>('#map-import-tiles')?.addEventListener('click',async()=>{
        const button=root.querySelector<HTMLButtonElement>('#map-import-tiles')!,say=root.querySelector('#map-tile-status')!;
        const drawn=drawnBounds(ctx.result()?.outputs.find(o=>o.nodeId===nodeId));
        if(!drawn){say.textContent='Run the workflow first: the boundary is what this map draws, and nothing has been drawn yet.';return;}
        const pad=(low:number,high:number)=>high-low<0.02?[(low+high)/2-0.01,(low+high)/2+0.01]:[low,high];
        const [west,east]=pad(drawn[0],drawn[2]),[south,north]=pad(drawn[1],drawn[3]);
        say.textContent='Reading the archive\u2026';button.disabled=true;
        try{
          const spec=await importTiles({source:TILE_SOURCE,bounds:[west!,south!,east!,north!],minZoom:0,
            maxZoom:Number(root.querySelector<HTMLSelectElement>('#map-tile-zoom')!.value)},
            (done,total)=>{say.textContent=`Importing tiles: ${done} of ${total}`;});
          draft.tileExtract=spec;draft.basemap='tile-extract';
          note=`${spec.tiles} tiles imported and kept on this device. Apply to use them as this map's basemap.`;redraw();
        }catch(error){button.disabled=false;say.textContent=`The tiles could not be imported: ${error instanceof Error?error.message:'unknown error'}.`;}
      });
    },
    beforeRedraw:()=>{disposePreview?.();disposePreview=undefined;},
    apply:draft=>{
      const {view,...params}=draft;
      if(view&&view!=='map'){ctx.change(w=>{const index=w.nodes.findIndex(x=>x.id===nodeId);
        w.nodes[index]={...w.nodes[index]!,type:'output',params:{label:params.label,view}} as never;});return;}
      ctx.change(w=>{getNode(w,nodeId,'map_output').params=params;},{spatial:false});
      ctx.renderResults();
    },
  },esc);
}
let disposePreview:(()=>void)|undefined;let previewMap:import('leaflet').Map|undefined;
/** ARRANGE: ONE MAP, OR PANELS SIDE BY SIDE (Map's manual, History: panels). The practitioner, 2026-11-13: "We should have the capability
 *  to arrange the maps in the Configure dialog." The panels are the polygon layers the last run drew, by name. */
const drawnPolygonLayers=(nodeId:string):string[]=>{
  const out=ctx.result()?.outputs.find(o=>o.nodeId===nodeId);
  // AND THE RASTERS, each a panel of grid cells (Map's manual, History: panels).
  const rasters=((out as {rasterPanels?:{layer:string}[]}|undefined)?.rasterPanels??[]).map(p=>p.layer);
  return [...new Set([...rasters,...(out?.polygons?.features??[]).map(f=>f.layerName).filter((x):x is string=>!!x)])];
};
/** AN INSET (Map's manual, History: the inset): picked on the interactive map in Results; here, which frame is large, where it goes, how big. */
function mapInsetSection(n:WorkflowNode<'map_output'>):string{
  const i=n.params.inset;
  const pick=`<button class="button small" type="button" data-inset-from-preview>Use the preview\u2019s view as the inset</button>`;
  if(!i)return `<span class="inspector-section">Inset</span><p class="muted">No inset. Zoom the preview below, or the interactive `
    +`map in Results, to the part to enlarge, and use that view as the inset.</p>`+pick;
  const opt=(v:string,label:string,at:string)=>`<option value="${v}" ${v===at?'selected':''}>${label}</option>`;
  return `<span class="inspector-section">Inset</span>`
    +`<div class="field"><label class="field-label" for="map-inset-arrange">Show</label><select id="map-inset-arrange">`
    +opt('inset','Focus inset: the part enlarged in a circle, on the whole map',i.arrange??'inset')
    +opt('locator','Overview inset: the whole map small in a square, on the part',i.arrange??'inset')
    +opt('','No inset',i.arrange??'inset')+`</select></div>`
    +`<div class="field"><label class="field-label" for="map-inset-corner">Where it goes</label><select id="map-inset-corner">`
    +opt('','Where it covers nothing the map shows',i.corner??'')+opt('ne','Top right',i.corner??'')+opt('nw','Top left',i.corner??'')
    +opt('se','Bottom right',i.corner??'')+opt('sw','Bottom left',i.corner??'')+`</select>`
    +`<p class="muted">An inset never covers the boundary, the marks or the north arrow. A corner you choose is used where it is clear; otherwise the inset goes to the nearest clear place, or below the map.</p></div>`
    +`<div class="field"><label class="field-label" for="map-inset-size">Its size</label><select id="map-inset-size">`
    +opt('third','A third of the figure\u2019s width',i.size??'third')+opt('half','Half the figure\u2019s width',i.size??'third')+`</select>`
    // SAID, NOT DONE SILENTLY: the limit that can hold a circle under the size chosen.
    +((i.arrange??'inset')==='inset'?`<p class="muted">A focus circle is never more than ${Math.round(FOCUS_LIMIT*100)}% of the map\u2019s shorter side, so on a wide or short map it may be drawn smaller than chosen.</p>`:'')
    +`</div>`+pick;
}
/** RASTER PANELS, SHOWN AS CHOSEN (2026-11-17; the practitioner: "I can't seem to find how Map output enables rendering of pop
 *  density as YlOrRd hues"). Each left at its first option, the rasters' stated units decide. */
function mapRasterSection(n:WorkflowNode<'map_output'>):string{
  if(!ctx.workflow().edges.some(e=>e.to===n.id&&isRasterPort(e.port)))return '';
  const r=n.params.rasterShading??{};
  const select=(id:string,label:string,options:[string,string][],held:string|undefined)=>`<div class="field"><label class="field-label" for="${id}">${label}</label>`
    +`<select id="${id}">${options.map(([v,t])=>`<option value="${v}" ${(held??'')===v?'selected':''}>${t}</option>`).join('')}</select></div>`;
  return `<span class="inspector-section">Raster panels</span>`
    +select('raster-show','Each cell shows',[['','From the raster\u2019s unit: a count per km², or the value'],['per-km2','A count, per km²'],['cell-value','The cell\u2019s value']],r.show)
    +select('raster-ramp','Colours',[['','From what is shown: yellow to red for a count, viridis for a value'],['YlOrRd','Yellow to red (YlOrRd)'],['viridis','Viridis']],r.ramp)
    +select('raster-classes','Classes',[['','Quantiles: about as many cells in each'],['equal','Equal steps from lowest to highest']],r.classes==='equal'?'equal':'')
    +`<p class="muted">Used when the map draws rasters in panels. Panels in the same unit share one scale and one key.</p>`;
}
/** EACH STUDY AREA, a checkbox: unchecked, it is left out of the map (2026-11-22). */
function mapStudyAreasSection(n:WorkflowNode<'map_output'>):string{
  const areas=mapStudyAreas(ctx.workflow(),n.id);if(areas.length<2)return '';
  const out=new Set(n.params.leftOutAreas??[]);
  return `<span class="inspector-section">Study areas</span><div class="map-study-areas" data-map-study-areas>`
    +areas.map(a=>`<label><input type="checkbox" data-map-area="${esc(a)}" ${out.has(a)?'':'checked'}> ${esc(a)}</label>`).join('')
    +`</div><p class="muted">Unchecked, a study area is left out of this map, the figure and the write-up; its layer keeps it.</p>`;
}
function mapArrangeSection(n:WorkflowNode<'map_output'>):string{
  const names=drawnPolygonLayers(n.id),a=n.params.arrangement;
  const layers=[...new Set([...names,...(a?.panels??[]).map(p=>p.layer)])];
  if(layers.length<2&&!a)return `<span class="inspector-section">Arrange</span><p class="muted">One map. Connect two or more polygon `
    +`layers or rasters and run the workflow to put them in panels side by side, on one scale.</p>`;
  const grid=a?.grid??'';
  return `<span class="inspector-section">Arrange</span><div class="field"><label class="field-label" for="map-arrange">Arrange</label>`
    +`<select id="map-arrange"><option value="" ${grid===''?'selected':''}>One map, the layers over each other</option>`
    +`<option value="row" ${grid==='row'?'selected':''}>Panels in one row</option>`
    +`<option value="grid" ${grid==='grid'?'selected':''}>Panels two by two</option>`
    +`<option value="column" ${grid==='column'?'selected':''}>Panels in one column</option></select></div>`
    +(a?`<p class="muted">One panel per layer, every panel on one scale and one key. A panel shows its layer only.</p>`
      +`<div class="map-panels" data-map-panels>`+layers.map((layer,i)=>{const panel=a.panels.find(p=>p.layer===layer);
        return `<div class="map-panel-row"><label><input type="checkbox" data-panel-include="${esc(layer)}" ${panel?'checked':''}> ${esc(layer)}</label>`
          +`<input type="text" maxlength="120" aria-label="Title of the panel for ${esc(layer)}" data-panel-title="${esc(layer)}" value="${esc(panel?.title??'')}" placeholder="${esc(layer)}" ${panel?'':'disabled'}>`
          +(names.includes(layer)?'':' <span class="muted">not drawn in the last run</span>')+`</div>`;void i;}).join('')+`</div>`:'');
}
/** MAP'S SETTINGS, for its configuration dialog (experiments 186): the presentation, where its figure goes in the
 *  write-up, each point layer's class, mark name and symbol, and the standalone figure. Built from a draft, so the same
 *  markup serves the dialog's every redraw and nothing reaches the step before Apply. */
function mapSettings(n:WorkflowNode<'map_output'>):string{return groupSections('Presentation',mapSettingsFlat(n));}
function mapSettingsFlat(n:WorkflowNode<'map_output'>):string{
  const at=figureSection(n.params,n.type),fallback=DEFAULT_FIGURE_SECTIONS[n.type];
  return ''
    +`<div class="field"><label class="field-label" for="polygon-presentation">Presentation</label><select id="polygon-presentation" data-catchment-param="presentation"><option value="plot" ${n.params.presentation!=='interactive'?'selected':''}>Static plot (SVG)</option><option value="interactive" ${n.params.presentation==='interactive'?'selected':''}>Interactive map</option></select></div>`
    +ctx.writeUpSelect(n)
    // Shown when decisions are wired, as before: a reasoning result reads as a map, a table or
      // a chart, and this switches which. It used to be gated on the map being in decisions MODE.
      // A SYMBOL PER LAYER, chosen or left to the default. The practitioner, 2026-10-20: "So each
      // potential point layer in the map gets a configurable/selectable symbol." Only the point
      // layers actually wired are offered, because a control for a layer that does not exist is
      // a setting nobody can check against the picture.
      +mapBasemapControls(n)+mapStudyAreasSection(n)+mapArrangeSection(n)+mapRasterSection(n)+(n.params.arrangement?'':mapInsetSection(n))+`<span class="inspector-section">Layers</span>`
      +`<p class="muted">Order, name and group the layers.</p>`
      +`<button class="button" data-manage-layers="${esc(n.id)}">Manage layers</button>`
      +(()=>{
        const sources=ctx.workflow().edges.filter(edge=>edge.to===n.id&&isPointPort(edge.port))
          .map(edge=>ctx.workflow().nodes.find(node=>node.id===edge.from)).filter(Boolean) as WorkflowNode[];
        if(!sources.length)return '';
        // THE PIN CLASS, per layer. The practitioner, 2026-10-29: *"I should be able to name pins
        // to classes ... So the pins get classified when they get onto the map."* The attribute is
        // nominated, never guessed from a property name -- the same rule the polygon layer's
        // naming property follows -- so the offer is the keys the records actually carry.
        const classPicker=sources.map(source=>{
          // A RULES STEP stores no points: it hands on the points it read, with what its rules concluded. Both are offered,
          // so a map can be coloured by a rule's category (2026-11-08, the rules worked example's clinics).
          const read=source.type==='apply_ruleset'
            ?ctx.workflow().nodes.find(m=>m.id===ctx.workflow().edges.find(e=>e.to===source.id)?.from):source;
          const records=(read?.params as {data?:{features?:{properties?:Record<string,unknown>}[]}}|undefined)
            ?.data?.features??[];
          // WHAT THE STEP GAVE OUT AT THE LAST RUN, where it computes its points (experiment 192): Find health facilities
          // from a list keeps a register in its params, and the facilities it matched carry other columns.
          const ran=ctx.result()?.pointColumns?.[source.id]?.map(c=>c.attribute)??[];
          const kept=ran.length&&!['point_input','places','centers'].includes(source.type)?[]:records.flatMap(f=>Object.keys(f.properties??{}));
          const keys=[...new Set([...kept,...ran,...ctx.ruleCategories(source)])]
            .filter(key=>!['name','capturedAt'].includes(key)).sort();
          if(!keys.length)return '';
          const chosen=n.params.pinClassField?.[source.id]||'';
          return `<div class="field"><label class="field-label" for="pin-class-${esc(source.id)}">`
            +`Pin class for ${esc(source.params.label||TYPES[source.type].title)}</label>`
            +`<select id="pin-class-${esc(source.id)}" data-pin-class="${esc(source.id)}">`
            +`<option value="">Not classed \u00b7 one mark for the layer</option>`
            +keys.map(key=>`<option value="${esc(key)}" ${chosen===key?'selected':''}>`
              +`${esc(key)}</option>`).join('')
            +`</select></div>`;
        }).join('');
        // WHICH PROPERTY NAMES EACH MARK. Offered per layer beside the pin class, because it is
        // the same kind of decision: a property the practitioner nominates, never one inferred
        // from being called `name`. A layer with more drawn marks than the ceiling says so here
        // rather than being silently left unnamed on the figure.
        const labelPicker=sources.map(source=>{
          const records=(source.params as {data?:{features?:{properties?:Record<string,unknown>}[]}}).data?.features||[];
          const keys=[...new Set(records.flatMap(f=>Object.keys(f.properties??{})))].sort();
          if(!keys.length)return '';
          const chosen=n.params.labelField?.[source.id]||'';
          const over=records.length>LABEL_CEILING;
          return `<div class="field"><label class="field-label" for="mark-label-${esc(source.id)}">`
            +`Name each mark of ${esc((source.params as {label?:string}).label||TYPES[source.type].title)}</label>`
            +`<select id="mark-label-${esc(source.id)}" data-mark-label="${esc(source.id)}">`
            +`<option value="">Not named \u00b7 the key says which layer</option>`
            +keys.map(key=>`<option value="${esc(key)}" ${chosen===key?'selected':''}>`
              +`${esc(key)}</option>`).join('')
            +`</select>`
            +(over?`<p class="muted">${records.length.toLocaleString()} records, over the `
              +`${LABEL_CEILING} a figure can name legibly \u2014 this layer is drawn unnamed `
              +`whatever is chosen here.</p>`:'')
            +`</div>`;
        }).join('');
        const named=labelPicker
          ?`<span class="inspector-section">Mark names</span>`
            +`<p class="muted">The property that prints beside each mark on the figure. Nominated `
            +`rather than guessed, and left off by default: a key naming the layer is enough for `
            +`most maps, and a handful of named marks is what a publication figure wants.</p>`
            +labelPicker
          :'';
        const classed=classPicker
          ?`<span class="inspector-section">Pin class</span>`
            +`<p class="muted">What each record IS, drawn with a mark of its own and named in the `
            +`key. A layer is where records came from; a class is what they are.</p>`+classPicker
          :'';

        // A LINE TO THE RECORD EACH ONE NAMES (experiment 200, step 4): two columns per layer, both nominated. The
        // first holds the named record's id; the second is the column that id is found in. Neither is guessed.
        const linkPicker=sources.map(source=>{
          const records=(source.params as {data?:{features?:{properties?:Record<string,unknown>}[]}}).data?.features||[];
          const ran=ctx.result()?.pointColumns?.[source.id]?.map(c=>c.attribute)??[];
          const keys=[...new Set([...records.flatMap(f=>Object.keys(f.properties??{})),...ran])].sort();
          if(!keys.length)return '';
          const held=n.params.linkField?.[source.id],name=esc(source.params.label||TYPES[source.type].title);
          const select=(id:string,data:string,value:string,none:string)=>`<select id="${id}-${esc(source.id)}" ${data}="${esc(source.id)}">`
            +`<option value="">${none}</option>`+keys.map(key=>`<option value="${esc(key)}" ${value===key?'selected':''}>${esc(key)}</option>`).join('')+`</select>`;
          return `<div class="field"><label class="field-label" for="link-column-${esc(source.id)}">Line to the record named in, for ${name}</label>`
            +select('link-column','data-link-column',held?.column||'','No lines')
            +`<label class="field-label" for="link-matches-${esc(source.id)}">Found by</label>`
            +select('link-matches','data-link-matches',held?.matches||'','Choose the column holding each record’s id')
            +(held?.column&&!held.matches?`<p class="muted">Choose the column the ids in ${esc(held.column)} are found in. Until then, Run says so.</p>`:'')
            +`</div>`;
        }).join('');
        const linked=linkPicker
          ?`<span class="inspector-section">Lines between records</span>`
            +``+linkPicker
          :'';
        const chosen=n.params.layerSymbols||{};
        return classed+named+linked+`<span class="inspector-section">Layer symbols</span>`

          +sources.map((source,index)=>{
            const held=chosen[source.id],resolved=resolveLayerSymbol(index,held);
            // THE COLOUR (the practitioner, 2026-11-11: cases on a black-and-white sheet "should be colored differently").
            // A colour held that is not one of the six, set by an example, stays offered as it is rather than lost.
            const held_colour=held?.colour,named=FIGURE_PALETTE.findIndex(c=>c.toLowerCase()===held_colour?.toLowerCase());
            const colourName=(c:string)=>{const i=FIGURE_PALETTE.findIndex(x=>x.toLowerCase()===c.toLowerCase());return i<0?c:LAYER_COLOUR_NAMES[i]!;};
            return `<div class="field"><span class="field-label">${esc(source.params.label||TYPES[source.type].title)}</span>`
              +`<label class="field-label" for="layer-colour-${esc(source.id)}">Colour</label>`
              +`<select id="layer-colour-${esc(source.id)}" data-layer-colour="${esc(source.id)}">`
              +`<option value="">Default \u00b7 ${esc(colourName(layerDefaultColour(index)))}</option>`
              +FIGURE_PALETTE.map((c,i)=>`<option value="${c}" ${named===i?'selected':''}>${LAYER_COLOUR_NAMES[i]}</option>`).join('')
              +(held_colour&&named<0?`<option value="${esc(held_colour)}" selected>as set, ${esc(held_colour)}</option>`:'')
              +`</select>`
              +`<label class="field-label" for="layer-mark-${esc(source.id)}">Mark</label>`
              +`<select id="layer-mark-${esc(source.id)}" data-layer-mark="${esc(source.id)}">`
              +`<option value="">Default \u00b7 ${esc(resolved.shape)}</option>`
              +LAYER_SHAPES.map(shape=>`<option value="${shape}" ${held?.mark===shape?'selected':''}>${shape}</option>`).join('')
              +`</select>`
              // SIZE BESIDE THE MARK IT SIZES. Density is a property of the data: eight pumps
              // across a borough want a mark a reader can find, and 250 addresses in four streets
              // want one small enough to leave gaps between them. One default cannot serve both,
              // and this figure holds both.
              +`<label class="field-label" for="layer-size-${esc(source.id)}">Mark radius</label>`
              +`<input id="layer-size-${esc(source.id)}" data-layer-size="${esc(source.id)}" type="range"`
              +` min="${MARK_RADIUS_MIN}" max="${MARK_RADIUS_MAX}" step="0.5" value="${resolved.size}">`
              +`<small>${resolved.size} units${held?.size===undefined?' (default)':''}. Smaller separates dense points; larger finds sparse ones.</small>`
              // PROPORTIONAL SYMBOLS (experiment 210): an attribute that is a number on most of the layer's records may set
              // each mark's area. Offered only where the layer's records are held here, as Point data's are.
              +(()=>{
                // A LAYER MADE AT RUN TIME, as Point data from a table is, has its records in the map's last run, not in its
                // step (2026-11-12, MERS's hospitals sized by their cases).
                const held_features=(source.params as {data?:{features?:{properties?:Record<string,unknown>}[]}}).data?.features??[];
                const features=held_features.length?held_features
                  :((ctx.result()?.outputs.find(o=>o.nodeId===n.id) as {rows?:{sourceNodeId?:string|null;attributes?:Record<string,unknown>}[]}|undefined)?.rows??[])
                    .filter(r=>r.sourceNodeId===source.id).map(r=>({properties:r.attributes}));
                const keys=[...new Set(features.flatMap(f=>Object.keys(f.properties??{})))]
                  .filter(k=>features.filter(f=>Number.isFinite(Number(f.properties?.[k]))&&f.properties?.[k]!==''&&f.properties?.[k]!==null).length>=features.length*0.9&&!/^(id|fid|lat|lon|lng|latitude|longitude|x|y)$/i.test(k));
                if(!keys.length)return '';
                return `<label class="field-label" for="layer-size-by-${esc(source.id)}">Size by</label>`
                  +`<select id="layer-size-by-${esc(source.id)}" data-layer-size-by="${esc(source.id)}"><option value="">Same size for every mark</option>`
                  +keys.map(k=>`<option value="${esc(k)}" ${held?.sizeBy===k?'selected':''}>${esc(k)}, the area of each mark in proportion</option>`).join('')
                  +`</select><small>The largest value takes three times the radius above; a mark's area is its share of that.</small>`
                  +`<label class="field-label" for="layer-colour-by-${esc(source.id)}">Colour by</label>`
                  +`<select id="layer-colour-by-${esc(source.id)}" data-layer-colour-by="${esc(source.id)}"><option value="">One colour for every mark</option>`
                  +keys.map(k=>`<option value="${esc(k)}" ${held?.colourBy===k?'selected':''}>${esc(k)}, in five classes from light to dark</option>`).join('')
                  +`</select><small>Every mark one size, so none hides another; the key gives each class's range. Replaces Size by.</small>`;
              })()
              +`</div>`;
          }).join('');
      })()
    +mapTextControls(n);
}
/** THE INSPECTOR'S ONE SENTENCE for Map (experiment 186). */
function mapSentence(n:WorkflowNode<'map_output'>):string{
  const layers=ctx.workflow().edges.filter(e=>e.to===n.id).map(e=>ctx.workflow().nodes.find(x=>x.id===e.from)).filter(Boolean)
    .map(x=>x!.params.label||TYPES[x!.type].title);
  const classed=Object.keys(n.params.pinClassField??{}).length;
  const drawn=ctx.result()?.outputs.find(o=>o.nodeId===n.id)?.polygons;
  const tabled=drawn&&!n.params.arrangement?partsTable(drawn.features as never):null;
  return layers.length
    ?`Draws ${layers.join(', ')} as ${n.params.presentation==='interactive'?'an interactive map':'a static figure'}`
      +`${basemapOf(n.params.basemap)!=='none'?`, over ${BASEMAP_OPTIONS.find(o=>o.value===basemapOf(n.params.basemap))?.label??basemapOf(n.params.basemap)}`:''}`
      +`${classed?`, ${classed} layer${classed===1?'':'s'} classed`:''}`
      +`${Object.entries(n.params.linkField??{}).map(([,l])=>`, with a line to each record named in ${l.column}`).join('')}`
      +`${tabled?`, with a table of the ${tabled.rows.length.toLocaleString('en')} places' attributes under it in Results`:''}; in the write-up under ${figureSection(n.params,n.type)}.`
    :'Draws what it is given: connect a layer under Inputs.';
}

/** MAP'S STANDARD INSPECTOR (experiment 186). */
export const mapInspector={
  markup(n:WorkflowNode<'map_output'>,kit:MapKit):string{
    ctx=kit;
    // THE STANDARD INSPECTOR (experiment 186): the name, which is the Results tab's; the layers it is given, as its own
    // input lists; one sentence and Configure…, where its symbols, classes, presentation and figure are set; and what the
    // last run drew. A map was touched for Sierra Leone (0.65.0): touched widgets move to the standard, always.
    const wiredPorts=nodeInputs(n).filter(([port])=>ctx.workflow().edges.some(e=>e.to===n.id&&e.port===port));
    let content='';
    let inputs=`<span class="inspector-section">Layers</span>`
      +`<p class="description">Connect what you want drawn. ${wiredPorts.length?`${wiredPorts.length} layer source${wiredPorts.length===1?'':'s'} connected; the map draws what it is given, ground first.`:'Nothing is connected yet, so this map has nothing to draw.'}</p>`
      // One picker per layer the map draws, and one more to add another -- rather than a control
      // for every port the contract declares. The practitioner's direction, 2026-10-15.
      +nodeInputs(n).map(([port,type])=>{
        if(!ctx.workflow().edges.some(e=>e.to===n.id&&e.port===port))return '';
        const sources=ctx.workflow().nodes.filter(x=>x.id!==n.id&&outputOf(x)===type);
        // NAMED AS THE CANVAS NAMES THEM (2026-11-13): "polygons_2" was shown as it is stored.
        const several=(kind:string)=>nodeInputs(n).filter(([p])=>new RegExp(`^${kind}(_\\d+)?$`).test(p)).length>1;
        const number=port.includes('_')?port.split('_')[1]:'1';
        const named=port==='area'?'Study area':port==='ground'?'Ground (map image)':/^raster/.test(port)?(several('raster')?`Raster ${number}`:'Raster'):port==='network'?'Street network'
          :port==='context'?'Context points':/^polygons/.test(port)?(several('polygons')?`Areas ${number}`:'Areas')
          :/^points/.test(port)?(several('points')?`Points ${number}`:'Points'):port;
        return `<div class="field"><label class="field-label" for="map-${port}">${esc(named)}</label>`
          +`<select id="map-${port}" data-map-port="${port}"><option value="">Not connected</option>`
          +sources.map(x=>`<option value="${esc(x.id)}" ${ctx.workflow().edges.some(e=>e.to===n.id&&e.port===port&&e.from===x.id)?'selected':''}>${esc(x.params.label||TYPES[x.type].title)}</option>`).join('')
          +`</select></div>`;
      }).join('')
      +(()=>{
        // The configurable one. It lists every result on the canvas this map could draw, whatever
        // type it is, and binds to the right port when chosen -- the Inspector half of the one
        // port on the node.
        const drawable=new Set(nodeInputs(n).map(([,type])=>type));
        const candidates=ctx.workflow().nodes.filter(x=>x.id!==n.id&&drawable.has(outputOf(x) as never));
        if(!candidates.length)return '';
        return `<div class="field"><label class="field-label" for="map-add-layer">Add a layer</label>`
          +`<select id="map-add-layer"><option value="">Choose a result to draw…</option>`
          +candidates.map(x=>`<option value="${esc(x.id)}">${esc(x.params.label||TYPES[x.type].title)} · ${esc(String(outputOf(x)))}</option>`).join('')
          +`</select><small>Any result this map can draw. The layer is connected to the port its type belongs to; a second point layer gets a slot of its own.</small></div>`;
      })();
    inputs+=`<div class="inspector-actions"><button id="add-point-input" class="button small" ${(n.params.pointInputCount??1)>=MAX_POINT_LAYERS?'disabled':''}>＋ Add point input</button><button id="remove-point-input" class="button small" ${(n.params.pointInputCount??1)<=1?'disabled':''}>Remove last input</button></div><p class="muted">One study boundary, and up to ${MAX_POINT_LAYERS} point layers. Each added port needs a source.</p>`;
    content+=ctx.section('Name',`<div class="field"><label class="field-label" for="map-label">Results tab name</label><input id="map-label" maxlength="60" value="${esc(n.params.label)}"></div>`);
    content+=ctx.section('Inputs',inputs);
    content+=ctx.section('Settings',`<p class="standard-sentence">${esc(mapSentence(n))}</p>`
      +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure\u2026</button>'
      +`<button class="button" data-manage-layers="${esc(n.id)}">Manage layers\u2026</button></div>`);
    const drawn=ctx.result()?.outputs.find(o=>o.nodeId===n.id);
    const why=ctx.result()?.unfinished?.find(u=>u.nodeId===n.id)?.message;
    content+=ctx.section('Result',`<p class="standard-result${why?' standard-result-warning':''}">${esc(why?`The last run could not compute this step: ${why}`
      :drawn?`Drawn in Results, under "${n.params.label||'Map'}".`:'Not run yet.')}</p>`);
    return content;
  },
  wire(n:WorkflowNode<'map_output'>,kit:MapKit,root:ParentNode):void{
    ctx=kit;
    root.querySelector('#configure-step')?.addEventListener('click',()=>{ctx=kit;openMapConfig(n.id);});
    root.querySelector<HTMLSelectElement>('#map-add-layer')?.addEventListener('change',e=>{
      const chosen=(e.currentTarget as HTMLSelectElement).value;
      if(chosen)ctx.change(w=>ctx.connect(w,chosen,n.id,'layer'));
    });
  },
};
