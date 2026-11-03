import {hasManual,openManual} from './manual.js';
import type {Escape} from './types.js';
import {element} from './dom.js';
import {toHTML,typeset,hasMarkup} from './prose.js';
import {groupNotes,notesOfPart,noteExtent,forkHasDrifted,KNOWN_NOTE_FUNCTIONS,UNWRITTEN,
  WRITE_UP_PARTS,type Note,type MachinedNote,type WriteUpPart} from './notes.js';
import {referenceCount,workKey,type ReferenceEntry} from './references.js';
import {CITATION_TYPES,citationGaps,renderCitation,type CitationType} from './input-provenance.js';
import {METHOD_CITATION_STYLE} from './equations.js';
import type {CitedWork} from './notes.js';

/** THE NOTES SURFACE, reaching for the Notes Board prototype.
 *
 *  `notes.ts` existed from 2026-10-28 and `app.ts` never imported it: notes were defined,
 *  produced, stored, grouped and counted where no practitioner could see one.
 *
 *  The practitioner, 2026-10-29, on the first version of this: *"The UI is not quite what it is
 *  in the prototype. The notes in the prototype are movable. Notes can be added, existing notes
 *  can be opened in a modal dialog, not editable yet. The one we built right now, very far from
 *  the original prototype."* All three are here now. Editing is not, and the modal says so in the
 *  words that belong to each kind rather than one apology for all of them.
 *
 *  WHAT A SECTION'S EMPTINESS MEANS is said where it is empty, which the prototype does and the
 *  first version did not: an Introduction holds background, related literature and purpose, and
 *  no workflow produces any of the three. Telling a practitioner *"no notes yet"* and stopping
 *  leaves them to wonder whether something failed. */

/** KEEP AN EDITED NOTE, which this module does not know how to do.
 *
 *  Returns whether it was kept. What kept means differs by kind and is the caller's business: an
 *  authored note is rewritten in place, and a machined one is forked, leaving the machined note
 *  for the next run to rewrite. The dialog's part is to say which of the two is about to happen
 *  before the button is pressed. */
export interface NoteDraft {text:string; section:WriteUpPart; fn:string; works?:CitedWork[]}
export type NoteWrite=(note:Note,draft:NoteDraft)=>boolean;

export interface NoteContext {
  /** What produced a note, for the link and for the modal's heading. */
  labelOf:(nodeId:string)=>string|undefined;
  machined:readonly MachinedNote[];
  /** Absent means the dialog is read-only for every kind. */
  write?:NoteWrite;
}

/** THE TWO KINDS SOMEBODY MAY WRITE, and the reason is the warrant each carries.
 *
 *  An authored note is ours. A machined note is a computation's account of itself, and editing
 *  one forks it rather than overwriting it -- the practitioner's rule of 2026-10-29. A quotation
 *  is somebody else's sentence and a derived note restates what an input declares, so neither
 *  has anything editable here; the place to change a derived note is the widget. */
/** WHICH WIDGET, THEN WHICH NODE OF IT. A label alone names the analysis and not the tool, so the
 *  widget comes first. A label left at the widget's own title is said once. */
export function producedBy(note:Note,label:string):string{
  const title=note.kind==='machined'?note.widget?.title:undefined;
  return !title||title===label?label:`${title} · ${label}`;
}

const EDITABLE:Partial<Record<Note['kind'],true>>={authored:true,machined:true};

/** Why a part has nothing in it, which differs by part and is not a failure in any of them. */
const EMPTINESS:Record<string,string>={
  References:'References gather themselves from what is cited: a source an input declares, a '
    +'method a computation uses, and a work a note cites from its Citations tab. Nothing has '
    +'cited anything yet. To add a work, cite it from the note that relies on it.',
  Introduction:'An introduction holds background, related literature and purpose — and no '
    +'workflow produces any of the three. All of it is the author’s to write.',
  Methods:'Methods fill themselves as inputs declare their sources and steps report what they '
    +'did. Nothing has yet.',
  Results:'A results section is mostly figures and tables, which this application makes as '
    +'artifacts rather than as prose. What belongs here is what the figures do not say.',
  Discussion:'A discussion is the author’s reading of the result, and the limitations the '
    +'run could not find for itself.',
};

/** What a function does for a reader, in a line. Shown in the modal beside the chip, because a
 *  one-word label is a filing code until somebody says what it files. */
const FUNCTION_GLOSS:Record<string,string>={
  context:'sets the world the data came from',
  rationale:'says why the study was done this way',
  source:'records where data came from',
  method:'says how something was measured or computed',
  verification:'records checking a source, and what was found',
  finding:'states what the work showed',
  limitation:'states what it cannot show',
};

const bodyOf=(note:Note)=>note.kind==='quoted'?note.quote:note.text;
const words=(text:string)=>text.split(/\s+/).filter(Boolean).length;

/** THE PANEL IS THE PROJECT'S WRITE-UP, not the open workflow's results.
 *
 *  `machined` and `derived` arrive FLAT and already carrying `workflowKey`, because a project's
 *  notes come from several workflows and a node id is unique only within one: South London has
 *  `table-viii` in three of its six, so a record keyed by node id would have silently dropped two
 *  of the three. `labelOf` and `sourceOf` are resolved per note for the same reason.
 *
 *  `sourceOf` returns the workflow a note came from, or undefined for the open one -- where the
 *  step chip already says it and repeating the workflow name would be noise. */
/** WHAT THIS WRITE-UP CAN DRAW, AND THE ONE BUTTON THAT CHANGES IT.
 *
 *  The practitioner, 2026-10-30: *"There is no Run Workflows button on the Notes tab."* And again
 *  on 2026-10-31, after a version that always rendered: *"Before Map 3 I still need the Run
 *  Workflows button at the top of the Notes tab."* Both reports were true of what they met, and
 *  the second is the more useful one, because the markup WAS there and the control was not.
 *
 *  THE SECOND REPORT WAS ABOUT RANK, NOT PRESENCE. What rendered was a sentence in muted 0.86rem
 *  with a `.button.small` set inside it, under a dimmed `.notes-pending` rule, filed below the
 *  counts and the description -- a footnote about running, in the place a footnote goes. A
 *  practitioner looking for a button found prose. So the control is now the first thing in the
 *  tab, a `.button.primary`, with the account of the write-up's state as the prose beside it
 *  rather than the prose it is buried in. Same handler, same behaviour, opposite reading order.
 *
 *  AND IT IS ONLY A BUTTON WHERE THERE IS SOMETHING TO RUN. Found on 2026-10-31 while looking for
 *  the button on the open `heat` example: a workflow in no project got
 *  "every workflow in this project has run in this session" -- said over a write-up with no
 *  project behind it, nothing run, and a handler that returned without acting, because the old
 *  control had two states for a surface with three. A control that cannot act must not look like
 *  one, and a surface must not report an absence as a completion.
 *
 *  PENDING MEANS "HAS NOT RUN IN THIS SESSION". The words of a write-up are KEPT and the figures
 *  are drawn from the run held in memory, so a write-up reopened the next morning has every note
 *  and no figure. The first version asked the STORE whether a workflow had contributed, found
 *  nothing pending, and offered no way out -- which is the state the practitioner met.
 *
 *  REPORTED AND NOT GRADED, which is 149's rule: no score, no completeness bar, no warning tone.
 *  A practitioner who has deliberately run two of six workflows is not doing anything wrong, and
 *  is told what the write-up currently holds rather than what it ought to. */
export interface RunState {
  /** Workflows of this project with no run in memory, named rather than counted.
   *
   *  NAMED AND CAPPED, which is `relate_table`'s rule for its gap keys: a count tells a
   *  practitioner nothing they can act on, and six long workflow names is a paragraph nobody
   *  reads. Three, then the remainder as a number. */
  pending:readonly string[];
  /** How many workflows the project holds at all, and 0 where the open workflow is in none. */
  total:number;
  /** WHY A NOTE CANNOT BE KEPT HERE, or null where one can.
   *
   *  The practitioner, 2026-10-31: *"we can gray out the + notes to make it clear notes cannot be
   *  added without a project."* Carried as the sentence rather than as a flag, because the two
   *  states that reach it are not the same fact -- an unfiled canvas has nowhere to keep a note,
   *  and a shipped example has a project that is not on this device to be written to -- and a
   *  practitioner who is told the wrong one goes looking for the wrong thing. */
  readOnly?:string|null;
}

const runControl=(state:RunState,esc:Escape):string=>{
  const {pending,total}=state;
  // THE REASON IS SAID ONCE, HERE, and the controls it disables carry it as their tooltip. A
  // disabled button is a fact ("not here") without an account ("because..."), and a practitioner
  // who meets ten of them and no sentence is worse off than before.
  const why=state.readOnly?`<p class="notes-readonly">${esc(state.readOnly)}</p>`:'';
  if(!total)
    return `<div class="notes-run is-absent">${why||`<p>This workflow is not in a project, so `
      +`this write-up holds its notes alone.</p>`}</div>`;
  if(!pending.length)
    return `<div class="notes-run is-ready">`
      +`<button class="button primary" data-run-pending>Run workflows again</button>`
      +`<p>All ${total} of this project's workflows have run in this session, so the tables, `
      +`charts and maps below are drawn from those runs. Running them again redraws them from `
      +`the data as it stands now.</p>${why}</div>`;
  const one=pending.length===1;
  const named=pending.slice(0,3).map(name=>esc(name)).join('; ')
    +(pending.length>3?`, and ${pending.length-3} more`:'');
  // RUNNING THEM IS A BUTTON AND NOT A SIDE EFFECT OF OPENING THE TAB. South London's six run in
  // 1.9 seconds, which made running them automatically tempting; a project with an isochrone or
  // a raster download is not 1.9 seconds, and each run switches the open canvas, which is the
  // run-in-flight hazard experiment 142 spent a day finding. So the practitioner asks.
  return `<div class="notes-run">`
    +`<button class="button primary" data-run-pending>Run workflows</button>`
    +`<p>${pending.length} of this project's ${total} workflows ${one?'has':'have'} not run in `
    +`this session, so ${one?'its':'their'} tables, charts and maps are not in this write-up `
    +`yet \u2014 ${named}.</p>${why}</div>`;
};

/** THE ASSEMBLED REFERENCES, above the author's own notes in the same part.
 *
 *  REPORTED AND NOT GRADED, which is 149's rule and the pending line's: the count says how many
 *  works and how many lines are a stated absence, and says nothing about whether that is enough.
 *  A write-up citing two sources is not failing at anything. */
const referenceBlock=(list:readonly ReferenceEntry[],esc:Escape):string=>{
  if(!list.length)return '';
  const {works,uncited}=referenceCount(list);
  return `<div class="notes-references">`
    +`<p class="muted">${works} work${works===1?'':'s'} cited`
    +(uncited?` · ${uncited} method${uncited===1?'':'s'} with no source read`:'')
    +`. Assembled from what the workflows declare and the works notes cite. Cite a work from its note.</p>`
    +`<ol>`+list.map(entry=>
      `<li class="notes-reference r-${entry.kind}${entry.uncited?' is-uncited':''}">`
      +`${esc(entry.text)}`
      // WHO CITES IT, because a work one workflow of six used is a different fact from one they
      // all used, and a practitioner setting notes aside for a venue needs to know which.
      +(entry.citedBy.length?`<span class="notes-source">${esc(entry.citedBy.join('; '))}</span>`
        :'')
      +`</li>`).join('')
    +`</ol></div>`;
};

export function notesPanel(notes:readonly Note[],
  machined:readonly MachinedNote[]|undefined,
  labelOf:(note:Note)=>string|undefined,esc:Escape,
  derived:readonly Note[]=[],
  sourceOf:(note:Note)=>string|undefined=()=>undefined,
  /** Which of this project's workflows can be drawn from, and how many there are to run. */
  run:RunState={pending:[],total:0},
  /** THE ARTIFACT A NOTE SPEAKS FOR, as markup, or nothing where there is none to draw.
   *
   *  Passed in rather than built here, because drawing a table means reaching into the run that
   *  produced it and this module renders notes. `write-up-figures.ts` owns the decision and the
   *  application owns the runs; the panel places what it is handed. */
  figureOf:(note:Note)=>string|undefined=()=>undefined,
  /** THE WORKS THE WORKFLOWS CITE, assembled by `references.ts` and rendered into the References
   *  part above whatever the author has written there. Not notes, and deliberately not editable:
   *  what a workflow cites is a fact about the investigation, and the author's own references
   *  are the notes beside it. */
  references:readonly ReferenceEntry[]=[]):string{
  const fromRun:Note[]=[...(machined||[])];
  const all=[...notes,...derived,...fromRun];
  const extent=noteExtent(all);
  const parts=groupNotes(all);
  const count=(kind:Note['kind'])=>all.filter(note=>note.kind===kind).length;

  // COUNTED BY KIND, as the prototype counts them. "14 notes" says how much there is; "9 derived,
  // 2 machined, 3 authored" says who wrote it, which is the question a reader of a write-up asks
  // about a sentence before any other.
  // THE CONTROL FIRST, which is where the practitioner asked for it twice. A toolbar goes at the
  // top of the surface it acts on; the counts and the description are what the tab contains, and
  // reading order put them ahead of the one thing a practitioner comes here to press.
  const head=runControl(run,esc)
    +`<div class="notes-head"><strong>Notes</strong>`
    +`<span class="muted">${extent.notes} note${extent.notes===1?'':'s'}`
    +(['derived','machined','authored','quoted'] as const)
      .map(kind=>count(kind)?` · ${count(kind)} ${kind}`:'').join('')
    +` · ${extent.words.toLocaleString()} words`
    +` · ${extent.characters.toLocaleString()} characters</span></div>`
    +`<p class="description">What survives into the write-up, in the order a reader meets it. `
    +`Quoted and authored notes belong to the investigation; derived and machined ones come from `
    +`the last run of each workflow in this project.</p>`;

  // THE MARKERS A NOTE'S WORKS GET, numbered as References lists them, so a work cited by two notes
  // carries one number in both. Placed at the end of the note's last paragraph.
  const numberOf=new Map<string,number>(references.flatMap((entry,at)=>entry.workKey?[[entry.workKey,at+1] as const]:[]));
  const cite=(html:string,note:Note)=>{
    const numbers=note.kind==='authored'?[...new Set((note.works??[]).map(w=>numberOf.get(workKey(w))).filter(Boolean))]:[];
    if(!numbers.length)return html;
    const marker=` <span class="notes-cite" data-cites="${numbers.join(',')}">[${numbers.join(', ')}]</span>`;
    const at=html.lastIndexOf('</p>');
    return at<0?html+marker:html.slice(0,at)+marker+html.slice(at);
  };
  let ordinal=0;
  // GRAYED OUT RATHER THAN GONE, which is the practitioner's ruling of 2026-10-31 and the better
  // reading of today's other rule. "A control that cannot act must not look like one" was applied
  // to the run control by REMOVING it, because the run control is one button and its absence is
  // itself the account. Ten "+ note" buttons are different: removing them would leave a board
  // that silently differs from every other project's, with no way to tell a surface that decided
  // against the control from one that never had it -- the very confusion the run control was
  // fixed for this morning. A disabled button says "here, and not for you", which is the truth,
  // and `title` says why on each one while `.notes-readonly` says it once at the top.
  const blocked=run.readOnly
    ? ` disabled title="${esc(run.readOnly)}" aria-disabled="true"`:'';
  const body=parts.map(part=>{
    // NO NOTES OF ITS OWN IN REFERENCES. The practitioner, 2026-11-02: *"A Reference entry is there because
    // there is an entry in the main body ... where provenance is known."* A work is cited from its note.
    const assembled=part.section==='References';
    const add=assembled?'':`<button class="button small" data-add-note="${esc(part.section)}"${blocked}>`
      +`+ note</button>`;
    const cited=part.section==='References'?referenceBlock(references,esc):'';
    if(!part.count&&!cited)return `<section class="notes-part is-empty" data-section="${esc(part.section)}">`
      +`<h3>${esc(part.section)} <span class="muted">nothing yet</span>${add}</h3>`
      +`<div class="notes-empty"><p class="muted">${esc(EMPTINESS[part.section]||'')}</p>`
      +(assembled?'':`<button class="button" data-add-note="${esc(part.section)}"${blocked}>`
      +`Add note to ${esc(part.section)}</button>`)+`</div></section>`;
    // IN THE ORDER A PERSON PUT THEM, not re-sorted by function on every render. The function
    // survives as the chip on the card; what it no longer does is bracket the part and undo a
    // practitioner's arrangement. See `notesOfPart`.
    const inPart=notesOfPart(all,part.section);
    const extentOf=noteExtent(inPart);
    return `<section class="notes-part" data-section="${esc(part.section)}">`
      +`<h3>${esc(part.section)} <span class="muted">${part.count} note`
      +`${part.count===1?'':'s'} · ${extentOf.words.toLocaleString()} words</span>${add}</h3>`
      +cited
      +`<div class="notes-drop" data-drop="${esc(part.section)}">`
      +inPart.map(note=>{
        const text=bodyOf(note);
        ordinal++;
        const id=noteKey(note);
        const from=note.kind==='machined'&&note.nodeId?note.nodeId
          :note.kind==='derived'&&note.nodeId?note.nodeId:undefined;
        // WHICH PART OF THE INVESTIGATION IT CAME FROM, for a note the open workflow did not
        // produce. A write-up assembled from six workflows is unreadable without it.
        const source=sourceOf(note);
        // AND THE CARD IS NOT DRAGGABLE EITHER. Moving a note between parts is kept by the same
        // call that keeps a new one, so a card that can be picked up and never put down is the
        // same false affordance one control further on -- and its refusal blames the note's kind,
        // which in this state is not the reason.
        return `<article class="notes-note k-${note.kind}" draggable="${run.readOnly?'false':'true'}" `
          +`data-note="${esc(id)}" data-section="${esc(part.section)}">`
          +`<div class="notes-labels">`
          +`<span class="ord">${ordinal}.</span>`
          +`<span class="notes-kind notes-kind-${note.kind}">${note.kind}</span>`
          +(('fn' in note&&note.fn)?`<span class="notes-fn">${esc(note.fn)}</span>`:'')
          +(from?`<button class="chip flowlink" data-open-node="${esc(from)}"`
            +`${'workflowKey' in note&&note.workflowKey
              ?` data-open-workflow="${esc(note.workflowKey)}"`:''}>`
            +`${esc(producedBy(note,labelOf(note)||from))}</button>`:'')
          +(source?`<span class="notes-source">${esc(source)}</span>`:'')
          +(note.kind==='authored'&&note.forkedFrom
            ?`<span class="notes-fork">edited from a machined note${note.forkedFrom.widget
              ?` by ${esc(note.forkedFrom.widget.title)}`:''}`
              +`${forkHasDrifted(note,fromRun as MachinedNote[])
                ?' · the run has moved since':''}</span>`:'')
          +`<button class="chip notes-open" data-note-open="${esc(id)}">open</button>`
          +`</div>`
          // THE FIGURE ABOVE THE WORDS, because a reader of a Results section meets the table and
          // then reads about it, and because the sentence under it was machined to be the
          // material for its caption. A note with no figure renders exactly as it did.
          +(figureOf(note)||'')
          +(note.kind==='quoted'
            ?`<blockquote>${esc(text)}</blockquote>`
              +(note.establishes?`<p class="muted">Establishes: ${esc(note.establishes)}</p>`:'')
            // READ AS MARKUP ONLY WHERE IT WAS WRITTEN. The kinds a practitioner may edit are
            // exactly the kinds whose asterisks and dollars are meant as markup; a quotation is
            // carried verbatim, and a derived note restates what somebody typed into a widget,
            // so neither is reinterpreted here.
            :EDITABLE[note.kind]&&text!==UNWRITTEN
            ?`<div class="prose">${cite(toHTML(text),note)}</div>`
            :`<p${text===UNWRITTEN?' class="unwritten"':''}>${esc(text)}</p>`
              +(note.kind==='derived'&&note.detail
                ?`<p class="muted">${esc(note.detail)}</p>`:''))
          +`<p class="len muted">${words(text)} words · ${text.length} chars</p>`
          +`</article>`;
      }).join('')
      +`</div></section>`;
  }).join('');

  return head+body;
}

/** A note's handle, stable enough to find it again in a list rebuilt from scratch.
 *
 *  SCOPED BY WORKFLOW where the note has one. An id of `table-viii:description` is unique within
 *  a workflow and not within a project, and the panel now holds a project's worth: two notes
 *  sharing a `data-note` attribute would make opening or dragging one of them act on the other. */
export function noteKey(note:Note):string{
  const scope='workflowKey' in note&&note.workflowKey?`${note.workflowKey}/`:'';
  if('id' in note&&note.id)return `${scope}${note.id}`;
  return `${scope}${note.kind}:${note.section}:${bodyOf(note).slice(0,40)}`;
}

const DIALOG=`<dialog id="note-dialog" aria-labelledby="note-dialog-title">
<div class="dlg"><div class="dlg-head"><h3 id="note-dialog-title">Note</h3>
<div id="note-coords" class="coords"></div><p id="note-gloss" class="gloss"></p></div>
<div class="dlg-body"><div id="note-body" class="readonly"></div>
<div id="note-toolbar" class="note-toolbar" role="toolbar" aria-label="Formatting" hidden>
<button type="button" class="chip" data-wrap="**" title="Bold"><strong>B</strong></button>
<button type="button" class="chip" data-wrap="*" title="Italic"><em>I</em></button>
<button type="button" class="chip" data-wrap="\`" title="Code">&lt;/&gt;</button>
<button type="button" class="chip" data-line="- " title="Bulleted list">&bull;&mdash;</button>
<button type="button" class="chip" data-line="1. " title="Numbered list">1.</button>
<button type="button" class="chip" data-line="&gt; " title="Quotation">&ldquo;</button>
<button type="button" class="chip" data-wrap="$" title="Formula, written in LaTeX">&fnof;(x)</button>
</div>
<div id="note-tabs" class="result-switch" role="tablist" hidden>
<button type="button" role="tab" data-note-tab="write" class="active">Write</button>
<button type="button" role="tab" data-note-tab="cite">Citations</button></div>
<div id="note-cite-panel" hidden></div>
<textarea id="note-text" class="note-text" rows="9" hidden
  aria-label="The note" spellcheck="true"></textarea>
<div id="note-preview" class="prose note-preview" hidden aria-live="polite"></div>
<p id="note-why" class="why"></p><p id="note-status" class="note-status" role="status"></p>
<div id="note-detail" class="panel"></div></div>
<div class="dlg-foot"><span id="note-count"></span>
<button id="note-close" class="button grow">Close</button>
<button id="note-save" class="button primary" hidden>Save</button></div></div></dialog>`;

/** WHAT WRITING IN HERE DOES, OR WHY THERE IS NOTHING TO WRITE, in terms of what the note is.
 *
 *  Not one sentence for every kind. A derived note restates a declaration, so editing it here
 *  detaches the citation from the input it cites while the receipt goes on asserting the input's
 *  own words. A quotation is somebody else's sentence. A machined note is an account of a
 *  computation, and editing one forks it rather than overwriting it -- the practitioner's rule of
 *  2026-10-29 -- so the sentence for that kind says what Save is about to do, before it is
 *  pressed. Two of the four promised "not built yet" until 2026-10-30. */
const WHY:Record<Note['kind'],(what:string)=>string>={
  derived:what=>`This note is derived: it restates what ${what} declares in its provenance. `
    +`Editing it here would detach the citation from the input it cites, and the receipt would `
    +`still assert the input’s own words. Change it at the input.`,
  machined:what=>`This note is machined: ${what} wrote it from the numbers it computed, and `
    +`rewrites it on every run. Saving an edit forks it into a note of your own carrying both `
    +`provenances — the computation and you — and leaves this one for the next run to rewrite.`,
  quoted:()=>'This note is quoted: the sentence is its author’s, carried verbatim with the '
    +'claim it establishes. An edited quotation is not a quotation, so there is nothing to change '
    +'here.',
  authored:()=>'This note is yours. What you write here is what the write-up says.',
};

export function openNoteDialog(note:Note,context:NoteContext,esc:Escape){
  if(!document.querySelector('#note-dialog'))
    document.body.insertAdjacentHTML('beforeend',DIALOG);
  const dialog=element('#note-dialog') as HTMLDialogElement;
  const $=<S extends string>(s:S)=>element(s,dialog);
  const text=bodyOf(note);
  const fn=('fn' in note&&note.fn)||'';
  const from=('nodeId' in note&&note.nodeId)||undefined;
  const widget=note.kind==='machined'?note.widget:note.kind==='authored'?note.forkedFrom?.widget:undefined;
  const writing=!!EDITABLE[note.kind]&&!!context.write;
  // A NOTE NOBODY HAS WRITTEN YET IS A NEW NOTE, and the dialog is where it is written, so it
  // says so and its button says "Add note" rather than "Save". The Notes Board prototype's own
  // wording, 2026-10-30.
  const fresh=note.kind==='authored'&&text===UNWRITTEN;
  // THE HANDLE, SHORTENED. An id is what another note points at, so it is worth showing -- but a
  // note somebody writes takes a UUID, and 36 characters of it in a heading is noise. A readable
  // id, like the example's own `snow-chloride-test`, is shown whole.
  const whole=('id' in note&&note.id)||'';
  const id=/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(whole)?whole.slice(0,8):whole;
  $('#note-dialog-title').innerHTML=`${fresh?'New note':'Note'} `
    +`<span class="muted">${esc(note.kind)}${id?` · ${esc(id)}`:''}</span>`;
  // CHOSEN FOR AN AUTHORED NOTE, FIXED FOR THE REST. A derived note's section and function are
  // decided by what it restates, a machined note's by the widget, and a quotation's by the claim
  // it establishes -- a control that looks adjustable and is not is worse than a label. An
  // authored note's are the author's, which is what the prototype's two drop-downs are for, and
  // the section one is a second door to what dragging the card already does.
  const choose=note.kind==='authored'&&writing;
  const options=(values:readonly string[],chosen:string,none:string)=>
    `<option value="">${esc(none)}</option>`
    +values.map(value=>`<option value="${esc(value)}"`
      +`${value===chosen?' selected':''}>${esc(value)}</option>`).join('');
  // A function this application does not name is KEPT as its author wrote it, and offered beside
  // the seven, rather than silently dropped by a drop-down that cannot represent it.
  const functions=KNOWN_NOTE_FUNCTIONS.includes(fn)||!fn
    ?KNOWN_NOTE_FUNCTIONS:[...KNOWN_NOTE_FUNCTIONS,fn];
  $('#note-coords').innerHTML=`<span class="field"><label>IMRaD section</label>`
    +(choose
      ?`<select id="note-section">${WRITE_UP_PARTS.filter(value=>value!=='References'||note.section==='References').map(value=>`<option value="${esc(value)}"`
        +`${value===note.section?' selected':''}>${esc(value)}</option>`).join('')}</select>`
      :`<span class="fixed">${esc(note.section)} — fixed</span>`)
    +`</span>`
    +`<span class="field"><label>Function</label>`
    +(choose
      ?`<select id="note-function">${options(functions,fn,'unstated')}</select>`
      :`<span class="fixed">${esc(fn||'unstated')}${fn?' — fixed':''}</span>`)
    +`</span>`
    +`<span class="field"><label>Produced by</label>`
    // SAID RATHER THAN LEFT BLANK. A note with no workflow behind it is a fact about the note --
    // it is the author's own, and nothing will rewrite it on the next run.
    +`<span class="fixed">${from?esc(producedBy(note,context.labelOf(from)||from))
      :'written here — no workflow'}${widget?` <span class="muted">${esc(widget.type)} ${esc(widget.version)}</span>`
        +(hasManual(widget.type)?` <button class="chip" id="note-widget-manual">Manual</button>`:''):''}</span></span>`;
  const manual=dialog.querySelector<HTMLButtonElement>('#note-widget-manual');
  if(manual&&widget)manual.onclick=()=>openManual(widget.type,widget.title,esc);
  const gloss=$('#note-gloss');
  const sayGloss=(which:string)=>{gloss.textContent=which&&FUNCTION_GLOSS[which]
    ?`${which} — ${FUNCTION_GLOSS[which]}`
    :which&&!KNOWN_NOTE_FUNCTIONS.includes(which)
    ?`${which} — a function this application does not name, kept as its author wrote it`
    :choose?'What this note does for a reader. Unstated is allowed.':'';};
  sayGloss(fn);
  $('#note-why').textContent=WHY[note.kind](
    from?context.labelOf(from)||from:'the step that produced it');
  $('#note-detail').innerHTML=note.kind==='quoted'&&note.establishes
    ?`<h4>Establishes</h4><p>${esc(note.establishes)}</p>`
    :note.kind==='derived'&&note.detail?`<h4>Detail</h4><p>${esc(note.detail)}</p>`:'';
  const status=$('#note-status');
  status.textContent='';
  status.classList.remove('is-failure');
  const area=$('#note-text') as HTMLTextAreaElement;
  const save=$('#note-save') as HTMLButtonElement;
  const close=$('#note-close') as HTMLButtonElement;
  const body=$('#note-body');
  const count=$('#note-count');
  const toolbar=$('#note-toolbar');
  const preview=$('#note-preview');
  toolbar.hidden=!writing;
  preview.hidden=true;
  body.hidden=writing;
  area.hidden=!writing;
  save.hidden=!writing;
  const tell=(of:string)=>{count.textContent=`${words(of)} words · ${of.length} chars`;};
  if(!writing){
    body.textContent=text;
    tell(text);
    close.textContent='Close';
  }else{
    const section=choose?$('#note-section') as HTMLSelectElement:null;
    const workFn=choose?$('#note-function') as HTMLSelectElement:null;
    // AN UNWRITTEN NOTE OPENS EMPTY. Its marker exists because `readNotes` drops a note with no
    // words, not because anybody wrote it, so presenting it as prose to delete first would make
    // the application's bookkeeping the practitioner's problem.
    const was=fresh?'':text;
    area.value=was;
    tell(area.value);
    save.textContent=fresh?'Add note':'Save';
    const unchanged=()=>area.value.trim()===was
      &&(!section||section.value===note.section)&&(!workFn||workFn.value===fn)
      &&JSON.stringify(works)===startedWith;
    // SAY WHAT LEAVING WOULD COST, once there is something to lose. A dialog whose only exit is
    // labelled "Close" discards an edit without ever having said so. A note being written for
    // the first time has nothing to go back to, so its exit is "Discard" throughout.
    const relabel=()=>{close.textContent=fresh?'Discard'
      :unchanged()?'Close':'Discard changes';};
    // WHAT IT WILL LOOK LIKE, while it is being written. Markdown with no preview is a format
    // somebody has to hold in their head, and a formula with no preview cannot be checked at all
    // -- which is the whole reason the formula is written here rather than pasted in finished.
    // Shown only once there is markup to read: for a note of plain prose it would be the same
    // words twice.
    const show=()=>{
      const marked=hasMarkup(area.value);
      preview.hidden=!marked;
      if(!marked){preview.innerHTML='';return;}
      preview.innerHTML=toHTML(area.value);
      void typeset(preview);
    };
    const touched=()=>{
      tell(area.value);
      status.textContent='';
      status.classList.remove('is-failure');
      relabel();
      show();
    };
    area.oninput=touched;
    show();
    // THE CITATION BUILDER, a tab of the note. A work is added from fields, checked by the same gaps the
    // inputs' citations are, and shown as it will print; the note's sentence carries no citation of its own.
    const works:CitedWork[]=note.kind==='authored'?structuredClone(note.works??[]):[];
    const startedWith=JSON.stringify(works);
    const tabs=$('#note-tabs'),panel=$('#note-cite-panel');
    tabs.hidden=note.kind!=='authored';
    const tab=(which:'write'|'cite')=>{
      tabs.querySelectorAll<HTMLButtonElement>('[data-note-tab]').forEach(b=>b.classList.toggle('active',b.dataset.noteTab===which));
      panel.hidden=which!=='cite';area.hidden=which==='cite';toolbar.hidden=which==='cite';
      if(which==='cite')drawCitations();else show();
      const label=tabs.querySelector<HTMLButtonElement>('[data-note-tab="cite"]');
      if(label)label.textContent=works.length?`Citations (${works.length})`:'Citations';
    };
    tabs.querySelectorAll<HTMLButtonElement>('[data-note-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.noteTab as 'write'|'cite'));
    const field=(id:string,label:string,value='',hint='')=>`<label class="field-label" for="${id}">${label}</label>`
      +`<input id="${id}" value="${esc(value)}"${hint?` placeholder="${esc(hint)}"`:''}>`;
    const read=(id:string)=>(panel.querySelector<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>(`#${id}`)?.value??'').trim();
    const draftWork=():CitedWork=>{
      const authors=read('cite-authors').split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{
        const comma=line.indexOf(',');
        return comma<0?{family:line,corporate:true}:{family:line.slice(0,comma).trim(),given:line.slice(comma+1).trim()};
      });
      const optional=(key:string,id:string)=>read(id)?{[key]:read(id)}:{};
      return {citation:{type:(read('cite-type')||'article') as CitationType,authors,title:read('cite-title'),
          ...optional('container','cite-container'),...optional('volume','cite-volume'),...optional('issue','cite-issue'),
          ...optional('pages','cite-pages'),...optional('publisher','cite-publisher'),...optional('place','cite-place'),
          ...optional('doi','cite-doi'),
          ...(panel.querySelector<HTMLInputElement>('#cite-et-al')?.checked?{etAl:true}:{})},
        published:read('cite-published'),...optional('url','cite-url'),...optional('retrieved','cite-retrieved')} as CitedWork;
    };
    const asProvenance=(w:CitedWork)=>({licence:'unstated' as const,citation:w.citation,published:w.published,
      ...(w.url?{url:w.url}:{}),...(w.retrieved?{retrieved:w.retrieved}:{})});
    const drawCitations=()=>{
      panel.innerHTML=(works.length?`<ol class="note-works">${works.map((w,i)=>`<li>${esc(renderCitation(asProvenance(w),METHOD_CITATION_STYLE)||w.citation.title)}`
          +` <button type="button" class="text-button" data-remove-work="${i}">Remove</button></li>`).join('')}</ol>`
          :'<p class="muted">No works cited. A work added here is marked on the note and listed in References.</p>')
        +`<div class="note-cite-form"><label class="field-label" for="cite-type">Kind of work</label><select id="cite-type">`
        +CITATION_TYPES.map(t=>`<option value="${t}">${t}</option>`).join('')+`</select>`
        +`<label class="field-label" for="cite-authors">Authors, one per line</label>`
        +`<textarea id="cite-authors" rows="3" placeholder="Utazi, C. Edson&#10;World Health Organization"></textarea>`
        +`<p class="muted">Family name, comma, given names. A line with no comma is an organisation.</p>`
        +`<label class="check"><input type="checkbox" id="cite-et-al"> The work names more authors than these (et al.)</label>`
        +field('cite-title','Title')+field('cite-published','Published','','2022 or 2022-11-26')
        +field('cite-container','Journal or containing work')
        +field('cite-volume','Volume')+field('cite-issue','Issue')+field('cite-pages','Pages')
        +field('cite-publisher','Publisher')+field('cite-place','Place')
        +field('cite-doi','DOI','','10.1016/j.vaccine.2022.11.026')+field('cite-url','URL')
        +field('cite-retrieved','Accessed','','2026-11-02')
        +`<p id="cite-preview" class="note-preview"></p><ul id="cite-gaps" class="quality-problems"></ul>`
        +`<button type="button" id="cite-add" class="button primary">Add citation</button></div>`;
      const check=()=>{
        const w=draftWork(),gaps=citationGaps(asProvenance(w));
        panel.querySelector('#cite-gaps')!.innerHTML=gaps.map(g=>`<li class="quality-problem">${esc(g)}</li>`).join('');
        panel.querySelector('#cite-preview')!.textContent=gaps.length?'':renderCitation(asProvenance(w),METHOD_CITATION_STYLE)||'';
        (panel.querySelector('#cite-add') as HTMLButtonElement).disabled=!!gaps.length;
      };
      panel.querySelectorAll('input,textarea,select').forEach(el=>el.addEventListener('input',check));
      panel.querySelector('#cite-type')!.addEventListener('change',check);
      panel.querySelector('#cite-et-al')!.addEventListener('change',check);
      check();
      (panel.querySelector('#cite-add') as HTMLButtonElement).onclick=()=>{
        const w=draftWork();if(citationGaps(asProvenance(w)).length)return;
        works.push(w);relabel();tab('cite');};
      panel.querySelectorAll<HTMLButtonElement>('[data-remove-work]').forEach(b=>b.onclick=()=>{
        works.splice(Number(b.dataset.removeWork),1);relabel();tab('cite');});
    };
    tab('write');
    // THE TOOLBAR WRITES MARKDOWN, rather than holding formatting of its own. A button wraps the
    // selection or starts the lines it covers, so what it produces is what somebody could have
    // typed -- and what is stored stays the text that was typed either way.
    toolbar.onclick=event=>{
      const pressed=(event.target as HTMLElement).closest('[data-wrap],[data-line]');
      if(!pressed)return;
      event.preventDefault();
      const start=area.selectionStart,end=area.selectionEnd;
      const chosen=area.value.slice(start,end);
      const wrap=pressed.getAttribute('data-wrap');
      if(wrap){
        // Nothing selected: the markers go in with the caret between them, ready to be typed in.
        area.value=area.value.slice(0,start)+wrap+chosen+wrap+area.value.slice(end);
        area.selectionStart=start+wrap.length;
        area.selectionEnd=start+wrap.length+chosen.length;
      }else{
        const prefix=pressed.getAttribute('data-line')||'';
        const from=area.value.lastIndexOf('\n',start-1)+1;
        const to=area.value.indexOf('\n',end);
        const until=to<0?area.value.length:to;
        const lines=area.value.slice(from,until).split('\n')
          .map((line,at)=>prefix==='1. '?`${at+1}. ${line}`:prefix+line);
        area.value=area.value.slice(0,from)+lines.join('\n')+area.value.slice(until);
        area.selectionStart=from;
        area.selectionEnd=from+lines.join('\n').length;
      }
      area.focus();
      touched();
    };
    if(section)section.onchange=touched;
    if(workFn)workFn.onchange=()=>{sayGloss(workFn.value);touched();};
    relabel();
    save.onclick=()=>{
      const written=area.value.trim();
      if(!written){
        // THE READER'S OWN RULE, said in its own terms rather than enforced silently. An empty
        // note does not survive the next open, so keeping one would be a promise this
        // application cannot hold.
        status.textContent='A note with no words is dropped when the project is reopened, so '
          +'there is nothing to keep. Write something, or close this and leave it unwritten.';
        status.classList.add('is-failure');
        area.focus();
        return;
      }
      if(unchanged()){dialog.close();return;}
      if(context.write!(note,{text:written,
        section:(section?section.value:note.section) as WriteUpPart,
        fn:workFn?workFn.value:fn,works}))dialog.close();
      else{
        status.textContent='That note could not be kept on this device.';
        status.classList.add('is-failure');
      }
    };
  }
  close.onclick=()=>dialog.close();
  dialog.showModal();
  if(writing)area.focus();
}
