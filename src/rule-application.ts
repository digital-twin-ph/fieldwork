/** Apply ruleset's shared pieces. One widget applies any declared ruleset; since 2026-11-11 it carries no code written
 *  for one ruleset (docs/audits/old-naledi-audit.md): every ruleset declares the columns it reads, the path rules
 *  written in a workflow take. The node types it replaced, `policy`, `access_policy` and `xpert`, are refused by name. */
import type {ParamsByType} from './types.js';
import type {DisplayValue,NearestRow,Receipt,Status} from './results.js';
import type {ReasonerQuad} from './worker-types.js';
import type {PointFeature} from './types.js';
import {resolveRuleset} from './rulesets.js';

const NS='urn:fieldwork:';

export interface Distances {rows:NearestRow[]; centers:PointFeature[]; method:string}

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

/** The pinned ruleset contract a newly added node carries. */
export function pinnedRuleset(rulesetId:string,version:string):ParamsByType['apply_ruleset']['ruleset']{
  const ruleset=resolveRuleset(rulesetId,version);
  const ports=(ruleset.inputContract as {ports:{inputs:[string,string][]; output:string}}).ports;
  return {id:ruleset.id,version:ruleset.version,title:ruleset.title,
    inputs:structuredClone(ports.inputs) as NonNullable<ParamsByType['apply_ruleset']['ruleset']>['inputs'],
    output:ports.output as NonNullable<ParamsByType['apply_ruleset']['ruleset']>['output']};
}

export type RuleApplicationResult={value:DisplayValue; receipt:Receipt};
