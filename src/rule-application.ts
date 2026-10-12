/** One widget applying a declared ruleset, where three widgets differed only in which rules they ran.
 *
 *  `policy`, `access_policy` and `xpert` are three arrangements of the same four stages: project
 *  facts from a typed carrier, bind a parameter, evaluate N3, extract a classification. The rules
 *  became declared data earlier on 2026-10-12; this is the node type that hosts them.
 *
 *  Ports come from the ruleset, pinned into the node, exactly as a `micro_workflow` pins its
 *  composition's — `nodeInputs` and `outputOf` already vary per node, so this reuses the mechanism
 *  compositions established rather than inventing one. That matters because the three had three
 *  different port sets and two different output carriers, which is why this looked like a
 *  base-contract change and is not.
 *
 *  **What this merge does and does not do.** It collapses the palette from three entries to one and
 *  the audit surface from three widget contracts to one. It does **not** collapse the three
 *  projections: each ruleset still assembles a different carrier for whatever consumes it, and that
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
import {resolveRuleset} from './rulesets.js';

const NS='urn:fieldwork:';

export interface Distances {rows:NearestRow[]; centers:PointFeature[]; method:string}

/** `outreach-criteria`: a distance against a threshold, gated by a declared external condition.
 *
 *  Lifted unchanged from the `policy` executor. The conflict refusal is the part worth keeping
 *  visible: two rules concluding differently for one subject is an error, not a precedence, and
 *  there is no way to express first-match ordering in a monotonic subset. */
export function extractDecisions(conclusions:ReasonerQuad[]):Map<string,Status>{
  const decisions=new Map<string,Status>();
  for(const quad of conclusions){
    if(quad.predicate!==NS+'decision')continue;
    const id=quad.subject.slice((NS+'place:').length);
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
