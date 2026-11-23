import type {NodeType} from './types.js';

/** A PORT'S NAME, the same on the canvas and in the Inspector (2026-11-12, the practitioner: "Chart ports need to be
 *  standardized": the node read Series, Records, Catchment polygons and the Inspector Case series, Table, Polygon summaries). */
export const PORT_NAMES:Partial<Record<NodeType,Record<string,string>>>={
  chart_output:{records:'Table',polygons:'Polygon summaries'},
  // 2026-11-13, the practitioner: "the port for that widget needs to be standardized" -- the Inspector read Points to read
  // at and Raster to read where the node read Points and Raster.
  sample_raster:{points:'Points',areas:'Areas',area:'Study area',raster:'Raster',files:'Satellite files',read:'Raster',at:'Read at'},
  join_table_to_area:{records:'Table',parts:'Study area or polygon layer',area:'Study area',polygons:'Polygon layer'},
  // 2026-11-23: the step took one points port and now buffers points, lines or polygons, so the canvas shows one.
  buffer_point:{around:'Points, lines or polygons',points:'Points',lines:'Lines',polygons:'Polygon layer'},
};
/** PORTS SHOWN AS ONE (2026-11-13, the practitioner: "Raster still shows multiple input ports"). Sample a raster reads one
 *  raster or set of satellite files at one kind of place, so the canvas and the Inspector show two: what it reads, and
 *  where. Each takes whichever kind is connected and is named for it; the five ports underneath are unchanged, so saved
 *  workflows, receipts and port contracts are as they were. */
export const PORT_GROUPS:Partial<Record<NodeType,Record<string,readonly string[]>>>={
  sample_raster:{read:['raster','files'],at:['points','areas','area']},
  // 2026-11-20, the practitioner: "The join a table to study area widget input port does not automatically detect the
  // output port connecting to it." Its three dots took one kind each, unnamed; a drop on the wrong one was refused.
  join_table_to_area:{records:['records'],parts:['area','polygons']},
  buffer_point:{around:['points','lines','polygons']},
};
/** A DROP ON THE WRONG ONE OF A NODE'S GROUPS is bound to the group that takes it, where exactly one does: a table dropped
 *  on Join's "Study area or polygon layer" goes to its Table. */
export function groupFor(type:NodeType,dropped:string,accepts:(port:string)=>boolean):string|undefined{
  const groups=PORT_GROUPS[type];if(!groups)return undefined;
  if(groups[dropped]?.some(accepts))return dropped;
  const taking=Object.entries(groups).filter(([,ports])=>ports.some(accepts)).map(([g])=>g);
  return taking.length===1?taking[0]:undefined;
}
/** The group a port is shown in, or the port itself. */
export const shownPort=(type:NodeType,port:string):string=>
  Object.entries(PORT_GROUPS[type]??{}).find(([,ports])=>ports.includes(port))?.[0]??port;
