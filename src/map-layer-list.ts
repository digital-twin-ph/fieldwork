import type {WorkflowNode} from './types.js';
import {pointPort} from './point-layers.js';

/** THE LAYERS A MAP DRAWS, as a list the practitioner owns.
 *
 *  The distinction is the practitioner's, 2026-10-14: *"Ports receive or transmit; layers are
 *  displayed"*, and they do not correspond one to one. The shipped isochrone map has two ports
 *  and four layers -- a boundary, four time bands, 250 death locations and eight pumps -- because
 *  `summarize_points_to_polygon` keeps the points it counted on the value it returns. So a layer
 *  has an origin: a port it arrived at (`fw:layerPort`) or another layer's value it arrived
 *  inside (`fw:layerWithin`). A basemap's third origin, `fw:layerTileProvider`, is declared here
 *  and not yet produced by anything.
 *
 *  A kind decides HOW a layer is drawn, never WHETHER it may be there. That is the whole
 *  correction this module exists to make. Five times a renderer chosen from the wired ports threw
 *  the other layers away before anything drew them -- the study area on 2026-10-20, the
 *  facilities on 2026-10-22, the raster on 2026-10-23, the polygons on 2026-10-28 -- each patched
 *  one layer at a time, and `core.ts` records the verdict on that method: *"a layer is carried
 *  where somebody remembered to carry it."* A list every renderer reads is the alternative to
 *  remembering.
 *
 *  The practitioner, 2026-10-29: *"Map output should have a dialog modal for layer management
 *  (ordering, labeling, grouping). It should honor all the mappable inputs, refusing only when
 *  there are rule violations."* Three of the four bullets under "What is not built" in
 *  `docs/widget-specs/map_output.md` said the same thing first. */

export type LayerKind='AreaLayer'|'PointsLayer'|'PolygonsLayer'|'RasterLayer'|'NetworkLayer'|'BasemapLayer';
export type LayerOrigin='port'|'within'|'tileProvider';

/** What a practitioner decided about one layer, named for the terms that already describe it:
 *  `fw:layerLabel`, `fw:layerIndex`, `fw:layerDrawn` and `fw:layerGroup`. Absent fields mean "as
 *  it comes": a map nobody has opened the dialog on keeps the defaults below, and a layer wired
 *  afterwards arrives with its own default rather than at the bottom of somebody's old list.
 *
 *  These were `order`, `hidden` and a free-text `group` for one day. The practitioner,
 *  2026-10-29: *"Let's stop the backward direction. Let's begin with the ontology representation
 *  in mind so the exhaust becomes more logical and can be queried after render."* Experiment 148
 *  records what that day cost: a model written in TypeScript whose `order` was `fw:layerIndex`
 *  and whose `label` was `fw:layerLabel`, both already declared, because the declaration was not
 *  where anyone looked. */
export interface LayerSetting{label?:string;index?:number;drawn?:boolean;group?:string}

/** A GROUP IS DECLARED, THEN JOINED. *"Groupings can be declared, and then existing artifacts
 *  added to it."* So it is an entity with an identity -- `fw:LayerGroup` -- and not a string
 *  repeated on each member, where two layers belong together only by being spelled identically
 *  and renaming the group means editing every member.
 *
 *  A group is drawn as a block: its members keep their order within it and the block takes
 *  `fw:groupIndex` in the stack. Without that a group would be a label that changes nothing
 *  about the picture. */
export interface LayerGroupDeclaration{id:string;label:string;index:number}

export interface MapLayer{
  /** Stable across runs, because the settings are keyed by it: the port for a port layer, and
   *  the containing port plus the member's own name for one that arrived inside a value. */
  id:string;
  kind:LayerKind;origin:LayerOrigin;port:string;sourceNodeId?:string;within?:string;
  label:string;index:number;
  /** `fw:layerDrawn`. A layer switched off is still connected and still described; it was simply
   *  not drawn, and a receipt that says so can tell a map that showed three of five layers from
   *  one that was only ever wired to three. */
  drawn:boolean;
  group?:LayerGroupDeclaration;
  /** How many features the layer holds, where that is known. A value-classed layer's parts are
   *  ONE layer -- 33 sub-districts shaded by a rate are not 33 things to switch on and off -- so
   *  this is a count to show, never a reason to split. */
  parts?:number;
}

export const LAYER_LABEL_LIMIT=60;
export const MAX_MANAGED_LAYERS=24;

/** THE DEFAULT STACK, bottom first, and the reason for each position rather than the order the
 *  ports happen to be declared in -- which is what decided draw order until now, and is why a
 *  raster could land on top of the points it was ground for.
 *
 *  Ground first because a raster and a basemap are what the rest sits on. The area next, as the
 *  frame. Polygons over it, since a catchment or a rate band is read against the frame. The
 *  network over those, because streets are a reference you look through. Points last, on top:
 *  they are usually the subject, and a subject buried under a fill is a map that answers nothing.
 *  `catchmentPlot` draws the computation's inputs at radius 3.5 and the observations at 2.7, so
 *  the subject was already being drawn smaller than its context; it does not also need to be
 *  drawn under it. */
const KIND_DEPTH:Record<LayerKind,number>={BasemapLayer:0,RasterLayer:1,AreaLayer:2,PolygonsLayer:3,NetworkLayer:4,PointsLayer:5};

const KIND_BY_PORT=(port:string):LayerKind|null=>
  port==='area'?'AreaLayer'
  :port==='polygons'?'PolygonsLayer'
  :port==='raster'||port==='ground'?'RasterLayer'
  :port==='network'?'NetworkLayer'
  :port==='points'||/^points_[2-8]$/.test(port)||port==='context'||port==='decisions'?'PointsLayer'
  :null;

/** The ports a map can draw, as kinds. `coverage` is a review rather than a layer and is absent
 *  on purpose: it changes what the rows SAY, not what is drawn. */
export const drawablePort=(port:string):boolean=>KIND_BY_PORT(port)!==null;

export const layerKindTerm=(kind:LayerKind)=>`fw:${kind}`;
export const layerOriginPredicate=(origin:LayerOrigin)=>
  origin==='port'?'fw:layerPort':origin==='within'?'fw:layerWithin':'fw:layerTileProvider';

/** A name a reader can tell layers apart by, which is not the same as an identifier. The source
 *  node's own label is the best of these, because it is the words the practitioner already chose
 *  on the canvas; the port is the fallback, and the id is the last resort. */
const PORT_LABEL:Record<string,string>={area:'Study area',polygons:'Polygons',raster:'Raster',
  ground:'Ground',network:'Street network',context:'Context points',decisions:'Review decisions'};
const defaultLabel=(port:string,sourceLabel?:string):string=>{
  const given=sourceLabel?.trim();
  if(given)return given.slice(0,LAYER_LABEL_LIMIT);
  if(PORT_LABEL[port])return PORT_LABEL[port];
  const index=port==='points'?1:Number(port.replace('points_',''));
  return Number.isFinite(index)?`Points ${index}`:port;
};

/** Members a value carries inside it, so they can be listed, ordered and named individually.
 *
 *  `stack_polygons` concatenated several layers into one unnamed feature list, which is why two
 *  water layers wired to one map could not be told apart on 2026-10-28: by the time the map saw
 *  them they were not two layers. The members are read from the features' own `layerName`, so a
 *  collection that recorded where its parts came from expands here and one that did not stays a
 *  single layer rather than being guessed at. */
export interface WithinSource{port:string;members:{name:string;parts:number}[]}

export function membersOfPolygons(polygons:unknown):{name:string;parts:number}[]{
  const features=(polygons as {features?:{layerName?:string}[]})?.features;
  if(!Array.isArray(features)||!features.length)return [];
  const counts=new Map<string,number>();
  for(const feature of features){
    const name=typeof feature.layerName==='string'&&feature.layerName.trim()?feature.layerName.trim():'';
    if(!name)return [];      // One unattributed feature and the collection is one layer, honestly.
    counts.set(name,(counts.get(name)||0)+1);
  }
  return counts.size>1?[...counts].map(([name,parts])=>({name,parts})):[];
}

/** THE LIST ITSELF: every drawable port that is wired, every member inside those values, each
 *  carrying what the practitioner decided about it, ordered bottom to top.
 *
 *  Nothing is dropped for being the wrong kind. A map with a raster, an area, two point layers
 *  and a collection of polygons has six layers here, and the renderer's job is to draw them in
 *  this order -- not to pick one and discard five. */
export function mapLayerList(node:WorkflowNode<'map_output'>,
  edges:readonly {to:string;from:string;port:string}[],
  sourceLabel:(nodeId:string)=>string|undefined,
  within:readonly WithinSource[]=[]):MapLayer[]{
  const settings=node.params.layers||{},groups=node.params.layerGroups||[];
  const wired=edges.filter(e=>e.to===node.id&&drawablePort(e.port));
  const layers:MapLayer[]=[];
  for(const edge of wired){
    const kind=KIND_BY_PORT(edge.port)!;
    const members=within.find(w=>w.port===edge.port)?.members||[];
    if(members.length){
      // The containing port contributes no layer of its own: it is the box, and the layers are
      // what is in it. Listing both would offer a toggle that cannot mean anything.
      for(const member of members){
        const id=`${edge.port}/${member.name}`;
        layers.push({id,kind,origin:'within',port:edge.port,sourceNodeId:edge.from,within:edge.port,
          parts:member.parts,...resolved(settings[id],member.name,kind,groups)});
      }
      continue;
    }
    layers.push({id:edge.port,kind,origin:'port',port:edge.port,sourceNodeId:edge.from,
      ...resolved(settings[edge.port],defaultLabel(edge.port,sourceLabel(edge.from)),kind,groups)});
  }
  // A GROUP IS DRAWN AS A BLOCK. Its members sort by their own index within it, and the block
  // sorts by `fw:groupIndex` among the ungrouped layers -- so moving a group moves everything in
  // it, which is the point of having declared one. An ungrouped layer sorts on its own index.
  const blockIndex=(layer:MapLayer)=>layer.group?layer.group.index:layer.index;
  return layers
    .sort((a,b)=>blockIndex(a)-blockIndex(b)
      ||(a.group?.id===b.group?.id?0:(a.group?.id||'').localeCompare(b.group?.id||''))
      ||a.index-b.index||KIND_DEPTH[a.kind]-KIND_DEPTH[b.kind]||a.id.localeCompare(b.id))
    .map((layer,index)=>({...layer,index}));
}

const resolved=(setting:LayerSetting|undefined,fallbackLabel:string,kind:LayerKind,
  groups:readonly LayerGroupDeclaration[])=>{
  const group=setting?.group?groups.find(g=>g.id===setting.group):undefined;
  return {
    label:setting?.label?.trim()||fallbackLabel,
    index:typeof setting?.index==='number'&&Number.isFinite(setting.index)?setting.index:KIND_DEPTH[kind],
    // Drawn unless it was switched off. The default is yes, because a layer somebody connected is
    // a layer they wanted to see.
    drawn:setting?.drawn!==false,
    ...(group?{group}:{}),
  };
};

/** WHAT A LAYER LIST REFUSES, and nothing else.
 *
 *  The practitioner's instruction was to honour every mappable input and refuse only on a rule
 *  violation. These are rules about the list -- a name a reader cannot use, an order that is not
 *  a position, more layers than a key can distinguish, a map with everything switched off -- and
 *  not about kinds. No combination of kinds is refused here, because a kind decides how a layer
 *  is drawn and never whether it may be there. */
export function validateLayerSettings(node:WorkflowNode<'map_output'>):void{
  const groups=node.params.layerGroups||[];
  const seen=new Set<string>();
  for(const group of groups){
    if(typeof group.id!=='string'||!group.id.trim())throw new Error('A layer group needs an identifier.');
    if(seen.has(group.id))throw new Error(`Two layer groups share the identifier "${group.id}", so a layer added to one would belong to both.`);
    seen.add(group.id);
    if(typeof group.label!=='string'||!group.label.trim()||group.label.length>LAYER_LABEL_LIMIT)
      throw new Error(`Name the layer group using 1\u2013${LAYER_LABEL_LIMIT} characters.`);
    if(!Number.isInteger(group.index)||group.index<0||group.index>=MAX_MANAGED_LAYERS)
      throw new Error(`The position for the group "${group.label}" must be a whole number between 0 and ${MAX_MANAGED_LAYERS-1}.`);
  }
  for(const [id,setting] of Object.entries(node.params.layers||{})){
    if(setting.label!==undefined&&(typeof setting.label!=='string'||setting.label.length>LAYER_LABEL_LIMIT))
      throw new Error(`Name the layer "${id}" using at most ${LAYER_LABEL_LIMIT} characters, or leave it as it comes.`);
    if(setting.index!==undefined&&(!Number.isInteger(setting.index)||setting.index<0||setting.index>=MAX_MANAGED_LAYERS))
      throw new Error(`The position for "${id}" must be a whole number between 0 and ${MAX_MANAGED_LAYERS-1}.`);
    if(setting.drawn!==undefined&&typeof setting.drawn!=='boolean')
      throw new Error(`Whether "${id}" is drawn is yes or no.`);
    // A layer added to a group nobody declared is the failure a declared group exists to prevent,
    // so it is said here rather than silently ignored at the point of drawing.
    if(setting.group!==undefined&&!seen.has(setting.group))
      throw new Error(`"${id}" was added to a layer group that is not declared on this map. Declare the group first, then add layers to it.`);
  }
}

/** A map whose every layer is switched off is a blank picture with a legend. Said here, once,
 *  rather than drawn and left for the practitioner to wonder about. */
export function assertSomethingToDraw(layers:readonly MapLayer[],label:string):void{
  if(layers.length&&layers.every(l=>!l.drawn))
    throw new Error(`Every layer on "${label}" is switched off, so there is nothing to draw. Switch one back on in Manage layers.`);
  if(layers.length>MAX_MANAGED_LAYERS)
    throw new Error(`"${label}" has ${layers.length} layers and a reader can tell at most ${MAX_MANAGED_LAYERS} apart in one key. Split this into two maps.`);
}

export const visibleLayers=(layers:readonly MapLayer[])=>layers.filter(l=>l.drawn);
export const layerByPort=(layers:readonly MapLayer[],port:string)=>layers.find(l=>l.port===port&&l.origin==='port');
/** Whether a port's layer is drawn. A port with no layer -- nothing wired -- is not hidden; it is
 *  absent, and the caller's own `inputs` check is what answers that. */
export const portIsDrawn=(layers:readonly MapLayer[],port:string)=>
  layers.some(l=>l.port===port&&l.drawn);

/** The groups a practitioner made, in the order their first layer is drawn. A group is a reading
 *  of the map rather than a property of the data -- the same judgement the glossary records as
 *  subject and context -- so an ungrouped layer is not forced into one. */
export function layerGroups(layers:readonly MapLayer[]):{group:LayerGroupDeclaration;layers:MapLayer[]}[]{
  const groups:{group:LayerGroupDeclaration;layers:MapLayer[]}[]=[];
  for(const layer of layers){
    if(!layer.group)continue;
    const found=groups.find(g=>g.group.id===layer.group!.id);
    if(found)found.layers.push(layer);else groups.push({group:layer.group,layers:[layer]});
  }
  return groups;
}
