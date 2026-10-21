import type {Candidate,CandidateRecord} from './deduplicate-points.js';
import type {Escape} from './types.js';

/** ADJUDICATING A PAIR, with room to see it.
 *
 *  The practitioner, 2026-10-21, on the first version, which listed the waiting pairs in the
 *  Inspector: *"It is unclear what is being adjudicated, and this really needs to be a modal
 *  dialog so the view is not limited by the inspector panel."* Both halves are the same
 *  complaint. Two names, a distance and a similarity fit in 292 pixels and do not answer the
 *  question: `Kinesiterapie` and `La puissance de Dieu`, nought metres apart, is a decision
 *  nobody can make without seeing what else the two records say.
 *
 *  So the dialog shows the records SIDE BY SIDE, every attribute of each, with the fields that
 *  agree marked apart from the fields that differ -- because what settles most of these is a
 *  second field agreeing, or a second field flatly disagreeing. The pair is named by its sources,
 *  in the practitioner's own labels, since "which of my three downloads is this" is the first
 *  thing a reviewer asks.
 *
 *  One pair at a time, with its place in the queue, because a decision is a judgement about one
 *  pair and a list invites skimming. The reason is required: a judgement nobody can read six
 *  months later is not a record of one. */

export interface DeduplicateReviewView {
  title:string;
  candidates:Candidate[];
  decided:Map<string,{decision:'match'|'non-match';reason:string}>;
  onDecide:(key:string,decision:'match'|'non-match',reason:string)=>void;
  onClear:(key:string)=>void;
}

const value=(v:unknown)=>v===null||v===undefined||v===''?null:String(v);

/** Every attribute either record carries, in one order, so the two columns line up and a missing
 *  value on one side is visible as a gap rather than as a shorter list. */
function fields(a:CandidateRecord,b:CandidateRecord):{key:string;left:string|null;right:string|null;agrees:boolean}[]{
  const keys=[...new Set([...Object.keys(a.attributes),...Object.keys(b.attributes)])].sort();
  return keys.map(key=>{
    const left=value(a.attributes[key]),right=value(b.attributes[key]);
    // Missing never agrees with missing: two absences are not a reason to merge, and showing them
    // as agreement would be the dialog arguing for a conclusion.
    return {key,left,right,agrees:left!==null&&right!==null&&left===right};
  });
}

export function openDeduplicateReview(view:DeduplicateReviewView,esc:Escape):void{
  document.getElementById('dedup-review')?.remove();
  const dialog=document.createElement('dialog');
  dialog.id='dedup-review';
  dialog.setAttribute('aria-labelledby','dedup-review-title');
  let index=0;
  const close=()=>{dialog.close();dialog.remove();};

  function record(r:CandidateRecord){
    return `<div class="dedup-record"><h3>${esc(r.sourceLabel)}</h3>`
      +`<p class="dedup-name">${esc(r.name||'(no name)')}</p>`
      +`<p class="muted">${r.coordinates[1].toFixed(6)}, ${r.coordinates[0].toFixed(6)} · record ${esc(r.id)}</p></div>`;
  }

  function draw(){
    const candidate=view.candidates[index];
    if(!candidate){dialog.innerHTML=`<h2 id="dedup-review-title">Nothing left to review</h2>`
      +`<p>Every pair this run offered has been decided. Run the workflow again to act on them.</p>`
      +`<div class="dialog-actions"><button id="dedup-review-close" class="button primary">Close</button></div>`;
      dialog.querySelector<HTMLButtonElement>('#dedup-review-close')!.onclick=close;return;}
    const already=view.decided.get(candidate.key);
    const rows=fields(candidate.a,candidate.b);
    const agreeing=rows.filter(r=>r.agrees).length;
    dialog.innerHTML=`<h2 id="dedup-review-title">Are these the same place?</h2>
      <p class="muted">${index+1} of ${view.candidates.length} waiting · a pair reaches you when the
        two tests disagree, so the answer is a judgement rather than a calculation.</p>
      <div class="dedup-pair">${record(candidate.a)}${record(candidate.b)}</div>
      <div class="dedup-measures">
        <span><b>${Math.round(candidate.metres)} m</b> apart</span>
        <span>names ${candidate.nameSimilarity===null?'<b>not comparable</b>':`<b>${candidate.nameSimilarity.toFixed(2)}</b>`}
          ${candidate.nameAgrees?'· agreed':'· did not agree'}</span>
        <span>${candidate.nearAgrees?'close enough to count as one place':'further apart than the distance you set'}</span>
        <span>${agreeing} other ${agreeing===1?'field agrees':'fields agree'}</span>
      </div>
      <table class="dedup-fields"><thead><tr><th>Attribute</th><th>${esc(candidate.a.sourceLabel)}</th><th>${esc(candidate.b.sourceLabel)}</th></tr></thead>
        <tbody>${rows.map(r=>`<tr class="${r.agrees?'agrees':''}"><th scope="row">${esc(r.key)}</th>`
          +`<td>${r.left===null?'<span class="absent" aria-label="no value">—</span>':esc(r.left)}</td>`
          +`<td>${r.right===null?'<span class="absent" aria-label="no value">—</span>':esc(r.right)}</td></tr>`).join('')}</tbody></table>
      <label class="field-label" for="dedup-review-reason">Why</label>
      <input id="dedup-review-reason" maxlength="200" value="${esc(already?.reason||'')}"
        placeholder="What makes them the same, or different">
      <p class="muted">Kept with the decision, and pinned to these records as they are: edit either one and the judgement lapses.</p>
      <div class="dialog-actions">
        <button id="dedup-previous" class="button small" ${index?'':'disabled'}>Previous</button>
        <button id="dedup-next" class="button small" ${index<view.candidates.length-1?'':'disabled'}>Skip</button>
        <span class="spacer"></span>
        ${already?`<button id="dedup-undecide" class="text-button">Take the decision back</button>`:''}
        <button id="dedup-different" class="button">Different places</button>
        <button id="dedup-same" class="button primary">The same place</button>
        <button id="dedup-review-close" class="button small">Close</button>
      </div>`;
    const reason=()=>dialog.querySelector<HTMLInputElement>('#dedup-review-reason')!.value.trim();
    const decide=(decision:'match'|'non-match')=>{
      const why=reason();
      if(!why){dialog.querySelector<HTMLInputElement>('#dedup-review-reason')!.focus();return;}
      view.onDecide(candidate.key,decision,why);
      view.decided.set(candidate.key,{decision,reason:why});
      if(index<view.candidates.length-1){index++;draw();}else draw();
    };
    dialog.querySelector<HTMLButtonElement>('#dedup-same')!.onclick=()=>decide('match');
    dialog.querySelector<HTMLButtonElement>('#dedup-different')!.onclick=()=>decide('non-match');
    dialog.querySelector<HTMLButtonElement>('#dedup-review-close')!.onclick=close;
    dialog.querySelector<HTMLButtonElement>('#dedup-previous')!.onclick=()=>{if(index){index--;draw();}};
    dialog.querySelector<HTMLButtonElement>('#dedup-next')!.onclick=()=>{if(index<view.candidates.length-1){index++;draw();}};
    dialog.querySelector<HTMLButtonElement>('#dedup-undecide')?.addEventListener('click',()=>{
      view.onClear(candidate.key);view.decided.delete(candidate.key);draw();});
  }

  draw();
  document.body.append(dialog);
  dialog.showModal();
  dialog.addEventListener('close',()=>dialog.remove());
}
