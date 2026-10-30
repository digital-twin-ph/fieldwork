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
/** WHAT A NOTE DOES FOR A READER, which is independent of where it sits in the body.
 *
 *  Two coordinates, and 141 proved they are independent rather than assuming it: `Limits` and
 *  `The three dates` are both `limitation` and land in Discussion and Methods, because one is
 *  about what the study cannot show and the other about how it was measured. One vocabulary
 *  could not have expressed that. The Notes Board prototype enforces the same separation in its
 *  palette -- *"kind and narrative position are two coordinates and must not be read off one
 *  colour."*
 *
 *  RECONCILED 2026-10-29 towards the prototype and the experiment that designed it. This list
 *  shipped `background`, `related literature` and `purpose`, which 141 does not name, and lacked
 *  `rationale`, `context` and `finding`, which it settles. A closed vocabulary that disagrees
 *  with the experiment that closed it is not a tidy-up; the practitioner decided it: *"Reconcile
 *  the vocabulary towards the earlier prototype."*
 *
 *  `verification` is the seventh and comes from neither the prototype nor the original six. 141
 *  found it by trying the design on a real write-up: two of the strongest sections of the example
 *  repository's README -- a 36-person arithmetic error traced to its origin, and a printed rate
 *  that does not follow from the columns beside it -- *"are neither `source` nor `limitation`.
 *  They record checking the source and finding it wrong, which is a distinct act and arguably the
 *  most valuable prose in the file."*
 *
 *  Ordered as a reader meets them inside a section: what this is about, why it was done, what it
 *  was made from, how, what checking it found, what it showed, and what it cannot show. The order
 *  decides grouping only -- `groupNotes` ranks known functions first -- and a function outside
 *  this list is kept and sorted after, never refused. Somebody else's word for what their note
 *  does is not ours to drop. */
export const KNOWN_NOTE_FUNCTIONS=['context','rationale','source','method','verification',
  'finding','limitation'];

/** NOTES ARE COMPOSED, THE WAY WIDGETS ARE.
 *
 *  The practitioner, 2026-10-29: *"The reason why I need a UUID is because I want to be able to
 *  connect the notes to each other"*, and then the shape of it: *"It's like workflow composition
 *  but it's not composing widgets, but notes."*
 *
 *  Which is what a write-up IS -- an argument assembled from pieces, where the assembly carries
 *  meaning the pieces do not. A composition of widgets has nodes and edges; so does this.
 *
 *  THE EDGE: one note standing in a stated relation to another. `relatesTo` holds the ids, and an
 *  id that names nothing is kept rather than dropped, because a note whose companion has not been
 *  written yet is an ordinary state of a draft and not an error.
 *
 *  AND WHY IDENTITY HAD TO BE SETTLED FIRST. A link is worth exactly as much as the id surviving
 *  the next run. Three of the four kinds carried an id and `machined` carried none, so its handle
 *  was the first forty characters of its own text -- which changes the moment the numbers it
 *  reports change, so a link to it would break on precisely the run that made it interesting.
 *
 *  And the ids that existed were not unique. `derived:${nodeId}` reads as a name until you look:
 *  the South London example has a node called `table-viii` in THREE of its six workflows, and
 *  `table-xii` in two. Measured, not supposed. A project-wide graph keyed on those would have
 *  joined three different citations into one node. */
export type NoteId=string;

export interface QuotedNote {
  kind:'quoted';
  id:string;
  section:WriteUpPart;
  /** What it does inside the section. */
  fn?:string;
  /** Why it is quoted: the claim it supports. Not the quote's own words. */
  establishes?:string;
  quote:string;
  /** Other notes this one stands with: the edges of the composition. */
  relatesTo?:NoteId[];
}

/** Prose a widget generated for a part of a write-up, rather than for the interface.
 *
 *  Moved here from `relate-table.ts` on 2026-10-28, which is what that file's own comment said
 *  would happen: *"Defined here because `relate_table` is its only producer. When there is a
 *  second, this type moves ... and nothing else about it changes."* The second reader arrived
 *  before the second producer -- this module, which has to group it beside a quoted note. */
export interface MachinedNote {
  kind:'machined';
  /** Stable across runs, because a note that re-machines must stay the same note: the widget
   *  rewrites its wording and the thing a link points at does not move. */
  id?:NoteId;
  section:WriteUpPart;
  /** What it does inside the section, as on a quoted note. Added when the first machined
   *  `limitation` was called for: `groupNotes` was already reading this field off either kind
   *  (`'fn' in note&&note.fn`), so only the type and the reader were missing. */
  fn?:string;
  text:string;
  /** The node that machined it, where the run recorded one. A note produced by a workflow links to
   *  the workflow, which the practitioner asked for of the prototype. */
  nodeId?:string;
  /** Other notes this one stands with: the edges of the composition. */
  relatesTo?:NoteId[];
}

/** THE EXAMPLE'S AUTHORS, IN THEIR OWN WORDS.
 *
 *  The practitioner, 2026-10-29: *"Since we are the authors of the worked example, we can add our
 *  annotations to the discovered methods, and definitely to our methods."*
 *
 *  The third kind the Notes Board prototype carries and this module did not. A quoted note is
 *  somebody else's sentence and may not be edited here; a machined note is a widget's account of
 *  a computation and is rewritten by re-running it. An authored note is ours, and is the only
 *  kind this application has any business letting a practitioner edit -- which is why the
 *  distinction is a kind rather than a flag.
 *
 *  `about` is what it annotates: another note's id, or a node's. An annotation on Snow's chloride
 *  test is not a free-standing remark, and a reader who cannot see what it is about has half of
 *  it. Absent where the note stands on its own. */
export interface AuthoredNote {
  kind:'authored';
  id:string;
  section:WriteUpPart;
  fn?:string;
  text:string;
  /** WHO WROTE IT, as a GitHub login carried in `Project.authors`.
   *
   *  Only this kind takes one. A quoted note belongs to its source, and a derived or machined note
   *  to the widget that produced it -- attributing either to a person would credit them with words
   *  they did not write.
   *
   *  Absent means UNATTRIBUTED, and stays absent. Every note written before identity existed is in
   *  that state, and the identity of whoever opens the file is not the identity of whoever wrote
   *  the sentence. See `src/identity.ts` and experiment 150. */
  author?:string;
  /** The note or node this annotates. */
  about?:string;
  /** WHERE IT CAME FROM WHEN IT WAS NOT WRITTEN FROM NOTHING.
   *
   *  The practitioner, 2026-10-29: *"A machined note can also be edited but once it is, it is
   *  forked from the original and becomes an authored note with two provenances."*
   *
   *  That is the answer to a question this module had been circling: whether a machined note is
   *  editable. It is, and editing one does not overwrite it -- the widget goes on machining its
   *  own account every run, and the edit becomes a separate note of a different kind. So nothing
   *  is destroyed and nothing is silently claimed: the fork says a computation produced the words
   *  and a person changed them, which are two different warrants and a reader needs both.
   *
   *  `text` is the machined wording AT THE MOMENT OF FORKING, kept so drift is detectable. When
   *  the run re-machines and the numbers move, the fork still reads as it did, and the only way
   *  to know is to compare -- which `forkHasDrifted` does, rather than leaving a reader to
   *  believe an edited sentence still describes the current run. */
  forkedFrom?:{
    /** The node whose widget machined the original. */
    nodeId?:string;
    /** The machined wording this was forked from. */
    text:string;
    /** When the fork was taken. */
    at?:string;
  };
  /** Other notes this one stands with: the edges of the composition. */
  relatesTo?:NoteId[];
}

/** WHAT AN INPUT DECLARES ABOUT ITSELF, as a note.
 *
 *  The fourth kind, and the one the Notes Board prototype is mostly made of: nine of its fourteen
 *  cards are `derived` -- each table's source, the boundaries' licence, the plate's terms. Nobody
 *  wrote them and no computation produced them. They are the application reading back what an
 *  input widget was told about its own data.
 *
 *  This is what experiment 141 means by *"References are the one section a workflow can write by
 *  itself"*, and it is the difference between a surface for keeping sentences and a write-up
 *  assembled from the work. A practitioner who declared the provenance of a table has already
 *  written the Methods sentence that cites it; they should not have to write it twice.
 *
 *  Not editable, and for the same reason a quotation is not: the place to change it is the widget
 *  that declares it. Editing one would fork it into an authored note, which is the rule the
 *  practitioner settled for machined notes and which holds here unchanged. */
export interface DerivedNote {
  kind:'derived';
  id:string;
  section:WriteUpPart;
  fn?:string;
  /** What the data IS, in the words the practitioner gave the widget. */
  text:string;
  /** The attribution the licence and citation require, as `attributionFor` renders it. */
  detail?:string;
  /** The input that declares it. */
  nodeId?:string;
  /** Other notes this one stands with: the edges of the composition. */
  relatesTo?:NoteId[];
}

export type Note=QuotedNote|MachinedNote|AuthoredNote|DerivedNote;

const part=(value:unknown):WriteUpPart|null=>
  WRITE_UP_PARTS.includes(value as WriteUpPart)?value as WriteUpPart:null;
const text=(value:unknown):string=>typeof value==='string'?value.trim():'';
/** The ids this note stands with. An id naming nothing yet is KEPT: a note whose companion has
 *  not been written is an ordinary state of a draft, and dropping the edge would quietly undo a
 *  practitioner's decision at the moment it is hardest to notice. */
const edges=(value:unknown):string[]=>Array.isArray(value)
  ?[...new Set(value.map(text).filter(Boolean))]:[];

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
        ...(text(entry.establishes)?{establishes:text(entry.establishes)}:{}),
        ...(edges(entry.relatesTo).length?{relatesTo:edges(entry.relatesTo)}:{})});
      continue;
    }
    if(entry.kind==='derived'){
      const body=text(entry.text),id=text(entry.id);
      if(!body||!id){unreadable++;continue;}
      notes.push({kind:'derived',id,section,text:body,
        ...(text(entry.fn)?{fn:text(entry.fn)}:{}),
        ...(text(entry.detail)?{detail:text(entry.detail)}:{}),
        ...(text(entry.nodeId)?{nodeId:text(entry.nodeId)}:{}),
        ...(edges(entry.relatesTo).length?{relatesTo:edges(entry.relatesTo)}:{})});
      continue;
    }
    if(entry.kind==='authored'){
      const body=text(entry.text),id=text(entry.id);
      if(!body||!id){unreadable++;continue;}
      // A fork with no original wording is not a fork: it claims a second provenance and
      // carries nothing to check it against, so the claim is dropped and the note stands as
      // what it plainly is -- somebody's own sentence.
      const from=isRecord(entry.forkedFrom)?entry.forkedFrom:undefined;
      const was=from?text(from.text):'';
      notes.push({kind:'authored',id,section,text:body,
        ...(text(entry.fn)?{fn:text(entry.fn)}:{}),
        ...(text(entry.about)?{about:text(entry.about)}:{}),
        ...(was?{forkedFrom:{text:was,
          ...(text(from!.nodeId)?{nodeId:text(from!.nodeId)}:{}),
          ...(text(from!.at)?{at:text(from!.at)}:{})}}:{}),
        ...(edges(entry.relatesTo).length?{relatesTo:edges(entry.relatesTo)}:{})});
      continue;
    }
    if(entry.kind==='machined'){
      const body=text(entry.text);
      if(!body){unreadable++;continue;}
      notes.push({kind:'machined',section,text:body,
        ...(text(entry.id)?{id:text(entry.id)}:{}),
        ...(text(entry.fn)?{fn:text(entry.fn)}:{}),
        ...(text(entry.nodeId)?{nodeId:text(entry.nodeId)}:{}),
        ...(edges(entry.relatesTo).length?{relatesTo:edges(entry.relatesTo)}:{})});
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
/** FORK A MACHINED NOTE, which is what editing one does.
 *
 *  The machined note is untouched -- the widget rewrites it on the next run either way. What this
 *  returns is a new note of a different kind, carrying both warrants: the computation that
 *  produced the wording, and the person who changed it. */
export function forkMachinedNote(note:MachinedNote,id:string,text:string,at?:string):AuthoredNote{
  return {kind:'authored',id,section:note.section,text,
    ...(note.fn?{fn:note.fn}:{}),
    forkedFrom:{text:note.text,...(note.nodeId?{nodeId:note.nodeId}:{}),...(at?{at}:{})}};
}

/** Whether what was machined has moved since the fork was taken.
 *
 *  A forked note goes on reading as it did while the run behind it changes, which is the cost of
 *  being allowed to edit one. Nothing here resolves that -- it reports it, so a reader is not
 *  left believing an edited sentence still describes the current numbers. */
export function forkHasDrifted(note:AuthoredNote,machined:readonly MachinedNote[]):boolean{
  const from=note.forkedFrom;
  if(!from)return false;
  const now=machined.find(m=>m.nodeId===from.nodeId&&m.section===note.section);
  return !!now&&now.text!==from.text;
}

export function noteExtent(notes:Note[]):{notes:number; words:number; characters:number}{
  const bodies=notes.map(note=>note.kind==='quoted'?note.quote:note.text);
  return {notes:notes.length,
    words:bodies.reduce((total,body)=>total+(body.split(/\s+/).filter(Boolean).length),0),
    characters:bodies.reduce((total,body)=>total+body.length,0)};
}
