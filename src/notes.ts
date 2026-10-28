/** THE NOTES A WRITE-UP IS MADE OF, of which this application can produce one kind and carry two.
 *
 *  The practitioner has been building towards this all along. On the prototype: *"Each note should
 *  be editable as a modal dialog ... The notes should also show intent (IMRAD, not sure where
 *  limitation goes in) as colored labels, and if produced by a workflow it should link to the
 *  workflow."* And on why it matters at all: *"We decrease friction for GIS and epi workflows, and
 *  we decrease friction for evidence generation (publication) from the use of those workflows."*
 *
 *  TWO KINDS, AND THE DISTINCTION IS WHO WROTE IT.
 *
 *    - **quoted** -- an author's own sentence, carried verbatim with the thing it establishes. The
 *      South London example ships nine of Snow's, harvested against the digest of the Gutenberg
 *      text and refused where an anchor was not unique.
 *    - **machined** -- this application's account of what it did to the practitioner's numbers.
 *      `relate_table` is the first producer. A panel is read by whoever is sitting in front of the
 *      step; a note is what survives into the paper, beside the figure it qualifies.
 *
 *  WHERE THEY LIVE. A note is content about the study, so it belongs to the PROJECT rather than to
 *  a workflow: South London's six workflows are six analyses of one investigation, and a sentence
 *  of Snow's is not about any one of them. Machined notes are different -- they are produced by a
 *  run and belong to the node that produced them, so they are not stored here at all. The view
 *  reads the project's notes and the run's together.
 *
 *  SECTIONS ARE CAPITALISED, settled 2026-10-28: *"Reconcile, use capital M, Methods."* The quoted
 *  schema had a spelling before the machined one existed, and two kinds of note that cannot be
 *  grouped together cannot be read in one place.
 */
import {isRecord} from './guards.js';

/** The parts of a write-up a note can TARGET, which is the IMRAD body and nothing else.
 *
 *  A title, an abstract, a reference list and an appendix are not here, and not because they do not
 *  matter. They are **assembled** from declarations spread across a workflow rather than written
 *  into one place, so no single note owns them -- see
 *  docs/experiments/147-table-shells-begin-with-the-end-in-mind.md. `Results` is in the list and has
 *  no producer: a Results section is mostly figures and tables, which this application makes as
 *  artifacts rather than as prose. */
export const WRITE_UP_PARTS=['Introduction','Methods','Results','Discussion'] as const;
export type WriteUpPart=typeof WRITE_UP_PARTS[number];

/** What the note DOES inside its section, in the practitioner's own breakdown: *"Introduction can
 *  have background (of the study), related literature, purpose."*
 *
 *  Deliberately a free string and not a closed set. Four values are in use -- `background`,
 *  `purpose`, `method`, `source` -- and `related literature` is named by the practitioner and used
 *  by nothing. A vocabulary closed before its producers exist is a vocabulary that gets withdrawn,
 *  and this repository already carries a withdrawn-term ratchet at 131 occurrences. The known ones
 *  are ordered first for reading; anything else is shown as it was written. */
/** `limitation` was added 2026-10-28 on the practitioner's ruling about a modern geometry standing
 *  in for a historical one: *"If it's a modern polygon, a machined note for it goes under
 *  Limitations (notes)"*.
 *
 *  LIMITATIONS IS A FUNCTION, NOT A FIFTH PART. In IMRAD it is a subsection of Discussion, and the
 *  four parts above are the body -- a reconciliation this repository has already been through once,
 *  with the practitioner correcting that *"Title and Abstract are not in IMRAD"*, that it *"does not
 *  have the References"*, and that it does not have the Appendix. So a note stating a vintage
 *  mismatch is `section:'Discussion'`, `fn:'limitation'`. Filing it under a section named
 *  `Limitations` would make `readNotes` DROP it, because a section outside the body is refused
 *  rather than coerced -- which is the behaviour working as intended, and the reason this is a
 *  function instead. */
export const KNOWN_NOTE_FUNCTIONS=['background','related literature','purpose','method','source',
  'limitation'];

export interface QuotedNote {
  kind:'quoted';
  id:string;
  section:WriteUpPart;
  /** What it does inside the section. */
  fn?:string;
  /** Why it is quoted: the claim it supports. Not the quote's own words. */
  establishes?:string;
  quote:string;
}

/** Prose a widget generated for a part of a write-up, rather than for the interface.
 *
 *  Moved here from `relate-table.ts` on 2026-10-28, which is what that file's own comment said
 *  would happen: *"Defined here because `relate_table` is its only producer. When there is a
 *  second, this type moves ... and nothing else about it changes."* The second reader arrived
 *  before the second producer -- this module, which has to group it beside a quoted note. */
export interface MachinedNote {
  kind:'machined';
  section:WriteUpPart;
  /** What it does inside the section, as on a quoted note. Added when the first machined
   *  `limitation` was called for: `groupNotes` was already reading this field off either kind
   *  (`'fn' in note&&note.fn`), so only the type and the reader were missing. */
  fn?:string;
  text:string;
  /** The node that machined it, where the run recorded one. A note produced by a workflow links to
   *  the workflow, which the practitioner asked for of the prototype. */
  nodeId?:string;
}

export type Note=QuotedNote|MachinedNote;

const part=(value:unknown):WriteUpPart|null=>
  WRITE_UP_PARTS.includes(value as WriteUpPart)?value as WriteUpPart:null;
const text=(value:unknown):string=>typeof value==='string'?value.trim():'';

/** At most this many notes on one project. A write-up is not a database, and a surface that has to
 *  page is a surface nobody reads in order. */
export const MAX_NOTES=200;

/** Read notes back, tolerantly, and say nothing about the ones that cannot be read.
 *
 *  A note whose section is not a part of the body is DROPPED rather than coerced into one: putting
 *  somebody's sentence under a heading they did not choose is worse than leaving it out, and the
 *  count of what was dropped is returned so a caller can say so. */
export function readNotes(raw:unknown):{notes:Note[]; unreadable:number}{
  if(!Array.isArray(raw))return {notes:[],unreadable:0};
  const notes:Note[]=[];
  let unreadable=0;
  for(const entry of raw.slice(0,MAX_NOTES)){
    if(!isRecord(entry)){unreadable++;continue;}
    const section=part(entry.section);
    if(!section){unreadable++;continue;}
    if(entry.kind==='quoted'){
      const quote=text(entry.quote),id=text(entry.id);
      if(!quote||!id){unreadable++;continue;}
      notes.push({kind:'quoted',id,section,quote,
        ...(text(entry.fn)?{fn:text(entry.fn)}:{}),
        ...(text(entry.establishes)?{establishes:text(entry.establishes)}:{})});
      continue;
    }
    if(entry.kind==='machined'){
      const body=text(entry.text);
      if(!body){unreadable++;continue;}
      notes.push({kind:'machined',section,text:body,
        ...(text(entry.fn)?{fn:text(entry.fn)}:{}),
        ...(text(entry.nodeId)?{nodeId:text(entry.nodeId)}:{})});
      continue;
    }
    unreadable++;
  }
  return {notes,unreadable:unreadable+Math.max(0,(Array.isArray(raw)?raw.length:0)-MAX_NOTES)};
}

export interface NoteGroup {fn:string; notes:Note[]}
export interface PartGroup {section:WriteUpPart; groups:NoteGroup[]; count:number}

/** Grouped for reading: the body in IMRAD order, and within a part the known functions first.
 *
 *  Every part is returned, including the empty ones. An absent Results section is a fact about the
 *  write-up and the place where a practitioner adds one, which the prototype settled: *"In the UI,
 *  if there is no notes under an IMRAD section, there should be an Add Notes button."* */
export function groupNotes(notes:Note[]):PartGroup[]{
  return WRITE_UP_PARTS.map(section=>{
    const mine=notes.filter(note=>note.section===section);
    const names=[...new Set(mine.map(note=>('fn' in note&&note.fn)||''))];
    const rank=(name:string)=>{
      const known=KNOWN_NOTE_FUNCTIONS.indexOf(name);
      return known>=0?known:KNOWN_NOTE_FUNCTIONS.length+(name?1:2);
    };
    const groups=names.sort((a,b)=>rank(a)-rank(b)||a.localeCompare(b))
      .map(fn=>({fn,notes:mine.filter(note=>(('fn' in note&&note.fn)||'')===fn)}));
    return {section,groups,count:mine.length};
  });
}

/** Words and characters, which the practitioner asked for of the prototype: *"We can also show
 *  number of characters, words so we have a running word / character count somewhere."*
 *
 *  Counted over what a reader would read -- a quoted note's quote, a machined note's text -- and
 *  not over `establishes`, which is the reason for the quote rather than part of the write-up. */
export function noteExtent(notes:Note[]):{notes:number; words:number; characters:number}{
  const bodies=notes.map(note=>note.kind==='quoted'?note.quote:note.text);
  return {notes:notes.length,
    words:bodies.reduce((total,body)=>total+(body.split(/\s+/).filter(Boolean).length),0),
    characters:bodies.reduce((total,body)=>total+body.length,0)};
}
