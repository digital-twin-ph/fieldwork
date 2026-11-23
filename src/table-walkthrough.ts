/** A TABLE STEP SHOWN ON A SMALL EXAMPLE (experiment 223), the player every table widget's walkthrough shares, and since
 *  2026-11-20 every spatial one: a step may carry a drawing, beside the tables where it has any (2026-11-21).
 *
 *  Back, Step and Play; it never starts by itself. Each step is one sentence, said to a screen reader too, and the rows
 *  it is about are outlined and labelled in words, never by colour alone. The result table fills as the steps go. A row
 *  moves or fades over a fraction of a second; with reduced motion asked for, nothing moves and each step is drawn as
 *  it ends. Headed "Made-up example", because nothing here is the person's data. */
import type {Escape} from './types.js';

export interface WalkTable {label:string; columns:string[]; rows:string[][]}
export type MarkState='looking'|'matched'|'unmatched'|'kept'|'several'|'stopped'|'unused';
export interface WalkMark {table:number; row:number; state:MarkState; word:string}
export interface WalkStep {
  text:string;
  /** Rows of the input tables this step is about, each with the word saying what happened to it. */
  marks:WalkMark[];
  /** Rows this step adds to the result. On the final step, the whole result as the step itself made it. */
  result?:string[][];
  final?:boolean;
  /** The step stops here: no table is made, so the result shows none, not the rows before it. */
  stopped?:boolean;
  /** A problem found so far will stop the step once every row is checked: no table will come out. */
  willStop?:boolean;
  /** A SPATIAL STEP'S DRAWING (2026-11-20), in place of the result table and beside the input tables: made here from fixed shapes, never from a person's data.
   *  `key` says in words what each kind of line in it is, so nothing is told by colour alone. */
  figure?:{svg:string;key:string[]};
}
export interface Walkthrough {title:string; tables:WalkTable[]; resultColumns:string[]; steps:WalkStep[]}

const SHAPE:Record<MarkState,string>={looking:'›',matched:'✓',unmatched:'✕',kept:'+',several:'≡',stopped:'■',unused:'–'};

/** The walkthrough at one step, as markup: the input tables with this step's rows marked, the result so far, the sentence. */
export function walkthroughMarkup(walk:Walkthrough,at:number,esc:Escape):string{
  const step=walk.steps[at]!;
  const tableHtml=(t:WalkTable,ti:number)=>`<figure class="walk-table"><figcaption>${esc(t.label)}</figcaption><table><thead><tr>`
    +t.columns.map(c=>`<th scope="col">${esc(c)}</th>`).join('')+'<th scope="col"><span class="visually-hidden">This step</span></th></tr></thead><tbody>'
    +t.rows.map((r,ri)=>{const m=step.marks.find(x=>x.table===ti&&x.row===ri);
      return `<tr${m?` class="walk-${m.state}" data-walk-state="${m.state}"`:''}>`+r.map(c=>`<td>${esc(c)}</td>`).join('')
        +`<td class="walk-word">${m?`<span aria-hidden="true">${SHAPE[m.state]}</span> ${esc(m.word)}`:''}</td></tr>`;}).join('')
    +'</tbody></table></figure>';
  // A DRAWING, WITH ITS TABLE BESIDE IT where the step has one (2026-11-21: Join's showed the study area and never the
  // table joined to it, so which row went where could not be seen).
  if(step.figure)return `<p class="walk-made-up">Made-up example</p><div class="walk-tables walk-with-figure">${walk.tables.map(tableHtml).join('')}`
    +`<figure class="walk-figure">${step.figure.svg}`
    +`<figcaption><ul class="walk-key">${step.figure.key.map(k=>`<li>${esc(k)}</li>`).join('')}</ul></figcaption></figure></div>`
    +`<p class="walk-say" aria-live="polite"><span class="walk-count">Step ${at+1} of ${walk.steps.length}.</span> ${esc(step.text)}</p>`;
  // THE RESULT SO FAR: every row the steps up to this one added, the newest marked; the final step replaces them with the step's own table.
  const final=walk.steps.slice(0,at+1).reverse().find(s=>s.final&&s.result);
  const so:{row:string[];fresh:boolean}[]=final?final.result!.map(row=>({row,fresh:at===walk.steps.indexOf(final)}))
    :walk.steps.slice(0,at+1).flatMap((s,si)=>(s.result??[]).map(row=>({row,fresh:si===at})));
  if(step.stopped||step.willStop)return `<p class="walk-made-up">Made-up example</p><div class="walk-tables">${walk.tables.map(tableHtml).join('')}`
    +`<figure class="walk-table walk-result"><figcaption>The result</figcaption><p class="walk-none"><span aria-hidden="true">■</span> `
    +(step.stopped?'No table: the step stops here, so nothing is passed on to the next step.'
      :'No table will come out: the step will stop once every row is checked.')+`</p></figure></div>`
    +`<p class="walk-say" aria-live="polite"><span class="walk-count">Step ${at+1} of ${walk.steps.length}.</span> ${esc(step.text)}</p>`;
  const result=`<figure class="walk-table walk-result"><figcaption>The result${final?'':' so far'}</figcaption><table><thead><tr>`
    +walk.resultColumns.map(c=>`<th scope="col">${esc(c)}</th>`).join('')+'</tr></thead><tbody>'
    +(so.length?so.map(({row,fresh})=>`<tr${fresh?' class="walk-fresh"':''}>${row.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')
      :`<tr><td colspan="${walk.resultColumns.length}" class="muted">No rows yet.</td></tr>`)
    +'</tbody></table></figure>';
  return `<p class="walk-made-up">Made-up example</p><div class="walk-tables">${walk.tables.map(tableHtml).join('')}${result}</div>`
    +`<p class="walk-say" aria-live="polite"><span class="walk-count">Step ${at+1} of ${walk.steps.length}.</span> ${esc(step.text)}</p>`;
}

/** Opens the walkthrough over the dialog it was asked from, at its first step. */
/** `from` is the control that opened it, which gets focus back: Safari does not focus a button on a click. */
export function openWalkthrough(walk:Walkthrough,esc:Escape,from?:HTMLElement):void{
  document.getElementById('table-walkthrough')?.remove();
  // A MODAL OF ITS OWN, so it stands above the Configure… dialog it was opened from, which is modal too.
  const box=document.createElement('dialog');
  box.id='table-walkthrough';box.setAttribute('aria-labelledby','walk-title');
  const back=from??document.activeElement as HTMLElement|null;
  let at=0,timer:ReturnType<typeof setInterval>|undefined;
  const still=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stop=()=>{if(timer){clearInterval(timer);timer=undefined;}};
  const draw=()=>{
    box.innerHTML=`<div class="walk-panel${still()?' walk-still':''}"><div class="walk-head"><h2 id="walk-title">${esc(walk.title)}</h2>`
      +`<button class="button" data-walk-close>Close</button></div>`
      +`<div class="walk-body">${walkthroughMarkup(walk,at,esc)}</div>`
      +`<div class="walk-controls"><button class="button" data-walk-back${at===0?' disabled':''}>Back</button>`
      +`<button class="button primary" data-walk-step${at===walk.steps.length-1?' disabled':''}>Step</button>`
      +`<button class="button" data-walk-play aria-pressed="${timer?'true':'false'}"${at===walk.steps.length-1?' disabled':''}>${timer?'Pause':'Play'}</button>`
      +`<button class="button" data-walk-start${at===0?' disabled':''}>Start again</button></div></div>`;};
  const go=(to:number)=>{at=Math.max(0,Math.min(walk.steps.length-1,to));if(at===walk.steps.length-1)stop();draw();};
  const close=()=>{stop();if(box.open)box.close();box.remove();back?.focus();};
  box.addEventListener('click',event=>{
    const t=event.target as HTMLElement;
    if(t.closest('[data-walk-close]'))return close();
    if(t.closest('[data-walk-back]')){stop();go(at-1);box.querySelector<HTMLElement>('[data-walk-back]:not([disabled])')?.focus();}
    else if(t.closest('[data-walk-step]')){stop();go(at+1);(box.querySelector<HTMLElement>('[data-walk-step]:not([disabled])')??box.querySelector<HTMLElement>('[data-walk-start]'))?.focus();}
    else if(t.closest('[data-walk-start]')){stop();go(0);box.querySelector<HTMLElement>('[data-walk-step]')?.focus();}
    else if(t.closest('[data-walk-play]')){
      if(timer)stop();else timer=setInterval(()=>go(at+1),2200);
      draw();box.querySelector<HTMLElement>('[data-walk-play]')?.focus();
    }
  });
  box.addEventListener('cancel',event=>{event.preventDefault();event.stopPropagation();close();});
  document.body.append(box);draw();box.showModal();
  box.querySelector<HTMLElement>('[data-walk-step]')?.focus();
}

/** THE BUTTON EVERY CONFIGURE… OFFERS, and what it opens: the walkthrough made from the draft as it stands when pressed. */
export const SHOW_ME='<p><button type="button" class="button" data-show-me>Show me how it works</button></p>';
export function showMeIn(root:ParentNode,esc:Escape,walk:()=>Walkthrough):void{
  root.querySelector<HTMLButtonElement>('[data-show-me]')?.addEventListener('click',event=>openWalkthrough(walk(),esc,event.currentTarget as HTMLElement));
}
