import type {NodeType} from './types.js';

/** A PORT'S NAME, the same on the canvas and in the Inspector (2026-11-12, the practitioner: "Chart ports need to be
 *  standardized": the node read Series, Records, Catchment polygons and the Inspector Case series, Table, Polygon summaries). */
export const PORT_NAMES:Partial<Record<NodeType,Record<string,string>>>={
  chart_output:{records:'Table',polygons:'Polygon summaries'},
};
