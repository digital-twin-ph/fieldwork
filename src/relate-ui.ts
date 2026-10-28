import type {RelateShape,UnmatchedDeclaration,MeasureShare} from './relate-table.js';
import {rateMultiplier,machinedNotes} from './relate-table.js';
import {dataTableMarkup,wideFrame} from './data-table-ui.js';
import type {Escape} from './types.js';

/** DECIDING A JOIN, with the consequence in front of you.
 *
 *  The practitioner, 2026-10-28: *"I expect the views to show up in a Quick Look dialog modal
 *  where the user can make a decision about the type of join. The modal dialog should also show
 *  the preview of the joined tables depending on the type of join selected and a Finalize button
 *  after the selection. The choice should be reflected in the receipts."*
 *
 *  THE SAME DEVICE THE TABLE IMPORT USES, and for the same reason they gave for that one: *"We
 *  have to have validation that the conversion from long to wide happened correctly so we have to
 *  see the before and after. What if the quick look dialog could do that and if the after preview
 *  looks OK to the user he can commit."* A join is the other place where the application does
 *  something consequential to the practitioner's data and then hands it on.
 *
 *  WHY THERE ARE TWO CONTROLS AND NOT ONE. How keys are compared decides WHICH rows match; the
 *  join decides what happens to the rest. They multiply: tightening the comparison turns matched
 *  rows into unmatched ones, and the join then decides whether those vanish or are kept. Showing
 *  one without the other would let a practitioner fix a symptom and miss its cause -- nine of
 *  Snow's sub-districts differ from the published boundaries by a single comma, and the right
 *  answer there is to fold punctuation, not to decide what to do with nine dropped rows.
 *
 *  AND THE EFFECT REACHES THE NUMBERS. Per variable, the share an inner join retains, because
 *  that is what the practitioner is actually deciding about: for any two variables a rate of one
 *  over the other is multiplied by exactly the ratio of their shares. Where the shares differ,
 *  the dropped rows are not a random sample of the thing being measured, and that is the finding
 *  a complete-case analysis assumes away. */

export interface RelateJoinView {
  title:string;
  leftLabel:string; rightLabel:string;
  on:string; bring:string;
  normalisation:'exact'|'fuzzy';
  /** The decision already stored, where the practitioner has made one. */
  settled?:UnmatchedDeclaration;
  /** Recomputes the shape for a candidate comparison and label. Returns the refusal text where
   *  the join cannot be planned at all, so the dialog says so instead of drawing nothing. */
  shapeFor:(normalisation:'exact'|'fuzzy',label?:string)=>RelateShape|{refusal:string};
  onFinalize:(choice:{normalisation:'exact'|'fuzzy'; unmatched?:UnmatchedDeclaration})=>void;
}

const pct=(share:number|null)=>share===null?'—':`${(share*100).toFixed(1)}%`;
const count=(n:number)=>n.toLocaleString();

/** The three segments, sized by DISTINCT KEYS rather than rows: a long table holds several rows
 *  per subject, so counting rows would say that nine unmatched sub-districts are eighteen
 *  unmatched things. A segment that exists is never thinner than a sliver, because "a few" and
 *  "none" are the difference the bar is drawn to show. */
function overlapBar(shape:RelateShape,esc:Escape,leftLabel:string,rightLabel:string):string{
  const {leftOnly,matched,rightOnly}=shape.overlap;
  const total=leftOnly+matched+rightOnly||1;
  const seg=(n:number,kind:string,label:string)=>n
    ? `<div class="overlap-seg overlap-${kind}" style="flex:0 0 ${Math.max(n/total*100,7)}%">`
      +`<span>${esc(label)}</span><strong>${count(n)}</strong></div>`
    : '';
  return `<div class="overlap-bar" role="img" aria-label="${esc(`${matched} keys in both, `
      +`${leftOnly} only in ${leftLabel}, ${rightOnly} only in ${rightLabel}`)}">`
    +seg(leftOnly,'left',`only in ${leftLabel}`)
    +seg(matched,'both','in both')
    +seg(rightOnly,'right',`only in ${rightLabel}`)
    +'</div>';
}

/** WHAT THE JOIN DOES TO EACH NUMERIC VARIABLE. The share is the column a practitioner reads;
 *  the totals are there so they can check it against their own file. */
function sharesTable(shares:MeasureShare[],esc:Escape):string{
  return '<table class="relate-shares"><thead><tr><th>Variable</th>'
    +'<th title="Total over every row the first table offered">All</th>'
    +'<th title="Total over the rows that matched">Matched</th>'
    +'<th>Retained</th></tr></thead><tbody>'
    +shares.map(s=>`<tr><th scope="row">${esc(s.measure)}</th>`
      +`<td>${count(s.all)}</td><td>${count(s.related)}</td>`
      +`<td${s.share!==null&&s.share<1?' class="profile-flag"':''}>${pct(s.share)}</td></tr>`).join('')
    +'</tbody></table>';
}

export function openRelateJoin(view:RelateJoinView,esc:Escape):void{
  document.getElementById('relate-join')?.remove();
  const dialog=document.createElement('dialog');
  dialog.id='relate-join';
  dialog.setAttribute('aria-labelledby','relate-join-title');
  const close=()=>{dialog.close();dialog.remove();};

  let normalisation=view.normalisation;
  let decision:'drop'|'keep'=view.settled?.decision??'drop';
  let label=view.settled?.label??'';
  let reason=view.settled?.reason??'';
  // Which pair the multiplier is stated for. Two variables is the epidemiological case and needs
  // no choosing; more than two does, because there is no way to know which one is meant as the
  // denominator.
  let numerator='',denominator='';

  function draw(){
    const planned=view.shapeFor(normalisation,decision==='keep'?label:undefined);
    if('refusal' in planned){
      dialog.innerHTML=`<div class="manual-head"><h2 id="relate-join-title">${esc(view.title)}</h2>`
        +'<div><button class="button primary" id="relate-join-close">Close</button></div></div>'
        +`<div class="table-viewer-body"><div class="notice notice-warning">${esc(planned.refusal)}</div></div>`;
      dialog.querySelector<HTMLButtonElement>('#relate-join-close')!.onclick=close;
      return;
    }
    const shape=planned;
    const gaps=shape.overlap.gaps;
    const names=shape.shares.map(s=>s.measure);
    if(!names.includes(numerator))numerator=names[0]??'';
    if(!names.includes(denominator))denominator=names[1]??names[0]??'';
    const multiplier=names.length>1?rateMultiplier(shape.shares,numerator,denominator):null;
    const preview=decision==='keep'&&shape.previews.keep?shape.previews.keep:shape.previews.drop;
    const showingKeep=decision==='keep'&&!!shape.previews.keep;
    const blocked=decision==='keep'&&!!shape.labelRefusal;

    dialog.innerHTML=`<div class="manual-head"><h2 id="relate-join-title">${esc(view.title)}</h2>`
      +'<div><button class="button" id="relate-join-close">Cancel</button>'
      +`<button class="button primary" id="relate-join-finalize"${blocked?' disabled':''}>Finalize</button></div></div>`
      +'<div class="table-viewer-body">'

      // THE SHAPE OF THE JOIN, and the comparison that produced it, together.
      +'<div class="relate-row">'
      +`<p class="description">Matching <strong>${esc(view.leftLabel)}</strong> to `
      +`<strong>${esc(view.rightLabel)}</strong> on <strong>${esc(view.on)}</strong>, `
      +`bringing <strong>${esc(view.bring)}</strong> across.</p>`
      +'<label class="field-label" for="relate-join-compare">Compare keys</label>'
      +'<select id="relate-join-compare">'
      +`<option value="fuzzy"${normalisation==='fuzzy'?' selected':''}>Folding punctuation and case</option>`
      +`<option value="exact"${normalisation==='exact'?' selected':''}>Exactly, after trimming</option>`
      +'</select></div>'
      +overlapBar(shape,esc,view.leftLabel,view.rightLabel)
      +(gaps.length
        ? `<p class="muted">Not in ${esc(view.rightLabel)}: `
          +gaps.slice(0,12).map(g=>`<strong>${esc(g.key)}</strong> (${g.rows} row${g.rows===1?'':'s'})`).join(', ')
          +(gaps.length>12?`, and ${gaps.length-12} more`:'')+'.</p>'
        : `<p class="muted">Every ${esc(view.on)} in ${esc(view.leftLabel)} was found. `
          +'The two joins below give the same table.</p>')

      // WHAT IT DOES TO THE NUMBERS.
      +'<span class="inspector-section">Effect on the numeric variables</span>'
      +sharesTable(shape.shares,esc)
      +(names.length>1
        ? '<div class="relate-row"><label class="field-label" for="relate-join-num">A rate of</label>'
          +'<select id="relate-join-num">'
          +names.map(n=>`<option value="${esc(n)}"${n===numerator?' selected':''}>${esc(n)}</option>`).join('')
          +'</select><label class="field-label" for="relate-join-den">over</label>'
          +'<select id="relate-join-den">'
          +names.map(n=>`<option value="${esc(n)}"${n===denominator?' selected':''}>${esc(n)}</option>`).join('')
          +'</select></div>'
          +(multiplier===null||numerator===denominator
            ? '<p class="muted">Pick two different variables to see what dropping does to a rate of one over the other.</p>'
            : multiplier===1
              ? `<div class="rule-preview">Both variables keep the same share, so a rate of `
                +`${esc(numerator)} over ${esc(denominator)} is unchanged. Dropping costs precision `
                +'here, not the estimate.</div>'
              : `<div class="notice notice-warning">Dropping multiplies a rate of `
                +`<strong>${esc(numerator)}</strong> over <strong>${esc(denominator)}</strong> by `
                +`<strong>${multiplier.toFixed(4)}</strong> — it comes out at `
                +`${(multiplier*100).toFixed(1)}% of its value over the whole table. The two `
                +'variables do not drop in step, so the rows that did not match are not a random '
                +'sample of what you are measuring.</div>')
        : '')

      // THE DECISION.
      +'<span class="inspector-section">The rows that did not match</span>'
      +(gaps.length
        ? '<label class="check"><input type="radio" name="relate-join-decision" value="drop" '
          +`${decision==='drop'?'checked':''}> Drop them — keep ${count(shape.overlap.matched)} `
          +`matched ${esc(view.on)}${shape.overlap.matched===1?'':'s'}, and the totals above</label>`
          +'<label class="check"><input type="radio" name="relate-join-decision" value="keep" '
          +`${decision==='keep'?'checked':''}> Keep them under a category I name — every row stays, `
          +'and the totals are the whole table’s</label>'
          +(decision==='keep'
            ? '<div class="field"><label class="field-label" for="relate-join-label">Name for the category</label>'
              +`<input id="relate-join-label" maxlength="60" value="${esc(label)}" `
              +'placeholder="for example Supply not recorded"></div>'
              +'<p class="muted">Your words, not the application’s: a stratum the data never '
              +'measured has to be named by somebody, and the receipt records who.</p>'
              +(shape.labelRefusal?`<div class="notice notice-warning">${esc(shape.labelRefusal)}</div>`:'')
            : '')
          +'<div class="field"><label class="field-label" for="relate-join-reason">Why (recorded in the evidence)</label>'
          +`<input id="relate-join-reason" maxlength="200" value="${esc(reason)}" `
          +'placeholder="the boundary file spells nine of these without their comma"></div>'
        : '<p class="muted">Nothing to decide: no row was left out. Finalize records the key '
          +'comparison you chose.</p>')

      // THE NOTE THE WIDGET WOULD MACHINE, for the write-up rather than for this dialog.
      //
      // Shown here because the decision and its account belong together: a practitioner choosing
      // between two joins should see the sentence each one would put in their Methods section.
      // The practitioner, 2026-10-28: *"the dialog itself should show the machined note, in
      // addition to the visual aid, and the wide table view of the join"*, and *"The table join
      // will produce notes that map to Methods."*
      +'<span class="inspector-section">Methods note, machined from this join</span>'
      +'<div class="machined-note">'
      +machinedNotes({on:view.on,bring:view.bring,normalisation,
        overlap:shape.overlap,shares:shape.shares,
        ...(gaps.length?{declared:{decision,
          ...(decision==='keep'?{label:label.trim()}:{}),
          ...(reason.trim()?{reason:reason.trim()}:{})}}:{})},
        {left:view.leftLabel,right:view.rightLabel})
        .map(note=>`<p>${esc(note.text)}</p>`).join('')
      +'</div>'
      +'<p class="muted">Recorded in the evidence with the run, and written for the Methods '
      +'section rather than for this dialog. It changes with the choices above.</p>'

      // THE PREVIEW, which is the table that will travel on.
      +'<span class="inspector-section">'
      +(showingKeep?'Preview — every row kept':'Preview — matched rows only')
      +'</span>'
      +`<p class="muted">${count(preview.rowCount)} row${preview.rowCount===1?'':'s'}, `
      +`${preview.keys.length} key columns. This is the table the next step reads.</p>`
      // SAID RATHER THAN SHOWN SILENTLY. `dataTableMarkup` draws a wide frame where the keys
      // resolve to one and the stored long rows where they do not -- and a long table is the
      // thing this project has twice been told would get weird looks. Where no frame is
      // possible, the reason is stated: with more than a couple of key columns, nothing can know
      // which one should spread into columns without being told.
      +(wideFrame(preview)?''
        :`<div class="notice">This table has ${preview.keys.length} key columns, so it cannot be `
          +'drawn wide until something says which one spreads into columns. The rows below are as '
          +'stored, one value per row.</div>')
      +`<div class="relate-preview">${dataTableMarkup(preview,esc,{pageSize:12})}</div>`
      +'</div>';

    dialog.querySelector<HTMLButtonElement>('#relate-join-close')!.onclick=close;
    const compare=dialog.querySelector<HTMLSelectElement>('#relate-join-compare')!;
    compare.onchange=()=>{normalisation=compare.value==='exact'?'exact':'fuzzy';draw();};
    dialog.querySelectorAll<HTMLInputElement>('[name="relate-join-decision"]').forEach(radio=>{
      radio.onchange=()=>{if(radio.checked){decision=radio.value==='keep'?'keep':'drop';draw();}};
    });
    const labelInput=dialog.querySelector<HTMLInputElement>('#relate-join-label');
    if(labelInput){
      // Redrawn on change rather than on every keystroke, so the preview does not rebuild under
      // the typist; the caret is restored because the redraw replaces the input.
      labelInput.onchange=()=>{label=labelInput.value;draw();};
      labelInput.oninput=()=>{label=labelInput.value;};
    }
    const reasonInput=dialog.querySelector<HTMLInputElement>('#relate-join-reason');
    if(reasonInput)reasonInput.oninput=()=>{reason=reasonInput.value;};
    const num=dialog.querySelector<HTMLSelectElement>('#relate-join-num');
    if(num)num.onchange=()=>{numerator=num.value;draw();};
    const den=dialog.querySelector<HTMLSelectElement>('#relate-join-den');
    if(den)den.onchange=()=>{denominator=den.value;draw();};

    dialog.querySelector<HTMLButtonElement>('#relate-join-finalize')!.onclick=()=>{
      // The signature is the shape's, so the decision is recorded about THIS gap under THIS
      // comparison. Changing either afterwards lapses it, which is the point of storing one.
      view.onFinalize({normalisation,
        ...(gaps.length?{unmatched:{decision,signature:shape.signature,
          ...(decision==='keep'?{label:label.trim()}:{}),
          ...(reason.trim()?{reason:reason.trim()}:{})}}:{})});
      close();
    };
  }

  draw();
  document.body.append(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.showModal();
}
