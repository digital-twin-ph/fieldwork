/** One widget applying a declared ruleset, where three widgets differed only in which rules they ran.
 *
 *  `policy`, `access_policy` and `xpert` are three arrangements of the same four stages: project
 *  facts from a typed value, bind a parameter, evaluate N3, extract a classification. The rules
 *  became declared data earlier on 2026-10-12; this is the node type that hosts them.
 *
 *  Ports come from the ruleset, pinned into the node, exactly as a `micro_workflow` pins its
 *  composition's — `nodeInputs` and `outputOf` already vary per node, so this reuses the mechanism
 *  compositions established rather than inventing one. That matters because the three had three
 *  different port sets and two different output port types, which is why this looked like a
 *  base-contract change and is not.
 *
 *  **What this merge does and does not do.** It collapses the palette from three entries to one and
 *  the audit surface from three widget contracts to one. It does **not** collapse the three
 *  projections: each ruleset still assembles a different value for whatever consumes it, and that
 *  code is dispatched here by declared data rather than deleted. Saying so matters, because a merge
 *  that claimed to remove code and only moved it would be worse than no merge.
 *
 *  The three projections are called by both paths during migration — the old node types and this
 *  one — so the behaviour can be compared rather than asserted.
 */
import type {WorkflowNode,ParamsByType} from './types.js';
import type {DisplayValue,NearestRow,Receipt,Status} from './results.js';
import type {ReasonerQuad} from './worker-types.js';
import type {PointFeature} from './types.js';
import {resolveRuleset,bindParameters,rulesetCitation} from './rulesets.js';

const NS='urn:fieldwork:';

export interface Distances {rows:NearestRow[]; centers:PointFeature[]; method:string}

/** `outreach-criteria`: a distance against a threshold, gated by a declared external condition.
 *
 *  Lifted unchanged from the `policy` executor. The conflict refusal is the part worth keeping
 *  visible: two rules concluding differently for one subject is an error, not a precedence, and
 *  there is no way to express first-match ordering in a monotonic subset. */
/** `subjectKind` is the IRI segment the reasoner's subjects carry. It was fixed at `place:` while
 *  every ruleset classified places; experiment 113 classifies polygons, and calling a catchment a
 *  place to satisfy a string prefix would put a wrong word in the receipts to save a parameter. */
export function extractDecisions(conclusions:ReasonerQuad[],subjectKind='place'):Map<string,Status>{
  const decisions=new Map<string,Status>();
  for(const quad of conclusions){
    if(quad.predicate!==NS+'decision')continue;
    const id=quad.subject.slice((NS+subjectKind+':').length);
    const decision=quad.object.slice(NS.length);
    if(!['Review','NoFlag','Unknown'].includes(decision))throw new Error('Reasoner returned an unknown decision.');
    if(decisions.has(id)&&decisions.get(id)!==decision)throw new Error('Reasoner returned conflicting decisions.');
    decisions.set(id,decision as Status);
  }
  return decisions;
}

export function outreachProjection(
  distances:Distances,alert:ParamsByType['alert'],threshold:number,conclusions:ReasonerQuad[],
):DisplayValue{
  const {rows,centers,method}=distances;
  const decisions=extractDecisions(conclusions);
  return {rows:rows.map(row=>{
    const status=decisions.get(row.id);
    if(!status)throw new Error(`Reasoner did not classify ${row.name}.`);
    return {...row,status,explanation: status==='Unknown'
      ? (row.reason || 'Heat alert status is missing.')
      : `Nearest center: ${row.center!.name}. Distance ${row.distance!.toFixed(2)} km `
        +`${row.distance!>threshold?'>':'≤'} ${threshold} km. `
        +`Heat alert ${alert.active?'active':'inactive'} on ${alert.date}.`};
  }),centers,method,threshold,alert} as unknown as DisplayValue;
}

/** Which parameter of the old node supplied which declared parameter of the ruleset.
 *
 *  `thresholdKm` and `thresholdMin` were the same kind of thing in different units, with the unit
 *  buried in the name. The ruleset declares one parameter with its unit attached, and this is the
 *  mapping a migrated node needs. */
export function parametersFor(rulesetId:string,version:string,params:Record<string,unknown>):Record<string,number>{
  const ruleset=resolveRuleset(rulesetId,version);
  const from=(ruleset.inputContract as {parameterFrom?:Record<string,string>}).parameterFrom??{};
  const bound:Record<string,number>={};
  for(const parameter of ruleset.parameters){
    const key=from[parameter.name];
    const value=key!==undefined?params[key]:undefined;
    if(typeof value==='number')bound[parameter.name]=value;
    else if(parameter.default!==undefined)bound[parameter.name]=parameter.default;
    else throw new Error(`${ruleset.title} needs ${parameter.name} and the node supplies none.`);
  }
  return bound;
}

/** The node type each ruleset was extracted from, which is what a saved workflow migrates from. */
export const RULESET_FOR_NODE_TYPE:Record<string,{id:string; version:string}>={
  policy:{id:'urn:fieldwork:ruleset:outreach-criteria',version:'1.0.0'},
  access_policy:{id:'urn:fieldwork:ruleset:access-review',version:'1.0.0'},
  xpert:{id:'urn:fieldwork:ruleset:nb06-evidence',version:'1.0.0'},
};

/** The pinned ruleset contract a migrated or newly added node carries. */
export function pinnedRuleset(rulesetId:string,version:string):ParamsByType['apply_ruleset']['ruleset']{
  const ruleset=resolveRuleset(rulesetId,version);
  const ports=(ruleset.inputContract as {ports:{inputs:[string,string][]; output:string}}).ports;
  return {id:ruleset.id,version:ruleset.version,title:ruleset.title,
    inputs:structuredClone(ports.inputs) as ParamsByType['apply_ruleset']['ruleset']['inputs'],
    output:ports.output as ParamsByType['apply_ruleset']['ruleset']['output']};
}

export function projectionOf(rulesetId:string,version:string):string{
  return (resolveRuleset(rulesetId,version).inputContract as {projection:string}).projection;
}

export type RuleApplicationResult={value:DisplayValue; receipt:Receipt};

/** Facts for a rule over an area DERIVED from geometry, read from the record rather than recomputed.
 *
 *  `areaSquareMetres` is attached by the widget that projected to get it (experiment 113). A widget
 *  that worked in degrees attaches nothing, and absent becomes `fw:areaKnown false` rather than a
 *  zero: a polygon whose area nobody measured is not a polygon of no area. */
export function extentN3(polygons:{features:{id:string;name:string;areaSquareMetres?:number}[]},threshold:number){
  if(!Number.isFinite(threshold)||threshold<0)throw new Error('State a review threshold in square metres, zero or greater.');
  if(!polygons?.features?.length)throw new Error('Connect polygons to review. There is nothing to classify.');
  const prefix='@prefix fw: <urn:fieldwork:>.\n@prefix math: <http://www.w3.org/2000/10/swap/math#>.\n';
  const facts=polygons.features.map(f=>{
    const known=typeof f.areaSquareMetres==='number'&&Number.isFinite(f.areaSquareMetres);
    return `<urn:fieldwork:polygon:${encodeURIComponent(f.id)}> fw:areaKnown ${known}.`
      +(known?`\n<urn:fieldwork:polygon:${encodeURIComponent(f.id)}> fw:areaSquareMetres ${f.areaSquareMetres!.toFixed(2)}.`:'');
  }).join('\n');
  const ruleset=resolveRuleset('urn:fieldwork:ruleset:extent-review','1.0.0');
  const rules=bindParameters(ruleset,{threshold:Number(threshold.toFixed(2))});
  return {facts:prefix+facts+'\n',rules:prefix+rules,input:prefix+facts+'\n\n'+rules,ruleset:rulesetCitation(ruleset)};
}

/** The classification, assembled onto the polygons it is about -- which from `extent-review`
 *  1.1.0 it actually is.
 *
 *  Until 2026-10-14 this returned rows: id, name, status, area and a sentence, with the geometry
 *  dropped. A decision about a shape could then be listed and never drawn, while a ruleset over
 *  points returned its subject whole and could be mapped. The ruleset's declared output port is
 *  `polygons` now, and each feature carries its own `status` and `explanation`, so the judgement
 *  travels with the thing judged. The rows stay on the value for the table that reads them, which
 *  is why nothing downstream of the old port type had to change. Experiment 113. */
export function extentProjection(polygons:{features:{id:string;name:string;areaSquareMetres?:number}[]},threshold:number,conclusions:ReasonerQuad[]):DisplayValue{
  const decisions=extractDecisions(conclusions,'polygon');
  const judged=polygons.features.map(f=>{
    const status=decisions.get(encodeURIComponent(f.id));
    if(!status)throw new Error(`Reasoner did not classify ${f.name}.`);
    const area=f.areaSquareMetres;
    return {...f,status,explanation:status==='Unknown'
      ? 'No area is attached to this polygon, so no extent rule could fire. A widget that works in degrees does not measure one.'
      : `Encloses ${(area!/1e6).toFixed(3)} km² ${area!>threshold?'>':'≤'} ${(threshold/1e6).toFixed(3)} km² threshold.`};
  });
  return {...(polygons as unknown as Record<string,unknown>),features:judged,
    rows:judged.map(f=>({id:f.id,name:f.name,status:f.status,
      areaSquareMetres:typeof f.areaSquareMetres==='number'?f.areaSquareMetres:null,
      explanation:f.explanation})),
    kind:'extent',centers:[],method:`Extent review against ${(threshold/1e6).toFixed(3)} km²`,
    threshold} as unknown as DisplayValue;
}
