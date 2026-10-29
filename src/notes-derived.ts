import type {WorkflowNode} from './types.js';
import type {InputProvenance} from './input-provenance.js';
import {attributionFor} from './input-provenance.js';
import type {DerivedNote} from './notes.js';

/** THE SOURCES A WORKFLOW CAN CITE WITHOUT BEING ASKED TWICE.
 *
 *  Experiment 141, trying the design on a real write-up: *"References are the one section a
 *  workflow can write by itself."* This is that, built. A practitioner who told an input widget
 *  what its data is and where it came from has already written the Methods sentence that cites
 *  it; reading it back is not authorship and should not be charged as if it were.
 *
 *  Nine of the Notes Board prototype's fourteen cards are this kind.
 *
 *  WHAT IS NOT HERE. A node with no provenance yields no note -- an absent declaration is a fact
 *  about the workflow and inventing a citation for it would be the worst thing this module could
 *  do. `citationGaps` already reports what a declaration is missing, and is the right place for
 *  that complaint; silence here is not a gap being hidden, it is a gap living where it is
 *  reported.
 */

/** Every input that declares its provenance, as one `source` note apiece in Methods.
 *
 *  `Methods` because a source is part of how the study was made, which is where IMRaD puts it and
 *  where 141 found the example's own README had already put it. The same note is not repeated for
 *  a source two workflows share: the id is the node's, and a reader meets the citation once. */
export function derivedNotes(nodes:readonly WorkflowNode[]):DerivedNote[]{
  const made:DerivedNote[]=[];
  const seen=new Set<string>();
  for(const node of nodes){
    const provenance=(node.params as {provenance?:InputProvenance}).provenance;
    if(!provenance)continue;
    // What the data IS, in the practitioner's own words. Without that there is nothing to say
    // about it that a reader could use, and the attribution alone is a licence line rather than
    // a sentence in a write-up.
    const what=provenance.what?.trim();
    if(!what)continue;
    const detail=attributionFor(provenance).trim();
    // One citation, however many widgets rest on it. Two workflows reading the same table is one
    // source in a reference list, and a write-up that says it twice reads as two.
    const key=`${what}\u0000${detail}`;
    if(seen.has(key))continue;
    seen.add(key);
    made.push({kind:'derived',id:`derived:${node.id}`,section:'Methods',fn:'source',
      text:what,...(detail?{detail}:{}),nodeId:node.id});
  }
  return made;
}
