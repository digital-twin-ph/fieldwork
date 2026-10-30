import type {Escape} from './types.js';
import {element} from './dom.js';
import {groupNotes,notesOfPart,noteExtent,forkHasDrifted,KNOWN_NOTE_FUNCTIONS,UNWRITTEN,
  WRITE_UP_PARTS,type Note,type MachinedNote,type WriteUpPart} from './notes.js';

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
export interface NoteDraft {text:string; section:WriteUpPart; fn:string}
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
const EDITABLE:Partial<Record<Note['kind'],true>>={authored:true,machined:true};

/** Why a part has nothing in it, which differs by part and is not a failure in any of them. */
const EMPTINESS:Record<string,string>={
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

export function notesPanel(notes:readonly Note[],
  machined:Record<string,MachinedNote[]>|undefined,
  labelOf:(nodeId:string)=>string|undefined,esc:Escape,
  derived:readonly Note[]=[]):string{
  const fromRun:Note[]=Object.entries(machined||{})
    .flatMap(([nodeId,list])=>list.map(note=>({...note,nodeId})));
  const all=[...notes,...derived,...fromRun];
  const extent=noteExtent(all);
  const parts=groupNotes(all);
  const count=(kind:Note['kind'])=>all.filter(note=>note.kind===kind).length;

  // COUNTED BY KIND, as the prototype counts them. "14 notes" says how much there is; "9 derived,
  // 2 machined, 3 authored" says who wrote it, which is the question a reader of a write-up asks
  // about a sentence before any other.
  const head=`<div class="notes-head"><strong>Notes</strong>`
    +`<span class="muted">${extent.notes} note${extent.notes===1?'':'s'}`
    +(['derived','machined','authored','quoted'] as const)
      .map(kind=>count(kind)?` · ${count(kind)} ${kind}`:'').join('')
    +` · ${extent.words.toLocaleString()} words`
    +` · ${extent.characters.toLocaleString()} characters</span></div>`
    +`<p class="description">What survives into the write-up, in the order a reader meets it. `
    +`Quoted and authored notes belong to the investigation; derived and machined ones come from `
    +`the last run of this workflow.</p>`;

  let ordinal=0;
  const body=parts.map(part=>{
    const add=`<button class="button small" data-add-note="${esc(part.section)}">`
      +`+ note</button>`;
    if(!part.count)return `<section class="notes-part is-empty" data-section="${esc(part.section)}">`
      +`<h3>${esc(part.section)} <span class="muted">nothing yet</span>${add}</h3>`
      +`<div class="notes-empty"><p class="muted">${esc(EMPTINESS[part.section]||'')}</p>`
      +`<button class="button" data-add-note="${esc(part.section)}">`
      +`Add note to ${esc(part.section)}</button></div></section>`;
    // IN THE ORDER A PERSON PUT THEM, not re-sorted by function on every render. The function
    // survives as the chip on the card; what it no longer does is bracket the part and undo a
    // practitioner's arrangement. See `notesOfPart`.
    const inPart=notesOfPart(all,part.section);
    const extentOf=noteExtent(inPart);
    return `<section class="notes-part" data-section="${esc(part.section)}">`
      +`<h3>${esc(part.section)} <span class="muted">${part.count} note`
      +`${part.count===1?'':'s'} · ${extentOf.words.toLocaleString()} words</span>${add}</h3>`
      +`<div class="notes-drop" data-drop="${esc(part.section)}">`
      +inPart.map(note=>{
        const text=bodyOf(note);
        ordinal++;
        const id=noteKey(note);
        const from=note.kind==='machined'&&note.nodeId?note.nodeId
          :note.kind==='derived'&&note.nodeId?note.nodeId:undefined;
        return `<article class="notes-note k-${note.kind}" draggable="true" `
          +`data-note="${esc(id)}" data-section="${esc(part.section)}">`
          +`<div class="notes-labels">`
          +`<span class="ord">${ordinal}.</span>`
          +`<span class="notes-kind notes-kind-${note.kind}">${note.kind}</span>`
          +(('fn' in note&&note.fn)?`<span class="notes-fn">${esc(note.fn)}</span>`:'')
          +(from?`<button class="chip flowlink" data-open-node="${esc(from)}">`
            +`${esc(labelOf(from)||from)}</button>`:'')
          +(note.kind==='authored'&&note.forkedFrom
            ?`<span class="notes-fork">edited from a machined note`
              +`${forkHasDrifted(note,fromRun as MachinedNote[])
                ?' · the run has moved since':''}</span>`:'')
          +`<button class="chip notes-open" data-note-open="${esc(id)}">open</button>`
          +`</div>`
          +(note.kind==='quoted'
            ?`<blockquote>${esc(text)}</blockquote>`
              +(note.establishes?`<p class="muted">Establishes: ${esc(note.establishes)}</p>`:'')
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

/** A note's handle, stable enough to find it again in a list rebuilt from scratch. */
export function noteKey(note:Note):string{
  if('id' in note&&note.id)return note.id;
  return `${note.kind}:${note.section}:${bodyOf(note).slice(0,40)}`;
}

const DIALOG=`<dialog id="note-dialog" aria-labelledby="note-dialog-title">
<div class="dlg"><div class="dlg-head"><h3 id="note-dialog-title">Note</h3>
<div id="note-coords" class="coords"></div><p id="note-gloss" class="gloss"></p></div>
<div class="dlg-body"><div id="note-body" class="readonly"></div>
<textarea id="note-text" class="note-text" rows="9" hidden
  aria-label="The note" spellcheck="true"></textarea>
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
      ?`<select id="note-section">${WRITE_UP_PARTS.map(value=>`<option value="${esc(value)}"`
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
    +`<span class="fixed">${from?esc(context.labelOf(from)||from)
      :'written here — no workflow'}</span></span>`;
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
      &&(!section||section.value===note.section)&&(!workFn||workFn.value===fn);
    // SAY WHAT LEAVING WOULD COST, once there is something to lose. A dialog whose only exit is
    // labelled "Close" discards an edit without ever having said so. A note being written for
    // the first time has nothing to go back to, so its exit is "Discard" throughout.
    const relabel=()=>{close.textContent=fresh?'Discard'
      :unchanged()?'Close':'Discard changes';};
    const touched=()=>{
      tell(area.value);
      status.textContent='';
      status.classList.remove('is-failure');
      relabel();
    };
    area.oninput=touched;
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
        fn:workFn?workFn.value:fn}))dialog.close();
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
