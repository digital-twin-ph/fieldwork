/** THE WORKS A WRITE-UP CITES, gathered from the write-up itself.
 *
 *  The practitioner, 2026-10-30: *"There is no aggregate References section."* And then, asked
 *  where it belongs, that it is a fifth part of the outline rather than a panel beside it --
 *  because that is where a reader expects it, because an author must be able to add a work the
 *  application never saw, and because a part can be reordered and set aside per venue the way
 *  141's amendment settled every other part can.
 *
 *  ASSEMBLED, NOT STORED. Everything here is already recorded somewhere a run wrote it: a derived
 *  note carries the attribution its input declares, and a machined equation names the method it
 *  used in `cites`. A stored References list would be a second copy of facts that already exist,
 *  and the moment a workflow is re-run with a different source the two disagree -- with nothing
 *  to say which is right. Assembling on every render costs a pass over the notes and cannot go
 *  stale. It is the same argument `audit-worked-examples.mjs` makes about measuring rather than
 *  remembering, one level down.
 *
 *  AND THE AUTHOR'S OWN REFERENCES ARE NOT TOUCHED. A note the practitioner writes into the
 *  References part is theirs and is rendered beside this list, not merged into it: this module
 *  reports what the workflows cite, which is a claim about the investigation, and a reference
 *  somebody typed is a claim about the literature. 149's line, in the one part where the two
 *  would otherwise be indistinguishable.
 *
 *  WHAT IS NOT CITED IS LISTED AS NOT CITED. A method with no primary source gets a line saying
 *  so rather than being left out, because a reader meeting a short list cannot tell a method
 *  nobody has looked up from a method with nothing to look up. The distinction
 *  `conventionalLabelSource` exists to keep, applied to the one surface where a reader would act on
 *  it -- which is also why this list cannot be sorted into silence: an uncited method sorts
 *  among the rest rather than into a footnote.
 */
import type {CitedWork,DerivedNote,MachinedNote,Note} from './notes.js';
import {METHOD_CITATION_STYLE,METHOD_REFERENCES,renderMethodCitation} from './equations.js';
import {normaliseDoi,renderCitation} from './input-provenance.js';

/** One work, and who cited it. */
export interface ReferenceEntry {
  /** What a reader sees: the rendered citation, or the sentence saying none has been read. */
  text:string;
  /** `source` is a dataset an input declared; `method` is an estimator a computation used. A
   *  publication cites the two differently and a venue may want only one of them. */
  kind:'source'|'method'|'work';
  /** For a work a note cites: what identifies it, so every note citing it gets the same number. */
  workKey?:string;
  /** True where there is no work to cite and the line says so. Kept as a field rather than left
   *  for a reader of the text to infer, because a venue that drops uncited lines needs to find
   *  them without matching prose. */
  uncited?:boolean;
  /** The workflows that cite it, by name, in the order the project lists them. A reference cited
   *  by one workflow of six is a different fact from one cited by all six. */
  citedBy:string[];
}

/** What the list is built from: one workflow's contribution, as the write-up already holds it. */
export interface CitingEntry {
  workflowName:string;
  machined:readonly MachinedNote[];
  derived:readonly DerivedNote[];
}

const clean=(value:string|undefined):string=>(value||'').trim();

/** THE REFERENCES OF A WRITE-UP, deduplicated, in the order a reader meets them.
 *
 *  SOURCES BEFORE METHODS, and within each the order the project's workflows introduced them.
 *  Not alphabetised: an alphabetical list is a convention a venue imposes at the end, and
 *  imposing it here would make the part reorder itself when a dataset is renamed. 141's rule
 *  about numbering, applied to ordering -- what the document does with the list is the
 *  document's business, and this states what is cited. */
/** One work, however many notes cite it: by DOI where there is one, otherwise by title and year. */
export const workKey=(work:CitedWork):string=>normaliseDoi(work.citation.doi)
  ?`doi:${normaliseDoi(work.citation.doi)!.toLowerCase()}`
  :`${work.citation.title.trim().toLowerCase()}|${work.published.slice(0,4)}`;

export function referenceList(entries:readonly CitingEntry[],
  /** The project's own notes, whose cited works come first, numbered in the order they are met. */
  notes:readonly Note[]=[]):ReferenceEntry[] {
  const works=new Map<string,ReferenceEntry>();
  for(const note of notes)if(note.kind==='authored')for(const work of note.works??[]){
    const key=workKey(work);
    if(works.has(key))continue;
    const rendered=renderCitation({licence:'unstated',citation:work.citation,published:work.published,
      ...(work.url?{url:work.url}:{}),...(work.retrieved?{retrieved:work.retrieved}:{})},METHOD_CITATION_STYLE);
    if(rendered)works.set(key,{text:rendered,kind:'work',workKey:key,citedBy:['Notes']});
  }
  const found=new Map<string,ReferenceEntry>();
  const add=(text:string,kind:ReferenceEntry['kind'],workflow:string,uncited?:boolean)=>{
    const key=`${kind}:${text}`;
    const held=found.get(key);
    if(held){if(!held.citedBy.includes(workflow))held.citedBy.push(workflow);return;}
    found.set(key,{text,kind,...(uncited?{uncited:true}:{}),citedBy:[workflow]});
  };
  for(const entry of entries){
    const workflow=clean(entry.workflowName);
    // A DERIVED NOTE'S `detail` IS THE ATTRIBUTION, rendered by `attributionFor` when the input
    // declared one. A derived note without one is a source that states no citation, which is a
    // gap in the input rather than a reference, and 144's rule refuses to render half of one.
    for(const note of entry.derived||[]){
      // THE WORK, cited whatever its licence; the licence's own attribution where there is no work to cite.
      const cited=clean(note.reference)||clean(note.detail);
      if(cited)add(cited,'source',workflow);
    }
    for(const note of entry.machined||[])
      for(const method of note.cites||[]){
        const rendered=renderMethodCitation(method);
        if(rendered){add(rendered,'method',workflow);continue;}
        const why=clean(METHOD_REFERENCES[method]?.uncited)
          ||'No primary source has been read for it.';
        add(`${method}: ${why}`,'method',workflow,true);
      }
  }
  const all=[...found.values()];
  return [...works.values(),...all.filter(r=>r.kind==='source'),...all.filter(r=>r.kind==='method')];
}

/** How many works, and how many of them are a stated absence. For the one line the part puts
 *  above the list, which reports and does not grade -- 149's rule, and the pending line's. */
export const referenceCount=(list:readonly ReferenceEntry[]):{works:number; uncited:number}=>
  ({works:list.filter(r=>!r.uncited).length,uncited:list.filter(r=>r.uncited).length});
