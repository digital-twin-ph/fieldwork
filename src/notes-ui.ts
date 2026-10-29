import type {Escape} from './types.js';
import {element} from './dom.js';
import {groupNotes,noteExtent,forkHasDrifted,KNOWN_NOTE_FUNCTIONS,
  type Note,type MachinedNote} from './notes.js';

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

export interface NoteContext {
  /** What produced a note, for the link and for the modal's heading. */
  labelOf:(nodeId:string)=>string|undefined;
  machined:readonly MachinedNote[];
}

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
    const inPart=part.groups.flatMap(group=>group.notes);
    const extentOf=noteExtent(inPart);
    return `<section class="notes-part" data-section="${esc(part.section)}">`
      +`<h3>${esc(part.section)} <span class="muted">${part.count} note`
      +`${part.count===1?'':'s'} · ${extentOf.words.toLocaleString()} words</span>${add}</h3>`
      +`<div class="notes-drop" data-drop="${esc(part.section)}">`
      +part.groups.map(group=>group.notes.map(note=>{
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
          +(group.fn?`<span class="notes-fn">${esc(group.fn)}</span>`:'')
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
            :`<p>${esc(text)}</p>`
              +(note.kind==='derived'&&note.detail
                ?`<p class="muted">${esc(note.detail)}</p>`:''))
          +`<p class="len muted">${words(text)} words · ${text.length} chars</p>`
          +`</article>`;
      }).join('')).join('')
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
<p id="note-why" class="why"></p><div id="note-detail" class="panel"></div></div>
<div class="dlg-foot"><span id="note-count"></span>
<button id="note-close" class="button primary grow">Close</button></div></div></dialog>`;

/** WHY THIS NOTE MAY NOT BE EDITED, in terms of what it is.
 *
 *  Not one apology for every kind. A derived note restates a declaration, so editing it here
 *  detaches the citation from the input it cites while the receipt goes on asserting the input's
 *  own words. A quotation is somebody else's sentence. A machined note is an account of a
 *  computation, and editing one forks it rather than overwriting it -- the practitioner's rule of
 *  2026-10-29, which is why the sentence for that kind promises a fork rather than refusing. */
const WHY:Record<Note['kind'],(what:string)=>string>={
  derived:what=>`This note is derived: it restates what ${what} declares in its provenance. `
    +`Editing it here would detach the citation from the input it cites, and the receipt would `
    +`still assert the input’s own words. Change it at the input.`,
  machined:what=>`This note is machined: ${what} wrote it from the numbers it computed, and `
    +`rewrites it on every run. Editing it forks it into a note of your own carrying both `
    +`provenances — the computation and you. Not built yet.`,
  quoted:()=>'This note is quoted: the sentence is its author’s, carried verbatim with the '
    +'claim it establishes. An edited quotation is not a quotation, so there is nothing to change '
    +'here.',
  authored:()=>'This note is yours. Editing is not built yet.',
};

export function openNoteDialog(note:Note,context:NoteContext,esc:Escape){
  if(!document.querySelector('#note-dialog'))
    document.body.insertAdjacentHTML('beforeend',DIALOG);
  const dialog=element('#note-dialog') as HTMLDialogElement;
  const $=<S extends string>(s:S)=>element(s,dialog);
  const text=bodyOf(note);
  const fn=('fn' in note&&note.fn)||'';
  const from=('nodeId' in note&&note.nodeId)||undefined;
  $('#note-dialog-title').textContent=`Note — ${note.kind}`;
  // FIXED, AND SAID TO BE. A derived note's section and function are decided by what it restates,
  // not chosen here, and a control that looks adjustable and is not is worse than a label.
  $('#note-coords').innerHTML=`<span class="field"><label>IMRaD section</label>`
    +`<span class="fixed">${esc(note.section)} — fixed</span></span>`
    +`<span class="field"><label>Function</label>`
    +`<span class="fixed">${esc(fn||'unstated')}${fn?' — fixed':''}</span></span>`
    +(from?`<span class="field"><label>Produced by</label>`
      +`<span class="fixed">${esc(context.labelOf(from)||from)}</span></span>`:'');
  $('#note-gloss').textContent=fn&&FUNCTION_GLOSS[fn]
    ?`${fn} — ${FUNCTION_GLOSS[fn]}`
    :fn&&!KNOWN_NOTE_FUNCTIONS.includes(fn)
    ?`${fn} — a function this application does not name, kept as its author wrote it`:'';
  $('#note-body').textContent=text;
  $('#note-why').textContent=WHY[note.kind](
    from?context.labelOf(from)||from:'the step that produced it');
  $('#note-detail').innerHTML=note.kind==='quoted'&&note.establishes
    ?`<h4>Establishes</h4><p>${esc(note.establishes)}</p>`
    :note.kind==='derived'&&note.detail?`<h4>Detail</h4><p>${esc(note.detail)}</p>`:'';
  $('#note-count').textContent=`${words(text)} words · ${text.length} chars`;
  $('#note-close').onclick=()=>dialog.close();
  dialog.showModal();
}
