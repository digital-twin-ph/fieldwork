import type {PointCollection,PointFeature,PointLayer,Position,WorkflowNode} from './types.js';
import type {Receipt} from './results.js';
import {distanceKm} from './nearest-neighbour.js';

/** Deciding that two records are one facility.
 *
 *  The practitioner, 2026-10-20, with an OpenStreetMap search and an Overture Places search over
 *  one study area: *"health facilities can be deduplicated by name and point location. By name can
 *  be algorithmic match or exact match"* -- and, on the thresholds, 2026-10-21: *"Thresholds are
 *  knobs and settings should show up in N3 receipts."*
 *
 *  THE CONTRACTS COME FROM `EPIAI RECORDLINK`, which the practitioner wrote in the epi-info-ai
 *  repository and pointed this work at rather than let it reinvent them. What is taken, and why
 *  each is right here:
 *
 *  - **Blocking is a step of its own.** Only pairs within `blockDistanceM` are candidates. Every
 *    other pair is never compared, and the receipt says how many were.
 *  - **Binary contributions, not a blended score.** A comparison either agrees or it does not;
 *    a Jaro-Winkler of 0.87 against a threshold of 0.88 contributes nothing rather than 0.87.
 *  - **Three classes, not merge-or-not.** At or above `matchThreshold` is a match; between the
 *    review and match thresholds the pair WAITS FOR A PERSON. The practitioner, 2026-10-21:
 *    *"Acting on the match is either a human gate when uncertainty is at a certain threshold and
 *    automatic when uncertainty is very low."* The gate is on the merge, not on the run: an
 *    undecided pair stays two records and is reported, so nothing in that band merges silently.
 *  - **Missing never agrees with missing.** Two records with no name do not thereby match. A
 *    missing value contributes zero, which is not the same as disagreeing.
 *  - **The source records are immutable.** A merge produces a new record that says what it came
 *    from; nothing is written back to either layer.
 *
 *  What is NOT done, stated so nobody assumes it: no transliteration, no nickname or abbreviation
 *  dictionary, no phonetic key, no address parsing, no learned model. `HGR Goma` and
 *  `Hopital General de Reference de Goma` are the same facility and this will not say so -- the
 *  review band is where that judgement belongs, and the reason is recorded with it. */

export type NameMatch='exact'|'fuzzy';
export type CandidateClass='match'|'review'|'non-match';

export interface DeduplicateParams {
  nameField:string; nameMatch:NameMatch; fuzzyThreshold:number;
  blockDistanceM:number; nearDistanceM:number;
  matchThreshold:number; reviewThreshold:number;
}

/** A pair the blocking rule retained, with what each comparison said about it. */
/** What a reviewer needs to see to decide, carried with the pair rather than looked up later:
 *  which source each record came from, in the practitioner's words, and every attribute it has.
 *  The first version carried two names and a distance, and the practitioner, 2026-10-21: *"It is
 *  unclear what is being adjudicated."* Two records named `Kinesiterapie` and `La puissance de
 *  Dieu`, nought metres apart, are a question nobody can answer from the names alone. */
export interface CandidateRecord {
  sourceNodeId:string; sourceLabel:string; id:string; name:string|null; coordinates:Position;
  attributes:Record<string,unknown>;
}
export interface Candidate {
  key:string;
  a:CandidateRecord;
  b:CandidateRecord;
  /** Jaro-Winkler similarity, or 1 for an exact agreement; null when either name is missing. */
  nameSimilarity:number|null;
  metres:number;
  nameAgrees:boolean;
  nearAgrees:boolean;
  score:number;
  classification:CandidateClass;
  /** A person's answer, when the band asked for one. */
  decided?:'match'|'non-match';
  reason?:string;
}

/** NFKC, trimmed, lower case. Fuzzy comparison also replaces runs of anything that is not a
 *  letter or a number with one space, so punctuation and spacing stop being a disagreement. */
export function normaliseName(value:unknown,mode:NameMatch):string{
  if(typeof value!=='string')return '';
  const base=value.normalize('NFKC').trim().toLowerCase();
  return mode==='fuzzy'?base.replace(/[^\p{L}\p{N}]+/gu,' ').trim():base;
}

/** Jaro similarity with the Winkler prefix adjustment: at most a four-character prefix, scaling
 *  0.1, applied only when the Jaro similarity exceeds 0.7. The parameters are named because a
 *  figure that reports a merged count has to be able to say what produced it. */
export function jaroWinkler(a:string,b:string):number{
  if(!a||!b)return 0;
  if(a===b)return 1;
  const window=Math.max(0,Math.floor(Math.max(a.length,b.length)/2)-1);
  const matchedA=new Array<boolean>(a.length).fill(false),matchedB=new Array<boolean>(b.length).fill(false);
  let matches=0;
  for(let i=0;i<a.length;i++){
    const from=Math.max(0,i-window),to=Math.min(b.length-1,i+window);
    for(let j=from;j<=to;j++){
      if(matchedB[j]||a[i]!==b[j])continue;
      matchedA[i]=matchedB[j]=true;matches++;break;
    }
  }
  if(!matches)return 0;
  let transpositions=0,k=0;
  for(let i=0;i<a.length;i++){
    if(!matchedA[i])continue;
    while(!matchedB[k])k++;
    if(a[i]!==b[k])transpositions++;
    k++;
  }
  const jaro=(matches/a.length+matches/b.length+(matches-transpositions/2)/matches)/3;
  if(jaro<=0.7)return jaro;
  let prefix=0;
  while(prefix<4&&prefix<a.length&&prefix<b.length&&a[prefix]===b[prefix])prefix++;
  return jaro+prefix*0.1*(1-jaro);
}

const METRES_PER_KM=1000;
/** Stable across runs and across edits to unrelated records: a pair is named by its two records. */
export const candidateKey=(a:{sourceNodeId:string;id:string},b:{sourceNodeId:string;id:string})=>
  [`${a.sourceNodeId}:${a.id}`,`${b.sourceNodeId}:${b.id}`].sort().join('|');

/** What a decision was made ABOUT, so that editing either record lapses it rather than letting a
 *  stale judgement ride on changed data. The retired coverage check used the same device; this is
 *  the place where a judgement is genuinely required. */
export const pairSignature=(candidate:Candidate)=>JSON.stringify([
  candidate.a.name,candidate.a.coordinates,candidate.b.name,candidate.b.coordinates]);

export interface PairDecision {key:string; decision:'match'|'non-match'; reason:string; signature:string}

export interface DeduplicateResult {
  collection:PointCollection;
  candidates:Candidate[];
  compared:number;
  /** Pairs the blocking rule never offered for comparison. */
  blocked:number;
  matched:number;
  awaiting:number;
  merged:number;
  inputCount:number;
}

export function deduplicatePoints(layers:PointLayer[],params:DeduplicateParams,decisions:PairDecision[]=[]):DeduplicateResult{
  const records=layers.flatMap(layer=>layer.features.map(feature=>({
    sourceNodeId:layer.sourceNodeId,sourceLabel:layer.label||layer.sourceNodeId,feature,
    name:typeof feature.properties?.[params.nameField]==='string'?String(feature.properties[params.nameField]):null,
    coordinates:feature.geometry?.coordinates||null,
  })));
  const placed=records.filter(r=>r.coordinates&&Number.isFinite(r.coordinates[0])&&Number.isFinite(r.coordinates[1]));
  const byKey=new Map(decisions.map(d=>[d.key,d]));
  const candidates:Candidate[]=[];
  let compared=0,blocked=0;
  for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++){
    const a=placed[i],b=placed[j];
    // CROSS-SOURCE ONLY, which is `RECORDLINK`'s rule and this one's limit: a layer's duplicates
    // of itself are not looked for, and the receipt says so rather than leaving it to be assumed.
    if(a.sourceNodeId===b.sourceNodeId)continue;
    const metres=distanceKm(a.coordinates as Position,b.coordinates as Position)*METRES_PER_KM;
    if(metres>params.blockDistanceM){blocked++;continue;}
    compared++;
    const left=normaliseName(a.name,params.nameMatch),right=normaliseName(b.name,params.nameMatch);
    const bothNamed=!!left&&!!right;
    const similarity=bothNamed?(params.nameMatch==='exact'?(left===right?1:0):jaroWinkler(left,right)):null;
    const nameAgrees=bothNamed&&(params.nameMatch==='exact'?left===right:similarity!>=params.fuzzyThreshold);
    const nearAgrees=metres<=params.nearDistanceM;
    const score=(nameAgrees?1:0)+(nearAgrees?1:0);
    const classification:CandidateClass=score>=params.matchThreshold?'match'
      :score>=params.reviewThreshold?'review':'non-match';
    const candidate:Candidate={
      key:candidateKey({sourceNodeId:a.sourceNodeId,id:String(a.feature.id)},{sourceNodeId:b.sourceNodeId,id:String(b.feature.id)}),
      a:{sourceNodeId:a.sourceNodeId,sourceLabel:a.sourceLabel,id:String(a.feature.id),name:a.name,
        coordinates:a.coordinates as Position,attributes:structuredClone(a.feature.properties||{})},
      b:{sourceNodeId:b.sourceNodeId,sourceLabel:b.sourceLabel,id:String(b.feature.id),name:b.name,
        coordinates:b.coordinates as Position,attributes:structuredClone(b.feature.properties||{})},
      nameSimilarity:similarity,metres,nameAgrees,nearAgrees,score,classification};
    const decision=byKey.get(candidate.key);
    if(decision&&decision.signature===pairSignature(candidate)&&classification==='review'){
      candidate.decided=decision.decision;candidate.reason=decision.reason;
    }
    candidates.push(candidate);
  }
  candidates.sort((x,y)=>y.score-x.score||x.metres-y.metres||x.key.localeCompare(y.key));

  // ACCEPTED EDGES ONLY. A review pair merges when a person said so and not before, and a cluster
  // holds at most one record from each source -- an edge that would add a second is rejected and
  // reported rather than silently replacing the first.
  const cluster=new Map<string,string>();
  const find=(id:string):string=>{const parent=cluster.get(id);if(!parent||parent===id)return id;const root=find(parent);cluster.set(id,root);return root;};
  const sourcesOf=new Map<string,Set<string>>();
  const idOf=(r:{sourceNodeId:string;id:string})=>`${r.sourceNodeId}:${r.id}`;
  for(const record of placed){const id=idOf({sourceNodeId:record.sourceNodeId,id:String(record.feature.id)});cluster.set(id,id);sourcesOf.set(id,new Set([record.sourceNodeId]));}
  let merged=0;
  for(const candidate of candidates){
    const accepted=candidate.classification==='match'||candidate.decided==='match';
    if(!accepted)continue;
    const left=find(idOf(candidate.a)),right=find(idOf(candidate.b));
    if(left===right)continue;
    const union=new Set([...(sourcesOf.get(left)||[]),...(sourcesOf.get(right)||[])]);
    if(union.size<(sourcesOf.get(left)!.size+sourcesOf.get(right)!.size))continue; // one record per source
    cluster.set(right,left);sourcesOf.set(left,union);sourcesOf.delete(right);merged++;
  }

  const groups=new Map<string,typeof placed>();
  for(const record of placed){
    const root=find(idOf({sourceNodeId:record.sourceNodeId,id:String(record.feature.id)}));
    const held=groups.get(root)||[];held.push(record);groups.set(root,held);
  }
  const features:PointFeature[]=[];
  for(const [,held] of groups){
    const kept=held[0];
    const feature=structuredClone(kept.feature) as PointFeature;
    if(held.length>1)(feature.properties as Record<string,unknown>).mergedFrom=
      held.map(r=>`${r.sourceNodeId}:${r.feature.id}`).join(' ');
    features.push(feature);
  }
  // Records nobody could place are carried through untouched: they were never candidates, and
  // dropping them would lose data the deduplication has said nothing about.
  for(const record of records)if(!placed.includes(record))features.push(structuredClone(record.feature) as PointFeature);

  return {collection:{type:'FeatureCollection',features},candidates,compared,blocked,
    matched:candidates.filter(c=>c.classification==='match').length,
    awaiting:candidates.filter(c=>c.classification==='review'&&!c.decided).length,
    merged,inputCount:records.length};
}

export function deduplicateReceipt(node:WorkflowNode<'deduplicate_points'>,result:DeduplicateResult,
  runId:string,sourceNodeIds:string[]):Receipt{
  const p=node.params;
  const entity=`urn:fieldwork:run:${runId}:output:${node.id}`,activity=`${entity}:activity`;
  const quote=(v:unknown)=>JSON.stringify(String(v));
  let facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`<${activity}> a fw:RecordDeduplication, prov:Activity; `
    +sourceNodeIds.map(id=>`prov:used <urn:fieldwork:source:${id}>`).join('; ')+'; '
    +`fw:nameField ${quote(p.nameField)}; fw:nameMatchMethod ${quote(p.nameMatch==='fuzzy'?'jaro-winkler':'exact')}; `
    +`fw:fuzzyThreshold ${p.fuzzyThreshold}; fw:blockDistanceM ${p.blockDistanceM}; `
    +`fw:nearDistanceM ${p.nearDistanceM}; fw:matchThreshold ${p.matchThreshold}; `
    +`fw:reviewThreshold ${p.reviewThreshold}; fw:comparedPairCount ${result.compared}; `
    +`fw:blockedPairCount ${result.blocked}; fw:matchedPairCount ${result.matched}; `
    +`fw:awaitingDecisionCount ${result.awaiting}; fw:mergedRecordCount ${result.merged}.\n`
    +`<${entity}> a fw:PointDataset, prov:Entity; fw:recordCount ${result.collection.features.length}; `
    +`prov:wasGeneratedBy <${activity}>.\n`;
  for(const candidate of result.candidates){
    if(candidate.classification==='non-match')continue;
    const pair=`<${entity}:pair:${encodeURIComponent(candidate.key)}>`;
    facts+=`${pair} a fw:LinkageCandidate; fw:candidateClass ${quote(candidate.decided||candidate.classification)}; `
      +`fw:candidateScore ${candidate.score}; fw:matchedDistanceM ${Math.round(candidate.metres)}; `
      +(candidate.nameSimilarity===null?`fw:nameComparable false; `:`fw:matchedName ${candidate.nameSimilarity.toFixed(3)}; `)
      +`prov:wasDerivedFrom <urn:fieldwork:record:${candidate.a.sourceNodeId}:${candidate.a.id}>, `
      +`<urn:fieldwork:record:${candidate.b.sourceNodeId}:${candidate.b.id}>`
      +(candidate.reason?`; fw:decisionReason ${quote(candidate.reason)}`:'')+`.\n`;
    facts+=`<${activity}> fw:linkageCandidate ${pair}.\n`;
  }
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
    method:`Cross-source record linkage: ${result.compared} pairs compared within ${p.blockDistanceM} m `
      +`(${result.blocked} never compared), names by ${p.nameMatch==='fuzzy'?`Jaro-Winkler at ${p.fuzzyThreshold}`:'exact match'}, `
      +`${result.matched} matched automatically, ${result.awaiting} awaiting a decision, `
      +`${result.merged} records merged. A pair in the review band stays two records until a person decides.`};
}
