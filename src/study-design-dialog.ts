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
import {answerSentence,chosenOptions,designQuestions,inheritedFill,slotsIn,DESIGN_TABLES,cellDescribed,tableSentences} from './study-design-questions.js';
import type {DeclaredCell,DeclaredTable,DesignQuestion} from './study-design-questions.js';
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
/** One box of a choose-all-that-apply question. "None" and "not sure" stand alone, so ticking either
 *  clears the rest, and ticking anything else clears them. */
export function withToggle(params:DesignParams,q:DesignQuestion,option:string,on:boolean):DesignParams{
  const alone=(id:string)=>{
    const o=q.options.find(x=>x.id===id);
    return Boolean(o?.unknown||o?.label==='None');
  };
  const held=(params.answers?.[q.id]?.option.split(' ')??[]).filter(Boolean);
  const next=!on?held.filter(id=>id!==option)
    :alone(option)?[option]:[...held.filter(id=>!alone(id)),option];
  const {[q.id]:_old,...others}=params.answers??{};
  const fills=params.answers?.[q.id]?.fills;
  return {...params,answers:next.length?{...others,[q.id]:{option:next.join(' '),...(fills?{fills}:{})}}:others};
}

export function withFill(params:DesignParams,questionId:string,slot:string,value:string):DesignParams{
  const answer=params.answers?.[questionId];
  if(!answer)return params;
  return {...params,answers:{...params.answers,
    [questionId]:{...answer,fills:{...answer.fills,[slot]:value}}}};
}

function questionMarkup(q:DesignQuestion,params:DesignParams,esc:Escape):string{
  const answer=params.answers?.[q.id],chosen=chosenOptions(q,answer);
  const sentence=answerSentence(q,answer,params.table);
  const blanks=[...new Set(chosen.flatMap(o=>o.sentence?slotsIn(o.sentence):[]))];
  return `<fieldset class="design-question" data-question="${esc(q.id)}">`
    +`<legend class="field-label">${esc(q.text)}</legend>`
    +q.options.map(o=>`<label class="design-choice"><input type="${q.multi?'checkbox':'radio'}" `
      +`name="answer-${esc(q.id)}" data-answer="${esc(q.id)}" ${q.multi?'data-answer-multi':''} `
      +`value="${esc(o.id)}" ${chosen.includes(o)?'checked':''}> <span>${esc(o.label)}</span></label>`).join('')
    +chosen.filter(o=>o.caveat).map(o=>`<p class="description design-caveat">${esc(o.caveat!)}</p>`).join('')
    +blanks.map(slot=>`<label class="design-slot"><span>${esc(slot)}</span><input type="text" `
      +`data-slot="${esc(slot)}" data-slot-question="${esc(q.id)}" maxlength="240" `
      +`value="${esc(answer?.fills?.[slot]??inheritedFill(slot,params.table))}"></label>`).join('')
    +(sentence?`<p class="description design-sentence">${esc(sentence)}</p>`:'')
    +`</fieldset>`;
}

export function withTableField(params:DesignParams,field:keyof DeclaredTable,value:string):DesignParams{
  return {...params,table:{...params.table,[field]:value}};
}
export function withCell(params:DesignParams,key:string,change:Partial<DeclaredCell>):DesignParams{
  const cells=params.table?.cells;
  return {...params,table:{...params.table,cells:{...cells,[key]:{...cells?.[key],...change}}}};
}

const tableField=(field:string,label:string,value:string|undefined,esc:Escape)=>
  `<label class="design-slot"><span>${esc(label)}</span><input type="text" maxlength="120" `
  +`data-table-field="${field}" value="${esc(value??'')}"></label>`;

/** What a closed cell shows, so a filled table reads without opening anything. */
const cellSummary=(cell?:DeclaredCell):string=>!cell||!cell.counts?.trim()?'not described':cell.counts.trim();

/** ONE CELL, OPENED WHEN SELECTED. Six cells holding two boxes each do not fit a grid at dialog
 *  width, so the grid stays readable and the boxes open where they are used. */
function cellMarkup(key:string,cell:DeclaredCell|undefined,fixed:boolean,esc:Escape,column:string):string{
  return `<td${fixed?' class="design-fixed" title="Fixed by the study"':''}><details data-cell="${esc(key)}">`
    +`<summary><b>${esc(key)}</b> <span class="design-cell-column">${column}</span> <span class="muted" data-cell-summary="${esc(key)}">${esc(cellSummary(cell))}</span></summary>`
    +`<label class="design-slot"><span>What it counts</span><input type="text" maxlength="120" `
    +`data-cell-counts="${esc(key)}" value="${esc(cell?.counts??'')}"></label>`
    +`<label class="design-slot"><span>Where it comes from</span><input type="text" maxlength="240" `
    +`data-cell-source="${esc(key)}" value="${esc(cell?.source??'')}" ${cell?.derived?'disabled':''}></label>`
    +`<label class="check"><input type="checkbox" data-cell-derived="${esc(key)}" `
    +`${cell?.derived?'checked':''}> Worked out from other cells</label></details></td>`;
}

/** THE TABLE PAGE. The table IS the form: each cell says what it counts and where it comes from,
 *  because the two can differ cell by cell, and a list beneath loses which is which. No numbers:
 *  they arrive with the data, and the wording holds for a study not yet begun. */
export function tablePageMarkup(params:DesignParams,esc:Escape):string{
  const shape=DESIGN_TABLES[params.design]!,table=params.table,rows=shape.fixed==='rows';
  const name=(field:keyof DeclaredTable,blank:string)=>
    `<span data-table-show="${String(field)}">${esc(String(table?.[field]??'')||blank)}</span>`;
  // A COLUMN'S NAME IN EACH CELL, shown only where the table stacks: at phone width the headings go,
  // and `a` and `b` would be two cells in one row with nothing to tell them apart.
  const cell=(key:string,column:string,fixed=false)=>cellMarkup(key,table?.cells?.[key],fixed,esc,column);
  const yes=name('outcome','outcome'),no=name('noOutcome','no outcome');
  return `<div class="mapping-body"><section id="design-table"><h3>The table this ${esc(params.design)} study is about</h3>`
    +`<p class="description">${esc(shape.note)}</p>`
    +`<p class="description">No numbers here: they come with the data. Say what each cell will `
    +`hold, whether or not the study has begun. Select a cell to describe it.</p>`
    +`<div class="mapping-grid">`
    +`<p class="description">With several exposures, describe the groups in general, such as ate and did not eat.</p>`
    +tableField('exposed','Exposed',table?.exposed,esc)+tableField('unexposed','Unexposed',table?.unexposed,esc)
    +tableField('exposureKnownFor','Exposure is known for',table?.exposureKnownFor,esc)
    +tableField('outcome','Outcome',table?.outcome,esc)+tableField('noOutcome','No outcome',table?.noOutcome,esc)
    +`</div><table class="two-by-two mapping-preview design-table-form"><thead><tr><th></th><th>${name('outcome','outcome')}</th>`
    +`<th>${name('noOutcome','no outcome')}</th><th>Total</th></tr></thead><tbody>`
    +`<tr><th scope="row">${name('exposed','exposed')}</th>${cell('a',yes)}${cell('b',no)}${cell('a+b','total',rows)}</tr>`
    +`<tr><th scope="row">${name('unexposed','unexposed')}</th>${cell('c',yes)}${cell('d',no)}${cell('c+d','total',rows)}</tr>`
    +`</tbody></table>`
    +(shape.fixed?`<p class="description">Marked totals are the ones the study fixed.</p>`:'')
    +`<p class="description design-sentence" id="design-table-sentence">`
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

const STATUS_WORD={done:'done',open:'open',unknown:'stated as unknown',differs:'differs'} as const;

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
      const q=designQuestions(current).find(x=>x.id===radio.dataset.answer);
      radio.onchange=()=>apply('answerMulti' in radio.dataset&&q
        ?withToggle(current,q,radio.value,radio.checked)
        :withAnswer(current,radio.dataset.answer!,radio.value));
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
        if(q&&line)line.textContent=answerSentence(q,current.answers?.[id],current.table)??'';
      };
    });
    const showTable=(table=current.table)=>{
      const line=dialog.querySelector('#design-table-sentence');
      if(line)line.textContent=tableSentences(table).join(' ');
    };
    // NO REDRAW, for the reason the blanks above give: this commits as Next is pressed.
    dialog.querySelectorAll<HTMLInputElement>('[data-table-field]').forEach(box=>{
      const field=box.dataset.tableField as keyof DeclaredTable;
      // SHOWN AS IT IS TYPED, COMMITTED ON LEAVING. A long name reflows the table and a new sentence
      // grows the centred dialog, and doing either at blur moved the cell being clicked, so the
      // click landed nowhere. Found by the page test. Nothing may change size on blur here.
      box.oninput=()=>{
        dialog.querySelectorAll(`[data-table-show="${field}"]`)
          .forEach(el=>{if(box.value)el.textContent=box.value;});
        showTable(withTableField(current,field,box.value).table);
      };
      box.onchange=()=>{current=withTableField(current,field,box.value);onChange(current);showTable();};
    });
    const setCell=(key:string,change:Partial<DeclaredCell>)=>{
      current=withCell(current,key,change);onChange(current);
      const shown=dialog.querySelector(`[data-cell-summary="${CSS.escape(key)}"]`);
      if(shown)shown.textContent=cellSummary(current.table?.cells?.[key]);
      showTable();
    };
    dialog.querySelectorAll<HTMLInputElement>('[data-cell-counts]').forEach(box=>{
      box.oninput=()=>{
        const shown=dialog.querySelector(`[data-cell-summary="${CSS.escape(box.dataset.cellCounts!)}"]`);
        if(shown)shown.textContent=box.value.trim()||'not described';
        showTable(withCell(current,box.dataset.cellCounts!,{counts:box.value}).table);
      };
      box.onchange=()=>setCell(box.dataset.cellCounts!,{counts:box.value});
    });
    dialog.querySelectorAll<HTMLInputElement>('[data-cell-source]').forEach(box=>{
      box.oninput=()=>showTable(withCell(current,box.dataset.cellSource!,{source:box.value}).table);
      box.onchange=()=>setCell(box.dataset.cellSource!,{source:box.value});
    });
    dialog.querySelectorAll<HTMLInputElement>('[data-cell-derived]').forEach(box=>{
      box.onchange=()=>{
        const key=box.dataset.cellDerived!;
        setCell(key,{derived:box.checked});
        const source=dialog.querySelector<HTMLInputElement>(`[data-cell-source="${CSS.escape(key)}"]`);
        if(source)source.disabled=box.checked;
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
