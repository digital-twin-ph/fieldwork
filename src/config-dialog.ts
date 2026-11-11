/** ONE CONFIGURATION DIALOG, the same for every widget that has settings (experiment 186).
 *
 *  The practitioner, 2026-11-07: *"The Inspector modal dialog also has to have a consistent look, feel and behavior
 *  to it."* Counted that day: 24 dialogs, headed four ways, closed with four different words. So a widget's settings
 *  open in this, and this alone decides the heading, the close control, the order of the sections, where a message
 *  goes, the footer and what Escape does. A widget supplies what is inside the sections and what Apply writes.
 *
 *  Nothing reaches the workflow until Apply. The widget edits a draft; Cancel, × and Escape leave the step as it was,
 *  and ask first when the draft differs from what the step holds. */
import type {Escape} from './types.js';

export interface ConfigMessage {tone:'warning'|'refusal'; text:string}
export interface ConfigSections {
  /** What the step uses: its choices. */
  settings:string;
  /** What it will do, with these settings, to this data. */
  preview?:string;
  /** Anything the step will not decide for the person. */
  decisions?:string;
  /** One message, above the footer, saying what to change. */
  message?:ConfigMessage;
  /** Apply is disabled while this is set, and the reason is the message. */
  blocked?:boolean;
}
export interface ConfigDialog<D> {
  /** The dialog element's id, so a test and a manual can name it. */
  id:string;
  /** The widget's name, then the step's own: "Relate a column from another table · Terra LST". */
  widget:string; step:string;
  draft:D;
  sections:(draft:D)=>ConfigSections;
  /** Connects the controls inside the sections. `redraw` rebuilds them from the draft. */
  wire:(root:HTMLElement,draft:D,redraw:()=>void)=>void;
  apply:(draft:D)=>void;
  /** AN APPLY THAT TAKES TIME AND CAN FAIL: a read of a file (the Polygon layer, 2026-11-11). The dialog stays open while
   *  it runs, saying what it is doing through `say`; it closes when this resolves true, and stays open, its controls
   *  usable, when it resolves false or throws, with the reason as its message. Used instead of `apply` when given. */
  applyAsync?:(draft:D,say:(text:string)=>void)=>Promise<boolean>;
  /** Called when the dialog closes without Apply: Cancel, ×, Escape or Discard. */
  onClose?:()=>void;
  /** Called before every rebuild of the sections, and before the dialog closes either way: release what `wire` mounted
   *  (Map's preview, a Leaflet map) while its box is still in the page. */
  beforeRedraw?:()=>void;
  /** A PUBLISHED THING SHOWN, NOT EDITED (experiment 192): every control disabled, and the footer is one Close. */
  readOnly?:boolean;
  /** Wider than a setting needs, for a body that is itself a form: the rules dialog. */
  wide?:boolean;
}

export const CONFIG_APPLY='config-apply', CONFIG_CANCEL='config-cancel', CONFIG_CLOSE='config-close';

export function openConfigDialog<D>(spec:ConfigDialog<D>,esc:Escape):void{
  document.getElementById(spec.id)?.remove();
  const dialog=document.createElement('dialog');
  dialog.id=spec.id;
  dialog.className=`config-dialog${spec.wide?' config-dialog-wide':''}`;
  dialog.setAttribute('aria-labelledby',`${spec.id}-title`);
  const draft:D=structuredClone(spec.draft);
  const held=JSON.stringify(spec.draft);
  let confirming=false;
  const changed=()=>JSON.stringify(draft)!==held;
  let applied=false;
  const close=()=>{spec.beforeRedraw?.();dialog.close();dialog.remove();if(!applied)spec.onClose?.();};
  const requestClose=()=>{if(changed()&&!confirming){confirming=true;draw();return;}close();};

  const section=(name:string,body?:string)=>body
    ?`<section class="config-section" data-config-section="${name.toLowerCase()}"><h3>${name}</h3>${body}</section>`:'';

  // THE FRAME IS BUILT ONCE: heading, body, message and footer. Only the body and the message are rebuilt, so a text
  // box that commits on blur cannot replace the Apply button between the press and the click.
  dialog.innerHTML=`<header class="config-head"><h2 id="${spec.id}-title">${esc(spec.widget)}`
    +`<span class="config-step"> · ${esc(spec.step)}</span></h2>`
    +`<button class="config-close" id="${CONFIG_CLOSE}" aria-label="Close">×</button></header>`
    +'<div class="config-body"></div><div class="config-message-slot"></div>'
    +(spec.readOnly
      ?`<footer class="config-foot"><button class="button primary" id="${CONFIG_CANCEL}">Close</button>`
        +`<button class="button primary" id="${CONFIG_APPLY}" hidden>Apply</button></footer>`
      :`<footer class="config-foot"><button class="button" id="${CONFIG_CANCEL}">Cancel</button>`
        +`<button class="button primary" id="${CONFIG_APPLY}">Apply</button></footer>`);
  const body=dialog.querySelector<HTMLElement>('.config-body')!;
  const slot=dialog.querySelector<HTMLElement>('.config-message-slot')!;
  const applyButton=dialog.querySelector<HTMLButtonElement>(`#${CONFIG_APPLY}`)!;
  dialog.querySelector<HTMLButtonElement>(`#${CONFIG_CLOSE}`)!.onclick=requestClose;
  dialog.querySelector<HTMLButtonElement>(`#${CONFIG_CANCEL}`)!.onclick=requestClose;
  const cancelButton=dialog.querySelector<HTMLButtonElement>(`#${CONFIG_CANCEL}`)!;
  applyButton.onclick=async()=>{
    if(applyButton.disabled||spec.readOnly)return;
    if(!spec.applyAsync){applied=true;spec.apply(draft);close();return;}
    const say=(text:string,tone:'info'|'failure'='info')=>{slot.innerHTML=text
      ?`<div class="config-message config-message-${tone}" role="${tone==='failure'?'alert':'status'}"><p>${esc(text)}</p></div>`:'';};
    applyButton.disabled=true;cancelButton.disabled=true;const was=applyButton.textContent;applyButton.textContent='Working\u2026';
    try{
      if(await spec.applyAsync(draft,text=>say(text))){applied=true;close();return;}
    }catch(error){say(error instanceof Error?error.message:String(error),'failure');}
    applyButton.textContent=was;applyButton.disabled=false;cancelButton.disabled=false;
  };

  function draw(){
    // WHERE THE PERSON WAS, kept across the rebuild: the element with focus by id, and the caret in a text box.
    const active=document.activeElement as HTMLInputElement|null;
    const focusId=active&&body.contains(active)?active.id:'';
    const caret=focusId&&typeof active?.selectionStart==='number'?active.selectionStart:null;
    const scroll=body.scrollTop;

    spec.beforeRedraw?.();
    const parts=spec.sections(draft);
    body.innerHTML=section('Settings',parts.settings)+section('Preview',parts.preview)+section('Decisions',parts.decisions);
    slot.innerHTML=confirming
      ?`<div class="config-message config-message-warning" role="alert"><p>These changes are not applied. Discard them?</p>`
        +`<div class="config-message-actions"><button class="button" id="config-keep-editing">Keep editing</button>`
        +`<button class="button danger" id="config-discard">Discard changes</button></div></div>`
      :parts.message
        ?`<div class="config-message config-message-${parts.message.tone}" role="alert"><p>${esc(parts.message.text)}</p></div>`
        :'';
    applyButton.disabled=!!parts.blocked||confirming;
    const keep=slot.querySelector<HTMLButtonElement>('#config-keep-editing');
    if(keep){keep.onclick=()=>{confirming=false;draw();};keep.focus();}
    const discard=slot.querySelector<HTMLButtonElement>('#config-discard');
    if(discard)discard.onclick=close;
    spec.wire(body,draft,()=>{confirming=false;draw();});
    // READ ONLY: shown exactly as it would be edited, every control disabled and nothing to add or remove.
    if(spec.readOnly){body.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea')
      .forEach(el=>{el.disabled=true;});body.querySelectorAll('button[data-part],button[data-editor-add]').forEach(el=>el.remove());}

    body.scrollTop=scroll;
    if(focusId&&!confirming){
      const again=body.querySelector<HTMLInputElement>(`#${CSS.escape(focusId)}`);
      if(again){again.focus();if(caret!==null&&typeof again.setSelectionRange==='function'){
        try{again.setSelectionRange(caret,caret);}catch{/* a select or number box has no caret */}}}
    }
  }

  draw();
  document.body.append(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();requestClose();});
  dialog.showModal();
  // OPENS ON THE FIRST SETTING, not on ×: a keyboard user starts where the work is.
  dialog.querySelector<HTMLElement>('[data-config-section="settings"] :is(select,input,textarea,button):not([disabled])')?.focus();
}
