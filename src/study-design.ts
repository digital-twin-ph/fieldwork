/** THE STUDY DESIGN A WORKFLOW DECLARES, and how a computation finds it.
 *
 *  The practitioner, 2026-10-28: *"If we start with a study design the way we start with study
 *  area the workflow becomes more focused."* And 2026-10-31: *"There is a need to identify the
 *  study design in the relevant epi widget so the computations are tailored for the study
 *  design."* Experiment 154; the vocabulary comes from the audit in
 *  `docs/audits/study-designs-and-our-computations.md`.
 *
 *  A DECLARATION, NOT AN OPERATION. Nothing here computes. What it licenses is computed
 *  elsewhere, and the point of separating them is that one declaration governs every epi widget
 *  in a workflow -- decomposing it into a parameter on each would mean declaring it three times
 *  and permitting three answers.
 *
 *  FOUND BY WALKING UPSTREAM, which is what makes this a node rather than a field on the
 *  workflow. The D5 objection to a workflow-level field is that every consumer reaches for a
 *  global; a node has an id, a receipt and a place in the graph, and the walk is a real
 *  dependency even where it is not an edge. `declaredKinds(workflow,nodeId)` and
 *  `upstreamKeyValues` already walk this way for column kinds and column names.
 *
 *  AND IT REFUSES RATHER THAN CHOOSING. Two designs upstream of one computation is not a
 *  tie to be broken -- it is a question only the practitioner can answer, and picking the nearer
 *  one would be this application deciding what study somebody is running. The same shape
 *  `relateTable` already uses for an ambiguous key. The cost of the walk over an edge is exactly
 *  this: an edge would say which design governs a computation, and a walk has to decide.
 */
import type {Workflow,WorkflowNode} from './types.js';

/** THE STUDY DESIGNS THIS APPLICATION SERVES, as a closed set.
 *
 *  Six, not the twenty-two of `docs/research/fieldwork-study-designs-v1.1.md`, which is a reading
 *  list. Each is one the 2026-10-28 audit found reachable with the widgets that exist; offering a
 *  seventh that licenses no computation would be a declaration doing no work.
 *
 *  Here rather than in `types.ts` because that file is types only and emits no JavaScript -- a
 *  runtime value there resolves to a module that does not exist. The vocabulary belongs beside
 *  the thing that gives it meaning anyway. */
export const STUDY_DESIGNS=['cohort','case-control','cross-sectional','ecological','case-series',
  'surveillance'] as const;
export type StudyDesign=typeof STUDY_DESIGNS[number];

/** What a design licenses, in the letters `two_by_two` is written in.
 *
 *  Stated here rather than inside the gate so that a surface can EXPLAIN a refusal rather than
 *  only perform one, which is the separation `citationGaps` keeps from `renderCitation`. Step 3
 *  of the sequence consumes this; nothing gates on it yet. */
export interface DesignLicence {
  /** What `a/(a+b)` is under this design, or null where it is not a quantity at all. */
  rowProportion:string|null;
  /** The estimates `two_by_two` may report, by the names `epi-estimate.ts` gives them. */
  estimates:readonly string[];
  /** What one row of the table counts. An ecological design counts groups, not people, and that
   *  is the distinction its measures are most often read past. */
  unitOfAnalysis:string;
  /** Said where a measure is withheld or renamed, in the practitioner's terms. */
  because:string;
}

export const DESIGN_LICENCES:Record<StudyDesign,DesignLicence>={
  'cohort':{rowProportion:'risk',
    estimates:['risk ratio','odds ratio','risk difference'],
    unitOfAnalysis:'person',
    // UNIT-NEUTRAL WORDING, because the unit is declared and may not be a person. Read off the
    // screen on 2026-10-31: South London's water-company workflow is a cohort of HOUSES -- Snow
    // knew the supplying company per house -- and this sentence said "samples people" directly
    // under a declared unit of analysis of "house". A licence that contradicts the declaration
    // beside it is worse than one that says less.
    because:'A cohort follows the subjects it sampled, so the row totals are the populations at '
      +'risk and a/(a+b) is a risk.'},
  // THE ONE THAT PREVENTS A WRONG NUMBER. In case-control sampling `a+b` and `c+d` are artefacts
  // of how many cases and controls somebody chose to sample, so `a/(a+b)` is not a risk, and a
  // risk ratio and a risk difference built on it are not estimable at all. Only `ad/bc` survives,
  // because the cross-product is invariant to how the two groups were sampled.
  'case-control':{rowProportion:null,
    estimates:['odds ratio'],
    unitOfAnalysis:'person',
    because:'Case-control sampling fixes how many cases and controls there are, so a+b and c+d '
      +'are artefacts of the sampling and not populations at risk. The odds ratio survives '
      +'because the cross-product does not depend on them; a risk, a risk ratio and a risk '
      +'difference are not estimable.'},
  // THE ARITHMETIC KEEPS ITS VALUE AND LOSES ITS NAME, which the audit calls the worse of the two
  // failures because nothing looks amiss: a prevalence ratio printed as "Risk Ratio (RR)" is
  // right to three decimals and wrong about what it measures.
  'cross-sectional':{rowProportion:'prevalence',
    estimates:['prevalence ratio','prevalence odds ratio','prevalence difference'],
    unitOfAnalysis:'person',
    because:'A cross-sectional study measures every subject at one time, so a/(a+b) is a '
      +'prevalence rather than a risk. The arithmetic is the same and the names are not.'},
  'ecological':{rowProportion:'group-level proportion',
    estimates:['risk ratio','odds ratio','risk difference'],
    unitOfAnalysis:'group',
    because:'The rows count GROUPS and not people, so every measure here is a group-level '
      +'quantity. A relation between group-level measures need not hold between individuals.'},
  'case-series':{rowProportion:null,estimates:[],unitOfAnalysis:'person',
    because:'A case series has no comparison group, so there is no ratio to form.'},
  'surveillance':{rowProportion:null,estimates:[],unitOfAnalysis:'person',
    because:'Surveillance counts cases over periods. A two-by-two needs a comparison this design '
      +'does not declare.'},
};

export const isStudyDesign=(value:unknown):value is StudyDesign=>
  typeof value==='string'&&(STUDY_DESIGNS as readonly string[]).includes(value);

/** WHAT THE WALK FOUND, including the two answers that are not a design.
 *
 *  `absent` and `ambiguous` are kept apart deliberately: no design declared is a workflow nobody
 *  has told, and two designs declared is a workflow that has been told twice. One is reported and
 *  computes as before; the other is refused. Collapsing them into `null` would make a refusal
 *  look like silence. */
export type DesignFinding=
  {found:'one'; node:WorkflowNode<'study_design'>; design:StudyDesign; licence:DesignLicence}
  |{found:'absent'}
  |{found:'ambiguous'; nodeIds:string[]};

const designNodes=(w:Workflow):WorkflowNode<'study_design'>[]=>
  w.nodes.filter(n=>n.type==='study_design') as WorkflowNode<'study_design'>[];

/** Every node reachable by following edges BACKWARDS from `nodeId`, including it.
 *
 *  Upstream only, which is the decision recorded in `docs/directions.json`: a design declared
 *  downstream of a computation did not govern it, and reaching sideways would make two unrelated
 *  branches of one canvas share a declaration neither connected to. Cycle-safe by the visited
 *  set, because a canvas is a graph a practitioner drew and not one this code built. */
export function upstreamNodeIds(w:Workflow,nodeId:string):Set<string>{
  const seen=new Set<string>([nodeId]);
  const queue=[nodeId];
  while(queue.length){
    const to=queue.shift()!;
    for(const edge of w.edges)
      if(edge.to===to&&!seen.has(edge.from)){seen.add(edge.from);queue.push(edge.from);}
  }
  return seen;
}

/** THE DESIGN GOVERNING A COMPUTATION, or why there is not one.
 *
 *  A design wired to the consumer by an edge wins outright, because an edge is an explicit
 *  statement and the walk is an inference. Only where there is no edge does this fall back to
 *  the walk -- and only there can it be ambiguous, which is the honest cost of not requiring the
 *  edge everywhere. */
export function designFor(w:Workflow,nodeId:string):DesignFinding{
  const declared=designNodes(w);
  if(!declared.length)return {found:'absent'};
  const wired=w.edges.filter(e=>e.to===nodeId&&e.port==='design')
    .map(e=>declared.find(n=>n.id===e.from)).filter(Boolean) as WorkflowNode<'study_design'>[];
  const candidates=wired.length?wired
    :declared.filter(n=>upstreamNodeIds(w,nodeId).has(n.id));
  const distinct=[...new Set(candidates.map(n=>n.params.design))];
  if(!candidates.length)return {found:'absent'};
  // TWO NODES AGREEING IS NOT AMBIGUITY. A practitioner may declare the same design on two
  // branches that meet; what cannot be resolved is two DIFFERENT answers to one question.
  if(distinct.length>1)return {found:'ambiguous',nodeIds:candidates.map(n=>n.id)};
  const node=candidates[0];
  return {found:'one',node,design:node.params.design,licence:DESIGN_LICENCES[node.params.design]};
}

/** The sentence a receipt and a machined note both use, so one declaration is not worded two
 *  ways -- the rule `twoByTwoSentence` and `rateRatioSentence` already keep. */
export const studyDesignSentence=(node:WorkflowNode<'study_design'>):string=>{
  const {design,period,unitOfAnalysis}=node.params;
  const licence=DESIGN_LICENCES[design];
  const unit=unitOfAnalysis.trim()||licence.unitOfAnalysis;
  // "a ecological study" -- read off the screen on 2026-10-31. The six are a closed set, so the
  // article is decided by the set rather than by a rule about vowels that would be wrong for a
  // seventh nobody has added.
  const article=design==='ecological'?'an':'a';
  return `Declared as ${article} ${design} study`
    +(period.trim()?`, ${period.trim()}`:'')
    +`. The unit of analysis is the ${unit}. ${licence.because}`;
};

/** THE DECLARATION AS FACTS, so it is auditable rather than a comment on a canvas.
 *
 *  A declaration that left no trace in the evidence would be exactly the "ambient workflow state"
 *  D5 rejects: a reader of a receipt could not tell a result computed under a declared cohort
 *  from one computed under no declaration at all. What is asserted is what was declared and what
 *  that licenses -- never what was estimated, which belongs to the computation's own receipt.
 *
 *  `fw:licensedEstimate` is written once per estimate the design permits, INCLUDING none: a
 *  case series licenses no ratio, and a receipt that simply omitted the property would be
 *  indistinguishable from one written before the property existed. */
/** WHAT TRAVELS ON THE `design` PORT: the declaration, already worded, so a consumer reports it
 *  rather than re-wording it. The licence rides along because step 3 gates on it and a gate that
 *  had to look the design up again could disagree with the sentence beside it. */
export interface DeclaredDesign {
  kind:'study-design';
  design:StudyDesign;
  period:string;
  unitOfAnalysis:string;
  licence:DesignLicence;
  sentence:string;
}

export function studyDesignReceipt(node:WorkflowNode<'study_design'>,runId:string){
  const entity=`<urn:fieldwork:run:${runId}:output:${node.id}>`;
  const quote=(v:string)=>JSON.stringify(v);
  const licence=DESIGN_LICENCES[node.params.design];
  const unit=node.params.unitOfAnalysis.trim()||licence.unitOfAnalysis;
  const facts=`@prefix fw: <urn:fieldwork:>.\n`
    +`${entity} a fw:StudyDesign;\n`
    +`  fw:studyDesignKind ${quote(node.params.design)};\n`
    +(node.params.period.trim()?`  fw:studyPeriod ${quote(node.params.period.trim())};\n`:'')
    +`  fw:unitOfAnalysis ${quote(unit)}`
    +(licence.estimates.length
      ?`;\n`+licence.estimates.map(name=>`  fw:licensedEstimate ${quote(name)}`).join(';\n')
      :'')
    +`.\n`;
  // THE SAME SHAPE EVERY OTHER RECEIPT HAS, including the empty fields. `receiptText` renders a
  // receipt by its kind and falls through to a RULE node's shape, which reads `conclusions` --
  // so a receipt that declared a new kind and omitted the field took the run down with
  // "Cannot read properties of undefined (reading 'map')". Found 2026-10-31 by running the
  // workflow rather than by any test: no unit test renders a receipt. `conclusions` is empty
  // because a declaration infers nothing, and saying that with an empty array is different from
  // not saying it.
  return {nodeId:node.id,kind:'declaration' as const,facts,rules:'',input:facts,conclusions:[],
    method:studyDesignSentence(node),
    design:node.params.design,period:node.params.period,unitOfAnalysis:unit,
    licenses:[...licence.estimates]};
}
