/** THE LAB EVALUATION FORM, switched on in Help and opened from the header or a note being written. Experiment 184.
 *  The words on it are labels and one question per heuristic, nothing that explains the design. */
import {HEURISTICS,TEXT_KINDS,toMarkdown,fileStem,cleanPass,type EvaluationPass,type Finding} from './lab-evaluation.js';

export interface EvaluationContext {screen:string; widget?:{type:string; version:string}}

const ON='fieldwork.labEvaluation',WHO='fieldwork.labEvaluation.evaluator',DRAFT='fieldwork.labEvaluation.draft:';
const get=(k:string)=>{try{return localStorage.getItem(k);}catch{return null;}};
const put=(k:string,v:string|null)=>{try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch{/* this view only */}};
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export const labEvaluationOn=()=>get(ON)==='1';

function save(name:string,body:string,type:string){
  const url=URL.createObjectURL(new Blob([body],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}

/** Wire the switch into Help, the header button, and the note dialog's button. */
export function setupLabEvaluation(context:()=>EvaluationContext):void{
  const apply=()=>document.body.classList.toggle('lab-evaluation',labEvaluationOn());
  const help=document.querySelector('#help-dialog');
  if(help&&!help.querySelector('#lab-evaluation-switch')){
    const p=document.createElement('p');
    p.innerHTML=`<label><input type="checkbox" id="lab-evaluation-switch"${labEvaluationOn()?' checked':''}> Lab evaluation</label>`;
    help.append(p);
    p.querySelector('input')!.addEventListener('change',e=>{put(ON,(e.target as HTMLInputElement).checked?'1':null);apply();});
  }
  const header=document.querySelector('#help-button');
  if(header&&!document.querySelector('#lab-evaluate')){
    const b=document.createElement('button');
    b.id='lab-evaluate';b.className='button small lab-only';b.textContent='Evaluate';b.title='Lab evaluation of this screen';
    header.before(b);b.onclick=()=>openEvaluation(context());
  }
  document.addEventListener('click',e=>{
    const t=(e.target as HTMLElement|null)?.closest?.('#note-evaluate');
    if(t)openEvaluation({...context(),screen:`${context().screen} › Note dialog`});
  });
  apply();
}

export function openEvaluation(ctx:EvaluationContext):void{
  document.querySelector('#lab-evaluation-dialog')?.remove();
  const appVersion=document.querySelector('#app-version')?.textContent?.trim()||'';
  const draftKey=DRAFT+ctx.screen;
  let pass:EvaluationPass;
  try{pass=JSON.parse(get(draftKey)||'null');}catch{pass=null as unknown as EvaluationPass;}
  if(!pass||pass.schema!=='fieldwork/lab-evaluation/1')pass={schema:'fieldwork/lab-evaluation/1',evaluator:get(WHO)||'',
    screen:ctx.screen,...(ctx.widget?{widget:ctx.widget}:{}),appVersion,at:'',findings:[],works:''};
  const d=document.createElement('dialog');
  d.id='lab-evaluation-dialog';d.setAttribute('aria-labelledby','lab-evaluation-title');
  const findingHTML=(f:Finding,i:number)=>`<div class="lab-finding" data-i="${i}">`
    +`<label>What happens<textarea data-f="happens" rows="2">${esc(f.happens)}</textarea></label>`
    +`<label>What it costs<textarea data-f="costs" rows="2">${esc(f.costs)}</textarea></label>`
    +`<label>Text<select data-f="textKind"><option value="">—</option>${TEXT_KINDS.map(k=>`<option${f.textKind===k?' selected':''}>${k}</option>`).join('')}</select></label>`
    +`<button type="button" class="chip" data-remove="${i}">Remove</button></div>`;
  const draw=()=>{
    d.innerHTML=`<div class="manual-head"><h2 id="lab-evaluation-title">Evaluate: ${esc(pass.screen)}</h2>`
      +`<button class="button" id="lab-evaluation-close">Close</button></div>`
      +`<div class="lab-meta"><label>Evaluator<input id="lab-evaluator" value="${esc(pass.evaluator)}"></label>`
      +`<label>Screen<input id="lab-screen" value="${esc(pass.screen)}"></label>`
      +(pass.widget?`<span>Widget <code>${esc(pass.widget.type)}</code> ${esc(pass.widget.version)}</span>`:'')
      +`<span>Fieldwork ${esc(appVersion)}</span></div>`
      +HEURISTICS.map(h=>{
        const mine=pass.findings.map((f,i)=>[f,i] as const).filter(([f])=>f.heuristic===h.id);
        return `<details class="lab-heuristic" data-h="${h.id}"${mine.length?' open':''}><summary><strong>${h.id}</strong> ${esc(h.name)}`
          +`${mine.length?` <span class="muted">(${mine.length})</span>`:''}</summary><p class="muted">${esc(h.ask)}</p>`
          +mine.map(([f,i])=>findingHTML(f,i)).join('')
          +`<button type="button" class="chip" data-add="${h.id}">Add a problem</button></details>`;}).join('')
      +`<label class="lab-works">What works<textarea id="lab-works" rows="2">${esc(pass.works)}</textarea></label>`
      +`<div class="lab-actions"><span id="lab-status" class="muted" role="status"></span>`
      +`<button class="button primary" id="lab-save">Save to laptop</button></div>`;
    d.querySelector<HTMLButtonElement>('#lab-evaluation-close')!.onclick=()=>{keep();d.close();d.remove();};
    d.querySelectorAll<HTMLButtonElement>('[data-add]').forEach(b=>b.onclick=()=>{
      keep();pass.findings.push({heuristic:b.dataset.add!,happens:'',costs:''});draw();
      d.querySelector<HTMLDetailsElement>(`[data-h="${b.dataset.add}"]`)!.open=true;});
    d.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(b=>b.onclick=()=>{
      keep();pass.findings.splice(Number(b.dataset.remove),1);draw();});
    d.querySelector<HTMLButtonElement>('#lab-save')!.onclick=()=>{
      keep();
      if(!pass.evaluator){d.querySelector('#lab-status')!.textContent='Add your name as evaluator first.';d.querySelector<HTMLInputElement>('#lab-evaluator')!.focus();return;}
      pass.at=new Date().toISOString();
      const kept=cleanPass(pass),stem=fileStem(kept);
      save(`${stem}.md`,toMarkdown(kept),'text/markdown');
      save(`${stem}.json`,JSON.stringify(kept,null,2)+'\n','application/json');
      d.querySelector('#lab-status')!.textContent=`Saved ${kept.findings.length} finding${kept.findings.length===1?'':'s'}: ${stem}.md and .json`;
    };
    d.addEventListener('input',keep);
  };
  /** Read the form into the pass and keep a draft on this device, so closing does not lose it. */
  const keep=()=>{
    const v=(s:string)=>(d.querySelector(s) as HTMLInputElement|HTMLTextAreaElement|null)?.value??'';
    pass.evaluator=v('#lab-evaluator').trim()||pass.evaluator;pass.screen=v('#lab-screen').trim()||pass.screen;pass.works=v('#lab-works');
    d.querySelectorAll<HTMLElement>('.lab-finding').forEach(el=>{
      const f=pass.findings[Number(el.dataset.i)];if(!f)return;
      for(const k of ['happens','costs','textKind'] as const){
        const x=el.querySelector<HTMLInputElement>(`[data-f="${k}"]`);if(x){if(k==='textKind'&&!x.value)delete f.textKind;else f[k]=x.value;}}
    });
    if(pass.evaluator)put(WHO,pass.evaluator);
    put(draftKey,JSON.stringify(pass));
  };
  draw();
  d.addEventListener('cancel',e=>{e.preventDefault();keep();d.close();d.remove();});
  document.body.append(d);
  d.showModal();
}
