import type {NodeType} from './types.js';

/** A PORT'S NAME, the same on the canvas and in the Inspector (2026-11-12, the practitioner: "Chart ports need to be
 *  standardized": the node read Series, Records, Catchment polygons and the Inspector Case series, Table, Polygon summaries). */
export const PORT_NAMES:Partial<Record<NodeType,Record<string,string>>>={
  chart_output:{records:'Table',polygons:'Polygon summaries'},
  // 2026-11-13, the practitioner: "the port for that widget needs to be standardized" -- the Inspector read Points to read
  // at and Raster to read where the node read Points and Raster.
  sample_raster:{points:'Points',areas:'Areas',area:'Study area',raster:'Raster',files:'Satellite files',read:'Raster',at:'Read at'},
};
/** PORTS SHOWN AS ONE (2026-11-13, the practitioner: "Raster still shows multiple input ports"). Sample a raster reads one
 *  raster or set of satellite files at one kind of place, so the canvas and the Inspector show two: what it reads, and
 *  where. Each takes whichever kind is connected and is named for it; the five ports underneath are unchanged, so saved
 *  workflows, receipts and port contracts are as they were. */
export const PORT_GROUPS:Partial<Record<NodeType,Record<string,readonly string[]>>>={
  sample_raster:{read:['raster','files'],at:['points','areas','area']},
};
/** The group a port is shown in, or the port itself. */
export const shownPort=(type:NodeType,port:string):string=>
  Object.entries(PORT_GROUPS[type]??{}).find(([,ports])=>ports.includes(port))?.[0]??port;
