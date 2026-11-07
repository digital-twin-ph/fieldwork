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
import {validLogin} from './identity.js';

/** The parts of a write-up a note can TARGET, which is the IMRAD body and nothing else.
 *
 *  A title, an abstract, a reference list and an appendix are not here, and not because they do not
 *  matter. They are **assembled** from declarations spread across a workflow rather than written
 *  into one place, so no single note owns them -- see
 *  docs/experiments/147-table-shells-begin-with-the-end-in-mind.md. `Results` is in the list and has
 *  no producer: a Results section is mostly figures and tables, which this application makes as
 *  artifacts rather than as prose. */
/** THE PUBLICATION OUTLINE. IMRaD, and then the references the body cites.
 *
 *  References was added on 2026-10-30, on the practitioner's ruling that the aggregate list is a
 *  part of the write-up rather than a panel beside it: it is where a reader expects it, an author
 *  can add a reference the application never saw, and it can be reordered and set aside per venue
 *  like any other part.
 *
 *  THE LIST ITSELF IS NOT STORED AS NOTES. What a workflow cites is already recorded -- a derived
 *  note carries its input's attribution, a machined equation names the method it used -- so the
 *  list is assembled from those on every render. Storing it too would be a second copy that goes
 *  out of date against the first, and `src/references.ts` says why at length. */
export const WRITE_UP_PARTS=['Introduction','Methods','Results','Discussion','References'] as const;
/** WHERE AN OUTPUT'S FIGURE GOES IN THE WRITE-UP. The practitioner, 2026-11-05: *"all output widgets may have default
 *  IMRAD sections but it should be flexible."* Results by default, for every output widget; a study-area map belongs in
 *  the Introduction, a flow of the analysis in the Methods. References holds works, not figures, so it is not offered. */
export const FIGURE_SECTIONS=['Introduction','Methods','Results','Discussion'] as const;
export type FigureSection=typeof FIGURE_SECTIONS[number];
export const DEFAULT_FIGURE_SECTION:FigureSection='Results';
/** EACH OUTPUT WIDGET'S DEFAULT, stated per widget so a widget whose figures belong elsewhere by default can say so.
 *  Today all three say Results. Read by scripts/widget-manual.mjs into ontology/widgets.ttl as fw:defaultFigureSection,
 *  so the ontology states the same defaults the application applies. */
export const DEFAULT_FIGURE_SECTIONS:Record<'map_output'|'table_output'|'chart_output',FigureSection>={
  map_output:'Results',table_output:'Results',chart_output:'Results'};
export const figureSection=(params:{section?:string}|undefined,
  nodeType?:keyof typeof DEFAULT_FIGURE_SECTIONS):FigureSection=>
  (FIGURE_SECTIONS as readonly string[]).includes(params?.section??'')?params!.section as FigureSection
    :nodeType?DEFAULT_FIGURE_SECTIONS[nodeType]:DEFAULT_FIGURE_SECTION;
/** Whether the section was chosen, as distinct from defaulted: a receipt says which. */
export const figureSectionDeclared=(params:{section?:string}|undefined):boolean=>
  (FIGURE_SECTIONS as readonly string[]).includes(params?.section??'');
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
/** TWO QUESTIONS A NOTE ANSWERS ABOUT ITS SOURCES: whose words, and whose argument.
 *
 *  First built as one list -- précis, paraphrase, summary -- when the practitioner set out, 2026-11-07, as the Brazil
 *  notes were written: *"Our notes that cite literature can take the form of a precis, paraphrase or summary."* An
 *  evidence search the same day (docs/research/teaching-writing-from-sources-2026-11-07.md, experiment 183) found
 *  that studies of source use code two things separately: how much of a source's wording is borrowed, and whether the
 *  writer reports the sources or argues from them. None separates précis from summary, and the most common borrowing
 *  problem, patchwriting, has a name of its own. So the list became two questions, at the practitioner's word: *"Let's
 *  do the redesign."*
 *
 *  Both are optional and both are free text, read as the function is: the known answers are offered first and anything
 *  else is kept as written. Nothing chosen stays absent and reads as unstated. `not sure` is the writer saying they
 *  looked and could not tell -- *"Not sure is ok"* -- a question for a reviewer rather than a gap. */
export interface NoteAnswer {value:string; label:string; gloss:string}
export const NOTE_WORDS:NoteAnswer[]=[
  {value:'exact',label:'the source’s exact words',
    gloss:'a quotation: put it in quotation marks and cite the page'},
  {value:'close',label:'close to the source’s wording',
    gloss:'often a stage in learning to paraphrase; revise it into your own words, or quote it'},
  {value:'passage',label:'my words: one passage',
    gloss:'a paraphrase, checked against that passage'},
  {value:'points',label:'my words: the main points',
    gloss:'a summary of one work or several, checked against each work'},
  {value:'not sure',label:'not sure',
    gloss:'you looked and could not tell; a reviewer can help decide'},
];
export const NOTE_ARGUMENT:NoteAnswer[]=[
  {value:'reports',label:'what the works say',
    gloss:'reporting: a reader checks it against the works'},
  {value:'own',label:'what I make of them',
    gloss:'your analysis, reasoning or synthesis: a reader judges the reasoning, and whether the works cited support it'},
  {value:'not sure',label:'not sure',
    gloss:'you looked and could not tell; a reviewer can help decide'},
];
/** A note saved before 0.43.0 carried one `form`. Read into `words`, so nothing written then is lost. */
const LEGACY_FORM:Record<string,string>={'précis':'points',summary:'points',paraphrase:'passage','not sure':'not sure'};

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
/** THE WIDGET THAT WROTE A NOTE, recorded when it was written. A label names the analysis and can
 *  say anything, so it does not answer which widget this was, and wording changes between releases
 *  so the version has to be the one that ran rather than the one installed today. The practitioner,
 *  2026-11-01: *"we do not have an idea which widget they came from"*. */
export interface NoteWidget {type:string; title:string; version:string}

export interface MachinedNote {
  /** THE METHODS THIS NOTE CITED, by the name `METHOD_REFERENCES` holds them under.
   *
   *  Named rather than parsed back out of the prose. The note already prints its own reference
   *  line, and an aggregate References part that recovered the works by matching text against the
   *  sentences would break the first time a citation style changed -- which is a thing a venue
   *  changes on purpose. A method with no source is still named here, because the References part
   *  has to say that nobody has looked it up rather than leave it out. */
  cites?:string[];
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
  widget?:NoteWidget;
  /** WHICH WORKFLOW PRODUCED IT, where it was not the one being read.
   *
   *  Added 2026-10-30 when the Notes tab became the PROJECT's write-up rather than the open
   *  workflow's, on the practitioner's ruling: *"It's supposed to hold notes from all workflows
   *  in that project."* Two things forced it to be a field rather than something the panel could
   *  work out. A node id is unique within a workflow and NOT across a project -- South London has
   *  `table-viii` in three of its six -- so neither a note's handle nor its step label can be
   *  resolved from `nodeId` alone once several workflows' notes sit in one list. And a reader of
   *  a write-up assembled from six workflows needs to know which part of the investigation a
   *  sentence came from.
   *
   *  Absent for a note from the open workflow, where the step chip already says it. */
  workflowKey?:string;

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
/** A WORK AN AUTHORED NOTE CITES, built in the note rather than typed into its sentence. The practitioner,
 *  2026-11-02: the citation *"should be built within the note by a citation builder ... automatically
 *  attached when the note is rendered and the citation automatically shows up in the References."*
 *  The fields are `Citation`'s, so the three encoded styles render it and `citationGaps` checks it. */
export interface CitedWork {
  citation:import('./input-provenance.js').Citation;
  /** When it was published: what every style prints as the year. */
  published:string;
  url?:string;
  retrieved?:string;
}
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
    widget?:NoteWidget;
    /** The node whose widget machined the original. */
    nodeId?:string;
    /** The machined wording this was forked from. */
    text:string;
    /** When the fork was taken. */
    at?:string;
  };
  /** Other notes this one stands with: the edges of the composition. */
  relatesTo?:NoteId[];
  /** The works this note cites. Marked where the note renders and listed in References. */
  works?:CitedWork[];
  /** Whose words: how much of a cited source's wording this note carries. See NOTE_WORDS. */
  words?:string;
  /** Whose argument: whether it reports the works or argues from them. See NOTE_ARGUMENT. */
  argument?:string;
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
  /** WHICH WORKFLOW PRODUCED IT, where it was not the one being read.
   *
   *  Added 2026-10-30 when the Notes tab became the PROJECT's write-up rather than the open
   *  workflow's, on the practitioner's ruling: *"It's supposed to hold notes from all workflows
   *  in that project."* Two things forced it to be a field rather than something the panel could
   *  work out. A node id is unique within a workflow and NOT across a project -- South London has
   *  `table-viii` in three of its six -- so neither a note's handle nor its step label can be
   *  resolved from `nodeId` alone once several workflows' notes sit in one list. And a reader of
   *  a write-up assembled from six workflows needs to know which part of the investigation a
   *  sentence came from.
   *
   *  Absent for a note from the open workflow, where the step chip already says it. */
  workflowKey?:string;

  /** Other notes this one stands with: the edges of the composition. */
  relatesTo?:NoteId[];
}

export type Note=QuotedNote|MachinedNote|AuthoredNote|DerivedNote;

const widgetOf=(value:unknown):NoteWidget|undefined=>{
  if(!isRecord(value))return undefined;
  const {type,title,version}=value;
  return typeof type==='string'&&typeof title==='string'&&typeof version==='string'
    ?{type,title,version}:undefined;
};

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

/** WHAT AN ADDED NOTE SAYS BEFORE ANYBODY HAS WRITTEN IT.
 *
 *  A note has to carry words or `readNotes` drops it on the next open: a note with no words is
 *  not a note, and that rule is older than writing. So an added note carries a marker instead of
 *  nothing, and the dialog treats the marker as an empty page rather than as prose to delete
 *  first. Short, and plainly not a sentence, because it is read on a card. */
export const UNWRITTEN='(unwritten)';

/** Read notes back, tolerantly, and say nothing about the ones that cannot be read.
 *
 *  A note whose section is not a part of the body is DROPPED rather than coerced into one: putting
 *  somebody's sentence under a heading they did not choose is worse than leaving it out, and the
 *  count of what was dropped is returned so a caller can say so. */
/** Works read back only when each has a title, an author and a date: a citation missing those cannot be
 *  printed in any style, so it is dropped rather than carried as something that looks citable. */
const worksOf=(raw:unknown):CitedWork[]=>!Array.isArray(raw)?[]:raw.flatMap(work=>{
  if(!isRecord(work)||!isRecord(work.citation))return [];
  const c=work.citation as Record<string,unknown>;
  const published=text(work.published);
  if(!text(c.title)||!published||!Array.isArray(c.authors)||!c.authors.length)return [];
  return [{citation:structuredClone(c) as unknown as CitedWork['citation'],published,
    ...(text(work.url)?{url:text(work.url)}:{}),...(text(work.retrieved)?{retrieved:text(work.retrieved)}:{})}];
});
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
        ...(text(entry.workflowKey)?{workflowKey:text(entry.workflowKey)}:{}),
        ...(edges(entry.cites).length?{cites:edges(entry.cites)}:{}),
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
      // The author is read back only if GitHub could have issued the login. A malformed one is
      // DROPPED rather than carried: an author list and a contributions statement are the two
      // places a half-read name would be published as though it had been checked. Added 2026-10-29
      // after exercising the statement on the South London example found the field written, stored
      // and silently lost here -- the defect shape experiment 149 recorded, "a field that exists,
      // travels as far as the door, and is dropped by the one step that rebuilds the object".
      const author=validLogin(text(entry.author))?text(entry.author):'';
      notes.push({kind:'authored',id,section,text:body,
        ...(text(entry.fn)?{fn:text(entry.fn)}:{}),
        ...(author?{author}:{}),
        ...(text(entry.about)?{about:text(entry.about)}:{}),
        ...(was?{forkedFrom:{text:was,
          ...(text(from!.nodeId)?{nodeId:text(from!.nodeId)}:{}),
          ...(widgetOf(from!.widget)?{widget:widgetOf(from!.widget)!}:{}),
          ...(text(from!.at)?{at:text(from!.at)}:{})}}:{}),
        ...(edges(entry.relatesTo).length?{relatesTo:edges(entry.relatesTo)}:{}),
        ...(worksOf(entry.works).length?{works:worksOf(entry.works)}:{}),
        ...((text(entry.words)||LEGACY_FORM[text(entry.form)]||text(entry.form))
          ?{words:text(entry.words)||LEGACY_FORM[text(entry.form)]||text(entry.form)}:{}),
        ...(text(entry.argument)?{argument:text(entry.argument)}:{})});
      continue;
    }
    if(entry.kind==='machined'){
      const body=text(entry.text);
      if(!body){unreadable++;continue;}
      notes.push({kind:'machined',section,text:body,
        ...(text(entry.id)?{id:text(entry.id)}:{}),
        ...(text(entry.fn)?{fn:text(entry.fn)}:{}),
        ...(text(entry.nodeId)?{nodeId:text(entry.nodeId)}:{}),
        ...(text(entry.workflowKey)?{workflowKey:text(entry.workflowKey)}:{}),
        ...(edges(entry.cites).length?{cites:edges(entry.cites)}:{}),
        ...(edges(entry.relatesTo).length?{relatesTo:edges(entry.relatesTo)}:{})});
      continue;
    }
    unreadable++;
  }
  return {notes,unreadable:unreadable+Math.max(0,(Array.isArray(raw)?raw.length:0)-MAX_NOTES)};
}

export interface NoteGroup {fn:string; notes:Note[]}
export interface PartGroup {section:WriteUpPart; groups:NoteGroup[]; count:number}

/** THE NOTES OF ONE PART, IN THE ORDER A PERSON PUT THEM.
 *
 *  The practitioner, 2026-10-29: *"In the Notes UI we should be able to move around notes within
 *  IMRaD sections."*
 *
 *  `groupNotes` sorts a part by what each note DOES, known functions first. That is a good default
 *  and a bad cage: it means a practitioner's own order has nowhere to live, because any arrangement
 *  they drag into is re-sorted by function on the next render. So order within a part is the order
 *  of the project's own list, and the function stays as a label on the card rather than a bracket
 *  that reorders around it.
 *
 *  Nothing is stored for this. A position IS an index in the list that already exists, which is why
 *  reordering needs no new field and why two orders cannot disagree. When it leaves, it leaves as
 *  `co:List` with `co:firstItem` and `co:nextItem` -- DoCO defines no sequence of its own, and the
 *  Collections Ontology is what it points at, so a published order is borrowed rather than coined. */
export const notesOfPart=(notes:readonly Note[],section:WriteUpPart):Note[]=>
  notes.filter(note=>note.section===section);

/** Move one note to sit immediately before another, within the whole list.
 *
 *  Returns a new list. `before` naming a note that is not there, or the note itself, puts it at the
 *  end of its part rather than failing: a drop past the last card is an ordinary gesture and
 *  refusing it would teach a practitioner that the bottom of a section is not a place. */
export function moveNote(notes:readonly Note[],moving:string,before:string|null,
  key:(note:Note)=>string):Note[]{
  const from=notes.findIndex(note=>key(note)===moving);
  if(from<0)return [...notes];
  const held=[...notes];
  const [note]=held.splice(from,1);
  const at=before?held.findIndex(n=>key(n)===before):-1;
  if(at<0){
    // The end of its OWN part, not the end of the list: a note dropped below the last card in
    // Methods belongs under Methods, not after the Discussion.
    const last=held.map(n=>n.section).lastIndexOf(note.section);
    held.splice(last+1,0,note);
  } else held.splice(at,0,note);
  return held;
}

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
    forkedFrom:{text:note.text,...(note.nodeId?{nodeId:note.nodeId}:{}),
      ...(note.widget?{widget:note.widget}:{}),...(at?{at}:{})}};
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
