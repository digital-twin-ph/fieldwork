import {readFileSync} from 'node:fs';
import {ceilingProblems} from './ceiling.mjs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {sourceDefinitions} from './validate-widgets.mjs';

// The naming convention for node types, recorded in docs/audits/ontology-audit.md and applied by
// hand in docs/audits/widget_audit.md on 2026-10-09. It bound nothing: no script read it, so three
// widgets drifted past it within the week -- `reproject` titled "Reproject input" and filed under
// Sources, and all three domain widgets sitting in the palette's general list. A convention that
// is only prose is the same defect as `implementationStatus: 'retired'` being a declarable value
// no file read. This makes the checkable part of it take effect.
//
// Only the mechanically checkable rules live here. "Name the operation in the words a practitioner
// would use" is not one of them and stays a review question; D7 continues to apply over the top.

const root=fileURLToPath(new URL('../',import.meta.url));

/** Verbs that name a transformation of data already in the workflow. A node type that opens with
 *  one promises a transform, so it cannot also be a source. Acquisition verbs are listed apart
 *  because `find_health_facilities` genuinely acquires: it is a source and says so. */
export const TRANSFORM_VERBS=['reproject','buffer','clip','summarize','snap','sample','measure',
  'stack','fill','move','compare','assign','apply','group','calculate','select','aggregate','travel'];
export const ACQUISITION_VERBS=['find','fetch','import','load','acquire','read','observe'];

/** Port types a source may legitimately consume: they state WHERE to acquire, not WHAT to
 *  transform. An `area` scopes a raster window and an OSM query; neither is data under analysis. */
export const SCOPE_PORT_TYPES=['area'];

/** Names the 2026-10-09 audit judged against the convention and that are still live. Each is a
 *  category noun, a bare adjective, or the content of one demonstration. */
export const AUDITED_NAMES={
  alert:'An example\'s parameter, not an operation',
  facilities:'Names the content of one demonstration',
  nearest:'A bare adjective',
  samples:'Names the content of one demonstration, not an operation',
  area:'A category noun; which area?',
  observations:'A category noun; the operation is importing points',
};

/** Role words carry the position in a workflow, not the subject, so the convention blesses
 *  `map_output` titled "Map". They are excluded before the title is compared. */
const ROLE_WORDS=['input','output'];
const significant=type=>type.split('_').filter(t=>t.length>=3&&!ROLE_WORDS.includes(t));

export function violations({definitions,classification,domainPrefixes={}}){
  const byType=Object.fromEntries(classification.widgets.map(w=>[w.nodeType,w]));
  const found=[];
  const add=(nodeType,rule,detail)=>found.push({nodeType,rule,detail});
  for(const [nodeType,definition] of Object.entries(definitions)){
    if(byType[nodeType]?.retired)continue;
    const title=definition.title, lower=title.toLowerCase(), group=definition.group;
    const tokens=nodeType.split('_');

    // Form: a public identifier a practitioner has to type and guess the spelling of.
    if(!/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(nodeType))
      add(nodeType,'form',`Not snake_case: ${nodeType}`);
    if(/ise|isation/.test(nodeType))
      add(nodeType,'spelling',`Spell a node type with -ize: ${nodeType}`);

    // A role word belongs in the identifier or not at all. The title must say what the type says,
    // so "Reproject input" on a type with no `_input` is the title claiming a role the contract
    // does not have.
    for(const role of ['input','output'])
      if(lower.includes(role)&&!nodeType.includes(role))
        add(nodeType,'role-word-in-title',`Title "${title}" says "${role}" but the node type does not`);

    // A transform cannot be a source. This is what filed `reproject` under Sources: the name
    // promises a translation and the contract imports its own data.
    if(group==='Sources'&&TRANSFORM_VERBS.includes(tokens[0])&&!ACQUISITION_VERBS.includes(tokens[0]))
      add(nodeType,'transform-in-sources',`"${nodeType}" opens with the transform verb "${tokens[0]}" but is grouped under Sources`);

    // A widget grouped under Sources must acquire. It may take a SCOPE -- `raster_input` and
    // `find_health_facilities` both take an `area`, which says where to acquire from -- but not a
    // data carrier, because consuming data already in the workflow is a transform whatever the
    // group says. This catches `slr_extract_import`, which takes a `table` on an input port and
    // only validates and annotates it. The transform-verb rule above missed it: that rule keys on
    // the verb a name opens with, and a verb list is never complete, while a contract can be read.
    if(group==='Sources')
      for(const [port,portType] of definition.inputs??[])
        if(!SCOPE_PORT_TYPES.includes(portType))
          add(nodeType,'source-consumes-data',`Grouped under Sources but consumes "${portType}" on port "${port}". A source may take a scope (${SCOPE_PORT_TYPES.join(', ')}), not data already in the workflow.`);

    // A domain widget carries its domain in the identifier a reader meets first. The prefix is an
    // abbreviation a person chooses -- `slr_` for sea-level rise -- and is not derivable from the
    // pack IRI, so it is declared. Deriving it was this check's first bug: it read `sea` out of the
    // IRI and reported all three compliant widgets as violations.
    if(byType[nodeType]?.classification==='domain'){
      const pack=String(byType[nodeType].pack??'');
      const prefix=domainPrefixes[pack];
      if(!prefix)add(nodeType,'domain-prefix',`No prefix declared in widgets/naming.json for pack ${pack}`);
      else if(!nodeType.startsWith(prefix+'_'))
        add(nodeType,'domain-prefix',`Domain widget "${nodeType}" does not carry the declared prefix "${prefix}_" for pack ${pack}`);
    }

    // The node type and the title must say the same thing, or a reader learns a mapping that
    // carries no information -- `xpert` titled "Diagnostic evidence" was the case that prompted it.
    // Matched on a three-character stem, deliberately permissively: "Tabular data" is a fair
    // title for `table_input` though it shares no whole word with it, and the rule's job is to
    // catch a title that carries no information at all -- `xpert` titled "Diagnostic evidence" --
    // not to police wording. A four-character stem failed "Tabular data", since "tabular" does
    // not contain "tabl".
    const words=significant(nodeType);
    if(words.length&&!words.some(w=>lower.includes(w.slice(0,3))))
      add(nodeType,'title-type-agreement',`Title "${title}" shares no significant word with "${nodeType}"`);

    if(AUDITED_NAMES[nodeType])
      add(nodeType,'audited-name',AUDITED_NAMES[nodeType]);
  }
  return found;
}

const key=v=>`${v.nodeType}:${v.rule}`;

export function validateNaming({definitions,classification,baseline}){
  const found=violations({definitions,classification,domainPrefixes:baseline.domainPrefixes??{}});
  const known=new Map(baseline.knownViolations.map(v=>[`${v.nodeType}:${v.rule}`,v]));
  const problems=[];

  for(const v of found)
    if(!known.has(key(v)))
      problems.push(`New naming violation (${v.rule}) on "${v.nodeType}": ${v.detail}\n`
        +`  Fix the name, or -- if it is deliberate -- add it to widgets/naming.json with a reason.`);

  const seen=new Set(found.map(key));
  for(const k of known.keys())
    if(!seen.has(k))
      problems.push(`Stale entry in widgets/naming.json: "${k}" no longer violates the convention. `
        +`Remove it, so the count ratchets down.`);

  for(const v of baseline.knownViolations)
    if(!v.reason||typeof v.reason!=='string')problems.push(`Known violation "${key(v)}" carries no reason`);

  problems.push(...ceilingProblems('widgets/naming.json',
    {current:baseline.maxKnownViolations,initial:baseline.initialCeiling,raises:baseline.raises}));
  if(baseline.knownViolations.length>baseline.maxKnownViolations)
    problems.push(`${baseline.knownViolations.length} known violations exceeds the ceiling of `
      +`${baseline.maxKnownViolations}. The ceiling may be lowered, never raised.`);

  if(problems.length)throw new Error(problems.join('\n'));
  return {checked:Object.keys(definitions).length,known:baseline.knownViolations.length,
    ceiling:baseline.maxKnownViolations};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const {definitions}=await sourceDefinitions();
  const classification=JSON.parse(readFileSync(root+'widgets/classification.json','utf8'));
  if(process.argv.includes('--list')){
    const declared=JSON.parse(readFileSync(root+'widgets/naming.json','utf8').toString()).domainPrefixes;
    for(const v of violations({definitions,classification,domainPrefixes:declared}))
      console.log(`${v.rule.padEnd(24)} ${v.nodeType.padEnd(26)} ${v.detail}`);
    process.exit(0);
  }
  const baseline=JSON.parse(readFileSync(root+'widgets/naming.json','utf8'));
  try{
    const result=validateNaming({definitions,classification,baseline});
    console.log(`Naming convention: ${result.checked} node types checked, `
      +`${result.known} known violations (ceiling ${result.ceiling}).`);
  }catch(error){console.error(error.message);process.exit(1);}
}
