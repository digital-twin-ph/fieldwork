/** CHOOSING THE DESIGN, AND WHAT THE WRITE-UP CARRIES UNDER IT, in a dialog of its own.
 *
 *  The practitioner, 2026-10-31: *"a modal dialog should allow the user to select the study design
 *  and to unselect or select which computations to include downstream."* A declaration that
 *  decides what every computation downstream may report is not a field in a column of fields.
 *
 *  THE DESIGN PROPOSES AND THE PRACTITIONER DISPOSES. What a design cannot estimate gets no
 *  checkbox, because a box that could not act must not look like one. What it can estimate gets
 *  one, and unticking it withholds that measure from every surface and says so in the receipt.
 *
 *  EVERY DESIGN SHOWS ITS CONSEQUENCE BEFORE IT IS CHOSEN, which answers the doubt 154 carried: a
 *  practitioner unsure which design they have can decide by reading what each would license. */
import {DESIGN_LICENCES,STUDY_DESIGNS,includedMeasures,notEstimable} from './study-design.js';
import type {StudyDesign} from './study-design.js';
import type {Escape,ParamsByType} from './types.js';

type DesignParams=ParamsByType['study_design'];

/** The next params after a tick. `computations` stays absent while everything is ticked, so a
 *  design with no choice made reads as "all it licenses" rather than as a frozen list. */
export function withMeasure(params:DesignParams,measure:string,on:boolean):DesignParams{
  const licensed=DESIGN_LICENCES[params.design].estimates;
  const held=new Set(includedMeasures(params));
  if(on)held.add(measure);else held.delete(measure);
  const computations=licensed.filter(name=>held.has(name));
  const {computations:_dropped,...rest}=params;
  return computations.length===licensed.length?rest:{...rest,computations};
}

/** A new design starts from everything it licenses, since one design's choices name measures the
 *  next one may not have. */
export function withDesign(params:DesignParams,design:StudyDesign):DesignParams{
  const {computations:_dropped,...rest}=params;
  return {...rest,design};
}

export function designMarkup(params:DesignParams,esc:Escape):string{
  const licence=DESIGN_LICENCES[params.design];
  const included=includedMeasures(params);
  const measures=licence.estimates.map(name=>`<label class="check"><input type="checkbox" `
    +`data-design-measure="${esc(name)}" ${included.includes(name)?'checked':''}> ${esc(name)}`
    +`</label>`).join('');
  const refused=notEstimable(params.design);
  return `<div class="mapping-body"><p class="description">Declared and never inferred: four `
    +`counts look the same whichever study produced them, so only you can say which this is.</p>`
    +`<fieldset class="design-choices"><legend class="field-label">Study design</legend>`
    +STUDY_DESIGNS.map(value=>{
      const reach=DESIGN_LICENCES[value].estimates.join(', ')||'no comparison measure';
      return `<label class="design-choice"><input type="radio" name="design-kind" `
        +`value="${esc(value)}" ${params.design===value?'checked':''}> `
        +`<b>${esc(value)}</b> <span class="muted">${esc(reach)}</span></label>`;
    }).join('')+`</fieldset>`
    +`<p class="description">${esc(licence.because)}</p>`
    +`<fieldset class="design-measures"><legend class="field-label">Report downstream</legend>`
    +(measures||`<p class="description">This design licenses no comparison measure.</p>`)
    +`</fieldset>`
    +(refused.length?`<p class="description">Not estimable under ${esc(params.design)}: `
      +`${esc(refused.join(', '))}.</p>`:'')
    +(included.length<licence.estimates.length?`<p class="description">An unticked measure is `
      +`left out of the table, the note and the write-up, and the receipt records that it was `
      +`withheld.</p>`:'')
    +`</div>`;
}

/** Open the dialog. `onChange` gets the whole updated params, so the caller writes them through
 *  its own `change()` gate, the arrangement `openMappingDialog` keeps. */
export function openDesignDialog(params:DesignParams,esc:Escape,
  onChange:(next:DesignParams)=>void):void{
  const dialog=document.createElement('dialog');
  dialog.id='study-design-dialog';
  dialog.setAttribute('aria-labelledby','study-design-dialog-title');
  let current=params;
  const close=()=>{dialog.close();dialog.remove();};
  const apply=(next:DesignParams)=>{current=next;onChange(next);render();};
  function render(){
    dialog.innerHTML=`<div class="manual-head">`
      +`<h2 id="study-design-dialog-title">Study design, and what it reports</h2>`
      +`<div><button class="button primary" id="design-close">Done</button></div></div>`
      +designMarkup(current,esc);
    dialog.querySelector<HTMLButtonElement>('#design-close')!.onclick=close;
    dialog.querySelectorAll<HTMLInputElement>('[name="design-kind"]').forEach(radio=>{
      radio.onchange=()=>apply(withDesign(current,radio.value as StudyDesign));
    });
    dialog.querySelectorAll<HTMLInputElement>('[data-design-measure]').forEach(box=>{
      box.onchange=()=>apply(withMeasure(current,box.dataset.designMeasure!,box.checked));
    });
  }
  render();
  document.body.append(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.showModal();
}
