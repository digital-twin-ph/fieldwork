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
import {answerSentence,chosenOption,designQuestions,slotsIn,DESIGN_TABLES,TABLE_QUANTITIES,tableSentences} from './study-design-questions.js';
import type {DeclaredTable,DesignQuestion} from './study-design-questions.js';
import type {ChecklistItem} from './study-design-checklist.js';
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

/** One answer changed. Answers are kept across a design change, so nothing typed here is lost by
 *  trying another design and coming back. */
export function withAnswer(params:DesignParams,questionId:string,option:string):DesignParams{
  const fills=params.answers?.[questionId]?.fills;
  return {...params,answers:{...params.answers,[questionId]:{option,...(fills?{fills}:{})}}};
}
export function withFill(params:DesignParams,questionId:string,slot:string,value:string):DesignParams{
  const answer=params.answers?.[questionId];
  if(!answer)return params;
  return {...params,answers:{...params.answers,
    [questionId]:{...answer,fills:{...answer.fills,[slot]:value}}}};
}

function questionMarkup(q:DesignQuestion,params:DesignParams,esc:Escape):string{
  const answer=params.answers?.[q.id],option=chosenOption(q,answer);
  const sentence=answerSentence(q,answer);
  const blanks=option?.sentence?slotsIn(option.sentence):[];
  return `<fieldset class="design-question" data-question="${esc(q.id)}">`
    +`<legend class="field-label">${esc(q.text)}</legend>`
    +q.options.map(o=>`<label class="design-choice"><input type="radio" name="answer-${esc(q.id)}" `
      +`data-answer="${esc(q.id)}" value="${esc(o.id)}" ${o.id===option?.id?'checked':''}> `
      +`<span>${esc(o.label)}</span></label>`).join('')
    +(option?.caveat?`<p class="description design-caveat">${esc(option.caveat)}</p>`:'')
    +blanks.map(slot=>`<label class="design-slot"><span>${esc(slot)}</span><input type="text" `
      +`data-slot="${esc(slot)}" data-slot-question="${esc(q.id)}" maxlength="240" `
      +`value="${esc(answer?.fills?.[slot]??'')}"></label>`).join('')
    +(sentence?`<p class="description design-sentence">${esc(sentence)}</p>`:'')
    +`</fieldset>`;
}

export function withTableField(params:DesignParams,field:keyof DeclaredTable,value:string):DesignParams{
  return {...params,table:{...params.table,[field]:value}};
}
export function withTableSource(params:DesignParams,key:string,value:string):DesignParams{
  return {...params,table:{...params.table,sources:{...params.table?.sources,[key]:value}}};
}

const tableField=(field:string,label:string,value:string|undefined,esc:Escape)=>
  `<label class="design-slot"><span>${esc(label)}</span><input type="text" maxlength="120" `
  +`data-table-field="${field}" value="${esc(value??'')}"></label>`;

/** THE TABLE PAGE. Named in the practitioner's words, then each quantity gets its own source,
 *  because a numerator and its denominator often come from different places. */
export function tablePageMarkup(params:DesignParams,esc:Escape):string{
  const shape=DESIGN_TABLES[params.design]!,table=params.table;
  const name=(field:keyof DeclaredTable,blank:string)=>
    `<span data-table-show="${String(field)}">${esc(String(table?.[field]??'')||blank)}</span>`;
  const fixed=shape.fixed==='rows'?' class="design-fixed" title="Fixed by the study"':'';
  return `<div class="mapping-body"><section id="design-table"><h3>The table this ${esc(params.design)} study is about</h3>`
    +`<p class="description">${esc(shape.note)}</p>`
    +`<div class="mapping-grid">`
    +tableField('exposed','Exposed',table?.exposed,esc)+tableField('unexposed','Unexposed',table?.unexposed,esc)
    +tableField('outcome','Outcome',table?.outcome,esc)+tableField('noOutcome','No outcome',table?.noOutcome,esc)
    +tableField('exposureKnownFor','Exposure is known for',table?.exposureKnownFor,esc)
    +tableField('cellsCount','The cells count',table?.cellsCount,esc)
    +`</div><table class="two-by-two mapping-preview"><thead><tr><th></th><th>${name('outcome','outcome')}</th>`
    +`<th>${name('noOutcome','no outcome')}</th><th>Total</th></tr></thead><tbody>`
    +`<tr><th scope="row">${name('exposed','exposed')}</th><td>a</td><td>b</td><td${fixed}>a+b</td></tr>`
    +`<tr><th scope="row">${name('unexposed','unexposed')}</th><td>c</td><td>d</td><td${fixed}>c+d</td></tr>`
    +`</tbody></table>`
    +(shape.fixed?`<p class="description">Marked totals are the ones the study fixed.</p>`:'')
    +`<fieldset class="design-question"><legend class="field-label">Where did each quantity come from?</legend>`
    +TABLE_QUANTITIES.map(([key,label])=>`<label class="design-slot"><span>${esc(label)}</span>`
      +`<input type="text" maxlength="240" data-table-source="${esc(key)}" `
      +`value="${esc(table?.sources?.[key]??'')}"></label>`).join('')
    +`</fieldset><p class="description design-sentence" id="design-table-sentence">`
    +`${esc(tableSentences(table).join(' '))}</p></section></div>`;
}

/** Stage 1, one page per question, then the checklist. Counted afresh each time, because a
 *  surveillance source adds pages and a change of design replaces them. */
export const designPageCount=(params:DesignParams):number=>
  designQuestions(params).length+2+(DESIGN_TABLES[params.design]?1:0);

export function designPageMarkup(params:DesignParams,page:number,esc:Escape,
  checklist:readonly ChecklistItem[]):string{
  const questions=designQuestions(params);
  if(page===0)return designMarkup(params,esc);
  const hasTable=Boolean(DESIGN_TABLES[params.design]);
  if(hasTable&&page===1)return tablePageMarkup(params,esc);
  const q=questions[page-1-(hasTable?1:0)];
  if(!q)return checklistMarkup(checklist,esc);
  return `<div class="mapping-body"><section id="design-stage-two">`
    +`<h3>About this ${esc(params.design)} study</h3>`
    +`<p class="description">Each answer writes a sentence into Methods. "Not sure" is a fair `
    +`answer: the note says what is unknown, and nothing stops. The wording of these questions `
    +`is untested.</p>${questionMarkup(q,params,esc)}</section></div>`;
}

const STATUS_WORD={done:'done',open:'open',unknown:'stated as unknown'} as const;

/** The two kinds are listed apart, under headings that say what each can claim. */
export function checklistMarkup(items:readonly ChecklistItem[],esc:Escape):string{
  const list=(kind:ChecklistItem['kind'])=>`<ul class="design-checklist">`+items.filter(i=>i.kind===kind)
    .map(i=>`<li data-check="${esc(i.id)}" data-status="${i.status}"><span class="design-status">`
      +`${STATUS_WORD[i.status]}</span> ${esc(i.text)}`
      +(i.detail?` <span class="muted">${esc(i.detail)}</span>`:'')+`</li>`).join('')+`</ul>`;
  return `<section id="design-checklist"><h3>Checklist</h3>`
    +`<p class="description">It reports and does not grade, and nothing here stops a run.</p>`
    +`<h4>Read from this workflow</h4><p class="description">Checked against the canvas. It says `
    +`the workflow holds these things, not that they are right.</p>${list('implemented')}`
    +`<h4>Declared by you</h4><p class="description">Recorded as you stated it. Fieldwork cannot `
    +`check these.</p>${list('declared')}</section>`;
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
  onChange:(next:DesignParams)=>void,checklist:()=>ChecklistItem[]=()=>[]):void{
  const dialog=document.createElement('dialog');
  dialog.id='study-design-dialog';
  dialog.setAttribute('aria-labelledby','study-design-dialog-title');
  let current=params,page=0;
  // NO SAVE BUTTON, because every change is written as it is made. The one thing not yet written
  // is text still in a box: a box commits on `change`, which needs it to lose focus, and Escape
  // and a WebKit button click do not guarantee that. So anything that leaves a page commits first.
  const commit=()=>{
    const active=document.activeElement;
    if(active instanceof HTMLInputElement&&dialog.contains(active))active.blur();
  };
  const close=()=>{commit();dialog.close();dialog.remove();};
  const apply=(next:DesignParams)=>{current=next;onChange(next);render();};
  const go=(step:number)=>{
    commit();
    page=Math.min(designPageCount(current)-1,Math.max(0,page+step));
    render();
    dialog.scrollTop=0;
  };
  function render(){
    const scrolled=dialog.scrollTop,last=designPageCount(current)-1;
    page=Math.min(page,last);
    dialog.innerHTML=`<div class="manual-head">`
      +`<h2 id="study-design-dialog-title">Study design, and what it reports</h2>`
      +`<span class="muted" id="design-page">Page ${page+1} of ${last+1}</span></div>`
      +designPageMarkup(current,page,esc,checklist())
      +`<div class="design-nav"><button class="button" id="design-back" ${page===0?'disabled':''}>Back</button>`
      +`<button class="button primary" id="design-next" ${page===last?'disabled':''}>Next</button>`
      +`<button class="button" id="design-close">Close</button></div>`;
    dialog.scrollTop=scrolled;
    dialog.querySelector<HTMLButtonElement>('#design-back')!.onclick=()=>go(-1);
    dialog.querySelector<HTMLButtonElement>('#design-next')!.onclick=()=>go(1);
    dialog.querySelector<HTMLButtonElement>('#design-close')!.onclick=close;
    dialog.querySelectorAll<HTMLInputElement>('[data-answer]').forEach(radio=>{
      radio.onchange=()=>apply(withAnswer(current,radio.dataset.answer!,radio.value));
    });
    dialog.querySelectorAll<HTMLInputElement>('[data-slot]').forEach(box=>{
      // NO REDRAW HERE. A box commits as it loses focus, which is the press of Next: redrawing
      // then replaces the button under the mouse and the click is lost. Found by the page test.
      box.onchange=()=>{
        const id=box.dataset.slotQuestion!;
        current=withFill(current,id,box.dataset.slot!,box.value);
        onChange(current);
        const q=designQuestions(current).find(x=>x.id===id);
        const line=dialog.querySelector('.design-sentence');
        if(q&&line)line.textContent=answerSentence(q,current.answers?.[id])??'';
      };
    });
    const showTable=()=>{
      const line=dialog.querySelector('#design-table-sentence');
      if(line)line.textContent=tableSentences(current.table).join(' ');
    };
    // NO REDRAW, for the reason the blanks above give: this commits as Next is pressed.
    dialog.querySelectorAll<HTMLInputElement>('[data-table-field]').forEach(box=>{
      box.onchange=()=>{
        const field=box.dataset.tableField as keyof DeclaredTable;
        current=withTableField(current,field,box.value);onChange(current);
        dialog.querySelectorAll(`[data-table-show="${field}"]`).forEach(el=>{if(box.value)el.textContent=box.value;});
        showTable();
      };
    });
    dialog.querySelectorAll<HTMLInputElement>('[data-table-source]').forEach(box=>{
      box.onchange=()=>{
        current=withTableSource(current,box.dataset.tableSource!,box.value);onChange(current);showTable();
      };
    });
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
