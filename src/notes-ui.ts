import type {Escape} from './types.js';
import {groupNotes,noteExtent,WRITE_UP_PARTS,type Note,type MachinedNote} from './notes.js';

/** THE NOTES SURFACE. A SPIKE.
 *
 *  `notes.ts` has existed since 2026-10-28 and `app.ts` has never imported it: notes were defined,
 *  produced by `relate_table`, stored on the project, counted and grouped -- and no practitioner
 *  could see one. The module was built as the half a surface would sit on, and the surface was not
 *  built.
 *
 *  This is a spike, which means it answers questions rather than finishes a feature. What it is
 *  for: to find out whether the IMRAD body is the right spine for reading notes, whether the two
 *  kinds read together, and where this belongs. It is READ-ONLY. The practitioner's own spec from
 *  the prototype -- *"Each note should be editable as a modal dialog"* -- is not built here, and
 *  the empty-section button says so rather than pretending.
 *
 *  What it does honour, because those are already settled:
 *    - the body in IMRAD order, every part shown including the empty ones;
 *    - the function of each note as a label, which is the "colored labels" the prototype asked
 *      for, drawn from `KNOWN_NOTE_FUNCTIONS` and not invented here;
 *    - a machined note linking to the node that machined it, *"if produced by a workflow it
 *      should link to the workflow"*;
 *    - a running count of notes, words and characters.
 */
export function notesPanel(notes:readonly Note[],
  machined:Record<string,MachinedNote[]>|undefined,
  labelOf:(nodeId:string)=>string|undefined,esc:Escape):string{
  // THE PROJECT'S AND THE RUN'S, READ TOGETHER. A quoted sentence belongs to the investigation
  // and a machined one to the step that produced it; a write-up does not care which, so the
  // surface does not separate them. It says which is which on each note instead.
  const fromRun:Note[]=Object.entries(machined||{})
    .flatMap(([nodeId,list])=>list.map(note=>({...note,nodeId})));
  const all=[...notes,...fromRun];
  const extent=noteExtent(all);
  const parts=groupNotes(all);

  const head=`<div class="notes-head"><strong>Notes</strong>`
    +`<span class="muted">${extent.notes} note${extent.notes===1?'':'s'} · `
    +`${extent.words.toLocaleString()} words · `
    +`${extent.characters.toLocaleString()} characters</span></div>`
    +`<p class="description">What survives into the write-up, in the order a reader meets it. A `
    +`quoted note is an author’s own sentence; a machined note is this application’s `
    +`account of what it did to your numbers.</p>`;

  const body=parts.map(part=>{
    // AN EMPTY PART IS WHERE A NOTE GOES, which the prototype settled: *"In the UI, if there is
    // no notes under an IMRAD section, there should be an Add Notes button."* The button is here
    // and does nothing yet, and says which -- a control that looks live and is not is a worse
    // lie than a missing one.
    if(!part.count)return `<section class="notes-part is-empty">`
      +`<h3>${esc(part.section)}</h3>`
      +`<p class="muted">No notes yet. `
      +`<button class="button small" data-add-note="${esc(part.section)}" disabled>`
      +`Add a note</button> \u2014 not built yet.</p></section>`;
    return `<section class="notes-part"><h3>${esc(part.section)} `
      +`<span class="muted">${part.count}</span></h3>`
      +part.groups.map(group=>group.notes.map(note=>{
        const body=note.kind==='quoted'?note.quote:note.text;
        // WHERE IT COMES FROM, which differs by kind: a machined note names the node that wrote
        // it, an authored one names what it annotates. A quoted note's source is its citation,
        // which belongs to the reference list rather than to the card.
        const where=note.kind==='machined'&&note.nodeId
          ?`<span class="notes-source">from ${esc(labelOf(note.nodeId)||note.nodeId)}</span>`
          :note.kind==='authored'&&note.about
          ?`<span class="notes-source">on ${esc(labelOf(note.about)||note.about)}</span>`:'';
        return `<article class="notes-note">`
          +`<div class="notes-labels">`
          +`<span class="notes-kind notes-kind-${note.kind}">${note.kind}</span>`
          +(group.fn?`<span class="notes-fn">${esc(group.fn)}</span>`:'')
          +where+`</div>`
          +(note.kind==='quoted'
            ?`<blockquote>${esc(body)}</blockquote>`
              +(note.establishes?`<p class="muted">Establishes: ${esc(note.establishes)}</p>`:'')
            :`<p>${esc(body)}</p>`)
          +`</article>`;
      }).join('')).join('')
      +`</section>`;
  }).join('');

  // WHAT THIS SPIKE DOES NOT DO, said here rather than discovered. A surface that looks finished
  // and is not is worse than one that says where it stops.
  // WHAT THIS SPIKE DOES NOT DO, said here rather than discovered.
  const gap=`<p class="notice">A spike: notes can be read here and not yet written, edited or `
    +`added. Quoted and authored notes come from the project, machined ones from the last run. `
    +`Only an authored note would be editable here \u2014 a quotation is somebody else\u2019s `
    +`sentence, and a machined one is rewritten by running the workflow again.</p>`;
  return head+body+gap;
}

export const NOTES_PARTS=WRITE_UP_PARTS;
