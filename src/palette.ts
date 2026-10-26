/** Which node types the palette offers, and in what order.
 *
 *  Extracted from `renderLibrary` so it can be checked without a DOM. Every live widget is offered once the canvas
 *  holds an input, so nothing needs listing to be reachable -- which was the defect this file
 *  carried until 2026-10-19, when four curated lists decided addability and nine widgets were
 *  addable only on the examples whose template named them. See `addableTypes`.
 */

import classification from '../widgets/classification.json' with {type:'json'};

/** Group headings, in the order the palette shows them. A group missing here sorts to the front,
 *  which is how "Comparisons and checks" briefly jumped the queue. */
// EPIDEMIOLOGY IS A GROUP, not a scattering. The practitioner, 2026-10-25, looking at the
// palette: *"I do not see any epi widget"* -- and they were right in a way the widget list does
// not show. The widgets existed; 45 of 48 are standard, the only domain pack is sea-level-rise,
// and `rate` and `case_series` sat inside a generic Summaries group of five beside 21 spatial
// operations. The capability was there and the identity was not, which for an epidemiologist
// opening this is the same as the capability being absent.
//
// The group is presentation, deliberately: these stay `standard` in widgets/classification.json
// because a rate with a declared denominator is not an epidemiological quantity, it is an
// ordinary one that epidemiology leans on. Where a practitioner looks for it is a different
// question from whose vocabulary it belongs to.
export const PALETTE_GROUPS=['Sources','Spatial operations','Comparisons and checks','Semantic reasoning','Epidemiology','Summaries','Micro-workflows','Outputs'] as const;

import portContracts from '../widgets/port-contracts.json';

/** The widgets that need nothing and emit something: the input stage.
 *
 *  Derived from the declared port contracts rather than listed here, so the palette and the
 *  reveal measurement in experiment 112 cannot disagree about what an input is -- the same
 *  arrangement the playback uses, and for the same reason.
 *
 *  A widget whose ports come from a pin (`apply_ruleset`, `micro_workflow`) is not an input: it
 *  has no ports at all until it is configured, which is a different thing from needing nothing. */
interface DeclaredContract {output?:string|null; lateBoundTo?:string; contracts?:{required:unknown[]}[]}
export const INPUT_STAGE:ReadonlySet<string>=new Set(
  Object.entries((portContracts as unknown as {widgets:Record<string,DeclaredContract>}).widgets)
    .filter(([,widget])=>!widget.lateBoundTo&&!!widget.output
      &&(!(widget.contracts??[]).length||(widget.contracts??[]).some(c=>c.required.length===0)))
    .map(([name])=>name));

/** Derived from each widget's declared `implementationStatus`, not hand-maintained.
 *
 *  This was an array with `output` typed into it, and `implementationStatus: 'retired'` was a
 *  value the release format had permitted since it was written that **no file in `src/` read**.
 *  So retirement was declarable and inert, and the one widget actually off the palette was off it
 *  for an unrelated reason. Reading the declaration is what makes a retirement take effect
 *  everywhere at once — palette, node search, the catalogue and its counts — which is the
 *  practitioner's rule that retired means archived and not merely unaddable.
 *
 *  A retired widget never runs, so this list is also what the workflow loader refuses on. */
export const RETIRED_FROM_PALETTE:readonly string[]=
  (classification.widgets as {nodeType:string; retired?:boolean}[]).filter(w=>w.retired).map(w=>w.nodeType);

/** Addable, but not by choosing the type: the palette shows one entry per bundled
 *  composition and each adds a `micro_workflow` node already carrying that composition's
 *  pinned contract and defaults. A generic entry would add a node with no composition, which
 *  has no ports and cannot run, so the type is kept out of `ALWAYS_ADDABLE` on purpose. */
export const ADDABLE_VIA_COMPOSITION=['micro_workflow'] as const;

/** Nothing. The palette offers ONE generic rule-application widget and the ruleset is chosen on
 *  the node.
 *
 *  It used to show one entry per bundled ruleset, each adding a node with that ruleset already
 *  pinned, so that adding one always gave a node that could run. The practitioner's decision of
 *  2026-10-14 reversed that: "the palette should only offer a generic ruleset widget that can be
 *  named based on what it does in the workflow -- it can filter, can classify, etc. When we offer
 *  instances of rulesets as widgets, that's the recipe for exponential clutter."
 *
 *  Measured when the decision was made: four rulesets were showing as SEVEN palette entries,
 *  because a superseded version stays bundled so saved workflows can still resolve their pins. So
 *  the list grew with every ruleset and again with every version of one, and could never shrink.
 *
 *  What it costs is a node that exists before it can run, which `executionPlan` refuses by name --
 *  the arrangement a drawn study area with no boundary has always had. */
export const ADDABLE_VIA_RULESET=[] as const;

/** What the palette offers. One gate, derived, and no list.
 *
 *  **Until an input is on the canvas**, the input stage and nothing else: there is no sensible
 *  process step before there is something to process. `INPUT_STAGE` is derived from the declared
 *  port contracts, so the palette and experiment 112's reveal measurement cannot disagree about
 *  what an input is.
 *
 *  **After one is placed, every live widget.** That is the rule the practitioner adopted on
 *  2026-10-15 and `tests/input-stage-palette.browser.mjs` has stated ever since -- *"the gate is
 *  'start with an input', not a running filter: after that, judging what is sensible is the
 *  practitioner's"* -- and it is not what this function did. Four hand-curated lists decided
 *  instead: `ALWAYS_ADDABLE` of thirty-odd names, `STARTER_TYPES` of five, the catchment types, and
 *  the open example's own template. A widget in none of them was addable only on the examples whose
 *  template happened to name it.
 *
 *  Nine widgets were in that state on 2026-10-19, and the ledger had reported it in every build as
 *  "example templates only" -- which nobody read as a defect, because the browser test asserted
 *  only that more than thirty widgets were offered. The practitioner, finding `measure_distance`
 *  missing from the palette: *"Stop hand curating a list"*, and then the argument that settles it:
 *  **"How do I know which widgets need work if I can't even see them."**
 *
 *  That is not a convenience. Eight of those nine carried an open evaluation obligation -- four of
 *  the seven pending widget audits, three of the thirteen awaiting a laboratory check, eight of the
 *  forty-four awaiting a name review. The gate was requiring judgement on widgets a practitioner
 *  could not open.
 *
 *  Whatever is already on the canvas stays addable either way, so a deleted node can be put back. */
export function addableTypes(options:{workflowTypes:readonly string[]}):Set<string>{
  const {workflowTypes}=options;
  const live=(classification.widgets as {nodeType:string; retired?:boolean}[])
    .filter(widget=>!widget.retired).map(widget=>widget.nodeType);
  const offered=workflowTypes.some(type=>INPUT_STAGE.has(type))?live:[...INPUT_STAGE];
  return new Set([...offered,...workflowTypes].filter(type=>!RETIRED_FROM_PALETTE.includes(type as never)));
}
